/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { calculateNextMonthCarryCents } from "./rollover.ts";
import { authenticateUser } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { GEMINI_MODEL_FALLBACKS } from "../shared/gemini-models.ts";
import {
  isRetryableGeminiError,
  sendGeminiMessageWithRetry,
} from "../shared/gemini-retry.ts";
import {
  createVertexChatSession,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import {
  hasPlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";

const MAX_REQUEST_BYTES = 2_000;
const MAX_SUGGESTIONS = 30;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const aiPocketSuggestionSchema = z.object({
  envelope_id: z.string().min(1),
  suggested_amount_cents: z.number().int().min(0).max(100000000000),
  reason: z.string().trim().min(1).max(350),
  tip: z.string().trim().min(1).max(350).optional(),
  change_type: z.enum(["increase", "decrease", "same"]).optional(),
}).strict();

const aiPocketMonthReviewSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  celebration: z.string().trim().min(1).max(500).optional(),
  top_spend_insight: z.string().trim().min(1).max(500).optional(),
  pockets_health_tip: z.string().trim().min(1).max(500).optional(),
  suggested_total_budget_cents: z.number().int().min(0).max(100000000000),
  suggestions: z.array(aiPocketSuggestionSchema).max(MAX_SUGGESTIONS),
}).strict();

type PocketScope = "personal" | "portfolio" | "household";

interface Suggestion {
  envelope_id: string;
  suggested_amount_cents: number;
  reason: string;
  pocket_name?: string;
  icon?: string;
  color?: string;
  previous_spent_cents?: number;
  previous_budget_cents?: number;
  incoming_carry_cents?: number;
  rollover_enabled?: boolean;
  remaining_cents?: number;
  tip?: string;
  change_type?: string;
}

interface CategorySpendContext {
  category: string;
  actual_spend_cents: number;
  projected_recurring_cents: number;
}

interface PocketContext {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  categories: string[];
  current_added_cents: number;
  incoming_carry_cents: number;
  available_cents: number;
  spent_cents: number;
  remaining_cents: number;
  actual_spend_cents: number;
  projected_recurring_cents: number;
  rollover_enabled: boolean;
  rollover_negative: boolean;
  rollover_cap_cents?: number;
  opening_rollover_cents: number;
  rollover_from_previous_cents: number;
  previous_cycle?: {
    added_cents: number;
    opening_rollover_cents: number;
    rollover_from_previous_cents: number;
    incoming_carry_cents: number;
    available_cents: number;
    spent_cents: number;
    remaining_cents: number;
    actual_spend_cents: number;
    projected_recurring_cents: number;
  };
}

interface PocketMonthContext {
  suggestion_source: "current" | "previous";
  currency: string;
  period_start: string | undefined;
  budget_month: string | undefined;
  total_budget_cents: number;
  total_added_to_pockets_cents: number;
  unallocated_budget_cents: number;
  total_spend_cents: number;
  actual_spend_cents: number;
  projected_recurring_cents: number;
  unassigned_spending: CategorySpendContext[];
  category_spending: CategorySpendContext[];
  pockets: PocketContext[];
}

interface PocketActivityContext {
  pocket_id: string;
  pocket_name: string;
  actual_spend_cents: number;
  projected_recurring_cents: number;
}

interface SuggestionContext extends PocketMonthContext {
  current_cycle: {
    period_start: string | undefined;
    budget_month: string | undefined;
    total_budget_cents: number;
    total_added_to_pockets_cents: number;
    unallocated_budget_cents: number;
    actual_spend_cents: number;
    projected_recurring_cents: number;
    category_spending: CategorySpendContext[];
    unassigned_spending: CategorySpendContext[];
    pocket_activity: PocketActivityContext[];
  };
  previous_cycle?: {
    period_start: string | undefined;
    budget_month: string | undefined;
    total_budget_cents: number;
    total_added_to_pockets_cents: number;
    unallocated_budget_cents: number;
    actual_spend_cents: number;
    projected_recurring_cents: number;
    category_spending: CategorySpendContext[];
    pocket_activity: PocketActivityContext[];
  };
  historical_cycles: Array<{
    period_start: string | undefined;
    budget_month: string | undefined;
    total_budget_cents: number;
    total_added_to_pockets_cents: number;
    unallocated_budget_cents: number;
    actual_spend_cents: number;
    projected_recurring_cents: number;
    category_spending: CategorySpendContext[];
    pocket_activity: PocketActivityContext[];
  }>;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseRequest(value: unknown): {
  scope: PocketScope;
  householdId: string | null;
  currency: string;
  cycleStart: string;
  locale: string | null;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const scope = typeof body.scope === "string" ? body.scope.toLowerCase() : "";
  const currency = typeof body.currency === "string"
    ? body.currency.toUpperCase().trim()
    : "";
  const cycleStart = typeof body.cycleStart === "string"
    ? body.cycleStart.trim()
    : "";
  const locale =
    typeof body.locale === "string" && body.locale.trim().length > 0
      ? body.locale.trim()
      : null;
  const householdId = body.householdId == null
    ? null
    : typeof body.householdId === "string"
    ? body.householdId.trim()
    : "";
  if (
    (scope !== "personal" && scope !== "portfolio" && scope !== "household") ||
    !/^[A-Z]{3}$/.test(currency) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(cycleStart) ||
    (locale !== null &&
      !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) ||
    (householdId !== null && !UUID_REGEX.test(householdId)) ||
    (scope === "personal" && householdId !== null) ||
    (scope === "household" && householdId === null)
  ) return null;
  return { scope, householdId, currency, cycleStart, locale };
}

function schema() {
  return {
    type: "OBJECT",
    properties: {
      summary: { type: "STRING" },
      celebration: { type: "STRING" },
      top_spend_insight: { type: "STRING" },
      pockets_health_tip: { type: "STRING" },
      suggested_total_budget_cents: { type: "INTEGER" },
      suggestions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            envelope_id: { type: "STRING" },
            suggested_amount_cents: { type: "INTEGER" },
            reason: { type: "STRING" },
            tip: { type: "STRING" },
            change_type: { type: "STRING" },
          },
          required: ["envelope_id", "suggested_amount_cents", "reason"],
        },
      },
    },
    required: ["summary", "suggested_total_budget_cents", "suggestions"],
  };
}

function normalizedCategory(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase()
    : "uncategorized";
}

function positiveExpenseAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function spendingByCategory(
  month: Record<string, unknown>,
  key: "actual_expenses" | "projected_recurring_expenses",
): Map<string, number> {
  const rows = Array.isArray(month[key]) ? month[key] : [];
  const totals = new Map<string, number>();
  for (const value of rows) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    if (String(row.type ?? "expense").toLowerCase() === "income") continue;
    const amount = positiveExpenseAmount(row.amount_cents);
    if (amount === 0) continue;
    const category = normalizedCategory(row.category);
    totals.set(category, (totals.get(category) ?? 0) + amount);
  }
  return totals;
}

function sumCategories(
  categories: string[],
  totals: Map<string, number>,
): number {
  return categories.reduce(
    (sum, category) => sum + (totals.get(category) ?? 0),
    0,
  );
}

function categoryLinksByPocket(
  month: Record<string, unknown>,
): Map<string, string[]> {
  const links = Array.isArray(month.category_links) ? month.category_links : [];
  const categoriesByPocket = new Map<string, Set<string>>();
  for (const value of links) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    if (typeof row.envelope_id !== "string" || row.envelope_id.length === 0) {
      continue;
    }
    const category = normalizedCategory(row.category);
    const categories = categoriesByPocket.get(row.envelope_id) ??
      new Set<string>();
    categories.add(category);
    categoriesByPocket.set(row.envelope_id, categories);
  }
  return new Map(
    [...categoriesByPocket.entries()].map((
      [id, categories],
    ) => [id, [...categories].sort()]),
  );
}

function buildContext(
  month: Record<string, unknown>,
  source: "current" | "previous",
): PocketMonthContext {
  const envelopes = Array.isArray(month.envelopes) ? month.envelopes : [];
  const actualByCategory = spendingByCategory(month, "actual_expenses");
  const projectedByCategory = spendingByCategory(
    month,
    "projected_recurring_expenses",
  );
  const categoriesByPocket = categoryLinksByPocket(month);
  const pockets = envelopes.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") return [];
    const categories = categoriesByPocket.get(row.id) ?? [];
    const incomingCarry = Number(row.rollover_from_previous_cents ?? 0) +
      Number(row.opening_rollover_cents ?? 0);
    return [{
      id: row.id,
      name: row.name,
      icon: typeof row.icon === "string" ? row.icon : undefined,
      color: typeof row.color === "string" ? row.color : undefined,
      categories,
      current_added_cents: Number(row.base_budget_amount_cents ?? 0),
      incoming_carry_cents: incomingCarry,
      available_cents: Number(row.available_budget_cents ?? 0),
      spent_cents: Number(row.spent_cents ?? 0),
      remaining_cents: Number(row.remaining_cents ?? 0),
      actual_spend_cents: sumCategories(categories, actualByCategory),
      projected_recurring_cents: sumCategories(categories, projectedByCategory),
      rollover_enabled: row.rollover_enabled === true,
      rollover_negative: row.rollover_negative === true,
      rollover_cap_cents: typeof row.rollover_cap_cents === "number"
        ? row.rollover_cap_cents
        : undefined,
      opening_rollover_cents: Number(row.opening_rollover_cents ?? 0),
      rollover_from_previous_cents: Number(
        row.rollover_from_previous_cents ?? 0,
      ),
    }];
  });
  const budget = month.budget && typeof month.budget === "object"
    ? month.budget as Record<string, unknown>
    : {};
  const totalSpent = Number(month.total_spend_cents ?? 0);
  const totalBudget = Number(budget.total_budget_cents ?? 0);
  const totalAddedToPockets = pockets.reduce(
    (sum, pocket) => sum + pocket.current_added_cents,
    0,
  );
  const actualSpendCents = [...actualByCategory.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const projectedRecurringCents = [...projectedByCategory.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const linkedCategories = new Set(
    pockets.flatMap((pocket) => pocket.categories),
  );
  const allCategories = new Set([
    ...actualByCategory.keys(),
    ...projectedByCategory.keys(),
  ]);
  const categorySpending = [...allCategories].map((category) => ({
    category,
    actual_spend_cents: actualByCategory.get(category) ?? 0,
    projected_recurring_cents: projectedByCategory.get(category) ?? 0,
  })).sort((a, b) =>
    (b.actual_spend_cents + b.projected_recurring_cents) -
      (a.actual_spend_cents + a.projected_recurring_cents) ||
    a.category.localeCompare(b.category)
  );

  return {
    suggestion_source: source,
    currency: typeof month.selected_currency === "string"
      ? month.selected_currency.toUpperCase()
      : "",
    period_start: typeof month.period_month === "string"
      ? month.period_month
      : undefined,
    budget_month: typeof month.budget_month === "string"
      ? month.budget_month
      : undefined,
    total_budget_cents: totalBudget,
    total_added_to_pockets_cents: totalAddedToPockets,
    unallocated_budget_cents: totalBudget - totalAddedToPockets,
    total_spend_cents: totalSpent,
    actual_spend_cents: actualSpendCents,
    projected_recurring_cents: projectedRecurringCents,
    unassigned_spending: categorySpending.filter(
      (item) => !linkedCategories.has(item.category),
    ).slice(0, 10),
    category_spending: categorySpending,
    pockets,
  };
}

function pocketActivity(
  cycle: PocketMonthContext,
  pocketDefinitions: PocketContext[],
): PocketActivityContext[] {
  const actualByCategory = new Map(
    cycle.category_spending.map((
      item,
    ) => [item.category, item.actual_spend_cents]),
  );
  const projectedByCategory = new Map(
    cycle.category_spending.map((
      item,
    ) => [item.category, item.projected_recurring_cents]),
  );
  return pocketDefinitions.map((pocket) => ({
    pocket_id: pocket.id,
    pocket_name: pocket.name,
    actual_spend_cents: sumCategories(pocket.categories, actualByCategory),
    projected_recurring_cents: sumCategories(
      pocket.categories,
      projectedByCategory,
    ),
  }));
}

function buildSuggestionContext(
  plan: PocketMonthContext,
  currentCycle: PocketMonthContext,
  historicalCycles: PocketMonthContext[],
): SuggestionContext {
  const historicalCycleSummary = (cycle: PocketMonthContext) => ({
    period_start: cycle.period_start,
    budget_month: cycle.budget_month,
    total_budget_cents: cycle.total_budget_cents,
    total_added_to_pockets_cents: cycle.total_added_to_pockets_cents,
    unallocated_budget_cents: cycle.unallocated_budget_cents,
    actual_spend_cents: cycle.actual_spend_cents,
    projected_recurring_cents: cycle.projected_recurring_cents,
    category_spending: cycle.category_spending,
    pocket_activity: pocketActivity(cycle, plan.pockets),
  });
  const previousCycle = historicalCycles[0];
  return {
    ...currentCycle,
    suggestion_source: plan.suggestion_source,
    currency: currentCycle.currency || plan.currency,
    pockets: plan.pockets,
    current_cycle: {
      period_start: currentCycle.period_start,
      budget_month: currentCycle.budget_month,
      total_budget_cents: currentCycle.total_budget_cents,
      total_added_to_pockets_cents: currentCycle.total_added_to_pockets_cents,
      unallocated_budget_cents: currentCycle.unallocated_budget_cents,
      actual_spend_cents: currentCycle.actual_spend_cents,
      projected_recurring_cents: currentCycle.projected_recurring_cents,
      category_spending: currentCycle.category_spending,
      unassigned_spending: currentCycle.unassigned_spending,
      pocket_activity: pocketActivity(currentCycle, plan.pockets),
    },
    previous_cycle: previousCycle
      ? historicalCycleSummary(previousCycle)
      : undefined,
    historical_cycles: historicalCycles.map(historicalCycleSummary),
  };
}

function withNextMonthCarry(
  previousMonth: PocketMonthContext,
): PocketMonthContext {
  return {
    ...previousMonth,
    pockets: previousMonth.pockets.map((pocket) => {
      const incomingCarryCents = calculateNextMonthCarryCents({
        remainingCents: pocket.remaining_cents,
        rolloverEnabled: pocket.rollover_enabled,
        rolloverNegative: pocket.rollover_negative,
        rolloverCapCents: pocket.rollover_cap_cents,
      });
      return {
        ...pocket,
        previous_cycle: {
          added_cents: pocket.current_added_cents,
          opening_rollover_cents: pocket.opening_rollover_cents,
          rollover_from_previous_cents: pocket.rollover_from_previous_cents,
          incoming_carry_cents: pocket.incoming_carry_cents,
          available_cents: pocket.available_cents,
          spent_cents: pocket.spent_cents,
          remaining_cents: pocket.remaining_cents,
          actual_spend_cents: pocket.actual_spend_cents,
          projected_recurring_cents: pocket.projected_recurring_cents,
        },
        current_added_cents: 0,
        incoming_carry_cents: incomingCarryCents,
        opening_rollover_cents: 0,
        rollover_from_previous_cents: incomingCarryCents,
        available_cents: incomingCarryCents,
        spent_cents: 0,
        remaining_cents: incomingCarryCents,
        actual_spend_cents: 0,
        projected_recurring_cents: 0,
      };
    }),
  };
}

function normalize(value: unknown, context: SuggestionContext) {
  const parsed = aiPocketMonthReviewSchema.safeParse(value);
  if (!parsed.success) return null;
  const raw = parsed.data;
  const validIds = new Set(context.pockets.map((pocket) => pocket.id));
  const pocketMap = new Map(
    context.pockets.map((pocket) => [pocket.id, pocket]),
  );
  const rawSuggestions = raw.suggestions;
  if (rawSuggestions.length > Math.min(MAX_SUGGESTIONS, validIds.size)) {
    return null;
  }
  if (validIds.size > 0 && rawSuggestions.length === 0) return null;
  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const item of rawSuggestions) {
    const id = item.envelope_id;
    const amount = item.suggested_amount_cents;
    const reason = item.reason.trim().replace(/\s+/g, " ");
    const tip = item.tip?.trim().replace(/\s+/g, " ");
    const changeType = item.change_type;
    if (
      !validIds.has(id) ||
      seen.has(id) ||
      !reason ||
      reason.length > 350
    ) return null;
    seen.add(id);
    const pocket = pocketMap.get(id);
    suggestions.push({
      envelope_id: id,
      suggested_amount_cents: amount,
      reason,
      tip: tip && tip.length <= 350 ? tip : undefined,
      change_type: changeType,
      pocket_name: pocket?.name,
      icon: pocket?.icon,
      color: pocket?.color,
      previous_spent_cents: pocket?.previous_cycle?.spent_cents ??
        pocket?.spent_cents,
      previous_budget_cents: pocket?.previous_cycle?.added_cents ??
        pocket?.current_added_cents,
      incoming_carry_cents: pocket?.incoming_carry_cents,
      rollover_enabled: pocket?.rollover_enabled,
      remaining_cents: pocket?.remaining_cents,
    });
  }
  const total = suggestions.reduce(
    (sum, item) => sum + item.suggested_amount_cents,
    0,
  );
  const suggestedTotalBudgetCents = raw.suggested_total_budget_cents;
  if (suggestedTotalBudgetCents !== total) return null;
  const summary = raw.summary.trim().replace(/\s+/g, " ");
  if (!summary || summary.length > 500) return null;
  const celebration = raw.celebration?.trim().replace(/\s+/g, " ");
  const topSpendInsight = raw.top_spend_insight?.trim().replace(/\s+/g, " ");
  const pocketsHealthTip = raw.pockets_health_tip?.trim().replace(/\s+/g, " ");

  return {
    summary,
    celebration,
    top_spend_insight: topSpendInsight,
    pockets_health_tip: pocketsHealthTip,
    total_suggested_cents: total,
    suggested_total_budget_cents: suggestedTotalBudgetCents,
    suggestions,
  };
}

async function generate(
  context: SuggestionContext,
  locale: string | null,
) {
  const budgetConstraint =
    "suggested_total_budget_cents must exactly equal the sum of suggested_amount_cents. It is a recommendation, not a saved budget or a statement of money in the user's accounts.";
  const prompt =
    `Analyze the user's spending habits, previous envelope targets, and rollover carryovers to generate a dedicated monthly budget plan for this month in ${
      locale || "the user's preferred language"
    }.

Language and readability requirements:
- Write every natural-language response field in ${
      locale || "the user's preferred language"
    } only. Do not mix languages.
- The user is new to budgeting. Use everyday words, short sentences, and a warm, calm tone. Avoid jargon, acronyms, blame, or pressure.
- A summary and each reason may use at most two short sentences. Each tip must be one practical sentence.
- Explain carry in ordinary language, such as "money left from last month", when that is clearer in the requested language.
- Every natural-language field in the response must be newly written from the supplied context. Do not use canned or generic copy.

Authoritative planning context:
- Suggestion Source: ${
      context.suggestion_source === "previous"
        ? "Using last month's pockets and performance as baseline"
        : "Refining existing current-month pockets"
    }
- Currency: ${context.currency || "the requested currency"}
- This month's total_budget_cents is the new money the user has chosen for this cycle. total_added_to_pockets_cents is how much is already assigned; unallocated_budget_cents is still free to assign. Do not treat carried money as new budget money.
- historical_cycles contains up to three completed financial cycles, newest first. Use it to identify a stable pattern instead of copying a one-off expensive or unusually quiet month. It contains spending and budget information only; never assume the user's income, account balance, debt, or ability to afford an increase.
- The root pockets always describe this month's plan. For a pocket carried forward from last month, current_added_cents starts at zero, incoming_carry_cents is the exact balance brought forward under its rollover policy, and previous_cycle inside that pocket is its complete historical record.
- The current_cycle separates actual spending already recorded from future scheduled recurring expenses. Its pocket_activity applies current spending and upcoming recurring commitments to each listed pocket by its linked categories, including when the current month has not yet created pocket rows.
- previous_cycle is a historical baseline when available. Its projected recurring expenses were forecasts in that past period, not confirmed spending.
- opening_rollover_cents is a manual opening adjustment. rollover_from_previous_cents is the balance calculated from the prior cycle. incoming_carry_cents is their combined amount available at the start of this cycle.
- total_spend_cents, each pocket's spent_cents, and remaining_cents include both completed spending and included future recurring projections. Use the separate actual_spend_cents and projected_recurring_cents fields when explaining what has happened versus what is still scheduled.
- category_spending gives the complete category-level split for each cycle. unassigned_spending is the subset that is not linked to a listed pocket.
- Each pocket includes only its linked category names and aggregate amounts. No merchant names or transaction descriptions are supplied.

Instructions for each pocket in 'suggestions':
1. 'suggested_amount_cents': Suggest a realistic target in cents based on past spending, rollover carryovers, and healthy budget limits.
   - Treat positive incoming carry as money already available and do not fund it twice. If needed target is \$300 and carryover is \$50, suggesting \$250 added is usually appropriate unless the pocket is clearly intended to build savings.
   - If 'rollover_negative' is true and 'incoming_carry_cents' is negative, note how the new target handles the deficit recovery.
   - If 'rollover_cap_cents' is set, respect the cap limits.
   - Use actual_spend_cents as completed spending and projected_recurring_cents only as known upcoming commitments. Never describe future projected expenses as money already spent.
   - Keep the total within total_budget_cents when it is positive. When it is zero, make useful suggestions but clearly treat them as an unsaved draft.
2. 'reason': Clear, simple 1-2 sentence explanation of why this target makes sense based on their actual habits and rollover rules.
3. 'tip': One short, practical category-specific action. Do not repeat the reason.
4. 'change_type': 'increase' | 'decrease' | 'same'

Monthly budget recommendation:
1. 'suggested_total_budget_cents': Recommend the new money to plan for this cycle. Start with the current cycle's known recurring commitments and the suggested pocket additions, then compare recent completed cycles for a realistic trend.
   - Treat a one-time spike or unusually low month as a signal to explain, not a new normal.
   - Carry-over is already in a pocket and must not be added again to this total.
   - Split every dollar of the recommendation across the listed pockets. suggested_total_budget_cents must exactly equal the sum of suggested_amount_cents; do not leave an unexplained remainder.
   - If history is thin or inconsistent, stay close to the most recent stable budget and avoid a confident claim.

Tasks for overall review:
1. 'summary': Warm, motivating overview of this month's strategy in plain language.
2. 'celebration': Specific praise only when the supplied data supports it. If there is no evidence for praise, offer an encouraging neutral observation instead.
3. 'top_spend_insight': Explain the most meaningful spending or recurring commitment pattern from the supplied data and how this plan accounts for it.
4. 'pockets_health_tip': An empowering, practical rookie budgeting tip that is not generic.

Constraints:
- Never include a pocket ID that was not in AUTHORITATIVE_CONTEXT.
- ${budgetConstraint}
- Use only the supplied data. Do not invent income, bills, goals, merchant behavior, or financial facts.
- All supplied monetary values are integer cents. Never say "cents" in user-facing text; the app formats the amounts.
- Assume the user is new to budgeting: avoid jargon, explain carry in plain language, avoid shame, and make each recommendation feel adjustable and achievable.
- Return only JSON matching the schema.

AUTHORITATIVE_CONTEXT:
${JSON.stringify(context)}`;
  const vertex = getVertexAiConfigFromEnv();
  let lastError: unknown;
  for (const model of GEMINI_MODEL_FALLBACKS) {
    try {
      const chat = createVertexChatSession({
        model,
        vertex,
        systemInstruction:
          "You are an empathetic, expert personal finance coach who builds dedicated, tailored monthly envelope budgets based on previous month spending data, rollover carryovers, and healthy financial principles.",
      });
      const response = await sendGeminiMessageWithRetry(
        {
          sendMessage: (content) =>
            chat.sendMessage(content, {
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1400,
                responseMimeType: "application/json",
                responseSchema: schema(),
              },
            }).then((result) => result.response),
        },
        prompt,
        { logPrefix: "pocket-month-suggestions" },
      );
      return { model, value: JSON.parse(response.text()) };
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error)) throw error;
    }
  }
  throw lastError ?? new Error("GEMINI_UNAVAILABLE");
}

function previousMonthKey(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const daysInPreviousMonth = new Date(
    Date.UTC(previousYear, previousMonth, 0),
  ).getUTCDate();
  const previousDay = Math.min(day, daysInPreviousMonth);
  return [previousYear, previousMonth, previousDay].map((part, index) =>
    part.toString().padStart(index === 0 ? 4 : 2, "0")
  ).join("-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
      return jsonResponse({ success: false, error: "Payload too large" }, 413);
    }
    const input = parseRequest(JSON.parse(rawBody));
    if (!input) {
      return jsonResponse({
        success: false,
        error: "Invalid suggestion request",
      }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!url || !serviceKey) {
      return jsonResponse({
        success: false,
        error: "Server configuration error",
      }, 500);
    }
    if (!authorization) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const auth = await authenticateUser(req, supabase);
    if (!auth.success || !auth.userId) {
      return jsonResponse({
        success: false,
        error: auth.error || "Unauthorized",
      }, auth.statusCode || 401);
    }
    if (
      !hasPlusEntitlement(
        await loadLatestSubscriptionForUser(supabase, auth.userId),
      )
    ) {
      return jsonResponse(
        jsonSubscriptionRequired("AI pocket budget suggestions"),
        403,
      );
    }
    const userScopedSupabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: authorization } },
    });
    const { data: month, error: monthError } = await userScopedSupabase.rpc(
      "get_pockets_month_v3",
      {
        p_user_id: auth.userId,
        p_scope: input.scope,
        p_budget_month: input.cycleStart,
        p_household_id: input.householdId,
        p_currency: input.currency,
        p_include_projected_recurring: true,
        p_allow_currency_fallback: false,
      },
    );
    if (monthError?.code === "42501") {
      return jsonResponse({
        success: false,
        error: "Forbidden",
        code: "POCKET_SCOPE_FORBIDDEN",
      }, 403);
    }
    if (
      monthError || !month || typeof month !== "object" || Array.isArray(month)
    ) throw monthError || new Error("INVALID_POCKETS_MONTH_CONTEXT");
    const currentContext = buildContext(
      month as Record<string, unknown>,
      "current",
    );
    const historicalCycles: PocketMonthContext[] = [];
    let previousMonthError: unknown = null;
    let historicalCycleStart = previousMonthKey(input.cycleStart);
    for (let index = 0; index < 3; index++) {
      const { data: historicalMonth, error: historicalMonthError } =
        await userScopedSupabase.rpc("get_pockets_month_v3", {
          p_user_id: auth.userId,
          p_scope: input.scope,
          p_budget_month: historicalCycleStart,
          p_household_id: input.householdId,
          p_currency: input.currency,
          p_include_projected_recurring: true,
          p_allow_currency_fallback: false,
        });
      if (historicalMonthError?.code === "42501") {
        return jsonResponse({
          success: false,
          error: "Forbidden",
          code: "POCKET_SCOPE_FORBIDDEN",
        }, 403);
      }
      if (index === 0) previousMonthError = historicalMonthError;
      if (
        !historicalMonthError && historicalMonth &&
        typeof historicalMonth === "object" && !Array.isArray(historicalMonth)
      ) {
        historicalCycles.push(
          buildContext(historicalMonth as Record<string, unknown>, "previous"),
        );
      }
      historicalCycleStart = previousMonthKey(historicalCycleStart);
    }
    const previousContext = historicalCycles[0] ?? null;

    const usesPreviousMonthPockets = currentContext.pockets.length === 0;
    if (usesPreviousMonthPockets) {
      if (!previousContext) {
        throw previousMonthError ||
          new Error("INVALID_PREVIOUS_POCKETS_CONTEXT");
      }
      if (previousContext.pockets.length === 0) {
        return jsonResponse({
          success: false,
          error: "Create your first pocket before asking for suggestions.",
          code: "POCKETS_REQUIRED",
        }, 409);
      }
    }
    const planContext = usesPreviousMonthPockets
      ? withNextMonthCarry(previousContext!)
      : currentContext;
    if (!planContext) {
      throw previousMonthError || new Error("INVALID_PREVIOUS_POCKETS_CONTEXT");
    }
    const context = buildSuggestionContext(
      {
        ...planContext,
        total_budget_cents: currentContext.total_budget_cents,
      },
      currentContext,
      historicalCycles,
    );
    const { data: contact } = await supabase.from("user_contacts").select(
      "preferred_language",
    ).eq("user_id", auth.userId).order("updated_at", { ascending: false })
      .limit(1).maybeSingle();
    try {
      const generated = await generate(
        context,
        input.locale ??
          (typeof contact?.preferred_language === "string"
            ? contact.preferred_language
            : "en"),
      );
      const suggestions = normalize(generated.value, context);
      if (!suggestions) {
        return jsonResponse({
          success: false,
          code: "AI_SUGGESTION_SCHEMA_INVALID",
        }, 502);
      }
      return jsonResponse({
        success: true,
        modelVersion: generated.model,
        suggestions,
        usesPreviousMonthPockets,
      });
    } catch (error) {
      if (!isRetryableGeminiError(error)) throw error;
      return jsonResponse({
        success: false,
        code: "AI_SUGGESTION_UNAVAILABLE",
      }, 503);
    }
  } catch (error) {
    console.error(
      "[generate-pocket-month-review] failed",
      error instanceof Error ? error.message : String(error),
    );
    return jsonResponse({
      success: false,
      error: "Unable to generate AI suggestions",
    }, 500);
  }
});
