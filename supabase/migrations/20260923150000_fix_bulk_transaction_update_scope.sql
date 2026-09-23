create or replace function public.bulk_update_transactions(
  p_actor_user_id uuid,
  p_transaction_ids uuid[],
  p_household_id uuid,
  p_currencies text[],
  p_updates jsonb,
  p_descriptors_by_id jsonb default '{}'::jsonb
) returns setof public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_count integer;
  v_scoped_count integer;
  v_transaction_id uuid;
  v_descriptor text;
  v_updates public.expenses%rowtype;
  v_updated_rows public.expenses[];
  v_is_portfolio boolean := false;
begin
  v_expected_count := coalesce(array_length(p_transaction_ids, 1), 0);
  if v_expected_count = 0 or v_expected_count > 500 then
    raise exception 'A batch must contain 1 to 500 transactions';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object'
    or p_updates = '{}'::jsonb then
    raise exception 'updates must contain at least one field';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_updates) as key
    where key not in (
      'amount_cents',
      'category',
      'raw_text',
      'merchant',
      'merchant_id',
      'merchant_structured_name',
      'date',
      'created_at',
      'currency',
      'receipt_image_url',
      'is_recurring',
      'recurrence_rule',
      'source',
      'household_id',
      'account_id'
    )
  ) then
    raise exception 'updates contains an unsupported field';
  end if;

  if p_household_id is not null then
    select household.is_portfolio
      into v_is_portfolio
    from public.households household
    where household.id = p_household_id;
    if not found then
      raise exception 'Requested space was not found';
    end if;
    if not v_is_portfolio and not exists (
      select 1
      from public.household_members member
      where member.household_id = p_household_id
        and member.user_id = p_actor_user_id
    ) then
      raise exception 'You do not have permission to update this shared space';
    end if;
  end if;

  v_updates := jsonb_populate_record(null::public.expenses, p_updates);

  select count(*) into v_scoped_count
  from public.expenses
  where id = any(p_transaction_ids)
    and deleted_at is null
    and household_id is not distinct from p_household_id
    and (
      (p_household_id is not null and not v_is_portfolio)
      or user_id = p_actor_user_id
    )
    and (coalesce(array_length(p_currencies, 1), 0) = 0
      or upper(currency) = any(p_currencies));
  if v_scoped_count <> v_expected_count then
    raise exception 'One or more transactions are outside the requested scope';
  end if;

  with updated as (
    update public.expenses as expense
    set amount_cents = case when p_updates ? 'amount_cents' then v_updates.amount_cents else expense.amount_cents end,
        category = case when p_updates ? 'category' then v_updates.category else expense.category end,
        raw_text = case when p_updates ? 'raw_text' then v_updates.raw_text else expense.raw_text end,
        merchant = case when p_updates ? 'merchant' then v_updates.merchant else expense.merchant end,
        merchant_id = case when p_updates ? 'merchant_id' then v_updates.merchant_id else expense.merchant_id end,
        merchant_structured_name = case when p_updates ? 'merchant_structured_name' then v_updates.merchant_structured_name else expense.merchant_structured_name end,
        date = case when p_updates ? 'date' then v_updates.date else expense.date end,
        created_at = case when p_updates ? 'created_at' then v_updates.created_at else expense.created_at end,
        currency = case when p_updates ? 'currency' then v_updates.currency else expense.currency end,
        receipt_image_url = case when p_updates ? 'receipt_image_url' then v_updates.receipt_image_url else expense.receipt_image_url end,
        is_recurring = case when p_updates ? 'is_recurring' then v_updates.is_recurring else expense.is_recurring end,
        recurrence_rule = case when p_updates ? 'recurrence_rule' then v_updates.recurrence_rule else expense.recurrence_rule end,
        source = case when p_updates ? 'source' then v_updates.source else expense.source end,
        household_id = case when p_updates ? 'household_id' then v_updates.household_id else expense.household_id end,
        account_id = case when p_updates ? 'account_id' then v_updates.account_id else expense.account_id end,
        updated_at = now()
    where expense.id = any(p_transaction_ids)
      and expense.deleted_at is null
      and expense.household_id is not distinct from p_household_id
      and (
        (p_household_id is not null and not v_is_portfolio)
        or expense.user_id = p_actor_user_id
      )
      and (coalesce(array_length(p_currencies, 1), 0) = 0
        or upper(expense.currency) = any(p_currencies))
    returning expense.*
  )
  select array_agg(updated) into v_updated_rows from updated;

  if coalesce(array_length(v_updated_rows, 1), 0) <> v_expected_count then
    raise exception 'The batch changed before it could be updated';
  end if;

  if p_updates ? 'merchant_id' and v_updates.merchant_id is not null then
    foreach v_transaction_id in array p_transaction_ids loop
      v_descriptor := nullif(trim(p_descriptors_by_id ->> v_transaction_id::text), '');
      if v_descriptor is not null then
        perform public.record_confirmed_merchant_descriptor(
          p_actor_user_id,
          v_updates.merchant_id,
          v_descriptor,
          false
        );
      end if;
    end loop;
  end if;

  return query select unnest(v_updated_rows);
end;
$$;

revoke all on function public.bulk_update_transactions(uuid, uuid[], uuid, text[], jsonb, jsonb)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
