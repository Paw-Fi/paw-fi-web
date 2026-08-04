/*
  Android notification-capture post-deployment health report

  READ ONLY: this script contains one SELECT and does not mutate any data.

  Set deployed_at_utc to the exact deployment time of the final
  classify-notification-capture and save-wallet-transaction bundles.

  This report proves database outcomes retained after that boundary. It cannot
  prove which Edge Function source bundle is deployed, whether FCM displayed an
  already accepted pre-deployment message, or whether a real Android
  notification reached the listener. Complete the controlled smoke test in
  Android Notification Capture Remediation.md as well.
*/

with
params as (
  select
    -- Replace with the exact final backend deployment time.
    now() - interval '24 hours' as deployed_at_utc,
    now() as report_end_utc,
    'android_notification_classifier_v8'::text as expected_pipeline_version
),
required_rpcs as (
  select
    to_regprocedure(
      'public.claim_notification_capture_classification_v2(uuid,text,text,text,integer,text,text,integer)'
    ) is not null as has_classification_claim_v2,
    to_regprocedure(
      'public.claim_android_wallet_capture_event_v2(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamp with time zone,text,text,boolean)'
    ) is not null as has_android_capture_claim_v2,
    to_regprocedure(
      'public.resolve_default_account(uuid,uuid,text)'
    ) is not null as has_default_account_resolver,
    to_regprocedure(
      'public.get_mobile_delta_v5(uuid,timestamp with time zone,uuid,integer)'
    ) is not null as has_mobile_delta_v5
),
classifications as (
  select
    classification.id,
    classification.user_id,
    classification.status,
    classification.decision,
    coalesce(
      nullif(classification.reason_code, ''),
      nullif(classification.result ->> 'reasonCode', ''),
      'none'
    ) as reason_code,
    classification.expense_id,
    classification.context_hash,
    classification.result,
    classification.updated_at
  from public.notification_capture_classifications as classification
  cross join params
  where classification.updated_at >= params.deployed_at_utc
    and classification.updated_at < params.report_end_utc
),
classification_outcomes as (
  select
    classification.status,
    coalesce(classification.decision, 'none') as decision,
    classification.reason_code,
    coalesce(
      nullif(classification.result ->> 'pipelineVersion', ''),
      nullif(
        classification.result -> 'classification' ->> 'pipelineVersion',
        ''
      ),
      'missing'
    ) as pipeline_version,
    count(*)::bigint as event_count,
    count(distinct classification.user_id)::bigint as user_count
  from classifications as classification
  group by
    classification.status,
    coalesce(classification.decision, 'none'),
    classification.reason_code,
    coalesce(
      nullif(classification.result ->> 'pipelineVersion', ''),
      nullif(
        classification.result -> 'classification' ->> 'pipelineVersion',
        ''
      ),
      'missing'
    )
),
saved_rows as (
  select
    classification.id as classification_id,
    classification.user_id,
    classification.expense_id,
    expense.id as existing_expense_id,
    expense.deleted_at,
    expense.account_id,
    expense.currency as expense_currency,
    expense.wallet_capture_idempotency_key,
    account.currency as account_currency
  from classifications as classification
  left join public.expenses as expense
    on expense.id = classification.expense_id
  left join public.accounts as account
    on account.id = expense.account_id
  where classification.status = 'saved'
),
saved_integrity as (
  select
    count(*)::bigint as saved_classification_count,
    count(*) filter (
      where saved_rows.expense_id is not null
    )::bigint as saved_with_expense_id,
    count(*) filter (
      where saved_rows.existing_expense_id is not null
        and saved_rows.deleted_at is null
    )::bigint as saved_with_active_expense,
    count(*) filter (
      where saved_rows.expense_id is null
        or saved_rows.existing_expense_id is null
    )::bigint as saved_missing_expense,
    count(*) filter (
      where saved_rows.deleted_at is not null
    )::bigint as saved_soft_deleted_expense,
    count(*) filter (
      where saved_rows.existing_expense_id is not null
        and saved_rows.wallet_capture_idempotency_key is null
    )::bigint as saved_missing_wallet_idempotency_key,
    count(*) filter (
      where saved_rows.existing_expense_id is not null
        and saved_rows.account_id is null
    )::bigint as saved_unassigned_expense,
    count(*) filter (
      where saved_rows.account_id is not null
        and upper(coalesce(saved_rows.expense_currency, '')) <>
          upper(coalesce(saved_rows.account_currency, ''))
    )::bigint as saved_wallet_currency_mismatch
  from saved_rows
),
duplicate_idempotency as (
  select count(*)::bigint as duplicate_idempotency_key_groups
  from (
    select expense.wallet_capture_idempotency_key
    from public.expenses as expense
    cross join params
    where expense.created_at >= params.deployed_at_utc
      and expense.created_at < params.report_end_utc
      and expense.wallet_capture_idempotency_key is not null
      and expense.deleted_at is null
    group by expense.wallet_capture_idempotency_key
    having count(*) > 1
  ) as duplicate_group
),
capture_notification_events as (
  select count(*)::bigint as notification_event_count
  from public.notification_events as notification_event
  join saved_rows
    on saved_rows.expense_id is not null
    and notification_event.payload ->> 'expense_id' =
      saved_rows.expense_id::text
  cross join params
  where notification_event.created_at >= params.deployed_at_utc
    and notification_event.created_at < params.report_end_utc
),
retry_health as (
  select
    count(*) filter (
      where classification.status = 'processing'
        and classification.updated_at < now() - interval '10 minutes'
    )::bigint as stale_processing_events,
    count(*) filter (
      where classification.status = 'failed'
        and classification.result ->> 'retryable' = 'true'
    )::bigint as retryable_failed_events,
    count(*) filter (
      where classification.status = 'failed'
        and classification.result ->> 'retryable' = 'false'
    )::bigint as terminal_failed_events,
    count(*) filter (
      where classification.status in ('ignored', 'saved', 'failed')
        and coalesce(
          nullif(classification.result ->> 'pipelineVersion', ''),
          nullif(
            classification.result -> 'classification' ->> 'pipelineVersion',
            ''
          )
        ) is distinct from params.expected_pipeline_version
    )::bigint as unexpected_pipeline_rows
  from classifications as classification
  cross join params
),
attempt_health as (
  select
    coalesce(max(attempts.attempt_count), 0)::bigint
      as maximum_attempts_for_one_event_context,
    count(*) filter (
      where attempts.attempt_count > 3
    )::bigint as event_contexts_over_three_attempts
  from (
    select
      attempt.event_id,
      attempt.pipeline_version,
      attempt.context_hash,
      count(*)::bigint as attempt_count
    from public.notification_capture_ai_attempts as attempt
    cross join params
    where attempt.created_at >= params.deployed_at_utc
      and attempt.created_at < params.report_end_utc
    group by
      attempt.event_id,
      attempt.pipeline_version,
      attempt.context_hash
  ) as attempts
)
select jsonb_pretty(
  jsonb_build_object(
    'report_name', 'android_notification_capture_post_deploy_health',
    'generated_at_utc', now(),
    'window', jsonb_build_object(
      'deployed_at_utc', params.deployed_at_utc,
      'report_end_utc', params.report_end_utc,
      'expected_pipeline_version', params.expected_pipeline_version
    ),
    'required_rpcs', to_jsonb(required_rpcs),
    'saved_integrity', to_jsonb(saved_integrity),
    'duplicate_idempotency', to_jsonb(duplicate_idempotency),
    'capture_notification_events', to_jsonb(capture_notification_events),
    'retry_health', to_jsonb(retry_health),
    'attempt_health', to_jsonb(attempt_health),
    'classification_outcomes', coalesce(
      (
        select jsonb_agg(
          to_jsonb(classification_outcomes)
          order by classification_outcomes.event_count desc,
            classification_outcomes.status,
            classification_outcomes.reason_code
        )
        from classification_outcomes
      ),
      '[]'::jsonb
    ),
    'pass_conditions', jsonb_build_array(
      'All required_rpcs values are true.',
      'saved_missing_expense is 0.',
      'saved_soft_deleted_expense is 0 for the smoke capture.',
      'saved_missing_wallet_idempotency_key is 0.',
      'saved_wallet_currency_mismatch is 0.',
      'duplicate_idempotency_key_groups is 0.',
      'notification_event_count is 0 for captured expense IDs.',
      'stale_processing_events is 0.',
      'unexpected_pipeline_rows is 0 after using the exact final deployment boundary.',
      'event_contexts_over_three_attempts is 0.'
    ),
    'limitations', jsonb_build_array(
      'This report cannot inspect the deployed Edge Function source bundle.',
      'A zero event count is not proof that a real Android notification reached the backend.',
      'Saved unassigned expenses are valid and appear in general Home and Transactions feeds, but not in Wallet Detail.',
      'Mobile delta visibility still requires an authenticated app resume smoke test.',
      'Completed classification rows older than seven days may be deleted.',
      'This report does not prove FCM receipt, display, or view state.'
    )
  )
)
from params
cross join required_rpcs
cross join saved_integrity
cross join duplicate_idempotency
cross join capture_notification_events
cross join retry_health
cross join attempt_health;
