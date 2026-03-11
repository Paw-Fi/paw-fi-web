create table if not exists public.onboarding_flow_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  anonymous_id text,
  user_id uuid,
  flow_name text not null,
  page_id text not null,
  event_name text not null,
  step_index integer,
  dwell_ms integer,
  transition_to text,
  platform text not null default 'mobile',
  app_version text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_onboarding_flow_events_created_at
  on public.onboarding_flow_events (created_at desc);

create index if not exists idx_onboarding_flow_events_session_id
  on public.onboarding_flow_events (session_id);

create index if not exists idx_onboarding_flow_events_user_id
  on public.onboarding_flow_events (user_id)
  where user_id is not null;

create index if not exists idx_onboarding_flow_events_event_name
  on public.onboarding_flow_events (event_name);

create index if not exists idx_onboarding_flow_events_page_id
  on public.onboarding_flow_events (page_id);

alter table public.onboarding_flow_events enable row level security;

create table if not exists public.onboarding_flow_sessions (
  session_id text primary key,
  anonymous_id text,
  user_id uuid,
  flow_name text not null,
  current_page_id text,
  current_step_index integer,
  classification text not null default 'in_app_new_user',
  excluded_from_metrics boolean not null default false,
  acquisition_source text not null default 'app_onboarding',
  platform text not null default 'mobile',
  app_version text,
  first_seen_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  last_event_name text,
  last_transition_to text,
  max_stage_rank integer not null default 0,
  properties jsonb not null default '{}'::jsonb
);

create index if not exists idx_onboarding_flow_sessions_last_seen_at
  on public.onboarding_flow_sessions (last_seen_at desc);

create index if not exists idx_onboarding_flow_sessions_user_id
  on public.onboarding_flow_sessions (user_id)
  where user_id is not null;

create index if not exists idx_onboarding_flow_sessions_classification
  on public.onboarding_flow_sessions (classification, excluded_from_metrics);

alter table public.onboarding_flow_sessions enable row level security;

drop policy if exists onboarding_flow_events_insert_anon on public.onboarding_flow_events;
create policy onboarding_flow_events_insert_anon
  on public.onboarding_flow_events
  for insert
  to anon
  with check (
    user_id is null
    and anonymous_id is not null
    and length(trim(session_id)) > 0
  );

drop policy if exists onboarding_flow_events_insert_authenticated on public.onboarding_flow_events;
create policy onboarding_flow_events_insert_authenticated
  on public.onboarding_flow_events
  for insert
  to authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and length(trim(session_id)) > 0
  );

drop policy if exists onboarding_flow_events_select_own on public.onboarding_flow_events;
create policy onboarding_flow_events_select_own
  on public.onboarding_flow_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists onboarding_flow_sessions_insert_anon on public.onboarding_flow_sessions;
create policy onboarding_flow_sessions_insert_anon
  on public.onboarding_flow_sessions
  for insert
  to anon
  with check (
    user_id is null
    and anonymous_id is not null
    and length(trim(session_id)) > 0
  );

drop policy if exists onboarding_flow_sessions_update_anon on public.onboarding_flow_sessions;
create policy onboarding_flow_sessions_update_anon
  on public.onboarding_flow_sessions
  for update
  to anon
  using (
    user_id is null
    and anonymous_id is not null
    and length(trim(session_id)) > 0
  )
  with check (
    user_id is null
    and anonymous_id is not null
    and length(trim(session_id)) > 0
  );

drop policy if exists onboarding_flow_sessions_insert_authenticated on public.onboarding_flow_sessions;
create policy onboarding_flow_sessions_insert_authenticated
  on public.onboarding_flow_sessions
  for insert
  to authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and length(trim(session_id)) > 0
  );

drop policy if exists onboarding_flow_sessions_update_authenticated on public.onboarding_flow_sessions;
create policy onboarding_flow_sessions_update_authenticated
  on public.onboarding_flow_sessions
  for update
  to authenticated
  using (
    (user_id is null or user_id = auth.uid())
    and length(trim(session_id)) > 0
  )
  with check (
    (user_id is null or user_id = auth.uid())
    and length(trim(session_id)) > 0
  );

drop policy if exists onboarding_flow_sessions_select_own on public.onboarding_flow_sessions;
create policy onboarding_flow_sessions_select_own
  on public.onboarding_flow_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.upsert_onboarding_flow_session_checkpoint(
  p_session_id text,
  p_anonymous_id text default null,
  p_user_id uuid default null,
  p_flow_name text default 'onboarding_funnel',
  p_current_page_id text default null,
  p_current_step_index integer default null,
  p_classification text default 'in_app_new_user',
  p_excluded_from_metrics boolean default false,
  p_acquisition_source text default 'app_onboarding',
  p_platform text default 'mobile',
  p_app_version text default null,
  p_last_seen_at timestamptz default timezone('utc'::text, now()),
  p_completed_at timestamptz default null,
  p_last_event_name text default null,
  p_last_transition_to text default null,
  p_max_stage_rank integer default 0,
  p_properties jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    return;
  end if;

  if v_auth_user_id is not null and p_user_id is not null and p_user_id <> v_auth_user_id then
    raise exception 'invalid_user_id';
  end if;

  insert into public.onboarding_flow_sessions (
    session_id,
    anonymous_id,
    user_id,
    flow_name,
    current_page_id,
    current_step_index,
    classification,
    excluded_from_metrics,
    acquisition_source,
    platform,
    app_version,
    first_seen_at,
    last_seen_at,
    completed_at,
    last_event_name,
    last_transition_to,
    max_stage_rank,
    properties
  ) values (
    p_session_id,
    p_anonymous_id,
    coalesce(p_user_id, v_auth_user_id),
    p_flow_name,
    p_current_page_id,
    p_current_step_index,
    p_classification,
    coalesce(p_excluded_from_metrics, false),
    p_acquisition_source,
    p_platform,
    p_app_version,
    coalesce(p_last_seen_at, timezone('utc'::text, now())),
    coalesce(p_last_seen_at, timezone('utc'::text, now())),
    p_completed_at,
    p_last_event_name,
    p_last_transition_to,
    coalesce(p_max_stage_rank, 0),
    coalesce(p_properties, '{}'::jsonb)
  )
  on conflict (session_id) do update
  set
    anonymous_id = coalesce(excluded.anonymous_id, public.onboarding_flow_sessions.anonymous_id),
    user_id = coalesce(excluded.user_id, public.onboarding_flow_sessions.user_id),
    flow_name = excluded.flow_name,
    current_page_id = excluded.current_page_id,
    current_step_index = excluded.current_step_index,
    classification = excluded.classification,
    excluded_from_metrics = excluded.excluded_from_metrics,
    acquisition_source = excluded.acquisition_source,
    platform = excluded.platform,
    app_version = excluded.app_version,
    last_seen_at = greatest(public.onboarding_flow_sessions.last_seen_at, excluded.last_seen_at),
    completed_at = coalesce(excluded.completed_at, public.onboarding_flow_sessions.completed_at),
    last_event_name = excluded.last_event_name,
    last_transition_to = excluded.last_transition_to,
    max_stage_rank = greatest(public.onboarding_flow_sessions.max_stage_rank, excluded.max_stage_rank),
    properties = coalesce(public.onboarding_flow_sessions.properties, '{}'::jsonb) || coalesce(excluded.properties, '{}'::jsonb);
end;
$$;

revoke all on function public.upsert_onboarding_flow_session_checkpoint(text, text, uuid, text, text, integer, text, boolean, text, text, text, timestamptz, timestamptz, text, text, integer, jsonb) from public;
grant execute on function public.upsert_onboarding_flow_session_checkpoint(text, text, uuid, text, text, integer, text, boolean, text, text, text, timestamptz, timestamptz, text, text, integer, jsonb) to anon;
grant execute on function public.upsert_onboarding_flow_session_checkpoint(text, text, uuid, text, text, integer, text, boolean, text, text, text, timestamptz, timestamptz, text, text, integer, jsonb) to authenticated;

create or replace function public.get_creator_onboarding_paywall_metrics(
  p_start_at timestamptz default timezone('utc'::text, now()) - interval '30 days',
  p_end_at timestamptz default timezone('utc'::text, now()),
  p_granularity text default 'day',
  p_platform text default 'all',
  p_cohort text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_creator boolean := false;
  v_result jsonb;
begin
  select coalesce(u.is_creator, false)
  into v_is_creator
  from public.users u
  where u.id = v_user_id;

  if not v_is_creator then
    return jsonb_build_object('success', false, 'error', 'creator_only');
  end if;

  with session_source as (
    select *
    from public.onboarding_flow_sessions s
    where s.first_seen_at >= p_start_at
      and s.first_seen_at <= p_end_at
      and (p_platform = 'all' or lower(s.platform) = lower(p_platform))
  ),
  filtered_sessions as (
    select
      s.*,
      case
        when s.classification = 'existing_user_reentry' or s.excluded_from_metrics then 'excluded_existing'
        when s.classification = 'external_subscription_new_user' then 'external_prepaid'
        else 'in_app_new'
      end as cohort_key,
      case
        when s.completed_at is not null then false
        when s.last_seen_at > timezone('utc'::text, now()) - interval '30 minutes' then false
        else true
      end as is_abandoned,
      (s.completed_at is not null) as completed_flow,
      (s.max_stage_rank >= 8) as completed_purchase
    from session_source s
    where (
      p_cohort = 'all'
      or (p_cohort = 'in_app_new' and s.classification <> 'existing_user_reentry' and coalesce(s.excluded_from_metrics, false) = false and s.classification <> 'external_subscription_new_user')
      or (p_cohort = 'external_prepaid' and s.classification = 'external_subscription_new_user')
      or (p_cohort = 'excluded_existing' and (s.classification = 'existing_user_reentry' or coalesce(s.excluded_from_metrics, false) = true))
    )
  ),
  filtered_events as (
    select e.*
    from public.onboarding_flow_events e
    join filtered_sessions s on s.session_id = e.session_id
    where e.created_at >= p_start_at
      and e.created_at <= p_end_at
  ),
  latest_selected_plan as (
    select distinct on (e.session_id)
      e.session_id,
      nullif(e.properties ->> 'selected_plan', '') as selected_plan,
      nullif(e.properties ->> 'billing_interval', '') as billing_interval
    from filtered_events e
    where e.event_name = 'action_taken'
      and e.properties ->> 'action_id' = 'plan_selected'
    order by e.session_id, e.created_at desc
  ),
  paywall_breakdown_rows as (
    select
      coalesce(lp.selected_plan, 'unknown') as selected_plan,
      lp.billing_interval,
      count(*) filter (where s.max_stage_rank >= 6) as paywall_views,
      count(*) filter (where s.max_stage_rank >= 7) as checkout_starts,
      count(*) filter (where s.max_stage_rank >= 8) as purchase_successes,
      count(*) filter (where exists(select 1 from filtered_events e where e.session_id = s.session_id and e.event_name = 'paywall_purchase_cancelled')) as purchase_cancellations,
      count(*) filter (where exists(select 1 from filtered_events e where e.session_id = s.session_id and e.event_name = 'paywall_purchase_failed')) as purchase_failures,
      count(*) filter (where s.is_abandoned and s.current_page_id = 'paywall') as abandonments,
      case
        when count(*) filter (where s.max_stage_rank >= 7) = 0 then 0
        else round((count(*) filter (where s.max_stage_rank >= 8))::numeric / (count(*) filter (where s.max_stage_rank >= 7))::numeric * 100, 2)
      end as conversion_rate,
      case
        when count(*) filter (where s.max_stage_rank >= 6) = 0 then 0
        else round((count(*) filter (where s.is_abandoned and s.current_page_id = 'paywall'))::numeric / (count(*) filter (where s.max_stage_rank >= 6))::numeric * 100, 2)
      end as abandonment_rate
    from filtered_sessions s
    left join latest_selected_plan lp on lp.session_id = s.session_id
    group by coalesce(lp.selected_plan, 'unknown'), lp.billing_interval
  ),
  post_auth_usage_rows as (
    select
      e.properties ->> 'step_key' as step_key,
      count(*) filter (where e.properties ->> 'result' = 'used') as used_count,
      count(*) filter (where e.properties ->> 'result' = 'skipped') as skipped_count
    from filtered_events e
    where e.event_name = 'action_taken'
      and e.properties ->> 'step_group' = 'post_auth'
    group by e.properties ->> 'step_key'
  ),
  funnel_rows as (
    select * from (
      values
        (1, 'preview_seen', (select count(*) from filtered_sessions where max_stage_rank >= 1)),
        (2, 'intro_seen', (select count(*) from filtered_sessions where max_stage_rank >= 2)),
        (3, 'preauth_started', (select count(*) from filtered_sessions where max_stage_rank >= 3)),
        (4, 'account_preparing_seen', (select count(*) from filtered_sessions where max_stage_rank >= 4)),
        (5, 'postauth_seen', (select count(*) from filtered_sessions where max_stage_rank >= 5)),
        (6, 'paywall_seen', (select count(*) from filtered_sessions where max_stage_rank >= 6)),
        (7, 'subscribe_tapped', (select count(*) from filtered_sessions where max_stage_rank >= 7)),
        (8, 'purchase_succeeded', (select count(*) from filtered_sessions where max_stage_rank >= 8))
    ) as t(step_rank, step_key, session_count)
  ),
  funnel_rows_with_rates as (
    select
      fr.step_rank,
      fr.step_key,
      fr.session_count,
      case
        when lag(fr.session_count) over (order by fr.step_rank) is null then null
        when lag(fr.session_count) over (order by fr.step_rank) = 0 then null
        else round((fr.session_count::numeric / lag(fr.session_count) over (order by fr.step_rank)::numeric) * 100, 2)
      end as conversion_rate_from_previous,
      case
        when lag(fr.session_count) over (order by fr.step_rank) is null then null
        when lag(fr.session_count) over (order by fr.step_rank) = 0 then null
        else round((1 - (fr.session_count::numeric / lag(fr.session_count) over (order by fr.step_rank)::numeric)) * 100, 2)
      end as dropoff_rate_from_previous
    from funnel_rows fr
  ),
  timeseries_rows as (
    select
      case
        when p_granularity = 'month' then to_char(date_trunc('month', s.first_seen_at), 'YYYY-MM-01')
        when p_granularity = 'week' then to_char(date_trunc('week', s.first_seen_at), 'YYYY-MM-DD')
        else to_char(date_trunc('day', s.first_seen_at), 'YYYY-MM-DD')
      end as bucket,
      count(*) as session_starts,
      count(*) filter (where s.completed_flow) as flow_completions,
      count(*) filter (where s.completed_purchase) as purchase_successes,
      count(*) filter (where s.is_abandoned) as abandonments
    from filtered_sessions s
    group by 1
    order by 1
  ),
  cohort_counts as (
    select
      count(*) filter (where cohort_key = 'in_app_new') as in_app_new_users,
      count(*) filter (where cohort_key = 'external_prepaid') as external_prepaid_users,
      count(*) filter (where cohort_key = 'excluded_existing') as excluded_existing_users
    from filtered_sessions
  )
  select jsonb_build_object(
    'success', true,
    'filters', jsonb_build_object('start_at', p_start_at, 'end_at', p_end_at, 'granularity', p_granularity, 'platform', p_platform, 'cohort', p_cohort),
    'summary', jsonb_build_object(
      'sessions', (select count(*) from filtered_sessions),
      'in_app_new_users', (select in_app_new_users from cohort_counts),
      'external_prepaid_users', (select external_prepaid_users from cohort_counts),
      'excluded_existing_users', (select excluded_existing_users from cohort_counts),
      'completed_flow_sessions', (select count(*) from filtered_sessions where completed_flow),
      'paywall_views', (select count(*) from filtered_sessions where max_stage_rank >= 6),
      'checkout_starts', (select count(*) from filtered_sessions where max_stage_rank >= 7),
      'purchase_successes', (select count(*) from filtered_sessions where max_stage_rank >= 8),
      'purchase_cancellations', (select count(*) from filtered_events where event_name = 'paywall_purchase_cancelled'),
      'purchase_failures', (select count(*) from filtered_events where event_name = 'paywall_purchase_failed'),
      'abandoned_sessions', (select count(*) from filtered_sessions where is_abandoned),
      'avg_dwell_ms', coalesce((select round(avg(dwell_ms))::int from filtered_events where dwell_ms is not null), 0)
    ),
    'funnel', coalesce((select jsonb_agg(jsonb_build_object('step_rank', fr.step_rank, 'step_key', fr.step_key, 'session_count', fr.session_count, 'conversion_rate_from_previous', fr.conversion_rate_from_previous, 'dropoff_rate_from_previous', fr.dropoff_rate_from_previous) order by fr.step_rank) from funnel_rows_with_rates fr), '[]'::jsonb),
    'post_auth_usage', coalesce((select jsonb_agg(jsonb_build_object('step_key', p.step_key, 'used_count', p.used_count, 'skipped_count', p.skipped_count, 'use_rate', case when (p.used_count + p.skipped_count) = 0 then 0 else round((p.used_count::numeric / (p.used_count + p.skipped_count)::numeric) * 100, 2) end, 'skip_rate', case when (p.used_count + p.skipped_count) = 0 then 0 else round((p.skipped_count::numeric / (p.used_count + p.skipped_count)::numeric) * 100, 2) end) order by p.step_key) from post_auth_usage_rows p), '[]'::jsonb),
    'paywall_breakdown', coalesce((select jsonb_agg(jsonb_build_object('selected_plan', pb.selected_plan, 'billing_interval', pb.billing_interval, 'paywall_views', pb.paywall_views, 'checkout_starts', pb.checkout_starts, 'purchase_successes', pb.purchase_successes, 'purchase_cancellations', pb.purchase_cancellations, 'purchase_failures', pb.purchase_failures, 'abandonments', pb.abandonments, 'conversion_rate', pb.conversion_rate, 'abandonment_rate', pb.abandonment_rate) order by pb.selected_plan, pb.billing_interval) from paywall_breakdown_rows pb), '[]'::jsonb),
    'exit_pages', coalesce((select jsonb_agg(jsonb_build_object('page_id', page_id, 'exits', exits, 'exit_rate', case when total_abandoned = 0 then 0 else round((exits::numeric / total_abandoned::numeric) * 100, 2) end) order by exits desc, page_id) from (select s.current_page_id as page_id, count(*) as exits, sum(count(*)) over () as total_abandoned from filtered_sessions s where s.is_abandoned group by s.current_page_id) exit_rows), '[]'::jsonb),
    'recent_exit_pages', coalesce((select jsonb_agg(jsonb_build_object('page_id', page_id, 'exits', exits, 'exit_rate', case when total_recent = 0 then 0 else round((exits::numeric / total_recent::numeric) * 100, 2) end) order by exits desc, page_id) from (select s.current_page_id as page_id, count(*) as exits, sum(count(*)) over () as total_recent from filtered_sessions s where s.completed_at is null and s.last_seen_at > timezone('utc'::text, now()) - interval '30 minutes' group by s.current_page_id) recent_exit_rows), '[]'::jsonb),
    'timeseries', coalesce((select jsonb_agg(jsonb_build_object('bucket', t.bucket, 'session_starts', t.session_starts, 'flow_completions', t.flow_completions, 'purchase_successes', t.purchase_successes, 'abandonments', t.abandonments) order by t.bucket) from timeseries_rows t), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_creator_onboarding_paywall_metrics(timestamptz, timestamptz, text, text, text) from public;
revoke all on function public.get_creator_onboarding_paywall_metrics(timestamptz, timestamptz, text, text, text) from anon;
grant execute on function public.get_creator_onboarding_paywall_metrics(timestamptz, timestamptz, text, text, text) to authenticated;

comment on function public.get_creator_onboarding_paywall_metrics(timestamptz, timestamptz, text, text, text) is
  'Returns creator-only onboarding and paywall analytics, using server-side session checkpoints for drop-off visibility even when the user never reopens the app.';
