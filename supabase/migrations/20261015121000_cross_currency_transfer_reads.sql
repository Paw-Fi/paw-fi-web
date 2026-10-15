-- Requires 20261015120000: legacy amount/currency remain the source principal.
-- Patch the live base readers, not superseded historical definitions. Keeping
-- their bodies preserves their scope/privacy predicates, fast paths and grants.
-- Shape checks intentionally abort on unexpected drift rather than ship a
-- partially updated read chain. The replacements are safe to apply again.
do $$
declare
  v_name text;
  v_oid regprocedure;
  v_definition text;
  v_segment text;
  v_start integer;
  v_end integer;
begin
  foreach v_name in array array[
    'get_user_transactions_page_v1', 'get_user_transactions_page_v2',
    'get_user_transactions_summary_v1'
  ] loop
    select p.oid::regprocedure into strict v_oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_name;
    v_definition := pg_get_functiondef(v_oid);
    if strpos(v_definition, 't.to_amount_cents') > 0 then continue; end if;
    if v_name = 'get_user_transactions_summary_v1' then
      -- Other CTEs in the summary also use the alias t for currency rollups.
      v_start := strpos(v_definition, '  filtered_transfers as (');
      v_end := strpos(substr(v_definition, v_start), '  combined_items as (');
      if v_start = 0 or v_end = 0 then
        raise exception 'Unexpected transfer summary definition: %', v_oid;
      end if;
      v_segment := substr(v_definition, v_start, v_end - 1);
    else
      v_segment := v_definition;
    end if;
    if strpos(v_segment, 'from public.account_transfers t') = 0
      or strpos(v_segment, 't.amount_cents') = 0 or strpos(v_segment, 't.currency') = 0 then
      raise exception 'Unexpected transfer feed definition: %', v_oid;
    end if;
    v_segment := replace(v_segment, 't.amount_cents',
      '(case when t.to_account_id = p_account_id then coalesce(t.to_amount_cents, t.amount_cents) else t.amount_cents end)');
    v_segment := replace(v_segment, 't.currency',
      '(case when t.to_account_id = p_account_id then coalesce(t.to_currency, t.currency) else t.currency end)');
    if v_name = 'get_user_transactions_summary_v1' then
      v_definition := overlay(v_definition placing v_segment from v_start for v_end - 1);
    else
      v_definition := v_segment;
    end if;
    execute v_definition;
  end loop;
end;
$$;

-- Snapshot v2/v3 and history v2 delegate physical ledger balances to these v1
-- readers. Filter membership on either native side, then wallet_scope selects
-- the requested wallets; incoming deltas use the received principal.
do $$
declare
  v_name text;
  v_oid regprocedure;
  v_definition text;
begin
  foreach v_name in array array['get_wallets_month_snapshot_v1', 'get_wallets_history_v1'] loop
    select p.oid::regprocedure into strict v_oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_name;
    v_definition := pg_get_functiondef(v_oid);
    if strpos(v_definition, 't.to_amount_cents') > 0 then continue; end if;
    if strpos(v_definition, E'      t.amount_cents\n    from public.account_transfers t') = 0
      or strpos(v_definition, 'upper(coalesce(t.currency, '''')) = upper(p_currency)') = 0 then
      raise exception 'Unexpected wallet ledger definition: %', v_oid;
    end if;
    v_definition := replace(v_definition,
      E'      t.amount_cents\n    from public.account_transfers t',
      E'      t.amount_cents, coalesce(t.to_amount_cents, t.amount_cents) as to_amount_cents\n    from public.account_transfers t');
    v_definition := replace(v_definition,
      'upper(coalesce(t.currency, '''')) = upper(p_currency)',
      '(upper(coalesce(t.currency, '''')) = upper(p_currency) or upper(coalesce(t.to_currency, t.currency, '''')) = upper(p_currency))');
    v_definition := replace(v_definition, 'sum(abs(amount_cents))', 'sum(abs(to_amount_cents))');
    v_definition := replace(v_definition, 'sum(abs(ft.amount_cents))', 'sum(abs(ft.to_amount_cents))');
    execute v_definition;
  end loop;
end;
$$;

create or replace function public.enrich_wallet_transfer_time_items(p_items jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with items as (
    select value, ordinality,
      case when value ->> 'id' ~* '^transfer:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(in|out)$'
        then split_part(value ->> 'id', ':', 2)::uuid end as transfer_id,
      split_part(value ->> 'id', ':', 3) = 'in' as incoming
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality
  )
  select coalesce(jsonb_agg(
    case when transfer.id is null then items.value
      else items.value || jsonb_build_object(
        'date', transfer.date, 'time', transfer.time::text,
        'transfer_time', transfer.time::text, 'updated_at', transfer.updated_at,
        'amount_cents', abs(case when items.incoming
          then coalesce(transfer.to_amount_cents, transfer.amount_cents) else transfer.amount_cents end),
        'currency', case when items.incoming
          then coalesce(transfer.to_currency, transfer.currency) else transfer.currency end,
        'transfer_id', transfer.id, 'from_account_id', transfer.from_account_id,
        'to_account_id', transfer.to_account_id,
        'to_amount_cents', coalesce(transfer.to_amount_cents, transfer.amount_cents),
        'to_currency', coalesce(transfer.to_currency, transfer.currency),
        'exchange_rate', transfer.exchange_rate,
        'fee_amount_cents', coalesce(transfer.fee_amount_cents, 0),
        'fee_expense_id', transfer.fee_expense_id,
        'transfer_contract_version', transfer.transfer_contract_version,
        'analytics_is_final', true, 'analytics_spending_multiplier', 0,
        'analytics_counts_toward_income', false
      ) end order by items.ordinality
  ), '[]'::jsonb)
  from items left join public.account_transfers transfer on transfer.id = items.transfer_id;
$$;
revoke all on function public.enrich_wallet_transfer_time_items(jsonb) from public, anon, authenticated;

-- The separately paginated delta already owns actor/scope/cursor/tombstones.
do $$
declare
  v_oid regprocedure := 'public.get_mobile_transfer_delta_v1(uuid,timestamptz,uuid,integer)'::regprocedure;
  v_definition text;
begin
  v_definition := pg_get_functiondef(v_oid);
  if strpos(v_definition, 'public.enrich_wallet_transfer_time_items') = 0 then
    if strpos(v_definition, 'return v_payload;') = 0 then
      raise exception 'Unexpected transfer delta definition: %', v_oid;
    end if;
    execute replace(v_definition, 'return v_payload;',
      'return jsonb_set(v_payload, ''{transactions}'', public.enrich_wallet_transfer_time_items(v_payload -> ''transactions''), true);');
  end if;
end;
$$;

-- All canonical JSON expense contracts already share merchant enrichment:
-- feed v6, expense delta v6, analytics v2, dashboard recent/calendar and detail.
-- Never reveal a private fee's parent identity through a redacted row.
create or replace function public.enrich_merchant_identity_items(p_items jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with items as (
    select value, ordinality,
      case when value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (value ->> 'id')::uuid end as expense_id
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality
  )
  select coalesce(jsonb_agg(items.value || jsonb_build_object(
    'merchant_id', expense.merchant_id, 'merchant_domain', merchant.domain,
    'merchant_structured_name', expense.merchant_structured_name,
    'merchant_logo_url', public.expense_merchant_logo_url(merchant.logo_identifier),
    'transfer_fee_transfer_id', case when expense.privacy_scope = 'balances_only'
      and expense.user_id is distinct from (select auth.uid()) then null
      else expense.transfer_fee_transfer_id end
  ) order by items.ordinality), '[]'::jsonb)
  from items
  left join public.expenses expense on expense.id = items.expense_id
  left join public.merchants merchant on merchant.id = expense.merchant_id;
$$;
revoke all on function public.enrich_merchant_identity_items(jsonb) from public, anon, authenticated;

-- The base analytics JSON is also a supported direct read, beneath v2.
do $$
declare v_definition text;
begin
  v_definition := pg_get_functiondef('public.get_user_analytics(uuid)'::regprocedure);
  if strpos(v_definition, 'e.transfer_fee_transfer_id') = 0 then
    if strpos(v_definition, 'e.analytics_spending_multiplier, e.analytics_counts_toward_income') = 0 then
      raise exception 'Unexpected analytics expense row definition';
    end if;
    execute replace(v_definition,
      'e.analytics_spending_multiplier, e.analytics_counts_toward_income',
      'e.analytics_spending_multiplier, e.analytics_counts_toward_income, e.transfer_fee_transfer_id');
  end if;
end;
$$;

-- MoM uses a typed row contract rather than the JSON enrichment helper. No SQL
-- function depends on v5; append the nullable field without changing v4 or its
-- visibility/date/cursor policy. PostgreSQL requires drop for a RETURNS TABLE
-- shape change, so restore the existing authenticated-only grant explicitly.
drop function public.get_home_mom_transactions_v5(uuid, date, date, date, timestamptz, uuid, integer);
create or replace function public.get_home_mom_transactions_v5(
  p_user_id uuid, p_start_date date default null, p_end_date date default null,
  p_before_date date default null, p_before_created_at timestamptz default null,
  p_before_id uuid default null, p_limit integer default 1000
) returns table (
  id text, contact_id uuid, user_id uuid, household_id uuid, date date,
  amount_cents bigint, currency text, category text, created_at timestamptz,
  updated_at timestamptz, raw_text text, split_group_id uuid, bank_account_id uuid,
  type text, analytics_class text, analytics_is_final boolean,
  analytics_spending_multiplier smallint, analytics_counts_toward_income boolean,
  is_recurring boolean, merchant text, merchant_id uuid, merchant_domain text,
  merchant_logo_url text, merchant_structured_name text, transfer_fee_transfer_id uuid
) language sql security invoker set search_path = '' as $$
  select item.id, item.contact_id, item.user_id, item.household_id, item.date,
    item.amount_cents, item.currency, item.category, item.created_at, item.updated_at,
    item.raw_text, item.split_group_id, item.bank_account_id, item.type,
    item.analytics_class, item.analytics_is_final, item.analytics_spending_multiplier,
    item.analytics_counts_toward_income, item.is_recurring, item.merchant,
    item.merchant_id, item.merchant_domain,
    public.expense_merchant_logo_url(merchant.logo_identifier), item.merchant_structured_name,
    case when expense.privacy_scope = 'balances_only'
      and expense.user_id is distinct from (select auth.uid()) then null
      else expense.transfer_fee_transfer_id end
  from public.get_home_mom_transactions_v4(
    p_user_id, p_start_date, p_end_date, p_before_date, p_before_created_at,
    p_before_id, p_limit
  ) item
  join public.expenses expense on expense.id::text = item.id
  left join public.merchants merchant on merchant.id = expense.merchant_id;
$$;
revoke all on function public.get_home_mom_transactions_v5(uuid, date, date, date, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_home_mom_transactions_v5(uuid, date, date, date, timestamptz, uuid, integer) to authenticated;

notify pgrst, 'reload schema';
