/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  addAnnualCommitment,
  isEarlyCommitmentTermination,
  resolveAnnualCommitmentSnapshot,
  resolveCommitmentEnd,
} from "../shared/subscription-commitment.ts";

Deno.test("annual commitment preserves the calendar renewal date", () => {
  const start = Date.parse("2027-02-28T12:00:00.000Z") / 1000;
  assertEquals(addAnnualCommitment(start), "2028-02-28T12:00:00.000Z");
});

Deno.test("annual commitment clamps leap day to the target month", () => {
  const start = Date.parse("2028-02-29T12:00:00.000Z") / 1000;
  assertEquals(addAnnualCommitment(start), "2029-02-28T12:00:00.000Z");
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

Deno.test("annual commitment snapshot preserves omitted App Store terms", () => {
  assertEquals(
    resolveAnnualCommitmentSnapshot({
      incomingMonths: null,
      incomingEnd: null,
      existingMonths: 12,
      existingEnd: "2027-07-22T00:00:00.000Z",
      sameSubscription: true,
      renews: false,
      subscriptionStartUnixSeconds: Date.parse("2026-07-22T00:00:00.000Z") /
        1000,
      now: new Date("2027-03-01T00:00:00.000Z"),
    }),
    { months: 12, end: "2027-07-22T00:00:00.000Z" },
  );
});

Deno.test("stale incoming commitment terms roll when renewal is authoritative", () => {
  assertEquals(
    resolveAnnualCommitmentSnapshot({
      incomingMonths: 12,
      incomingEnd: "2027-07-22T00:00:00.000Z",
      existingMonths: 12,
      existingEnd: "2027-07-22T00:00:00.000Z",
      sameSubscription: true,
      renews: true,
      subscriptionStartUnixSeconds: Date.parse("2026-07-22T00:00:00.000Z") /
        1000,
      now: new Date("2027-07-23T00:00:00.000Z"),
    }),
    { months: 12, end: "2028-07-22T00:00:00.000Z" },
  );
});

Deno.test("annual commitment snapshot rolls into a new term when renewed", () => {
  assertEquals(
    resolveAnnualCommitmentSnapshot({
      incomingMonths: null,
      incomingEnd: null,
      existingMonths: 12,
      existingEnd: "2027-07-22T00:00:00.000Z",
      sameSubscription: true,
      renews: true,
      subscriptionStartUnixSeconds: Date.parse("2026-07-22T00:00:00.000Z") /
        1000,
      now: new Date("2027-07-23T00:00:00.000Z"),
    }),
    { months: 12, end: "2028-07-22T00:00:00.000Z" },
  );
});

Deno.test("early commitment termination is detected before the term end", () => {
  assertEquals(
    isEarlyCommitmentTermination({
      commitmentMonths: 12,
      commitmentEnd: "2027-07-22T00:00:00.000Z",
      terminatedAt: new Date("2027-03-01T00:00:00.000Z"),
    }),
    true,
  );
  assertFalse(
    isEarlyCommitmentTermination({
      commitmentMonths: 12,
      commitmentEnd: "2027-07-22T00:00:00.000Z",
      terminatedAt: new Date("2027-07-22T00:00:00.000Z"),
    }),
  );
});
