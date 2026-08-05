import { buildInternalInvokeHeaders } from "../auth.ts";
import { VALID_CURRENCIES } from "../currency-validator.ts";
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
  listBotSpaceIds,
  resolveBotSpaceScope,
  resolveHouseholdSplitConfig,
} from "./household-utils.ts";
import {
  type LastListedTransaction,
  normalizeLastListedTransactionFromRow,
  resolveLastListedSelection,
} from "./session-state.ts";
import {
  invokeTransactionSave,
  normalizeTransactionToolArgs,
} from "./transaction-tool.ts";
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
  reportFailure?: (failure: BotToolInvokeFailure) => Promise<boolean>;
  rememberListedTransactions?: (
    items: LastListedTransaction[],
  ) => Promise<void>;
};

const recurringActions = [
  "add",
  "update",
  "delete",
  "list_series",
  "list_history",
  "confirm_occurrence",
  "update_occurrence",
  "unconfirm_occurrence",
  "skip_occurrence",
] as const;

type RecurringAction = (typeof recurringActions)[number];

async function reportFailure(
  params: ExecuteManageRecurringParams,
  failure: Omit<BotToolInvokeFailure, "toolName">,
): Promise<boolean> {
  if (!params.reportFailure) return false;
  return await params.reportFailure({
    toolName: "manage_recurring",
    ...failure,
  });
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
  const expenseIdDirect = [params.args.recurring_id, params.args.expense_id]
    .find((value) => typeof value === "string" && value.trim())
    ?.trim() || "";
  const spaceNameByHouseholdId = (householdId: string | null | undefined) =>
    householdId ? params.spaceMap.get(householdId)?.name || null : null;

  if (expenseIdDirect) {
    return {
      candidate: {
        id: expenseIdDirect,
        amountMajor: 0,
        currency: "",
        date: "",
        category: "",
        description: "",
      } satisfies LastListedTransaction,
    };
  }

  const selected = resolveLastListedSelection(
    params.lastListedTransactions,
    params.args,
    spaceNameByHouseholdId,
  );
  return selected;
}

function normalizeLimit(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= 100
    ? limit
    : null;
}

function normalizeCalendarDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

async function invokeRecurringFunction(
  params: ExecuteManageRecurringParams,
  action: RecurringAction,
  targetFunction: string,
  body: Record<string, unknown>,
  fallbackMessage: string,
  includeData = true,
): Promise<Record<string, unknown>> {
  if (!params.internalFunctionKey.trim()) {
    return { error: "Internal key not configured" };
  }
  const { data, error } = await params.supabase.functions.invoke(
    targetFunction,
    {
      body,
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );
  if (!error && data?.success === true) {
    return includeData
      ? { success: true, action, data: data.data ?? data }
      : { success: true, action };
  }

  const formatted = formatInvokeError(error ?? data?.error) || fallbackMessage;
  const backendFailureReported = await reportFailure(params, {
    targetFunction,
    formatted,
    error: error ?? data?.error,
    context: { action, recurringId: body.recurringId },
  });
  return {
    error: formatted,
    action,
    ...(typeof data?.code === "string" ? { code: data.code } : {}),
    ...(backendFailureReported ? { _backend_failure_reported: true } : {}),
  };
}

function sanitizeSeriesListResult(
  result: Record<string, unknown>,
  params: ExecuteManageRecurringParams,
): Record<string, unknown> {
  const data = result.data;
  if (!result.success || !data || typeof data !== "object") return result;
  const rows = Array.isArray((data as Record<string, unknown>).items)
    ? (data as { items: Array<Record<string, unknown>> }).items
    : [];
  return {
    success: true,
    action: result.action,
    data: {
      items: rows.map((row, index) => ({
        index: index + 1,
        date: row.date,
        category: row.category,
        description: row.raw_text,
        merchant: row.merchant,
        amount: Number(row.amount_cents || 0) / 100,
        currency: row.currency,
        type: row.type,
        next_occurrence_date: row.next_occurrence_date,
        latest_actionable_occurrence_date:
          row.latest_actionable_occurrence_date,
        actionable_count: row.actionable_count,
        space: typeof row.household_id === "string"
          ? params.spaceMap.get(row.household_id)?.name
          : "personal",
      })),
      has_more: (data as Record<string, unknown>).has_more === true,
    },
  };
}

function sanitizeHistoryResult(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const data = result.data;
  if (!result.success || !data || typeof data !== "object") return result;
  const rows = Array.isArray((data as Record<string, unknown>).items)
    ? (data as { items: Array<Record<string, unknown>> }).items
    : [];
  return {
    success: true,
    action: result.action,
    data: {
      items: rows.map((row, index) => ({
        index: index + 1,
        scheduled_occurrence_date: row.scheduled_occurrence_date,
        status: row.status,
        confirmation_source: row.confirmation_source,
        paid_date: row.paid_date,
        amount: row.amount_cents == null
          ? null
          : Number(row.amount_cents) / 100,
        currency: row.currency,
        confirmed_at: row.confirmed_at,
      })),
      has_more: (data as Record<string, unknown>).has_more === true,
      next_before_scheduled_date: (data as Record<string, unknown>).next_cursor,
    },
  };
}

async function loadPendingOccurrenceChoices(
  params: ExecuteManageRecurringParams,
  recurringId: string,
): Promise<
  | {
    items: Array<{
      scheduled_occurrence_date: string;
      amount: number;
      currency: string;
    }>;
  }
  | Record<string, unknown>
> {
  const result = await invokeRecurringFunction(
    params,
    "list_history",
    "list-recurring-occurrences",
    { userId: params.userId, recurringId, limit: 100 },
    "Failed to load pending recurring payments",
  );
  if (!result.success) return result;

  const rows = result.data && typeof result.data === "object" &&
      Array.isArray((result.data as Record<string, unknown>).items)
    ? ((result.data as { items: Array<Record<string, unknown>> }).items)
    : [];
  return {
    items: rows
      .filter((row) => row.status === "pending")
      .map((row) => ({
        scheduled_occurrence_date: String(
          row.scheduled_occurrence_date || "",
        ),
        amount: Number(row.amount_cents || 0) / 100,
        currency: String(row.currency || "").toUpperCase(),
      }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.scheduled_occurrence_date)),
  };
}

function buildOccurrenceConfirmationClarification(params: {
  pendingOccurrences: Array<{
    scheduled_occurrence_date: string;
    amount: number;
    currency: string;
  }>;
  scheduledOccurrenceDate: string | null;
  paidDate: string | null;
  amount: number | null;
}) {
  const availableDates = params.pendingOccurrences.map(
    (occurrence) => occurrence.scheduled_occurrence_date,
  );
  const scheduledDateIsPending = params.scheduledOccurrenceDate !== null &&
    availableDates.includes(params.scheduledOccurrenceDate);
  return {
    status: "confirmation_details_required",
    user_response_required: true,
    pending_occurrences: params.pendingOccurrences,
    needs_scheduled_occurrence_date: !scheduledDateIsPending,
    needs_paid_date: !params.paidDate,
    needs_amount: params.amount === null,
  };
}

export async function executeManageRecurringTool(
  params: ExecuteManageRecurringParams,
): Promise<Record<string, unknown>> {
  const requestedAction = String(params.args.action || "")
    .trim()
    .toLowerCase();
  if (!recurringActions.includes(requestedAction as RecurringAction)) {
    return {
      error: `action must be one of: ${recurringActions.join(", ")}.`,
    };
  }
  const action = requestedAction as RecurringAction;
  console.log(`[${params.logPrefix}] [RecurringSeriesReadTrace]`, {
    action,
    selectionIndex: Number.isSafeInteger(Number(params.args.selection_index))
      ? Number(params.args.selection_index)
      : null,
    hasRecurringId: typeof params.args.recurring_id === "string" ||
      typeof params.args.expense_id === "string",
    scheduled: normalizeCalendarDate(params.args.scheduled_occurrence_date) ||
      "none",
    paid: normalizeCalendarDate(params.args.paid_date) || "none",
    hasAmount: Number.isFinite(Number(params.args.amount)) &&
      Number(params.args.amount) > 0,
  });

  if (action === "list_series") {
    const limit = normalizeLimit(params.args.limit, 25);
    if (limit === null || limit > 25) {
      return { error: "limit must be between 1 and 25." };
    }
    const normalizedScope = String(
      params.args.space_scope || params.args.scope || "",
    ).trim().toLowerCase().replace(/[\s-]+/g, "_");
    const hasExplicitScope = hasExplicitBotSpaceScope(params.args);
    const requestedScope = resolveBotSpaceScope(params.args, params.spaceMap);
    const requestedCurrencies = Array.isArray(params.args.currencies)
      ? params.args.currencies.map((value: unknown) =>
        String(value).trim().toUpperCase()
      )
      : params.args.currency
      ? [String(params.args.currency).trim().toUpperCase()]
      : [];
    if (
      requestedCurrencies.some(
        (value: string) => !VALID_CURRENCIES.includes(value),
      )
    ) {
      return { error: "currencies must contain valid ISO currency codes." };
    }
    const currencies = requestedCurrencies.length > 0
      ? Array.from(new Set(requestedCurrencies))
      : undefined;
    // A recurring selection must be read as one logical list. Calling the
    // existing single-scope RPC once per accessible space keeps its access
    // checks intact while ensuring the saved selection memory contains every
    // item the user was shown.
    const allAccessibleScopes = [null, ...listBotSpaceIds(params.spaceMap)];
    let scopes: Array<string | null>;
    if (!hasExplicitScope || ["all", "all_spaces"].includes(normalizedScope)) {
      scopes = allAccessibleScopes;
    } else if (["personal", "personal_account"].includes(normalizedScope)) {
      scopes = [null];
    } else if (["shared", "shared_space", "private_space"].includes(normalizedScope)) {
      const wantsPrivate = normalizedScope === "private_space";
      scopes = listBotSpaceIds(
        params.spaceMap,
        wantsPrivate ? "private" : "shared",
      );
    } else if (requestedScope.householdId) {
      scopes = [requestedScope.householdId];
    } else {
      return { error: "Unknown space" };
    }
    const results = await Promise.all(
      scopes.map((householdId) =>
        invokeRecurringFunction(
          params,
          action,
          "recurring-read",
          {
            operation: "listSeries",
            userId: params.userId,
            ...(householdId ? { householdId } : {}),
            ...(currencies ? { currencies } : {}),
            limit,
          },
          "Failed to list recurring transactions",
        )
      ),
    );
    const failedResult = results.find((result) => result.success !== true);
    if (failedResult) return failedResult;
    const allRows = results.flatMap((result) => {
      const data = result.data;
      return data &&
          typeof data === "object" &&
          Array.isArray((data as Record<string, unknown>).items)
        ? (data as { items: unknown[] }).items
        : [];
    });
    const rows = allRows
      .sort((left: any, right: any) => {
        const leftDate = String(left?.next_occurrence_date || "9999-12-31");
        const rightDate = String(right?.next_occurrence_date || "9999-12-31");
        return leftDate.localeCompare(rightDate) ||
          String(left?.id || "").localeCompare(String(right?.id || ""));
      })
      .slice(0, limit);
    const result = {
      success: true,
      action,
      data: {
        items: rows,
        has_more: allRows.length > limit || results.some((result) =>
          (result.data as Record<string, unknown> | undefined)?.has_more ===
            true
        ),
      },
    };
    const selectionItems = rows
      .map(normalizeLastListedTransactionFromRow)
      .filter((item): item is LastListedTransaction => item !== null);
    console.log(`[${params.logPrefix}] [RecurringSeriesReadTrace]`, {
      scope: hasExplicitScope && !["all", "all_spaces"].includes(normalizedScope)
        ? requestedScope.householdId
          ? "named-space"
          : normalizedScope || "personal"
        : "all-accessible-spaces",
      queriedScopes: scopes.length,
      currencies: currencies || "all",
      requestedLimit: limit,
      success: result.success === true,
      returnedCount: rows.length,
      series: rows.map((row: any) => ({
        id: String(row?.id || "").slice(0, 8),
        label: String(row?.raw_text || row?.merchant || "").slice(0, 48),
        currency: row?.currency || null,
        next: row?.next_occurrence_date || null,
      })),
    });
    if (result.success) {
      await params.rememberListedTransactions?.(selectionItems);
    }
    return sanitizeSeriesListResult(result, params);
  }

  if (action === "list_history") {
    const resolved = await resolveRecurringSelection(params);
    if ("needs_disambiguation" in resolved) return resolved;
    if ("error" in resolved) {
      return buildRecurringSelectionClarification(
        resolved.error,
        params.logPrefix,
      );
    }
    const limit = normalizeLimit(params.args.limit, 50);
    if (limit === null) return { error: "limit must be between 1 and 100." };
    const beforeScheduledDate = params.args.before_scheduled_date === undefined
      ? undefined
      : normalizeCalendarDate(params.args.before_scheduled_date);
    if (
      params.args.before_scheduled_date !== undefined &&
      !beforeScheduledDate
    ) {
      return { error: "before_scheduled_date must use YYYY-MM-DD." };
    }
    const result = await invokeRecurringFunction(
      params,
      action,
      "list-recurring-occurrences",
      {
        userId: params.userId,
        recurringId: resolved.candidate.id,
        ...(beforeScheduledDate ? { beforeScheduledDate } : {}),
        limit,
      },
      "Failed to list recurring payment history",
    );
    const historyRows = result.data && typeof result.data === "object" &&
        Array.isArray((result.data as Record<string, unknown>).items)
      ? ((result.data as { items: Array<Record<string, unknown>> }).items)
      : [];
    console.log(`[${params.logPrefix}] [RecurringSeriesReadTrace]`, {
      action: "list_history",
      recurring: resolved.candidate.id.slice(0, 8),
      before: beforeScheduledDate || "none",
      success: result.success === true,
      returnedCount: historyRows.length,
      occurrences: historyRows.slice(0, 8).map((row) =>
        `${String(row.scheduled_occurrence_date || "?")}:${String(row.status || "?")}`
      ),
    });
    return sanitizeHistoryResult(result);
  }

  if (
    action === "confirm_occurrence" ||
    action === "update_occurrence" ||
    action === "unconfirm_occurrence" ||
    action === "skip_occurrence"
  ) {
    const resolved = await resolveRecurringSelection(params);
    if ("needs_disambiguation" in resolved) return resolved;
    if ("error" in resolved) {
      return buildRecurringSelectionClarification(
        resolved.error,
        params.logPrefix,
      );
    }
    const recurringId = resolved.candidate.id;
    const seriesResult = await invokeRecurringFunction(
      params,
      action,
      "recurring-read",
      { operation: "getSeries", userId: params.userId, recurringId },
      "Unable to load the recurring transaction",
    );
    if (!seriesResult.success) return seriesResult;
    const series = seriesResult.data as Record<string, any>;
    if (action === "confirm_occurrence") {
      const scheduledOccurrenceDate = normalizeCalendarDate(
        params.args.scheduled_occurrence_date,
      );
      // Some model turns use the generic date field after the user says
      // "today". For a confirmation that is the paid date; the scheduled
      // occurrence must be selected from the pending schedule instead.
      const paidDate = normalizeCalendarDate(
        params.args.paid_date ?? params.args.date,
      );
      const amount = Number(params.args.amount);
      const validAmount = Number.isFinite(amount) && amount > 0
        ? amount
        : null;
      const pendingResult = await loadPendingOccurrenceChoices(
        params,
        recurringId,
      );
      const pendingOccurrences = "items" in pendingResult &&
          Array.isArray((pendingResult as { items?: unknown }).items)
        ? (pendingResult as {
          items: Array<{
            scheduled_occurrence_date: string;
            amount: number;
            currency: string;
          }>;
        }).items
        : null;
      if (!pendingOccurrences) return pendingResult;
      const confirmationClarification = buildOccurrenceConfirmationClarification({
        pendingOccurrences,
        scheduledOccurrenceDate,
        paidDate,
        amount: validAmount,
      });
      if (
        confirmationClarification.needs_scheduled_occurrence_date ||
        confirmationClarification.needs_paid_date ||
        confirmationClarification.needs_amount
      ) {
        return confirmationClarification;
      }
      const hasWalletHint = params.args.wallet_name !== undefined ||
        params.args.wallet_id !== undefined ||
        params.args.account_id !== undefined;
      const wallet = hasWalletHint
        ? await resolveWalletForTransactionToolCall(
          params.supabase,
          params.userId,
          series.household_id || null,
          params.args,
          params.logPrefix,
        )
        : { accountId: series.account_id || null, error: undefined };
      if (wallet.error) return { error: wallet.error };
      const hasSplitHints = Array.isArray(params.args.member_splits) &&
        params.args.member_splits.length > 0;
      const hasPayerHint = typeof params.args.payer_name === "string" &&
        params.args.payer_name.trim().length > 0;
      const splitConfig = series.household_id && (hasSplitHints || hasPayerHint)
        ? await resolveHouseholdSplitConfig(
          params.supabase,
          series.household_id,
          params.userId,
          validAmount!,
          params.args,
        )
        : {};
      return await invokeRecurringFunction(
        params,
        action,
        "confirm-recurring-occurrence",
        {
          userId: params.userId,
          recurringId,
          scheduledOccurrenceDate,
          paidDate: paidDate!,
          amount: validAmount!,
          accountId: wallet.accountId || null,
          ...(params.args.merchant !== undefined
            ? { merchant: params.args.merchant }
            : {}),
          ...(params.args.description !== undefined
            ? { description: params.args.description }
            : {}),
          ...(params.args.update_future_amount !== undefined
            ? { updateFutureAmount: params.args.update_future_amount === true }
            : {}),
          ...(splitConfig.payerUserId
            ? { payerUserId: splitConfig.payerUserId }
            : {}),
          ...(splitConfig.customSplits
            ? { customSplits: splitConfig.customSplits }
            : {}),
        },
        "Failed to confirm recurring occurrence",
        false,
      );
    }

    if (action === "update_occurrence") {
      const scheduledOccurrenceDate = normalizeCalendarDate(
        params.args.scheduled_occurrence_date,
      );
      if (!scheduledOccurrenceDate) {
        return { error: "scheduled_occurrence_date must use YYYY-MM-DD." };
      }
      const paidDate = params.args.paid_date === undefined
        ? undefined
        : normalizeCalendarDate(params.args.paid_date);
      if (params.args.paid_date !== undefined && !paidDate) {
        return { error: "paid_date must use YYYY-MM-DD." };
      }
      const amount = params.args.amount === undefined
        ? undefined
        : Number(params.args.amount);
      if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
        return { error: "amount must be greater than 0." };
      }
      const optionalFields = [
        params.args.paid_date,
        params.args.amount,
        params.args.account_id,
        params.args.wallet_id,
        params.args.wallet_name,
        params.args.merchant,
        params.args.description,
      ];
      if (optionalFields.every((value) => value === undefined)) {
        return { error: "Provide at least one occurrence field to update." };
      }
      const hasWalletHint = params.args.wallet_name !== undefined ||
        params.args.wallet_id !== undefined ||
        params.args.account_id !== undefined;
      const wallet = hasWalletHint
        ? await resolveWalletForTransactionToolCall(
          params.supabase,
          params.userId,
          series.household_id || null,
          params.args,
          params.logPrefix,
        )
        : null;
      if (wallet?.error) return { error: wallet.error };
      return await invokeRecurringFunction(
        params,
        action,
        "update-recurring-occurrence",
        {
          userId: params.userId,
          recurringId,
          scheduledOccurrenceDate,
          ...(paidDate ? { paidDate } : {}),
          ...(amount !== undefined ? { amount } : {}),
          ...(wallet ? { accountId: wallet.accountId || null } : {}),
          ...(params.args.merchant !== undefined
            ? { merchant: params.args.merchant }
            : {}),
          ...(params.args.description !== undefined
            ? { description: params.args.description }
            : {}),
          ...(params.args.update_future_amount !== undefined
            ? { updateFutureAmount: params.args.update_future_amount === true }
            : {}),
        },
        "Failed to update recurring occurrence",
        false,
      );
    }

    const targetFunction = action === "unconfirm_occurrence"
      ? "unconfirm-recurring-occurrence"
      : "skip-recurring-occurrence";
    const scheduledOccurrenceDate = normalizeCalendarDate(
      params.args.scheduled_occurrence_date,
    );
    if (!scheduledOccurrenceDate) {
      return { error: "scheduled_occurrence_date must use YYYY-MM-DD." };
    }
    return await invokeRecurringFunction(
      params,
      action,
      targetFunction,
      { userId: params.userId, recurringId, scheduledOccurrenceDate },
      action === "unconfirm_occurrence"
        ? "Failed to unconfirm recurring occurrence"
        : "Failed to skip recurring occurrence",
      false,
    );
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
    return await invokeRecurringFunction(
      params,
      action,
      "delete-recurring-template",
      { userId: params.userId, recurringId: expenseId },
      "Failed to delete recurring transaction",
      false,
    );
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
    const recurrenceRule = buildRecurrenceRule(
      params.args,
      transaction.date!,
    ) || {
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
      walletName: params.args.wallet_name ||
        params.args.wallet_id ||
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
    if (success) return { success: true, action };

    const formatted = formatInvokeError(error ?? data?.error) ||
      "Failed to save recurring transaction";
    const backendFailureReported = await reportFailure(params, {
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
    return {
      error: formatted,
      action,
      ...(backendFailureReported ? { _backend_failure_reported: true } : {}),
    };
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

  const existingResult = await invokeRecurringFunction(
    params,
    action,
    "recurring-read",
    {
      operation: "getSeries",
      userId: params.userId,
      recurringId: expenseId,
    },
    "That recurring transaction is no longer available.",
  );
  if (!existingResult.success) return existingResult;
  const existing = existingResult.data as Record<string, any>;

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
  if (params.args.currency != null) {
    const currency = String(params.args.currency).trim().toUpperCase();
    if (!VALID_CURRENCIES.includes(currency)) {
      return { error: "currency must be a valid ISO currency code." };
    }
    updates.currency = currency;
  }
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
      walletName: params.args.wallet_name ||
        params.args.wallet_id ||
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
  if (success) return { success: true };

  const formatted = formatInvokeError(error ?? data?.error) ||
    "Failed to update recurring transaction";
  const backendFailureReported = await reportFailure(params, {
    targetFunction: "update-expense",
    formatted,
    error: error ?? data?.error,
    context: { action, expenseId, updateKeys: Object.keys(updates) },
  });
  return {
    error: formatted,
    action,
    ...(backendFailureReported ? { _backend_failure_reported: true } : {}),
  };
}
