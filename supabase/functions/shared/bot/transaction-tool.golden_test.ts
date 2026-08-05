import {
  invokeTransactionSave,
  normalizeTransactionToolArgs,
} from "./transaction-tool.ts";
import {
  resolveWalletForTransactionToolCall,
  resolveWalletTransactionCurrency,
} from "./wallet-scope.ts";
import { buildRecurrenceRule } from "./date-utils.ts";

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `${message ?? "assertEquals failed"}\nactual: ${actualJson}\nexpected: ${expectedJson}`,
    );
  }
}

function createMockInvoker() {
  const calls: Array<{ functionName: string; options: any }> = [];
  return {
    calls,
    invoker: {
      functions: {
        invoke: async (functionName: string, options?: any) => {
          calls.push({ functionName, options });
          return { data: { success: true }, error: null };
        },
      },
    },
  };
}

Deno.test(
  "invokeTransactionSave preserves shared income split payload",
  async () => {
    const mock = createMockInvoker();
    const customSplits = {
      splitType: "amount",
      memberSplits: [
        { userId: "11111111-1111-4111-8111-111111111111", amount: 30 },
        { userId: "22222222-2222-4222-8222-222222222222", amount: 70 },
      ],
    };

    await invokeTransactionSave(
      mock.invoker,
      "internal-key",
      "00000000-0000-4000-8000-000000000000",
      {
        type: "income",
        amount: 100,
        category: "salary",
        currency: "USD",
        date: "2026-05-20",
        householdId: "33333333-3333-4333-8333-333333333333",
        payerUserId: "11111111-1111-4111-8111-111111111111",
        customSplits,
      },
    );

    assertEquals(mock.calls.length, 1);
    assertEquals(mock.calls[0].functionName, "save-income");
    assertEquals(
      mock.calls[0].options.body.payerUserId,
      customSplits.memberSplits[0].userId,
    );
    assertEquals(mock.calls[0].options.body.customSplits, customSplits);
  },
);

Deno.test(
  "invokeTransactionSave treats negative signed amount as expense",
  async () => {
    const mock = createMockInvoker();

    await invokeTransactionSave(
      mock.invoker,
      "internal-key",
      "00000000-0000-4000-8000-000000000000",
      {
        type: "income",
        amount: -42.5,
        category: "food",
        currency: "USD",
        date: "2026-05-20",
      },
    );

    assertEquals(mock.calls.length, 1);
    assertEquals(mock.calls[0].functionName, "save-expense");
    assertEquals(mock.calls[0].options.body.amount, 42.5);
  },
);

Deno.test(
  "normalizeTransactionToolArgs preserves an explicit transaction currency",
  () => {
    const result = normalizeTransactionToolArgs(
      {
        type: "expense",
        amount: 25,
        category: "food",
        currency: "MYR",
      },
      {
        currency: "EUR",
        currencyEvidenceText: "Log lunch for 25 ringgit",
      },
    );

    assertEquals(result, {
      ok: true,
      transaction: {
        type: "expense",
        amount: 25,
        category: "food",
        currency: "MYR",
      },
    });
  },
);

Deno.test(
  "normalizeTransactionToolArgs keeps ambiguous symbols on the preferred currency",
  () => {
    const result = normalizeTransactionToolArgs(
      {
        type: "expense",
        amount: 12.5,
        category: "food",
        currency: "USD",
      },
      {
        currency: "CAD",
        currencyEvidenceText: "Log coffee for $12.50",
      },
    );

    assertEquals(result, {
      ok: true,
      transaction: {
        type: "expense",
        amount: 12.5,
        category: "food",
        currency: "CAD",
      },
    });
  },
);

Deno.test(
  "normalizeTransactionToolArgs prefers strong message currency evidence",
  () => {
    const result = normalizeTransactionToolArgs(
      {
        type: "expense",
        amount: 25,
        category: "food",
        currency: "EUR",
      },
      {
        currency: "USD",
        currencyEvidenceText: "Log lunch for MYR 25",
      },
    );

    assertEquals(result, {
      ok: true,
      transaction: {
        type: "expense",
        amount: 25,
        category: "food",
        currency: "MYR",
      },
    });
  },
);

Deno.test(
  "normalizeTransactionToolArgs rejects an unsupported explicit currency",
  () => {
    const result = normalizeTransactionToolArgs(
      {
        type: "expense",
        amount: 10,
        category: "food",
        currency: "KWD",
      },
      {
        currency: "EUR",
        currencyEvidenceText: "Log lunch for 10 Kuwaiti dinars",
      },
    );

    assertEquals(result, {
      ok: false,
      error: "Unsupported currency. Ask the user to confirm the currency.",
    });
  },
);

Deno.test(
  "an explicit transaction currency cannot be replaced by a selected wallet",
  () => {
    const normalized = normalizeTransactionToolArgs(
      {
        type: "expense",
        amount: 25,
        category: "food",
        currency: "MYR",
      },
      {
        currency: "EUR",
        currencyEvidenceText: "Log lunch for 25 ringgit",
      },
    );

    if (!normalized.ok) throw new Error(normalized.error);

    assertEquals(
      resolveWalletTransactionCurrency({
        wallet: {
          accountId: "00000000-0000-4000-8000-000000000000",
          currency: "EUR",
        },
        walletName: "Euro wallet",
        transactionCurrency: normalized.transaction.currency,
        fallbackCurrency: "EUR",
        hasExplicitCurrency: true,
      }),
      {
        error:
          "Transaction currency must match the selected wallet currency (EUR).",
      },
    );
  },
);

Deno.test("an empty wallet hint is rejected instead of clearing account_id", async () => {
  const result = await resolveWalletForTransactionToolCall(
    {
      from: () => {
        throw new Error("A malformed wallet hint must not query accounts.");
      },
    },
    "00000000-0000-4000-8000-000000000000",
    null,
    { wallet_id: null },
  );

  assertEquals(result, { error: "Wallet id must be a non-empty UUID." });
});

Deno.test("object-form recurring rules default an omitted frequency to monthly", () => {
  assertEquals(
    buildRecurrenceRule(
      { recurrence_rule: { anchor_date: "2026-08-04" } },
      "2026-08-04",
    ),
    { anchor_date: "2026-08-04", frequency: "monthly" },
  );
});
