/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260716230000_plaid_analytics_classification.sql",
    import.meta.url,
  ),
);
const constraintsMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260716233000_plaid_analytics_constraints.sql",
    import.meta.url,
  ),
);

Deno.test(
  "Plaid analytics migration persists provider classification fields",
  () => {
    for (const field of [
      "provider_pfc_primary",
      "provider_pfc_detailed",
      "provider_pfc_confidence",
      "provider_pfc_version",
      "provider_transaction_code",
      "provider_pending",
      "analytics_class",
      "analytics_is_final",
      "analytics_spending_multiplier",
      "analytics_counts_toward_income",
      "classification_source",
      "classification_version",
    ]) {
      assertStringIncludes(migration, field);
    }
  },
);

Deno.test(
  "Plaid analytics migration enforces classification on database writes",
  () => {
    assertStringIncludes(migration, "classify_plaid_transaction_v1");
    assertStringIncludes(migration, "set_expense_analytics_classification_v1");
    assertStringIncludes(constraintsMigration, "before insert or update");
    assertStringIncludes(
      constraintsMigration,
      "alter column analytics_is_final set not null",
    );
    assertStringIncludes(migration, "classification_source = 'user_override'");
  },
);

Deno.test(
  "Plaid analytics summary excludes deleted and non-final money movement",
  () => {
    assertStringIncludes(migration, "get_user_transactions_summary_v2");
    assertStringIncludes(migration, "e.deleted_at is null");
    assertStringIncludes(migration, "analytics_spending_multiplier");
    assertStringIncludes(migration, "analytics_counts_toward_income");
  },
);

Deno.test("Plaid analytics migration supports explicit owner overrides", () => {
  assertStringIncludes(migration, "set_transaction_analytics_override_v1");
  assertStringIncludes(migration, "auth.uid() <> p_user_id");
  assertStringIncludes(migration, "classification_source = 'user_override'");
});
