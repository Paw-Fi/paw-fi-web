// Supabase Edge Function: save-transactions-batch
// Saves multiple transactions (expenses/income) in a single database transaction
// Designed for AI-extracted bulk imports (PDFs, bank statements, etc.)
// Significantly reduces latency by using batch insert instead of N individual calls

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  normalizeCategoryForStorage,
  sanitizeCategoryName,
} from "../shared/category-colors.ts";
import {
  applyCategoryRemap,
  ensureUserCategory,
  fetchUserCategoryRemaps,
  learnUserCategoryPreference,
} from "../shared/user-categories.ts";
import {
  assertAccountInScope,
  resolveDefaultAccountId,
} from "../shared/accounts.ts";
import {
  buildImportRequestKey,
  buildImportSemanticKey,
} from "../shared/import-dedupe.ts";

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

function normalizePercentage(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizeShares(value: unknown): number | undefined {
  if (!isFiniteNumber(value)) return undefined;
  const shares = Math.trunc(value);
  return shares > 0 ? shares : undefined;
}

function normalizeAmount(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  return value < 0 ? 0 : value;
}

function allocateCentsByWeights(
  totalCents: number,
  weights: number[],
): number[] {
  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.trunc(totalCents))
    : 0;
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0);

  if (safeTotal === 0 || totalWeight <= 0 || safeWeights.length === 0) {
    return safeWeights.map(() => 0);
  }

  const floors: number[] = [];
  const fracs: { idx: number; frac: number }[] = [];
  let sumFloors = 0;

  for (let i = 0; i < safeWeights.length; i++) {
    const weight = safeWeights[i];
    if (weight <= 0) {
      floors.push(0);
      continue;
    }
    const raw = safeTotal * (weight / totalWeight);
    const floored = Math.floor(raw);
    const frac = raw - floored;
    floors.push(floored);
    sumFloors += floored;
    fracs.push({ idx: i, frac });
  }

  let remainder = safeTotal - sumFloors;
  if (remainder <= 0) return floors;

  fracs.sort((a, b) => b.frac - a.frac);
  if (fracs.length === 0) return floors;

  let cursor = 0;
  while (remainder > 0) {
    const target = fracs[cursor % fracs.length].idx;
    floors[target] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return floors;
}

interface MemberSplit {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

interface CustomSplits {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplit[];
}

interface TransactionItem {
  type: "expense" | "income";
  amount: number;
  category: string;
  currency: string;
  date: string;
  clientCreatedAt?: string;
  description?: string;
  breakdown?: string[];
  receiptImageUrl?: string;
  customSplits?: CustomSplits;
  payerUserId?: string;
  accountId?: string;
  // Income-specific fields
  source?: string;
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

interface SaveTransactionsBatchSuccess {
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

    const normalizedCurrent =
      currentLocalItem == null
        ? undefined
        : Math.max(
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

async function saveTransactionsBatchInternal(
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

  if (requestedHouseholdId && !isPortfolio) {
    const { data: membership } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", requestedHouseholdId)
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (membership) {
      resolvedHouseholdId = requestedHouseholdId;

      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", requestedHouseholdId);

      if (members && members.length > 0) {
        householdMembers = members;
      }
    }
  }

  const scopeHouseholdId: string | null =
    resolvedHouseholdId ??
    (isPortfolio ? (requestedHouseholdId ?? null) : null);
  const invalidAccountSentinel = "__invalid__";
  const accountResolutionCache = new Map<string, string | null>();
  const uniqueRequestedAccountIds = new Set<string>();

  async function resolveAccountForImportRow(
    requestedAccountId: string | null,
    index: number,
  ): Promise<string | null | typeof invalidAccountSentinel> {
    const householdScopeId = scopeHouseholdId ?? null;

    if (requestedAccountId) {
      uniqueRequestedAccountIds.add(requestedAccountId);
    }

    const cacheKey = `${scopeHouseholdId ?? "personal"}:${
      requestedAccountId ?? "__default__"
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
        },
      );
      if (!accountInScope) {
        if (scopeHouseholdId != null) {
          console.warn(
            "[save-transactions-batch] Ignoring out-of-scope accountId and falling back to default scoped account",
            {
              debugTraceId: body.debugTraceId,
              index,
              requestedAccountId,
              scopeHouseholdId,
            },
          );
          resolvedAccountId = await resolveDefaultAccountId(supabase, {
            userId: resolvedUserId,
            householdId: householdScopeId,
          });
        } else {
          resolvedAccountId = invalidAccountSentinel;
        }
      } else {
        resolvedAccountId = requestedAccountId;
      }
    } else {
      resolvedAccountId = await resolveDefaultAccountId(supabase, {
        userId: resolvedUserId,
        householdId: householdScopeId,
      });
    }

    if (resolvedAccountId !== invalidAccountSentinel) {
      accountResolutionCache.set(cacheKey, resolvedAccountId);
    }

    return resolvedAccountId;
  }

  async function ensureExpenseSplitForReplay(
    expense: Record<string, unknown>,
    meta: { customSplits?: CustomSplits | null; payerUserId?: string | null },
  ): Promise<Record<string, unknown>> {
    if (resolvedHouseholdId == null || householdMembers.length == 0) {
      return expense;
    }
    if (expense["split_group_id"] != null) {
      return expense;
    }

    const amountCents = Number(expense["amount_cents"] ?? 0);
    const rawSplitType =
      typeof meta.customSplits?.splitType === "string"
        ? meta.customSplits.splitType.trim().toLowerCase()
        : "equal";
    const normalizedSplitType = [
      "equal",
      "amount",
      "percentage",
      "shares",
    ].includes(rawSplitType)
      ? rawSplitType
      : "equal";
    const hasMemberSplits =
      Array.isArray(meta.customSplits?.memberSplits) &&
      meta.customSplits!.memberSplits.length > 0;
    const customSplits =
      hasMemberSplits && normalizedSplitType !== "equal"
        ? meta.customSplits
        : null;
    const splitType = customSplits ? normalizedSplitType : "equal";

    let payerUserId = sanitizeUuid(meta.payerUserId ?? null) || resolvedUserId;
    const isValidPayer = householdMembers.some(
      (member) => member.user_id === payerUserId,
    );
    if (!isValidPayer) payerUserId = resolvedUserId;

    const expenseId = typeof expense["id"] === "string" ? expense["id"] : "";
    if (expenseId.length === 0) {
      return expense;
    }

    const splitGroupId = crypto.randomUUID();
    const splitGroup = {
      id: splitGroupId,
      household_id: resolvedHouseholdId,
      expense_id: expenseId,
      payer_user_id: payerUserId,
      split_type: splitType,
      currency:
        typeof expense["currency"] === "string" ? expense["currency"] : null,
      total_amount_cents: amountCents,
      description:
        typeof expense["raw_text"] === "string" ? expense["raw_text"] : null,
      created_at: new Date().toISOString(),
    };

    let lines: Array<{
      user_id: string;
      amount_cents: number;
      percentage?: number;
      shares?: number;
    }>;

    if (splitType === "equal") {
      const amountPerMember = Math.floor(amountCents / householdMembers.length);
      const remainder = amountCents - amountPerMember * householdMembers.length;
      lines = householdMembers.map((member, idx) => ({
        user_id: member.user_id,
        amount_cents: amountPerMember + (idx == 0 ? remainder : 0),
      }));
    } else if (splitType === "amount" && customSplits) {
      const memberSplits = customSplits.memberSplits as MemberSplit[];
      const cents = memberSplits.map((split) =>
        Math.max(0, Math.round((normalizeAmount(split.amount) || 0) * 100)),
      );
      const sumCents = cents.reduce((sum, value) => sum + value, 0);
      const diff = amountCents - sumCents;
      if (diff !== 0 && cents.length > 0) {
        cents[cents.length - 1] = Math.max(0, cents[cents.length - 1] + diff);
      }
      lines = memberSplits.map((split, idx) => ({
        user_id: split.userId,
        amount_cents: cents[idx] ?? 0,
      }));
    } else if (splitType === "percentage" && customSplits) {
      const memberSplits = customSplits.memberSplits as MemberSplit[];
      const weights = memberSplits.map(
        (split) => normalizePercentage(split.percentage) || 0,
      );
      const allocatedCents = allocateCentsByWeights(amountCents, weights);
      lines = memberSplits.map((split, idx) => ({
        user_id: split.userId,
        amount_cents: allocatedCents[idx] ?? 0,
        percentage: normalizePercentage(split.percentage),
      }));
    } else if (splitType === "shares" && customSplits) {
      const memberSplits = customSplits.memberSplits as MemberSplit[];
      const weights = memberSplits.map(
        (split) => normalizeShares(split.shares) || 0,
      );
      const allocatedCents = allocateCentsByWeights(amountCents, weights);
      lines = memberSplits.map((split, idx) => ({
        user_id: split.userId,
        amount_cents: allocatedCents[idx] ?? 0,
        shares: normalizeShares(split.shares),
      }));
    } else {
      const amountPerMember = Math.floor(amountCents / householdMembers.length);
      const remainder = amountCents - amountPerMember * householdMembers.length;
      lines = householdMembers.map((member, idx) => ({
        user_id: member.user_id,
        amount_cents: amountPerMember + (idx == 0 ? remainder : 0),
      }));
    }

    const { error: splitGroupError } = await supabase
      .from("expense_split_groups")
      .insert([splitGroup]);
    if (splitGroupError) {
      throw splitGroupError;
    }

    const splitLines = lines.map((line) => ({
      split_group_id: splitGroupId,
      user_id: line.user_id,
      amount_cents: line.amount_cents,
      percentage: line.percentage ?? null,
      shares: line.shares ?? null,
      is_settled: false,
      settled_at: null,
      created_at: new Date().toISOString(),
    }));

    if (splitLines.length > 0) {
      const { error: splitLinesError } = await supabase
        .from("expense_split_lines")
        .insert(splitLines);
      if (splitLinesError) {
        throw splitLinesError;
      }
    }

    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        split_group_id: splitGroupId,
        household_id: resolvedHouseholdId,
      })
      .eq("id", expenseId);
    if (updateError) {
      throw updateError;
    }

    return {
      ...expense,
      split_group_id: splitGroupId,
      household_id: resolvedHouseholdId,
    };
  }

  // Prepare batch inserts
  const preparedRecords: PreparedTransactionRecord[] = [];
  const validationErrors: { index: number; error: string }[] = [];

  let categoryRemaps: Awaited<ReturnType<typeof fetchUserCategoryRemaps>> = [];
  try {
    categoryRemaps = await fetchUserCategoryRemaps({
      supabase,
      userId,
      limit: 120,
    });
  } catch (error) {
    console.error(
      "[save-transactions-batch] Failed to load category remaps:",
      error,
    );
  }

  emitProgress("validating", "Checking transactions...", 0);

  for (let i = 0; i < body.transactions.length; i++) {
    const tx = body.transactions[i];

    // Basic validation
    if (!tx.type || !["expense", "income"].includes(tx.type)) {
      validationErrors.push({ index: i, error: "Invalid or missing type" });
      continue;
    }

    if (!tx.amount || tx.amount <= 0) {
      validationErrors.push({ index: i, error: "Invalid amount" });
      continue;
    }

    if (!tx.category) {
      validationErrors.push({ index: i, error: "Missing category" });
      continue;
    }

    if (!tx.date) {
      validationErrors.push({ index: i, error: "Missing date" });
      continue;
    }

    const normalizedDate = normalizeCalendarDateString(tx.date);
    if (!normalizedDate) {
      validationErrors.push({
        index: i,
        error: "date must be a valid calendar date",
      });
      continue;
    }
    tx.date = normalizedDate;

    if (tx.recurrence_rule) {
      const normalizedAnchorDate = normalizeCalendarDateString(
        tx.recurrence_rule.anchor_date,
      );
      if (!normalizedAnchorDate) {
        validationErrors.push({
          index: i,
          error: "recurrence_rule.anchor_date must be a valid calendar date",
        });
        continue;
      }

      const normalizedEndDate =
        tx.recurrence_rule.end_date == null
          ? undefined
          : normalizeCalendarDateString(tx.recurrence_rule.end_date);

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
    const sanitizedCategory = sanitizeCategoryName(rawCategory);
    if (!authResult.isInternalService && !sanitizedCategory) {
      validationErrors.push({
        index: i,
        error: "Invalid category",
      });
      continue;
    }
    const resolvedCategory =
      sanitizedCategory ?? normalizeCategoryForStorage(tx.category);
    const effectiveCategory = applyCategoryRemap({
      categoryName: resolvedCategory,
      transactionType: tx.type === "income" ? "income" : "expense",
      remaps: categoryRemaps,
    });
    if (!sanitizedCategory && rawCategory.trim().length > 0) {
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

    const requestedAccountId = sanitizeUuid(tx.accountId ?? null);
    const resolvedAccountId = await resolveAccountForImportRow(
      requestedAccountId,
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
      contact_id: contactId,
      user_id: userId,
      account_id: accountIdForRecord,
      amount_cents: amountCents,
      category: effectiveCategory,
      date: tx.date,
      raw_text: tx.description || "",
      currency: currency,
      breakdown: tx.breakdown ?? null,
      receipt_image_url: tx.receiptImageUrl || null,
      created_at: tx.clientCreatedAt || new Date().toISOString(),
      household_id: householdIdForRecord,
      is_recurring: tx.isRecurring === true,
      recurrence_rule:
        tx.isRecurring === true ? tx.recurrence_rule || null : null,
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
          source: tx.source || null,
          owner_type: tx.ownerType || "me",
          privacy_scope: tx.privacyScope || "full",
          household_id:
            resolvedHouseholdId || (isPortfolio ? requestedHouseholdId : null),
        },
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
  const duplicateSemanticKeys = new Set<string>();
  const requestKeys = preparedRecords
    .map((record) => record.importRequestKey)
    .filter((key): key is string => !!key);
  const semanticKeys =
    body.skipSemanticDuplicates === true
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
        : Promise.resolve({ data: [], error: null }),
      semanticKeys.length > 0
        ? supabase
            .from("expenses")
            .select("import_semantic_key")
            .in("import_semantic_key", semanticKeys)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (existingRequestRows.error) {
      console.error(
        "[save-transactions-batch] Failed to load import request keys:",
        existingRequestRows.error,
      );
    } else if (Array.isArray(existingRequestRows.data)) {
      for (const existingRow of existingRequestRows.data) {
        const existingId =
          typeof existingRow.id === "string" ? existingRow.id : "";
        const requestKey =
          typeof existingRow.import_request_key === "string"
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
        const semanticKey =
          typeof existingRow.import_semantic_key === "string"
            ? existingRow.import_semantic_key
            : null;
        if (semanticKey) {
          duplicateSemanticKeys.add(semanticKey);
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
  const incomeIndices: number[] = [];
  const seenSemanticKeys = new Set<string>();

  for (const prepared of preparedRecords) {
    const requestKey = prepared.importRequestKey;
    if (requestKey && duplicateRequestKeys.has(requestKey)) {
      let existingRow = duplicateRequestKeys.get(requestKey)!;
      if (prepared.type === "expense") {
        existingRow = await ensureExpenseSplitForReplay(existingRow, {
          customSplits: prepared.customSplits,
          payerUserId: prepared.payerUserId,
        });
      }
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

    if (
      body.skipSemanticDuplicates === true &&
      (duplicateSemanticKeys.has(prepared.importSemanticKey) ||
        seenSemanticKeys.has(prepared.importSemanticKey))
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

    seenSemanticKeys.add(prepared.importSemanticKey);

    if (prepared.type === "income") {
      incomeRecords.push(prepared.record);
      incomeIndices.push(prepared.index);
      continue;
    }

    expenseRecords.push(prepared.record);
    expenseMeta.push({
      index: prepared.index,
      customSplits: prepared.customSplits,
      payerUserId: prepared.payerUserId,
    });
  }

  // Batch insert income (simple - no splits)
  if (incomeRecords.length > 0) {
    emitProgress("saving_income", "Saving transactions...", processedCount);
    console.log(
      `[save-transactions-batch] Inserting ${incomeRecords.length} income records`,
    );

    const { data: insertedIncome, error: incomeError } = await supabase
      .from("expenses")
      .insert(incomeRecords)
      .select();

    if (incomeError) {
      console.error(
        "[save-transactions-batch] Income batch insert error:",
        incomeError,
      );
      for (let i = 0; i < incomeRecords.length; i++) {
        results.push({
          id: "",
          index: incomeIndices[i],
          type: "income",
          success: false,
          error: incomeError.message,
        });
      }
    } else if (insertedIncome) {
      for (let i = 0; i < insertedIncome.length; i++) {
        results.push({
          id: insertedIncome[i].id,
          index: incomeIndices[i],
          type: "income",
          success: true,
          data: insertedIncome[i],
        });
      }

      if (resolvedHouseholdId && !isPortfolio) {
        if (insertedIncome.length === 1) {
          const income = insertedIncome[0];
          const { error: notifyError } = await supabase.rpc(
            "notify_household_members_expense",
            {
              p_household_id: resolvedHouseholdId,
              p_expense_id: income.id,
              p_actor_user_id: userId,
              p_event_type: "income_added",
              p_expense_data: {
                actor_name: actorName,
                amount_cents: income.amount_cents,
                currency: income.currency,
                category: income.category,
                source: income.source || "",
                note: income.raw_text || "",
                privacy_scope: income.privacy_scope,
                owner_type: income.owner_type,
                is_recurring: income.is_recurring === true,
              },
            },
          );

          if (notifyError) {
            console.error(
              "[save-transactions-batch] Error creating income notifications:",
              notifyError,
            );
          }
        } else if (insertedIncome.length > 1) {
          const recipients = householdMembers
            .map((member) => member.user_id)
            .filter((memberId) => memberId !== userId);
          if (recipients.length > 0) {
            const now = new Date().toISOString();
            const payload = {
              actor_name: actorName,
              actor_user_id: userId,
              batch_count: insertedIncome.length,
              recurring_count: insertedIncome.filter(
                (income) => income.is_recurring === true,
              ).length,
              household_id: resolvedHouseholdId,
            };
            const notifications = recipients.map((recipientId) => ({
              household_id: resolvedHouseholdId,
              user_id: recipientId,
              event_type: "income_added",
              payload,
              created_at: now,
            }));

            const { error: notifyError } = await supabase
              .from("notification_events")
              .insert(notifications);

            if (notifyError) {
              console.error(
                "[save-transactions-batch] Error creating bulk income notifications:",
                notifyError,
              );
            }
          }
        }
      }
    }

    processedCount += incomeRecords.length;
    emitProgress("saving_income", "Saving transactions...", processedCount);
  }

  // Batch insert expenses (more complex due to potential splits)
  if (expenseRecords.length > 0) {
    let insertedExpenses: any[] = [];

    if (expenseRecords.length > 0) {
      emitProgress("saving_expense", "Saving transactions...", processedCount);
      console.log(
        `[save-transactions-batch] Inserting ${expenseRecords.length} expense records`,
      );

      const { data: insertedExpenseRows, error: expenseError } = await supabase
        .from("expenses")
        .insert(expenseRecords)
        .select();

      if (expenseError) {
        console.error(
          "[save-transactions-batch] Expense batch insert error:",
          expenseError,
        );
        for (let i = 0; i < expenseRecords.length; i++) {
          results.push({
            id: "",
            index: expenseMeta[i].index,
            type: "expense",
            success: false,
            error: expenseError.message,
          });
        }
        processedCount += expenseRecords.length;
        emitProgress(
          "saving_expense",
          "Saving transactions...",
          processedCount,
        );
      } else if (insertedExpenseRows) {
        insertedExpenses = insertedExpenseRows;
        processedCount += insertedExpenses.length;
        emitProgress(
          "saving_expense",
          "Saving transactions...",
          processedCount,
        );

        const expenseUpdates: {
          id: string;
          split_group_id: string;
          household_id: string;
        }[] = [];

        const expensesNeedingSplitRepair = insertedExpenses.map(
          (expense, index) => ({
            expense,
            meta: expenseMeta[index],
          }),
        );

        // Handle household splits if applicable
        if (
          resolvedHouseholdId &&
          householdMembers.length > 0 &&
          expensesNeedingSplitRepair.length > 0
        ) {
          emitProgress(
            "creating_splits",
            "Creating household splits...",
            processedCount,
          );
          console.log(
            `[save-transactions-batch] Creating splits for ${expensesNeedingSplitRepair.length} expenses`,
          );

          const splitGroups: any[] = [];
          const splitLines: any[] = [];

          for (let i = 0; i < expensesNeedingSplitRepair.length; i++) {
            const expense = expensesNeedingSplitRepair[i].expense;
            const meta = expensesNeedingSplitRepair[i].meta;
            if (expense.split_group_id != null) {
              continue;
            }
            const amountCents = expense.amount_cents;

            const rawSplitType =
              typeof meta.customSplits?.splitType === "string"
                ? meta.customSplits.splitType.trim().toLowerCase()
                : "equal";
            const normalizedSplitType = [
              "equal",
              "amount",
              "percentage",
              "shares",
            ].includes(rawSplitType)
              ? rawSplitType
              : "equal";
            const hasMemberSplits =
              Array.isArray(meta.customSplits?.memberSplits) &&
              meta.customSplits!.memberSplits.length > 0;
            const customSplits =
              hasMemberSplits && normalizedSplitType !== "equal"
                ? meta.customSplits
                : null;
            const splitType = customSplits ? normalizedSplitType : "equal";

            let payerUserId = sanitizeUuid(meta.payerUserId ?? null) || userId;
            const isValidPayer = householdMembers.some(
              (member) => member.user_id === payerUserId,
            );
            if (!isValidPayer) payerUserId = userId;

            const splitGroupId = crypto.randomUUID();
            splitGroups.push({
              id: splitGroupId,
              household_id: resolvedHouseholdId,
              expense_id: expense.id,
              payer_user_id: payerUserId,
              split_type: splitType,
              currency: expense.currency,
              total_amount_cents: amountCents,
              description: expense.raw_text || null,
              created_at: new Date().toISOString(),
            });

            expenseUpdates.push({
              id: expense.id,
              split_group_id: splitGroupId,
              household_id: resolvedHouseholdId,
            });

            let lines: {
              user_id: string;
              amount_cents: number;
              percentage?: number;
              shares?: number;
            }[];

            if (splitType === "equal") {
              const amountPerMember = Math.floor(
                amountCents / householdMembers.length,
              );
              const remainder =
                amountCents - amountPerMember * householdMembers.length;
              lines = householdMembers.map((member, idx) => ({
                user_id: member.user_id,
                amount_cents: amountPerMember + (idx === 0 ? remainder : 0),
              }));
            } else if (splitType === "amount" && customSplits) {
              const memberSplits = customSplits.memberSplits as MemberSplit[];
              const cents = memberSplits.map((split) =>
                Math.max(
                  0,
                  Math.round((normalizeAmount(split.amount) || 0) * 100),
                ),
              );
              const sumCents = cents.reduce(
                (sum: number, value: number) => sum + value,
                0,
              );
              const diff = amountCents - sumCents;
              if (diff !== 0 && cents.length > 0) {
                cents[cents.length - 1] = Math.max(
                  0,
                  cents[cents.length - 1] + diff,
                );
              }
              lines = memberSplits.map((split, idx) => ({
                user_id: split.userId,
                amount_cents: cents[idx] ?? 0,
              }));
            } else if (splitType === "percentage" && customSplits) {
              const memberSplits = customSplits.memberSplits as MemberSplit[];
              const weights = memberSplits.map(
                (split) => normalizePercentage(split.percentage) || 0,
              );
              const allocatedCents = allocateCentsByWeights(
                amountCents,
                weights,
              );
              lines = memberSplits.map((split, idx) => ({
                user_id: split.userId,
                amount_cents: allocatedCents[idx] ?? 0,
                percentage: normalizePercentage(split.percentage),
              }));
            } else if (splitType === "shares" && customSplits) {
              const memberSplits = customSplits.memberSplits as MemberSplit[];
              const weights = memberSplits.map(
                (split) => normalizeShares(split.shares) || 0,
              );
              const allocatedCents = allocateCentsByWeights(
                amountCents,
                weights,
              );
              lines = memberSplits.map((split, idx) => ({
                user_id: split.userId,
                amount_cents: allocatedCents[idx] ?? 0,
                shares: normalizeShares(split.shares),
              }));
            } else {
              const amountPerMember = Math.floor(
                amountCents / householdMembers.length,
              );
              const remainder =
                amountCents - amountPerMember * householdMembers.length;
              lines = householdMembers.map((member, idx) => ({
                user_id: member.user_id,
                amount_cents: amountPerMember + (idx === 0 ? remainder : 0),
              }));
            }

            for (const line of lines) {
              splitLines.push({
                split_group_id: splitGroupId,
                user_id: line.user_id,
                amount_cents: line.amount_cents,
                percentage: (line as any).percentage ?? null,
                shares: (line as any).shares ?? null,
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              });
            }
          }

          if (splitGroups.length > 0) {
            const { error: splitGroupError } = await supabase
              .from("expense_split_groups")
              .insert(splitGroups);

            if (splitGroupError) {
              console.error(
                "[save-transactions-batch] Split groups insert error:",
                splitGroupError,
              );
            } else {
              if (splitLines.length > 0) {
                const { error: splitLinesError } = await supabase
                  .from("expense_split_lines")
                  .insert(splitLines);

                if (splitLinesError) {
                  console.error(
                    "[save-transactions-batch] Split lines insert error:",
                    splitLinesError,
                  );
                }
              }

              await runWithConcurrencyLimit(
                expenseUpdates,
                25,
                async (update) => {
                  await supabase
                    .from("expenses")
                    .update({
                      split_group_id: update.split_group_id,
                      household_id: update.household_id,
                    })
                    .eq("id", update.id);
                },
              );
            }
          }
        }

        const expenseUpdatesById = new Map(
          expenseUpdates.map((update) => [update.id, update]),
        );
        const enrichedExpenses = insertedExpenses.map((expense) => {
          const update = expenseUpdatesById.get(expense.id);
          if (!update) return expense;
          return {
            ...expense,
            split_group_id: update.split_group_id,
            household_id: update.household_id,
          };
        });

        for (let i = 0; i < enrichedExpenses.length; i++) {
          const expense = enrichedExpenses[i];
          results.push({
            id: expense.id,
            index: expenseMeta[i].index,
            type: "expense",
            success: true,
            data: expense,
          });
        }

        if (resolvedHouseholdId && !isPortfolio) {
          if (enrichedExpenses.length === 1) {
            const expense = enrichedExpenses[0];
            const { error: notifyError } = await supabase.rpc(
              "notify_household_members_expense",
              {
                p_household_id: resolvedHouseholdId,
                p_expense_id: expense.id,
                p_actor_user_id: userId,
                p_event_type: "expense_added",
                p_expense_data: {
                  actor_name: actorName,
                  amount_cents: expense.amount_cents,
                  currency: expense.currency,
                  category: expense.category,
                  note: expense.raw_text || "",
                  is_recurring: expense.is_recurring === true,
                },
              },
            );

            if (notifyError) {
              console.error(
                "[save-transactions-batch] Error creating expense notifications:",
                notifyError,
              );
            }
          } else if (enrichedExpenses.length > 1) {
            const recipients = householdMembers
              .map((member) => member.user_id)
              .filter((memberId) => memberId !== userId);
            if (recipients.length > 0) {
              const now = new Date().toISOString();
              const payload = {
                actor_name: actorName,
                actor_user_id: userId,
                batch_count: enrichedExpenses.length,
                recurring_count: enrichedExpenses.filter(
                  (expense) => expense.is_recurring === true,
                ).length,
                household_id: resolvedHouseholdId,
              };
              const notifications = recipients.map((recipientId) => ({
                household_id: resolvedHouseholdId,
                user_id: recipientId,
                event_type: "expense_added",
                payload,
                created_at: now,
              }));

              const { error: notifyError } = await supabase
                .from("notification_events")
                .insert(notifications);

              if (notifyError) {
                console.error(
                  "[save-transactions-batch] Error creating bulk expense notifications:",
                  notifyError,
                );
              }
            }
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
        const sourceText = typeof r.source === "string" ? r.source : null;
        const descriptionText =
          typeof r.raw_text === "string" ? r.raw_text : null;
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
        const descriptionText =
          typeof r.raw_text === "string" ? r.raw_text : null;
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
        const status =
          error instanceof SaveTransactionsBatchError ? error.status : 500;
        const code =
          error instanceof SaveTransactionsBatchError
            ? error.code
            : "SERVER_ERROR";
        const message =
          error instanceof Error
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
