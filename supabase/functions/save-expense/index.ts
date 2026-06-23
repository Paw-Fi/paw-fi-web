// Supabase Edge Function: save-expense
// Saves confirmed expense to database
// Optionally creates household split if householdId provided

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
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
  buildHouseholdSplitRecords,
  type CustomSplits,
  fetchHouseholdAutoSplitSettings,
  resolveEffectiveSplit,
} from "../shared/household-auto-split.ts";
import {
  normalizeClientCreatedAt,
  normalizeReceiptImageUrl,
} from "../shared/transaction-request-validation.ts";

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
  userId?: string; // User ID (optional when request originates from GPT)
  amount: number; // Amount in major units
  category: string; // Category name
  currency: string; // ISO currency code
  date: string; // ISO date (YYYY-MM-DD) or ISO datetime (YYYY-MM-DDTHH:mm:ss)
  clientCreatedAt?: string; // Optional client-side timestamp with timezone (ISO)
  description?: string; // Optional description/note
  merchant?: string; // Optional merchant/payee
  breakdown?: string[]; // Optional receipt line items
  receiptImageUrl?: string; // Optional receipt image URL
  householdId?: string; // If provided, share with this household
  isPortfolio?: boolean; // If true, treat as personal even with householdId
  customSplits?: CustomSplits; // Custom split configuration (optional)
  isRecurring?: boolean; // Whether this is a recurring expense (v1.5)
  clientRecordId?: string; // Optional client-generated optimistic record id
  clientMutationId?: string; // Optional client-generated mutation id
  idempotencyKey?: string; // Optional mutation dedupe key
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
  payerUserId?: string; // Optional explicit payer for household split
  accountId?: string; // Optional financial account
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

    const detection = detectGptRequest(req);

    let userId = sanitizeUuid(body.userId ?? null);

    if (body.userId && !userId) {
      console.warn(
        "[save-expense] Ignoring invalid userId provided in payload",
        {
          provided: body.userId,
          conversationId: detection.conversationId,
        },
      );
    }

    // For non-GPT requests, derive user from JWT OR allow internal callers.
    // NEVER trust userId from body unless the request is authenticated as internal.

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

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse("Server configuration error", 500);
    }

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

    const receiptImageUrlResult = normalizeReceiptImageUrl(
      body.receiptImageUrl,
      SUPABASE_URL,
      "receiptImageUrl",
    );
    if (!receiptImageUrlResult.ok) {
      return errorResponse(
        receiptImageUrlResult.error ?? "Invalid receiptImageUrl",
        400,
        "VALIDATION_ERROR",
      );
    }
    const normalizedReceiptImageUrl = receiptImageUrlResult.value;

    // Validate and normalize currency
    const currency = validateCurrency(body.currency || "USD");
    const resolvedUserMetadata: Record<string, unknown> = {};
    if (detection.conversationId) {
      resolvedUserMetadata.conversationId = detection.conversationId;
    }
    if (detection.ephemeralUserId) {
      resolvedUserMetadata.ephemeralUserId = detection.ephemeralUserId;
    }

    const isPortfolio = body.isPortfolio === true;
    const requestedHouseholdId = sanitizeUuid(body.householdId ?? null);
    if (body.householdId && !requestedHouseholdId) {
      return errorResponse("Valid householdId is required", 400);
    }
    const rawCategory = String(body.category ?? "");
    const sanitizedCategory = sanitizeCategoryName(rawCategory);
    if (!detection.isGpt && !sanitizedCategory) {
      return errorResponse("Invalid category", 400, "VALIDATION_ERROR");
    }
    const resolvedCategory =
      sanitizedCategory ?? normalizeCategoryForStorage(body.category);
    let effectiveCategory = resolvedCategory;
    if (!sanitizedCategory && rawCategory.trim().length > 0) {
      await reportEdgeFunctionError({
        functionName: "save-expense",
        error: new Error("CATEGORY_SANITIZE_FALLBACK"),
        context: {
          rawCategory,
          finalCategory: resolvedCategory,
        },
      });
    }

    console.log("[save-expense] Saving expense:", {
      userId,
      amount: normalizedAmount,
      category: resolvedCategory,
      currency,
      householdId: requestedHouseholdId,
      isPortfolio,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-save-expense" } },
    });

    let contactId: string | null = null;

    if (!detection.isGpt) {
      const authResult = await authenticateUserOrInternalSecret(req, supabase);
      if (!authResult.success) {
        const internalHeaderPresent = !!req.headers.get(
          "X-Moneko-Internal-Key",
        );
        const authHeaderPresent = !!req.headers.get("Authorization");
        console.error("[save-expense] Authentication rejected", {
          reason: authResult.error || "Unauthorized",
          statusCode: authResult.statusCode ?? 401,
          internalHeaderPresent,
          authHeaderPresent,
          hasUserIdInBody: !!userId,
          detection: {
            isGpt: detection.isGpt,
            conversationId: detection.conversationId || null,
          },
        });
        return errorResponse(
          authResult.error || "Unauthorized",
          authResult.statusCode ?? 401,
        );
      }

      if (authResult.isInternalService) {
        if (!userId) {
          return errorResponse("userId is required", 400);
        }
      } else {
        userId = authResult.userId ?? null;
      }
    }

    if (userId) {
      const { data: contact, error: contactError } = await supabase
        .from("user_contacts")
        .select("id, preferred_currency")
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contactError) {
        console.error(
          "[save-expense] Failed to look up user contact:",
          contactError,
        );
        return errorResponse("Failed to resolve user contact", 500);
      }

      if (contact) {
        contactId = contact.id;
        if (!contact.preferred_currency && currency) {
          const { error: updateCurrencyError } = await supabase
            .from("user_contacts")
            .update({ preferred_currency: currency })
            .eq("id", contact.id);
          if (updateCurrencyError) {
            console.error(
              "[save-expense] Failed to update contact currency:",
              updateCurrencyError,
            );
          }
        }
      } else {
        console.log(
          "[save-expense] No user_contact row found for user; proceeding with null contact_id (non-WhatsApp user).",
          {
            userId,
          },
        );
      }
    }

    if (!contactId && detection.isGpt && detection.conversationId) {
      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId: detection.conversationId,
          currency,
        });
        userId = guestIdentity.userId;
        contactId = guestIdentity.contactId;
        console.log("[save-expense] Resolved GPT guest identity", {
          conversationId: detection.conversationId,
          userId,
          contactId,
        });
        resolvedUserMetadata.guest = {
          createdUser: guestIdentity.createdUser,
          createdContact: guestIdentity.createdContact,
        };
      } catch (identityError) {
        console.error(
          "[save-expense] Failed to resolve GPT guest identity:",
          identityError,
        );
        return errorResponse("Failed to prepare GPT guest user", 500);
      }
    }

    if (!userId) {
      return errorResponse("Unable to resolve user identity", 400);
    }

    try {
      const remaps = await fetchUserCategoryRemaps({
        supabase,
        userId,
        limit: 120,
      });
      effectiveCategory = applyCategoryRemap({
        categoryName: resolvedCategory,
        transactionType: "expense",
        remaps,
      });
    } catch (error) {
      console.error("[save-expense] Failed to apply category remaps:", error);
    }

    console.log("[save-expense] Effective category after remaps:", {
      initial: resolvedCategory,
      final: effectiveCategory,
    });

    // Convert amount to cents
    const amountCents = Math.round(normalizedAmount * 100);

    async function resolveScopedAccountId(
      scopeHouseholdId: string | null,
    ): Promise<string | null> {
      if (body.accountId) {
        const isInScope = await assertAccountInScope(supabase, body.accountId, {
          userId: userId as string,
          householdId: scopeHouseholdId,
          currency,
        });
        if (!isInScope) {
          throw new Error("ACCOUNT_SCOPE_MISMATCH");
        }
        return body.accountId;
      }

      return await resolveDefaultAccountId(supabase, {
        userId: userId as string,
        householdId: scopeHouseholdId,
        currency,
      });
    }

    let resolvedSharedHouseholdId: string | null = null;
    if (requestedHouseholdId) {
      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", requestedHouseholdId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError) {
        console.error(
          "[save-expense] Failed to verify household membership:",
          membershipError,
        );
        return errorResponse("Failed to verify household membership", 500);
      }

      if (membership) {
        if (!isPortfolio) {
          resolvedSharedHouseholdId = requestedHouseholdId;
        }
      } else if (isPortfolio) {
        return errorResponse("Forbidden household scope", 403, "UNAUTHORIZED");
      }
    }

    const insertScopeHouseholdId = isPortfolio
      ? requestedHouseholdId
      : resolvedSharedHouseholdId;

    let preliminaryAccountId: string | null = null;
    try {
      preliminaryAccountId = await resolveScopedAccountId(
        insertScopeHouseholdId,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "ACCOUNT_SCOPE_MISMATCH"
      ) {
        return errorResponse(
          "Provided accountId does not belong to this scope or currency",
          400,
          "VALIDATION_ERROR",
        );
      } else {
        throw error;
      }
    }

    console.log("[save-expense] Insert scope resolved:", {
      requestedHouseholdId,
      resolvedSharedHouseholdId,
      insertScopeHouseholdId,
      preliminaryAccountId,
    });

    if (normalizedIdempotencyKey) {
      let existingExpenseQuery = supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .eq("idempotency_key", normalizedIdempotencyKey)
        .is("deleted_at", null)
        .limit(1);

      existingExpenseQuery = insertScopeHouseholdId
        ? existingExpenseQuery.eq("household_id", insertScopeHouseholdId)
        : existingExpenseQuery.is("household_id", null);

      const { data: existingExpenses, error: existingExpenseError } =
        await existingExpenseQuery;

      if (existingExpenseError) {
        console.error(
          "[save-expense] Failed to check idempotency key:",
          existingExpenseError,
        );
        return errorResponse(
          "Failed to check duplicate expense",
          500,
          "SERVER_ERROR",
        );
      }

      const existingExpense = existingExpenses?.[0] ?? null;
      if (existingExpense) {
        console.log(
          "[save-expense] Duplicate detected (idempotency), returning existing:",
          existingExpense.id,
        );
        return new Response(
          JSON.stringify({
            success: true,
            data: existingExpense,
            duplicate: true,
            message: "Expense already exists (idempotency key matched)",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Insert expense into expenses table
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        contact_id: contactId,
        user_id: userId,
        amount_cents: amountCents,
        category: effectiveCategory,
        date: body.date,
        raw_text: body.description || "",
        merchant: normalizedMerchant,
        currency: currency,
        breakdown: body.breakdown ?? null,
        receipt_image_url: normalizedReceiptImageUrl,
        created_at: normalizedClientCreatedAt,
        is_recurring: body.isRecurring || false,
        recurrence_rule: body.recurrence_rule || null, // Don't stringify - Supabase handles JSONB automatically
        household_id: insertScopeHouseholdId,
        account_id: preliminaryAccountId,
        idempotency_key: normalizedIdempotencyKey,
      })
      .select()
      .single();

    if (expenseError) {
      console.error("[save-expense] Error saving expense:", expenseError);
      return errorResponse("Failed to save expense", 500, "SERVER_ERROR");
    }

    console.log("[save-expense] Expense saved:", expense.id);

    // Learn/ensure custom category + preference mapping for future AI categorization
    try {
      await ensureUserCategory({
        supabase,
        userId,
        categoryName: expense.category ?? body.category,
        transactionType: "expense",
      });
      await learnUserCategoryPreference({
        supabase,
        userId,
        transactionType: "expense",
        categoryName: expense.category ?? body.category,
        descriptionText: body.description || expense.raw_text || null,
      });
    } catch (e) {
      console.error(
        "[save-expense] Failed to learn category preference (non-blocking):",
        e,
      );
    }

    // GPT requests do not support household functionality
    if (detection.isGpt) {
      console.log("[save-expense] GPT request - household features disabled");
      return new Response(
        JSON.stringify({
          success: true,
          data: expense,
          shared: false,
          resolvedUserId: userId,
          meta: resolvedUserMetadata,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Resolve actor display name for notification title
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

    // If householdId provided, create household split unless this is a portfolio.
    let responseExpense = expense;

    if (body.householdId && isPortfolio) {
      return new Response(
        JSON.stringify({
          success: true,
          data: responseExpense,
          shared: false,
          resolvedUserId: userId,
          meta: resolvedUserMetadata,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.householdId) {
      console.log(
        "[save-expense] Creating household split for household:",
        body.householdId,
      );

      // Verify user is member of household
      const { data: membership } = await supabase
        .from("household_members")
        .select("id, role")
        .eq("household_id", body.householdId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        console.error(
          "[save-expense] User is not a member of household:",
          body.householdId,
        );
        // Still return success for expense, just log warning
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: "Expense saved but not shared (not a household member)",
            resolvedUserId: userId,
            meta: resolvedUserMetadata,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get all household members
      const { data: members } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", body.householdId);

      if (!members || members.length === 0) {
        console.error("[save-expense] No active members in household");
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: "Expense saved but not shared (no active members)",
            resolvedUserId: userId,
            meta: resolvedUserMetadata,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Resolve effective split configuration from explicit payload + household defaults.
      const autoSplitSettings = await fetchHouseholdAutoSplitSettings(
        supabase,
        body.householdId,
      );
      const effectiveSplit = resolveEffectiveSplit(
        body.customSplits,
        autoSplitSettings,
      );
      console.log("[save-expense] Auto-split decision:", {
        householdId: body.householdId,
        autoSplitEnabled: autoSplitSettings.autoSplitEnabled,
        hasDefaultConfig: autoSplitSettings.defaultConfig != null,
        hasRequestCustomSplits: body.customSplits != null,
        decision: effectiveSplit.kind,
      });

      if (effectiveSplit.kind === "skip") {
        console.log(
          "[save-expense] Auto-split disabled for household; logging expense without split group",
        );

        // Still notify the household so members see the activity, even though
        // we're intentionally not creating split records.
        const { error: notifyError } = await supabase.rpc(
          "notify_household_members_expense",
          {
            p_household_id: body.householdId,
            p_expense_id: expense.id,
            p_actor_user_id: userId,
            p_event_type: "expense_added",
            p_expense_data: {
              actor_name: actorName,
              amount_cents: amountCents,
              currency: currency,
              category: expense.category ?? effectiveCategory,
              note: body.description || "",
              is_recurring: body.isRecurring === true,
            },
          },
        );
        if (notifyError) {
          console.error(
            "[save-expense] Error creating notifications (auto-split skipped):",
            notifyError,
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            shared: true,
            splitSkipped: true,
            resolvedUserId: userId,
            meta: resolvedUserMetadata,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const buildResult = buildHouseholdSplitRecords({
        householdId: body.householdId,
        transactionId: expense.id,
        payerUserId: sanitizeUuid(body.payerUserId ?? null) || userId,
        amountCents,
        currency,
        description: body.description || null,
        members,
        customSplits: effectiveSplit.customSplits,
      });
      if (!buildResult.ok) {
        console.error("[save-expense] Invalid household split payload:", {
          code: buildResult.code,
          error: buildResult.error,
        });
        return errorResponse(buildResult.error, 400);
      }
      const splitType = buildResult.group.split_type;

      // Create expense split group
      const { data: splitGroup, error: splitGroupError } = await supabase
        .from("expense_split_groups")
        .insert(buildResult.group)
        .select()
        .single();

      if (splitGroupError) {
        console.error(
          "[save-expense] Error creating split group:",
          splitGroupError,
        );
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: "Expense saved but split group creation failed",
            resolvedUserId: userId,
            meta: resolvedUserMetadata,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        "[save-expense] Split group created:",
        splitGroup.id,
        "with type:",
        splitType,
      );

      const { error: splitLinesError } = await supabase
        .from("expense_split_lines")
        .insert(buildResult.lines);

      if (splitLinesError) {
        console.error(
          "[save-expense] Error creating split lines:",
          splitLinesError,
        );
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: "Expense saved but split lines creation failed",
            resolvedUserId: userId,
            meta: resolvedUserMetadata,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        "[save-expense] Split lines created for",
        members.length,
        "members",
      );

      let sharedScopeAccountId: string | null = await resolveDefaultAccountId(
        supabase,
        {
          userId,
          householdId: body.householdId,
          currency,
        },
      );

      if (body.accountId) {
        const isInSharedScope = await assertAccountInScope(
          supabase,
          body.accountId,
          {
            userId,
            householdId: body.householdId,
            currency,
          },
        );
        if (isInSharedScope) {
          sharedScopeAccountId = body.accountId;
        } else {
          return errorResponse(
            "Provided accountId does not belong to this scope or currency",
            400,
            "VALIDATION_ERROR",
          );
        }
      }

      // Update expense with split_group_id, household_id, and account_id
      await supabase
        .from("expenses")
        .update({
          split_group_id: splitGroup.id,
          household_id: body.householdId,
          account_id: sharedScopeAccountId,
        })
        .eq("id", expense.id)
        .is("deleted_at", null);

      const { data: refreshedExpense, error: refreshError } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", expense.id)
        .is("deleted_at", null)
        .single();
      if (!refreshError && refreshedExpense) {
        responseExpense = refreshedExpense;
      }

      // Create notifications for all household members EXCEPT the adder
      const { error: notifyError } = await supabase.rpc(
        "notify_household_members_expense",
        {
          p_household_id: body.householdId,
          p_expense_id: expense.id,
          p_actor_user_id: userId,
          p_event_type: "expense_added",
          p_expense_data: {
            actor_name: actorName,
            amount_cents: amountCents,
            currency: currency,
            category: responseExpense.category ?? effectiveCategory,
            note: body.description || "",
            is_recurring: body.isRecurring === true,
          },
        },
      );

      if (notifyError) {
        console.error(
          "[save-expense] Error creating notifications:",
          notifyError,
        );
        // Don't fail the request, just log the error
      } else {
        console.log(
          "[save-expense] Notifications created for household members",
        );
      }

      console.log(
        "[save-expense] Household expense split created successfully",
      );
    }

    // Return saved expense
    return new Response(
      JSON.stringify({
        success: true,
        data: responseExpense,
        shared: !!body.householdId,
        resolvedUserId: userId,
        meta: resolvedUserMetadata,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[save-expense] Error:", error);
    await reportEdgeFunctionError({
      functionName: "save-expense",
      error,
      context: {
        step: "unhandled",
      },
    });
    return errorResponse("Failed to save expense", 500, "SERVER_ERROR");
  }
});
