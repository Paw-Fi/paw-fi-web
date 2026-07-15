alter table public.user_contacts
  add column if not exists financial_month_start_day integer;

update public.user_contacts
set financial_month_start_day = 1
where financial_month_start_day is null;

alter table public.user_contacts
  alter column financial_month_start_day set default 1,
  alter column financial_month_start_day set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_financial_month_start_day_range'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    alter table public.user_contacts
      add constraint user_contacts_financial_month_start_day_range
      check (financial_month_start_day between 1 and 31);
  end if;
end $$;

create or replace function public.normalize_financial_month_start_day(p_start_day integer)
returns integer
language sql
immutable
as $$
  select case
    when p_start_day between 1 and 31 then p_start_day
    else 1
  end;
$$;

create or replace function public.financial_cycle_start_for_month(
  p_month date,
  p_start_day integer
)
returns date
language sql
immutable
as $$
  select make_date(
    extract(year from p_month)::integer,
    extract(month from p_month)::integer,
    least(
      public.normalize_financial_month_start_day(p_start_day),
      extract(
        day from (
          date_trunc('month', p_month)::date + interval '1 month - 1 day'
        )
      )::integer
    )
  );
$$;

create or replace function public.next_financial_cycle_start(
  p_period_start date,
  p_start_day integer
)
returns date
language sql
immutable
as $$
  select public.financial_cycle_start_for_month(
    (date_trunc('month', p_period_start)::date + interval '1 month')::date,
    p_start_day
  );
$$;

create or replace function public.previous_financial_cycle_start(
  p_period_start date,
  p_start_day integer
)
returns date
language sql
immutable
as $$
  select public.financial_cycle_start_for_month(
    (date_trunc('month', p_period_start)::date - interval '1 month')::date,
    p_start_day
  );
$$;

create or replace function public.user_financial_month_start_day(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select public.normalize_financial_month_start_day(
    coalesce((
      select uc.financial_month_start_day
      from public.user_contacts uc
      where uc.user_id = p_user_id
      order by
        uc.created_at desc nulls last,
        uc.updated_at desc nulls last,
        uc.id desc
      limit 1
    ), 1)
  );
$$;

revoke execute on function public.normalize_financial_month_start_day(integer)
  from public, anon;
grant execute on function public.normalize_financial_month_start_day(integer)
  to authenticated, service_role;

revoke execute on function public.financial_cycle_start_for_month(date, integer)
  from public, anon;
grant execute on function public.financial_cycle_start_for_month(date, integer)
  to authenticated, service_role;

revoke execute on function public.next_financial_cycle_start(date, integer)
  from public, anon;
grant execute on function public.next_financial_cycle_start(date, integer)
  to authenticated, service_role;

revoke execute on function public.previous_financial_cycle_start(date, integer)
  from public, anon;
grant execute on function public.previous_financial_cycle_start(date, integer)
  to authenticated, service_role;

revoke execute on function public.user_financial_month_start_day(uuid)
  from public, anon;
grant execute on function public.user_financial_month_start_day(uuid)
  to authenticated, service_role;
