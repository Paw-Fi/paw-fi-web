/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { enrichAnalyzedMerchantItems } from "../shared/analyzed-merchant-enrichment.ts";

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
  assertStringIncludes(
    analyze,
    'import { enrichAnalyzedMerchantItems } from "../shared/analyzed-merchant-enrichment.ts"',
  );
  assertStringIncludes(analyze, "await enrichAnalyzedMerchantItems");
  assert(!analyze.includes("async function enrichAnalyzedMerchantItems"));
  assertStringIncludes(analyze, 'from("user_contacts")');
  assertStringIncludes(analyze, '.select("preferred_timezone")');
  assertStringIncludes(analyze, "body.preferredTimezone");
  assertStringIncludes(
    analyzedMerchantEnrichment,
    "merchantDomain: evidencedDomain",
  );
  assertStringIncludes(
    analyzedMerchantEnrichment,
    "selectMerchantCandidateByRegionalContext",
  );
  assertStringIncludes(analyzedMerchantEnrichment, "persistCanonicalMerchant");
  assertStringIncludes(
    analyzedMerchantEnrichment,
    'resolutionSource: "logo_dev_search"',
  );
  assertStringIncludes(
    analyzedMerchantEnrichment,
    "searchLogoDevCandidates(merchant, params.logoDevSecretKey!)",
  );
  assert(
    !analyzedMerchantEnrichment.includes(
      "if (evidencedDomain) {\n          const automaticMerchant",
    ),
  );
});

Deno.test(
  "internal merchant hits return canonical domain for optimistic rows",
  async () => {
    assertStringIncludes(
      analyzedMerchantEnrichment,
      '.select("id, canonical_name, domain")',
    );
    assertStringIncludes(
      analyzedMerchantEnrichment,
      "resolution.merchantId",
    );
    assertStringIncludes(
      analyzedMerchantEnrichment,
      "merchant_domain: canonicalMerchant.domain",
    );
    assertStringIncludes(
      analyzedMerchantEnrichment,
      "merchant_structured_name: canonicalMerchant.canonical_name",
    );

    const supabase = {
      rpc: async (name: string) => {
        assertEquals(name, "merchant_resolution_descriptor_key");
        return { data: "tesco", error: null };
      },
      from: (table: string) => {
        const query = {
          select: (_columns: string) => query,
          eq: (_column: string, _value: unknown) => query,
          maybeSingle: async () => {
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

    assertEquals(result, [{
      merchant: "tesco",
      description: "groceries",
      merchant_id: "4d055fac-88b0-4750-b606-92f37c008975",
      merchant_domain: "tesco.com",
      merchant_structured_name: "Tesco",
      merchant_resolution_source: "user_exact",
    }]);
  },
);

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
  const worker =
    backgroundSources.find((entry) =>
      entry.path.includes("merchant-resolution-worker")
    )!.source;
  assert(!worker.includes("fetch("));
  assertStringIncludes(worker, "resolveMerchant");
  assertStringIncludes(worker, 'mode: "INTERNAL_ONLY"');
  assertStringIncludes(resolver, 'from("merchant_aliases")');
  assertStringIncludes(resolver, '.eq("is_trusted", true)');
});
