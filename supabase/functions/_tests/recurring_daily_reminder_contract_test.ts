/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260921120000_daily_until_due_recurring_reminders.sql",
    import.meta.url,
  ),
);
const pushDelivery = await Deno.readTextFile(
  new URL("../households-send-push-notification/index.ts", import.meta.url),
);
const fallbackWorker = await Deno.readTextFile(
  new URL("../households-process-notifications/index.ts", import.meta.url),
);

Deno.test("daily reminders use recipient and local-day idempotency", () => {
  assertStringIncludes(migration, "recurring_reminder_deliveries");
  assertStringIncludes(migration, "scheduled_occurrence_date");
  assertStringIncludes(migration, "recipient_user_id");
  assertStringIncludes(migration, "reminder_schedule_date");
  assertStringIncludes(migration, "ON CONFLICT DO NOTHING");
});

Deno.test(
  "daily reminders use valid recipient timezones and expire locally",
  () => {
    assertStringIncludes(migration, "pg_timezone_names");
    assertStringIncludes(migration, "preferred_timezone");
    assertStringIncludes(migration, "AT TIME ZONE");
    assertStringIncludes(migration, "'expires_at'");
  },
);

Deno.test("daily reminders preserve occurrence resolution guards", () => {
  const normalizedMigration = migration.toLowerCase();
  assertStringIncludes(
    normalizedMigration,
    "status in ('confirmed', 'skipped')",
  );
  assertStringIncludes(normalizedMigration, "excluded_dates");
  assertStringIncludes(normalizedMigration, "daily_until_due");
  assertStringIncludes(normalizedMigration, "deleted_at is null");
  assertStringIncludes(normalizedMigration, "claim_notification_event");
});

Deno.test("push copy uses scheduler-provided days until due", () => {
  assertStringIncludes(pushDelivery, "payload.days_until_due");
});

Deno.test("stale daily reminders expire before fallback delivery", () => {
  assertStringIncludes(
    fallbackWorker,
    "Recurring reminder expired before delivery",
  );
  assertStringIncludes(pushDelivery, 'event_type === "recurring_reminder"');
});

Deno.test("recurrence edits invalidate queued reminder state", () => {
  assertStringIncludes(migration, "clear_stale_recurring_reminders_v1");
  assertStringIncludes(migration, "DELETE FROM public.notification_events");
  assertStringIncludes(
    migration,
    "DELETE FROM public.recurring_reminder_deliveries",
  );
});

Deno.test("fallback copy uses scheduler-provided days until due", () => {
  assertStringIncludes(fallbackWorker, "event.payload?.days_until_due");
});
