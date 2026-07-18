set lock_timeout = '5s';
set statement_timeout = '10min';

-- Keep recognized transfer, debt, fee, and cash schedules visible in the
-- recurring list without projecting them into spending or wallet math.
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
  with recurring_scope as (
    select
      e.id as recurring_id,
      greatest(
        coalesce(nullif(e.recurrence_rule ->> 'anchor_date', '')::date, e.date),
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
      nullif(e.recurrence_rule ->> 'end_date', '')::date as end_date,
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
      and e.deleted_at is null
      and e.provider is null
      and e.bank_account_id is null
      and lower(coalesce(e.recurrence_rule ->> 'projection_enabled', 'true')) <> 'false'
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
      and actual.deleted_at is null
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
