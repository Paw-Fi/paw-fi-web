/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  enrichAnalyzedMerchantItems,
  preserveAnalyzedMerchantIdentity,
  resolveAnalyzedMerchantIdentity,
} from "../shared/analyzed-merchant-enrichment.ts";

const backgroundSources = await Promise.all(
  [
    "../shared/bank-sync.ts",
    "../plaid-sync-transactions/index.ts",
    "../shared/plaid-recurring.ts",
    "../save-transactions-batch/index.ts",
    "../save-wallet-transaction/index.ts",
    "../classify-notification-capture/index.ts",
    "../analyze-expense/index.ts",
    "../shared/analyze-core.ts",
    "../merchant-resolution-worker/index.ts",
  ].map(async (path) => ({
    path,
    source: await Deno.readTextFile(new URL(path, import.meta.url)),
  })),
);
const userSearch = await Deno.readTextFile(
  new URL("../merchant-user-search/index.ts", import.meta.url),
);
const discovery = await Deno.readTextFile(
  new URL("../shared/logo-dev-discovery.ts", import.meta.url),
);
const resolver = await Deno.readTextFile(
  new URL("../shared/merchant-resolver.ts", import.meta.url),
);
const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260915130000_merchant_identity_resolution.sql",
    import.meta.url,
  ),
);
const analyze = await Deno.readTextFile(
  new URL("../analyze-expense/index.ts", import.meta.url),
);
const analyzedMerchantEnrichment = await Deno.readTextFile(
  new URL("../shared/analyzed-merchant-enrichment.ts", import.meta.url),
);
const merchantAnalysis = await Deno.readTextFile(
  new URL("../shared/merchant-analysis.ts", import.meta.url),
);
const walletCapture = await Deno.readTextFile(
  new URL("../save-wallet-transaction/index.ts", import.meta.url),
);
const resendInbound = await Deno.readTextFile(
  new URL("../resend-inbound-webhook/index.ts", import.meta.url),
);
const notificationCapture = await Deno.readTextFile(
  new URL("../classify-notification-capture/index.ts", import.meta.url),
);
const botMedia = await Deno.readTextFile(
  new URL("../shared/bot/media-utils.ts", import.meta.url),
);

Deno.test("background transaction paths cannot call Logo.dev Search", () => {
  for (const { path, source } of backgroundSources) {
    assert(
      !source.includes("https://api.logo.dev/search"),
      `${path} must remain internal-only`,
    );
  }
  assert(!migration.includes("api.logo.dev/search"));
});

Deno.test("stream and non-stream Analyze share merchant enrichment", () => {
  assertStringIncludes(analyze, "runEnrichedTransactionAnalysis");
  assertStringIncludes(
    analyzedMerchantEnrichment,
    "await enrichAnalyzedMerchantItems",
  );
  assert(!analyze.includes("async function enrichAnalyzedMerchantItems"));
  assertStringIncludes(analyze, 'from("user_contacts")');
  assertStringIncludes(analyze, '.select("preferred_timezone")');
  assertStringIncludes(analyze, "body.preferredTimezone");
  assertStringIncludes(merchantAnalysis, "merchantDomain: evidencedDomain");
  assertStringIncludes(
    merchantAnalysis,
    "selectMerchantCandidateByRegionalContext",
  );
  assertStringIncludes(merchantAnalysis, "persistCanonicalMerchant");
  assertStringIncludes(merchantAnalysis, 'resolutionSource: "logo_dev_search"');
  assertStringIncludes(
    merchantAnalysis,
    "params.autoResolveCandidates === true ? 4_000 : 8_000",
  );
  assertStringIncludes(discovery, "signal: AbortSignal.timeout(timeoutMs)");
  assert(
    !merchantAnalysis.includes(
      "if (evidencedDomain) {\n          const automaticMerchant",
    ),
  );
});

Deno.test(
  "internal merchant hits return canonical domain for optimistic rows",
  async () => {
    assertStringIncludes(
      merchantAnalysis,
      '.select("id, canonical_name, domain")',
    );
    assertStringIncludes(merchantAnalysis, "resolution.merchantId");
    assertStringIncludes(
      merchantAnalysis,
      "merchant_domain: canonicalMerchant.domain",
    );
    assertStringIncludes(
      merchantAnalysis,
      "merchant_structured_name: canonicalMerchant.canonical_name",
    );

    const supabase = {
      rpc: (name: string) => {
        assertEquals(name, "merchant_resolution_descriptor_key");
        return { data: "tesco", error: null };
      },
      from: (table: string) => {
        const query = {
          select: (_columns: string) => query,
          eq: (_column: string, _value: unknown) => query,
          maybeSingle: () => {
            if (table === "merchant_user_overrides") {
              return {
                data: {
                  merchant_id: "4d055fac-88b0-4750-b606-92f37c008975",
                  action: "map",
                },
                error: null,
              };
            }
            assertEquals(table, "merchants");
            return {
              data: {
                id: "4d055fac-88b0-4750-b606-92f37c008975",
                canonical_name: "Tesco",
                domain: "tesco.com",
              },
              error: null,
            };
          },
        };
        return query;
      },
    };

    const result = await enrichAnalyzedMerchantItems({
      items: [{ merchant: "tesco", description: "groceries" }],
      supabase,
      userId: "4f42e85a-4637-41fb-8fc5-f81933c83861",
    });

    assertEquals(result, [
      {
        merchant: "tesco",
        description: "groceries",
        merchant_id: "4d055fac-88b0-4750-b606-92f37c008975",
        merchant_domain: "tesco.com",
        merchant_structured_name: "Tesco",
        merchant_resolution_source: "user_exact",
      },
    ]);
  },
);

Deno.test(
  "single semantic merchant resolution reuses Analyze Expense enrichment",
  async () => {
    const supabase = {
      rpc: (name: string) => {
        assertEquals(name, "merchant_resolution_descriptor_key");
        return { data: "tesco", error: null };
      },
      from: (table: string) => {
        const query = {
          select: (_columns: string) => query,
          eq: (_column: string, _value: unknown) => query,
          maybeSingle: () => {
            if (table === "merchant_user_overrides") {
              return {
                data: {
                  merchant_id: "4d055fac-88b0-4750-b606-92f37c008975",
                  action: "map",
                },
                error: null,
              };
            }
            assertEquals(table, "merchants");
            return {
              data: {
                id: "4d055fac-88b0-4750-b606-92f37c008975",
                canonical_name: "Tesco",
                domain: "tesco.com",
              },
              error: null,
            };
          },
        };
        return query;
      },
    };

    const result = await resolveAnalyzedMerchantIdentity({
      merchant: " tesco ",
      currency: "EUR",
      supabase,
      userId: "4f42e85a-4637-41fb-8fc5-f81933c83861",
    });

    assertEquals(result, {
      merchantId: "4d055fac-88b0-4750-b606-92f37c008975",
      merchantDomain: "tesco.com",
      merchantStructuredName: "Tesco",
      merchantResolutionSource: "user_exact",
    });
  },
);

Deno.test(
  "headless wallet enrichment AI-verifies and persists a single cached Logo.dev candidate",
  async () => {
    const merchantId = "4d055fac-88b0-4750-b606-92f37c008975";
    const candidate = { name: "Tesco Ireland", domain: "tesco.ie" };
    const supabase = {
      rpc: (name: string, args: Record<string, unknown>) => {
        assertEquals(name, "merchant_resolution_descriptor_key");
        return {
          data: args.p_merchant === candidate.name ? "tesco ireland" : "tesco",
          error: null,
        };
      },
      from: (table: string) => {
        let inserted = false;
        const query = {
          select: (_columns: string) => query,
          eq: (_column: string, _value: unknown) => query,
          gt: (_column: string, _value: unknown) => query,
          limit: (_count: number) => ({ data: [], error: null }),
          insert: (_value: unknown) => {
            inserted = true;
            return query;
          },
          maybeSingle: () => {
            if (table === "merchant_search_cache") {
              return { data: { candidates: [candidate] }, error: null };
            }
            if (table === "merchants" && inserted) {
              return {
                data: {
                  id: merchantId,
                  canonical_name: candidate.name,
                  domain: candidate.domain,
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        };
        return query;
      },
    };

    const result = await resolveAnalyzedMerchantIdentity({
      merchant: "Tesco",
      currency: "EUR",
      supabase,
      userId: "4f42e85a-4637-41fb-8fc5-f81933c83861",
      logoDevSecretKey: "test-key",
      dependencies: {
        selectCandidate: async (params) => {
          assertEquals(params.merchant, "Tesco");
          assertEquals(params.candidates, [candidate]);
          assertEquals(params.timeoutMs, 5_000);
          return candidate;
        },
      },
    });

    assertEquals(result, {
      merchantId,
      merchantDomain: candidate.domain,
      merchantStructuredName: candidate.name,
      merchantResolutionSource: "headless_ai_candidate",
    });
  },
);

Deno.test(
  "wallet captures share merchant enrichment without risking transaction save",
  () => {
    assertStringIncludes(walletCapture, '"../shared/merchant-analysis.ts"');
    assert(!merchantAnalysis.includes('from("./analyze-core.ts")'));
    assertStringIncludes(
      walletCapture,
      "await resolveAnalyzedMerchantIdentity({",
    );
    assertStringIncludes(merchantAnalysis, "autoResolveCandidates: true");
    assertStringIncludes(
      walletCapture,
      'logoDevSecretKey: readRuntimeEnv("LOGO_DEV_SECRET_KEY") ?? ""',
    );
    assertStringIncludes(
      walletCapture,
      "merchant: structuredMerchantForStorage",
    );
    assertStringIncludes(
      walletCapture,
      'tx.merchantEntityType === "organization"',
    );
    assertStringIncludes(walletCapture, "merchant: merchantForStorage,");
    assertStringIncludes(
      walletCapture,
      "Optional merchant enrichment failed; continuing without canonical identity",
    );
    assertStringIncludes(
      walletCapture,
      "WALLET_CATEGORIZATION_TIMEOUT_MS = 6_000",
    );
    assertStringIncludes(walletCapture, "await runWithTimeout({");
    assertStringIncludes(walletCapture, "capture remains saved");
    assertStringIncludes(
      walletCapture,
      "merchant_id: resolvedMerchantIdentity.merchantId",
    );
    assertStringIncludes(
      walletCapture,
      "resolvedMerchantIdentity || structuredMerchantForStorage",
    );
  },
);

Deno.test(
  "transaction analyzers converge on shared merchant enrichment",
  () => {
    assertStringIncludes(analyze, "runEnrichedTransactionAnalysis");
    assertStringIncludes(resendInbound, "runEnrichedTransactionAnalysis");
    assertStringIncludes(botMedia, "runEnrichedTransactionAnalysis");
    assertStringIncludes(walletCapture, "resolveAnalyzedMerchantIdentity");
    assertStringIncludes(notificationCapture, "save-wallet-transaction");
  },
);

Deno.test(
  "headless email attachment and body analysis resolve Logo.dev candidates",
  () => {
    assertEquals(
      resendInbound.match(/autoResolveCandidates: true/g)?.length ?? 0,
      2,
    );
  },
);

Deno.test("email currency repair preserves canonical merchant identity", () => {
  const merchantId = "4d055fac-88b0-4750-b606-92f37c008975";
  const result = preserveAnalyzedMerchantIdentity({
    analyzedItems: [
      {
        type: "expense",
        date: "2026-09-17",
        amount: 18.5,
        currency: "USD",
        merchant: "Tesco",
        merchant_id: merchantId,
        merchant_structured_name: "Tesco",
      },
    ],
    items: [
      {
        type: "expense",
        date: "2026-09-17",
        amount: 18.5,
        currency: "GBP",
        merchant: "Tesco",
      },
    ],
  });

  assertEquals(result[0].merchant_id, merchantId);
  assertEquals(result[0].merchant_structured_name, "Tesco");
});

Deno.test(
  "only explicit merchant search owns the Logo.dev Search endpoint",
  () => {
    assertStringIncludes(userSearch, "searchLogoDevCandidates");
    assertStringIncludes(discovery, "https://api.logo.dev/search");
    assertStringIncludes(userSearch, 'body.action === "search"');
    assertStringIncludes(userSearch, 'body.action !== "select"');
  },
);

Deno.test("internal background resolver has no fetch dependency", () => {
  const worker = backgroundSources.find((entry) =>
    entry.path.includes("merchant-resolution-worker"),
  )!.source;
  assert(!worker.includes("fetch("));
  assertStringIncludes(worker, "resolveMerchant");
  assertStringIncludes(worker, 'mode: "INTERNAL_ONLY"');
  assertStringIncludes(resolver, 'from("merchant_aliases")');
  assertStringIncludes(resolver, '.eq("is_trusted", true)');
});
