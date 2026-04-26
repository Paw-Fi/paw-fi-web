/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { normalizeCalendarDateString } from "../shared/date-normalization.ts";

Deno.test("date normalization: preserves valid calendar dates", () => {
  assertEquals(normalizeCalendarDateString("2026-04-02"), "2026-04-02");
  assertEquals(
    normalizeCalendarDateString("2026-04-02T12:00:00.000Z"),
    "2026-04-02",
  );
  assertEquals(normalizeCalendarDateString("02/04/2026"), "2026-04-02");
  assertEquals(normalizeCalendarDateString("04/13/2026"), "2026-04-13");
});

Deno.test(
  "date normalization: rejects invalid numeric calendar dates instead of rolling them over",
  () => {
    assertEquals(normalizeCalendarDateString("2026-02-30"), null);
    assertEquals(normalizeCalendarDateString("2026-02-30T12:00:00Z"), null);
    assertEquals(normalizeCalendarDateString("2026/02/30"), null);
    assertEquals(normalizeCalendarDateString("30/02/2026"), null);
    assertEquals(normalizeCalendarDateString("02/30/2026"), null);
  },
);
