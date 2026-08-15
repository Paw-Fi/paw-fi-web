/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";

const migrationUrl = new URL(
  "../../migrations/20260815120000_fix_sync_job_enqueue_and_summary_analytics.sql",
  import.meta.url,
);
const helperUrl = new URL("../shared/plaid-sync-jobs.ts", import.meta.url);

Deno.test(
  "summary analytics computes currency expense totals from available columns",
  async () => {
    const migration = await Deno.readTextFile(migrationUrl);

    assertStringIncludes(migration, "get_user_transactions_summary_v2");
    assertStringIncludes(
      migration,
      "sum(amount_cents * analytics_spending_multiplier) filter",
    );
    assert(!migration.includes("sum(analytics_amount_cents) filter"));
  },
);

function enqueueWithResult(result: Record<string, boolean>) {
  return enqueuePlaidSyncJob({
    supabase: {
      from: () => {
        throw new Error("The enqueue helper must use the RPC");
      },
      rpc: async (functionName, parameters) => {
        assertEquals(functionName, "enqueue_bank_sync_job_v1");
        assertEquals(parameters.p_set_needs_resync_on_duplicate, true);
        return { data: result, error: null };
      },
    },
    connectionId: "connection-id",
    triggerSource: "test",
  });
}

Deno.test("Plaid enqueue preserves inserted-job result", async () => {
  const result = await enqueueWithResult({
    enqueued: true,
    duplicate: false,
    needs_resync_queued: false,
  });

  assertEquals(result, {
    enqueued: true,
    duplicate: false,
    needsResyncQueued: false,
  });
});

Deno.test(
  "Plaid enqueue preserves active-job duplicate resync result",
  async () => {
    const result = await enqueueWithResult({
      enqueued: false,
      duplicate: true,
      needs_resync_queued: true,
    });

    assertEquals(result, {
      enqueued: false,
      duplicate: true,
      needsResyncQueued: true,
    });
  },
);

Deno.test("Plaid enqueue preserves webhook duplicate result", async () => {
  const result = await enqueueWithResult({
    enqueued: false,
    duplicate: true,
    needs_resync_queued: false,
  });

  assertEquals(result, {
    enqueued: false,
    duplicate: true,
    needsResyncQueued: false,
  });
});

Deno.test(
  "Plaid enqueue uses an atomic duplicate-safe database operation",
  async () => {
    const migration = await Deno.readTextFile(migrationUrl);
    const helper = await Deno.readTextFile(helperUrl);

    assertStringIncludes(migration, "enqueue_bank_sync_job_v1");
    assertStringIncludes(migration, "on conflict do nothing");
    assertStringIncludes(migration, "p_set_needs_resync_on_duplicate");
    assertStringIncludes(migration, "p_webhook_event_id is not null");
    assertStringIncludes(migration, "grant execute");
    assertStringIncludes(migration, "to service_role");
    assertStringIncludes(helper, '"enqueue_bank_sync_job_v1"');
    assert(!helper.includes('.from("bank_sync_jobs")\n    .insert'));
  },
);
