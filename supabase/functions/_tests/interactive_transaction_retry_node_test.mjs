import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { createVertexGenerativeAI } from "../shared/vertex-ai-chat.ts";
import {
  alternateInteractiveModel,
  createInteractiveCompletion,
  InteractiveModelResponseError,
  runInteractiveTransactionAnalysis,
} from "../shared/interactive-transaction-analysis.ts";
import { GEMINI_MODEL_FALLBACKS } from "../shared/gemini-models.ts";

const now = Date.UTC(2026, 10, 5, 0, 0, 0);
const payload = {
  context: { language: "ja" },
  answers: [{ question: "private question", answer: "private answer" }],
};
const busy = (retryAfter, status = 429) =>
  Response.json(
    { error: { message: "private provider error" } },
    {
      status,
      headers: retryAfter === undefined ? {} : { "Retry-After": retryAfter },
    },
  );
const success = () =>
  Response.json({
    candidates: [{ content: { parts: [{ text: '{"approved":true}' }] } }],
  });

function fixture(t, respond, options = {}, random = 0.5) {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now });
  t.mock.method(Math, "random", () => random);
  const requests = [];
  const diagnostics = [];
  const client = createVertexGenerativeAI({
    project: "test",
    location: "global",
    accessToken: "test",
    requestTimeoutMs: 45000,
    deadlineAt: options.deadlineAt ?? now + 140000,
    fetchImpl: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return respond(requests.length, init.signal);
    },
  });
  const complete = createInteractiveCompletion(
    {
      text: "private source",
      audio: { data: "YXVkaW8=", contentType: "audio/mpeg" },
    },
    client,
    {
      deadlineAt: now + 140000,
      ...options,
      onAttempt: (value) => diagnostics.push(value),
    },
  );
  return {
    requests,
    diagnostics,
    complete,
    run: (options) => complete("verify", "test-model", payload, options),
  };
}

const candidate = (body, extra = {}) =>
  Response.json({
    candidates: [{ content: { parts: [{ text: body }] }, ...extra }],
    usageMetadata: { promptTokenCount: 4310, candidatesTokenCount: 2072 },
  });
const modelOf = (url) => /models\/([^:]+):/.exec(url)[1];

for (const [random, expectedDelay] of [
  [0, 1000],
  [0.5, 1500],
  [0.999, 1999],
]) {
  test(`429 recovery waits for jittered backoff (${expectedDelay} ms) and reuses the exact request`, async (t) => {
    const { requests, diagnostics, run } = fixture(
      t,
      (attempt) => (attempt === 1 ? busy() : success()),
      {},
      random,
    );
    const result = run();
    await setImmediate();
    assert.equal(requests.length, 1);
    t.mock.timers.tick(expectedDelay - 1);
    await setImmediate();
    assert.equal(requests.length, 1);
    t.mock.timers.tick(1);
    assert.deepEqual(await result, { approved: true });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1], requests[0]);
    assert.equal(
      diagnostics.find((entry) => entry.outcome === "retry_scheduled")
        .retryDelayMs,
      expectedDelay,
    );
    assert.equal(JSON.stringify(diagnostics).includes("private"), false);
    assert.equal(JSON.stringify(diagnostics).includes("YXVkaW8="), false);
  });
}

test("Retry-After takes precedence over the local backoff", async (t) => {
  const { requests, run } = fixture(t, (attempt) =>
    attempt === 1 ? busy("3") : success(),
  );
  const result = run();
  await setImmediate();
  t.mock.timers.tick(2999);
  await setImmediate();
  assert.equal(requests.length, 1);
  t.mock.timers.tick(1);
  assert.deepEqual(await result, { approved: true });
  assert.equal(requests.length, 2);
});

for (const status of [429, 503]) {
  test(`repeated HTTP ${status} stops after two attempts`, async (t) => {
    const { requests, run } = fixture(t, () => busy(undefined, status));
    const rejected = assert.rejects(run(), (error) => error.status === status);
    await setImmediate();
    t.mock.timers.tick(1500);
    await rejected;
    t.mock.timers.tick(140000);
    await setImmediate();
    assert.equal(requests.length, 2);
  });
}

for (const [name, retryAfter, deadlineAt] of [
  ["provider wait exceeds the interactive backoff cap", "11", now + 140000],
  ["provider wait leaves too little time for another attempt", "3", now + 3500],
  [
    "local backoff leaves too little time for another attempt",
    undefined,
    now + 2400,
  ],
]) {
  test(name, async (t) => {
    const { requests, diagnostics, run } = fixture(t, () => busy(retryAfter), {
      deadlineAt,
    });
    await assert.rejects(run(), (error) => error.status === 429);
    assert.equal(requests.length, 1);
    assert.equal(
      diagnostics.some((entry) => entry.outcome === "retry_scheduled"),
      false,
    );
    t.mock.timers.tick(140000);
    await setImmediate();
    assert.equal(requests.length, 1);
  });
}

test("cancellation interrupts the provider-directed wait without another request", async (t) => {
  const controller = new AbortController();
  const { requests, run } = fixture(t, () => busy("5"), {
    signal: controller.signal,
  });
  const reason = new DOMException("cancelled", "AbortError");
  const rejected = assert.rejects(run(), (error) => error === reason);
  await setImmediate();
  controller.abort(reason);
  await rejected;
  t.mock.timers.tick(140000);
  assert.equal(requests.length, 1);
});

test("a deadline reached while the event loop is delayed prevents retry dispatch", async (t) => {
  const { requests, run } = fixture(t, () => busy(), {
    deadlineAt: now + 4000,
  });
  const rejected = assert.rejects(run(), /Analysis timed out/);
  await setImmediate();
  t.mock.timers.tick(5000);
  await rejected;
  assert.equal(requests.length, 1);
});

test("a 45-second timeout followed by 429 remains a bounded failure with explicit timeout diagnostics", async (t) => {
  let providerSignal;
  const { requests, diagnostics, run } = fixture(t, (attempt, signal) => {
    if (attempt > 1) return busy();
    providerSignal = signal;
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    );
  });
  const rejected = assert.rejects(run(), (error) => error.status === 429);
  await setImmediate();
  t.mock.timers.tick(45000);
  await setImmediate();
  assert.equal(providerSignal.aborted, true);
  assert.equal(requests.length, 1);
  assert.equal(diagnostics[0].errorType, "timeout");
  assert.equal(diagnostics[0].elapsedMs, 45000);
  t.mock.timers.tick(1500);
  await rejected;
  assert.equal(requests.length, 2);
  assert.equal(diagnostics.at(-1).status, 429);
});

for (const [header, expected] of [
  ["0", 0],
  ["2", 2000],
  ["1.25", 1250],
  [new Date(now + 5000).toUTCString(), 5000],
  [new Date(now - 5000).toUTCString(), 0],
  [undefined, undefined],
  ["", undefined],
  ["-1", undefined],
  ["Infinity", undefined],
  ["nonsense", undefined],
]) {
  test(`Vertex preserves only a valid Retry-After delay: ${header}`, async (t) => {
    t.mock.method(Date, "now", () => now);
    const client = createVertexGenerativeAI({
      project: "test",
      location: "global",
      accessToken: "test",
      fetchImpl: async () => busy(header),
    });
    await assert.rejects(
      client.getGenerativeModel({ model: "test" }).generateContent({}),
      (error) => {
        assert.equal(error.status, 429);
        assert.equal(error.statusCode, 429);
        assert.equal(error.response.status, 429);
        assert.equal(error.retryAfterMs, expected);
        return true;
      },
    );
  });
}

test("malformed JSON is retried once on the fallback model with the identical request body", async (t) => {
  const { requests, diagnostics, run } = fixture(t, (attempt) =>
    attempt === 1 ? candidate('{"approved": private "garbage"') : success(),
  );
  assert.deepEqual(await run({ fallbackModel: "fallback-model" }), {
    approved: true,
  });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(({ url }) => modelOf(url)), [
    "test-model",
    "fallback-model",
  ]);
  assert.deepEqual(requests[1].body, requests[0].body);
  assert.deepEqual(
    diagnostics.map(({ model, attempt, outcome }) => ({ model, attempt, outcome })),
    [
      { model: "test-model", attempt: 1, outcome: "invalid_json" },
      { model: "fallback-model", attempt: 2, outcome: "success" },
    ],
  );
  assert.equal(JSON.stringify(diagnostics).includes("private"), false);
  assert.equal(JSON.stringify(diagnostics).includes("garbage"), false);
});

test("without a fallback model the malformed JSON retry reuses the same model", async (t) => {
  const { requests, run } = fixture(t, (attempt) =>
    attempt === 1 ? candidate("{") : success(),
  );
  assert.deepEqual(await run(), { approved: true });
  assert.deepEqual(requests.map(({ url }) => modelOf(url)), [
    "test-model",
    "test-model",
  ]);
});

test("malformed JSON on both models remains a structured failure, never approval", async (t) => {
  const { requests, diagnostics, run } = fixture(t, () =>
    candidate('{"approved": true, "question": "private', { finishReason: "STOP" }),
  );
  await assert.rejects(
    run({ fallbackModel: "fallback-model" }),
    InteractiveModelResponseError,
  );
  assert.deepEqual(requests.map(({ url }) => modelOf(url)), [
    "test-model",
    "fallback-model",
  ]);
  assert.deepEqual(
    diagnostics.map(({ outcome }) => outcome),
    ["invalid_json", "invalid_json"],
  );
  assert.equal(JSON.stringify(diagnostics).includes("private"), false);
});

for (const { name, response, expected } of [
    {
      name: "unterminated object",
      response: () => candidate('{"approved": true, "question": "private answer', { finishReason: "STOP" }),
      expected: {
        responseTextShape: "object_unterminated",
        jsonErrorKind: "unexpected_end",
        finishReason: "STOP",
        candidateCount: 1,
        partCount: 1,
        thoughtPartCount: 0,
        responseTextLength: 46,
      },
    },
    {
      name: "trailing content after a complete object",
      response: () => candidate('{"approved":true}{"private":1}', { finishReason: "STOP" }),
      expected: {
        responseTextShape: "object",
        jsonErrorKind: "trailing_content",
        jsonErrorPosition: 17,
        responseTextLength: 30,
      },
    },
    {
      name: "markdown fence",
      response: () => candidate('```json\n{"approved":true}\n```'),
      expected: { responseTextShape: "fenced", jsonErrorKind: "unexpected_token" },
    },
    {
      name: "blocked candidate without visible text",
      response: () =>
        Response.json({
          candidates: [{ finishReason: "SAFETY", content: { role: "model" } }],
          usageMetadata: { promptTokenCount: 4310, candidatesTokenCount: 2072 },
        }),
      expected: {
        responseTextShape: "empty",
        responseTextLength: 0,
        jsonErrorKind: "unexpected_end",
        finishReason: "SAFETY",
        candidateCount: 1,
        promptTokenCount: 4310,
        candidatesTokenCount: 2072,
      },
    },
    {
      name: "blocked prompt without candidates",
      response: () =>
        Response.json({ promptFeedback: { blockReason: "PROHIBITED_CONTENT" } }),
      expected: {
        responseTextShape: "empty",
        promptBlockReason: "PROHIBITED_CONTENT",
      },
    },
    {
      name: "thought-only parts and an unlisted finish reason",
      response: () =>
        Response.json({
          candidates: [{
            finishReason: "private reason",
            content: { parts: [{ thought: true, text: "private thinking" }] },
          }],
          promptFeedback: { blockReason: "private reason" },
        }),
      expected: {
        responseTextShape: "empty",
        finishReason: "unknown",
        promptBlockReason: "unknown",
        partCount: 1,
        thoughtPartCount: 1,
      },
    },
]) {
  test(`invalid_json diagnostics distinguish ${name} without exposing content`, async (t) => {
    const { diagnostics, run } = fixture(t, (attempt) =>
      attempt === 1 ? response() : success(),
    );
    await run();
    const [entry] = diagnostics;
    assert.equal(entry.outcome, "invalid_json");
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(entry[key], value, key);
    }
    assert.equal(JSON.stringify(diagnostics).includes("private"), false);
  });
}

test("the alternate model is never the extraction model and never the failing model", () => {
  for (const model of GEMINI_MODEL_FALLBACKS) {
    const alternate = alternateInteractiveModel(model);
    assert.notEqual(alternate, model);
    assert.notEqual(alternate, GEMINI_MODEL_FALLBACKS[0]);
    assert.ok(GEMINI_MODEL_FALLBACKS.includes(alternate));
  }
});

test("the analysis flow routes a malformed verifier response to the alternate model", async (t) => {
  const context = {
    userId: "me", defaultSpaceId: "personal", defaultWalletId: null, currency: "JPY",
    date: "2026-11-17", language: "ja", expenseCategories: ["groceries"],
    incomeCategories: ["salary"],
    spaces: [{ id: "personal", name: "Personal", isPortfolio: false, members: [] }],
    wallets: [],
  };
  const item = { type: "expense", amount: 500, category: "groceries", explicitFields: ["amount"] };
  const { requests, complete } = fixture(t, (attempt) =>
    attempt === 1
      ? candidate(JSON.stringify({ decision: "ready", items: [item] }))
      : attempt === 2
      ? candidate('{"approved": private')
      : success(),
  );
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "買い物５００円" }, request: { version: 1, answers: [] }, context, complete,
  });
  assert.equal(result.requireCorrection, false);
  assert.equal(result.items.length, 1);
  assert.deepEqual(requests.map(({ url }) => modelOf(url)), [
    GEMINI_MODEL_FALLBACKS[0],
    GEMINI_MODEL_FALLBACKS[1],
    GEMINI_MODEL_FALLBACKS[2],
  ]);
  assert.deepEqual(requests[2].body, requests[1].body);
});
