/// <reference lib="deno.ns" />

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20261003130000_recurring_overdue_confirmation_nudges.sql",
    import.meta.url,
  ),
);
const pushDelivery = await Deno.readTextFile(
  new URL("../households-send-push-notification/index.ts", import.meta.url),
);
const fallbackWorker = await Deno.readTextFile(
  new URL("../households-process-notifications/index.ts", import.meta.url),
);

Deno.test(
  "overdue nudge producer is recipient-local, idempotent, and bounded",
  () => {
    assert(
      migration.includes("recurring_overdue_nudges_sent") &&
        migration.includes(
          "unique (expense_id, occurrence_date, recipient_user_id, stage)",
        ),
      "Each recipient, occurrence, and overdue stage must have a durable idempotency ledger",
    );
    assert(
      migration.includes("recurring_recipient_wall_now_v1") &&
        migration.includes("pg_timezone_names") &&
        migration.includes("UTC|GMT"),
      "Recipient local time must support validated IANA zones and app fixed UTC/GMT offsets",
    );
    assert(
      migration.includes("time '09:00:00'") &&
        migration.includes("stage_day_offset") &&
        migration.includes("stage_hour_offset"),
      "Non-daily stages must start at 09:00 local days 1 and 3; daily stages must use hour offsets",
    );
    assert(
      migration.includes(
        "candidate.target_wall_time, candidate.recipient_user_id) + interval '30 minutes'",
      ) &&
        migration.includes("'expires_at'") &&
        migration.includes("'deep_link', 'moneko://recurring/'"),
      "The producer must only create events in their intended window, carry the exact deep link, and give delivery a stale-event boundary",
    );
  },
);

Deno.test(
  "overdue nudge storage and delivery claim are service-only and serialized",
  () => {
    assert(
      migration.includes("enable row level security") &&
        migration.includes(
          "revoke all on table public.recurring_overdue_nudges_sent",
        ) &&
        migration.includes("for all to service_role"),
      "The overdue nudge ledger must not be accessible to public, anon, or authenticated roles",
    );
    assert(
      migration.includes("pg_advisory_xact_lock") &&
        migration.includes("v_stage_three_target") &&
        migration.includes("obsolete because stage 3 is eligible"),
      "Claims for one recipient, series, and occurrence must serialize and collapse a deferred stage 1 only once stage 3 is eligible",
    );
  },
);

Deno.test(
  "overdue nudge clock calculations are timezone-safe and revalidated",
  () => {
    assert(
      migration.includes("p_now at time zone 'UTC'") &&
        migration.includes("coalesce(v_offset_match[3], '0')::integer > 59") &&
        migration.includes("v_occurrence_date + v_due_time") &&
        migration.includes(
          "now() < public.recurring_wall_timestamp_to_utc_v1(",
        ) &&
        migration.includes(
          "v_target_wall_time, v_event.user_id) + v_delivery_window",
        ),
      "Fixed offsets, date/time arithmetic, and edited due clocks must be validated before delivery",
    );
  },
);

Deno.test(
  "overdue nudges preserve recurring cleanup and delivery authority",
  () => {
    assert(
      migration.includes("'recurring_reminder'") &&
        migration.includes("'phase', 'overdue'") &&
        migration.includes("claim_notification_event"),
      "Overdue events must reuse recurring cleanup and be revalidated by the shared delivery claim",
    );
    assert(
      migration.includes("deleted_at is null") &&
        migration.includes("excluded_dates") &&
        migration.includes("status in ('confirmed', 'skipped')"),
      "Deleted, excluded, confirmed, and skipped occurrences must be suppressed before delivery",
    );
    assert(
      migration.includes("cron.schedule") &&
        migration.includes("'*/10 * * * *'"),
      "A retry-safe producer cron must run at the existing reminder cadence",
    );
  },
);

Deno.test(
  "primary delivery gives overdue nudges gentle occurrence-aware copy",
  () => {
    assert(
      pushDelivery.includes("buildRecurringReminderNotification") &&
        fallbackWorker.includes("buildRecurringReminderNotification") &&
        fallbackWorker.includes("messageData = recurringReminder.data"),
      "Primary and fallback push delivery must share the exact recurring formatter and occurrence deep link",
    );
  },
);
