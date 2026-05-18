import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildBankSyncJobFailureUpdate } from "../shared/bank-sync-job-retry.ts";

Deno.test(
  "bank sync job failure schedules bounded retry with backoff metadata",
  () => {
    const update = buildBankSyncJobFailureUpdate({
      attemptCount: 1,
      errorMessage: "Plaid sync failed: 500 upstream",
      now: new Date("2026-05-17T12:00:00.000Z"),
    });

    assertEquals(update.status, "pending");
    assertEquals(update.attempt_count, 2);
    assertEquals(update.next_attempt_at, "2026-05-17T12:15:00.000Z");
    assertEquals(update.last_error_code, "plaid_sync_failed_500_upstream");
    assertEquals(update.last_error_at, "2026-05-17T12:00:00.000Z");
    assertEquals(update.processing_started_at, null);
  },
);

Deno.test("bank sync job failure marks exhausted jobs failed", () => {
  const update = buildBankSyncJobFailureUpdate({
    attemptCount: 4,
    errorMessage: "connection not found",
    now: new Date("2026-05-17T12:00:00.000Z"),
  });

  assertEquals(update.status, "failed");
  assertEquals(update.attempt_count, 5);
  assertEquals(update.next_attempt_at, null);
  assertEquals(update.processed_at, "2026-05-17T12:00:00.000Z");
  assertEquals(update.last_error_code, "connection_not_found");
});
