/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  shouldEscalateEmailImportAiFailure,
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
