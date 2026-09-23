/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const source = await Deno.readTextFile(
  new URL("../merchant-logo-bootstrap/index.ts", import.meta.url),
);

Deno.test(
  "explicit bootstrap groups structured evidence and uses the shared resolver/cache",
  () => {
    assertStringIncludes(source, "start_merchant_logo_bootstrap");
    assertStringIncludes(source, "merchant_logo_bootstrap_groups");
    assertStringIncludes(source, "resolveMerchant");
    assertStringIncludes(source, "searchLogoDevCandidates");
    assertStringIncludes(source, "authenticateUser");
    assertStringIncludes(source, 'action === "start"');
    assertStringIncludes(source, 'action === "select"');
    assertStringIncludes(source, 'action === "skip"');
    assertStringIncludes(source, "quotaExhausted");
    assertStringIncludes(source, "processedGroups");
  },
);
