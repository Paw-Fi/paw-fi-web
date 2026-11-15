import assert from "node:assert/strict";
import { test } from "node:test";
import {
  runInteractiveTransactionAnalysis,
  InteractiveClarificationError,
} from "../shared/interactive-transaction-analysis.ts";
import { validateInteractiveItems } from "../shared/interactive-transaction-contract.ts";
import {
  canAskInteractiveClarification,
  INTERACTIVE_CLARIFICATION_FIELDS,
} from "../shared/interactive-clarification-review.ts";

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
            if (phase === "review")
              return {
                decision: "ask", asksForDestination: false,
                field: "walletId",
                reason: "ambiguous_explicit",
                evidence: {
                  source: source.text ? "text" : "audio",
                  quote: source.text ?? "午餐20",
                },
                ...question,
              };
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
          decision: "ask", asksForDestination: false,
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

test("wallet/Space questions are ineligible for every reason and source, including arbitrary exact quotes", () => {
  for (const field of ["walletId", "spaceId"]) {
    assert.equal(INTERACTIVE_CLARIFICATION_FIELDS.includes(field), false);
    for (const reason of [
      "missing_required",
      "ambiguous_explicit",
      "unsupported_intent",
      "unavailable_default",
    ]) {
      for (const origin of ["text", "answer", "audio", "image"]) {
        assert.equal(
          canAskInteractiveClarification(
            {
              decision: "ask", asksForDestination: false,
              field,
              reason,
              evidence: { source: origin, quote: "Lunch 20", answerIndex: 0 },
              ...question,
            },
            {
              text: "Lunch 20",
              audio: { data: "recording", contentType: "audio/mp4" },
              image: { data: "image", contentType: "image/png" },
            },
            {
              version: 1,
              answers: [{ question: "How much?", answer: "Lunch 20" }],
            },
          ),
          false,
        );
      }
    }
  }
});

test("unresolved explicit wallet instructions do not become a confirmation or an unverified save", async () => {
  const source = { text: "午餐20，用現金還是旅行錢包" };
  await assert.rejects(
    runInteractiveTransactionAnalysis({
      source,
      request,
      context,
      complete: async (phase) =>
        phase === "extract"
          ? { decision: "correction", ...question }
          : {
              decision: "ask", asksForDestination: false,
              field: "walletId",
              reason: "ambiguous_explicit",
              evidence: { source: "text", quote: source.text },
              ...question,
            },
    }),
    InteractiveClarificationError,
  );
});

test("an unavailable selected wallet cannot be silently replaced or trigger a destination question", async () => {
  await assert.rejects(
    runInteractiveTransactionAnalysis({
      source: { text: "午餐20" },
      request,
      context: { ...context, defaultWalletId: "deleted" },
      complete: async (phase) =>
        phase === "extract"
          ? { decision: "ready", items: [item] }
          : phase === "review"
            ? {
                decision: "ask", asksForDestination: false,
                field: "walletId",
                reason: "unavailable_default",
                ...question,
              }
            : question,
    }),
    InteractiveClarificationError,
  );
});

test("a real missing amount retains the existing localized clarification contract", async () => {
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "Lunch" },
    request,
    context,
    complete: async (phase) =>
      phase === "extract"
        ? {
            decision: "correction",
            question: "How much?",
            choices: ["10", "20"],
          }
        : {
            decision: "ask", asksForDestination: false,
            field: "amount",
            reason: "missing_required",
            question: "How much?",
            choices: ["10", "20"],
          },
  });
  assert.equal(result.requireCorrection, true);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.correction, {
    question: "How much?", choices: ["10", "20"], allowCustomResponse: true,
  });
});

test("an explicitly named authorized wallet still overrides the passed destination without asking", async () => {
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "Lunch 20 from the travel wallet" },
    request,
    context,
    complete: async (phase) => {
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
      assert.equal(phase, "verify");
      return { approved: true };
    },
  });
  assert.equal(result.requireCorrection, false);
  assert.equal(result.items[0].destination.accountId, "other");
  assert.equal(result.items[0].destination.householdId, null);
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
  await assert.rejects(
    runInteractiveTransactionAnalysis({
      source,
      request,
      context,
      complete: async (phase) => {
        if (phase === "extract") {
          if (++extraction === 1)
            return { decision: "correction", ...question };
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
                decision: "ask", asksForDestination: false,
                field: "walletId",
                reason: "ambiguous_explicit",
                evidence: { source: "text", quote: source.text },
                ...question,
              };
        assert.equal(phase, "clarify");
        return question;
      },
    }),
    InteractiveClarificationError,
  );
});

for (const [language, questionText, choices] of [
  ["en", "Which wallet and Space?", ["Personal cash", "Family wallet"]],
  ["ko", "어떤 지갑과 공간에 저장할까요?", ["개인 현금 지갑", "가족 공간"]],
  ["zh-TW", "要使用哪個錢包或空間？", ["個人現金", "家人空間"]],
  ["ar", "أي محفظة ومساحة تريد استخدامها؟", ["المحفظة الشخصية", "مساحة العائلة"]],
]) {
  for (const defaultWalletId of ["selected", null]) {
    test(`destination wording mislabeled as items is rejected for ${language}/${defaultWalletId}`, async () => {
      const scopedContext = {
        ...context, language, defaultWalletId, currency: "KRW",
        wallets: context.wallets.map(wallet => ({ ...wallet, currency: "KRW" })),
      };
      const proposed = { question: questionText, choices };
      let extracts = 0;
      const result = await runInteractiveTransactionAnalysis({
        source: { text: "daiso, 15000 krw" }, request, context: scopedContext,
        complete: async (phase, _model, payload) => {
          if (phase === "extract") {
            return ++extracts === 1
              ? { decision: "correction", ...proposed }
              : { decision: "ready", items: [{ ...item, merchant: "daiso", amount: 15000, currency: "KRW", explicitFields: ["amount", "merchant", "currency"] }] };
          }
          if (phase === "review") {
            assert.deepEqual(payload.proposedClarification, { ...proposed, allowCustomResponse: true });
            assert.equal(payload.context.language, language);
            return { decision: "ask", field: "items", reason: "missing_required", asksForDestination: true };
          }
          assert.equal(phase, "verify");
          return { approved: true };
        },
      });
      assert.equal(result.requireCorrection, false);
      assert.equal(result.items[0].amount, 15000);
      assert.equal(result.items[0].currency, "KRW");
      assert.equal(result.items[0].destination.householdId, "family");
      assert.equal(result.items[0].destination.accountId, defaultWalletId);
    });
  }
}

test("review cannot replace an assessed amount question with an unreviewed wallet question", async () => {
  const proposed = { question: "금액이 얼마인가요?", choices: ["15,000원", "50,000원"] };
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "다이소" }, request, context,
    complete: async (phase, _model, payload) => {
      if (phase === "extract") return { decision: "correction", ...proposed };
      assert.equal(phase, "review");
      assert.deepEqual(payload.proposedClarification, { ...proposed, allowCustomResponse: true });
      return { decision: "ask", field: "amount", reason: "missing_required", asksForDestination: false, ...question };
    },
  });
  assert.deepEqual(result.correction, { ...proposed, allowCustomResponse: true });
});

for (const asksForDestination of [undefined, null, "false", true]) {
  test(`missing or non-false destination assessment cannot authorize UI: ${asksForDestination}`, async () => {
    await assert.rejects(runInteractiveTransactionAnalysis({
      source: { text: "daiso, 15000 krw" }, request, context,
      complete: async phase => phase === "extract"
        ? { decision: "correction", ...question }
        : { decision: "ask", field: "amount", reason: "missing_required", asksForDestination },
    }), InteractiveClarificationError);
  });
}

test("a destination hidden in the choices is rejected without rewriting amounts or defaults", async () => {
  const proposed = { question: "금액이 얼마인가요?", choices: ["15,000원, 개인 지갑", "15,000원, 가족 지갑"] };
  await assert.rejects(runInteractiveTransactionAnalysis({
    source: { text: "daiso, 15000 krw" }, request, context,
    complete: async (phase, _model, payload) => {
      if (phase === "extract") return { decision: "correction", ...proposed };
      assert.deepEqual(payload.proposedClarification.choices, proposed.choices);
      return { decision: "ask", field: "amount", reason: "missing_required", asksForDestination: true };
    },
  }), InteractiveClarificationError);
});

test("client clock clarification is also reviewed and cannot ask for a destination", async () => {
  const clockRequest = { ...request, clientIssue: { itemIndex: 0, field: "transactionTime", reason: "ambiguous_wall_time" } };
  const phases = [];
  await assert.rejects(runInteractiveTransactionAnalysis({
    source: { text: "Coffee at 01:30" }, request: clockRequest, context,
    complete: async (phase, _model, payload) => {
      phases.push(phase);
      if (phase === "clarify") return question;
      assert.equal(phase, "review");
      assert.deepEqual(payload.issues, [clockRequest.clientIssue]);
      assert.deepEqual(payload.proposedClarification, { ...question, allowCustomResponse: true });
      return { decision: "ask", field: "transactionTime", reason: "client_clock", asksForDestination: true };
    },
  }), InteractiveClarificationError);
  assert.deepEqual(phases, ["clarify", "review", "clarify", "review"]);
});

test("an ordinary purchase of a physical wallet can retain an amount question", async () => {
  const proposed = { question: "皮夾花了多少錢？", choices: ["15,000韓元", "50,000韓元"] };
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "買了一個皮夾" }, request, context,
    complete: async phase => phase === "extract"
      ? { decision: "correction", ...proposed }
      : { decision: "ask", field: "amount", reason: "missing_required", asksForDestination: false },
  });
  assert.deepEqual(result.correction, { ...proposed, allowCustomResponse: true });
});
