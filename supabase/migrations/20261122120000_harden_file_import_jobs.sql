begin;

-- Upgrade an existing import queue in place. The original migration can already
-- have claimed jobs. Keep their identities and preserve acknowledged writes.
update storage.buckets set public=false, file_size_limit=52428800 where id='file-imports';
alter table public.file_import_jobs add column pdf_next_page integer not null default 1;
create index file_import_retained_object_prefix on public.file_import_jobs
  ((user_id::text||'/'||id::text)) where not files_removed;
create index file_import_retention on public.file_import_jobs (finished_at) where not files_removed and finished_at is not null;
alter table public.file_import_email_events add column first_attempt_at timestamptz,
  add column delivery_uncertain_at timestamptz, add column attempts integer not null default 0;
-- Old claims advanced next_attempt by five minutes but did not persist their first
-- attempt. Use creation time as a conservative lower bound for their retry window.
update public.file_import_email_events set first_attempt_at=created_at, attempts=1
where delivered_at is null and next_attempt>created_at;

-- A fallback sender can retry a partial fan-out without re-sending to devices
-- whose provider acknowledgement was already recorded.
create table public.file_import_push_deliveries (
  event_id uuid not null references public.notification_events(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  lease uuid not null, lease_until timestamptz not null, sent_at timestamptz,
  primary key(event_id,device_id)
);
alter table public.file_import_push_deliveries enable row level security;
revoke all on public.file_import_push_deliveries from public,anon,authenticated;
grant all on public.file_import_push_deliveries to service_role;
create function public.claim_file_import_push(p_event uuid,p_device uuid,p_lease uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
  if not exists(select from public.notification_events e join public.devices d on d.user_id=e.user_id
    where e.id=p_event and e.event_type::text='file_import_status' and d.id=p_device and d.is_active is not false)
  then return 'skip'; end if;
  insert into public.file_import_push_deliveries as p(event_id,device_id,lease,lease_until)
    values(p_event,p_device,p_lease,now()+interval '5 minutes')
    on conflict(event_id,device_id) do update set lease=excluded.lease,lease_until=excluded.lease_until
    where p.sent_at is null and p.lease_until<=now();
  if found then return 'send'; end if;
  if exists(select from public.file_import_push_deliveries where event_id=p_event and device_id=p_device and sent_at is not null)
  then return 'sent'; end if;
  return 'busy';
end $$;
revoke all on function public.claim_file_import_push(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_file_import_push(uuid,uuid,uuid) to service_role;

create table public.file_import_row_receipts (
  job_id uuid not null references public.file_import_jobs(id) on delete cascade,
  row_index integer not null check(row_index>=0), transaction_id uuid not null,
  primary key(job_id,row_index)
);
alter table public.file_import_row_receipts enable row level security;
revoke all on public.file_import_row_receipts from public,anon,authenticated;

-- Install the receipt trigger and backfill under one transaction. Block intervening writes
-- while taking the snapshot, including on migration runners using READ COMMITTED.
lock table public.expenses in share row exclusive mode;

-- Keep successful writes recoverable during the retry window even when the user
-- moves or permanently deletes an imported transaction before the next checkpoint.
create function public.file_import_record_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.file_import_row_receipts(job_id,row_index,transaction_id)
    values(split_part(new.import_request_key,':',2)::uuid,split_part(new.import_request_key,':',3)::integer,new.id);
  return new;
end $$;
create trigger file_import_record_write after insert on public.expenses for each row
when (new.import_request_key like 'file-import-v1:%') execute function public.file_import_record_write();
revoke all on function public.file_import_record_write() from public,anon,authenticated;

insert into public.file_import_row_receipts(job_id,row_index,transaction_id)
select j.id,split_part(e.import_request_key,':',3)::integer,e.id
from public.file_import_jobs j join public.expenses e on e.user_id=j.user_id and e.import_request_key like 'file-import-v1:'||j.id::text||':%'
where not j.files_removed and split_part(e.import_request_key,':',3) ~ '^[0-9]{1,9}$'
on conflict do nothing;

create or replace function public.file_import_check_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.file_import_jobs j where j.id=split_part(new.import_request_key,':',2)::uuid
    and j.user_id=new.user_id and j.household_id is not distinct from new.household_id
    and j.status='processing' and j.lease_until>clock_timestamp()
    and j.lease::text=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-moneko-file-import-lease')
    and j.plan_path is not null and split_part(new.import_request_key,':',3)::integer
        between j.processed and least(j.processed+49,j.total-1)
    for share;
  if not found then raise exception 'Import job is no longer active'; end if;
  return new;
end $$;

-- Send potentially long semantic keys in a POST body and aggregate all matches in SQL.
-- Deleted rows still own their original write key. Only live rows count as semantic duplicates.
create function public.file_import_existing_keys(p_job uuid,p_request_keys text[],p_semantic_keys text[])
returns table(request_key text,existing_id uuid,semantic_key text,occurrences bigint)
language plpgsql security definer set search_path='' as $$
declare j public.file_import_jobs;
begin
  select * into strict j from public.file_import_jobs where id=p_job and status='processing'
    and lease_until>clock_timestamp() and lease::text=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-moneko-file-import-lease');
  if cardinality(p_request_keys)>50 or cardinality(p_semantic_keys)>50 then raise exception 'Invalid import batch size'; end if;
  return query select k,r.transaction_id,null::text,1::bigint from unnest(p_request_keys) k
    join public.file_import_row_receipts r on r.job_id=j.id and r.row_index=split_part(k,':',3)::integer
    where k='file-import-v1:'||j.id::text||':'||r.row_index::text
    union all
    select null::text,null::uuid,e.import_semantic_key,count(*) from public.expenses e
    where e.user_id=j.user_id and e.household_id is not distinct from j.household_id and e.deleted_at is null
    and e.import_semantic_key=any(p_semantic_keys) group by e.import_semantic_key;
end $$;
revoke all on function public.file_import_existing_keys(uuid,text[],text[]) from public,anon,authenticated;
grant execute on function public.file_import_existing_keys(uuid,text[],text[]) to service_role;

create or replace function public.claim_file_import() returns setof public.file_import_jobs language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(182731129);
  -- An app may have exited between Storage's successful commit and the acceptance RPC.
  -- A committed immutable object can never grow on retry. Avoid waking the worker
  -- every minute for an incompatible object and give its owner a recovery path.
  update public.file_import_jobs j set status='failed',finished_at=now(),retryable=false,
    error_message='The uploaded size does not match the selected file. Choose Review before importing and select the original statement.'
    from storage.objects o where j.status='uploading' and o.bucket_id='file-imports'
    and o.name=j.user_id::text||'/'||j.id::text||'/source' and (o.metadata->>'size')::bigint is distinct from j.byte_count;
  update public.file_import_jobs j set status='queued' from storage.objects o where j.status='uploading'
    and o.bucket_id='file-imports' and o.name=j.user_id::text||'/'||j.id::text||'/source' and (o.metadata->>'size')::bigint=j.byte_count;
  update public.file_import_jobs set status='failed',lease=null,lease_until=null,finished_at=now(),retryable=true,error_message='Processing was interrupted. Open Import Data and retry this job.'
    where status='processing' and lease_until<now() and failures>=4;
  if (select count(*) from public.file_import_jobs where status='processing' and lease_until>now())>=2 then return; end if;
  return query with candidate as (
    select j.id from public.file_import_jobs j where j.status in ('processing','queued') and j.available_at<=now() and (j.lease_until is null or j.lease_until<now())
    and not exists(select 1 from public.file_import_jobs active where active.user_id=j.user_id and active.id<>j.id and active.status='processing' and (active.lease_until>now() or (active.created_at,active.id)<(j.created_at,j.id)))
    order by j.available_at,j.created_at,j.id limit 1 for update skip locked
  ) update public.file_import_jobs j set status='processing',lease=gen_random_uuid(),lease_until=now()+interval '10 minutes',
    failures=j.failures+case when j.lease is not null then 1 else 0 end
    from candidate c where c.id=j.id returning j.*;
end $$;

create or replace function public.claim_file_import_emails() returns table(id uuid,user_id uuid,status text,message text,imported integer,skipped integer,email_allowed boolean)
language plpgsql security definer set search_path='' as $$
begin
  -- Resend remembers a key for 24 hours. Preserve uncertain outcomes for operator
  -- reconciliation once the safe retry window closes, and unblock later transitions.
  update public.file_import_email_events e set delivery_uncertain_at=now()
    where e.delivered_at is null and e.delivery_uncertain_at is null and e.first_attempt_at<=now()-interval '23 hours';
  return query with due as (select e.id from public.file_import_email_events e
    where e.delivered_at is null and e.delivery_uncertain_at is null and e.next_attempt<=now()
    and not exists(select 1 from public.file_import_email_events older where older.job_id=e.job_id and (older.created_at,older.generation,case older.status when 'processing' then 0 else 1 end,older.id)<(e.created_at,e.generation,case e.status when 'processing' then 0 else 1 end,e.id) and older.delivered_at is null and older.delivery_uncertain_at is null)
    order by e.created_at limit 10 for update skip locked),
  claimed as (update public.file_import_email_events e set first_attempt_at=coalesce(e.first_attempt_at,now()), attempts=e.attempts+1,
    next_attempt=now()+least(interval '1 hour',interval '5 minutes' * (1 << least(e.attempts,4)))
    from due where due.id=e.id returning e.*)
  select c.id,j.user_id,c.status,c.message,j.imported,j.skipped,
    not exists(select from public.sharing_prefs p where p.user_id=j.user_id and p.household_id is null and p.enable_nudges is false) from claimed c join public.file_import_jobs j on j.id=c.job_id;
end $$;

create or replace function public.file_import_cleanup_candidates() returns table(name text)
language plpgsql security definer set search_path='' as $$
begin
  -- A source was never accepted. Reselecting it can start a fresh upload.
  delete from public.file_import_jobs j where j.status='uploading' and j.created_at<now()-interval '1 day'
    and not exists(select 1 from storage.objects o where o.bucket_id='file-imports' and o.name=j.user_id::text||'/'||j.id::text||'/source' and (o.metadata->>'size')::bigint=j.byte_count);
  with due as (
    select id from public.file_import_jobs where not files_removed and
      ((status='completed' and finished_at<now()-interval '1 hour') or (status='failed' and finished_at<now()-interval '7 days'))
    order by finished_at limit 20 for update skip locked
  ), expired as (
    update public.file_import_jobs j set retryable=false, files_removed=true from due where j.id=due.id returning j.id
  ) delete from public.file_import_row_receipts r using expired where r.job_id=expired.id;
  return query select o.name from storage.objects o where o.bucket_id='file-imports' and not exists (
    select 1 from public.file_import_jobs j where not j.files_removed and (j.user_id::text||'/'||j.id::text)=(split_part(o.name,'/',1)||'/'||split_part(o.name,'/',2))
  ) limit 100;
end $$;

-- Call the stateless worker only when there is work. No file data travels through pg_net.
select cron.schedule('file-import-worker','* * * * *',$schedule$
  select net.http_post(url:=u.decrypted_secret||'/tick',headers:=jsonb_build_object('Authorization','Bearer '||s.decrypted_secret),body:='{}'::jsonb,timeout_milliseconds:=300000)
  from vault.decrypted_secrets u,vault.decrypted_secrets s
  where u.name='file_import_worker_url' and s.name='file_import_worker_secret' and (
    exists(select 1 from public.file_import_jobs where status in ('queued','processing') and available_at<=now() and (lease_until is null or lease_until<now()))
    or exists(select 1 from public.file_import_jobs j join storage.objects o on o.bucket_id='file-imports' and o.name=j.user_id::text||'/'||j.id::text||'/source' where j.status='uploading')
    or exists(select 1 from public.file_import_jobs where not files_removed and (finished_at<now()-case when status='completed' then interval '1 hour' else interval '7 days' end or (status='uploading' and created_at<now()-interval '1 day')))
    or exists(select 1 from storage.objects o where o.bucket_id='file-imports' and not exists(
        select 1 from public.file_import_jobs j where not j.files_removed and (j.user_id::text||'/'||j.id::text)=(split_part(o.name,'/',1)||'/'||split_part(o.name,'/',2))))
    or exists(select 1 from public.file_import_email_events where delivered_at is null and delivery_uncertain_at is null and next_attempt<=now())
  )
$schedule$);

commit;
