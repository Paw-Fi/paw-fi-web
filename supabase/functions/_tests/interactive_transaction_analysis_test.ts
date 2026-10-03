import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { validateInteractiveItems, parseInteractiveRequest, type InteractiveContext } from "../shared/interactive-transaction-contract.ts";
import { runInteractiveTransactionAnalysis } from "../shared/interactive-transaction-analysis.ts";

const context: InteractiveContext = {
  userId: "me",
  defaultSpaceId: "personal",
  defaultWalletId: "eur-wallet",
  currency: "EUR",
  date: "2026-10-02",
  language: "en",
  expenseCategories: ["groceries", "restaurants", "other"],
  incomeCategories: ["salary"],
  spaces: [
    { id: "personal", name: "Personal", isPortfolio: false, members: [] },
    { id: "family", name: "家族", isPortfolio: false, members: [{ userId: "me", name: "Charles" }, { userId: "alice", name: "Alice" }] },
    { id: "private", name: "Work", isPortfolio: true, members: [{ userId: "me", name: "Charles" }] },
  ],
  wallets: [
    { id: "eur-wallet", name: "Cash", currency: "EUR", spaceId: "personal" },
    { id: "usd-wallet", name: "旅行", currency: "USD", spaceId: "family" },
  ],
};
const transaction = (overrides = {}) => ({
  type: "expense", amount: 70, currency: "USD", date: "2026-09-30",
  category: "groceries", description: "晚餐", merchant: "小商店",
  transactionTime: "18:30:00", spaceId: "family", walletId: "usd-wallet",
  explicitFields: ["currency", "date", "merchant", "transactionTime", "spaceId", "walletId"],
  ...overrides,
});

Deno.test("interactive: explicit native details and destinations survive conflicting defaults", () => {
  const result = validateInteractiveItems([transaction()], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].currency, "USD");
  assertEquals(result.items[0].amount, 70);
  assertEquals(result.items[0].merchant, "小商店");
  assertEquals(result.items[0].date, "2026-09-30");
  assertEquals(result.items[0].transactionTime, "18:30:00");
  assertEquals(result.items[0].destination, { householdId: "family", isPortfolio: false, accountId: "usd-wallet", accountCurrency: "USD", spaceLabel: "家族" });
});

Deno.test("interactive: each transaction owns its Space without cross-item leakage", () => {
  const result = validateInteractiveItems([
    transaction(), transaction({ currency: "EUR", spaceId: "personal", walletId: "eur-wallet" }),
  ], context);
  assertEquals(result.issues, []);
  assertEquals(result.items.map((item) => item.destination.householdId), ["family", null]);
});

Deno.test("interactive: no explicit destination uses only compatible drawer defaults", () => {
  const result = validateInteractiveItems([transaction({ spaceId: undefined, walletId: undefined, explicitFields: ["currency"] })], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].destination.accountId, null);
  assertEquals(result.items[0].destination.householdId, null);
});

Deno.test("interactive: a named wallet can establish its Space and omitted currency", () => {
  const result = validateInteractiveItems([transaction({ spaceId: undefined, currency: undefined, explicitFields: ["walletId"] })], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].currency, "USD");
  assertEquals(result.items[0].destination.householdId, "family");
});

for (const [name, overrides] of Object.entries({
  "foreign wallet": { walletId: "not-authorized" },
  "foreign Space": { spaceId: "not-authorized" },
  "wallet currency conflict": { currency: "EUR" },
  "wallet Space conflict": { spaceId: "personal" },
  "invalid date": { date: "2026-02-30" },
  "invalid time": { transactionTime: "25:20:00" },
  "invalid amount": { amount: Infinity },
  "unsupported category": { category: "invented" },
  "unknown payer": { payerUserId: "outsider", explicitFields: ["payerUserId", "spaceId", "walletId"] },
})) {
  Deno.test(`interactive: ${name} blocks the whole proposal rather than dropping data`, () => {
    const result = validateInteractiveItems([transaction(), transaction(overrides)], context);
    assertEquals(result.items, []);
    assertEquals(result.issues.length > 0, true);
  });
}

Deno.test("interactive: explicit Alice 50 and me 20 is preserved exactly", () => {
  const customSplits = { splitType: "amount", memberSplits: [{ userId: "alice", amount: 50 }, { userId: "me", amount: 20 }] };
  const result = validateInteractiveItems([transaction({ customSplits, explicitFields: ["spaceId", "walletId", "currency", "customSplits"] })], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].customSplits, customSplits);
});

for (const amount of [60, 100]) {
  Deno.test(`interactive: split total ${amount} never rewrites the explicit 50/20`, () => {
    const result = validateInteractiveItems([transaction({ amount, customSplits: { splitType: "amount", memberSplits: [{ userId: "alice", amount: 50 }, { userId: "me", amount: 20 }] }, explicitFields: ["spaceId", "walletId", "currency", "customSplits"] })], context);
    assertEquals(result.items, []);
    assertEquals(result.issues.some((issue) => issue.field === "customSplits"), true);
  });
}

Deno.test("interactive: deliberate equal split is not erased in favor of stored defaults", () => {
  const customSplits = { splitType: "equal", memberSplits: [{ userId: "alice" }, { userId: "me" }] };
  const result = validateInteractiveItems([transaction({ customSplits, explicitFields: ["spaceId", "walletId", "currency", "customSplits"] })], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].customSplits, customSplits);
});

Deno.test("interactive: duplicate members and unsupported allocations require correction", () => {
  for (const memberSplits of [
    [{ userId: "alice", amount: 50 }, { userId: "alice", amount: 20 }],
    [{ userId: "alice", amount: 50 }, { userId: "outsider", amount: 20 }],
    [{ userId: "alice", amount: -10 }, { userId: "me", amount: 80 }],
  ]) {
    const result = validateInteractiveItems([transaction({ customSplits: { splitType: "amount", memberSplits }, explicitFields: ["customSplits", "spaceId", "walletId", "currency"] })], context);
    assertEquals(result.items, []);
    assertEquals(result.issues.length > 0, true);
  }
});

Deno.test("interactive: subset allocations are completed with zero, never redistributed", () => {
  const expanded = { ...context, spaces: context.spaces.map((space) => space.id === "family" ? { ...space, members: [...space.members, { userId: "bob", name: "Bob" }] } : space) };
  const result = validateInteractiveItems([transaction({ customSplits: { splitType: "amount", memberSplits: [{ userId: "alice", amount: 50 }, { userId: "me", amount: 20 }] }, explicitFields: ["spaceId", "walletId", "currency", "customSplits"] })], expanded);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].customSplits, { splitType: "amount", memberSplits: [{ userId: "alice", amount: 50 }, { userId: "me", amount: 20 }, { userId: "bob", amount: 0 }] });
});

Deno.test("interactive: recurrence uses the existing save contract", () => {
  const recurrence_rule = { frequency: "monthly", interval: 1, anchor_date: "2026-09-30" };
  const result = validateInteractiveItems([transaction({ transactionTime: undefined, isRecurring: true, recurrence_rule, explicitFields: ["isRecurring", "recurrence_rule", "spaceId", "walletId", "currency"] })], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].recurrence_rule, recurrence_rule);
});

Deno.test("interactive: independent verification disagreement returns no saveable items", async () => {
  const result = await runInteractiveTransactionAnalysis({ source: { text: "١٠٠ للعشاء، أليس ٥٠ وأنا ٢٠" }, request: { version: 1, answers: [] }, context,
    complete: (phase) => Promise.resolve(phase === "extract" ? { decision: "ready", items: [transaction()] } : { approved: false, question: "كيف نوزع المبلغ المتبقي؟", choices: ["٣٠ لي", "٣٠ لأليس"] }),
  });
  assertEquals(result.requireCorrection, true);
  assertEquals(result.items, []);
});

Deno.test("interactive: multilingual clarification is replayed with the original source", async () => {
  const source = { text: "家族で夕食70米ドル、アリス50、自分20、9月30日18時30分" };
  const answers = [{ question: "どの財布ですか？", answer: "旅行" }];
  const phases: string[] = [];
  const result = await runInteractiveTransactionAnalysis({ source, request: { version: 1, answers }, context,
    complete: (phase, _model, payload) => {
      phases.push(phase);
      assertEquals(payload.source, source.text);
      assertEquals(payload.answers, answers);
      return Promise.resolve(phase === "extract" ? { decision: "ready", items: [transaction()] } : { approved: true });
    },
  });
  assertEquals(result.requireCorrection, false);
  assertEquals(phases, ["extract", "verify"]);
});

Deno.test("interactive: invalid arithmetic asks a question, never self-repairs", async () => {
  const phases: string[] = [];
  const result = await runInteractiveTransactionAnalysis({ source: { text: "100 dinner, Alice 50, me 20" }, request: { version: 1, answers: [] }, context,
    complete: (phase) => {
      phases.push(phase);
      return Promise.resolve(phase === "extract" ? { decision: "ready", items: [transaction({ amount: 100, customSplits: { splitType: "amount", memberSplits: [{ userId: "alice", amount: 50 }, { userId: "me", amount: 20 }] }, explicitFields: ["customSplits", "spaceId", "walletId", "currency"] })] } : { question: "Who gets the remaining 30?", choices: ["Give the remaining 30 to me", "Give the remaining 30 to Alice"] });
    },
  });
  assertEquals(result.requireCorrection, true);
  assertEquals(result.items, []);
  assertEquals(phases, ["extract", "clarify"]);
});

Deno.test("interactive: legacy requests remain outside the opt-in contract", () => {
  assertEquals(parseInteractiveRequest(undefined), null);
  assertEquals(parseInteractiveRequest({ version: 1, answers: [] }), { version: 1, answers: [] });
});

Deno.test("interactive: malformed or unbounded clarification histories fail validation", async () => {
  for (const value of [{ version: 2 }, { version: 1, answers: [{ question: "q", answer: "" }] }, { version: 1, answers: Array(13).fill({ question: "q", answer: "a" }) }]) {
    await assertRejects(async () => parseInteractiveRequest(value));
  }
});
