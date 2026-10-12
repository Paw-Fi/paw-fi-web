begin;

alter table public.invites
  add column is_reusable boolean not null default false,
  add column invited_role public.household_role not null default 'admin',
  add constraint invites_invited_role_check check (invited_role in ('admin', 'member')),
  add constraint invites_reusable_no_email_check check (not is_reusable or invited_email is null);

-- Membership admission must pass token validation, expiry and role authority.
-- The existing SECURITY DEFINER owner trigger and service-role writes bypass RLS.
drop policy if exists "Allow household member insertion" on public.household_members;

-- Keep invite reads available, but route all creation/revocation through the
-- authenticated Edge Functions. Broad client UPDATE also allowed removed
-- inviters to alter role, reuse, expiry and status outside those checks.
drop policy if exists "Owners and admins can create invites" on public.invites;
drop policy if exists "Authorized users can revoke invites" on public.invites;

-- The Edge Function authenticates the actor; only service_role may supply it.
create or replace function public.households_accept_invite_v1(
  p_token text,
  p_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.invites%rowtype;
  v_member public.household_members%rowtype;
  v_member_created boolean := false;
begin
  if p_user_id is null or p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_REQUEST');
  end if;

  -- Shares the row lock used by revocation and expire_old_invites UPDATEs.
  select * into v_invite from public.invites where token = p_token for update;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND');
  end if;

  if v_invite.status = 'accepted' then
    -- Preserve legacy accepted-link retries, including after original expiry.
    if not v_invite.is_reusable and v_invite.invited_user_id = p_user_id then
      select * into v_member from public.household_members
        where household_id = v_invite.household_id and user_id = p_user_id;
      if found then
        return jsonb_build_object('success', true, 'household_id', v_invite.household_id,
          'member_id', v_member.id, 'member_created', false,
          'invite_id', v_invite.id, 'inviter_id', v_invite.inviter_id);
      end if;
    end if;
    return jsonb_build_object('success', false, 'error_code', 'ACCEPTED');
  end if;
  if v_invite.status = 'revoked' then
    return jsonb_build_object('success', false, 'error_code', 'REVOKED');
  end if;
  -- Use the real clock AFTER acquiring the lock, not transaction start time.
  if v_invite.status = 'expired' or
      (v_invite.expires_at is not null and v_invite.expires_at <= clock_timestamp()) then
    return jsonb_build_object('success', false, 'error_code', 'EXPIRED');
  end if;
  if v_invite.status <> 'pending' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_STATUS');
  end if;
  if exists (select 1 from public.households
      where id = v_invite.household_id and is_portfolio = true) then
    return jsonb_build_object('success', false, 'error_code', 'PRIVATE_SPACE');
  end if;

  select * into v_member from public.household_members
    where household_id = v_invite.household_id and user_id = p_user_id;
  if not found then
    -- The unique household/user key also arbitrates acceptance through DIFFERENT links.
    insert into public.household_members(household_id, user_id, role)
      values (v_invite.household_id, p_user_id, v_invite.invited_role)
      on conflict (household_id, user_id) do nothing
      returning * into v_member;
    v_member_created := found;
    if not v_member_created then
      select * into strict v_member from public.household_members
        where household_id = v_invite.household_id and user_id = p_user_id;
    end if;
  end if;

  if v_member_created and not v_invite.is_reusable then
    update public.invites set status = 'accepted', invited_user_id = p_user_id,
      accepted_at = clock_timestamp() where id = v_invite.id;
  end if;

  return jsonb_build_object('success', true, 'household_id', v_invite.household_id,
    'member_id', v_member.id, 'member_created', v_member_created,
    'invite_id', v_invite.id, 'inviter_id', v_invite.inviter_id);
end;
$$;

revoke all on function public.households_accept_invite_v1(text, uuid) from public, anon, authenticated;
grant execute on function public.households_accept_invite_v1(text, uuid) to service_role;

commit;
