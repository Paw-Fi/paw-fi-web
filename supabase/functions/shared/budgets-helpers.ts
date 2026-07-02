import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCurrencySymbol } from "./currency-symbols.ts";

export type SupabaseClient = SupabaseJsClient;

export type ResolvePocketPercentageResult = {
  percentage: number | null;
  usedExistingPercentage: boolean;
  error: string | null;
};

export type PocketRolloverBreakdownCents = {
  baseBudgetCents: number;
  rolloverFromPreviousCents: number;
  openingRolloverCents: number;
  availableBudgetCents: number;
  spentCents: number;
  remainingCents: number;
  carryToNextPeriodCents: number;
};

function isMissingRolloverColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const message =
    `${record.code ?? ""} ${record.message ?? ""} ${record.details ?? ""} ${record.hint ?? ""}`.toLowerCase();
  const mentionsRolloverColumn =
    message.includes("rollover_group_id") ||
    message.includes("rollover_enabled") ||
    message.includes("rollover_negative") ||
    message.includes("rollover_cap_cents") ||
    message.includes("opening_rollover_cents");
  return (
    mentionsRolloverColumn &&
    (record.code === "42703" || record.code === "PGRST204")
  );
}

export function calculatePocketRolloverBreakdownCents({
  baseBudgetCents,
  incomingRolloverCents,
  openingRolloverCents,
  spentCents,
  rolloverEnabled,
  rolloverNegative,
  rolloverCapCents,
}: {
  baseBudgetCents: number;
  incomingRolloverCents: number;
  openingRolloverCents: number;
  spentCents: number;
  rolloverEnabled: boolean;
  rolloverNegative: boolean;
  rolloverCapCents: number | null;
}): PocketRolloverBreakdownCents {
  const sanitizedBase = Math.max(0, Math.round(baseBudgetCents || 0));
  const sanitizedSpent = Math.max(0, Math.round(spentCents || 0));
  const sanitizedOpening = rolloverEnabled
    ? Math.round(openingRolloverCents || 0)
    : 0;
  const positiveCap =
    rolloverCapCents == null
      ? null
      : Math.max(0, Math.round(rolloverCapCents || 0));
  const capPositive = (value: number) => {
    if (positiveCap == null || value <= 0) return value;
    return Math.min(value, positiveCap);
  };

  if (!rolloverEnabled) {
    const remaining = Math.max(sanitizedBase - sanitizedSpent, 0);
    return {
      baseBudgetCents: sanitizedBase,
      rolloverFromPreviousCents: 0,
      openingRolloverCents: 0,
      availableBudgetCents: sanitizedBase,
      spentCents: sanitizedSpent,
      remainingCents: remaining,
      carryToNextPeriodCents: 0,
    };
  }

  const incoming = capPositive(Math.round(incomingRolloverCents || 0));
  const available = sanitizedBase + incoming + sanitizedOpening;
  const remaining = available - sanitizedSpent;
  const carry = remaining < 0 && !rolloverNegative ? 0 : capPositive(remaining);

  return {
    baseBudgetCents: sanitizedBase,
    rolloverFromPreviousCents: incoming,
    openingRolloverCents: sanitizedOpening,
    availableBudgetCents: available,
    spentCents: sanitizedSpent,
    remainingCents: remaining,
    carryToNextPeriodCents: carry,
  };
}

function parseMonthRangeUtc(periodMonth: string | undefined | null): {
  monthStartStr: string;
  nextMonthStr: string;
} {
  const now = new Date();
  const fallback = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
  const raw = (periodMonth || fallback).slice(0, 7);
  const parts = raw.split("-");
  const year = Number(parts[0] || "0");
  const month = Number(parts[1] || "1");
  const safeYear =
    Number.isInteger(year) && year >= 1970 && year <= 9999
      ? year
      : now.getUTCFullYear();
  const safeMonth =
    Number.isInteger(month) && month >= 1 && month <= 12
      ? month
      : now.getUTCMonth() + 1;

  const start = new Date(Date.UTC(safeYear, safeMonth - 1, 1));
  const next = new Date(Date.UTC(safeYear, safeMonth, 1));

  return {
    monthStartStr: start.toISOString().slice(0, 10),
    nextMonthStr: next.toISOString().slice(0, 10),
  };
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function resolvePocketPercentageForUpsert({
  hasPercentageArg,
  providedPercentage,
  existingPercentage,
}: {
  hasPercentageArg: boolean;
  providedPercentage: unknown;
  existingPercentage: unknown;
}): ResolvePocketPercentageResult {
  if (hasPercentageArg) {
    const parsed = Number(providedPercentage);
    if (!Number.isFinite(parsed)) {
      return {
        percentage: null,
        usedExistingPercentage: false,
        error: "Pocket percentage must be a valid number",
      };
    }
    return {
      percentage: clampPercentage(parsed),
      usedExistingPercentage: false,
      error: null,
    };
  }

  if (
    typeof existingPercentage === "number" &&
    Number.isFinite(existingPercentage)
  ) {
    return {
      percentage: clampPercentage(existingPercentage),
      usedExistingPercentage: true,
      error: null,
    };
  }

  return {
    percentage: null,
    usedExistingPercentage: false,
    error: "percentage is required",
  };
}

export async function createOrUpdateBudget(
  supabase: SupabaseClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string,
  total_budget_cents: number,
  _isPortfolio: boolean = false,
) {
  const normalizedPeriodMonth = parseMonthRangeUtc(period_month).monthStartStr;
  const updatedAt = new Date().toISOString();
  const payload: any = {
    user_id: userId,
    household_id: householdId,
    period_month: normalizedPeriodMonth,
    currency,
    total_budget_cents,
    updated_at: updatedAt,
  };

  const buildExistingQuery = () => {
    let query = supabase
      .from("budgets")
      .select("id")
      .eq("currency", currency)
      .eq("period_month", normalizedPeriodMonth)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (householdId) {
      query = query.eq("household_id", householdId);
    } else {
      query = query.eq("user_id", userId).is("household_id", null);
    }

    return query;
  };

  const { data: existing, error: existingErr } =
    await buildExistingQuery().maybeSingle();
  if (existingErr) {
    return { data: null, error: existingErr } as const;
  }

  if (existing?.id) {
    return supabase
      .from("budgets")
      .update({ total_budget_cents, updated_at: updatedAt })
      .eq("id", existing.id)
      .select()
      .maybeSingle();
  }

  const insertRes = await supabase
    .from("budgets")
    .insert(payload)
    .select()
    .maybeSingle();

  if (!insertRes.error || insertRes.error.code !== "23505") {
    return insertRes;
  }

  // Concurrent insert won the race. Re-read and update target row.
  const { data: winner, error: winnerErr } =
    await buildExistingQuery().maybeSingle();
  if (winnerErr || !winner?.id) {
    return { data: null, error: winnerErr ?? insertRes.error } as const;
  }

  return supabase
    .from("budgets")
    .update({ total_budget_cents, updated_at: updatedAt })
    .eq("id", winner.id)
    .select()
    .maybeSingle();
}

export async function upsertEnvelope(
  supabase: SupabaseClient,
  budgetId: string,
  userId: string,
  householdId: string | null,
  name: string,
  percentage: number,
  currency: string,
  totalBudgetCents?: number | null,
  options: { color?: unknown; icon?: unknown } = {},
) {
  // Compute budget_amount_cents if total is known
  // This ensures the canonical amount is set, not just derived by trigger
  const budgetAmountCents =
    totalBudgetCents != null && Number.isFinite(totalBudgetCents)
      ? Math.round((percentage / 100) * totalBudgetCents)
      : undefined;
  const color =
    typeof options.color === "string" && options.color.trim()
      ? options.color.trim()
      : undefined;
  const icon =
    typeof options.icon === "string" && options.icon.trim()
      ? options.icon.trim()
      : undefined;
  const normalizedName = name.trim().toLowerCase();
  const normalizedCurrency = currency.trim().toUpperCase() || "USD";
  let rolloverPayload: Record<string, unknown> = {};

  let lineageQuery = supabase
    .from("budget_envelopes")
    .select(
      "name,rollover_group_id,rollover_enabled,rollover_negative,rollover_cap_cents",
    )
    .eq("user_id", userId)
    .ilike("currency", normalizedCurrency)
    .order("updated_at", { ascending: false })
    .limit(50);
  lineageQuery =
    householdId == null
      ? lineageQuery.is("household_id", null)
      : lineageQuery.eq("household_id", householdId);
  const { data: lineageCandidates, error: lineageError } = await lineageQuery;
  if (!lineageError || isMissingRolloverColumnError(lineageError)) {
    const lineage = (lineageCandidates ?? []).find(
      (row) =>
        typeof row.name === "string" &&
        row.name.trim().toLowerCase() === normalizedName,
    );
    if (lineage?.rollover_group_id) {
      rolloverPayload = {
        rollover_group_id: lineage.rollover_group_id,
        rollover_enabled: lineage.rollover_enabled === true,
        rollover_negative: lineage.rollover_negative === true,
        rollover_cap_cents: lineage.rollover_cap_cents ?? null,
        opening_rollover_cents: 0,
      };
    }
  }

  const payload: any = {
    budget_id: budgetId,
    user_id: userId,
    household_id: householdId,
    name,
    budget_percentage: percentage,
    currency,
    updated_at: new Date().toISOString(),
    ...(color ? { color } : {}),
    ...(icon ? { icon } : {}),
    ...rolloverPayload,
    // Only include budget_amount_cents if we have a valid value
    ...(budgetAmountCents !== undefined
      ? { budget_amount_cents: budgetAmountCents }
      : {}),
  };
  return supabase
    .from("budget_envelopes")
    .upsert(payload, { onConflict: "budget_id,name" })
    .select()
    .maybeSingle();
}

export async function upsertEnvelopeAllocation(
  supabase: SupabaseClient,
  envelopeId: string,
  period_month: string,
  amount_cents: number,
) {
  const normalizedPeriodMonth = parseMonthRangeUtc(period_month).monthStartStr;
  return supabase.from("envelope_allocations").upsert(
    {
      envelope_id: envelopeId,
      period_month: normalizedPeriodMonth,
      amount_cents,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "envelope_id,period_month" },
  );
}

export async function upsertEnvelopeCategoryLink(
  supabase: SupabaseClient,
  envelopeId: string,
  category: string,
) {
  if (typeof category !== "string") {
    return { data: null, error: null } as const;
  }
  const normalized = category.trim().toLowerCase();
  if (!normalized) {
    return { data: null, error: null } as const;
  }
  return supabase.from("envelope_category_links").upsert(
    {
      envelope_id: envelopeId,
      category: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "envelope_id,category" },
  );
}

export async function getBudgetStatusDirect(
  supabase: SupabaseClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string,
  isPortfolio: boolean = false,
  contactId?: string,
) {
  // Normalize to month range
  const { monthStartStr, nextMonthStr } = parseMonthRangeUtc(period_month);

  let budgetQuery = supabase
    .from("budgets")
    .select("id, total_budget_cents, currency, period_month")
    .eq("currency", currency)
    .gte("period_month", monthStartStr)
    .lt("period_month", nextMonthStr)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (householdId) {
    budgetQuery = budgetQuery.eq("household_id", householdId);
  } else {
    budgetQuery = budgetQuery.eq("user_id", userId).is("household_id", null);
  }

  const { data: budgetRows, error: budgetErr } = await budgetQuery;
  if (budgetErr) return { error: budgetErr };
  const budget = (budgetRows || [])[0];
  if (!budget) return { budget: null };

  const { data: envelopes, error: envErr } = await supabase
    .from("budget_envelopes")
    .select(
      "id, name, budget_percentage, budget_amount_cents, currency, rollover_group_id, rollover_enabled, rollover_negative, rollover_cap_cents, opening_rollover_cents",
    )
    .eq("budget_id", budget.id);
  if (envErr) return { error: envErr };

  const envIds = (envelopes || []).map((e: any) => e.id);

  const { data: allocs, error: allocErr } = envIds.length
    ? await supabase
        .from("envelope_allocations")
        .select("envelope_id, amount_cents, period_month")
        .in("envelope_id", envIds)
        .gte("period_month", monthStartStr)
        .lt("period_month", nextMonthStr)
    : { data: [], error: null };
  if (allocErr) return { error: allocErr };

  // Fetch category links for envelopes to calculate spend per pocket
  const { data: links, error: linksErr } = envIds.length
    ? await supabase
        .from("envelope_category_links")
        .select("envelope_id, category")
        .in("envelope_id", envIds)
    : { data: [], error: null };
  if (linksErr) return { error: linksErr };
  const categoryToEnvelope: Record<string, string[]> = {};
  (links || []).forEach((l: any) => {
    const cat = String(l.category || "").toLowerCase();
    if (!cat) return;
    const envId = String(l.envelope_id || "");
    if (!envId) return;
    const list = categoryToEnvelope[cat] || [];
    list.push(envId);
    categoryToEnvelope[cat] = list;
  });

  // Fetch expenses for the month to compute spending
  let expensesQuery = supabase
    .from("expenses")
    .select(
      "amount_cents, category, currency, date, household_id, user_id, contact_id, type",
    )
    .eq("type", "expense")
    .eq("currency", currency)
    .is("deleted_at", null)
    .gte("date", monthStartStr)
    .lt("date", nextMonthStr);

  if (householdId) {
    expensesQuery = expensesQuery.eq("household_id", householdId);
    // Portfolio spaces behave like personal (user-scoped), regular household spaces aggregate by household.
    if (isPortfolio === true) {
      expensesQuery = expensesQuery.eq("user_id", userId);
    }
  } else {
    expensesQuery = expensesQuery
      .eq("contact_id", contactId ?? userId)
      .is("household_id", null);
  }

  const { data: expenses, error: expErr } = await expensesQuery;
  if (expErr) return { error: expErr };

  const spentMap: Record<string, number> = {};
  let totalSpent = 0;
  (expenses || []).forEach((e: any) => {
    const amt = Number(e.amount_cents) || 0;
    totalSpent += amt;
    const cat = String(e.category || "").toLowerCase();
    const envList = categoryToEnvelope[cat];
    if (envList && envList.length) {
      envList.forEach((envId) => {
        spentMap[envId] = (spentMap[envId] || 0) + amt;
      });
    }
  });

  const allocMap: Record<string, number> = {};
  for (const a of allocs || []) {
    const envId = String((a as any).envelope_id || "");
    if (!envId) continue;
    allocMap[envId] = Number((a as any).amount_cents) || 0;
  }

  const rolloverScope = householdId
    ? isPortfolio
      ? "portfolio"
      : "household"
    : "personal";
  const envelopeStatus: any[] = [];
  for (const e of envelopes || []) {
    // Read precedence: allocation(period_month) -> budget_amount_cents -> derived from percentage
    const alloc =
      allocMap[e.id] != null
        ? allocMap[e.id]
        : e.budget_amount_cents != null
          ? Number(e.budget_amount_cents)
          : Math.round(
              ((e.budget_percentage || 0) / 100) *
                (budget.total_budget_cents || 0),
            );
    const spent = spentMap[e.id] != null ? spentMap[e.id] : 0;
    let incomingRolloverCents = 0;

    if (e.rollover_enabled === true) {
      const { data: rolloverData, error: rolloverErr } = await supabase.rpc(
        "calculate_pocket_rollover_carry_v1",
        {
          p_user_id: userId,
          p_scope: rolloverScope,
          p_household_id: householdId,
          p_currency: currency,
          p_envelope_name: e.name ?? "",
          p_rollover_group_id: e.rollover_group_id ?? null,
          p_period_month: monthStartStr,
        },
      );

      if (!rolloverErr) {
        incomingRolloverCents = Number(rolloverData) || 0;
      } else {
        console.error("[budgets] Failed to calculate pocket rollover", {
          envelopeId: e.id,
          rolloverGroupId: e.rollover_group_id ?? null,
          periodMonth: monthStartStr,
          error: rolloverErr,
        });
        return { error: rolloverErr };
      }
    }

    const rollover = calculatePocketRolloverBreakdownCents({
      baseBudgetCents: alloc,
      incomingRolloverCents,
      openingRolloverCents: Number(e.opening_rollover_cents) || 0,
      spentCents: spent,
      rolloverEnabled: e.rollover_enabled === true,
      rolloverNegative: e.rollover_negative === true,
      rolloverCapCents:
        e.rollover_cap_cents == null ? null : Number(e.rollover_cap_cents),
    });
    envelopeStatus.push({
      id: e.id,
      name: e.name,
      rollover_group_id: e.rollover_group_id ?? null,
      allocated_cents: alloc,
      base_budget_cents: alloc,
      rollover_from_previous_cents: rollover.rolloverFromPreviousCents,
      opening_rollover_cents: rollover.openingRolloverCents,
      available_budget_cents: rollover.availableBudgetCents,
      spent_cents: spent,
      remaining_cents: rollover.remainingCents,
      rollover_enabled: e.rollover_enabled === true,
      rollover_negative: e.rollover_negative === true,
      rollover_cap_cents:
        e.rollover_cap_cents == null ? null : Number(e.rollover_cap_cents),
    });
  }

  const totalAllocated = envelopeStatus.reduce(
    (s: number, e: any) => s + (e.allocated_cents || 0),
    0,
  );
  const totalSpentAll = totalSpent;
  const totalAvailableBudget = envelopeStatus.reduce(
    (s: number, e: any) => s + (e.available_budget_cents || 0),
    0,
  );
  const hasRolloverEnabled = envelopeStatus.some(
    (e: any) => e.rollover_enabled === true,
  );
  const displayBudgetCents = hasRolloverEnabled
    ? totalAvailableBudget || budget.total_budget_cents || 0
    : budget.total_budget_cents || 0;

  return {
    budget,
    envelopes: envelopeStatus,
    totals: {
      budget_cents: displayBudgetCents,
      allocated_cents: totalAllocated,
      spent_cents: totalSpentAll,
      remaining_cents: Math.max(displayBudgetCents - totalSpentAll, 0),
    },
    chart: buildBudgetGauge(
      budget.total_budget_cents || 0,
      totalSpentAll,
      currency,
    ),
  };
}

function buildBudgetGauge(
  total_cents: number,
  spent_cents: number,
  currency: string,
) {
  if (!total_cents) return null;
  const totalMajor = Math.max(total_cents / 100, 0);
  const spentMajor = Math.max(spent_cents / 100, 0);
  const remainingMajor = Math.max(totalMajor - spentMajor, 0);
  const sym = getCurrencySymbol(currency) || currency.toUpperCase();

  // Define three segments: safe (0-50%), watch (50-80%), warning (80-100%)
  const seg1 = totalMajor * 0.5;
  const seg2 = totalMajor * 0.3;
  const seg3 = Math.max(totalMajor - seg1 - seg2, 0);

  const chartConfig = {
    type: "gauge",
    data: {
      datasets: [
        {
          value: spentMajor,
          data: [seg1, seg2, seg3],
          backgroundColor: ["#4BC0C0", "#F7C948", "#F7729B"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      valueLabel: {
        fontSize: 18,
        backgroundColor: "transparent",
        color: "#000",
        formatter: (value: number) => `${sym}${value.toFixed(2)}`,
        bottomMarginPercentage: 10,
      },
      title: {
        display: true,
        text: `Remaining: ${sym}${remainingMajor.toFixed(2)}`,
        fontSize: 14,
      },
    },
  };

  const qs = encodeURIComponent(JSON.stringify(chartConfig));
  // Force gauge plugin (Chart.js 2 gauge)
  return `https://quickchart.io/chart?c=${qs}&chartjs=2.9.4&devicePixelRatio=2`;
}
