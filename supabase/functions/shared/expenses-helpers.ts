import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { normalizeCategory } from "./category-colors.ts";

export type SupabaseClient = ReturnType<typeof createClient>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePercentage(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizeShares(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  const shares = Math.trunc(value);
  return shares > 0 ? shares : null;
}

function normalizeAmount(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  return value < 0 ? 0 : value;
}

function allocateCentsByWeights(
  totalCents: number,
  weights: number[],
): number[] {
  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.trunc(totalCents))
    : 0;
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0);

  if (safeTotal === 0 || totalWeight <= 0 || safeWeights.length === 0) {
    return safeWeights.map(() => 0);
  }

  const floors: number[] = [];
  const fracs: { idx: number; frac: number }[] = [];
  let sumFloors = 0;

  for (let i = 0; i < safeWeights.length; i++) {
    const weight = safeWeights[i];
    if (weight <= 0) {
      floors.push(0);
      continue;
    }
    const raw = safeTotal * (weight / totalWeight);
    const floored = Math.floor(raw);
    const frac = raw - floored;
    floors.push(floored);
    sumFloors += floored;
    fracs.push({ idx: i, frac });
  }

  let remainder = safeTotal - sumFloors;
  if (remainder <= 0) return floors;

  fracs.sort((a, b) => b.frac - a.frac);
  if (fracs.length === 0) return floors;

  let cursor = 0;
  while (remainder > 0) {
    const target = fracs[cursor % fracs.length].idx;
    floors[target] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return floors;
}

export interface FetchExpensesOptions {
  limit?: number;
  startDate?: string;
  endDate?: string;
  householdId?: string | null;
  type?: "expense" | "income";
  currency?: string;
}

export async function fetchExpensesDirect(
  supabase: SupabaseClient,
  contactId: string,
  opts: FetchExpensesOptions
) {
  let query = supabase
    .from("expenses")
    .select(
      "id, type, date, category, raw_text, amount_cents, currency, receipt_image_url, split_group_id, household_id, is_recurring, recurrence_rule, attachments, created_at",
      { count: "exact" },
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 5);

  if (opts.type) query = query.eq("type", opts.type);

  if (opts.householdId) {
    query = query.eq("household_id", opts.householdId);
  } else {
    query = query.eq("contact_id", contactId).is("household_id", null);
  }

  if (opts.startDate) query = query.gte("date", opts.startDate);
  if (opts.endDate) query = query.lte("date", opts.endDate);
  if (opts.currency) query = query.eq("currency", opts.currency);

  return query;
}

export interface SaveExpenseParams {
  expenseId?: string;
  amount: number;
  category: string;
  date?: string;
  currency: string;
  description?: string;
  householdId?: string | null;
  isRecurring?: boolean;
  recurrence_rule?: Record<string, unknown>;
  type?: "expense" | "income";
  payerUserId?: string;
  customSplits?: CustomSplits;
}

export interface MemberSplit {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface CustomSplits {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplit[];
}

export async function saveExpenseDirect(
  supabase: SupabaseClient,
  contactId: string,
  userId: string,
  params: SaveExpenseParams
) {
  const amount_cents = Math.round((params.amount || 0) * 100);
  const date = params.date || new Date().toISOString().split("T")[0];
  const category = normalizeCategory(params.category || "other");
  const isHouseholdExpense =
    !!params.householdId && (params.type || "expense") === "expense";
  const payload: Record<string, unknown> = {
    contact_id: contactId,
    user_id: userId,
    household_id: params.householdId || null,
    type: params.type || "expense",
    amount_cents,
    currency: params.currency,
    category,
    date,
    raw_text: params.description || null,
    is_recurring: params.isRecurring || false,
    recurrence_rule: params.recurrence_rule || null,
  };
  if (params.expenseId) {
    return supabase.from("expenses").update(payload).eq("id", params.expenseId).select().single();
  }

  const insertRes = await supabase.from("expenses").insert(payload).select().single();
  if (insertRes.error || !insertRes.data) return insertRes;

  // Household expense: create split group + split lines (equal by default).
  if (!isHouseholdExpense) return insertRes;

  const householdId = params.householdId as string;
  const { data: members, error: membersError } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);
  if (membersError || !members || members.length === 0) return insertRes;

  const memberIds = members.map((m: any) => m.user_id as string).filter(Boolean);
  if (memberIds.length === 0) return insertRes;

  const rawSplitType = (params.customSplits?.splitType || "equal")
    .toString()
    .trim()
    .toLowerCase();
  const normalizedSplitType =
    (["equal", "amount", "percentage", "shares"] as const).includes(rawSplitType as any)
      ? (rawSplitType as CustomSplits["splitType"])
      : "equal";
  const hasMemberSplits = Array.isArray(params.customSplits?.memberSplits) &&
    params.customSplits!.memberSplits.length > 0;
  const customSplits = hasMemberSplits && normalizedSplitType !== "equal"
    ? params.customSplits
    : undefined;
  const splitType = customSplits ? normalizedSplitType : "equal";

  let payerUserId = params.payerUserId || userId;
  if (!memberIds.includes(payerUserId)) {
    payerUserId = userId;
  }

  const { data: splitGroup, error: splitGroupError } = await supabase
    .from("expense_split_groups")
    .insert({
      household_id: householdId,
      expense_id: insertRes.data.id,
      payer_user_id: payerUserId,
      split_type: splitType,
      currency: params.currency,
      total_amount_cents: amount_cents,
      description: params.description || null,
    })
    .select()
    .single();
  if (splitGroupError || !splitGroup) return insertRes;

  let splitLines: any[] = [];

  if (splitType === "equal") {
    const per = Math.floor(amount_cents / memberIds.length);
    const remainder = amount_cents - per * memberIds.length;
    splitLines = memberIds.map((memberId, index) => ({
      split_group_id: splitGroup.id,
      user_id: memberId,
      amount_cents: per + (index === 0 ? remainder : 0),
    }));
  } else if (splitType === "amount" && customSplits) {
    const normalizedById = new Map<string, MemberSplit>();
    for (const s of customSplits.memberSplits || []) {
      if (!memberIds.includes(s.userId)) continue;
      normalizedById.set(s.userId, { userId: s.userId, amount: normalizeAmount(s.amount) });
    }
    const full = memberIds.map((id) => normalizedById.get(id) || { userId: id, amount: 0 });
    const cents = full.map((s) => Math.max(0, Math.round((s.amount || 0) * 100)));
    const sum = cents.reduce((a, b) => a + b, 0);
    const diff = amount_cents - sum;
    if (cents.length > 0 && diff !== 0) cents[cents.length - 1] = Math.max(0, cents[cents.length - 1] + diff);
    splitLines = full.map((s, idx) => ({
      split_group_id: splitGroup.id,
      user_id: s.userId,
      amount_cents: cents[idx],
    }));
  } else if (splitType === "percentage" && customSplits) {
    const normalizedById = new Map<string, MemberSplit>();
    for (const s of customSplits.memberSplits || []) {
      if (!memberIds.includes(s.userId)) continue;
      normalizedById.set(s.userId, { userId: s.userId, percentage: normalizePercentage(s.percentage) });
    }
    const full = memberIds.map((id) => normalizedById.get(id) || { userId: id, percentage: 0 });
    const weights = full.map((s) => s.percentage || 0);
    const cents = allocateCentsByWeights(amount_cents, weights);
    splitLines = full.map((s, idx) => ({
      split_group_id: splitGroup.id,
      user_id: s.userId,
      amount_cents: cents[idx],
      percentage: s.percentage,
    }));
  } else if (splitType === "shares" && customSplits) {
    const normalizedById = new Map<string, MemberSplit>();
    for (const s of customSplits.memberSplits || []) {
      if (!memberIds.includes(s.userId)) continue;
      normalizedById.set(s.userId, { userId: s.userId, shares: normalizeShares(s.shares) ?? 1 });
    }
    const full = memberIds.map((id) => normalizedById.get(id) || { userId: id, shares: 1 });
    const weights = full.map((s) => s.shares || 0);
    const cents = allocateCentsByWeights(amount_cents, weights);
    splitLines = full.map((s, idx) => ({
      split_group_id: splitGroup.id,
      user_id: s.userId,
      amount_cents: cents[idx],
      shares: s.shares ?? null,
    }));
  } else {
    // Fallback to equal
    const per = Math.floor(amount_cents / memberIds.length);
    const remainder = amount_cents - per * memberIds.length;
    splitLines = memberIds.map((memberId, index) => ({
      split_group_id: splitGroup.id,
      user_id: memberId,
      amount_cents: per + (index === 0 ? remainder : 0),
    }));
  }

  await supabase.from("expense_split_lines").insert(splitLines);
  await supabase
    .from("expenses")
    .update({ split_group_id: splitGroup.id, household_id: householdId })
    .eq("id", insertRes.data.id);

  const refreshed = await supabase
    .from("expenses")
    .select("*")
    .eq("id", insertRes.data.id)
    .single();

  return refreshed.error ? insertRes : refreshed;
}

export async function deleteExpenseDirect(
  supabase: SupabaseClient,
  contactId: string,
  expenseId: string
) {
  return supabase.from("expenses").delete().eq("id", expenseId).eq("contact_id", contactId);
}
