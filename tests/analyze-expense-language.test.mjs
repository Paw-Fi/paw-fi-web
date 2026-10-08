import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { resolveAiResponseLanguage } from "../supabase/functions/shared/ai-response-language.ts";
import {
  parseInteractiveRequest,
  parseInteractiveSource,
} from "../supabase/functions/shared/interactive-transaction-contract.ts";

const source = readFileSync(new URL("../supabase/functions/analyze-expense/index.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness({ preferredLanguage, preferenceError } = {}) {
  let handler;
  const queries = [];
  const contexts = [];
  const analyses = [];
  const errors = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) },
    from: (table) => {
      const query = { table };
      queries.push(query);
      const builder = {
        select: (fields) => { query.fields = fields; return builder; },
        eq: (field, value) => { query[field] = value; return builder; },
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({
          data: { preferred_language: preferredLanguage, preferred_timezone: "Asia/Tokyo" },
          error: preferenceError ?? null,
        }),
      };
      return builder;
    },
  };
  const imports = {
    "../shared/cors.ts": { corsHeaders: {} },
    "../shared/analyze-core.ts": { normalizePreferredTimezone: (value) => value },
    "../shared/analyzed-merchant-enrichment.ts": {},
    "../shared/report-vertex-ai-failure.ts": {},
    "../shared/user-categories.ts": {
      fetchUserCustomCategories: async () => [],
      fetchUserHiddenCategories: async () => [],
      fetchUserCategoryPreferences: async () => [],
      fetchUserCategoryRemaps: async () => [],
      fetchConfirmedCategoryPreferences: async () => [],
      mergeAllowedCategories: () => ({ expenseCategories: ["groceries"], incomeCategories: ["salary"] }),
    },
    "../shared/user-preferred-currency.ts": { loadLatestUserPreferredCurrency: async () => "JPY" },
    "../shared/interactive-transaction-contract.ts": { parseInteractiveRequest, parseInteractiveSource },
    "../shared/interactive-transaction-context.ts": { loadInteractiveTransactionContext: async (params) => params },
    "../shared/interactive-transaction-analysis.ts": {
      runInteractiveTransactionAnalysis: async (params) => {
        analyses.push(params);
        const { context } = params;
        contexts.push(context);
        return { requireCorrection: true, items: [], language: context.language };
      },
    },
    "../shared/merchant-source-verification.ts": {},
    "../shared/currency-validator.ts": { VALID_CURRENCIES: ["JPY", "USD"] },
    "../shared/ai-response-language.ts": { resolveAiResponseLanguage },
    "../shared/bot/date-utils.ts": { formatDateInTimeZone: () => "2026-10-08" },
    "../shared/ai-capture-defaults.ts": {
      parseAiCaptureDefaults: () => null,
      applyAiCaptureDefaults: (body) => body,
    },
  };
  runInNewContext(compiled, {
    exports: {}, URL, Request, Response, setTimeout, clearTimeout,
    console: { log() {}, warn() {}, error: (...values) => errors.push(values.map(String).join(" ")) },
    require: (specifier) => {
      if (specifier.startsWith("https://esm.sh/@supabase/")) return { createClient: () => client };
      if (specifier in imports) return imports[specifier];
      throw new Error(`Unexpected import ${specifier}`);
    },
    Deno: { serve: (callback) => { handler = callback; }, env: { get: () => "test-config" } },
  });
  return {
    queries, contexts, analyses, errors,
    request: (language, body = {}) => handler(new Request("https://example.test/analyze-expense", {
      method: "POST", headers: { Authorization: "Bearer test-session" },
      body: JSON.stringify({ text: "20 dinner / 合計２０ / الإجمالي ٢٠", language, interactive: { version: 1, answers: [] }, ...body }),
    })),
  };
}

for (const [preferredLanguage, requestedLanguage, expected] of [
  ["ja", "en-US", "ja"], ["ur", "ja", "ur"], ["zh_TW", "en", "zh-TW"],
  ["kr", "en", "ko"], [null, "fr-CA", "fr-CA"], [null, undefined, "en"],
]) {
  test(`authenticated analysis resolves ${preferredLanguage ?? "missing preference"} to ${expected}`, async () => {
    const fixture = harness({ preferredLanguage });
    const response = await fixture.request(requestedLanguage);
    assert.equal(response.status, 200, fixture.errors.join("\n"));
    const result = await response.json();
    assert.equal(result.data.language, expected);
    assert.equal(fixture.contexts.length, 1);
    assert.equal(fixture.contexts[0].language, expected);
    assert.equal(fixture.contexts[0].userId, "actor");
    assert.equal(fixture.queries[0].user_id, "actor");
    assert.equal(fixture.queries[0].fields, "preferred_timezone, preferred_language");
  });
}

test("a failed preference read returns a retryable error without calling AI", async () => {
  const fixture = harness({ preferenceError: { message: "database unavailable" } });
  const response = await fixture.request("en");
  assert.equal(response.status, 500);
  assert.equal((await response.json()).code, "SERVER_ERROR");
  assert.equal(fixture.contexts.length, 0);
});

test("authenticated camera analysis forwards the original receipt and selected defaults", async () => {
  const fixture = harness({ preferredLanguage: "zh_TW" });
  const image = { data: "cmVjZWlwdA==", contentType: "image/heic" };
  const answers = [{ question: "收據的金額？", answer: "1.234,50 歐元" }];
  const response = await fixture.request("en", {
    text: undefined, image, householdId: "family", accountId: "selected-wallet",
    interactive: { version: 1, answers },
  });
  assert.equal(response.status, 200, fixture.errors.join("\n"));
  assert.deepEqual(fixture.analyses[0].source, { image });
  assert.deepEqual(fixture.analyses[0].request.answers, answers);
  assert.equal(fixture.contexts[0].defaultSpaceId, "family");
  assert.equal(fixture.contexts[0].defaultWalletId, "selected-wallet");
  assert.equal(fixture.contexts[0].language, "zh-TW");
});

test("unsupported camera input is rejected before preference reads or AI calls", async () => {
  const fixture = harness();
  const response = await fixture.request("en", {
    image: { data: "receipt", contentType: "application/pdf" },
  });
  assert.equal(response.status, 400);
  assert.equal(fixture.queries.length, 0);
  assert.equal(fixture.analyses.length, 0);
});
