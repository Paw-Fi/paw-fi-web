/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  calculatePocketRolloverBreakdownCents,
  calculatePocketRolloverContributionLedger,
  resolvePocketPercentageForUpsert,
  upsertEnvelope,
} from "../shared/budgets-helpers.ts";

function rolloverMonth(
  periodMonth: string,
  overrides: Partial<
    Parameters<
      typeof calculatePocketRolloverContributionLedger
    >[0]["months"][number]
  > = {},
) {
  return {
    periodMonth,
    baseBudgetCents: 10000,
    spentCents: 0,
    rolloverEnabled: true,
    rolloverNegative: false,
    rolloverCapCents: null,
    openingRolloverCents: 0,
    ...overrides,
  };
}

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

Deno.test(
  "calculatePocketRolloverBreakdownCents leaves disabled budgets unchanged",
  () => {
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
  },
);

Deno.test(
  "calculatePocketRolloverBreakdownCents keeps disabled overspend as negative remaining only",
  () => {
    const breakdown = calculatePocketRolloverBreakdownCents({
      baseBudgetCents: 40000,
      incomingRolloverCents: 12500,
      openingRolloverCents: 0,
      spentCents: 45000,
      rolloverEnabled: false,
      rolloverNegative: false,
      rolloverCapCents: null,
    });

    assertEquals(breakdown.availableBudgetCents, 40000);
    assertEquals(breakdown.remainingCents, -5000);
    assertEquals(breakdown.carryToNextPeriodCents, 0);
  },
);

Deno.test(
  "calculatePocketRolloverBreakdownCents chains positive rollover",
  () => {
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
  },
);

Deno.test(
  "calculatePocketRolloverBreakdownCents carries overspending only when enabled",
  () => {
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
  },
);

Deno.test(
  "calculatePocketRolloverBreakdownCents caps outgoing carry, not current availability",
  () => {
    const breakdown = calculatePocketRolloverBreakdownCents({
      baseBudgetCents: 40000,
      incomingRolloverCents: 70000,
      openingRolloverCents: 25000,
      spentCents: 10000,
      rolloverEnabled: true,
      rolloverNegative: false,
      rolloverCapCents: 50000,
    });

    assertEquals(breakdown.rolloverFromPreviousCents, 70000);
    assertEquals(breakdown.availableBudgetCents, 135000);
    assertEquals(breakdown.carryToNextPeriodCents, 50000);
  },
);

Deno.test(
  "upsertEnvelope fallback preserves lineage beyond the old 50 row window",
  async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    const lineageRows = [
      ...Array.from({ length: 50 }, (_, index) => ({
        name: `Other ${index}`,
        rollover_group_id: `00000000-0000-0000-0000-${
          index
            .toString()
            .padStart(12, "0")
        }`,
        rollover_enabled: false,
        rollover_negative: false,
        rollover_cap_cents: null,
      })),
      {
        name: " Food ",
        rollover_group_id: "11111111-1111-1111-1111-111111111111",
        rollover_enabled: true,
        rollover_negative: true,
        rollover_cap_cents: 50000,
      },
    ];

    const lineageQuery = {
      _limit: null as number | null,
      select() {
        return this;
      },
      eq() {
        return this;
      },
      ilike() {
        return this;
      },
      is() {
        return this;
      },
      order() {
        return this;
      },
      limit(value: number) {
        this._limit = value;
        return this;
      },
      then(resolve: (value: unknown) => void) {
        resolve({
          data: this._limit == null
            ? lineageRows
            : lineageRows.slice(0, this._limit),
          error: null,
        });
      },
    };
    const supabase = {
      rpc() {
        return {
          maybeSingle: () =>
            Promise.resolve({
              data: null,
              error: {
                code: "PGRST202",
                message:
                  "Could not find the function resolve_budget_envelope_rollover_lineage_v1",
              },
            }),
        };
      },
      from(table: string) {
        if (table !== "budget_envelopes") {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          select: lineageQuery.select.bind(lineageQuery),
          upsert(payload: Record<string, unknown>) {
            capturedPayload = payload;
            return {
              select() {
                return {
                  maybeSingle: () =>
                    Promise.resolve({ data: { id: "env-1" }, error: null }),
                };
              },
            };
          },
        };
      },
    } as unknown as Parameters<typeof upsertEnvelope>[0];

    await upsertEnvelope(
      supabase,
      "budget-1",
      "22222222-2222-2222-2222-222222222222",
      null,
      "food",
      40,
      "EUR",
      100000,
    );

    const payload = capturedPayload as unknown as Record<string, unknown>;
    assertEquals(
      payload["rollover_group_id"],
      "11111111-1111-1111-1111-111111111111",
    );
    assertEquals(payload["rollover_enabled"], true);
    assertEquals(payload["rollover_negative"], true);
    assertEquals(payload["rollover_cap_cents"], 50000);
  },
);

Deno.test("rollover contribution ledger explains a one-month carry", () => {
  const breakdown = calculatePocketRolloverContributionLedger({
    selectedPeriodMonth: "2026-02-01",
    months: [
      rolloverMonth("2026-01-01", { spentCents: 7600 }),
      rolloverMonth("2026-02-01", { spentCents: 0 }),
    ],
  });

  assertEquals(breakdown.totalIncomingRolloverCents, 2400);
  assertEquals(breakdown.contributions[0].sourceType, "month_surplus");
  assertEquals(breakdown.contributions[0].sourcePeriodMonth, "2026-01-01");
  assertEquals(breakdown.contributions[0].amountCents, 2400);
  assertEquals(breakdown.monthlyHistory[1].incomingRolloverCents, 2400);
});

Deno.test(
  "rollover contribution ledger keeps long lifetime carry provenance",
  () => {
    const months = Array.from({ length: 61 }, (_, index) => {
      const date = new Date(Date.UTC(2021, index, 1));
      return rolloverMonth(date.toISOString().slice(0, 10), {
        baseBudgetCents: 100,
        spentCents: 0,
      });
    });

    const breakdown = calculatePocketRolloverContributionLedger({
      selectedPeriodMonth: months[60].periodMonth,
      months,
    });

    assertEquals(breakdown.totalIncomingRolloverCents, 6000);
    assertEquals(breakdown.contributions[0].sourcePeriodMonth, "2021-01-01");
    assertEquals(breakdown.contributions[0].amountCents, 100);
    assertEquals(breakdown.contributions.length, 60);
  },
);

Deno.test(
  "rollover contribution ledger includes opening rollover and monthly leftovers",
  () => {
    const breakdown = calculatePocketRolloverContributionLedger({
      selectedPeriodMonth: "2026-04-01",
      months: [
        rolloverMonth("2026-01-01", {
          baseBudgetCents: 0,
          openingRolloverCents: 10000,
        }),
        rolloverMonth("2026-02-01", { baseBudgetCents: 2400 }),
        rolloverMonth("2026-03-01", { baseBudgetCents: 30000 }),
        rolloverMonth("2026-04-01", { baseBudgetCents: 10000 }),
      ],
    });

    assertEquals(breakdown.totalIncomingRolloverCents, 42400);
    assertEquals(
      breakdown.contributions.map((contribution) => contribution.amountCents),
      [10000, 2400, 30000],
    );
    assertEquals(breakdown.contributions[0].sourceType, "opening");
  },
);

Deno.test("rollover contribution ledger records cap trimming", () => {
  const breakdown = calculatePocketRolloverContributionLedger({
    selectedPeriodMonth: "2026-02-01",
    months: [
      rolloverMonth("2026-01-01", {
        baseBudgetCents: 10000,
        rolloverCapCents: 5000,
      }),
      rolloverMonth("2026-02-01"),
    ],
  });

  assertEquals(breakdown.totalIncomingRolloverCents, 5000);
  assertEquals(breakdown.monthlyHistory[0].capAppliedCents, 5000);
  assertEquals(
    breakdown.contributions.some(
      (row) => row.sourceType === "cap_adjustment" && row.amountCents === -5000,
    ),
    true,
  );
});

Deno.test(
  "rollover contribution ledger floors disabled negative rollover",
  () => {
    const breakdown = calculatePocketRolloverContributionLedger({
      selectedPeriodMonth: "2026-02-01",
      months: [
        rolloverMonth("2026-01-01", { spentCents: 12500 }),
        rolloverMonth("2026-02-01"),
      ],
    });

    assertEquals(breakdown.totalIncomingRolloverCents, 0);
    assertEquals(breakdown.monthlyHistory[0].negativeDroppedCents, 2500);
    assertEquals(
      breakdown.contributions.some(
        (row) =>
          row.sourceType === "negative_dropped" && row.amountCents === -2500,
      ),
      true,
    );
  },
);

Deno.test("rollover contribution ledger carries deficits when enabled", () => {
  const breakdown = calculatePocketRolloverContributionLedger({
    selectedPeriodMonth: "2026-02-01",
    months: [
      rolloverMonth("2026-01-01", {
        spentCents: 12500,
        rolloverNegative: true,
      }),
      rolloverMonth("2026-02-01", { rolloverNegative: true }),
    ],
  });

  assertEquals(breakdown.totalIncomingRolloverCents, -2500);
  assertEquals(breakdown.contributions[0].sourceType, "month_deficit");
  assertEquals(breakdown.contributions[0].amountCents, -2500);
});

Deno.test(
  "rollover contribution ledger resets when rollover is disabled",
  () => {
    const breakdown = calculatePocketRolloverContributionLedger({
      selectedPeriodMonth: "2026-03-01",
      months: [
        rolloverMonth("2026-01-01", { baseBudgetCents: 10000 }),
        rolloverMonth("2026-02-01", { rolloverEnabled: false }),
        rolloverMonth("2026-03-01"),
      ],
    });

    assertEquals(breakdown.totalIncomingRolloverCents, 0);
    assertEquals(
      breakdown.contributions.some((row) => row.sourceType === "reset"),
      true,
    );
  },
);

Deno.test("rollover contribution ledger warns about missing months", () => {
  const breakdown = calculatePocketRolloverContributionLedger({
    selectedPeriodMonth: "2026-04-01",
    months: [
      rolloverMonth("2026-01-01"),
      rolloverMonth("2026-03-01"),
      rolloverMonth("2026-04-01"),
    ],
  });

  assertEquals(breakdown.warnings.length, 1);
  assertEquals(
    breakdown.warnings[0],
    "Missing rollover month between 2026-01-01 and 2026-03-01",
  );
});
