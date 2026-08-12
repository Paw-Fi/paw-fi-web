/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildEmailImportAiModelConfig,
  EMAIL_IMPORT_DECISION_MODELS,
  emailImportAiFailureCode,
  emailImportSafeRejectionCodes,
  parseEmailImportAiDecisionToolCalls,
  shouldEscalateEmailImportAiFailure,
  shouldTryNextEmailImportDecisionModel,
  shouldTryNextEmailImportDecisionResult,
  validateEmailImportAiDecisions,
} from "../shared/email-import-ai-decision.ts";

const baseParams = {
  receivedDate: "2026-08-09T01:46:44Z",
  preferredCurrency: "USD",
  allowedExpenseCategories: ["transport", "other"],
  allowedIncomeCategories: ["other"],
  rejectedCandidates: [],
};

Deno.test(
  "email import AI decision accepts a multilingual native-currency receipt",
  () => {
    const sourceText = `E-Receipt/Abbreviated Tax Invoice
Saver Bike
Picked up on 09 August 2026
Grabtaxi (Thailand) Co.,Ltd.
Total Paid
฿37
การบริการดีเยี่ยม`;
    const decisions = validateEmailImportAiDecisions(
      {
        decisions: [
          {
            action: "accept",
            candidate: {
              type: "expense",
              amount: 37,
              currency: "THB",
              date: "2026-08-09",
              category: "transport",
              merchant: "Grabtaxi (Thailand) Co.,Ltd.",
              typeEvidence: "Total Paid",
              dateEvidence: "09 August 2026",
            },
            reasonCodes: ["GROUNDED_RECEIPT_TOTAL"],
          },
        ],
      },
      { ...baseParams, sourceText },
    );

    assertEquals(decisions.length, 1);
    assertEquals(decisions[0].kind, "accept");
    if (decisions[0].kind === "accept") {
      assertEquals(decisions[0].transaction.currency, "THB");
      assertEquals(decisions[0].transaction.amount, 37);
    }
  },
);

Deno.test("email import AI decision keeps signature-only text rejected", () => {
  const decisions = validateEmailImportAiDecisions(
    {
      decisions: [
        {
          action: "reject",
          reasonCodes: ["NO_TRANSACTION_IN_SOURCE"],
        },
      ],
    },
    { ...baseParams, sourceText: "Ned Dunne" },
  );

  assertEquals(decisions, [
    { kind: "reject", reasons: ["NO_TRANSACTION_IN_SOURCE"] },
  ]);
});

Deno.test(
  "email import AI decision creates only source-backed review choices",
  () => {
    const sourceText = "Invoice total may be USD 5.00 or CAD 5.00";
    const decisions = validateEmailImportAiDecisions(
      {
        decisions: [
          {
            action: "review",
            candidate: {
              type: "expense",
              amount: 5,
              currency: "USD",
              date: "2026-08-09",
              category: "other",
              typeEvidence: "Invoice total",
              dateEvidence: "RECEIVED_DATE",
            },
            issues: [
              {
                field: "currency",
                code: "MULTIPLE_GROUNDED_CURRENCIES",
                choices: [
                  { value: "USD", label: "USD", evidence: "USD 5.00" },
                  { value: "CAD", label: "CAD", evidence: "CAD 5.00" },
                ],
              },
            ],
            reasonCodes: ["AMBIGUOUS_CURRENCY"],
          },
        ],
      },
      { ...baseParams, sourceText },
    );

    assertEquals(decisions[0].kind, "review");
    if (decisions[0].kind === "review") {
      assertEquals(
        decisions[0].issues[0].choices.map((choice) => choice.value),
        ["USD", "CAD"],
      );
    }
  },
);

Deno.test(
  "email import AI decision creates a Mandarin currency review from AI choices",
  () => {
    const sourceText = `订单已完成
餐厅：Nori House
订单总额：USD 72.65
本次银行卡已扣款：CAD 72.65
本次账单币种已扣款：USD 72.65`;
    const decisions = validateEmailImportAiDecisions(
      {
        decisions: [
          {
            action: "review",
            candidate: {
              type: "expense",
              amount: 72.65,
              currency: "CAD",
              date: "2026-08-09",
              category: "other",
              typeEvidence: "订单已完成",
              dateEvidence: "RECEIVED_DATE",
            },
            issues: [
              {
                field: "currency",
                code: "AMBIGUOUS_SETTLEMENT_CURRENCY",
                choices: [
                  { value: "CAD", label: "CAD", evidence: "CAD 72.65" },
                  { value: "USD", label: "USD", evidence: "USD 72.65" },
                ],
              },
            ],
            reasonCodes: ["AMBIGUOUS_CURRENCY"],
          },
        ],
      },
      { ...baseParams, sourceText },
    );

    assertEquals(decisions.length, 1);
    assertEquals(decisions[0].kind, "review");
    if (decisions[0].kind === "review") {
      assertEquals(decisions[0].candidate.amount, 72.65);
      assertEquals(decisions[0].issues[0].field, "currency");
      assertEquals(
        decisions[0].issues[0].choices.map((choice) => choice.value),
        ["CAD", "USD"],
      );
    }
  },
);

Deno.test("email import AI decision rejects fabricated review evidence", () => {
  const decisions = validateEmailImportAiDecisions(
    {
      decisions: [
        {
          action: "review",
          candidate: {
            type: "expense",
            amount: 5,
            currency: "USD",
            date: "2026-08-09",
            category: "other",
            typeEvidence: "Invoice total",
            dateEvidence: "RECEIVED_DATE",
          },
          issues: [
            {
              field: "currency",
              code: "MULTIPLE_GROUNDED_CURRENCIES",
              choices: [
                { value: "USD", label: "USD", evidence: "USD 5.00" },
                { value: "HKD", label: "HKD", evidence: "HKD 5.00" },
              ],
            },
          ],
          reasonCodes: [],
        },
      ],
    },
    { ...baseParams, sourceText: "Invoice total USD 5.00" },
  );

  assertEquals(decisions[0].kind, "reject");
  assertEquals(emailImportSafeRejectionCodes(decisions), [
    "REVIEW_EVIDENCE_NOT_FOUND",
  ]);
});

Deno.test("email import AI decision rejects ungrounded type and date", () => {
  const decisions = validateEmailImportAiDecisions(
    {
      decisions: [
        {
          action: "accept",
          candidate: {
            type: "income",
            amount: 12,
            currency: "USD",
            date: "2026-08-01",
            category: "other",
          },
        },
      ],
    },
    { ...baseParams, sourceText: "Coffee purchase USD 12.00" },
  );

  assertEquals(decisions[0].kind, "reject");
});

Deno.test("only candidate-backed classifier failures are operational", () => {
  assertEquals(shouldEscalateEmailImportAiFailure(0), false);
  assertEquals(shouldEscalateEmailImportAiFailure(1), true);
});

Deno.test(
  "email import retries model fallback for malformed AI decisions",
  () => {
    assertEquals(
      shouldTryNextEmailImportDecisionResult([
        { kind: "reject", reasons: ["TYPE_EVIDENCE_NOT_FOUND"] },
        { kind: "reject", reasons: ["INVALID_AI_CANDIDATE"] },
      ]),
      true,
    );
    assertEquals(
      shouldTryNextEmailImportDecisionResult([
        {
          kind: "accept",
          transaction: {
            type: "expense",
            amount: 1,
            currency: "USD",
            date: "2026-08-09",
            category: "other",
          },
        },
        { kind: "reject", reasons: ["TYPE_EVIDENCE_NOT_FOUND"] },
      ]),
      true,
    );
    assertEquals(
      shouldTryNextEmailImportDecisionResult([
        { kind: "reject", reasons: ["NO_TRANSACTION_IN_SOURCE"] },
      ]),
      false,
    );
    assertEquals(
      shouldTryNextEmailImportDecisionResult([
        {
          kind: "accept",
          transaction: {
            type: "expense",
            amount: 1,
            currency: "USD",
            date: "2026-08-09",
            category: "other",
          },
        },
      ]),
      false,
    );
  },
);

Deno.test("email import AI decision has a stable fallback model", () => {
  assertEquals(EMAIL_IMPORT_DECISION_MODELS, [
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
  ]);
});

Deno.test(
  "email import AI decision matches analyze-core function calling",
  () => {
    const config = buildEmailImportAiModelConfig("review this email");

    assertEquals(config.request.generationConfig, {
      temperature: 0,
      maxOutputTokens: 4096,
    });
    assertEquals(config.request.toolConfig, {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: ["review_email_import"],
      },
    });
    assertEquals(
      config.tools[0].functionDeclarations[0].name,
      "review_email_import",
    );
    assertEquals("responseSchema" in config.request.generationConfig, false);
    assertEquals("thinkingConfig" in config.request.generationConfig, false);
  },
);

Deno.test(
  "email import AI decision rejects malformed tool arguments",
  async () => {
    await assertRejects(
      async () =>
        parseEmailImportAiDecisionToolCalls(
          [{ name: "review_email_import", args: { decisions: [] } }],
          { ...baseParams, sourceText: "USD 5.00 purchase" },
        ),
      Error,
      "EMAIL_IMPORT_AI_DECISION_INVALID_TOOL_ARGS",
    );
  },
);

Deno.test("email import AI model fallback stops on auth failures", () => {
  assertEquals(
    shouldTryNextEmailImportDecisionModel(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    ),
    false,
  );
  assertEquals(
    shouldTryNextEmailImportDecisionModel(
      Object.assign(new Error("Request contains an invalid argument"), {
        status: 400,
      }),
    ),
    true,
  );
});

Deno.test("email import AI diagnostics never include provider messages", () => {
  const code = emailImportAiFailureCode(
    new Error("provider echoed private forwarded email content"),
  );
  assertEquals(code, "MODEL_ERROR");
  assertEquals(code.includes("private forwarded email content"), false);
});

Deno.test(
  "email import AI rejection diagnostics expose only safe codes",
  () => {
    const codes = emailImportSafeRejectionCodes([
      { kind: "reject", reasons: ["NO_TRANSACTION_IN_SOURCE"] },
      {
        kind: "reject",
        reasons: ["provider echoed private forwarded email content"],
      },
    ]);

    assertEquals(codes, ["NO_TRANSACTION_IN_SOURCE", "AI_REJECTED"]);
    assertEquals(codes.join(" ").includes("private forwarded email"), false);
  },
);
