-- Merge two user_contacts rows into one (moves dependent rows).
--
-- Why:
-- Users can verify WhatsApp and Telegram in any order.
-- Historically, each channel could create its own user_contacts row, which
-- breaks WhatsApp lookups keyed by phone_e164 and can split contact_id-linked
-- budgeting data across rows.

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

  select * into primary_row from public.user_contacts where id = p_primary_contact_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'primary contact not found');
  end if;

  select * into secondary_row from public.user_contacts where id = p_secondary_contact_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'secondary contact not found');
  end if;

  -- Prevent merging incompatible identifiers.
  if primary_row.phone_e164 is not null
     and secondary_row.phone_e164 is not null
     and primary_row.phone_e164 <> secondary_row.phone_e164 then
    return jsonb_build_object(
      'success', false,
      'error', 'cannot merge contacts with different phone_e164'
    );
  end if;

  if primary_row.telegram_chat_id is not null
     and secondary_row.telegram_chat_id is not null
     and primary_row.telegram_chat_id <> secondary_row.telegram_chat_id then
    return jsonb_build_object(
      'success', false,
      'error', 'cannot merge contacts with different telegram_chat_id'
    );
  end if;

  -- Move budgets (dedupe on unique(contact_id,date,currency)).
  insert into public.daily_budgets (contact_id, date, amount_cents, currency, created_at, updated_at)
  select
    p_primary_contact_id,
    db.date,
    db.amount_cents,
    db.currency,
    db.created_at,
    db.updated_at
  from public.daily_budgets db
  where db.contact_id = p_secondary_contact_id
  on conflict (contact_id, date, currency)
  do update set
    amount_cents = excluded.amount_cents,
    updated_at = greatest(public.daily_budgets.updated_at, excluded.updated_at);
  get diagnostics inserted_budgets = row_count;

  delete from public.daily_budgets where contact_id = p_secondary_contact_id;
  get diagnostics deleted_budgets = row_count;

  -- Move categories (dedupe on unique(contact_id,name)).
  insert into public.expense_categories (contact_id, name, is_default, created_at, updated_at)
  select
    p_primary_contact_id,
    ec.name,
    ec.is_default,
    ec.created_at,
    ec.updated_at
  from public.expense_categories ec
  where ec.contact_id = p_secondary_contact_id
  on conflict (contact_id, name)
  do update set
    is_default = (public.expense_categories.is_default or excluded.is_default),
    updated_at = greatest(public.expense_categories.updated_at, excluded.updated_at);
  get diagnostics inserted_categories = row_count;

  delete from public.expense_categories where contact_id = p_secondary_contact_id;
  get diagnostics deleted_categories = row_count;

  -- Move expenses.
  update public.expenses
  set contact_id = p_primary_contact_id
  where contact_id = p_secondary_contact_id;
  get diagnostics moved_expenses = row_count;

  -- Merge identifier fields onto primary.
  update public.user_contacts
  set
    phone_e164 = coalesce(primary_row.phone_e164, secondary_row.phone_e164),
    whatsapp_user_id = coalesce(primary_row.whatsapp_user_id, secondary_row.whatsapp_user_id),
    telegram_user_id = coalesce(primary_row.telegram_user_id, secondary_row.telegram_user_id),
    telegram_chat_id = coalesce(primary_row.telegram_chat_id, secondary_row.telegram_chat_id),
    user_id = coalesce(primary_row.user_id, secondary_row.user_id),
    verified = (coalesce(primary_row.verified, false) or coalesce(secondary_row.verified, false)),
    preferred_currency = coalesce(primary_row.preferred_currency, secondary_row.preferred_currency),
    preferred_language = coalesce(primary_row.preferred_language, secondary_row.preferred_language),
    preferred_timezone = coalesce(primary_row.preferred_timezone, secondary_row.preferred_timezone),
    updated_at = now()
  where id = p_primary_contact_id;

  -- Delete the secondary contact row.
  delete from public.user_contacts where id = p_secondary_contact_id;

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

comment on function public.merge_user_contacts(uuid, uuid) is
  'Merges two user_contacts rows by moving dependent contact_id-linked rows (expenses, budgets, categories) and deleting the secondary row. Intended for channel binding flows (WhatsApp/Telegram).';
