/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const incomeSummary = await Deno.readTextFile(
  new URL("../income-summary/index.ts", import.meta.url),
);
const listIncome = await Deno.readTextFile(
  new URL("../list-income/index.ts", import.meta.url),
);
const scenarioPlanner = await Deno.readTextFile(
  new URL("../ai-scenario-planner/index.ts", import.meta.url),
);
const notificationWorker = await Deno.readTextFile(
  new URL("../households-process-notifications/index.ts", import.meta.url),
);
const exportCenter = await Deno.readTextFile(
  new URL("../premium-export-center/index.ts", import.meta.url),
);
const incomeMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260726180000_exclude_recurring_templates_from_income_summary.sql",
    import.meta.url,
  ),
);
const reminderMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260726190000_guard_resolved_recurring_reminder_events.sql",
    import.meta.url,
  ),
);

const actualOnlyFilter = "is_recurring.eq.false,is_recurring.is.null";

Deno.test(
  "Task 13: income, scenarios, and exports retain only actual rows",
  () => {
    for (
      const source of [
        incomeSummary,
        listIncome,
        scenarioPlanner,
        exportCenter,
      ]
    ) {
      assertStringIncludes(source, actualOnlyFilter);
    }
    assertStringIncludes(
      incomeMigration,
      "coalesce(expense.is_recurring, false) = false",
    );
  },
);

Deno.test(
  "Task 13: resolved reminder events are suppressed before insert",
  () => {
    assertStringIncludes(
      reminderMigration,
      "before insert on public.notification_events",
    );
    assertStringIncludes(
      reminderMigration,
      "status in ('confirmed', 'skipped')",
    );
    assertStringIncludes(reminderMigration, "return null");
  },
);

Deno.test("Task 13: delivery rechecks resolved reminders before push", () => {
  assertStringIncludes(
    notificationWorker,
    'event.event_type === "recurring_reminder"',
  );
  assertStringIncludes(notificationWorker, '.from("recurring_occurrences")');
  assertStringIncludes(
    notificationWorker,
    'error_message: "Recurring occurrence already resolved"',
  );
});
