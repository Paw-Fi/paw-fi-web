create unique index if not exists idx_expenses_bank_recurring_template_idempotency
  on public.expenses (
    user_id,
    coalesce(household_id, '00000000-0000-0000-0000-000000000000'::uuid),
    idempotency_key
  )
  where idempotency_key like 'bank-recurring:v1:%'
    and deleted_at is null;

with source_rows as (
  select
    e.*,
    lower(coalesce(e.provider, '')) as provider_key,
    lower(coalesce(e.type::text, 'expense')) as type_key,
    upper(coalesce(e.currency, '')) as currency_key,
    lower(coalesce(e.recurrence_rule ->> 'frequency', 'monthly')) as frequency_key,
    greatest(coalesce(nullif(e.recurrence_rule ->> 'interval', '')::integer, 1), 1) as interval_value,
    coalesce(nullif(e.recurrence_rule ->> 'anchor_date', '')::date, e.date) as anchor_date,
    coalesce(
      nullif(trim(e.recurrence_rule #>> '{provider_hint,plaid_stream_id}'), ''),
      nullif(
        trim(
          regexp_replace(
            regexp_replace(
              regexp_replace(lower(coalesce(e.merchant, e.raw_text, '')), '[^a-z0-9 ]+', ' ', 'g'),
              '\m[0-9]{2,}\M',
              ' ',
              'g'
            ),
            '\s+',
            ' ',
            'g'
          )
        ),
        ''
      )
    ) as template_identity
  from public.expenses e
  where e.provider is not null
    and e.bank_account_id is not null
    and coalesce(e.is_recurring, false) = true
    and e.recurrence_rule is not null
), template_candidates as (
  select
    'bank-recurring:v1:' || concat_ws(
      ':',
      provider_key,
      bank_account_id::text,
      type_key,
      currency_key,
      frequency_key,
      interval_value::text,
      lower(coalesce(category, 'uncategorized')),
      template_identity
    ) as idempotency_key,
    user_id,
    household_id,
    bank_account_id,
    (array_agg(account_id order by (account_id is not null) desc, date desc, created_at desc))[1] as account_id,
    (array_agg(abs(amount_cents) order by date desc, created_at desc))[1] as amount_cents,
    (array_agg(currency_key order by date desc, created_at desc))[1] as currency,
    min(anchor_date)::date as start_date,
    (array_agg(type_key order by date desc, created_at desc))[1] as type,
    (array_agg(category order by date desc, created_at desc))[1] as category,
    (array_agg(raw_text order by date desc, created_at desc))[1] as raw_text,
    (array_agg(merchant order by date desc, created_at desc))[1] as merchant,
    frequency_key,
    interval_value,
    (array_agg(recurrence_rule order by date desc, created_at desc))[1] as recurrence_rule,
    provider_key,
    template_identity,
    (array_agg(provider_transaction_id order by date desc, created_at desc))[1] as provider_transaction_id
  from source_rows
  where template_identity is not null
    and length(template_identity) >= 3
  group by
    provider_key,
    bank_account_id,
    user_id,
    household_id,
    type_key,
    currency_key,
    frequency_key,
    interval_value,
    lower(coalesce(category, 'uncategorized')),
    template_identity
), updated_templates as (
  update public.expenses target
  set
    account_id = coalesce(candidate.account_id, target.account_id),
    amount_cents = candidate.amount_cents,
    currency = candidate.currency,
    category = candidate.category,
    date = least(target.date, candidate.start_date),
    raw_text = candidate.raw_text,
    merchant = candidate.merchant,
    source = coalesce(candidate.merchant, candidate.raw_text),
    type = candidate.type::public.transaction_type,
    is_recurring = true,
    recurrence_rule = coalesce(candidate.recurrence_rule, '{}'::jsonb)
      || jsonb_build_object(
        'frequency', candidate.frequency_key,
        'anchor_date', least(target.date, candidate.start_date)::text
      )
      || case
        when candidate.interval_value > 1 then jsonb_build_object('interval', candidate.interval_value)
        else '{}'::jsonb
      end,
    provider_fields = coalesce(target.provider_fields, '{}'::jsonb) || jsonb_build_object(
      'source', 'plaid_recurring_template',
      'provider', candidate.provider_key,
      'bank_account_id', candidate.bank_account_id,
      'account_id', candidate.account_id,
      'provider_transaction_id', candidate.provider_transaction_id,
      'template_identity', candidate.template_identity,
      'template_key', candidate.idempotency_key
    ),
    updated_at = now()
  from template_candidates candidate
  where target.user_id = candidate.user_id
    and target.idempotency_key = candidate.idempotency_key
    and coalesce(target.household_id::text, '') = coalesce(candidate.household_id::text, '')
  returning target.idempotency_key
)
insert into public.expenses (
  user_id,
  household_id,
  account_id,
  amount_cents,
  currency,
  category,
  date,
  raw_text,
  merchant,
  source,
  type,
  is_recurring,
  recurrence_rule,
  idempotency_key,
  provider_fields,
  created_at,
  updated_at
)
select
  candidate.user_id,
  candidate.household_id,
  candidate.account_id,
  candidate.amount_cents,
  candidate.currency,
  candidate.category,
  candidate.start_date,
  candidate.raw_text,
  candidate.merchant,
  coalesce(candidate.merchant, candidate.raw_text),
  candidate.type::public.transaction_type,
  true,
  coalesce(candidate.recurrence_rule, '{}'::jsonb)
    || jsonb_build_object(
      'frequency', candidate.frequency_key,
      'anchor_date', candidate.start_date::text
    )
    || case
      when candidate.interval_value > 1 then jsonb_build_object('interval', candidate.interval_value)
      else '{}'::jsonb
    end,
  candidate.idempotency_key,
  jsonb_build_object(
    'source', 'plaid_recurring_template',
    'provider', candidate.provider_key,
    'bank_account_id', candidate.bank_account_id,
    'account_id', candidate.account_id,
    'provider_transaction_id', candidate.provider_transaction_id,
    'template_identity', candidate.template_identity,
    'template_key', candidate.idempotency_key
  ),
  now(),
  now()
from template_candidates candidate
where not exists (
  select 1
  from public.expenses existing
  where existing.user_id = candidate.user_id
    and existing.idempotency_key = candidate.idempotency_key
    and coalesce(existing.household_id::text, '') = coalesce(candidate.household_id::text, '')
);

update public.expenses
set
  provider_fields = coalesce(provider_fields, '{}'::jsonb) || jsonb_build_object(
    'bank_recurring_detection', jsonb_build_object(
      'was_recurring', coalesce(is_recurring, false),
      'recurrence_rule', recurrence_rule
    )
  ),
  is_recurring = false,
  recurrence_rule = null,
  updated_at = now()
where provider is not null
  and bank_account_id is not null
  and coalesce(is_recurring, false) = true;

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
