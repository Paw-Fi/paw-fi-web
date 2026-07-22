/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const historicalMigrationUrl = new URL(
  "../../migrations/20260717120000_plaid_atomic_sync_and_review.sql",
  import.meta.url,
);
const optimizedMigrationUrl = new URL(
  "../../migrations/20260722120000_optimize_plaid_transfer_reconciliation_set_based.sql",
  import.meta.url,
);
const lifecycleMigrationUrl = new URL(
  "../../migrations/20260718160000_plaid_lifecycle_atomicity_followup.sql",
  import.meta.url,
);
const wrapperMigrationUrl = new URL(
  "../../migrations/20260719143000_plaid_not_ready_atomic_wrapper.sql",
  import.meta.url,
);
const regressionTestUrl = new URL(
  "../../tests/plaid_transfer_reconciliation_tests.sql",
  import.meta.url,
);
const rollbackUrl = new URL(
  "../../verification/rollback_plaid_transfer_reconciliation_phase_1.sql",
  import.meta.url,
);
const monitoringUrl = new URL(
  "../../verification/plaid_disk_io_phase_0_1.sql",
  import.meta.url,
);
const stagingPlansUrl = new URL(
  "../../verification/plaid_transfer_reconciliation_staging_plans.sql",
  import.meta.url,
);

const v1Signature = `public.apply_plaid_sync_batch_v1(
  uuid,
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  text[],
  uuid[],
  uuid[],
  uuid,
  uuid
)`;

function functionBody(sql: string): string {
  const start = sql.indexOf(
    "create or replace function public.apply_plaid_sync_batch_v1(",
  );
  assert(start >= 0);
  const end = sql.indexOf("\n$$;", start);
  assert(end > start);
  return sql.slice(start, end + 4);
}

function withoutReconciliation(sql: string, optimized: boolean): string {
  const body = functionBody(sql);
  const start = body.indexOf(
    optimized
      ? "  with candidate_expenses as materialized ("
      : "  with transfer_candidates as (",
  );
  const end = body.indexOf(
    "  update public.expenses e\n  set analytics_class = 'unknown'",
    start,
  );
  assert(start >= 0 && end > start);
  return body.slice(0, start) + "  <reconciliation query>\n" + body.slice(end);
}

function outsideFunction(sql: string): string {
  return sql.replace(functionBody(sql), "<function replacement>");
}

Deno.test("Plaid reconciliation migration changes only the candidate query", async () => {
  const historical = await Deno.readTextFile(historicalMigrationUrl);
  const optimized = await Deno.readTextFile(optimizedMigrationUrl);

  assertEquals(
    withoutReconciliation(optimized, true),
    withoutReconciliation(historical, false),
  );
  assert(!optimized.includes("apply_plaid_sync_batch_v2("));
  assert(!optimized.toLowerCase().includes("drop index"));
  assert(!optimized.toLowerCase().includes("create index"));
  assert(!optimized.toLowerCase().includes("grant execute"));

  const outside = outsideFunction(optimized).toLowerCase();
  assertEquals(
    optimized.toLowerCase().match(/create or replace function/g)?.length,
    1,
  );
  for (
    const forbidden of [
      "alter table",
      "create table",
      "create index",
      "drop index",
      "insert into",
      "update public.",
      "delete from",
      "create extension",
    ]
  ) {
    assert(!outside.includes(forbidden), `migration contains ${forbidden}`);
  }
});

Deno.test("migration bounds replacement locks and defensively revokes v1", async () => {
  const sql = await Deno.readTextFile(optimizedMigrationUrl);
  const lower = sql.toLowerCase();
  const compact = lower.replace(/\s+/g, " ");
  const compactV1Signature = v1Signature.replace(/\s+/g, " ");

  assertStringIncludes(lower, "set lock_timeout = '5s';");
  assertStringIncludes(lower, "set statement_timeout = '2min';");
  assertStringIncludes(lower, "reset statement_timeout;");
  assertStringIncludes(lower, "reset lock_timeout;");
  assertStringIncludes(
    compact,
    `revoke all on function ${compactV1Signature} from public, anon, authenticated, service_role;`,
  );
  assertStringIncludes(
    lower,
    "internal implementation owned by apply_plaid_sync_batch_v2; direct worker execution is revoked.",
  );
  assert(!compact.includes(`grant execute on function ${compactV1Signature}`));
});

Deno.test("optimized reconciliation materializes, pairs, expands, and deduplicates once", async () => {
  const sql = await Deno.readTextFile(optimizedMigrationUrl);
  const body = functionBody(sql);

  for (
    const fragment of [
      "with candidate_expenses as materialized",
      "upper(coalesce(e.currency, '')) as normalized_currency",
      "abs(e.amount_cents) as absolute_amount_cents",
      "join candidate_expenses right_candidate",
      "left_candidate.id < right_candidate.id",
      "cross join lateral",
      "select distinct candidate_side.id",
      "candidate_side.classification_source <> 'user_override'",
      "where e.id in (select id from transfer_candidates)",
    ]
  ) {
    assertStringIncludes(body, fragment);
  }

  const reconciliationStart = body.indexOf(
    "  with candidate_expenses as materialized (",
  );
  const reconciliationEnd = body.indexOf(
    "  update public.bank_accounts",
    reconciliationStart,
  );
  const reconciliation = body.slice(reconciliationStart, reconciliationEnd);
  assertEquals(reconciliation.match(/from public\.expenses e/g)?.length, 1);
  assertEquals(
    reconciliation.match(/join candidate_expenses right_candidate/g)?.length,
    1,
  );
});

Deno.test("v2 worker ACL and internal wrapper chain remain authoritative", async () => {
  const lifecycle = (await Deno.readTextFile(lifecycleMigrationUrl))
    .toLowerCase();
  const wrapper = (await Deno.readTextFile(wrapperMigrationUrl)).toLowerCase();

  assertStringIncludes(
    lifecycle,
    "v_result := public.apply_plaid_sync_batch_v1(",
  );
  assertStringIncludes(
    lifecycle,
    "grant execute on function public.apply_plaid_sync_batch_v2(",
  );
  assertStringIncludes(lifecycle, "to service_role;");
  assertStringIncludes(
    wrapper,
    "return public.apply_plaid_sync_batch_v2_legacy(",
  );
  assertStringIncludes(
    wrapper,
    "grant execute on function public.apply_plaid_sync_batch_v2(",
  );
  assertStringIncludes(
    wrapper,
    "revoke all on function public.apply_plaid_sync_batch_v2_legacy(",
  );
});

Deno.test("function-only rollback exactly restores historical v1", async () => {
  const historical = await Deno.readTextFile(historicalMigrationUrl);
  const rollback = await Deno.readTextFile(rollbackUrl);
  const outside = outsideFunction(rollback).toLowerCase();

  assertEquals(functionBody(rollback), functionBody(historical));
  assertEquals(
    rollback.toLowerCase().match(/create or replace function/g)?.length,
    1,
  );
  assertStringIncludes(outside, "set lock_timeout = '5s';");
  assertStringIncludes(outside, "set statement_timeout = '2min';");
  assertStringIncludes(outside, "reset statement_timeout;");
  assertStringIncludes(outside, "reset lock_timeout;");
  assertStringIncludes(
    outside,
    `revoke all on function ${v1Signature}\nfrom public, anon, authenticated, service_role;`,
  );
  assertStringIncludes(outside, "never rerun 20260717120000");
  for (
    const forbidden of [
      "alter table",
      "create table",
      "create index",
      "drop index",
      "insert into",
      "update public.",
      "delete from",
      "grant execute",
      "create extension",
    ]
  ) {
    assert(!outside.includes(forbidden), `rollback contains ${forbidden}`);
  }
});

Deno.test("production monitoring and heavy plan verification are separated", async () => {
  const monitoring = (await Deno.readTextFile(monitoringUrl)).toLowerCase();
  const staging = (await Deno.readTextFile(stagingPlansUrl)).toLowerCase();

  assert(!monitoring.includes("explain ("));
  assert(!monitoring.includes("join candidate_expenses"));
  assertStringIncludes(staging, "never run on the production primary");
  assertStringIncludes(staging, "set local transaction_read_only = on;");
  assertStringIncludes(staging, "set local statement_timeout = '15s';");
  assertStringIncludes(staging, "set local lock_timeout = '2s';");
  assertStringIncludes(
    staging,
    "explicit staging plan verification opt-in is required",
  );
  assertStringIncludes(staging, "current_setting('moneko.plaid_plan_user_id')");
  assertEquals(staging.match(/explain \(analyze, buffers/g)?.length, 2);
  assertStringIncludes(staging, "exact_final_id_set_parity");
  assertStringIncludes(staging, "candidate_row_count");
  assertStringIncludes(staging, "matching_pair_row_count");
  assertStringIncludes(staging, "final_candidate_id_count");
  assert(!staging.includes("order by count(*) desc"));
  assertStringIncludes(staging, "rollback;");
});

Deno.test("SQL parity suite includes direct parity and every edge scenario", async () => {
  const sql = await Deno.readTextFile(regressionTestUrl);

  for (
    const scenario of [
      "legacy and optimized queries select identical sorted target UUID arrays",
      "same amount/currency, opposing type, different accounts, and same date match",
      "one-day offset matches",
      "two-day offset matches",
      "three-day offset matches",
      "four-day offset does not match",
      "different currencies do not match",
      "same bank account does not match",
      "different accounts with the same transaction type do not match",
      "NULL type versus non-NULL type preserves legacy IS DISTINCT FROM matching",
      "two NULL transaction types preserve legacy non-matching behavior",
      "different users do not match",
      "different households do not match",
      "two NULL household IDs preserve matching behavior",
      "one NULL and one non-NULL household do not match",
      "deleted transactions do not match",
      "non-final analytics rows do not match",
      "accounts outside processed account IDs do not match",
      "empty processed account IDs produce no transfer candidates",
      "a processed scope containing only one account cannot reconcile a transfer",
      "duplicated processed account IDs remain accepted by the current API",
      "the overridden side remains unchanged",
      "the non-overridden side of a pair changes",
      "both overridden sides remain unchanged",
      "multiple possible matches preserve the current final updated ID set",
      "each target ID is updated once even with multiple candidate pairs",
      "high-amplification amount/currency bucket produces the exact final target set",
      "high-amplification candidates are each updated only once",
      "existing possible-transfer rows are reset and reclassified identically on a later sync",
      "v1 execution remains revoked from all direct caller roles",
      "v2 remains callable by the authorized service worker role",
    ]
  ) {
    assertStringIncludes(sql, scenario);
  }
  assertStringIncludes(sql, "TEST ONLY");
  assertStringIncludes(sql, "Never run it\n-- against production");
  assertStringIncludes(sql, "with legacy_candidates as (");
  assertStringIncludes(sql, "optimized_candidate_expenses as materialized");
  assertStringIncludes(sql, "array_agg(id order by id)");
});
