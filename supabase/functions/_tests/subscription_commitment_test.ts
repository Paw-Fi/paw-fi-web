/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  addAnnualCommitment,
  commitmentCancellationParams,
  isCommitmentActive,
  resolveCommitmentEnd,
} from "../shared/subscription-commitment.ts";

Deno.test("annual commitment preserves the calendar renewal date", () => {
  const start = Date.parse("2027-02-28T12:00:00.000Z") / 1000;
  assertEquals(addAnnualCommitment(start), "2028-02-28T12:00:00.000Z");
});

Deno.test("an uncanceled commitment rolls into the next 12-month term", () => {
  assertEquals(
    resolveCommitmentEnd({
      previousCommitmentEnd: "2027-07-01T00:00:00.000Z",
      subscriptionStartUnixSeconds: Date.parse("2026-07-01T00:00:00.000Z") /
        1000,
      now: new Date("2027-07-02T00:00:00.000Z"),
    }),
    "2028-07-01T00:00:00.000Z",
  );
});

Deno.test("commitment cancellation targets the commitment end", () => {
  const commitmentEnd = "2027-07-22T00:00:00.000Z";
  assertEquals(commitmentCancellationParams(commitmentEnd), {
    cancel_at: Date.parse(commitmentEnd) / 1000,
    cancel_at_period_end: false,
  });
  assertFalse(
    isCommitmentActive(commitmentEnd, new Date("2027-07-22T00:00:00.000Z")),
  );
});
