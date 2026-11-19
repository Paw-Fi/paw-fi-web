/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  annotateUnsavedAnalysisResult,
  buildUngroundedVerificationClaimFallback,
  buildUnsafeMutationClaimFallback,
  diagnoseUngroundedVerificationClaim,
  isRecordLookupToolName,
} from "../shared/bot/mutation-claim-guard.ts";
import { finalizeBotResponseText } from "../shared/bot/response-finalization.ts";

const EMPTY_FALLBACK = "Please try again.";

// Customer path: "Baluard, €1.45, 17/11/2026" -> model calls analyze_expense
// (extraction only, not a save) and then claims the expense was recorded.
Deno.test(
  "blocks a save claim when the only tool this turn was analyze_expense",
  () => {
    assertEquals(
      finalizeBotResponseText({
        finalResponseText:
          "✅ I've recorded €1.45 at Baluard under groceries for 17/11/2026. Anything else?",
        toolSucceededAny: true,
        lastBudgetPockets: null,
        lastToolCallName: "analyze_expense",
        lastToolResult: { success: true, items: [{ amount: 1.45 }] },
        writeMutationSucceededAny: false,
        lookupSucceededAny: false,
        emptyFallbackText: EMPTY_FALLBACK,
      }),
      buildUnsafeMutationClaimFallback(),
    );
  },
);

Deno.test(
  "blocks a save claim when the only tool this turn was a read lookup",
  () => {
    assertEquals(
      finalizeBotResponseText({
        finalResponseText: "Done! I've added the €1.45 Baluard expense.",
        toolSucceededAny: true,
        lastBudgetPockets: null,
        lastToolCallName: "list_expenses",
        lastToolResult: { success: true, expenses: [] },
        writeMutationSucceededAny: false,
        lookupSucceededAny: true,
        emptyFallbackText: EMPTY_FALLBACK,
      }),
      buildUnsafeMutationClaimFallback(),
    );
  },
);

Deno.test(
  "keeps a read-only summary that merely uses past-tense verbs after a lookup",
  () => {
    const response =
      "Here are your recorded expenses this week: 1. €1.45 Baluard (groceries). Total: €1.45 (1 item).";
    assertEquals(
      finalizeBotResponseText({
        finalResponseText: response,
        toolSucceededAny: true,
        lastBudgetPockets: null,
        lastToolCallName: "list_expenses",
        lastToolResult: { success: true },
        writeMutationSucceededAny: false,
        lookupSucceededAny: true,
        emptyFallbackText: EMPTY_FALLBACK,
      }),
      response,
    );
  },
);

Deno.test("keeps a save claim after add_transaction actually succeeded", () => {
  const response = "✅ I've recorded €1.45 at Baluard under groceries.";
  assertEquals(
    finalizeBotResponseText({
      finalResponseText: response,
      toolSucceededAny: true,
      lastBudgetPockets: null,
      lastToolCallName: "add_transaction",
      lastToolResult: { success: true, data: { id: "abc" } },
      writeMutationSucceededAny: true,
      lookupSucceededAny: false,
      emptyFallbackText: EMPTY_FALLBACK,
    }),
    response,
  );
});

// Customer path: "Did you save it?" -> model replies from conversation history
// with no tool call at all and claims it checked.
Deno.test(
  "blocks an 'I checked and it is saved' claim when no lookup ran this turn",
  () => {
    assertEquals(
      finalizeBotResponseText({
        finalResponseText:
          "Yes! I've checked and the €1.45 Baluard expense is saved under groceries.",
        toolSucceededAny: false,
        lastBudgetPockets: null,
        lastToolCallName: null,
        lastToolResult: null,
        writeMutationSucceededAny: false,
        lookupSucceededAny: false,
        emptyFallbackText: EMPTY_FALLBACK,
      }),
      buildUngroundedVerificationClaimFallback(),
    );
  },
);

Deno.test(
  "blocks a negative 'I checked and it is missing' claim when no lookup ran",
  () => {
    assertEquals(
      finalizeBotResponseText({
        finalResponseText:
          "I checked my records and that transaction does not appear in my system. It may have been a processing error.",
        toolSucceededAny: false,
        lastBudgetPockets: null,
        lastToolCallName: null,
        lastToolResult: null,
        writeMutationSucceededAny: false,
        lookupSucceededAny: false,
        emptyFallbackText: EMPTY_FALLBACK,
      }),
      buildUngroundedVerificationClaimFallback(),
    );
  },
);

Deno.test("keeps a verification claim after an actual list_expenses lookup", () => {
  const response =
    "I've checked your records: the €1.45 Baluard expense is saved under groceries on 17/11/2026.";
  assertEquals(
    finalizeBotResponseText({
      finalResponseText: response,
      toolSucceededAny: true,
      lastBudgetPockets: null,
      lastToolCallName: "list_expenses",
      lastToolResult: { success: true, expenses: [{ amount: 1.45 }] },
      writeMutationSucceededAny: false,
      lookupSucceededAny: true,
      emptyFallbackText: EMPTY_FALLBACK,
    }),
    response,
  );
});

Deno.test("keeps a 'confirmed' claim after a write mutation succeeded", () => {
  const response = "✅ I've confirmed your rent payment for November.";
  assertEquals(
    finalizeBotResponseText({
      finalResponseText: response,
      toolSucceededAny: true,
      lastBudgetPockets: null,
      lastToolCallName: "manage_recurring",
      lastToolResult: { success: true, action: "confirm_occurrence" },
      writeMutationSucceededAny: true,
      lookupSucceededAny: false,
      emptyFallbackText: EMPTY_FALLBACK,
    }),
    response,
  );
});

Deno.test("does not treat a clarification question as a verification claim", () => {
  const response =
    "I can save €1.45 at Baluard under groceries for 17/11/2026. Should I go ahead?";
  assertEquals(
    diagnoseUngroundedVerificationClaim({
      responseText: response,
      writeMutationSucceeded: false,
      lookupSucceeded: false,
    }).blocked,
    false,
  );
});

Deno.test("flags 'I can confirm' as a verification claim", () => {
  assertEquals(
    diagnoseUngroundedVerificationClaim({
      responseText:
        "I can confirm that your Baluard expense is in your records.",
      writeMutationSucceeded: false,
      lookupSucceeded: false,
    }),
    { blocked: true, reason: "verification_claim" },
  );
});

Deno.test("identifies record lookup tools", () => {
  assertEquals(isRecordLookupToolName("list_expenses"), true);
  assertEquals(isRecordLookupToolName("financial_insight"), true);
  assertEquals(
    isRecordLookupToolName("manage_recurring", { action: "list_history" }),
    true,
  );
  assertEquals(
    isRecordLookupToolName("manage_recurring", {
      action: "confirm_occurrence",
    }),
    false,
  );
  assertEquals(isRecordLookupToolName("analyze_expense"), false);
  assertEquals(isRecordLookupToolName("add_transaction"), false);
  assertEquals(isRecordLookupToolName(null), false);
});

Deno.test("annotates successful analysis results as unsaved drafts", () => {
  const annotated = annotateUnsavedAnalysisResult({
    success: true,
    items: [{ amount: 1.45, merchant: "Baluard" }],
  }) as Record<string, unknown>;
  assertEquals(annotated.saved, false);
  assertEquals(typeof annotated.next_step, "string");
  assertEquals(Array.isArray(annotated.items), true);
});

Deno.test("leaves failed analysis results untouched", () => {
  const failed = { error: "Analysis is taking longer than expected." };
  assertEquals(annotateUnsavedAnalysisResult(failed), failed);
});

Deno.test(
  "Telegram wires analyze_expense annotation and lookup tracking",
  async () => {
    const telegramSource = await Deno.readTextFile(
      new URL("../telegram-ai-bot/index.ts", import.meta.url),
    );
    assertEquals(
      telegramSource.includes("annotateUnsavedAnalysisResult("),
      true,
    );
    assertEquals(
      (telegramSource.match(/lookupSucceededAny/g) || []).length >= 3,
      true,
    );
    assertEquals(
      telegramSource.includes("diagnoseUngroundedVerificationClaim("),
      true,
    );
  },
);
