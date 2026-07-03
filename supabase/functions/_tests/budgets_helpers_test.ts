/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  calculatePocketRolloverBreakdownCents,
  resolvePocketPercentageForUpsert,
  upsertEnvelope,
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
  "upsertEnvelope fallback preserves lineage beyond the old 50 row window",
  async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    const lineageRows = [
      ...Array.from({ length: 50 }, (_, index) => ({
        name: `Other ${index}`,
        rollover_group_id: `00000000-0000-0000-0000-${index.toString().padStart(12, "0")}`,
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
          data:
            this._limit == null
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
