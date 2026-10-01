-- Keep transfer clocks in the normal feed and a separately paginated delta.
-- Expense UUID cursors must not be reused to skip historical transfer records.
create or replace function public.enrich_wallet_transfer_time_items(p_items jsonb)
returns jsonb
language sql stable
set search_path = ''
as $$
  with items as (
    select value, ordinality,
      case when value ->> 'id' ~* '^transfer:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(in|out)$'
        then split_part(value ->> 'id', ':', 2)::uuid end as transfer_id
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality
  )
  select coalesce(jsonb_agg(
    case when transfer.id is null then items.value
      else items.value || jsonb_build_object(
        'date', transfer.date, 'time', transfer.time::text,
        'transfer_time', transfer.time::text, 'updated_at', transfer.updated_at
      ) end order by items.ordinality
  ), '[]'::jsonb)
  from items
  left join public.account_transfers transfer on transfer.id = items.transfer_id;
$$;

revoke all on function public.enrich_wallet_transfer_time_items(jsonb)
  from public, anon, authenticated;

create or replace function public.get_user_transactions_page_v6(
  p_user_id uuid, p_household_id uuid default null, p_currency text default null,
  p_currencies text[] default null, p_category text default null,
  p_account_id uuid default null, p_include_unassigned_account boolean default false,
  p_categories text[] default null, p_type text default 'all',
  p_search_query text default null, p_start_date date default null,
  p_end_date date default null, p_page_size integer default 60,
  p_cursor_date date default null, p_cursor_created_at timestamptz default null,
  p_cursor_id text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb;
begin
  v_payload := public.get_user_transactions_page_v5(
    p_user_id, p_household_id, p_currency, p_currencies, p_category,
    p_account_id, p_include_unassigned_account, p_categories, p_type,
    p_search_query, p_start_date, p_end_date, p_page_size, p_cursor_date,
    p_cursor_created_at, p_cursor_id
  );
  return jsonb_set(v_payload, '{items}',
    public.enrich_wallet_transfer_time_items(
      public.enrich_merchant_identity_items(v_payload -> 'items')
    ), true);
end;
$$;

revoke all on function public.get_user_transactions_page_v6(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text,
  date, date, integer, date, timestamptz, text) from public, anon;
grant execute on function public.get_user_transactions_page_v6(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text,
  date, date, integer, date, timestamptz, text) to authenticated;

-- Deletes need their own events, otherwise a cross-device delta leaves stale
-- transfer rows offline after another device has removed the server record.
create table if not exists public.account_transfer_sync_tombstones (
  id uuid primary key,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  deleted_at timestamptz not null default now()
);
alter table public.account_transfer_sync_tombstones enable row level security;
revoke all on table public.account_transfer_sync_tombstones
  from public, anon, authenticated;

create or replace function public.record_account_transfer_sync_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Account/household deletion removes visibility as well as its records.
  if not exists (select 1 from auth.users where id = old.created_by_user_id)
    or (old.household_id is not null and not exists (
      select 1 from public.households where id = old.household_id
    )) then
    return old;
  end if;
  insert into public.account_transfer_sync_tombstones
    (id, created_by_user_id, household_id, deleted_at)
  values (old.id, old.created_by_user_id, old.household_id, now())
  on conflict (id) do update set deleted_at = excluded.deleted_at;
  return old;
end;
$$;
revoke all on function public.record_account_transfer_sync_delete()
  from public, anon, authenticated;
drop trigger if exists account_transfer_sync_delete on public.account_transfers;
create trigger account_transfer_sync_delete
after delete on public.account_transfers
for each row execute function public.record_account_transfer_sync_delete();

create index if not exists idx_account_transfers_personal_delta
  on public.account_transfers (created_by_user_id, updated_at, id)
  where household_id is null;
create index if not exists idx_account_transfers_household_delta
  on public.account_transfers (household_id, updated_at, id)
  where household_id is not null;
create index if not exists idx_account_transfer_tombstones_personal_delta
  on public.account_transfer_sync_tombstones (created_by_user_id, deleted_at, id)
  where household_id is null;
create index if not exists idx_account_transfer_tombstones_household_delta
  on public.account_transfer_sync_tombstones (household_id, deleted_at, id)
  where household_id is not null;

create or replace function public.get_mobile_transfer_delta_v1(
  p_user_id uuid, p_since timestamptz default null, p_since_id uuid default null,
  p_limit integer default 500
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_payload jsonb;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_user_id then
    raise exception 'Unauthorized transfer delta access' using errcode = '42501';
  end if;

  with visible_households as materialized (
    select household_id from public.household_members where user_id = p_user_id
  ), changes as (
    select t.id, t.updated_at as changed_at, false as deleted
    from public.account_transfers t
    where ((t.household_id is null and t.created_by_user_id = p_user_id)
      or t.household_id in (select household_id from visible_households))
      and (p_since is null
        or (p_since_id is null and t.updated_at > p_since)
        or (p_since_id is not null and (t.updated_at, t.id) > (p_since, p_since_id)))
    union all
    select t.id, t.deleted_at as changed_at, true as deleted
    from public.account_transfer_sync_tombstones t
    where ((t.household_id is null and t.created_by_user_id = p_user_id)
      or t.household_id in (select household_id from visible_households))
      and (p_since is null
        or (p_since_id is null and t.deleted_at > p_since)
        or (p_since_id is not null and (t.deleted_at, t.id) > (p_since, p_since_id)))
  ), candidates as materialized (
    select * from changes order by changed_at, id limit v_limit + 1
  ), page as materialized (
    select * from candidates order by changed_at, id limit v_limit
  ), last_row as (
    select * from page order by changed_at desc, id desc limit 1
  ), entries as (
    select page.changed_at, t.id as transfer_id,
      jsonb_build_object(
        'id', 'transfer:' || t.id::text || ':' || direction.value,
        'user_id', t.created_by_user_id, 'household_id', t.household_id,
        'date', t.date, 'time', t.time::text, 'transfer_time', t.time::text,
        'amount_cents', abs(t.amount_cents), 'currency', t.currency,
        'category', 'transfers', 'created_at', t.created_at, 'updated_at', t.updated_at,
        'raw_text', coalesce(nullif(btrim(t.note), ''), 'Transfer ' || direction.value),
        'account_id', case when direction.value = 'in' then t.to_account_id else t.from_account_id end,
        'account_name', a.name, 'account_icon', a.icon, 'account_color', a.color,
        'type', case when direction.value = 'in' then 'income' else 'expense' end,
        'analytics_class', 'transfer_' || direction.value,
        'analytics_is_final', true, 'analytics_spending_multiplier', 0,
        'analytics_counts_toward_income', false, 'is_recurring', false
      ) as value
    from page join public.account_transfers t on t.id = page.id and not page.deleted
    cross join (values ('out'), ('in')) as direction(value)
    join public.accounts a on a.id = case when direction.value = 'in'
      then t.to_account_id else t.from_account_id end
  )
  select jsonb_build_object(
    'transactions', coalesce((select jsonb_agg(value order by changed_at, transfer_id, value ->> 'id')
      from entries), '[]'::jsonb),
    'deletedTransactionIds', coalesce((select jsonb_agg(
      'transfer:' || page.id::text || ':' || direction.value order by page.changed_at, page.id, direction.value)
      from page cross join (values ('out'), ('in')) as direction(value)
      where page.deleted), '[]'::jsonb),
    'nextCursor', (select changed_at from last_row),
    'nextCursorId', (select id from last_row),
    'hasMore', exists(select 1 from candidates offset v_limit)
  ) into v_payload;
  return v_payload;
end;
$$;

revoke all on function public.get_mobile_transfer_delta_v1(uuid, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.get_mobile_transfer_delta_v1(uuid, timestamptz, uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';
