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
import {
  buildHouseholdSplitRecords,
  commitHouseholdSplitRecords,
  expectedSplitParentFromTransaction,
} from "./household-auto-split.ts";

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

export interface FetchExpensesOptions {
  limit?: number;
  startDate?: string;
  endDate?: string;
  householdId?: string | null;
  isPortfolio?: boolean;
  portfolioHouseholdIds?: string[];
  // The complete set of spaces the authenticated bot user may read. This is
  // used only for an unscoped read; a named space still takes precedence.
  accessibleHouseholdIds?: string[];
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
  const safeSharedIds = sanitizeUuidList(opts.sharedHouseholdIds);
  const safeAccessibleIds = sanitizeUuidList(opts.accessibleHouseholdIds);
  const safeContactId = sanitizeUuid(contactId);

  if (opts.householdId) {
    query = query.eq("household_id", opts.householdId);
  } else if (opts.personalOnly === true) {
    query = query.eq("contact_id", contactId).is("household_id", null);
  } else if (opts.sharedOnly === true) {
    query = safeSharedIds.length
      ? query.in("household_id", safeSharedIds)
      : query.eq("id", NEVER_UUID);
  } else if (opts.isPortfolio === true) {
    query = query.eq("contact_id", contactId);
    if (safePortfolioIds.length) {
      query = query.in("household_id", safePortfolioIds);
    } else {
      query = query.eq("id", NEVER_UUID);
    }
  } else {
    const spaceIds = safeAccessibleIds.length
      ? safeAccessibleIds
      : Array.from(new Set([...safePortfolioIds, ...safeSharedIds]));
    if (spaceIds.length && safeContactId) {
      query = query.or(
        `and(contact_id.eq.${safeContactId},household_id.is.null),household_id.in.(${spaceIds.join(",")})`,
      );
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
  const category = sanitizeCategoryName(params.category || "") ??
    normalizeCategoryForStorage(params.category || "other");
  const isPortfolioExpense = params.isPortfolio === true;
  const isHouseholdExpense = !!params.householdId &&
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
  if (membersError) return { data: null, error: membersError } as const;
  if (!members || members.length === 0) {
    return {
      data: null,
      error: new Error("Household has no members for expense split"),
    } as const;
  }

  const memberIds: string[] = members
    .map((m: any) => m.user_id as string | null | undefined)
    .filter(
      (value: string | null | undefined): value is string =>
        typeof value === "string" && value.length > 0,
    );
  if (memberIds.length === 0) {
    return {
      data: null,
      error: new Error("Household has no valid members for expense split"),
    } as const;
  }

  let payerUserId = params.payerUserId || userId;
  if (memberIds.indexOf(payerUserId) === -1) {
    payerUserId = userId;
  }
  const buildResult = buildHouseholdSplitRecords({
    householdId,
    transactionId: insertRes.data.id,
    payerUserId,
    amountCents: amount_cents,
    currency: params.currency,
    description: params.description || null,
    members,
    customSplits: params.customSplits ?? null,
  });
  if (!buildResult.ok) {
    return { data: null, error: new Error(buildResult.error) } as const;
  }

  const { error: commitError } = await commitHouseholdSplitRecords({
    supabase,
    actorUserId: userId,
    group: buildResult.group,
    lines: buildResult.lines,
    expectedParent: expectedSplitParentFromTransaction(
      insertRes.data as Record<string, unknown>,
    ),
  });
  if (commitError) return { data: null, error: commitError } as const;

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
    const canDeletePersonal = (expenseUserId && expenseUserId === userId) ||
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
