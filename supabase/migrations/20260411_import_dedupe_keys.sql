create or replace function public.normalize_import_dedupe_text(p_value text)
returns text
language sql
immutable
as $$
  select left(
    regexp_replace(lower(coalesce(trim(p_value), '')), '[[:space:][:punct:]]+', '', 'g'),
    80
  );
$$;

create or replace function public.build_expense_import_semantic_key(
  p_user_id uuid,
  p_household_id uuid,
  p_account_id uuid,
  p_type text,
  p_date date,
  p_amount_cents bigint,
  p_currency text,
  p_category text,
  p_raw_text text
)
returns text
language sql
immutable
as $$
  select concat_ws(
    '|',
    'v1',
    coalesce(p_user_id::text, ''),
    coalesce(p_household_id::text, ''),
    coalesce(p_account_id::text, ''),
    lower(coalesce(nullif(trim(p_type), ''), 'expense')),
    coalesce(p_date::text, ''),
    coalesce(p_amount_cents::text, '0'),
    upper(coalesce(nullif(trim(p_currency), ''), '')),
    public.normalize_import_dedupe_text(p_category),
    public.normalize_import_dedupe_text(p_raw_text)
  );
$$;

alter table public.expenses
  add column if not exists import_semantic_key text,
  add column if not exists import_request_key text;

comment on column public.expenses.import_semantic_key is
  'Stable semantic fingerprint used by manual import duplicate detection.';
comment on column public.expenses.import_request_key is
  'Idempotency key for retrying the exact same import request chunk safely.';

create index if not exists idx_expenses_import_semantic_key
  on public.expenses (import_semantic_key)
  where import_semantic_key is not null;

create unique index if not exists idx_expenses_import_request_key
  on public.expenses (import_request_key)
  where import_request_key is not null;

create or replace function public.set_expense_import_semantic_key()
returns trigger
language plpgsql
as $$
begin
  new.import_semantic_key := public.build_expense_import_semantic_key(
    new.user_id,
    new.household_id,
    new.account_id,
    new.type::text,
    new.date,
    new.amount_cents::bigint,
    new.currency,
    new.category,
    new.raw_text
  );
  return new;
end;
$$;

drop trigger if exists trg_set_expense_import_semantic_key on public.expenses;

create trigger trg_set_expense_import_semantic_key
before insert or update of user_id, household_id, account_id, type, date, amount_cents, currency, category, raw_text
on public.expenses
for each row
execute function public.set_expense_import_semantic_key();

update public.expenses
set import_semantic_key = public.build_expense_import_semantic_key(
  user_id,
  household_id,
  account_id,
  type::text,
  date,
  amount_cents::bigint,
  currency,
  category,
  raw_text
)
where import_semantic_key is distinct from public.build_expense_import_semantic_key(
  user_id,
  household_id,
  account_id,
  type::text,
  date,
  amount_cents::bigint,
  currency,
  category,
  raw_text
);
