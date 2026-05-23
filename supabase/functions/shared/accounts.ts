import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export interface ScopeContext {
  userId: string | null;
  householdId: string | null;
  currency?: string | null;
}

function normalizeCurrency(value?: string | null): string | null {
  const normalized = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

export async function assertScopeAccess(
  supabase: SupabaseClient,
  userId: string,
  householdId: string | null,
): Promise<boolean> {
  if (!householdId) {
    return true;
  }

  const { data, error } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[accounts] Failed to verify household membership", error);
    return false;
  }

  return !!data;
}

export async function resolveDefaultAccountId(
  supabase: SupabaseClient,
  context: ScopeContext,
): Promise<string | null> {
  const { userId, householdId } = context;
  if (!userId) return null;
  const { data, error } = await supabase.rpc("resolve_default_account", {
    p_user_id: userId,
    p_household_id: householdId,
    p_currency: context.currency ?? null,
  });

  if (error) {
    console.error("[accounts] resolve_default_account failed", error);
    return null;
  }

  return typeof data === "string" ? data : null;
}

export async function assertAccountInScope(
  supabase: SupabaseClient,
  accountId: string,
  context: ScopeContext,
): Promise<boolean> {
  if (!context.userId) return false;
  const { data, error } = await supabase
    .from("accounts")
    .select("id, user_id, household_id, currency, is_archived")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  if (data.is_archived) {
    return false;
  }

  const expectedCurrency = normalizeCurrency(context.currency);
  if (context.currency != null && data.currency !== expectedCurrency) {
    return false;
  }

  if (context.householdId == null) {
    return data.household_id == null && data.user_id === context.userId;
  }

  if (data.household_id !== context.householdId) {
    return false;
  }

  return await assertScopeAccess(supabase, context.userId, context.householdId);
}

export async function getAccountOrNull(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, user_id, household_id, name, icon, color, currency, opening_balance_cents, goal_amount_cents, is_default, is_system, is_archived, linked_bank_account_id",
    )
    .eq("id", accountId)
    .maybeSingle();

  if (error) {
    console.error("[accounts] Failed to load account", error);
    return null;
  }

  return data;
}
