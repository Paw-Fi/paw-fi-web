/// <reference lib="deno.ns" />

import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

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
  assertStringIncludes(analyze, "enrichAnalyzedMerchantItems");
  assertStringIncludes(analyze, "await enrichAnalyzedMerchantItems");
  assertStringIncludes(analyze, "merchantDomain: evidencedDomain");
  assert(
    !analyze.includes(
      "if (evidencedDomain) {\n          const automaticMerchant",
    ),
  );
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
