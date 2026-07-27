import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { localDateTimeToUtcIso } from "../shared/timezone.ts";

Deno.test("timezone: converts a transaction-local time with an IANA timezone", () => {
  assertEquals(
    localDateTimeToUtcIso({
      date: "2026-07-27",
      time: "14:00:00",
      timeZone: "Asia/Singapore",
    }),
    "2026-07-27T06:00:00.000Z",
  );
});

Deno.test("timezone: applies daylight saving offsets for the transaction date", () => {
  assertEquals(
    localDateTimeToUtcIso({
      date: "2026-07-27",
      time: "14:00:00",
      timeZone: "America/New_York",
    }),
    "2026-07-27T18:00:00.000Z",
  );
});

Deno.test("timezone: supports stored UTC offset timezones", () => {
  assertEquals(
    localDateTimeToUtcIso({
      date: "2026-07-27",
      time: "14:00:00",
      timeZone: "UTC+08:00",
    }),
    "2026-07-27T06:00:00.000Z",
  );
});

Deno.test("timezone: rejects nonexistent DST local times instead of changing them", () => {
  assertEquals(
    localDateTimeToUtcIso({
      date: "2026-03-08",
      time: "02:30:00",
      timeZone: "America/New_York",
    }),
    null,
  );
});

Deno.test("timezone: rejects invalid timezone identifiers", () => {
  assertEquals(
    localDateTimeToUtcIso({
      date: "2026-07-27",
      time: "14:00:00",
      timeZone: "Not/A_Timezone",
    }),
    null,
  );
});
