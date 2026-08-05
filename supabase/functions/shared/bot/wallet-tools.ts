import { buildInternalInvokeHeaders } from "../auth.ts";
import { formatInvokeError } from "../formatting-helpers.ts";
import {
  normalizeAiToolAmount,
  normalizeAiToolMoneyCents,
  normalizeRequiredAiToolString,
} from "./ai-tool-validation.ts";
import { normalizeDateInput } from "./date-utils.ts";
import {
  resolveWalletIdInScope,
  resolveWalletTransferCurrency,
} from "./wallet-scope.ts";

type SupabaseFunctionInvoker = {
  functions: {
    invoke: (
      functionName: string,
      options?: any,
    ) => Promise<{
      data?: any;
      error?: any;
    }>;
  };
};

type SupabaseWalletClient = SupabaseFunctionInvoker & {
  from: (table: string) => any;
};

export type BotWalletToolFailure = {
  formatted: string;
  error: unknown;
  targetFunction: string;
  context: Record<string, unknown>;
};

export type BotWalletToolResult = {
  result: Record<string, unknown>;
  failure?: BotWalletToolFailure;
};

export async function listBotWallets(params: {
  supabase: SupabaseFunctionInvoker;
  internalFunctionKey: string;
  userId: string;
  householdId: string | null;
  includeArchived: boolean;
}): Promise<BotWalletToolResult> {
  const { data, error } = await params.supabase.functions.invoke(
    "list-wallets",
    {
      body: {
        userId: params.userId,
        householdId: params.householdId,
        includeArchived: params.includeArchived,
      },
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );

  if (!error && data?.success === true) {
    return { result: { success: true, data: data?.data ?? [] } };
  }

  const formatted =
    formatInvokeError(error ?? data?.error) || "Failed to list wallets";
  return {
    result: { error: formatted },
    failure: {
      formatted,
      error: error ?? data?.error,
      targetFunction: "list-wallets",
      context: { householdId: params.householdId },
    },
  };
}

export async function createBotWallet(params: {
  supabase: SupabaseFunctionInvoker;
  internalFunctionKey: string;
  userId: string;
  householdId: string | null;
  name: unknown;
  icon: unknown;
  color: unknown;
  currency: unknown;
  openingBalanceCents: number | undefined;
  goalAmountCents: number | undefined;
  isDefault: boolean;
}): Promise<BotWalletToolResult> {
  const hasCurrency =
    typeof params.currency === "string" && params.currency.trim().length > 0;
  const currency = normalizeOptionalBotCurrency(params.currency);
  if (hasCurrency && !currency) {
    return { result: { error: "Valid currency is required." } };
  }

  const { data, error } = await params.supabase.functions.invoke(
    "save-wallet",
    {
      body: {
        userId: params.userId,
        householdId: params.householdId,
        name: params.name,
        icon: params.icon,
        color: params.color,
        currency,
        openingBalanceCents: params.openingBalanceCents,
        goalAmountCents: params.goalAmountCents,
        isDefault: params.isDefault,
      },
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );

  if (!error && data?.success === true) {
    return { result: { success: true, data: data?.data ?? data } };
  }

  const formatted =
    formatInvokeError(error ?? data?.error) || "Failed to create wallet";
  return {
    result: { error: formatted },
    failure: {
      formatted,
      error: error ?? data?.error,
      targetFunction: "save-wallet",
      context: { householdId: params.householdId, name: params.name },
    },
  };
}

export async function createBotWalletFromToolCall(params: {
  supabase: SupabaseFunctionInvoker;
  internalFunctionKey: string;
  userId: string;
  householdId: string | null;
  args?: Record<string, unknown> | null;
}): Promise<BotWalletToolResult> {
  const args = params.args ?? {};
  const walletNameResult = normalizeRequiredAiToolString(
    args.name,
    "wallet name",
  );
  const openingBalanceResult = normalizeAiToolMoneyCents(
    args.opening_balance,
    "opening_balance",
  );
  const goalAmountResult = normalizeAiToolMoneyCents(
    args.goal_amount,
    "goal_amount",
    { allowNegative: false },
  );

  if (!walletNameResult.ok) {
    return { result: { error: walletNameResult.error } };
  }
  if (!openingBalanceResult.ok) {
    return { result: { error: openingBalanceResult.error } };
  }
  if (!goalAmountResult.ok) {
    return { result: { error: goalAmountResult.error } };
  }

  return createBotWallet({
    supabase: params.supabase,
    internalFunctionKey: params.internalFunctionKey,
    userId: params.userId,
    householdId: params.householdId,
    name: walletNameResult.value,
    icon: args.icon,
    color: args.color,
    currency: args.currency,
    openingBalanceCents: openingBalanceResult.cents,
    goalAmountCents: goalAmountResult.cents,
    isDefault: args.is_default === true,
  });
}

export async function updateBotWallet(params: {
  supabase: SupabaseFunctionInvoker;
  internalFunctionKey: string;
  userId: string;
  householdId: string | null;
  accountId: string;
  walletName: unknown;
  name: unknown;
  icon: unknown;
  color: unknown;
  openingBalanceCents: number | undefined;
  goalAmountCents: number | undefined;
  isDefault: boolean | undefined;
}): Promise<BotWalletToolResult> {
  const { data, error } = await params.supabase.functions.invoke(
    "update-wallet",
    {
      body: {
        userId: params.userId,
        accountId: params.accountId,
        name: params.name,
        icon: params.icon,
        color: params.color,
        openingBalanceCents: params.openingBalanceCents,
        goalAmountCents: params.goalAmountCents,
        isDefault: params.isDefault,
      },
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );

  if (!error && data?.success === true) {
    return { result: { success: true, data: data?.data ?? data } };
  }

  const formatted =
    formatInvokeError(error ?? data?.error) || "Failed to update wallet";
  return {
    result: { error: formatted },
    failure: {
      formatted,
      error: error ?? data?.error,
      targetFunction: "update-wallet",
      context: {
        householdId: params.householdId,
        walletName: params.walletName,
      },
    },
  };
}

export async function updateBotWalletFromToolCall(params: {
  supabase: SupabaseWalletClient;
  internalFunctionKey: string;
  userId: string;
  householdId: string | null;
  args?: Record<string, unknown> | null;
  logPrefix?: string;
}): Promise<BotWalletToolResult> {
  const args = params.args ?? {};
  const requestedWallet = await resolveWalletIdInScope(
    params.supabase,
    params.userId,
    params.householdId,
    args.wallet_name,
    params.logPrefix,
  );
  if (requestedWallet.error || !requestedWallet.accountId) {
    return {
      result: {
        error:
          requestedWallet.error ||
          "Wallet was not found in the selected scope.",
      },
    };
  }

  const newNameResult =
    args.new_name != null
      ? normalizeRequiredAiToolString(args.new_name, "new_name")
      : { ok: true as const, value: undefined };
  const goalAmountResult = normalizeAiToolMoneyCents(
    args.goal_amount,
    "goal_amount",
    { allowNegative: false },
  );
  const openingBalanceResult = normalizeAiToolMoneyCents(
    args.opening_balance,
    "opening_balance",
    { allowNegative: true },
  );

  if (!newNameResult.ok) {
    return { result: { error: newNameResult.error } };
  }
  if (!goalAmountResult.ok) {
    return { result: { error: goalAmountResult.error } };
  }
  if (!openingBalanceResult.ok) {
    return { result: { error: openingBalanceResult.error } };
  }

  const hasUpdate =
    newNameResult.value !== undefined ||
    typeof args.icon === "string" ||
    typeof args.color === "string" ||
    openingBalanceResult.cents !== undefined ||
    goalAmountResult.cents !== undefined ||
    typeof args.is_default === "boolean";
  if (!hasUpdate) {
    return { result: { error: "At least one wallet update is required." } };
  }

  return updateBotWallet({
    supabase: params.supabase,
    internalFunctionKey: params.internalFunctionKey,
    userId: params.userId,
    householdId: params.householdId,
    accountId: requestedWallet.accountId,
    walletName: args.wallet_name,
    name: newNameResult.value,
    icon: args.icon,
    color: args.color,
    openingBalanceCents: openingBalanceResult.cents,
    goalAmountCents: goalAmountResult.cents,
    isDefault:
      typeof args.is_default === "boolean" ? args.is_default : undefined,
  });
}

function normalizeOptionalBotCurrency(value: unknown): string | undefined {
  const normalized =
    typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
}

export async function createBotWalletTransfer(params: {
  supabase: SupabaseFunctionInvoker;
  internalFunctionKey: string;
  userId: string;
  householdId: string | null;
  fromAccountId: string;
  toAccountId: string;
  fromWalletName: unknown;
  toWalletName: unknown;
  amount: unknown;
  amountCents: number;
  currency: unknown;
  date: unknown;
  note: unknown;
}): Promise<BotWalletToolResult> {
  const { data, error } = await params.supabase.functions.invoke(
    "create-wallet-transfer",
    {
      body: {
        userId: params.userId,
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amountCents: params.amountCents,
        currency: params.currency,
        date: params.date,
        note: params.note,
      },
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );

  if (!error && data?.success === true) {
    return { result: { success: true, data: data?.data ?? data } };
  }

  const formatted =
    formatInvokeError(error ?? data?.error) ||
    "Failed to create wallet transfer";
  return {
    result: { error: formatted },
    failure: {
      formatted,
      error: error ?? data?.error,
      targetFunction: "create-wallet-transfer",
      context: {
        householdId: params.householdId,
        fromWallet: params.fromWalletName,
        toWallet: params.toWalletName,
        amount: params.amount,
        currency: params.currency,
      },
    },
  };
}

export async function createBotWalletTransferFromToolCall(params: {
  supabase: SupabaseWalletClient;
  internalFunctionKey: string;
  userId: string;
  householdId: string | null;
  args?: Record<string, unknown> | null;
  defaultDate: string;
  logPrefix?: string;
}): Promise<BotWalletToolResult> {
  const args = params.args ?? {};
  const amountResult = normalizeAiToolAmount(args.amount);
  if (!amountResult.ok) {
    return { result: { error: amountResult.error } };
  }

  const fromWallet = await resolveWalletIdInScope(
    params.supabase,
    params.userId,
    params.householdId,
    args.from_wallet_name,
    params.logPrefix,
  );
  if (fromWallet.error || !fromWallet.accountId) {
    return {
      result: {
        error:
          fromWallet.error ||
          "Source wallet was not found in the selected scope.",
      },
    };
  }

  const toWallet = await resolveWalletIdInScope(
    params.supabase,
    params.userId,
    params.householdId,
    args.to_wallet_name,
    params.logPrefix,
  );
  if (toWallet.error || !toWallet.accountId) {
    return {
      result: {
        error:
          toWallet.error ||
          "Destination wallet was not found in the selected scope.",
      },
    };
  }

  const currencyResult = resolveWalletTransferCurrency({
    fromWallet,
    toWallet,
    fromWalletName: args.from_wallet_name,
    toWalletName: args.to_wallet_name,
    requestedCurrency: args.currency,
  });
  if (currencyResult.error || !currencyResult.currency) {
    return { result: { error: currencyResult.error } };
  }

  return createBotWalletTransfer({
    supabase: params.supabase,
    internalFunctionKey: params.internalFunctionKey,
    userId: params.userId,
    householdId: params.householdId,
    fromAccountId: fromWallet.accountId,
    toAccountId: toWallet.accountId,
    fromWalletName: args.from_wallet_name,
    toWalletName: args.to_wallet_name,
    amount: args.amount,
    amountCents: Math.round(amountResult.amount * 100),
    currency: currencyResult.currency,
    date: normalizeDateInput(args.date, params.defaultDate),
    note: args.note,
  });
}
