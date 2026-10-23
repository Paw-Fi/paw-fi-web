import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import * as recurring from "../shared/android-recurring-capture.ts";
import { classifyTransactionCategories } from "../shared/ai-category-classifier.ts";
import { getExpenseCategories, getIncomeCategories } from "../shared/category-colors.ts";

// Transform the real classifier's parameter properties for Node's VM; native
// strip-only imports cannot execute that TypeScript syntax.
const classifierContext = createContext({
  Error,
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
  const writes = [], requests = [], reports = [], metrics = [];
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
            if (options.finalizeError) {
              return { data: null, error: options.finalizeError };
            }
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
          data: options.claim ?? {
            status: "claimed",
            eventId: "event",
            processingToken: "token",
            attemptNumber: options.attemptNumber ?? 1,
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
      classifyAndroidNotification: async (params) => {
        if (options.classify) return options.classify(params);
        if (options.classificationError) throw options.classificationError;
        return options.proposal ?? proposal;
      },
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
    "edge-error-alert.ts": {
      reportEdgeFunctionError: async (report) => reports.push(report),
    },
    "plus-entitlement.ts": {
      hasCapturePlusEntitlement: () => true,
      loadLatestSubscriptionForUser: async () => {
        options.onContext?.();
        return {};
      },
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
    Error,
    Request,
    Response,
    TextEncoder,
    crypto: webcrypto,
    Date: options.Date ?? Date,
    console: { error() {}, warn() {}, info: (_message, value) => metrics.push(value) },
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
      if (options.saveError) throw options.saveError;
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
    reports,
    metrics,
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

const privateFailure = "PRIVATE_NOTIFICATION_支払い_١٬٢٣٤٫٥٠";
const classifierParams = {
  notification: { packageName: "test.bank", text: privateFailure },
  fallbackDate: "2026-10-15",
  expenseCategories: ["other", "subscriptions"],
  incomeCategories: ["other", "salary"],
};

const ignoredProposal = { action: "ignore", eventStatus: "informational", confidence: 1 };
const approval = { financialVerdict: "APPROVE", categoryVerdict: "UNRESOLVED", category: "" };
const modelResponse = (value, raw) => ({ response: { text: () => JSON.stringify(value), raw } });
async function flushMicrotasks() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}
function fakeClassifierClock(t) {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1_000 });
  classifierContext.Date = Date;
  t.after(() => { delete classifierContext.Date; });
}

test("notification AI shares one deadline across classification and sequential verifier timeouts", async (t) => {
  fakeClassifierClock(t);
  const attempts = [], aborted = [], metrics = [];
  const pending = classifier.classifyAndroidNotification({
    ...classifierParams,
    onModelAttempt: (metric) => metrics.push(metric),
    genAI: {
      getGenerativeModel: ({ model }) => ({
        generateContent: (_request, { signal }) => {
          attempts.push(model);
          if (attempts.length === 1) return Promise.resolve(modelResponse(ignoredProposal));
          return new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => { aborted.push(model); reject(signal.reason); }, { once: true });
          });
        },
      }),
    },
  }).then(() => assert.fail("unverified result must not escape"), (error) => error);
  await flushMicrotasks();
  assert.equal(attempts.length, 2);
  t.mock.timers.tick(10_000);
  await flushMicrotasks();
  assert.equal(attempts.length, 3);
  t.mock.timers.tick(10_000);
  const error = await pending;
  assert.equal(error.message, "NOTIFICATION_CLASSIFICATION_TIMEOUT");
  assert.equal(classifier.buildAndroidNotificationFailureResult(error).retryable, true);
  assert.deepEqual(aborted, attempts.slice(1));
  assert.deepEqual(metrics.map((metric) => metric.timeoutMs), [6_000, 10_000, 10_000]);
  assert.deepEqual(metrics.map((metric) => metric.outcome), ["response", "timeout", "timeout"]);
  assert.equal(Date.now(), 21_000);
});

test("notification fallback can verify within the remaining budget without reclassification", async (t) => {
  fakeClassifierClock(t);
  const requests = [];
  let cancelled = false;
  const pending = classifier.classifyAndroidNotification({
    ...classifierParams,
    genAI: {
      getGenerativeModel: ({ model }) => ({
        generateContent: (request, { signal }) => {
          requests.push({ model, request });
          if (requests.length === 1) return Promise.resolve(modelResponse(ignoredProposal));
          if (requests.length === 3) return Promise.resolve(modelResponse(approval));
          return new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => { cancelled = true; reject(signal.reason); }, { once: true });
          });
        },
      }),
    },
  });
  await flushMicrotasks();
  t.mock.timers.tick(10_000);
  const result = await pending;
  assert.equal(result.action, "ignore");
  assert.equal(result.verificationModel, "gemini-3.8-flash");
  assert.equal(cancelled, true);
  assert.deepEqual(requests.map(({ request }) => request.generationConfig.thinkingConfig.thinkingLevel), ["MINIMAL", "MINIMAL", "LOW"]);
  assert.equal(requests[1].request.contents[0].parts[0].text.includes('JSON data): [].'), true);
});

test("exhausted notification budgets never dispatch a new model or return a late ignore", async (t) => {
  fakeClassifierClock(t);
  let calls = 0;
  const genAI = {
    getGenerativeModel: () => ({ generateContent: async () => {
      calls++;
      return modelResponse(ignoredProposal);
    } }),
  };
  await assert.rejects(classifier.classifyAndroidNotification({ ...classifierParams, genAI, deadlineAt: Date.now() }), /NOTIFICATION_CLASSIFICATION_TIMEOUT/);
  assert.equal(calls, 0);
  await assert.rejects(classifier.classifyAndroidNotification({
    ...classifierParams,
    deadlineAt: Date.now() + 100,
    genAI: { getGenerativeModel: () => ({ generateContent: async () => {
      calls++;
      // The response microtask wins Promise.race while its deadline is reached.
      t.mock.timers.setTime(Date.now() + 101);
      return modelResponse(ignoredProposal);
    } }) },
  }), /NOTIFICATION_CLASSIFICATION_TIMEOUT/);
  assert.equal(calls, 1);
});

test("classification time is deducted from the verifier budget and cancelled at the shared deadline", async (t) => {
  fakeClassifierClock(t);
  const metrics = [];
  let calls = 0, cancelled = false;
  const pending = classifier.classifyAndroidNotification({
    ...classifierParams,
    onModelAttempt: (metric) => metrics.push(metric),
    genAI: { getGenerativeModel: () => ({ generateContent: (_request, { signal }) => {
      calls++;
      if (calls === 1) return new Promise((resolve) => setTimeout(() => resolve(modelResponse(ignoredProposal)), 4_000));
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => { cancelled = true; reject(signal.reason); }, { once: true }));
    } }) },
  }).then(() => assert.fail("must remain retryable"), (error) => error);
  t.mock.timers.tick(4_000);
  await flushMicrotasks();
  t.mock.timers.tick(8_000);
  await flushMicrotasks();
  t.mock.timers.tick(8_000);
  const error = await pending;
  assert.equal(error.message, "NOTIFICATION_CLASSIFICATION_TIMEOUT");
  assert.equal(calls, 3);
  assert.equal(cancelled, true);
  assert.deepEqual(metrics.map((metric) => metric.timeoutMs), [6_000, 8_000, 8_000]);
});

test("successful and failed model telemetry retains bounded counts without notification or provider text", async () => {
  const metrics = [];
  const outputs = [failingProvider(429), ignoredProposal, approval];
  const result = await classifier.classifyAndroidNotification({
    ...classifierParams,
    onModelAttempt: (metric) => metrics.push(metric),
    genAI: { getGenerativeModel: () => ({ generateContent: async () => {
      const value = outputs.shift();
      if (value instanceof Error) throw value;
      return modelResponse(value, { secret: privateFailure, usageMetadata: {
        promptTokenCount: 123, candidatesTokenCount: 17, thoughtsTokenCount: 10,
        totalTokenCount: Infinity, privateFailure,
      } });
    } }) },
  });
  assert.equal(result.action, "ignore");
  assert.deepEqual(metrics.map((metric) => metric.outcome), ["error", "response", "response"]);
  assert.equal(metrics[0].httpStatus, 429);
  assert.equal(metrics[0].requestFailureCode, "MODEL_HTTP_ERROR");
  assert.equal(metrics[1].promptTokenCount, 123);
  assert.equal(metrics[1].totalTokenCount, null);
  assert.equal(JSON.stringify(metrics).includes(privateFailure), false);
  const outputs2 = [ignoredProposal, approval];
  const unaffected = await classifier.classifyAndroidNotification({
    ...classifierParams,
    onModelAttempt: () => { throw new Error("logging unavailable"); },
    genAI: { getGenerativeModel: () => ({ generateContent: async () => modelResponse(outputs2.shift()) }) },
  });
  assert.equal(unaffected.action, "ignore");
});

test("handler subtracts context time from AI budget and logs saved, ignored, failed and cached outcomes", async () => {
  let now = 1_000;
  class FixtureDate extends Date { static now() { return now; } }
  const saved = await handlerFixture({
    Date: FixtureDate,
    onContext: () => { now += 4_000; },
    classify: async (params) => {
      assert.equal(params.deadlineAt, 21_000);
      assert.equal(params.deadlineAt - FixtureDate.now(), 16_000);
      params.onModelAttempt({ phase: "classification", model: "gemini-3.1-flash-lite", latencyMs: 10, outcome: "response" });
      return proposal;
    },
  });
  assert.equal(saved.metrics.length, 1);
  assert.equal(saved.metrics[0].outcome, "saved");
  assert.equal(saved.metrics[0].stageTimingsMs.subscription, 4_000);
  assert.equal(saved.metrics[0].totalMs, 4_000);
  assert.equal(saved.metrics[0].modelAttempts.length, 1);
  assert.equal(saved.metrics[0].eventId, "event");
  assert.equal(saved.metrics[0].attemptNumber, 1);
  assert.equal(JSON.stringify(saved.metrics).includes(proposal.merchant), false);
  const ignored = await handlerFixture({ proposal: ignoredProposal });
  assert.equal(ignored.metrics[0].outcome, "ignored");
  assert.equal(ignored.requests.length, 0);
  const failed = await handlerFixture({ classificationError: new classifier.AndroidNotificationClassificationError("NOTIFICATION_CLASSIFICATION_TIMEOUT", []) });
  assert.equal(failed.metrics[0].outcome, "retryable_failure");
  assert.equal(failed.status, 503);
  assert.equal(failed.requests.length, 0);
  const cached = await handlerFixture({ claim: { status: "cached", result: { success: true, data: { id: "actual" } } } });
  assert.equal(cached.metrics[0].cached, true);
  assert.equal(cached.metrics[0].outcome, "saved");
  assert.equal(cached.metrics[0].modelAttempts.length, 0);
  assert.equal(cached.requests.length, 0);
});

function failingProvider(status) {
  const error = new Error(`Provider rejected ${privateFailure}`);
  error.status = status;
  error.response = { status, data: { privateFailure } };
  error.stack = `Error: ${error.message}\n    at generate (file:///var/tmp/runtime/functions/shared/vertex-ai-chat.ts:498:21)`;
  return error;
}

async function classificationFailure(outputs) {
  let index = 0;
  try {
    await classifier.classifyAndroidNotification({
      ...classifierParams,
      genAI: {
        getGenerativeModel: () => ({
          generateContent: async () => {
            const output = outputs[index++];
            if (output instanceof Error) throw output;
            return { response: { text: () => JSON.stringify(output) } };
          },
        }),
      },
    });
    assert.fail("expected classification to fail");
  } catch (error) {
    assert.ok(error instanceof classifier.AndroidNotificationClassificationError);
    return error;
  }
}

test("provider failures retain per-model status and source location without private error text", async () => {
  const error = await classificationFailure(
    classifier.ANDROID_NOTIFICATION_MODELS.map(() => failingProvider(429)),
  );
  const failure = classifier.buildAndroidNotificationFailureResult(error);
  assert.equal(failure.diagnosticCode, "unknown_error");
  assert.equal(failure.retryable, true);
  assert.equal(failure.diagnostics.length, classifier.ANDROID_NOTIFICATION_MODELS.length);
  for (const [index, diagnostic] of failure.diagnostics.entries()) {
    assert.equal(diagnostic.model, classifier.ANDROID_NOTIFICATION_MODELS[index]);
    assert.equal(diagnostic.phase, "classification");
    assert.equal(diagnostic.requestFailureCode, "MODEL_HTTP_ERROR");
    assert.equal(diagnostic.httpStatus, 429);
    assert.equal(diagnostic.failureLocation, "shared/vertex-ai-chat.ts:498:21");
    assert.equal(diagnostic.candidateCount, 0);
    assert.ok(diagnostic.latencyMs >= 0);
  }
  assert.equal(JSON.stringify(failure).includes(privateFailure), false);

  const result = await handlerFixture({ classificationError: error });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "CLASSIFICATION_RETRYABLE");
  assert.equal(result.writes.at(-1).status, "failed");
  assert.equal(result.reports[0].context.stage, "classification");
  assert.match(result.reports[0].error.stack, /at functions\/shared\/vertex-ai-chat.ts:498:21/);
  assert.equal(result.reports[0].error.stack.includes(privateFailure), false);
  assert.equal(JSON.stringify(result).includes(privateFailure), false);
});

test("verifier request failures retain the verification phase and preserve retry behavior", async () => {
  const ignored = { action: "ignore", eventStatus: "informational", confidence: 1 };
  const error = await classificationFailure([
    ignored,
    ...classifier.ANDROID_NOTIFICATION_MODELS.slice(1).map(() => failingProvider(503)),
  ]);
  const failure = classifier.buildAndroidNotificationFailureResult(error);
  assert.equal(failure.retryable, true);
  assert.equal(failure.diagnostics.length, classifier.ANDROID_NOTIFICATION_MODELS.length - 1);
  for (const diagnostic of failure.diagnostics) {
    assert.equal(diagnostic.phase, "verification");
    assert.equal(diagnostic.httpStatus, 503);
  }
});

test("timeouts and truncated output receive stable request diagnostics without changing failure codes", async () => {
  for (const code of ["NOTIFICATION_CLASSIFICATION_TIMEOUT", "MODEL_OUTPUT_TRUNCATED"]) {
    const error = await classificationFailure(
      classifier.ANDROID_NOTIFICATION_MODELS.map(() => new Error(code)),
    );
    const failure = classifier.buildAndroidNotificationFailureResult(error);
    assert.equal(failure.diagnosticCode, code);
    assert.equal(failure.retryable, true);
    assert.equal(failure.diagnostics.length, classifier.ANDROID_NOTIFICATION_MODELS.length);
    assert.ok(failure.diagnostics.every((entry) => entry.requestFailureCode === code));
  }
});

test("handler reports save and finalization exceptions at their actual stages", async () => {
  for (const [options, stage] of [
    [{ saveError: new Error(privateFailure) }, "recurring_confirmation"],
    [{ saveError: new Error(privateFailure), proposal: { ...proposal, isRecurring: false } }, "wallet_capture_save"],
    [{ finalizeError: { message: privateFailure, code: "XX000" } }, "event_finalization"],
  ]) {
    const result = await handlerFixture(options);
    assert.equal(result.status, 503);
    assert.equal(result.body.retryable, true);
    assert.equal(result.reports[0].context.stage, stage);
    assert.equal(JSON.stringify(result).includes(privateFailure), false);
  }
});

test("failure reporting keeps terminal responses and first-attempt-only alerts", async () => {
  const error = new classifier.AndroidNotificationClassificationError(
    "NOTIFICATION_VERIFICATION_BLOCKED", [],
  );
  for (const attemptNumber of [1, 2]) {
    const result = await handlerFixture({ classificationError: error, attemptNumber });
    assert.equal(result.status, 422);
    assert.equal(result.body.code, "CLASSIFICATION_TERMINAL");
    assert.equal(result.body.retryable, false);
    assert.equal(result.reports.length, attemptNumber === 1 ? 1 : 0);
  }
});

test("request diagnostics preserve fallback order and independent financial/category approval", async () => {
  const text = "佐藤商店で THB 12.99 の支払い完了";
  const models = [];
  const outputs = [
    failingProvider(503),
    {
      ...proposal,
      subtype: "purchase",
      currencySource: "notification_explicit",
      amountEvidenceRaw: "12.99",
      currencyEvidenceRaw: "THB",
      merchantEvidenceRaw: "佐藤商店",
      directionEvidenceRaw: "支払い",
      completionEvidenceRaw: "支払い完了",
      transactionEvidenceRaw: text,
      category: "subscriptions",
      isRecurring: false,
    },
    { financialVerdict: "APPROVE", categoryVerdict: "UNSUPPORTED", category: "other" },
  ];
  const result = await classifier.classifyAndroidNotification({
    ...classifierParams,
    notification: { packageName: "test.bank", text },
    genAI: {
      getGenerativeModel: ({ model }) => {
        models.push(model);
        return {
          generateContent: async () => {
            const output = outputs.shift();
            assert.ok(output, "unexpected model call");
            if (output instanceof Error) throw output;
            return { response: { text: () => JSON.stringify(output) } };
          },
        };
      },
    },
  });
  assert.deepEqual(models, [
    classifier.ANDROID_NOTIFICATION_MODELS[0],
    classifier.ANDROID_NOTIFICATION_MODELS[1],
    classifier.ANDROID_NOTIFICATION_MODELS[2],
  ]);
  assert.equal(result.action, "save_transaction");
  assert.equal(result.category, "other");
  assert.equal(result.categoryVerified, true);
  assert.equal(result.amount, 12.99);
  assert.equal(result.currency, "THB");
});

const customCategory = "食料品と日用品";
const schemaCatalog = {
  expenseCategories: [...getExpenseCategories(), customCategory, "مستلزمات المنزل"],
  incomeCategories: [...getIncomeCategories(), "other", "収入の追加分類"],
};

async function classifyWithCatalog({ category = customCategory, verification } = {}) {
  const requests = [];
  const text = "佐藤商店で THB 12.99 の支払い完了";
  const result = await classifier.classifyAndroidNotification({
    ...classifierParams,
    ...schemaCatalog,
    notification: { packageName: "test.bank", text },
    genAI: {
      getGenerativeModel: ({ model }) => ({
        generateContent: async (request) => {
          requests.push({ model, request });
          const isVerification = Boolean(request.generationConfig.responseSchema.properties.financialVerdict);
          const output = isVerification
            ? verification ?? { financialVerdict: "APPROVE", categoryVerdict: "SUPPORTED", category }
            : {
              ...proposal,
              subtype: "purchase",
              currencySource: "notification_explicit",
              amountEvidenceRaw: "12.99",
              currencyEvidenceRaw: "THB",
              merchantEvidenceRaw: "佐藤商店",
              directionEvidenceRaw: "支払い",
              completionEvidenceRaw: "支払い完了",
              transactionEvidenceRaw: text,
              category,
              isRecurring: false,
            };
          return { response: { text: () => JSON.stringify(output) } };
        },
      }),
    },
  });
  return { result, requests };
}

test("large multilingual notification catalogs stay in prompts instead of category schema enums", async () => {
  const { result, requests } = await classifyWithCatalog();
  assert.equal(result.action, "save_transaction");
  assert.equal(result.category, customCategory);
  assert.equal(result.categoryVerified, true);
  assert.equal(result.currency, "THB");
  assert.equal(result.amount, 12.99);
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].model, requests[1].model);
  for (const [index, { request }] of requests.entries()) {
    const properties = request.generationConfig.responseSchema.properties;
    assert.equal(properties.category.type, "STRING");
    assert.equal("enum" in properties.category, false);
    const expected = index === 0
      ? [...schemaCatalog.expenseCategories, ...schemaCatalog.incomeCategories]
      : schemaCatalog.expenseCategories;
    for (const category of expected) {
      assert.ok(request.contents[0].parts[0].text.includes(category), category);
    }
  }
  assert.equal(requests[1].request.contents[0].parts[0].text.includes("収入の追加分類"), false);
  assert.deepEqual([...requests[0].request.generationConfig.responseSchema.properties.action.enum], ["save_transaction", "ignore"]);
  assert.deepEqual([...requests[1].request.generationConfig.responseSchema.properties.financialVerdict.enum], ["APPROVE", "REJECT"]);
});

test("income verification retains its full catalog and original multilingual evidence", async () => {
  const text = "佐藤商店から EUR 1.234,56 の給与を受領しました";
  const requests = [];
  const output = {
    ...proposal, transactionType: "income", subtype: "salary", moneyDirection: "in",
    amount: 1234.56, currency: "EUR", currencySource: "notification_explicit",
    category: "salary", isRecurring: false,
    amountEvidenceRaw: "1.234,56", currencyEvidenceRaw: "EUR", merchantEvidenceRaw: "佐藤商店",
    directionEvidenceRaw: "受領しました", completionEvidenceRaw: "受領しました", transactionEvidenceRaw: text,
  };
  const result = await classifier.classifyAndroidNotification({
    ...classifierParams, ...schemaCatalog,
    notification: { packageName: "test.bank", text },
    genAI: { getGenerativeModel: () => ({ generateContent: async (request) => {
      requests.push(request);
      return modelResponse(requests.length === 1 ? output : { financialVerdict: "APPROVE", categoryVerdict: "SUPPORTED", category: "salary" });
    } }) },
  });
  assert.equal(result.action, "save_transaction");
  assert.equal(result.transactionType, "income");
  assert.equal(result.amount, 1234.56);
  assert.equal(result.currency, "EUR");
  const prompt = requests[1].contents[0].parts[0].text;
  assert.ok(prompt.includes(text));
  assert.ok(prompt.includes(JSON.stringify(schemaCatalog.incomeCategories)));
  assert.equal(prompt.includes(customCategory), false);
});

test("relaxed notification schemas still withhold invented and wrong-type categories", async () => {
  const invented = await classifyWithCatalog({ category: "INVENTED_CATEGORY" });
  assert.equal(invented.result.action, "save_transaction");
  assert.equal(invented.result.category, undefined);
  assert.equal(invented.result.categoryVerified, false);
  const wrongType = await classifyWithCatalog({
    verification: { financialVerdict: "APPROVE", categoryVerdict: "UNSUPPORTED", category: "salary" },
  });
  assert.equal(wrongType.result.category, undefined);
  assert.equal(wrongType.result.categoryVerified, false);
  const corrected = await classifyWithCatalog({
    verification: { financialVerdict: "APPROVE", categoryVerdict: "UNSUPPORTED", category: "مستلزمات المنزل" },
  });
  assert.equal(corrected.result.category, "مستلزمات المنزل");
  assert.equal(corrected.result.categoryVerified, true);
});

test("relaxed category schemas cannot bypass an independent financial rejection", async () => {
  const { result } = await classifyWithCatalog({
    verification: { financialVerdict: "REJECT", categoryVerdict: "SUPPORTED", category: customCategory },
  });
  assert.equal(result.action, "ignore");
  assert.equal(result.reasonCode, "classification_conflict");
});

test("category recovery supports full catalogs with compact tools and type-specific validation", async () => {
  for (const valid of [true, false]) {
    const requests = [];
    const result = await classifyTransactionCategories({
      ...schemaCatalog,
      items: [
        { type: "expense", merchant: "佐藤商店", description: "食料品 ١٢٫٩٩", amount: 12.99, currency: "THB", date: "2026-10-15" },
        { type: "income", description: "給与 1.234,56 €", amount: 1234.56, currency: "EUR", date: "2026-10-15" },
      ],
      budgetMs: 6000,
      genAI: {
        getGenerativeModel: (config) => ({
          generateContent: async (request) => {
            requests.push({ config, request });
            return {
              response: {
                functionCalls: () => [{
                  name: "categorize_transactions",
                  args: { categories: valid ? [customCategory, "salary"] : ["salary", customCategory] },
                }],
              },
            };
          },
        }),
      },
    });
    assert.deepEqual(result.categories, valid ? [customCategory, "salary"] : [null, null]);
    assert.equal(requests.length, valid ? 1 : classifier.ANDROID_NOTIFICATION_MODELS.length);
    for (const { config, request } of requests) {
      const array = config.tools[0].functionDeclarations[0].parameters.properties.categories;
      assert.equal(array.items.type, "string");
      assert.equal("enum" in array.items, false);
      assert.equal(array.minItems, 2);
      assert.equal(array.maxItems, 2);
      const prompt = JSON.parse(request.contents[0].parts[0].text);
      assert.deepEqual(prompt.expenseCategories, schemaCatalog.expenseCategories);
      assert.deepEqual(prompt.incomeCategories, schemaCatalog.incomeCategories);
    }
  }
});

async function replayNotificationProviderSchedule(t, schedule) {
  fakeClassifierClock(t);
  const text = "佐藤商店で THB 12.99 の支払い完了";
  const financialProposal = {
    ...proposal, subtype: "purchase", isRecurring: false,
    currencySource: "notification_explicit", amountEvidenceRaw: "12.99",
    currencyEvidenceRaw: "THB", merchantEvidenceRaw: "佐藤商店",
    directionEvidenceRaw: "支払い", completionEvidenceRaw: "支払い完了",
    transactionEvidenceRaw: text,
  };
  const attempts = [], metrics = [], aborted = [];
  let settled;
  const pending = classifier.classifyAndroidNotification({
    ...classifierParams, notification: { packageName: "test.bank", text },
    onModelAttempt: metric => metrics.push(metric),
    genAI: { getGenerativeModel: ({ model, systemInstruction }) => ({
      generateContent: (_request, { signal }) => {
        const phase = systemInstruction.includes("independent") ? "verification" : "classification";
        const key = `${phase}:${model}`;
        attempts.push(key);
        const step = schedule[key];
        assert.ok(step, `unexpected attempt ${key}`);
        return new Promise((resolve, reject) => {
          let timer;
          const abort = () => { clearTimeout(timer); aborted.push(key); reject(signal.reason); };
          signal.addEventListener("abort", abort, { once: true });
          if (step.delay != null) timer = setTimeout(() => {
            signal.removeEventListener("abort", abort);
            if (step.status) reject(failingProvider(step.status));
            else resolve(modelResponse(phase === "classification" ? financialProposal : approval));
          }, step.delay);
        });
      },
    }) },
  }).then(result => { settled = { result }; }, error => { settled = { error }; });
  for (let elapsed = 0; elapsed <= 20_000 && !settled; elapsed += 100) {
    t.mock.timers.tick(100);
    await flushMicrotasks();
  }
  assert.ok(settled, "the shared deadline must settle the pipeline");
  await pending;
  return { ...settled, attempts, metrics, aborted };
}

const [lite31, lite35, flash38] = classifier.ANDROID_NOTIFICATION_MODELS;
for (const [name, schedule, forbidden] of [
  ["429 classifier is not immediately reused as verifier", {
    [`classification:${lite31}`]: { delay: 400, status: 429 },
    [`classification:${lite35}`]: { delay: 1700 },
    [`verification:${lite31}`]: {},
    [`verification:${flash38}`]: { delay: 4000 },
  }, `verification:${lite31}`],
  ["slow classifier leaves time for a healthy independent verifier", {
    [`classification:${lite31}`]: {},
    [`classification:${lite35}`]: { delay: 1000 },
    [`verification:${lite31}`]: {},
    [`verification:${flash38}`]: { delay: 4000 },
  }, `verification:${lite31}`],
  ["slow verifier leaves enough time for its healthy fallback", {
    [`classification:${lite31}`]: { delay: 2000 },
    [`verification:${lite35}`]: {},
    [`verification:${flash38}`]: { delay: 4000 },
  }, null],
]) {
  test(`production timeout schedule: ${name}`, async t => {
    const run = await replayNotificationProviderSchedule(t, schedule);
    assert.equal(run.error, undefined);
    assert.equal(run.result.action, "save_transaction");
    assert.equal(run.result.amount, 12.99);
    assert.equal(run.result.currency, "THB");
    assert.equal(run.result.verificationModel, flash38);
    if (forbidden) assert.ok(!run.attempts.includes(forbidden));
    assert.ok(Date.now() < 21_000);
    assert.equal(run.attempts.length, 3);
  });
}

test("unavailable independent verification never self-verifies and remains retryable", async () => {
  const error = await classificationFailure([
    failingProvider(429), failingProvider(503), ignoredProposal,
  ]);
  const failure = classifier.buildAndroidNotificationFailureResult(error);
  assert.equal(failure.diagnosticCode, "NOTIFICATION_VERIFICATION_UNAVAILABLE");
  assert.equal(failure.retryable, true);
  assert.equal(failure.diagnostics.length, 2);
  const response = await handlerFixture({ classificationError: error });
  assert.equal(response.status, 503);
  assert.equal(response.requests.length, 0);
  assert.equal(response.writes.at(-1).status, "failed");

  const models = [], responses = [ignoredProposal, approval];
  const recovered = await classifier.classifyAndroidNotification({
    ...classifierParams,
    genAI: { getGenerativeModel: ({ model }) => {
      models.push(model);
      return { generateContent: async () => modelResponse(responses.shift()) };
    } },
  });
  assert.equal(recovered.action, "ignore");
  assert.deepEqual(models, [lite31, lite35]);
});

test("late classifier response cannot exceed its allocation even before the overall deadline", async t => {
  fakeClassifierClock(t);
  const models = [], metrics = [];
  const result = await classifier.classifyAndroidNotification({
    ...classifierParams,
    onModelAttempt: metric => metrics.push(metric),
    genAI: { getGenerativeModel: ({ model }) => {
      models.push(model);
      return { generateContent: async () => {
        if (models.length === 1) t.mock.timers.setTime(Date.now() + 6100);
        return modelResponse(models.length < 3 ? ignoredProposal : approval);
      } };
    } },
  });
  assert.equal(result.action, "ignore");
  assert.deepEqual(models, [lite31, lite35, flash38]);
  assert.equal(metrics[0].outcome, "timeout");
  assert.equal(metrics[0].timeoutMs, 6000);
  assert.equal(result.verificationModel, flash38);
});

test("failure digest includes successful attempt budgets and pipeline without private notification text", async () => {
  const attempt = {
    phase: "classification", model: lite35, latencyMs: 1700, timeoutMs: 6000,
    outcome: "response", promptTokenCount: 100, candidatesTokenCount: 50,
    thoughtsTokenCount: 0, totalTokenCount: 150,
  };
  const response = await handlerFixture({
    classify: async params => {
      params.onModelAttempt(attempt);
      throw new classifier.AndroidNotificationClassificationError("NOTIFICATION_CLASSIFICATION_TIMEOUT", []);
    },
  });
  const context = response.reports[0].context;
  assert.equal(context.pipelineVersion, classifier.ANDROID_NOTIFICATION_CLASSIFIER_PIPELINE_VERSION);
  assert.equal(context.attemptNumber, 1);
  assert.equal(context.modelAttempts.length, 1);
  assert.equal(context.modelAttempts[0].latencyMs, 1700);
  assert.equal(context.modelAttempts[0].timeoutMs, 6000);
  assert.ok(context.elapsedMs >= 0);
  assert.ok(context.stageTimingsMs.classification >= 0);
  assert.equal(typeof context.requestId, "string");
  assert.equal(JSON.stringify(context).includes(proposal.merchant), false);
});

test("a failed verifier is also skipped if disagreement requires another classifier", async () => {
  const attempts = [];
  const outputs = {
    [`classification:${lite31}`]: ignoredProposal,
    [`verification:${lite35}`]: failingProvider(503),
    [`verification:${flash38}`]: { financialVerdict: "REJECT" },
    [`classification:${flash38}`]: ignoredProposal,
    [`verification:${lite31}`]: approval,
  };
  const result = await classifier.classifyAndroidNotification({
    ...classifierParams,
    genAI: { getGenerativeModel: ({ model, systemInstruction }) => ({
      generateContent: async () => {
        const phase = systemInstruction.includes("independent") ? "verification" : "classification";
        const key = `${phase}:${model}`;
        attempts.push(key);
        assert.ok(outputs[key], `unexpected retry of failed model ${key}`);
        if (outputs[key] instanceof Error) throw outputs[key];
        return modelResponse(outputs[key]);
      },
    }) },
  });
  assert.equal(result.action, "ignore");
  assert.deepEqual(attempts, Object.keys(outputs));
});
