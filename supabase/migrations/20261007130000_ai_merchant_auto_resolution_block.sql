-- Per-row AI abstention, not a descriptor-wide suppression. No historical writes.
-- Preserve the established split creation verbatim, but commit future merchant
-- metadata in that same transaction before any background worker can see it.
alter function public.households_create_transaction_with_split_v1(
  uuid, jsonb, uuid, uuid, uuid, text, text, bigint, text, jsonb, uuid, boolean
) rename to households_create_transaction_with_split_without_merchant_metadata_v1;

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
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_expense_id uuid;
  v_expense public.expenses%rowtype;
begin
  v_result := public.households_create_transaction_with_split_without_merchant_metadata_v1(
    p_actor_user_id, p_expense, p_split_group_id, p_household_id,
    p_payer_user_id, p_split_type, p_currency, p_total_amount_cents,
    p_description, p_lines, p_target_account_id, p_is_recurring_template
  );
  v_expense_id := (v_result -> 'expense' ->> 'id')::uuid;
  update public.expenses
  set merchant_id = case when p_expense ? 'merchant_id'
        then nullif(p_expense ->> 'merchant_id', '')::uuid else merchant_id end,
      merchant_structured_name = case when p_expense ? 'merchant_structured_name'
        then nullif(p_expense ->> 'merchant_structured_name', '') else merchant_structured_name end,
      user_overrides = coalesce(user_overrides, '{}'::jsonb) || case
        when jsonb_typeof(p_expense -> 'user_overrides') = 'object'
        then p_expense -> 'user_overrides' else '{}'::jsonb end
  where id = v_expense_id and user_id = p_actor_user_id
  returning * into strict v_expense;
  return jsonb_set(v_result, '{expense}', to_jsonb(v_expense));
end;
$$;
revoke all on function public.households_create_transaction_with_split_without_merchant_metadata_v1(
  uuid, jsonb, uuid, uuid, uuid, text, text, bigint, text, jsonb, uuid, boolean
) from public, anon, authenticated;
revoke all on function public.households_create_transaction_with_split_v1(
  uuid, jsonb, uuid, uuid, uuid, text, text, bigint, text, jsonb, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.households_create_transaction_with_split_v1(
  uuid, jsonb, uuid, uuid, uuid, text, text, bigint, text, jsonb, uuid, boolean
) to service_role;

create or replace function public.prepare_merchant_auto_resolution_block()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and old.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb then
    if new.merchant is distinct from old.merchant
       or new.merchant_id is distinct from old.merchant_id then
      new.user_overrides := coalesce(new.user_overrides, '{}'::jsonb)
        - 'merchant_auto_resolution_blocked' - 'merchant_auto_resolution_blocked_inherited_from';
      if new.parent_recurring_id is not null and coalesce(new.is_recurring, false) is false then
        -- Keep deliberate occurrence corrections out of template alignment.
        if new.merchant is distinct from old.merchant then
          new.user_overrides := new.user_overrides || jsonb_build_object('merchant', new.merchant);
        end if;
        if new.merchant_id is distinct from old.merchant_id then
          new.user_overrides := new.user_overrides || jsonb_build_object('merchant_id', new.merchant_id);
        end if;
      end if;
    elsif old.user_overrides ->> 'merchant_auto_resolution_blocked_inherited_from' = new.parent_recurring_id::text
       and (new.user_overrides -> 'merchant_auto_resolution_blocked') is distinct from 'true'::jsonb
       and not (coalesce(new.user_overrides, '{}'::jsonb) ? 'merchant_auto_resolution_blocked_inherited_from')
       and exists (
         select 1 from public.expenses template
         where template.id = new.parent_recurring_id and template.user_id = new.user_id
           and template.is_recurring is true and template.deleted_at is null
           and (template.user_overrides -> 'merchant_auto_resolution_blocked') is distinct from 'true'::jsonb
       ) then
      -- Only a now-unblocked owning template can revoke an inherited marker.
      null;
    else
      -- Partial override updates must not silently revoke the existing abstention.
      new.user_overrides := coalesce(new.user_overrides, '{}'::jsonb)
        || jsonb_build_object('merchant_auto_resolution_blocked', true);
      if old.user_overrides ? 'merchant_auto_resolution_blocked_inherited_from' then
        new.user_overrides := new.user_overrides || jsonb_build_object(
          'merchant_auto_resolution_blocked_inherited_from',
          old.user_overrides -> 'merchant_auto_resolution_blocked_inherited_from');
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.align_recurring_occurrence_merchant_evidence()
returns trigger language plpgsql set search_path = public as $$
declare v_template public.expenses%rowtype;
begin
  if new.parent_recurring_id is not null and coalesce(new.is_recurring, false) is false then
    -- Explicit occurrence evidence and independent abstention remain row-owned.
    if coalesce(new.user_overrides, '{}'::jsonb) ?| array['merchant', 'merchant_id', 'merchant_structured_name']
       or (new.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb
         and (new.user_overrides ->> 'merchant_auto_resolution_blocked_inherited_from')
           is distinct from new.parent_recurring_id::text) then
      return new;
    end if;
    select * into v_template from public.expenses
    where id = new.parent_recurring_id and user_id = new.user_id
      and is_recurring is true and deleted_at is null;
    if found then
      if v_template.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb then
        new.user_overrides := coalesce(new.user_overrides, '{}'::jsonb) || jsonb_build_object(
          'merchant_auto_resolution_blocked', true,
          'merchant_auto_resolution_blocked_inherited_from', v_template.id::text);
      elsif new.user_overrides ->> 'merchant_auto_resolution_blocked_inherited_from' = v_template.id::text then
        new.user_overrides := new.user_overrides
          - 'merchant_auto_resolution_blocked' - 'merchant_auto_resolution_blocked_inherited_from';
      end if;
      -- Preserve the existing template-owned raw/structured identity relationship.
      new.merchant_id := v_template.merchant_id;
      new.merchant_structured_name := v_template.merchant_structured_name;
      new.merchant := v_template.merchant;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.propagate_recurring_merchant_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.is_recurring is true and (
    new.merchant is distinct from old.merchant or
    new.merchant_id is distinct from old.merchant_id or
    new.merchant_structured_name is distinct from old.merchant_structured_name or
    (new.user_overrides -> 'merchant_auto_resolution_blocked')
      is distinct from (old.user_overrides -> 'merchant_auto_resolution_blocked')
  ) then
    -- Alignment copies identity. Do not disguise propagation as a manual edit.
    update public.expenses
    set user_overrides = case
          when new.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb
          then coalesce(user_overrides, '{}'::jsonb) || jsonb_build_object(
            'merchant_auto_resolution_blocked', true,
            'merchant_auto_resolution_blocked_inherited_from', new.id::text)
          else coalesce(user_overrides, '{}'::jsonb)
            - 'merchant_auto_resolution_blocked' - 'merchant_auto_resolution_blocked_inherited_from'
        end,
        updated_at = now()
    where parent_recurring_id = new.id and user_id = new.user_id
      and coalesce(is_recurring, false) is false and deleted_at is null
      and not (coalesce(user_overrides, '{}'::jsonb) ?| array['merchant', 'merchant_id', 'merchant_structured_name'])
      and ((user_overrides -> 'merchant_auto_resolution_blocked') is distinct from 'true'::jsonb
        or user_overrides ->> 'merchant_auto_resolution_blocked_inherited_from' = new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists merchant_identity_propagate_recurring on public.expenses;
create trigger merchant_identity_propagate_recurring
after update of merchant, merchant_id, merchant_structured_name, user_overrides on public.expenses
for each row execute function public.propagate_recurring_merchant_identity();

-- BEFORE alignment can change evidence during a JSON-only propagation write.
drop trigger if exists merchant_resolution_jobs_enqueue_trigger on public.expenses;
create trigger merchant_resolution_jobs_enqueue_trigger
after insert or update of merchant, raw_text, merchant_structured_name,
  merchant_id, bank_account_id, deleted_at, raw_provider_payload, provider_fields, user_overrides
on public.expenses
for each row execute function public.enqueue_merchant_resolution_for_expense();

create or replace function public.enforce_merchant_auto_resolution_block()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb then
    new.merchant_id := null;
    new.merchant_structured_name := null;
  end if;
  return new;
end;
$$;

-- Capture deliberate edits before existing evidence/Plaid/recurring triggers;
-- enforce abstention after all of them, without ever assigning raw merchant.
create trigger merchant_identity_aa_prepare_auto_resolution_block
before insert or update on public.expenses
for each row execute function public.prepare_merchant_auto_resolution_block();
create trigger merchant_identity_zz_enforce_auto_resolution_block
before insert or update on public.expenses
for each row execute function public.enforce_merchant_auto_resolution_block();

create or replace function public.cancel_blocked_merchant_resolution_jobs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb then
    -- Deletion obsoletes the exact job ID/token, including in-flight claims.
    delete from public.merchant_resolution_jobs where transaction_id = new.id;
  end if;
  return new;
end;
$$;
create trigger merchant_resolution_jobs_zz_cancel_blocked
after insert or update on public.expenses
for each row execute function public.cancel_blocked_merchant_resolution_jobs();

create or replace function public.reject_blocked_merchant_resolution_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.expenses expense
    where expense.id = new.transaction_id
      and expense.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb
  ) then
    return null;
  end if;
  return new;
end;
$$;
-- Covers ordinary enqueue, explicit backfill calls, bootstrap requeue and claims.
create trigger merchant_resolution_jobs_reject_blocked
before insert or update on public.merchant_resolution_jobs
for each row execute function public.reject_blocked_merchant_resolution_job();

create or replace function public.claim_merchant_resolution_jobs(
  p_batch_size integer default 10,
  p_processor_id text default null
) returns setof public.merchant_resolution_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with claimed as (
    select job.id
    from public.merchant_resolution_jobs job
    where (
      (job.status = 'pending' and (job.next_attempt_at is null or job.next_attempt_at <= now()))
      or (job.status = 'unresolved' and job.next_attempt_at <= now())
      or (job.status = 'failed' and job.attempt_count < 5 and job.next_attempt_at <= now())
      or (job.status = 'processing' and job.processing_started_at < now() - interval '10 minutes')
    ) and not exists (
      select 1 from public.expenses expense
      where expense.id = job.transaction_id
        and expense.user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb
    )
    order by job.created_at, job.id
    limit least(greatest(coalesce(p_batch_size, 10), 1), 25)
    for update skip locked
  )
  update public.merchant_resolution_jobs job
  set status = 'processing', processing_started_at = now(),
      claim_token = gen_random_uuid(), claim_generation = job.claim_generation + 1,
      attempt_count = job.attempt_count + 1, updated_at = now()
  from claimed
  where job.id = claimed.id
  returning job.*;
end;
$$;

create or replace function public.enqueue_merchant_resolution_backfill_batch(
  p_batch_size integer default 250
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with eligible as (
    select expense.id, expense.created_at,
      coalesce(public.expense_merchant_resolution_descriptor_key(
        expense.merchant, expense.raw_text, expense.bank_account_id
      ), public.merchant_resolution_descriptor_key(expense.merchant_structured_name, null, false)) as descriptor_key,
      public.expense_merchant_evidence_context_key(
        expense.merchant, expense.bank_account_id
      ) as evidence_context_key,
      public.merchant_resolution_descriptor_key(
        expense.merchant_structured_name, null, false
      ) as structured_merchant_key
    from public.expenses expense
    where expense.merchant_id is null
      and expense.deleted_at is null
      and (expense.user_overrides -> 'merchant_auto_resolution_blocked') is distinct from 'true'::jsonb
      and not exists (
        select 1 from public.merchant_resolution_jobs job
        where job.transaction_id = expense.id
      )
      and coalesce(public.expense_merchant_resolution_descriptor_key(
        expense.merchant, expense.raw_text, expense.bank_account_id
      ), public.merchant_resolution_descriptor_key(expense.merchant_structured_name, null, false)) is not null
  ), candidates as (
    select * from eligible
    order by created_at, id
    limit least(greatest(coalesce(p_batch_size, 250), 1), 1000)
    for update skip locked
  ), inserted as (
    insert into public.merchant_resolution_jobs (
      transaction_id, descriptor_key, evidence_context_key, structured_merchant_key
    )
    select id, descriptor_key, evidence_context_key, structured_merchant_key from candidates
    on conflict do nothing
    returning id
  )
  select count(*) into v_count from inserted;
  return v_count;
end;
$$;

create or replace function public.complete_merchant_resolution_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_expected_descriptor_key text,
  p_status text,
  p_merchant_id uuid default null,
  p_error text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_transaction_id uuid;
  v_expense_user_id uuid;
  v_attempt_count integer;
  v_job_descriptor_key text;
  v_job_context_key text;
  v_job_structured_key text;
  v_current_descriptor_key text;
  v_current_context_key text;
  v_current_structured_key text;
  v_expense_deleted_at timestamptz;
  v_auto_resolution_blocked boolean;
  v_count integer := 0;
  v_final_status text := p_status;
begin
  if p_status not in ('resolved', 'unresolved', 'failed') then
    raise exception 'Invalid merchant resolution status';
  end if;
  if p_status = 'resolved' and p_merchant_id is null then
    raise exception 'Resolved merchant jobs require merchant_id';
  end if;
  if p_status in ('unresolved', 'failed') and p_merchant_id is not null then
    raise exception 'Only resolved merchant jobs may carry merchant_id';
  end if;
  -- Keep the existing expense-before-job lock order. Re-read blocking under lock.
  select transaction_id into v_transaction_id
  from public.merchant_resolution_jobs where id = p_job_id;
  if v_transaction_id is null then return 0; end if;
  select user_id, deleted_at,
         user_overrides -> 'merchant_auto_resolution_blocked' = 'true'::jsonb
    into v_expense_user_id, v_expense_deleted_at, v_auto_resolution_blocked
  from public.expenses where id = v_transaction_id for update;
  if v_auto_resolution_blocked then
    delete from public.merchant_resolution_jobs where id = p_job_id;
    return 0;
  end if;
  select transaction_id, attempt_count, descriptor_key, evidence_context_key, structured_merchant_key
    into v_transaction_id, v_attempt_count, v_job_descriptor_key, v_job_context_key, v_job_structured_key
  from public.merchant_resolution_jobs
  where id = p_job_id
    and status = 'processing'
    and claim_token = p_claim_token
    and descriptor_key = p_expected_descriptor_key
  for update;

  if v_transaction_id is null then return 0; end if;
  select coalesce(public.expense_merchant_resolution_descriptor_key(merchant, raw_text, bank_account_id),
                  public.merchant_resolution_descriptor_key(merchant_structured_name, null, false)),
         public.expense_merchant_evidence_context_key(merchant, bank_account_id),
         public.merchant_resolution_descriptor_key(merchant_structured_name, null, false)
    into v_current_descriptor_key, v_current_context_key, v_current_structured_key
  from public.expenses where id = v_transaction_id;
  if v_expense_deleted_at is not null or v_current_descriptor_key is null then
    delete from public.merchant_resolution_jobs where id = p_job_id and claim_token = p_claim_token;
    return 0;
  end if;
  if v_current_descriptor_key is distinct from v_job_descriptor_key
     or v_current_context_key is distinct from v_job_context_key
     or v_current_structured_key is distinct from v_job_structured_key then
    update public.merchant_resolution_jobs
    set descriptor_key = v_current_descriptor_key, evidence_context_key = v_current_context_key,
        structured_merchant_key = v_current_structured_key, status = 'pending',
        claim_token = null, claim_generation = claim_generation + 1, attempt_count = 0,
        processing_started_at = null, processed_at = null, last_error = null,
        next_attempt_at = null, updated_at = now()
    where id = p_job_id and claim_token = p_claim_token;
    return 0;
  end if;

  if p_merchant_id is not null and v_transaction_id is not null then
    update public.expenses
    set merchant_id = p_merchant_id, updated_at = now()
    where id = v_transaction_id
      and merchant_id is null
      and user_id = v_expense_user_id and not exists (
        select 1 from public.merchant_user_overrides override
        where override.user_id = expenses.user_id
          and override.normalized_pattern = (
            select descriptor_key from public.merchant_resolution_jobs where id = p_job_id
          )
          and override.evidence_context_key = (
            select evidence_context_key from public.merchant_resolution_jobs where id = p_job_id
          )
          and override.action = 'suppress'
      );
    get diagnostics v_count = row_count;
  end if;

  if p_status = 'resolved' and v_count <> 1 then
    v_final_status := 'unresolved';
  end if;
  update public.merchant_resolution_jobs
  set status = v_final_status,
      processed_at = now(), processing_started_at = null, claim_token = null,
      last_error = case when v_final_status = 'unresolved' and p_status = 'resolved'
        then 'merchant_not_assigned' else p_error end,
      next_attempt_at = case
        when v_final_status = 'unresolved' then now() + interval '30 days'
        when v_final_status = 'failed' and v_attempt_count < 5
          then now() + least(interval '1 hour' * power(2, greatest(v_attempt_count - 1, 0)), interval '24 hours')
        else null end,
      updated_at = now()
  where id = p_job_id and status = 'processing'
    and claim_token = p_claim_token and descriptor_key = p_expected_descriptor_key;
  return v_count;
end;
$$;

revoke all on function public.prepare_merchant_auto_resolution_block() from public, anon, authenticated;
revoke all on function public.align_recurring_occurrence_merchant_evidence() from public, anon, authenticated;
revoke all on function public.propagate_recurring_merchant_identity() from public, anon, authenticated;
revoke all on function public.enforce_merchant_auto_resolution_block() from public, anon, authenticated;
revoke all on function public.cancel_blocked_merchant_resolution_jobs() from public, anon, authenticated;
revoke all on function public.reject_blocked_merchant_resolution_job() from public, anon, authenticated;
revoke all on function public.claim_merchant_resolution_jobs(integer,text) from public, anon, authenticated;
grant execute on function public.claim_merchant_resolution_jobs(integer,text) to service_role;
revoke all on function public.complete_merchant_resolution_job(uuid,uuid,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.complete_merchant_resolution_job(uuid,uuid,text,text,uuid,text) to service_role;
