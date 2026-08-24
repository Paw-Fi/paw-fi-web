-- Adds a USD companion to the existing EUR couple-household showcase.
-- All new IDs are deterministic UUID v5 values derived from the EUR fixture,
-- so this migration is safe to run more than once without duplicate records.

do $$
declare
  v_household_id constant uuid := '60f26d55-8e07-4652-b68f-8ea0bd074079';
  v_namespace constant uuid := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  v_usd_budget_id uuid;
  v_expense_id uuid;
begin
  if not exists (
    select 1
    from public.households household
    where household.id = v_household_id
  ) then
    raise notice 'Skipping USD couple showcase: household % does not exist.', v_household_id;
    return;
  end if;

  if (
    select count(*)
    from public.household_members member
    where member.household_id = v_household_id
  ) <> 2 then
    raise notice 'Skipping USD couple showcase: household % is not a two-member space.', v_household_id;
    return;
  end if;

  -- Clone the three verified EUR wallets first so every USD transaction keeps
  -- the required same-currency wallet binding.
  insert into public.accounts (
    id, user_id, household_id, name, icon, color, opening_balance_cents,
    goal_amount_cents, is_default, is_system, is_archived, currency,
    created_at, updated_at
  )
  select
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || account.id::text),
    account.user_id,
    account.household_id,
    account.name,
    account.icon,
    account.color,
    account.opening_balance_cents,
    account.goal_amount_cents,
    false,
    false,
    false,
    'USD',
    now(),
    now()
  from public.accounts account
  where account.id in (
    'a1010101-0101-4101-8101-010101010101',
    'a2020202-0202-4202-8202-020202020202',
    'a3030303-0303-4303-8303-030303030303'
  )
    and account.household_id = v_household_id
  on conflict (id) do update set
    name = excluded.name,
    icon = excluded.icon,
    color = excluded.color,
    opening_balance_cents = excluded.opening_balance_cents,
    goal_amount_cents = excluded.goal_amount_cents,
    is_default = false,
    is_system = false,
    is_archived = false,
    currency = 'USD',
    updated_at = now();

  -- Recreate all ordinary and recurring fixture rows in USD. Split parent
  -- links are written only after groups and lines exist below.
  insert into public.expenses (
    id, user_id, household_id, payer_user_id, date, amount_cents, currency,
    category, raw_text, merchant, source, type, privacy_scope, owner_type,
    is_recurring, recurrence_rule, account_id, base_currency, attachments,
    created_at, updated_at
  )
  select
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || expense.id::text),
    expense.user_id,
    expense.household_id,
    expense.payer_user_id,
    expense.date,
    expense.amount_cents,
    'USD',
    expense.category,
    expense.raw_text,
    expense.merchant,
    expense.source,
    expense.type,
    expense.privacy_scope,
    expense.owner_type,
    expense.is_recurring,
    expense.recurrence_rule,
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || expense.account_id::text),
    'USD',
    coalesce(expense.attachments, '[]'::jsonb),
    now(),
    now()
  from public.expenses expense
  where expense.id in (
    'b1010101-0101-4101-8101-010101010101', 'b2020202-0202-4202-8202-020202020202',
    'b3030303-0303-4303-8303-030303030303', 'b4040404-0404-4404-8404-040404040404',
    'b5050505-0505-4505-8505-050505050505', 'b6060606-0606-4606-8606-060606060606',
    'c1010101-0101-4101-8101-010101010101', 'c2020202-0202-4202-8202-020202020202',
    'c3030303-0303-4303-8303-030303030303', 'c4040404-0404-4404-8404-040404040404',
    'c5050505-0505-4505-8505-050505050505', 'c6060606-0606-4606-8606-060606060606',
    'c7070707-0707-4707-8707-070707070707', 'c8080808-0808-4808-8808-080808080808',
    'c9090909-0909-4909-8909-090909090909', 'ca101010-1010-4a10-8a10-101010101010',
    'cb101010-1010-4b10-8b10-101010101010', 'cc101010-1010-4c10-8c10-101010101010',
    'cd101010-1010-4d10-8d10-101010101010', 'ce101010-1010-4e10-8e10-101010101010',
    'cf101010-1010-4f10-8f10-101010101010', 'd1010101-0101-4101-8101-010101010101',
    'd2020202-0202-4202-8202-020202020202'
  )
    and expense.household_id = v_household_id
    and expense.deleted_at is null
  on conflict (id) do update set
    user_id = excluded.user_id,
    household_id = excluded.household_id,
    payer_user_id = excluded.payer_user_id,
    date = excluded.date,
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    category = excluded.category,
    raw_text = excluded.raw_text,
    merchant = excluded.merchant,
    source = excluded.source,
    type = excluded.type,
    privacy_scope = excluded.privacy_scope,
    owner_type = excluded.owner_type,
    is_recurring = excluded.is_recurring,
    recurrence_rule = excluded.recurrence_rule,
    account_id = excluded.account_id,
    base_currency = excluded.base_currency,
    attachments = excluded.attachments,
    deleted_at = null,
    updated_at = now();

  -- Preserve the same pocket structure and allocations in the USD scope.
  insert into public.budgets (
    id, user_id, household_id, period_month, currency, total_budget_cents,
    created_at, updated_at
  )
  select
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || budget.id::text),
    budget.user_id,
    budget.household_id,
    budget.period_month,
    'USD',
    budget.total_budget_cents,
    now(),
    now()
  from public.budgets budget
  where budget.id = 'e1010101-0101-4101-8101-010101010101'
    and budget.household_id = v_household_id
  on conflict (household_id, currency, period_month) where household_id is not null do update set
    user_id = excluded.user_id,
    total_budget_cents = excluded.total_budget_cents,
    updated_at = now()
  returning id into v_usd_budget_id;

  if v_usd_budget_id is null then
    raise notice 'Skipping USD pockets: EUR showcase budget is missing.';
  else
    insert into public.budget_envelopes (
      id, budget_id, user_id, household_id, name, budget_percentage,
      budget_amount_cents, currency, icon, color, rollover_enabled,
      rollover_negative, rollover_cap_cents, opening_rollover_cents,
      rollover_group_id, created_at, updated_at
    )
    select
      uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || envelope.id::text),
      v_usd_budget_id,
      envelope.user_id,
      envelope.household_id,
      envelope.name,
      envelope.budget_percentage,
      envelope.budget_amount_cents,
      'USD',
      envelope.icon,
      envelope.color,
      envelope.rollover_enabled,
      envelope.rollover_negative,
      envelope.rollover_cap_cents,
      envelope.opening_rollover_cents,
      uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || envelope.rollover_group_id::text),
      now(),
      now()
    from public.budget_envelopes envelope
    where envelope.id in (
      'e2010101-0101-4101-8101-010101010101', 'e2020202-0202-4202-8202-020202020202',
      'e2030303-0303-4303-8303-030303030303', 'e2040404-0404-4404-8404-040404040404',
      'e2050505-0505-4505-8505-050505050505', 'e2060606-0606-4606-8606-060606060606'
    )
      and envelope.household_id = v_household_id
    on conflict (id) do update set
      budget_id = excluded.budget_id,
      budget_percentage = excluded.budget_percentage,
      budget_amount_cents = excluded.budget_amount_cents,
      currency = excluded.currency,
      icon = excluded.icon,
      color = excluded.color,
      rollover_enabled = excluded.rollover_enabled,
      rollover_negative = excluded.rollover_negative,
      rollover_cap_cents = excluded.rollover_cap_cents,
      opening_rollover_cents = excluded.opening_rollover_cents,
      rollover_group_id = excluded.rollover_group_id,
      updated_at = now();

    insert into public.envelope_allocations (
      envelope_id, period_month, amount_cents, carryover_policy, created_at, updated_at
    )
    select
      uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || allocation.envelope_id::text),
      allocation.period_month,
      allocation.amount_cents,
      allocation.carryover_policy,
      now(),
      now()
    from public.envelope_allocations allocation
    where allocation.envelope_id in (
      'e2010101-0101-4101-8101-010101010101', 'e2020202-0202-4202-8202-020202020202',
      'e2030303-0303-4303-8303-030303030303', 'e2040404-0404-4404-8404-040404040404',
      'e2050505-0505-4505-8505-050505050505', 'e2060606-0606-4606-8606-060606060606'
    )
    on conflict (envelope_id, period_month) do update set
      amount_cents = excluded.amount_cents,
      carryover_policy = excluded.carryover_policy,
      updated_at = now();

    insert into public.envelope_category_links (
      envelope_id, category, created_at, updated_at
    )
    select
      uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || link.envelope_id::text),
      link.category,
      now(),
      now()
    from public.envelope_category_links link
    where link.envelope_id in (
      'e2010101-0101-4101-8101-010101010101', 'e2020202-0202-4202-8202-020202020202',
      'e2030303-0303-4303-8303-030303030303', 'e2040404-0404-4404-8404-040404040404',
      'e2050505-0505-4505-8505-050505050505', 'e2060606-0606-4606-8606-060606060606'
    )
    on conflict (envelope_id, category) do update set updated_at = now();
  end if;

  -- Copy complete split groups and lines, then attach each parent atomically.
  insert into public.expense_split_groups (
    id, household_id, expense_id, payer_user_id, split_type, currency,
    total_amount_cents, description, is_recurring_template, created_at, updated_at
  )
  select
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || split_group.id::text),
    split_group.household_id,
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || split_group.expense_id::text),
    split_group.payer_user_id,
    split_group.split_type,
    'USD',
    split_group.total_amount_cents,
    split_group.description,
    split_group.is_recurring_template,
    now(),
    now()
  from public.expense_split_groups split_group
  where split_group.id in (
    'f3010101-0101-4101-8101-010101010101', 'f3020202-0202-4202-8202-020202020202',
    'f3030303-0303-4303-8303-030303030303', 'f3040404-0404-4404-8404-040404040404',
    'f3050505-0505-4505-8505-050505050505', 'f3060606-0606-4606-8606-060606060606',
    'f3070707-0707-4707-8707-070707070707', 'f3080808-0808-4808-8808-080808080808',
    'f3090909-0909-4909-8909-090909090909'
  )
    and split_group.household_id = v_household_id
  on conflict (id) do update set
    payer_user_id = excluded.payer_user_id,
    split_type = excluded.split_type,
    currency = excluded.currency,
    total_amount_cents = excluded.total_amount_cents,
    description = excluded.description,
    is_recurring_template = excluded.is_recurring_template,
    updated_at = now();

  insert into public.expense_split_lines (
    split_group_id, user_id, amount_cents, percentage, shares, is_settled,
    settled_at, settled_by_user_id, settlement_note, created_at, updated_at
  )
  select
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || line.split_group_id::text),
    line.user_id,
    line.amount_cents,
    line.percentage,
    line.shares,
    false,
    null,
    null,
    null,
    now(),
    now()
  from public.expense_split_lines line
  where line.split_group_id in (
    'f3010101-0101-4101-8101-010101010101', 'f3020202-0202-4202-8202-020202020202',
    'f3030303-0303-4303-8303-030303030303', 'f3040404-0404-4404-8404-040404040404',
    'f3050505-0505-4505-8505-050505050505', 'f3060606-0606-4606-8606-060606060606',
    'f3070707-0707-4707-8707-070707070707', 'f3080808-0808-4808-8808-080808080808',
    'f3090909-0909-4909-8909-090909090909'
  )
  on conflict (split_group_id, user_id) do update set
    amount_cents = excluded.amount_cents,
    percentage = excluded.percentage,
    shares = excluded.shares,
    is_settled = false,
    settled_at = null,
    settled_by_user_id = null,
    settlement_note = null,
    updated_at = now();

  for v_expense_id in
    select uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || split_group.expense_id::text)
    from public.expense_split_groups split_group
    where split_group.id in (
      'f3010101-0101-4101-8101-010101010101', 'f3020202-0202-4202-8202-020202020202',
      'f3030303-0303-4303-8303-030303030303', 'f3040404-0404-4404-8404-040404040404',
      'f3050505-0505-4505-8505-050505050505', 'f3060606-0606-4606-8606-060606060606',
      'f3070707-0707-4707-8707-070707070707', 'f3080808-0808-4808-8808-080808080808',
      'f3090909-0909-4909-8909-090909090909'
    )
      and split_group.household_id = v_household_id
  loop
    perform set_config('moneko.settlement_split_write_expense_id', v_expense_id::text, true);
    update public.expenses expense
    set split_group_id = split_group.id,
        updated_at = now()
    from public.expense_split_groups split_group
    where split_group.expense_id = v_expense_id
      and expense.id = v_expense_id
      and expense.split_group_id is distinct from split_group.id;
  end loop;
  perform set_config('moneko.settlement_split_write_expense_id', '', true);

  -- Pairwise settlement refuses a split outside this private finalization
  -- ledger. Future recurring templates intentionally remain excluded.
  insert into public.household_settlement_finalized_split_groups (
    split_group_id, completed_at, validation_profile
  )
  select
    uuid_generate_v5(v_namespace, 'moneko-usd-showcase:' || split_group.id::text),
    clock_timestamp(),
    'strict_current'
  from public.expense_split_groups split_group
  where split_group.id in (
    'f3040404-0404-4404-8404-040404040404', 'f3050505-0505-4505-8505-050505050505',
    'f3060606-0606-4606-8606-060606060606', 'f3070707-0707-4707-8707-070707070707',
    'f3080808-0808-4808-8808-080808080808', 'f3090909-0909-4909-8909-090909090909'
  )
    and split_group.household_id = v_household_id
    and split_group.is_recurring_template is false
  on conflict (split_group_id) do update set
    completed_at = excluded.completed_at,
    validation_profile = excluded.validation_profile,
    legacy_parent_household_mismatch = false,
    legacy_parent_currency_mismatch = false,
    legacy_parent_amount_mismatch = false,
    legacy_rounding_delta_cents = 0;
end;
$$;
