-- Centralized merchant identity. The merchant text remains raw transaction evidence; it is never repurposed as an identifier.

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null,
  domain text,
  logo_provider text not null default 'logo_dev' check (logo_provider = 'logo_dev'),
  logo_identifier text,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  verification_status text not null default 'automatic'
    check (verification_status in ('automatic', 'verified', 'user_confirmed', 'rejected')),
  resolution_source text not null
    check (resolution_source in ('logo_dev_search', 'user_correction', 'manual', 'evidenced_domain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchants_logo_reference_check check (
    (domain is null and logo_identifier is null) or domain is not null
  ),
  constraint merchants_canonical_domain_check check (
    domain is null or (domain = lower(btrim(domain)) and domain !~ '^www\.'
      and domain ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$')
  )
);

-- A name is a search aid, not a global identity.  A verified Logo.dev domain
-- is the only global key used by this feature.
alter table public.merchants drop constraint if exists merchants_normalized_name_key;
create index if not exists merchants_normalized_name_idx
  on public.merchants (normalized_name);
create unique index if not exists merchants_domain_lower_unique_idx
  on public.merchants (lower(domain)) where domain is not null;

create table if not exists public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  normalized_pattern text not null,
  source text not null check (source in ('deterministic', 'logo_dev', 'user_correction', 'manual')),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  is_trusted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (merchant_id, normalized_pattern),
  constraint merchant_aliases_trusted_confidence_check
    check (not is_trusted or confidence >= 0.980)
);

alter table public.merchant_aliases
  drop constraint if exists merchant_aliases_normalized_pattern_key;
create unique index if not exists merchant_aliases_trusted_pattern_unique_idx
  on public.merchant_aliases (normalized_pattern) where is_trusted;
create index if not exists merchant_aliases_pattern_idx
  on public.merchant_aliases (normalized_pattern);

alter table public.expenses
  add column if not exists merchant_id uuid;

alter table public.expenses
  add column if not exists merchant_structured_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'expenses_merchant_id_fkey'
      and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
      add constraint expenses_merchant_id_fkey
      foreign key (merchant_id) references public.merchants(id)
      on delete set null;
  end if;
end;
$$;

comment on column public.expenses.merchant is
  'Raw merchant/payee evidence retained for display, imports, and safe merchant resolution.';
comment on column public.expenses.merchant_id is
  'Nullable centralized merchant identity. Null is the safe unresolved state.';
comment on column public.expenses.merchant_structured_name is
  'Optional source-extracted merchant evidence; never replaces merchant display text.';

create index if not exists expenses_merchant_id_idx
  on public.expenses (merchant_id) where merchant_id is not null;

create table if not exists public.merchant_user_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid references public.merchants(id) on delete restrict,
  normalized_pattern text not null,
  evidence_context_key text not null default 'merchant_text',
  evidence_type text not null default 'user_confirmed_descriptor',
  action text not null default 'map' check (action in ('map', 'suppress')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_pattern, evidence_context_key),
  constraint merchant_user_overrides_action_merchant_check check (
    (action = 'map' and merchant_id is not null)
    or (action = 'suppress' and merchant_id is null)
  )
);

create index if not exists merchant_user_overrides_lookup_idx
  on public.merchant_user_overrides (user_id, normalized_pattern, evidence_context_key, action);

create table if not exists public.merchant_resolution_jobs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.expenses(id) on delete cascade,
  descriptor_key text not null,
  structured_merchant_key text,
  evidence_context_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'resolved', 'unresolved', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  ai_used boolean not null default false,
  logo_dev_queried boolean not null default false check (logo_dev_queried = false),
  last_error text,
  next_attempt_at timestamptz,
  processing_started_at timestamptz,
  claim_token uuid,
  claim_generation integer not null default 0 check (claim_generation >= 0),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transaction_id)
);
comment on column public.merchant_resolution_jobs.logo_dev_queried is
  'Always false: background resolution jobs are forbidden from Logo.dev Search.';

create index if not exists merchant_resolution_jobs_active_key_idx
  on public.merchant_resolution_jobs (descriptor_key, status);
create index if not exists merchant_resolution_jobs_structured_active_key_idx
  on public.merchant_resolution_jobs (structured_merchant_key, status)
  where structured_merchant_key is not null;
create index if not exists merchant_resolution_jobs_ready_idx
  on public.merchant_resolution_jobs (status, next_attempt_at, created_at);

create table if not exists public.merchant_search_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);

-- Candidate responses are discovery cache, never identity mappings. Keys are
-- safe structured queries only; raw transaction text is intentionally absent.
create table if not exists public.merchant_search_cache (
  normalized_query text not null,
  provider text not null default 'logo_dev' check (provider = 'logo_dev'),
  candidates jsonb not null check (jsonb_typeof(candidates) = 'array'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  lease_token uuid,
  lease_expires_at timestamptz,
  primary key (normalized_query, provider)
);
create index if not exists merchant_search_cache_expiry_idx
  on public.merchant_search_cache (expires_at);

create table if not exists public.merchant_logo_bootstrap_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  total_groups integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchant_logo_bootstrap_groups (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.merchant_logo_bootstrap_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  structured_key text not null,
  display_name text not null,
  transaction_ids jsonb not null check (jsonb_typeof(transaction_ids) = 'array'),
  status text not null default 'pending'
    check (status in ('pending', 'ambiguous', 'resolved', 'skipped', 'unresolved')),
  merchant_id uuid references public.merchants(id) on delete set null,
  candidates jsonb not null default '[]'::jsonb check (jsonb_typeof(candidates) = 'array'),
  updated_at timestamptz not null default now(),
  unique (run_id, structured_key)
);
create index if not exists merchant_logo_bootstrap_groups_page_idx
  on public.merchant_logo_bootstrap_groups (run_id, status, structured_key);

create or replace function public.claim_merchant_search_refresh(
  p_normalized_query text, p_provider text, p_lease_token uuid,
  p_lease_seconds integer default 15
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_claimed boolean := false;
begin
  insert into public.merchant_search_cache (
    normalized_query, provider, candidates, expires_at, lease_token, lease_expires_at
  ) values (
    p_normalized_query, p_provider, '[]'::jsonb, to_timestamp(0), p_lease_token,
    now() + make_interval(secs => least(greatest(p_lease_seconds, 5), 60))
  ) on conflict (normalized_query, provider) do update
    set lease_token = excluded.lease_token,
        lease_expires_at = excluded.lease_expires_at
    where merchant_search_cache.lease_token is null
       or merchant_search_cache.lease_expires_at <= now();
  select lease_token = p_lease_token into v_claimed
  from public.merchant_search_cache
  where normalized_query = p_normalized_query and provider = p_provider;
  return coalesce(v_claimed, false);
end;
$$;

create or replace function public.release_merchant_search_refresh(
  p_normalized_query text, p_provider text, p_lease_token uuid
) returns void language sql security definer set search_path = public as $$
  update public.merchant_search_cache
  set lease_token = null, lease_expires_at = null
  where normalized_query = p_normalized_query and provider = p_provider
    and lease_token = p_lease_token;
$$;

create or replace function public.complete_merchant_search_refresh(
  p_normalized_query text, p_provider text, p_lease_token uuid,
  p_candidates jsonb, p_expires_at timestamptz
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.merchant_search_cache
  set candidates = p_candidates, expires_at = p_expires_at,
      lease_token = null, lease_expires_at = null
  where normalized_query = p_normalized_query and provider = p_provider
    and lease_token = p_lease_token;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.start_merchant_logo_bootstrap(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_run_id uuid; v_total integer;
begin
  select id into v_run_id from public.merchant_logo_bootstrap_runs
  where user_id = p_user_id and status = 'active'
  order by created_at desc limit 1;
  if v_run_id is null then
    insert into public.merchant_logo_bootstrap_runs (user_id)
    values (p_user_id) returning id into v_run_id;
    insert into public.merchant_logo_bootstrap_groups (
      run_id, user_id, structured_key, display_name, transaction_ids
    )
    select v_run_id, p_user_id,
      public.merchant_resolution_descriptor_key(expense.merchant_structured_name, null, false),
      min(expense.merchant_structured_name), jsonb_agg(expense.id order by expense.id)
    from public.expenses expense
    where expense.user_id = p_user_id and expense.deleted_at is null
      and expense.merchant_id is null
      and public.merchant_resolution_descriptor_key(expense.merchant_structured_name, null, false) is not null
    group by public.merchant_resolution_descriptor_key(expense.merchant_structured_name, null, false);
    select count(*) into v_total from public.merchant_logo_bootstrap_groups where run_id = v_run_id;
    update public.merchant_logo_bootstrap_runs set total_groups = v_total where id = v_run_id;
  else
    select total_groups into v_total from public.merchant_logo_bootstrap_runs where id = v_run_id;
  end if;
  return jsonb_build_object('runId', v_run_id, 'totalGroups', coalesce(v_total, 0));
end;
$$;

create or replace function public.apply_merchant_bootstrap_mapping(
  p_run_id uuid, p_group_id uuid, p_user_id uuid, p_merchant_id uuid,
  p_user_confirmed boolean default false
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_group public.merchant_logo_bootstrap_groups%rowtype;
  v_existing uuid;
  v_structured_persisted boolean := false;
begin
  select * into v_group from public.merchant_logo_bootstrap_groups
  where id = p_group_id and run_id = p_run_id and user_id = p_user_id for update;
  if not found then raise exception 'MERCHANT_BOOTSTRAP_GROUP_NOT_FOUND'; end if;
  if not exists (select 1 from public.merchants where id = p_merchant_id) then
    raise exception 'MERCHANT_NOT_FOUND';
  end if;

  if p_user_confirmed then
    insert into public.merchant_user_overrides (
      user_id, merchant_id, normalized_pattern, evidence_context_key,
      evidence_type, action, updated_at
    )
    select p_user_id, p_merchant_id,
      coalesce(public.expense_merchant_resolution_descriptor_key(
        expense.merchant, expense.raw_text, expense.bank_account_id
      ), v_group.structured_key),
      public.expense_merchant_evidence_context_key(expense.merchant, expense.bank_account_id),
      'user_confirmed_bootstrap', 'map', now()
    from public.expenses expense
    where expense.id in (
      select value::text::uuid from jsonb_array_elements_text(v_group.transaction_ids)
    ) and expense.user_id = p_user_id and expense.deleted_at is null
    on conflict (user_id, normalized_pattern, evidence_context_key) do update
      set merchant_id = excluded.merchant_id, evidence_type = excluded.evidence_type,
          action = 'map', updated_at = now();
  end if;

  select merchant_id into v_existing from public.merchant_user_overrides
  where user_id = p_user_id and normalized_pattern = v_group.structured_key
    and evidence_context_key = 'structured_merchant_name' and action = 'map';
  if v_existing is null then
    insert into public.merchant_user_overrides (
      user_id, merchant_id, normalized_pattern, evidence_context_key,
      evidence_type, action, updated_at
    ) values (
      p_user_id, p_merchant_id, v_group.structured_key,
      'structured_merchant_name',
      case when p_user_confirmed then 'user_confirmed_bootstrap' else 'automatic_logo_dev_structured' end,
      'map', now()
    ) on conflict (user_id, normalized_pattern, evidence_context_key) do nothing;
    v_structured_persisted := found;
  elsif v_existing = p_merchant_id then
    v_structured_persisted := true;
  else
    delete from public.merchant_user_overrides
    where user_id = p_user_id and normalized_pattern = v_group.structured_key
      and evidence_context_key = 'structured_merchant_name';
  end if;

  update public.merchant_resolution_jobs job
  set status = 'pending', claim_token = null, claim_generation = claim_generation + 1,
      attempt_count = 0, processing_started_at = null, processed_at = null,
      last_error = null, next_attempt_at = null, updated_at = now()
  from public.expenses expense
  where expense.id = job.transaction_id and expense.user_id = p_user_id
    and (job.transaction_id in (
      select value::text::uuid from jsonb_array_elements_text(v_group.transaction_ids)
    ) or (v_structured_persisted and job.structured_merchant_key = v_group.structured_key));

  update public.merchant_logo_bootstrap_groups
  set status = case when v_structured_persisted or p_user_confirmed then 'resolved' else 'ambiguous' end,
      merchant_id = case when v_structured_persisted or p_user_confirmed then p_merchant_id else null end,
      updated_at = now()
  where id = p_group_id;
  return v_structured_persisted;
end;
$$;

create or replace function public.merchant_resolution_descriptor_key(
  p_merchant text,
  p_raw_text text,
  p_raw_text_is_merchant_descriptor boolean default false
) returns text
language sql
immutable
set search_path = public
as $$
  -- Deliberately mechanical: no language, country, processor, number, or
  -- merchant-specific interpretation is allowed in an evidence fingerprint.
  with evidence as (
    select coalesce(nullif(btrim(p_merchant), ''), case
      when p_raw_text_is_merchant_descriptor then nullif(btrim(p_raw_text), '') end
    ) as value
  ), normalized as (
    select normalize(lower(btrim(regexp_replace(normalize(value, NFC), '\s+', ' ', 'g'))), NFC) as value
    from evidence
  )
  select nullif(value, '') from normalized;
$$;

create or replace function public.expense_merchant_resolution_descriptor_key(
  p_merchant text, p_raw_text text, p_bank_account_id uuid
) returns text language sql immutable set search_path = public as $$
  -- raw_text is never merchant evidence merely because an account is linked.
  -- Source adapters must populate expenses.merchant when they have a payee.
  select public.merchant_resolution_descriptor_key(
    p_merchant, null, false
  );
$$;

create or replace function public.expense_merchant_evidence_context_key(
  p_merchant text, p_bank_account_id uuid
) returns text language sql immutable set search_path = public as $$
  select case when nullif(btrim(p_merchant), '') is not null then 'merchant_text'
    else 'merchant_absent' end;
$$;

create or replace function public.enqueue_merchant_resolution_for_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_context_key text;
  v_structured_key text;
begin
  if new.deleted_at is not null then
    delete from public.merchant_resolution_jobs where transaction_id = new.id;
    return new;
  end if;

  v_structured_key := public.merchant_resolution_descriptor_key(
    new.merchant_structured_name, null, false
  );
  v_key := coalesce(public.expense_merchant_resolution_descriptor_key(
    new.merchant, new.raw_text, new.bank_account_id
  ), v_structured_key);
  if v_key is null then
    -- No current eligible evidence means a prior claim is obsolete. Deletion
    -- invalidates an in-flight worker because its completion no longer finds
    -- the one-per-transaction job.
    delete from public.merchant_resolution_jobs where transaction_id = new.id;
    return new;
  end if;
  v_context_key := public.expense_merchant_evidence_context_key(
    new.merchant, new.bank_account_id
  );

  if exists (
    select 1 from public.merchant_user_overrides override
    where override.user_id = new.user_id
      and override.normalized_pattern = v_key
      and override.evidence_context_key = v_context_key
      and override.action = 'suppress'
  ) then
    -- A suppression is evidence-level, so it also revokes a worker which
    -- claimed this transaction before the correction transaction committed.
    update public.merchant_resolution_jobs
    set status = 'unresolved', claim_token = null,
        claim_generation = claim_generation + 1,
        processing_started_at = null, processed_at = now(),
        last_error = 'suppressed_by_user', next_attempt_at = null,
        updated_at = now()
    where transaction_id = new.id;
    return new;
  end if;

  if new.merchant_id is not null then
    -- Keep a resolved job as the durable lifecycle record.  Deleting it here
    -- would let an UPDATE caused by a worker assignment race its own final
    -- status transition, and loses the audit/cooldown state for direct maps.
    update public.merchant_resolution_jobs
    set status = 'resolved', claim_token = null,
        claim_generation = claim_generation + 1,
        processing_started_at = null, processed_at = now(), last_error = null,
        next_attempt_at = null, updated_at = now()
    where transaction_id = new.id;
    return new;
  end if;

  update public.merchant_resolution_jobs
  set descriptor_key = v_key,
      evidence_context_key = v_context_key,
      structured_merchant_key = v_structured_key,
      status = 'pending',
      claim_token = null,
      claim_generation = claim_generation + 1,
      attempt_count = 0,
      processing_started_at = null,
      processed_at = null,
      last_error = null,
      next_attempt_at = null,
      updated_at = now()
  where transaction_id = new.id
    and (descriptor_key is distinct from v_key
      or evidence_context_key is distinct from v_context_key
      or structured_merchant_key is distinct from v_structured_key);

  if not found then
    -- Jobs are one-per-transaction. descriptor_key serializes matching only;
    -- it never authorizes cross-user assignment.
    insert into public.merchant_resolution_jobs (
      transaction_id, descriptor_key, evidence_context_key, structured_merchant_key
    ) values (new.id, v_key, v_context_key, v_structured_key)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.clear_stale_merchant_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_key text;
  v_new_key text;
  v_old_context_key text;
  v_new_context_key text;
  v_old_structured_key text;
  v_new_structured_key text;
begin
  v_old_key := coalesce(public.expense_merchant_resolution_descriptor_key(
    old.merchant, old.raw_text, old.bank_account_id
  ), public.merchant_resolution_descriptor_key(old.merchant_structured_name, null, false));
  v_new_key := coalesce(public.expense_merchant_resolution_descriptor_key(
    new.merchant, new.raw_text, new.bank_account_id
  ), public.merchant_resolution_descriptor_key(new.merchant_structured_name, null, false));
  v_old_context_key := public.expense_merchant_evidence_context_key(
    old.merchant, old.bank_account_id
  );
  v_new_context_key := public.expense_merchant_evidence_context_key(
    new.merchant, new.bank_account_id
  );
  v_old_structured_key := public.merchant_resolution_descriptor_key(
    old.merchant_structured_name, null, false
  );
  v_new_structured_key := public.merchant_resolution_descriptor_key(
    new.merchant_structured_name, null, false
  );
  if v_new_key is distinct from v_old_key
     or v_new_context_key is distinct from v_old_context_key
     or v_new_structured_key is distinct from v_old_structured_key then
    new.merchant_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists merchant_identity_clear_on_evidence_change on public.expenses;
create trigger merchant_identity_clear_on_evidence_change
before update of merchant, raw_text, merchant_structured_name, bank_account_id on public.expenses
for each row execute function public.clear_stale_merchant_identity();

drop trigger if exists merchant_resolution_jobs_enqueue_trigger on public.expenses;
create trigger merchant_resolution_jobs_enqueue_trigger
after insert or update of merchant, raw_text, merchant_structured_name, merchant_id, bank_account_id, deleted_at on public.expenses
for each row execute function public.enqueue_merchant_resolution_for_expense();

create or replace function public.claim_merchant_resolution_jobs(
  p_batch_size integer default 10,
  p_processor_id text default null
) returns setof public.merchant_resolution_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select job.id
    from public.merchant_resolution_jobs job
    where (job.status = 'pending'
        and (job.next_attempt_at is null or job.next_attempt_at <= now()))
       or (job.status = 'unresolved'
        and job.next_attempt_at <= now())
       or (job.status = 'failed'
        and job.attempt_count < 5
        and job.next_attempt_at <= now())
       or (job.status = 'processing'
        and job.processing_started_at < now() - interval '10 minutes')
    order by job.created_at, job.id
    limit least(greatest(coalesce(p_batch_size, 10), 1), 25)
    for update skip locked
  )
  update public.merchant_resolution_jobs job
  set status = 'processing',
      processing_started_at = now(),
      claim_token = gen_random_uuid(),
      claim_generation = job.claim_generation + 1,
      attempt_count = job.attempt_count + 1,
      updated_at = now()
  from claimed
  where job.id = claimed.id
  returning job.*;
end;
$$;

create or replace function public.enqueue_merchant_resolution_backfill_batch(
  p_batch_size integer default 250
) returns integer
language plpgsql
security definer
set search_path = public
as $$
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
language plpgsql
security definer
set search_path = public
as $$
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
  -- All paths lock expense before its job: correction holds this same order.
  select transaction_id into v_transaction_id
  from public.merchant_resolution_jobs
  where id = p_job_id;
  if v_transaction_id is null then return 0; end if;
  select user_id, deleted_at into v_expense_user_id, v_expense_deleted_at from public.expenses
  where id = v_transaction_id for update;
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
      processed_at = now(),
      processing_started_at = null,
      claim_token = null,
      last_error = case when v_final_status = 'unresolved' and p_status = 'resolved'
        then 'merchant_not_assigned' else p_error end,
      next_attempt_at = case
        when v_final_status = 'unresolved' then now() + interval '30 days'
        when v_final_status = 'failed' and v_attempt_count < 5
          then now() + least(interval '1 hour' * power(2, greatest(v_attempt_count - 1, 0)), interval '24 hours')
        else null end,
      updated_at = now()
  where id = p_job_id
    and status = 'processing'
    and claim_token = p_claim_token
    and descriptor_key = p_expected_descriptor_key;
  return v_count;
end;
$$;

create or replace function public.apply_merchant_user_evidence(
  p_transaction_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_merchant_id uuid default null,
  p_allow_structured_learning boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses%rowtype;
  v_descriptor_key text;
  v_evidence_context_key text;
  v_structured_merchant_key text;
  v_canonical_structured_key text;
  v_canonical_name text;
  v_existing_structured_merchant_id uuid;
  v_structured_learning_persisted boolean := false;
begin
  if p_action not in ('map', 'suppress')
    or (p_action = 'map' and p_merchant_id is null)
    or (p_action = 'suppress' and p_merchant_id is not null) then
    raise exception 'Invalid merchant evidence action';
  end if;

  select * into v_expense from public.expenses
  where id = p_transaction_id and deleted_at is null for update;
  if not found or v_expense.user_id <> p_actor_user_id then
    raise exception 'Transaction owner mismatch';
  end if;
  v_descriptor_key := coalesce(public.expense_merchant_resolution_descriptor_key(
    v_expense.merchant, v_expense.raw_text, v_expense.bank_account_id
  ), public.merchant_resolution_descriptor_key(v_expense.merchant_structured_name, null, false));
  if v_descriptor_key is null then
    raise exception 'Transaction has no usable merchant descriptor';
  end if;
  v_evidence_context_key := public.expense_merchant_evidence_context_key(
    v_expense.merchant, v_expense.bank_account_id
  );
  v_structured_merchant_key := public.merchant_resolution_descriptor_key(
    v_expense.merchant_structured_name, null, false
  );
  if p_action = 'map' then
    select canonical_name into v_canonical_name from public.merchants
    where id = p_merchant_id;
    if v_canonical_name is null then raise exception 'Merchant not found'; end if;
    v_canonical_structured_key := public.merchant_resolution_descriptor_key(
      v_canonical_name, null, false
    );
  end if;

  insert into public.merchant_user_overrides (
    user_id, merchant_id, normalized_pattern, evidence_context_key,
    evidence_type, action, updated_at
  ) values (
    p_actor_user_id, p_merchant_id, v_descriptor_key, v_evidence_context_key,
    'user_confirmed_transaction', p_action, now()
  ) on conflict (user_id, normalized_pattern, evidence_context_key) do update
  set merchant_id = excluded.merchant_id,
      evidence_type = excluded.evidence_type,
      action = excluded.action,
      updated_at = excluded.updated_at;

  -- Canonical identity is always safe user-scoped learning. Source structured
  -- evidence is only learned if it agrees mechanically with that identity.
  if p_action = 'map' and p_allow_structured_learning
     and (v_structured_merchant_key is null
       or v_structured_merchant_key = v_canonical_structured_key) then
    select merchant_id into v_existing_structured_merchant_id
    from public.merchant_user_overrides
    where user_id = p_actor_user_id
      and normalized_pattern = v_canonical_structured_key
      and evidence_context_key = 'structured_merchant_name'
      and action = 'map';
    if v_existing_structured_merchant_id is null then
      insert into public.merchant_user_overrides (
        user_id, merchant_id, normalized_pattern, evidence_context_key,
        evidence_type, action, updated_at
      ) values (
        p_actor_user_id, p_merchant_id, v_canonical_structured_key,
        'structured_merchant_name', 'user_confirmed_structured_merchant', 'map', now()
      ) on conflict (user_id, normalized_pattern, evidence_context_key) do nothing;
      v_structured_learning_persisted := found;
    elsif v_existing_structured_merchant_id = p_merchant_id then
      v_structured_learning_persisted := true;
    else
      delete from public.merchant_user_overrides
      where user_id = p_actor_user_id
        and normalized_pattern = v_canonical_structured_key
        and evidence_context_key = 'structured_merchant_name';
    end if;
  end if;

  update public.expenses
  set merchant_id = case when p_action = 'map' then p_merchant_id else null end,
      updated_at = now()
  where id = p_transaction_id;

  update public.merchant_resolution_jobs
  set status = case when p_action = 'map' then 'resolved' else 'unresolved' end,
      claim_token = null,
      claim_generation = claim_generation + 1,
      processing_started_at = null,
      processed_at = now(),
      last_error = case when p_action = 'suppress' then 'suppressed_by_user' else null end,
      next_attempt_at = null,
      updated_at = now()
  where transaction_id = p_transaction_id;

  if p_action = 'map' then
    update public.merchant_resolution_jobs job
    set status = 'pending', claim_token = null,
        claim_generation = claim_generation + 1, attempt_count = 0,
        processing_started_at = null, processed_at = null, last_error = null,
        next_attempt_at = null, updated_at = now()
    from public.expenses expense
    where expense.id = job.transaction_id
      and expense.user_id = p_actor_user_id
      and job.transaction_id <> p_transaction_id
      and job.status in ('unresolved', 'failed', 'processing')
      and (job.descriptor_key = v_descriptor_key
        or (v_structured_learning_persisted
          and job.structured_merchant_key = v_canonical_structured_key));
  end if;
end;
$$;

create or replace function public.consume_merchant_search_quota(
  p_user_id uuid,
  p_daily_limit integer default 20
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  insert into public.merchant_search_usage_daily (user_id, usage_date, request_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date) do update
    set request_count = public.merchant_search_usage_daily.request_count + 1
    where public.merchant_search_usage_daily.request_count < greatest(p_daily_limit, 1)
  returning request_count into v_count;
  return v_count is not null;
end;
$$;

create or replace function public.record_automatic_merchant_evidence(
  p_user_id uuid, p_merchant_id uuid, p_normalized_pattern text,
  p_evidence_context_key text, p_evidence_type text
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  insert into public.merchant_user_overrides (
    user_id, merchant_id, normalized_pattern, evidence_context_key,
    evidence_type, action, updated_at
  ) values (
    p_user_id, p_merchant_id, p_normalized_pattern, p_evidence_context_key,
    p_evidence_type, 'map', now()
  ) on conflict (user_id, normalized_pattern, evidence_context_key) do update
    set merchant_id = excluded.merchant_id,
        evidence_type = excluded.evidence_type,
        action = 'map', updated_at = now()
    where merchant_user_overrides.action <> 'suppress';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

alter table public.merchants enable row level security;
alter table public.merchant_aliases enable row level security;
alter table public.merchant_user_overrides enable row level security;
alter table public.merchant_resolution_jobs enable row level security;
alter table public.merchant_search_usage_daily enable row level security;
alter table public.merchant_search_cache enable row level security;
alter table public.merchant_logo_bootstrap_runs enable row level security;
alter table public.merchant_logo_bootstrap_groups enable row level security;

create policy "authenticated users can read merchants"
  on public.merchants for select to authenticated using (true);

revoke all on table public.merchant_aliases from public, anon, authenticated;
revoke all on table public.merchant_user_overrides from public, anon, authenticated;
revoke all on table public.merchant_resolution_jobs from public, anon, authenticated;
revoke all on table public.merchant_search_usage_daily from public, anon, authenticated;
revoke all on table public.merchant_search_cache from public, anon, authenticated;
revoke all on table public.merchant_logo_bootstrap_runs from public, anon, authenticated;
revoke all on table public.merchant_logo_bootstrap_groups from public, anon, authenticated;
grant select on table public.merchants to authenticated;
revoke all on function public.claim_merchant_resolution_jobs(integer, text) from public, anon, authenticated;
grant execute on function public.claim_merchant_resolution_jobs(integer, text) to service_role;
revoke all on function public.merchant_resolution_descriptor_key(text, text, boolean) from public, anon, authenticated;
grant execute on function public.merchant_resolution_descriptor_key(text, text, boolean) to service_role;
revoke all on function public.expense_merchant_evidence_context_key(text, uuid) from public, anon, authenticated;
grant execute on function public.expense_merchant_evidence_context_key(text, uuid) to service_role;
revoke all on function public.expense_merchant_resolution_descriptor_key(text, text, uuid) from public, anon, authenticated;
grant execute on function public.expense_merchant_resolution_descriptor_key(text, text, uuid) to service_role;
revoke all on function public.clear_stale_merchant_identity() from public, anon, authenticated;
revoke all on function public.enqueue_merchant_resolution_for_expense() from public, anon, authenticated;
revoke all on function public.apply_merchant_user_evidence(uuid, uuid, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.apply_merchant_user_evidence(uuid, uuid, text, uuid, boolean) to service_role;
revoke all on function public.enqueue_merchant_resolution_backfill_batch(integer) from public, anon, authenticated;
grant execute on function public.enqueue_merchant_resolution_backfill_batch(integer) to service_role;
revoke all on function public.complete_merchant_resolution_job(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_merchant_resolution_job(uuid, uuid, text, text, uuid, text) to service_role;
revoke all on function public.consume_merchant_search_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_merchant_search_quota(uuid, integer) to service_role;
revoke all on function public.record_automatic_merchant_evidence(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_automatic_merchant_evidence(uuid, uuid, text, text, text) to service_role;
revoke all on function public.claim_merchant_search_refresh(text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_merchant_search_refresh(text, text, uuid, integer) to service_role;
revoke all on function public.release_merchant_search_refresh(text, text, uuid) from public, anon, authenticated;
grant execute on function public.release_merchant_search_refresh(text, text, uuid) to service_role;
revoke all on function public.complete_merchant_search_refresh(text, text, uuid, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.complete_merchant_search_refresh(text, text, uuid, jsonb, timestamptz) to service_role;
revoke all on function public.start_merchant_logo_bootstrap(uuid) from public, anon, authenticated;
grant execute on function public.start_merchant_logo_bootstrap(uuid) to service_role;
revoke all on function public.apply_merchant_bootstrap_mapping(uuid, uuid, uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.apply_merchant_bootstrap_mapping(uuid, uuid, uuid, uuid, boolean) to service_role;

create or replace function public.align_recurring_occurrence_merchant_evidence()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.parent_recurring_id is not null and coalesce(new.is_recurring, false) is false
     and (tg_op = 'INSERT' or new.merchant is distinct from old.merchant) then
    new.merchant_structured_name := nullif(btrim(new.merchant), '');
    new.merchant_id := null;
  end if;
  return new;
end;
$$;
drop trigger if exists merchant_identity_align_recurring_occurrence on public.expenses;
create trigger merchant_identity_align_recurring_occurrence
before insert or update on public.expenses
for each row execute function public.align_recurring_occurrence_merchant_evidence();
revoke all on function public.align_recurring_occurrence_merchant_evidence() from public, anon, authenticated;

-- One set-based lookup enriches every legacy JSON RPC payload. This avoids a
-- correlated expenses/merchants lookup per item in a 500-row mobile delta.
create or replace function public.enrich_merchant_identity_items(p_items jsonb)
returns jsonb language sql stable set search_path = public as $$
  with items as (
    select value, ordinality,
      case when value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (value ->> 'id')::uuid end as expense_id
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality
  )
  select coalesce(jsonb_agg(items.value || jsonb_build_object(
    'merchant_id', expense.merchant_id, 'merchant_domain', merchant.domain
  ) order by items.ordinality), '[]'::jsonb)
  from items
  left join public.expenses expense on expense.id = items.expense_id
  left join public.merchants merchant on merchant.id = expense.merchant_id;
$$;

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
declare v_payload jsonb; v_items jsonb;
begin
  v_payload := public.get_user_transactions_page_v5(
    p_user_id, p_household_id, p_currency, p_currencies, p_category,
    p_account_id, p_include_unassigned_account, p_categories, p_type,
    p_search_query, p_start_date, p_end_date, p_page_size, p_cursor_date,
    p_cursor_created_at, p_cursor_id
  );
  v_items := public.enrich_merchant_identity_items(v_payload -> 'items');
  return jsonb_set(v_payload, '{items}', v_items, true);
end;
$$;

revoke all on function public.enrich_merchant_identity_items(jsonb) from public, anon, authenticated;

create or replace function public.get_mobile_delta_v6(
  p_user_id uuid, p_since timestamptz default null, p_since_id uuid default null,
  p_limit integer default 500
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb; v_transactions jsonb;
begin
  v_payload := public.get_mobile_delta_v5(p_user_id, p_since, p_since_id, p_limit);
  v_transactions := public.enrich_merchant_identity_items(v_payload -> 'transactions');
  return jsonb_set(v_payload, '{transactions}', v_transactions, true);
end;
$$;

revoke all on function public.get_user_transactions_page_v6(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text,
  date, date, integer, date, timestamptz, text) from public, anon;
grant execute on function public.get_user_transactions_page_v6(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text,
  date, date, integer, date, timestamptz, text) to authenticated;
revoke all on function public.get_mobile_delta_v6(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_mobile_delta_v6(uuid, timestamptz, uuid, integer) to authenticated;

create or replace function public.get_dashboard_recent_transactions_v2(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_limit integer default 5
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb; v_items jsonb;
begin
  v_payload := public.get_dashboard_recent_transactions_v1(
    p_user_id, p_household_id, p_currency, p_limit
  );
  v_items := public.enrich_merchant_identity_items(v_payload);
  return v_items;
end;
$$;

create or replace function public.get_dashboard_calendar_transactions_v2(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_start_date date default null,
  p_end_date date default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb; v_items jsonb;
begin
  v_payload := public.get_dashboard_calendar_transactions_v1(
    p_user_id, p_household_id, p_currency, p_start_date, p_end_date
  );
  v_items := public.enrich_merchant_identity_items(v_payload);
  return v_items;
end;
$$;

revoke all on function public.get_dashboard_recent_transactions_v2(uuid, uuid, text, integer) from public, anon;
grant execute on function public.get_dashboard_recent_transactions_v2(uuid, uuid, text, integer) to authenticated;
revoke all on function public.get_dashboard_calendar_transactions_v2(uuid, uuid, text, date, date) from public, anon;
grant execute on function public.get_dashboard_calendar_transactions_v2(uuid, uuid, text, date, date) to authenticated;

create or replace function public.list_recurring_series_summary_v2(
  p_actor_user_id uuid,
  p_household_id uuid default null,
  p_currencies text[] default null,
  p_after_next_occurrence_date date default null,
  p_after_id uuid default null,
  p_limit integer default 50
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb; v_items jsonb;
begin
  v_payload := public.list_recurring_series_summary_v1(
    p_actor_user_id, p_household_id, p_currencies,
    p_after_next_occurrence_date, p_after_id, p_limit
  );
  v_items := public.enrich_merchant_identity_items(v_payload -> 'items');
  return jsonb_set(v_payload, '{items}', v_items, true);
end;
$$;

create or replace function public.get_recurring_series_detail_v2(
  p_actor_user_id uuid,
  p_recurring_id uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb;
begin
  v_payload := public.get_recurring_series_detail_v1(p_actor_user_id, p_recurring_id);
  return v_payload || coalesce((select jsonb_build_object(
    'merchant_id', template.merchant_id, 'merchant_domain', merchant.domain)
    from public.expenses template
    left join public.merchants merchant on merchant.id = template.merchant_id
    where template.id = p_recurring_id),
    jsonb_build_object('merchant_id', null, 'merchant_domain', null));
end;
$$;

revoke all on function public.list_recurring_series_summary_v2(uuid, uuid, text[], date, uuid, integer) from public, anon, authenticated;
grant execute on function public.list_recurring_series_summary_v2(uuid, uuid, text[], date, uuid, integer) to service_role;
revoke all on function public.get_recurring_series_detail_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_recurring_series_detail_v2(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
