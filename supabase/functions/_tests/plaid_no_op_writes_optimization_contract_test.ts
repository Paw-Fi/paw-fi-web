/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const phaseOneUrl = new URL(
  "../../migrations/20260722120000_optimize_plaid_transfer_reconciliation_set_based.sql",
  import.meta.url,
);
const phaseTwoUrl = new URL(
  "../../migrations/20260723120000_eliminate_plaid_sync_no_op_writes.sql",
  import.meta.url,
);
const historicalV2Url = new URL(
  "../../migrations/20260718160000_plaid_lifecycle_atomicity_followup.sql",
  import.meta.url,
);
const regressionTestUrl = new URL(
  "../../tests/plaid_transfer_reconciliation_tests.sql",
  import.meta.url,
);
const rollbackUrl = new URL(
  "../../verification/rollback_plaid_no_op_writes_phase_2.sql",
  import.meta.url,
);

function functionDefinition(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert(start >= 0, `${name} definition missing`);
  const end = sql.indexOf("\n$$;", start);
  assert(end > start, `${name} terminator missing`);
  return sql.slice(start, end + 4);
}

Deno.test("Phase 2 changes only v1 reconciliation writes and internal v2 legacy no-op upserts", async () => {
  const phaseOne = await Deno.readTextFile(phaseOneUrl);
  const phaseTwo = await Deno.readTextFile(phaseTwoUrl);
  const historicalV2 = await Deno.readTextFile(historicalV2Url);

  const oldV1 = functionDefinition(phaseOne, "apply_plaid_sync_batch_v1");
  const newV1 = functionDefinition(phaseTwo, "apply_plaid_sync_batch_v1");
  const oldReconciliationStart = oldV1.indexOf(
    "  update public.expenses e\n  set classification_source = case",
  );
  const oldReconciliationEnd = oldV1.indexOf(
    "  update public.bank_accounts",
    oldReconciliationStart,
  );
  const newReconciliationStart = newV1.indexOf(
    "  with candidate_expenses as materialized (",
  );
  const newReconciliationEnd = newV1.indexOf(
    "  update public.bank_accounts",
    newReconciliationStart,
  );
  assert(oldReconciliationStart > 0 && oldReconciliationEnd > 0);
  assert(newReconciliationStart > 0 && newReconciliationEnd > 0);
  assertEquals(
    oldV1.slice(0, oldReconciliationStart),
    newV1.slice(0, newReconciliationStart),
  );
  assertEquals(
    oldV1.slice(oldReconciliationEnd),
    newV1.slice(newReconciliationEnd),
  );

  const oldV2 = functionDefinition(historicalV2, "apply_plaid_sync_batch_v2");
  const newV2 = functionDefinition(
    phaseTwo,
    "apply_plaid_sync_batch_v2_legacy",
  );
  const normalizedNewV2 = newV2
    .replace(
      "create or replace function public.apply_plaid_sync_batch_v2_legacy(",
      "create or replace function public.apply_plaid_sync_batch_v2(",
    )
    .replace(
      /\n  where row\(\n    bank_accounts\.plaid_account_id,[\s\S]*?    excluded\.raw_provider_payload\n  \);/,
      ";",
    )
    .replace("\n    and status is distinct from 'inactive'", "")
    .replace(
      "\n  where bank_transaction_raw.payload is distinct from excluded.payload;",
      ";",
    );
  assertEquals(normalizedNewV2, oldV2);
});

Deno.test("Phase 2 deduplicates stable classification writes without weakening trigger repair semantics", async () => {
  const sql = (await Deno.readTextFile(phaseTwoUrl)).toLowerCase();
  const v1 = functionDefinition(sql, "apply_plaid_sync_batch_v1");

  assertStringIncludes(v1, "affected_expenses as materialized");
  assertStringIncludes(v1, "true as is_transfer_candidate");
  assertStringIncludes(v1, "false as is_transfer_candidate");
  assertStringIncludes(
    v1,
    "not exists (\n        select 1 from transfer_candidates",
  );
  assertStringIncludes(v1, ") is distinct from row(");
  assertStringIncludes(v1, "e.analytics_is_final");
  assertStringIncludes(v1, "e.classification_version");
  assertStringIncludes(v1, "e.provider_pfc_primary");
  assertStringIncludes(v1, "e.provider_pfc_detailed");
  assertStringIncludes(v1, "e.provider_pfc_confidence");
  assertStringIncludes(v1, "e.provider_transaction_code");
  assertStringIncludes(v1, "e.provider_pending");
  assertStringIncludes(v1, "jsonb_typeof(e.raw_provider_payload -> 'pending')");
  assertEquals(
    v1.match(/with candidate_expenses as materialized/g)?.length,
    1,
  );
});

Deno.test("Phase 2 skips only equivalent internal account and raw writes", async () => {
  const sql = (await Deno.readTextFile(phaseTwoUrl)).toLowerCase();
  const legacy = functionDefinition(sql, "apply_plaid_sync_batch_v2_legacy");

  assertStringIncludes(legacy, "on conflict (id) do update set");
  assertStringIncludes(
    legacy,
    "where row(\n    bank_accounts.plaid_account_id",
  );
  assertStringIncludes(legacy, "excluded.provider_balance_updated_at");
  assertStringIncludes(legacy, "excluded.raw_provider_payload");
  assertStringIncludes(legacy, "and status is distinct from 'inactive'");
  assertStringIncludes(
    legacy,
    "where bank_transaction_raw.payload is distinct from excluded.payload",
  );

  // Authoritative lifecycle writes and public response behavior remain intact.
  assertStringIncludes(legacy, "v_result := public.apply_plaid_sync_batch_v1(");
  assertStringIncludes(legacy, "last_sync_attempt_at = v_now");
  assertStringIncludes(legacy, "sync_status_updated_at', v_now");
  assertStringIncludes(legacy, "updated_at = v_now");
  assertStringIncludes(legacy, "return v_result || jsonb_build_object(");
  assertStringIncludes(legacy, "'is_ready', p_is_ready");
  assertStringIncludes(
    legacy,
    "'recurring_refresh_required', p_recurring_refresh_required",
  );
});

Deno.test("Phase 2 preserves ACL boundaries and contains no schema or index expansion", async () => {
  const sql = (await Deno.readTextFile(phaseTwoUrl)).toLowerCase();
  const outsideFunctions = sql.replace(
    /create or replace function[\s\S]*?\n\$\$;/g,
    "<function>",
  );

  assertEquals(sql.match(/create or replace function/g)?.length, 2);
  assert(
    !sql.includes(
      "create or replace function public.apply_plaid_sync_batch_v2(",
    ),
  );
  assertStringIncludes(sql, "set lock_timeout = '5s';");
  assertStringIncludes(sql, "set statement_timeout = '2min';");
  assertStringIncludes(sql, "reset statement_timeout;");
  assertStringIncludes(sql, "reset lock_timeout;");
  assertEquals(
    sql.match(/from public, anon, authenticated, service_role;/g)?.length,
    2,
  );
  assert(!outsideFunctions.includes("create table"));
  assert(!outsideFunctions.includes("alter table"));
  assert(!outsideFunctions.includes("create index"));
  assert(!outsideFunctions.includes("drop index"));
  assert(!outsideFunctions.includes("grant execute"));
});

Deno.test("Phase 2 rollback restores both preceding internal function bodies", async () => {
  const phaseOne = await Deno.readTextFile(phaseOneUrl);
  const historicalV2 = await Deno.readTextFile(historicalV2Url);
  const rollback = await Deno.readTextFile(rollbackUrl);

  assertEquals(
    functionDefinition(rollback, "apply_plaid_sync_batch_v1"),
    functionDefinition(phaseOne, "apply_plaid_sync_batch_v1"),
  );
  assertEquals(
    functionDefinition(rollback, "apply_plaid_sync_batch_v2_legacy").replace(
      "create or replace function public.apply_plaid_sync_batch_v2_legacy(",
      "create or replace function public.apply_plaid_sync_batch_v2(",
    ),
    functionDefinition(historicalV2, "apply_plaid_sync_batch_v2"),
  );
  assertEquals(
    rollback.toLowerCase().match(/create or replace function/g)?.length,
    2,
  );
  assertStringIncludes(rollback.toLowerCase(), "set lock_timeout = '5s';");
  assertStringIncludes(
    rollback.toLowerCase(),
    "set statement_timeout = '2min';",
  );
  assertStringIncludes(
    rollback.toLowerCase(),
    "from public, anon, authenticated, service_role;",
  );
  for (
    const forbidden of [
      "alter table",
      "create table",
      "create index",
      "drop index",
      "grant execute",
      "create extension",
    ]
  ) {
    assert(!rollback.toLowerCase().includes(forbidden));
  }
});

Deno.test("Phase 2 regression suite covers repeated equivalent reconciliation", async () => {
  const sql = await Deno.readTextFile(regressionTestUrl);
  assertStringIncludes(sql, "select plan(40);");
  assertStringIncludes(sql, "moneko.plaid_disposable_test_opt_in");
  assertStringIncludes(sql, "I_UNDERSTAND_THIS_MUST_BE_DISPOSABLE");
  assertStringIncludes(
    sql,
    "a repeated equivalent sync completes without changing the public contract",
  );
  assertStringIncludes(
    sql,
    "a repeated equivalent sync does not rewrite stable transfer classifications",
  );
  assertStringIncludes(
    sql,
    "a repeated identical account and raw payload completes normally",
  );
  assertStringIncludes(
    sql,
    "identical account, inactive status, and raw payload writes are skipped",
  );
  assertEquals(
    sql.match(/select pg_temp\.capture_plaid_transfer_tap\(/g)?.length,
    40,
  );
});
