import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  applyAiCaptureDefaults,
  parseAiCaptureDefaults,
} from "../shared/ai-capture-defaults.ts";
const captured = {
  version: 1,
  capturedAt: "2026-10-02T23:30:00.123456Z",
  date: "2026-10-03",
  currency: "JPY",
  preferredTimezone: "Asia/Tokyo",
};
Deno.test("deferred multilingual input keeps original date, currency and clock after profile changes", () => {
  const current = {
    date: "2026-10-06",
    currency: "EUR",
    preferredTimezone: "Europe/Dublin",
    text: "昨日、家族の財布から５０円",
    householdId: "space",
    userId: "owner",
  };
  const resolved = applyAiCaptureDefaults(
    current,
    parseAiCaptureDefaults(captured),
  );
  assertEquals(resolved.date, "2026-10-03");
  assertEquals(resolved.currency, "JPY");
  assertEquals(resolved.preferredTimezone, "Asia/Tokyo");
  assertEquals(resolved.householdId, "space");
  assertEquals(resolved.userId, "owner");
  assertEquals(current.currency, "EUR");
});
Deno.test("ordinary analysis without a capture retains current defaults", () => {
  const body = { currency: "EUR", preferredTimezone: "Europe/Dublin" };
  assertEquals(
    applyAiCaptureDefaults(body, parseAiCaptureDefaults(undefined)),
    body,
  );
});
Deno.test("canonical fixed offsets and absent capture timezone retain their clock semantics", () => {
  assertEquals(
    parseAiCaptureDefaults({ ...captured, preferredTimezone: "+05:30" })
      ?.preferredTimezone,
    "UTC+05:30",
  );
  assertEquals(
    applyAiCaptureDefaults(
      { preferredTimezone: "Europe/Dublin" },
      parseAiCaptureDefaults({ ...captured, preferredTimezone: null }),
    ).preferredTimezone,
    undefined,
  );
});
Deno.test("invalid normalized capture contracts cannot silently override defaults", () => {
  for (
    const value of [
      [],
      { ...captured, version: 2 },
      { ...captured, currency: "ZZZ" },
      { ...captured, currency: "jpy" },
      { ...captured, date: "2026-02-30" },
      { ...captured, date: "03/10/2026" },
      { ...captured, capturedAt: "yesterday" },
      { ...captured, preferredTimezone: "invalid/zone" },
      { ...captured, preferredTimezone: "UTC+14:30" },
      { ...captured, preferredTimezone: "UTC+00:60" },
      { ...captured, preferredTimezone: {} },
    ]
  ) {
    assertThrows(() => parseAiCaptureDefaults(value));
  }
});
