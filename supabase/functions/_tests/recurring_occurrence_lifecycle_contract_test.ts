/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260726130000_recurring_occurrence_lifecycle_rpcs.sql",
    import.meta.url,
  ),
);
const followUpMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260726200000_task14_recurring_lifecycle_fixes.sql",
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
const deleteExpenseFunction = await Deno.readTextFile(
  new URL("../delete-expense/index.ts", import.meta.url),
);
const deleteRecurringFunction = await Deno.readTextFile(
  new URL("../delete-recurring-template/index.ts", import.meta.url),
);
const householdDeployScript = await Deno.readTextFile(
  new URL("../../../deploy-households-functions.sh", import.meta.url),
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

Deno.test(
  "lifecycle RPCs are service-only and restore projections safely",
  () => {
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
  },
);

Deno.test(
  "lifecycle edge functions authenticate before invoking their RPC",
  () => {
    for (const source of [updateFunction, unconfirmFunction, listFunction]) {
      assertStringIncludes(source, "authenticateUserOrInternalSecret");
      assertStringIncludes(source, "SUPABASE_SERVICE_ROLE_KEY");
    }
    assertStringIncludes(updateFunction, "update_recurring_occurrence_v1");
    assertStringIncludes(
      unconfirmFunction,
      "unconfirm_recurring_occurrence_v1",
    );
    assertStringIncludes(listFunction, "list_recurring_occurrences_v1");
  },
);

Deno.test("locked notes edits retain the existing merchant", () => {
  assertStringIncludes(followUpMigration, "p_merchant is not null");
  assertStringIncludes(followUpMigration, "OCCURRENCE_SETTLEMENT_LOCKED");
});

Deno.test(
  "unconfirm restores a prior skip instead of reviving its projection",
  () => {
    assertStringIncludes(followUpMigration, "was_skipped_before_confirmation");
    assertStringIncludes(
      followUpMigration,
      "status = case when v_occurrence.was_skipped_before_confirmation then 'skipped' else 'pending' end",
    );
    assertStringIncludes(
      followUpMigration,
      "if not v_occurrence.was_skipped_before_confirmation then",
    );
  },
);

Deno.test(
  "skip conflicts with a confirmed occurrence and series deletion is soft",
  () => {
    assertStringIncludes(followUpMigration, "OCCURRENCE_CONFLICT");
    assertStringIncludes(deleteExpenseFunction, '.from("expenses")');
    assertStringIncludes(
      deleteExpenseFunction,
      'deleted_reason: "user_deleted"',
    );
  },
);

Deno.test(
  "recurring deletion keeps materialized templates available to lifecycle RPCs",
  () => {
    assertStringIncludes(
      deleteRecurringFunction,
      "authenticateUserOrInternalSecret",
    );
    assertStringIncludes(deleteRecurringFunction, "recurring_occurrences");
    assertStringIncludes(deleteRecurringFunction, "actual_transaction_id");
    assertStringIncludes(deleteRecurringFunction, "end_date");
    assertStringIncludes(deleteRecurringFunction, "privacy_scope");
    assertStringIncludes(
      deleteRecurringFunction,
      'template.user_id !== actorUserId && template.privacy_scope !== "full"',
    );
    assertStringIncludes(
      deleteRecurringFunction,
      'deleted_reason: "user_deleted"',
    );
  },
);

Deno.test("recurring template deletion is included in deployment", () => {
  assertStringIncludes(
    householdDeployScript,
    "supabase functions deploy delete-recurring-template",
  );
});
