-- Bounded bearer-authorized human review for ambiguous email imports.
alter table public.email_import_events
  drop constraint if exists email_import_events_status_check;

alter table public.email_import_events
  add constraint email_import_events_status_check
  check (status in ('received', 'processing', 'awaiting_review', 'ignored', 'processed', 'failed'));

create table public.email_import_reviews (
  id uuid primary key default gen_random_uuid(),
  email_import_event_id uuid not null references public.email_import_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'declined', 'expired', 'failed')),
  version integer not null default 1 check (version > 0),
  expires_at timestamptz not null,
  processing_started_at timestamptz,
  processing_attempt_count integer not null default 0,
  completed_at timestamptz,
  declined_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email_import_event_id)
);

create table public.email_import_review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.email_import_reviews(id) on delete cascade,
  source_index integer not null check (source_index >= 0),
  candidate jsonb not null,
  evidence_text text not null,
  issues jsonb not null,
  options jsonb not null,
  selected_option_ids jsonb,
  resolved_transaction jsonb,
  save_idempotency_key text not null unique,
  save_status text not null default 'pending' check (save_status in ('pending', 'processing', 'saved', 'duplicate', 'declined', 'failed')),
  save_result jsonb,
  evidence_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, source_index)
);

create index email_import_reviews_expiry_idx on public.email_import_reviews (status, expires_at);
create index email_import_review_items_cleanup_idx on public.email_import_review_items (evidence_expires_at);

alter table public.email_import_reviews enable row level security;
alter table public.email_import_review_items enable row level security;

-- Service-role Edge Functions are the only public bearer-token boundary. Owners
-- may use an authenticated recovery flow, but anonymous table access is never allowed.
create policy "Owners can view their email import reviews"
  on public.email_import_reviews for select using (auth.uid() = user_id);
create policy "Owners can view their email import review items"
  on public.email_import_review_items for select using (
    exists (select 1 from public.email_import_reviews r where r.id = review_id and r.user_id = auth.uid())
  );

create or replace function public.claim_email_import_review(
  p_review_id uuid,
  p_token_hash text,
  p_version integer,
  p_lease_seconds integer default 300
) returns public.email_import_reviews
language plpgsql security definer set search_path = public as $$
declare claimed public.email_import_reviews;
begin
  update public.email_import_reviews
  set status = 'expired', updated_at = now()
  where id = p_review_id and token_hash = p_token_hash and status = 'pending' and expires_at <= now();

  update public.email_import_reviews
  set status = 'processing', processing_started_at = now(), processing_attempt_count = processing_attempt_count + 1, updated_at = now()
  where id = p_review_id
    and token_hash = p_token_hash
    and version = p_version
    and expires_at > now()
    and (status = 'pending' or (status = 'processing' and processing_started_at < now() - make_interval(secs => p_lease_seconds)))
  returning * into claimed;
  return claimed;
end;
$$;

create or replace function public.expire_email_import_review_evidence()
returns void language sql security definer set search_path = public as $$
  update public.email_import_reviews
  set status = 'expired', updated_at = now()
  where expires_at <= now()
    and (
      status = 'pending'
      or (status = 'processing' and processing_started_at < now() - interval '5 minutes')
    );

  update public.email_import_events e
  set status = 'processed',
      processed_at = now(),
      result = coalesce(e.result, '{}'::jsonb) || jsonb_build_object('reviewExpired', true)
  from public.email_import_reviews r
  where r.email_import_event_id = e.id
    and r.status = 'expired'
    and e.status = 'awaiting_review';

  update public.email_import_review_items
  set candidate = '{}'::jsonb,
      evidence_text = '',
      issues = '[]'::jsonb,
      options = '[]'::jsonb,
      selected_option_ids = null,
      resolved_transaction = null,
      save_result = null,
      updated_at = now()
  where evidence_expires_at <= now()
    and (candidate <> '{}'::jsonb or evidence_text <> '' or issues <> '[]'::jsonb or options <> '[]'::jsonb or resolved_transaction is not null or save_result is not null);
$$;

revoke all on function public.claim_email_import_review(uuid, text, integer, integer) from public;
revoke all on function public.expire_email_import_review_evidence() from public;
grant execute on function public.claim_email_import_review(uuid, text, integer, integer) to service_role;
grant execute on function public.expire_email_import_review_evidence() to service_role;

create or replace function public.create_email_import_review(
  p_event_id uuid, p_processing_attempt_count integer, p_user_id uuid, p_token_hash text, p_expires_at timestamptz, p_items jsonb, p_event_result jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare review_id uuid := gen_random_uuid(); item jsonb; item_index integer := 0;
begin
  if not exists (
    select 1 from public.email_import_events
    where id = p_event_id
      and status = 'processing'
      and processing_attempt_count = p_processing_attempt_count
  ) then
    raise exception 'EMAIL_IMPORT_EVENT_LEASE_LOST';
  end if;
  insert into public.email_import_reviews (id, email_import_event_id, user_id, token_hash, expires_at)
  values (review_id, p_event_id, p_user_id, p_token_hash, p_expires_at);
  for item in select * from jsonb_array_elements(p_items) loop
    insert into public.email_import_review_items (review_id, source_index, candidate, evidence_text, issues, options, evidence_expires_at, save_idempotency_key)
    values (review_id, item_index, item->'candidate', item->>'evidenceText', item->'issues', item->'issues', p_expires_at, 'email-review:' || review_id || ':' || item_index);
    item_index := item_index + 1;
  end loop;
  update public.email_import_events
  set user_id = p_user_id,
      status = 'awaiting_review',
      result = p_event_result,
      error_text = null,
      processed_at = null,
      lock_expires_at = null
  where id = p_event_id
    and status = 'processing'
    and processing_attempt_count = p_processing_attempt_count;
  if not found then
    raise exception 'EMAIL_IMPORT_EVENT_LEASE_LOST';
  end if;
  return review_id;
end;
$$;
revoke all on function public.create_email_import_review(uuid, integer, uuid, text, timestamptz, jsonb, jsonb) from public;
grant execute on function public.create_email_import_review(uuid, integer, uuid, text, timestamptz, jsonb, jsonb) to service_role;

create or replace function public.release_email_import_review_delivery(
  p_review_id uuid, p_event_id uuid, p_processing_attempt_count integer
) returns boolean language plpgsql security definer set search_path = public as $$
declare locked_review_id uuid;
begin
  select id into locked_review_id
  from public.email_import_reviews
  where id = p_review_id and email_import_event_id = p_event_id and status = 'pending' for update;
  if locked_review_id is null then
    return false;
  end if;
  update public.email_import_events
  set status = 'processing',
      error_text = 'REVIEW_DELIVERY_FAILED',
      processed_at = null,
      lock_expires_at = now() - interval '1 second'
  where id = p_event_id
    and status = 'awaiting_review'
    and processing_attempt_count = p_processing_attempt_count;
  if not found then
    return false;
  end if;
  delete from public.email_import_reviews
  where id = p_review_id and email_import_event_id = p_event_id and status = 'pending';
  if not found then
    raise exception 'EMAIL_IMPORT_REVIEW_DELIVERY_RELEASE_LOST';
  end if;
  return true;
end;
$$;
revoke all on function public.release_email_import_review_delivery(uuid, uuid, integer) from public;
grant execute on function public.release_email_import_review_delivery(uuid, uuid, integer) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'email-import-review-evidence-cleanup') then
      perform cron.unschedule('email-import-review-evidence-cleanup');
    end if;
    perform cron.schedule(
      'email-import-review-evidence-cleanup',
      '0 * * * *',
      'select public.expire_email_import_review_evidence();'
    );
  end if;
end;
$$;
