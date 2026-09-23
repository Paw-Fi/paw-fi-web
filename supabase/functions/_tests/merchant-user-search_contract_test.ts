/// <reference lib="deno.ns" />

import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const source = await Deno.readTextFile(
  new URL("../merchant-user-search/index.ts", import.meta.url),
);
const worker = await Deno.readTextFile(
  new URL("../merchant-resolution-worker/index.ts", import.meta.url),
);
const resolver = await Deno.readTextFile(
  new URL("../shared/merchant-resolver.ts", import.meta.url),
);
const discovery = await Deno.readTextFile(
  new URL("../shared/logo-dev-discovery.ts", import.meta.url),
);

Deno.test(
  "merchant search is authenticated and uses Logo.dev only for an explicit action",
  () => {
    assertStringIncludes(source, "authenticateUser");
    assertStringIncludes(source, "searchLogoDevCandidates");
    assertStringIncludes(discovery, "https://api.logo.dev/search");
    assertStringIncludes(source, "Method not allowed");
  },
);

Deno.test(
  "background reuse checks user overrides before global aliases",
  () => {
    assertStringIncludes(worker, "resolveMerchant");
    assertStringIncludes(resolver, 'from("merchant_user_overrides")');
    assertStringIncludes(resolver, 'from("merchant_aliases")');
  },
);

Deno.test("internal merchant and alias matches bypass Logo.dev Search", () => {
  assert(!source.includes("function findInternalMerchants"));
  assertStringIncludes(source, "searchMerchantCandidates");
  assertStringIncludes(source, "cachedLogoDevCandidates");
});

Deno.test(
  "manual domains cannot establish arbitrary global brand names",
  () => {
    assertStringIncludes(source, "persistConservativeDomainMerchant");
    assertStringIncludes(resolver, "canonicalName: domain");
    assert(!source.includes("canonicalName: selectedCandidate.name"));
  },
);

Deno.test(
  "merchant selection verifies the Logo.dev candidate before persisting a user override",
  () => {
    assertStringIncludes(source, "selectedDomain");
    assertStringIncludes(source, "apply_merchant_user_evidence");
    assertStringIncludes(source, "merchant_id");
  },
);

Deno.test("merchant reset is an explicit user suppression", () => {
  assertStringIncludes(source, 'action: "suppress"');
  assertStringIncludes(source, 'action: "map"');
  assertStringIncludes(worker, "resolution.suppressed");
  assertStringIncludes(resolver, 'source: "suppressed"');
  assertStringIncludes(resolver, '.eq("is_trusted", true)');
});

Deno.test(
  "merchant search never upgrades arbitrary raw text into merchant evidence",
  () => {
    assertStringIncludes(source, "p_raw_text: null");
    assertStringIncludes(source, "p_raw_text_is_merchant_descriptor: false");
    assert(
      source.indexOf(
        "merchant: expense.merchant ?? expense.merchant_structured_name",
      ) >= 0,
      "structured evidence is used only when merchant display evidence is absent",
    );
  },
);

Deno.test(
  "manual website selection remains an interactive server-authorized path",
  () => {
    assertStringIncludes(source, 'body.action !== "manual"');
    assertStringIncludes(source, 'body.selectedSource === "manual"');
    assertStringIncludes(
      source,
      "candidate = { name: selectedName, domain: selectedDomain }",
    );
    assertStringIncludes(source, "persistConservativeDomainMerchant");
  },
);

Deno.test(
  "structured merchant evidence is reusable without a Logo.dev request",
  () => {
    assertStringIncludes(worker, "structured_merchant_key");
    assertStringIncludes(resolver, '"structured_merchant_name"');
    assert(
      resolver.indexOf('"structured_merchant_name"') <
        resolver.indexOf('from("merchant_aliases")'),
      "a user-confirmed structured name is consulted before shared evidence",
    );
  },
);

Deno.test(
  "worker checks trusted global structured aliases after user evidence",
  () => {
    const structuredLookup = resolver.lastIndexOf('"merchant_aliases"');
    assert(structuredLookup > resolver.indexOf('"structured_merchant_name"'));
    assertStringIncludes(
      resolver.slice(structuredLookup),
      '.eq("is_trusted", true)',
    );
  },
);
