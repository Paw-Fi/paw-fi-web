import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPocketReviewResponseSchema,
  preparePocketReviewResponse,
  POCKET_REVIEW_INSIGHT_TYPES,
  POCKET_REVIEW_ATTEMPT_TIMEOUT_MS,
  sendPocketReviewMessage,
} from "../supabase/functions/generate-pocket-month-review/review-generation.ts";
import { validatePocketProposals } from "../supabase/functions/generate-pocket-month-review/review-proposals.ts";
import {
  isRetryableGeminiError,
  sendGeminiMessageWithRetry,
} from "../supabase/functions/shared/gemini-retry.ts";
import { createVertexGenerativeAI } from "../supabase/functions/shared/vertex-ai-chat.ts";

test("the actual Vertex transport cancels a stalled provider request within its attempt budget", async () => {
  let requestSignal;
  const client = createVertexGenerativeAI({
    project: "test-project",
    location: "global",
    accessToken: "test-token",
    deadlineAt: Date.now() + 1000,
    requestTimeoutMs: 10,
    fetchImpl: async (_, options) => {
      requestSignal = options.signal;
      return await new Promise((_, reject) =>
        requestSignal.addEventListener(
          "abort",
          () => reject(requestSignal.reason),
          { once: true },
        ),
      );
    },
  });
  await assert.rejects(
    client.getGenerativeModel({ model: "test-model" }).generateContent({
      contents: [{ role: "user", parts: [{ text: "context" }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    (error) => isRetryableGeminiError(error),
  );
  assert.ok(requestSignal.aborted);
});

test("cash-flow machine statuses are server-owned even when AI omits or translates them", () => {
  const cashFlow = {
    income_coverage_status: "unknown",
    month_funding_status: "unknown",
  };
  for (const modelStatuses of [
    {},
    { income_coverage_status: "充裕", month_funding_status: "已覆盖" },
    { income_coverage_status: "covered", month_funding_status: "funded" },
  ]) {
    const original = {
      ...modelStatuses,
      insights: [],
      suggestions: [{ amount: 1000 }],
    };
    const prepared = preparePocketReviewResponse(original, cashFlow);
    assert.equal(prepared.income_coverage_status, "unknown");
    assert.equal(prepared.month_funding_status, "unknown");
    assert.equal(prepared.suggestions, original.suggestions);
    assert.notEqual(prepared, original);
  }
  const schema = buildPocketReviewResponseSchema(true);
  assert.ok(!schema.required.includes("income_coverage_status"));
  assert.ok(!schema.required.includes("month_funding_status"));
});

test("invalid optional coaching types cannot reject an otherwise valid financial plan", () => {
  const paths = [];
  const financialPlan = [
    { envelope_id: "draft-1", suggested_amount_cents: 1000 },
  ];
  const prepared = preparePocketReviewResponse(
    {
      insights: [
        { type: "预算建议", title: "Private text", summary: "Private detail" },
        {
          type: "cash_flow",
          title: "Recorded income",
          summary: "Known evidence",
        },
        { type: "budget", title: "Other text", summary: "Other detail" },
      ],
      suggestions: financialPlan,
    },
    { income_coverage_status: "unknown", month_funding_status: "unknown" },
    (rejected) => paths.push(...rejected),
  );
  assert.deepEqual(
    prepared.insights.map((item) => item.type),
    ["cash_flow"],
  );
  assert.equal(prepared.suggestions, financialPlan);
  assert.deepEqual(paths, ["insights.0.type", "insights.2.type"]);
  assert.ok(!JSON.stringify(paths).includes("Private"));
  assert.deepEqual(
    buildPocketReviewResponseSchema(true).properties.insights.items.properties
      .type.enum,
    [...POCKET_REVIEW_INSIGHT_TYPES],
  );
});

test("malformed response structure is not converted into a valid empty report", () => {
  const cashFlow = {
    income_coverage_status: "unknown",
    month_funding_status: "unknown",
  };
  assert.equal(preparePocketReviewResponse(null, cashFlow), null);
  assert.equal(preparePocketReviewResponse("invalid", cashFlow), "invalid");
  assert.equal(
    preparePocketReviewResponse({ insights: "invalid" }, cashFlow).insights,
    "invalid",
  );
});

test("DOM timeout code 23 is not treated as a non-retryable HTTP status", async () => {
  const timeout = new DOMException("Signal timed out.", "TimeoutError");
  assert.equal(timeout.code, 23);
  assert.equal(isRetryableGeminiError(timeout), true);
  let attempts = 0;
  const result = await sendGeminiMessageWithRetry(
    {
      sendMessage: async () => {
        if (++attempts === 1) throw timeout;
        return "recovered";
      },
    },
    "context",
    {
      preRequestDelayMs: 0,
      initialRetryDelayMs: 0,
      jitterRatio: 0,
      maxRetries: 1,
    },
  );
  assert.equal(result, "recovered");
  assert.equal(attempts, 2);
  assert.equal(isRetryableGeminiError({ status: 401 }), false);
});

test("provider attempts and schema fallback share the remaining generation deadline", async () => {
  let clock = 1000;
  const timeouts = [];
  const result = await sendPocketReviewMessage({
    prompt: "context",
    firstPlan: true,
    maxOutputTokens: 3000,
    deadlineAt: 21000,
    now: () => clock,
    send: async (_, __, timeoutMs) => {
      timeouts.push(timeoutMs);
      if (timeouts.length === 1) {
        clock = 20000;
        throw invalidArgument();
      }
      return "response";
    },
  });
  assert.equal(result, "response");
  assert.deepEqual(timeouts, [POCKET_REVIEW_ATTEMPT_TIMEOUT_MS, 1000]);
  let dispatched = false;
  await assert.rejects(
    sendPocketReviewMessage({
      prompt: "context",
      firstPlan: true,
      maxOutputTokens: 3000,
      deadlineAt: 1000,
      now: () => 1000,
      send: async () => {
        dispatched = true;
        return "unexpected";
      },
    }),
    (error) => error.name === "TimeoutError",
  );
  assert.equal(dispatched, false);
});

const invalidArgument = () =>
  Object.assign(new Error("Request contains an invalid argument."), {
    status: 400,
    response: { data: { error: { status: "INVALID_ARGUMENT" } } },
  });

test("provider schema is compact and independent of user category catalogs", () => {
  for (const firstPlan of [false, true]) {
    const schema = buildPocketReviewResponseSchema(firstPlan);
    const item = schema.properties.suggestions.items;
    assert.equal(item.properties.envelope_id.enum, undefined);
    assert.equal(item.properties.categories.items.enum, undefined);
    assert.equal(schema.properties.suggestions.minItems, undefined);
    assert.equal(schema.properties.suggestions.maxItems, undefined);
    assert.equal(item.required.includes("pocket_name"), firstPlan);
    assert.equal(item.required.includes("categories"), firstPlan);
    assert.ok(JSON.stringify(schema).length < 2500);
  }
});

test("normal generation sends one structured request and keeps the catalog in context only", async () => {
  const catalog = Array.from(
    { length: 1000 },
    (_, index) => `existing-category-${index}`,
  );
  const prompt = `AUTHORITATIVE_CONTEXT:\n${JSON.stringify({ catalog })}`;
  const requests = [];
  const result = await sendPocketReviewMessage({
    prompt,
    firstPlan: true,
    maxOutputTokens: 3000,
    send: async (content, config) => {
      requests.push({ content, config });
      return "response";
    },
    onSchemaRejected: () => assert.fail("No fallback for a successful request"),
  });
  assert.equal(result, "response");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].content, prompt);
  assert.equal(requests[0].config.responseMimeType, "application/json");
  assert.ok(requests[0].config.responseSchema);
  assert.ok(
    !JSON.stringify(requests[0].config.responseSchema).includes(catalog[0]),
  );
});

test("Vertex INVALID_ARGUMENT retries once in JSON mode without the rejected schema", async () => {
  const requests = [];
  let rejections = 0;
  const result = await sendPocketReviewMessage({
    prompt: "AUTHORITATIVE_CONTEXT:\n{}",
    firstPlan: true,
    maxOutputTokens: 3000,
    send: async (content, config) => {
      requests.push({ content, config });
      if (requests.length === 1) throw invalidArgument();
      return "response";
    },
    onSchemaRejected: () => rejections++,
  });
  assert.equal(result, "response");
  assert.equal(requests.length, 2);
  assert.equal(rejections, 1);
  assert.ok(requests[0].config.responseSchema);
  assert.equal(requests[1].config.responseSchema, undefined);
  assert.equal(requests[1].config.responseMimeType, "application/json");
  assert.equal(requests[1].config.maxOutputTokens, 3000);
  assert.ok(requests[1].content.includes("RESPONSE_FORMAT:"));
  assert.ok(requests[1].content.includes('"suggested_amount_cents"'));
  assert.equal(
    JSON.parse(requests[1].content.split("AUTHORITATIVE_CONTEXT:\n")[1])
      .constructor,
    Object,
  );
});

test("a second INVALID_ARGUMENT fails explicitly without an unbounded retry loop", async () => {
  let calls = 0;
  await assert.rejects(
    sendPocketReviewMessage({
      prompt: "context",
      firstPlan: true,
      maxOutputTokens: 3000,
      send: async () => {
        calls++;
        throw invalidArgument();
      },
    }),
    /invalid argument/,
  );
  assert.equal(calls, 2);
});

test("authentication, quota, transport and unrelated bad-request failures never trigger schema fallback", async () => {
  for (const [status, providerStatus] of [
    [401, "UNAUTHENTICATED"],
    [403, "PERMISSION_DENIED"],
    [429, "RESOURCE_EXHAUSTED"],
    [503, "UNAVAILABLE"],
    [400, "FAILED_PRECONDITION"],
  ]) {
    let calls = 0;
    const error = Object.assign(new Error("provider failure"), {
      status,
      response: { data: { error: { status: providerStatus } } },
    });
    await assert.rejects(
      sendPocketReviewMessage({
        prompt: "context",
        firstPlan: false,
        maxOutputTokens: 3000,
        send: async () => {
          calls++;
          throw error;
        },
        onSchemaRejected: () => assert.fail("Must not downgrade this failure"),
      }),
      (actual) => actual === error,
    );
    assert.equal(calls, 1);
  }
});

test("JSON fallback does not authorize categories outside the existing catalog", async () => {
  let calls = 0;
  const response = await sendPocketReviewMessage({
    prompt: "context",
    firstPlan: true,
    maxOutputTokens: 3000,
    send: async () => {
      if (++calls === 1) throw invalidArgument();
      return JSON.stringify([
        {
          envelope_id: "draft-1",
          pocket_name: "Food",
          categories: ["invented"],
          suggested_amount_cents: 1000,
        },
      ]);
    },
  });
  assert.equal(
    validatePocketProposals(
      JSON.parse(response),
      [],
      ["groceries"],
      1000,
      1000,
    ),
    null,
  );
});
