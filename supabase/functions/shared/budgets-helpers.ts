import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
  const { data: budget, error: budgetErr } = await supabase
    .from("budgets")
    .select("id, total_budget_cents, currency, period_month")
    .eq("user_id", userId)
    .eq("currency", currency)
    .eq("period_month", period_month)
    .eq("household_id", householdId)
    .maybeSingle();
  if (budgetErr) return { error: budgetErr };
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
        .eq("period_month", period_month)
    : { data: [], error: null };
  if (allocErr) return { error: allocErr };

  const { data: spentRows, error: spentErr } = envIds.length
    ? await supabase
        .from("v_envelope_monthly_spend")
        .select("envelope_id, period_month, spent_cents")
        .in("envelope_id", envIds)
        .eq("period_month", period_month)
    : { data: [], error: null };
  if (spentErr) return { error: spentErr };

  const allocMap = new Map<string, number>();
  for (const a of allocs || []) allocMap.set(a.envelope_id as string, Number(a.amount_cents) || 0);
  const spentMap = new Map<string, number>();
  for (const s of spentRows || []) spentMap.set(s.envelope_id as string, Number(s.spent_cents) || 0);

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
  const totalSpent = envelopeStatus.reduce((s, e) => s + e.spent_cents, 0);

  return {
    budget,
    envelopes: envelopeStatus,
    totals: {
      budget_cents: budget.total_budget_cents || 0,
      allocated_cents: totalAllocated,
      spent_cents: totalSpent,
      remaining_cents: Math.max((budget.total_budget_cents || 0) - totalSpent, 0),
    },
  };
}
