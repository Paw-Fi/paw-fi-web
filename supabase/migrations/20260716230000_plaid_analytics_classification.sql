alter table public.expenses
  add column if not exists provider_pfc_primary text,
  add column if not exists provider_pfc_detailed text,
  add column if not exists provider_pfc_confidence text,
  add column if not exists provider_pfc_version text,
  add column if not exists provider_transaction_code text,
  add column if not exists provider_pending boolean,
  add column if not exists analytics_class text,
  add column if not exists analytics_direction text,
  add column if not exists analytics_is_final boolean,
  add column if not exists analytics_spending_multiplier smallint,
  add column if not exists analytics_counts_toward_income boolean,
  add column if not exists classification_source text,
  add column if not exists classification_version integer;

alter table public.bank_accounts
  add column if not exists provider_persistent_account_id text,
  add column if not exists provider_balance_current_cents bigint,
  add column if not exists provider_balance_available_cents bigint,
  add column if not exists provider_balance_limit_cents bigint,
  add column if not exists provider_balance_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bank_accounts_user_provider_persistent_unique'
  ) then
    alter table public.bank_accounts
      add constraint bank_accounts_user_provider_persistent_unique
      unique (user_id, provider, provider_persistent_account_id);
  end if;
end $$;

update public.expenses
set is_recurring = false,
    recurrence_rule = null,
    updated_at = now()
where provider = 'plaid'
  and coalesce(is_recurring, false)
  and not (coalesce(user_overrides, '{}'::jsonb) ? 'is_recurring');

update public.expenses
set deleted_at = coalesce(deleted_at, now()),
    deleted_reason = coalesce(deleted_reason, 'provider_inference_retired'),
    updated_at = now()
where coalesce(is_recurring, false)
  and provider_fields ->> 'source' = 'plaid_recurring_template'
  and deleted_at is null;

create or replace function public.classify_plaid_transaction_v1(
  p_amount numeric,
  p_pending boolean,
  p_pfc_primary text,
  p_transaction_code text,
  p_account_type text
) returns table (
  analytics_class text,
  analytics_direction text,
  analytics_is_final boolean,
  analytics_spending_multiplier smallint,
  analytics_counts_toward_income boolean
)
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select
      coalesce(p_amount, 0) as amount,
      coalesce(p_pending, false) as pending,
      upper(trim(coalesce(p_pfc_primary, ''))) as pfc_primary,
      lower(trim(coalesce(p_transaction_code, ''))) as transaction_code,
      lower(trim(coalesce(p_account_type, ''))) as account_type
  ), classified as (
    select
      case
        when amount = 0 then 'unknown'
        when transaction_code in ('atm', 'cash', 'cash advance', 'cashback') then 'cash_movement'
        when transaction_code = 'transfer' and amount < 0 then 'transfer_in'
        when transaction_code = 'transfer' then 'transfer_out'
        when transaction_code = 'refund' and amount < 0 then 'refund_or_reversal'
        when transaction_code = 'refund' then 'unknown'
        when transaction_code in ('bank charge', 'late fee', 'membership fee', 'returned item fee') then 'bank_fee'
        when transaction_code = 'adjustment' and amount < 0 then 'refund_or_reversal'
        when transaction_code = 'adjustment' then 'unknown'
        when transaction_code = 'purchase'
          and pfc_primary in ('INCOME', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS', 'LOAN_DISBURSEMENTS', 'BANK_FEES')
          then 'unknown'
        when transaction_code = 'purchase' and amount < 0 then 'refund_or_reversal'
        when transaction_code = 'purchase' and account_type in ('credit', 'depository') then 'consumer_spend'
        when transaction_code = 'purchase' then 'unknown'
        when pfc_primary = '' then 'unknown'
        when pfc_primary = 'INCOME' and amount < 0 then 'income'
        when pfc_primary = 'INCOME' then 'unknown'
        when pfc_primary = 'TRANSFER_IN' and amount < 0 then 'transfer_in'
        when pfc_primary = 'TRANSFER_IN' then 'unknown'
        when pfc_primary = 'TRANSFER_OUT' and amount > 0 then 'transfer_out'
        when pfc_primary = 'TRANSFER_OUT' then 'unknown'
        when pfc_primary = 'LOAN_PAYMENTS' then 'debt_payment'
        when pfc_primary = 'LOAN_DISBURSEMENTS' and amount < 0 then 'loan_disbursement'
        when pfc_primary = 'LOAN_DISBURSEMENTS' then 'unknown'
        when pfc_primary = 'BANK_FEES' then 'bank_fee'
        when pfc_primary = 'OTHER' then 'unknown'
        when transaction_code in ('bill payment', 'cheque', 'payment', 'standing order') then 'unknown'
        when amount < 0 then 'refund_or_reversal'
        when account_type in ('credit', 'depository') then 'consumer_spend'
        else 'unknown'
      end as class,
      case when amount > 0 then 'out' when amount < 0 then 'in' else 'none' end as direction,
      not pending as is_final
    from normalized
  )
  select
    class,
    direction,
    is_final,
    case
      when not is_final then 0
      when class = 'consumer_spend' then 1
      when class = 'refund_or_reversal' then -1
      else 0
    end::smallint,
    (is_final and class = 'income')
  from classified;
$$;

update public.expenses e
set
  provider_pfc_primary = upper(nullif(trim(e.raw_provider_payload #>> '{personal_finance_category,primary}'), '')),
  provider_pfc_detailed = upper(nullif(trim(e.raw_provider_payload #>> '{personal_finance_category,detailed}'), '')),
  provider_pfc_confidence = upper(nullif(trim(e.raw_provider_payload #>> '{personal_finance_category,confidence_level}'), '')),
  provider_pfc_version = lower(coalesce(nullif(trim(e.raw_provider_payload #>> '{personal_finance_category,version}'), ''), 'v1')),
  provider_transaction_code = lower(nullif(trim(e.raw_provider_payload ->> 'transaction_code'), '')),
  provider_pending = case
    when jsonb_typeof(e.raw_provider_payload -> 'pending') = 'boolean'
      then (e.raw_provider_payload ->> 'pending')::boolean
    else false
  end,
  analytics_class = classification.analytics_class,
  analytics_direction = classification.analytics_direction,
  analytics_is_final = classification.analytics_is_final,
  analytics_spending_multiplier = classification.analytics_spending_multiplier,
  analytics_counts_toward_income = classification.analytics_counts_toward_income,
  classification_source = 'plaid_pfc_' || lower(coalesce(nullif(trim(e.raw_provider_payload #>> '{personal_finance_category,version}'), ''), 'v1')),
  classification_version = 2
from public.bank_accounts ba
cross join lateral public.classify_plaid_transaction_v1(
  case
    when jsonb_typeof(e.raw_provider_payload -> 'amount') = 'number'
      then (e.raw_provider_payload ->> 'amount')::numeric
    when lower(coalesce(e.type::text, 'expense')) = 'income'
      then -(abs(e.amount_cents)::numeric / 100.0)
    else abs(e.amount_cents)::numeric / 100.0
  end,
  case
    when jsonb_typeof(e.raw_provider_payload -> 'pending') = 'boolean'
      then (e.raw_provider_payload ->> 'pending')::boolean
    else false
  end,
  e.raw_provider_payload #>> '{personal_finance_category,primary}',
  e.raw_provider_payload ->> 'transaction_code',
  ba.type
) classification
where e.provider = 'plaid'
  and ba.id = e.bank_account_id
  and coalesce(e.classification_source, '') <> 'user_override';

update public.expenses e
set analytics_class = 'unknown',
    analytics_direction = 'none',
    analytics_is_final = not coalesce(e.provider_pending, false),
    analytics_spending_multiplier = 0,
    analytics_counts_toward_income = false,
    classification_source = 'plaid_low_confidence',
    classification_version = 2
where e.provider = 'plaid'
  and coalesce(e.classification_source, '') <> 'user_override'
  and upper(coalesce(e.provider_pfc_confidence, '')) not in ('HIGH', 'VERY_HIGH')
  and coalesce(e.provider_transaction_code, '') not in (
    'atm', 'cash', 'cash advance', 'cashback', 'transfer', 'refund',
    'bank charge', 'late fee', 'membership fee', 'returned item fee',
    'adjustment', 'purchase'
  );

update public.expenses e
set analytics_class = 'unknown',
    analytics_direction = 'none',
    analytics_is_final = not coalesce(e.provider_pending, false),
    analytics_spending_multiplier = 0,
    analytics_counts_toward_income = false,
    classification_source = 'plaid_counterparty_review',
    classification_version = 2
where e.provider = 'plaid'
  and coalesce(e.classification_source, '') <> 'user_override'
  and coalesce(e.provider_transaction_code, '') not in (
    'atm', 'cash', 'cash advance', 'cashback', 'transfer', 'refund',
    'bank charge', 'late fee', 'membership fee', 'returned item fee',
    'adjustment', 'purchase'
  )
  and coalesce(e.provider_pfc_primary, '') not in (
    'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS',
    'LOAN_DISBURSEMENTS', 'BANK_FEES'
  )
  and e.raw_provider_payload @? '$.counterparties[*] ? (@.type == "financial_institution" || @.type == "payment_app")';

update public.expenses e
set analytics_class = 'unknown',
    analytics_direction = 'none',
    analytics_is_final = not coalesce(e.provider_pending, false),
    analytics_spending_multiplier = 0,
    analytics_counts_toward_income = false,
    classification_source = 'plaid_ambiguous_depository',
    classification_version = 2
from public.bank_accounts ba
where e.provider = 'plaid'
  and ba.id = e.bank_account_id
  and lower(coalesce(ba.type, '')) = 'depository'
  and coalesce(e.classification_source, '') <> 'user_override'
  and coalesce(e.provider_transaction_code, '') = ''
  and coalesce(e.provider_pfc_primary, '') not in (
    'INCOME', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS',
    'LOAN_DISBURSEMENTS', 'BANK_FEES'
  )
  and nullif(trim(e.raw_provider_payload ->> 'merchant_name'), '') is null
  and not e.raw_provider_payload @? '$.counterparties[*] ? (@.type == "merchant")';

update public.expenses e
set
  provider_pending = coalesce(e.provider_pending, false),
  analytics_class = case
    when lower(coalesce(e.type::text, 'expense')) = 'income' then 'income'
    else 'consumer_spend'
  end,
  analytics_direction = case
    when lower(coalesce(e.type::text, 'expense')) = 'income' then 'in'
    else 'out'
  end,
  analytics_is_final = true,
  analytics_spending_multiplier = case
    when lower(coalesce(e.type::text, 'expense')) = 'income' then 0
    else 1
  end,
  analytics_counts_toward_income = lower(coalesce(e.type::text, 'expense')) = 'income',
  classification_source = case
    when coalesce(e.classification_source, '') = 'user_override' then 'user_override'
    else 'manual'
  end,
  classification_version = coalesce(e.classification_version, 2)
where e.provider is distinct from 'plaid';

update public.expenses e
set
  provider_pending = coalesce(e.provider_pending, false),
  analytics_class = coalesce(e.analytics_class, 'unknown'),
  analytics_direction = coalesce(e.analytics_direction, 'none'),
  analytics_is_final = coalesce(e.analytics_is_final, false),
  analytics_spending_multiplier = coalesce(e.analytics_spending_multiplier, 0),
  analytics_counts_toward_income = coalesce(e.analytics_counts_toward_income, false),
  classification_source = coalesce(e.classification_source, 'plaid_pfc_' || coalesce(e.provider_pfc_version, 'v1')),
  classification_version = coalesce(e.classification_version, 2)
where e.analytics_class is null
   or e.analytics_direction is null
   or e.analytics_is_final is null
   or e.analytics_spending_multiplier is null
   or e.analytics_counts_toward_income is null
   or e.classification_source is null
   or e.classification_version is null;

alter table public.expenses
  alter column provider_pending set default false,
  alter column provider_pending set not null,
  alter column analytics_class set default 'consumer_spend',
  alter column analytics_class set not null,
  alter column analytics_direction set default 'out',
  alter column analytics_direction set not null,
  alter column analytics_is_final set default true,
  alter column analytics_is_final set not null,
  alter column analytics_spending_multiplier set default 1,
  alter column analytics_spending_multiplier set not null,
  alter column analytics_counts_toward_income set default false,
  alter column analytics_counts_toward_income set not null,
  alter column classification_source set default 'manual',
  alter column classification_source set not null,
  alter column classification_version set default 2,
  alter column classification_version set not null;

alter table public.expenses
  drop constraint if exists expenses_analytics_class_check,
  add constraint expenses_analytics_class_check check (
    analytics_class in (
      'consumer_spend', 'income', 'transfer_in', 'transfer_out',
      'debt_payment', 'loan_disbursement', 'refund_or_reversal', 'bank_fee',
      'cash_movement', 'unknown'
    )
  ),
  drop constraint if exists expenses_analytics_direction_check,
  add constraint expenses_analytics_direction_check check (
    analytics_direction in ('in', 'out', 'none')
  ),
  drop constraint if exists expenses_analytics_spending_multiplier_check,
  add constraint expenses_analytics_spending_multiplier_check check (
    analytics_spending_multiplier in (-1, 0, 1)
  );

create or replace function public.set_expense_analytics_classification_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_account_type text;
  v_amount numeric;
  v_classification record;
begin
  if new.provider = 'plaid' then
    select ba.type into v_account_type
    from public.bank_accounts ba
    where ba.id = new.bank_account_id;

    v_amount := case
      when jsonb_typeof(new.raw_provider_payload -> 'amount') = 'number'
        then (new.raw_provider_payload ->> 'amount')::numeric
      when lower(coalesce(new.type::text, 'expense')) = 'income'
        then -(abs(new.amount_cents)::numeric / 100.0)
      else abs(new.amount_cents)::numeric / 100.0
    end;

    new.provider_pfc_primary := upper(nullif(trim(new.raw_provider_payload #>> '{personal_finance_category,primary}'), ''));
    new.provider_pfc_detailed := upper(nullif(trim(new.raw_provider_payload #>> '{personal_finance_category,detailed}'), ''));
    new.provider_pfc_confidence := upper(nullif(trim(new.raw_provider_payload #>> '{personal_finance_category,confidence_level}'), ''));
    new.provider_pfc_version := lower(coalesce(nullif(trim(new.raw_provider_payload #>> '{personal_finance_category,version}'), ''), 'v2'));
    new.provider_transaction_code := lower(nullif(trim(new.raw_provider_payload ->> 'transaction_code'), ''));
    new.provider_pending := case
      when jsonb_typeof(new.raw_provider_payload -> 'pending') = 'boolean'
        then (new.raw_provider_payload ->> 'pending')::boolean
      else false
    end;
  else
    new.provider_pending := false;
  end if;

  if new.classification_source = 'user_override' then
    if new.analytics_class not in (
      'consumer_spend', 'income', 'transfer_in', 'transfer_out',
      'debt_payment', 'loan_disbursement', 'refund_or_reversal',
      'bank_fee', 'cash_movement', 'unknown'
    ) then
      raise exception 'Invalid transaction analytics class' using errcode = '22023';
    end if;

    new.analytics_direction := case
      when new.analytics_class in ('income', 'transfer_in', 'loan_disbursement', 'refund_or_reversal') then 'in'
      when new.analytics_class in ('consumer_spend', 'transfer_out', 'debt_payment', 'bank_fee', 'cash_movement') then 'out'
      else 'none'
    end;
    new.analytics_is_final := not new.provider_pending;
    new.analytics_spending_multiplier := case
      when new.provider_pending then 0
      when new.analytics_class = 'consumer_spend' then 1
      when new.analytics_class = 'refund_or_reversal' then -1
      else 0
    end;
    new.analytics_counts_toward_income := not new.provider_pending and new.analytics_class = 'income';
    new.classification_version := 2;
    return new;
  end if;

  if new.provider = 'plaid' then

    select * into v_classification
    from public.classify_plaid_transaction_v1(
      v_amount,
      new.provider_pending,
      new.provider_pfc_primary,
      new.provider_transaction_code,
      v_account_type
    );

    if coalesce(new.provider_transaction_code, '') not in (
        'atm', 'cash', 'cash advance', 'cashback', 'transfer', 'refund',
        'bank charge', 'late fee', 'membership fee', 'returned item fee',
        'adjustment', 'purchase'
      )
      and coalesce(new.provider_pfc_primary, '') not in (
        'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS',
        'LOAN_DISBURSEMENTS', 'BANK_FEES'
      )
      and new.raw_provider_payload @? '$.counterparties[*] ? (@.type == "financial_institution" || @.type == "payment_app")' then
      new.analytics_class := 'unknown';
      new.analytics_direction := 'none';
      new.analytics_is_final := not new.provider_pending;
      new.analytics_spending_multiplier := 0;
      new.analytics_counts_toward_income := false;
      new.classification_source := 'plaid_counterparty_review';
      new.classification_version := 2;
      return new;
    end if;

    if lower(coalesce(v_account_type, '')) = 'depository'
      and coalesce(new.provider_transaction_code, '') = ''
      and coalesce(new.provider_pfc_primary, '') not in (
        'INCOME', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS',
        'LOAN_DISBURSEMENTS', 'BANK_FEES'
      )
      and nullif(trim(new.raw_provider_payload ->> 'merchant_name'), '') is null
      and not new.raw_provider_payload @? '$.counterparties[*] ? (@.type == "merchant")' then
      new.analytics_class := 'unknown';
      new.analytics_direction := 'none';
      new.analytics_is_final := not new.provider_pending;
      new.analytics_spending_multiplier := 0;
      new.analytics_counts_toward_income := false;
      new.classification_source := 'plaid_ambiguous_depository';
      new.classification_version := 2;
      return new;
    end if;

    if upper(coalesce(new.provider_pfc_confidence, '')) not in ('HIGH', 'VERY_HIGH')
      and coalesce(new.provider_transaction_code, '') not in (
        'atm', 'cash', 'cash advance', 'cashback', 'transfer', 'refund',
        'bank charge', 'late fee', 'membership fee', 'returned item fee',
        'adjustment', 'purchase'
      ) then
      new.analytics_class := 'unknown';
      new.analytics_direction := 'none';
      new.analytics_is_final := not new.provider_pending;
      new.analytics_spending_multiplier := 0;
      new.analytics_counts_toward_income := false;
      new.classification_source := 'plaid_low_confidence';
      new.classification_version := 2;
      return new;
    end if;

    new.analytics_class := v_classification.analytics_class;
    new.analytics_direction := v_classification.analytics_direction;
    new.analytics_is_final := v_classification.analytics_is_final;
    new.analytics_spending_multiplier := v_classification.analytics_spending_multiplier;
    new.analytics_counts_toward_income := v_classification.analytics_counts_toward_income;
    new.classification_source := case
      when coalesce(new.provider_transaction_code, '') in (
        'atm', 'cash', 'cash advance', 'cashback', 'transfer', 'refund',
        'bank charge', 'late fee', 'membership fee', 'returned item fee',
        'adjustment', 'purchase'
      ) then 'plaid_transaction_code'
      else 'plaid_pfc_' || coalesce(new.provider_pfc_version, 'v2')
    end;
    new.classification_version := 2;
    return new;
  end if;

  new.analytics_is_final := true;
  new.classification_source := 'manual';
  new.classification_version := 2;
  if lower(coalesce(new.type::text, 'expense')) = 'income' then
    new.analytics_class := 'income';
    new.analytics_direction := 'in';
    new.analytics_spending_multiplier := 0;
    new.analytics_counts_toward_income := true;
  else
    new.analytics_class := 'consumer_spend';
    new.analytics_direction := 'out';
    new.analytics_spending_multiplier := 1;
    new.analytics_counts_toward_income := false;
  end if;
  return new;
end;
$$;

drop trigger if exists set_expense_analytics_classification_v1 on public.expenses;
create trigger set_expense_analytics_classification_v1
before insert or update of
  provider,
  bank_account_id,
  raw_provider_payload,
  amount_cents,
  type,
  classification_source,
  analytics_class,
  analytics_direction,
  analytics_is_final,
  analytics_spending_multiplier,
  analytics_counts_toward_income
on public.expenses
for each row execute function public.set_expense_analytics_classification_v1();

create index if not exists expenses_active_analytics_feed_idx
  on public.expenses (
    user_id,
    analytics_class,
    analytics_is_final,
    date desc
  )
  where deleted_at is null and coalesce(is_recurring, false) = false;

create or replace function public.get_user_transactions_page_v2(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_currencies text[] default null,
  p_category text default null,
  p_account_id uuid default null,
  p_include_unassigned_account boolean default false,
  p_categories text[] default null,
  p_type text default 'all',
  p_search_query text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_page_size integer default 60,
  p_cursor_date date default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 60), 200));
  v_currencies text[];
  v_categories text[];
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction page access' using errcode = '42501';
  end if;
  if p_household_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household transaction page access' using errcode = '42501';
  end if;

  v_currencies := nullif(array(
    select distinct upper(trim(value))
    from unnest(coalesce(p_currencies, '{}'::text[])) value
    where trim(value) <> ''
  ), '{}'::text[]);
  if v_currencies is null and nullif(trim(coalesce(p_currency, '')), '') is not null then
    v_currencies := array[upper(trim(p_currency))];
  end if;
  v_categories := nullif(array(
    select distinct lower(trim(value))
    from unnest(coalesce(p_categories, '{}'::text[])) value
    where trim(value) <> ''
  ), '{}'::text[]);

  with contact_ids as (
    select uc.id from public.user_contacts uc where uc.user_id = p_user_id
  ), expense_items as (
    select
      e.id::text as id, e.contact_id, e.user_id, e.household_id, e.date,
      e.amount_cents, e.currency,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.category end as category,
      e.created_at, e.updated_at,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.raw_text end as raw_text,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.merchant end as merchant,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.breakdown end as breakdown,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.receipt_image_url end as receipt_image_url,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.split_group_id end as split_group_id,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.account_id end as account_id,
      lower(coalesce(e.type::text, 'expense')) as type,
      e.is_recurring, e.analytics_class, e.analytics_is_final,
      e.analytics_spending_multiplier, e.analytics_counts_toward_income
    from public.expenses e
    where e.deleted_at is null
      and coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null and e.household_id is null
          and (e.user_id = p_user_id or exists (
            select 1 from contact_ids c where c.id = e.contact_id
          ))
        )
        or (p_household_id is not null and e.household_id = p_household_id)
      )
      and not (
        p_household_id is not null
        and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only'
      )
      and (v_currencies is null or upper(coalesce(e.currency, '')) = any(v_currencies))
      and (p_account_id is null or e.account_id = p_account_id or (
        p_include_unassigned_account and e.account_id is null
      ))
  ), transfer_items as (
    select
      ('transfer:' || t.id::text || ':' || case when t.to_account_id = p_account_id then 'in' else 'out' end) as id,
      null::uuid as contact_id, t.created_by_user_id as user_id,
      t.household_id, t.date, abs(t.amount_cents)::bigint as amount_cents,
      t.currency, 'transfers'::text as category, t.created_at, t.updated_at,
      coalesce(nullif(trim(t.note), ''), case
        when t.to_account_id = p_account_id then 'Transfer in' else 'Transfer out'
      end) as raw_text,
      null::text as merchant, null::jsonb as breakdown,
      null::text as receipt_image_url, null::uuid as split_group_id,
      case when t.to_account_id = p_account_id then t.to_account_id else t.from_account_id end as account_id,
      case when t.to_account_id = p_account_id then 'income' else 'expense' end as type,
      false as is_recurring,
      case when t.to_account_id = p_account_id then 'transfer_in' else 'transfer_out' end as analytics_class,
      true as analytics_is_final, 0::smallint as analytics_spending_multiplier,
      false as analytics_counts_toward_income
    from public.account_transfers t
    where p_account_id is not null
      and (t.from_account_id = p_account_id or t.to_account_id = p_account_id)
      and (
        (p_household_id is null and t.household_id is null and t.created_by_user_id = p_user_id)
        or (p_household_id is not null and t.household_id = p_household_id)
      )
      and (v_currencies is null or upper(coalesce(t.currency, '')) = any(v_currencies))
  ), combined_items as (
    select * from expense_items
    union all
    select * from transfer_items
  ), filtered_items as (
    select * from combined_items i
    where (p_category is null or lower(coalesce(i.category, 'uncategorized')) = lower(p_category))
      and (v_categories is null or lower(coalesce(i.category, 'uncategorized')) = any(v_categories))
      and (
        coalesce(lower(p_type), 'all') = 'all'
        or (lower(p_type) = 'expense' and i.analytics_spending_multiplier <> 0)
        or (lower(p_type) = 'income' and i.analytics_counts_toward_income)
      )
      and (p_start_date is null or i.date >= p_start_date)
      and (p_end_date is null or i.date <= p_end_date)
      and (
        coalesce(trim(p_search_query), '') = ''
        or lower(coalesce(i.category, 'uncategorized')) like '%' || lower(trim(p_search_query)) || '%'
        or lower(coalesce(i.raw_text, '')) like '%' || lower(trim(p_search_query)) || '%'
        or ((i.amount_cents::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
      )
      and (
        p_cursor_date is null
        or (i.date, i.created_at, i.id) < (
          p_cursor_date,
          coalesce(p_cursor_created_at, 'infinity'::timestamptz),
          coalesce(p_cursor_id, repeat('z', 64))
        )
      )
  ), ordered_items as (
    select * from filtered_items
    order by date desc, created_at desc, id desc
    limit v_page_size + 1
  ), page_items as (
    select * from ordered_items limit v_page_size
  ), next_item as (
    select * from ordered_items offset v_page_size limit 1
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.date desc, p.created_at desc, p.id desc) from page_items p), '[]'::jsonb),
    'has_more', exists(select 1 from next_item),
    'next_cursor', (
      select case when exists(select 1 from next_item) then jsonb_build_object(
        'date', p.date, 'created_at', p.created_at, 'id', p.id
      ) else null end
      from page_items p
      order by p.date asc, p.created_at asc, p.id asc
      limit 1
    )
  ) into v_payload;

  return coalesce(v_payload, jsonb_build_object(
    'items', '[]'::jsonb, 'has_more', false, 'next_cursor', null
  ));
end;
$$;

create or replace function public.set_transaction_analytics_override_v1(
  p_user_id uuid,
  p_expense_id uuid,
  p_analytics_class text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_class text := lower(trim(coalesce(p_analytics_class, '')));
  v_updated public.expenses%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction classification override' using errcode = '42501';
  end if;

  if v_class = 'provider' then
    -- classification_source is a watched column on the classification trigger;
    -- changing it away from user_override recomputes every provider field below.
    update public.expenses
    set
      classification_source = case
        when provider = 'plaid' then 'plaid_pfc_' || coalesce(provider_pfc_version, 'v2')
        else 'manual'
      end,
      user_overrides = coalesce(user_overrides, '{}'::jsonb)
        - 'analytics_class' - 'classification_source',
      updated_at = now()
    where id = p_expense_id
      and user_id = p_user_id
      and deleted_at is null
    returning * into v_updated;

    if v_updated.id is null then
      raise exception 'Transaction not found' using errcode = 'P0002';
    end if;

    return jsonb_build_object(
      'id', v_updated.id,
      'analytics_class', v_updated.analytics_class,
      'classification_source', v_updated.classification_source
    );
  end if;

  if v_class not in (
    'consumer_spend', 'income', 'transfer_in', 'transfer_out',
    'debt_payment', 'loan_disbursement', 'refund_or_reversal', 'bank_fee',
    'cash_movement', 'unknown'
  ) then
    raise exception 'Invalid transaction analytics class' using errcode = '22023';
  end if;

  update public.expenses
  set
    analytics_class = v_class,
    analytics_direction = case
      when v_class in ('income', 'transfer_in', 'loan_disbursement', 'refund_or_reversal') then 'in'
      when v_class in ('consumer_spend', 'transfer_out', 'debt_payment', 'bank_fee', 'cash_movement') then 'out'
      else 'none'
    end,
    analytics_spending_multiplier = case
      when not analytics_is_final then 0
      when v_class = 'consumer_spend' then 1
      when v_class = 'refund_or_reversal' then -1
      else 0
    end,
    analytics_counts_toward_income = analytics_is_final and v_class = 'income',
    classification_source = 'user_override',
    classification_version = 2,
    user_overrides = coalesce(user_overrides, '{}'::jsonb) || jsonb_build_object(
      'analytics_class', v_class,
      'classification_source', 'user_override'
    ),
    updated_at = now()
  where id = p_expense_id
    and user_id = p_user_id
    and deleted_at is null
  returning * into v_updated;

  if v_updated.id is null then
    raise exception 'Transaction not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_updated.id,
    'analytics_class', v_updated.analytics_class,
    'classification_source', v_updated.classification_source
  );
end;
$$;

create or replace function public.get_user_transactions_summary_v2(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_currencies text[] default null,
  p_category text default null,
  p_account_id uuid default null,
  p_include_unassigned_account boolean default false,
  p_categories text[] default null,
  p_type text default 'all',
  p_search_query text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_interval_granularity text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_currencies text[];
  v_categories text[];
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction summary access' using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household transaction summary access' using errcode = '42501';
  end if;

  v_currencies := nullif(array(
    select distinct upper(trim(value))
    from unnest(coalesce(p_currencies, '{}'::text[])) value
    where trim(value) <> ''
  ), '{}'::text[]);
  if v_currencies is null and nullif(trim(coalesce(p_currency, '')), '') is not null then
    v_currencies := array[upper(trim(p_currency))];
  end if;

  v_categories := nullif(array(
    select distinct lower(trim(value))
    from unnest(coalesce(p_categories, '{}'::text[])) value
    where trim(value) <> ''
  ), '{}'::text[]);

  with contact_ids as (
    select uc.id from public.user_contacts uc where uc.user_id = p_user_id
  ), filtered_items as materialized (
    select
      e.date,
      e.amount_cents,
      upper(coalesce(e.currency, '')) as currency,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only' then 'uncategorized'
        else lower(coalesce(e.category, 'uncategorized'))
      end as category,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only' then null
        else e.raw_text
      end as raw_text,
      not (
        p_household_id is not null
        and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only'
      ) as dimensions_visible,
      lower(coalesce(e.type::text, 'expense')) as type,
      e.analytics_class,
      e.analytics_spending_multiplier,
      e.analytics_counts_toward_income
    from public.expenses e
    where e.deleted_at is null
      and coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null
          and e.household_id is null
          and (e.user_id = p_user_id or exists (
            select 1 from contact_ids c where c.id = e.contact_id
          ))
        )
        or (p_household_id is not null and e.household_id = p_household_id)
      )
      and (v_currencies is null or upper(coalesce(e.currency, '')) = any(v_currencies))
      and (p_account_id is null or e.account_id = p_account_id or (
        p_include_unassigned_account and e.account_id is null
      ))
      and (
        (p_category is null and v_categories is null)
        or (
          not (
            p_household_id is not null
            and e.user_id is distinct from p_user_id
            and e.privacy_scope = 'balances_only'
          )
          and (p_category is null or lower(coalesce(e.category, 'uncategorized')) = lower(p_category))
          and (v_categories is null or lower(coalesce(e.category, 'uncategorized')) = any(v_categories))
        )
      )
      and (
        coalesce(lower(p_type), 'all') = 'all'
        or (lower(p_type) = 'expense' and e.analytics_spending_multiplier <> 0)
        or (lower(p_type) = 'income' and e.analytics_counts_toward_income)
      )
      and (p_start_date is null or e.date >= p_start_date)
      and (p_end_date is null or e.date <= p_end_date)
      and (
        coalesce(trim(p_search_query), '') = ''
        or (
          not (
            p_household_id is not null
            and e.user_id is distinct from p_user_id
            and e.privacy_scope = 'balances_only'
          )
          and (
            lower(coalesce(e.category, 'uncategorized')) like '%' || lower(trim(p_search_query)) || '%'
            or lower(coalesce(e.raw_text, '')) like '%' || lower(trim(p_search_query)) || '%'
            or ((e.amount_cents::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
          )
        )
      )
  ), spend_rows as (
    select *, (amount_cents * analytics_spending_multiplier)::bigint as analytics_amount_cents
    from filtered_items
    where analytics_spending_multiplier <> 0
  ), income_rows as (
    select * from filtered_items where analytics_counts_toward_income
  ), category_rollup as (
    select category, sum(analytics_amount_cents)::bigint as amount_cents, count(*)::integer as transaction_count
    from spend_rows where dimensions_visible group by category
  ), currency_category_rollup as (
    select category, currency, sum(analytics_amount_cents)::bigint as amount_cents, count(*)::integer as transaction_count
    from spend_rows where dimensions_visible group by category, currency
  ), yearly_rollup as (
    select date_trunc('year', date)::date as bucket_start, sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1
  ), currency_yearly_rollup as (
    select date_trunc('year', date)::date as bucket_start, currency, sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1, currency
  ), period_rollup as (
    select case coalesce(lower(p_interval_granularity), 'yearly')
      when 'daily' then date_trunc('day', date)::date
      when 'weekly' then date_trunc('week', date)::date
      when 'monthly' then date_trunc('month', date)::date
      else date_trunc('year', date)::date end as bucket_start,
      sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1
  ), currency_period_rollup as (
    select case coalesce(lower(p_interval_granularity), 'yearly')
      when 'daily' then date_trunc('day', date)::date
      when 'weekly' then date_trunc('week', date)::date
      when 'monthly' then date_trunc('month', date)::date
      else date_trunc('year', date)::date end as bucket_start,
      currency, sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1, currency
  ), currency_type_rollup as (
    select
      currency,
      coalesce(sum(analytics_amount_cents) filter (where analytics_spending_multiplier <> 0), 0)::bigint as expense_total_cents,
      coalesce(sum(abs(amount_cents)) filter (where analytics_counts_toward_income), 0)::bigint as income_total_cents,
      count(*)::integer as transaction_count
    from filtered_items where dimensions_visible group by currency
  )
  select jsonb_build_object(
    'transaction_count', (select count(*) from filtered_items where dimensions_visible),
    'expense_total_cents', coalesce((select sum(analytics_amount_cents) from spend_rows), 0),
    'income_total_cents', coalesce((select sum(abs(amount_cents)) from income_rows), 0),
    'has_multiple_currencies', (select count(distinct currency) from spend_rows where dimensions_visible) > 1,
    'category_summaries', coalesce((select jsonb_agg(jsonb_build_object(
      'category', category, 'amount_cents', amount_cents, 'transaction_count', transaction_count
    ) order by amount_cents desc) from category_rollup), '[]'::jsonb),
    'yearly_period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'amount_cents', amount_cents
    ) order by bucket_start) from yearly_rollup), '[]'::jsonb),
    'period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'amount_cents', amount_cents
    ) order by bucket_start) from period_rollup), '[]'::jsonb),
    'currency_category_summaries', coalesce((select jsonb_agg(jsonb_build_object(
      'category', category, 'currency', currency, 'amount_cents', amount_cents,
      'transaction_count', transaction_count
    ) order by amount_cents desc) from currency_category_rollup), '[]'::jsonb),
    'currency_yearly_period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'currency', currency, 'amount_cents', amount_cents
    ) order by bucket_start, currency) from currency_yearly_rollup), '[]'::jsonb),
    'currency_period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'currency', currency, 'amount_cents', amount_cents
    ) order by bucket_start, currency) from currency_period_rollup), '[]'::jsonb),
    'currency_type_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'currency', currency, 'expense_total_cents', expense_total_cents,
      'income_total_cents', income_total_cents, 'transaction_count', transaction_count
    ) order by currency) from currency_type_rollup), '[]'::jsonb)
  ) into v_payload;

  return coalesce(v_payload, jsonb_build_object(
    'transaction_count', 0, 'expense_total_cents', 0, 'income_total_cents', 0,
    'has_multiple_currencies', false, 'category_summaries', '[]'::jsonb,
    'yearly_period_totals', '[]'::jsonb, 'period_totals', '[]'::jsonb,
    'currency_category_summaries', '[]'::jsonb,
    'currency_yearly_period_totals', '[]'::jsonb,
    'currency_period_totals', '[]'::jsonb, 'currency_type_totals', '[]'::jsonb
  ));
end;
$$;

create or replace function public.get_dashboard_snapshot_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_interval_granularity text default null
) returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.get_user_transactions_summary_v2(
    p_user_id => p_user_id,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_type => 'all',
    p_start_date => p_start_date,
    p_end_date => p_end_date,
    p_interval_granularity => p_interval_granularity
  );
$$;

create or replace function public.get_dashboard_currency_summaries_v1(
  p_user_id uuid,
  p_household_id uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized dashboard currency summary access' using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household dashboard currency summary access' using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id from public.user_contacts uc where uc.user_id = p_user_id
  ), filtered_expenses as (
    select
      upper(coalesce(e.currency, '')) as currency,
      e.amount_cents,
      e.analytics_spending_multiplier,
      e.analytics_counts_toward_income
    from public.expenses e
    where e.deleted_at is null
      and coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null
          and e.household_id is null
          and (e.user_id = p_user_id or exists (
            select 1 from contact_ids c where c.id = e.contact_id
          ))
        )
        or (p_household_id is not null and e.household_id = p_household_id)
      )
  ), currency_rollup as (
    select
      currency,
      count(*)::integer as transaction_count,
      coalesce(sum(abs(amount_cents)) filter (
        where analytics_counts_toward_income
      ), 0)::bigint as income_total_cents,
      coalesce(sum(amount_cents * analytics_spending_multiplier) filter (
        where analytics_spending_multiplier <> 0
      ), 0)::bigint as expense_total_cents
    from filtered_expenses
    where currency <> ''
    group by currency
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'currency', currency,
    'transaction_count', transaction_count,
    'income_total_cents', income_total_cents,
    'expense_total_cents', expense_total_cents
  ) order by currency), '[]'::jsonb)
  into v_payload
  from currency_rollup;

  return v_payload;
end;
$$;

create or replace function public.get_dashboard_recent_transactions_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_limit integer default 5
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 20));
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized dashboard recent transactions access' using errcode = '42501';
  end if;
  if p_household_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household dashboard recent transactions access' using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id from public.user_contacts uc where uc.user_id = p_user_id
  ), filtered_expenses as (
    select
      e.id, e.contact_id, e.user_id, e.household_id, e.date,
      e.amount_cents, e.currency,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.category end as category,
      e.created_at, e.updated_at,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.raw_text end as raw_text,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.merchant end as merchant,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.breakdown end as breakdown,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.receipt_image_url end as receipt_image_url,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.split_group_id end as split_group_id,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.account_id end as account_id,
      e.type, e.is_recurring,
      e.analytics_class, e.analytics_is_final,
      e.analytics_spending_multiplier, e.analytics_counts_toward_income
    from public.expenses e
    where e.deleted_at is null
      and coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null and e.household_id is null
          and (e.user_id = p_user_id or exists (
            select 1 from contact_ids c where c.id = e.contact_id
          ))
        )
        or (p_household_id is not null and e.household_id = p_household_id)
      )
      and not (
        p_household_id is not null
        and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only'
      )
      and (p_currency is null or upper(coalesce(e.currency, '')) = upper(p_currency))
    order by e.date desc, e.created_at desc, e.id desc
    limit v_limit
  )
  select coalesce(jsonb_agg(to_jsonb(f) order by f.date desc, f.created_at desc, f.id desc), '[]'::jsonb)
  into v_payload
  from filtered_expenses f;
  return v_payload;
end;
$$;

create or replace function public.get_dashboard_calendar_transactions_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_start_date date default null,
  p_end_date date default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized dashboard calendar transactions access' using errcode = '42501';
  end if;
  if p_household_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household dashboard calendar access' using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id from public.user_contacts uc where uc.user_id = p_user_id
  ), filtered_expenses as (
    select
      e.id, e.contact_id, e.user_id, e.household_id, e.date,
      e.amount_cents, e.currency,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.category end as category,
      e.created_at, e.updated_at,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.raw_text end as raw_text,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.merchant end as merchant,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.breakdown end as breakdown,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.receipt_image_url end as receipt_image_url,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.split_group_id end as split_group_id,
      case when p_household_id is not null and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only' then null else e.account_id end as account_id,
      e.type, e.is_recurring,
      e.analytics_class, e.analytics_is_final,
      e.analytics_spending_multiplier, e.analytics_counts_toward_income
    from public.expenses e
    where e.deleted_at is null
      and coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null and e.household_id is null
          and (e.user_id = p_user_id or exists (
            select 1 from contact_ids c where c.id = e.contact_id
          ))
        )
        or (p_household_id is not null and e.household_id = p_household_id)
      )
      and not (
        p_household_id is not null
        and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only'
      )
      and (p_currency is null or upper(coalesce(e.currency, '')) = upper(p_currency))
      and (p_start_date is null or e.date >= p_start_date)
      and (p_end_date is null or e.date <= p_end_date)
  )
  select coalesce(jsonb_agg(to_jsonb(f) order by f.date desc, f.created_at desc, f.id desc), '[]'::jsonb)
  into v_payload
  from filtered_expenses f;
  return v_payload;
end;
$$;

create or replace function public.calculate_pocket_rollover_carry_v2(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_envelope_name text,
  p_rollover_group_id uuid,
  p_budget_month date
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_name text := lower(trim(coalesce(p_envelope_name, '')));
  v_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_previous_budget_month date := (date_trunc('month', p_budget_month)::date - interval '1 month')::date;
  v_carry bigint := 0;
  v_spent bigint;
  v_match record;
  v_period_start date;
  v_period_end date;
begin
  if (p_rollover_group_id is null and v_name = '') or p_budget_month is null then
    return 0;
  end if;

  for v_match in
    select distinct on (date_trunc('month', b.period_month)::date)
      b.period_month, e.id as envelope_id,
      coalesce(a.amount_cents, e.budget_amount_cents, 0)::bigint as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents
    from public.budgets b
    join public.budget_envelopes e on e.budget_id = b.id
    left join public.envelope_allocations a
      on a.envelope_id = e.id and a.period_month = b.period_month
    where date_trunc('month', b.period_month)::date >= (v_previous_budget_month - interval '120 months')::date
      and date_trunc('month', b.period_month)::date <= v_previous_budget_month
      and upper(b.currency) = v_currency
      and (
        (p_rollover_group_id is not null and e.rollover_group_id = p_rollover_group_id)
        or (p_rollover_group_id is null and lower(trim(e.name)) = v_name)
      )
      and upper(e.currency) = v_currency
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by date_trunc('month', b.period_month)::date asc,
      (b.period_month = date_trunc('month', b.period_month)::date) desc,
      e.updated_at desc nulls last, e.created_at desc nulls last
  loop
    if v_match.envelope_id is null or v_match.rollover_enabled = false then
      v_carry := 0;
      continue;
    end if;

    v_period_start := public.financial_cycle_start_for_month(v_match.period_month, v_start_day);
    v_period_end := public.next_financial_cycle_start(v_period_start, v_start_day);

    select coalesce(sum(ex.amount_cents * ex.analytics_spending_multiplier), 0)::bigint
    into v_spent
    from public.expenses ex
    join public.envelope_category_links l
      on l.envelope_id = v_match.envelope_id
      and lower(trim(coalesce(ex.category, ''))) = lower(trim(l.category))
    where ex.analytics_is_final
      and ex.analytics_spending_multiplier <> 0
      and upper(coalesce(ex.currency, '')) = v_currency
      and ex.deleted_at is null
      and ex.date >= v_period_start and ex.date < v_period_end
      and (
        (v_scope = 'household' and ex.household_id = p_household_id)
        or (v_scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
        or (v_scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
      );

    v_carry := coalesce(v_match.base_cents, 0) + coalesce(v_carry, 0)
      + coalesce(v_match.opening_rollover_cents, 0) - coalesce(v_spent, 0);
    if v_carry < 0 and v_match.rollover_negative = false then
      v_carry := 0;
    elsif v_match.rollover_cap_cents is not null and v_carry > v_match.rollover_cap_cents then
      v_carry := v_match.rollover_cap_cents;
    end if;
  end loop;
  return coalesce(v_carry, 0);
end;
$$;

create or replace function public.get_pocket_rollover_history_v2(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_rollover_group_id uuid,
  p_budget_month date,
  p_limit_months integer default 12
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_budget_month date := date_trunc('month', p_budget_month)::date;
  v_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_limit integer := greatest(1, least(coalesce(p_limit_months, 12), 36));
  v_rows jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized pocket rollover history access' using errcode = '42501';
  end if;
  if p_rollover_group_id is null or p_budget_month is null then
    return '[]'::jsonb;
  end if;

  with envelope_months as (
    select distinct on (date_trunc('month', b.period_month)::date)
      b.period_month as budget_month,
      public.financial_cycle_start_for_month(b.period_month, v_start_day) as period_start,
      e.id as envelope_id, e.name,
      coalesce(a.amount_cents, e.budget_amount_cents, 0)::bigint as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents,
      e.rollover_group_id
    from public.budgets b
    join public.budget_envelopes e on e.budget_id = b.id
    left join public.envelope_allocations a
      on a.envelope_id = e.id and a.period_month = b.period_month
    where date_trunc('month', b.period_month)::date <= v_budget_month
      and upper(b.currency) = v_currency
      and upper(e.currency) = v_currency
      and e.rollover_group_id = p_rollover_group_id
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by date_trunc('month', b.period_month)::date desc,
      (b.period_month = date_trunc('month', b.period_month)::date) desc,
      e.updated_at desc nulls last, e.created_at desc nulls last
    limit v_limit
  ), spent_by_month as (
    select em.envelope_id,
      coalesce(sum(ex.amount_cents * ex.analytics_spending_multiplier), 0)::bigint as spent_cents
    from envelope_months em
    left join public.envelope_category_links l on l.envelope_id = em.envelope_id
    left join public.expenses ex
      on lower(trim(coalesce(ex.category, ''))) = lower(trim(l.category))
      and ex.analytics_is_final
      and ex.analytics_spending_multiplier <> 0
      and upper(coalesce(ex.currency, '')) = v_currency
      and ex.deleted_at is null
      and not (
        v_scope = 'household'
        and ex.user_id is distinct from p_user_id
        and ex.privacy_scope = 'balances_only'
      )
      and ex.date >= em.period_start
      and ex.date < public.next_financial_cycle_start(em.period_start, v_start_day)
      and (
        (v_scope = 'household' and ex.household_id = p_household_id)
        or (v_scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
        or (v_scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
      )
    group by em.envelope_id
  ), calculated as (
    select em.*, coalesce(sbm.spent_cents, 0)::bigint as spent_cents,
      case when em.rollover_enabled then public.calculate_pocket_rollover_carry_v2(
        p_user_id, p_scope, p_household_id, v_currency, em.name,
        em.rollover_group_id, em.budget_month
      ) else 0 end::bigint as incoming_rollover_cents
    from envelope_months em
    left join spent_by_month sbm on sbm.envelope_id = em.envelope_id
  ), balances as (
    select c.*,
      case when c.rollover_enabled
        then c.base_cents + c.incoming_rollover_cents + c.opening_rollover_cents
        else c.base_cents
      end::bigint as available_cents
    from calculated c
  ), carry_values as (
    select b.*, (b.available_cents - b.spent_cents)::bigint as remaining_cents,
      case
        when b.rollover_enabled = false then 0
        when b.available_cents - b.spent_cents < 0 and b.rollover_negative = false then 0
        when b.rollover_cap_cents is not null
          and b.available_cents - b.spent_cents > b.rollover_cap_cents then b.rollover_cap_cents
        else b.available_cents - b.spent_cents
      end::bigint as carry_to_next_cents
    from balances b
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'period_month', cv.period_start,
    'budget_month', cv.budget_month,
    'name', cv.name,
    'base_budget_cents', cv.base_cents,
    'rollover_from_previous_cents', cv.incoming_rollover_cents,
    'opening_rollover_cents', cv.opening_rollover_cents,
    'available_budget_cents', cv.available_cents,
    'spent_cents', cv.spent_cents,
    'remaining_cents', cv.remaining_cents,
    'carry_to_next_cents', cv.carry_to_next_cents,
    'rollover_enabled', cv.rollover_enabled,
    'rollover_negative', cv.rollover_negative,
    'rollover_cap_cents', cv.rollover_cap_cents,
    'cap_applied_cents', greatest(cv.remaining_cents - cv.carry_to_next_cents, 0),
    'negative_dropped_cents', case
      when cv.remaining_cents < 0 and cv.rollover_negative = false then abs(cv.remaining_cents)
      else 0
    end
  ) order by cv.budget_month asc), '[]'::jsonb)
  into v_rows from carry_values cv;

  return v_rows;
end;
$$;

create or replace function public.get_user_analytics(p_user_id uuid)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_contact_ids uuid[];
  v_result json;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized user analytics access' using errcode = '42501';
  end if;

  select array_agg(id) into v_contact_ids
  from public.user_contacts
  where user_id = p_user_id;

  select json_build_object(
    'contact', (
      select row_to_json(contact_row.*)
      from (
        select id, user_id, phone_e164, verified, preferred_currency,
          preferred_timezone, created_at, updated_at
        from public.user_contacts
        where user_id = p_user_id
        order by updated_at desc nulls last, created_at desc nulls last
        limit 1
      ) contact_row
    ),
    'expenses', coalesce((
      select json_agg(expense_row.*)
      from (
        select
          e.id, e.contact_id, e.user_id, e.date, e.amount_cents,
          e.currency, e.category, e.created_at, e.updated_at, e.raw_text,
          e.merchant, e.receipt_image_url, e.household_id, e.split_group_id,
          e.type, e.is_recurring, e.bank_account_id, e.account_id,
          e.analytics_class, e.analytics_is_final,
          e.analytics_spending_multiplier, e.analytics_counts_toward_income
        from public.expenses e
        where e.deleted_at is null
          and (
            e.user_id = p_user_id
            or (
              v_contact_ids is not null
              and array_length(v_contact_ids, 1) > 0
              and e.contact_id = any(v_contact_ids)
            )
          )
          and e.household_id is null
          and e.split_group_id is null
          and coalesce(e.is_recurring, false) = false
        order by e.date desc
      ) expense_row
    ), '[]'::json),
    'budgets', coalesce((
      select json_agg(budget_row.*)
      from (
        select id, contact_id, date, amount_cents, currency
        from public.daily_budgets
        where v_contact_ids is not null
          and array_length(v_contact_ids, 1) > 0
          and contact_id = any(v_contact_ids)
        order by date asc
        limit 10000
      ) budget_row
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_user_transactions_summary_v2(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text, date, date, text
) from public, anon;
grant execute on function public.get_user_transactions_summary_v2(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text, date, date, text
) to authenticated;

revoke execute on function public.get_user_transactions_page_v2(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text,
  date, date, integer, date, timestamptz, text
) from public, anon;
grant execute on function public.get_user_transactions_page_v2(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text,
  date, date, integer, date, timestamptz, text
) to authenticated;

revoke execute on function public.get_dashboard_snapshot_v1(
  uuid, uuid, text, date, date, text
) from public, anon;
grant execute on function public.get_dashboard_snapshot_v1(
  uuid, uuid, text, date, date, text
) to authenticated;

revoke execute on function public.get_dashboard_currency_summaries_v1(
  uuid, uuid
) from public, anon;
grant execute on function public.get_dashboard_currency_summaries_v1(
  uuid, uuid
) to authenticated;

revoke execute on function public.get_dashboard_recent_transactions_v1(
  uuid, uuid, text, integer
) from public, anon;
grant execute on function public.get_dashboard_recent_transactions_v1(
  uuid, uuid, text, integer
) to authenticated;

revoke execute on function public.get_dashboard_calendar_transactions_v1(
  uuid, uuid, text, date, date
) from public, anon;
grant execute on function public.get_dashboard_calendar_transactions_v1(
  uuid, uuid, text, date, date
) to authenticated;

revoke execute on function public.calculate_pocket_rollover_carry_v2(
  uuid, text, uuid, text, text, uuid, date
) from public, anon;
grant execute on function public.calculate_pocket_rollover_carry_v2(
  uuid, text, uuid, text, text, uuid, date
) to authenticated;

revoke execute on function public.get_pocket_rollover_history_v2(
  uuid, text, uuid, text, uuid, date, integer
) from public, anon;
grant execute on function public.get_pocket_rollover_history_v2(
  uuid, text, uuid, text, uuid, date, integer
) to authenticated;

revoke execute on function public.get_user_analytics(uuid) from public, anon;
grant execute on function public.get_user_analytics(uuid) to authenticated;

revoke execute on function public.set_transaction_analytics_override_v1(
  uuid, uuid, text
) from public, anon;
grant execute on function public.set_transaction_analytics_override_v1(
  uuid, uuid, text
) to authenticated;

notify pgrst, 'reload schema';
