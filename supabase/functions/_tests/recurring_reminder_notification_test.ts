import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRecurringReminderNotification } from "../shared/recurring-reminder-notification.ts";

Deno.test(
  "overdue recurring notifications use gentle exact-occurrence routing",
  () => {
    const message = buildRecurringReminderNotification({
      expense_id: "series-1",
      occurrence_date: "2026-10-03",
      phase: "overdue",
    });

    assertEquals(message.title, "A quick recurring check-in");
    assertStringIncludes(message.body, "still needs confirmation");
    assertEquals(
      message.data.deep_link,
      "moneko://recurring/series-1?occurrence_date=2026-10-03",
    );
  },
);

Deno.test(
  "upcoming recurring notifications retain their existing message family",
  () => {
    const message = buildRecurringReminderNotification(
      {
        expense_id: "series-1",
        occurrence_date: "2099-01-02",
        type: "expense",
        category: "Rent",
        amount_cents: 1250,
        currency: "USD",
      },
      new Date("2099-01-01T00:00:00Z"),
    );

    assertEquals(message.title, "🔔 Upcoming Expense");
    assertStringIncludes(message.body, "Rent of $");
    assertStringIncludes(message.body, "tomorrow");
    assertEquals(message.data.occurrence_date, "2099-01-02");
  },
);
