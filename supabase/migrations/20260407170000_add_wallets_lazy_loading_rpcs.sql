create or replace function public.get_wallets_month_snapshot_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_month_start date default null,
  p_include_archived boolean default false
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_month_start date := coalesce(p_month_start, date_trunc('month', now())::date);
  v_month_end_exclusive date := (coalesce(p_month_start, date_trunc('month', now())::date) + interval '1 month')::date;
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized wallets month snapshot access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household wallets month snapshot access'
      using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  wallet_scope as (
    select
      a.id,
      a.created_at,
      a.opening_balance_cents,
      a.is_default,
      a.is_system,
      lower(trim(coalesce(a.name, ''))) as normalized_name
    from public.accounts a
    where (
      (p_household_id is null and a.user_id = p_user_id and a.household_id is null)
      or (p_household_id is not null and a.household_id = p_household_id)
    )
      and (p_include_archived = true or a.is_archived = false)
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
  filtered_expenses as (
    select
      e.account_id,
      e.date,
      e.amount_cents,
      e.type
    from public.expenses e
    where coalesce(e.is_recurring, false) = false
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
  ),
  expense_wallet_deltas as (
    select
      coalesce(fe.account_id, (select wallet_id from legacy_wallet)) as wallet_id,
      sum(
        case
          when lower(coalesce(fe.type::text, 'expense')) = 'income'
            then abs(fe.amount_cents)
          else -abs(fe.amount_cents)
        end
      )::bigint as delta_cents
    from filtered_expenses fe
    group by 1
  ),
  filtered_transfers as (
    select
      t.from_account_id,
      t.to_account_id,
      t.amount_cents
    from public.account_transfers t
    where t.date < v_month_end_exclusive
      and (
        (
          p_household_id is null
          and t.household_id is null
          and t.created_by_user_id = p_user_id
        )
        or (
          p_household_id is not null
          and t.household_id = p_household_id
        )
      )
      and (
        p_currency is null
        or upper(coalesce(t.currency, '')) = upper(p_currency)
      )
  ),
  transfer_wallet_deltas as (
    select from_account_id as wallet_id, sum(-abs(amount_cents))::bigint as delta_cents
    from filtered_transfers
    where from_account_id is not null
    group by from_account_id
    union all
    select to_account_id as wallet_id, sum(abs(amount_cents))::bigint as delta_cents
    from filtered_transfers
    where to_account_id is not null
    group by to_account_id
  ),
  wallet_deltas as (
    select d.wallet_id, sum(d.delta_cents)::bigint as delta_cents
    from (
      select * from expense_wallet_deltas
      union all
      select * from transfer_wallet_deltas
    ) d
    where d.wallet_id is not null
    group by d.wallet_id
  ),
  totals as (
    select
      coalesce(
        sum(
          case
            when lower(coalesce(fe.type::text, 'expense')) = 'income' then abs(fe.amount_cents)
            else 0
          end
        ),
        0
      )::bigint as income_total_cents,
      coalesce(
        sum(
          case
            when lower(coalesce(fe.type::text, 'expense')) = 'income' then 0
            else abs(fe.amount_cents)
          end
        ),
        0
      )::bigint as spent_total_cents
    from filtered_expenses fe
  ),
  wallet_balances as (
    select
      ws.id as wallet_id,
      (ws.opening_balance_cents + coalesce(wd.delta_cents, 0))::bigint as balance_cents,
      ws.created_at
    from wallet_scope ws
    left join wallet_deltas wd
      on wd.wallet_id = ws.id
  )
  select jsonb_build_object(
    'month_start', v_month_start,
    'month_end_exclusive', v_month_end_exclusive,
    'income_total_cents', (select t.income_total_cents from totals t),
    'spent_total_cents', (select t.spent_total_cents from totals t),
    'net_worth_cents', coalesce((select sum(wb.balance_cents) from wallet_balances wb), 0),
    'wallet_balances', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'wallet_id', wb.wallet_id,
            'balance_cents', wb.balance_cents
          )
          order by wb.created_at asc, wb.wallet_id asc
        )
        from wallet_balances wb
      ),
      '[]'::jsonb
    )
  ) into v_payload;

  return coalesce(
    v_payload,
    jsonb_build_object(
      'month_start', v_month_start,
      'month_end_exclusive', v_month_end_exclusive,
      'income_total_cents', 0,
      'spent_total_cents', 0,
      'net_worth_cents', 0,
      'wallet_balances', '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.get_wallets_history_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_current_month_start date default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_month_start date := coalesce(p_current_month_start, date_trunc('month', now())::date);
  v_current_month_end_exclusive date := (coalesce(p_current_month_start, date_trunc('month', now())::date) + interval '1 month')::date;
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized wallets history access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household wallets history access'
      using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  wallet_scope as (
    select
      a.id,
      a.created_at,
      a.opening_balance_cents,
      a.is_default,
      a.is_system,
      lower(trim(coalesce(a.name, ''))) as normalized_name
    from public.accounts a
    where (
      (p_household_id is null and a.user_id = p_user_id and a.household_id is null)
      or (p_household_id is not null and a.household_id = p_household_id)
    )
      and a.is_archived = false
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
  filtered_expenses as (
    select
      e.account_id,
      e.date,
      e.amount_cents,
      e.type
    from public.expenses e
    where coalesce(e.is_recurring, false) = false
      and e.date < v_current_month_end_exclusive
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
  filtered_transfers as (
    select
      t.from_account_id,
      t.to_account_id,
      t.date,
      t.amount_cents
    from public.account_transfers t
    where t.date < v_current_month_end_exclusive
      and (
        (
          p_household_id is null
          and t.household_id is null
          and t.created_by_user_id = p_user_id
        )
        or (
          p_household_id is not null
          and t.household_id = p_household_id
        )
      )
      and (
        p_currency is null
        or upper(coalesce(t.currency, '')) = upper(p_currency)
      )
  ),
  earliest as (
    select coalesce(
      least(
        coalesce((select min(date_trunc('month', fe.date)::date) from filtered_expenses fe), v_current_month_start),
        coalesce((select min(date_trunc('month', ft.date)::date) from filtered_transfers ft), v_current_month_start)
      ),
      v_current_month_start
    ) as month_start
  ),
  months as (
    select generate_series(
      (select month_start from earliest),
      v_current_month_start,
      interval '1 month'
    )::date as month_start
  ),
  expense_month_deltas as (
    select
      coalesce(fe.account_id, (select wallet_id from legacy_wallet)) as wallet_id,
      date_trunc('month', fe.date)::date as month_start,
      sum(
        case
          when lower(coalesce(fe.type::text, 'expense')) = 'income'
            then abs(fe.amount_cents)
          else -abs(fe.amount_cents)
        end
      )::bigint as delta_cents
    from filtered_expenses fe
    group by 1, 2
  ),
  transfer_month_deltas as (
    select
      ft.from_account_id as wallet_id,
      date_trunc('month', ft.date)::date as month_start,
      sum(-abs(ft.amount_cents))::bigint as delta_cents
    from filtered_transfers ft
    where ft.from_account_id is not null
    group by 1, 2
    union all
    select
      ft.to_account_id as wallet_id,
      date_trunc('month', ft.date)::date as month_start,
      sum(abs(ft.amount_cents))::bigint as delta_cents
    from filtered_transfers ft
    where ft.to_account_id is not null
    group by 1, 2
  ),
  wallet_month_deltas as (
    select
      d.wallet_id,
      d.month_start,
      sum(d.delta_cents)::bigint as delta_cents
    from (
      select * from expense_month_deltas
      union all
      select * from transfer_month_deltas
    ) d
    where d.wallet_id is not null
    group by d.wallet_id, d.month_start
  ),
  wallet_month_balances as (
    select
      ws.id as wallet_id,
      m.month_start,
      (
        ws.opening_balance_cents +
        coalesce(
          sum(wmd.delta_cents) over (
            partition by ws.id
            order by m.month_start
            rows between unbounded preceding and current row
          ),
          0
        )
      )::bigint as balance_cents
    from wallet_scope ws
    cross join months m
    left join wallet_month_deltas wmd
      on wmd.wallet_id = ws.id
      and wmd.month_start = m.month_start
  ),
  net_worth_series as (
    select
      m.month_start,
      coalesce(sum(wmb.balance_cents), 0)::bigint as net_worth_cents
    from months m
    left join wallet_month_balances wmb
      on wmb.month_start = m.month_start
    group by m.month_start
    order by m.month_start asc
  )
  select jsonb_build_object(
    'available_months', coalesce(
      (
        select jsonb_agg(m.month_start order by m.month_start desc)
        from months m
      ),
      jsonb_build_array(v_current_month_start)
    ),
    'net_worth_series', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'month_start', n.month_start,
            'net_worth_cents', n.net_worth_cents
          )
          order by n.month_start asc
        )
        from net_worth_series n
      ),
      '[]'::jsonb
    )
  ) into v_payload;

  return coalesce(
    v_payload,
    jsonb_build_object(
      'available_months', jsonb_build_array(v_current_month_start),
      'net_worth_series', '[]'::jsonb
    )
  );
end;
$$;
