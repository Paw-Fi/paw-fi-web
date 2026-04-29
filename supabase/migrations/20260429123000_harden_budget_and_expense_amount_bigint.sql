-- Defensive hardening migration for environments that may have missed prior
-- amount-cents widening migrations.

create temporary table if not exists pg_temp._view_definitions_backup (
  full_name text primary key,
  view_schema text not null,
  view_name text not null,
  dependency_depth integer not null,
  view_definition text not null
) on commit drop;

do $$
begin
  if to_regclass('public.household_expense_split_diagnostics') is null then
    return;
  end if;

  insert into pg_temp._view_definitions_backup (
    full_name,
    view_schema,
    view_name,
    dependency_depth,
    view_definition
  )
  with recursive dependent_views as (
    select
      c.oid as view_oid,
      n.nspname as view_schema,
      c.relname as view_name,
      0 as dependency_depth
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'v'
      and n.nspname = 'public'
      and c.relname = 'household_expense_split_diagnostics'

    union all

    select
      c_dep.oid as view_oid,
      n_dep.nspname as view_schema,
      c_dep.relname as view_name,
      dv.dependency_depth + 1 as dependency_depth
    from dependent_views dv
    join pg_depend d
      on d.refobjid = dv.view_oid
     and d.classid = 'pg_rewrite'::regclass
     and d.deptype = 'n'
    join pg_rewrite rw on rw.oid = d.objid
    join pg_class c_dep
      on c_dep.oid = rw.ev_class
     and c_dep.relkind = 'v'
    join pg_namespace n_dep on n_dep.oid = c_dep.relnamespace
    where c_dep.oid <> dv.view_oid
  ),
  deduplicated as (
    select
      dv.view_oid,
      dv.view_schema,
      dv.view_name,
      min(dv.dependency_depth) as dependency_depth
    from dependent_views dv
    group by dv.view_oid, dv.view_schema, dv.view_name
  )
  select
    format('%I.%I', dd.view_schema, dd.view_name) as full_name,
    dd.view_schema,
    dd.view_name,
    dd.dependency_depth,
    pg_get_viewdef(dd.view_oid, true) as view_definition
  from deduplicated dd
  on conflict (full_name) do nothing;
end;
$$;

drop view if exists public.household_expense_split_diagnostics cascade;

drop view if exists public.v_envelope_monthly_spend;

drop trigger if exists trg_set_expense_import_semantic_key on public.expenses;

drop trigger if exists set_budget_amount_cents on public.budget_envelopes;

alter table if exists public.budgets
  alter column total_budget_cents type bigint
  using total_budget_cents::bigint;

alter table if exists public.budget_envelopes
  alter column budget_amount_cents type bigint
  using budget_amount_cents::bigint;

alter table if exists public.envelope_allocations
  alter column amount_cents type bigint
  using amount_cents::bigint;

alter table if exists public.expenses
  alter column amount_cents type bigint
  using amount_cents::bigint;

create or replace view public.v_envelope_monthly_spend as
select
  e.id as envelope_id,
  date_trunc('month', ex.date)::date as period_month,
  sum(ex.amount_cents)::bigint as spent_cents
from public.budget_envelopes e
join public.envelope_category_links l
  on l.envelope_id = e.id
join public.user_contacts uc
  on uc.user_id = e.user_id
join public.expenses ex
  on ex.contact_id = uc.id
 and lower(coalesce(ex.category, 'uncategorized')) = lower(l.category)
group by e.id, date_trunc('month', ex.date)::date;

comment on view public.v_envelope_monthly_spend is
  'Aggregated monthly spend per envelope using user_id, category links and expenses';

do $$
declare
  backup record;
begin
  for backup in
    select
      b.view_schema,
      b.view_name,
      b.view_definition
    from pg_temp._view_definitions_backup b
    order by b.dependency_depth asc, b.full_name asc
  loop
    execute
      format(
        'create or replace view %I.%I as %s',
        backup.view_schema,
        backup.view_name,
        backup.view_definition
      );
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_expense_import_semantic_key'
  ) then
    create trigger trg_set_expense_import_semantic_key
    before insert or update of user_id, household_id, account_id, type, date, amount_cents, currency, category, raw_text
    on public.expenses
    for each row
    execute function public.set_expense_import_semantic_key();
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_budget_amount_cents'
  ) then
    create trigger set_budget_amount_cents
    before insert or update of budget_amount_cents, budget_percentage, budget_id
    on public.budget_envelopes
    for each row
    execute function public.set_budget_amount_cents();
  end if;
end;
$$;
