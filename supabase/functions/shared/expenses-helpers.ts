import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { normalizeCategory } from "./category-colors.ts";

export type SupabaseClient = ReturnType<typeof createClient>;

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
  return supabase.from("expenses").insert(payload).select().single();
}

export async function deleteExpenseDirect(
  supabase: SupabaseClient,
  contactId: string,
  expenseId: string
) {
  return supabase.from("expenses").delete().eq("id", expenseId).eq("contact_id", contactId);
}
