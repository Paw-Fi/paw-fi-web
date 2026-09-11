-- Create one review event on each user's financial-cycle start, evaluated in
-- their saved IANA timezone. The unique event index from the original rollout
-- keeps the 15-minute producer idempotent.
CREATE OR REPLACE FUNCTION public.enqueue_pockets_month_review_notifications_v1()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_created INTEGER := 0;
BEGIN
  WITH latest_contacts AS (
    SELECT DISTINCT ON (contact.user_id)
      contact.user_id,
      CASE WHEN EXISTS (
        SELECT 1 FROM pg_timezone_names timezone_name
        WHERE timezone_name.name = NULLIF(TRIM(contact.preferred_timezone), '')
      ) THEN NULLIF(TRIM(contact.preferred_timezone), '') ELSE 'UTC' END AS timezone_name
    FROM public.user_contacts contact
    WHERE contact.user_id IS NOT NULL
    ORDER BY contact.user_id, contact.updated_at DESC NULLS LAST,
      contact.created_at DESC, contact.id DESC
  ), eligible_users AS (
    SELECT
      contact.user_id,
      contact.timezone_name,
      public.financial_cycle_start_for_month(
        (timezone(contact.timezone_name, now()))::date,
        public.user_financial_month_start_day(contact.user_id)
      ) AS cycle_start
    FROM latest_contacts contact
    WHERE (timezone(contact.timezone_name, now()))::time >= time '09:00'
      AND (timezone(contact.timezone_name, now()))::time < time '12:00'
      AND public.financial_cycle_start_for_month(
        (timezone(contact.timezone_name, now()))::date,
        public.user_financial_month_start_day(contact.user_id)
      ) = (timezone(contact.timezone_name, now()))::date
      AND NOT EXISTS (
        SELECT 1 FROM public.sharing_prefs preference
        WHERE preference.user_id = contact.user_id
          AND preference.household_id IS NULL
          AND preference.enable_nudges IS FALSE
      )
  ), candidates AS (
    SELECT eligible.user_id, eligible.timezone_name, eligible.cycle_start
    FROM eligible_users eligible
    WHERE EXISTS (
      SELECT 1
      FROM public.budgets budget
      JOIN public.budget_envelopes envelope ON envelope.budget_id = budget.id
      WHERE date_trunc('month', budget.period_month)::date =
          date_trunc('month', eligible.cycle_start - interval '1 month')::date
        AND (
          (budget.household_id IS NULL AND budget.user_id = eligible.user_id)
          OR EXISTS (
            SELECT 1 FROM public.household_members member
            WHERE member.household_id = budget.household_id
              AND member.user_id = eligible.user_id
              AND member.role IN ('owner', 'admin')
          )
        )
    )
  ), inserted AS (
    INSERT INTO public.notification_events (user_id, event_type, payload)
    SELECT candidate.user_id, 'pockets_month_review', jsonb_build_object(
      'cycle_start', candidate.cycle_start,
      'financial_cycle_label',
        to_char(candidate.cycle_start, 'Mon FMDD') || ' - ' ||
        to_char(
          public.next_financial_cycle_start(
            candidate.cycle_start,
            public.user_financial_month_start_day(candidate.user_id)
          ) - 1,
          'Mon FMDD, YYYY'
        ),
      'expires_at',
        ((candidate.cycle_start + 1)::timestamp AT TIME ZONE candidate.timezone_name),
      'action', 'openPocketsPage'
    )
    FROM candidates candidate
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_created FROM inserted;

  RETURN jsonb_build_object('created', v_created);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_pockets_month_review_notifications_v1()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_pockets_month_review_notifications_v1()
  TO service_role;

DO $$ BEGIN
  PERFORM cron.unschedule('pockets-month-review-notifications');
EXCEPTION WHEN OTHERS THEN
  NULL;
END; $$;

SELECT cron.schedule(
  'pockets-month-review-notifications',
  '*/15 * * * *',
  $job$
    SELECT net.http_post(
      url := rtrim((
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_url'
        LIMIT 1
      ), '/') || '/functions/v1/pockets-month-review-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'notification_internal_secret_key'
          LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
