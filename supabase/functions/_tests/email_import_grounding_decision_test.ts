/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { decideEmailImportGrounding } from "../shared/email-import-grounding-decision.ts";

const invoice = "Invoice\nWindows VPS subscription\n405.00 USD\n405.00 USD";

Deno.test(
  "email import decision: repairs an AI currency that conflicts with one explicit source currency",
  () => {
    const decision = decideEmailImportGrounding({
      sourceText: invoice,
      item: {
        type: "expense",
        amount: 405,
        currency: "HKD",
        date: "2026-08-04",
        description: "Windows VPS subscription",
      },
    });

    assertEquals(decision.kind, "auto_repair");
    if (decision.kind !== "auto_repair") return;
    assertEquals(decision.transaction.currency, "USD");
    assertEquals(decision.repairs[0].field, "currency");
  },
);

Deno.test(
  "email import decision: only grounded alternatives are review choices",
  () => {
    const decision = decideEmailImportGrounding({
      sourceText: "USD 405.00 or EUR 405.00 for the same invoice",
      item: {
        type: "expense",
        amount: 405,
        currency: "HKD",
        date: "2026-08-04",
        description: "invoice",
      },
    });

    assertEquals(decision.kind, "review");
    if (decision.kind !== "review") return;
    assertEquals(
      decision.issues[0].choices.map((choice) => choice.value),
      ["EUR", "USD"],
    );
  },
);

Deno.test(
  "email import decision: invoice labels are never offered as currencies",
  () => {
    const decision = decideEmailImportGrounding({
      sourceText: "Invoice\nVAT 405.00\nTotal 405.00 USD",
      item: {
        type: "expense",
        amount: 405,
        currency: "HKD",
        date: "2026-08-04",
        description: "invoice",
      },
    });

    assertEquals(decision.kind, "auto_repair");
    if (decision.kind !== "auto_repair") return;
    assertEquals(decision.transaction.currency, "USD");
  },
);

Deno.test(
  "email import decision: signature-only and ungrounded values reject",
  () => {
    const decision = decideEmailImportGrounding({
      sourceText: "Kind regards, Ada Lovelace",
      item: {
        type: "expense",
        amount: 405,
        currency: "USD",
        date: "2026-08-04",
      },
    });

    assertEquals(decision.kind, "reject");
  },
);

Deno.test(
  "email import decision: removes ungrounded optional fields before accepting",
  () => {
    const decision = decideEmailImportGrounding({
      sourceText: "USD 12.00 Coffee",
      item: {
        type: "expense",
        amount: 12,
        currency: "USD",
        date: "2026-08-04",
        merchant: "Invented Cafe",
        transactionTime: "10:30:00",
        description: "Coffee",
      },
    });

    assertEquals(decision.kind, "accept");
    if (decision.kind !== "accept") return;
    assertEquals(decision.transaction.merchant, undefined);
    assertEquals(decision.transaction.transactionTime, undefined);
  },
);
