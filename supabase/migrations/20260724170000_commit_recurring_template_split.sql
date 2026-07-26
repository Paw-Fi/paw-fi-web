create or replace function public.households_commit_recurring_template_split_v1(
  p_actor_user_id uuid, p_expense_id uuid, p_split_group_id uuid,
  p_household_id uuid, p_payer_user_id uuid, p_split_type text,
  p_currency text, p_total_amount_cents bigint, p_description text,
  p_lines jsonb, p_expected_parent jsonb, p_target_account_id uuid default null,
  p_expense_patch jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_expense public.expenses%rowtype;
declare v_role text := coalesce(nullif((select auth.jwt() ->> 'role'), ''), nullif(current_setting('request.jwt.claim.role', true), ''), '');
begin
  if v_role <> 'service_role'
    or not public.is_member_of_household(p_household_id, p_actor_user_id) then
    raise exception 'recurring_template_split_unauthorized';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('household:' || p_household_id::text, 0));
  select * into strict v_expense from public.expenses
  where id = p_expense_id and deleted_at is null for update;
  if v_expense.is_recurring is not true or v_expense.household_id is distinct from p_household_id
    or v_expense.amount_cents <> p_total_amount_cents or upper(v_expense.currency) <> upper(p_currency) then
    raise exception 'recurring_template_split_parent_mismatch';
  end if;
  if not exists (select 1 from public.household_members where household_id = p_household_id and user_id = p_payer_user_id) then
    raise exception 'recurring_template_split_payer_not_member';
  end if;
  insert into public.expense_split_groups (
    id, household_id, expense_id, payer_user_id, split_type, currency,
    total_amount_cents, description, is_recurring_template
  ) values (
    p_split_group_id, p_household_id, p_expense_id, p_payer_user_id,
    p_split_type::public.split_type, upper(p_currency), p_total_amount_cents,
    p_description, true
  ) on conflict (id) do update set
    payer_user_id = excluded.payer_user_id, split_type = excluded.split_type,
    currency = excluded.currency, total_amount_cents = excluded.total_amount_cents,
    description = excluded.description, is_recurring_template = true;
  insert into public.expense_split_lines (
    split_group_id, user_id, amount_cents, percentage, shares, is_settled, settled_at
  ) select p_split_group_id, line.user_id, line.amount_cents, line.percentage,
    line.shares, false, null
  from jsonb_to_recordset(p_lines) as line(user_id uuid, amount_cents bigint, percentage numeric, shares integer)
  on conflict (split_group_id, user_id) do update set
    amount_cents = excluded.amount_cents, percentage = excluded.percentage,
    shares = excluded.shares, is_settled = false, settled_at = null;
  delete from public.expense_split_lines line where line.split_group_id = p_split_group_id
    and not exists (select 1 from jsonb_to_recordset(p_lines) as input(user_id uuid) where input.user_id = line.user_id);
  perform set_config('moneko.settlement_split_write_expense_id', p_expense_id::text, true);
  update public.expenses set split_group_id = p_split_group_id,
    account_id = coalesce(p_target_account_id, account_id) where id = p_expense_id;
  perform public.households_apply_expense_patch_v3(
    p_expense_id,
    coalesce(p_expense_patch, '{}'::jsonb)
  );
  return jsonb_build_object('split_group_id', p_split_group_id);
end; $$;
revoke all on function public.households_commit_recurring_template_split_v1(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.households_commit_recurring_template_split_v1(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,jsonb) to service_role;
