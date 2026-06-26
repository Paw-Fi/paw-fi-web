type SupabaseLike = {
  from: (table: string) => any;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export function normalizeWalletName(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeWalletCurrency(value: unknown): string {
  const normalized =
    typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "";
}

async function listWalletRowsForScope(
  supabase: SupabaseLike,
  userId: string,
  householdId: string | null,
  logPrefix: string,
) {
  let query = supabase
    .from("accounts")
    .select("id, name, household_id, is_default, currency")
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
    currency: string | null;
  }>;
}

export type ResolvedWalletInScope = {
  accountId?: string;
  currency?: string;
  error?: string;
};

export async function resolveWalletIdInScope(
  supabase: SupabaseLike,
  userId: string,
  householdId: string | null,
  walletName: unknown,
  logPrefix = "ai-bot",
): Promise<ResolvedWalletInScope> {
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

  return {
    accountId: matches[0].id,
    currency: normalizeWalletCurrency(matches[0].currency) || undefined,
  };
}

export async function resolveWalletForTransactionToolCall(
  supabase: SupabaseLike,
  userId: string,
  householdId: string | null,
  args: Record<string, unknown>,
  logPrefix = "ai-bot",
): Promise<ResolvedWalletInScope> {
  if (args.wallet_name !== undefined) {
    return resolveWalletIdInScope(
      supabase,
      userId,
      householdId,
      args.wallet_name,
      logPrefix,
    );
  }

  const rawAccountId =
    typeof args.wallet_id === "string" && args.wallet_id.trim()
      ? args.wallet_id.trim()
      : typeof args.account_id === "string" && args.account_id.trim()
        ? args.account_id.trim()
        : "";
  if (!rawAccountId) return {};
  if (!UUID_REGEX.test(rawAccountId)) {
    return { error: "Invalid wallet id." };
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("id, user_id, household_id, currency, is_archived")
    .eq("id", rawAccountId)
    .maybeSingle();
  if (error) {
    console.error(`[${logPrefix}] Failed to load wallet by id`, {
      userId,
      householdId,
      error,
    });
    return { error: "Failed to resolve wallet." };
  }
  if (!data || data.is_archived) {
    return { error: "Wallet was not found in the selected scope." };
  }
  if (householdId == null) {
    if (data.household_id != null || data.user_id !== userId) {
      return { error: "Wallet was not found in the selected scope." };
    }
  } else if (data.household_id !== householdId) {
    return { error: "Wallet was not found in the selected scope." };
  }

  return {
    accountId: data.id,
    currency: normalizeWalletCurrency(data.currency) || undefined,
  };
}

export function resolveWalletTransferCurrency(params: {
  fromWallet: ResolvedWalletInScope;
  toWallet: ResolvedWalletInScope;
  fromWalletName: unknown;
  toWalletName: unknown;
  requestedCurrency: unknown;
}): { currency?: string; error?: string } {
  const fromCurrency = normalizeWalletCurrency(params.fromWallet.currency);
  const toCurrency = normalizeWalletCurrency(params.toWallet.currency);
  const hasRequestedCurrency =
    typeof params.requestedCurrency === "string" &&
    params.requestedCurrency.trim().length > 0;
  const requestedCurrency = normalizeWalletCurrency(params.requestedCurrency);

  if (hasRequestedCurrency && !requestedCurrency) {
    return { error: "Invalid transfer currency." };
  }

  if (!fromCurrency || !toCurrency) {
    return {
      error: "Could not determine the wallet currency for this transfer.",
    };
  }

  if (fromCurrency !== toCurrency) {
    return {
      error: `Transfers are only supported between wallets with the same currency. ${String(
        params.fromWalletName,
      ).trim()} is ${fromCurrency}, but ${String(params.toWalletName).trim()} is ${toCurrency}.`,
    };
  }

  if (requestedCurrency && requestedCurrency !== fromCurrency) {
    return {
      error: `Transfer currency must match the wallet currency (${fromCurrency}).`,
    };
  }

  return { currency: requestedCurrency || fromCurrency };
}

export function hasExplicitTransactionCurrency(value: Record<string, unknown>) {
  return [
    value.currency,
    value.currency_symbol,
    value.currencySymbol,
    value.currency_evidence,
    value.currencyEvidence,
  ].some((entry) => typeof entry === "string" && entry.trim().length > 0);
}

export function resolveWalletTransactionCurrency(params: {
  wallet: ResolvedWalletInScope;
  walletName: unknown;
  transactionCurrency: unknown;
  fallbackCurrency: unknown;
  hasExplicitCurrency: boolean;
}): { currency?: string; error?: string } {
  const walletCurrency = normalizeWalletCurrency(params.wallet.currency);
  const transactionCurrency = normalizeWalletCurrency(
    params.transactionCurrency,
  );
  const fallbackCurrency = normalizeWalletCurrency(params.fallbackCurrency);

  if (!params.wallet.accountId) {
    return { currency: transactionCurrency || fallbackCurrency };
  }

  if (!walletCurrency) {
    return {
      error: `Could not determine the currency for wallet '${String(
        params.walletName,
      ).trim()}'.`,
    };
  }

  const currencyLooksIntentional =
    params.hasExplicitCurrency ||
    (transactionCurrency &&
      fallbackCurrency &&
      transactionCurrency !== fallbackCurrency);
  if (
    currencyLooksIntentional &&
    transactionCurrency &&
    transactionCurrency !== walletCurrency
  ) {
    return {
      error: `Transaction currency must match the selected wallet currency (${walletCurrency}).`,
    };
  }

  return { currency: walletCurrency };
}
