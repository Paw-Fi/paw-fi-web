create or replace function public.cleanup_orphaned_pocket_logo()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_marker constant text := '/storage/v1/object/public/public/';
  v_marker_pos integer;
  v_storage_path text;
  v_new_storage_path text;
begin
  if old.logo_url is null or trim(old.logo_url) = '' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.logo_url is not distinct from old.logo_url then
    return new;
  end if;

  if exists (
    select 1
    from public.budget_envelopes e
    where e.id <> old.id
      and e.logo_url = old.logo_url
    limit 1
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_marker_pos := position(v_marker in old.logo_url);
  if v_marker_pos = 0 then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_storage_path := substring(
    old.logo_url
    from v_marker_pos + char_length(v_marker)
  );
  v_storage_path := split_part(split_part(v_storage_path, '?', 1), '#', 1);

  if v_storage_path !~ ('^' || old.user_id::text || '/pocket-logos/[^?#]+$') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.logo_url is not null
     and position(v_marker in new.logo_url) > 0 then
    v_new_storage_path := substring(
      new.logo_url
      from position(v_marker in new.logo_url) + char_length(v_marker)
    );
    v_new_storage_path :=
      split_part(split_part(v_new_storage_path, '?', 1), '#', 1);

    if v_new_storage_path = v_storage_path then
      return new;
    end if;
  end if;

  if exists (
    select 1
    from public.budget_envelopes e
    where e.id <> old.id
      and e.logo_url is not null
      and position(v_marker in e.logo_url) > 0
      and split_part(
        split_part(
          substring(e.logo_url from position(v_marker in e.logo_url) + char_length(v_marker)),
          '?',
          1
        ),
        '#',
        1
      ) = v_storage_path
    limit 1
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  begin
    delete from storage.objects
    where bucket_id = 'public'
      and name = v_storage_path;
  exception when others then
    raise warning 'Failed to delete pocket logo storage object %: %',
      v_storage_path,
      sqlerrm;
  end;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists cleanup_orphaned_pocket_logo_after_delete
  on public.budget_envelopes;
drop trigger if exists cleanup_orphaned_pocket_logo_after_update
  on public.budget_envelopes;

create trigger cleanup_orphaned_pocket_logo_after_delete
after delete on public.budget_envelopes
for each row
execute function public.cleanup_orphaned_pocket_logo();

create trigger cleanup_orphaned_pocket_logo_after_update
after update of logo_url on public.budget_envelopes
for each row
execute function public.cleanup_orphaned_pocket_logo();

create or replace function public.delete_pocket_envelope_with_allocations(
  p_envelope_id uuid,
  p_budget_id uuid,
  p_period_month date,
  p_sibling_allocations jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_envelope record;
  v_budget record;
  v_item jsonb;
  v_sibling_id uuid;
  v_amount_cents bigint;
  v_updated_siblings integer := 0;
  v_logo_marker constant text := '/storage/v1/object/public/public/';
  v_logo_marker_pos integer;
  v_logo_storage_path text;
  v_logo_still_referenced boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Unauthorized',
      'code', 'UNAUTHORIZED'
    );
  end if;

  if p_envelope_id is null or p_budget_id is null or p_period_month is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Valid envelopeId, budgetId, and periodMonth are required',
      'code', 'VALIDATION_ERROR'
    );
  end if;

  select e.*
  into v_envelope
  from public.budget_envelopes e
  where e.id = p_envelope_id
    and e.budget_id = p_budget_id
  for update;

  if not found then
    select b.*
    into v_budget
    from public.budgets b
    where b.id = p_budget_id
    limit 1;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'Pocket not found',
        'code', 'NOT_FOUND'
      );
    end if;

    if v_budget.user_id is distinct from auth.uid()
       and (
         v_budget.household_id is null
         or not public.is_member_of_household(v_budget.household_id)
       ) then
      return jsonb_build_object(
        'success', false,
        'error', 'Forbidden',
        'code', 'UNAUTHORIZED'
      );
    end if;

    return jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'id', p_envelope_id,
        'deleted', false,
        'budgetId', p_budget_id,
        'periodMonth', p_period_month,
        'logoUrl', null,
        'logoStoragePath', null,
        'logoStillReferenced', false,
        'updatedSiblingCount', 0
      )
    );
  end if;

  if v_envelope.user_id is distinct from auth.uid()
     and (
       v_envelope.household_id is null
       or not public.is_member_of_household(v_envelope.household_id)
     ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Forbidden',
      'code', 'UNAUTHORIZED'
    );
  end if;

  if v_envelope.logo_url is not null and trim(v_envelope.logo_url) <> '' then
    v_logo_marker_pos := position(v_logo_marker in v_envelope.logo_url);
    if v_logo_marker_pos > 0 then
      v_logo_storage_path := substring(
        v_envelope.logo_url
        from v_logo_marker_pos + char_length(v_logo_marker)
      );
      v_logo_storage_path :=
        split_part(split_part(v_logo_storage_path, '?', 1), '#', 1);

      if v_logo_storage_path !~ ('^' || v_envelope.user_id::text || '/pocket-logos/[^?#]+$') then
        v_logo_storage_path := null;
      end if;
    end if;
  end if;

  if v_logo_storage_path is not null then
    select exists (
      select 1
      from public.budget_envelopes e
      where e.id <> p_envelope_id
        and e.logo_url is not null
        and position(v_logo_marker in e.logo_url) > 0
        and split_part(
          split_part(
            substring(e.logo_url from position(v_logo_marker in e.logo_url) + char_length(v_logo_marker)),
            '?',
            1
          ),
          '#',
          1
        ) = v_logo_storage_path
      limit 1
    ) into v_logo_still_referenced;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_sibling_allocations, '[]'::jsonb))
  loop
    v_sibling_id := nullif(v_item ->> 'id', '')::uuid;
    v_amount_cents := coalesce((v_item ->> 'amountCents')::bigint, 0);

    if v_sibling_id is null or v_sibling_id = p_envelope_id then
      continue;
    end if;

    update public.budget_envelopes e
    set
      budget_amount_cents = v_amount_cents,
      updated_at = now()
    where e.id = v_sibling_id
      and e.budget_id = p_budget_id
      and e.user_id = v_envelope.user_id
      and e.household_id is not distinct from v_envelope.household_id;

    if found then
      insert into public.envelope_allocations (
        envelope_id,
        period_month,
        amount_cents,
        carryover_policy,
        updated_at
      )
      values (
        v_sibling_id,
        p_period_month,
        v_amount_cents,
        'carryover',
        now()
      )
      on conflict (envelope_id, period_month)
      do update set
        amount_cents = excluded.amount_cents,
        carryover_policy = excluded.carryover_policy,
        updated_at = excluded.updated_at;

      v_updated_siblings := v_updated_siblings + 1;
    end if;
  end loop;

  delete from public.budget_envelopes e
  where e.id = p_envelope_id
    and e.budget_id = p_budget_id;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', p_envelope_id,
      'deleted', true,
      'budgetId', p_budget_id,
      'periodMonth', p_period_month,
      'logoUrl', v_envelope.logo_url,
      'logoStoragePath',
        case when v_logo_still_referenced then null else v_logo_storage_path end,
      'logoStillReferenced', v_logo_still_referenced,
      'updatedSiblingCount', v_updated_siblings
    )
  );
exception
  when invalid_text_representation then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid sibling allocation payload',
      'code', 'VALIDATION_ERROR'
    );
end;
$$;

revoke all on function public.cleanup_orphaned_pocket_logo() from public, anon, authenticated;
revoke all on function public.delete_pocket_envelope_with_allocations(uuid, uuid, date, jsonb)
  from public, anon, authenticated;

grant execute on function public.delete_pocket_envelope_with_allocations(uuid, uuid, date, jsonb)
  to authenticated;

comment on function public.cleanup_orphaned_pocket_logo() is
  'Removes an uploaded pocket logo object from public storage after the last budget_envelopes.logo_url reference is deleted or replaced.';

comment on function public.delete_pocket_envelope_with_allocations(uuid, uuid, date, jsonb) is
  'Atomically deletes one pocket envelope and applies same-month sibling allocation updates. Envelope allocations and category links cascade from budget_envelopes.';
