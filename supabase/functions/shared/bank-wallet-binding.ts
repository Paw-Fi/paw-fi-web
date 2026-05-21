import { type SupabaseClient as SupabaseJsClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export type SupabaseClient = SupabaseJsClient;

interface ExpenseWalletBindingRow {
  id: string;
  account_id?: string | null;
  household_id?: string | null;
  user_overrides?: Record<string, unknown> | null;
}

export interface RebindBankAccountExpensesParams {
  supabase: SupabaseClient;
  userId: string;
  bankAccountId: string;
  walletId: string;
  householdId?: string | null;
  provider: string;
}

export interface RebindBankAccountExpensesResult {
  scanned: number;
  updated: number;
}

const REBIND_BATCH_SIZE = 500;

interface SupabaseErrorLike {
  code?: string | null;
  message?: string | null;
}

function hasUserAccountOverride(
  userOverrides?: Record<string, unknown> | null,
): boolean {
  if (!userOverrides || typeof userOverrides !== "object") {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(userOverrides, "account_id");
}

function isMissingRebindRpcError(error: SupabaseErrorLike): boolean {
  return (
    error.code === "PGRST202" ||
    String(error.message || "").includes(
      "rebind_bank_account_expenses_to_wallet",
    )
  );
}

export async function rebindBankAccountExpensesToWallet(
  params: RebindBankAccountExpensesParams,
): Promise<RebindBankAccountExpensesResult> {
  const targetHouseholdId = params.householdId ?? null;
  const { data: rpcUpdated, error: rpcError } = await params.supabase.rpc(
    "rebind_bank_account_expenses_to_wallet",
    {
      p_user_id: params.userId,
      p_provider: params.provider,
      p_bank_account_id: params.bankAccountId,
      p_wallet_id: params.walletId,
      p_household_id: targetHouseholdId,
    },
  );

  if (!rpcError) {
    const templateUpdated = await rebindBankRecurringTemplatesToWallet(params);
    return {
      scanned: 0,
      updated: Number(rpcUpdated || 0) + templateUpdated,
    };
  }

  if (!isMissingRebindRpcError(rpcError)) {
    throw rpcError;
  }

  let scanned = 0;
  let updated = 0;
  let offset = 0;
  const needsBindingFilter =
    targetHouseholdId == null
      ? `account_id.is.null,account_id.neq.${params.walletId},household_id.not.is.null`
      : `account_id.is.null,account_id.neq.${params.walletId},household_id.is.null,household_id.neq.${targetHouseholdId}`;

  const { data: candidateRows, error: candidateError } = await params.supabase
    .from("expenses")
    .select("id")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .eq("bank_account_id", params.bankAccountId)
    .is("deleted_at", null)
    .or(needsBindingFilter)
    .limit(1);

  if (candidateError) {
    throw candidateError;
  }

  if (!candidateRows?.length) {
    const templateUpdated = await rebindBankRecurringTemplatesToWallet(params);
    return { scanned: 0, updated: templateUpdated };
  }

  while (true) {
    const { data, error } = await params.supabase
      .from("expenses")
      .select("id, account_id, household_id, user_overrides")
      .eq("user_id", params.userId)
      .eq("provider", params.provider)
      .eq("bank_account_id", params.bankAccountId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(offset, offset + REBIND_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = (data || []) as ExpenseWalletBindingRow[];
    scanned += rows.length;
    const idsToRebind = rows
      .filter((row) => !hasUserAccountOverride(row.user_overrides))
      .filter(
        (row) =>
          row.account_id !== params.walletId ||
          (row.household_id ?? null) !== targetHouseholdId,
      )
      .map((row) => row.id);

    if (idsToRebind.length) {
      const { error: updateError } = await params.supabase
        .from("expenses")
        .update({
          account_id: params.walletId,
          household_id: targetHouseholdId,
          updated_at: new Date().toISOString(),
        })
        .in("id", idsToRebind);

      if (updateError) {
        throw updateError;
      }
      updated += idsToRebind.length;
    }

    if (rows.length < REBIND_BATCH_SIZE) {
      updated += await rebindBankRecurringTemplatesToWallet(params);
      return { scanned, updated };
    }
    offset += REBIND_BATCH_SIZE;
  }
}

async function rebindBankRecurringTemplatesToWallet(
  params: RebindBankAccountExpensesParams,
): Promise<number> {
  const targetHouseholdId = params.householdId ?? null;
  let query = params.supabase
    .from("expenses")
    .select("id, account_id, household_id, user_overrides")
    .eq("user_id", params.userId)
    .is("provider", null)
    .is("bank_account_id", null)
    .like(
      "idempotency_key",
      `bank-recurring:v1:${params.provider}:${params.bankAccountId}:%`,
    )
    .is("deleted_at", null);

  query =
    targetHouseholdId == null
      ? query.is("household_id", null)
      : query.eq("household_id", targetHouseholdId);

  const { data, error } = await query;
  if (error) throw error;

  const idsToRebind = ((data || []) as ExpenseWalletBindingRow[])
    .filter((row) => !hasUserAccountOverride(row.user_overrides))
    .filter((row) => row.account_id !== params.walletId)
    .map((row) => row.id);

  if (!idsToRebind.length) return 0;

  const { error: updateError } = await params.supabase
    .from("expenses")
    .update({
      account_id: params.walletId,
      updated_at: new Date().toISOString(),
    })
    .in("id", idsToRebind);

  if (updateError) throw updateError;
  return idsToRebind.length;
}
