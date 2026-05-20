type SupabaseLike = {
  from: (table: string) => any;
};

export function normalizeWalletName(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function listWalletRowsForScope(
  supabase: SupabaseLike,
  userId: string,
  householdId: string | null,
  logPrefix: string,
) {
  let query = supabase
    .from("accounts")
    .select("id, name, household_id, is_default")
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (householdId) {
    query = query.eq("household_id", householdId);
  } else {
    query = query.eq("user_id", userId).is("household_id", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`[${logPrefix}] Failed to load wallets for scope`, {
      userId,
      householdId,
      error,
    });
    return [];
  }

  return (data || []) as Array<{
    id: string;
    name: string;
    household_id: string | null;
    is_default: boolean;
  }>;
}

export async function resolveWalletIdInScope(
  supabase: SupabaseLike,
  userId: string,
  householdId: string | null,
  walletName: unknown,
  logPrefix = "ai-bot",
): Promise<{ accountId?: string; error?: string }> {
  const normalizedName = normalizeWalletName(walletName);
  if (!normalizedName) return {};

  const wallets = await listWalletRowsForScope(
    supabase,
    userId,
    householdId,
    logPrefix,
  );
  const matches = wallets.filter(
    (wallet) => normalizeWalletName(wallet.name) === normalizedName,
  );

  if (matches.length === 0) {
    return {
      error: `Wallet '${String(
        walletName,
      ).trim()}' was not found in the selected scope.`,
    };
  }

  if (matches.length > 1) {
    return {
      error: `More than one wallet named '${String(
        walletName,
      ).trim()}' exists in the selected scope. Please rename one of them or be more specific.`,
    };
  }

  return { accountId: matches[0].id };
}
