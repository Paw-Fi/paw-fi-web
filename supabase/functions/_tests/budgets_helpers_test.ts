import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { resolvePocketPercentageForUpsert } from "../shared/budgets-helpers.ts";

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
