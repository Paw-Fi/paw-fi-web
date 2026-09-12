/// <reference lib="deno.ns" />

import { calculateNextMonthCarryCents } from "../generate-pocket-month-review/rollover.ts";

const functionSource = await Deno.readTextFile(
  new URL("../generate-pocket-month-review/index.ts", import.meta.url),
);
const analysisSource = await Deno.readTextFile(
  new URL(
    "../generate-pocket-month-review/review-analysis.ts",
    import.meta.url,
  ),
);
const reviewSource = `${functionSource}\n${analysisSource}`;
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
        "actual_expenses",
        "projected_recurring_expenses",
        "category_links",
        "actual_spend_cents",
        "projected_recurring_cents",
        "unassigned_spending",
        "total_added_to_pockets_cents",
        "unallocated_budget_cents",
        "category_spending",
        "actual_transaction_count",
        "actual_active_day_count",
        "average_actual_transaction_cents",
        "largest_actual_transaction_cents",
        "largest_actual_transaction_share_bps",
        "projected_recurring_count",
        "history_analysis",
        "cash_flow",
        "recorded_income_cents",
        "projected_recurring_income_cents",
        "income_coverage_status",
        "month_funding_status",
        "upcoming_recurring_expenses",
        "current_cycle",
        "previous_cycle",
        "historical_cycles",
        "pocket_id",
        "incoming_carry_cents",
        "rollover_cap_cents",
        "opening_rollover_cents",
        "rollover_from_previous_cents",
        "rollover_group_id",
      ]
    ) {
      assert(
        reviewSource.includes(requiredContext),
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
        functionSource.includes(
          "raw.suggested_total_budget_cents !== rawTotal",
        ) &&
        functionSource.includes("suggestedTotalBudgetCents = total") &&
        functionSource.includes(
          "raw.suggested_total_budget_cents > context.total_budget_cents",
        ),
      "The response must reject a mismatched raw plan and return a rounded total that exactly matches its pocket amounts",
    );
    assert(
      functionSource.includes("rawSuggestions.length !== validIds.size"),
      "A plan must include every pocket so applying it cannot preserve stale allocations",
    );
    assert(
      functionSource.includes("context.pockets.length > MAX_SUGGESTIONS") &&
        functionSource.includes("AI_SUGGESTION_POCKET_LIMIT"),
      "Plans above the structured-output limit must fail before model generation",
    );
    assert(
      functionSource.includes("1400 + context.pockets.length * 110") &&
        functionSource.includes("Math.min(5000"),
      "The output budget must scale with the number of required pocket suggestions",
    );
    assert(
      functionSource.includes(
        "matchingHistoricalPocket(pocket, cycle.pockets)",
      ) && functionSource.includes('row.rollover_group_id === "string"'),
      "Copied pockets must retain historical budget evidence through their stable rollover group",
    );
    assert(
      !functionSource.includes("unsaved draft") &&
        functionSource.includes("applying the plan will set that amount"),
      "Zero-budget guidance must match the mobile apply behavior",
    );
    assert(
      functionSource.includes("Do not infer income pressure") &&
        functionSource.includes("known income") &&
        functionSource.includes("not a bank balance"),
      "The prompt must qualify the cash-flow evidence boundary",
    );
    assert(
      functionSource.includes("Observation -> why it matters") &&
        functionSource.includes("fewer are allowed when evidence is thin"),
      "Coaching must prioritize evidence-backed, actionable insight over filler",
    );
    assert(
      functionSource.includes("get_projected_scoped_recurring_expenses_v1") &&
        functionSource.includes("analytics_counts_toward_income") &&
        functionSource.includes('input.scope === "portfolio"'),
      "Income context must include recurring income and preserve private portfolio ownership",
    );
    assert(
      functionSource.includes("headline") &&
        functionSource.includes("insights") &&
        functionSource.includes("estimated_impact_cents"),
      "The response must support dynamic, actionable insight cards",
    );
    assert(
      functionSource.includes("raw.income_coverage_status !==") &&
        functionSource.includes("raw.month_funding_status !=="),
      "The model must not reinterpret deterministic cash-flow statuses",
    );
    assert(
      functionSource.includes("GEMINI_MODEL_FALLBACKS[1]") &&
        functionSource.includes("for (const model of POCKET_REVIEW_MODELS)"),
      "The premium financial review must prefer the full Flash model over Flash Lite",
    );
    assert(
      functionSource.includes("error instanceof SyntaxError") &&
        functionSource.includes("lastRetryableError ?? lastError") &&
        functionSource.includes("AI_SUGGESTION_RESPONSE_INVALID"),
      "Malformed model JSON must try each fallback model, while retryable upstream failures retain their unavailable response",
    );
    assert(
      functionSource.includes("roundPocketReviewPlan") &&
        functionSource.includes("currency_display") &&
        functionSource.includes("{{money:<integer cents>}}"),
      "AI plans must use dynamic rounded targets and locale-aware currency symbols in coaching text",
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
