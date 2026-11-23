import { loadFinanceSpaces, readChatFinance } from "./bot/finance-rpc.ts";
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

function sanitizeUuid(value: string): string | null {
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export interface FetchExpensesOptions {
  limit?: number;
  startDate?: string;
  endDate?: string;
  householdId?: string | null;
  isPortfolio?: boolean;
  personalOnly?: boolean;
  sharedOnly?: boolean;
  type?: "expense" | "income";
  currency?: string;
}

export async function fetchExpensesDirect(
  supabase: SupabaseClient,
  userId: string,
  opts: FetchExpensesOptions,
) {
  const limit = Math.max(1, Math.min(100, opts.limit ?? 5));
  try {
    let scopes: Array<string | null> = [opts.householdId ?? null];
    if (!opts.householdId && !opts.personalOnly) {
      const spaces = [
        ...new Set((await loadFinanceSpaces(supabase, userId)).values()),
      ];
      scopes = spaces.filter((s) =>
        opts.sharedOnly ? !s.isPortfolio : !opts.isPortfolio || s.isPortfolio
      ).map((s) => s.id);
      if (!opts.sharedOnly && !opts.isPortfolio) scopes.unshift(null);
    }
    const pages = await Promise.all(
      [...new Set(scopes)].map((scope) =>
        readChatFinance(supabase, userId, "transactions", scope, {
          start_date: opts.startDate,
          end_date: opts.endDate,
          currency: opts.currency,
          type: opts.type,
          limit,
        })
      ),
    );
    if (pages.some((page) => !Array.isArray(page.items))) {
      throw new Error("Invalid transaction page");
    }
    const rows: any[] = pages.flatMap((page) => page.items);
    rows.sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)
    );
    return {
      data: rows.slice(0, limit),
      hasMore: rows.length > limit || pages.some((page) => page.has_more),
      error: null,
    };
  } catch {
    return {
      data: null,
      hasMore: false,
      error: "Unable to read transactions in the requested scope.",
    };
  }
}

export interface SaveExpenseParams {
  expenseId?: string;
  amount: number;
  category: string;
  date?: string;
  currency: string;
  description?: string;
  merchant?: string;
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
    merchant: params.merchant || null,
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
