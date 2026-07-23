import { buildInternalInvokeHeaders } from "../auth.ts";
import { formatInvokeError } from "../formatting-helpers.ts";
import {
  buildRecurrenceRule,
  buildRecurrenceRuleForUpdate,
  formatDateInTimeZone,
  normalizeDateInput,
} from "./date-utils.ts";
import {
  type BotSpaceMeta,
  hasExplicitBotSpaceScope,
  resolveBotSpaceScope,
  resolveHouseholdSplitConfig,
} from "./household-utils.ts";
import type { LastListedTransaction } from "./session-state.ts";
import {
  invokeTransactionDelete,
  invokeTransactionSave,
  normalizeTransactionToolArgs,
} from "./transaction-tool.ts";
import {
  resolveBotTransactionSelection,
  validateActiveBotTransactionId,
} from "./transaction-selection.ts";
import {
  hasExplicitTransactionCurrency,
  resolveWalletForTransactionToolCall,
  resolveWalletTransactionCurrency,
} from "./wallet-scope.ts";

export type BotToolInvokeFailure = {
  toolName: string;
  targetFunction: string;
  formatted: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

type ExecuteManageRecurringParams = {
  supabase: any;
  internalFunctionKey: string;
  userId: string;
  userCurrency: string;
  userTimezone: string;
  userMessageContent: string;
  args: Record<string, any>;
  spaceMap: Map<string, BotSpaceMeta>;
  lastListedTransactions: LastListedTransaction[];
  logPrefix: string;
  reportFailure?: (failure: BotToolInvokeFailure) => Promise<void>;
};

async function reportFailure(
  params: ExecuteManageRecurringParams,
  failure: Omit<BotToolInvokeFailure, "toolName">,
): Promise<void> {
  await params.reportFailure?.({ toolName: "manage_recurring", ...failure });
}

function buildRecurringSelectionClarification(
  error: string,
  logPrefix: string,
) {
  console.warn(`[${logPrefix}] recurring selection recovery required`, {
    error,
  });
  return {
    status: "context_refresh_required",
    user_response_required: false,
    next_tool: "financial_insight",
    next_tool_purpose: "reload_projected_recurring_transactions",
    retry_tool: "manage_recurring",
    preserve_original_tool_args: true,
  };
}

async function resolveRecurringSelection(params: ExecuteManageRecurringParams) {
  const expenseIdDirect = typeof params.args.expense_id === "string"
    ? params.args.expense_id.trim()
    : "";
  const spaceNameByHouseholdId = (
    householdId: string | null | undefined,
  ) => (householdId ? params.spaceMap.get(householdId)?.name || null : null);

  return expenseIdDirect
    ? await validateActiveBotTransactionId(params.supabase, expenseIdDirect)
    : await resolveBotTransactionSelection({
      supabase: params.supabase,
      userId: params.userId,
      args: params.args,
      items: params.lastListedTransactions,
      spaceNameByHouseholdId,
    });
}

export async function executeManageRecurringTool(
  params: ExecuteManageRecurringParams,
): Promise<Record<string, unknown>> {
  const action = String(params.args.action || "").trim().toLowerCase();
  if (!(["add", "update", "delete"] as const).includes(action as any)) {
    return { error: "action must be add, update, or delete." };
  }

  if (action === "delete") {
    const resolved = await resolveRecurringSelection(params);
    if ("needs_disambiguation" in resolved) return resolved;
    if ("error" in resolved) {
      return buildRecurringSelectionClarification(
        resolved.error,
        params.logPrefix,
      );
    }

    const expenseId = resolved.candidate.id;
    if (!expenseId) {
      return buildRecurringSelectionClarification(
        "No matching recurring transaction ID was resolved.",
        params.logPrefix,
      );
    }
    const deleted = await invokeTransactionDelete(
      params.supabase,
      params.internalFunctionKey,
      params.userId,
      expenseId,
      "Failed to delete recurring transaction",
    );
    if (deleted.success) return { success: true };

    await reportFailure(params, {
      targetFunction: "delete-expense",
      formatted: deleted.formatted,
      error: deleted.error,
      context: { action, expenseId },
    });
    return { error: deleted.formatted };
  }

  if (action === "add") {
    const scope = resolveBotSpaceScope(params.args, params.spaceMap);
    const householdId = scope.householdId;
    const date = normalizeDateInput(
      params.args.anchor_date ?? params.args.date,
      formatDateInTimeZone(params.userTimezone),
    );
    const normalized = normalizeTransactionToolArgs(params.args, {
      date,
      currency: params.userCurrency,
      currencyEvidenceText: params.userMessageContent,
    });
    if (!normalized.ok) return { error: normalized.error };

    const transaction = normalized.transaction;
    const recurrenceRule =
      buildRecurrenceRule(params.args, transaction.date!) || {
        frequency: String(params.args.frequency || "monthly").toLowerCase(),
        interval: 1,
        anchor_date: transaction.date!,
        projection_enabled: true,
      };
    const splitConfig = householdId && scope.spaceMeta?.isPortfolio !== true
      ? await resolveHouseholdSplitConfig(
        params.supabase,
        householdId,
        params.userId,
        transaction.amount,
        params.args,
      )
      : {};
    const wallet = await resolveWalletForTransactionToolCall(
      params.supabase,
      params.userId,
      householdId,
      params.args,
      params.logPrefix,
    );
    if (wallet.error) return { error: wallet.error };
    const currency = resolveWalletTransactionCurrency({
      wallet,
      walletName: params.args.wallet_name || params.args.wallet_id ||
        params.args.account_id,
      transactionCurrency: transaction.currency,
      fallbackCurrency: params.userCurrency,
      hasExplicitCurrency: hasExplicitTransactionCurrency(params.args),
    });
    if (currency.error || !currency.currency) return { error: currency.error };

    const { data, error } = await invokeTransactionSave(
      params.supabase,
      params.internalFunctionKey,
      params.userId,
      {
        amount: transaction.amount,
        category: transaction.category,
        currency: currency.currency,
        date: transaction.date!,
        description: transaction.description,
        merchant: transaction.merchant,
        type: transaction.type,
        householdId,
        isPortfolio: scope.spaceMeta?.isPortfolio ?? false,
        accountId: wallet.accountId ?? undefined,
        payerUserId: splitConfig.payerUserId,
        customSplits: splitConfig.customSplits,
        isRecurring: true,
        recurrence_rule: recurrenceRule,
        source: params.args.source,
        ownerType: params.args.owner_type,
        privacyScope: params.args.privacy_scope,
      },
    );
    const success = !error && data?.success === true;
    if (success) return { success: true, data: data?.data ?? data };

    const formatted = formatInvokeError(error ?? data?.error) ||
      "Failed to save recurring transaction";
    await reportFailure(params, {
      targetFunction: transaction.type === "income"
        ? "save-income"
        : "save-expense",
      formatted,
      error: error ?? data?.error,
      context: {
        action,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        householdId,
      },
    });
    return { error: formatted };
  }

  const resolved = await resolveRecurringSelection(params);
  if ("needs_disambiguation" in resolved) return resolved;
  if ("error" in resolved) {
    return buildRecurringSelectionClarification(
      resolved.error,
      params.logPrefix,
    );
  }
  const expenseId = resolved.candidate.id;
  if (!expenseId) {
    return buildRecurringSelectionClarification(
      "No matching recurring transaction ID was resolved.",
      params.logPrefix,
    );
  }

  const { data: existing, error: existingError } = await params.supabase
    .from("expenses")
    .select(
      "id, amount_cents, currency, date, household_id, account_id, split_group_id, recurrence_rule",
    )
    .eq("id", expenseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingError || !existing) {
    return {
      error: existingError
        ? formatInvokeError(existingError)
        : "That recurring transaction is no longer available.",
    };
  }

  const hasExplicitScope = hasExplicitBotSpaceScope(params.args);
  const scope = hasExplicitScope
    ? resolveBotSpaceScope(params.args, params.spaceMap)
    : {
      householdId: existing.household_id || null,
      spaceMeta: existing.household_id
        ? params.spaceMap.get(existing.household_id)
        : undefined,
    };
  const householdId = scope.householdId;
  const date = normalizeDateInput(
    params.args.anchor_date ?? params.args.date,
    formatDateInTimeZone(params.userTimezone),
  );
  const updates: Record<string, unknown> = {
    is_recurring: true,
    recurrence_rule: buildRecurrenceRuleForUpdate(
      params.args,
      existing.recurrence_rule,
      existing.date || date,
    ),
  };

  if (params.args.amount != null) {
    const amount = Number(params.args.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Invalid amount. Amount must be greater than 0." };
    }
    updates.amount_cents = Math.round(amount * 100);
  }
  if (params.args.category != null) updates.category = params.args.category;
  if (params.args.currency != null) updates.currency = params.args.currency;
  if (params.args.description != null) {
    updates.raw_text = params.args.description;
  }
  if (params.args.merchant !== undefined) {
    updates.merchant = params.args.merchant;
  }
  if (params.args.source != null) updates.source = params.args.source;
  if (params.args.date != null || params.args.anchor_date != null) {
    updates.date = date;
  }
  if (hasExplicitScope) updates.household_id = householdId;

  const hasExplicitWallet = params.args.wallet_name !== undefined ||
    params.args.wallet_id !== undefined ||
    params.args.account_id !== undefined;
  if (hasExplicitWallet) {
    const wallet = await resolveWalletForTransactionToolCall(
      params.supabase,
      params.userId,
      householdId,
      params.args,
      params.logPrefix,
    );
    if (wallet.error) return { error: wallet.error };
    const currency = resolveWalletTransactionCurrency({
      wallet,
      walletName: params.args.wallet_name || params.args.wallet_id ||
        params.args.account_id,
      transactionCurrency: updates.currency || existing.currency,
      fallbackCurrency: params.userCurrency,
      hasExplicitCurrency: hasExplicitTransactionCurrency(params.args),
    });
    if (currency.error || !currency.currency) return { error: currency.error };
    updates.account_id = wallet.accountId || null;
    updates.currency = currency.currency;
  }

  const hasSplitHints = Array.isArray(params.args.member_splits) &&
    params.args.member_splits.length > 0;
  const hasPayerHint = typeof params.args.payer_name === "string" &&
    params.args.payer_name.trim().length > 0;
  const amountMajor = params.args.amount != null
    ? Number(params.args.amount)
    : Number(existing.amount_cents || 0) / 100;
  const splitConfig = householdId &&
      scope.spaceMeta?.isPortfolio !== true &&
      (hasSplitHints || hasPayerHint)
    ? await resolveHouseholdSplitConfig(
      params.supabase,
      householdId,
      params.userId,
      amountMajor,
      params.args,
    )
    : {};

  const requestBody: Record<string, unknown> = {
    userId: params.userId,
    expenseId,
    updates,
    clientTimezone: params.userTimezone,
  };
  if (splitConfig.payerUserId) {
    updates.payer_user_id = splitConfig.payerUserId;
    requestBody.payerUserId = splitConfig.payerUserId;
  }
  const customSplits = splitConfig.customSplits;
  if (
    householdId &&
    customSplits &&
    Array.isArray(customSplits.memberSplits) &&
    customSplits.memberSplits.length > 0
  ) {
    requestBody.householdId = householdId;
    if (existing.split_group_id) {
      requestBody.splitUpdate = customSplits;
    } else {
      requestBody.customSplits = customSplits;
    }
  }

  const { data, error } = await params.supabase.functions.invoke(
    "update-expense",
    {
      body: requestBody,
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );
  const success = !error && data?.success === true;
  if (success) return { success: true, data: data?.data ?? data };

  const formatted = formatInvokeError(error ?? data?.error) ||
    "Failed to update recurring transaction";
  await reportFailure(params, {
    targetFunction: "update-expense",
    formatted,
    error: error ?? data?.error,
    context: { action, expenseId, updateKeys: Object.keys(updates) },
  });
  return { error: formatted };
}
