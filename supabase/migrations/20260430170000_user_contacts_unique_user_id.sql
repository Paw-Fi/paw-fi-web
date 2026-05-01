begin;

-- Merge duplicate user_contacts rows so each non-null user_id has one row.
-- Survivor: newest created_at, then newest updated_at, then highest id.
-- Column merge: newest non-null value wins. For non-null booleans, the newest
-- created row wins because every row has a value.
--
-- This migration intentionally uses no temp/helper tables. Every data movement
-- statement recomputes the duplicate mapping in a local CTE so SQL runners that
-- split statements cannot lose staging relations.

lock table public.user_contacts in access exclusive mode;
lock table public.daily_budgets, public.expense_categories, public.expenses
  in share row exclusive mode;

-- Merge daily budgets onto the survivor contact. If several duplicate contacts
-- have the same date/currency budget, the newest created row wins.
with duplicate_contacts as (
  select id, keep_id
  from (
    select
      id,
      first_value(id) over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as keep_id,
      row_number() over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as row_number
    from public.user_contacts
    where user_id is not null
  ) ranked
  where row_number > 1
), affected_contacts as (
  select id as contact_id, keep_id from duplicate_contacts
  union
  select keep_id as contact_id, keep_id from duplicate_contacts
), deleted_budgets as (
  delete from public.daily_budgets budgets
  using affected_contacts
  where budgets.contact_id = affected_contacts.contact_id
  returning
    affected_contacts.keep_id as contact_id,
    budgets.date,
    budgets.amount_cents,
    budgets.currency,
    budgets.created_at,
    budgets.updated_at,
    budgets.id
), ranked_budgets as (
  select
    contact_id,
    date,
    amount_cents,
    currency,
    created_at,
    updated_at,
    row_number() over (
      partition by contact_id, date, currency
      order by created_at desc nulls last, updated_at desc nulls last, id desc
    ) as row_number
  from deleted_budgets
)
insert into public.daily_budgets (
  contact_id,
  date,
  amount_cents,
  currency,
  created_at,
  updated_at
)
select
  contact_id,
  date,
  amount_cents,
  currency,
  created_at,
  updated_at
from ranked_budgets
where row_number = 1;

-- Merge expense categories onto the survivor contact. If several duplicate
-- contacts have the same category name, the newest created row wins.
with duplicate_contacts as (
  select id, keep_id
  from (
    select
      id,
      first_value(id) over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as keep_id,
      row_number() over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as row_number
    from public.user_contacts
    where user_id is not null
  ) ranked
  where row_number > 1
), affected_contacts as (
  select id as contact_id, keep_id from duplicate_contacts
  union
  select keep_id as contact_id, keep_id from duplicate_contacts
), deleted_categories as (
  delete from public.expense_categories categories
  using affected_contacts
  where categories.contact_id = affected_contacts.contact_id
  returning
    affected_contacts.keep_id as contact_id,
    categories.name,
    categories.is_default,
    categories.created_at,
    categories.updated_at,
    categories.id
), ranked_categories as (
  select
    contact_id,
    name,
    is_default,
    created_at,
    updated_at,
    row_number() over (
      partition by contact_id, name
      order by created_at desc nulls last, updated_at desc nulls last, id desc
    ) as row_number
  from deleted_categories
)
insert into public.expense_categories (
  contact_id,
  name,
  is_default,
  created_at,
  updated_at
)
select
  contact_id,
  name,
  is_default,
  created_at,
  updated_at
from ranked_categories
where row_number = 1;

-- Repoint expenses from duplicate contacts to the survivor contact.
with duplicate_contacts as (
  select id, keep_id
  from (
    select
      id,
      first_value(id) over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as keep_id,
      row_number() over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as row_number
    from public.user_contacts
    where user_id is not null
  ) ranked
  where row_number > 1
)
update public.expenses expenses
set contact_id = duplicate_contacts.keep_id
from duplicate_contacts
where expenses.contact_id = duplicate_contacts.id;

-- Merge contact columns into the survivor row. Newest non-null value wins;
-- boolean values use newest created row because false is also meaningful data.
with duplicate_groups as (
  select distinct user_id, keep_id
  from (
    select
      user_id,
      first_value(id) over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as keep_id,
      count(*) over (partition by user_id) as row_count
    from public.user_contacts
    where user_id is not null
  ) grouped
  where row_count > 1
), duplicate_contacts as (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as row_number
    from public.user_contacts
    where user_id is not null
  ) ranked
  where row_number > 1
), merged_contacts as materialized (
  select
    duplicate_groups.keep_id,
    (array_agg(contacts.phone_e164 order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.phone_e164 is not null))[1] as phone_e164,
    (array_agg(contacts.whatsapp_user_id order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.whatsapp_user_id is not null))[1] as whatsapp_user_id,
    (array_agg(contacts.telegram_user_id order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.telegram_user_id is not null))[1] as telegram_user_id,
    (array_agg(contacts.telegram_chat_id order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.telegram_chat_id is not null))[1] as telegram_chat_id,
    (array_agg(contacts.preferred_currency order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.preferred_currency is not null))[1] as preferred_currency,
    (array_agg(contacts.preferred_language order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.preferred_language is not null))[1] as preferred_language,
    (array_agg(contacts.preferred_timezone order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.preferred_timezone is not null))[1] as preferred_timezone,
    (array_agg(contacts.platform order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.platform is not null))[1] as platform,
    (array_agg(contacts.email_import_household_id order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.email_import_household_id is not null))[1] as email_import_household_id,
    (array_agg(contacts.email_import_account_id order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.email_import_account_id is not null))[1] as email_import_account_id,
    (array_agg(contacts.verified order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.verified is not null))[1] as verified,
    (array_agg(contacts.wallet_capture_enabled order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.wallet_capture_enabled is not null))[1] as wallet_capture_enabled,
    (array_agg(contacts.email_import_enabled order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.email_import_enabled is not null))[1] as email_import_enabled,
    (array_agg(contacts.email_import_is_portfolio order by contacts.created_at desc nulls last, contacts.updated_at desc nulls last, contacts.id desc) filter (where contacts.email_import_is_portfolio is not null))[1] as email_import_is_portfolio
  from public.user_contacts contacts
  join duplicate_groups
    on duplicate_groups.user_id = contacts.user_id
  group by duplicate_groups.keep_id
), cleared_duplicate_unique_values as (
  update public.user_contacts contacts
  set
    phone_e164 = null,
    telegram_chat_id = null
  from duplicate_contacts
  where contacts.id = duplicate_contacts.id
  returning contacts.id
), cleared_dependency as (
  select count(*) as cleared_count from cleared_duplicate_unique_values
)
update public.user_contacts contacts
set
  phone_e164 = merged_contacts.phone_e164,
  whatsapp_user_id = merged_contacts.whatsapp_user_id,
  telegram_user_id = merged_contacts.telegram_user_id,
  telegram_chat_id = merged_contacts.telegram_chat_id,
  preferred_currency = merged_contacts.preferred_currency,
  preferred_language = merged_contacts.preferred_language,
  preferred_timezone = merged_contacts.preferred_timezone,
  platform = merged_contacts.platform,
  email_import_household_id = merged_contacts.email_import_household_id,
  email_import_account_id = merged_contacts.email_import_account_id,
  verified = merged_contacts.verified,
  wallet_capture_enabled = merged_contacts.wallet_capture_enabled,
  email_import_enabled = merged_contacts.email_import_enabled,
  email_import_is_portfolio = merged_contacts.email_import_is_portfolio,
  updated_at = now()
from merged_contacts, cleared_dependency
where contacts.id = merged_contacts.keep_id;

-- Delete older duplicate contact rows after dependent rows have been merged.
with duplicate_contacts as (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as row_number
    from public.user_contacts
    where user_id is not null
  ) ranked
  where row_number > 1
)
delete from public.user_contacts contacts
using duplicate_contacts
where contacts.id = duplicate_contacts.id;

-- Ensure existing phone/Telegram uniqueness guarantees are present. These use
-- non-partial uniqueness so Supabase/PostgREST upsert on phone_e164 can target
-- the conflict column directly. PostgreSQL still permits multiple NULLs.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_phone_e164_key'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'user_contacts_phone_e164_key'
        and c.relkind = 'i'
    ) then
      alter table public.user_contacts
        add constraint user_contacts_phone_e164_key
        unique using index user_contacts_phone_e164_key;
    else
      alter table public.user_contacts
        add constraint user_contacts_phone_e164_key unique (phone_e164);
    end if;
  end if;
end;
$$;

create unique index if not exists user_contacts_telegram_chat_id_unique
  on public.user_contacts (telegram_chat_id)
  where telegram_chat_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_user_id_unique'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'user_contacts_user_id_unique'
        and c.relkind = 'i'
    ) then
      alter table public.user_contacts
        add constraint user_contacts_user_id_unique
        unique using index user_contacts_user_id_unique;
    else
      alter table public.user_contacts
        add constraint user_contacts_user_id_unique unique (user_id);
    end if;
  end if;
end;
$$;

-- Replace the old merge RPC so future channel-binding merges remain compatible
-- with UNIQUE(user_id), UNIQUE(phone_e164), and UNIQUE(telegram_chat_id).
create or replace function public.merge_user_contacts(
  p_primary_contact_id uuid,
  p_secondary_contact_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  primary_row public.user_contacts%rowtype;
  secondary_row public.user_contacts%rowtype;
  moved_expenses int := 0;
  inserted_budgets int := 0;
  deleted_budgets int := 0;
  inserted_categories int := 0;
  deleted_categories int := 0;
begin
  if p_primary_contact_id is null or p_secondary_contact_id is null then
    return jsonb_build_object('success', false, 'error', 'contact ids are required');
  end if;

  if p_primary_contact_id = p_secondary_contact_id then
    return jsonb_build_object('success', true, 'message', 'same contact id; no-op');
  end if;

  select * into primary_row
  from public.user_contacts
  where id = p_primary_contact_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'primary contact not found');
  end if;

  select * into secondary_row
  from public.user_contacts
  where id = p_secondary_contact_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'secondary contact not found');
  end if;

  if primary_row.user_id is not null
     and secondary_row.user_id is not null
     and primary_row.user_id <> secondary_row.user_id then
    return jsonb_build_object(
      'success', false,
      'error', 'cannot merge contacts with different user_id'
    );
  end if;

  select count(*) into deleted_budgets
  from public.daily_budgets
  where contact_id in (p_primary_contact_id, p_secondary_contact_id);

  with deleted as (
    delete from public.daily_budgets db
    where db.contact_id in (p_primary_contact_id, p_secondary_contact_id)
    returning
      p_primary_contact_id as contact_id,
      db.date,
      db.amount_cents,
      db.currency,
      db.created_at,
      db.updated_at,
      db.id
  ), ranked as (
    select
      contact_id,
      date,
      amount_cents,
      currency,
      created_at,
      updated_at,
      row_number() over (
        partition by contact_id, date, currency
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as row_number
    from deleted
  )
  insert into public.daily_budgets (contact_id, date, amount_cents, currency, created_at, updated_at)
  select contact_id, date, amount_cents, currency, created_at, updated_at
  from ranked
  where row_number = 1;
  get diagnostics inserted_budgets = row_count;

  select count(*) into deleted_categories
  from public.expense_categories
  where contact_id in (p_primary_contact_id, p_secondary_contact_id);

  with deleted as (
    delete from public.expense_categories ec
    where ec.contact_id in (p_primary_contact_id, p_secondary_contact_id)
    returning
      p_primary_contact_id as contact_id,
      ec.name,
      ec.is_default,
      ec.created_at,
      ec.updated_at,
      ec.id
  ), ranked as (
    select
      contact_id,
      name,
      is_default,
      created_at,
      updated_at,
      row_number() over (
        partition by contact_id, name
        order by created_at desc nulls last, updated_at desc nulls last, id desc
      ) as row_number
    from deleted
  )
  insert into public.expense_categories (contact_id, name, is_default, created_at, updated_at)
  select contact_id, name, is_default, created_at, updated_at
  from ranked
  where row_number = 1;
  get diagnostics inserted_categories = row_count;

  update public.expenses
  set contact_id = p_primary_contact_id
  where contact_id = p_secondary_contact_id;
  get diagnostics moved_expenses = row_count;

  -- Clear unique fields on the secondary row before copying those values to
  -- the primary row. This avoids transient unique constraint violations.
  update public.user_contacts
  set
    user_id = null,
    phone_e164 = null,
    telegram_chat_id = null
  where id = p_secondary_contact_id;

  update public.user_contacts
  set
    phone_e164 = (
      select value from (values
        (primary_row.phone_e164, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.phone_e164, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    whatsapp_user_id = (
      select value from (values
        (primary_row.whatsapp_user_id, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.whatsapp_user_id, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    telegram_user_id = (
      select value from (values
        (primary_row.telegram_user_id, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.telegram_user_id, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    telegram_chat_id = (
      select value from (values
        (primary_row.telegram_chat_id, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.telegram_chat_id, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    user_id = (
      select value from (values
        (primary_row.user_id, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.user_id, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    verified = (
      select value from (values
        (primary_row.verified, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.verified, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    preferred_currency = (
      select value from (values
        (primary_row.preferred_currency, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.preferred_currency, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    preferred_language = (
      select value from (values
        (primary_row.preferred_language, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.preferred_language, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    preferred_timezone = (
      select value from (values
        (primary_row.preferred_timezone, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.preferred_timezone, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    platform = (
      select value from (values
        (primary_row.platform, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.platform, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    wallet_capture_enabled = (
      select value from (values
        (primary_row.wallet_capture_enabled, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.wallet_capture_enabled, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    email_import_enabled = (
      select value from (values
        (primary_row.email_import_enabled, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.email_import_enabled, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    email_import_is_portfolio = (
      select value from (values
        (primary_row.email_import_is_portfolio, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.email_import_is_portfolio, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    email_import_household_id = (
      select value from (values
        (primary_row.email_import_household_id, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.email_import_household_id, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    email_import_account_id = (
      select value from (values
        (primary_row.email_import_account_id, primary_row.created_at, primary_row.updated_at, primary_row.id),
        (secondary_row.email_import_account_id, secondary_row.created_at, secondary_row.updated_at, secondary_row.id)
      ) as candidates(value, created_at, updated_at, id)
      where value is not null
      order by created_at desc nulls last, updated_at desc nulls last, id desc
      limit 1
    ),
    updated_at = now()
  where id = p_primary_contact_id;

  delete from public.user_contacts
  where id = p_secondary_contact_id;

  return jsonb_build_object(
    'success', true,
    'primary_contact_id', p_primary_contact_id,
    'secondary_contact_id', p_secondary_contact_id,
    'moved', jsonb_build_object(
      'expenses', moved_expenses,
      'budgets_inserted_or_updated', inserted_budgets,
      'budgets_deleted', deleted_budgets,
      'categories_inserted_or_updated', inserted_categories,
      'categories_deleted', deleted_categories
    )
  );
exception
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.merge_user_contacts(uuid, uuid) from public;
revoke all on function public.merge_user_contacts(uuid, uuid) from anon;
grant execute on function public.merge_user_contacts(uuid, uuid) to service_role;

commit;
