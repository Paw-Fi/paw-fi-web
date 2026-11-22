-- The file and the immutable save plan share a private bucket. Only the worker
-- reads either object. Clients may insert one source for their own open job.
alter type public.notification_event_type add value if not exists 'file_import_status';

insert into storage.buckets (id, name, public, file_size_limit)
values ('file-imports','file-imports',false,52428800)
on conflict (id) do nothing;

create table public.file_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null, file_name text not null, format text not null,
  byte_count bigint not null, household_id uuid, is_portfolio boolean not null,
  account_id uuid, account_currency text, currency text not null, language text not null,
  local_date date not null, timezone text not null, offset_minutes integer not null,
  skip_duplicates boolean not null, request_key text not null,
  status text not null default 'uploading' check (status in ('uploading','queued','processing','completed','failed')),
  lease uuid, lease_until timestamptz, available_at timestamptz not null default now(),
  failures integer not null default 0, generation integer not null default 1,
  plan_path text, pdf_chunked boolean not null default false, total integer, processed integer not null default 0,
  imported integer not null default 0, skipped integer not null default 0,
  error_message text, retryable boolean not null default false,
  created_at timestamptz not null default now(), finished_at timestamptz,
  files_removed boolean not null default false,
  unique(user_id, request_key)
);
create index file_import_queue on public.file_import_jobs (available_at,created_at) where status in ('queued','processing');
create index file_import_history on public.file_import_jobs (user_id,created_at desc);
alter table public.file_import_jobs enable row level security;
revoke all on public.file_import_jobs from public,anon,authenticated;
grant select(id,user_id,file_name,status,total,processed,imported,skipped,error_message,created_at,retryable,files_removed,byte_count,fingerprint,format,household_id,is_portfolio,account_id,account_currency,currency,skip_duplicates) on public.file_import_jobs to authenticated;
grant all on public.file_import_jobs to service_role;
create policy own_file_import_status on public.file_import_jobs for select to authenticated using (user_id=auth.uid());

create policy file_import_source_upload on storage.objects for insert to authenticated
with check (bucket_id='file-imports' and exists (
  select 1 from public.file_import_jobs j where j.user_id=auth.uid() and j.status='uploading'
  and name = j.user_id::text || '/' || j.id::text || '/source'
));

create function public.begin_file_import(p_hash text,p_name text,p_format text,p_bytes bigint,p_household uuid,p_portfolio boolean,p_account uuid,p_account_currency text,p_currency text,p_language text,p_date date,p_timezone text,p_offset integer,p_skip boolean)
returns table(job_id uuid,job_status text) language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); k text; j public.file_import_jobs;
begin
  if actor is null or p_hash !~ '^[0-9a-f]{64}$' or p_format not in ('csv','tsv','txt','xlsx','xls','pdf')
  or length(trim(p_name)) not between 1 and 255 or p_bytes not between 1 and 52428800 or (p_format='pdf' and p_bytes>20971520)
  or p_currency !~ '^[A-Z]{3}$' or length(p_language)>35 or length(p_timezone)>100 or abs(p_offset)>900
  then raise exception 'Invalid import file or settings'; end if;
  if p_household is not null and not exists(select 1 from public.household_members where user_id=actor and household_id=p_household)
  then raise exception 'Space access required'; end if;
  -- Space type is authoritative; stale scope flags must never bypass split creation.
  if p_household is not null then
    select coalesce(h.is_portfolio,false) into strict p_portfolio from public.households h where h.id=p_household;
  else p_portfolio:=false; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,12));
  k:=jsonb_build_array(p_hash,p_format,p_household,p_portfolio,p_account,p_account_currency,p_currency,p_skip)::text;
  select * into j from public.file_import_jobs where user_id=actor and request_key=k;
  if not found then
    if not exists(select from vault.decrypted_secrets where name='file_import_worker_url' and decrypted_secret like 'https://%') or
       not exists(select from vault.decrypted_secrets where name='file_import_worker_secret' and length(decrypted_secret)>0) then
      raise exception 'Background import is unavailable. Choose Review before importing.';
    end if;
    if (select count(*) from public.file_import_jobs where user_id=actor and status in ('uploading','queued','processing'))>=4 then raise exception 'Finish or retry an existing upload first'; end if;
    insert into public.file_import_jobs(user_id,fingerprint,file_name,format,byte_count,household_id,is_portfolio,account_id,account_currency,currency,language,local_date,timezone,offset_minutes,skip_duplicates,request_key)
    values(actor,p_hash,p_name,p_format,p_bytes,p_household,p_portfolio,p_account,p_account_currency,p_currency,p_language,p_date,p_timezone,p_offset,p_skip,k) returning * into j;
  end if;
  return query select j.id,j.status;
end $$;

create function public.accept_file_import(p_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare j public.file_import_jobs;
begin
  select * into strict j from public.file_import_jobs where id=p_id and user_id=auth.uid() for update;
  if j.status='uploading' and exists(select from storage.objects where bucket_id='file-imports' and name=j.user_id::text||'/'||j.id::text||'/source' and (metadata->>'size')::bigint=j.byte_count)
  then update public.file_import_jobs set status='queued' where id=p_id; return 'queued'; end if;
  return j.status;
end $$;

create function public.retry_file_import(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.file_import_jobs set status='queued',generation=generation+1,failures=0,available_at=now(),finished_at=null,error_message=null,retryable=false
  where id=p_id and user_id=auth.uid() and status='failed' and retryable and not files_removed and finished_at>now()-interval '7 days';
  if not found then raise exception 'Open the import history to check this file'; end if;
end $$;

create table public.file_import_email_events (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.file_import_jobs on delete cascade,
 generation integer not null, status text not null, message text not null,
 created_at timestamptz not null default now(), delivered_at timestamptz, next_attempt timestamptz not null default now(),
 unique(job_id,generation,status)
);
alter table public.file_import_email_events enable row level security;
revoke all on public.file_import_email_events from public,anon,authenticated;
grant all on public.file_import_email_events to service_role;

create function public.file_import_notify() returns trigger language plpgsql security definer set search_path='' as $$
declare message text; event_id uuid;
begin
  if new.status=old.status or new.status not in ('processing','completed','failed') then return new; end if;
  if exists(select 1 from public.sharing_prefs p where p.user_id=new.user_id and p.household_id is null and p.enable_nudges is false)
  then return new; end if;
  message:=case new.status when 'processing' then 'Moneko is processing your file. You can close the app.'
    when 'completed' then format('Imported %s transactions. Skipped %s duplicate or grouped rows.',new.imported,new.skipped)
    else coalesce(new.error_message,'Open Import Data to check the file and retry.') end;
  insert into public.file_import_email_events(job_id,generation,status,message) values(new.id,new.generation,new.status,message)
    on conflict do nothing returning id into event_id;
  if event_id is not null then
    insert into public.notification_events(user_id,event_type,payload)
    values(new.user_id,'file_import_status',jsonb_build_object('job_id',new.id,'status',new.status,'message',message,'imported',new.imported,'skipped',new.skipped,'user_id',new.user_id,'deep_link','moneko://import'));
  end if;
  return new;
end $$;
create trigger file_import_notify after update of status on public.file_import_jobs for each row execute function public.file_import_notify();

create function public.claim_file_import() returns setof public.file_import_jobs language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(182731129);
  -- An app may have exited between Storage's successful commit and the acceptance RPC.
  update public.file_import_jobs j set status='queued' from storage.objects o where j.status='uploading'
    and o.bucket_id='file-imports' and o.name=j.user_id::text||'/'||j.id::text||'/source' and (o.metadata->>'size')::bigint=j.byte_count;
  update public.file_import_jobs set status='failed',lease=null,lease_until=null,finished_at=now(),retryable=true,error_message='Processing was interrupted. Open Import Data and retry this job.'
    where status='processing' and lease_until<now() and failures>=4;
  if (select count(*) from public.file_import_jobs where status='processing' and lease_until>now())>=2 then return; end if;
  return query with candidate as (
    select j.id from public.file_import_jobs j where j.status in ('processing','queued') and j.available_at<=now() and (j.lease_until is null or j.lease_until<now())
    and not exists(select 1 from public.file_import_jobs active where active.user_id=j.user_id and active.id<>j.id and active.status='processing' and active.lease_until>now())
    order by j.created_at limit 1 for update skip locked
  ) update public.file_import_jobs j set status='processing',lease=gen_random_uuid(),lease_until=now()+interval '10 minutes',
    failures=j.failures+case when j.lease is not null then 1 else 0 end
    from candidate c where c.id=j.id returning j.*;
end $$;

-- Caller can see only its own status. Leasing and all financial writes are service-only.
revoke all on function public.begin_file_import(text,text,text,bigint,uuid,boolean,uuid,text,text,text,date,text,integer,boolean), public.accept_file_import(uuid), public.retry_file_import(uuid) from public,anon,authenticated;
grant execute on function public.begin_file_import(text,text,text,bigint,uuid,boolean,uuid,text,text,text,date,text,integer,boolean), public.accept_file_import(uuid), public.retry_file_import(uuid) to authenticated;
revoke all on function public.claim_file_import(), public.file_import_notify() from public,anon,authenticated;
grant execute on function public.claim_file_import() to service_role;

-- Call the stateless worker only when there is work. No file data travels through pg_net.
select cron.schedule('file-import-worker','* * * * *',$schedule$
  select net.http_post(url:=u.decrypted_secret||'/tick',headers:=jsonb_build_object('Authorization','Bearer '||s.decrypted_secret),body:='{}'::jsonb,timeout_milliseconds:=300000)
  from vault.decrypted_secrets u,vault.decrypted_secrets s
  where u.name='file_import_worker_url' and s.name='file_import_worker_secret' and (
    exists(select 1 from public.file_import_jobs where status in ('queued','processing') and available_at<=now() and (lease_until is null or lease_until<now()))
    or exists(select 1 from public.file_import_jobs j join storage.objects o on o.bucket_id='file-imports' and o.name=j.user_id::text||'/'||j.id::text||'/source' where j.status='uploading')
    or exists(select 1 from public.file_import_jobs where not files_removed and (finished_at<now()-case when status='completed' then interval '1 hour' else interval '7 days' end or (status='uploading' and created_at<now()-interval '1 day')))
    or exists(select 1 from storage.objects o where o.bucket_id='file-imports' and not exists(
        select 1 from public.file_import_jobs j where not j.files_removed and o.name like j.user_id::text||'/'||j.id::text||'/%'))
    or exists(select 1 from public.file_import_email_events where delivered_at is null and next_attempt<=now())
  )
$schedule$);
create function public.claim_file_import_emails() returns table(id uuid,user_id uuid,status text,message text,imported integer,skipped integer,email_allowed boolean)
language sql security definer set search_path='' as $$
  with due as (select e.id from public.file_import_email_events e
    where e.delivered_at is null and e.next_attempt<=now()
    and not exists(select 1 from public.file_import_email_events older where older.job_id=e.job_id and older.created_at<e.created_at and older.delivered_at is null)
    order by e.created_at limit 10 for update skip locked),
  claimed as (update public.file_import_email_events e set next_attempt=now()+interval '5 minutes'
    from due where due.id=e.id returning e.*)
  select c.id,j.user_id,c.status,c.message,j.imported,j.skipped,
    not exists(select from public.sharing_prefs p where p.user_id=j.user_id and p.household_id is null and p.enable_nudges is false) from claimed c join public.file_import_jobs j on j.id=c.job_id;
$$;

create function public.file_import_cleanup_candidates() returns table(name text)
language plpgsql security definer set search_path='' as $$
begin
  -- A source was never accepted. Reselecting it can start a fresh upload.
  delete from public.file_import_jobs where status='uploading' and created_at<now()-interval '1 day';
  update public.file_import_jobs set retryable=false, files_removed=true where not files_removed and
    ((status='completed' and finished_at<now()-interval '1 hour') or (status='failed' and finished_at<now()-interval '7 days'));
  return query select o.name from storage.objects o where o.bucket_id='file-imports' and not exists (
    select 1 from public.file_import_jobs j where not j.files_removed and o.name like j.user_id::text||'/'||j.id::text||'/%'
  ) limit 100;
end $$;
revoke all on function public.claim_file_import_emails(),public.file_import_cleanup_candidates() from public,anon,authenticated;
grant execute on function public.claim_file_import_emails(),public.file_import_cleanup_candidates() to service_role;

-- A reset must also cancel accepted work and fence a batch already in flight.
create function public.file_import_reset_jobs() returns trigger language plpgsql security definer set search_path='' as $$
begin
  delete from public.file_import_jobs where user_id=new.id;
  delete from public.notification_events where user_id=new.id and event_type::text='file_import_status';
  return new;
end $$;
create trigger reset_file_import_jobs after update of financial_data_reset_at on public.users
for each row when (new.financial_data_reset_at is distinct from old.financial_data_reset_at)
execute function public.file_import_reset_jobs();

create function public.file_import_check_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.file_import_jobs j where j.id=split_part(new.import_request_key,':',2)::uuid
    and j.user_id=new.user_id and j.household_id is not distinct from new.household_id
    and j.status='processing' and j.lease is not null for share;
  if not found then raise exception 'Import job is no longer active'; end if;
  return new;
end $$;
create trigger file_import_check_write before insert on public.expenses for each row
when (new.import_request_key like 'file-import-v1:%') execute function public.file_import_check_write();
revoke all on function public.file_import_reset_jobs(),public.file_import_check_write() from public,anon,authenticated;
