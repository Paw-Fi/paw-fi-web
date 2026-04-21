create or replace function public.make_clamped_calendar_date_v1(
  p_year integer,
  p_month integer,
  p_day integer
) returns date
language sql
immutable
set search_path = public
as $$
  select make_date(
    p_year,
    p_month,
    least(
      greatest(p_day, 1),
      extract(day from (make_date(p_year, p_month, 1) + interval '1 month - 1 day'))::integer
    )
  );
$$;

create or replace function public.build_projected_recurring_expense_id_v1(
  p_recurring_transaction_id text,
  p_occurrence_date date
) returns text
language sql
immutable
set search_path = public
as $$
  select 'recurring_' || coalesce(p_recurring_transaction_id, '') || '_' || to_char(p_occurrence_date, 'YYYYMMDD');
$$;

create or replace function public.project_recurring_occurrence_dates_v1(
  p_anchor_date date,
  p_frequency text,
  p_interval integer default 1,
  p_range_start date default null,
  p_range_end date default null,
  p_end_date date default null,
  p_excluded_dates date[] default '{}'::date[]
) returns setof date
language plpgsql
stable
set search_path = public
as $$
declare
  v_frequency text := lower(coalesce(nullif(trim(p_frequency), ''), 'monthly'));
  v_interval integer := greatest(coalesce(p_interval, 1), 1);
  v_effective_end date;
  v_current date;
  v_anchor_day integer;
begin
  if p_anchor_date is null or p_range_start is null or p_range_end is null then
    return;
  end if;

  v_effective_end := least(p_range_end, coalesce(p_end_date, p_range_end));
  if v_effective_end < p_range_start or p_anchor_date > v_effective_end then
    return;
  end if;

  if v_frequency = 'biweekly' then
    v_frequency := 'weekly';
    v_interval := 2;
  end if;

  v_anchor_day := extract(day from p_anchor_date)::integer;

  case v_frequency
    when 'daily' then
      v_current := p_anchor_date;
      while v_current <= v_effective_end loop
        if v_current >= p_range_start
           and not (v_current = any(coalesce(p_excluded_dates, '{}'::date[]))) then
          return next v_current;
        end if;
        v_current := v_current + v_interval;
      end loop;

    when 'weekly' then
      v_current := p_anchor_date;
      while v_current <= v_effective_end loop
        if v_current >= p_range_start
           and not (v_current = any(coalesce(p_excluded_dates, '{}'::date[]))) then
          return next v_current;
        end if;
        v_current := v_current + (v_interval * 7);
      end loop;

    when 'monthly' then
      v_current := p_anchor_date;
      while v_current < p_range_start loop
        v_current := public.make_clamped_calendar_date_v1(
          extract(year from (date_trunc('month', v_current) + make_interval(months => v_interval)))::integer,
          extract(month from (date_trunc('month', v_current) + make_interval(months => v_interval)))::integer,
          v_anchor_day
        );
      end loop;
      while v_current <= v_effective_end loop
        if not (v_current = any(coalesce(p_excluded_dates, '{}'::date[]))) then
          return next v_current;
        end if;
        v_current := public.make_clamped_calendar_date_v1(
          extract(year from (date_trunc('month', v_current) + make_interval(months => v_interval)))::integer,
          extract(month from (date_trunc('month', v_current) + make_interval(months => v_interval)))::integer,
          v_anchor_day
        );
      end loop;

    when 'yearly' then
      v_current := p_anchor_date;
      while v_current < p_range_start loop
        v_current := public.make_clamped_calendar_date_v1(
          extract(year from v_current)::integer + v_interval,
          extract(month from p_anchor_date)::integer,
          v_anchor_day
        );
      end loop;
      while v_current <= v_effective_end loop
        if not (v_current = any(coalesce(p_excluded_dates, '{}'::date[]))) then
          return next v_current;
        end if;
        v_current := public.make_clamped_calendar_date_v1(
          extract(year from v_current)::integer + v_interval,
          extract(month from p_anchor_date)::integer,
          v_anchor_day
        );
      end loop;

    else
      if p_anchor_date >= p_range_start
         and p_anchor_date <= v_effective_end
         and not (p_anchor_date = any(coalesce(p_excluded_dates, '{}'::date[]))) then
        return next p_anchor_date;
      end if;
  end case;
end;
$$;

create or replace function public.get_projected_scoped_recurring_expenses_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid default null,
  p_currency text default null,
  p_range_start date default null,
  p_range_end date default null
) returns table (
  id text,
  recurring_id uuid,
  date date,
  amount_cents bigint,
  currency text,
  category text,
  household_id uuid,
  user_id uuid,
  split_group_id uuid,
  raw_text text,
  created_at timestamptz,
  updated_at timestamptz,
  type text,
  is_recurring boolean,
  account_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  -- CRITICAL: this shared helper expands recurring rules by the requested
  -- calendar range for both pockets and wallets.
  -- STRICT REQUIREMENT: do not turn this back into a "future only from today"
  -- projection, or a recurring rule anchored earlier in the viewed month will
  -- disappear from that month's pockets/wallet details after a late create/edit.
  with recurring_scope as (
    select
      e.id as recurring_id,
      greatest(
        coalesce((e.recurrence_rule ->> 'anchor_date')::date, e.date),
        e.date
      ) as anchor_date,
      lower(coalesce(e.recurrence_rule ->> 'frequency', 'monthly')) as frequency,
      greatest(
        coalesce(nullif(e.recurrence_rule ->> 'interval', '')::integer, 1),
        1
      ) as interval_value,
      case
        when jsonb_typeof(e.recurrence_rule -> 'excluded_dates') = 'array' then
          array(
            select value::date
            from jsonb_array_elements_text(e.recurrence_rule -> 'excluded_dates') value
          )
        else '{}'::date[]
      end as excluded_dates,
      (e.recurrence_rule ->> 'end_date')::date as end_date,
      abs(e.amount_cents)::bigint as amount_cents,
      upper(coalesce(e.currency, '')) as currency,
      e.category,
      e.household_id,
      e.user_id,
      e.split_group_id,
      e.raw_text,
      e.created_at,
      e.updated_at,
      lower(coalesce(e.type::text, 'expense')) as type,
      e.account_id
    from public.expenses e
    where coalesce(e.is_recurring, false) = true
      and (
        (lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'personal'
          and e.user_id = p_user_id
          and e.household_id is null)
        or (lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'portfolio'
          and e.user_id = p_user_id
          and e.household_id = p_household_id)
        or (lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'household'
          and e.household_id = p_household_id)
      )
      and (
        p_currency is null
        or upper(coalesce(e.currency, '')) = upper(p_currency)
      )
  ),
  projected as (
    select
      public.build_projected_recurring_expense_id_v1(
        rs.recurring_id::text,
        occurrence_date
      ) as id,
      rs.recurring_id,
      occurrence_date as date,
      rs.amount_cents,
      rs.currency,
      rs.category,
      rs.household_id,
      rs.user_id,
      rs.split_group_id,
      rs.raw_text,
      rs.created_at,
      rs.updated_at,
      rs.type,
      false as is_recurring,
      rs.account_id
    from recurring_scope rs
    cross join lateral public.project_recurring_occurrence_dates_v1(
      p_anchor_date => rs.anchor_date,
      p_frequency => rs.frequency,
      p_interval => rs.interval_value,
      p_range_start => p_range_start,
      p_range_end => p_range_end,
      p_end_date => rs.end_date,
      p_excluded_dates => rs.excluded_dates
    ) occurrence_date
  )
  select
    p.id,
    p.recurring_id,
    p.date,
    p.amount_cents,
    p.currency,
    p.category,
    p.household_id,
    p.user_id,
    p.split_group_id,
    p.raw_text,
    p.created_at,
    p.updated_at,
    p.type,
    p.is_recurring,
    p.account_id
  from projected p
  where not exists (
    select 1
    from public.expenses actual
    where coalesce(actual.is_recurring, false) = false
      and actual.date = p.date
      and upper(coalesce(actual.currency, '')) = p.currency
      and lower(trim(coalesce(actual.category, ''))) =
          lower(trim(coalesce(p.category, '')))
      and abs(actual.amount_cents)::bigint = p.amount_cents
      and coalesce(actual.household_id::text, '') =
          coalesce(p.household_id::text, '')
      and coalesce(actual.user_id::text, '') = coalesce(p.user_id::text, '')
      and coalesce(actual.split_group_id::text, '') =
          coalesce(p.split_group_id::text, '')
      and lower(trim(coalesce(actual.raw_text, ''))) =
          lower(trim(coalesce(p.raw_text, '')))
      and lower(coalesce(actual.type::text, 'expense')) = p.type
  );
$$;

create or replace function public.get_pockets_month_v2(
  p_user_id uuid,
  p_scope text,
  p_period_month date,
  p_household_id uuid default null,
  p_currency text default null,
  p_include_projected_recurring boolean default true,
  p_allow_currency_fallback boolean default false
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_base_payload jsonb;
  v_payload jsonb;
  v_month_end date := (p_period_month + interval '1 month - 1 day')::date;
begin
  -- CRITICAL: keep this wrapper recurring-aware even if the legacy v1 payload
  -- still exists.
  -- STRICT REQUIREMENT: pockets must receive month-projected recurring spend
  -- in the same RPC path used for the main page, or users will report that
  -- recurring transactions are missing from pocket totals again.
  v_base_payload := public.get_pockets_month_v1(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_period_month => p_period_month,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_allow_currency_fallback => p_allow_currency_fallback
  );

  with actual_rows as (
    select value as row
    from jsonb_array_elements(coalesce(v_base_payload -> 'actual_expenses', '[]'::jsonb)) value
    where coalesce((value ->> 'is_recurring')::boolean, false) = false
  ),
  projected_rows as (
    select to_jsonb(p.*) as row
    from public.get_projected_scoped_recurring_expenses_v1(
      p_user_id => p_user_id,
      p_scope => v_scope,
      p_household_id => p_household_id,
      p_currency => coalesce(v_base_payload ->> 'selected_currency', p_currency),
      p_range_start => p_period_month,
      p_range_end => v_month_end
    ) p
    where p_include_projected_recurring = true
      and lower(coalesce(p.type, 'expense')) <> 'income'
  ),
  monthly_rows as (
    select row from actual_rows
    union all
    select row from projected_rows
  ),
  link_rows as (
    select
      nullif(value ->> 'envelope_id', '')::uuid as envelope_id,
      lower(trim(coalesce(value ->> 'category', ''))) as category
    from jsonb_array_elements(coalesce(v_base_payload -> 'category_links', '[]'::jsonb)) value
    where nullif(value ->> 'envelope_id', '') is not null
  ),
  linked_categories as (
    select distinct lr.category
    from link_rows lr
    where lr.category <> ''
  ),
  spent_by_envelope as (
    select
      lr.envelope_id,
      coalesce(sum((mr.row ->> 'amount_cents')::bigint), 0)::bigint as spent_cents
    from link_rows lr
    left join monthly_rows mr
      on lower(trim(coalesce(mr.row ->> 'category', 'uncategorized'))) = lr.category
    group by lr.envelope_id
  ),
  total_spend as (
    select coalesce(sum((row ->> 'amount_cents')::bigint), 0)::bigint as total_spend_cents
    from monthly_rows
  ),
  category_totals as (
    select
      lower(trim(coalesce(row ->> 'category', 'uncategorized'))) as category,
      coalesce(sum((row ->> 'amount_cents')::bigint), 0)::bigint as amount_cents
    from monthly_rows
    group by 1
  ),
  uncategorized_totals as (
    select ct.category, ct.amount_cents
    from category_totals ct
    where not exists (
      select 1
      from linked_categories lc
      where lc.category = ct.category
    )
  ),
  uncategorized_expenses as (
    select
      lower(trim(coalesce(mr.row ->> 'category', 'uncategorized'))) as category,
      jsonb_agg(
        mr.row
        order by
          (mr.row ->> 'date')::date desc,
          coalesce((mr.row ->> 'created_at')::timestamptz, 'epoch'::timestamptz) desc,
          mr.row ->> 'id' desc
      ) as expenses
    from monthly_rows mr
    where not exists (
      select 1
      from linked_categories lc
      where lc.category = lower(trim(coalesce(mr.row ->> 'category', 'uncategorized')))
    )
    group by 1
  ),
  actual_json as (
    select coalesce(
      jsonb_agg(
        row
        order by
          (row ->> 'date')::date asc,
          coalesce((row ->> 'created_at')::timestamptz, 'epoch'::timestamptz) asc,
          row ->> 'id' asc
      ),
      '[]'::jsonb
    ) as rows
    from actual_rows
  ),
  projected_json as (
    select coalesce(
      jsonb_agg(
        row
        order by
          (row ->> 'date')::date asc,
          coalesce((row ->> 'created_at')::timestamptz, 'epoch'::timestamptz) asc,
          row ->> 'id' asc
      ),
      '[]'::jsonb
    ) as rows
    from projected_rows
  )
  select v_base_payload || jsonb_build_object(
    'actual_expenses', (select rows from actual_json),
    'projected_recurring_expenses', (select rows from projected_json),
    'spent_by_envelope', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'envelope_id', s.envelope_id,
            'spent_cents', s.spent_cents
          )
          order by s.envelope_id
        )
        from spent_by_envelope s
      ),
      '[]'::jsonb
    ),
    'total_spend_cents', coalesce((select total_spend_cents from total_spend), 0),
    'uncategorized_totals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category', ut.category,
            'amount_cents', ut.amount_cents
          )
          order by ut.amount_cents desc, ut.category asc
        )
        from uncategorized_totals ut
      ),
      '[]'::jsonb
    ),
    'uncategorized_expenses', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category', ue.category,
            'expenses', ue.expenses
          )
          order by ue.category asc
        )
        from uncategorized_expenses ue
      ),
      '[]'::jsonb
    )
  ) into v_payload;

  return coalesce(v_payload, v_base_payload);
end;
$$;

create or replace function public.get_wallets_month_snapshot_v2(
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
  v_effective_end date := case
    when v_month_start = date_trunc('month', current_date)::date then current_date
    else (v_month_end_exclusive - interval '1 day')::date
  end;
  v_base_payload jsonb;
  v_payload jsonb;
begin
  -- CRITICAL: wallet month snapshots must add recurring month occurrences on
  -- top of posted wallet activity.
  -- STRICT REQUIREMENT: wallet balances and month totals are not correct if
  -- they only read non-recurring expense rows from v1.
  v_base_payload := public.get_wallets_month_snapshot_v1(
    p_user_id => p_user_id,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_month_start => p_month_start,
    p_include_archived => p_include_archived
  );

  with wallet_scope as (
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
  projected_rows as (
    select *
    from public.get_projected_scoped_recurring_expenses_v1(
      p_user_id => p_user_id,
      p_scope => case when p_household_id is null then 'personal' else 'household' end,
      p_household_id => p_household_id,
      p_currency => p_currency,
      p_range_start => date '2000-01-01',
      p_range_end => v_effective_end
    )
  ),
  projected_totals as (
    select
      coalesce(
        sum(case when lower(coalesce(type, 'expense')) = 'income' then amount_cents else 0 end),
        0
      )::bigint as income_total_cents,
      coalesce(
        sum(case when lower(coalesce(type, 'expense')) = 'income' then 0 else amount_cents end),
        0
      )::bigint as spent_total_cents
    from projected_rows
  ),
  projected_wallet_deltas as (
    select
      -- CRITICAL: preserve wallet ownership on projected recurring rows.
      -- STRICT REQUIREMENT: account_id must win when present so recurring
      -- occurrences land on the correct wallet; only legacy unassigned rows
      -- may fall back to the default wallet mapping.
      coalesce(pr.account_id, (select wallet_id from legacy_wallet)) as wallet_id,
      sum(
        case
          when lower(coalesce(pr.type, 'expense')) = 'income' then pr.amount_cents
          else -pr.amount_cents
        end
      )::bigint as delta_cents
    from projected_rows pr
    group by 1
  ),
  base_wallet_balances as (
    select
      nullif(value ->> 'wallet_id', '')::uuid as wallet_id,
      coalesce((value ->> 'balance_cents')::bigint, 0) as balance_cents
    from jsonb_array_elements(coalesce(v_base_payload -> 'wallet_balances', '[]'::jsonb)) value
  ),
  adjusted_wallet_balances as (
    select
      bw.wallet_id,
      (bw.balance_cents + coalesce(pwd.delta_cents, 0))::bigint as balance_cents
    from base_wallet_balances bw
    left join projected_wallet_deltas pwd
      on pwd.wallet_id = bw.wallet_id
  )
  select v_base_payload || jsonb_build_object(
    'income_total_cents',
      coalesce((v_base_payload ->> 'income_total_cents')::bigint, 0) +
      coalesce((select income_total_cents from projected_totals), 0),
    'spent_total_cents',
      coalesce((v_base_payload ->> 'spent_total_cents')::bigint, 0) +
      coalesce((select spent_total_cents from projected_totals), 0),
    'net_worth_cents',
      coalesce((select sum(balance_cents) from adjusted_wallet_balances), 0),
    'wallet_balances',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'wallet_id', awb.wallet_id,
              'balance_cents', awb.balance_cents
            )
            order by awb.wallet_id
          )
          from adjusted_wallet_balances awb
        ),
        '[]'::jsonb
      )
  ) into v_payload;

  return coalesce(v_payload, v_base_payload);
end;
$$;

create or replace function public.get_wallets_history_v2(
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
  v_base_payload jsonb;
  v_payload jsonb;
begin
  -- CRITICAL: wallet history must apply recurring deltas cumulatively across
  -- months, not just the current month snapshot.
  -- STRICT REQUIREMENT: if recurring month deltas are removed here, the main
  -- wallets page graph/history drifts away from wallet details and pockets.
  v_base_payload := public.get_wallets_history_v1(
    p_user_id => p_user_id,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_current_month_start => p_current_month_start
  );

  with base_series as (
    select
      (value ->> 'month_start')::date as month_start,
      coalesce((value ->> 'net_worth_cents')::bigint, 0) as net_worth_cents
    from jsonb_array_elements(coalesce(v_base_payload -> 'net_worth_series', '[]'::jsonb)) value
  ),
  projected_rows as (
    select *
    from public.get_projected_scoped_recurring_expenses_v1(
      p_user_id => p_user_id,
      p_scope => case when p_household_id is null then 'personal' else 'household' end,
      p_household_id => p_household_id,
      p_currency => p_currency,
      p_range_start => coalesce((select min(month_start) from base_series), v_current_month_start),
      p_range_end => current_date
    )
  ),
  projected_month_deltas as (
    select
      date_trunc('month', pr.date)::date as month_start,
      sum(
        case
          when lower(coalesce(pr.type, 'expense')) = 'income' then pr.amount_cents
          else -pr.amount_cents
        end
      )::bigint as delta_cents
    from projected_rows pr
    group by 1
  ),
  series_with_delta as (
    select
      bs.month_start,
      bs.net_worth_cents,
      coalesce(pmd.delta_cents, 0)::bigint as projected_delta_cents
    from base_series bs
    left join projected_month_deltas pmd
      on pmd.month_start = bs.month_start
  ),
  adjusted_series as (
    select
      swd.month_start,
      (
        swd.net_worth_cents +
        sum(swd.projected_delta_cents) over (
          order by swd.month_start
          rows between unbounded preceding and current row
        )
      )::bigint as net_worth_cents
    from series_with_delta swd
  )
  select v_base_payload || jsonb_build_object(
    'net_worth_series',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'month_start', aser.month_start,
              'net_worth_cents', aser.net_worth_cents
            )
            order by aser.month_start asc
          )
          from adjusted_series aser
        ),
        '[]'::jsonb
      )
  ) into v_payload;

  return coalesce(v_payload, v_base_payload);
end;
$$;
