import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as colors from "../supabase/functions/shared/category-colors.ts";
import * as preferences from "../supabase/functions/shared/user-categories.ts";
import * as policy from "../supabase/functions/shared/ai-category-policy.ts";
import { classifyTransactionCategories } from "../supabase/functions/shared/ai-category-classifier.ts";
import {
  resolveCategory,
  resolveCategoryHint,
} from "../supabase/functions/shared/category-resolution.ts";
import { GEMINI_MODEL_FALLBACKS } from "../supabase/functions/shared/gemini-models.ts";

// Only server-entry wrappers require extraction: exercise the real shared
// classifier, policy and resolver, without starting an Edge server.
function functionsFrom(file, names) {
  const source = readFileSync(
    new URL(`../supabase/functions/${file}`, import.meta.url),
    "utf8",
  );
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const declarations = parsed.statements.filter(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      names.includes(statement.name?.text),
  );
  assert.equal(declarations.length, names.length);
  const compiled = ts.transpileModule(
    declarations.map((node) => node.getText(parsed)).join("\n"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  return runInNewContext(`${compiled}\n({${names.join(",")}})`, {
    exports: {},
    ...colors,
    ...preferences,
    ...policy,
    classifyTransactionCategories,
    Date,
    Error,
    console: { info() {}, log() {}, warn() {}, error() {} },
    GEMINI_CATEGORIZATION_MODELS: GEMINI_MODEL_FALLBACKS,
    WALLET_CATEGORIZATION_TIMEOUT_MS: 6000,
    reportVertexAiFailure: async () => {},
  });
}

function provider(outputs) {
  const requests = [];
  return {
    requests,
    getGenerativeModel(config) {
      return {
        async generateContent(request, options) {
          requests.push({ config, request, options });
          assert.ok(outputs.length, "unexpected model call");
          const value = outputs.shift();
          if (value instanceof Error) throw value;
          const name =
            request.toolConfig.functionCallingConfig.allowedFunctionNames[0];
          return {
            response: {
              functionCalls: () => [
                {
                  name,
                  args: {
                    [name === "verify_categories" ? "approvals" : "categories"]:
                      value,
                  },
                },
              ],
            },
          };
        },
      };
    },
  };
}

const categories = {
  expenseCategories: [
    "groceries",
    "restaurants",
    "cat insurance",
    "保育料",
    "other",
    "uncategorized",
  ],
  incomeCategories: ["salary", "other"],
};
const item = {
  type: "expense",
  description: "食料品 1.234,50 €",
  merchant: "商店",
  sourceText: "食料品を購入 １，２３４．５０ ユーロ",
  amount: 1234.5,
  currency: "EUR",
  date: "2026-10-13",
};
const walletInput = {
  merchantName: item.merchant,
  transactionType: item.type,
  amount: item.amount,
  currency: item.currency,
  date: item.date,
  note: item.description,
  sourceText: item.sourceText,
  ...categories,
};

for (const [name, outputs, expected] of [
  [
    "generic result is reconsidered when independent evidence rejects it",
    [["other"], [false], ["groceries"], [true]],
    "groceries",
  ],
  [
    "unknown category is retried",
    [["invented"], ["groceries"], [true]],
    "groceries",
  ],
  [
    "wrong transaction type is retried",
    [["salary"], ["groceries"], [true]],
    "groceries",
  ],
  [
    "wrong result count is retried",
    [["groceries", "salary"], ["restaurants"], [true]],
    "restaurants",
  ],
  [
    "allowed but wrong category requires independent approval",
    [["restaurants"], [false], ["groceries"], [true]],
    "groceries",
  ],
  [
    "allowed custom category is never alias-mapped",
    [["cat insurance"], [true]],
    "cat insurance",
  ],
  ["non-Latin custom category survives", [["保育料"], [true]], "保育料"],
  [
    "verified insufficient evidence stays generic",
    [["other"], [true]],
    "other",
  ],
  [
    "invalid verifier output cannot approve a category",
    [["groceries"], ["true"], ["groceries"], [true]],
    "groceries",
  ],
  [
    "exhausted failures keep the capture fallback",
    GEMINI_MODEL_FALLBACKS.map(() => new Error("timeout")),
    "other",
  ],
]) {
  test(`wallet categorization: ${name}`, async () => {
    const { categorizeWithAI } = functionsFrom(
      "save-wallet-transaction/index.ts",
      ["categorizeWithAI"],
    );
    const expectedCalls = outputs.length;
    const genAI = provider([...outputs]);
    assert.equal(await categorizeWithAI({ ...walletInput, genAI }), expected);
    assert.equal(genAI.requests.length, expectedCalls);
    for (const entry of genAI.requests) {
      assert.ok(entry.options.signal instanceof AbortSignal);
      const evidence = JSON.parse(entry.request.contents[0].parts[0].text)
        .transactions[0];
      assert.equal(evidence.sourceText, item.sourceText);
      assert.equal(evidence.amount, item.amount);
      assert.equal(evidence.currency, item.currency);
    }
  });
}

test("notification hints are verified by a different model before reuse", async () => {
  const { categorizeWithAI } = functionsFrom(
    "save-wallet-transaction/index.ts",
    ["categorizeWithAI"],
  );
  for (const owner of GEMINI_MODEL_FALLBACKS) {
    const genAI = provider([[true]]);
    assert.equal(
      await categorizeWithAI({
        ...walletInput,
        genAI,
        initialCategory: "groceries",
        initialCategoryModel: owner,
      }),
      "groceries",
    );
    assert.equal(genAI.requests.length, 1);
    assert.notEqual(genAI.requests[0].config.model, owner);
  }
});

test("unproven hints and wrong hints cannot bypass classification", async () => {
  const { categorizeWithAI } = functionsFrom(
    "save-wallet-transaction/index.ts",
    ["categorizeWithAI"],
  );
  const unproven = provider([["groceries"], [true]]);
  assert.equal(
    await categorizeWithAI({
      ...walletInput,
      genAI: unproven,
      initialCategory: "restaurants",
    }),
    "groceries",
  );
  const rejected = provider([[false], ["groceries"], [true]]);
  assert.equal(
    await categorizeWithAI({
      ...walletInput,
      genAI: rejected,
      initialCategory: "restaurants",
      initialCategoryModel: GEMINI_MODEL_FALLBACKS[0],
    }),
    "groceries",
  );
});

test("automatic history is never a confirmed choice, including generic guesses", () => {
  const automatic = {
    transaction_type: "expense",
    match_key: "商店",
    category_name: "restaurants",
    use_count: 100,
    last_used_at: null,
    is_user_confirmed: false,
  };
  const ctx = {
    allowedExpenseSet: new Set(categories.expenseCategories),
    allowedIncomeSet: new Set(categories.incomeCategories),
    remaps: [],
    preferences: [automatic],
  };
  for (const initialGuess of ["groceries", "other"]) {
    assert.equal(
      resolveCategory({
        initialGuess,
        description: "商店",
        transactionType: "expense",
        ctx,
      }),
      initialGuess,
    );
  }
  assert.equal(
    resolveCategory({
      initialGuess: "groceries",
      description: "商店",
      transactionType: "expense",
      ctx: {
        ...ctx,
        confirmedPreferences: [{ ...automatic, is_user_confirmed: true }],
      },
    }),
    "restaurants",
  );
});

test("automatic saves never overwrite a confirmed correction", async () => {
  await preferences.learnUserCategoryPreference({
    supabase: {
      from() {
        assert.fail("automatic labels must not write memory");
      },
    },
    userId: "user",
    transactionType: "expense",
    categoryName: "groceries",
    descriptionText: "商店",
  });
});

test("hint validation preserves explicit remaps without applying them twice", () => {
  const ctx = {
    allowedExpenseSet: new Set(categories.expenseCategories),
    allowedIncomeSet: new Set(categories.incomeCategories),
    preferences: [],
    remaps: [
      {
        transaction_type: "expense",
        from_category_name: "other",
        to_category_name: "groceries",
      },
    ],
  };
  assert.equal(
    resolveCategoryHint({
      hint: "other",
      transactionType: "expense",
      ctx,
      explicitRemapOnly: true,
    }),
    "other",
  );
  assert.equal(
    resolveCategoryHint({
      hint: "restaurants",
      transactionType: "expense",
      ctx,
      explicitRemapOnly: true,
    }),
    null,
  );
});

test("analysis retries invalid output and verifies exact custom categories", async () => {
  const { resolveCandidateCategories } = functionsFrom(
    "shared/analyze-core.ts",
    ["resolveCandidateCategories"],
  );
  for (const first of [["invented"], ["salary"], [null]]) {
    const genAI = provider([first, ["cat insurance"], [true]]);
    const result = await resolveCandidateCategories(
      genAI,
      [item],
      categories.expenseCategories,
      categories.incomeCategories,
      "ja",
    );
    assert.deepEqual(Array.from(result), ["cat insurance"]);
  }
});

test("malformed output fails explicitly without English keyword fallback", async () => {
  const { resolveCandidateCategories } = functionsFrom(
    "shared/analyze-core.ts",
    ["resolveCandidateCategories"],
  );
  await assert.rejects(
    () =>
      resolveCandidateCategories(
        provider([[], [], []]),
        [
          {
            ...item,
            description: "Breadboard electronics",
            sourceText: "لوحة إلكترونية ٢٠ يورو",
          },
        ],
        categories.expenseCategories,
        categories.incomeCategories,
        "ar",
      ),
    /Invalid category response/,
  );
});

test("overlapping mixed-type batches retain approved rows and retry only rejected rows", async () => {
  const genAI = provider([
    ["groceries", "salary"],
    [true, false],
    ["salary"],
    [true],
  ]);
  const result = await classifyTransactionCategories({
    genAI,
    items: [item, { ...item, type: "income" }],
    ...categories,
    budgetMs: 6000,
  });
  assert.deepEqual(result.categories, ["groceries", "salary"]);
  const retried = JSON.parse(
    genAI.requests[2].request.contents[0].parts[0].text,
  );
  assert.equal(retried.transactions.length, 1);
  assert.equal(retried.transactions[0].type, "income");
  assert.notEqual(
    genAI.requests[0].config.model,
    genAI.requests[1].config.model,
  );
});

test("verification timeout aborts work and cannot release an unverified category", async () => {
  let aborted = 0;
  const genAI = {
    getGenerativeModel: () => ({
      generateContent: (request, { signal }) => {
        if (
          request.toolConfig.functionCallingConfig.allowedFunctionNames[0] ===
          "categorize_transactions"
        )
          return Promise.resolve({
            response: {
              functionCalls: () => [
                {
                  name: "categorize_transactions",
                  args: { categories: ["groceries"] },
                },
              ],
            },
          });
        return new Promise((_, reject) =>
          signal.addEventListener(
            "abort",
            () => {
              aborted++;
              reject(signal.reason);
            },
            { once: true },
          ),
        );
      },
    }),
  };
  const result = await classifyTransactionCategories({
    genAI,
    items: [item],
    ...categories,
    budgetMs: 40,
  });
  assert.equal(result.categories[0], null);
  assert.ok(aborted > 0);
  assert.ok(result.attempts.every((attempt) => attempt.budgetMs <= 40));
});

test("authentication errors do not waste the deadline on other models", async () => {
  const genAI = provider([
    Object.assign(new Error("unauthorized"), { status: 401 }),
  ]);
  const result = await classifyTransactionCategories({
    genAI,
    items: [item],
    ...categories,
    budgetMs: 6000,
  });
  assert.equal(result.categories[0], null);
  assert.equal(genAI.requests.length, 1);
});
