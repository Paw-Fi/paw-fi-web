import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  calculatePocketRolloverBreakdownCents,
  resolvePocketPercentageForUpsert,
} from "../shared/budgets-helpers.ts";

Deno.test(
  "resolvePocketPercentageForUpsert keeps existing percentage when omitted",
  () => {
    const resolved = resolvePocketPercentageForUpsert({
      hasPercentageArg: false,
      providedPercentage: undefined,
      existingPercentage: 42,
    });

    assertEquals(resolved.error, null);
    assertEquals(resolved.percentage, 42);
    assertEquals(resolved.usedExistingPercentage, true);
  },
);

Deno.test(
  "resolvePocketPercentageForUpsert requires percentage for new pocket",
  () => {
    const resolved = resolvePocketPercentageForUpsert({
      hasPercentageArg: false,
      providedPercentage: undefined,
      existingPercentage: null,
    });

    assertEquals(resolved.error, "percentage is required");
    assertEquals(resolved.percentage, null);
    assertEquals(resolved.usedExistingPercentage, false);
  },
);

Deno.test("resolvePocketPercentageForUpsert allows explicit zero", () => {
  const resolved = resolvePocketPercentageForUpsert({
    hasPercentageArg: true,
    providedPercentage: 0,
    existingPercentage: 35,
  });

  assertEquals(resolved.error, null);
  assertEquals(resolved.percentage, 0);
  assertEquals(resolved.usedExistingPercentage, false);
});

Deno.test(
  "resolvePocketPercentageForUpsert rejects explicit invalid percentage",
  () => {
    const resolved = resolvePocketPercentageForUpsert({
      hasPercentageArg: true,
      providedPercentage: "not-a-number",
      existingPercentage: 25,
    });

    assertEquals(resolved.error, "Pocket percentage must be a valid number");
    assertEquals(resolved.percentage, null);
    assertEquals(resolved.usedExistingPercentage, false);
  },
);

Deno.test("calculatePocketRolloverBreakdownCents leaves disabled budgets unchanged", () => {
  const breakdown = calculatePocketRolloverBreakdownCents({
    baseBudgetCents: 40000,
    incomingRolloverCents: 12500,
    openingRolloverCents: 0,
    spentCents: 12000,
    rolloverEnabled: false,
    rolloverNegative: false,
    rolloverCapCents: null,
  });

  assertEquals(breakdown.rolloverFromPreviousCents, 0);
  assertEquals(breakdown.availableBudgetCents, 40000);
  assertEquals(breakdown.remainingCents, 28000);
  assertEquals(breakdown.carryToNextPeriodCents, 0);
});

Deno.test("calculatePocketRolloverBreakdownCents chains positive rollover", () => {
  const january = calculatePocketRolloverBreakdownCents({
    baseBudgetCents: 40000,
    incomingRolloverCents: 0,
    openingRolloverCents: 0,
    spentCents: 35000,
    rolloverEnabled: true,
    rolloverNegative: false,
    rolloverCapCents: null,
  });
  const february = calculatePocketRolloverBreakdownCents({
    baseBudgetCents: 40000,
    incomingRolloverCents: january.carryToNextPeriodCents,
    openingRolloverCents: 0,
    spentCents: 30000,
    rolloverEnabled: true,
    rolloverNegative: false,
    rolloverCapCents: null,
  });

  assertEquals(january.carryToNextPeriodCents, 5000);
  assertEquals(february.availableBudgetCents, 45000);
  assertEquals(february.carryToNextPeriodCents, 15000);
});

Deno.test("calculatePocketRolloverBreakdownCents carries overspending only when enabled", () => {
  const ignored = calculatePocketRolloverBreakdownCents({
    baseBudgetCents: 40000,
    incomingRolloverCents: 0,
    openingRolloverCents: 0,
    spentCents: 45000,
    rolloverEnabled: true,
    rolloverNegative: false,
    rolloverCapCents: null,
  });
  const carried = calculatePocketRolloverBreakdownCents({
    baseBudgetCents: 40000,
    incomingRolloverCents: 0,
    openingRolloverCents: 0,
    spentCents: 45000,
    rolloverEnabled: true,
    rolloverNegative: true,
    rolloverCapCents: null,
  });

  assertEquals(ignored.carryToNextPeriodCents, 0);
  assertEquals(carried.carryToNextPeriodCents, -5000);
});
