/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildRecurrenceRuleForUpdate } from "../shared/bot/date-utils.ts";

Deno.test("recurring update moves anchor while preserving mobile recurrence settings", () => {
  const updated = buildRecurrenceRuleForUpdate(
    {
      frequency: "monthly",
      anchor_date: "2026-07-07",
    },
    {
      frequency: "monthly",
      anchor_date: "2026-01-01",
      projection_enabled: false,
      end_date: "2027-01-01",
      interval: 2,
      reminder: { enabled: true, value: 2, unit: "days" },
    },
    "2026-01-01",
  );

  assertEquals(updated, {
    frequency: "monthly",
    anchor_date: "2026-07-07",
    projection_enabled: false,
    end_date: "2027-01-01",
    interval: 2,
    reminder: { enabled: true, value: 2, unit: "days" },
  });
});

Deno.test("recurring update defaults projection for legacy rules", () => {
  assertEquals(
    buildRecurrenceRuleForUpdate(
      { frequency: "monthly", anchor_date: "2026-07-07" },
      null,
      "2026-07-07",
    ),
    {
      frequency: "monthly",
      anchor_date: "2026-07-07",
      projection_enabled: true,
    },
  );
});
