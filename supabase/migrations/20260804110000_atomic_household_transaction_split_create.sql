-- A household transaction which requires a split must never expose its parent
-- before the split group and lines are committed.  The existing split writers
-- already validate and atomically link an existing parent; this wrapper moves
-- the parent insertion into that same PostgreSQL transaction.
create or replace function public.households_create_transaction_with_split_v1(
  p_actor_user_id uuid,
  p_expense jsonb,
  p_split_group_id uuid,
  p_household_id uuid,
  p_payer_user_id uuid,
  p_split_type text,
  p_currency text,
  p_total_amount_cents bigint,
  p_description text,
  p_lines jsonb,
  p_target_account_id uuid default null,
  p_is_recurring_template boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif((select auth.jwt() ->> 'role'), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_expense public.expenses%rowtype;
  v_parent_account_id uuid;
begin
  if v_role <> 'service_role' then
    raise exception 'households_create_transaction_with_split_v1: service role required';
  end if;
  if p_actor_user_id is null or p_split_group_id is null or p_household_id is null
    or p_payer_user_id is null then
    raise exception 'households_create_transaction_with_split_v1: identifiers are required';
  end if;
  if p_expense is null or jsonb_typeof(p_expense) <> 'object' then
    raise exception 'households_create_transaction_with_split_v1: parent payload is required';
  end if;
  if p_total_amount_cents is null or p_total_amount_cents <= 0
    or nullif(btrim(p_currency), '') is null
    or p_split_type not in ('equal', 'amount', 'percentage', 'shares')
    or p_lines is null
    or jsonb_typeof(p_lines) <> 'array'
    or jsonb_array_length(p_lines) = 0 then
    raise exception 'households_create_transaction_with_split_v1: valid split intent is required';
  end if;
  if nullif(p_expense ->> 'id', '') is null
    or nullif(p_expense ->> 'user_id', '') is null
    or nullif(p_expense ->> 'household_id', '') is null then
    raise exception 'households_create_transaction_with_split_v1: parent identifiers are required';
  end if;
  if (p_expense ->> 'user_id')::uuid is distinct from p_actor_user_id
    or (p_expense ->> 'household_id')::uuid is distinct from p_household_id then
    raise exception 'households_create_transaction_with_split_v1: parent scope mismatch';
  end if;
  if nullif(p_expense ->> 'split_group_id', '') is not null then
    raise exception 'households_create_transaction_with_split_v1: parent must start unsplit';
  end if;
  if (p_expense ->> 'id')::uuid is null
    or (p_expense ->> 'amount_cents')::bigint is distinct from p_total_amount_cents
    or upper(coalesce(p_expense ->> 'currency', '')) is distinct from upper(p_currency) then
    raise exception 'households_create_transaction_with_split_v1: parent amount or currency mismatch';
  end if;

  v_parent_account_id := nullif(p_expense ->> 'account_id', '')::uuid;
  if p_target_account_id is distinct from v_parent_account_id then
    raise exception 'households_create_transaction_with_split_v1: target account mismatch';
  end if;

  -- Keep this list deliberately narrow.  jsonb_populate_record writes NULL
  -- into every omitted field, which bypasses database defaults and made new
  -- household rows private/incomplete as the expenses schema evolved.
  insert into public.expenses (
    id,
    contact_id,
    user_id,
    type,
    amount_cents,
    category,
    date,
    raw_text,
    merchant,
    currency,
    breakdown,
    receipt_image_url,
    created_at,
    is_recurring,
    recurrence_rule,
    household_id,
    account_id,
    idempotency_key,
    wallet_capture_idempotency_key,
    import_request_key,
    import_semantic_key,
    owner_type,
    privacy_scope,
    attachments,
    source,
    fx_rate,
    base_currency
  )
  values (
    (p_expense ->> 'id')::uuid,
    nullif(p_expense ->> 'contact_id', '')::uuid,
    (p_expense ->> 'user_id')::uuid,
    coalesce(nullif(p_expense ->> 'type', ''), 'expense')::public.transaction_type,
    (p_expense ->> 'amount_cents')::bigint,
    nullif(p_expense ->> 'category', ''),
    nullif(p_expense ->> 'date', '')::date,
    coalesce(p_expense ->> 'raw_text', ''),
    nullif(p_expense ->> 'merchant', ''),
    upper(p_expense ->> 'currency'),
    case
      when p_expense ? 'breakdown' and jsonb_typeof(p_expense -> 'breakdown') <> 'null'
        then p_expense -> 'breakdown'
      else null
    end,
    nullif(p_expense ->> 'receipt_image_url', ''),
    coalesce(
      nullif(p_expense ->> 'created_at', '')::timestamptz,
      clock_timestamp()
    ),
    coalesce(nullif(p_expense ->> 'is_recurring', '')::boolean, false),
    case
      when p_expense ? 'recurrence_rule'
        and jsonb_typeof(p_expense -> 'recurrence_rule') <> 'null'
        then p_expense -> 'recurrence_rule'
      else null
    end,
    (p_expense ->> 'household_id')::uuid,
    v_parent_account_id,
    nullif(p_expense ->> 'idempotency_key', ''),
    nullif(p_expense ->> 'wallet_capture_idempotency_key', ''),
    nullif(p_expense ->> 'import_request_key', ''),
    nullif(p_expense ->> 'import_semantic_key', ''),
    coalesce(nullif(p_expense ->> 'owner_type', ''), 'me')::public.transaction_owner,
    coalesce(nullif(p_expense ->> 'privacy_scope', ''), 'full')::public.privacy_scope,
    case
      when p_expense ? 'attachments'
        and jsonb_typeof(p_expense -> 'attachments') = 'array'
        then p_expense -> 'attachments'
      else '[]'::jsonb
    end,
    nullif(p_expense ->> 'source', ''),
    nullif(p_expense ->> 'fx_rate', '')::numeric,
    nullif(upper(p_expense ->> 'base_currency'), '')
  )
  returning * into v_expense;

  if p_is_recurring_template then
    perform public.households_commit_recurring_template_split_v1(
      p_actor_user_id,
      v_expense.id,
      p_split_group_id,
      p_household_id,
      p_payer_user_id,
      p_split_type,
      upper(p_currency),
      p_total_amount_cents,
      p_description,
      p_lines,
      jsonb_build_object(
        'household_id', p_household_id,
        'currency', upper(p_currency),
        'amount_cents', p_total_amount_cents,
        'split_group_id', null,
        'account_id', v_parent_account_id
      ),
      p_target_account_id,
      '{}'::jsonb
    );
  else
    perform public.households_commit_expense_split_write_v3(
      p_actor_user_id,
      v_expense.id,
      p_split_group_id,
      p_household_id,
      p_payer_user_id,
      p_split_type,
      upper(p_currency),
      p_total_amount_cents,
      p_description,
      p_lines,
      jsonb_build_object(
        'household_id', p_household_id,
        'currency', upper(p_currency),
        'amount_cents', p_total_amount_cents,
        'split_group_id', null,
        'account_id', v_parent_account_id
      ),
      null,
      p_target_account_id
    );
  end if;

  select * into strict v_expense
  from public.expenses
  where id = v_expense.id and deleted_at is null;

  return jsonb_build_object(
    'expense', to_jsonb(v_expense),
    'split_group_id', p_split_group_id
  );
end;
$$;

revoke all on function public.households_create_transaction_with_split_v1(
  uuid, jsonb, uuid, uuid, uuid, text, text, bigint, text, jsonb, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.households_create_transaction_with_split_v1(
  uuid, jsonb, uuid, uuid, uuid, text, text, bigint, text, jsonb, uuid, boolean
) to service_role;
