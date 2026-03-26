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
      (s.completed_at is not null) as completed_flow
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
  sessions_enriched as (
    select
      s.session_id,
      s.anonymous_id,
      s.user_id,
      s.flow_name,
      s.current_page_id,
      s.current_step_index,
      s.classification,
      s.excluded_from_metrics,
      s.acquisition_source,
      s.platform,
      s.app_version,
      s.first_seen_at,
      s.last_seen_at,
      s.completed_at,
      s.last_event_name,
      s.last_transition_to,
      s.max_stage_rank,
      s.properties,
      s.cohort_key,
      s.is_abandoned,
      s.completed_flow as completed_flow_checkpoint,
      greatest(
        coalesce(er.max_event_page_rank, 0),
        case
          when s.current_page_id = 'paywall' then 6
          when s.current_page_id like 'post_auth_%' or s.current_page_id like 'onboarding_setup_%' then 5
          when s.current_page_id = 'onboarding_account_preparing' then 4
          when s.current_page_id like 'preauth_%' then 3
          when s.current_page_id = 'onboarding_intro' then 2
          when s.current_page_id = 'onboarding_preview' then 1
          else 0
        end
      ) as max_page_rank,
      coalesce(er.has_checkout_started, false) as has_checkout_started,
      coalesce(er.has_purchase_succeeded, false) as has_purchase_succeeded,
      coalesce(er.has_flow_completed, false) as has_flow_completed,
      greatest(
        greatest(
          coalesce(er.max_event_page_rank, 0),
          case
            when s.current_page_id = 'paywall' then 6
            when s.current_page_id like 'post_auth_%' or s.current_page_id like 'onboarding_setup_%' then 5
            when s.current_page_id = 'onboarding_account_preparing' then 4
            when s.current_page_id like 'preauth_%' then 3
            when s.current_page_id = 'onboarding_intro' then 2
            when s.current_page_id = 'onboarding_preview' then 1
            else 0
          end
        ),
        case when coalesce(er.has_checkout_started, false) then 7 else 0 end,
        case when coalesce(er.has_purchase_succeeded, false) then 8 else 0 end
      ) as effective_stage_rank,
      (s.completed_at is not null or coalesce(er.has_flow_completed, false)) as completed_flow,
      coalesce(er.has_purchase_succeeded, false) as completed_purchase
    from filtered_sessions s
    left join (
      select
        e.session_id,
        max(
          case
            when e.page_id = 'paywall' then 6
            when e.page_id like 'post_auth_%' or e.page_id like 'onboarding_setup_%' then 5
            when e.page_id = 'onboarding_account_preparing' then 4
            when e.page_id like 'preauth_%' then 3
            when e.page_id = 'onboarding_intro' then 2
            when e.page_id = 'onboarding_preview' then 1
            else 0
          end
        ) as max_event_page_rank,
        bool_or(
          e.event_name = 'paywall_checkout_started'
          or (e.event_name = 'action_taken' and e.properties ->> 'action_id' = 'subscribe_tapped')
        ) as has_checkout_started,
        bool_or(e.event_name = 'paywall_purchase_succeeded') as has_purchase_succeeded,
        bool_or(e.event_name = 'flow_completed') as has_flow_completed
      from filtered_events e
      group by e.session_id
    ) er on er.session_id = s.session_id
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
  latest_checkout_plan as (
    select distinct on (e.session_id)
      e.session_id,
      nullif(e.properties ->> 'selected_plan', '') as selected_plan,
      nullif(e.properties ->> 'billing_interval', '') as billing_interval
    from filtered_events e
    where e.event_name = 'paywall_checkout_started'
    order by e.session_id, e.created_at desc
  ),
  latest_purchase_plan as (
    select distinct on (e.session_id)
      e.session_id,
      nullif(e.properties ->> 'selected_plan', '') as selected_plan,
      nullif(e.properties ->> 'billing_interval', '') as billing_interval
    from filtered_events e
    where e.event_name = 'paywall_purchase_succeeded'
    order by e.session_id, e.created_at desc
  ),
  latest_paywall_completion_plan as (
    select distinct on (e.session_id)
      e.session_id,
      nullif(e.properties ->> 'selected_plan', '') as selected_plan,
      nullif(e.properties ->> 'billing_interval', '') as billing_interval
    from filtered_events e
    where e.event_name = 'flow_completed'
      and e.page_id = 'paywall'
    order by e.session_id, e.created_at desc
  ),
  attributed_plan as (
    select
      s.session_id,
      coalesce(sp.selected_plan, cp.selected_plan, pp.selected_plan, fp.selected_plan, 'unknown') as selected_plan,
      coalesce(sp.billing_interval, cp.billing_interval, pp.billing_interval, fp.billing_interval) as billing_interval
    from sessions_enriched s
    left join latest_selected_plan sp on sp.session_id = s.session_id
    left join latest_checkout_plan cp on cp.session_id = s.session_id
    left join latest_purchase_plan pp on pp.session_id = s.session_id
    left join latest_paywall_completion_plan fp on fp.session_id = s.session_id
  ),
  paywall_breakdown_rows as (
    select
      ap.selected_plan,
      ap.billing_interval,
      count(*) filter (where s.effective_stage_rank >= 6) as paywall_views,
      count(*) filter (where s.effective_stage_rank >= 7) as checkout_starts,
      count(*) filter (where s.completed_purchase) as purchase_successes,
      count(*) filter (where exists(select 1 from filtered_events e where e.session_id = s.session_id and e.event_name = 'paywall_purchase_cancelled')) as purchase_cancellations,
      count(*) filter (where exists(select 1 from filtered_events e where e.session_id = s.session_id and e.event_name = 'paywall_purchase_failed')) as purchase_failures,
      count(*) filter (where s.is_abandoned and s.current_page_id = 'paywall') as abandonments,
      case
        when count(*) filter (where s.effective_stage_rank >= 7) = 0 then 0
        else round((count(*) filter (where s.completed_purchase))::numeric / (count(*) filter (where s.effective_stage_rank >= 7))::numeric * 100, 2)
      end as conversion_rate,
      case
        when count(*) filter (where s.effective_stage_rank >= 6) = 0 then 0
        else round((count(*) filter (where s.is_abandoned and s.current_page_id = 'paywall'))::numeric / (count(*) filter (where s.effective_stage_rank >= 6))::numeric * 100, 2)
      end as abandonment_rate
    from sessions_enriched s
    left join attributed_plan ap on ap.session_id = s.session_id
    group by ap.selected_plan, ap.billing_interval
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
        (1, 'preview_seen', (select count(*) from sessions_enriched where effective_stage_rank >= 1)),
        (2, 'intro_seen', (select count(*) from sessions_enriched where effective_stage_rank >= 2)),
        (3, 'preauth_started', (select count(*) from sessions_enriched where effective_stage_rank >= 3)),
        (4, 'account_preparing_seen', (select count(*) from sessions_enriched where effective_stage_rank >= 4)),
        (5, 'postauth_seen', (select count(*) from sessions_enriched where effective_stage_rank >= 5)),
        (6, 'paywall_seen', (select count(*) from sessions_enriched where effective_stage_rank >= 6)),
        (7, 'subscribe_tapped', (select count(*) from sessions_enriched where effective_stage_rank >= 7)),
        (8, 'purchase_succeeded', (select count(*) from sessions_enriched where completed_purchase))
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
    from sessions_enriched s
    group by 1
    order by 1
  ),
  cohort_counts as (
    select
      count(*) filter (where cohort_key = 'in_app_new') as in_app_new_users,
      count(*) filter (where cohort_key = 'external_prepaid') as external_prepaid_users,
      count(*) filter (where cohort_key = 'excluded_existing') as excluded_existing_users
    from sessions_enriched
  )
  select jsonb_build_object(
    'success', true,
    'filters', jsonb_build_object('start_at', p_start_at, 'end_at', p_end_at, 'granularity', p_granularity, 'platform', p_platform, 'cohort', p_cohort),
    'summary', jsonb_build_object(
      'sessions', (select count(*) from sessions_enriched),
      'in_app_new_users', (select in_app_new_users from cohort_counts),
      'external_prepaid_users', (select external_prepaid_users from cohort_counts),
      'excluded_existing_users', (select excluded_existing_users from cohort_counts),
      'completed_flow_sessions', (select count(*) from sessions_enriched where completed_flow),
      'paywall_views', (select count(*) from sessions_enriched where effective_stage_rank >= 6),
      'checkout_starts', (select count(*) from sessions_enriched where effective_stage_rank >= 7),
      'purchase_successes', (select count(*) from sessions_enriched where completed_purchase),
      'paywall_return_trial_grants', (select count(*) from filtered_events where event_name = 'paywall_return_trial_granted'),
      'purchase_cancellations', (select count(*) from filtered_events where event_name = 'paywall_purchase_cancelled'),
      'purchase_failures', (select count(*) from filtered_events where event_name = 'paywall_purchase_failed'),
      'abandoned_sessions', (select count(*) from sessions_enriched where is_abandoned),
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
  'Returns creator-only onboarding and paywall analytics, including paywall return trial grants.';
