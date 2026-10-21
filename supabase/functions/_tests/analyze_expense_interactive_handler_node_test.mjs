import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createVertexGenerativeAI } from "../shared/vertex-ai-chat.ts";

function fixture({ preferenceError = false } = {}) {
  let handler;
  const requests = [];
  const loaded = [];
  const reads = new Set();
  const modules = new Map();
  const context = {
    userId: "user",
    defaultSpaceId: "personal",
    defaultWalletId: null,
    currency: "JPY",
    date: "2026-10-05",
    language: "ja",
    expenseCategories: ["groceries"],
    incomeCategories: ["salary"],
    spaces: [
      { id: "personal", name: "Personal", isPortfolio: false, members: [] },
    ],
    wallets: [],
  };
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    from(table) {
      assert.equal(table, "user_contacts");
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => {
          reads.add("locale");
          return {
            data: {
              preferred_language: "ja",
              preferred_timezone: "Asia/Tokyo",
            },
            error: preferenceError ? new Error("unavailable") : null,
          };
        },
      };
      return query;
    },
  };
  const categories = {
    fetchUserCustomCategories: async () => {
      reads.add("categories");
      return [];
    },
    fetchUserHiddenCategories: async () => [],
    fetchUserCategoryRemaps: async () => [],
    fetchConfirmedCategoryPreferences: async () => [],
    fetchUserCategoryPreferences: async () => {
      throw new Error("unused automatic history must not load");
    },
    mergeAllowedCategories: () => ({
      expenseCategories: ["groceries"],
      incomeCategories: ["salary"],
    }),
  };
  function load(url) {
    if (modules.has(url.href)) return modules.get(url.href).exports;
    loaded.push(url.pathname);
    const module = { exports: {} };
    modules.set(url.href, module);
    const code = ts.transpileModule(readFileSync(url, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        Request,
        Response,
        Headers,
        URL,
        URLSearchParams,
        AbortController,
        AbortSignal,
        DOMException,
        TextEncoder,
        TextDecoder,
        ReadableStream,
        setTimeout,
        clearTimeout,
        structuredClone,
        crypto,
        atob,
        btoa,
        Date,
        Error,
        TypeError,
        console: { log() {}, warn() {}, error() {} },
        Deno: {
          serve: (value) => {
            handler = value;
          },
          env: {
            get: (key) =>
              ({
                SUPABASE_URL: "https://example.invalid",
                SUPABASE_ANON_KEY: "test",
              })[key],
          },
        },
        require(specifier) {
          if (specifier.startsWith("https://esm.sh/@supabase/"))
            return { createClient: () => db };
          if (specifier.endsWith("cors.ts"))
            return { corsHeaders: {}, withCors: (value) => value };
          if (specifier.endsWith("report-vertex-ai-failure.ts"))
            return { reportVertexAiFailure: async () => {} };
          if (specifier.endsWith("user-categories.ts"))
            return { ...load(new URL(specifier, url)), ...categories };
          if (specifier.endsWith("user-preferred-currency.ts"))
            return {
              loadLatestUserPreferredCurrency: async () => {
                await Promise.resolve();
                assert.ok(
                  reads.has("locale") && reads.has("categories"),
                  "independent context reads must overlap",
                );
                return "JPY";
              },
            };
          if (specifier.endsWith("interactive-transaction-context.ts"))
            return { loadInteractiveTransactionContext: async () => context };
          if (specifier.endsWith("merchant-source-verification.ts"))
            return {
              enrichSourceVerifiedMerchantItems: async (params) => {
                const result = await params.complete([], params.signal);
                assert.equal(result.verdicts[0].evidence, "小商店");
                assert.ok(params.deadlineAt <= Date.now() + 3000);
                return params.items;
              },
            };
          if (specifier.endsWith("vertex-ai-chat.ts"))
            return {
              getVertexAiConfigFromEnv: () => ({}),
              createVertexGenerativeAI: (options) =>
                createVertexGenerativeAI({
                  ...options,
                  project: "test",
                  location: "global",
                  accessToken: "test",
                  fetchImpl: async (_url, init) => {
                    requests.push(JSON.parse(init.body));
                    const result =
                      requests.length === 1
                        ? {
                            decision: "ready",
                            items: [
                              {
                                type: "expense",
                                amount: 50,
                                category: "groceries",
                                merchant: "小商店",
                                explicitFields: ["merchant"],
                              },
                            ],
                          }
                        : {
                            approved: true,
                            merchantVerdicts: [
                              {
                                itemIndex: 0,
                                approved: true,
                                evidence: "小商店",
                              },
                            ],
                          };
                    return Response.json({
                      candidates: [
                        {
                          finishReason: "STOP",
                          content: {
                            parts: [{ text: JSON.stringify(result) }],
                          },
                        },
                      ],
                    });
                  },
                }),
            };
          if (
            specifier.endsWith("analyze-core.ts") ||
            specifier.endsWith("analyzed-merchant-enrichment.ts") ||
            specifier.startsWith("http")
          )
            throw new Error(`Unexpected eager import: ${specifier}`);
          return load(new URL(specifier, url));
        },
      },
      { filename: url.pathname },
    );
    return module.exports;
  }
  load(new URL("../analyze-expense/index.ts", import.meta.url));
  return { handler, requests, loaded };
}

for (const stream of [false, true]) {
  test(`voice handler (${stream ? "SSE" : "JSON"}) needs only Vertex credentials and returns the unchanged public contract`, async () => {
    const { handler, requests, loaded } = fixture();
    const data = Buffer.from("\0\0\0\x18ftypM4A \0\0\0\0M4A isom").toString(
      "base64",
    );
    const response = await handler(
      new Request(
        `https://example.invalid/analyze-expense${stream ? "?stream=true" : ""}`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio: { data, contentType: "audio/aac" },
            interactive: { version: 1, answers: [] },
          }),
        },
      ),
    );
    assert.equal(response.status, 200);
    const text = await response.text();
    const result = stream
      ? JSON.parse(text.split("event: complete\ndata: ")[1].split("\n\n")[0])
      : JSON.parse(text);
    assert.equal(result.success, true);
    assert.equal(result.data.items[0].amount, 50);
    assert.equal(result.data.items[0].currency, "JPY");
    assert.equal(result.data.merchantVerdicts, undefined);
    assert.equal(result.data.isAnalyzed, true);
    assert.equal(requests.length, 2);
    assert.ok(
      requests.every(
        (request) =>
          request.contents[0].parts[1].inlineData.mimeType === "audio/mp4",
      ),
    );
    assert.ok(
      loaded.every(
        (path) =>
          !path.includes("analyze-core") && !path.includes("/import/xlsx"),
      ),
    );
  });
}

test("unavailable language preference fails retryably before any model request", async () => {
  const { handler, requests } = fixture({ preferenceError: true });
  const response = await handler(
    new Request("https://example.invalid/analyze-expense", {
      method: "POST",
      headers: {
        Authorization: "Bearer test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "買い物５０円",
        interactive: { version: 1, answers: [] },
      }),
    }),
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "AI_TEMPORARILY_UNAVAILABLE");
  assert.equal(requests.length, 0);
});
