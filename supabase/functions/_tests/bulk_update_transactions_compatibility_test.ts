/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test(
  "bulk update rejects malformed or duplicate transaction ids",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../update-transactions-batch/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "rawIds.some");
    assertStringIncludes(source, "ids.length !== rawIds.length");
  },
);

Deno.test(
  "bulk update follows normal personal and shared authorization",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260923150000_fix_bulk_transaction_update_scope.sql",
        import.meta.url,
      ),
    );

    assertStringIncludes(migration, "from public.household_members");
    assertStringIncludes(migration, "v_is_portfolio");
    assertStringIncludes(
      migration,
      "p_household_id is not null and not v_is_portfolio",
    );
  },
);
