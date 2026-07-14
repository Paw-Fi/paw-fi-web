create or replace function public.get_wallets_month_snapshot_v3(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_month_start date default null,
  p_include_archived boolean default false,
  p_financial_month_start_day integer default 1
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_start_day integer := case
    when p_financial_month_start_day between 1 and 31 then p_financial_month_start_day
    else 1
  end;
  v_current_nominal_cycle_start date := make_date(
    extract(year from current_date)::integer,
    extract(month from current_date)::integer,
    least(
      v_start_day,
      extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::integer
    )
  );
  v_current_cycle_start date := case
    when current_date >= v_current_nominal_cycle_start then v_current_nominal_cycle_start
    else make_date(
      extract(year from (date_trunc('month', current_date) - interval '1 month'))::integer,
      extract(month from (date_trunc('month', current_date) - interval '1 month'))::integer,
      least(
        v_start_day,
        extract(day from (date_trunc('month', current_date) - interval '1 day'))::integer
      )
    )
  end;
  v_month_start date := coalesce(
    p_month_start,
    v_current_cycle_start
  );
  v_month_end_exclusive date := make_date(
    extract(year from (date_trunc('month', v_month_start) + interval '1 month'))::integer,
    extract(month from (date_trunc('month', v_month_start) + interval '1 month'))::integer,
    least(
      v_start_day,
      extract(day from (date_trunc('month', v_month_start) + interval '2 months - 1 day'))::integer
    )
  );
  v_effective_end_inclusive date := case
    when v_month_start = v_current_cycle_start then current_date
    else (v_month_end_exclusive - interval '1 day')::date
  end;
  v_effective_end_exclusive date := v_effective_end_inclusive + 1;
  v_base_payload jsonb;
  v_payload jsonb;
begin
  v_base_payload := public.get_wallets_month_snapshot_v2(
    p_user_id => p_user_id,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_month_start => v_month_start,
    p_include_archived => p_include_archived
  );

  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  wallet_scope as (
    select
      a.id,
      a.created_at,
      a.is_default,
      a.is_system,
      lower(trim(coalesce(a.name, ''))) as normalized_name
    from public.accounts a
    where (
      (p_household_id is null and a.user_id = p_user_id and a.household_id is null)
      or (p_household_id is not null and a.household_id = p_household_id)
    )
      and (p_include_archived = true or a.is_archived = false)
      and (
        p_currency is null
        or upper(coalesce(a.currency, '')) = upper(p_currency)
      )
  ),
  legacy_wallet as (
    select coalesce(
      (
        select ws.id
        from wallet_scope ws
        where ws.is_system = true
          and ws.normalized_name = 'spending'
        order by ws.created_at asc
        limit 1
      ),
      (
        select ws.id
        from wallet_scope ws
        where ws.is_system = true
        order by ws.created_at asc
        limit 1
      ),
      (
        select ws.id
        from wallet_scope ws
        where ws.is_default = true
        order by ws.created_at asc
        limit 1
      ),
      (
        select ws.id
        from wallet_scope ws
        order by ws.created_at asc
        limit 1
      )
    ) as wallet_id
  ),
  actual_period_rows as (
    select
      abs(e.amount_cents)::bigint as amount_cents,
      lower(coalesce(e.type::text, 'expense')) as transaction_type
    from public.expenses e
    where coalesce(e.is_recurring, false) = false
      and e.deleted_at is null
      and e.date >= v_month_start
      and e.date < v_effective_end_exclusive
      and lower(trim(coalesce(e.category, ''))) <> 'transfers'
      and (
        (
          p_household_id is null
          and e.household_id is null
          and (
            e.user_id = p_user_id
            or exists (
              select 1
              from contact_ids c
              where c.id = e.contact_id
            )
          )
        )
        or (
          p_household_id is not null
          and e.household_id = p_household_id
        )
      )
      and (
        p_currency is null
        or upper(coalesce(e.currency, '')) = upper(p_currency)
      )
  ),
  projected_period_rows as (
    select
      abs(pr.amount_cents)::bigint as amount_cents,
      lower(coalesce(pr.type, 'expense')) as transaction_type
    from public.get_projected_scoped_recurring_expenses_v1(
      p_user_id => p_user_id,
      p_scope => case when p_household_id is null then 'personal' else 'household' end,
      p_household_id => p_household_id,
      p_currency => p_currency,
      p_range_start => v_month_start,
      p_range_end => v_effective_end_inclusive
    ) pr
    where lower(trim(coalesce(pr.category, ''))) <> 'transfers'
  ),
  corrected_totals as (
    select
      coalesce(
        sum(case when combined.transaction_type = 'income' then combined.amount_cents else 0 end),
        0
      )::bigint as income_total_cents,
      coalesce(
        sum(case when combined.transaction_type = 'income' then 0 else combined.amount_cents end),
        0
      )::bigint as spent_total_cents
    from (
      select * from actual_period_rows
      union all
      select * from projected_period_rows
    ) combined
  ),
  deleted_wallet_reversals as (
    select
      coalesce(e.account_id, (select wallet_id from legacy_wallet)) as wallet_id,
      sum(
        case
          when lower(coalesce(e.type::text, 'expense')) = 'income'
            then -abs(e.amount_cents)
          else abs(e.amount_cents)
        end
      )::bigint as reversal_cents
    from public.expenses e
    where coalesce(e.is_recurring, false) = false
      and e.deleted_at is not null
      and e.date < v_month_end_exclusive
      and (
        (
          p_household_id is null
          and e.household_id is null
          and (
            e.user_id = p_user_id
            or exists (
              select 1
              from contact_ids c
              where c.id = e.contact_id
            )
          )
        )
        or (
          p_household_id is not null
          and e.household_id = p_household_id
        )
      )
      and (
        p_currency is null
        or upper(coalesce(e.currency, '')) = upper(p_currency)
      )
    group by 1
  ),
  base_wallet_balances as (
    select
      nullif(value ->> 'wallet_id', '')::uuid as wallet_id,
      coalesce((value ->> 'balance_cents')::bigint, 0) as balance_cents
    from jsonb_array_elements(coalesce(v_base_payload -> 'wallet_balances', '[]'::jsonb)) value
  ),
  corrected_wallet_balances as (
    select
      bw.wallet_id,
      (bw.balance_cents + coalesce(dwr.reversal_cents, 0))::bigint as balance_cents
    from base_wallet_balances bw
    left join deleted_wallet_reversals dwr
      on dwr.wallet_id = bw.wallet_id
  )
  select v_base_payload || jsonb_build_object(
    'income_total_cents', (select ct.income_total_cents from corrected_totals ct),
    'spent_total_cents', (select ct.spent_total_cents from corrected_totals ct),
    'net_worth_cents', coalesce(
      (select sum(cwb.balance_cents) from corrected_wallet_balances cwb),
      0
    ),
    'wallet_balances', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'wallet_id', cwb.wallet_id,
            'balance_cents', cwb.balance_cents
          )
          order by cwb.wallet_id
        )
        from corrected_wallet_balances cwb
      ),
      '[]'::jsonb
    )
  ) into v_payload;

  return coalesce(v_payload, v_base_payload);
end;
$$;

revoke execute on function public.get_wallets_month_snapshot_v3(
  uuid,
  uuid,
  text,
  date,
  boolean,
  integer
) from public, anon;

grant execute on function public.get_wallets_month_snapshot_v3(
  uuid,
  uuid,
  text,
  date,
  boolean,
  integer
) to authenticated, service_role;

notify pgrst, 'reload schema';
