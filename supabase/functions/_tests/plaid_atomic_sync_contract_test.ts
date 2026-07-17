/// <reference lib="deno.ns" />

import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migrationUrl = new URL(
  "../../migrations/20260717120000_plaid_atomic_sync_and_review.sql",
  import.meta.url,
);

Deno.test(
  "Plaid batch applies transaction patches and cursor atomically",
  async () => {
    const sql = await Deno.readTextFile(migrationUrl);
    const functionStart = sql.indexOf(
      "function public.apply_plaid_sync_batch_v1",
    );
    const functionEnd = sql.indexOf("revoke all on function", functionStart);
    assert(functionStart >= 0 && functionEnd > functionStart);
    const body = sql.slice(functionStart, functionEnd);

    assertStringIncludes(body, "insert into public.expenses");
    assertStringIncludes(body, "update public.expenses e");
    assertStringIncludes(body, "deleted_reason = 'provider_removed'");
    assertStringIncludes(body, "update public.bank_connections");
    assertStringIncludes(body, "cursor = p_next_cursor");
    assertStringIncludes(body, "insert into public.plaid_sync_events");
    assertStringIncludes(body, "Plaid batch update target changed");
  },
);

Deno.test(
  "Plaid transfer suggestions never inspect merchant text",
  async () => {
    const sql = await Deno.readTextFile(migrationUrl);
    const functionStart = sql.indexOf(
      "function public.get_plaid_transfer_suggestions_v1",
    );
    assert(functionStart >= 0);
    const functionEnd = sql.indexOf("revoke all on function", functionStart);
    assert(functionEnd > functionStart);
    const body = sql.slice(functionStart, functionEnd);

    assert(!body.includes("merchant"));
    assert(!body.includes("raw_text"));
    assertStringIncludes(body, "abs(m.amount_cents) = abs(e.amount_cents)");
    assertStringIncludes(body, "abs(m.date - e.date) <= 3");
  },
);
