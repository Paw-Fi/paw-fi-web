/// <reference lib="deno.ns" />

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
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
import {
  buildCategorySpending,
  buildUpcomingRecurringItems,
  CashFlowDataStatus,
  CategorySpendContext,
  deriveKnownCashFlow,
  derivePocketHistoryAnalysis,
  financialCycleEndKey,
  KnownCashFlowContext,
  matchingHistoricalPocket,
  PocketHistoryAnalysis,
  UpcomingRecurringItem,
} from "./review-analysis.ts";
import {
  buildPocketReviewCurrencyContext,
  formatPocketReviewMoneyTokens,
  roundPocketReviewPlan,
} from "./review-currency.ts";

const MAX_REQUEST_BYTES = 2_000;
const MAX_SUGGESTIONS = 30;
const POCKET_REVIEW_MODELS = [
  GEMINI_MODEL_FALLBACKS[1],
  GEMINI_MODEL_FALLBACKS[0],
  GEMINI_MODEL_FALLBACKS[2],
] as const;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const aiPocketSuggestionSchema = z
  .object({
    envelope_id: z.string().min(1),
    suggested_amount_cents: z.number().int().min(0).max(100000000000),
    reason: z.string().trim().min(1).max(350),
    tip: z.string().trim().min(1).max(350).optional(),
  })
  .strict();

const aiPocketInsightSchema = z
  .object({
    type: z.enum([
      "cash_flow",
      "upcoming_commitment",
      "budget_adjustment",
      "spending_pattern",
      "reallocation",
      "positive_progress",
      "rollover",
    ]),
    title: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(1).max(320),
    action: z.string().trim().min(1).max(240).optional(),
    estimated_impact_cents: z
      .number()
      .int()
      .min(0)
      .max(100000000000)
      .optional(),
    envelope_id: z.string().min(1).optional(),
  })
  .strict();

const aiPocketMonthReviewSchema = z
  .object({
    headline: z.string().trim().min(1).max(140),
    summary: z.string().trim().min(1).max(500),
    income_coverage_status: z.enum(["covered", "tight", "deficit", "unknown"]),
    month_funding_status: z.enum(["funded", "shortfall", "unknown"]),
    insights: z.array(aiPocketInsightSchema).max(4),
    suggested_total_budget_cents: z.number().int().min(0).max(100000000000),
    suggestions: z.array(aiPocketSuggestionSchema).max(MAX_SUGGESTIONS),
  })
  .strict();

type PocketScope = "personal" | "portfolio" | "household";

interface PocketReviewRequest {
  scope: PocketScope;
  householdId: string | null;
  currency: string;
  cycleStart: string;
  locale: string | null;
}

interface AiPocketInsight {
  type: z.infer<typeof aiPocketInsightSchema>["type"];
  title: string;
  summary: string;
  action?: string;
  estimated_impact_cents?: number;
  envelope_id?: string;
}

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
  rollover_group_id?: string;
  history_analysis?: PocketHistoryAnalysis;
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
  actual_transaction_count: number;
  largest_actual_transaction_cents: number;
  largest_actual_transaction_share_bps: number;
  projected_recurring_cents: number;
  projected_recurring_count: number;
  added_cents?: number;
  available_cents?: number;
  remaining_cents?: number;
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
  cash_flow: KnownCashFlowContext;
  upcoming_recurring_expenses: UpcomingRecurringItem[];
  upcoming_recurring_income: UpcomingRecurringItem[];
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseRequest(value: unknown): PocketReviewRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const scope = typeof body.scope === "string" ? body.scope.toLowerCase() : "";
  const currency =
    typeof body.currency === "string" ? body.currency.toUpperCase().trim() : "";
  const cycleStart =
    typeof body.cycleStart === "string" ? body.cycleStart.trim() : "";
  const locale =
    typeof body.locale === "string" && body.locale.trim().length > 0
      ? body.locale.trim()
      : null;
  const householdId =
    body.householdId == null
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
    (scope !== "personal" && householdId === null)
  ) {
    return null;
  }
  return { scope, householdId, currency, cycleStart, locale };
}

function schema() {
  return {
    type: "OBJECT",
    properties: {
      headline: { type: "STRING" },
      summary: { type: "STRING" },
      income_coverage_status: {
        type: "STRING",
        enum: ["covered", "tight", "deficit", "unknown"],
      },
      month_funding_status: {
        type: "STRING",
        enum: ["funded", "shortfall", "unknown"],
      },
      insights: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              enum: [
                "cash_flow",
                "upcoming_commitment",
                "budget_adjustment",
                "spending_pattern",
                "reallocation",
                "positive_progress",
                "rollover",
              ],
            },
            title: { type: "STRING" },
            summary: { type: "STRING" },
            action: { type: "STRING" },
            estimated_impact_cents: { type: "INTEGER" },
            envelope_id: { type: "STRING" },
          },
          required: ["type", "title", "summary"],
        },
      },
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
          },
          required: ["envelope_id", "suggested_amount_cents", "reason"],
        },
      },
    },
    required: [
      "headline",
      "summary",
      "income_coverage_status",
      "month_funding_status",
      "insights",
      "suggested_total_budget_cents",
      "suggestions",
    ],
  };
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
    const category =
      typeof row.category === "string" && row.category.trim()
        ? row.category.trim().toLowerCase()
        : "uncategorized";
    const categories =
      categoriesByPocket.get(row.envelope_id) ?? new Set<string>();
    categories.add(category);
    categoriesByPocket.set(row.envelope_id, categories);
  }
  return new Map(
    [...categoriesByPocket.entries()].map(([id, categories]) => [
      id,
      [...categories].sort(),
    ]),
  );
}

function buildContext(
  month: Record<string, unknown>,
  source: "current" | "previous",
): PocketMonthContext {
  const envelopes = Array.isArray(month.envelopes) ? month.envelopes : [];
  const categorySpending = buildCategorySpending(month);
  const actualByCategory = new Map(
    categorySpending.map((item) => [item.category, item.actual_spend_cents]),
  );
  const projectedByCategory = new Map(
    categorySpending.map((item) => [
      item.category,
      item.projected_recurring_cents,
    ]),
  );
  const categoriesByPocket = categoryLinksByPocket(month);
  const pockets = envelopes.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") return [];
    const categories = categoriesByPocket.get(row.id) ?? [];
    const incomingCarry =
      Number(row.rollover_from_previous_cents ?? 0) +
      Number(row.opening_rollover_cents ?? 0);
    return [
      {
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
        projected_recurring_cents: sumCategories(
          categories,
          projectedByCategory,
        ),
        rollover_enabled: row.rollover_enabled === true,
        rollover_negative: row.rollover_negative === true,
        rollover_cap_cents:
          typeof row.rollover_cap_cents === "number"
            ? row.rollover_cap_cents
            : undefined,
        opening_rollover_cents: Number(row.opening_rollover_cents ?? 0),
        rollover_from_previous_cents: Number(
          row.rollover_from_previous_cents ?? 0,
        ),
        rollover_group_id:
          typeof row.rollover_group_id === "string"
            ? row.rollover_group_id
            : undefined,
      },
    ];
  });
  const budget =
    month.budget && typeof month.budget === "object"
      ? (month.budget as Record<string, unknown>)
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
  return {
    suggestion_source: source,
    currency:
      typeof month.selected_currency === "string"
        ? month.selected_currency.toUpperCase()
        : "",
    period_start:
      typeof month.period_month === "string" ? month.period_month : undefined,
    budget_month:
      typeof month.budget_month === "string" ? month.budget_month : undefined,
    total_budget_cents: totalBudget,
    total_added_to_pockets_cents: totalAddedToPockets,
    unallocated_budget_cents: totalBudget - totalAddedToPockets,
    total_spend_cents: totalSpent,
    actual_spend_cents: actualSpendCents,
    projected_recurring_cents: projectedRecurringCents,
    unassigned_spending: categorySpending
      .filter((item) => !linkedCategories.has(item.category))
      .slice(0, 10),
    category_spending: categorySpending,
    pockets,
  };
}

function pocketActivity(
  cycle: PocketMonthContext,
  pocketDefinitions: PocketContext[],
): PocketActivityContext[] {
  return pocketDefinitions.map((pocket) => {
    const categories = new Set(pocket.categories);
    const categoryRows = cycle.category_spending.filter((item) =>
      categories.has(item.category),
    );
    const actualSpend = categoryRows.reduce(
      (sum, item) => sum + item.actual_spend_cents,
      0,
    );
    const largestActual = categoryRows.reduce(
      (largest, item) =>
        Math.max(largest, item.largest_actual_transaction_cents),
      0,
    );
    const historicalPocket = matchingHistoricalPocket(pocket, cycle.pockets);
    return {
      pocket_id: pocket.id,
      pocket_name: pocket.name,
      actual_spend_cents: actualSpend,
      actual_transaction_count: categoryRows.reduce(
        (sum, item) => sum + item.actual_transaction_count,
        0,
      ),
      largest_actual_transaction_cents: largestActual,
      largest_actual_transaction_share_bps:
        actualSpend > 0 ? Math.round((largestActual * 10000) / actualSpend) : 0,
      projected_recurring_cents: categoryRows.reduce(
        (sum, item) => sum + item.projected_recurring_cents,
        0,
      ),
      projected_recurring_count: categoryRows.reduce(
        (sum, item) => sum + item.projected_recurring_count,
        0,
      ),
      ...(historicalPocket
        ? {
            added_cents: historicalPocket.current_added_cents,
            available_cents: historicalPocket.available_cents,
            remaining_cents: historicalPocket.remaining_cents,
          }
        : {}),
    };
  });
}

function buildSuggestionContext(
  plan: PocketMonthContext,
  currentCycle: PocketMonthContext,
  historicalCycles: PocketMonthContext[],
  cashFlow: KnownCashFlowContext,
  upcomingRecurringExpenses: UpcomingRecurringItem[],
  upcomingRecurringIncome: UpcomingRecurringItem[],
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
  const historicalCycleSummaries = historicalCycles.map(historicalCycleSummary);
  const previousCycle = historicalCycleSummaries[0];
  return {
    ...currentCycle,
    suggestion_source: plan.suggestion_source,
    currency: currentCycle.currency || plan.currency,
    pockets: plan.pockets.map((pocket) => ({
      ...pocket,
      history_analysis: derivePocketHistoryAnalysis(
        historicalCycleSummaries.map((cycle) => {
          const activity = cycle.pocket_activity.find(
            (item) => item.pocket_id === pocket.id,
          );
          return {
            actual_spend_cents: activity?.actual_spend_cents ?? 0,
            actual_transaction_count: activity?.actual_transaction_count ?? 0,
            largest_actual_transaction_cents:
              activity?.largest_actual_transaction_cents ?? 0,
            ...(activity?.available_cents != null
              ? { available_cents: activity.available_cents }
              : {}),
          };
        }),
      ),
    })),
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
    previous_cycle: previousCycle,
    historical_cycles: historicalCycleSummaries,
    cash_flow: cashFlow,
    upcoming_recurring_expenses: upcomingRecurringExpenses,
    upcoming_recurring_income: upcomingRecurringIncome,
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

async function loadRecordedIncomeCents(
  client: SupabaseClient,
  userId: string,
  input: PocketReviewRequest,
): Promise<number> {
  let query = client
    .from("expenses")
    .select("amount_cents")
    .is("deleted_at", null)
    .eq("analytics_is_final", true)
    .eq("analytics_counts_toward_income", true)
    .or("is_recurring.eq.false,is_recurring.is.null")
    .ilike("currency", input.currency)
    .gte("date", input.cycleStart)
    .lte("date", financialCycleEndKey(input.cycleStart));

  if (input.scope === "personal") {
    query = query.eq("user_id", userId).is("household_id", null);
  } else if (input.scope === "portfolio") {
    query = query.eq("user_id", userId).eq("household_id", input.householdId!);
  } else {
    query = query.eq("household_id", input.householdId!);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => {
    const amount = Number(row.amount_cents ?? 0);
    return sum + (Number.isFinite(amount) ? Math.abs(Math.round(amount)) : 0);
  }, 0);
}

async function loadProjectedRecurringIncome(
  client: SupabaseClient,
  userId: string,
  input: PocketReviewRequest,
): Promise<{ totalCents: number; items: UpcomingRecurringItem[] }> {
  const { data, error } = await client.rpc(
    "get_projected_scoped_recurring_expenses_v1",
    {
      p_user_id: userId,
      p_scope: input.scope,
      p_household_id: input.householdId,
      p_currency: input.currency,
      p_range_start: input.cycleStart,
      p_range_end: financialCycleEndKey(input.cycleStart),
    },
  );
  if (error) throw error;
  const incomeRows = Array.isArray(data)
    ? data.filter(
        (row) =>
          row &&
          typeof row === "object" &&
          String((row as Record<string, unknown>).type ?? "").toLowerCase() ===
            "income",
      )
    : [];
  const items = buildUpcomingRecurringItems(incomeRows, "income");
  return {
    totalCents: incomeRows.reduce((sum, row) => {
      const amount = Number((row as Record<string, unknown>).amount_cents ?? 0);
      return sum + (Number.isFinite(amount) ? Math.abs(Math.round(amount)) : 0);
    }, 0),
    items,
  };
}

async function loadKnownIncome(
  client: SupabaseClient,
  userId: string,
  input: PocketReviewRequest,
): Promise<{
  dataStatus: CashFlowDataStatus;
  recordedIncomeCents: number;
  projectedRecurringIncomeCents: number;
  upcomingRecurringIncome: UpcomingRecurringItem[];
}> {
  const [recorded, projected] = await Promise.allSettled([
    loadRecordedIncomeCents(client, userId, input),
    loadProjectedRecurringIncome(client, userId, input),
  ]);
  const completedReads =
    Number(recorded.status === "fulfilled") +
    Number(projected.status === "fulfilled");
  return {
    dataStatus:
      completedReads === 2
        ? "complete"
        : completedReads === 1
          ? "partial"
          : "unavailable",
    recordedIncomeCents: recorded.status === "fulfilled" ? recorded.value : 0,
    projectedRecurringIncomeCents:
      projected.status === "fulfilled" ? projected.value.totalCents : 0,
    upcomingRecurringIncome:
      projected.status === "fulfilled" ? projected.value.items : [],
  };
}

function normalize(
  value: unknown,
  context: SuggestionContext,
  locale: string | null,
) {
  const parsed = aiPocketMonthReviewSchema.safeParse(value);
  if (!parsed.success) return null;
  const raw = parsed.data;
  const validIds = new Set(context.pockets.map((pocket) => pocket.id));
  const pocketMap = new Map(
    context.pockets.map((pocket) => [pocket.id, pocket]),
  );
  const rawSuggestions = raw.suggestions;
  if (rawSuggestions.length !== validIds.size) {
    return null;
  }
  if (validIds.size > 0 && rawSuggestions.length === 0) return null;
  const rawTotal = rawSuggestions.reduce(
    (sum, item) => sum + item.suggested_amount_cents,
    0,
  );
  if (raw.suggested_total_budget_cents !== rawTotal) return null;
  if (
    context.total_budget_cents > 0 &&
    raw.suggested_total_budget_cents > context.total_budget_cents
  ) {
    return null;
  }
  const roundedPlan = roundPocketReviewPlan({
    amounts: rawSuggestions.map((item) => ({
      envelopeId: item.envelope_id,
      amountCents: item.suggested_amount_cents,
    })),
    maximumBudgetCents: context.total_budget_cents,
  });
  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const item of rawSuggestions) {
    const id = item.envelope_id;
    const amount = roundedPlan.amounts.get(id);
    const reason = formatPocketReviewMoneyTokens(
      item.reason.trim().replace(/\s+/g, " "),
      context.currency,
      locale,
    );
    const tip =
      item.tip == null
        ? undefined
        : formatPocketReviewMoneyTokens(
            item.tip.trim().replace(/\s+/g, " "),
            context.currency,
            locale,
          );
    if (
      amount == null ||
      !validIds.has(id) ||
      seen.has(id) ||
      !reason ||
      (item.tip != null && !tip) ||
      reason.length > 350
    ) {
      return null;
    }
    seen.add(id);
    const pocket = pocketMap.get(id);
    const comparisonAmount =
      pocket?.previous_cycle?.added_cents ?? pocket?.current_added_cents ?? 0;
    const changeType =
      amount > comparisonAmount
        ? "increase"
        : amount < comparisonAmount
          ? "decrease"
          : "same";
    suggestions.push({
      envelope_id: id,
      suggested_amount_cents: amount,
      reason,
      tip: tip && tip.length <= 350 ? tip : undefined,
      change_type: changeType,
      pocket_name: pocket?.name,
      icon: pocket?.icon,
      color: pocket?.color,
      previous_spent_cents:
        pocket?.previous_cycle?.spent_cents ?? pocket?.spent_cents,
      previous_budget_cents:
        pocket?.previous_cycle?.added_cents ?? pocket?.current_added_cents,
      incoming_carry_cents: pocket?.incoming_carry_cents,
      rollover_enabled: pocket?.rollover_enabled,
      remaining_cents: pocket?.remaining_cents,
    });
  }
  const total = roundedPlan.totalCents;
  const suggestedTotalBudgetCents = total;
  const summary = formatPocketReviewMoneyTokens(
    raw.summary.trim().replace(/\s+/g, " "),
    context.currency,
    locale,
  );
  if (!summary || summary.length > 500) return null;
  const headline = formatPocketReviewMoneyTokens(
    raw.headline.trim().replace(/\s+/g, " "),
    context.currency,
    locale,
  );
  if (!headline || headline.length > 140) return null;
  if (
    raw.income_coverage_status !== context.cash_flow.income_coverage_status ||
    raw.month_funding_status !== context.cash_flow.month_funding_status
  ) {
    return null;
  }
  const insightTitles = new Set<string>();
  const impactCeiling = Math.max(
    context.total_budget_cents,
    context.cash_flow.known_outflow_cents,
    ...context.historical_cycles.map((cycle) => cycle.actual_spend_cents),
  );
  const insights: AiPocketInsight[] = [];
  for (const item of raw.insights) {
    const title = formatPocketReviewMoneyTokens(
      item.title.trim().replace(/\s+/g, " "),
      context.currency,
      locale,
    );
    const insightSummary = formatPocketReviewMoneyTokens(
      item.summary.trim().replace(/\s+/g, " "),
      context.currency,
      locale,
    );
    const action =
      item.action == null
        ? undefined
        : formatPocketReviewMoneyTokens(
            item.action.trim().replace(/\s+/g, " "),
            context.currency,
            locale,
          );
    if (!title || !insightSummary || (item.action != null && !action)) {
      return null;
    }
    const normalizedTitle = title.toLowerCase();
    if (
      insightTitles.has(normalizedTitle) ||
      (item.envelope_id != null && !validIds.has(item.envelope_id)) ||
      (item.estimated_impact_cents != null &&
        item.estimated_impact_cents > impactCeiling)
    ) {
      return null;
    }
    insightTitles.add(normalizedTitle);
    insights.push({
      type: item.type,
      title,
      summary: insightSummary,
      action: action ?? undefined,
      estimated_impact_cents: item.estimated_impact_cents,
      envelope_id: item.envelope_id,
    });
  }
  const legacyText = (insight: AiPocketInsight | undefined) => {
    if (!insight) return undefined;
    return `${insight.summary}${insight.action ? ` ${insight.action}` : ""}`.slice(
      0,
      500,
    );
  };
  const positiveInsight = insights.find(
    (item) => item.type === "positive_progress",
  );
  const actionInsights = insights.filter(
    (item) => item.type !== "positive_progress",
  );

  return {
    headline,
    summary,
    financial_status: context.cash_flow.income_coverage_status,
    cash_flow: context.cash_flow,
    insights,
    celebration: legacyText(positiveInsight),
    top_spend_insight: legacyText(actionInsights[0]),
    pockets_health_tip: legacyText(actionInsights[1]),
    total_suggested_cents: total,
    suggested_total_budget_cents: suggestedTotalBudgetCents,
    suggestions,
  };
}

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new SyntaxError("Empty AI response");

  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    // Fall through to brace extraction for responses with prefix/suffix text.
  }

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(withoutFence.slice(start, end + 1));
  }

  throw new SyntaxError("AI response is not valid JSON");
}

function extractAllTextFromRaw(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const candidates = (raw as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return "";
  return candidates
    .flatMap((candidate: unknown) => {
      if (!candidate || typeof candidate !== "object") return [];
      const content = (candidate as { content?: unknown }).content;
      if (!content || typeof content !== "object") return [];
      const parts = (content as { parts?: unknown }).parts;
      return Array.isArray(parts) ? parts : [];
    })
    .map((part: unknown) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("")
    .trim();
}

async function generate(context: SuggestionContext, locale: string | null) {
  const budgetConstraint =
    "suggested_total_budget_cents must exactly equal the sum of suggested_amount_cents. It is a recommendation, not a saved budget or a statement of money in the user's accounts.";
  const maxOutputTokens = Math.min(5000, 1400 + context.pockets.length * 110);
  const currencyDisplay = buildPocketReviewCurrencyContext(
    context.currency,
    locale,
  );
  const modelContext = {
    suggestion_source: context.suggestion_source,
    currency: context.currency,
    currency_display: currencyDisplay,
    total_budget_cents: context.total_budget_cents,
    total_added_to_pockets_cents: context.total_added_to_pockets_cents,
    unallocated_budget_cents: context.unallocated_budget_cents,
    pockets: context.pockets.map(
      ({ icon: _icon, color: _color, ...pocket }) => pocket,
    ),
    current_cycle: context.current_cycle,
    historical_cycles: context.historical_cycles,
    cash_flow: context.cash_flow,
    upcoming_recurring_expenses: context.upcoming_recurring_expenses,
    upcoming_recurring_income: context.upcoming_recurring_income,
    evidence_limitations: {
      income_data_supplied:
        context.cash_flow.data_status === "complete" &&
        context.cash_flow.known_income_cents > 0,
      wallet_balance_supplied: false,
      merchant_or_description_data_supplied: false,
    },
  };
  const prompt = `First diagnose the user's known financial position for this cycle, then build a realistic monthly pocket plan and only the most useful coaching insights in ${
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
- For every monetary value in natural-language fields, use exactly {{money:<integer cents>}}. The server renders that token with the user's currency symbol and locale; do not write raw money amounts, currency codes, or dollar examples yourself. For example, ${currencyDisplay.example} must be written as {{money:123400}}.

Authoritative planning context:
- Suggestion Source: ${
    context.suggestion_source === "previous"
      ? "Using last month's pockets and performance as baseline"
      : "Refining existing current-month pockets"
  }
- Currency: ${context.currency || "the requested currency"}
- This month's total_budget_cents is the new money the user has chosen for this cycle. total_added_to_pockets_cents is how much is already assigned; unallocated_budget_cents is still free to assign. Do not treat carried money as new budget money.
- historical_cycles contains up to three completed financial cycles, newest first. Each pocket's history_analysis contains deterministic averages, ranges, budget outcomes, utilization, and largest-transaction concentration. Use these facts to distinguish repeated behavior from a possible one-off; a concentrated month is evidence for caution, not proof of why a purchase happened.
- The root pockets always describe this month's plan. For a pocket carried forward from last month, current_added_cents starts at zero, incoming_carry_cents is the exact balance brought forward under its rollover policy, and previous_cycle inside that pocket is its complete historical record.
- The current_cycle separates actual spending already recorded from future scheduled recurring expenses. Its pocket_activity applies current spending and upcoming recurring commitments to each listed pocket by its linked categories, including when the current month has not yet created pocket rows.
- historical_cycles[0] is the previous-cycle baseline when available. Projected recurring expenses in a past period were forecasts, not confirmed spending.
- opening_rollover_cents is a manual opening adjustment. rollover_from_previous_cents is the balance calculated from the prior cycle. incoming_carry_cents is their combined amount available at the start of this cycle.
- total_spend_cents, each pocket's spent_cents, and remaining_cents include both completed spending and included future recurring projections. Use the separate actual_spend_cents and projected_recurring_cents fields when explaining what has happened versus what is still scheduled.
- category_spending gives the complete category-level split for each cycle. unassigned_spending is the subset that is not linked to a listed pocket.
- Each pocket includes only its linked category names and aggregate amounts. No merchant names or transaction descriptions are supplied.
- Category activity includes deterministic transaction counts, active days, average transaction size, largest transaction, and largest-transaction share. Pocket activity includes transaction counts, largest transactions, and concentration. Use them to tell repeated small purchases from concentrated spending without inventing a cause.
- cash_flow compares recorded income plus projected recurring income with actual expenses plus projected recurring expenses. It is known income versus known outflow, not a bank balance or a guarantee that all future income and bills were recorded.
- income_coverage_status never includes carry. month_funding_status may include carry as a separate buffer. If income coverage is deficit but month funding is funded, say both: carry covers this cycle, but current income does not sustainably cover known outflow.
- known_funding_cents is known income plus carry. known_commitments_covered says whether that funding covers all recorded spending and scheduled recurring expenses in this cycle; it is null when income evidence is incomplete.
- If cash_flow.data_status is not complete or income_coverage_status is unknown, do not call the month comfortable, tight, affordable, or under pressure. Do not infer income pressure; state that recorded income is insufficient to assess coverage.
- Wallet balances, debt, savings contributions, goals, and essential-versus-flexible category roles are not supplied. safe_to_spend_status is always unavailable. Never calculate or imply a safe-to-spend amount, or call income_margin_cents or funding_margin_after_carry_cents "safe to spend" or "available cash".
- upcoming_recurring_expenses and upcoming_recurring_income contain privacy-safe dates, categories, and amounts. Use exact dates only when they materially help the user prepare.

Reasoning process (do this silently before writing JSON):
1. Establish income coverage and month funding from cash_flow. Keep these conclusions qualified as based on recorded income and known commitments.
2. Assess evidence strength: three consistent cycles are stronger than one cycle; one dominant purchase weakens any lifestyle-trend claim.
3. Protect known commitments: actual spending plus this month's projected recurring commitments matter before discretionary adjustments, while carried money must not be funded twice.
4. Decide whether each pocket should increase, decrease, or stay stable. Do not mechanically copy last spend. Prefer reallocation within the selected total over increasing every overspent pocket.
5. Treat a rollover pocket with accumulated carry and low irregular spending as a possible reserve, not automatically as unused budget. Describe it as a reserve only with cautious wording unless its supplied name clearly supports that role.
6. Keep recurring or essential-looking categories realistic, but do not label a category essential, savings, or debt unless its supplied name and evidence support that wording.
7. Identify the 2-4 highest-value things the user needs now, then check the complete plan and every explanation against supplied facts.

Instructions for each pocket in 'suggestions':
1. 'suggested_amount_cents': Suggest a realistic target in cents based on past spending, rollover carryovers, and healthy budget limits.
   - Treat positive incoming carry as money already available and do not fund it twice. If needed target is {{money:30000}} and carryover is {{money:5000}}, suggesting {{money:25000}} added is usually appropriate unless the pocket is clearly intended to build savings.
   - If 'rollover_negative' is true and 'incoming_carry_cents' is negative, note how the new target handles the deficit recovery.
   - If 'rollover_cap_cents' is set, respect the cap limits.
   - Use actual_spend_cents as completed spending and projected_recurring_cents only as known upcoming commitments. Never describe future projected expenses as money already spent.
    - Keep the total within total_budget_cents when it is positive. When it is zero, propose a conservative total and explain that applying the plan will set that amount as this month's budget.
2. 'reason': Clear, simple 1-2 sentence explanation of why this target makes sense based on their actual habits and rollover rules.
3. 'tip': Optional. Include one short, practical category-specific action only when the evidence supports a useful action. Do not repeat the reason.

Monthly budget recommendation:
1. 'suggested_total_budget_cents': Recommend the new money to plan for this cycle. Start with the current cycle's known recurring commitments and the suggested pocket additions, then compare recent completed cycles for a realistic trend.
   - Treat a one-time spike or unusually low month as a signal to explain, not a new normal.
   - Carry-over is already in a pocket and must not be added again to this total.
   - Split every unit of the recommendation across the listed pockets. suggested_total_budget_cents must exactly equal the sum of suggested_amount_cents; do not leave an unexplained remainder.
   - If history is thin or inconsistent, stay close to the most recent stable budget and avoid a confident claim.

Top-level review and insight cards:
1. 'headline': A specific, useful statement of what this plan means. Prefer conclusions such as income coverage, upcoming pressure, a persistent category problem, or a stable plan. Never use generic labels such as "Smart Spending Strategy".
2. 'summary': In 1-2 sentences, answer what this month means and name the main plan decisions. If income coverage is known, lead with it; otherwise clearly limit the conclusion to spending and commitments.
3. 'insights': Return 2-4 only when each is genuinely useful; fewer are allowed when evidence is thin. Rank by financial impact, relevance now, confidence, actionability, and usefulness beyond what the UI already shows.
   - When income evidence is complete, the first insight must address income coverage or whether known commitments are covered. The remaining insights should focus on the most consequential upcoming commitment, sustained pocket pattern, or reallocation decision.
   - 'title': State the actual finding, not a generic topic.
   - 'summary': Observation -> why it matters, using at least one amount, frequency, trend, variance, commitment, or carry fact when available.
   - 'action': Optional concrete action for this cycle. It must be achievable and connected to the recommended pocket amount.
   - 'estimated_impact_cents': Optional and only for direct arithmetic supported by context. Never invent an estimate.
   - 'envelope_id': Optional and only when the insight is primarily about one listed pocket.
   - Use 'positive_progress' only for specific supported behavior. Do not add praise merely to balance negative feedback.
4. Copy cash_flow.income_coverage_status and cash_flow.month_funding_status exactly into the same-named response fields. Do not reinterpret them.

Constraints:
- Never include a pocket ID that was not in AUTHORITATIVE_CONTEXT.
- ${budgetConstraint}
- Use only the supplied data. Do not invent unrecorded income, bills, goals, merchant behavior, purchase motives, or financial facts.
- Do not invent motives or describe why spending happened. Use cautious language such as "may" or "suggests" for a possible pattern, especially with fewer than two observed cycles or high single-transaction concentration.
- Rank optional insights by financial impact, confidence, actionability, relevance to this cycle, and likely usefulness. Do not fill a field merely to fill space, and never repeat the same observation across fields, reasons, or tips.
- Every reason or insight must cite at least one relevant supplied fact. If the same text could reasonably be shown to thousands of users, omit it or rewrite it using this user's evidence.
- All supplied monetary values are integer cents. Never say "cents" in user-facing text; the app formats the amounts.
- Assume the user is new to budgeting: avoid jargon, explain carry in plain language, avoid shame, and make each recommendation feel adjustable and achievable.
- Return only JSON matching the schema.

AUTHORITATIVE_CONTEXT:
${JSON.stringify(modelContext)}`;
  const vertex = getVertexAiConfigFromEnv();
  let lastError: unknown;
  let lastRetryableError: unknown;
  for (const model of POCKET_REVIEW_MODELS) {
    try {
      const chat = createVertexChatSession({
        model,
        vertex,
        systemInstruction:
          "You are Moneko's careful personal budgeting coach. Diagnose known cash flow before recommending a plan, separate sustainable income coverage from carry-funded availability, distinguish persistent patterns from uncertainty, and turn only supplied financial evidence into realistic monthly decisions. Never invent context, motives, or generic filler advice.",
      });
      const response = await sendGeminiMessageWithRetry(
        {
          sendMessage: (content) =>
            chat
              .sendMessage(content, {
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens,
                  responseMimeType: "application/json",
                  responseSchema: schema(),
                },
              })
              .then((result) => result.response),
        },
        prompt,
        { logPrefix: "pocket-month-suggestions" },
      );
      const responseText = response.text();
      try {
        return { model, value: parseJsonResponse(responseText) };
      } catch (parseError) {
        const fullText = extractAllTextFromRaw(response.raw);
        if (fullText && fullText !== responseText) {
          console.warn(
            "[pocket-month-suggestions] filtered text had no JSON, retrying with full text",
            {
              model,
              filteredLength: responseText.length,
              fullLength: fullText.length,
              filteredPreview: responseText.slice(0, 200),
              fullPreview: fullText.slice(0, 200),
            },
          );
          return { model, value: parseJsonResponse(fullText) };
        }
        throw parseError;
      }
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) continue;
      if (!isRetryableGeminiError(error)) {
        throw error;
      }
      lastRetryableError = error;
    }
  }
  throw lastRetryableError ?? lastError ?? new Error("GEMINI_UNAVAILABLE");
}

function previousMonthKey(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const daysInPreviousMonth = new Date(
    Date.UTC(previousYear, previousMonth, 0),
  ).getUTCDate();
  const previousDay = Math.min(day, daysInPreviousMonth);
  return [previousYear, previousMonth, previousDay]
    .map((part, index) => part.toString().padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
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
      return jsonResponse(
        {
          success: false,
          error: "Invalid suggestion request",
        },
        400,
      );
    }
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!url || !serviceKey) {
      return jsonResponse(
        {
          success: false,
          error: "Server configuration error",
        },
        500,
      );
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
      return jsonResponse(
        {
          success: false,
          error: auth.error || "Unauthorized",
        },
        auth.statusCode || 401,
      );
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
      return jsonResponse(
        {
          success: false,
          error: "Forbidden",
          code: "POCKET_SCOPE_FORBIDDEN",
        },
        403,
      );
    }
    if (
      monthError ||
      !month ||
      typeof month !== "object" ||
      Array.isArray(month)
    ) {
      throw monthError || new Error("INVALID_POCKETS_MONTH_CONTEXT");
    }
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
        return jsonResponse(
          {
            success: false,
            error: "Forbidden",
            code: "POCKET_SCOPE_FORBIDDEN",
          },
          403,
        );
      }
      if (index === 0) previousMonthError = historicalMonthError;
      if (
        !historicalMonthError &&
        historicalMonth &&
        typeof historicalMonth === "object" &&
        !Array.isArray(historicalMonth)
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
        throw (
          previousMonthError || new Error("INVALID_PREVIOUS_POCKETS_CONTEXT")
        );
      }
      if (previousContext.pockets.length === 0) {
        return jsonResponse(
          {
            success: false,
            error: "Create your first pocket before asking for suggestions.",
            code: "POCKETS_REQUIRED",
          },
          409,
        );
      }
    }
    const planContext = usesPreviousMonthPockets
      ? withNextMonthCarry(previousContext!)
      : currentContext;
    if (!planContext) {
      throw previousMonthError || new Error("INVALID_PREVIOUS_POCKETS_CONTEXT");
    }
    const income = await loadKnownIncome(
      userScopedSupabase,
      auth.userId,
      input,
    );
    const incomingCarryCents = planContext.pockets.reduce(
      (sum, pocket) => sum + pocket.incoming_carry_cents,
      0,
    );
    const cashFlow = deriveKnownCashFlow({
      dataStatus: income.dataStatus,
      recordedIncomeCents: income.recordedIncomeCents,
      projectedRecurringIncomeCents: income.projectedRecurringIncomeCents,
      actualExpenseCents: currentContext.actual_spend_cents,
      projectedRecurringExpenseCents: currentContext.projected_recurring_cents,
      incomingCarryCents,
    });
    const upcomingRecurringExpenses = buildUpcomingRecurringItems(
      (month as Record<string, unknown>).projected_recurring_expenses,
      "expense",
    );
    const context = buildSuggestionContext(
      {
        ...planContext,
        total_budget_cents: currentContext.total_budget_cents,
      },
      currentContext,
      historicalCycles,
      cashFlow,
      upcomingRecurringExpenses,
      income.upcomingRecurringIncome,
    );
    if (context.pockets.length > MAX_SUGGESTIONS) {
      return jsonResponse(
        {
          success: false,
          error: `AI plans support up to ${MAX_SUGGESTIONS} pockets.`,
          code: "AI_SUGGESTION_POCKET_LIMIT",
        },
        409,
      );
    }
    const { data: contact } = await supabase
      .from("user_contacts")
      .select("preferred_language")
      .eq("user_id", auth.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    try {
      const locale =
        input.locale ??
        (typeof contact?.preferred_language === "string"
          ? contact.preferred_language
          : "en");
      const generated = await generate(context, locale);
      const suggestions = normalize(generated.value, context, locale);
      if (!suggestions) {
        return jsonResponse(
          {
            success: false,
            code: "AI_SUGGESTION_SCHEMA_INVALID",
          },
          502,
        );
      }
      return jsonResponse({
        success: true,
        modelVersion: generated.model,
        suggestions,
        usesPreviousMonthPockets,
      });
    } catch (error) {
      if (!(error instanceof SyntaxError) && !isRetryableGeminiError(error)) {
        throw error;
      }
      return jsonResponse(
        {
          success: false,
          code:
            error instanceof SyntaxError
              ? "AI_SUGGESTION_RESPONSE_INVALID"
              : "AI_SUGGESTION_UNAVAILABLE",
        },
        error instanceof SyntaxError ? 502 : 503,
      );
    }
  } catch (error) {
    console.error(
      "[generate-pocket-month-review] failed",
      error instanceof Error ? error.message : String(error),
    );
    return jsonResponse(
      {
        success: false,
        error: "Unable to generate AI suggestions",
      },
      500,
    );
  }
});
