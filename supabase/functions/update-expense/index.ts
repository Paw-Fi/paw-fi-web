// Supabase Edge Function: update-expense
// Updates individual fields of an expense transaction with validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import {
  getAllCategories,
  normalizeCategory,
} from "../shared/category-colors.ts";

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
    date?: string;
    currency?: string;
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
    payer_user_id?: string;
    payerUserId?: string;
  };
  householdId?: string;
  customSplits?: CustomSplitsPayload;
  payerUserId?: string;
  splitUpdate?: CustomSplitsPayload;
  // Optional client timezone context for date validation (preferred over server UTC).
  // Offset uses the Dart/JS convention: minutes east of UTC (e.g., UTC+08:00 => 480).
  clientTimezoneOffsetMinutes?: number;
  // Optional IANA timezone (e.g., "Asia/Singapore"). Used if offset is not provided.
  clientTimezone?: string;
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

function isValidYyyyMmDd(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
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
    const updates = body.updates;

    const detection = detectGptRequest(req);
    const conversationId = detection.conversationId ?? null;

    let userId: string | null = null;

    // For non-GPT requests, userId should be in body (legacy client support)
    if (!detection.isGpt && ("userId" in body || "user_id" in body)) {
      const rawUserId = (body as any).userId ?? (body as any).user_id;
      if (rawUserId) {
        userId = sanitizeUuid(rawUserId);
      }
      if (!userId) {
        return errorResponse("Invalid userId format", "VALIDATION_ERROR");
      }
    }

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

    if (!userId) {
      return errorResponse(
        "userId is required for non-GPT requests",
        "VALIDATION_ERROR",
      );
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

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
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
    const hasSplitPayload =
      !!rawCustomSplits?.memberSplits?.length ||
      !!rawSplitUpdate?.memberSplits?.length;

    if (Object.keys(updates).length === 0 && !hasSplitPayload) {
      return errorResponse(
        "updates object is required and must contain at least one field",
        "VALIDATION_ERROR",
      );
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
      if (updates.amount_cents > 100000000) {
        // Max $1,000,000
        return errorResponse(
          "amount_cents must be less than 100,000,000",
          "VALIDATION_ERROR",
        );
      }
    }

    if (updates.category !== undefined) {
      const normalizedCategory = normalizeCategory(updates.category || "other");
      updates.category = normalizedCategory;
    }

    if (updates.raw_text !== undefined) {
      if (typeof updates.raw_text !== "string") {
        return errorResponse("raw_text must be a string", "VALIDATION_ERROR");
      }
      if (updates.raw_text.trim().length === 0) {
        return errorResponse("raw_text cannot be empty", "VALIDATION_ERROR");
      }
      if (updates.raw_text.length > 1000) {
        return errorResponse(
          "raw_text must be less than 1000 characters",
          "VALIDATION_ERROR",
        );
      }
      updates.raw_text = updates.raw_text.trim();
    }

    if (updates.date !== undefined) {
      if (typeof updates.date !== "string") {
        return errorResponse(
          "date must be a string in YYYY-MM-DD format",
          "VALIDATION_ERROR",
        );
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updates.date)) {
        return errorResponse(
          "date must be in YYYY-MM-DD format",
          "VALIDATION_ERROR",
        );
      }

      // Strictly validate date components (e.g., reject 2025-02-30 which JS auto-normalizes)
      if (!isValidYyyyMmDd(updates.date)) {
        return errorResponse("Invalid date", "VALIDATION_ERROR");
      }
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

        // Validate anchor_date is in ISO format (can include time)
        try {
          new Date(updates.recurrence_rule.anchor_date);
        } catch {
          return errorResponse(
            "recurrence_rule.anchor_date must be a valid ISO date",
            "VALIDATION_ERROR",
          );
        }

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
          try {
            new Date(updates.recurrence_rule.end_date);
          } catch {
            return errorResponse(
              "recurrence_rule.end_date must be a valid ISO date",
              "VALIDATION_ERROR",
            );
          }
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

      if (updates.date > todayStr) {
        return errorResponse(
          "Date cannot be in the future",
          "VALIDATION_ERROR",
        );
      }
    }

    // Fetch expense to verify ownership and obtain household info
    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select(
        "id, user_id, household_id, split_group_id, amount_cents, currency, raw_text, category, date, created_at, type",
      )
      .eq("id", normalizedExpenseId)
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

    const bodyHouseholdIdRaw = (body as any).householdId as string | undefined;
    const bodyHouseholdId = bodyHouseholdIdRaw
      ? sanitizeUuid(bodyHouseholdIdRaw)
      : null;
    const customSplits = (body as any).customSplits as
      | CustomSplitsPayload
      | undefined;
    const payerUserIdRaw = (body as any).payerUserId as string | undefined;
    const splitUpdate = (body as any).splitUpdate as
      | CustomSplitsPayload
      | undefined;

    const updatesHouseholdIdRaw =
      (updates as any)?.household_id ?? (updates as any)?.householdId ?? null;
    const updatesHouseholdId =
      typeof updatesHouseholdIdRaw === "string"
        ? sanitizeUuid(updatesHouseholdIdRaw)
        : null;
    const effectiveHouseholdForSplit = expenseHouseholdId ?? updatesHouseholdId;

    const shouldCreateSplitGroup =
      !!effectiveHouseholdForSplit &&
      !isPortfolioHousehold &&
      !existingSplitGroupId &&
      !!bodyHouseholdId &&
      bodyHouseholdId === effectiveHouseholdForSplit &&
      !!customSplits &&
      !!customSplits.memberSplits &&
      customSplits.memberSplits.length > 0;

    let createdSplitGroupId: string | null = null;

    if (shouldCreateSplitGroup) {
      const splitType = customSplits!.splitType || "equal";

      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", expenseHouseholdId);

      if (members && members.length > 0) {
        const effectiveAmountCents =
          typeof updates.amount_cents === "number"
            ? updates.amount_cents
            : (((expense as any)?.amount_cents as number | null) ?? 0);

        const customUserIds = customSplits!.memberSplits
          .map((s) => s.userId)
          .sort();
        const allUserIds = members.map((m: any) => m.user_id as string).sort();

        if (JSON.stringify(customUserIds) === JSON.stringify(allUserIds)) {
          if (splitType === "amount") {
            const totalSplit = customSplits!.memberSplits.reduce(
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
            const totalPercent = customSplits!.memberSplits.reduce(
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
            const totalShares = customSplits!.memberSplits.reduce(
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

          let payerUserId = payerUserIdRaw
            ? sanitizeUuid(payerUserIdRaw)
            : null;
          if (!payerUserId) {
            payerUserId = userId;
          }

          if (payerUserId) {
            const { data: validPayer } = await supabase
              .from("household_members")
              .select("user_id")
              .eq("household_id", expenseHouseholdId)
              .eq("user_id", payerUserId)
              .maybeSingle();
            if (!validPayer) {
              payerUserId = userId;
            }
          }

          const newCurrency =
            updates.currency ||
            ((expense as any)?.currency as string | null) ||
            null;

          const { data: splitGroup, error: splitGroupError } = await supabase
            .from("expense_split_groups")
            .insert({
              household_id: expenseHouseholdId,
              expense_id: expense.id,
              payer_user_id: payerUserId,
              split_type: splitType,
              currency: newCurrency,
              total_amount_cents: effectiveAmountCents,
              description:
                updates.raw_text || (expense as any)?.raw_text || null,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!splitGroupError && splitGroup) {
            createdSplitGroupId = (splitGroup as any).id as string;

            let splitLines: any[] = [];

            if (splitType === "equal") {
              const amountPerMember =
                members.length > 0
                  ? Math.floor(effectiveAmountCents / members.length)
                  : 0;
              const remainder =
                members.length > 0
                  ? effectiveAmountCents - amountPerMember * members.length
                  : 0;
              splitLines = members.map((member: any, index: number) => ({
                split_group_id: createdSplitGroupId,
                user_id: member.user_id,
                amount_cents: amountPerMember + (index === 0 ? remainder : 0),
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              }));
            } else if (splitType === "amount") {
              const cents = customSplits!.memberSplits.map((split) =>
                Math.max(0, Math.round((split.amount || 0) * 100)),
              );
              const sumCents = cents.reduce((sum, v) => sum + v, 0);
              const diff = effectiveAmountCents - sumCents;
              if (diff !== 0 && cents.length > 0) {
                cents[cents.length - 1] = Math.max(
                  0,
                  cents[cents.length - 1] + diff,
                );
              }
              splitLines = customSplits!.memberSplits.map((split, index) => ({
                split_group_id: createdSplitGroupId,
                user_id: split.userId,
                amount_cents: cents[index] ?? 0,
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              }));
            } else if (splitType === "percentage") {
              const weights = customSplits!.memberSplits.map(
                (split) => split.percentage || 0,
              );
              const allocatedCents = allocateCentsByWeights(
                effectiveAmountCents,
                weights,
              );
              splitLines = customSplits!.memberSplits.map((split, index) => ({
                split_group_id: createdSplitGroupId,
                user_id: split.userId,
                amount_cents: allocatedCents[index] ?? 0,
                percentage: split.percentage,
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              }));
            } else if (splitType === "shares") {
              const weights = customSplits!.memberSplits.map((split) => {
                const shares =
                  typeof split.shares === "number"
                    ? Math.trunc(split.shares)
                    : 0;
                return shares > 0 ? shares : 0;
              });
              const allocatedCents = allocateCentsByWeights(
                effectiveAmountCents,
                weights,
              );
              if (weights.reduce((sum, v) => sum + v, 0) > 0) {
                splitLines = customSplits!.memberSplits.map((split, index) => {
                  const shares =
                    typeof split.shares === "number"
                      ? Math.trunc(split.shares)
                      : 0;
                  return {
                    split_group_id: createdSplitGroupId,
                    user_id: split.userId,
                    amount_cents: allocatedCents[index] ?? 0,
                    // DB constraint: shares must be > 0 when present; treat <= 0 as excluded (null).
                    shares: shares > 0 ? shares : null,
                    is_settled: false,
                    settled_at: null,
                    created_at: new Date().toISOString(),
                  };
                });
              }
            }

            if (splitLines.length > 0) {
              const { error: splitLinesError } = await supabase
                .from("expense_split_lines")
                .insert(splitLines);

              if (!splitLinesError) {
                updates.split_group_id = createdSplitGroupId;
              }
            }
          }
        }
      }
    }

    // Optionally update an existing household split group when requested.
    // This is separate from initial split group creation and is only allowed
    // when the expense already has a split_group_id and no lines have been
    // settled yet (to preserve settlement history correctness).
    const wantsSplitUpdate =
      !!expenseHouseholdId &&
      !isPortfolioHousehold &&
      !!existingSplitGroupId &&
      !!splitUpdate &&
      !!splitUpdate.memberSplits &&
      splitUpdate.memberSplits.length > 0;

    if (wantsSplitUpdate) {
      if (!splitUpdate) {
        return errorResponse(
          "Invalid split update payload",
          "VALIDATION_ERROR",
        );
      }

      // Safety guard: split updates only make sense for household expenses
      if (!expenseHouseholdId) {
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
            "id, household_id, total_amount_cents, currency, split_type, expense_split_lines(is_settled)",
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

      if ((existingGroup as any).household_id !== expenseHouseholdId) {
        console.warn(
          "[update-expense] Split group household mismatch during update",
          {
            expenseHouseholdId,
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
        .eq("household_id", expenseHouseholdId);

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

      // Delete existing lines before inserting the new configuration
      const { error: deleteLinesError } = await supabase
        .from("expense_split_lines")
        .delete()
        .eq("split_group_id", existingSplitGroupId);

      if (deleteLinesError) {
        console.error(
          "[update-expense] Failed to delete existing split lines for update:",
          deleteLinesError,
        );
        return errorResponse("Failed to update splits", "SERVER_ERROR", 500);
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

      if (updatedSplitLines.length > 0) {
        const { error: insertUpdatedLinesError } = await supabase
          .from("expense_split_lines")
          .insert(updatedSplitLines);

        if (insertUpdatedLinesError) {
          console.error(
            "[update-expense] Failed to insert updated split lines:",
            insertUpdatedLinesError,
          );
          return errorResponse("Failed to update splits", "SERVER_ERROR", 500);
        }
      }

      // Keep split group metadata in sync with any amount/currency changes
      const splitGroupUpdates: Record<string, unknown> = {};
      if (typeof updates.amount_cents === "number") {
        splitGroupUpdates.total_amount_cents = updates.amount_cents;
      }

      const newGroupCurrency =
        updates.currency ||
        ((existingGroup as any).currency as string | null) ||
        null;
      if (newGroupCurrency) {
        splitGroupUpdates.currency = newGroupCurrency;
      }

      if (Object.keys(splitGroupUpdates).length > 0) {
        const { error: splitGroupUpdateError } = await supabase
          .from("expense_split_groups")
          .update(splitGroupUpdates)
          .eq("id", existingSplitGroupId);

        if (splitGroupUpdateError) {
          console.error(
            "[update-expense] Failed to update split group metadata:",
            splitGroupUpdateError,
          );
          return errorResponse(
            "Failed to update expense splits",
            "SERVER_ERROR",
            500,
          );
        }
      }
    }

    // Update payer on existing split group if requested
    const targetSplitGroupId = createdSplitGroupId ?? existingSplitGroupId;
    if (normalizedPayerUserId && targetSplitGroupId) {
      const { error: payerUpdateError } = await supabase
        .from("expense_split_groups")
        .update({ payer_user_id: normalizedPayerUserId })
        .eq("id", targetSplitGroupId);
      if (payerUpdateError) {
        console.error(
          "[update-expense] Failed to update payer_user_id on split group:",
          payerUpdateError,
        );
        return errorResponse(
          "Failed to update expense payer",
          "SERVER_ERROR",
          500,
        );
      }
    }

    // Update expense
    const { data: updatedExpense, error: updateError } = await supabase
      .from("expenses")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", normalizedExpenseId)
      .select()
      .single();

    if (updateError) {
      console.error("[update-expense] Update error:", updateError);
      if (updateError.code === "22P02") {
        return errorResponse("Invalid expenseId format", "VALIDATION_ERROR");
      }
      return errorResponse("Failed to update expense", "SERVER_ERROR", 500);
    }

    console.log(
      `[update-expense] Successfully updated expense ${normalizedExpenseId} for user ${userId}`,
    );

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
      meta: resolvedIdentityMeta,
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
    return errorResponse(
      error instanceof Error ? error.message : "An unexpected error occurred",
      "SERVER_ERROR",
      500,
    );
  }
});
