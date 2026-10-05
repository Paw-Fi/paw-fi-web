import assert from "node:assert/strict";
import { test } from "node:test";
import { createVertexGenerativeAI } from "../shared/vertex-ai-chat.ts";
import {
  createInteractiveCompletion,
  runInteractiveTransactionAnalysis,
} from "../shared/interactive-transaction-analysis.ts";

function fixture(results) {
  const requests = [];
  const client = createVertexGenerativeAI({
    project: "test", location: "global", accessToken: "test",
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      requests.push(request);
      // Model the provider's rejection of the large nested extraction schema.
      if (request.generationConfig.responseSchema?.properties?.items) {
        return Response.json({ error: { message: "Request contains an invalid argument." } }, { status: 400 });
      }
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(results.shift()) }] } }] });
    },
  });
  return { requests, complete: createInteractiveCompletion({ text: "買い物" }, client) };
}

const context = {
  userId: "me", defaultSpaceId: "personal", defaultWalletId: null,
  currency: "JPY", date: "2026-10-05", language: "ja",
  expenseCategories: ["groceries"], incomeCategories: ["salary"],
  spaces: [{ id: "personal", name: "Personal", isPortfolio: false, members: [] }],
  wallets: [],
};
const item = { type: "expense", amount: 50, category: "groceries", explicitFields: [] };

test("extraction avoids complex constrained schema but retains independent verification", async () => {
  const { requests, complete } = fixture([{ decision: "ready", items: [item] }, { approved: true }]);
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "買い物５０円" }, request: { version: 1, answers: [] }, context, complete,
  });
  assert.equal(result.requireCorrection, false);
  assert.equal(result.items[0].amount, 50);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].generationConfig.responseMimeType, "application/json");
  assert.equal(requests[0].generationConfig.responseSchema, undefined);
  assert.match(requests[0].systemInstruction.parts[0].text, /explicitFields/);
  assert.equal(requests[1].generationConfig.responseSchema.properties.approved.type, "BOOLEAN");
});

test("uncertain extraction returns an MCQ and no saveable transactions", async () => {
  const { complete } = fixture([{ decision: "correction", question: "金額は？", choices: ["５０円", "５００円"] }]);
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "買い物" }, request: { version: 1, answers: [] }, context, complete,
  });
  assert.equal(result.requireCorrection, true);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.correction.choices, ["５０円", "５００円"]);
});

test("JSON-mode invalid amounts are still withheld and clarified", async () => {
  const { requests, complete } = fixture([
    { decision: "ready", items: [{ ...item, amount: -50 }] },
    { question: "金額は？", choices: ["５０円", "５００円"] },
  ]);
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "買い物" }, request: { version: 1, answers: [] }, context, complete,
  });
  assert.equal(result.requireCorrection, true);
  assert.deepEqual(result.items, []);
  assert.equal(requests[1].generationConfig.responseSchema.required.includes("question"), true);
});

test("a verifier disagreement withholds every extracted item", async () => {
  const { complete } = fixture([
    { decision: "ready", items: [item] },
    { approved: false, question: "金額は？", choices: ["５０円", "５００円"] },
  ]);
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "買い物" }, request: { version: 1, answers: [] }, context, complete,
  });
  assert.equal(result.requireCorrection, true);
  assert.deepEqual(result.items, []);
});
