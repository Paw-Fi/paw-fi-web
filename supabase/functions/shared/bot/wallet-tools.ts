import { buildInternalInvokeHeaders } from "../auth.ts";
import { formatInvokeError } from "../formatting-helpers.ts";
import {
  normalizeAiToolMoneyCents,
  normalizeRequiredAiToolString,
} from "./ai-tool-validation.ts";

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
  const { data, error } = await params.supabase.functions.invoke(
    "save-wallet",
    {
      body: {
        userId: params.userId,
        householdId: params.householdId,
        name: params.name,
        icon: params.icon,
        color: params.color,
        currency: normalizeBotCurrency(params.currency),
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

function normalizeBotCurrency(value: unknown): string {
  const normalized =
    typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
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
      },
    },
  };
}

export function buildWalletMutationFailureText(
  toolName: string | null,
  toolResult: unknown,
): string | null {
  const error =
    typeof (toolResult as Record<string, any> | null)?.error === "string"
      ? (toolResult as Record<string, string>).error.trim()
      : "";
  if (!error) return null;

  if (toolName === "create_wallet") {
    return `I couldn't create that wallet. ${error}`;
  }
  if (toolName === "update_wallet") {
    return `I couldn't update that wallet. ${error}`;
  }
  if (toolName === "create_wallet_transfer") {
    return `I couldn't move money between those wallets. ${error}`;
  }
  return null;
}
