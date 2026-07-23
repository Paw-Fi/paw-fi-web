/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildUnsafeMutationClaimFallback,
  isWriteMutationToolName,
  shouldBlockUnsafeTransactionMutationClaim,
} from "../shared/bot/mutation-claim-guard.ts";
import { buildTransactionMutationFailureText } from "../shared/bot/transaction-tool.ts";

Deno.test(
  "blocks transaction saved claim when no write mutation succeeded",
  () => {
    assertEquals(
      shouldBlockUnsafeTransactionMutationClaim({
        responseText:
          "Got it! I've added the *€20* for McDonald's to your *personal account* under the *takeout & delivery* category.",
        writeMutationSucceeded: false,
      }),
      true,
    );
  },
);

Deno.test(
  "allows transaction saved claim after a write mutation succeeds",
  () => {
    assertEquals(
      shouldBlockUnsafeTransactionMutationClaim({
        responseText:
          "Got it! I've added the *€20* for McDonald's to your *personal account*.",
        writeMutationSucceeded: true,
      }),
      false,
    );
  },
);

Deno.test("does not block clarification or proposed save text", () => {
  assertEquals(
    shouldBlockUnsafeTransactionMutationClaim({
      responseText:
        "I can save this as *€20* for McDonald's under *takeout & delivery*. Should I proceed?",
      writeMutationSucceeded: false,
    }),
    false,
  );
});

Deno.test("does not block read-only spending summaries", () => {
  assertEquals(
    shouldBlockUnsafeTransactionMutationClaim({
      responseText:
        "You spent *€20* at McDonald's in your *takeout & delivery* category this month.",
      writeMutationSucceeded: false,
    }),
    false,
  );
});

Deno.test("identifies write mutation tool names", () => {
  assertEquals(isWriteMutationToolName("add_transaction"), true);
  assertEquals(isWriteMutationToolName("add_transactions_batch"), true);
  assertEquals(isWriteMutationToolName("manage_recurring"), true);
  assertEquals(isWriteMutationToolName("generate_chart_url"), false);
  assertEquals(isWriteMutationToolName(null), false);
});

Deno.test("does not expose recurring selection instructions to users", () => {
  assertEquals(
    buildTransactionMutationFailureText("manage_recurring", {
      error:
        "No matching transaction found. Ask user to list recent transactions first or provide more details.",
    }),
    null,
  );
});

Deno.test("returns safe fallback for blocked mutation claim", () => {
  assertEquals(
    buildUnsafeMutationClaimFallback(),
    "I couldn't save that transaction yet because the save step didn't complete. Please send it again or confirm the amount, category, and date.",
  );
});
