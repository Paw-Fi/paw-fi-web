// Supabase Edge Function: save-income
// Saves income transaction to database with privacy controls and household sharing
// Extends unified transaction system (expenses table with type='income')

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
  createHouseholdAutoSplitForTransaction,
  type CustomSplits,
  fetchHouseholdAutoSplitSettings,
  type HouseholdAutoSplitSettings,
  type HouseholdMemberRow,
} from "../shared/household-auto-split.ts";
import { normalizeClientCreatedAt } from "../shared/transaction-request-validation.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function resolveErrorCode(status: number): string {
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status >= 500) return "SERVER_ERROR";
  return "VALIDATION_ERROR";
}

function normalizeClientMutationKey(body: RequestBody): string | null {
  const explicitKey = body.idempotencyKey?.trim();
  if (explicitKey) return explicitKey;

  const mutationId = body.clientMutationId?.trim();
  if (mutationId) return mutationId;

  return null;
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

interface RequestBody {
  userId: string; // User ID (required)
  amount: number; // Amount in major units (required, must be > 0)
  category: string; // Category name (required, e.g., 'income:salary')
  currency: string; // ISO currency code (required)
  date: string; // ISO date (YYYY-MM-DD) or ISO datetime (YYYY-MM-DDTHH:mm:ss)
  clientCreatedAt?: string; // Optional client-side timestamp with timezone (ISO)
  description?: string; // Optional description/note
  merchant?: string; // Optional merchant/payee (used for both expense and income)
  ownerType?: "me" | "partner" | "household"; // Owner attribution (default: 'me')
  privacyScope?: "private" | "balances_only" | "full"; // Visibility scope (default: 'full')
  householdId?: string; // If provided, share with this household
  isPortfolio?: boolean; // If true, treat as personal even with householdId
  customSplits?: CustomSplits; // Optional household split configuration
  payerUserId?: string; // Optional explicit recipient/payer for household split
  accountId?: string; // Optional financial account id
  fxRate?: number; // Optional FX rate for currency normalization
  clientRecordId?: string; // Optional client-generated optimistic record id
  clientMutationId?: string; // Optional client-generated mutation id
  idempotencyKey?: string; // Optional idempotency key for deduplication
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>; // Optional attachments
  isRecurring?: boolean; // Whether this is a recurring income (v1.5)
  recurrence_rule?: {
    // Recurrence configuration (v1.5)
    frequency:
      | "daily"
      | "weekly"
      | "biweekly"
      | "monthly"
      | "yearly"
      | "custom";
    anchor_date: string;
    end_date?: string;
    interval?: number;
    reminder?: {
      // Optional reminder configuration (v1.6)
      enabled: boolean;
      value: number; // How many days/hours before
      unit: "days" | "hours";
    };
  };
  recurrenceRule?: {
    // Legacy camelCase recurrence configuration
    frequency:
      | "daily"
      | "weekly"
      | "biweekly"
      | "monthly"
      | "yearly"
      | "custom";
    anchor_date: string;
    end_date?: string;
    interval?: number;
    reminder?: {
      // Optional reminder configuration (v1.6)
      enabled: boolean;
      value: number; // How many days/hours before
      unit: "days" | "hours";
    };
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    // Parse request body
    const body: RequestBody = await req.json();

    // Avoid logging full body as it may contain sensitive user data.
    console.log("[save-income] isRecurring:", body.isRecurring);
    const legacyRecurrenceRule =
      body.recurrence_rule ?? (body as any).recurrenceRule;
    if (legacyRecurrenceRule && !body.recurrence_rule) {
      body.recurrence_rule =
        legacyRecurrenceRule as RequestBody["recurrence_rule"];
    }

    console.log("[save-income] has recurrence_rule:", !!body.recurrence_rule);

    const rawCategory = String(body.category ?? "");
    const sanitizedCategory = sanitizeCategoryName(rawCategory);
    const resolvedCategory =
      sanitizedCategory ?? normalizeCategoryForStorage(body.category);
    let effectiveCategory = resolvedCategory;
    if (!sanitizedCategory && rawCategory.trim().length > 0) {
      await reportEdgeFunctionError({
        functionName: "save-income",
        error: new Error("CATEGORY_SANITIZE_FALLBACK"),
        context: {
          rawCategory,
          finalCategory: resolvedCategory,
        },
      });
    }

    console.log("[save-income] Incoming request:", {
      userId: "[redacted]",
      amount: body.amount,
      category: resolvedCategory,
      householdId: body.householdId,
      privacyScope: body.privacyScope,
      isRecurring: body.isRecurring,
      hasRecurrenceRule: !!body.recurrence_rule,
    });

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse("Server configuration error", 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-save-income" } },
    });

    // For non-GPT callers:
    // - allow internal service calls (WhatsApp bot) with a shared secret
    // - allow normal user JWT callers
    const authResult = await authenticateUserOrInternalSecret(req, supabase);
    if (!authResult.success) {
      return errorResponse(
        authResult.error ?? "Authentication required",
        authResult.statusCode ?? 401,
      );
    }

    const userId = authResult.isInternalService
      ? sanitizeUuid(body.userId)
      : authResult.userId;

    if (!userId) {
      return errorResponse("Valid userId is required", 400);
    }

    if (!authResult.isInternalService && !sanitizedCategory) {
      return errorResponse("Invalid category", 400, "VALIDATION_ERROR");
    }

    try {
      const remaps = await fetchUserCategoryRemaps({
        supabase,
        userId,
        limit: 120,
      });
      effectiveCategory = applyCategoryRemap({
        categoryName: resolvedCategory,
        transactionType: "income",
        remaps,
      });
    } catch (error) {
      console.error("[save-income] Failed to apply category remaps:", error);
    }

    console.log("[save-income] Effective category after remaps:", {
      initial: resolvedCategory,
      final: effectiveCategory,
    });

    if (typeof body.amount !== "number" || !Number.isFinite(body.amount)) {
      return errorResponse("Valid amount is required", 400);
    }

    const normalizedAmount = Math.abs(body.amount);
    if (normalizedAmount <= 0) {
      return errorResponse("Valid amount is required", 400);
    }

    if (!body.category) {
      return errorResponse("Category is required", 400);
    }

    if (!body.date) {
      return errorResponse("Date is required", 400);
    }

    if (body.merchant !== undefined && body.merchant !== null) {
      if (typeof body.merchant !== "string") {
        return errorResponse("merchant must be a string", 400);
      }
      if (body.merchant.trim().length > 255) {
        return errorResponse("merchant must be less than 256 characters", 400);
      }
    }

    const normalizedMerchant =
      typeof body.merchant === "string" && body.merchant.trim().length > 0
        ? body.merchant.trim()
        : null;
    const normalizedIdempotencyKey = normalizeClientMutationKey(body);

    const normalizedDate = normalizeCalendarDateString(body.date);
    if (!normalizedDate) {
      return errorResponse("date must be a valid calendar date", 400);
    }
    body.date = normalizedDate;

    const normalizedClientCreatedAt = normalizeClientCreatedAt(
      body.clientCreatedAt,
    );
    if (!normalizedClientCreatedAt) {
      return errorResponse(
        "clientCreatedAt must be an ISO timestamp with timezone",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (body.recurrence_rule) {
      const normalizedAnchorDate = normalizeCalendarDateString(
        body.recurrence_rule.anchor_date,
      );
      if (!normalizedAnchorDate) {
        return errorResponse(
          "recurrence_rule.anchor_date must be a valid calendar date",
          400,
        );
      }

      const normalizedEndDate =
        body.recurrence_rule.end_date == null
          ? undefined
          : normalizeCalendarDateString(body.recurrence_rule.end_date);

      if (body.recurrence_rule.end_date != null && !normalizedEndDate) {
        return errorResponse(
          "recurrence_rule.end_date must be a valid calendar date",
          400,
        );
      }

      body.recurrence_rule = {
        ...body.recurrence_rule,
        anchor_date: normalizedAnchorDate,
        ...(normalizedEndDate ? { end_date: normalizedEndDate } : {}),
      };
    }

    // Validate privacy scope
    const privacyScope = body.privacyScope || "full";
    if (!["private", "balances_only", "full"].includes(privacyScope)) {
      return errorResponse(
        "Invalid privacy scope. Must be: private, balances_only, or full",
        400,
      );
    }

    // Validate owner type
    const ownerType = body.ownerType || "me";
    if (!["me", "partner", "household"].includes(ownerType)) {
      return errorResponse(
        "Invalid owner type. Must be: me, partner, or household",
        400,
      );
    }

    // Validate and normalize currency
    const currency = validateCurrency(body.currency || "USD");

    const isPortfolio = body.isPortfolio === true;

    // Resolve user contact
    let contactId: string | null = null;

    const { data: contact, error: contactError } = await supabase
      .from("user_contacts")
      .select("id, preferred_currency")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contactError) {
      console.error(
        "[save-income] Failed to look up user contact:",
        contactError,
      );
      return errorResponse("Failed to resolve user contact", 500);
    }

    if (contact) {
      contactId = contact.id;
      // Update preferred currency if not set
      if (!contact.preferred_currency && currency) {
        await supabase
          .from("user_contacts")
          .update({ preferred_currency: currency })
          .eq("id", contact.id);
      }
    } else {
      console.log(
        "[save-income] No user_contact row found for user; proceeding with null contact_id (non-WhatsApp user).",
        {
          userId,
        },
      );
    }

    const requestedHouseholdId = sanitizeUuid(body.householdId ?? null);
    if (body.householdId && !requestedHouseholdId) {
      return errorResponse("Valid householdId is required", 400);
    }

    let resolvedHouseholdId: string | null = null;
    let warningMessage: string | null = null;
    let householdMembers: HouseholdMemberRow[] = [];
    let householdAutoSplitSettings: HouseholdAutoSplitSettings = {
      autoSplitEnabled: true,
      defaultConfig: null,
    };

    // Household mode requires membership; if not a member we store as personal and
    // return a warning (matching save-expense behavior).
    if (requestedHouseholdId) {
      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", requestedHouseholdId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError) {
        console.error(
          "[save-income] Failed to verify household membership:",
          membershipError,
        );
        return errorResponse("Failed to verify household membership", 500);
      }

      if (membership) {
        resolvedHouseholdId = requestedHouseholdId;

        const { data: members, error: membersError } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", requestedHouseholdId);
        if (membersError) {
          console.error(
            "[save-income] Failed to load household members:",
            membersError,
          );
        } else if (Array.isArray(members)) {
          householdMembers = members;
          householdAutoSplitSettings = await fetchHouseholdAutoSplitSettings(
            supabase,
            requestedHouseholdId,
          );
        }
      } else {
        warningMessage = "Income saved but not shared (not a household member)";
      }
    }

    // Convert amount to cents
    const amountCents = Math.round(normalizedAmount * 100);

    let accountId: string | null = null;
    if (body.accountId) {
      const isInScope = await assertAccountInScope(supabase, body.accountId, {
        userId,
        householdId: resolvedHouseholdId,
        currency,
      });
      if (!isInScope) {
        return errorResponse(
          "Provided accountId does not belong to this scope or currency",
          400,
          "VALIDATION_ERROR",
        );
      } else {
        accountId = body.accountId;
      }
    } else {
      accountId = await resolveDefaultAccountId(supabase, {
        userId,
        householdId: resolvedHouseholdId,
        currency,
      });
    }

    // Build income record
    const incomeRecord: any = {
      contact_id: contactId,
      user_id: userId,
      type: "income", // CRITICAL: Set transaction type to income
      amount_cents: amountCents,
      category: effectiveCategory,
      date: body.date,
      raw_text: body.description || "",
      merchant: normalizedMerchant,
      currency: currency,
      owner_type: ownerType,
      privacy_scope: privacyScope,
      created_at: normalizedClientCreatedAt,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      is_recurring: body.isRecurring || false,
      recurrence_rule: body.recurrence_rule || null, // Don't stringify - Supabase handles JSONB automatically
      account_id: accountId,
      idempotency_key: normalizedIdempotencyKey,
    };

    // Add household reference if resolved (portfolio uses household_id as a private space scope)
    if (resolvedHouseholdId) {
      incomeRecord.household_id = resolvedHouseholdId;

      // Add FX rate for normalization (if provided)
      if (body.fxRate) {
        incomeRecord.fx_rate = body.fxRate;
      }
    }

    // Check for duplicate (idempotency)
    if (normalizedIdempotencyKey) {
      let existingIncomeQuery = supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .eq("idempotency_key", normalizedIdempotencyKey)
        .is("deleted_at", null)
        .limit(1);

      existingIncomeQuery = resolvedHouseholdId
        ? existingIncomeQuery.eq("household_id", resolvedHouseholdId)
        : existingIncomeQuery.is("household_id", null);

      const { data: existingIncomeRows, error: existingIncomeError } =
        await existingIncomeQuery;

      if (existingIncomeError) {
        console.error(
          "[save-income] Failed to check idempotency key:",
          existingIncomeError,
        );
        return errorResponse(
          "Failed to check duplicate income",
          500,
          "SERVER_ERROR",
        );
      }

      const existingIncome = existingIncomeRows?.[0] ?? null;
      if (existingIncome) {
        console.log(
          "[save-income] Duplicate detected (idempotency), returning existing:",
          existingIncome.id,
        );
        return new Response(
          JSON.stringify({
            success: true,
            data: existingIncome,
            duplicate: true,
            message: "Income already exists (idempotency key matched)",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Insert income into expenses table (with type='income')
    const { data: income, error: incomeError } = await supabase
      .from("expenses")
      .insert(incomeRecord)
      .select()
      .single();

    if (incomeError) {
      console.error("[save-income] Error saving income:", incomeError);
      return errorResponse("Failed to save income", 500, "SERVER_ERROR");
    }

    console.log("[save-income] Income saved successfully:", income.id);

    let responseIncome = income;
    let splitSkipped = false;

    if (resolvedHouseholdId && !isPortfolio) {
      const splitResult = await createHouseholdAutoSplitForTransaction({
        supabase,
        householdId: resolvedHouseholdId,
        transaction: income as Record<string, unknown>,
        actorUserId: userId,
        members: householdMembers,
        settings: householdAutoSplitSettings,
        explicitCustomSplits: body.customSplits,
        payerUserId: body.payerUserId ?? null,
      });

      if (splitResult.kind === "created") {
        responseIncome = splitResult.transaction;
      } else if (splitResult.kind === "skipped") {
        splitSkipped = true;
        warningMessage =
          warningMessage ?? "Income saved to household without split lines";
      } else if (splitResult.kind === "invalid") {
        console.warn("[save-income] Invalid household split payload:", {
          code: splitResult.code,
          error: splitResult.error,
        });
        warningMessage = warningMessage ?? splitResult.error;
      } else if (splitResult.kind === "failed") {
        console.error(
          "[save-income] Failed to create household split:",
          splitResult.error,
        );
        warningMessage =
          warningMessage ?? "Income saved but split group creation failed";
      }
    }

    // Learn/ensure custom category + preference mapping for future AI categorization
    try {
      await ensureUserCategory({
        supabase,
        userId,
        categoryName: responseIncome.category ?? body.category,
        transactionType: "income",
      });
      await learnUserCategoryPreference({
        supabase,
        userId,
        transactionType: "income",
        categoryName: responseIncome.category ?? body.category,
        sourceText: normalizedMerchant,
        descriptionText: body.description || responseIncome.raw_text || null,
      });
    } catch (e) {
      console.error(
        "[save-income] Failed to learn category preference (non-blocking):",
        e,
      );
    }

    // If household income, create notification for household members (portfolio skips sharing/notifications)
    if (resolvedHouseholdId && !isPortfolio) {
      console.log(
        "[save-income] Creating household notifications for income:",
        resolvedHouseholdId,
      );

      // Resolve actor display name for notification
      let actorName = "Someone";
      const { data: appUser } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      if (appUser?.full_name && String(appUser.full_name).trim().length > 0) {
        actorName = appUser.full_name as string;
      }

      // Create notifications for all household members EXCEPT the creator
      // Note: Using notify_household_members_expense function which works for both expenses and income
      const { error: notifyError } = await supabase.rpc(
        "notify_household_members_expense",
        {
          p_household_id: resolvedHouseholdId,
          p_expense_id: income.id,
          p_actor_user_id: userId,
          p_event_type: "income_added", // New event type for income
          p_expense_data: {
            actor_name: actorName,
            amount_cents: amountCents,
            currency: currency,
            category: responseIncome.category ?? effectiveCategory,
            source: normalizedMerchant || "",
            note: body.description || "",
            privacy_scope: privacyScope,
            owner_type: ownerType,
            is_recurring: body.isRecurring === true,
          },
        },
      );

      if (notifyError) {
        console.error(
          "[save-income] Error creating notifications:",
          notifyError,
        );
        // Don't fail the request, just log the error
      } else {
        console.log(
          "[save-income] Notifications created for household members",
        );
      }
    }

    // Return saved income
    return new Response(
      JSON.stringify({
        success: true,
        data: responseIncome,
        shared: !!resolvedHouseholdId && !isPortfolio,
        splitSkipped,
        privacyScope: privacyScope,
        ownerType: ownerType,
        ...(warningMessage ? { warning: warningMessage } : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[save-income] Error:", error);
    await reportEdgeFunctionError({
      functionName: "save-income",
      error,
      context: {
        step: "unhandled",
      },
    });
    return errorResponse("Failed to save income", 500, "SERVER_ERROR");
  }
});
