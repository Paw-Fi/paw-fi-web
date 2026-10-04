-- Shared optimistic concurrency contract for Mobile and Desktop Pocket plans.
-- The revision identity follows the persisted budget uniqueness scope: household
-- views of the same budget share one revision even when their UI scope differs.

create table if not exists public.pocket_month_revisions (
  scope_kind text not null check (scope_kind in ('personal', 'household')),
  scope_id uuid not null,
  currency text not null,
  period_month date not null,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope_kind, scope_id, currency, period_month)
);

create table if not exists public.pocket_month_mutation_receipts (
  actor_id uuid not null references auth.users(id) on delete cascade,
  mutation_id text not null,
  scope_kind text not null check (scope_kind in ('personal', 'household')),
  scope_id uuid not null,
  currency text not null,
  period_month date not null,
  request_payload jsonb not null,
  response_payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, mutation_id)
);

alter table public.pocket_month_revisions enable row level security;
alter table public.pocket_month_mutation_receipts enable row level security;

drop policy if exists pocket_month_revisions_read_scope
  on public.pocket_month_revisions;
create policy pocket_month_revisions_read_scope
  on public.pocket_month_revisions
  for select to authenticated
  using (
    (scope_kind = 'personal' and scope_id = auth.uid())
    or (
      scope_kind = 'household'
      and exists (
        select 1
        from public.household_members hm
        where hm.household_id = pocket_month_revisions.scope_id
          and hm.user_id = auth.uid()
      )
    )
  );

revoke all on public.pocket_month_revisions
  from public, anon, authenticated;
grant select on public.pocket_month_revisions to authenticated;
revoke all on public.pocket_month_mutation_receipts
  from public, anon, authenticated;

create or replace function public.get_pockets_month_v4(
  p_user_id uuid,
  p_scope text,
  p_budget_month date,
  p_household_id uuid default null,
  p_currency text default null,
  p_include_projected_recurring boolean default true,
  p_allow_currency_fallback boolean default false
) returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text;
  v_scope_kind text;
  v_scope_id uuid;
  v_payload jsonb;
  v_revision bigint := 0;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Pocket scope does not belong to the authenticated user'
      using errcode = '42501';
  end if;
  if p_budget_month is null then
    raise exception 'Missing budget month' using errcode = '22023';
  end if;
  if v_scope not in ('personal', 'portfolio', 'household') then
    raise exception 'Invalid Pocket scope' using errcode = '22023';
  end if;
  if v_scope = 'personal' then
    v_scope_kind := 'personal';
    v_scope_id := p_user_id;
  else
    if p_household_id is null then
      raise exception 'Missing household id' using errcode = '22023';
    end if;
    v_scope_kind := 'household';
    v_scope_id := p_household_id;
  end if;

  v_payload := public.get_pockets_month_v3(
    p_user_id => p_user_id,
    p_scope => v_scope,
    p_budget_month => p_budget_month,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_include_projected_recurring => p_include_projected_recurring,
    p_allow_currency_fallback => p_allow_currency_fallback
  );
  v_currency := upper(coalesce(
    nullif(v_payload ->> 'selected_currency', ''),
    nullif(p_currency, ''),
    'USD'
  ));

  select r.revision into v_revision
  from public.pocket_month_revisions r
  where r.scope_kind = v_scope_kind
    and r.scope_id = v_scope_id
    and r.currency = v_currency
    and r.period_month = date_trunc('month', p_budget_month)::date;
  v_revision := coalesce(v_revision, 0);

  return coalesce(v_payload, '{}'::jsonb)
    || jsonb_build_object('server_revision', v_revision);
end;
$$;

create or replace function public.save_pockets_month_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_period_month date,
  p_currency text,
  p_expected_revision bigint,
  p_mutation_id text,
  p_snapshot jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_scope_kind text;
  v_scope_id uuid;
  v_period_month date;
  v_currency text;
  v_revision bigint;
  v_next_revision bigint;
  v_request jsonb;
  v_receipt jsonb;
  v_budget_id uuid;
  v_candidate_budget_id uuid;
  v_total_budget_cents bigint;
  v_pocket jsonb;
  v_pocket_id uuid;
  v_resolved_pocket_id uuid;
  v_pockets jsonb;
  v_categories jsonb;
  v_category text;
  v_delete_id uuid;
  v_deleted_ids jsonb;
  v_kept_ids uuid[] := array[]::uuid[];
  v_sibling_allocations jsonb;
  v_delete_result jsonb;
  v_replaced_ids jsonb := '[]'::jsonb;
  v_id_map jsonb := '{}'::jsonb;
  v_response jsonb;
  v_now timestamptz := now();
  v_previous_write_scope text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Pocket scope does not belong to the authenticated user'
      using errcode = '42501';
  end if;
  if p_period_month is null then
    raise exception 'Missing Pocket period' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid expected Pocket revision' using errcode = '22023';
  end if;
  if p_mutation_id is null or length(trim(p_mutation_id)) = 0 or length(p_mutation_id) > 200 then
    raise exception 'Invalid Pocket mutation id' using errcode = '22023';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object'
     or jsonb_typeof(coalesce(p_snapshot -> 'pockets', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_snapshot -> 'deletedPocketIds', '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid Pocket snapshot' using errcode = '22023';
  end if;
  if v_scope not in ('personal', 'portfolio', 'household') then
    raise exception 'Invalid Pocket scope' using errcode = '22023';
  end if;
  if v_scope = 'personal' then
    if p_household_id is not null then
      raise exception 'Personal Pocket scope cannot include a household'
        using errcode = '22023';
    end if;
    v_scope_kind := 'personal';
    v_scope_id := p_user_id;
  else
    if p_household_id is null then
      raise exception 'Missing household id' using errcode = '22023';
    end if;
    if not public.is_member_of_household(p_household_id) then
      raise exception 'Not authorized to edit this household Pocket plan'
        using errcode = '42501';
    end if;
    v_scope_kind := 'household';
    v_scope_id := p_household_id;
  end if;

  -- Mobile sends the selected financial-cycle start (which can be any day of
  -- the month), while the canonical budget and allocation rows are keyed by
  -- the first day of the anchor calendar month. Match get_pockets_month_v3.
  v_period_month := date_trunc('month', p_period_month)::date;
  v_currency := upper(trim(coalesce(p_currency, '')));
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid Pocket currency' using errcode = '22023';
  end if;
  v_total_budget_cents := coalesce((p_snapshot ->> 'totalBudgetCents')::bigint, 0);
  if v_total_budget_cents < 0 then
    raise exception 'Pocket budget cannot be negative' using errcode = '22023';
  end if;
  v_pockets := coalesce(p_snapshot -> 'pockets', '[]'::jsonb);
  v_deleted_ids := coalesce(p_snapshot -> 'deletedPocketIds', '[]'::jsonb);
  v_sibling_allocations := (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', item ->> 'id',
      'amountCents', coalesce((item ->> 'budgetAmountCents')::bigint, 0)
    )), '[]'::jsonb)
    from jsonb_array_elements(v_pockets) item
    where coalesce(item ->> 'id', '') ~* '^[0-9a-f-]{36}$'
  );

  -- Serialize reuse of an actor mutation key even if a malformed caller tries
  -- to submit the same key for two different Pocket scopes.
  perform pg_advisory_xact_lock(hashtextextended(
    'pocket-mutation:' || p_user_id::text || ':' || trim(p_mutation_id),
    0
  ));

  -- Serialize first creation and all later writes for the same persisted scope.
  perform pg_advisory_xact_lock(hashtextextended(
    v_scope_kind || ':' || v_scope_id::text || ':' || v_currency || ':' || v_period_month::text,
    0
  ));

  v_request := jsonb_build_object(
    'scope', v_scope,
    'householdId', p_household_id,
    'periodMonth', v_period_month,
    'currency', v_currency,
    'expectedRevision', p_expected_revision,
    'snapshot', p_snapshot
  );
  select mr.response_payload into v_receipt
  from public.pocket_month_mutation_receipts mr
  where mr.actor_id = p_user_id and mr.mutation_id = p_mutation_id
  for update;
  if found then
    if (select mr.request_payload
        from public.pocket_month_mutation_receipts mr
        where mr.actor_id = p_user_id and mr.mutation_id = p_mutation_id) <> v_request then
      raise exception 'Pocket mutation id was reused with a different request'
        using errcode = '22023';
    end if;
    return v_receipt;
  end if;

  if v_scope_kind = 'personal' then
    select b.id into v_budget_id
    from public.budgets b
    where b.user_id = p_user_id
      and b.household_id is null
      and upper(b.currency) = v_currency
      and b.period_month = v_period_month
    for no key update;
  elsif v_scope = 'portfolio' then
    select b.id into v_budget_id
    from public.budgets b
    where b.user_id = p_user_id
      and b.household_id = p_household_id
      and upper(b.currency) = v_currency
      and b.period_month = v_period_month
    for no key update;
  else
    select b.id into v_budget_id
    from public.budgets b
    where b.household_id = p_household_id
      and upper(b.currency) = v_currency
      and b.period_month = v_period_month
    for no key update;
  end if;

  -- Older clients sometimes stored the financial-cycle start date in
  -- budgets.period_month. When the active client supplies that exact budget
  -- row, normalize it inside this same revision-checked transaction instead
  -- of issuing an unversioned table update before the snapshot save.
  if v_budget_id is null
     and nullif(p_snapshot ->> 'budgetId', '') is not null then
    begin
      v_candidate_budget_id := (p_snapshot ->> 'budgetId')::uuid;
    exception when invalid_text_representation then
      v_candidate_budget_id := null;
    end;
    if v_candidate_budget_id is not null then
      if v_scope_kind = 'personal' then
        select b.id into v_budget_id
        from public.budgets b
        where b.id = v_candidate_budget_id
          and b.user_id = p_user_id
          and b.household_id is null
          and upper(b.currency) = v_currency
          and date_trunc('month', b.period_month)::date = v_period_month
        for no key update;
      else
        select b.id into v_budget_id
        from public.budgets b
        where b.id = v_candidate_budget_id
          and b.household_id = p_household_id
          and (v_scope <> 'portfolio' or b.user_id = p_user_id)
          and upper(b.currency) = v_currency
          and date_trunc('month', b.period_month)::date = v_period_month
        for no key update;
      end if;
    end if;
  end if;

  -- Lock extant financial rows before the revision row. A released table
  -- writer locks its edited row before its BEFORE trigger advances the token;
  -- using the same order avoids a row/revision deadlock with the CAS writer.
  -- NO KEY UPDATE also permits unrelated FK inserts to reach their revision
  -- trigger before they insert, rather than holding a parent-key lock.
  if v_budget_id is not null then
    perform e.id from public.budget_envelopes e
      where e.budget_id = v_budget_id order by e.id for no key update;
    perform a.id from public.envelope_allocations a
      join public.budget_envelopes e on e.id = a.envelope_id
      where e.budget_id = v_budget_id order by a.id for no key update of a;
    perform l.id from public.envelope_category_links l
      join public.budget_envelopes e on e.id = l.envelope_id
      where e.budget_id = v_budget_id order by l.id for no key update of l;
  end if;

  insert into public.pocket_month_revisions (
    scope_kind, scope_id, currency, period_month, revision, updated_at
  ) values (
    v_scope_kind, v_scope_id, v_currency, v_period_month, 0, v_now
  ) on conflict (scope_kind, scope_id, currency, period_month) do nothing;
  select r.revision into v_revision
  from public.pocket_month_revisions r
  where r.scope_kind = v_scope_kind
    and r.scope_id = v_scope_id
    and r.currency = v_currency
    and r.period_month = v_period_month
  for update;

  if v_revision <> p_expected_revision then
    return jsonb_build_object(
      'success', false,
      'code', 'REVISION_CONFLICT',
      'expectedRevision', p_expected_revision,
      'currentRevision', v_revision
    );
  end if;

  -- Table writers from released clients also advance revisions. Suppress
  -- only this snapshot's exact scope; other affected months still advance.
  v_previous_write_scope := current_setting('moneko.pocket_write_scope', true);
  perform set_config('moneko.pocket_write_scope',
    v_scope_kind || ':' || v_scope_id::text || ':' || v_currency || ':' || v_period_month::text,
    true);

  if v_budget_id is not null then
    update public.budgets set period_month = v_period_month, updated_at = v_now
      where id = v_budget_id and period_month <> v_period_month;
  end if;

  if v_budget_id is null then
    insert into public.budgets (
      user_id, household_id, currency, period_month,
      total_budget_cents, updated_at
    ) values (
      p_user_id,
      case when v_scope_kind = 'personal' then null else p_household_id end,
      v_currency,
      v_period_month,
      v_total_budget_cents,
      v_now
    ) returning id into v_budget_id;
  else
    update public.budgets
    set total_budget_cents = v_total_budget_cents,
        updated_at = v_now
    where id = v_budget_id;
  end if;

  for v_pocket in select value from jsonb_array_elements(v_pockets)
  loop
    if jsonb_typeof(v_pocket) <> 'object'
       or nullif(trim(v_pocket ->> 'name'), '') is null then
      raise exception 'Pocket name is required' using errcode = '22023';
    end if;
    if coalesce((v_pocket ->> 'budgetAmountCents')::bigint, 0) < 0 then
      raise exception 'Pocket amount cannot be negative' using errcode = '22023';
    end if;
    if nullif(v_pocket ->> 'currency', '') is not null
       and upper(trim(v_pocket ->> 'currency')) <> v_currency then
      raise exception 'Pocket currency does not match its budget'
        using errcode = '22023';
    end if;

    v_pocket_id := null;
    if coalesce(v_pocket ->> 'id', '') !~ '^optimistic-' then
      begin
        v_pocket_id := nullif(v_pocket ->> 'id', '')::uuid;
      exception when invalid_text_representation then
        v_pocket_id := null;
      end;
    end if;

    if v_pocket_id is null then
      insert into public.budget_envelopes (
        user_id, budget_id, household_id, name, budget_amount_cents,
        currency, icon, color, logo_url, rollover_group_id, rollover_enabled,
        rollover_negative, rollover_cap_cents, opening_rollover_cents,
        updated_at
      ) values (
        p_user_id,
        v_budget_id,
        case when v_scope_kind = 'personal' then null else p_household_id end,
        trim(v_pocket ->> 'name'),
        coalesce((v_pocket ->> 'budgetAmountCents')::bigint, 0),
        v_currency,
        nullif(v_pocket ->> 'icon', ''),
        nullif(v_pocket ->> 'color', ''),
        nullif(v_pocket ->> 'logoUrl', ''),
        coalesce(nullif(v_pocket ->> 'rolloverGroupId', '')::uuid, gen_random_uuid()),
        coalesce((v_pocket ->> 'rolloverEnabled')::boolean, false),
        coalesce((v_pocket ->> 'rolloverNegative')::boolean, false),
        nullif(v_pocket ->> 'rolloverCapCents', '')::bigint,
        coalesce((v_pocket ->> 'openingRolloverCents')::bigint, 0),
        v_now
      ) on conflict (budget_id, name) do update set
        budget_amount_cents = excluded.budget_amount_cents,
        currency = excluded.currency,
        icon = excluded.icon,
        color = excluded.color,
        logo_url = excluded.logo_url,
        rollover_group_id = case
          when nullif(v_pocket ->> 'rolloverGroupId', '') is not null
            then excluded.rollover_group_id
          else budget_envelopes.rollover_group_id
        end,
        rollover_enabled = excluded.rollover_enabled,
        rollover_negative = excluded.rollover_negative,
        rollover_cap_cents = excluded.rollover_cap_cents,
        opening_rollover_cents = excluded.opening_rollover_cents,
        updated_at = excluded.updated_at
      returning id into v_resolved_pocket_id;
      if nullif(v_pocket ->> 'id', '') is not null then
        v_id_map := v_id_map || jsonb_build_object(v_pocket ->> 'id', v_resolved_pocket_id);
      end if;
    else
      update public.budget_envelopes e
      set user_id = case
            when v_scope_kind = 'personal' then p_user_id
            else e.user_id
          end,
          budget_id = v_budget_id,
          household_id = case when v_scope_kind = 'personal' then null else p_household_id end,
          name = trim(v_pocket ->> 'name'),
          budget_amount_cents = coalesce((v_pocket ->> 'budgetAmountCents')::bigint, 0),
          currency = v_currency,
          icon = case when v_pocket ? 'icon' then nullif(v_pocket ->> 'icon', '') else e.icon end,
          color = case when v_pocket ? 'color' then nullif(v_pocket ->> 'color', '') else e.color end,
          logo_url = case when v_pocket ? 'logoUrl' then nullif(v_pocket ->> 'logoUrl', '') else e.logo_url end,
          rollover_group_id = coalesce(nullif(v_pocket ->> 'rolloverGroupId', '')::uuid, e.rollover_group_id),
          rollover_enabled = case when v_pocket ? 'rolloverEnabled' then (v_pocket ->> 'rolloverEnabled')::boolean else e.rollover_enabled end,
          rollover_negative = case when v_pocket ? 'rolloverNegative' then (v_pocket ->> 'rolloverNegative')::boolean else e.rollover_negative end,
          rollover_cap_cents = case when v_pocket ? 'rolloverCapCents' then nullif(v_pocket ->> 'rolloverCapCents', '')::bigint else e.rollover_cap_cents end,
          opening_rollover_cents = case when v_pocket ? 'openingRolloverCents' then coalesce((v_pocket ->> 'openingRolloverCents')::bigint, 0) else e.opening_rollover_cents end,
          updated_at = v_now
      where e.id = v_pocket_id
        and e.budget_id = v_budget_id
        and (
          (
            v_scope_kind = 'personal'
            and e.user_id = p_user_id
            and e.household_id is null
          )
          or (
            v_scope_kind = 'household'
            and e.household_id = p_household_id
          )
        )
      returning e.id into v_resolved_pocket_id;
      if v_resolved_pocket_id is null then
        raise exception 'Pocket does not belong to this budget scope'
          using errcode = '42501';
      end if;
    end if;

    insert into public.envelope_allocations (
      envelope_id, period_month, amount_cents, carryover_policy, updated_at
    ) values (
      v_resolved_pocket_id,
      v_period_month,
      coalesce((v_pocket ->> 'budgetAmountCents')::bigint, 0),
      'carryover',
      v_now
    ) on conflict (envelope_id, period_month) do update set
      amount_cents = excluded.amount_cents,
      carryover_policy = excluded.carryover_policy,
      updated_at = excluded.updated_at;
    v_kept_ids := array_append(v_kept_ids, v_resolved_pocket_id);

    if coalesce((p_snapshot ->> 'replaceCategories')::boolean, true) then
      delete from public.envelope_category_links l
      where l.envelope_id = v_resolved_pocket_id;
    end if;
    v_categories := coalesce(v_pocket -> 'categories', '[]'::jsonb);
    if jsonb_typeof(v_categories) <> 'array' then
      raise exception 'Pocket categories must be an array' using errcode = '22023';
    end if;
    for v_category in
      select distinct lower(trim(value #>> '{}'))
      from jsonb_array_elements(v_categories)
      where nullif(trim(value #>> '{}'), '') is not null
    loop
      insert into public.envelope_category_links (envelope_id, category, updated_at)
      values (v_resolved_pocket_id, v_category, v_now)
      on conflict (envelope_id, category) do update set updated_at = excluded.updated_at;
    end loop;
  end loop;

  select coalesce(jsonb_agg(value), '[]'::jsonb)
  into v_deleted_ids
  from jsonb_array_elements(v_deleted_ids) value;
  for v_delete_id in
    select distinct nullif(value #>> '{}', '')::uuid
    from jsonb_array_elements(v_deleted_ids) value
    where coalesce(value #>> '{}', '') ~* '^[0-9a-f-]{36}$'
  loop
    v_delete_result := public.delete_pocket_envelope_with_allocations(
      v_delete_id,
      v_budget_id,
      v_period_month,
      v_sibling_allocations
    );
    if coalesce((v_delete_result ->> 'success')::boolean, false) = false then
      raise exception 'Pocket deletion failed: %', coalesce(v_delete_result ->> 'error', 'unknown error')
        using errcode = 'P0001';
    end if;
  end loop;

  if coalesce((p_snapshot ->> 'replaceMissingPockets')::boolean, false) then
    for v_delete_id in
      select e.id
      from public.budget_envelopes e
      where e.budget_id = v_budget_id
        and not (e.id = any(v_kept_ids))
      union
      select nullif(value #>> '{}', '')::uuid
      from jsonb_array_elements(v_deleted_ids) value
      where coalesce(value #>> '{}', '') ~* '^[0-9a-f-]{36}$'
    loop
      if exists (select 1 from public.budget_envelopes e where e.id = v_delete_id and e.budget_id = v_budget_id) then
        v_delete_result := public.delete_pocket_envelope_with_allocations(
          v_delete_id,
          v_budget_id,
          v_period_month,
          v_sibling_allocations
        );
        if coalesce((v_delete_result ->> 'success')::boolean, false) = false then
          raise exception 'Pocket replacement deletion failed: %', coalesce(v_delete_result ->> 'error', 'unknown error')
            using errcode = 'P0001';
        end if;
        v_replaced_ids := v_replaced_ids || jsonb_build_array(v_delete_id);
      end if;
    end loop;
  end if;

  -- The allocation-aware delete RPC may redistribute same-month sibling
  -- amounts. Re-apply the submitted snapshot after deletions so its explicit
  -- allocations remain authoritative within this same transaction.
  for v_pocket in select value from jsonb_array_elements(v_pockets)
  loop
    v_resolved_pocket_id := null;
    begin
      v_resolved_pocket_id := nullif(v_pocket ->> 'id', '')::uuid;
    exception when invalid_text_representation then
      v_resolved_pocket_id := nullif(v_id_map ->> (v_pocket ->> 'id'), '')::uuid;
    end;
    if v_resolved_pocket_id is null then
      v_resolved_pocket_id := nullif(v_id_map ->> (v_pocket ->> 'id'), '')::uuid;
    end if;
    if v_resolved_pocket_id is not null then
      insert into public.envelope_allocations (
        envelope_id, period_month, amount_cents, carryover_policy, updated_at
      ) values (
        v_resolved_pocket_id,
        v_period_month,
        coalesce((v_pocket ->> 'budgetAmountCents')::bigint, 0),
        'carryover',
        v_now
      ) on conflict (envelope_id, period_month) do update set
        amount_cents = excluded.amount_cents,
        carryover_policy = excluded.carryover_policy,
        updated_at = excluded.updated_at;
    end if;
  end loop;

  v_next_revision := v_revision + 1;
  update public.pocket_month_revisions
  set revision = v_next_revision, updated_at = v_now
  where scope_kind = v_scope_kind
    and scope_id = v_scope_id
    and currency = v_currency
    and period_month = v_period_month;

  v_response := jsonb_build_object(
    'success', true,
    'budgetId', v_budget_id,
    'revision', v_next_revision,
    'canonicalPocketIds', v_id_map,
    'deletedPocketIds', v_replaced_ids
  );
  insert into public.pocket_month_mutation_receipts (
    actor_id, mutation_id, scope_kind, scope_id, currency, period_month,
    request_payload, response_payload
  ) values (
    p_user_id, p_mutation_id, v_scope_kind, v_scope_id, v_currency,
    v_period_month, v_request, v_response
  );
  perform set_config('moneko.pocket_write_scope', coalesce(v_previous_write_scope, ''), true);
  return v_response;
end;
$$;

revoke all on function public.get_pockets_month_v4(uuid, text, date, uuid, text, boolean, boolean)
  from public, anon;
grant execute on function public.get_pockets_month_v4(uuid, text, date, uuid, text, boolean, boolean)
  to authenticated;
revoke all on function public.save_pockets_month_v1(uuid, text, uuid, date, text, bigint, text, jsonb)
  from public, anon;
grant execute on function public.save_pockets_month_v1(uuid, text, uuid, date, text, bigint, text, jsonb)
  to authenticated;

comment on function public.get_pockets_month_v4(uuid, text, date, uuid, text, boolean, boolean) is
  'Returns the canonical Pocket month payload and its server-owned optimistic concurrency revision from the same database snapshot.';
comment on function public.save_pockets_month_v1(uuid, text, uuid, date, text, bigint, text, jsonb) is
  'Atomically applies an idempotent Pocket month snapshot only when its expected scope revision is current; stale snapshots return REVISION_CONFLICT without writes.';

-- Released clients still write these tables directly. Every semantic write
-- must invalidate the CAS token, including category/metadata changes that
-- affect more than the budget's anchor month. Timestamp-only retries do not.
create or replace function public.bump_pocket_month_revision_v1(
  p_user_id uuid, p_household_id uuid, p_currency text, p_month date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text := case when p_household_id is null then 'personal' else 'household' end;
  v_id uuid := coalesce(p_household_id, p_user_id);
  v_currency text := upper(p_currency);
  v_month date := date_trunc('month', p_month)::date;
  v_key text;
begin
  if v_id is null or v_month is null or v_currency is null then return; end if;
  v_key := v_kind || ':' || v_id::text || ':' || v_currency || ':' || v_month::text;
  if current_setting('moneko.pocket_write_scope', true) = v_key then return; end if;
  insert into public.pocket_month_revisions as r
    (scope_kind, scope_id, currency, period_month, revision)
  values (v_kind, v_id, v_currency, v_month, 1)
  on conflict (scope_kind, scope_id, currency, period_month)
  do update set revision = r.revision + 1, updated_at = now();
end;
$$;

create or replace function public.track_pocket_table_revision_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_budget public.budgets%rowtype;
  v_envelope_id uuid;
  v_budget_id uuid;
  v_month date;
begin
  -- Upserts run INSERT triggers before conflict resolution. The UPDATE
  -- trigger covers an existing row, so timestamp-only retries remain no-ops.
  if tg_op = 'INSERT' then
    if tg_table_name = 'budgets' then
      if exists (
          select 1 from public.budgets b where b.user_id = new.user_id
          and b.household_id is not distinct from new.household_id
          and b.currency = new.currency and b.period_month = new.period_month) then
        return new;
      end if;
    elsif tg_table_name = 'envelope_category_links' then
      if exists (select 1 from public.envelope_category_links l
        where l.envelope_id = new.envelope_id and l.category = new.category) then
        return new;
      end if;
    elsif tg_table_name = 'envelope_allocations' then
      if exists (select 1 from public.envelope_allocations a
        where a.envelope_id = new.envelope_id and a.period_month = new.period_month) then
        return new;
      end if;
    elsif tg_table_name = 'budget_envelopes' then
      if exists (select 1 from public.budget_envelopes e
        where e.budget_id = new.budget_id and e.name = new.name) then
        return new;
      end if;
    end if;
  end if;
  if tg_op = 'UPDATE' and
     (to_jsonb(old) - 'updated_at' - 'created_at') =
     (to_jsonb(new) - 'updated_at' - 'created_at') then
    return new;
  end if;
  for v_row in
    select distinct value from jsonb_array_elements(
      case when tg_op = 'INSERT' then jsonb_build_array(to_jsonb(new))
           when tg_op = 'DELETE' then jsonb_build_array(to_jsonb(old))
           else jsonb_build_array(to_jsonb(old), to_jsonb(new)) end)
  loop
    if tg_table_name = 'budgets' then
      for v_month in
        select distinct date_trunc('month', d)::date from (
          select (v_row ->> 'period_month')::date as d
          union all select a.period_month from public.envelope_allocations a
            join public.budget_envelopes e on e.id = a.envelope_id
            where e.budget_id = (v_row ->> 'id')::uuid
        ) months where d is not null order by 1
      loop
        perform public.bump_pocket_month_revision_v1(
          (v_row ->> 'user_id')::uuid, (v_row ->> 'household_id')::uuid,
          v_row ->> 'currency', v_month);
      end loop;
    else
      if tg_table_name = 'budget_envelopes' then
        v_envelope_id := (v_row ->> 'id')::uuid;
        v_budget_id := (v_row ->> 'budget_id')::uuid;
      else
        v_envelope_id := (v_row ->> 'envelope_id')::uuid;
        select e.budget_id into v_budget_id
          from public.budget_envelopes e where e.id = v_envelope_id;
      end if;
      select b.* into v_budget from public.budgets b where b.id = v_budget_id;
      if found then
        for v_month in
          select distinct date_trunc('month', d)::date from (
            select v_budget.period_month as d
            union all select (v_row ->> 'period_month')::date
              where tg_table_name = 'envelope_allocations'
            union all select a.period_month from public.envelope_allocations a
              where a.envelope_id = v_envelope_id
                and tg_table_name <> 'envelope_allocations'
          ) months where d is not null order by 1
        loop
          perform public.bump_pocket_month_revision_v1(
            v_budget.user_id, v_budget.household_id, v_budget.currency, v_month);
        end loop;
      end if;
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.bump_pocket_month_revision_v1(uuid, uuid, text, date)
  from public, anon, authenticated;
revoke all on function public.track_pocket_table_revision_v1()
  from public, anon, authenticated;
do $$
declare v_table text;
begin
  foreach v_table in array array[
    'budgets', 'budget_envelopes', 'envelope_allocations', 'envelope_category_links'
  ] loop
    execute format('drop trigger if exists pocket_revision_write on public.%I', v_table);
    execute format(
      'create trigger pocket_revision_write before insert or update or delete on public.%I '
      'for each row execute function public.track_pocket_table_revision_v1()', v_table);
  end loop;
end;
$$;
