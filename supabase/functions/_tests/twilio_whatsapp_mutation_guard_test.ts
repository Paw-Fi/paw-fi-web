/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  isRecordLookupToolName,
  isWriteMutationToolName,
} from "../shared/bot/mutation-claim-guard.ts";
import {
  shouldReportBotToolResult,
  shouldReportBotToolResultError,
} from "../shared/bot/error-reporting.ts";
import { sanitizeBotToolResultForModel } from "../shared/bot/household-utils.ts";
import { finalizeBotResponseText } from "../shared/bot/response-finalization.ts";
import { botMessage } from "../shared/bot/bot-messages.ts";
import {
  groundBotReply,
  type ReplyAssessment,
} from "../shared/bot/reply-grounding.ts";
import {
  createBotTurnLedger,
  recordBotToolExecution,
} from "../shared/bot/turn-ledger.ts";

const NO_CLAIMS: ReplyAssessment = {
  assertsCompletedAction: false,
  assertsStoredRecordState: false,
  consistentWithEvidence: true,
  exposesInternalDetails: false,
};

// The verifier's answers are stubbed here; what is under test is that the
// decision uses tool outcomes and never the wording of the reply.
async function deliver(params: {
  replyText: string;
  assessment: ReplyAssessment;
  tools?: Array<[string, unknown]>;
}): Promise<string> {
  const ledger = createBotTurnLedger();
  for (const [tool, result] of params.tools ?? []) {
    recordBotToolExecution(ledger, tool, result);
  }
  const result = await groundBotReply({
    replyText: params.replyText,
    userMessage: "",
    ledger,
    assess: () => Promise.resolve(params.assessment),
    chat: { sendMessage: () => Promise.reject(new Error("no correction")) },
    language: "en",
    languageLabel: "English",
    canCorrect: false,
  });
  return result.status === "tool_calls" ? "" : result.text;
}

const SAVED_ROW = {
  id: "22222222-2222-4222-8222-222222222222",
  amount_cents: 2000,
  currency: "EUR",
  date: "2026-11-17",
  merchant: "McDonald's",
};

Deno.test(
  "blocks transaction saved claim when no write mutation succeeded",
  async () => {
    assertEquals(
      await deliver({
        replyText:
          "Got it! I've added the *€20* for McDonald's to your *personal account* under the *takeout & delivery* category.",
        assessment: { ...NO_CLAIMS, assertsCompletedAction: true },
      }),
      botMessage("actionNotCompleted", "en"),
    );
  },
);

Deno.test(
  "allows transaction saved claim after a write mutation succeeds",
  async () => {
    const reply =
      "Got it! I've added the *€20* for McDonald's to your *personal account*.";
    assertEquals(
      await deliver({
        replyText: reply,
        assessment: { ...NO_CLAIMS, assertsCompletedAction: true },
        tools: [["add_transaction", { success: true, data: SAVED_ROW }]],
      }),
      reply,
    );
  },
);

Deno.test("does not block clarification or proposed save text", async () => {
  const reply =
    "I can save this as *€20* for McDonald's under *takeout & delivery*. Should I proceed?";
  assertEquals(
    await deliver({ replyText: reply, assessment: NO_CLAIMS }),
    reply,
  );
});

Deno.test("does not block read-only spending summaries", async () => {
  const reply =
    "You spent *€20* at McDonald's in your *takeout & delivery* category this month.";
  assertEquals(
    await deliver({
      replyText: reply,
      assessment: { ...NO_CLAIMS, assertsStoredRecordState: true },
      tools: [["financial_insight", { success: true, totals: { spent: 20 } }]],
    }),
    reply,
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
  // Settings changes are writes too, so confirming them is grounded.
  assertEquals(isWriteMutationToolName("set_currency"), true);
  assertEquals(isWriteMutationToolName("set_language"), true);
  assertEquals(isWriteMutationToolName("create_custom_category"), true);
});

Deno.test("identifies record lookup tools", () => {
  assertEquals(isRecordLookupToolName("list_expenses"), true);
  assertEquals(isRecordLookupToolName("financial_insight"), true);
  assertEquals(
    isRecordLookupToolName("manage_recurring", { action: "analyze_history" }),
    true,
  );
  assertEquals(
    isRecordLookupToolName("manage_recurring", { action: "confirm_occurrence" }),
    false,
  );
  // Extraction and chart rendering never read stored records.
  assertEquals(isRecordLookupToolName("analyze_expense"), false);
  assertEquals(isRecordLookupToolName("generate_chart_url"), false);
  assertEquals(isRecordLookupToolName(null), false);
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

const FINALIZE_BASE = {
  toolSucceededAny: false,
  lastBudgetPockets: null,
  lastToolCallName: null,
  lastToolResult: null,
  writeSucceeded: false,
  writeFailed: false,
  language: "en",
};

Deno.test("does not replace recurring history with a mutation safety fallback", async () => {
  const response = "You have 2 unconfirmed recurring payments this month.";
  assertEquals(
    await deliver({
      replyText: response,
      assessment: { ...NO_CLAIMS, assertsStoredRecordState: true },
      tools: [["manage_recurring", { success: true, action: "list_history" }]],
    }),
    response,
  );
  assertEquals(
    finalizeBotResponseText({
      ...FINALIZE_BASE,
      finalResponseText: response,
      toolSucceededAny: true,
      lastToolCallName: "manage_recurring",
      lastToolResult: { success: true, action: "list_history" },
    }),
    response,
  );
});

Deno.test("keeps a friendly recurring confirmation clarification", async () => {
  const response = "I have the amount as ¥888. What date was it paid?";
  const failedConfirm = {
    action: "confirm_occurrence",
    error:
      "paid_date and amount greater than 0 are required to confirm an occurrence.",
  };
  assertEquals(
    await deliver({
      replyText: response,
      assessment: NO_CLAIMS,
      tools: [["manage_recurring", failedConfirm]],
    }),
    response,
  );
  assertEquals(
    finalizeBotResponseText({
      ...FINALIZE_BASE,
      finalResponseText: response,
      lastToolCallName: "manage_recurring",
      lastToolResult: failedConfirm,
      writeFailed: true,
    }),
    response,
  );
});

Deno.test("keeps a friendly clarification for other tool failures", () => {
  const response = "Which wallet should I use for that transfer?";
  assertEquals(
    finalizeBotResponseText({
      ...FINALIZE_BASE,
      finalResponseText: response,
      lastToolCallName: "create_wallet_transfer",
      lastToolResult: { error: "from_wallet_name is required." },
      writeFailed: true,
    }),
    response,
  );
});

Deno.test("never sends internal tool fields to the user", () => {
  assertEquals(
    finalizeBotResponseText({
      ...FINALIZE_BASE,
      finalResponseText:
        "I couldn't save that recurring transaction. paid_date and amount greater than 0 are required to confirm an occurrence.",
      lastToolCallName: "manage_recurring",
      lastToolResult: {
        action: "confirm_occurrence",
        error:
          "paid_date and amount greater than 0 are required to confirm an occurrence.",
      },
    }),
    botMessage("checkDetails", "en"),
  );
});

Deno.test("never repeats an earlier tool error after a later tool call", () => {
  assertEquals(
    finalizeBotResponseText({
      ...FINALIZE_BASE,
      finalResponseText: "The account could not be resolved for this split expense.",
      toolSucceededAny: true,
      lastToolCallName: "list_expenses",
      lastToolResult: { success: true },
      toolErrorTexts: ["The account could not be resolved for this split expense."],
    }),
    botMessage("checkDetails", "en"),
  );
});

Deno.test("never mentions tool execution to the user", async () => {
  // Wording about internals is judged by the verifier in any language.
  assertEquals(
    await deliver({
      replyText:
        "I couldn't complete that action because the tool did not confirm success.",
      assessment: { ...NO_CLAIMS, exposesInternalDetails: true },
    }),
    botMessage("checkDetails", "en"),
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
