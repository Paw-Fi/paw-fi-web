/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { mapPlaidTransactionToExpense } from "../shared/plaid-client.ts";
import type {
  ExpenseUpsertInput,
  PlaidTransaction,
} from "../shared/plaid-client.ts";
import {
  buildBankExpenseMutationPlan,
  computeBankExpenseUserOverrides,
} from "../shared/bank-expense-projection.ts";

function makeExpenseRecord(
  overrides: Partial<ExpenseUpsertInput> = {},
): ExpenseUpsertInput {
  return {
    user_id: "user-1",
    bank_account_id: "bank-account-1",
    provider: "plaid",
    provider_transaction_id: "txn-1",
    amount_cents: 1250,
    currency: "USD",
    date: "2026-04-10",
    type: "expense" as const,
    category: "food and drink",
    raw_text: "Coffee",
    merchant: "Coffee Shop",
    source: "Coffee Shop",
    raw_provider_payload: { id: "raw" },
    is_recurring: false,
    recurrence_rule: null,
    household_id: null,
    account_id: "wallet-1",
    contact_id: null,
    normalized_amount_cents: 1250,
    base_currency: "USD",
    fx_rate: 1,
    ...overrides,
  } as ExpenseUpsertInput;
}

function makePlaidTransaction(
  overrides: Partial<PlaidTransaction> = {},
): PlaidTransaction {
  return {
    transaction_id: "txn-1",
    account_id: "acct-1",
    name: "Coffee",
    merchant_name: "Coffee Shop",
    amount: 12.5,
    iso_currency_code: "USD",
    date: "2026-04-10",
    pending: false,
    pending_transaction_id: null,
    ...overrides,
  };
}

Deno.test(
  "bank expense projection preserves user overrides on provider updates",
  () => {
    const providerRecord = makeExpenseRecord({
      category: "food and drink",
      raw_text: "Netflix",
    });

    const overrides = computeBankExpenseUserOverrides({
      providerFields: {
        category: "food and drink",
        raw_text: "Netflix",
        amount_cents: 1599,
        date: "2026-04-10",
      },
      visibleExpense: {
        category: "subscriptions",
        raw_text: "Netflix Premium",
        amount_cents: 1599,
        date: "2026-04-10",
      },
    });

    const plan = buildBankExpenseMutationPlan({
      records: [providerRecord],
      transactions: [makePlaidTransaction()],
      existingRows: [
        {
          id: "expense-1",
          provider_transaction_id: "txn-1",
          deleted_at: null,
          deleted_reason: null,
          sync_version: 3,
          user_overrides: overrides,
        },
      ],
      providerPendingTransactionIds: new Map(),
      cursorGeneration: 2,
    });

    assertEquals(plan.inserts.length, 0);
    assertEquals(plan.updates.length, 1);
    assertEquals(plan.updates[0].id, "expense-1");
    assertEquals(plan.updates[0].category, "subscriptions");
    assertEquals(plan.updates[0].raw_text, "Netflix Premium");
    assertEquals(plan.updates[0].merchant, "Coffee Shop");
    assertEquals(plan.updates[0].provider_fields?.category, "food and drink");
    assertEquals(plan.updates[0].provider_fields?.merchant, "Coffee Shop");
    assertEquals(plan.updates[0].sync_version, 4);
  },
);

Deno.test(
  "mapPlaidTransactionToExpense uses Plaid merchant_name for merchant field",
  () => {
    const expense = mapPlaidTransactionToExpense({
      userId: "user-1",
      bankAccountId: "bank-account-1",
      defaultCurrency: "USD",
      transaction: makePlaidTransaction({
        name: "SQ *COFFEE SHOP 1234",
        merchant_name: "Coffee Shop",
      }),
    });

    assertEquals(expense.raw_text, "SQ *COFFEE SHOP 1234");
    assertEquals(expense.merchant, "Coffee Shop");
    assertEquals(expense.source, "Coffee Shop");
  },
);

Deno.test(
  "bank expense projection merges pending transaction into posted row update",
  () => {
    const plan = buildBankExpenseMutationPlan({
      records: [
        makeExpenseRecord({
          provider_transaction_id: "posted-1",
          raw_text: "Coffee posted",
        }),
      ],
      transactions: [
        makePlaidTransaction({
          transaction_id: "posted-1",
          pending_transaction_id: "pending-1",
        }),
      ],
      existingRows: [
        {
          id: "expense-pending",
          provider_transaction_id: "pending-1",
          deleted_at: null,
          deleted_reason: null,
          sync_version: 1,
          user_overrides: {
            category: "custom category",
          },
        },
      ],
      providerPendingTransactionIds: new Map([["posted-1", "pending-1"]]),
      cursorGeneration: 5,
    });

    assertEquals(plan.inserts.length, 0);
    assertEquals(plan.updates.length, 1);
    assertEquals(plan.updates[0].id, "expense-pending");
    assertEquals(plan.updates[0].provider_transaction_id, "posted-1");
    assertEquals(
      plan.updates[0].provider_posted_from_pending_transaction_id,
      "pending-1",
    );
    assertEquals(plan.updates[0].category, "custom category");
  },
);

Deno.test(
  "bank expense projection undeletes provider-removed transactions on re-add",
  () => {
    const plan = buildBankExpenseMutationPlan({
      records: [makeExpenseRecord()],
      transactions: [makePlaidTransaction()],
      existingRows: [
        {
          id: "expense-removed",
          provider_transaction_id: "txn-1",
          deleted_at: "2026-04-09T10:00:00.000Z",
          deleted_reason: "provider_removed",
          provider_deleted_at: "2026-04-09T10:00:00.000Z",
          sync_version: 2,
          user_overrides: {},
        },
      ],
      providerPendingTransactionIds: new Map(),
      cursorGeneration: 6,
    });

    assertEquals(plan.updates.length, 1);
    assertEquals(plan.updates[0].deleted_at, null);
    assertEquals(plan.updates[0].deleted_reason, null);
    assertEquals(plan.updates[0].provider_deleted_at, null);
  },
);

Deno.test(
  "bank expense projection keeps user-deleted transactions hidden",
  () => {
    const plan = buildBankExpenseMutationPlan({
      records: [makeExpenseRecord()],
      transactions: [makePlaidTransaction()],
      existingRows: [
        {
          id: "expense-hidden",
          provider_transaction_id: "txn-1",
          deleted_at: "2026-04-09T10:00:00.000Z",
          deleted_reason: "user_deleted",
          sync_version: 2,
          user_overrides: {},
        },
      ],
      providerPendingTransactionIds: new Map(),
      cursorGeneration: 6,
    });

    assertEquals(plan.updates.length, 1);
    assertEquals(plan.updates[0].deleted_reason, "user_deleted");
    assertEquals(plan.updates[0].deleted_at, "2026-04-09T10:00:00.000Z");
  },
);

Deno.test(
  "bank expense projection freezes settlement-linked accounting fields",
  () => {
    const plan = buildBankExpenseMutationPlan({
      records: [
        makeExpenseRecord({
          amount_cents: 2200,
          currency: "EUR",
          household_id: null,
          account_id: "provider-wallet",
        }),
      ],
      transactions: [makePlaidTransaction()],
      existingRows: [
        {
          id: "expense-settlement-linked",
          provider_transaction_id: "txn-1",
          split_group_id: "split-group-1",
          amount_cents: 1250,
          currency: "CAD",
          household_id: "household-1",
          account_id: "household-wallet",
          deleted_at: null,
          deleted_reason: null,
          sync_version: 7,
          user_overrides: {},
        },
      ],
      providerPendingTransactionIds: new Map(),
      cursorGeneration: 8,
    });

    assertEquals(plan.updates.length, 1);
    assertEquals(plan.updates[0].amount_cents, 1250);
    assertEquals(plan.updates[0].currency, "CAD");
    assertEquals(plan.updates[0].household_id, "household-1");
    assertEquals(plan.updates[0].account_id, "household-wallet");
    assertEquals(plan.updates[0].provider_fields?.amount_cents, 2200);
    assertEquals(plan.updates[0].provider_fields?.currency, "EUR");
    assertEquals(plan.updates[0].provider_fields?.household_id, null);
    assertEquals(
      plan.updates[0].provider_fields?.account_id,
      "provider-wallet",
    );
  },
);
