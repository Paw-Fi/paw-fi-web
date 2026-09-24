-- Merchant identity is non-structural expense data. Keep it in the same
-- transaction as household split commits so callers never need a partial
-- post-commit update.
create or replace function public.households_apply_expense_patch_v3(
  p_expense_id uuid,
  p_expense_patch jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patch jsonb := coalesce(p_expense_patch, '{}'::jsonb);
  v_patched_expense_id uuid;
begin
  if jsonb_typeof(v_patch) <> 'object' then
    raise exception 'households_apply_expense_patch_v3: expense patch must be an object';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(v_patch) patch_key(key)
    where patch_key.key not in (
      'category',
      'raw_text',
      'merchant',
      'merchant_id',
      'merchant_structured_name',
      'date',
      'created_at',
      'receipt_image_url',
      'is_recurring',
      'recurrence_rule',
      'source',
      'user_overrides',
      'updated_at'
    )
  ) then
    raise exception 'households_apply_expense_patch_v3: patch contains unsupported or structural fields';
  end if;

  if v_patch ? 'category'
    and jsonb_typeof(v_patch -> 'category') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: category must be text';
  end if;
  if v_patch ? 'raw_text'
    and jsonb_typeof(v_patch -> 'raw_text') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: raw_text must be text or null';
  end if;
  if v_patch ? 'merchant'
    and jsonb_typeof(v_patch -> 'merchant') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: merchant must be text or null';
  end if;
  if v_patch ? 'merchant_id'
    and jsonb_typeof(v_patch -> 'merchant_id') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: merchant_id must be uuid text or null';
  end if;
  if v_patch ? 'merchant_structured_name'
    and jsonb_typeof(v_patch -> 'merchant_structured_name') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: merchant_structured_name must be text or null';
  end if;
  if v_patch ? 'date'
    and jsonb_typeof(v_patch -> 'date') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: date must be text';
  end if;
  if v_patch ? 'created_at'
    and jsonb_typeof(v_patch -> 'created_at') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: created_at must be text';
  end if;
  if v_patch ? 'receipt_image_url'
    and jsonb_typeof(v_patch -> 'receipt_image_url') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: receipt_image_url must be text or null';
  end if;
  if v_patch ? 'is_recurring'
    and jsonb_typeof(v_patch -> 'is_recurring') <> 'boolean'
  then
    raise exception 'households_apply_expense_patch_v3: is_recurring must be boolean';
  end if;
  if v_patch ? 'recurrence_rule'
    and jsonb_typeof(v_patch -> 'recurrence_rule') not in ('object', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: recurrence_rule must be an object or null';
  end if;
  if v_patch ? 'user_overrides'
    and jsonb_typeof(v_patch -> 'user_overrides') not in ('object', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: user_overrides must be an object or null';
  end if;
  if v_patch ? 'source'
    and jsonb_typeof(v_patch -> 'source') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: source must be text';
  end if;
  if v_patch ? 'updated_at'
    and jsonb_typeof(v_patch -> 'updated_at') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: updated_at must be text';
  end if;

  -- Validate typed scalar strings before the update so every invalid patch
  -- fails before any field is persisted.
  if v_patch ? 'merchant_id'
    and jsonb_typeof(v_patch -> 'merchant_id') <> 'null'
  then
    perform (v_patch ->> 'merchant_id')::uuid;
  end if;
  if v_patch ? 'date' then
    perform (v_patch ->> 'date')::date;
  end if;
  if v_patch ? 'created_at' then
    perform (v_patch ->> 'created_at')::timestamptz;
  end if;
  if v_patch ? 'updated_at' then
    perform (v_patch ->> 'updated_at')::timestamptz;
  end if;

  if v_patch = '{}'::jsonb then
    return;
  end if;

  update public.expenses expense
  set category = case
        when v_patch ? 'category' then v_patch ->> 'category'
        else expense.category
      end,
      raw_text = case
        when v_patch ? 'raw_text' then v_patch ->> 'raw_text'
        else expense.raw_text
      end,
      merchant = case
        when v_patch ? 'merchant' then v_patch ->> 'merchant'
        else expense.merchant
      end,
      merchant_id = case
        when v_patch ? 'merchant_id' then case
          when jsonb_typeof(v_patch -> 'merchant_id') = 'null' then null
          else (v_patch ->> 'merchant_id')::uuid
        end
        else expense.merchant_id
      end,
      merchant_structured_name = case
        when v_patch ? 'merchant_structured_name'
          then v_patch ->> 'merchant_structured_name'
        else expense.merchant_structured_name
      end,
      date = case
        when v_patch ? 'date' then (v_patch ->> 'date')::date
        else expense.date
      end,
      created_at = case
        when v_patch ? 'created_at'
          then (v_patch ->> 'created_at')::timestamptz
        else expense.created_at
      end,
      receipt_image_url = case
        when v_patch ? 'receipt_image_url'
          then v_patch ->> 'receipt_image_url'
        else expense.receipt_image_url
      end,
      is_recurring = case
        when v_patch ? 'is_recurring'
          then (v_patch ->> 'is_recurring')::boolean
        else expense.is_recurring
      end,
      recurrence_rule = case
        when v_patch ? 'recurrence_rule' then case
          when jsonb_typeof(v_patch -> 'recurrence_rule') = 'null' then null
          else v_patch -> 'recurrence_rule'
        end
        else expense.recurrence_rule
      end,
      source = case
        when v_patch ? 'source' then v_patch ->> 'source'
        else expense.source
      end,
      user_overrides = case
        when v_patch ? 'user_overrides' then case
          when jsonb_typeof(v_patch -> 'user_overrides') = 'null' then null
          else v_patch -> 'user_overrides'
        end
        else expense.user_overrides
      end,
      updated_at = case
        when v_patch ? 'updated_at'
          then (v_patch ->> 'updated_at')::timestamptz
        else clock_timestamp()
      end
  where expense.id = p_expense_id
    and expense.deleted_at is null
  returning expense.id into v_patched_expense_id;

  if v_patched_expense_id is null then
    raise exception 'households_apply_expense_patch_v3: active expense not found';
  end if;
end;
$$;

revoke all on function public.households_apply_expense_patch_v3(uuid, jsonb)
  from public, anon, authenticated, service_role;
