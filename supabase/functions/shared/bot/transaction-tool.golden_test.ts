import { invokeTransactionSave } from "./transaction-tool.ts";

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
