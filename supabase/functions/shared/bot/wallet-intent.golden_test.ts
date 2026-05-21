/// <reference lib="deno.ns" />

import {
  buildUnsafeWalletMutationClaimFallback,
  shouldBlockUnsafeWalletMutationClaim,
  WALLET_LIST_PROMPT_RULE,
} from "./wallet-intent.ts";

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `${
        message ?? "assertEquals failed"
      }\nactual: ${actualJson}\nexpected: ${expectedJson}`,
    );
  }
}

Deno.test("golden wallet prompt still directs model tool choice", () => {
  assertEquals(WALLET_LIST_PROMPT_RULE.includes("list_wallets"), true);
  assertEquals(WALLET_LIST_PROMPT_RULE.includes("list_expenses"), true);
});

Deno.test("golden wallet mutation claim guard blocks fake success", () => {
  assertEquals(
    shouldBlockUnsafeWalletMutationClaim({
      responseText: "I've created that wallet.",
      writeMutationSucceeded: false,
    }),
    true,
  );
  assertEquals(
    shouldBlockUnsafeWalletMutationClaim({
      responseText: "I've created that wallet.",
      writeMutationSucceeded: true,
    }),
    false,
  );
  assertEquals(
    buildUnsafeWalletMutationClaimFallback(),
    "I couldn't complete that wallet action yet because the wallet tool did not confirm success. Please try again.",
  );
});
