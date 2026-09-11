/// <reference lib="deno.ns" />

import { calculateNextMonthCarryCents } from "../generate-pocket-month-review/rollover.ts";

const functionSource = await Deno.readTextFile(
  new URL("../generate-pocket-month-review/index.ts", import.meta.url),
);
const emptyMonthActualsMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260910103000_pockets_actuals_without_envelopes.sql",
    import.meta.url,
  ),
);

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test(
  "pocket month review provides personal aggregate context without transaction descriptions",
  () => {
    for (
      const requiredContext of [
        '"actual_expenses"',
        '"projected_recurring_expenses"',
        "category_links",
        "actual_spend_cents",
        "projected_recurring_cents",
        "unassigned_spending",
        "total_added_to_pockets_cents",
        "unallocated_budget_cents",
        "category_spending",
        "current_cycle",
        "previous_cycle",
        "historical_cycles",
        "pocket_id",
        "incoming_carry_cents",
        "rollover_cap_cents",
        "opening_rollover_cents",
        "rollover_from_previous_cents",
      ]
    ) {
      assert(
        functionSource.includes(requiredContext),
        `Missing AI planning context: ${requiredContext}`,
      );
    }
    assert(
      functionSource.includes(
        "Never describe future projected expenses as money already spent.",
      ),
      "The prompt must distinguish planned recurring expenses from actual spending",
    );
    assert(
      functionSource.includes("current_added_cents starts at zero") &&
        functionSource.includes("previous_cycle inside that pocket") &&
        functionSource.includes("...currentCycle,") &&
        functionSource.includes("pockets: plan.pockets"),
      "An empty current month must keep this month's values separate from the historical pocket baseline",
    );
    assert(
      functionSource.includes(
        "No merchant names or transaction descriptions are supplied.",
      ),
      "The prompt must document the privacy boundary",
    );
    assert(
      functionSource.includes("aiPocketMonthReviewSchema.safeParse(value)"),
      "AI response content must pass Zod validation before it reaches the app",
    );
    assert(
      functionSource.includes(
        "Write every natural-language response field in",
      ) && functionSource.includes("Do not mix languages."),
      "The prompt must require one requested locale for all AI-written content",
    );
    assert(
      functionSource.includes("input.locale ??") &&
        functionSource.includes("locale: string | null"),
      "The endpoint must prefer the active application locale over a profile fallback",
    );
    assert(
      !functionSource.includes("function fallback(") &&
        !functionSource.includes("deterministicFallback"),
      "The endpoint must not return fixed-language fallback coaching copy",
    );
    assert(
      !functionSource.includes("raw_text"),
      "Pocket month review must not pass transaction descriptions to the model",
    );
    assert(
      functionSource.includes("daysInPreviousMonth") &&
        functionSource.includes("Math.min(day, daysInPreviousMonth)"),
      "The previous-cycle lookup must handle financial cycles starting on the 29th through 31st",
    );
    assert(
      functionSource.includes("suggested_total_budget_cents") &&
        functionSource.includes("suggestedTotalBudgetCents !== total"),
      "The response must reject a monthly recommendation that does not exactly match the pocket amounts",
    );
    assert(
      functionSource.includes("for (let index = 0; index < 3; index++)") &&
        functionSource.includes(
          "historical_cycles contains up to three completed financial cycles",
        ),
      "The monthly recommendation must receive a three-cycle trend context",
    );
  },
);

Deno.test(
  "financial pocket context includes confirmed spending before the first pocket is created",
  () => {
    assert(
      !emptyMonthActualsMigration.includes(
        "JSONB_ARRAY_LENGTH(COALESCE(v_payload -> 'envelopes'",
      ),
      "Confirmed spending must not depend on current-month envelope rows",
    );
    assert(
      emptyMonthActualsMigration.includes("e.analytics_is_final IS TRUE") &&
        emptyMonthActualsMigration.includes(
          "e.analytics_spending_multiplier <> 0",
        ) &&
        emptyMonthActualsMigration.includes("e.privacy_scope"),
      "The empty-month correction must retain canonical classification and household privacy filters",
    );
    assert(
      emptyMonthActualsMigration.includes("p_household_id UUID DEFAULT NULL") &&
        emptyMonthActualsMigration.includes(
          "p_include_projected_recurring BOOLEAN DEFAULT TRUE",
        ) &&
        emptyMonthActualsMigration.includes("SET search_path = ''"),
      "The replacement must preserve the existing function signature defaults and hardened search path",
    );
  },
);

Deno.test("next-month carry follows rollover, negative, and cap rules", () => {
  assert(
    calculateNextMonthCarryCents({
      remainingCents: 46000,
      rolloverEnabled: true,
      rolloverNegative: false,
      rolloverCapCents: 15000,
    }) === 15000,
    "A positive carried balance must respect its rollover cap",
  );
  assert(
    calculateNextMonthCarryCents({
      remainingCents: -5000,
      rolloverEnabled: true,
      rolloverNegative: false,
    }) === 0,
    "A negative balance must not carry when negative rollover is disabled",
  );
  assert(
    calculateNextMonthCarryCents({
      remainingCents: -5000,
      rolloverEnabled: true,
      rolloverNegative: true,
    }) === -5000,
    "A negative balance must carry when the user enabled negative rollover",
  );
  assert(
    calculateNextMonthCarryCents({
      remainingCents: 15000,
      rolloverEnabled: false,
      rolloverNegative: false,
    }) === 0,
    "A pocket with rollover disabled must not carry a balance forward",
  );
});
