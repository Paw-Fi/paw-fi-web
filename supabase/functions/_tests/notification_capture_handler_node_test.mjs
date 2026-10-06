import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import * as recurring from "../shared/android-recurring-capture.ts";

// Transform the real classifier's parameter properties for Node's VM; native
// strip-only imports cannot execute that TypeScript syntax.
const classifierContext = createContext({
  TextEncoder,
  crypto: webcrypto,
  setTimeout,
  clearTimeout,
  console,
});
const classifierModule = new SourceTextModule(
  ts.transpileModule(
    await readFile(
      new URL("../shared/android-notification-classifier.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    },
  ).outputText,
  { context: classifierContext },
);
await classifierModule.link(async (specifier) => {
  const exports = await import(
    new URL(`../shared/${specifier.slice(2)}`, import.meta.url)
  );
  return new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) {
      this.setExport(key, value);
    }
  }, { context: classifierContext });
});
await classifierModule.evaluate();
const classifier = classifierModule.namespace;

const user = "00000000-0000-4000-8000-000000000001";
const wallet = "00000000-0000-4000-8000-000000000002";
const series = "00000000-0000-4000-8000-000000000003";
const household = "00000000-0000-4000-8000-000000000004";
const savedSplit = "00000000-0000-4000-8000-000000000005";
const proposal = {
  action: "save_transaction",
  eventStatus: "posted",
  transactionType: "expense",
  subtype: "subscription",
  amount: 12.99,
  currency: "THB",
  currencyAmbiguous: false,
  merchant: "佐藤商店",
  date: "2024-09-26",
  description: "月額料金の支払い完了",
  isRecurring: true,
  recurrenceRule: { frequency: "monthly", anchor_date: "2024-09-26" },
  confidence: 1,
  reasonCode: "confirmed",
  moneyDirection: "out",
  movementScope: "external",
};
const schedule = {
  id: series,
  date: "2024-01-24",
  amount_cents: 1099,
  currency: "THB",
  type: "expense",
  merchant: proposal.merchant,
  account_id: wallet,
  recurrence_rule: { frequency: "monthly", anchor_date: "2024-01-24" },
};
async function handlerFixture(options = {}) {
  let handler;
  const writes = [], requests = [];
  const client = {
    from(table) {
      let patch;
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        is() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        update(value) {
          patch = value;
          return query;
        },
        async range() {
          return { data: options.schedules ?? [schedule], error: null };
        },
        async maybeSingle() {
          if (table === "user_contacts") {
            return {
              data: {
                preferred_currency: "THB",
                preferred_timezone: "Asia/Bangkok",
                preferred_language: "ja",
                wallet_capture_enabled: true,
              },
              error: null,
            };
          }
          if (table === "notification_capture_classifications") {
            writes.push(patch);
            return { data: { id: "event" }, error: null };
          }
          if (table === "expense_split_groups") {
            return {
              data: {
                payer_user_id: user,
                total_amount_cents: 1000,
                currency: "THB",
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        then(resolve, reject) {
          return Promise.resolve({
            data: [
              { user_id: user, amount_cents: 600 },
              { user_id: wallet, amount_cents: 400 },
            ],
            error: null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      if (name === "claim_notification_capture_classification_v2") {
        return {
          data: {
            status: "claimed",
            eventId: "event",
            processingToken: "token",
            attemptNumber: 1,
          },
          error: null,
        };
      }
      assert.equal(name, "calculate_next_occurrence_on_or_after");
      return {
        data: args.p_reference_date > "2024-09-24"
          ? "2024-10-24"
          : "2024-09-24",
        error: null,
      };
    },
  };
  const exportsBySuffix = {
    "cors.ts": { corsHeaders: {} },
    "auth.ts": {
      authenticateUserOrInternalSecret: async () => ({
        success: true,
        userId: user,
      }),
      resolveAnyInternalFunctionKey: () => "isolated-test-key",
      buildInternalInvokeHeaders: () => ({
        "x-internal-function-key": "isolated-test-key",
      }),
    },
    "android-notification-classifier.ts": {
      ...classifier,
      classifyAndroidNotification: async () => options.proposal ?? proposal,
    },
    "android-recurring-capture.ts": recurring,
    "accounts.ts": {
      assertAccountInScope: async () => true,
      assertScopeAccess: async () => true,
      getAccountOrNull: async () => ({ currency: "THB" }),
      resolveDefaultAccountIdStrict: async () => wallet,
    },
    "category-resolution.ts": {
      loadCategoryContext: async () => ({
        allowedExpenseSet: new Set(["subscriptions", "transfers"]),
        allowedIncomeSet: new Set(["salary"]),
      }),
    },
    "edge-error-alert.ts": { reportEdgeFunctionError: async () => {} },
    "plus-entitlement.ts": {
      hasCapturePlusEntitlement: () => true,
      loadLatestSubscriptionForUser: async () => ({}),
      jsonSubscriptionRequired: () => ({}),
    },
    "capture-plus-notification.ts": {
      queueCapturePlusRequiredNotification: async () => {},
    },
    "vertex-ai-chat.ts": {
      createVertexGenerativeAI: () => ({}),
      getVertexAiConfigFromEnv: () => ({}),
    },
    "wallet-capture.ts": {
      getLocalYyyyMmDdInTimeZone: () => "2024-09-26",
      resolveNotificationCaptureSource: (source) => source,
      resolveWalletCaptureAccountForCurrency: async () => wallet,
    },
  };
  const context = createContext({
    Request,
    Response,
    TextEncoder,
    crypto: webcrypto,
    console: { error() {}, warn() {} },
    Deno: {
      serve(value) {
        handler = value;
      },
      env: {
        get() {
          return "isolated-test";
        },
      },
    },
    fetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      const payload = options.payload ?? {
        success: true,
        data: {
          duplicate: false,
          transaction: { id: "actual", amount_cents: 1299 },
          occurrence: { scheduled_occurrence_date: "2024-09-24" },
        },
      };
      return new Response(JSON.stringify(payload), {
        status: options.status ?? 200,
      });
    },
  });
  const source = await readFile(
    new URL("../classify-notification-capture/index.ts", import.meta.url),
    "utf8",
  );
  const module = new SourceTextModule(stripTypeScriptTypes(source), {
    context,
  });
  await module.link((specifier) => {
    const exports = specifier.includes("@supabase")
      ? { createClient: () => client }
      : Object.entries(exportsBySuffix).find(([suffix]) =>
        specifier.endsWith("/" + suffix)
      )?.[1];
    assert.ok(exports, specifier);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) {
        this.setExport(key, value);
      }
    }, { context });
  });
  await module.evaluate();
  const response = await handler(
    new Request("https://test.invalid/classify", {
      method: "POST",
      body: JSON.stringify({
        captureSource: "ios_notification_shortcut",
        idempotencyKey: "native-event",
        householdId: options.householdId,
        notification: {
          packageName: "ios.shortcut.notification",
          title: "支払い完了",
        },
      }),
    }),
  );
  return {
    status: response.status,
    body: await response.json(),
    writes,
    requests,
  };
}

test("notification HTTP handler confirms the exact cycle and changed actual amount", async () => {
  const result = await handlerFixture();
  assert.equal(result.status, 200);
  assert.equal(result.body.data.id, "actual");
  assert.equal(result.body.meta.recurringOccurrenceConfirmed, true);
  assert.equal(result.writes.at(-1).status, "saved");
  const request = result.requests[0];
  assert.ok(request.url.endsWith("/confirm-recurring-occurrence"));
  assert.equal(request.body.recurringId, series);
  assert.equal(request.body.scheduledOccurrenceDate, "2024-09-24");
  assert.equal(request.body.paidDate, "2024-09-26");
  assert.equal(request.body.amount, 12.99);
  assert.equal(request.body.description, proposal.description);
  assert.equal(request.body.updateFutureAmount, false);
  assert.equal(request.body.idempotencyKey, "native-event|transaction");
});

test("notification HTTP handler preserves a shared schedule allocation at the actual amount", async () => {
  const result = await handlerFixture({
    householdId: household,
    schedules: [{
      ...schedule,
      household_id: household,
      split_group_id: savedSplit,
    }],
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.requests[0].body.customSplits, {
    splitType: "amount",
    memberSplits: [
      { userId: user, amount: 7.79 },
      { userId: wallet, amount: 5.2 },
    ],
  });
  assert.equal(result.requests[0].body.payerUserId, user);
});

test("notification HTTP handler retains ambiguous schedules and occurrence conflicts without a second save", async () => {
  for (
    const options of [
      { schedules: [schedule, { ...schedule, id: "second" }] },
      { status: 400, payload: { success: false, code: "OCCURRENCE_CONFLICT" } },
    ]
  ) {
    const result = await handlerFixture(options);
    assert.equal(result.status, 503);
    assert.equal(result.body.retryable, true);
    assert.equal(result.writes.at(-1).status, "failed");
    assert.ok(
      result.requests.every((request) =>
        !request.url.endsWith("/save-wallet-transaction")
      ),
    );
  }
});

test("notification HTTP handler saves an actual ordinary payment when recurrence is not proven", async () => {
  const result = await handlerFixture({
    proposal: { ...proposal, isRecurring: false, recurrenceRule: undefined },
    payload: { success: true, data: { id: "actual" } },
  });
  assert.equal(result.status, 200);
  const request = result.requests[0];
  assert.ok(request.url.endsWith("/save-wallet-transaction"));
  assert.equal(request.body.captureSource, "ios_notification_shortcut");
  assert.equal(request.body.transaction.isRecurring, false);
  assert.equal(request.body.transaction.amount, 12.99);
});

test("notification HTTP handler never caches malformed 2xx acknowledgements as saved", async () => {
  for (const isRecurring of [false, true]) {
    const result = await handlerFixture({
      proposal: { ...proposal, isRecurring },
      payload: { success: true },
    });
    assert.equal(result.status, 503);
    assert.equal(result.writes.at(-1).status, "failed");
    assert.equal(result.body.retryable, true);
  }
});
