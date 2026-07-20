// Supabase Edge Function: update-expense
// Updates individual fields of an expense transaction with validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { computeBankExpenseUserOverrides } from "../shared/bank-expense-projection.ts";
import { classifyUserCategoryOverride } from "../shared/plaid-transaction-classification.ts";
import {
  getAllCategories,
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
  buildHouseholdSplitRecords,
  buildPreservedHistoricalSplitRecords,
  commitHouseholdSplitRecordsWithPatch,
  expectedSplitParentFromTransaction,
  fetchHouseholdAutoSplitSettings,
  parseExplicitReSplitRequested,
  removeHouseholdSplitWithPatch,
  resolveEffectiveSplit,
  resolveExistingSplitMutationDecision,
  resolveExistingSplitWriteIntent,
  shouldApplyExistingReSplit,
  type SplitGroupRecord,
  type SplitLineRecord,
  type StoredSplitLineRecord,
  validateExistingSplitPayerIntent,
} from "../shared/household-auto-split.ts";
import {
  normalizeIsoTimestampWithZone,
  normalizeReceiptImageUrl,
} from "../shared/transaction-request-validation.ts";

interface MemberSplitPayload {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

interface CustomSplitsPayload {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplitPayload[];
}

interface UpdateExpenseRequest {
  expenseId: string;
  updates: {
    amount_cents?: number;
    category?: string;
    raw_text?: string;
    merchant?: string | null;
    date?: string;
    created_at?: string;
    currency?: string;
    receipt_image_url?: string | null;
    is_recurring?: boolean;
    recurrence_rule?: {
      frequency: string;
      anchor_date: string;
      end_date?: string;
      interval?: number;
      reminder?: {
        enabled: boolean;
        value: number;
        unit: string;
      };
    };
    source?: string;
    split_group_id?: string;
    household_id?: string | null;
    householdId?: string | null;
    account_id?: string | null;
    accountId?: string | null;
    payer_user_id?: string;
    payerUserId?: string;
  };
  householdId?: string;
  customSplits?: CustomSplitsPayload;
  payerUserId?: string;
  splitUpdate?: CustomSplitsPayload;
  reSplitRequested?: boolean;
  resplitRequested?: boolean;
  resplit_requested?: boolean;
  // Optional client timezone context for date validation (preferred over server UTC).
  // Offset uses the Dart/JS convention: minutes east of UTC (e.g., UTC+08:00 => 480).
  clientTimezoneOffsetMinutes?: number;
  // Optional IANA timezone (e.g., "Asia/Singapore"). Used if offset is not provided.
  clientTimezone?: string;
  clientRecordId?: string;
  clientMutationId?: string;
  idempotencyKey?: string;

  // Optional user-confirmed category remap preference (mapping-only mode supported)
  categoryRemap?: {
    fromCategory: string;
    toCategory: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "SERVER_ERROR";
}

interface SuccessResponse {
  success: true;
  data: any;
  resolvedUserId?: string;
  meta?: Record<string, unknown>;
}

type ApiResponse = ErrorResponse | SuccessResponse;

function jsonResponse(body: ApiResponse, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  message: string,
  code: ErrorResponse["code"],
  status: number = 400,
): Response {
  return jsonResponse({ success: false, error: message, code }, status);
}

// Allowed categories (must match frontend categories)
// Using getAllCategories() for consistency with other functions
const ALLOWED_CATEGORIES = getAllCategories();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

const MAX_UTC_OFFSET_MINUTES = 14 * 60;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseUtcOffsetMinutes(timezone: string): number | null {
  const trimmed = timezone.trim();
  const match = /^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(trimmed);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = match[3] != null ? Number(match[3]) : 0;

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 14) return null;
  if (minutes < 0 || minutes > 59) return null;

  const offset = sign * (hours * 60 + minutes);
  if (Math.abs(offset) > MAX_UTC_OFFSET_MINUTES) return null;
  return offset;
}

function getTodayYyyyMmDdInOffset(
  offsetMinutes: number,
  now: Date = new Date(),
): string {
  const safeOffset = Math.max(
    -MAX_UTC_OFFSET_MINUTES,
    Math.min(MAX_UTC_OFFSET_MINUTES, Math.trunc(offsetMinutes)),
  );
  const shifted = new Date(now.getTime() + safeOffset * 60_000);
  const year = shifted.getUTCFullYear();
  const month = pad2(shifted.getUTCMonth() + 1);
  const day = pad2(shifted.getUTCDate());
  return `${year}-${month}-${day}`;
}

function getTodayYyyyMmDdInIanaTimezone(
  timeZone: string,
  now: Date = new Date(),
): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    if (!year || !month || !day) return null;
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn(
      "[update-expense] Failed to resolve today for timeZone:",
      timeZone,
      error,
    );
    return null;
  }
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

function buildProviderFieldsFromExpenseRow(
  expense: Record<string, unknown>,
): Record<string, unknown> {
  return {
    amount_cents: expense.amount_cents ?? null,
    currency: expense.currency ?? null,
    date: expense.date ?? null,
    type: expense.type ?? null,
    category: expense.category ?? null,
    raw_text: expense.raw_text ?? null,
    merchant: expense.merchant ?? null,
    source: expense.source ?? null,
    is_recurring: expense.is_recurring ?? false,
    recurrence_rule: expense.recurrence_rule ?? null,
    account_id: expense.account_id ?? null,
    household_id: expense.household_id ?? null,
    bank_account_id: expense.bank_account_id ?? null,
    contact_id: expense.contact_id ?? null,
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(
      "Method not allowed. Use POST.",
      "VALIDATION_ERROR",
      405,
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server configuration error", "SERVER_ERROR", 500);
  }

  try {
    // Parse request body
    const body: UpdateExpenseRequest & {
      expense_id?: string;
      user_id?: string;
    } = await req.json();
    const expenseId = body.expenseId ?? body.expense_id;
    const updates = (body as any).updates ?? {};
    const clientRecordId = body.clientRecordId?.trim() || null;
    const clientMutationId =
      body.clientMutationId?.trim() || body.idempotencyKey?.trim() || null;

    const categoryRemapRaw =
      (body as any).categoryRemap ?? (body as any).category_remap;
    const hasCategoryRemap = categoryRemapRaw != null;

    const detection = detectGptRequest(req);
    const conversationId = detection.conversationId ?? null;

    let userId: string | null = null;

    let resolvedIdentityMeta: Record<string, unknown> | undefined;

    if (!userId && detection.isGpt) {
      if (!conversationId) {
        return errorResponse(
          "conversationId is required for GPT requests",
          "VALIDATION_ERROR",
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: { headers: { "X-Client-Info": "moneko-update-expense" } },
      });

      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId,
        });

        userId = guestIdentity.userId;
        resolvedIdentityMeta = {
          conversationId,
          guest: {
            contactId: guestIdentity.contactId,
            createdUser: guestIdentity.createdUser,
            createdContact: guestIdentity.createdContact,
          },
        };
        if (detection.ephemeralUserId) {
          resolvedIdentityMeta.ephemeralUserId = detection.ephemeralUserId;
        }

        console.log("[update-expense] Resolved GPT guest identity", {
          conversationId,
          userId,
          contactId: guestIdentity.contactId,
        });
      } catch (guestError) {
        console.error(
          "[update-expense] Failed to resolve GPT guest identity:",
          guestError,
        );
        return errorResponse(
          "Failed to prepare GPT guest user",
          "SERVER_ERROR",
          500,
        );
      }
    }

    if (!detection.isGpt) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: { headers: { "X-Client-Info": "moneko-update-expense" } },
      });

      const authResult = await authenticateUserOrInternalSecret(req, supabase);
      if (!authResult.success) {
        return errorResponse(
          authResult.error ?? "Authentication required",
          "UNAUTHORIZED",
          authResult.statusCode ?? 401,
        );
      }

      const requestedUserIdRaw = (body as any).userId ?? (body as any).user_id;
      const requestedUserId = requestedUserIdRaw
        ? sanitizeUuid(String(requestedUserIdRaw))
        : null;

      userId = authResult.isInternalService
        ? requestedUserId
        : (authResult.userId ?? null);

      if (
        authResult.isInternalService &&
        requestedUserIdRaw &&
        !requestedUserId
      ) {
        return errorResponse("Invalid userId format", "VALIDATION_ERROR");
      }

      if (!userId) {
        return errorResponse(
          "userId is required for internal calls (or provide a valid JWT)",
          "VALIDATION_ERROR",
        );
      }
    }

    if (!userId) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    // Validate required fields
    if (
      !expenseId ||
      typeof expenseId !== "string" ||
      expenseId.trim().length === 0
    ) {
      return errorResponse(
        "expenseId is required and must be a non-empty string",
        "VALIDATION_ERROR",
      );
    }

    const normalizedExpenseId = sanitizeUuid(expenseId);
    if (!normalizedExpenseId) {
      return errorResponse("Invalid expenseId format", "VALIDATION_ERROR");
    }

    if (
      (!updates || typeof updates !== "object" || Array.isArray(updates)) &&
      !hasCategoryRemap
    ) {
      return errorResponse(
        "updates object is required and must be an object",
        "VALIDATION_ERROR",
      );
    }

    const rawCustomSplits = (body as any).customSplits as
      | CustomSplitsPayload
      | undefined;
    const rawSplitUpdate = (body as any).splitUpdate as
      | CustomSplitsPayload
      | undefined;
    const parsedReSplitRequest = parseExplicitReSplitRequested(
      body as unknown as Record<string, unknown>,
    );
    if (!parsedReSplitRequest.ok) {
      return errorResponse(parsedReSplitRequest.error, "VALIDATION_ERROR");
    }
    const existingSplitWriteIntent = resolveExistingSplitWriteIntent({
      explicitReSplitRequested: parsedReSplitRequest.value,
      splitUpdate: rawSplitUpdate,
    });
    const hasSplitPayload =
      !!rawCustomSplits?.memberSplits?.length ||
      !!rawSplitUpdate?.memberSplits?.length;

    if (
      Object.keys(updates).length === 0 &&
      !hasSplitPayload &&
      !hasCategoryRemap
    ) {
      return errorResponse(
        "updates object is required and must contain at least one field",
        "VALIDATION_ERROR",
      );
    }

    const allowedUpdateKeys = new Set([
      "amount_cents",
      "category",
      "raw_text",
      "merchant",
      "date",
      "created_at",
      "currency",
      "receipt_image_url",
      "payer_user_id",
      "payerUserId",
      "is_recurring",
      "recurrence_rule",
      "source",
      "household_id",
      "householdId",
      "account_id",
      "accountId",
    ]);
    for (const key of Object.keys(updates)) {
      if (!allowedUpdateKeys.has(key)) {
        return errorResponse(
          `Unsupported update field: ${key}`,
          "VALIDATION_ERROR",
        );
      }
    }

    // Validate individual fields if provided
    if (updates.amount_cents !== undefined) {
      if (
        typeof updates.amount_cents !== "number" ||
        !Number.isInteger(updates.amount_cents)
      ) {
        return errorResponse(
          "amount_cents must be an integer",
          "VALIDATION_ERROR",
        );
      }
      if (updates.amount_cents <= 0) {
        return errorResponse(
          "amount_cents must be greater than 0",
          "VALIDATION_ERROR",
        );
      }
    }

    if (updates.category !== undefined) {
      const rawCategory = String(updates.category ?? "other");
      // For manual edits, preserve user-entered category names (including
      // custom categories) after sanitization, instead of remapping aliases.
      const sanitizedCategory = sanitizeCategoryName(rawCategory);
      updates.category = sanitizedCategory ?? "other";
      if (!sanitizedCategory && rawCategory.trim().length > 0) {
        await reportEdgeFunctionError({
          functionName: "update-expense",
          error: new Error("CATEGORY_SANITIZE_FALLBACK"),
          context: {
            expenseId,
            rawCategory,
            finalCategory: updates.category,
          },
        });
      }
      console.log(
        `[update-expense] category normalized for manual edit: raw="${rawCategory}" final="${updates.category}"`,
      );
    }

    if (updates.raw_text !== undefined) {
      if (updates.raw_text !== null && typeof updates.raw_text !== "string") {
        return errorResponse(
          "raw_text must be a string or null",
          "VALIDATION_ERROR",
        );
      }
      if (updates.raw_text === null) {
        updates.raw_text = "";
      }
      if (typeof updates.raw_text === "string") {
        const trimmedRawText = updates.raw_text.trim();
        if (trimmedRawText.length === 0) {
          updates.raw_text = "";
        } else {
          if (trimmedRawText.length > 1000) {
            return errorResponse(
              "raw_text must be less than 1000 characters",
              "VALIDATION_ERROR",
            );
          }
          updates.raw_text = trimmedRawText;
        }
      }
    }

    if (updates.merchant !== undefined) {
      if (updates.merchant !== null && typeof updates.merchant !== "string") {
        return errorResponse(
          "merchant must be a string or null",
          "VALIDATION_ERROR",
        );
      }
      if (typeof updates.merchant === "string") {
        const trimmedMerchant = updates.merchant.trim();
        if (trimmedMerchant.length === 0) {
          updates.merchant = null;
        } else {
          if (trimmedMerchant.length > 255) {
            return errorResponse(
              "merchant must be less than 255 characters",
              "VALIDATION_ERROR",
            );
          }
          updates.merchant = trimmedMerchant;
        }
      }
    }

    if (updates.date !== undefined) {
      if (typeof updates.date !== "string") {
        return errorResponse("date must be a string", "VALIDATION_ERROR");
      }

      const normalizedDate = normalizeCalendarDateString(updates.date);
      if (!normalizedDate) {
        return errorResponse(
          "date must be a valid calendar date",
          "VALIDATION_ERROR",
        );
      }

      updates.date = normalizedDate;
    }

    if ((updates as any).created_at !== undefined) {
      const normalizedCreatedAt = normalizeIsoTimestampWithZone(
        (updates as any).created_at,
      );
      if (typeof (updates as any).created_at !== "string") {
        return errorResponse("created_at must be a string", "VALIDATION_ERROR");
      }

      if (!normalizedCreatedAt) {
        return errorResponse(
          "created_at must be an ISO timestamp with timezone",
          "VALIDATION_ERROR",
        );
      }

      (updates as any).created_at = normalizedCreatedAt;
    }

    if ((updates as any).receipt_image_url !== undefined) {
      const receiptImageUrlResult = normalizeReceiptImageUrl(
        (updates as any).receipt_image_url,
        SUPABASE_URL,
        "receipt_image_url",
      );
      if (!receiptImageUrlResult.ok) {
        return errorResponse(
          receiptImageUrlResult.error ?? "Invalid receipt_image_url",
          "VALIDATION_ERROR",
        );
      }
      (updates as any).receipt_image_url = receiptImageUrlResult.value;
    }

    if (updates.currency !== undefined) {
      if (typeof updates.currency !== "string") {
        return errorResponse("currency must be a string", "VALIDATION_ERROR");
      }
      // Validate and normalize currency using existing validator
      updates.currency = validateCurrency(updates.currency);
    }

    // Normalize payer user ID from either field
    let normalizedPayerUserId: string | null = null;
    if (
      (updates as any).payer_user_id !== undefined ||
      (updates as any).payerUserId !== undefined
    ) {
      const payer = sanitizeUuid(
        (updates as any).payer_user_id ?? (updates as any).payerUserId,
      );
      if (!payer) {
        return errorResponse("Invalid payer user id", "VALIDATION_ERROR");
      }
      normalizedPayerUserId = payer;
      // Remove from updates to avoid touching non-existent expense columns
      delete (updates as any).payer_user_id;
      delete (updates as any).payerUserId;
    }

    if (updates.is_recurring !== undefined) {
      if (typeof updates.is_recurring !== "boolean") {
        return errorResponse(
          "is_recurring must be a boolean",
          "VALIDATION_ERROR",
        );
      }
    }

    if (updates.recurrence_rule !== undefined) {
      if (
        updates.recurrence_rule !== null &&
        typeof updates.recurrence_rule !== "object"
      ) {
        return errorResponse(
          "recurrence_rule must be an object or null",
          "VALIDATION_ERROR",
        );
      }

      // Validate recurrence_rule structure if provided
      if (updates.recurrence_rule !== null) {
        if (
          !updates.recurrence_rule.frequency ||
          typeof updates.recurrence_rule.frequency !== "string"
        ) {
          return errorResponse(
            "recurrence_rule.frequency is required and must be a string",
            "VALIDATION_ERROR",
          );
        }

        if (
          !updates.recurrence_rule.anchor_date ||
          typeof updates.recurrence_rule.anchor_date !== "string"
        ) {
          return errorResponse(
            "recurrence_rule.anchor_date is required and must be a string",
            "VALIDATION_ERROR",
          );
        }

        const normalizedAnchorDate = normalizeCalendarDateString(
          updates.recurrence_rule.anchor_date,
        );
        if (!normalizedAnchorDate) {
          return errorResponse(
            "recurrence_rule.anchor_date must be a valid calendar date",
            "VALIDATION_ERROR",
          );
        }

        updates.recurrence_rule.anchor_date = normalizedAnchorDate;

        // Validate end_date if provided
        if (
          updates.recurrence_rule.end_date !== undefined &&
          updates.recurrence_rule.end_date !== null
        ) {
          if (typeof updates.recurrence_rule.end_date !== "string") {
            return errorResponse(
              "recurrence_rule.end_date must be a string",
              "VALIDATION_ERROR",
            );
          }
          const normalizedEndDate = normalizeCalendarDateString(
            updates.recurrence_rule.end_date,
          );
          if (!normalizedEndDate) {
            return errorResponse(
              "recurrence_rule.end_date must be a valid calendar date",
              "VALIDATION_ERROR",
            );
          }
          updates.recurrence_rule.end_date = normalizedEndDate;
        }

        // Validate interval if provided
        if (
          updates.recurrence_rule.interval !== undefined &&
          updates.recurrence_rule.interval !== null
        ) {
          if (
            typeof updates.recurrence_rule.interval !== "number" ||
            !Number.isInteger(updates.recurrence_rule.interval)
          ) {
            return errorResponse(
              "recurrence_rule.interval must be an integer",
              "VALIDATION_ERROR",
            );
          }
          if (updates.recurrence_rule.interval <= 0) {
            return errorResponse(
              "recurrence_rule.interval must be greater than 0",
              "VALIDATION_ERROR",
            );
          }
        }
      }
    }

    if (updates.source !== undefined) {
      if (updates.source !== null && typeof updates.source !== "string") {
        return errorResponse(
          "source must be a string or null",
          "VALIDATION_ERROR",
        );
      }
      if (updates.source !== null && updates.source.length > 500) {
        return errorResponse(
          "source must be less than 500 characters",
          "VALIDATION_ERROR",
        );
      }
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-update-expense" } },
    });

    // Prevent future dates (timezone-aware).
    // IMPORTANT: The mobile client validates against the device's local calendar day.
    // The edge runtime runs in UTC, so we must validate against the caller's timezone
    // (client offset preferred; otherwise fall back to stored preferred_timezone).
    if (updates.date !== undefined) {
      let offsetMinutes: number | null = null;
      let ianaTimezone: string | null = null;

      const clientOffsetRaw = (body as any).clientTimezoneOffsetMinutes;
      if (
        typeof clientOffsetRaw === "number" &&
        Number.isFinite(clientOffsetRaw)
      ) {
        const candidate = Math.trunc(clientOffsetRaw);
        if (Math.abs(candidate) <= MAX_UTC_OFFSET_MINUTES) {
          offsetMinutes = candidate;
        }
      }

      const clientTimezoneRaw = (body as any).clientTimezone;
      if (offsetMinutes == null && typeof clientTimezoneRaw === "string") {
        const candidate = clientTimezoneRaw.trim();
        if (candidate) {
          ianaTimezone = candidate;
        }
      }

      if (offsetMinutes == null && ianaTimezone == null) {
        try {
          const { data: contact, error: contactError } = await supabase
            .from("user_contacts")
            .select("preferred_timezone")
            .eq("user_id", userId)
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (contactError) {
            console.warn(
              "[update-expense] Failed to load preferred_timezone; falling back to UTC",
              contactError,
            );
          } else {
            const preferredTimezone = (contact as any)?.preferred_timezone as
              | string
              | null
              | undefined;
            if (preferredTimezone) {
              const offset = parseUtcOffsetMinutes(preferredTimezone);
              if (offset != null) {
                offsetMinutes = offset;
              } else {
                ianaTimezone = preferredTimezone;
              }
            }
          }
        } catch (error) {
          console.warn(
            "[update-expense] Failed to resolve contact timezone; falling back to UTC",
            error,
          );
        }
      }

      const todayStr = (() => {
        if (offsetMinutes != null) {
          return getTodayYyyyMmDdInOffset(offsetMinutes);
        }
        if (ianaTimezone != null) {
          return (
            getTodayYyyyMmDdInIanaTimezone(ianaTimezone) ??
            getTodayYyyyMmDdInOffset(0)
          );
        }
        return getTodayYyyyMmDdInOffset(0);
      })();
    }

    // Fetch expense to verify ownership and obtain household info
    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select(
        "id, user_id, household_id, contact_id, split_group_id, amount_cents, currency, raw_text, category, date, created_at, type, source, is_recurring, recurrence_rule, bank_account_id, account_id, provider, provider_transaction_id, provider_fields, user_overrides, analytics_class, classification_source",
      )
      .eq("id", normalizedExpenseId)
      .is("deleted_at", null)
      .single();

    if (fetchError) {
      console.error("[update-expense] Fetch error:", fetchError);
      if (fetchError.code === "PGRST116") {
        return errorResponse("Expense not found", "NOT_FOUND", 404);
      }

      // Invalid UUID (most commonly when the client passes a non-UUID id).
      if (fetchError.code === "22P02") {
        return errorResponse("Invalid expenseId format", "VALIDATION_ERROR");
      }

      return errorResponse(
        "Failed to load expense for update",
        "SERVER_ERROR",
        500,
      );
    }

    if (!expense) {
      return errorResponse("Expense not found", "NOT_FOUND", 404);
    }

    if (updates.category !== undefined) {
      const txTypeRaw = String(
        (expense as any)?.type ?? "expense",
      ).toLowerCase();
      const txType = txTypeRaw === "income" ? "income" : "expense";
      const categoryBeforeRemap = String(updates.category);

      // IMPORTANT:
      // For manual category edits from clients, preserve the exact sanitized
      // category value that the user selected/typed. Applying remap rules here
      // can unintentionally collapse custom categories into canonical defaults
      // (e.g. "cat insurance" -> "insurance").
      //
      // GPT flows may still benefit from remap behavior, so keep it there.
      if (detection.isGpt) {
        try {
          const remaps = await fetchUserCategoryRemaps({
            supabase,
            userId,
            limit: 120,
          });
          updates.category = applyCategoryRemap({
            categoryName: categoryBeforeRemap,
            transactionType: txType,
            remaps,
          });
        } catch (error) {
          console.error(
            "[update-expense] Failed to apply category remaps:",
            error,
          );
        }
      } else {
        updates.category = categoryBeforeRemap;
        console.log(
          `[update-expense] category remap skipped for manual edit: final="${updates.category}"`,
        );
      }

      console.log(
        `[update-expense] category after remap gate: before="${categoryBeforeRemap}" final="${updates.category}"`,
      );
    }

    const expenseHouseholdIdRaw: string | null =
      (expense as any)?.household_id ?? null;
    let isPortfolioHousehold = false;
    if (expenseHouseholdIdRaw) {
      const { data: householdRow, error: householdError } = await supabase
        .from("households")
        .select("is_portfolio")
        .eq("id", expenseHouseholdIdRaw)
        .maybeSingle();

      if (householdError) {
        console.warn(
          "[update-expense] Failed to load household.is_portfolio; treating as non-portfolio",
          householdError,
        );
      } else {
        isPortfolioHousehold = householdRow?.is_portfolio === true;
      }
    }

    // For GPT requests, only allow personal expenses (no household_id)
    if (detection.isGpt && expense.household_id) {
      console.warn(
        `[update-expense] GPT attempt to update household expense: ${normalizedExpenseId}`,
      );
      return errorResponse(
        "GPT cannot update household expenses",
        "UNAUTHORIZED",
        403,
      );
    }

    // For non-GPT requests, enforce different rules for personal vs household expenses:
    // - Personal expenses: only the creator can edit (checked via expenses.user_id).
    // - Household expenses: any member of the household can edit.
    if (!detection.isGpt) {
      if (!expenseHouseholdIdRaw) {
        // Personal expense: require that the caller is the creator via expenses.user_id
        const expenseUserId = (expense as any)?.user_id as string | undefined;
        if (!expenseUserId || expenseUserId !== userId) {
          console.warn(
            `[update-expense] Unauthorized personal edit: User ${userId} attempted to update expense ${expenseId} owned by ${expenseUserId}`,
          );
          return errorResponse(
            "You do not have permission to edit this expense",
            "UNAUTHORIZED",
            403,
          );
        }
      } else if (isPortfolioHousehold) {
        // Portfolio household transactions behave like personal transactions.
        // Only the creator can edit, and there is no household notification/split flow.
        const expenseUserId = (expense as any)?.user_id as string | undefined;
        if (!expenseUserId || expenseUserId !== userId) {
          console.warn(
            `[update-expense] Unauthorized portfolio edit: User ${userId} attempted to update expense ${expenseId} owned by ${expenseUserId}`,
          );
          return errorResponse(
            "You do not have permission to edit this expense",
            "UNAUTHORIZED",
            403,
          );
        }
      } else {
        // Household expense: require that the caller is a member of the household
        const { data: membership } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", expenseHouseholdIdRaw)
          .eq("user_id", userId)
          .maybeSingle();

        if (!membership) {
          console.warn(
            `[update-expense] Unauthorized household edit: User ${userId} attempted to update household expense ${expenseId} for household ${expenseHouseholdIdRaw}`,
          );
          return errorResponse(
            "You do not have permission to edit this household expense",
            "UNAUTHORIZED",
            403,
          );
        }
      }
    } else {
      // For GPT, verify by user_id field directly (household edits are already blocked above)
      if (expense.user_id !== userId) {
        console.warn(
          `[update-expense] Unauthorized: User ${userId} attempted to update expense ${expenseId} owned by ${expense.user_id}`,
        );
        return errorResponse(
          "You do not have permission to edit this expense",
          "UNAUTHORIZED",
          403,
        );
      }
    }

    // Mapping-only mode: record an explicit category-to-category preference.
    // This is called by the mobile client AFTER a category-only edit.
    if (
      hasCategoryRemap &&
      Object.keys(updates).length === 0 &&
      !hasSplitPayload
    ) {
      const remap = categoryRemapRaw as any;
      const fromRaw =
        remap?.fromCategory ?? remap?.from_category ?? remap?.from;
      const toRaw = remap?.toCategory ?? remap?.to_category ?? remap?.to;

      if (typeof fromRaw !== "string" || typeof toRaw !== "string") {
        return errorResponse(
          "categoryRemap.fromCategory and categoryRemap.toCategory are required",
          "VALIDATION_ERROR",
        );
      }

      const fromCategory =
        sanitizeCategoryName(fromRaw) ?? normalizeCategoryForStorage(fromRaw);
      const toCategory =
        sanitizeCategoryName(toRaw) ?? normalizeCategoryForStorage(toRaw);

      if (!fromCategory || !toCategory) {
        return errorResponse(
          "Invalid category remap values",
          "VALIDATION_ERROR",
        );
      }

      if (toCategory === "other") {
        return errorResponse("Cannot remap to 'other'", "VALIDATION_ERROR");
      }

      if (fromCategory === toCategory) {
        return errorResponse(
          "categoryRemap values must be different",
          "VALIDATION_ERROR",
        );
      }

      const txTypeRaw = String(
        (expense as any)?.type ?? "expense",
      ).toLowerCase();
      const txType = txTypeRaw === "income" ? "income" : "expense";

      // Ensure the target category exists for the user (custom categories allowed).
      try {
        await ensureUserCategory({
          supabase,
          userId,
          categoryName: toCategory,
          transactionType: txType,
        });
      } catch (e) {
        console.error(
          "[update-expense] Failed to ensure category for remap:",
          e,
        );
      }

      // Prevent mapping to a hidden category (would create a preference the AI can never apply).
      const { data: hiddenRow, error: hiddenError } = await supabase
        .from("user_hidden_transaction_categories")
        .select("id")
        .eq("user_id", userId)
        .eq("category_name", toCategory)
        .eq("transaction_type", txType)
        .limit(1)
        .maybeSingle();

      if (hiddenError) {
        console.error(
          "[update-expense] Failed to check hidden categories:",
          hiddenError,
        );
        return errorResponse(
          "Failed to update category preference",
          "SERVER_ERROR",
          500,
        );
      }

      if (hiddenRow) {
        return errorResponse(
          "Cannot remap to a hidden category",
          "VALIDATION_ERROR",
        );
      }

      const nowIso = new Date().toISOString();

      const { data: existingRemap, error: existingError } = await supabase
        .from("user_category_remaps")
        .select("id, use_count")
        .eq("user_id", userId)
        .eq("transaction_type", txType)
        .eq("from_category_name", fromCategory)
        .maybeSingle();

      if (existingError) {
        console.error(
          "[update-expense] Failed to load existing remap:",
          existingError,
        );
        return errorResponse(
          "Failed to update category preference",
          "SERVER_ERROR",
          500,
        );
      }

      if (existingRemap?.id) {
        const nextCount =
          typeof (existingRemap as any).use_count === "number" &&
          Number.isFinite((existingRemap as any).use_count)
            ? Math.max(1, Math.trunc((existingRemap as any).use_count) + 1)
            : 1;

        const { error: updateRemapError } = await supabase
          .from("user_category_remaps")
          .update({
            to_category_name: toCategory,
            use_count: nextCount,
            last_used_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", (existingRemap as any).id);

        if (updateRemapError) {
          console.error(
            "[update-expense] Failed to update category remap:",
            updateRemapError,
          );
          return errorResponse(
            "Failed to update category preference",
            "SERVER_ERROR",
            500,
          );
        }
      } else {
        const { error: insertRemapError } = await supabase
          .from("user_category_remaps")
          .insert({
            user_id: userId,
            transaction_type: txType,
            from_category_name: fromCategory,
            to_category_name: toCategory,
            use_count: 1,
            last_used_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso,
          });

        if (insertRemapError) {
          console.error(
            "[update-expense] Failed to insert category remap:",
            insertRemapError,
          );
          return errorResponse(
            "Failed to update category preference",
            "SERVER_ERROR",
            500,
          );
        }
      }

      return jsonResponse(
        {
          success: true,
          data: {
            transactionType: txType,
            fromCategory,
            toCategory,
          },
          resolvedUserId: userId,
        },
        200,
      );
    }

    // Capture old values for notification payload
    const oldAmountCents: number | null =
      (expense as any)?.amount_cents ?? null;
    const oldCurrency: string | null = (expense as any)?.currency ?? null;
    const oldNote: string | null = (expense as any)?.raw_text ?? null;
    const oldCategory: string | null = (expense as any)?.category ?? null;
    const oldDate: string | null = (expense as any)?.date ?? null;
    const oldCreatedAt: string | null = (expense as any)?.created_at ?? null;

    // Optionally create initial household split group when requested and none exists yet
    const expenseHouseholdId: string | null = expenseHouseholdIdRaw;
    const existingSplitGroupId: string | null =
      (expense as any)?.split_group_id ?? null;
    if (Object.prototype.hasOwnProperty.call(updates, "split_group_id")) {
      const requestedSplitGroupId = sanitizeUuid(
        String((updates as any).split_group_id ?? ""),
      );
      if (
        requestedSplitGroupId != null &&
        requestedSplitGroupId !== existingSplitGroupId
      ) {
        return errorResponse(
          "split_group_id is managed by the household split workflow",
          "VALIDATION_ERROR",
        );
      }
      delete (updates as any).split_group_id;
    }

    const bodyHouseholdIdRaw = (body as any).householdId;
    if (bodyHouseholdIdRaw != null && typeof bodyHouseholdIdRaw !== "string") {
      return errorResponse("householdId must be a string", "VALIDATION_ERROR");
    }
    const bodyHouseholdIdValue =
      typeof bodyHouseholdIdRaw === "string" ? bodyHouseholdIdRaw.trim() : "";
    const bodyHouseholdId =
      bodyHouseholdIdValue.length === 0
        ? null
        : sanitizeUuid(bodyHouseholdIdValue);
    if (bodyHouseholdIdValue.length > 0 && !bodyHouseholdId) {
      return errorResponse("Invalid householdId format", "VALIDATION_ERROR");
    }
    const customSplits = rawCustomSplits;
    const payerUserIdRaw = (body as any).payerUserId as string | undefined;
    const splitUpdate = rawSplitUpdate;
    const reSplitRequested = shouldApplyExistingReSplit({
      intent: existingSplitWriteIntent,
      hasAmountUpdate: typeof updates.amount_cents === "number",
    });

    const updatesHasHouseholdId =
      Object.prototype.hasOwnProperty.call(updates, "household_id") ||
      Object.prototype.hasOwnProperty.call(updates, "householdId");
    const updatesHouseholdIdRaw = Object.prototype.hasOwnProperty.call(
      updates,
      "household_id",
    )
      ? (updates as any).household_id
      : Object.prototype.hasOwnProperty.call(updates, "householdId")
        ? (updates as any).householdId
        : undefined;
    let updatesHouseholdId: string | null | undefined = undefined;
    if (updatesHasHouseholdId) {
      if (
        updatesHouseholdIdRaw == null ||
        (typeof updatesHouseholdIdRaw === "string" &&
          updatesHouseholdIdRaw.trim().length === 0)
      ) {
        updatesHouseholdId = null;
      } else if (typeof updatesHouseholdIdRaw === "string") {
        updatesHouseholdId = sanitizeUuid(updatesHouseholdIdRaw);
        if (!updatesHouseholdId) {
          return errorResponse(
            "Invalid household_id format",
            "VALIDATION_ERROR",
          );
        }
      } else {
        return errorResponse(
          "household_id must be a string or null",
          "VALIDATION_ERROR",
        );
      }

      (updates as any).household_id = updatesHouseholdId;
      delete (updates as any).householdId;
    }

    const targetHouseholdId = updatesHasHouseholdId
      ? (updatesHouseholdId ?? null)
      : expenseHouseholdId;
    if (targetHouseholdId != null) {
      const { data: targetMembership, error: targetMembershipError } =
        await supabase
          .from("household_members")
          .select("id")
          .eq("household_id", targetHouseholdId)
          .eq("user_id", userId)
          .maybeSingle();

      if (targetMembershipError) {
        console.error(
          "[update-expense] Failed to verify target household membership:",
          targetMembershipError,
        );
        return errorResponse(
          "Failed to verify target household",
          "SERVER_ERROR",
          500,
        );
      }

      if (!targetMembership) {
        return errorResponse("Forbidden target household", "UNAUTHORIZED", 403);
      }
    }
    const targetCurrency =
      typeof (updates as any).currency === "string"
        ? (updates as any).currency
        : validateCurrency((expense as any)?.currency ?? "USD");
    const sameHouseholdScope = targetHouseholdId === expenseHouseholdId;
    let targetIsPortfolioHousehold = isPortfolioHousehold;
    if (targetHouseholdId && !sameHouseholdScope) {
      const { data: targetHouseholdRow, error: targetHouseholdError } =
        await supabase
          .from("households")
          .select("is_portfolio")
          .eq("id", targetHouseholdId)
          .maybeSingle();

      if (targetHouseholdError) {
        console.warn(
          "[update-expense] Failed to load target household.is_portfolio; treating as non-portfolio",
          targetHouseholdError,
        );
        targetIsPortfolioHousehold = false;
      } else {
        targetIsPortfolioHousehold = targetHouseholdRow?.is_portfolio === true;
      }
    }

    if (!sameHouseholdScope) {
      (updates as any).split_group_id = null;
    }

    const requestedAccountIdRaw =
      (updates as any)?.account_id ?? (updates as any)?.accountId;
    const requestedAccountId =
      requestedAccountIdRaw == null ||
      String(requestedAccountIdRaw).trim().length === 0
        ? null
        : sanitizeUuid(String(requestedAccountIdRaw));

    if (
      requestedAccountIdRaw != null &&
      String(requestedAccountIdRaw).trim().length > 0 &&
      !requestedAccountId
    ) {
      return errorResponse("Invalid account_id format", "VALIDATION_ERROR");
    }

    if (requestedAccountIdRaw !== undefined) {
      const targetScopeHouseholdId = targetHouseholdId;
      if (requestedAccountId) {
        const isInScope = await assertAccountInScope(
          supabase,
          requestedAccountId,
          {
            userId,
            householdId: targetScopeHouseholdId,
            currency: targetCurrency,
          },
        );
        if (!isInScope) {
          return errorResponse(
            "Provided account_id does not belong to this scope",
            "VALIDATION_ERROR",
          );
        }
        (updates as any).account_id = requestedAccountId;
      } else {
        (updates as any).account_id = await resolveDefaultAccountId(supabase, {
          userId,
          householdId: targetScopeHouseholdId,
          currency: targetCurrency,
        });
      }
      delete (updates as any).accountId;
    }

    if (
      requestedAccountIdRaw === undefined &&
      (updatesHasHouseholdId || typeof (updates as any).currency === "string")
    ) {
      (updates as any).account_id = await resolveDefaultAccountId(supabase, {
        userId,
        householdId: targetHouseholdId,
        currency: targetCurrency,
      });
    }

    const shouldCleanupPreviousSplitGroup =
      !sameHouseholdScope &&
      !!expenseHouseholdId &&
      !isPortfolioHousehold &&
      !!existingSplitGroupId;

    if (shouldCleanupPreviousSplitGroup && existingSplitGroupId) {
      const { data: previousSplitGroup, error: previousSplitGroupError } =
        await supabase
          .from("expense_split_groups")
          .select("id, expense_split_lines(is_settled)")
          .eq("id", existingSplitGroupId)
          .maybeSingle();

      if (previousSplitGroupError) {
        console.error(
          "[update-expense] Failed to load previous split group during scope change:",
          previousSplitGroupError,
        );
        return errorResponse(
          "Failed to move expense split configuration",
          "SERVER_ERROR",
          500,
        );
      }

      const previousLines = ((previousSplitGroup as any)?.expense_split_lines ||
        []) as { is_settled?: boolean }[];
      const previousHasSettledLines = previousLines.some(
        (line) => line && line.is_settled === true,
      );

      if (previousHasSettledLines) {
        return errorResponse(
          "Cannot move split expenses after any lines have been settled",
          "VALIDATION_ERROR",
        );
      }
    }

    const shouldCreateSplitGroup =
      !!targetHouseholdId &&
      !targetIsPortfolioHousehold &&
      (!existingSplitGroupId || !sameHouseholdScope) &&
      (bodyHouseholdId === targetHouseholdId || updatesHasHouseholdId);

    let createdSplitGroupId: string | null = null;
    let splitWriteNeedsFinalization = false;
    let pendingSplitCommit: {
      group: SplitGroupRecord;
      lines: SplitLineRecord[];
      previousSplitGroupId: string | null;
      reSplitRequested: boolean;
    } | null = null;

    if (shouldCreateSplitGroup) {
      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", targetHouseholdId);

      if (!members || members.length === 0) {
        return errorResponse(
          "Cannot create splits: no active household members",
          "SERVER_ERROR",
          500,
        );
      }

      const effectiveAmountCents =
        typeof updates.amount_cents === "number"
          ? updates.amount_cents
          : (((expense as any)?.amount_cents as number | null) ?? 0);
      const autoSplitSettings = await fetchHouseholdAutoSplitSettings(
        supabase,
        targetHouseholdId,
      );
      const effectiveSplit = resolveEffectiveSplit(
        customSplits,
        autoSplitSettings,
      );

      if (effectiveSplit.kind !== "skip") {
        const payerUserId = sanitizeUuid(payerUserIdRaw ?? null) || userId;
        const buildResult = buildHouseholdSplitRecords({
          householdId: targetHouseholdId,
          transactionId: normalizedExpenseId,
          payerUserId,
          amountCents: effectiveAmountCents,
          currency: targetCurrency,
          description: (updates.raw_text ??
            (expense as any)?.raw_text ??
            null) as string | null,
          members,
          customSplits: effectiveSplit.customSplits,
          reconcileMemberChanges: effectiveSplit.source === "default",
          splitGroupId: existingSplitGroupId ?? undefined,
        });

        if (!buildResult.ok) {
          return errorResponse(buildResult.error, "VALIDATION_ERROR");
        }

        createdSplitGroupId = buildResult.group.id;
        splitWriteNeedsFinalization = true;
        pendingSplitCommit = {
          group: buildResult.group,
          lines: buildResult.lines,
          previousSplitGroupId: existingSplitGroupId,
          reSplitRequested: false,
        };
        // The atomic commit RPC creates the referenced group and links it only
        // after the parent expense update succeeds. Sending the future ID in
        // this standalone UPDATE would violate the FK.
        delete updates.split_group_id;
      }
    }

    // Optionally update an existing household split group when requested.
    // This is separate from initial split group creation and is only allowed
    // when the expense already has a split_group_id and no lines have been
    // settled yet (to preserve settlement history correctness).
    const hasValidSplitUpdatePayload =
      !!splitUpdate &&
      !!splitUpdate.memberSplits &&
      splitUpdate.memberSplits.length > 0;
    if (
      reSplitRequested &&
      targetHouseholdId &&
      sameHouseholdScope &&
      existingSplitGroupId &&
      !hasValidSplitUpdatePayload
    ) {
      return errorResponse(
        "An explicit re-split requires splitUpdate for all current members",
        "VALIDATION_ERROR",
      );
    }

    const wantsSplitUpdate =
      !!targetHouseholdId &&
      sameHouseholdScope &&
      !targetIsPortfolioHousehold &&
      !!existingSplitGroupId &&
      reSplitRequested &&
      hasValidSplitUpdatePayload;

    if (wantsSplitUpdate) {
      splitWriteNeedsFinalization = true;
      if (!splitUpdate) {
        return errorResponse(
          "Invalid split update payload",
          "VALIDATION_ERROR",
        );
      }

      // Safety guard: split updates only make sense for household expenses
      if (!targetHouseholdId) {
        return errorResponse(
          "Cannot update splits for personal expenses",
          "VALIDATION_ERROR",
        );
      }

      // Load current split group with its lines to verify state and settled lines
      const { data: existingGroup, error: splitGroupFetchError } =
        await supabase
          .from("expense_split_groups")
          .select(
            "id, expense_id, household_id, payer_user_id, total_amount_cents, currency, split_type, description, created_at, expense_split_lines(is_settled)",
          )
          .eq("id", existingSplitGroupId)
          .maybeSingle();

      if (splitGroupFetchError) {
        console.error(
          "[update-expense] Failed to load existing split group for update:",
          splitGroupFetchError,
        );
        return errorResponse(
          "Failed to load existing split group for update",
          "SERVER_ERROR",
          500,
        );
      }

      if (!existingGroup) {
        console.error(
          "[update-expense] Split group not found for update:",
          existingSplitGroupId,
        );
        return errorResponse(
          "Split group not found for update",
          "NOT_FOUND",
          404,
        );
      }

      if ((existingGroup as any).household_id !== targetHouseholdId) {
        console.warn(
          "[update-expense] Split group household mismatch during update",
          {
            targetHouseholdId,
            splitGroupHouseholdId: (existingGroup as any).household_id,
          },
        );
        return errorResponse(
          "Split group does not belong to this household",
          "UNAUTHORIZED",
          403,
        );
      }

      const existingLines = ((existingGroup as any).expense_split_lines ||
        []) as {
        is_settled?: boolean;
      }[];
      const hasSettledLines = existingLines.some(
        (line) => line && line.is_settled === true,
      );

      if (hasSettledLines) {
        // Once any line has been settled, we must not change the split structure,
        // otherwise settlement history would no longer match actual payments.
        return errorResponse(
          "Cannot change splits after any lines have been settled",
          "VALIDATION_ERROR",
        );
      }

      // Load current household members for validation and equal-split fallback
      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", targetHouseholdId);

      if (!members || members.length === 0) {
        console.error(
          "[update-expense] No active members found when updating splits",
        );
        return errorResponse(
          "Cannot update splits: no active household members",
          "SERVER_ERROR",
          500,
        );
      }

      const effectiveAmountCents =
        typeof updates.amount_cents === "number"
          ? updates.amount_cents
          : (((expense as any)?.amount_cents as number | null) ?? 0);

      const splitType =
        splitUpdate.splitType ||
        ((existingGroup as any).split_type as CustomSplitsPayload["splitType"]);

      // Validate user IDs match all household members (same rule as initial creation)
      const updateUserIds = splitUpdate.memberSplits
        .map((s) => s.userId)
        .sort();
      const allUserIds = members.map((m: any) => m.user_id as string).sort();

      if (JSON.stringify(updateUserIds) !== JSON.stringify(allUserIds)) {
        console.error(
          "[update-expense] Split update members do not match household members",
        );
        return errorResponse(
          "Custom splits must include all household members",
          "VALIDATION_ERROR",
        );
      }

      // Reuse the same validation logic as for creation
      if (splitType === "amount") {
        const totalSplit = splitUpdate.memberSplits.reduce(
          (sum, s) => sum + (s.amount || 0),
          0,
        );
        const totalSplitCents = Math.round(totalSplit * 100);
        if (Math.abs(totalSplitCents - effectiveAmountCents) > 1) {
          return errorResponse(
            "Custom amount splits must equal total expense amount",
            "VALIDATION_ERROR",
          );
        }
      } else if (splitType === "percentage") {
        const totalPercent = splitUpdate.memberSplits.reduce(
          (sum, s) => sum + (s.percentage || 0),
          0,
        );
        if (Math.abs(totalPercent - 100) > 0.01) {
          return errorResponse(
            "Custom percentage splits must total 100%",
            "VALIDATION_ERROR",
          );
        }
      } else if (splitType === "shares") {
        const totalShares = splitUpdate.memberSplits.reduce(
          (sum, s) => sum + (s.shares || 0),
          0,
        );
        if (totalShares <= 0) {
          return errorResponse(
            "At least one member must have a share greater than 0",
            "VALIDATION_ERROR",
          );
        }
      }

      // Build replacement split lines based on the updated configuration
      let updatedSplitLines: any[] = [];

      if (splitType === "equal") {
        const amountPerMember =
          members.length > 0
            ? Math.floor(effectiveAmountCents / members.length)
            : 0;
        const remainder =
          members.length > 0
            ? effectiveAmountCents - amountPerMember * members.length
            : 0;
        updatedSplitLines = members.map((member: any, index: number) => ({
          split_group_id: existingSplitGroupId,
          user_id: member.user_id,
          amount_cents: amountPerMember + (index === 0 ? remainder : 0),
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === "amount") {
        const cents = splitUpdate.memberSplits.map((split) =>
          Math.max(0, Math.round((split.amount || 0) * 100)),
        );
        const sumCents = cents.reduce((sum, v) => sum + v, 0);
        const diff = effectiveAmountCents - sumCents;
        if (diff !== 0 && cents.length > 0) {
          cents[cents.length - 1] = Math.max(0, cents[cents.length - 1] + diff);
        }
        updatedSplitLines = splitUpdate.memberSplits.map((split, index) => ({
          split_group_id: existingSplitGroupId,
          user_id: split.userId,
          amount_cents: cents[index] ?? 0,
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === "percentage") {
        const weights = splitUpdate.memberSplits.map(
          (split) => split.percentage || 0,
        );
        const allocatedCents = allocateCentsByWeights(
          effectiveAmountCents,
          weights,
        );
        updatedSplitLines = splitUpdate.memberSplits.map((split, index) => ({
          split_group_id: existingSplitGroupId,
          user_id: split.userId,
          amount_cents: allocatedCents[index] ?? 0,
          percentage: split.percentage,
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === "shares") {
        const weights = splitUpdate.memberSplits.map((split) => {
          const shares =
            typeof split.shares === "number" ? Math.trunc(split.shares) : 0;
          return shares > 0 ? shares : 0;
        });
        const allocatedCents = allocateCentsByWeights(
          effectiveAmountCents,
          weights,
        );
        if (weights.reduce((sum, v) => sum + v, 0) > 0) {
          updatedSplitLines = splitUpdate.memberSplits.map((split, index) => {
            const shares =
              typeof split.shares === "number" ? Math.trunc(split.shares) : 0;
            return {
              split_group_id: existingSplitGroupId,
              user_id: split.userId,
              amount_cents: allocatedCents[index] ?? 0,
              shares: shares > 0 ? shares : null,
              is_settled: false,
              settled_at: null,
              created_at: new Date().toISOString(),
            };
          });
        }
      }

      if (updatedSplitLines.length === 0) {
        return errorResponse(
          "Failed to build updated splits",
          "SERVER_ERROR",
          500,
        );
      }

      const commitCreatedAt = new Date().toISOString();
      pendingSplitCommit = {
        group: {
          id: existingSplitGroupId,
          household_id: targetHouseholdId,
          expense_id: normalizedExpenseId,
          payer_user_id: String((existingGroup as any).payer_user_id),
          split_type: splitType,
          currency: String(
            updates.currency ||
              (existingGroup as any).currency ||
              targetCurrency,
          ),
          total_amount_cents: effectiveAmountCents,
          description: Object.prototype.hasOwnProperty.call(updates, "raw_text")
            ? ((updates.raw_text as string | null) ?? null)
            : (((existingGroup as any).description as string | null) ?? null),
          created_at:
            ((existingGroup as any).created_at as string | null) ??
            commitCreatedAt,
        },
        lines: updatedSplitLines.map((line) => ({
          split_group_id: existingSplitGroupId,
          user_id: String(line.user_id),
          amount_cents: Number(line.amount_cents ?? 0),
          percentage:
            typeof line.percentage === "number" ? line.percentage : null,
          shares: typeof line.shares === "number" ? line.shares : null,
          is_settled: false,
          settled_at: null,
          created_at:
            typeof line.created_at === "string"
              ? line.created_at
              : commitCreatedAt,
        })),
        previousSplitGroupId: existingSplitGroupId,
        reSplitRequested: true,
      };
    }

    // Update payer on existing split group if requested
    const targetSplitGroupId =
      createdSplitGroupId ?? (sameHouseholdScope ? existingSplitGroupId : null);

    let cachedExistingGroupForPreservation: Record<string, unknown> | null =
      null;
    let cachedCurrentMemberIds: string[] | null = null;
    const loadCurrentMemberIds = async (): Promise<string[]> => {
      if (cachedCurrentMemberIds) return cachedCurrentMemberIds;
      if (!targetHouseholdId) {
        throw new Error("Household is required to load split members");
      }
      const { data: currentMembers, error: currentMembersError } =
        await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", targetHouseholdId);
      if (currentMembersError) throw currentMembersError;
      cachedCurrentMemberIds = (currentMembers ?? [])
        .map((member: { user_id?: string }) => member.user_id ?? "")
        .filter((memberId: string) => memberId.length > 0)
        .sort();
      return cachedCurrentMemberIds;
    };
    const loadExistingGroupForPreservation = async () => {
      if (cachedExistingGroupForPreservation) {
        return cachedExistingGroupForPreservation;
      }
      if (!targetSplitGroupId) throw new Error("Split group not found");

      const { data: group, error: groupError } = await supabase
        .from("expense_split_groups")
        .select(
          "id, expense_id, household_id, payer_user_id, split_type, currency, total_amount_cents, description, created_at, expense_split_lines(user_id, amount_cents, percentage, shares, is_settled, created_at)",
        )
        .eq("id", targetSplitGroupId)
        .maybeSingle();
      if (groupError || !group) {
        throw groupError ?? new Error("Split group not found");
      }

      cachedExistingGroupForPreservation = group as Record<string, unknown>;
      return cachedExistingGroupForPreservation;
    };

    const ensurePendingCommitForExistingGroup = async () => {
      if (pendingSplitCommit || !targetSplitGroupId || !targetHouseholdId) {
        return;
      }

      const group = await loadExistingGroupForPreservation();

      const currentLines = ((group as any).expense_split_lines ||
        []) as StoredSplitLineRecord[];
      const targetTotal =
        typeof updates.amount_cents === "number"
          ? updates.amount_cents
          : Number((group as any).total_amount_cents ?? 0);
      const splitType = String((group as any).split_type) as
        | "equal"
        | "amount"
        | "percentage"
        | "shares";
      const now = new Date().toISOString();
      const preservedSplit = buildPreservedHistoricalSplitRecords({
        group: {
          id: targetSplitGroupId,
          household_id: targetHouseholdId,
          expense_id: normalizedExpenseId,
          payer_user_id: String((group as any).payer_user_id),
          split_type: splitType,
          currency: String((group as any).currency),
          total_amount_cents: Number((group as any).total_amount_cents ?? 0),
          description: ((group as any).description as string | null) ?? null,
          created_at: ((group as any).created_at as string | null) ?? now,
        },
        lines: currentLines,
        targetAmountCents: targetTotal,
        targetCurrency: String(updates.currency || (group as any).currency),
        targetDescription: Object.prototype.hasOwnProperty.call(
          updates,
          "raw_text",
        )
          ? ((updates.raw_text as string | null) ?? null)
          : (((group as any).description as string | null) ?? null),
        now,
      });
      if (!preservedSplit.ok) {
        throw new Error(preservedSplit.error);
      }
      pendingSplitCommit = {
        group: preservedSplit.group,
        lines: preservedSplit.lines,
        previousSplitGroupId: targetSplitGroupId,
        reSplitRequested: false,
      };
      splitWriteNeedsFinalization = true;
    };

    if (targetSplitGroupId && sameHouseholdScope && !pendingSplitCommit) {
      try {
        let storedPayerUserId: string | null = null;
        let storedPayerIsCurrentMember = true;
        if (normalizedPayerUserId != null) {
          const storedGroup = await loadExistingGroupForPreservation();
          storedPayerUserId =
            typeof storedGroup.payer_user_id === "string"
              ? storedGroup.payer_user_id
              : null;
          const currentMemberIds = await loadCurrentMemberIds();
          storedPayerIsCurrentMember =
            storedPayerUserId != null &&
            currentMemberIds.includes(storedPayerUserId);
        }
        const mutationDecision = resolveExistingSplitMutationDecision({
          updates: updates as Record<string, unknown>,
          storedAmountCents: Number((expense as any).amount_cents),
          storedCurrency: String((expense as any).currency ?? ""),
          storedPayerUserId,
          requestedPayerUserId: normalizedPayerUserId,
          reSplitRequested: false,
          legacyImplicitPayerPayload:
            parsedReSplitRequest.value === undefined &&
            !hasValidSplitUpdatePayload,
          storedPayerIsCurrentMember,
        });
        if (mutationDecision.requiresSplitCommit) {
          await ensurePendingCommitForExistingGroup();
        }
      } catch (error) {
        console.error(
          "[update-expense] Failed to prepare existing split update:",
          error,
        );
        return errorResponse(
          error instanceof Error
            ? error.message
            : "Failed to prepare expense splits",
          "SERVER_ERROR",
          500,
        );
      }
    }

    const isUpdatingExistingSplit =
      !!targetSplitGroupId &&
      targetSplitGroupId === existingSplitGroupId &&
      sameHouseholdScope;
    if (isUpdatingExistingSplit && pendingSplitCommit) {
      const storedPayerUserId = pendingSplitCommit.group.payer_user_id;
      const effectivePayerUserId = normalizedPayerUserId ?? storedPayerUserId;
      const payerChanged = effectivePayerUserId !== storedPayerUserId;
      const requiresCurrentMembership =
        pendingSplitCommit.reSplitRequested || payerChanged;
      let currentMemberIds: string[] = [];

      if (requiresCurrentMembership) {
        if (!targetHouseholdId) {
          return errorResponse(
            "Payer can only be set for household expenses",
            "VALIDATION_ERROR",
          );
        }
        try {
          currentMemberIds = await loadCurrentMemberIds();
        } catch (currentMembersError) {
          console.error(
            "[update-expense] Failed to verify current split membership:",
            currentMembersError,
          );
          return errorResponse(
            "Failed to verify expense payer",
            "SERVER_ERROR",
            500,
          );
        }
      }

      const payerIntent = validateExistingSplitPayerIntent({
        storedPayerUserId,
        requestedPayerUserId: normalizedPayerUserId,
        reSplitRequested: pendingSplitCommit.reSplitRequested,
        participantIds: pendingSplitCommit.lines.map((line) => line.user_id),
        currentMemberIds,
      });
      if (!payerIntent.ok) {
        return errorResponse(payerIntent.error, "VALIDATION_ERROR");
      }
      if (payerIntent.payerChanged) {
        splitWriteNeedsFinalization = true;
        pendingSplitCommit = {
          ...pendingSplitCommit,
          group: {
            ...pendingSplitCommit.group,
            payer_user_id: payerIntent.effectivePayerUserId,
          },
        };
      }
    } else if (
      normalizedPayerUserId &&
      targetSplitGroupId &&
      pendingSplitCommit
    ) {
      pendingSplitCommit = {
        ...pendingSplitCommit,
        group: {
          ...pendingSplitCommit.group,
          payer_user_id: normalizedPayerUserId,
        },
      };
      splitWriteNeedsFinalization = true;
    }

    const expenseRecord = expense as Record<string, unknown>;
    const splitRpcOwnsStructuralFields =
      pendingSplitCommit != null || shouldCleanupPreviousSplitGroup;
    const hasTargetAccountUpdate = Object.prototype.hasOwnProperty.call(
      updates,
      "account_id",
    );
    const targetAccountIdForAtomicWrite = hasTargetAccountUpdate
      ? ((updates as any).account_id as string | null | undefined)
      : ((expense as any).account_id as string | null | undefined);
    if (
      splitRpcOwnsStructuralFields &&
      hasTargetAccountUpdate &&
      typeof targetAccountIdForAtomicWrite !== "string"
    ) {
      return errorResponse(
        "Failed to resolve target account for split expense",
        "SERVER_ERROR",
        500,
      );
    }
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    let explicitAnalyticsOverride: Record<string, unknown> | null = null;
    const allowedExpenseColumns = [
      "amount_cents",
      "category",
      "raw_text",
      "merchant",
      "date",
      "created_at",
      "currency",
      "receipt_image_url",
      "is_recurring",
      "recurrence_rule",
      "source",
      "household_id",
      "account_id",
      "split_group_id",
    ];
    for (const key of allowedExpenseColumns) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        if (
          splitRpcOwnsStructuralFields &&
          (key === "amount_cents" ||
            key === "currency" ||
            key === "household_id" ||
            key === "account_id" ||
            key === "split_group_id")
        ) {
          continue;
        }
        updatePayload[key] = updates[key];
      }
    }

    const isProviderManagedExpense =
      typeof expenseRecord["provider"] === "string" &&
      typeof expenseRecord["provider_transaction_id"] === "string" &&
      String(expenseRecord["provider_transaction_id"]).trim().length > 0;

    if (isProviderManagedExpense) {
      const storedProviderFields =
        expenseRecord["provider_fields"] &&
        typeof expenseRecord["provider_fields"] === "object"
          ? (expenseRecord["provider_fields"] as Record<string, unknown>)
          : null;
      const providerFields = {
        ...buildProviderFieldsFromExpenseRow(expenseRecord),
        ...(storedProviderFields ?? {}),
      };

      const visibleExpense = {
        amount_cents:
          updates.amount_cents ?? expenseRecord["amount_cents"] ?? null,
        currency: updates.currency ?? expenseRecord["currency"] ?? null,
        date: updates.date ?? expenseRecord["date"] ?? null,
        category: updates.category ?? expenseRecord["category"] ?? null,
        raw_text: updates.raw_text ?? expenseRecord["raw_text"] ?? null,
        merchant: updates.merchant ?? expenseRecord["merchant"] ?? null,
        source: updates.source ?? expenseRecord["source"] ?? null,
        is_recurring:
          updates.is_recurring ?? expenseRecord["is_recurring"] ?? false,
        recurrence_rule:
          updates.recurrence_rule ?? expenseRecord["recurrence_rule"] ?? null,
        account_id:
          (updates as any).account_id ?? expenseRecord["account_id"] ?? null,
        household_id:
          targetHouseholdId ?? expenseRecord["household_id"] ?? null,
      };

      updatePayload["user_overrides"] = computeBankExpenseUserOverrides({
        providerFields: providerFields as Record<string, unknown>,
        visibleExpense,
      });

      if (Object.prototype.hasOwnProperty.call(updates, "category")) {
        explicitAnalyticsOverride = {
          analytics_class: classifyUserCategoryOverride(
            String(updates.category ?? ""),
            String(expenseRecord["type"] ?? "expense"),
          ),
          classification_source: "user_override",
        };
        if (!splitRpcOwnsStructuralFields) {
          Object.assign(updatePayload, explicitAnalyticsOverride);
        }
      }
    }

    let updatedExpense: unknown = null;
    if (splitWriteNeedsFinalization && pendingSplitCommit) {
      const splitCommit = pendingSplitCommit;
      const { error: commitSplitError } =
        await commitHouseholdSplitRecordsWithPatch({
          supabase,
          actorUserId: userId,
          group: splitCommit.group,
          lines: splitCommit.lines,
          expectedParent: expectedSplitParentFromTransaction(expenseRecord),
          previousSplitGroupId: splitCommit.previousSplitGroupId,
          targetAccountId: targetAccountIdForAtomicWrite ?? null,
          expensePatch: updatePayload,
        });
      if (commitSplitError) {
        console.error(
          "[update-expense] Failed to commit split write:",
          commitSplitError,
        );
        return errorResponse(
          "Failed to finalize expense splits",
          "SERVER_ERROR",
          500,
        );
      }
    } else if (shouldCleanupPreviousSplitGroup && existingSplitGroupId) {
      const targetAmountCents =
        typeof updates.amount_cents === "number"
          ? updates.amount_cents
          : Number((expense as any)?.amount_cents ?? 0);
      const { error: removePreviousSplitError } =
        await removeHouseholdSplitWithPatch({
          supabase,
          actorUserId: userId,
          expenseId: normalizedExpenseId,
          splitGroupId: existingSplitGroupId,
          targetHouseholdId,
          targetCurrency,
          targetAmountCents,
          targetAccountId: targetAccountIdForAtomicWrite ?? null,
          expectedParent: expectedSplitParentFromTransaction(expenseRecord),
          expensePatch: updatePayload,
        });
      if (removePreviousSplitError) {
        console.error(
          "[update-expense] Failed to remove previous split group after scope change:",
          removePreviousSplitError,
        );
        return errorResponse(
          "Failed to move expense split configuration",
          "SERVER_ERROR",
          500,
        );
      }
    } else {
      const { data, error: updateError } = await supabase
        .from("expenses")
        .update(updatePayload)
        .eq("id", normalizedExpenseId)
        .is("deleted_at", null)
        .select()
        .single();

      if (updateError) {
        console.error("[update-expense] Update error:", updateError);
        if (updateError.code === "22P02") {
          return errorResponse("Invalid expenseId format", "VALIDATION_ERROR");
        }
        return errorResponse("Failed to update expense", "SERVER_ERROR", 500);
      }
      updatedExpense = data;
    }

    if (splitRpcOwnsStructuralFields && explicitAnalyticsOverride) {
      const { error: analyticsOverrideError } = await supabase
        .from("expenses")
        .update(explicitAnalyticsOverride)
        .eq("id", normalizedExpenseId)
        .is("deleted_at", null);
      if (analyticsOverrideError) {
        console.error(
          "[update-expense] Failed to apply analytics override:",
          analyticsOverrideError,
        );
        return errorResponse(
          "Failed to update transaction classification",
          "SERVER_ERROR",
          500,
        );
      }
    }

    if (splitRpcOwnsStructuralFields) {
      const { data: refreshedExpense, error: refreshExpenseError } =
        await supabase
          .from("expenses")
          .select()
          .eq("id", normalizedExpenseId)
          .is("deleted_at", null)
          .single();
      if (refreshExpenseError || !refreshedExpense) {
        console.error(
          "[update-expense] Failed to reload expense after atomic split write:",
          refreshExpenseError,
        );
        return errorResponse(
          "Failed to reload updated expense",
          "SERVER_ERROR",
          500,
        );
      }
      updatedExpense = refreshedExpense;
    }

    console.log(
      `[update-expense] Successfully updated expense ${normalizedExpenseId} for user ${userId}`,
    );

    // Learn/ensure custom category + preference mapping for future AI categorization
    try {
      const txTypeRaw = String(
        (updatedExpense as any)?.type ?? "expense",
      ).toLowerCase();
      const txType = txTypeRaw === "income" ? "income" : "expense";
      const updatedCategory = (updatedExpense as any)?.category ?? null;
      const updatedNote = (updatedExpense as any)?.raw_text ?? null;

      if (
        typeof updatedCategory === "string" &&
        updatedCategory.trim().length > 0
      ) {
        await ensureUserCategory({
          supabase,
          userId,
          categoryName: updatedCategory,
          transactionType: txType,
        });
        await learnUserCategoryPreference({
          supabase,
          userId,
          transactionType: txType,
          categoryName: updatedCategory,
          descriptionText: updatedNote,
        });
      }
    } catch (e) {
      console.error(
        "[update-expense] Failed to learn category preference (non-blocking):",
        e,
      );
    }

    // For non-GPT requests, notify household members if this was a shared expense
    if (!detection.isGpt && expense.household_id && !isPortfolioHousehold) {
      console.log(
        `[update-expense] Notifying household members about edit for household ${expense.household_id}`,
      );
      // Resolve actor display name
      let actorName = "Someone";
      try {
        const { data: appUser } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();
        if (appUser?.full_name && String(appUser.full_name).trim().length > 0) {
          actorName = appUser.full_name as string;
        }
      } catch (_) {}

      // Compute new values
      const newAmountCents: number | null =
        (updates as any).amount_cents ??
        (updatedExpense as any)?.amount_cents ??
        null;
      const newCurrency: string | null =
        (updates as any).currency ??
        (updatedExpense as any)?.currency ??
        oldCurrency;
      const newNote: string | null =
        (updates as any).raw_text ?? (updatedExpense as any)?.raw_text ?? null;
      const newCategory: string | null =
        (updates as any).category ?? (updatedExpense as any)?.category ?? null;
      const newDate: string | null =
        (updates as any).date ?? (updatedExpense as any)?.date ?? null;
      const newCreatedAt: string | null =
        (updates as any).created_at ??
        (updatedExpense as any)?.created_at ??
        null;

      const transactionType =
        ((expense as any)?.type as string | null | undefined)?.toLowerCase() ??
        "expense";
      const eventType =
        transactionType == "income" ? "income_edited" : "expense_edited";

      const { error: notifyError } = await supabase.rpc(
        "notify_household_members_expense",
        {
          p_household_id: expense.household_id,
          p_expense_id: normalizedExpenseId,
          p_actor_user_id: userId,
          p_event_type: eventType,
          p_expense_data: {
            actor_name: actorName,
            old_amount_cents: oldAmountCents,
            new_amount_cents: newAmountCents,
            currency: newCurrency ?? oldCurrency,
            old_note: oldNote,
            new_note: newNote,
            old_category: oldCategory,
            new_category: newCategory,
            old_currency: oldCurrency,
            new_currency: newCurrency,
            old_date: oldDate,
            new_date: newDate,
            old_created_at: oldCreatedAt,
            new_created_at: newCreatedAt,
            updated_fields: Object.keys(updates),
            is_recurring:
              ((updates as any).is_recurring as boolean | undefined) ??
              (updatedExpense as any)?.is_recurring === true,
          },
        },
      );

      if (notifyError) {
        console.error(
          "[update-expense] Error creating notifications:",
          notifyError,
        );
        // Don't fail the request, just log the error
      } else {
        console.log(
          "[update-expense] Notifications created for household members",
        );
      }
    }

    const responseData: any = {
      success: true,
      data: updatedExpense,
      resolvedUserId: userId,
      meta: {
        ...(resolvedIdentityMeta ?? {}),
        clientRecordId,
        clientMutationId,
      },
    };

    // For non-GPT requests, include shared flag
    if (!detection.isGpt) {
      const finalHouseholdId = (updatedExpense as any)?.household_id ?? null;
      let finalIsPortfolio = false;
      if (finalHouseholdId) {
        const { data: finalHousehold } = await supabase
          .from("households")
          .select("is_portfolio")
          .eq("id", finalHouseholdId)
          .maybeSingle();
        finalIsPortfolio = finalHousehold?.is_portfolio === true;
      }
      responseData.shared = !!finalHouseholdId && !finalIsPortfolio;
    }

    return jsonResponse(responseData, 200);
  } catch (error) {
    console.error("[update-expense] Unexpected error:", error);
    await reportEdgeFunctionError({
      functionName: "update-expense",
      error,
      context: {
        step: "unhandled",
      },
    });
    return errorResponse("An unexpected error occurred", "SERVER_ERROR", 500);
  }
});
