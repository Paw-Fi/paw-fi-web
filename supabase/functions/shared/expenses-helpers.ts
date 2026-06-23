import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  normalizeCategoryForStorage,
  sanitizeCategoryName,
} from "./category-colors.ts";
import {
  ensureUserCategory,
  learnUserCategoryPreference,
} from "./user-categories.ts";

export type SupabaseClient = SupabaseJsClient;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NEVER_UUID = "00000000-0000-0000-0000-000000000000";

function sanitizeUuid(value: string): string | null {
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function sanitizeUuidList(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen: Record<string, true> = {};
  for (const v of values) {
    if (typeof v !== "string") continue;
    const s = sanitizeUuid(v);
    if (!s) continue;
    if (seen[s]) continue;
    seen[s] = true;
    out.push(s);
  }
  return out;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && isFinite(value);
}

function normalizePercentage(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizeShares(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  const shares = Math.floor(value);
  return shares > 0 ? shares : null;
}

function normalizeAmount(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  return value < 0 ? 0 : value;
}

function isSplitType(value: string): value is CustomSplits["splitType"] {
  return (
    value === "equal" ||
    value === "amount" ||
    value === "percentage" ||
    value === "shares"
  );
}

function allocateCentsByWeights(
  totalCents: number,
  weights: number[],
): number[] {
  const safeTotal = isFinite(totalCents)
    ? Math.max(0, Math.floor(totalCents))
    : 0;
  const safeWeights = weights.map((w) => (isFinite(w) && w > 0 ? w : 0));
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
  isPortfolio?: boolean;
  portfolioHouseholdIds?: string[];
  // Optional hints used by some bot flows (currently ignored by query logic)
  personalOnly?: boolean;
  sharedOnly?: boolean;
  sharedHouseholdIds?: string[];
  type?: "expense" | "income";
  currency?: string;
}

export async function fetchExpensesDirect(
  supabase: SupabaseClient,
  contactId: string,
  opts: FetchExpensesOptions,
) {
  let query = supabase
    .from("expenses")
    .select(
      "id, type, date, category, raw_text, amount_cents, currency, receipt_image_url, split_group_id, household_id, is_recurring, recurrence_rule, attachments, created_at",
      { count: "exact" },
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .is("deleted_at", null)
    .limit(opts.limit ?? 5);

  if (opts.type) query = query.eq("type", opts.type);

  const safePortfolioIds = sanitizeUuidList(opts.portfolioHouseholdIds);

  if (opts.householdId) {
    query = query.eq("household_id", opts.householdId);
  } else if (opts.isPortfolio === true) {
    query = query.eq("contact_id", contactId);
    if (safePortfolioIds.length) {
      query = query.in("household_id", safePortfolioIds);
    } else {
      query = query.eq("id", NEVER_UUID);
    }
  } else {
    if (safePortfolioIds.length) {
      const safeContactId = sanitizeUuid(contactId);
      if (safeContactId) {
        const csv = safePortfolioIds.join(",");
        query = query.or(
          `and(contact_id.eq.${safeContactId},household_id.is.null),and(contact_id.eq.${safeContactId},household_id.in.(${csv}))`,
        );
      } else {
        query = query.eq("contact_id", contactId).is("household_id", null);
      }
    } else {
      query = query.eq("contact_id", contactId).is("household_id", null);
    }
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
  isPortfolio?: boolean;
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
  params: SaveExpenseParams,
) {
  const amount_cents = Math.round((params.amount || 0) * 100);
  const date = params.date || new Date().toISOString().split("T")[0];
  const category =
    sanitizeCategoryName(params.category || "") ??
    normalizeCategoryForStorage(params.category || "other");
  const isPortfolioExpense = params.isPortfolio === true;
  const isHouseholdExpense =
    !!params.householdId &&
    !isPortfolioExpense &&
    (params.type || "expense") === "expense";
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
    return supabase
      .from("expenses")
      .update(payload)
      .eq("id", params.expenseId)
      .is("deleted_at", null)
      .select()
      .single();
  }

  const insertRes = await supabase
    .from("expenses")
    .insert(payload)
    .select()
    .single();
  if (insertRes.error || !insertRes.data) return insertRes;

  try {
    const txTypeRaw = String(params.type || "expense").toLowerCase();
    const txType = txTypeRaw === "income" ? "income" : "expense";
    await ensureUserCategory({
      supabase,
      userId,
      categoryName: category,
      transactionType: txType,
    });
    await learnUserCategoryPreference({
      supabase,
      userId,
      transactionType: txType,
      categoryName: category,
      descriptionText: params.description || null,
    });
  } catch (_) {
    // non-blocking
  }

  // Household expense: create split group + split lines (equal by default).
  if (!isHouseholdExpense) return insertRes;

  const householdId = params.householdId as string;
  const { data: members, error: membersError } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);
  if (membersError || !members || members.length === 0) return insertRes;

  const memberIds: string[] = members
    .map((m: any) => m.user_id as string | null | undefined)
    .filter(
      (value: string | null | undefined): value is string =>
        typeof value === "string" && value.length > 0,
    );
  if (memberIds.length === 0) return insertRes;

  const rawSplitType = (params.customSplits?.splitType || "equal")
    .toString()
    .trim()
    .toLowerCase();
  const normalizedSplitType = isSplitType(rawSplitType)
    ? (rawSplitType as CustomSplits["splitType"])
    : "equal";
  const hasMemberSplits =
    Array.isArray(params.customSplits?.memberSplits) &&
    params.customSplits!.memberSplits.length > 0;
  const customSplits =
    hasMemberSplits && normalizedSplitType !== "equal"
      ? params.customSplits
      : undefined;
  const splitType = customSplits ? normalizedSplitType : "equal";

  let payerUserId = params.payerUserId || userId;
  if (memberIds.indexOf(payerUserId) === -1) {
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
    splitLines = memberIds.map((memberId: string, index: number) => ({
      split_group_id: splitGroup.id,
      user_id: memberId,
      amount_cents: per + (index === 0 ? remainder : 0),
    }));
  } else if (splitType === "amount" && customSplits) {
    const normalizedById: Record<string, MemberSplit> = {};
    for (const s of customSplits.memberSplits || []) {
      if (memberIds.indexOf(s.userId) === -1) continue;
      normalizedById[s.userId] = {
        userId: s.userId,
        amount: normalizeAmount(s.amount),
      };
    }
    const full = memberIds.map(
      (id: string) => normalizedById[id] || { userId: id, amount: 0 },
    );
    const cents = full.map((s: MemberSplit) =>
      Math.max(0, Math.round((s.amount || 0) * 100)),
    );
    const sum = cents.reduce((a: number, b: number) => a + b, 0);
    const diff = amount_cents - sum;
    if (cents.length > 0 && diff !== 0)
      cents[cents.length - 1] = Math.max(0, cents[cents.length - 1] + diff);
    splitLines = full.map((s: MemberSplit, idx: number) => ({
      split_group_id: splitGroup.id,
      user_id: s.userId,
      amount_cents: cents[idx],
    }));
  } else if (splitType === "percentage" && customSplits) {
    const normalizedById: Record<string, MemberSplit> = {};
    for (const s of customSplits.memberSplits || []) {
      if (memberIds.indexOf(s.userId) === -1) continue;
      normalizedById[s.userId] = {
        userId: s.userId,
        percentage: normalizePercentage(s.percentage),
      };
    }
    const full = memberIds.map(
      (id: string) => normalizedById[id] || { userId: id, percentage: 0 },
    );
    const weights = full.map((s: MemberSplit) => s.percentage || 0);
    const cents = allocateCentsByWeights(amount_cents, weights);
    splitLines = full.map((s: MemberSplit, idx: number) => ({
      split_group_id: splitGroup.id,
      user_id: s.userId,
      amount_cents: cents[idx],
      percentage: s.percentage,
    }));
  } else if (splitType === "shares" && customSplits) {
    const normalizedById: Record<string, MemberSplit> = {};
    for (const s of customSplits.memberSplits || []) {
      if (memberIds.indexOf(s.userId) === -1) continue;
      normalizedById[s.userId] = {
        userId: s.userId,
        shares: normalizeShares(s.shares) ?? 1,
      };
    }
    const full = memberIds.map(
      (id: string) => normalizedById[id] || { userId: id, shares: 1 },
    );
    const weights = full.map((s: MemberSplit) => s.shares || 0);
    const cents = allocateCentsByWeights(amount_cents, weights);
    splitLines = full.map((s: MemberSplit, idx: number) => ({
      split_group_id: splitGroup.id,
      user_id: s.userId,
      amount_cents: cents[idx],
      shares: s.shares ?? null,
    }));
  } else {
    // Fallback to equal
    const per = Math.floor(amount_cents / memberIds.length);
    const remainder = amount_cents - per * memberIds.length;
    splitLines = memberIds.map((memberId: string, index: number) => ({
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
    .is("deleted_at", null)
    .single();

  return refreshed.error ? insertRes : refreshed;
}

export async function deleteExpenseDirect(
  supabase: SupabaseClient,
  contactId: string,
  userId: string,
  expenseId: string,
) {
  const sanitizedExpenseId = sanitizeUuid(expenseId);
  if (!sanitizedExpenseId) {
    return {
      data: null,
      error: new Error("Invalid expenseId format"),
    } as const;
  }

  const { data: expense, error: fetchError } = await supabase
    .from("expenses")
    .select("id, user_id, household_id, contact_id")
    .eq("id", sanitizedExpenseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    return { data: null, error: fetchError } as const;
  }
  if (!expense) {
    return { data: null, error: new Error("Expense not found") } as const;
  }

  const expenseUserId = (expense as any)?.user_id as string | undefined;
  const expenseHouseholdId = (expense as any)?.household_id as
    | string
    | null
    | undefined;
  const expenseContactId = (expense as any)?.contact_id as
    | string
    | null
    | undefined;

  if (!expenseHouseholdId) {
    const canDeletePersonal =
      (expenseUserId && expenseUserId === userId) ||
      (expenseContactId && expenseContactId === contactId);
    if (!canDeletePersonal) {
      return {
        data: null,
        error: new Error("You do not have permission to delete this expense"),
      } as const;
    }
  } else if (expenseUserId !== userId) {
    const { data: member, error: memberError } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", expenseHouseholdId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      return {
        data: null,
        error: new Error("Failed to verify household membership"),
      } as const;
    }
    if (!member) {
      return {
        data: null,
        error: new Error("You do not have permission to delete this expense"),
      } as const;
    }
  }

  const { data, error } = await supabase
    .from("expenses")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: "user_deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sanitizedExpenseId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { data: null, error } as const;
  }
  if (!data) {
    return { data: null, error: new Error("Expense not found") } as const;
  }

  return { data, error: null } as const;
}
