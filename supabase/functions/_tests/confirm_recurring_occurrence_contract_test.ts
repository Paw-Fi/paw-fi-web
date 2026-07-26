/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260726120000_recurring_occurrence_rpcs.sql",
    import.meta.url,
  ),
);
const functionSource = await Deno.readTextFile(
  new URL("../confirm-recurring-occurrence/index.ts", import.meta.url),
);

Deno.test("recurring confirmation remains a service-only atomic RPC", () => {
  assertStringIncludes(migration, "security definer");
  assertStringIncludes(migration, "set search_path = ''");
  assertStringIncludes(
    migration,
    "revoke all on function public.confirm_recurring_occurrence_v1",
  );
  assertStringIncludes(migration, "to service_role");
  assertStringIncludes(migration, "for update");
  assertStringIncludes(migration, "OCCURRENCE_CONFLICT");
  assertStringIncludes(migration, "OCCURRENCE_PAID_DATE_IN_FUTURE");
  assertStringIncludes(migration, "recurring_transaction_reminders_sent");
});

Deno.test("confirmation edge function authenticates and normalizes request values", () => {
  assertStringIncludes(functionSource, "authenticateUserOrInternalSecret");
  assertStringIncludes(functionSource, "normalizeCalendarDateString");
  assertStringIncludes(functionSource, "confirm_recurring_occurrence_v1");
  assertStringIncludes(functionSource, "Math.round");
});
