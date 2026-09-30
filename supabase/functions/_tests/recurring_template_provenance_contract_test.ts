/// <reference lib="deno.ns" />
import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test(
  "recurring reads preserve bank-template confirmation provenance",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260930150000_preserve_recurring_template_provenance.sql",
        import.meta.url,
      ),
    );
    assertStringIncludes(migration, "public.list_recurring_series_summary_v2");
    assertStringIncludes(migration, "public.list_recurring_series_summary_v1(");
    assertStringIncludes(migration, "public.get_recurring_series_detail_v1(");
    assertStringIncludes(migration, "public.enrich_merchant_identity_items");
    assertStringIncludes(migration, "'provider_recurring'");
    assertStringIncludes(
      migration,
      "template.provider_fields ->> 'source' = 'plaid_recurring_template'",
    );
    assertStringIncludes(migration, "order by item.ordinality");
  },
);
