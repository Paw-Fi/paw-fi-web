-- User requests are short. pg_cron runs the existing atomic reset separately
-- from the PostgREST statement/gateway deadline (including if the app exits).
create table if not exists public.financial_reset_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  failure_detail text
);
create unique index if not exists financial_reset_jobs_one_pending
  on public.financial_reset_jobs(user_id) where status = 'pending';
create index if not exists financial_reset_jobs_queue on public.financial_reset_jobs(created_at, id)
  where status = 'pending';
create index if not exists financial_reset_jobs_owner on public.financial_reset_jobs(user_id);

-- Two devices can confirm the same pending reset. Remember BOTH request IDs
-- so even a lost enqueue response followed by a late retry cannot delete again.
create table if not exists public.financial_reset_requests (
  request_id uuid primary key,
  job_id uuid not null references public.financial_reset_jobs(id) on delete cascade
);
create index if not exists financial_reset_requests_job on public.financial_reset_requests(job_id);
alter table public.financial_reset_jobs enable row level security;
alter table public.financial_reset_requests enable row level security;
revoke all on public.financial_reset_jobs, public.financial_reset_requests
  from public, anon, authenticated, service_role;

create or replace function public.get_financial_data_reset(p_request_id uuid, p_expected_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or actor is distinct from p_expected_user_id then
    raise exception 'Account changed' using errcode = '42501';
  end if;
  return (select jsonb_build_object('id', r.request_id, 'status', j.status)
    from public.financial_reset_requests r join public.financial_reset_jobs j on j.id = r.job_id
    where r.request_id = p_request_id and j.user_id = actor);
end;
$$;

create or replace function public.request_financial_data_reset(p_request_id uuid, p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target uuid;
  existing jsonb;
begin
  if actor is null or actor is distinct from p_expected_user_id then
    raise exception 'Account changed' using errcode = '42501';
  end if;
  if p_request_id is null then raise exception 'Missing reset request ID'; end if;
  -- Serialize enqueues for this user only. Never hold this lock during deletion.
  perform pg_advisory_xact_lock(hashtextextended('financial_reset:' || actor::text, 0));
  existing := public.get_financial_data_reset(p_request_id, actor);
  if existing is not null then return existing; end if;

  select id into target from public.financial_reset_jobs where user_id = actor and status = 'pending';
  if not found then
    insert into public.financial_reset_jobs(id, user_id) values (p_request_id, actor) returning id into target;
  end if;
  insert into public.financial_reset_requests(request_id, job_id) values (p_request_id, target);
  return public.get_financial_data_reset(target, actor);
end;
$$;

-- Move the installed reset bodies (including the dependency-order fix) behind
-- owner-only, explicit-actor entry points. Keep one cleanup implementation.
-- Existing no-arg RPCs retain their OIDs, grants and function settings and
-- still derive their actor solely from auth.uid(). No JWT exists in pg_cron.
do $migration$
declare
  name text;
  src text;
  ddl text;
  helper text;
  delegate text;
begin
  foreach name in array array['perform_user_financial_data_reset', 'reset_user_financial_data'] loop
    helper := name || '_for_actor';
    delegate := format('begin return public.%I(auth.uid()); end;', helper);
    select p.prosrc, pg_get_functiondef(p.oid) into strict src, ddl
      from pg_proc p where p.oid = format('public.%I()', name)::regprocedure;
    if src = delegate and to_regprocedure(format('public.%I(uuid)', helper)) is not null then
      continue;
    end if;
    if position('current_user_id := auth.uid();' in src) = 0 or
       (name = 'reset_user_financial_data' and position('public.perform_user_financial_data_reset()' in src) = 0) then
      raise exception 'Unexpected reset function definition: %', name;
    end if;
    execute format('create function public.%I(p_actor uuid) returns jsonb language plpgsql security invoker set search_path = %L as %L',
      helper, '', replace(replace(src, 'current_user_id := auth.uid();', 'current_user_id := p_actor;'),
        'public.perform_user_financial_data_reset()', 'public.perform_user_financial_data_reset_for_actor(p_actor)'));
    execute format('revoke all on function public.%I(uuid) from public, anon, authenticated, service_role', helper);
    execute replace(ddl, src, delegate);
  end loop;
end;
$migration$;

create or replace function public.process_financial_data_reset_job() returns void
language plpgsql security definer set search_path = ''
set lock_timeout = '5s' as $$
declare
  job public.financial_reset_jobs;
  result jsonb;
begin
  select * into job from public.financial_reset_jobs where status = 'pending'
    order by created_at, id limit 1 for no key update skip locked;
  if not found then return; end if;

  begin
    result := public.reset_user_financial_data_for_actor(job.user_id);
    if (result -> 'success') is distinct from 'true'::jsonb then
      raise exception 'Financial reset rejected: %', result ->> 'message';
    end if;
    -- Force deferred FK/constraint triggers inside the error boundary, before
    -- publishing completion. A killed worker rolls everything back to pending.
    set constraints all immediate;
    update public.financial_reset_jobs set status = 'completed', finished_at = now() where id = job.id;
  exception when others or query_canceled then
    update public.financial_reset_jobs set status = 'failed', finished_at = now(),
      failure_detail = left(SQLSTATE || ': ' || SQLERRM, 1024) where id = job.id;
  end;
end;
$$;
revoke all on function public.process_financial_data_reset_job(),
  public.request_financial_data_reset(uuid,uuid), public.get_financial_data_reset(uuid,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.request_financial_data_reset(uuid,uuid), public.get_financial_data_reset(uuid,uuid) to authenticated;

-- One job per transaction; no change to API role timeouts. pg_cron serializes
-- invocations of this named job. Fail migration rather than silently omit the worker.
select cron.schedule('process-financial-data-reset', '5 seconds',
  'set local statement_timeout = 0; select public.process_financial_data_reset_job()');
notify pgrst, 'reload schema';
