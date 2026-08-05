/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildUnsafeMutationClaimFallback,
  isWriteMutationToolName,
  shouldBlockUnsafeTransactionMutationClaim,
} from "../shared/bot/mutation-claim-guard.ts";
import {
  shouldReportBotToolResult,
  shouldReportBotToolResultError,
} from "../shared/bot/error-reporting.ts";
import { sanitizeBotToolResultForModel } from "../shared/bot/household-utils.ts";
import { finalizeBotResponseText } from "../shared/bot/response-finalization.ts";

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
  assertEquals(
    isWriteMutationToolName("manage_recurring", { action: "list_history" }),
    false,
  );
  assertEquals(
    isWriteMutationToolName("manage_recurring", { action: "list_series" }),
    false,
  );
  assertEquals(isWriteMutationToolName("generate_chart_url"), false);
  assertEquals(isWriteMutationToolName(null), false);
});

Deno.test("treats duplicate wallet names as user-actionable ambiguity", () => {
  const error =
    "More than one wallet named 'Cash' exists in the selected scope. Please rename one of them or be more specific.";

  assertEquals(shouldReportBotToolResultError(error), false);
});

Deno.test(
  "does not report or expose an already reported backend failure",
  () => {
    const result = {
      error: "Edge Function returned a non-2xx status code",
      _backend_failure_reported: true,
    };

    assertEquals(shouldReportBotToolResult(result), false);
    assertEquals(sanitizeBotToolResultForModel(result), {
      error: "Edge Function returned a non-2xx status code",
    });
  },
);

Deno.test("does not replace recurring history with a mutation safety fallback", () => {
  const response = "You have 2 unconfirmed recurring payments this month.";
  assertEquals(
    finalizeBotResponseText({
      finalResponseText: response,
      toolSucceededAny: true,
      lastBudgetPockets: null,
      lastToolCallName: "manage_recurring",
      lastToolResult: { success: true, action: "list_history" },
      writeMutationSucceededAny: false,
      emptyFallbackText: "Please try again.",
    }),
    response,
  );
});

Deno.test("keeps a friendly recurring confirmation clarification", () => {
  const response = "I have the amount as ¥888. What date was it paid?";
  assertEquals(
    finalizeBotResponseText({
      finalResponseText: response,
      toolSucceededAny: false,
      lastBudgetPockets: null,
      lastToolCallName: "manage_recurring",
      lastToolResult: {
        action: "confirm_occurrence",
        error:
          "paid_date and amount greater than 0 are required to confirm an occurrence.",
      },
      writeMutationSucceededAny: false,
      emptyFallbackText: "Please try again.",
    }),
    response,
  );
});

Deno.test("keeps a friendly clarification for other tool failures", () => {
  const response = "Which wallet should I use for that transfer?";
  assertEquals(
    finalizeBotResponseText({
      finalResponseText: response,
      toolSucceededAny: false,
      lastBudgetPockets: null,
      lastToolCallName: "create_wallet_transfer",
      lastToolResult: { error: "from_wallet_name is required." },
      writeMutationSucceededAny: false,
      emptyFallbackText: "Please try again.",
    }),
    response,
  );
});

Deno.test("never sends internal tool fields to the user", () => {
  assertEquals(
    finalizeBotResponseText({
      finalResponseText:
        "I couldn't save that recurring transaction. paid_date and amount greater than 0 are required to confirm an occurrence.",
      toolSucceededAny: false,
      lastBudgetPockets: null,
      lastToolCallName: "manage_recurring",
      lastToolResult: {
        action: "confirm_occurrence",
        error:
          "paid_date and amount greater than 0 are required to confirm an occurrence.",
      },
      writeMutationSucceededAny: false,
      emptyFallbackText: "Please try again.",
    }),
    "I couldn't complete that just yet. Please check the details and try again.",
  );
});

Deno.test("never repeats an earlier tool error after a later tool call", () => {
  assertEquals(
    finalizeBotResponseText({
      finalResponseText: "The account could not be resolved for this split expense.",
      toolSucceededAny: true,
      lastBudgetPockets: null,
      lastToolCallName: "list_expenses",
      lastToolResult: { success: true },
      toolErrorTexts: ["The account could not be resolved for this split expense."],
      writeMutationSucceededAny: false,
      emptyFallbackText: "Please try again.",
    }),
    "I couldn't complete that just yet. Please check the details and try again.",
  );
});

Deno.test("never mentions tool execution to the user", () => {
  assertEquals(
    finalizeBotResponseText({
      finalResponseText:
        "I couldn't complete that action because the tool did not confirm success.",
      toolSucceededAny: false,
      lastBudgetPockets: null,
      lastToolCallName: "manage_recurring",
      lastToolResult: { error: "Something went wrong." },
      writeMutationSucceededAny: false,
      emptyFallbackText: "Please try again.",
    }),
    "I couldn't complete that just yet. Please check the details and try again.",
  );
});

Deno.test("every Telegram and WhatsApp chat path uses the shared finalizer", async () => {
  const whatsappSource = await Deno.readTextFile(
    new URL("../twilio-whatsapp-ai-bot/index.ts", import.meta.url),
  );
  const telegramSource = await Deno.readTextFile(
    new URL("../telegram-ai-bot/index.ts", import.meta.url),
  );

  assertEquals(
    (whatsappSource.match(/finalizeBotResponseText\(/g) || []).length,
    2,
  );
  assertEquals(
    (whatsappSource.match(/sanitizeBotUserFacingText\(finalResponseText\)/g) || [])
      .length,
    2,
  );
  assertEquals(
    (telegramSource.match(/finalizeBotResponseText\(/g) || []).length,
    1,
  );
  assertEquals(
    (telegramSource.match(/sanitizeBotUserFacingText\(finalResponseText\)/g) || [])
      .length,
    1,
  );
});

Deno.test("returns safe fallback for blocked mutation claim", () => {
  assertEquals(
    buildUnsafeMutationClaimFallback(),
    "I couldn't save that transaction just yet. Please try again in a moment.",
  );
});
