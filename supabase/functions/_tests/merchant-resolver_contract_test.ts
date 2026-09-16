/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalMerchantDomain } from "../shared/merchant-resolver.ts";

const source = await Deno.readTextFile(
  new URL("../shared/merchant-resolver.ts", import.meta.url),
);

Deno.test("central resolver keeps external discovery mode-gated", () => {
  for (const mode of [
    "INTERNAL_ONLY",
    "INTERACTIVE_SEARCH",
    "INTERACTIVE_ANALYZE",
  ]) {
    assertStringIncludes(source, `"${mode}"`);
  }
  assertStringIncludes(source, "resolveMerchantInternally");
  assertStringIncludes(source, "cachedLogoDevCandidates");
  assertStringIncludes(source, 'params.input.mode === "INTERNAL_ONLY"');
});
