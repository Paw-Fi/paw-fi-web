import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCurrencySymbol } from "./currency-symbols.ts";

export type SupabaseClient = ReturnType<typeof createClient>;

export async function createOrUpdateBudget(
  supabase: SupabaseClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string,
  total_budget_cents: number
) {
  const payload: any = {
    user_id: userId,
    household_id: householdId,
    period_month,
    currency,
    total_budget_cents,
    updated_at: new Date().toISOString(),
  };
  return supabase.from("budgets").upsert(payload, { onConflict: "user_id,household_id,currency,period_month" }).select().maybeSingle();
}

export async function upsertEnvelope(
  supabase: SupabaseClient,
  budgetId: string,
  userId: string,
  householdId: string | null,
  name: string,
  percentage: number,
  currency: string
) {
  const payload: any = {
    budget_id: budgetId,
    user_id: userId,
    household_id: householdId,
    name,
    budget_percentage: percentage,
    currency,
    updated_at: new Date().toISOString(),
  };
  return supabase.from("budget_envelopes").upsert(payload, { onConflict: "budget_id,name" }).select().maybeSingle();
}

export async function upsertEnvelopeAllocation(
  supabase: SupabaseClient,
  envelopeId: string,
  period_month: string,
  amount_cents: number
) {
  return supabase.from("envelope_allocations").upsert({
    envelope_id: envelopeId,
    period_month,
    amount_cents,
    updated_at: new Date().toISOString(),
  }, { onConflict: "envelope_id,period_month" });
}

export async function upsertEnvelopeCategoryLink(
  supabase: SupabaseClient,
  envelopeId: string,
  category: string
) {
  return supabase.from("envelope_category_links").upsert({
    envelope_id: envelopeId,
    category: category.toLowerCase(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "envelope_id,category" });
}

export async function getBudgetStatusDirect(
  supabase: SupabaseClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string
) {
  // Normalize to month range
  const monthStart = (period_month || new Date().toISOString().slice(0, 10)).slice(0, 7) + "-01";
  const startDate = new Date(monthStart + "T00:00:00Z");
  const nextMonth = new Date(startDate);
  nextMonth.setUTCMonth(startDate.getUTCMonth() + 1);
  const monthStartStr = startDate.toISOString().slice(0, 10);
  const nextMonthStr = nextMonth.toISOString().slice(0, 10);

  const { data: budgetRows, error: budgetErr } = await supabase
    .from("budgets")
    .select("id, total_budget_cents, currency, period_month")
    .eq("user_id", userId)
    .eq("currency", currency)
    .gte("period_month", monthStartStr)
    .lt("period_month", nextMonthStr)
    [householdId ? "eq" : "is"]("household_id", householdId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (budgetErr) return { error: budgetErr };
  const budget = (budgetRows || [])[0];
  if (!budget) return { budget: null };

  const { data: envelopes, error: envErr } = await supabase
    .from("budget_envelopes")
    .select("id, name, budget_percentage, currency")
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
  const categoryToEnvelope = new Map<string, string[]>();
  (links || []).forEach((l: any) => {
    const cat = String(l.category || "").toLowerCase();
    if (!cat) return;
    const list = categoryToEnvelope.get(cat) || [];
    list.push(l.envelope_id as string);
    categoryToEnvelope.set(cat, list);
  });

  // Fetch expenses for the month to compute spending
  const { data: expenses, error: expErr } = await supabase
    .from("expenses")
    .select("amount_cents, category, currency, date, household_id, user_id, type")
    .eq("type", "expense")
    .eq("currency", currency)
    .gte("date", monthStartStr)
    .lt("date", nextMonthStr)
    [householdId ? "eq" : "is"]("household_id", householdId)
    .eq("user_id", userId);
  if (expErr) return { error: expErr };

  const spentMap = new Map<string, number>();
  let totalSpent = 0;
  (expenses || []).forEach((e: any) => {
    const amt = Number(e.amount_cents) || 0;
    totalSpent += amt;
    const cat = String(e.category || "").toLowerCase();
    const envList = categoryToEnvelope.get(cat);
    if (envList && envList.length) {
      envList.forEach((envId) => {
        spentMap.set(envId, (spentMap.get(envId) || 0) + amt);
      });
    }
  });

  const allocMap = new Map<string, number>();
  for (const a of allocs || []) allocMap.set(a.envelope_id as string, Number(a.amount_cents) || 0);

  const envelopeStatus = (envelopes || []).map((e: any) => {
    const alloc = allocMap.get(e.id) ?? Math.round((e.budget_percentage || 0) / 100 * (budget.total_budget_cents || 0));
    const spent = spentMap.get(e.id) ?? 0;
    return {
      id: e.id,
      name: e.name,
      allocated_cents: alloc,
      spent_cents: spent,
      remaining_cents: Math.max(alloc - spent, 0),
    };
  });

  const totalAllocated = envelopeStatus.reduce((s, e) => s + e.allocated_cents, 0);
  const totalSpentAll = totalSpent;

  return {
    budget,
    envelopes: envelopeStatus,
    totals: {
      budget_cents: budget.total_budget_cents || 0,
      allocated_cents: totalAllocated,
      spent_cents: totalSpentAll,
      remaining_cents: Math.max((budget.total_budget_cents || 0) - totalSpentAll, 0),
    },
    chart: buildBudgetGauge(budget.total_budget_cents || 0, totalSpentAll, currency),
  };
}

function buildBudgetGauge(total_cents: number, spent_cents: number, currency: string) {
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
