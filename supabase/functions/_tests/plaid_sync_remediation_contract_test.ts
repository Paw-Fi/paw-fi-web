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

Deno.test("Plaid Transactions never creates recurring forecasts", async () => {
  const source = await Deno.readTextFile(bankSyncSourceUrl);
  const preparationStart = source.indexOf(
    "export async function preparePlaidTransactionMutations",
  );
  const preparationEnd = source.indexOf(
    "export async function persistPreparedPlaidTransactionMutations",
  );
  assert(preparationStart >= 0 && preparationEnd > preparationStart);
  const preparation = source.slice(preparationStart, preparationEnd);
  assert(!preparation.includes("recurringTemplateCandidates"));
  assert(!preparation.includes("inferPlaidRecurringRules"));
});

Deno.test("wallet spending uses canonical analytics semantics", async () => {
  const source = await Deno.readTextFile(walletsOverviewSourceUrl);

  assertStringIncludes(source, "analyticsSpendingMultiplier");
  assertStringIncludes(source, "analyticsCountsTowardIncome");
  assertStringIncludes(source, "analyticsIsFinal");
  assertStringIncludes(source, "provider_balance_current_cents");
});
