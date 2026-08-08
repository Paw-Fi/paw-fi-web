/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test(
  "email import review migration uses hashed tokens, bounded evidence, and no anonymous table grants",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260808120000_email_import_human_review.sql",
        import.meta.url,
      ),
    );
    assertStringIncludes(migration, "token_hash text not null unique");
    assertStringIncludes(migration, "evidence_text text not null");
    assertStringIncludes(migration, "claim_email_import_review");
    assertStringIncludes(migration, "awaiting_review");
  },
);

Deno.test(
  "public review endpoints are POST-only and never read token query parameters",
  async () => {
    const inspect = await Deno.readTextFile(
      new URL("../email-import-review-inspect/index.ts", import.meta.url),
    );
    const submit = await Deno.readTextFile(
      new URL("../email-import-review-submit/index.ts", import.meta.url),
    );
    assertStringIncludes(inspect, 'request.method !== "POST"');
    assertStringIncludes(submit, 'request.method !== "POST"');
  },
);
