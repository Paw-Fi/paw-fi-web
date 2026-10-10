import assert from "node:assert/strict";
import { test } from "node:test";
import { createVertexGenerativeAI } from "../shared/vertex-ai-chat.ts";
import {
  createInteractiveCompletion,
  InteractiveClarificationError,
  InteractiveModelResponseError,
  interactiveAnalysisFailure,
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
      const result = results.shift();
      return Response.json({ candidates: [{ content: { parts: [{ text: typeof result === "string" ? result : JSON.stringify(result) }] } }] });
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

for (const [name, initial, request, details] of [
  ["extraction correction", [{ decision: "correction", question: "金額は？" }], { version: 1, answers: [] }, {}],
  ["verifier rejection", [{ decision: "ready", items: [item] }, { approved: false }], { version: 1, answers: [] }, { items: true }],
  ["validation clarification", [{ decision: "ready", items: [{ ...item, amount: -50 }] }, { question: "金額は？", choices: ["５０円", "５０円"] }], { version: 1, answers: [] }, { issues: true }],
  ["clock clarification", [{ question: "時刻は？", choices: [] }], { version: 1, answers: [], clientIssue: { itemIndex: 0, field: "transactionTime", reason: "ambiguous_wall_time" } }, { issues: true }],
]) {
  test(`malformed ${name} is regenerated once without releasing transactions`, async () => {
    const source = { text: "買い物５０円", image: { data: "cmVjZWlwdA==", contentType: "image/png" } };
    const answers = [{ question: "日付は？", answer: "１０月５日" }];
    const repaired = { question: "記録する金額は？", choices: ["５０円を記録", "５００円を記録"] };
    const { requests, complete } = fixture([...initial, repaired], source);
    const result = await runInteractiveTransactionAnalysis({
      source, request: { ...request, answers }, context, complete,
    });
    assert.equal(result.requireCorrection, true);
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.correction, { ...repaired, allowCustomResponse: true });
    assert.equal(requests.length, initial.length + 1);
    const recovery = requests.at(-1);
    const recoveryPayload = JSON.parse(recovery.contents[0].parts[0].text);
    assert.deepEqual(recoveryPayload.answers, answers);
    assert.deepEqual(recoveryPayload.context, context);
    assert.equal(recoveryPayload.source, source.text);
    assert.deepEqual(recoveryPayload.invalidClarification, initial.at(-1));
    if (details.items) assert.equal(recoveryPayload.items.length, 1);
    if (details.issues) assert.ok(recoveryPayload.issues.length > 0);
    assert.equal(recovery.contents[0].parts[1].inlineData.data, source.image.data);
    assert.deepEqual(recovery.generationConfig.responseSchema.required, ["question", "choices"]);
  });
}

for (const malformed of [
  {},
  { question: "", choices: ["５０円", "５００円"] },
  { question: "金額は？", choices: ["５０円"] },
  { question: "金額は？", choices: ["５０円", "５０円"] },
  { question: "金額は？", choices: ["５０円", 500] },
]) {
  test(`invalid regenerated clarification fails closed: ${JSON.stringify(malformed)}`, async () => {
    const { requests, complete } = fixture([{ decision: "correction" }, malformed]);
    await assert.rejects(runInteractiveTransactionAnalysis({
      source: { text: "買い物" }, request: { version: 1, answers: [] }, context, complete,
    }), InteractiveClarificationError);
    assert.equal(requests.length, 2);
  });
}

test("clarification recovery propagates provider failure without retrying indefinitely", async () => {
  const phases = [];
  await assert.rejects(runInteractiveTransactionAnalysis({
    source: { text: "خریداری ١٬٢٣٤٫٥٠" },
    request: { version: 1, answers: [] }, context: { ...context, language: "ur" },
    complete: async (phase) => {
      phases.push(phase);
      if (phase === "extract") return { decision: "correction" };
      throw new Error("provider unavailable");
    },
  }), /provider unavailable/);
  assert.deepEqual(phases, ["extract", "clarify"]);
});

test("interactive errors expose safe actionable codes rather than internal exceptions", () => {
  assert.deepEqual(interactiveAnalysisFailure(new InteractiveClarificationError()), {
    success: false, code: "AI_CLARIFICATION_FAILED", status: 503,
    error: "We couldn't check the transaction details. Please try again.",
  });
  assert.deepEqual(interactiveAnalysisFailure(new Error("Analysis timed out")), {
    success: false, code: "AI_ANALYSIS_TIMEOUT", status: 504,
    error: "Analysis took too long. Please try again.",
  });
  const failure = interactiveAnalysisFailure(new Error("Vertex secret token: sensitive"));
  assert.equal(failure.code, "AI_TEMPORARILY_UNAVAILABLE");
  assert.equal(failure.status, 503);
  assert.equal(failure.error, "AI analysis is temporarily unavailable. Please try again later.");
  assert.ok(!JSON.stringify(failure).includes("sensitive"));
  assert.deepEqual(interactiveAnalysisFailure(new InteractiveModelResponseError()), {
    success: false, code: "AI_INVALID_RESPONSE", status: 503,
    error: "We couldn't finish analyzing this input. Please try again.",
  });
});

for (const [phase, initial, repaired] of [
  ["extract", [], { decision: "correction", question: "金額は？", choices: ["５０円", "５００円"] }],
  ["verify", [{ decision: "ready", items: [item] }], { approved: true }],
  ["clarify", [{ decision: "ready", items: [{ ...item, amount: -50 }] }], { question: "金額は？", choices: ["５０円", "５００円"] }],
]) {
  test(`truncated ${phase} JSON retries only the same phase once`, async () => {
    const source = { text: "買い物５０円", audio: { data: "YXVkaW8=", contentType: "audio/mpeg" } };
    const { requests, complete } = fixture([...initial, '{"question":"unterminated', repaired], source);
    const result = await runInteractiveTransactionAnalysis({ source, request: { version: 1, answers: [] }, context, complete });
    assert.equal(result.requireCorrection, phase !== "verify");
    assert.equal(requests.length, initial.length + 2);
    assert.deepEqual(requests.at(-1), requests.at(-2));
    assert.equal(requests.at(-1).contents[0].parts[1].inlineData.data, source.audio.data);
  });
}

test("repeated malformed verifier JSON remains a structured failure, never approval", async () => {
  const { requests, complete } = fixture([
    { decision: "ready", items: [item] }, '{"approved":', '{"approved":',
  ]);
  await assert.rejects(runInteractiveTransactionAnalysis({
    source: { text: "買い物５０円" }, request: { version: 1, answers: [] }, context, complete,
  }), InteractiveModelResponseError);
  assert.equal(requests.length, 3);
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
