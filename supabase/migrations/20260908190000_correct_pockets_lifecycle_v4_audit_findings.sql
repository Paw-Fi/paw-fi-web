-- Corrective follow-up for the v4 lifecycle foundation. Historical migrations
-- remain immutable; this migration replaces only the live RPC definitions.

create or replace function public.pocket_cycle_anchor_v1(
  p_user_id uuid,
  p_date date
) returns date
language sql
stable
security definer
set search_path = ''
as $$
  with candidate as (
    select public.financial_cycle_start_for_month(
      p_date,
      public.user_financial_month_start_day(p_user_id)
    ) as starts_on,
    public.user_financial_month_start_day(p_user_id) as start_day
  )
  select case
    when p_date < starts_on then public.previous_financial_cycle_start(starts_on, start_day)
    else starts_on
  end
  from candidate;
$$;

create or replace function public.pocket_budget_anchor_v1(
  p_user_id uuid,
  p_date date
) returns date
language sql
stable
security definer
set search_path = ''
as $$
  select date_trunc('month', public.pocket_cycle_anchor_v1(p_user_id, p_date))::date;
$$;

alter table public.pocket_lineage_retirements
  add column if not exists disposition text,
  add column if not exists target_lineage_id uuid references public.pocket_lineages(id) on delete restrict;

-- Reused IDs must describe the same scope. The original trigger accepted a
-- conflicting envelope because ON CONFLICT silently discarded its lineage row.
create or replace function public.ensure_pocket_lineage_for_envelope_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget public.budgets%rowtype;
  v_scope text;
  v_lineage public.pocket_lineages%rowtype;
begin
  if new.rollover_group_id is null then
    new.rollover_group_id := gen_random_uuid();
  end if;
  select * into v_budget from public.budgets where id = new.budget_id;
  if not found then
    raise exception 'Unknown budget for pocket envelope' using errcode = '23503';
  end if;
  v_scope := case
    when new.household_id is null then 'personal'
    when exists (
      select 1 from public.households household
      where household.id = new.household_id
        and coalesce(household.is_portfolio, false)
    ) then 'portfolio'
    else 'household'
  end;
  select * into v_lineage
  from public.pocket_lineages
  where id = new.rollover_group_id;
  if found then
    if v_lineage.owner_user_id is distinct from new.user_id
       or v_lineage.household_id is distinct from new.household_id
       or v_lineage.scope <> v_scope
       or v_lineage.currency <> upper(coalesce(nullif(trim(new.currency), ''), 'USD')) then
      raise exception 'Pocket lineage cannot be reused outside its original scope' using errcode = '22023';
    end if;
    return new;
  end if;
  insert into public.pocket_lineages (
    id, owner_user_id, household_id, scope, currency, name, icon, color,
    rollover_enabled, rollover_negative, rollover_cap_cents, activated_on
  ) values (
    new.rollover_group_id, new.user_id, new.household_id, v_scope,
    upper(coalesce(nullif(trim(new.currency), ''), 'USD')), new.name, new.icon,
    new.color, coalesce(new.rollover_enabled, false),
    coalesce(new.rollover_negative, false), new.rollover_cap_cents,
    date_trunc('month', v_budget.period_month)::date
  );
  return new;
end;
$$;

-- Household lineage activation must not depend on which member created the
-- latest envelope. A shared lineage is owned by its household scope.
update public.pocket_lineages lineage
set status = case
  when exists (
    select 1
    from public.budget_envelopes envelope
    join public.budgets budget on budget.id = envelope.budget_id
    where envelope.rollover_group_id = lineage.id
      and budget.period_month = (
        select max(latest_budget.period_month)
        from public.budget_envelopes latest_envelope
        join public.budgets latest_budget on latest_budget.id = latest_envelope.budget_id
        where latest_envelope.household_id is not distinct from lineage.household_id
          and upper(latest_envelope.currency) = lineage.currency
          and (lineage.scope = 'household' or latest_envelope.user_id = lineage.owner_user_id)
      )
  ) or lineage.rollover_enabled then 'active'
  else 'dormant'
end,
activation_reason = case
  when lineage.rollover_enabled then 'rollover_continuation'
  else 'latest_cycle'
end
where lineage.status <> 'retired';

create or replace function public.update_pocket_lineage_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_lineage_id uuid,
  p_expected_revision integer,
  p_name text,
  p_icon text default null,
  p_color text default null,
  p_rollover_enabled boolean default null,
  p_rollover_negative boolean default null,
  p_rollover_cap_cents bigint default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_lineage public.pocket_lineages%rowtype;
begin
  if p_expected_revision is null or p_expected_revision < 0
     or nullif(trim(p_name), '') is null or p_rollover_cap_cents < 0 then
    raise exception 'Invalid pocket lineage update' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Client user does not match authenticated user' using errcode = '42501';
  end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then
    raise exception 'Unauthorized pocket lineage update' using errcode = '42501';
  end if;
  select * into v_lineage from public.pocket_lineages lineage
  where lineage.id = p_lineage_id and lineage.scope = v_scope
    and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
  for update;
  if not found then raise exception 'Unknown pocket lineage for scope' using errcode = '22023'; end if;
  if v_lineage.revision <> p_expected_revision then
    raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001';
  end if;
  update public.pocket_lineages
  set name = trim(p_name), icon = p_icon, color = p_color,
      rollover_enabled = coalesce(p_rollover_enabled, rollover_enabled),
      rollover_negative = coalesce(p_rollover_negative, rollover_negative),
      rollover_cap_cents = p_rollover_cap_cents,
      revision = revision + 1, updated_at = now()
  where id = p_lineage_id returning * into v_lineage;
  return to_jsonb(v_lineage);
end;
$$;

create or replace function public.update_pocket_lineage_funding_policy_v1(
  p_user_id uuid, p_scope text, p_household_id uuid, p_lineage_id uuid,
  p_expected_revision integer, p_funding_policy text,
  p_funding_target_cents bigint default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_policy text := lower(coalesce(nullif(trim(p_funding_policy), ''), ''));
  v_lineage public.pocket_lineages%rowtype;
begin
  if p_expected_revision is null or p_expected_revision < 0
     or v_policy not in ('refill_to', 'add_every_cycle', 'decide_each_cycle')
     or p_funding_target_cents < 0
     or (v_policy <> 'decide_each_cycle' and p_funding_target_cents is null) then
    raise exception 'Invalid pocket funding policy' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pocket funding policy access' using errcode = '42501'; end if;
  select * into v_lineage from public.pocket_lineages lineage
  where lineage.id = p_lineage_id and lineage.scope = v_scope
    and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id) for update;
  if not found then raise exception 'Unknown pocket lineage for scope' using errcode = '22023'; end if;
  if v_lineage.revision <> p_expected_revision then raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001'; end if;
  if v_policy = 'decide_each_cycle' and p_funding_target_cents is not null then raise exception 'decide_each_cycle does not accept a funding target' using errcode = '22023'; end if;
  update public.pocket_lineages set funding_policy = v_policy,
    funding_target_cents = p_funding_target_cents, revision = revision + 1, updated_at = now()
  where id = v_lineage.id returning * into v_lineage;
  return jsonb_build_object('lineage', to_jsonb(v_lineage), 'lineage_id', v_lineage.id,
    'funding_policy', v_lineage.funding_policy, 'funding_target_cents', v_lineage.funding_target_cents,
    'revision', v_lineage.revision);
end;
$$;

create or replace function public.set_pocket_lineage_categories_v1(
  p_user_id uuid, p_scope text, p_household_id uuid, p_lineage_id uuid,
  p_expected_revision integer, p_effective_month date, p_categories text[]
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_month date := public.pocket_budget_anchor_v1(p_user_id, p_effective_month);
  v_lineage public.pocket_lineages%rowtype;
  v_envelope_id uuid;
begin
  if p_effective_month is null or p_expected_revision is null or p_expected_revision < 0 or p_categories is null
     or exists (select 1 from unnest(p_categories) category where nullif(trim(category), '') is null)
     or cardinality(p_categories) <> cardinality(array(select distinct lower(trim(category)) from unnest(p_categories) category)) then
    raise exception 'Invalid pocket category assignment' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pocket category assignment' using errcode = '42501'; end if;
  select * into v_lineage from public.pocket_lineages lineage where lineage.id = p_lineage_id
    and lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id) for update;
  if not found then raise exception 'Unknown pocket lineage for scope' using errcode = '22023'; end if;
  if v_lineage.revision <> p_expected_revision then raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001'; end if;
  -- Replacing a same-month edit is idempotent; only intervals spanning this
  -- anchor close, so a later effective assignment remains intact.
  delete from public.pocket_lineage_category_assignments
  where lineage_id = p_lineage_id and effective_from = v_month;
  update public.pocket_lineage_category_assignments
  set effective_until = v_month - 1, updated_at = now()
  where lineage_id = p_lineage_id and effective_from < v_month
    and (effective_until is null or effective_until >= v_month);
  insert into public.pocket_lineage_category_assignments (lineage_id, category, effective_from, effective_until)
  select p_lineage_id, lower(trim(category)), v_month,
    (select min(later.effective_from) - 1 from public.pocket_lineage_category_assignments later
     where later.lineage_id = p_lineage_id and later.category = lower(trim(category)) and later.effective_from > v_month)
  from unnest(p_categories) category;
  update public.pocket_lineages set revision = revision + 1, updated_at = now()
  where id = p_lineage_id returning * into v_lineage;
  select envelope.id into v_envelope_id from public.budgets budget join public.budget_envelopes envelope on envelope.budget_id = budget.id
  where envelope.rollover_group_id = p_lineage_id and budget.period_month = v_month limit 1;
  if v_envelope_id is not null then
    delete from public.envelope_category_links where envelope_id = v_envelope_id;
    insert into public.envelope_category_links (envelope_id, category)
    select v_envelope_id, lower(trim(category)) from unnest(p_categories) category;
  end if;
  return jsonb_build_object('lineage', to_jsonb(v_lineage), 'lineage_id', v_lineage.id,
    'revision', v_lineage.revision, 'effective_month', v_month,
    'categories', to_jsonb(array(select lower(trim(category)) from unnest(p_categories) category order by 1)));
end;
$$;

create or replace function public.calculate_pocket_cycle_carry_v3(
  p_user_id uuid, p_scope text, p_household_id uuid, p_currency text,
  p_lineage_id uuid, p_budget_month date
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_anchor date := public.pocket_budget_anchor_v1(p_user_id, p_budget_month);
  v_lineage public.pocket_lineages%rowtype;
  v_month date;
  v_cycle_start date;
  v_cycle_end date;
  v_base bigint;
  v_spent bigint;
  v_adjustments bigint;
  v_carry bigint := 0;
begin
  select * into v_lineage from public.pocket_lineages where id = p_lineage_id;
  if not found or (v_scope <> 'household' and v_lineage.owner_user_id is distinct from p_user_id)
     or v_lineage.household_id is distinct from p_household_id or v_lineage.scope <> v_scope
     or v_lineage.currency <> upper(coalesce(nullif(trim(p_currency), ''), 'USD')) then raise exception 'Unknown pocket lineage for scope' using errcode = '22023'; end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_access_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pocket carry access' using errcode = '42501'; end if;
  v_month := date_trunc('month', v_lineage.activated_on)::date;
  while v_month < v_anchor loop
    v_cycle_start := public.pocket_cycle_anchor_v1(p_user_id, v_month);
    v_cycle_end := public.next_financial_cycle_start(v_cycle_start, public.user_financial_month_start_day(p_user_id));
    select coalesce(allocation.amount_cents, envelope.budget_amount_cents, 0)::bigint into v_base
    from public.budgets budget join public.budget_envelopes envelope on envelope.budget_id = budget.id
    left join public.envelope_allocations allocation on allocation.envelope_id = envelope.id and allocation.period_month = v_month
    where budget.period_month = v_month and envelope.rollover_group_id = p_lineage_id order by envelope.updated_at desc nulls last limit 1;
    select coalesce(sum(amount_cents), 0)::bigint into v_adjustments from public.pocket_lineage_balance_adjustments
    where lineage_id = p_lineage_id and effective_month = v_month;
    select coalesce(sum(abs(expense.amount_cents) * expense.analytics_spending_multiplier), 0)::bigint into v_spent
    from public.expenses expense where expense.analytics_is_final is true and expense.analytics_spending_multiplier <> 0
      and upper(coalesce(expense.currency, '')) = v_lineage.currency and expense.deleted_at is null
      and expense.date >= v_cycle_start and expense.date < v_cycle_end and exists (
        select 1 from public.pocket_lineage_category_assignments assignment where assignment.lineage_id = p_lineage_id
          and lower(trim(assignment.category)) = lower(trim(coalesce(expense.category, '')))
          and assignment.effective_from <= v_month and (assignment.effective_until is null or assignment.effective_until >= v_month))
      and ((v_scope = 'household' and expense.household_id = p_household_id)
        or (v_scope = 'personal' and expense.user_id = p_user_id and expense.household_id is null)
        or (v_scope = 'portfolio' and expense.user_id = p_user_id and expense.household_id = p_household_id));
    if v_lineage.rollover_enabled then
      v_carry := coalesce(v_base, 0) + v_carry + v_adjustments - v_spent;
      if v_carry < 0 and not v_lineage.rollover_negative then v_carry := 0;
      elsif v_lineage.rollover_cap_cents is not null and v_carry > v_lineage.rollover_cap_cents then v_carry := v_lineage.rollover_cap_cents; end if;
    else v_carry := 0; end if;
    v_month := (v_month + interval '1 month')::date;
  end loop;
  return jsonb_build_object('lineage_id', p_lineage_id, 'is_virtual', true, 'carry_cents', v_carry,
    'retired', exists (select 1 from public.pocket_lineage_retirements retirement where retirement.lineage_id = p_lineage_id and retirement.effective_month <= v_anchor));
end;
$$;

create or replace function public.get_pockets_month_v4(
  p_user_id uuid, p_scope text, p_budget_month date, p_household_id uuid default null,
  p_currency text default null, p_include_projected_recurring boolean default true,
  p_allow_currency_fallback boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_anchor date;
  v_cycle_start date;
  v_currency text;
  v_payload jsonb;
  v_review jsonb;
  v_can_edit boolean;
  v_facts jsonb;
  v_previous_allocations jsonb;
  v_suggestions jsonb;
  v_virtual_rows jsonb;
begin
  if p_budget_month is null or v_scope not in ('personal', 'household', 'portfolio') then raise exception 'Invalid pockets month request' using errcode = '22023'; end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_access_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pockets access' using errcode = '42501'; end if;
  v_anchor := public.pocket_budget_anchor_v1(p_user_id, p_budget_month);
  v_cycle_start := public.pocket_cycle_anchor_v1(p_user_id, p_budget_month);
  v_can_edit := public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope);
  v_payload := public.get_pockets_month_v3(p_user_id, v_scope, v_anchor, p_household_id, p_currency, p_include_projected_recurring, p_allow_currency_fallback);
  v_currency := upper(coalesce(nullif(v_payload ->> 'selected_currency', ''), p_currency, 'USD'));
  select to_jsonb(review) into v_review from public.pocket_month_reviews review
  where review.scope = v_scope
    and review.scope_key = coalesce(p_household_id, p_user_id)
    and review.currency = v_currency and review.budget_month = v_anchor;

  select coalesce(jsonb_agg(jsonb_build_object('lineage_id', allocation.lineage_id, 'amount_cents', allocation.amount_cents) order by allocation.lineage_id), '[]'::jsonb)
  into v_previous_allocations
  from (
    select distinct on (envelope.rollover_group_id) envelope.rollover_group_id as lineage_id, allocation.amount_cents
    from public.budget_envelopes envelope join public.budgets budget on budget.id = envelope.budget_id
    join public.envelope_allocations allocation on allocation.envelope_id = envelope.id
    join public.pocket_lineages lineage on lineage.id = envelope.rollover_group_id
    where budget.period_month < v_anchor and allocation.period_month < v_anchor
      and lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id
      and (v_scope = 'household' or lineage.owner_user_id = p_user_id) and lineage.currency = v_currency
    order by envelope.rollover_group_id, allocation.period_month desc
  ) allocation;

  select coalesce(jsonb_agg(jsonb_build_object(
    'lineage_id', lineage.id, 'envelope_id', envelope.id, 'label', lineage.name,
    'amount_cents', case lineage.funding_policy
      when 'add_every_cycle' then lineage.funding_target_cents
      when 'refill_to' then greatest(coalesce(lineage.funding_target_cents, 0) - greatest(coalesce((carry.value ->> 'carry_cents')::bigint, 0), 0), 0)
      else coalesce(current_allocation.amount_cents, previous.amount_cents, 0) end,
    'incoming_carry_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0),
    'funding_policy', lineage.funding_policy,
    'funding_target_cents', lineage.funding_target_cents,
    'reason_code', case lineage.funding_policy when 'add_every_cycle' then 'monthly_contribution' when 'refill_to' then 'refill_after_carry' else 'last_confirmed_allocation' end
  ) order by lineage.created_at, lineage.id), '[]'::jsonb) into v_suggestions
  from public.pocket_lineages lineage
  left join public.budget_envelopes envelope on envelope.budget_id = nullif(v_payload -> 'budget' ->> 'id', '')::uuid and envelope.rollover_group_id = lineage.id
  left join public.envelope_allocations current_allocation on current_allocation.envelope_id = envelope.id and current_allocation.period_month = v_anchor
  left join lateral (select (item ->> 'amount_cents')::bigint as amount_cents from jsonb_array_elements(v_previous_allocations) item where nullif(item ->> 'lineage_id', '')::uuid = lineage.id) previous on true
  left join lateral (select public.calculate_pocket_cycle_carry_v3(p_user_id, v_scope, p_household_id, v_currency, lineage.id, v_anchor) as value) carry on true
  left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
  where lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id) and lineage.currency = v_currency
    and lineage.activated_on <= v_anchor and lineage.status = 'active'
    and (retirement.effective_month is null or retirement.effective_month > v_anchor);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', lineage.id, 'rollover_group_id', lineage.id, 'pocket_lineage_id', lineage.id,
    'is_virtual', true, 'name', lineage.name, 'icon', lineage.icon, 'color', lineage.color,
    'currency', lineage.currency, 'rollover_enabled', lineage.rollover_enabled,
    'rollover_negative', lineage.rollover_negative, 'rollover_cap_cents', lineage.rollover_cap_cents,
    'funding_policy', lineage.funding_policy, 'funding_target_cents', lineage.funding_target_cents,
    'incoming_carry_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0),
    'available_budget_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0) + coalesce(adjustments.amount_cents, 0),
    'remaining_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0) + coalesce(adjustments.amount_cents, 0),
    'status', lineage.status, 'revision', lineage.revision, 'activated_on', lineage.activated_on,
    'retired_effective_month', retirement.effective_month, 'effective_categories', categories.rows,
    'categories', categories.rows, 'balance_adjustments_cents', coalesce(adjustments.amount_cents, 0)
  ) order by lineage.created_at, lineage.id), '[]'::jsonb) into v_virtual_rows
  from public.pocket_lineages lineage
  left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
  left join lateral (select coalesce(jsonb_agg(assignment.category order by assignment.category), '[]'::jsonb) as rows from public.pocket_lineage_category_assignments assignment where assignment.lineage_id = lineage.id and assignment.effective_from <= v_anchor and (assignment.effective_until is null or assignment.effective_until >= v_anchor)) categories on true
  left join lateral (select coalesce(sum(amount_cents), 0)::bigint as amount_cents from public.pocket_lineage_balance_adjustments adjustment where adjustment.lineage_id = lineage.id and adjustment.effective_month = v_anchor) adjustments on true
  left join lateral (select public.calculate_pocket_cycle_carry_v3(p_user_id, v_scope, p_household_id, v_currency, lineage.id, v_anchor) as value) carry on true
  where lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id) and lineage.currency = v_currency
    and lineage.activated_on <= v_anchor and lineage.status = 'active'
    and (retirement.effective_month is null or retirement.effective_month > v_anchor)
    and not exists (select 1 from jsonb_array_elements(coalesce(v_payload -> 'envelopes', '[]'::jsonb)) item where nullif(item ->> 'rollover_group_id', '')::uuid = lineage.id);

  v_facts := jsonb_build_object(
    'monthly_budget_cents', coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0),
    'current_allocations', coalesce(v_payload -> 'allocations', '[]'::jsonb),
    'previous_allocations', v_previous_allocations,
    'carry_cents', coalesce((select sum((item ->> 'incoming_carry_cents')::bigint) from jsonb_array_elements(v_suggestions) item), 0)
  );
  return v_payload || jsonb_build_object(
    'normalized_calculation_facts', jsonb_build_array(
      jsonb_build_object('id', 'fact:monthly_budget_cents', 'value_cents', v_facts -> 'monthly_budget_cents'),
      jsonb_build_object('id', 'fact:allocated_cents', 'value_cents', coalesce((select sum((item ->> 'amount_cents')::bigint) from jsonb_array_elements(v_payload -> 'allocations') item), 0)),
      jsonb_build_object('id', 'fact:unassigned_cents', 'value_cents', greatest(coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0) - coalesce((select sum((item ->> 'amount_cents')::bigint) from jsonb_array_elements(v_payload -> 'allocations') item), 0), 0)),
      jsonb_build_object('id', 'fact:carry_cents', 'value_cents', v_facts -> 'carry_cents')
    ),
    'pockets_v4', jsonb_build_object(
      'contract_version', 4, 'scope', v_scope, 'household_id', p_household_id,
      'currency', v_currency, 'budget_month', v_anchor, 'cycle_start', v_cycle_start,
      'can_edit', v_can_edit, 'is_current_period', v_cycle_start = public.pocket_cycle_anchor_v1(p_user_id, current_date),
      'setup_revision', coalesce((v_review ->> 'setup_revision')::integer, 0),
      'lifecycle_virtual_rows', v_virtual_rows,
      'review', case when nullif(v_payload -> 'budget' ->> 'id', '') is null then null else coalesce(v_review, '{}'::jsonb) || jsonb_build_object(
        'contract_version', 4, 'scope', v_scope, 'household_id', p_household_id,
        'currency', v_currency, 'budget_month', v_anchor, 'cycle_start', v_cycle_start,
        'monthly_budget_cents', v_facts -> 'monthly_budget_cents', 'current_allocations', v_facts -> 'current_allocations',
        'previous_allocations', v_previous_allocations, 'carry_cents', v_facts -> 'carry_cents',
        'unassigned_cents', greatest(coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0) - coalesce((select sum((item ->> 'amount_cents')::bigint) from jsonb_array_elements(v_payload -> 'allocations') item), 0), 0),
        'facts', v_facts, 'suggestions', v_suggestions, 'currency', v_currency, 'can_edit', v_can_edit,
        'is_current_period', v_cycle_start = public.pocket_cycle_anchor_v1(p_user_id, current_date)
      ) end
    )
  );
end;
$$;

create or replace function public.confirm_pockets_month_setup_v1(
  p_user_id uuid, p_scope text, p_budget_month date, p_household_id uuid,
  p_currency text, p_expected_setup_revision integer, p_allocations jsonb
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_anchor date;
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_budget_id uuid;
  v_owner_user_id uuid;
  v_budget_total bigint;
  v_review public.pocket_month_reviews%rowtype;
  v_item jsonb;
  v_lineage public.pocket_lineages%rowtype;
  v_envelope_id uuid;
  v_final_total bigint;
begin
  if p_budget_month is null or p_expected_setup_revision is null or p_expected_setup_revision < 0
     or jsonb_typeof(coalesce(p_allocations, '[]'::jsonb)) <> 'array'
     or v_scope not in ('personal', 'household', 'portfolio') then raise exception 'Invalid pocket setup request' using errcode = '22023'; end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pocket setup access' using errcode = '42501'; end if;
  v_anchor := public.pocket_budget_anchor_v1(p_user_id, p_budget_month);
  if public.pocket_cycle_anchor_v1(p_user_id, p_budget_month) is distinct from public.pocket_cycle_anchor_v1(p_user_id, current_date) then
    raise exception 'Pocket setup reviews are available only for the current financial cycle' using errcode = '22023';
  end if;
  select budget.id, budget.user_id, budget.total_budget_cents into v_budget_id, v_owner_user_id, v_budget_total
  from public.budgets budget where budget.period_month = v_anchor and upper(budget.currency) = v_currency
    and ((v_scope = 'personal' and budget.household_id is null and budget.user_id = p_user_id)
      or (v_scope = 'household' and budget.household_id = p_household_id)
      or (v_scope = 'portfolio' and budget.household_id = p_household_id and budget.user_id = p_user_id)) for update;
  if v_budget_id is null then raise exception 'No authoritative budget exists for this pockets month' using errcode = '22023'; end if;
  insert into public.pocket_month_reviews (owner_user_id, household_id, scope, budget_month, currency, setup_revision)
  values (v_owner_user_id, p_household_id, v_scope, v_anchor, v_currency, 0)
  on conflict (scope, scope_key, currency, budget_month) do nothing;
  select * into v_review from public.pocket_month_reviews review
  where review.scope = v_scope and review.scope_key = coalesce(p_household_id, p_user_id)
    and review.currency = v_currency and review.budget_month = v_anchor for update;
  if v_review.setup_revision <> p_expected_setup_revision then raise exception 'POCKET_SETUP_STALE_REVISION' using errcode = '40001'; end if;
  if exists (select 1 from jsonb_array_elements(p_allocations) item group by nullif(item ->> 'lineage_id', '') having count(*) > 1) then raise exception 'Each active pocket lineage may appear only once' using errcode = '22023'; end if;
  -- Validate every supplied ID before any envelope/allocation write. This blocks
  -- a reused, retired, cross-currency, or cross-scope lineage from materializing.
  if exists (
    select 1 from jsonb_array_elements(p_allocations) item
    left join public.pocket_lineages lineage on lineage.id = nullif(item ->> 'lineage_id', '')::uuid
    left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
    where nullif(item ->> 'lineage_id', '') is null or nullif(item ->> 'amount_cents', '') is null
      or (item ->> 'amount_cents')::bigint < 0 or lineage.id is null
      or lineage.scope <> v_scope or lineage.household_id is distinct from p_household_id
      or lineage.currency <> v_currency or lineage.status <> 'active' or lineage.activated_on > v_anchor
      or (v_scope <> 'household' and lineage.owner_user_id is distinct from p_user_id)
      or retirement.effective_month <= v_anchor
  ) then raise exception 'Invalid active pocket lineage in setup snapshot' using errcode = '22023'; end if;
  if exists (
    select 1 from public.pocket_lineages lineage left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
    where lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id
      and lineage.currency = v_currency and lineage.status = 'active' and lineage.activated_on <= v_anchor
      and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
      and (retirement.effective_month is null or retirement.effective_month > v_anchor)
      and not exists (select 1 from jsonb_array_elements(p_allocations) item where nullif(item ->> 'lineage_id', '')::uuid = lineage.id)
  ) then raise exception 'Missing active pocket lineage from setup snapshot' using errcode = '22023'; end if;
  for v_item in select value from jsonb_array_elements(p_allocations) value loop
    select * into v_lineage from public.pocket_lineages where id = (v_item ->> 'lineage_id')::uuid;
    select envelope.id into v_envelope_id from public.budget_envelopes envelope where envelope.budget_id = v_budget_id and envelope.rollover_group_id = v_lineage.id;
    if v_envelope_id is null then
      insert into public.budget_envelopes (budget_id, user_id, household_id, name, currency, icon, color, rollover_group_id, rollover_enabled, rollover_negative, rollover_cap_cents)
      values (v_budget_id, v_lineage.owner_user_id, v_lineage.household_id, v_lineage.name, v_lineage.currency, v_lineage.icon, v_lineage.color, v_lineage.id, v_lineage.rollover_enabled, v_lineage.rollover_negative, v_lineage.rollover_cap_cents)
      returning id into v_envelope_id;
    end if;
    delete from public.envelope_category_links where envelope_id = v_envelope_id;
    insert into public.envelope_category_links (envelope_id, category)
    select v_envelope_id, assignment.category from public.pocket_lineage_category_assignments assignment
    where assignment.lineage_id = v_lineage.id and assignment.effective_from <= v_anchor and (assignment.effective_until is null or assignment.effective_until >= v_anchor);
    insert into public.envelope_allocations (envelope_id, period_month, amount_cents)
    values (v_envelope_id, v_anchor, (v_item ->> 'amount_cents')::bigint)
    on conflict (envelope_id, period_month) do update set amount_cents = excluded.amount_cents, updated_at = now();
  end loop;
  -- A confirmation is a complete snapshot. Active pockets intentionally receive
  -- zero rows, while stale allocations from no-longer-active lineages disappear.
  delete from public.envelope_allocations allocation using public.budget_envelopes envelope
  where allocation.envelope_id = envelope.id and envelope.budget_id = v_budget_id and allocation.period_month = v_anchor
    and not exists (select 1 from jsonb_array_elements(p_allocations) item where nullif(item ->> 'lineage_id', '')::uuid = envelope.rollover_group_id);
  select coalesce(sum(allocation.amount_cents), 0)::bigint into v_final_total from public.envelope_allocations allocation
  join public.budget_envelopes envelope on envelope.id = allocation.envelope_id
  where envelope.budget_id = v_budget_id and allocation.period_month = v_anchor;
  if v_final_total > v_budget_total then raise exception 'Pocket allocations exceed the authoritative monthly budget' using errcode = '22023'; end if;
  update public.pocket_month_reviews set setup_revision = setup_revision + 1, status = 'confirmed', reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
  where id = v_review.id returning * into v_review;
  return public.get_pockets_month_v4(p_user_id, v_scope, v_anchor, p_household_id, v_currency, true, false) || jsonb_build_object('success', true, 'code', 'POCKET_SETUP_CONFIRMED');
end;
$$;

create or replace function public.retire_pocket_lineage_v1(
  p_user_id uuid, p_scope text, p_household_id uuid, p_lineage_id uuid,
  p_effective_month date, p_expected_revision integer, p_reason text default null,
  p_disposition text default null, p_target_lineage_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_anchor date;
  v_current_anchor date;
  v_lineage public.pocket_lineages%rowtype;
  v_target public.pocket_lineages%rowtype;
  v_balance bigint;
  v_disposition text := lower(coalesce(nullif(trim(p_disposition), ''), ''));
begin
  if p_effective_month is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid pocket retirement request' using errcode = '22023'; end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pocket retirement access' using errcode = '42501'; end if;
  v_anchor := public.pocket_budget_anchor_v1(p_user_id, p_effective_month);
  v_current_anchor := public.pocket_budget_anchor_v1(p_user_id, current_date);
  if v_anchor < v_current_anchor then raise exception 'Pocket retirement cannot rewrite a closed financial cycle' using errcode = '22023'; end if;
  select * into v_lineage from public.pocket_lineages lineage where lineage.id = p_lineage_id
    and lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id) for update;
  if not found then raise exception 'Unknown pocket lineage for scope' using errcode = '22023'; end if;
  if v_lineage.revision <> p_expected_revision then raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001'; end if;
  if exists (select 1 from public.pocket_lineage_retirements where lineage_id = p_lineage_id) then raise exception 'Pocket lineage is already scheduled for retirement' using errcode = '22023'; end if;
  v_balance := coalesce((public.calculate_pocket_cycle_carry_v3(p_user_id, v_scope, p_household_id, v_lineage.currency, p_lineage_id, v_anchor) ->> 'carry_cents')::bigint, 0);
  if v_disposition = 'keep_active' then return jsonb_build_object('lineage_id', v_lineage.id, 'status', v_lineage.status, 'balance_cents', v_balance, 'code', 'POCKET_LINEAGE_REMAINS_ACTIVE'); end if;
  if (v_balance > 0 and v_disposition not in ('transfer_positive', 'release_positive'))
     or (v_balance < 0 and v_disposition not in ('cover_negative', 'transfer_negative'))
     or (v_balance = 0 and v_disposition <> 'retire_zero') then raise exception 'Retirement disposition does not resolve the pocket balance' using errcode = '22023'; end if;
  if v_disposition in ('transfer_positive', 'cover_negative', 'transfer_negative') then
    select * into v_target from public.pocket_lineages target
    where target.id = p_target_lineage_id and target.id <> p_lineage_id and target.scope = v_scope
      and target.household_id is not distinct from p_household_id and target.currency = v_lineage.currency
      and target.status = 'active' and not exists (
        select 1 from public.pocket_lineage_retirements retirement
        where retirement.lineage_id = target.id and retirement.effective_month <= v_anchor
      )
      and (v_scope = 'household' or target.owner_user_id = p_user_id) for update;
    if not found then raise exception 'Retirement disposition requires an active same-scope target pocket' using errcode = '22023'; end if;
  elsif p_target_lineage_id is not null then raise exception 'This retirement disposition does not accept a target pocket' using errcode = '22023'; end if;
  if v_balance <> 0 then
    insert into public.pocket_lineage_balance_adjustments (lineage_id, effective_month, amount_cents, reason, created_by)
    values (p_lineage_id, v_anchor, -v_balance, 'retirement:' || v_disposition, auth.uid());
    if v_target.id is not null then insert into public.pocket_lineage_balance_adjustments (lineage_id, effective_month, amount_cents, reason, created_by)
      values (v_target.id, v_anchor, v_balance, 'retirement_transfer:' || p_lineage_id::text, auth.uid()); end if;
  end if;
  insert into public.pocket_lineage_retirements (lineage_id, effective_month, reason, disposition, target_lineage_id, retired_by)
  values (p_lineage_id, v_anchor, nullif(trim(p_reason), ''), v_disposition, v_target.id, auth.uid());
  update public.pocket_lineages set status = case when v_anchor <= v_current_anchor then 'retired' else status end,
    revision = revision + 1, updated_at = now() where id = p_lineage_id returning * into v_lineage;
  return jsonb_build_object('lineage', to_jsonb(v_lineage), 'lineage_id', v_lineage.id,
    'status', case when v_anchor <= v_current_anchor then 'retired' else 'active' end,
    'effective_month', v_anchor, 'disposition', v_disposition, 'target_lineage_id', v_target.id,
    'revision', v_lineage.revision);
end;
$$;

-- A household review belongs to the household scope key, not to the member who
-- originally created a lineage or budget. This prevents duplicate/backfilled
-- review notifications for the same shared cycle.
create or replace function public.enqueue_pockets_month_review_notifications_v1()
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_created integer := 0;
begin
  with latest_contacts as (
    select distinct on (contact.user_id) contact.user_id,
      case when exists (select 1 from pg_timezone_names timezone_name where timezone_name.name = nullif(trim(contact.preferred_timezone), ''))
        then nullif(trim(contact.preferred_timezone), '') else 'UTC' end as timezone_name
    from public.user_contacts contact where contact.user_id is not null
    order by contact.user_id, contact.updated_at desc nulls last, contact.created_at desc, contact.id desc
  ), eligible_users as (
    select contact.user_id,
      public.financial_cycle_start_for_month((timezone(contact.timezone_name, now()))::date, public.user_financial_month_start_day(contact.user_id)) as cycle_start
    from latest_contacts contact
    where (timezone(contact.timezone_name, now()))::time >= time '09:00'
      and (timezone(contact.timezone_name, now()))::time < time '12:00'
      and public.financial_cycle_start_for_month((timezone(contact.timezone_name, now()))::date, public.user_financial_month_start_day(contact.user_id)) = (timezone(contact.timezone_name, now()))::date
      and not exists (select 1 from public.sharing_prefs preference where preference.user_id = contact.user_id and preference.household_id is null and preference.enable_nudges is false)
  ), candidates as (
    select eligible.user_id, eligible.cycle_start from eligible_users eligible
    where exists (
      select 1 from public.pocket_lineages lineage
      left join public.pocket_month_reviews review on review.scope = lineage.scope
        and review.scope_key = coalesce(lineage.household_id, lineage.owner_user_id)
        and review.currency = lineage.currency
        and review.budget_month = public.pocket_budget_anchor_v1(eligible.user_id, eligible.cycle_start)
      left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
      where lineage.status = 'active' and lineage.activated_on <= public.pocket_budget_anchor_v1(eligible.user_id, eligible.cycle_start)
        and (retirement.effective_month is null or retirement.effective_month > public.pocket_budget_anchor_v1(eligible.user_id, eligible.cycle_start))
        and ((lineage.scope in ('personal', 'portfolio') and lineage.owner_user_id = eligible.user_id)
          or (lineage.scope = 'household' and exists (select 1 from public.household_members member where member.household_id = lineage.household_id and member.user_id = eligible.user_id and member.role in ('owner', 'admin'))))
        and review.reviewed_at is null
    )
  ), inserted as (
    insert into public.notification_events (user_id, event_type, payload)
    select candidate.user_id, 'pockets_month_review', jsonb_build_object(
      'cycle_start', candidate.cycle_start,
      'financial_cycle_label', to_char(candidate.cycle_start, 'Mon FMDD') || ' - ' || to_char(public.next_financial_cycle_start(candidate.cycle_start, public.user_financial_month_start_day(candidate.user_id)) - 1, 'Mon FMDD, YYYY'),
      'action', 'openPocketsPage'
    ) from candidates candidate on conflict do nothing returning id
  )
  select count(*) into v_created from inserted;
  return jsonb_build_object('created', v_created);
end;
$$;

revoke all on function public.pocket_cycle_anchor_v1(uuid, date) from public, anon;
revoke all on function public.pocket_budget_anchor_v1(uuid, date) from public, anon;
revoke all on function public.update_pocket_lineage_v1(uuid, text, uuid, uuid, integer, text, text, text, boolean, boolean, bigint) from public, anon;
grant execute on function public.pocket_cycle_anchor_v1(uuid, date), public.pocket_budget_anchor_v1(uuid, date) to authenticated, service_role;
grant execute on function public.update_pocket_lineage_v1(uuid, text, uuid, uuid, integer, text, text, text, boolean, boolean, bigint) to authenticated, service_role;
revoke all on function public.enqueue_pockets_month_review_notifications_v1() from public, anon, authenticated;
grant execute on function public.enqueue_pockets_month_review_notifications_v1() to service_role;

notify pgrst, 'reload schema';
