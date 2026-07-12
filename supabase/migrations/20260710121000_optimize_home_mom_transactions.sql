set lock_timeout = '5s';
set statement_timeout = '2min';

-- The Home month-over-month card only needs the three visible financial
-- cycles. These indexes support the exact legacy ownership predicate
-- (user_id OR one of the user's contact IDs) without scanning full history.
create index if not exists idx_expenses_home_owned_user_date
  on public.expenses (
    user_id,
    date desc,
    created_at desc,
    id desc
  )
  where user_id is not null
    and deleted_at is null
    and split_group_id is null
    and coalesce(is_recurring, false) = false;

create index if not exists idx_expenses_home_owned_contact_date
  on public.expenses (
    contact_id,
    date desc,
    created_at desc,
    id desc
  )
  where contact_id is not null
    and deleted_at is null
    and split_group_id is null
    and coalesce(is_recurring, false) = false;

create or replace function public.get_home_mom_transactions_v1(
  p_user_id uuid,
  p_start_date date default null,
  p_end_date date default null,
  p_before_date date default null,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 1000
) returns table (
  id text,
  contact_id uuid,
  user_id uuid,
  household_id uuid,
  date date,
  amount_cents bigint,
  currency text,
  category text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_text text,
  split_group_id uuid,
  type text,
  is_recurring boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_auth_user_id uuid := (select auth.uid());
  v_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 1000);
begin
  if v_auth_user_id is null or v_auth_user_id <> p_user_id then
    raise exception 'Unauthorized Home month-over-month access'
      using errcode = '42501';
  end if;

  if p_before_date is not null and p_before_id is null then
    raise exception 'Incomplete Home month-over-month cursor'
      using errcode = '22023';
  end if;

  return query
  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  )
  select
    e.id::text,
    e.contact_id,
    e.user_id,
    e.household_id,
    e.date,
    e.amount_cents,
    e.currency,
    e.category,
    e.created_at,
    e.updated_at,
    e.raw_text,
    e.split_group_id,
    lower(coalesce(e.type::text, 'expense')),
    e.is_recurring
  from public.expenses e
  where e.deleted_at is null
    and e.split_group_id is null
    and coalesce(e.is_recurring, false) = false
    and (
      e.user_id = p_user_id
      or exists (
        select 1
        from contact_ids contact
        where contact.id = e.contact_id
      )
    )
    and (p_start_date is null or e.date >= p_start_date)
    and (p_end_date is null or e.date <= p_end_date)
    and (
      p_before_date is null
      or (
        e.date,
        case when e.created_at is null then 1 else 0 end,
        coalesce(e.created_at, '-infinity'::timestamptz),
        e.id
      ) < (
        p_before_date,
        case when p_before_created_at is null then 1 else 0 end,
        coalesce(p_before_created_at, '-infinity'::timestamptz),
        p_before_id
      )
    )
  order by e.date desc, e.created_at desc nulls first, e.id desc
  limit v_limit;
end;
$$;

comment on function public.get_home_mom_transactions_v1(uuid, date, date, date, timestamptz, uuid, integer)
  is 'Returns one stable keyset page of the exact bounded transaction fields needed by Home month-over-month; currency canonicalization, recurring projection, and deduplication remain in Flutter.';

revoke all on function public.get_home_mom_transactions_v1(uuid, date, date, date, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.get_home_mom_transactions_v1(uuid, date, date, date, timestamptz, uuid, integer)
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Users can view contact-owned expenses'
  ) then
    create policy "Users can view contact-owned expenses"
      on public.expenses
      for select
      to authenticated
      using (
        deleted_at is null
        and exists (
          select 1
          from public.user_contacts uc
          where uc.id = expenses.contact_id
            and uc.user_id = (select auth.uid())
        )
      );
  end if;
end
$$;

notify pgrst, 'reload schema';

reset statement_timeout;
reset lock_timeout;

-- Rollback:
-- drop policy if exists "Users can view contact-owned expenses" on public.expenses;
-- drop function if exists public.get_home_mom_transactions_v1(uuid, date, date, date, timestamptz, uuid, integer);
-- drop index if exists public.idx_expenses_home_owned_user_date;
-- drop index if exists public.idx_expenses_home_owned_contact_date;
