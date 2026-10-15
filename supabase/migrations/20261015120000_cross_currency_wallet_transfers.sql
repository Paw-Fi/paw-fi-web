-- amount_cents/currency remain the source principal. Nullable destination columns
-- deliberately preserve the legacy fallback without rewriting historical rows.
alter table public.account_transfers
  add column if not exists to_amount_cents bigint,
  add column if not exists to_currency text,
  add column if not exists exchange_rate numeric,
  add column if not exists fee_amount_cents bigint not null default 0,
  add column if not exists fee_expense_id uuid,
  add column if not exists transfer_contract_version integer not null default 1;
alter table public.expenses add column if not exists transfer_fee_transfer_id uuid;

-- No parent FK: a deleted transfer's expense delta tombstone must retain its
-- owning UUID. The fee UUID is reserved on the parent even while its fee is zero.
create unique index if not exists expenses_transfer_fee_owner_v2
  on public.expenses(transfer_fee_transfer_id) where transfer_fee_transfer_id is not null;
create unique index if not exists account_transfers_fee_expense_v2
  on public.account_transfers(fee_expense_id) where fee_expense_id is not null;
alter table public.account_transfers add constraint account_transfers_legs_v2 check (
  coalesce(to_amount_cents, amount_cents) > 0
  and coalesce(to_currency, currency) ~ '^[A-Z]{3}$'
  and fee_amount_cents >= 0 and transfer_contract_version in (1,2)
  and (exchange_rate is null or (exchange_rate > 0 and exchange_rate < 'Infinity'::numeric))
  and (transfer_contract_version = 2 or (
    coalesce(to_currency,currency) = currency
    and coalesce(to_amount_cents,amount_cents) = amount_cents
    and coalesce(exchange_rate,1) = 1 and fee_amount_cents = 0))
  and (transfer_contract_version <> 2 or (
    to_amount_cents is not null and to_currency is not null and exchange_rate is not null))
  and ((coalesce(to_currency,currency) = currency
    and coalesce(to_amount_cents,amount_cents) = amount_cents and coalesce(exchange_rate,1) = 1)
    or (coalesce(to_currency,currency) <> currency
      and round(amount_cents::numeric * exchange_rate) = to_amount_cents))
);

-- Service-only request receipts survive edits and deletion. Replaying the
-- original create returns current canonical data, never resurrects a deletion.
create table public.wallet_transfer_create_receipts_v2 (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  client_record_id text not null,
  transfer_id uuid not null,
  payload jsonb not null,
  primary key(actor_user_id,client_record_id)
);
revoke all on public.wallet_transfer_create_receipts_v2
  from public, anon, authenticated, service_role;
alter table public.wallet_transfer_create_receipts_v2 enable row level security;

create or replace function public.ensure_account_transfer_currency()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
begin
  new.currency := upper(btrim(new.currency));
  new.to_currency := upper(btrim(new.to_currency));
  select * into v_from from public.accounts where id = new.from_account_id;
  select * into v_to from public.accounts where id = new.to_account_id;
  if v_from.id is null or v_to.id is null or v_from.is_archived or v_to.is_archived then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;
  if new.currency is distinct from v_from.currency
    or coalesce(new.to_currency,new.currency) is distinct from v_to.currency
    or v_from.household_id is distinct from v_to.household_id
    or new.household_id is distinct from v_from.household_id
    or (v_from.household_id is null and v_from.user_id <> v_to.user_id) then
    raise exception 'VALIDATION_ERROR' using errcode = '23514';
  end if;
  if auth.uid() is not null and (
    (v_from.household_id is null and v_from.user_id <> auth.uid())
    or (v_from.household_id is not null and not exists (
      select 1 from public.household_members where household_id=v_from.household_id and user_id=auth.uid()
    ))) then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trigger_ensure_account_transfer_currency on public.account_transfers;
create trigger trigger_ensure_account_transfer_currency before insert or update on public.account_transfers
  for each row execute function public.ensure_account_transfer_currency();

-- Deferred constraints validate the final atomic state. They also preserve the
-- existing wallet/account reset transactions, which remove both records. A
-- separate HTTP financial fee write cannot commit against an unchanged parent.
create or replace function public.assert_wallet_transfer_fee_v2(p_transfer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_transfer public.account_transfers%rowtype;
  v_fee public.expenses%rowtype;
begin
  if p_transfer_id is null then return; end if;
  select * into v_transfer from public.account_transfers where id=p_transfer_id for share;
  if not found then
    if exists(select 1 from public.expenses where transfer_fee_transfer_id=p_transfer_id and deleted_at is null) then
      raise exception 'TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION' using errcode='23514';
    end if;
    return;
  end if;
  if v_transfer.fee_expense_id is null then
    if v_transfer.fee_amount_cents>0 or exists(select 1 from public.expenses where transfer_fee_transfer_id=p_transfer_id) then
      raise exception 'TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION' using errcode='23514';
    end if;
    return;
  end if;
  select * into v_fee from public.expenses where id=v_transfer.fee_expense_id for share;
  if not found or v_fee.transfer_fee_transfer_id is distinct from p_transfer_id
    or v_fee.user_id is distinct from v_transfer.created_by_user_id
    or v_fee.household_id is distinct from v_transfer.household_id then
    raise exception 'TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION' using errcode='23514';
  end if;
  if v_transfer.fee_amount_cents=0 then
    if v_fee.deleted_at is null then
      raise exception 'TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION' using errcode='23514';
    end if;
  elsif v_fee.deleted_at is not null or v_fee.amount_cents is distinct from v_transfer.fee_amount_cents
    or v_fee.currency is distinct from v_transfer.currency or v_fee.account_id is distinct from v_transfer.from_account_id
    or v_fee.date is distinct from v_transfer.date or v_fee.type::text is distinct from 'expense'
    or v_fee.privacy_scope::text is distinct from 'full' or v_fee.payer_user_id is distinct from v_transfer.created_by_user_id
    or v_fee.split_group_id is not null or v_fee.is_recurring is distinct from false or v_fee.parent_recurring_id is not null
    or v_fee.recurrence_rule is not null or v_fee.provider is not null or v_fee.bank_account_id is not null
    or v_fee.analytics_class is distinct from 'consumer_spend' or v_fee.analytics_direction is distinct from 'out'
    or v_fee.analytics_spending_multiplier is distinct from 1 or v_fee.analytics_is_final is distinct from true
    or v_fee.analytics_counts_toward_income is distinct from false then
    raise exception 'TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION' using errcode='23514';
  end if;
end;
$$;

create or replace function public.guard_wallet_transfer_fee_v2()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name='account_transfers' then
    if tg_op<>'INSERT' then perform public.assert_wallet_transfer_fee_v2(old.id); end if;
    if tg_op<>'DELETE' then perform public.assert_wallet_transfer_fee_v2(new.id); end if;
  else
    if tg_op='UPDATE' and old.transfer_fee_transfer_id is not null and (
      new.id is distinct from old.id or new.transfer_fee_transfer_id is distinct from old.transfer_fee_transfer_id) then
      raise exception 'TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION' using errcode='23514';
    end if;
    if tg_op<>'INSERT' then perform public.assert_wallet_transfer_fee_v2(old.transfer_fee_transfer_id); end if;
    if tg_op<>'DELETE' then perform public.assert_wallet_transfer_fee_v2(new.transfer_fee_transfer_id); end if;
  end if;
  return null;
end;
$$;
create constraint trigger guard_wallet_transfer_fee_v2 after insert or update or delete on public.expenses
  deferrable initially deferred for each row execute function public.guard_wallet_transfer_fee_v2();
create constraint trigger guard_wallet_transfer_parent_v2 after insert or update or delete on public.account_transfers
  deferrable initially deferred
  for each row execute function public.guard_wallet_transfer_fee_v2();

create or replace function public.get_wallet_transfer_record_v2(transfer_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(t) || jsonb_build_object(
    'to_amount_cents',coalesce(t.to_amount_cents,t.amount_cents),
    'to_currency',coalesce(t.to_currency,t.currency),
    'exchange_rate',coalesce(t.exchange_rate,1),
    'fee_expense',case when t.fee_amount_cents > 0 then to_jsonb(e) else null end)
  from public.account_transfers t
  left join public.expenses e on e.id=t.fee_expense_id
    and e.transfer_fee_transfer_id=t.id and e.deleted_at is null
  where t.id=transfer_id;
$$;

create or replace function public.mutate_wallet_transfer_v2(
  p_actor_user_id uuid, p_operation text, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.account_transfers%rowtype;
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_id uuid;
  v_from_id uuid;
  v_to_id uuid;
  v_fee_id uuid;
  v_amount bigint;
  v_to_amount bigint;
  v_fee bigint;
  v_rate numeric;
  v_currency text;
  v_to_currency text;
  v_version integer;
  v_date date;
  v_time time;
  v_note text;
  v_client text;
  v_normalized jsonb;
  v_receipt public.wallet_transfer_create_receipts_v2%rowtype;
  v_result jsonb;
begin
  if p_actor_user_id is null or not exists(select 1 from auth.users where id=p_actor_user_id)
    or (auth.uid() is not null and auth.uid() <> p_actor_user_id) then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  if p_operation is null or p_operation not in ('create','update','delete')
    or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  if p_operation <> 'create' then
    v_id := (p_payload->>'transferId')::uuid;
    select * into v_existing from public.account_transfers where id=v_id for update;
    if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
    if v_existing.created_by_user_id <> p_actor_user_id or (v_existing.household_id is not null
      and not exists(select 1 from public.household_members
        where household_id=v_existing.household_id and user_id=p_actor_user_id)) then
      raise exception 'UNAUTHORIZED' using errcode = '42501';
    end if;
    v_fee_id := v_existing.fee_expense_id;
    if p_operation = 'delete' then
      update public.expenses set deleted_at=clock_timestamp(),updated_at=clock_timestamp()
        where transfer_fee_transfer_id=v_id and deleted_at is null;
      -- Return the canonical deleted fee as well as all parent fields.
      v_result := public.get_wallet_transfer_record_v2(v_id) || jsonb_build_object('fee_expense',
        (select to_jsonb(e) from public.expenses e where e.id=v_fee_id));
      delete from public.account_transfers where id=v_id;
      return v_result;
    end if;
    if coalesce(p_payload->>'transferContractVersion','1') <> '2'
      and (v_existing.transfer_contract_version=2 or v_existing.fee_amount_cents>0
        or coalesce(v_existing.to_currency,v_existing.currency)<>v_existing.currency
        or coalesce(v_existing.to_amount_cents,v_existing.amount_cents)<>v_existing.amount_cents) then
      raise exception 'TRANSFER_CLIENT_UPDATE_REQUIRED' using errcode = '22023';
    end if;
  end if;

  -- Validate the normalized machine contract before casts. Decimal arithmetic
  -- stays in NUMERIC throughout: rounded target compatibility, not a ratio test.
  v_version := coalesce(p_payload->>'transferContractVersion','1')::integer;
  if v_version not in (1,2) or coalesce(p_payload->>'amountCents','') !~ '^[0-9]+$'
    or (v_version=2 and (
      coalesce(p_payload->>'toAmountCents','') !~ '^[0-9]+$'
      or coalesce(p_payload->>'feeAmountCents','0') !~ '^[0-9]+$'
      or coalesce(p_payload->>'exchangeRate','') !~ '^[+]?[0-9]+([.][0-9]+)?([eE][+-]?[0-9]+)?$'))
    or (v_version=1 and (p_payload ?| array['toAmountCents','toCurrency','exchangeRate','feeAmountCents'])) then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  v_amount := (p_payload->>'amountCents')::bigint;
  v_currency := upper(btrim(p_payload->>'currency'));
  v_to_amount := case when v_version=2 then (p_payload->>'toAmountCents')::bigint else v_amount end;
  v_to_currency := case when v_version=2 then upper(btrim(p_payload->>'toCurrency')) else v_currency end;
  v_rate := case when v_version=2 then (p_payload->>'exchangeRate')::numeric else 1 end;
  v_fee := case when v_version=2 then coalesce(p_payload->>'feeAmountCents','0')::bigint else 0 end;
  if v_amount<=0 or v_to_amount<=0 or v_fee<0 or v_rate<=0 or v_rate>='Infinity'::numeric
    or v_currency is null or v_currency !~ '^[A-Z]{3}$'
    or v_to_currency is null or v_to_currency !~ '^[A-Z]{3}$'
    or (v_currency=v_to_currency and (v_amount<>v_to_amount or v_rate<>1))
    or (v_currency<>v_to_currency and round(v_amount::numeric*v_rate)<>v_to_amount) then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  if coalesce(p_payload->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or (p_payload->>'time' is not null and p_payload->>'time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$') then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  v_date := (p_payload->>'date')::date;
  v_time := case when p_operation='update' and not p_payload ? 'time' then v_existing.time
    else (p_payload->>'time')::time end;
  v_note := nullif(btrim(p_payload->>'note'),'');
  v_from_id := (p_payload->>'fromAccountId')::uuid;
  v_to_id := (p_payload->>'toAccountId')::uuid;
  -- Same lock order for both wallets, including reversed transfers. FOR SHARE
  -- also fences archive/currency/Space changes until the transaction commits.
  perform 1 from public.accounts where id in (v_from_id,v_to_id) order by id for share;
  select * into v_from from public.accounts where id=v_from_id;
  select * into v_to from public.accounts where id=v_to_id;
  if v_from.id is null or v_to.id is null or v_from.is_archived or v_to.is_archived then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if (v_from.household_id is null and (v_from.user_id<>p_actor_user_id or v_to.user_id<>p_actor_user_id))
    or (v_from.household_id is not null and not exists(select 1 from public.household_members
      where household_id=v_from.household_id and user_id=p_actor_user_id)) then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  if v_from_id=v_to_id or v_from.household_id is distinct from v_to.household_id
    or v_from.currency<>v_currency or v_to.currency<>v_to_currency
    or (p_operation='update' and v_existing.household_id is distinct from v_from.household_id) then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  if v_from.household_id is not null then
    perform 1 from public.household_members where household_id=v_from.household_id
      and user_id=p_actor_user_id for share;
    if not found then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  end if;
  v_normalized := jsonb_build_object('fromAccountId',v_from_id,'toAccountId',v_to_id,
    'amountCents',v_amount,'currency',v_currency,'toAmountCents',v_to_amount,'toCurrency',v_to_currency,
    'exchangeRate',v_rate,'feeAmountCents',v_fee,'transferContractVersion',v_version,
    'date',v_date,'time',v_time,'note',v_note);
  if p_operation='create' then
    v_client := nullif(btrim(p_payload->>'clientRecordId'),'');
    if (p_payload ? 'clientRecordId' and v_client is null) or length(v_client)>128 then
      raise exception 'VALIDATION_ERROR' using errcode = '22023';
    end if;
    if v_client is not null then
      perform pg_advisory_xact_lock(hashtextextended(p_actor_user_id::text || ':' || v_client,0));
      select * into v_receipt from public.wallet_transfer_create_receipts_v2
        where actor_user_id=p_actor_user_id and client_record_id=v_client;
      if found then
        if v_receipt.payload<>v_normalized then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
        v_result := public.get_wallet_transfer_record_v2(v_receipt.transfer_id);
        if v_result is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
        return v_result;
      end if;
      -- Existing pre-V2 client keys remain valid on exact legacy retries.
      select * into v_existing from public.account_transfers
        where created_by_user_id=p_actor_user_id and client_record_id=v_client for update;
      if found then
        if v_normalized <> jsonb_build_object('fromAccountId',v_existing.from_account_id,'toAccountId',v_existing.to_account_id,
          'amountCents',v_existing.amount_cents,'currency',v_existing.currency,
          'toAmountCents',coalesce(v_existing.to_amount_cents,v_existing.amount_cents),
          'toCurrency',coalesce(v_existing.to_currency,v_existing.currency),'exchangeRate',coalesce(v_existing.exchange_rate,1),
          'feeAmountCents',v_existing.fee_amount_cents,'transferContractVersion',v_existing.transfer_contract_version,
          'date',v_existing.date,'time',v_existing.time,'note',v_existing.note) then
          raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505';
        end if;
        return public.get_wallet_transfer_record_v2(v_existing.id);
      end if;
    end if;
    v_id := gen_random_uuid();
  end if;
  if v_fee>0 and v_fee_id is null then v_fee_id:=gen_random_uuid(); end if;
  if p_operation='create' then
    insert into public.account_transfers(id,from_account_id,to_account_id,amount_cents,currency,
      to_amount_cents,to_currency,exchange_rate,fee_amount_cents,fee_expense_id,transfer_contract_version,
      date,time,note,created_by_user_id,household_id,client_record_id)
    values(v_id,v_from_id,v_to_id,v_amount,v_currency,v_to_amount,v_to_currency,v_rate,v_fee,v_fee_id,
      v_version,v_date,v_time,v_note,p_actor_user_id,v_from.household_id,v_client);
    if v_client is not null then
      insert into public.wallet_transfer_create_receipts_v2 values(p_actor_user_id,v_client,v_id,v_normalized);
    end if;
  else
    update public.account_transfers set from_account_id=v_from_id,to_account_id=v_to_id,
      amount_cents=v_amount,currency=v_currency,to_amount_cents=v_to_amount,to_currency=v_to_currency,
      exchange_rate=v_rate,fee_amount_cents=v_fee,fee_expense_id=v_fee_id,transfer_contract_version=v_version,
      date=v_date,time=v_time,note=v_note,updated_at=clock_timestamp() where id=v_id;
  end if;
  if v_fee>0 then
    insert into public.expenses(id,user_id,household_id,account_id,amount_cents,currency,date,
      type,category,privacy_scope,payer_user_id,is_recurring,transfer_fee_transfer_id)
    values(v_fee_id,p_actor_user_id,v_from.household_id,v_from_id,v_fee,v_currency,v_date,
      'expense','bank fees','full',p_actor_user_id,false,v_id)
    on conflict(id) do update set amount_cents=excluded.amount_cents,currency=excluded.currency,
      account_id=excluded.account_id,date=excluded.date,deleted_at=null,updated_at=clock_timestamp();
  else
    update public.expenses set deleted_at=clock_timestamp(),updated_at=clock_timestamp()
      where id=v_fee_id and deleted_at is null;
  end if;
  return public.get_wallet_transfer_record_v2(v_id);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
  raise exception 'VALIDATION_ERROR' using errcode='22023';
end;
$$;

revoke all on function public.ensure_account_transfer_currency(), public.assert_wallet_transfer_fee_v2(uuid), public.guard_wallet_transfer_fee_v2(),
  public.get_wallet_transfer_record_v2(uuid), public.mutate_wallet_transfer_v2(uuid,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.get_wallet_transfer_record_v2(uuid), public.mutate_wallet_transfer_v2(uuid,text,jsonb)
  to service_role;
notify pgrst, 'reload schema';
