/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateRecurringReminder } from "../shared/recurring-reminder.ts";

Deno.test("legacy and explicit once reminders remain valid", () => {
  for (const mode of [undefined, "once"]) {
    assertEquals(
      validateRecurringReminder({
        reminder: { enabled: true, value: 3, unit: "days", mode },
      }),
      null,
    );
  }
});

Deno.test("daily reminders require one to 31 calendar days", () => {
  assertEquals(
    validateRecurringReminder({
      reminder: {
        enabled: true,
        value: 7,
        unit: "days",
        mode: "daily_until_due",
      },
    }),
    null,
  );

  for (
    const [value, unit] of [
      [0, "days"],
      [32, "days"],
      [7, "hours"],
    ]
  ) {
    assertMatch(
      validateRecurringReminder({
        reminder: {
          enabled: true,
          value,
          unit,
          mode: "daily_until_due",
        },
      }) ?? "",
      /1 to 31 days/,
    );
  }
});

Deno.test("unknown reminder modes are rejected", () => {
  assertMatch(
    validateRecurringReminder({
      reminder: {
        enabled: true,
        value: 3,
        unit: "days",
        mode: "weekly",
      },
    }) ?? "",
    /once or daily_until_due/,
  );
});
