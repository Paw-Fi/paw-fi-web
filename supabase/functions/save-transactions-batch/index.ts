// Supabase Edge Function: save-transactions-batch
// Saves multiple transactions (expenses/income) in a single database transaction
// Designed for AI-extracted bulk imports (PDFs, bank statements, etc.)
// Significantly reduces latency by using batch insert instead of N individual calls

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  ensureUserCategory,
  learnUserCategoryPreference,
  mergeAllowedCategories,
} from "../shared/user-categories.ts";
import {
  type CategoryContext,
  loadCategoryContext,
} from "../shared/category-resolution.ts";
import {
  normalizeBatchDateInput,
  normalizeBatchTransactionInput,
  resolveBatchCategoryForStorage,
} from "./request-normalization.ts";
import {
  assertAccountInScope,
  resolveDefaultAccountId,
} from "../shared/accounts.ts";
import {
  buildImportRequestKey,
  buildImportSemanticKey,
} from "../shared/import-dedupe.ts";
import {
  buildHouseholdSplitRecords,
  createHouseholdTransactionWithSplit,
  type CustomSplits,
  fetchHouseholdAutoSplitSettings,
  type HouseholdAutoSplitSettings,
  resolveEffectiveSplit,
} from "../shared/household-auto-split.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function summarizeCustomSplits(customSplits?: CustomSplits | null) {
  if (!customSplits) return null;
  return {
    splitType: customSplits.splitType,
    memberSplits: customSplits.memberSplits?.map((split) => ({
      userId: split.userId,
      amount: split.amount,
      percentage: split.percentage,
      shares: split.shares,
    })),
  };
}

interface TransactionItem {
  type: "expense" | "income";
  amount: number;
  category: string;
  currency: string;
  date: string;
  clientCreatedAt?: string;
  description?: string;
  merchant?: string;
  breakdown?: string[];
  receiptImageUrl?: string;
  customSplits?: CustomSplits;
  payerUserId?: string;
  accountId?: string;
  clientRecordId?: string;
  clientMutationId?: string;
  idempotencyKey?: string;
  // Income-specific fields
  ownerType?: "me" | "partner" | "household";
  privacyScope?: "private" | "balances_only" | "full";
  // Recurring support
  isRecurring?: boolean;
  recurrence_rule?: {
    frequency: string;
    anchor_date: string;
    end_date?: string;
    interval?: number;
    reminder?: {
      enabled: boolean;
      value: number;
      unit: "days" | "hours";
    };
  };
}

interface RequestBody {
  userId?: string;
  debugTraceId?: string;
  manualImportMode?: boolean;
  householdId?: string;
  isPortfolio?: boolean;
  progressOffset?: number;
  progressTotal?: number;
  skipSemanticDuplicates?: boolean;
  transactions: TransactionItem[];
}

interface SavedTransaction {
  id: string;
  index: number;
  type: "expense" | "income";
  success: boolean;
  duplicate?: boolean;
  duplicateKind?: "request" | "semantic";
  error?: string;
  data?: any;
}

interface PreparedTransactionRecord {
  index: number;
  type: "expense" | "income";
  record: any;
  customSplits?: CustomSplits | null;
  payerUserId?: string | null;
  importRequestKey: string | null;
  importSemanticKey: string;
}

export interface SaveTransactionsBatchSuccess {
  success: boolean;
  data: any[];
  results: SavedTransaction[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  shared: boolean;
  resolvedUserId: string;
}

interface SaveBatchProgressEvent {
  stage: string;
  message: string;
  currentItem?: number;
  totalItems?: number;
}

type SaveBatchProgressCallback = (event: SaveBatchProgressEvent) => void;

const STREAM_KEEPALIVE_INTERVAL_MS = 15000;

class SaveTransactionsBatchError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "SaveTransactionsBatchError";
    this.status = status;
    this.code = code ?? resolveErrorCode(status);
  }
}

function createFallbackCategoryContext(): CategoryContext {
  const merged = mergeAllowedCategories({ customCategories: [] });
  return {
    allowedExpenseSet: merged.allowedExpenseSet,
    allowedIncomeSet: merged.allowedIncomeSet,
    preferences: [],
    remaps: [],
  };
}

function resolveErrorCode(status: number): string {
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status >= 500) return "SERVER_ERROR";
  return "VALIDATION_ERROR";
}

function errorResponse(message: string, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: code ?? resolveErrorCode(status),
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function normalizeProgressCount(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  return Math.max(0, Math.trunc(value));
}

function resolveProgressTotal(body: RequestBody): number {
  const requested = normalizeProgressCount(body.progressTotal);
  const actual = body.transactions.length;
  if (requested == null || requested < actual) {
    return actual;
  }
  return requested;
}

function resolveProgressOffset(body: RequestBody, total: number): number {
  const requested = normalizeProgressCount(body.progressOffset) ?? 0;
  return Math.min(requested, total);
}

function shouldEmitValidationProgress(index: number, total: number): boolean {
  const current = index + 1;
  return current === 1 || current === total || current % 10 === 0;
}

function createProgressEmitter(
  body: RequestBody,
  onProgress?: SaveBatchProgressCallback,
) {
  const totalItems = resolveProgressTotal(body);
  const progressOffset = resolveProgressOffset(body, totalItems);
  let lastCurrentItem = progressOffset;

  return (stage: string, message: string, currentLocalItem?: number) => {
    if (!onProgress) return;

    const normalizedCurrent = currentLocalItem == null ? undefined : Math.max(
      lastCurrentItem,
      Math.min(
        totalItems,
        progressOffset + Math.max(0, Math.trunc(currentLocalItem)),
      ),
    );

    if (normalizedCurrent != null) {
      lastCurrentItem = normalizedCurrent;
    }

    onProgress({
      stage,
      message,
      currentItem: normalizedCurrent,
      totalItems,
    });
  };
}

async function runWithConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<unknown>,
): Promise<void> {
  if (items.length === 0) return;
  const safeLimit = Math.max(1, Math.trunc(limit));

  for (let start = 0; start < items.length; start += safeLimit) {
    const batch = items.slice(start, start + safeLimit);
    await Promise.allSettled(
      batch.map((item, index) => worker(item, start + index)),
    );
  }
}

export async function saveTransactionsBatchInternal(
  req: Request,
  body: RequestBody,
  onProgress?: SaveBatchProgressCallback,
): Promise<SaveTransactionsBatchSuccess> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new SaveTransactionsBatchError("Server configuration error", 500);
  }

  const emitProgress = createProgressEmitter(body, onProgress);
  emitProgress("started", "Preparing import...", 0);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-save-transactions-batch" },
    },
  });

  // Authenticate
  const authResult = await authenticateUserOrInternalSecret(req, supabase);
  if (!authResult.success) {
    throw new SaveTransactionsBatchError(
      authResult.error || "Unauthorized",
      authResult.statusCode ?? 401,
    );
  }

  const userId = authResult.isInternalService
    ? sanitizeUuid(body.userId)
    : authResult.userId;

  if (!userId) {
    throw new SaveTransactionsBatchError("userId is required", 400);
  }
  const resolvedUserId = userId;

  let actorName = "Someone";
  try {
    const { data: appUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", resolvedUserId)
      .maybeSingle();
    if (appUser?.full_name && String(appUser.full_name).trim().length > 0) {
      actorName = appUser.full_name as string;
    }
  } catch (_) {}

  // Resolve user contact
  let contactId: string | null = null;
  const { data: contact } = await supabase
    .from("user_contacts")
    .select("id, preferred_currency")
    .eq("user_id", resolvedUserId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contact) {
    contactId = contact.id;
  }

  const isPortfolio = body.isPortfolio === true;
  const requestedHouseholdId = sanitizeUuid(body.householdId ?? null);

  // Verify household membership if household mode
  let resolvedHouseholdId: string | null = null;
  let householdMembers: { user_id: string }[] = [];

  let householdAutoSplitSettings: HouseholdAutoSplitSettings = {
    autoSplitEnabled: true,
    defaultConfig: null,
  };

  if (requestedHouseholdId) {
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", requestedHouseholdId)
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "[save-transactions-batch] Failed to verify household membership:",
        membershipError,
      );
      throw new SaveTransactionsBatchError(
        "Failed to verify household membership",
        500,
      );
    }

    if (!membership && isPortfolio) {
      throw new SaveTransactionsBatchError(
        "Forbidden household scope",
        403,
        "UNAUTHORIZED",
      );
    }

    if (membership && !isPortfolio) {
      resolvedHouseholdId = requestedHouseholdId;

      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", requestedHouseholdId);

      if (members && members.length > 0) {
        householdMembers = members;
        householdAutoSplitSettings = await fetchHouseholdAutoSplitSettings(
          supabase,
          requestedHouseholdId,
        );
      }
    }
  }

  const scopeHouseholdId: string | null = resolvedHouseholdId ??
    (isPortfolio ? (requestedHouseholdId ?? null) : null);
  const invalidAccountSentinel = "__invalid__";
  const accountResolutionCache = new Map<string, string | null>();
  const uniqueRequestedAccountIds = new Set<string>();

  async function resolveAccountForImportRow(
    requestedAccountId: string | null,
    hasRequestedAccountId: boolean,
    currency: string,
    index: number,
  ): Promise<string | null | typeof invalidAccountSentinel> {
    const householdScopeId = scopeHouseholdId ?? null;

    if (requestedAccountId) {
      uniqueRequestedAccountIds.add(requestedAccountId);
    }

    const cacheKey = `${scopeHouseholdId ?? "personal"}:${currency}:${
      hasRequestedAccountId
        ? (requestedAccountId ?? "__unassigned__")
        : "__default__"
    }`;
    if (accountResolutionCache.has(cacheKey)) {
      return accountResolutionCache.get(cacheKey) ?? null;
    }

    let resolvedAccountId: string | null | typeof invalidAccountSentinel;
    if (requestedAccountId) {
      const accountInScope = await assertAccountInScope(
        supabase,
        requestedAccountId,
        {
          userId: resolvedUserId,
          householdId: householdScopeId,
          currency,
        },
      );
      if (!accountInScope) {
        resolvedAccountId = invalidAccountSentinel;
      } else {
        resolvedAccountId = requestedAccountId;
      }
    } else if (hasRequestedAccountId) {
      resolvedAccountId = null;
    } else {
      resolvedAccountId = await resolveDefaultAccountId(supabase, {
        userId: resolvedUserId,
        householdId: householdScopeId,
        currency,
      });
    }

    if (resolvedAccountId !== invalidAccountSentinel) {
      accountResolutionCache.set(cacheKey, resolvedAccountId);
    }

    return resolvedAccountId;
  }

  // Prepare batch inserts
  const preparedRecords: PreparedTransactionRecord[] = [];
  const validationErrors: { index: number; error: string }[] = [];

  let categoryContext = createFallbackCategoryContext();
  try {
    categoryContext = await loadCategoryContext({
      supabase,
      userId,
    });
  } catch (error) {
    console.error(
      "[save-transactions-batch] Failed to load category context:",
      error,
    );
  }

  emitProgress("validating", "Checking transactions...", 0);
  const shouldRecoverManualImportDates = body.manualImportMode === true;

  for (let i = 0; i < body.transactions.length; i++) {
    const tx = body.transactions[i];

    // Basic validation
    const normalizedInput = normalizeBatchTransactionInput({
      type: tx.type,
      amount: tx.amount,
    });
    if (!normalizedInput.ok) {
      validationErrors.push({ index: i, error: normalizedInput.error });
      continue;
    }
    tx.type = normalizedInput.type;
    tx.amount = normalizedInput.amount;

    if (tx.merchant !== undefined && tx.merchant !== null) {
      if (typeof tx.merchant !== "string") {
        validationErrors.push({ index: i, error: "merchant must be a string" });
        continue;
      }
      if (tx.merchant.trim().length > 255) {
        validationErrors.push({
          index: i,
          error: "merchant must be less than 256 characters",
        });
        continue;
      }
    }

    if (!tx.date) {
      validationErrors.push({ index: i, error: "Missing date" });
      continue;
    }

    const normalizedDate = normalizeBatchDateInput({
      value: tx.date,
      manualImportMode: shouldRecoverManualImportDates,
    });
    if (!normalizedDate) {
      validationErrors.push({
        index: i,
        error: "date must be a valid calendar date",
      });
      continue;
    }
    tx.date = normalizedDate;

    if (tx.recurrence_rule) {
      const normalizedAnchorDate = normalizeBatchDateInput({
        value: tx.recurrence_rule.anchor_date,
        manualImportMode: shouldRecoverManualImportDates,
      });
      if (!normalizedAnchorDate) {
        validationErrors.push({
          index: i,
          error: "recurrence_rule.anchor_date must be a valid calendar date",
        });
        continue;
      }

      const normalizedEndDate = tx.recurrence_rule.end_date == null
        ? undefined
        : normalizeBatchDateInput({
          value: tx.recurrence_rule.end_date,
          manualImportMode: shouldRecoverManualImportDates,
        });

      if (tx.recurrence_rule.end_date != null && !normalizedEndDate) {
        validationErrors.push({
          index: i,
          error: "recurrence_rule.end_date must be a valid calendar date",
        });
        continue;
      }

      tx.recurrence_rule = {
        ...tx.recurrence_rule,
        anchor_date: normalizedAnchorDate,
        ...(normalizedEndDate ? { end_date: normalizedEndDate } : {}),
      };
    }

    const currency = validateCurrency(tx.currency || "USD");
    const amountCents = Math.round(tx.amount * 100);
    const rawCategory = String(tx.category ?? "");
    const resolvedCategory = resolveBatchCategoryForStorage({
      rawCategory: tx.category,
      description: tx.description,
      merchant: tx.merchant,
      transactionType: tx.type === "income" ? "income" : "expense",
      ctx: categoryContext,
    });
    const effectiveCategory = resolvedCategory.category;
    if (resolvedCategory.usedFallback && rawCategory.trim().length > 0) {
      void reportEdgeFunctionError({
        functionName: "save-transactions-batch",
        error: new Error("CATEGORY_SANITIZE_FALLBACK"),
        context: {
          index: i,
          transactionType: tx.type || "expense",
          rawCategory,
          finalCategory: effectiveCategory,
        },
      }).catch((error) => {
        console.error(
          "[save-transactions-batch] Failed to report category sanitize fallback:",
          error,
        );
      });
    }

    const txRecord = tx as unknown as Record<string, unknown>;
    const hasCamelAccountId = Object.prototype.hasOwnProperty.call(
      txRecord,
      "accountId",
    );
    const hasSnakeAccountId = Object.prototype.hasOwnProperty.call(
      txRecord,
      "account_id",
    );
    const hasRequestedAccountId = hasCamelAccountId || hasSnakeAccountId;
    const requestedAccountIdRaw = hasCamelAccountId
      ? txRecord.accountId
      : hasSnakeAccountId
      ? txRecord.account_id
      : undefined;
    const requestedAccountId = requestedAccountIdRaw == null ||
        String(requestedAccountIdRaw).trim().length === 0
      ? null
      : sanitizeUuid(String(requestedAccountIdRaw));
    if (
      hasRequestedAccountId &&
      requestedAccountIdRaw != null &&
      String(requestedAccountIdRaw).trim().length > 0 &&
      !requestedAccountId
    ) {
      validationErrors.push({ index: i, error: "Invalid accountId format" });
      continue;
    }
    const resolvedAccountId = await resolveAccountForImportRow(
      requestedAccountId,
      hasRequestedAccountId,
      currency,
      i,
    );
    if (resolvedAccountId === invalidAccountSentinel) {
      validationErrors.push({
        index: i,
        error: "Provided accountId does not belong to this scope",
      });
      continue;
    }

    const accountIdForRecord = resolvedAccountId || null;
    const householdIdForRecord = scopeHouseholdId;
    const idempotencyKey = typeof tx.idempotencyKey === "string"
      ? tx.idempotencyKey.trim() || null
      : typeof tx.clientMutationId === "string"
      ? tx.clientMutationId.trim() || null
      : null;
    const importRequestKey = buildImportRequestKey(body.debugTraceId, i);
    const importSemanticKey = buildImportSemanticKey({
      userId,
      householdId: householdIdForRecord,
      accountId: accountIdForRecord,
      type: tx.type,
      amountCents,
      currency,
      date: tx.date,
      category: effectiveCategory,
      description: tx.description || "",
    });

    const baseRecord = {
      id: crypto.randomUUID(),
      contact_id: contactId,
      user_id: userId,
      account_id: accountIdForRecord,
      amount_cents: amountCents,
      category: effectiveCategory,
      date: tx.date,
      raw_text: tx.description || "",
      merchant: typeof tx.merchant === "string" && tx.merchant.trim().length > 0
        ? tx.merchant.trim()
        : null,
      currency: currency,
      breakdown: tx.breakdown ?? null,
      receipt_image_url: tx.receiptImageUrl || null,
      created_at: tx.clientCreatedAt || new Date().toISOString(),
      household_id: householdIdForRecord,
      is_recurring: tx.isRecurring === true,
      recurrence_rule: tx.isRecurring === true
        ? tx.recurrence_rule || null
        : null,
      idempotency_key: idempotencyKey,
      import_request_key: importRequestKey,
      import_semantic_key: importSemanticKey,
    };

    if (tx.type === "income") {
      preparedRecords.push({
        index: i,
        type: "income",
        record: {
          ...baseRecord,
          type: "income",
          owner_type: tx.ownerType || "me",
          privacy_scope: tx.privacyScope || "full",
          household_id: resolvedHouseholdId ||
            (isPortfolio ? requestedHouseholdId : null),
        },
        customSplits: tx.customSplits,
        payerUserId: tx.payerUserId,
        importRequestKey,
        importSemanticKey,
      });
    } else {
      preparedRecords.push({
        index: i,
        type: "expense",
        record: {
          ...baseRecord,
          type: "expense",
        },
        customSplits: tx.customSplits,
        payerUserId: tx.payerUserId,
        importRequestKey,
        importSemanticKey,
      });
    }

    if (shouldEmitValidationProgress(i, body.transactions.length)) {
      emitProgress("validating", "Checking transactions...", i + 1);
    }
  }

  console.log("[save-transactions-batch] Scope summary:", {
    debugTraceId: body.debugTraceId,
    transactionCount: body.transactions.length,
    requestedHouseholdId,
    resolvedHouseholdId,
    scopeHouseholdId,
    uniqueRequestedAccountIds: [...uniqueRequestedAccountIds],
    cachedAccountResolutions: accountResolutionCache.size,
    validationErrorCount: validationErrors.length,
    validationErrorSummary: validationErrors.reduce<Record<string, number>>(
      (summary, err) => {
        summary[err.error] = (summary[err.error] ?? 0) + 1;
        return summary;
      },
      {},
    ),
  });

  const results: SavedTransaction[] = [];
  let processedCount = validationErrors.length;

  // Add validation errors to results
  for (const err of validationErrors) {
    results.push({
      id: "",
      index: err.index,
      type: body.transactions[err.index]?.type || "expense",
      success: false,
      error: err.error,
    });
  }

  const duplicateRequestKeys = new Map<string, Record<string, unknown>>();
  const duplicateSemanticKeyCounts = new Map<string, number>();
  const requestKeys = preparedRecords
    .map((record) => record.importRequestKey)
    .filter((key): key is string => !!key);
  const semanticKeys = body.skipSemanticDuplicates === true
    ? preparedRecords.map((record) => record.importSemanticKey)
    : [];

  if (requestKeys.length > 0 || semanticKeys.length > 0) {
    const [existingRequestRows, existingSemanticRows] = await Promise.all([
      requestKeys.length > 0
        ? supabase
          .from("expenses")
          .select(
            "id, import_request_key, split_group_id, household_id, amount_cents, currency, raw_text, is_recurring, category",
          )
          .in("import_request_key", requestKeys)
          .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
      semanticKeys.length > 0
        ? supabase
          .from("expenses")
          .select("import_semantic_key")
          .in("import_semantic_key", semanticKeys)
          .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (existingRequestRows.error) {
      console.error(
        "[save-transactions-batch] Failed to load import request keys:",
        existingRequestRows.error,
      );
    } else if (Array.isArray(existingRequestRows.data)) {
      for (const existingRow of existingRequestRows.data) {
        const existingId = typeof existingRow.id === "string"
          ? existingRow.id
          : "";
        const requestKey = typeof existingRow.import_request_key === "string"
          ? existingRow.import_request_key
          : null;
        if (requestKey) {
          duplicateRequestKeys.set(requestKey, {
            ...existingRow,
            id: existingId,
          });
        }
      }
    }

    if (existingSemanticRows.error) {
      console.error(
        "[save-transactions-batch] Failed to load import semantic keys:",
        existingSemanticRows.error,
      );
    } else if (Array.isArray(existingSemanticRows.data)) {
      for (const existingRow of existingSemanticRows.data) {
        const semanticKey = typeof existingRow.import_semantic_key === "string"
          ? existingRow.import_semantic_key
          : null;
        if (semanticKey) {
          duplicateSemanticKeyCounts.set(
            semanticKey,
            (duplicateSemanticKeyCounts.get(semanticKey) || 0) + 1,
          );
        }
      }
    }
  }

  const expenseRecords: any[] = [];
  const expenseMeta: Array<{
    index: number;
    customSplits?: CustomSplits | null;
    payerUserId?: string | null;
  }> = [];
  const incomeRecords: any[] = [];
  const incomeMeta: Array<{
    index: number;
    customSplits?: CustomSplits | null;
    payerUserId?: string | null;
  }> = [];
  const seenSemanticKeyCounts = new Map<string, number>();

  for (const prepared of preparedRecords) {
    const requestKey = prepared.importRequestKey;
    if (requestKey && duplicateRequestKeys.has(requestKey)) {
      const existingRow = duplicateRequestKeys.get(requestKey)!;
      results.push({
        id: typeof existingRow["id"] === "string" ? existingRow["id"] : "",
        index: prepared.index,
        type: prepared.type,
        success: false,
        duplicate: true,
        duplicateKind: "request",
        error:
          "This import chunk was already saved. Skipping duplicate replay.",
      });
      processedCount += 1;
      continue;
    }

    const semanticOccurrence =
      (seenSemanticKeyCounts.get(prepared.importSemanticKey) || 0) + 1;
    seenSemanticKeyCounts.set(prepared.importSemanticKey, semanticOccurrence);
    const existingSemanticCount =
      duplicateSemanticKeyCounts.get(prepared.importSemanticKey) || 0;

    if (
      body.skipSemanticDuplicates === true &&
      semanticOccurrence <= existingSemanticCount
    ) {
      results.push({
        id: "",
        index: prepared.index,
        type: prepared.type,
        success: false,
        duplicate: true,
        duplicateKind: "semantic",
        error:
          "Matching transaction already exists. Skipping duplicate import.",
      });
      processedCount += 1;
      continue;
    }

    if (prepared.type === "income") {
      incomeRecords.push(prepared.record);
      incomeMeta.push({
        index: prepared.index,
        customSplits: prepared.customSplits,
        payerUserId: prepared.payerUserId,
      });
      continue;
    }

    expenseRecords.push(prepared.record);
    expenseMeta.push({
      index: prepared.index,
      customSplits: prepared.customSplits,
      payerUserId: prepared.payerUserId,
    });
  }

  const successfulHouseholdRows: Array<{
    type: "expense" | "income";
    row: any;
  }> = [];

  async function persistPreparedRows(
    type: "expense" | "income",
    records: any[],
    metadata: Array<{
      index: number;
      customSplits?: CustomSplits | null;
      payerUserId?: string | null;
    }>,
  ): Promise<void> {
    if (records.length === 0) return;
    emitProgress(
      type === "income" ? "saving_income" : "saving_expense",
      "Saving transactions...",
      processedCount,
    );

    await runWithConcurrencyLimit(records, 8, async (record, index) => {
      const meta = metadata[index];
      try {
        let writeResult: { data: any; error: any };
        if (
          resolvedHouseholdId &&
          !isPortfolio &&
          householdMembers.length > 0
        ) {
          const effective = resolveEffectiveSplit(
            meta.customSplits,
            householdAutoSplitSettings,
          );
          if (effective.kind === "customSplits") {
            const buildResult = buildHouseholdSplitRecords({
              householdId: resolvedHouseholdId,
              transactionId: record.id,
              payerUserId: sanitizeUuid(meta.payerUserId ?? null) ||
                resolvedUserId,
              amountCents: record.amount_cents,
              currency: record.currency,
              description: record.raw_text || null,
              members: householdMembers,
              customSplits: effective.customSplits,
              reconcileMemberChanges: effective.source === "default",
            });
            if (!buildResult.ok) {
              results.push({
                id: "",
                index: meta.index,
                type,
                success: false,
                error: buildResult.error,
              });
              return;
            }
            writeResult = await createHouseholdTransactionWithSplit({
              supabase,
              actorUserId: resolvedUserId,
              transaction: record,
              group: buildResult.group,
              lines: buildResult.lines,
              targetAccountId: record.account_id ?? null,
              isRecurringTemplate: record.is_recurring === true,
            });
          } else {
            writeResult = await supabase
              .from("expenses")
              .insert(record)
              .select()
              .single();
          }
        } else {
          writeResult = await supabase
            .from("expenses")
            .insert(record)
            .select()
            .single();
        }

        if (writeResult.error) {
          results.push({
            id: "",
            index: meta.index,
            type,
            success: false,
            error: writeResult.error.message ??
              `Failed to save ${type} transaction`,
          });
          return;
        }
        const saved = writeResult.data?.expense ?? writeResult.data;
        results.push({
          id: saved.id,
          index: meta.index,
          type,
          success: true,
          data: saved,
        });
        if (resolvedHouseholdId && !isPortfolio) {
          successfulHouseholdRows.push({ type, row: saved });
        }
      } catch (error) {
        results.push({
          id: "",
          index: meta.index,
          type,
          success: false,
          error: error instanceof Error
            ? error.message
            : `Failed to save ${type} transaction`,
        });
      } finally {
        processedCount += 1;
      }
    });
  }

  await persistPreparedRows("income", incomeRecords, incomeMeta);
  await persistPreparedRows("expense", expenseRecords, expenseMeta);

  // Notifications are derived only from rows whose parent/split transaction
  // completed successfully. A rejected row never produces a user-visible
  // "added" event.
  if (resolvedHouseholdId && successfulHouseholdRows.length > 0) {
    for (const type of ["income", "expense"] as const) {
      const savedRows = successfulHouseholdRows
        .filter((saved) => saved.type === type)
        .map((saved) => saved.row);
      if (savedRows.length === 1) {
        const row = savedRows[0];
        const { error: notifyError } = await supabase.rpc(
          "notify_household_members_expense",
          {
            p_household_id: resolvedHouseholdId,
            p_expense_id: row.id,
            p_actor_user_id: resolvedUserId,
            p_event_type: type === "income" ? "income_added" : "expense_added",
            p_expense_data: {
              actor_name: actorName,
              amount_cents: row.amount_cents,
              currency: row.currency,
              category: row.category,
              source: row.merchant || "",
              note: row.raw_text || "",
              privacy_scope: row.privacy_scope,
              owner_type: row.owner_type,
              is_recurring: row.is_recurring === true,
            },
          },
        );
        if (notifyError) {
          console.error(
            `[save-transactions-batch] Error creating ${type} notification:`,
            notifyError,
          );
        }
      } else if (savedRows.length > 1) {
        const recipients = householdMembers
          .map((member) => member.user_id)
          .filter((memberId) => memberId !== resolvedUserId);
        if (recipients.length > 0) {
          const now = new Date().toISOString();
          const payload = {
            actor_name: actorName,
            actor_user_id: resolvedUserId,
            batch_count: savedRows.length,
            recurring_count: savedRows.filter(
              (row) => row.is_recurring === true,
            ).length,
            household_id: resolvedHouseholdId,
          };
          const { error: notifyError } = await supabase
            .from("notification_events")
            .insert(
              recipients.map((recipientId) => ({
                household_id: resolvedHouseholdId,
                user_id: recipientId,
                event_type: type === "income"
                  ? "income_added"
                  : "expense_added",
                payload,
                created_at: now,
              })),
            );
          if (notifyError) {
            console.error(
              `[save-transactions-batch] Error creating bulk ${type} notification:`,
              notifyError,
            );
          }
        }
      }
    }
  }

  emitProgress("finalizing", "Finishing import...", processedCount);

  // Manual imports can be large. Skip non-critical category post-processing so
  // completion is reported right after the database work is done.
  if (body.manualImportMode !== true) {
    try {
      emitProgress(
        "finalizing_categories",
        "Syncing categories...",
        processedCount,
      );

      const uniqueExpense = [
        ...new Set<string>(
          expenseRecords.map((r: any) => r.category).filter(Boolean),
        ),
      ];
      const uniqueIncome = [
        ...new Set<string>(
          incomeRecords.map((r: any) => r.category).filter(Boolean),
        ),
      ];

      await Promise.all([
        runWithConcurrencyLimit(uniqueExpense, 12, async (categoryName) => {
          await ensureUserCategory({
            supabase,
            userId: resolvedUserId,
            categoryName,
            transactionType: "expense",
          });
        }),
        runWithConcurrencyLimit(uniqueIncome, 12, async (categoryName) => {
          await ensureUserCategory({
            supabase,
            userId: resolvedUserId,
            categoryName,
            transactionType: "income",
          });
        }),
      ]);

      const MAX_PREF_LEARN = 120;
      const learningItems: Array<{
        transactionType: "income" | "expense";
        categoryName: string;
        sourceText?: string | null;
        descriptionText?: string | null;
      }> = [];
      let learned = 0;

      for (const r of incomeRecords) {
        if (learned >= MAX_PREF_LEARN) break;
        const categoryName = typeof r.category === "string" ? r.category : "";
        const sourceText = typeof r.merchant === "string" ? r.merchant : null;
        const descriptionText = typeof r.raw_text === "string"
          ? r.raw_text
          : null;
        learningItems.push({
          transactionType: "income",
          categoryName,
          sourceText,
          descriptionText,
        });
        learned += 1;
      }

      for (const r of expenseRecords) {
        if (learned >= MAX_PREF_LEARN) break;
        const categoryName = typeof r.category === "string" ? r.category : "";
        const descriptionText = typeof r.raw_text === "string"
          ? r.raw_text
          : null;
        learningItems.push({
          transactionType: "expense",
          categoryName,
          descriptionText,
        });
        learned += 1;
      }

      await runWithConcurrencyLimit(learningItems, 20, async (item) => {
        await learnUserCategoryPreference({
          supabase,
          userId: resolvedUserId,
          transactionType: item.transactionType,
          categoryName: item.categoryName,
          sourceText: item.sourceText ?? null,
          descriptionText: item.descriptionText ?? null,
        });
      });
    } catch (e) {
      console.error(
        "[save-transactions-batch] Failed to ensure/learn categories (non-blocking):",
        e,
      );
    }
  }

  // Sort results by original index
  results.sort((a, b) => a.index - b.index);

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter(
    (r) => !r.success && r.duplicate !== true,
  ).length;
  const duplicateCount = results.filter((r) => r.duplicate === true).length;

  console.log(
    `[save-transactions-batch] Complete: ${successCount} succeeded, ${failureCount} failed, ${duplicateCount} duplicates`,
  );

  return {
    success: failureCount === 0,
    data: results.map((r) => r.data).filter(Boolean),
    results,
    summary: {
      total: body.transactions.length,
      succeeded: successCount,
      failed: failureCount,
    },
    shared: !!resolvedHouseholdId,
    resolvedUserId: userId,
  };
}

function createSSEStream(
  req: Request,
  body: RequestBody,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamClosed = false;
      let heartbeatTimer: number | undefined;

      const enqueue = (payload: string) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch (_error) {
          streamClosed = true;
        }
      };

      try {
        heartbeatTimer = setInterval(() => {
          enqueue(": keep-alive\n\n");
        }, STREAM_KEEPALIVE_INTERVAL_MS);

        const result = await saveTransactionsBatchInternal(
          req,
          body,
          (event) => {
            enqueue(formatSSEEvent("progress", event));
          },
        );

        enqueue(formatSSEEvent("complete", result));
        streamClosed = true;
        controller.close();
      } catch (error) {
        const status = error instanceof SaveTransactionsBatchError
          ? error.status
          : 500;
        const code = error instanceof SaveTransactionsBatchError
          ? error.code
          : "SERVER_ERROR";
        const message = error instanceof Error
          ? error.message
          : "Failed to save transactions batch";

        if (!(error instanceof SaveTransactionsBatchError)) {
          await reportEdgeFunctionError({
            functionName: "save-transactions-batch",
            error,
            context: {
              step: "stream_unhandled",
            },
          }).catch((reportError) => {
            console.error(
              "[save-transactions-batch] Failed to report stream error:",
              reportError,
            );
          });
        }

        enqueue(
          formatSSEEvent("error", {
            success: false,
            error: message,
            code,
            status,
          }),
        );
        streamClosed = true;
        controller.close();
      } finally {
        if (heartbeatTimer != null) {
          clearInterval(heartbeatTimer);
        }
      }
    },
  });
}

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    const url = new URL(req.url);
    const isStreamMode = url.searchParams.get("stream") === "true";

    let body: RequestBody;
    try {
      body = await req.json();
    } catch (_error) {
      return errorResponse("Invalid JSON body", 400);
    }

    console.log("[save-transactions-batch] Incoming request:", {
      debugTraceId: body.debugTraceId,
      transactionCount: body.transactions?.length || 0,
      householdId: body.householdId,
      isPortfolio: body.isPortfolio,
      progressOffset: body.progressOffset,
      progressTotal: body.progressTotal,
      stream: isStreamMode,
      splitFields: body.transactions?.map((transaction, index) => ({
        index,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        payerUserId: transaction.payerUserId,
        customSplits: summarizeCustomSplits(transaction.customSplits),
      })),
    });

    if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
      return errorResponse(
        "transactions array is required and must not be empty",
        400,
      );
    }

    const MAX_BATCH_SIZE = 500;
    if (body.transactions.length > MAX_BATCH_SIZE) {
      return errorResponse(
        `Batch size exceeds maximum of ${MAX_BATCH_SIZE} transactions`,
        400,
      );
    }

    if (isStreamMode) {
      const stream = createSSEStream(req, body);
      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    try {
      const result = await saveTransactionsBatchInternal(req, body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof SaveTransactionsBatchError) {
        return errorResponse(error.message, error.status, error.code);
      }

      console.error("[save-transactions-batch] Error:", error);
      await reportEdgeFunctionError({
        functionName: "save-transactions-batch",
        error,
        context: {
          step: "unhandled",
        },
      });
      return errorResponse(
        "Failed to save transactions batch",
        500,
        "SERVER_ERROR",
      );
    }
  });
}
