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
  // DB constraint: shares must be > 0 when present; treat <= 0 as excluded.
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
  amount?: number; // For 'amount' type (in major units)
  percentage?: number; // For 'percentage' type (0-100)
  shares?: number; // For 'shares' type
}

interface CustomSplits {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplit[];
}

interface RequestBody {
  userId?: string; // User ID (optional when request originates from GPT)
  amount: number; // Amount in major units
  category: string; // Category name
  currency: string; // ISO currency code
  date: string; // ISO date (YYYY-MM-DD) or ISO datetime (YYYY-MM-DDTHH:mm:ss)
  clientCreatedAt?: string; // Optional client-side timestamp with timezone (ISO)
  description?: string; // Optional description/note
  breakdown?: string[]; // Optional receipt line items
  receiptImageUrl?: string; // Optional receipt image URL
  householdId?: string; // If provided, share with this household
  isPortfolio?: boolean; // If true, treat as personal even with householdId
  customSplits?: CustomSplits; // Custom split configuration (optional)
  isRecurring?: boolean; // Whether this is a recurring expense (v1.5)
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

    const headerSnapshot: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headerSnapshot[key] = value;
    });
    console.log("[save-expense] Incoming headers:", headerSnapshot);
    console.log("[save-expense] Incoming body:", body);

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

    if (!body.amount || body.amount <= 0) {
      return errorResponse("Valid amount is required", 400);
    }

    if (!body.category) {
      return errorResponse("Category is required", 400);
    }

    if (!body.date) {
      return errorResponse("Date is required", 400);
    }

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

    console.log("[save-expense] Saving expense:", {
      userId,
      amount: body.amount,
      category: body.category,
      currency,
      householdId: body.householdId,
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

    // Convert amount to cents
    const amountCents = Math.round(body.amount * 100);

    console.log(
      "[save-expense] Full request body:",
      JSON.stringify(body, null, 2),
    );
    console.log("[save-expense] isRecurring:", body.isRecurring);
    console.log("[save-expense] recurrence_rule:", body.recurrence_rule);

    // Insert expense into expenses table
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        contact_id: contactId,
        user_id: userId,
        amount_cents: amountCents,
        category: body.category,
        date: body.date,
        raw_text: body.description || "",
        currency: currency,
        breakdown: body.breakdown ?? null,
        receipt_image_url: body.receiptImageUrl || null,
        created_at: body.clientCreatedAt || new Date().toISOString(),
        is_recurring: body.isRecurring || false,
        recurrence_rule: body.recurrence_rule || null, // Don't stringify - Supabase handles JSONB automatically
        household_id: isPortfolio ? body.householdId || null : null,
      })
      .select()
      .single();

    if (expenseError) {
      console.error("[save-expense] Error saving expense:", expenseError);
      return errorResponse("Failed to save expense", 500, "SERVER_ERROR");
    }

    console.log("[save-expense] Expense saved:", expense.id);

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

      // Determine split type and validate custom splits
      const rawSplitType =
        typeof body.customSplits?.splitType === "string"
          ? body.customSplits.splitType.trim().toLowerCase()
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
        Array.isArray(body.customSplits?.memberSplits) &&
        body.customSplits!.memberSplits.length > 0;
      const customSplits =
        hasMemberSplits && normalizedSplitType !== "equal"
          ? body.customSplits
          : null;
      const splitType = customSplits ? normalizedSplitType : "equal";

      // Validate custom splits if provided
      if (customSplits) {
        console.log("[save-expense] Processing custom splits:", splitType);

        // Normalize member split values so downstream validations and inserts
        // don't violate DB constraints (e.g., shares cannot be 0).
        const normalizedMemberSplits: MemberSplit[] =
          customSplits.memberSplits.map((split) => ({
            userId: split.userId,
            amount: normalizeAmount(split.amount),
            percentage: normalizePercentage(split.percentage),
            shares: normalizeShares(split.shares),
          }));

        // Validate all members are included
        const customUserIds = normalizedMemberSplits
          .map((s) => s.userId)
          .sort();
        const allUserIds = members.map((m) => m.user_id).sort();

        if (JSON.stringify(customUserIds) !== JSON.stringify(allUserIds)) {
          console.error(
            "[save-expense] Custom splits do not match household members",
          );
          return errorResponse(
            "Custom splits must include all household members",
            400,
          );
        }

        // Validate based on split type
        if (splitType === "amount") {
          const totalSplitCents = normalizedMemberSplits.reduce(
            (sum, s) => sum + Math.round((s.amount || 0) * 100),
            0,
          );
          if (Math.abs(totalSplitCents - amountCents) > 1) {
            // Allow 1 cent rounding difference
            console.error(
              "[save-expense] Amount splits do not equal total:",
              totalSplitCents,
              "vs",
              amountCents,
            );
            return new Response(
              JSON.stringify({
                success: false,
                error: `Amount splits must equal total expense amount (${body.amount})`,
                code: "VALIDATION_ERROR",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        } else if (splitType === "percentage") {
          const totalPercent = normalizedMemberSplits.reduce(
            (sum, s) => sum + (s.percentage || 0),
            0,
          );
          if (Math.abs(totalPercent - 100) > 0.01) {
            // Allow 0.01% rounding difference
            console.error(
              "[save-expense] Percentage splits do not equal 100%:",
              totalPercent,
            );
            return errorResponse(
              `Percentage splits (${totalPercent}%) must equal 100%`,
              400,
            );
          }
        } else if (splitType === "shares") {
          const totalShares = normalizedMemberSplits.reduce(
            (sum, s) => sum + (s.shares || 0),
            0,
          );
          if (totalShares <= 0) {
            console.error(
              "[save-expense] Invalid shares: total shares must be > 0",
            );
            return errorResponse(
              "At least one member must have a share greater than 0",
              400,
            );
          }
        }

        // Use normalized splits for all downstream logic.
        customSplits.memberSplits = normalizedMemberSplits;
      }

      // Resolve payer for split group: default current user unless explicit payerUserId provided and valid
      let payerUserId = sanitizeUuid(body.payerUserId ?? null) || userId;
      if (payerUserId && body.householdId) {
        const { data: validPayer } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", body.householdId)
          .eq("user_id", payerUserId)
          .maybeSingle();
        if (!validPayer) {
          console.warn(
            "[save-expense] Provided payerUserId is not a member of the household; falling back to current user",
            { payerUserId },
          );
          payerUserId = userId;
        }
      }

      // Create expense split group
      const { data: splitGroup, error: splitGroupError } = await supabase
        .from("expense_split_groups")
        .insert({
          household_id: body.householdId,
          expense_id: expense.id,
          payer_user_id: payerUserId,
          split_type: splitType,
          currency: currency,
          total_amount_cents: amountCents,
          description: body.description || null,
          created_at: new Date().toISOString(),
        })
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

      // Create split lines based on split type
      let splitLines: any[];

      if (splitType === "equal") {
        // Equal split: divide amount equally
        const amountPerMember = Math.floor(amountCents / members.length);
        const remainder = amountCents - amountPerMember * members.length;
        splitLines = members.map((member, index) => ({
          split_group_id: splitGroup.id,
          user_id: member.user_id,
          amount_cents: amountPerMember + (index == 0 ? remainder : 0),
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === "amount" && customSplits) {
        // Custom amount split
        const cents = customSplits.memberSplits.map((split) =>
          Math.max(0, Math.round((split.amount || 0) * 100)),
        );
        const sumCents = cents.reduce((sum, v) => sum + v, 0);
        const diff = amountCents - sumCents;
        if (diff !== 0 && cents.length > 0) {
          cents[cents.length - 1] = Math.max(0, cents[cents.length - 1] + diff);
        }
        splitLines = customSplits.memberSplits.map((split, index) => ({
          split_group_id: splitGroup.id,
          user_id: split.userId,
          amount_cents: cents[index] ?? 0,
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === "percentage" && customSplits) {
        // Percentage split: calculate amount from percentage with remainder-safe allocation
        const weights = customSplits.memberSplits.map(
          (split) => split.percentage || 0,
        );
        const allocatedCents = allocateCentsByWeights(amountCents, weights);
        splitLines = customSplits.memberSplits.map((split, index) => ({
          split_group_id: splitGroup.id,
          user_id: split.userId,
          amount_cents: allocatedCents[index] ?? 0,
          percentage: split.percentage,
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === "shares" && customSplits) {
        // Shares split: calculate amount from shares with remainder-safe allocation.
        const totalShares = customSplits.memberSplits.reduce(
          (sum, s) => sum + (s.shares || 0),
          0,
        );
        if (totalShares <= 0) {
          console.error(
            "[save-expense] Cannot create split lines: total shares is 0",
          );
          return new Response(
            JSON.stringify({
              success: true,
              data: expense,
              warning:
                "Expense saved but split lines creation failed due to invalid shares",
              resolvedUserId: userId,
              meta: resolvedUserMetadata,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const weights = customSplits.memberSplits.map(
          (split) => split.shares || 0,
        );
        const allocatedCents = allocateCentsByWeights(amountCents, weights);
        splitLines = customSplits.memberSplits.map((split, index) => ({
          split_group_id: splitGroup.id,
          user_id: split.userId,
          amount_cents: allocatedCents[index] ?? 0,
          shares: split.shares ?? null,
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else {
        // Fallback to equal split
        const amountPerMember = Math.floor(amountCents / members.length);
        const remainder = amountCents - amountPerMember * members.length;
        splitLines = members.map((member, index) => ({
          split_group_id: splitGroup.id,
          user_id: member.user_id,
          amount_cents: amountPerMember + (index == 0 ? remainder : 0),
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      }

      const { error: splitLinesError } = await supabase
        .from("expense_split_lines")
        .insert(splitLines);

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

      // Update expense with split_group_id AND household_id
      await supabase
        .from("expenses")
        .update({
          split_group_id: splitGroup.id,
          household_id: body.householdId,
        })
        .eq("id", expense.id);

      const { data: refreshedExpense, error: refreshError } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", expense.id)
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
            category: body.category,
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
