import { buildInternalInvokeHeaders } from "../auth.ts";
import { normalizeCalendarDateString } from "../date-normalization.ts";
import {
  normalizeAiToolMoneyCents,
  normalizeAiToolTransactionType,
  normalizeRequiredAiToolString,
} from "./ai-tool-validation.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVALID_AMOUNT_ERROR =
  "Invalid amount. Ask the user for a value greater than 0.";

type FunctionInvoker = {
  functions: {
    invoke: (
      functionName: string,
      options?: any,
    ) => Promise<{ data: any; error: any }>;
  };
};

export type NormalizedTransactionToolArgs = {
  type: "expense" | "income";
  amount: number;
  category: string;
  date?: string;
  currency?: string;
  description?: string;
  merchant?: string;
};

export type TransactionSaveParams = {
  type?: string;
  amount: number;
  category: string;
  currency: string;
  date: string;
  description?: string;
  merchant?: string;
  householdId?: string | null;
  isPortfolio?: boolean;
  payerUserId?: string;
  customSplits?: unknown;
  isRecurring?: boolean;
  recurrence_rule?: Record<string, unknown> | null;
  source?: string;
  ownerType?: string;
  privacyScope?: string;
  accountId?: string;
};

function normalizeDateInput(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
}

export function normalizeSignedTransactionAmount(
  value: unknown,
):
  | { ok: true; amount: number; cents: number; isNegative: boolean }
  | { ok: false; error: string } {
  const amountResult = normalizeAiToolMoneyCents(value, "amount", {
    required: true,
    allowZero: false,
    allowNegative: true,
    invalidError: INVALID_AMOUNT_ERROR,
  });
  if (!amountResult.ok) return amountResult;

  const cents = amountResult.cents ?? 0;
  return {
    ok: true,
    amount: Math.abs(cents / 100),
    cents,
    isNegative: cents < 0,
  };
}

export function normalizeTransactionToolArgs(
  args: Record<string, any> | null | undefined,
  fallback: { date?: string; currency?: string } = {},
):
  | { ok: true; transaction: NormalizedTransactionToolArgs }
  | {
      ok: false;
      error: string;
    } {
  const input = args && typeof args === "object" ? args : {};

  const typeResult = normalizeAiToolTransactionType(input.type);
  if (!typeResult.ok) return typeResult;

  const amountResult = normalizeSignedTransactionAmount(input.amount);
  if (!amountResult.ok) return amountResult;

  const categoryResult = normalizeRequiredAiToolString(
    input.category,
    "category",
  );
  if (!categoryResult.ok) return categoryResult;

  let date: string | undefined;
  if (fallback.date !== undefined || input.date !== undefined) {
    const normalizedDate = normalizeCalendarDateString(
      normalizeDateInput(input.date, fallback.date || ""),
    );
    if (!normalizedDate) {
      return {
        ok: false,
        error: "Invalid date. Ask the user for a valid calendar date.",
      };
    }
    date = normalizedDate;
  }

  let description: string | undefined;
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      return { ok: false, error: "description must be a string." };
    }
    description = input.description.trim() || undefined;
  }

  let merchant: string | undefined;
  if (input.merchant !== undefined && input.merchant !== null) {
    if (typeof input.merchant !== "string") {
      return { ok: false, error: "merchant must be a string." };
    }
    const trimmedMerchant = input.merchant.trim();
    if (trimmedMerchant.length > 255) {
      return {
        ok: false,
        error: "merchant must be less than 256 characters.",
      };
    }
    merchant = trimmedMerchant || undefined;
  }

  const rawCurrency =
    typeof input.currency === "string" ? input.currency.trim() : "";
  const currency = rawCurrency || fallback.currency;

  return {
    ok: true,
    transaction: {
      type: amountResult.isNegative ? "expense" : typeResult.type,
      amount: amountResult.amount,
      category: categoryResult.value,
      ...(date ? { date } : {}),
      ...(currency ? { currency } : {}),
      ...(description ? { description } : {}),
      ...(merchant ? { merchant } : {}),
    },
  };
}

export async function invokeTransactionSave(
  supabase: FunctionInvoker,
  internalKey: string,
  userId: string,
  params: TransactionSaveParams,
) {
  const amountResult = normalizeSignedTransactionAmount(params.amount);
  if (!amountResult.ok) return { data: null, error: amountResult.error };

  const categoryResult = normalizeRequiredAiToolString(
    params.category,
    "category",
  );
  if (!categoryResult.ok) return { data: null, error: categoryResult.error };

  const normalizedDate = normalizeCalendarDateString(params.date);
  if (!normalizedDate) {
    return {
      data: null,
      error: "Invalid date. Ask the user for a valid calendar date.",
    };
  }

  const normalizedHouseholdId =
    typeof params.householdId === "string" && params.householdId.trim()
      ? params.householdId.trim()
      : null;
  if (normalizedHouseholdId && !UUID_REGEX.test(normalizedHouseholdId)) {
    return { data: null, error: "You do not have access to that space." };
  }

  let description: string | undefined;
  if (params.description !== undefined && params.description !== null) {
    if (typeof params.description !== "string") {
      return { data: null, error: "description must be a string." };
    }
    description = params.description.trim() || undefined;
  }

  let merchant: string | undefined;
  if (params.merchant !== undefined && params.merchant !== null) {
    if (typeof params.merchant !== "string") {
      return { data: null, error: "merchant must be a string." };
    }
    const trimmedMerchant = params.merchant.trim();
    if (trimmedMerchant.length > 255) {
      return {
        data: null,
        error: "merchant must be less than 256 characters.",
      };
    }
    merchant = trimmedMerchant || undefined;
  }

  const requestedType =
    String(params.type || "expense").toLowerCase() === "income"
      ? "income"
      : "expense";
  const type = amountResult.isNegative ? "expense" : requestedType;
  const commonBody = {
    userId,
    amount: amountResult.amount,
    category: categoryResult.value,
    currency: params.currency,
    date: normalizedDate,
    description,
    merchant,
    accountId: params.accountId,
    householdId: normalizedHouseholdId,
    isPortfolio: params.isPortfolio === true,
    isRecurring: params.isRecurring === true,
    recurrence_rule:
      params.isRecurring === true ? params.recurrence_rule || null : undefined,
    clientCreatedAt: new Date().toISOString(),
  };

  const body =
    type === "income"
      ? {
          ...commonBody,
          source: params.source,
          ownerType: params.ownerType || "me",
          privacyScope: params.privacyScope || "full",
          payerUserId: params.payerUserId,
          customSplits: params.customSplits,
        }
      : {
          ...commonBody,
          payerUserId: params.payerUserId,
          customSplits: params.customSplits,
        };

  return await supabase.functions.invoke(
    type === "income" ? "save-income" : "save-expense",
    {
      body,
      headers: buildInternalInvokeHeaders(internalKey),
    },
  );
}

export function buildTransactionMutationFailureText(
  toolName: string | null,
  toolResult: unknown,
): string | null {
  const error =
    typeof (toolResult as Record<string, any> | null)?.error === "string"
      ? (toolResult as Record<string, string>).error.trim()
      : "";
  if (!error) return null;

  if (toolName === "add_transaction") {
    if (error.startsWith("Invalid amount")) {
      return "I need an amount greater than 0 before I can save that. What amount should I use?";
    }
    if (error === "category is required.") {
      return "Which category should I use for that transaction?";
    }
    if (error === "type must be expense or income.") {
      return "Should I save that as an expense or income?";
    }
    if (error.startsWith("Invalid date")) {
      return "Which date should I use for that transaction?";
    }
    if (
      error === "merchant must be a string." ||
      error === "description must be a string." ||
      error === "merchant must be less than 256 characters."
    ) {
      return "I couldn't understand one of the transaction details. Please resend it with the amount, category, and date.";
    }
    if (
      error === "You do not have access to that space." ||
      error === "You do not have access to that space"
    ) {
      return error;
    }
    return "I couldn't save that transaction right now. Please try again in a moment.";
  }
  if (toolName === "add_transactions_batch") {
    return "I couldn't save those transactions right now. Please try again in a moment.";
  }
  if (toolName === "manage_recurring") {
    return "I couldn't save that recurring transaction right now. Please try again in a moment.";
  }
  return null;
}
