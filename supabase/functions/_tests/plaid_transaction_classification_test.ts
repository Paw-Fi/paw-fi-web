/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  classifyPlaidTransaction,
  classifyUserCategoryOverride,
  derivePlaidClassificationReview,
} from "../shared/plaid-transaction-classification.ts";

Deno.test(
  "Plaid classification counts finalized purchases as consumer spend",
  () => {
    const result = classifyPlaidTransaction({
      amount: 42.5,
      pending: false,
      pfcPrimary: "FOOD_AND_DRINK",
      transactionCode: null,
      accountType: "credit",
    });

    assertEquals(result.analyticsClass, "consumer_spend");
    assertEquals(result.isFinal, true);
    assertEquals(result.spendingMultiplier, 1);
    assertEquals(result.countsTowardIncome, false);
  },
);

Deno.test("unknown Plaid intent requires explicit review", () => {
  const classification = classifyPlaidTransaction({
    amount: 25,
    pending: false,
    pfcPrimary: null,
    transactionCode: null,
    accountType: "depository",
  });
  assertEquals(derivePlaidClassificationReview({}, classification), {
    state: "needs_review",
    reason: "unknown_provider_intent",
  });
});

Deno.test("low-confidence Plaid categories require explicit review", () => {
  const input = {
    amount: 25,
    pending: false,
    pfcPrimary: "FOOD_AND_DRINK",
    transactionCode: null,
    accountType: "depository",
    pfcConfidence: "LOW",
  };
  const classification = classifyPlaidTransaction(input);
  assertEquals(derivePlaidClassificationReview(input, classification), {
    state: "needs_review",
    reason: "low_provider_confidence",
  });
});

Deno.test("authoritative transaction codes do not require PFC review", () => {
  const input = {
    amount: 25,
    pending: false,
    pfcPrimary: "GENERAL_SERVICES",
    transactionCode: "transfer",
    accountType: "depository",
    pfcConfidence: "LOW",
  };
  const classification = classifyPlaidTransaction(input);
  assertEquals(classification.analyticsClass, "transfer_out");
  assertEquals(derivePlaidClassificationReview(input, classification), {
    state: "not_required",
    reason: null,
  });
});

Deno.test(
  "Plaid classification keeps pending purchases out of finalized totals",
  () => {
    const result = classifyPlaidTransaction({
      amount: 42.5,
      pending: true,
      pfcPrimary: "FOOD_AND_DRINK",
      transactionCode: null,
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "consumer_spend");
    assertEquals(result.isFinal, false);
    assertEquals(result.spendingMultiplier, 0);
  },
);

for (const testCase of [
  { primary: "TRANSFER_IN", amount: -200, expected: "transfer_in" },
  { primary: "TRANSFER_OUT", amount: 200, expected: "transfer_out" },
] as const) {
  Deno.test(
    `Plaid classification maps ${testCase.primary} to money movement`,
    () => {
      const result = classifyPlaidTransaction({
        amount: testCase.amount,
        pending: false,
        pfcPrimary: testCase.primary,
        transactionCode: null,
        accountType: "depository",
      });

      assertEquals(result.analyticsClass, testCase.expected);
      assertEquals(result.spendingMultiplier, 0);
      assertEquals(result.countsTowardIncome, false);
    },
  );
}

Deno.test(
  "Plaid classification excludes checking-side credit card payments",
  () => {
    const result = classifyPlaidTransaction({
      amount: 3844.21,
      pending: false,
      pfcPrimary: "LOAN_PAYMENTS",
      transactionCode: null,
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "debt_payment");
    assertEquals(result.spendingMultiplier, 0);
    assertEquals(result.countsTowardIncome, false);
  },
);

Deno.test(
  "Plaid classification excludes liability-side debt payments from income",
  () => {
    const result = classifyPlaidTransaction({
      amount: -500,
      pending: false,
      pfcPrimary: "LOAN_PAYMENTS",
      transactionCode: null,
      accountType: "credit",
    });

    assertEquals(result.analyticsClass, "debt_payment");
    assertEquals(result.countsTowardIncome, false);
  },
);

Deno.test(
  "Plaid classification only counts Plaid INCOME inflows as income",
  () => {
    const result = classifyPlaidTransaction({
      amount: -2500,
      pending: false,
      pfcPrimary: "INCOME",
      transactionCode: null,
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "income");
    assertEquals(result.countsTowardIncome, true);
    assertEquals(result.spendingMultiplier, 0);
  },
);

Deno.test(
  "Plaid classification treats merchant credits as spending refunds",
  () => {
    const result = classifyPlaidTransaction({
      amount: -25,
      pending: false,
      pfcPrimary: "GENERAL_MERCHANDISE",
      transactionCode: "refund",
      accountType: "credit",
    });

    assertEquals(result.analyticsClass, "refund_or_reversal");
    assertEquals(result.spendingMultiplier, -1);
    assertEquals(result.countsTowardIncome, false);
  },
);

Deno.test(
  "Plaid classification separates bank fees from consumer spend",
  () => {
    const result = classifyPlaidTransaction({
      amount: 7,
      pending: false,
      pfcPrimary: "BANK_FEES",
      transactionCode: null,
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "bank_fee");
    assertEquals(result.spendingMultiplier, 0);
  },
);

Deno.test(
  "Plaid classification does not treat bank fee reversals as spending refunds",
  () => {
    const result = classifyPlaidTransaction({
      amount: -7,
      pending: false,
      pfcPrimary: "BANK_FEES",
      transactionCode: null,
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "bank_fee");
    assertEquals(result.spendingMultiplier, 0);
    assertEquals(result.countsTowardIncome, false);
  },
);

Deno.test(
  "Plaid classification separates PFCv2 loan disbursements from income",
  () => {
    const result = classifyPlaidTransaction({
      amount: -1000,
      pending: false,
      pfcPrimary: "LOAN_DISBURSEMENTS",
      transactionCode: null,
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "loan_disbursement");
    assertEquals(result.spendingMultiplier, 0);
    assertEquals(result.countsTowardIncome, false);
  },
);

Deno.test(
  "Plaid classification honors provider transfer transaction codes",
  () => {
    const result = classifyPlaidTransaction({
      amount: 1000,
      pending: false,
      pfcPrimary: "GENERAL_SERVICES",
      transactionCode: "transfer",
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "transfer_out");
    assertEquals(result.spendingMultiplier, 0);
  },
);

for (const transactionCode of ["atm", "cash", "cash advance", "cashback"]) {
  Deno.test(
    `Plaid classification separates ${transactionCode} cash movement`,
    () => {
      const result = classifyPlaidTransaction({
        amount: 100,
        pending: false,
        pfcPrimary: "TRANSFER_OUT",
        transactionCode,
        accountType: "depository",
      });

      assertEquals(result.analyticsClass, "cash_movement");
      assertEquals(result.spendingMultiplier, 0);
    },
  );
}

Deno.test("Plaid classification rejects contradictory income sign", () => {
  const result = classifyPlaidTransaction({
    amount: 500,
    pending: false,
    pfcPrimary: "INCOME",
    transactionCode: null,
    accountType: "depository",
  });

  assertEquals(result.analyticsClass, "unknown");
  assertEquals(result.spendingMultiplier, 0);
  assertEquals(result.countsTowardIncome, false);
});

Deno.test(
  "Plaid classification leaves missing PFC transactions unknown",
  () => {
    const result = classifyPlaidTransaction({
      amount: 20,
      pending: false,
      pfcPrimary: null,
      transactionCode: null,
      accountType: "depository",
    });

    assertEquals(result.analyticsClass, "unknown");
    assertEquals(result.spendingMultiplier, 0);
  },
);

Deno.test(
  "explicit user categories override incorrect provider meaning",
  () => {
    assertEquals(
      classifyUserCategoryOverride("transfers", "expense"),
      "transfer_out",
    );
    assertEquals(
      classifyUserCategoryOverride("debt payments", "expense"),
      "debt_payment",
    );
    assertEquals(
      classifyUserCategoryOverride("groceries", "expense"),
      "consumer_spend",
    );
  },
);
