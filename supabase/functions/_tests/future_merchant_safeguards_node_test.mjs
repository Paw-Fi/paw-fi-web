import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const shared = new URL("../shared/", import.meta.url);
const merchantId = "11111111-1111-4111-8111-111111111111";

function fixture(options = {}) {
  const calls = [],
    modules = new Map();
  function load(url) {
    const key = url.href;
    if (modules.has(key)) return modules.get(key).exports;
    const module = { exports: {} };
    modules.set(key, module);
    const source = readFileSync(url, "utf8");
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    runInNewContext(
      code,
      {
        exports: module.exports,
        module,
        console,
        setTimeout,
        clearTimeout,
        URL,
        Intl,
        TextEncoder,
        TextDecoder,
        AbortSignal,
        Date,
        Deno: { env: { get: () => undefined } },
        require(specifier) {
          if (specifier.includes("encoding/base64"))
            return {
              encodeBase64: (value) => Buffer.from(value).toString("base64"),
              decodeBase64: (value) =>
                new Uint8Array(Buffer.from(value, "base64")),
            };
          if (specifier.endsWith("analyze-core.ts"))
            return {
              runAnalyzeExpense: async () => ({
                success: true,
                language: "en",
                items: options.items ?? [
                  {
                    merchant: "Tesco",
                    amount: 5,
                    currency: "EUR",
                    date: "2026-10-07",
                    type: "expense",
                  },
                ],
              }),
            };
          if (specifier.endsWith("import/xlsx.ts"))
            return { buildXlsxPreview: () => null };
          if (specifier.endsWith("vertex-ai-chat.ts"))
            return {
              getVertexAiConfigFromEnv: () => ({}),
              createVertexGenerativeAI: () => ({
                getGenerativeModel: (params) => ({
                  generateContent: async (request) => {
                    calls.push({ params, request });
                    if (
                      params.systemInstruction.includes(
                        "independently verify optional",
                      )
                    )
                      return {
                        response: {
                          text: () =>
                            JSON.stringify(
                              options.verdict ?? {
                                verdicts: [
                                  {
                                    itemIndex: 0,
                                    approved: false,
                                    evidence: "",
                                  },
                                ],
                              },
                            ),
                        },
                      };
                    return {
                      response: {
                        functionCalls: () => [
                          {
                            name: "choose_merchant_candidate",
                            args: {
                              hasConfidentMatch:
                                options.candidateApproved === true,
                              selectedDomain: "wrong.com",
                            },
                          },
                        ],
                      },
                    };
                  },
                }),
              }),
            };
          if (specifier.startsWith("http"))
            throw new Error(`Unexpected external import: ${specifier}`);
          return load(new URL(specifier, url));
        },
      },
      { filename: fileURLToPath(url) },
    );
    return module.exports;
  }
  return { calls, load: (path) => load(new URL(path, shared)) };
}

const sourceItem = {
  merchant: "Tesco",
  amount: 5,
  currency: "EUR",
  date: "2026-10-07",
  type: "expense",
};

test("multilingual quoted evidence is grounded in original document text, not filenames", async () => {
  const { verifyMerchantSources } = fixture().load(
    "merchant-source-verification.ts",
  );
  const text = 'دفعت ١٢٫٥٠ في مقهى النور\nCafé "Central"';
  const result = await verifyMerchantSources({
    body: {
      attachments: [
        {
          filename: "Tesco.csv",
          contentType: "text/csv",
          data: Buffer.from(text).toString("base64"),
        },
      ],
    },
    items: [
      { merchant: "مقهى النور" },
      { merchant: 'Café "Central"' },
      { merchant: "Tesco" },
    ],
    complete: async () => ({
      verdicts: [
        { itemIndex: 0, approved: true, evidence: "مقهى النور" },
        { itemIndex: 1, approved: true, evidence: 'Café "Central"' },
        { itemIndex: 2, approved: true, evidence: "Tesco" },
      ],
    }),
  });
  assert.equal(result[0]?.approved, true);
  assert.equal(result[1]?.approved, true);
  assert.equal(result[2], null);
});

test("duplicate, missing, invented and non-boolean source approvals cannot authorize a logo", async () => {
  const { verifyMerchantSources } = fixture().load(
    "merchant-source-verification.ts",
  );
  const result = await verifyMerchantSources({
    body: { text: "Tesco 5 EUR" },
    items: Array.from({ length: 4 }, () => sourceItem),
    complete: async () => ({
      verdicts: [
        { itemIndex: 0, approved: true, evidence: "Tesco" },
        { itemIndex: 0, approved: false, evidence: "" },
        { itemIndex: 1, approved: "true", evidence: "Tesco" },
        { itemIndex: 2, approved: true, evidence: "Starbucks" },
      ],
    }),
  });
  assert.equal(
    result.every((item) => item === null),
    true,
  );
});

test("a checked merchant mention retains a user-confirmed mapping and all financial fields", async () => {
  const harness = fixture({
    verdict: {
      verdicts: [{ itemIndex: 0, approved: true, evidence: "Tesco" }],
    },
  });
  const { enrichSourceVerifiedMerchantItems } = harness.load(
    "merchant-source-verification.ts",
  );
  const supabase = {
    rpc: async () => ({ data: "tesco", error: null }),
    from(table) {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data:
            table === "merchant_user_overrides"
              ? { action: "map", merchant_id: merchantId }
              : {
                  id: merchantId,
                  canonical_name: "Tesco",
                  domain: "tesco.com",
                },
        }),
      };
      return query;
    },
  };
  const original = {
    ...sourceItem,
    description: "Original notes",
    transactionTime: "00:00:00",
  };
  const [result] = await enrichSourceVerifiedMerchantItems({
    body: { text: "Tesco 5 EUR" },
    items: [original],
    merchantContext: { userId: "user", supabase },
  });
  assert.equal(result.merchant_id, merchantId);
  assert.equal(result.merchant_domain, "tesco.com");
  assert.equal(result.merchant_auto_resolution_blocked, undefined);
  for (const [field, value] of Object.entries(original))
    assert.equal(result[field], value);
  assert.equal(original.merchant_id, undefined);
});

test("optional logo deadlines return successful financial rows instead of exhausting analysis", async () => {
  const { enrichSourceVerifiedMerchantItems } = fixture().load(
    "merchant-source-verification.ts",
  );
  const [result] = await enrichSourceVerifiedMerchantItems({
    body: { text: "Tesco 5 EUR" },
    items: [sourceItem],
    deadlineAt: Date.now() - 1,
    merchantContext: {
      userId: "user",
      supabase: {
        rpc: () => {
          throw new Error("must not look up after deadline");
        },
      },
    },
    complete: async () => {
      throw new Error("must not verify after deadline");
    },
  });
  assert.equal(result.merchant_auto_resolution_blocked, true);
  for (const [field, value] of Object.entries(sourceItem))
    assert.equal(result[field], value);
});

test("all shared automatic analyzers verify source by default without an opt-in", async () => {
  const harness = fixture();
  const { runEnrichedTransactionAnalysis } = harness.load(
    "analyzed-merchant-enrichment.ts",
  );
  const result = await runEnrichedTransactionAnalysis({
    body: { text: "coffee 5 EUR" },
    apiKey: "",
    merchantContext: {
      userId: "user",
      supabase: {
        rpc: () => {
          throw new Error("must not look up rejected source");
        },
      },
    },
  });
  assert.equal(harness.calls.length, 1);
  assert.equal(result.success, true);
  assert.equal(result.items[0].merchant_auto_resolution_blocked, true);
  assert.equal(result.items[0].merchant, "Tesco");
  assert.equal(result.items[0].amount, 5);
});

test("save-field mapping preserves abstention instead of reviving stale IDs or name logos", () => {
  const { analyzedMerchantSaveFields } = fixture().load(
    "merchant-auto-resolution-policy.ts",
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        analyzedMerchantSaveFields({
          merchant_auto_resolution_blocked: true,
          merchant_id: merchantId,
          merchant_structured_name: "Wrong",
        }),
      ),
    ),
    { merchantAutoResolutionBlocked: true },
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        analyzedMerchantSaveFields({
          merchant_id: merchantId,
          merchant_structured_name: "Tesco",
        }),
      ),
    ),
    { merchantId, merchantStructuredName: "Tesco" },
  );
});

test("email repair retains blocked decisions and blocks unmatched merchant identities", () => {
  const { preserveAnalyzedMerchantIdentity } = fixture().load(
    "analyzed-merchant-enrichment.ts",
  );
  const preserved = preserveAnalyzedMerchantIdentity({
    items: [{ ...sourceItem, currency: "GBP" }],
    analyzedItems: [{ ...sourceItem, merchant_auto_resolution_blocked: true }],
  });
  assert.equal(preserved[0].merchant_auto_resolution_blocked, true);
  assert.equal(preserved[0].currency, "GBP");
  const unmatched = preserveAnalyzedMerchantIdentity({
    items: [{ ...sourceItem, merchant: "Another", merchant_id: merchantId }],
    analyzedItems: [{ ...sourceItem, merchant_id: merchantId }],
  });
  assert.equal(unmatched[0].merchant, "Another");
  assert.equal(unmatched[0].merchant_id, undefined);
  assert.equal(unmatched[0].merchant_auto_resolution_blocked, true);
});

test("future bot saves block unsupported merchant logos but leave explicit existing-record edits unchanged", async () => {
  const { resolveBotMerchantIdentityFields } = fixture().load(
    "bot/transaction-tool.ts",
  );
  const blocked = await resolveBotMerchantIdentityFields({
    transaction: { ...sourceItem, merchantId },
    sourceText: "coffee 5 EUR",
    supabase: {},
    userId: "user",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(blocked)), {
    merchantAutoResolutionBlocked: true,
  });
  const existing = await resolveBotMerchantIdentityFields({
    transaction: { ...sourceItem, merchantId },
    supabase: {},
    userId: "user",
  });
  assert.equal(existing.merchantId, merchantId);
});

test("bot normalization and save fields carry blocked analyzed media without trusting model IDs", () => {
  const { normalizeTransactionToolArgs, merchantIdentitySaveFields } =
    fixture().load("bot/transaction-tool.ts");
  const normalized = normalizeTransactionToolArgs({
    ...sourceItem,
    category: "food",
    merchant_id: merchantId,
    merchant_structured_name: "Wrong",
    merchant_auto_resolution_blocked: true,
  });
  assert.equal(normalized.ok, true);
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(merchantIdentitySaveFields(normalized.transaction)),
    ),
    { merchantAutoResolutionBlocked: true },
  );
});

test("an automatic cached mapping must also match the supported merchant, not just a stored alias", async () => {
  const harness = fixture({
    verdict: {
      verdicts: [{ itemIndex: 0, approved: true, evidence: "Tesco" }],
    },
  });
  const { enrichSourceVerifiedMerchantItems } = harness.load(
    "merchant-source-verification.ts",
  );
  const supabase = {
    rpc: async () => ({ data: "tesco", error: null }),
    from(table) {
      const query = {
        select: () => query,
        eq: () => query,
        limit: async () => ({ data: [{ merchant_id: merchantId }] }),
        maybeSingle: async () => ({
          data:
            table === "merchants"
              ? {
                  id: merchantId,
                  canonical_name: "Wrong Company",
                  domain: "wrong.com",
                }
              : null,
        }),
      };
      return query;
    },
  };
  const result = await enrichSourceVerifiedMerchantItems({
    body: { text: "Tesco 5 EUR" },
    items: [sourceItem],
    merchantContext: { userId: "user", supabase },
  });
  assert.equal(result[0].merchant_id, undefined);
  assert.equal(result[0].merchant_auto_resolution_blocked, true);
  assert.equal(result[0].merchant, "Tesco");
});

test("notifications carry only original notification content as merchant source evidence", () => {
  const { buildNotificationCaptureTransaction } = fixture().load(
    "android-notification-classifier.ts",
  );
  const transaction = buildNotificationCaptureTransaction(
    { packageName: "bank", title: "支払い", text: "小商店 １２，５０円" },
    {
      merchant: "Wrong",
      merchantEntityType: "organization",
      transactionType: "expense",
      amount: 12.5,
      currency: "JPY",
      description: "Invented model description",
    },
    "JPY",
  );
  assert.match(transaction.merchantSourceText, /小商店/);
  assert.doesNotMatch(
    transaction.merchantSourceText,
    /Wrong|Invented model description/,
  );
});

test("every future email/wallet/bot save branch carries the logo decision", () => {
  const email = readFileSync(
    new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    (email.match(/analyzedMerchantSaveFields\(item\)/g) ?? []).length,
    2,
  );
  assert.equal(
    /candidate: blockAnalyzedMerchantIdentity\(\s*decision.candidate/.test(
      email,
    ),
    true,
    "email review candidates must retain abstention",
  );
  const review = readFileSync(
    new URL("../email-import-review-submit/index.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    review.includes("analyzedMerchantSaveFields(grounded.item)"),
    true,
    "review saves must map abstention",
  );
  const wallet = readFileSync(
    new URL("../save-wallet-transaction/index.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    wallet.includes("enrichSourceVerifiedMerchantItems"),
    true,
    "wallet must source verify",
  );
  assert.equal(
    wallet.includes(
      "merchantAutoResolutionPatch(merchantAutoResolutionBlocked)",
    ),
    true,
    "wallet must persist abstention",
  );
  const bots = ["telegram-ai-bot", "twilio-whatsapp-ai-bot"];
  for (const name of bots) {
    const source = readFileSync(
      new URL(`../${name}/index.ts`, import.meta.url),
      "utf8",
    );
    assert.equal(
      source.includes("merchantSourceText: userMessageContent"),
      true,
      `${name} single creates must use original text`,
    );
    assert.equal(
      source.includes("sourceText: userMessageContent"),
      true,
      `${name} batches must use original text`,
    );
  }
});
