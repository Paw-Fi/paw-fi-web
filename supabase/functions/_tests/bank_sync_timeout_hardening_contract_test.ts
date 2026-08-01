import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const processorSource = await Deno.readTextFile(
  new URL("../bank-sync-processor/index.ts", import.meta.url),
);
const plaidSyncSource = await Deno.readTextFile(
  new URL("../plaid-sync-transactions/index.ts", import.meta.url),
);
const recurringSource = await Deno.readTextFile(
  new URL("../shared/plaid-recurring.ts", import.meta.url),
);
const migrationSource = await Deno.readTextFile(
  new URL(
    "../../migrations/20260801200000_harden_bank_sync_timeout_paths.sql",
    import.meta.url,
  ),
);

Deno.test(
  "bank sync queue claim has indexed ordering and a bounded timeout retry",
  () => {
    assertStringIncludes(migrationSource, "bank_sync_jobs_pending_claim_idx");
    assertStringIncludes(
      migrationSource,
      "(coalesce(next_attempt_at, created_at))",
    );
    assertStringIncludes(migrationSource, "where status = 'pending'");
    assertStringIncludes(
      processorSource,
      "claimPendingSyncJobsWithTimeoutRetry",
    );
    assertStringIncludes(
      processorSource,
      'POSTGRES_STATEMENT_TIMEOUT_CODE = "57014"',
    );
  },
);

Deno.test(
  "Plaid recurring detection has a matching partial index and subphase reporting",
  () => {
    assertStringIncludes(
      migrationSource,
      "expenses_plaid_recurring_detection_idx",
    );
    assertStringIncludes(migrationSource, "provider_pending is false");
    assertStringIncludes(migrationSource, "analytics_is_final is true");
    assertStringIncludes(
      recurringSource,
      'await params.onStage?.("detect_ledger_candidates")',
    );
    assertStringIncludes(plaidSyncSource, "recurring_refresh_phase");
  },
);

Deno.test(
  "Plaid lease loss preserves the database serialization contract",
  () => {
    assertStringIncludes(plaidSyncSource, "createPlaidSyncLeaseLostError");
    assertStringIncludes(plaidSyncSource, 'code: "40001"');
    assertStringIncludes(plaidSyncSource, "onProgress: extendSyncLease");
    assertStringIncludes(
      plaidSyncSource,
      'summary.errorCode = "SYNC_DATABASE_TIMEOUT"',
    );
    assertStringIncludes(
      plaidSyncSource,
      'summary.errorCode = "STALE_CURSOR_GENERATION"',
    );
  },
);
