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
    assertStringIncludes(body, "lock_token = p_lock_token");
    assertStringIncludes(body, "locked_until > v_now");
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

Deno.test("bank sync locks require service role and owner tokens", async () => {
  const sql = await Deno.readTextFile(migrationUrl);

  assertStringIncludes(sql, "add column if not exists lock_token uuid");
  assertStringIncludes(sql, "function public.acquire_bank_sync_lock_v2");
  assertStringIncludes(sql, "function public.extend_bank_sync_lock_v2");
  assertStringIncludes(sql, "function public.release_bank_sync_lock_v2");
  assertStringIncludes(sql, "and lock_token = p_lock_token");
  assertStringIncludes(sql, "from public, anon, authenticated");
  assertStringIncludes(sql, "to service_role");
});

Deno.test("review pagination uses a stable keyset cursor", async () => {
  const sql = await Deno.readTextFile(migrationUrl);
  const functionStart = sql.indexOf(
    "function public.get_plaid_sync_review_transactions_v2",
  );
  assert(functionStart >= 0);
  const body = sql.slice(functionStart);

  assertStringIncludes(body, "p_cursor_date date");
  assertStringIncludes(body, "p_cursor_created_at timestamptz");
  assertStringIncludes(body, "p_cursor_id uuid");
  assertStringIncludes(body, "rows.date, rows.created_at, rows.id");
  assertStringIncludes(body, "'has_more'");
  assertStringIncludes(body, "'next_cursor'");
});

Deno.test("balances-only household rows are totals only", async () => {
  const analyticsMigration = await Deno.readTextFile(
    new URL(
      "../../migrations/20260716230000_plaid_analytics_classification.sql",
      import.meta.url,
    ),
  );

  for (const functionName of [
    "get_user_transactions_page_v2",
    "get_dashboard_recent_transactions_v1",
    "get_dashboard_calendar_transactions_v1",
  ]) {
    const functionStart = analyticsMigration.indexOf(
      `function public.${functionName}`,
    );
    assert(functionStart >= 0);
    const functionEnd = analyticsMigration.indexOf("$$;", functionStart);
    const body = analyticsMigration.slice(functionStart, functionEnd);
    assertStringIncludes(body, "and not (p_household_id is not null");
    assertStringIncludes(body, "e.privacy_scope = 'balances_only'");
  }
});
