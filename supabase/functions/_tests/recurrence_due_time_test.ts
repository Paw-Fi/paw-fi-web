import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeRecurrenceDueTime } from "../shared/recurrence-due-time.ts";

Deno.test("normalizes a recurrence due time to canonical HH:mm:ss", () => {
  assertEquals(normalizeRecurrenceDueTime("09:05"), "09:05:00");
  assertEquals(normalizeRecurrenceDueTime("23:59:58"), "23:59:58");
});

Deno.test("rejects invalid recurrence due times", () => {
  assertEquals(normalizeRecurrenceDueTime("24:00:00"), null);
  assertEquals(normalizeRecurrenceDueTime("09:60"), null);
  assertEquals(normalizeRecurrenceDueTime(900), null);
});
