import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildPlaidDuplicateGroupKey,
  classifyPlaidItemWebhook,
  findMissingPlaidSelectedAccountIds,
  normalizePlaidSelectedAccountIds,
  PLAID_NEW_ACCOUNTS_RELINK_STATE,
  PLAID_REQUIRED_RELINK_STATE,
  requiresPlaidPublicTokenExchange,
  resolvePlaidAccountsToDisableAfterUpdate,
  shouldEnablePlaidAccountSelection,
  shouldRunPlaidNewLinkDuplicateChecks,
} from "../shared/plaid-update-mode.ts";

Deno.test(
  "plaid update mode enables account selection only for US/CA new-account prompts",
  () => {
    assertEquals(
      shouldEnablePlaidAccountSelection({
        countryCode: "US",
        relinkState: PLAID_NEW_ACCOUNTS_RELINK_STATE,
      }),
      true,
    );
    assertEquals(
      shouldEnablePlaidAccountSelection({
        countryCode: "GB",
        relinkState: PLAID_NEW_ACCOUNTS_RELINK_STATE,
      }),
      false,
    );
    assertEquals(
      shouldEnablePlaidAccountSelection({
        countryCode: "CA",
        relinkState: PLAID_REQUIRED_RELINK_STATE,
      }),
      false,
    );
  },
);

Deno.test("plaid update mode classifies missing webhook handlers", () => {
  assertEquals(
    classifyPlaidItemWebhook({ webhookCode: "PENDING_DISCONNECT" }),
    {
      shouldEnqueueSync: false,
      status: "needs_reauth",
      itemStatus: "pending_relink",
      itemHealthState: "unhealthy",
      relinkState: PLAID_REQUIRED_RELINK_STATE,
    },
  );

  assertEquals(classifyPlaidItemWebhook({ webhookCode: "LOGIN_REPAIRED" }), {
    shouldEnqueueSync: true,
    status: "active",
    itemStatus: "active",
    itemHealthState: "healthy",
    relinkState: null,
  });

  assertEquals(
    classifyPlaidItemWebhook({ webhookCode: "NEW_ACCOUNTS_AVAILABLE" }),
    {
      shouldEnqueueSync: false,
      status: "active",
      itemStatus: "active",
      itemHealthState: "healthy",
      relinkState: PLAID_NEW_ACCOUNTS_RELINK_STATE,
    },
  );
});

Deno.test(
  "plaid update mode normalizes selected accounts for duplicate detection",
  () => {
    const selectedAccountIds = normalizePlaidSelectedAccountIds([
      { id: "acc-2", name: "Savings" },
      { id: "acc-1", name: "Checking" },
      { id: "acc-1", name: "Checking duplicate" },
      {},
    ]);

    assertEquals(selectedAccountIds, ["acc-1", "acc-2"]);
    assertEquals(
      buildPlaidDuplicateGroupKey({
        institutionId: "ins_123",
        selectedAccountIds,
      }),
      "plaid:ins_123:acc-1,acc-2",
    );
  },
);

Deno.test(
  "plaid update completion does not require public token exchange",
  () => {
    assertEquals(
      requiresPlaidPublicTokenExchange({ connectionId: "existing-connection" }),
      false,
    );
    assertEquals(
      shouldRunPlaidNewLinkDuplicateChecks({
        connectionId: "existing-connection",
      }),
      false,
    );
  },
);

Deno.test(
  "plaid new item link still requires exchange and duplicate checks",
  () => {
    assertEquals(
      requiresPlaidPublicTokenExchange({ connectionId: null }),
      true,
    );
    assertEquals(
      shouldRunPlaidNewLinkDuplicateChecks({ connectionId: "" }),
      true,
    );
  },
);

Deno.test(
  "plaid new-account update detects selected accounts Plaid did not return",
  () => {
    assertEquals(
      findMissingPlaidSelectedAccountIds({
        selectedAccountIds: ["acc-1", "acc-2", "acc-3"],
        returnedAccountIds: ["acc-3", "acc-1"],
      }),
      ["acc-2"],
    );
  },
);

Deno.test(
  "plaid new-account update disables accounts no longer shared by the user",
  () => {
    assertEquals(
      resolvePlaidAccountsToDisableAfterUpdate({
        requiresAccountSelection: true,
        existingAccountIds: ["old-1", "kept-1", "old-2"],
        returnedAccountIds: ["kept-1", "new-1"],
      }),
      ["old-1", "old-2"],
    );

    assertEquals(
      resolvePlaidAccountsToDisableAfterUpdate({
        requiresAccountSelection: false,
        existingAccountIds: ["old-1"],
        returnedAccountIds: [],
      }),
      [],
    );
  },
);
