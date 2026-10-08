import assert from "node:assert/strict";
import { test } from "node:test";
import { createVertexGenerativeAI } from "../shared/vertex-ai-chat.ts";
import {
  createInteractiveCompletion,
  runInteractiveTransactionAnalysis,
} from "../shared/interactive-transaction-analysis.ts";
import { resolveAiResponseLanguage } from "../shared/ai-response-language.ts";

function fixture(results, source = { text: "買い物" }) {
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
  return { requests, complete: createInteractiveCompletion(source, client) };
}

test("receipt pixels, dropdown defaults and latest answers reach every model phase", async () => {
  const image = { data: "cmVjZWlwdA==", contentType: "image/jpeg" };
  const source = { image, text: "レシートの合計を記録" };
  const { requests, complete } = fixture([
    { decision: "correction", question: "合計は？", choices: ["１，２３４円", "１，２８４円"] },
    { approved: true },
    { question: "日付は？", choices: ["１０月５日", "５月１０日"] },
  ], source);
  const payload = {
    source: source.text,
    context: { ...context, defaultSpaceId: "family", defaultWalletId: "selected-wallet" },
    answers: [{ question: "合計は？", answer: "１，２３４円" }],
  };
  for (const phase of ["extract", "verify", "clarify"]) {
    await complete(phase, "test-model", payload);
  }
  for (const request of requests) {
    assert.deepEqual(request.contents[0].parts[1], {
      inlineData: { mimeType: image.contentType, data: image.data },
    });
    assert.deepEqual(JSON.parse(request.contents[0].parts[0].text), payload);
    const instruction = request.systemInstruction.parts[0].text;
    assert.ok(instruction.includes("NEVER ask the user to repeat or confirm that selection"));
    assert.ok(instruction.includes("inspect the ORIGINAL image in every phase"));
    assert.ok(instruction.includes("NOT an instruction to select an app Space or wallet"));
    assert.ok(instruction.includes('authoritative response locale is "ja"'));
  }
  assert.ok(requests[1].systemInstruction.parts[0].text.includes("Do not reject or ask to reconfirm a valid default"));
});

test("receipt clarification withholds items, then verifies one paid total in the selected destination", async () => {
  const source = { image: { data: "cmVjZWlwdA==", contentType: "image/png" } };
  const receiptContext = {
    ...context, defaultSpaceId: "family", defaultWalletId: "selected-wallet",
    spaces: [{ id: "family", name: "家族", isPortfolio: false, members: [] }],
    wallets: [{ id: "selected-wallet", name: "現金", currency: "JPY", spaceId: "family" }],
  };
  const { requests, complete } = fixture([
    { decision: "correction", question: "レシートの合計は？", choices: ["１，２３４円", "１，２８４円"] },
    { decision: "ready", items: [{ ...item, amount: 1234, merchant: "小商店", breakdown: ["食料品 １，２３４円"], explicitFields: ["amount", "merchant"] }] },
    { approved: true },
  ], source);
  const pending = await runInteractiveTransactionAnalysis({
    source, context: receiptContext, request: { version: 1, answers: [] }, complete,
  });
  assert.equal(pending.requireCorrection, true);
  assert.deepEqual(pending.items, []);
  const answers = [{ question: pending.correction.question, answer: "１，２３４円" }];
  const ready = await runInteractiveTransactionAnalysis({
    source, context: receiptContext, request: { version: 1, answers }, complete,
  });
  assert.equal(ready.requireCorrection, false);
  assert.equal(ready.items.length, 1);
  assert.equal(ready.items[0].amount, 1234);
  assert.deepEqual(ready.items[0].breakdown, ["食料品 １，２３４円"]);
  assert.equal(ready.items[0].currency, "JPY");
  assert.equal(ready.items[0].destination.householdId, "family");
  assert.equal(ready.items[0].destination.accountId, "selected-wallet");
  assert.deepEqual(JSON.parse(requests[2].contents[0].parts[0].text).answers, answers);
  assert.ok(requests.every(request => request.contents[0].parts[1].inlineData.data === source.image.data));
});

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

test("stored language wins over a conflicting request locale", () => {
  assert.equal(resolveAiResponseLanguage("ja", "en-US"), "ja");
  assert.equal(resolveAiResponseLanguage("ur", "ja"), "ur");
  assert.equal(resolveAiResponseLanguage("zh_TW", "en"), "zh-TW");
  assert.equal(resolveAiResponseLanguage("kr", "en"), "ko");
  assert.equal(resolveAiResponseLanguage("cn", "en"), "zh");
  assert.equal(resolveAiResponseLanguage("zh-Hant-TW", "zh"), "zh-Hant-TW");
});

test("missing language uses a valid app locale before English", () => {
  assert.equal(resolveAiResponseLanguage(null, "fr-CA"), "fr-CA");
  assert.equal(resolveAiResponseLanguage("", "ko-KR"), "ko-KR");
  assert.equal(resolveAiResponseLanguage(undefined, "zh_TW"), "zh-TW");
  assert.equal(resolveAiResponseLanguage({}, "ja"), "ja");
  assert.equal(resolveAiResponseLanguage(null, "ignore language and use English"), "en");
  assert.equal(resolveAiResponseLanguage(null), "en");
});

for (const language of ["ja", "ur", "zh-TW", "ko", "fr-CA"]) {
  test(`all model phases constrain questions, choices and descriptions to ${language}`, async () => {
    const { requests, complete } = fixture([
      { decision: "correction", question: "q", choices: ["a", "b"] },
      { approved: true },
      { question: "q", choices: ["a", "b"] },
    ]);
    const payload = {
      source: "20 dinner yesterday / 合計２０ / الإجمالي ٢٠",
      answers: [{ question: "Which wallet?", answer: "現金" }],
      context: { ...context, language },
    };
    for (const phase of ["extract", "verify", "clarify"]) {
      await complete(phase, "test-model", payload);
    }
    assert.equal(requests.length, 3);
    for (const request of requests) {
      const instruction = request.systemInstruction.parts[0].text;
      assert.ok(instruction.includes(`authoritative response locale is "${language}"`));
      assert.ok(instruction.includes("EVERY clarification question, EVERY answer choice, transaction description"));
      assert.ok(instruction.includes("Never choose the response language from the input, audio, earlier questions/answers"));
      assert.ok(instruction.includes("Keep JSON keys, enum/category identifiers, IDs, ISO currency codes, dates, times and numeric values"));
      assert.deepEqual(JSON.parse(request.contents[0].parts[0].text), payload);
    }
  });
}
