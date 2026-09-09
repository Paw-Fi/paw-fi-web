-- Final corrective pass for the v4 pockets contract. This migration deliberately
-- replaces live RPCs only; earlier lifecycle migrations remain immutable.

alter table public.pocket_lineages
  add column if not exists logo_url text;

alter table public.pocket_lineages
  drop constraint if exists pocket_lineages_activation_reason_check;

alter table public.pocket_lineages
  add constraint pocket_lineages_activation_reason_check
  check (activation_reason in (
    'latest_cycle', 'rollover_continuation', 'user_created',
    'user_restored', 'uncertain_history'
  ));

-- A virtual continuation has no envelope from which to recover its logo. Keep
-- the latest materialized presentation value on the lineage itself.
with latest_logo as (
  select distinct on (envelope.rollover_group_id)
    envelope.rollover_group_id as lineage_id,
    envelope.logo_url
  from public.budget_envelopes envelope
  join public.budgets budget on budget.id = envelope.budget_id
  where envelope.rollover_group_id is not null
    and nullif(trim(envelope.logo_url), '') is not null
  order by envelope.rollover_group_id, budget.period_month desc,
    envelope.updated_at desc nulls last, envelope.created_at desc,
    envelope.id desc
)
update public.pocket_lineages lineage
set logo_url = latest_logo.logo_url
from latest_logo
where latest_logo.lineage_id = lineage.id
  and nullif(trim(lineage.logo_url), '') is null;

-- Retirement retries must not duplicate the balancing pair. This protects old
-- callers that do not yet provide an explicit retirement operation ID.
create unique index if not exists pocket_lineage_retirement_adjustment_once_idx
  on public.pocket_lineage_balance_adjustments (lineage_id, effective_month, reason)
  where reason like 'retirement:%' or reason like 'retirement_transfer:%';

create or replace function public.ensure_pocket_lineage_for_envelope_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget public.budgets%rowtype;
  v_scope text;
  v_owner_user_id uuid;
  v_lineage public.pocket_lineages%rowtype;
begin
  if new.rollover_group_id is null then new.rollover_group_id := gen_random_uuid(); end if;
  select * into v_budget from public.budgets where id = new.budget_id;
  if not found then raise exception 'Unknown budget for pocket envelope' using errcode = '23503'; end if;
  select case when new.household_id is null then 'personal'
    when coalesce(household.is_portfolio, false) then 'portfolio' else 'household' end,
    case when new.household_id is null or coalesce(household.is_portfolio, false)
      then new.user_id else household.owner_id end
  into v_scope, v_owner_user_id
  from (select 1) seed
  left join public.households household on household.id = new.household_id;
  select * into v_lineage from public.pocket_lineages where id = new.rollover_group_id;
  if found then
    if v_lineage.owner_user_id is distinct from v_owner_user_id
       or v_lineage.household_id is distinct from new.household_id
       or v_lineage.scope <> v_scope
       or v_lineage.currency <> upper(coalesce(nullif(trim(new.currency), ''), 'USD')) then
      raise exception 'Pocket lineage cannot be reused outside its original scope' using errcode = '22023';
    end if;
    update public.pocket_lineages
    set name = new.name, icon = new.icon, color = new.color,
        logo_url = coalesce(
          nullif(trim(new.logo_url), ''),
          v_lineage.logo_url
        ),
        rollover_enabled = coalesce(new.rollover_enabled, false),
        rollover_negative = coalesce(new.rollover_negative, false),
        rollover_cap_cents = new.rollover_cap_cents,
        updated_at = now()
    where id = v_lineage.id;
    return new;
  end if;
  insert into public.pocket_lineages (
    id, owner_user_id, household_id, scope, currency, name, icon, color,
    logo_url, rollover_enabled, rollover_negative, rollover_cap_cents, activated_on,
    activation_reason
  ) values (
    new.rollover_group_id, v_owner_user_id, new.household_id, v_scope,
    upper(coalesce(nullif(trim(new.currency), ''), 'USD')), new.name, new.icon,
    new.color, nullif(trim(new.logo_url), ''), coalesce(new.rollover_enabled, false),
    coalesce(new.rollover_negative, false), new.rollover_cap_cents,
    date_trunc('month', v_budget.period_month)::date, 'user_created'
  );
  return new;
end;
$$;

create or replace function public.save_pocket_lineage_lifecycle_v1(
  p_user_id uuid, p_scope text, p_household_id uuid, p_lineage_id uuid,
  p_expected_revision integer, p_budget_month date, p_currency text, p_operation_id uuid,
  p_name text, p_icon text, p_color text, p_logo_url text,
  p_rollover_enabled boolean, p_rollover_negative boolean, p_rollover_cap_cents bigint,
  p_funding_policy text, p_funding_target_cents bigint, p_categories text[], p_current_amount_cents bigint
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_month date;
  v_policy text := lower(coalesce(nullif(trim(p_funding_policy), ''), ''));
  v_owner_user_id uuid;
  v_lineage public.pocket_lineages%rowtype;
  v_budget public.budgets%rowtype;
  v_envelope public.budget_envelopes%rowtype;
  v_response jsonb;
  v_existing_allocations bigint;
begin
  if p_operation_id is null or p_budget_month is null or nullif(trim(p_name), '') is null
    or p_rollover_enabled is null or p_rollover_negative is null
    or (p_rollover_cap_cents is not null and p_rollover_cap_cents < 0)
    or p_current_amount_cents is null or p_current_amount_cents < 0
    or (p_lineage_id is not null and (p_expected_revision is null or p_expected_revision < 0))
    or v_scope not in ('personal', 'household', 'portfolio')
    or v_policy not in ('refill_to', 'add_every_cycle', 'decide_each_cycle')
    or (v_policy = 'decide_each_cycle' and p_funding_target_cents is not null)
    or (v_policy <> 'decide_each_cycle' and (p_funding_target_cents is null or p_funding_target_cents < 0))
    or p_categories is null
    or exists (select 1 from unnest(p_categories) category where nullif(trim(category), '') is null)
    or cardinality(p_categories) <> cardinality(array(select distinct lower(trim(category)) from unnest(p_categories) category)) then
    raise exception 'Invalid pocket lifecycle snapshot' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pocket lifecycle mutation' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_operation_id::text, 0));
  select response into v_response from public.pocket_lineage_lifecycle_operations
  where requested_by = p_user_id and operation_id = p_operation_id;
  if found then return v_response; end if;
  v_month := public.pocket_budget_anchor_v1(p_user_id, p_budget_month);
  select * into v_budget from public.budgets budget where budget.period_month = v_month
    and ((v_scope = 'personal' and budget.household_id is null and budget.user_id = p_user_id)
      or (v_scope = 'household' and budget.household_id = p_household_id)
      or (v_scope = 'portfolio' and budget.household_id = p_household_id and budget.user_id = p_user_id))
    and upper(budget.currency) = upper(coalesce(nullif(trim(p_currency), ''), 'USD')) for update;
  if not found then raise exception 'No authoritative budget exists for this pocket lifecycle snapshot' using errcode = '22023'; end if;
  if v_scope = 'household' then select owner_id into v_owner_user_id from public.households where id = p_household_id; else v_owner_user_id := p_user_id; end if;
  if p_lineage_id is null then
    v_lineage.id := gen_random_uuid();
    insert into public.pocket_lineages (id, owner_user_id, household_id, scope, currency, name, icon, color, logo_url, rollover_enabled, rollover_negative, rollover_cap_cents, funding_policy, funding_target_cents, activated_on, activation_reason)
    values (v_lineage.id, v_owner_user_id, p_household_id, v_scope, upper(v_budget.currency), trim(p_name), p_icon, p_color, nullif(trim(p_logo_url), ''), p_rollover_enabled, p_rollover_negative, p_rollover_cap_cents, v_policy, p_funding_target_cents, v_month, 'user_created')
    returning * into v_lineage;
  else
    select * into v_lineage from public.pocket_lineages lineage where lineage.id = p_lineage_id and lineage.scope = v_scope
      and lineage.household_id is not distinct from p_household_id and (v_scope = 'household' or lineage.owner_user_id = p_user_id) for update;
    if not found then raise exception 'Unknown pocket lineage for scope' using errcode = '22023'; end if;
    if v_lineage.revision <> p_expected_revision then raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001'; end if;
    if v_lineage.status = 'retired' then raise exception 'Retired pocket lineages cannot be updated' using errcode = '22023'; end if;
    update public.pocket_lineages set name = trim(p_name), icon = p_icon, color = p_color, logo_url = nullif(trim(p_logo_url), ''),
      rollover_enabled = p_rollover_enabled, rollover_negative = p_rollover_negative, rollover_cap_cents = p_rollover_cap_cents,
      funding_policy = v_policy, funding_target_cents = p_funding_target_cents, revision = revision + 1, updated_at = now()
    where id = v_lineage.id returning * into v_lineage;
  end if;
  -- One category can fund one active lineage in a scope and cycle. Allow the
  -- lineage being edited to retain its own effective assignment.
  if exists (
    select 1 from public.pocket_lineage_category_assignments assignment
    join public.pocket_lineages other on other.id = assignment.lineage_id
    left join public.pocket_lineage_retirements retirement on retirement.lineage_id = other.id
    where assignment.lineage_id <> v_lineage.id
      and assignment.category = any(array(select lower(trim(category)) from unnest(p_categories) category))
      and assignment.effective_from <= v_month and (assignment.effective_until is null or assignment.effective_until >= v_month)
      and other.scope = v_scope and other.household_id is not distinct from p_household_id
      and other.currency = v_lineage.currency and other.status = 'active'
      and (v_scope = 'household' or other.owner_user_id = p_user_id)
      and (retirement.effective_month is null or retirement.effective_month > v_month)
  ) then raise exception 'A category may belong to only one active pocket in this cycle' using errcode = '22023'; end if;
  delete from public.pocket_lineage_category_assignments where lineage_id = v_lineage.id and effective_from = v_month;
  update public.pocket_lineage_category_assignments set effective_until = v_month - 1, updated_at = now()
  where lineage_id = v_lineage.id and effective_from < v_month and (effective_until is null or effective_until >= v_month);
  insert into public.pocket_lineage_category_assignments (lineage_id, category, effective_from)
  select v_lineage.id, lower(trim(category)), v_month from unnest(p_categories) category;
  insert into public.budget_envelopes (budget_id, user_id, household_id, name, currency, icon, color, logo_url, rollover_group_id, rollover_enabled, rollover_negative, rollover_cap_cents, budget_amount_cents)
  values (v_budget.id, v_lineage.owner_user_id, v_lineage.household_id, v_lineage.name, v_lineage.currency, v_lineage.icon, v_lineage.color, v_lineage.logo_url, v_lineage.id, v_lineage.rollover_enabled, v_lineage.rollover_negative, v_lineage.rollover_cap_cents, p_current_amount_cents)
  on conflict (budget_id, rollover_group_id) do update set name = excluded.name, icon = excluded.icon, color = excluded.color, logo_url = excluded.logo_url, rollover_enabled = excluded.rollover_enabled, rollover_negative = excluded.rollover_negative, rollover_cap_cents = excluded.rollover_cap_cents, budget_amount_cents = excluded.budget_amount_cents, updated_at = now()
  returning * into v_envelope;
  select coalesce(sum(allocation.amount_cents), 0)::bigint into v_existing_allocations
  from public.envelope_allocations allocation join public.budget_envelopes envelope on envelope.id = allocation.envelope_id
  where envelope.budget_id = v_budget.id and allocation.period_month = v_month and allocation.envelope_id <> v_envelope.id;
  if v_existing_allocations + p_current_amount_cents > v_budget.total_budget_cents then raise exception 'Pocket allocations exceed the authoritative monthly budget' using errcode = '22023'; end if;
  delete from public.envelope_category_links where envelope_id = v_envelope.id;
  insert into public.envelope_category_links (envelope_id, category) select v_envelope.id, lower(trim(category)) from unnest(p_categories) category;
  insert into public.envelope_allocations (envelope_id, period_month, amount_cents) values (v_envelope.id, v_month, p_current_amount_cents)
  on conflict (envelope_id, period_month) do update set amount_cents = excluded.amount_cents, updated_at = now();
  v_response := jsonb_build_object('lineage', to_jsonb(v_lineage), 'envelope', to_jsonb(v_envelope), 'lineage_id', v_lineage.id, 'envelope_id', v_envelope.id, 'revision', v_lineage.revision, 'categories', to_jsonb(array(select lower(trim(category)) from unnest(p_categories) category order by 1)), 'current_amount_cents', p_current_amount_cents, 'operation_id', p_operation_id);
  insert into public.pocket_lineage_lifecycle_operations (operation_id, requested_by, scope, household_id, lineage_id, response)
  values (p_operation_id, p_user_id, v_scope, p_household_id, v_lineage.id, v_response);
  return v_response;
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
  v_anchor date; v_current_anchor date; v_lineage public.pocket_lineages%rowtype;
  v_target public.pocket_lineages%rowtype; v_retirement public.pocket_lineage_retirements%rowtype;
  v_balance bigint; v_disposition text := lower(coalesce(nullif(trim(p_disposition), ''), ''));
begin
  if p_effective_month is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid pocket retirement request' using errcode = '22023'; end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pocket retirement access' using errcode = '42501'; end if;
  v_anchor := public.pocket_budget_anchor_v1(p_user_id, p_effective_month); v_current_anchor := public.pocket_budget_anchor_v1(p_user_id, current_date);
  if v_anchor < v_current_anchor then raise exception 'Pocket retirement cannot rewrite a closed financial cycle' using errcode = '22023'; end if;
  select * into v_lineage from public.pocket_lineages lineage where lineage.id = p_lineage_id and lineage.scope = v_scope
    and lineage.household_id is not distinct from p_household_id and (v_scope = 'household' or lineage.owner_user_id = p_user_id) for update;
  if not found then raise exception 'Unknown pocket lineage for scope' using errcode = '22023'; end if;
  select * into v_retirement from public.pocket_lineage_retirements where lineage_id = p_lineage_id;
  if found then
    return jsonb_build_object('lineage_id', v_lineage.id, 'status', v_lineage.status, 'effective_month', v_retirement.effective_month, 'disposition', v_retirement.disposition, 'target_lineage_id', v_retirement.target_lineage_id, 'revision', v_lineage.revision, 'idempotent_replay', true);
  end if;
  if v_lineage.revision <> p_expected_revision then raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001'; end if;
  v_balance := (public.pocket_lineage_retirement_balance_v1(p_user_id, v_scope, p_household_id, p_lineage_id, v_anchor) ->> 'balance_cents')::bigint;
  if v_disposition = 'keep_active' then return jsonb_build_object('lineage_id', v_lineage.id, 'status', v_lineage.status, 'balance_cents', v_balance, 'code', 'POCKET_LINEAGE_REMAINS_ACTIVE'); end if;
  if (v_balance > 0 and v_disposition not in ('transfer_positive', 'release_positive')) or (v_balance < 0 and v_disposition not in ('cover_negative', 'transfer_negative')) or (v_balance = 0 and v_disposition <> 'retire_zero') then raise exception 'Retirement disposition does not resolve the pocket balance' using errcode = '22023'; end if;
  if v_disposition in ('transfer_positive', 'cover_negative', 'transfer_negative') then
    select * into v_target from public.pocket_lineages target where target.id = p_target_lineage_id and target.id <> p_lineage_id and target.scope = v_scope
      and target.household_id is not distinct from p_household_id and target.currency = v_lineage.currency and target.status = 'active'
      and not exists (select 1 from public.pocket_lineage_retirements retirement where retirement.lineage_id = target.id and retirement.effective_month <= v_anchor)
      and (v_scope = 'household' or target.owner_user_id = p_user_id) for update;
    if not found then raise exception 'Retirement disposition requires an active same-scope target pocket' using errcode = '22023'; end if;
  elsif p_target_lineage_id is not null then raise exception 'This retirement disposition does not accept a target pocket' using errcode = '22023'; end if;
  if v_balance <> 0 then
    insert into public.pocket_lineage_balance_adjustments (lineage_id, effective_month, amount_cents, reason, created_by) values (p_lineage_id, v_anchor, -v_balance, 'retirement:' || v_disposition, auth.uid()) on conflict do nothing;
    if v_target.id is not null then insert into public.pocket_lineage_balance_adjustments (lineage_id, effective_month, amount_cents, reason, created_by) values (v_target.id, v_anchor, v_balance, 'retirement_transfer:' || p_lineage_id::text, auth.uid()) on conflict do nothing; end if;
  end if;
  insert into public.pocket_lineage_retirements (lineage_id, effective_month, reason, disposition, target_lineage_id, retired_by) values (p_lineage_id, v_anchor, nullif(trim(p_reason), ''), v_disposition, v_target.id, auth.uid());
  update public.pocket_lineages set status = case when v_anchor <= v_current_anchor then 'retired' else status end, revision = revision + 1, updated_at = now() where id = p_lineage_id returning * into v_lineage;
  return jsonb_build_object('lineage', to_jsonb(v_lineage), 'lineage_id', v_lineage.id, 'status', case when v_anchor <= v_current_anchor then 'retired' else 'active' end, 'effective_month', v_anchor, 'balance_cents', v_balance, 'disposition', v_disposition, 'target_lineage_id', v_target.id, 'revision', v_lineage.revision);
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
  v_anchor date; v_cycle_start date; v_currency text; v_payload jsonb; v_review jsonb;
  v_can_edit boolean; v_envelopes jsonb; v_allocations jsonb; v_links jsonb; v_spent jsonb;
  v_virtual_rows jsonb; v_suggestions jsonb; v_previous_allocations jsonb; v_facts jsonb;
  v_active_count integer; v_budget_id uuid; v_budget_total bigint; v_allocated bigint;
  v_setup_state text;
begin
  if p_budget_month is null or v_scope not in ('personal', 'household', 'portfolio') then raise exception 'Invalid pockets month request' using errcode = '22023'; end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Client user does not match authenticated user' using errcode = '42501'; end if;
  if not public.can_access_pocket_scope_v1(p_user_id, p_household_id, v_scope) then raise exception 'Unauthorized pockets access' using errcode = '42501'; end if;
  v_anchor := public.pocket_budget_anchor_v1(p_user_id, p_budget_month); v_cycle_start := public.pocket_cycle_anchor_v1(p_user_id, p_budget_month); v_can_edit := public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope);
  v_payload := public.get_pockets_month_v3(p_user_id, v_scope, v_anchor, p_household_id, p_currency, p_include_projected_recurring, p_allow_currency_fallback);
  v_currency := upper(coalesce(nullif(v_payload ->> 'selected_currency', ''), p_currency, 'USD'));
  v_budget_id := nullif(v_payload -> 'budget' ->> 'id', '')::uuid;
  v_budget_total := coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0);
  with visible as (
    select envelope.id, lineage, envelope.logo_url, categories.rows
    from public.budget_envelopes envelope join public.pocket_lineages lineage on lineage.id = envelope.rollover_group_id
    left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
    left join lateral (select coalesce(jsonb_agg(assignment.category order by assignment.category), '[]'::jsonb) rows from public.pocket_lineage_category_assignments assignment where assignment.lineage_id = lineage.id and assignment.effective_from <= v_anchor and (assignment.effective_until is null or assignment.effective_until >= v_anchor)) categories on true
    where lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id and lineage.currency = v_currency
      and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
      and (retirement.effective_month is null or retirement.effective_month > v_anchor)
  )
  select coalesce(jsonb_agg(item || jsonb_build_object('pocket_lineage_id', (visible.lineage).id, 'rollover_group_id', (visible.lineage).id, 'logo_url', coalesce(nullif(trim(visible.logo_url), ''), (visible.lineage).logo_url), 'effective_categories', visible.rows, 'categories', visible.rows, 'lineage', to_jsonb(visible.lineage)) order by item ->> 'id'), '[]'::jsonb) into v_envelopes
  from jsonb_array_elements(coalesce(v_payload -> 'envelopes', '[]'::jsonb)) item join visible on visible.id = nullif(item ->> 'id', '')::uuid;
  select coalesce(jsonb_agg(item || jsonb_build_object('pocket_lineage_id', envelope.rollover_group_id) order by item ->> 'envelope_id'), '[]'::jsonb) into v_allocations
  from jsonb_array_elements(coalesce(v_payload -> 'allocations', '[]'::jsonb)) item join public.budget_envelopes envelope on envelope.id = nullif(item ->> 'envelope_id', '')::uuid where exists (select 1 from jsonb_array_elements(v_envelopes) visible where nullif(visible ->> 'id', '')::uuid = envelope.id);
  select coalesce(jsonb_agg(item), '[]'::jsonb) into v_links from jsonb_array_elements(coalesce(v_payload -> 'category_links', '[]'::jsonb)) item where exists (select 1 from jsonb_array_elements(v_envelopes) visible where nullif(visible ->> 'id', '')::uuid = nullif(item ->> 'envelope_id', '')::uuid);
  select coalesce(jsonb_agg(item), '[]'::jsonb) into v_spent from jsonb_array_elements(coalesce(v_payload -> 'spent_by_envelope', '[]'::jsonb)) item where exists (select 1 from jsonb_array_elements(v_envelopes) visible where nullif(visible ->> 'id', '')::uuid = nullif(item ->> 'envelope_id', '')::uuid);
  v_payload := jsonb_set(jsonb_set(jsonb_set(jsonb_set(v_payload, '{envelopes}', v_envelopes), '{allocations}', v_allocations), '{category_links}', v_links), '{spent_by_envelope}', v_spent);
  select to_jsonb(review) into v_review from public.pocket_month_reviews review where review.scope = v_scope and review.scope_key = coalesce(p_household_id, p_user_id) and review.currency = v_currency and review.budget_month = v_anchor;
  select count(*) into v_active_count from public.pocket_lineages lineage left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id where lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id and lineage.currency = v_currency and lineage.status = 'active' and lineage.activated_on <= v_anchor and (v_scope = 'household' or lineage.owner_user_id = p_user_id) and (retirement.effective_month is null or retirement.effective_month > v_anchor);
  select coalesce(jsonb_agg(jsonb_build_object('lineage_id', lineage.id, 'amount_cents', allocation.amount_cents) order by lineage.id), '[]'::jsonb) into v_previous_allocations from (select distinct on (envelope.rollover_group_id) envelope.rollover_group_id, allocation.amount_cents from public.budget_envelopes envelope join public.budgets budget on budget.id = envelope.budget_id join public.envelope_allocations allocation on allocation.envelope_id = envelope.id join public.pocket_lineages lineage on lineage.id = envelope.rollover_group_id where budget.period_month < v_anchor and allocation.period_month < v_anchor and lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id and lineage.currency = v_currency and (v_scope = 'household' or lineage.owner_user_id = p_user_id) order by envelope.rollover_group_id, allocation.period_month desc) allocation join public.pocket_lineages lineage on lineage.id = allocation.rollover_group_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', lineage.id, 'pocket_lineage_id', lineage.id, 'rollover_group_id', lineage.id, 'is_virtual', true, 'name', lineage.name, 'icon', lineage.icon, 'color', lineage.color, 'logo_url', lineage.logo_url, 'currency', lineage.currency, 'rollover_enabled', lineage.rollover_enabled, 'rollover_negative', lineage.rollover_negative, 'rollover_cap_cents', lineage.rollover_cap_cents, 'funding_policy', lineage.funding_policy, 'funding_target_cents', lineage.funding_target_cents, 'incoming_carry_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0), 'balance_adjustments_cents', adjustments.amount_cents, 'available_budget_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0) + adjustments.amount_cents, 'remaining_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0) + adjustments.amount_cents, 'status', lineage.status, 'revision', lineage.revision, 'activated_on', lineage.activated_on, 'activation_reason', lineage.activation_reason, 'retired_effective_month', retirement.effective_month, 'effective_categories', categories.rows, 'categories', categories.rows, 'lineage', to_jsonb(lineage)) order by lineage.created_at, lineage.id), '[]'::jsonb) into v_virtual_rows from public.pocket_lineages lineage left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id left join lateral (select coalesce(jsonb_agg(assignment.category order by assignment.category), '[]'::jsonb) rows from public.pocket_lineage_category_assignments assignment where assignment.lineage_id = lineage.id and assignment.effective_from <= v_anchor and (assignment.effective_until is null or assignment.effective_until >= v_anchor)) categories on true left join lateral (select coalesce(sum(adjustment.amount_cents), 0)::bigint amount_cents from public.pocket_lineage_balance_adjustments adjustment where adjustment.lineage_id = lineage.id and adjustment.effective_month = v_anchor) adjustments on true left join lateral (select public.calculate_pocket_cycle_carry_v3(p_user_id, v_scope, p_household_id, v_currency, lineage.id, v_anchor) value) carry on true where lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id and lineage.currency = v_currency and lineage.status = 'active' and lineage.activated_on <= v_anchor and (v_scope = 'household' or lineage.owner_user_id = p_user_id) and (retirement.effective_month is null or retirement.effective_month > v_anchor) and not exists (select 1 from jsonb_array_elements(v_envelopes) item where nullif(item ->> 'rollover_group_id', '')::uuid = lineage.id);
  select coalesce(jsonb_agg(jsonb_build_object('lineage_id', lineage.id, 'envelope_id', envelope.id, 'label', lineage.name, 'amount_cents', case lineage.funding_policy when 'add_every_cycle' then lineage.funding_target_cents when 'refill_to' then greatest(coalesce(lineage.funding_target_cents, 0) - greatest(coalesce((carry.value ->> 'carry_cents')::bigint, 0), 0), 0) else coalesce(current_allocation.amount_cents, previous.amount_cents, 0) end, 'current_amount_cents', current_allocation.amount_cents, 'previous_amount_cents', previous.amount_cents, 'incoming_carry_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0), 'funding_policy', lineage.funding_policy, 'funding_target_cents', lineage.funding_target_cents, 'reason_code', case lineage.funding_policy when 'add_every_cycle' then 'monthly_contribution' when 'refill_to' then 'refill_after_carry' else 'last_confirmed_allocation' end) order by lineage.created_at, lineage.id), '[]'::jsonb) into v_suggestions from public.pocket_lineages lineage left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id left join public.budget_envelopes envelope on envelope.rollover_group_id = lineage.id and envelope.budget_id = v_budget_id left join public.envelope_allocations current_allocation on current_allocation.envelope_id = envelope.id and current_allocation.period_month = v_anchor left join lateral (select (item ->> 'amount_cents')::bigint amount_cents from jsonb_array_elements(v_previous_allocations) item where nullif(item ->> 'lineage_id', '')::uuid = lineage.id) previous on true left join lateral (select public.calculate_pocket_cycle_carry_v3(p_user_id, v_scope, p_household_id, v_currency, lineage.id, v_anchor) value) carry on true where lineage.scope = v_scope and lineage.household_id is not distinct from p_household_id and lineage.currency = v_currency and lineage.status = 'active' and lineage.activated_on <= v_anchor and (v_scope = 'household' or lineage.owner_user_id = p_user_id) and (retirement.effective_month is null or retirement.effective_month > v_anchor);
  select coalesce(sum((item ->> 'amount_cents')::bigint), 0)::bigint into v_allocated from jsonb_array_elements(v_allocations) item;
  v_setup_state := case when v_budget_id is null then 'missing_budget' when v_active_count = 0 then 'zero_active_pockets' when v_review is not null and v_review ->> 'status' = 'confirmed' then 'confirmed' else 'ready_for_review' end;
  v_facts := jsonb_build_array(jsonb_build_object('id', 'fact:monthly_budget_cents', 'value_cents', v_budget_total), jsonb_build_object('id', 'fact:allocated_cents', 'value_cents', v_allocated), jsonb_build_object('id', 'fact:unassigned_cents', 'value_cents', greatest(v_budget_total - v_allocated, 0)), jsonb_build_object('id', 'fact:active_lineage_count', 'value', v_active_count)) || coalesce((select jsonb_agg(jsonb_build_object('id', 'fact:pocket:' || (item ->> 'lineage_id') || ':suggested_funding_cents', 'value_cents', (item ->> 'amount_cents')::bigint) order by item ->> 'lineage_id') from jsonb_array_elements(v_suggestions) item), '[]'::jsonb) || coalesce((select jsonb_agg(jsonb_build_object('id', 'fact:pocket:' || (item ->> 'lineage_id') || ':incoming_carry_cents', 'value_cents', (item ->> 'incoming_carry_cents')::bigint) order by item ->> 'lineage_id') from jsonb_array_elements(v_suggestions) item), '[]'::jsonb) || coalesce((select jsonb_agg(jsonb_build_object('id', 'fact:pocket:' || (item ->> 'lineage_id') || ':previous_allocation_cents', 'value_cents', coalesce((item ->> 'amount_cents')::bigint, 0)) order by item ->> 'lineage_id') from jsonb_array_elements(v_previous_allocations) item), '[]'::jsonb);
  return v_payload || jsonb_build_object('normalized_calculation_facts', v_facts, 'pockets_v4', jsonb_build_object('contract_version', 4, 'scope', v_scope, 'household_id', p_household_id, 'currency', v_currency, 'budget_month', v_anchor, 'cycle_start', v_cycle_start, 'can_edit', v_can_edit, 'is_current_period', v_cycle_start = public.pocket_cycle_anchor_v1(p_user_id, current_date), 'active_lineage_count', v_active_count, 'has_active_pockets', v_active_count > 0, 'setup_state', v_setup_state, 'lifecycle_virtual_rows', v_virtual_rows, 'review', coalesce(v_review, '{}'::jsonb) || jsonb_build_object('contract_version', 4, 'scope', v_scope, 'household_id', p_household_id, 'currency', v_currency, 'budget_month', v_anchor, 'cycle_start', v_cycle_start, 'can_edit', v_can_edit, 'setup_state', v_setup_state, 'zero_active_pockets', v_active_count = 0, 'missing_budget', v_budget_id is null, 'monthly_budget_cents', v_budget_total, 'current_allocations', v_allocations, 'previous_allocations', v_previous_allocations, 'suggestions', v_suggestions, 'facts', jsonb_build_object('monthly_budget_cents', v_budget_total, 'allocated_cents', v_allocated, 'unassigned_cents', greatest(v_budget_total - v_allocated, 0), 'active_lineage_count', v_active_count, 'current_allocations', v_allocations, 'previous_allocations', v_previous_allocations, 'suggestions', v_suggestions))));
end;
$$;

create or replace function public.enqueue_pockets_month_review_notifications_v1()
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_created integer := 0;
begin
  with latest_contacts as (
    select distinct on (contact.user_id) contact.user_id,
      case when exists (select 1 from pg_timezone_names zone where zone.name = nullif(trim(contact.preferred_timezone), '')) then nullif(trim(contact.preferred_timezone), '') else 'UTC' end timezone_name
    from public.user_contacts contact where contact.user_id is not null
    order by contact.user_id, contact.updated_at desc nulls last, contact.created_at desc, contact.id desc
  ), eligible as (
    select contact.user_id, public.financial_cycle_start_for_month((timezone(contact.timezone_name, now()))::date, public.user_financial_month_start_day(contact.user_id)) cycle_start
    from latest_contacts contact where (timezone(contact.timezone_name, now()))::time >= time '09:00' and (timezone(contact.timezone_name, now()))::time < time '12:00'
      and public.financial_cycle_start_for_month((timezone(contact.timezone_name, now()))::date, public.user_financial_month_start_day(contact.user_id)) = (timezone(contact.timezone_name, now()))::date
  ), candidates as (
    select eligible.user_id, eligible.cycle_start, route.scope, route.household_id, route.currency
    from eligible cross join lateral (
      select lineage.scope, lineage.household_id, lineage.currency
      from public.pocket_lineages lineage left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
      left join public.pocket_month_reviews review on review.scope = lineage.scope and review.scope_key = coalesce(lineage.household_id, lineage.owner_user_id) and review.currency = lineage.currency and review.budget_month = public.pocket_budget_anchor_v1(eligible.user_id, eligible.cycle_start)
      where lineage.status = 'active' and lineage.activated_on <= public.pocket_budget_anchor_v1(eligible.user_id, eligible.cycle_start)
        and (retirement.effective_month is null or retirement.effective_month > public.pocket_budget_anchor_v1(eligible.user_id, eligible.cycle_start))
        and ((lineage.scope in ('personal', 'portfolio') and lineage.owner_user_id = eligible.user_id) or (lineage.scope = 'household' and exists (select 1 from public.household_members member where member.household_id = lineage.household_id and member.user_id = eligible.user_id and member.role in ('owner', 'admin'))))
        and review.reviewed_at is null
      order by case lineage.scope when 'personal' then 0 when 'household' then 1 else 2 end, lineage.created_at, lineage.id limit 1
    ) route
    where not exists (select 1 from public.sharing_prefs preference where preference.user_id = eligible.user_id and preference.enable_nudges is false and preference.household_id is not distinct from route.household_id)
  ), inserted as (
    insert into public.notification_events (household_id, user_id, event_type, payload)
    select candidate.household_id, candidate.user_id, 'pockets_month_review', jsonb_build_object('cycle_start', candidate.cycle_start, 'budget_month', public.pocket_budget_anchor_v1(candidate.user_id, candidate.cycle_start), 'scope', candidate.scope, 'household_id', candidate.household_id, 'currency', candidate.currency, 'expires_at', public.next_financial_cycle_start(candidate.cycle_start, public.user_financial_month_start_day(candidate.user_id))::timestamptz, 'financial_cycle_label', to_char(candidate.cycle_start, 'Mon FMDD') || ' - ' || to_char(public.next_financial_cycle_start(candidate.cycle_start, public.user_financial_month_start_day(candidate.user_id)) - 1, 'Mon FMDD, YYYY'), 'action', 'openPocketsPage') from candidates candidate
    on conflict do nothing returning id
  ) select count(*) into v_created from inserted;
  return jsonb_build_object('created', v_created);
end;
$$;

revoke all on function public.save_pocket_lineage_lifecycle_v1(uuid, text, uuid, uuid, integer, date, text, uuid, text, text, text, text, boolean, boolean, bigint, text, bigint, text[], bigint) from public, anon;
grant execute on function public.save_pocket_lineage_lifecycle_v1(uuid, text, uuid, uuid, integer, date, text, uuid, text, text, text, text, boolean, boolean, bigint, text, bigint, text[], bigint) to authenticated, service_role;
revoke all on function public.enqueue_pockets_month_review_notifications_v1() from public, anon, authenticated;
grant execute on function public.enqueue_pockets_month_review_notifications_v1() to service_role;

notify pgrst, 'reload schema';
