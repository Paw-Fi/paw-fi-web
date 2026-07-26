-- Foundation only: no existing transaction or split is reinterpreted here.
-- Later migrations materialize legacy rows and add the atomic write RPCs.
set lock_timeout = '10s';

do $$
begin
  if exists (
    select 1
    from public.expenses expense
    where expense.parent_recurring_id is not null
      and coalesce(expense.is_recurring, false) is false
      and expense.deleted_at is null
    group by expense.parent_recurring_id, expense.date
    having count(*) > 1
  ) then
    raise exception
      'recurring occurrence foundation blocked: duplicate active historical parent_recurring_id/date links require classification';
  end if;
end;
$$;

create table public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  recurring_id uuid not null references public.expenses(id) on delete restrict,
  scheduled_occurrence_date date not null,
  status text not null default 'pending',
  confirmation_source text,
  actual_transaction_id uuid references public.expenses(id) on delete set null,
  split_group_id uuid,
  paid_date date,
  amount_cents bigint,
  currency text,
  confirmed_at timestamptz,
  confirmed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint recurring_occurrences_recurring_scheduled_key
    unique (recurring_id, scheduled_occurrence_date),
  constraint recurring_occurrences_status_check
    check (status in ('pending', 'confirmed', 'skipped')),
  constraint recurring_occurrences_confirmation_source_check
    check (confirmation_source is null or confirmation_source in (
      'user', 'legacy_migration', 'system'
    )),
  constraint recurring_occurrences_amount_check
    check (amount_cents is null or amount_cents > 0),
  constraint recurring_occurrences_currency_check
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint recurring_occurrences_confirmed_shape_check
    check (
      status <> 'confirmed'
      or (
        actual_transaction_id is not null
        and paid_date is not null
        and amount_cents is not null
        and currency is not null
        and confirmed_at is not null
      )
    ),
  constraint recurring_occurrences_skipped_shape_check
    check (status <> 'skipped' or actual_transaction_id is null)
);

alter table public.expense_split_groups
  add column is_recurring_template boolean not null default false,
  add column recurring_occurrence_id uuid;

alter table public.expense_split_groups
  add constraint expense_split_groups_recurring_occurrence_id_fkey
  foreign key (recurring_occurrence_id)
  references public.recurring_occurrences(id)
  on delete set null;

alter table public.recurring_occurrences
  add constraint recurring_occurrences_split_group_id_fkey
  foreign key (split_group_id)
  references public.expense_split_groups(id)
  on delete set null;

alter table public.expenses
  add column scheduled_occurrence_date date,
  add column recurring_confirmed_at timestamptz,
  add column recurring_confirmation_source text;

alter table public.expenses
  add constraint expenses_recurring_confirmation_source_check
  check (recurring_confirmation_source is null or recurring_confirmation_source in (
    'user', 'legacy_migration', 'system'
  ));

do $$
declare
  v_constraint_name text;
begin
  select key_column.constraint_name
  into v_constraint_name
  from information_schema.table_constraints table_constraint
  join information_schema.key_column_usage key_column
    on key_column.constraint_catalog = table_constraint.constraint_catalog
    and key_column.constraint_schema = table_constraint.constraint_schema
    and key_column.constraint_name = table_constraint.constraint_name
  where table_constraint.constraint_schema = 'public'
    and table_constraint.table_name = 'expenses'
    and table_constraint.constraint_type = 'FOREIGN KEY'
    and key_column.column_name = 'parent_recurring_id';

  if v_constraint_name is not null then
    execute format(
      'alter table public.expenses drop constraint %I',
      v_constraint_name
    );
  end if;
end;
$$;

alter table public.expenses
  add constraint expenses_parent_recurring_id_fkey
  foreign key (parent_recurring_id)
  references public.expenses(id)
  on delete restrict;

create unique index expense_split_groups_one_active_recurring_template_idx
  on public.expense_split_groups (expense_id)
  where is_recurring_template;

create unique index recurring_occurrences_active_actual_idx
  on public.expenses (parent_recurring_id, scheduled_occurrence_date)
  where parent_recurring_id is not null
    and scheduled_occurrence_date is not null
    and is_recurring is false
    and deleted_at is null;

create unique index recurring_occurrences_actual_transaction_idx
  on public.recurring_occurrences (actual_transaction_id)
  where actual_transaction_id is not null;

create index recurring_occurrences_series_status_schedule_idx
  on public.recurring_occurrences (
    recurring_id,
    status,
    scheduled_occurrence_date desc
  );

create index recurring_occurrences_split_group_idx
  on public.recurring_occurrences (split_group_id)
  where split_group_id is not null;

create index recurring_occurrences_confirmer_status_idx
  on public.recurring_occurrences (confirmed_by_user_id, status)
  where confirmed_by_user_id is not null;

create index expense_split_groups_occurrence_idx
  on public.expense_split_groups (recurring_occurrence_id)
  where recurring_occurrence_id is not null;

create index expenses_parent_scheduled_occurrence_idx
  on public.expenses (parent_recurring_id, scheduled_occurrence_date)
  where parent_recurring_id is not null
    and scheduled_occurrence_date is not null;

drop trigger if exists recurring_occurrences_updated_at on public.recurring_occurrences;
create trigger recurring_occurrences_updated_at
before update on public.recurring_occurrences
for each row execute function public.update_updated_at_column();

alter table public.recurring_occurrences enable row level security;

create policy "Users can view recurring occurrences in accessible scopes"
on public.recurring_occurrences
for select
to authenticated
using (
  exists (
    select 1
    from public.expenses recurring
    where recurring.id = recurring_occurrences.recurring_id
      and (
        recurring.user_id = (select auth.uid())
        or (
          recurring.household_id is not null
          and recurring.privacy_scope = 'full'
          and exists (
            select 1
            from public.household_members membership
            where membership.household_id = recurring.household_id
              and membership.user_id = (select auth.uid())
          )
        )
      )
  )
);

revoke all on table public.recurring_occurrences from public, anon;
revoke insert, update, delete on table public.recurring_occurrences from authenticated;
grant select on table public.recurring_occurrences to authenticated;

comment on table public.recurring_occurrences is
  'Durable lifecycle ledger for scheduled recurring occurrences.';
comment on column public.recurring_occurrences.scheduled_occurrence_date is
  'Immutable scheduled date identifying the projection replaced by an occurrence.';
comment on column public.recurring_occurrences.paid_date is
  'Actual paid or received date controlling accounting period inclusion.';
comment on column public.expenses.scheduled_occurrence_date is
  'Scheduled occurrence identity for a materialized recurring actual; expenses.date remains the actual accounting date.';
comment on column public.expenses.recurring_confirmed_at is
  'Timestamp at which a recurring occurrence was confirmed or imported.';
comment on column public.expenses.recurring_confirmation_source is
  'Origin of recurring occurrence materialization: user, legacy_migration, or system.';
comment on column public.expense_split_groups.is_recurring_template is
  'True only for future recurring split configuration; template groups must not create settlement debt.';
comment on column public.expense_split_groups.recurring_occurrence_id is
  'Links a non-template actual split group to its durable recurring occurrence.';
