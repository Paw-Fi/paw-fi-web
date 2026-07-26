/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260726130000_recurring_occurrence_lifecycle_rpcs.sql",
    import.meta.url,
  ),
);
const updateFunction = await Deno.readTextFile(
  new URL("../update-recurring-occurrence/index.ts", import.meta.url),
);
const unconfirmFunction = await Deno.readTextFile(
  new URL("../unconfirm-recurring-occurrence/index.ts", import.meta.url),
);
const listFunction = await Deno.readTextFile(
  new URL("../list-recurring-occurrences/index.ts", import.meta.url),
);

Deno.test("lifecycle RPCs hard-lock every settlement lineage reference", () => {
  assertStringIncludes(
    migration,
    "recurring_occurrence_has_settlement_activity_v1",
  );
  assertStringIncludes(migration, "household_settlement_event_allocations_v2");
  assertStringIncludes(migration, "household_settlement_cycle_baseline_lines");
  assertStringIncludes(
    migration,
    "household_settlement_legacy_cutover_lines_v3",
  );
  assertStringIncludes(migration, "settlement_ledger_seq is not null");
  assertStringIncludes(migration, "cycle_boundary_event_id is not null");
  assertStringIncludes(migration, "OCCURRENCE_SETTLEMENT_LOCKED");
});

Deno.test("lifecycle RPCs are service-only and restore projections safely", () => {
  assertStringIncludes(migration, "update_recurring_occurrence_v1");
  assertStringIncludes(migration, "unconfirm_recurring_occurrence_v1");
  assertStringIncludes(migration, "list_recurring_occurrences_v1");
  assertStringIncludes(
    migration,
    "deleted_reason = 'recurring_occurrence_unconfirmed'",
  );
  assertStringIncludes(migration, "'{excluded_dates}'");
  assertStringIncludes(
    migration,
    "grant execute on function public.unconfirm_recurring_occurrence_v1",
  );
});

Deno.test("lifecycle edge functions authenticate before invoking their RPC", () => {
  for (const source of [updateFunction, unconfirmFunction, listFunction]) {
    assertStringIncludes(source, "authenticateUserOrInternalSecret");
    assertStringIncludes(source, "SUPABASE_SERVICE_ROLE_KEY");
  }
  assertStringIncludes(updateFunction, "update_recurring_occurrence_v1");
  assertStringIncludes(unconfirmFunction, "unconfirm_recurring_occurrence_v1");
  assertStringIncludes(listFunction, "list_recurring_occurrences_v1");
});
