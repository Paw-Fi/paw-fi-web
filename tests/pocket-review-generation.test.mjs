import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPocketReviewResponseSchema,
  sendPocketReviewMessage,
} from "../supabase/functions/generate-pocket-month-review/review-generation.ts";
import { validatePocketProposals } from "../supabase/functions/generate-pocket-month-review/review-proposals.ts";

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
