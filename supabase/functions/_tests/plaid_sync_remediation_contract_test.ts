/// <reference lib="deno.ns" />

import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const syncSourceUrl = new URL(
  "../plaid-sync-transactions/index.ts",
  import.meta.url,
);
const bankSyncSourceUrl = new URL("../shared/bank-sync.ts", import.meta.url);
const walletsOverviewSourceUrl = new URL(
  "../wallets-overview/index.ts",
  import.meta.url,
);
const processorSourceUrl = new URL(
  "../bank-sync-processor/index.ts",
  import.meta.url,
);

Deno.test(
  "disabled Plaid accounts consume deltas without new inserts",
  async () => {
    const source = await Deno.readTextFile(syncSourceUrl);

    assertStringIncludes(source, "refreshedAccounts.allRecords");
    assertStringIncludes(source, "hideNewTransactions: isInactiveAccount");
    assertStringIncludes(source, "inactiveTransactionsHidden");
    assertStringIncludes(source, 'deleted_reason === "bank_account_inactive"');
  },
);

Deno.test(
  "stale cursor fencing does not mark a healthy item unhealthy",
  async () => {
    const source = await Deno.readTextFile(syncSourceUrl);

    assertStringIncludes(source, 'errorCode === "40001"');
    assertStringIncludes(
      source,
      'summary.errorCode = "STALE_CURSOR_GENERATION"',
    );
    const staleBranch = source.slice(source.indexOf('errorCode === "40001"'));
    const branchEnd = staleBranch.indexOf("return summary;");
    assert(branchEnd > 0);
    assert(!staleBranch.slice(0, branchEnd).includes('status: "error"'));
    assert(
      !staleBranch
        .slice(0, branchEnd)
        .includes('item_health_state: "unhealthy"'),
    );
  },
);

Deno.test(
  "Plaid transaction sync does not infer recurring forecasts",
  async () => {
    const source = await Deno.readTextFile(bankSyncSourceUrl);
    const preparationStart = source.indexOf(
      "export async function preparePlaidTransactionMutations",
    );
    const preparationEnd = source.indexOf(
      "export async function persistPreparedPlaidRecurringTemplates",
    );
    assert(preparationStart >= 0 && preparationEnd > preparationStart);
    const preparation = source.slice(preparationStart, preparationEnd);
    assert(!preparation.includes("inferPlaidRecurringRules"));
    assert(!preparation.includes("recurringTemplateCandidates"));
  },
);

Deno.test("wallet spending uses canonical analytics semantics", async () => {
  const source = await Deno.readTextFile(walletsOverviewSourceUrl);

  assertStringIncludes(source, "analyticsSpendingMultiplier");
  assertStringIncludes(source, "analyticsCountsTowardIncome");
  assertStringIncludes(source, "analyticsIsFinal");
  assertStringIncludes(source, "provider_balance_current_cents");
});

Deno.test("Plaid recovery controls are internal and fail closed", async () => {
  const syncSource = await Deno.readTextFile(
    new URL("../plaid-sync-transactions/index.ts", import.meta.url),
  );
  assertStringIncludes(
    syncSource,
    "const cursorOverride = authResult.isInternalService",
  );
  assertStringIncludes(syncSource, "? body.cursorOverride");
});

Deno.test("Plaid processor backfills missed webhook syncs", async () => {
  const source = await Deno.readTextFile(processorSourceUrl);
  assertStringIncludes(source, "enqueueStalePlaidRecoveryJobs");
  assertStringIncludes(source, 'triggerSource: "scheduled_recovery"');
  assertStringIncludes(source, "last_successful_sync_at");
  assertStringIncludes(source, 'status: "completed"');
});
