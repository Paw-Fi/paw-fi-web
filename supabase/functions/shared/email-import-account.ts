import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { assertAccountInScope } from "./accounts.ts";

export function createEmailImportAccountResolver(params: {
  supabase: SupabaseClient;
  userId: string;
  householdId: string | null;
  accountId: string | null;
}): (currency: unknown) => Promise<string | null> {
  const resolvedAccountIds = new Map<string, string | null>();

  return async (currency: unknown): Promise<string | null> => {
    if (!params.accountId || typeof currency !== "string") return null;

    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) return null;

    if (resolvedAccountIds.has(normalizedCurrency)) {
      return resolvedAccountIds.get(normalizedCurrency) ?? null;
    }

    const accountId = (await assertAccountInScope(
        params.supabase,
        params.accountId,
        {
          userId: params.userId,
          householdId: params.householdId,
          currency: normalizedCurrency,
        },
      ))
      ? params.accountId
      : null;
    resolvedAccountIds.set(normalizedCurrency, accountId);
    return accountId;
  };
}
