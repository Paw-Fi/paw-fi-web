import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  isTransientBankNetworkError,
  withTransientBankReadRetry,
} from "../shared/bank-retry.ts";
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

Deno.test(
  "read retry retries transient Supabase connection resets",
  async () => {
    let attempts = 0;
    const result = await withTransientBankReadRetry(
      () => {
        attempts += 1;
        if (attempts < 3) {
          throw new TypeError("connection error: connection reset");
        }
        return Promise.resolve("recovered");
      },
      { maxRetries: 2, initialDelayMs: 0, maxDelayMs: 0 },
    );

    assertEquals(result, "recovered");
    assertEquals(attempts, 3);
  },
);

Deno.test(
  "transient classifier accepts PostgREST transport error objects",
  () => {
    assertEquals(
      isTransientBankNetworkError({
        message: "TypeError: error sending request",
        details:
          "client error (SendRequest): connection error: connection reset",
        code: "",
      }),
      true,
    );
  },
);

Deno.test("transient classifier preserves coded PostgreSQL errors", () => {
  assertEquals(
    isTransientBankNetworkError({
      message: "canceling statement due to statement timeout",
      details: null,
      code: "57014",
    }),
    false,
  );
});

Deno.test("read retry does not retry application errors", async () => {
  let attempts = 0;
  await assertRejects(
    () =>
      withTransientBankReadRetry(
        () => {
          attempts += 1;
          throw new Error("permission denied");
        },
        { initialDelayMs: 0, maxDelayMs: 0 },
      ),
    Error,
    "permission denied",
  );
  assertEquals(attempts, 1);
});
