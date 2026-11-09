import assert from "node:assert/strict";
import { test } from "node:test";
import {
  runInteractiveTransactionAnalysis,
  InteractiveClarificationError,
} from "../shared/interactive-transaction-analysis.ts";
import { validateInteractiveItems } from "../shared/interactive-transaction-contract.ts";
import { canAskInteractiveClarification } from "../shared/interactive-clarification-review.ts";

const context = {
  userId: "me",
  defaultSpaceId: "family",
  defaultWalletId: "selected",
  currency: "EUR",
  date: "2026-11-06",
  language: "zh-TW",
  expenseCategories: ["groceries"],
  incomeCategories: ["salary"],
  spaces: [
    { id: "personal", name: "Personal", isPortfolio: false, members: [] },
    {
      id: "family",
      name: "家人",
      isPortfolio: false,
      members: [{ userId: "me", name: "我" }],
    },
  ],
  wallets: [
    { id: "selected", name: "現金", currency: "EUR", spaceId: "family" },
    { id: "other", name: "旅行", currency: "USD", spaceId: "personal" },
  ],
};
const item = {
  type: "expense",
  amount: 20,
  category: "groceries",
  explicitFields: ["amount"],
};
const question = {
  question: "要使用哪個錢包或空間？",
  choices: ["家人現金", "個人旅行"],
};
const request = { version: 1, answers: [] };

for (const defaultWalletId of ["selected", null]) {
  for (const phaseToReject of ["extract", "verify"]) {
    for (const source of [
      { text: "午餐20" },
      { audio: { data: "YXVkaW8=", contentType: "audio/mp4" } },
    ]) {
      test(`${phaseToReject} redundant destination question is repaired for ${defaultWalletId} and ${source.text ? "text" : "audio"}`, async () => {
        const phases = [];
        const selectedContext = { ...context, defaultWalletId };
        let rejected = false;
        const result = await runInteractiveTransactionAnalysis({
          source,
          request,
          context: selectedContext,
          complete: async (phase, _model, payload) => {
            phases.push(phase);
            assert.deepEqual(payload.context, selectedContext);
            assert.deepEqual(payload.answers, []);
            if (phase === phaseToReject && !rejected) {
              rejected = true;
              return phase === "extract"
                ? { decision: "correction", ...question }
                : { approved: false, ...question };
            }
            if (phase === "review") return { decision: "retry" };
            if (phase === "extract") {
              if (rejected) assert.ok(payload.clarificationReview);
              return { decision: "ready", items: [item] };
            }
            assert.equal(phase, "verify");
            assert.equal(payload.items[0].destination.householdId, "family");
            assert.equal(
              payload.items[0].destination.accountId,
              defaultWalletId,
            );
            return { approved: true };
          },
        });
        assert.equal(result.requireCorrection, false);
        assert.equal(result.items[0].destination.accountId, defaultWalletId);
        assert.deepEqual(
          phases,
          phaseToReject === "extract"
            ? ["extract", "review", "extract", "verify"]
            : ["extract", "verify", "review", "extract", "verify"],
        );
      });
    }
  }
}

test("a reviewer cannot demand a missing wallet or Space, or use catalog/question text as evidence", () => {
  for (const field of ["walletId", "spaceId"]) {
    assert.equal(
      canAskInteractiveClarification(
        { field, reason: "missing_required" },
        { text: "午餐20" },
        request,
        context,
      ),
      false,
    );
    for (const quote of ["現金", question.question]) {
      assert.equal(
        canAskInteractiveClarification(
          {
            field,
            reason: "ambiguous_explicit",
            evidence: { source: "text", quote },
          },
          { text: "午餐20" },
          {
            ...request,
            answers: [{ question: question.question, answer: "20" }],
          },
          context,
        ),
        false,
      );
    }
  }
  assert.equal(
    canAskInteractiveClarification(
      { field: "walletId", reason: "unavailable_default" },
      { text: "午餐20" },
      request,
      { ...context, defaultWalletId: null },
    ),
    false,
  );
});

test("repeated unnecessary questions exhaust one repair, never return questions or unverified items", async () => {
  const phases = [];
  await assert.rejects(
    runInteractiveTransactionAnalysis({
      source: { text: "午餐20" },
      request,
      context,
      complete: async (phase) => {
        phases.push(phase);
        if (phase === "extract") return { decision: "correction", ...question };
        return {
          decision: "ask",
          field: "walletId",
          reason: "missing_required",
          ...question,
        };
      },
    }),
    InteractiveClarificationError,
  );
  assert.deepEqual(phases, ["extract", "review", "extract", "review"]);
});

test("accepted wallet answer and unrelated latest amount answer survive every repair phase", async () => {
  const answers = [
    { question: question.question, answer: "旅行" },
    { question: "金額？", answer: "20美元" },
  ];
  let first = true;
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "午餐" },
    request: { ...request, answers },
    context,
    complete: async (phase, _model, payload) => {
      assert.deepEqual(payload.answers, answers);
      if (phase === "extract" && first) {
        first = false;
        return { decision: "correction", ...question };
      }
      if (phase === "review") return { decision: "retry" };
      if (phase === "extract")
        return {
          decision: "ready",
          items: [
            {
              ...item,
              walletId: "other",
              explicitFields: ["amount", "walletId"],
            },
          ],
        };
      return { approved: true };
    },
  });
  assert.equal(result.items[0].destination.accountId, "other");
  assert.equal(result.items[0].destination.householdId, null);
  assert.equal(result.items[0].currency, "USD");
});

test("genuine ambiguous explicit wallet still asks a source-grounded question and withholds every item", async () => {
  const source = { text: "午餐20，用現金還是旅行錢包" };
  const result = await runInteractiveTransactionAnalysis({
    source,
    request,
    context,
    complete: async (phase) =>
      phase === "extract"
        ? { decision: "correction", ...question }
        : {
            decision: "ask",
            field: "walletId",
            reason: "ambiguous_explicit",
            evidence: { source: "text", quote: "用現金還是旅行錢包" },
            ...question,
          },
  });
  assert.equal(result.requireCorrection, true);
  assert.deepEqual(result.items, []);
});

test("unavailable selected wallet can ask only with deterministic authorization failure", async () => {
  const stale = { ...context, defaultWalletId: "deleted" };
  const review = {
    decision: "ask",
    field: "walletId",
    reason: "unavailable_default",
    ...question,
  };
  assert.equal(
    canAskInteractiveClarification(review, { text: "午餐20" }, request, stale),
    false,
  );
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "午餐20" },
    request,
    context: stale,
    complete: async (phase) =>
      phase === "extract"
        ? { decision: "ready", items: [item] }
        : phase === "review"
          ? review
          : question,
  });
  assert.equal(result.requireCorrection, true);
  assert.deepEqual(result.items, []);
});

for (const type of ["expense", "income"]) {
  test(`explicit unassigned ${type} overrides selected or deleted wallet without a question`, () => {
    for (const defaultWalletId of ["selected", "deleted", null]) {
      const result = validateInteractiveItems(
        [
          {
            ...item,
            type,
            category: type === "income" ? "salary" : "groceries",
            walletId: null,
            explicitFields: ["amount", "walletId"],
          },
        ],
        { ...context, defaultWalletId },
      );
      assert.deepEqual(result.issues, []);
      assert.equal(result.items[0].destination.accountId, null);
      assert.equal(result.items[0].destination.householdId, "family");
    }
  });
}

test("repair still requires independent approval and never rewrites explicit wallet/currency conflicts", async () => {
  let extraction = 0;
  const source = { text: "午餐20美元，使用家人現金錢包" };
  const result = await runInteractiveTransactionAnalysis({
    source,
    request,
    context,
    complete: async (phase) => {
      if (phase === "extract") {
        if (++extraction === 1) return { decision: "correction", ...question };
        return {
          decision: "ready",
          items: [
            {
              ...item,
              currency: "USD",
              walletId: "selected",
              explicitFields: ["amount", "currency", "walletId"],
            },
          ],
        };
      }
      if (phase === "review")
        return extraction === 1
          ? { decision: "retry" }
          : {
              decision: "ask",
              field: "walletId",
              reason: "ambiguous_explicit",
              evidence: { source: "text", quote: source.text },
              ...question,
            };
      assert.equal(phase, "clarify");
      return question;
    },
  });
  assert.equal(result.requireCorrection, true);
  assert.deepEqual(result.items, []);
});
