// Supabase Edge Function: save-income
// Saves income transaction to database with privacy controls and household sharing
// Extends unified transaction system (expenses table with type='income')

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId: string; // User ID (required)
  amount: number; // Amount in major units (required, must be > 0)
  category: string; // Category name (required, e.g., 'income:salary')
  currency: string; // ISO currency code (required)
  date: string; // ISO date (YYYY-MM-DD) or ISO datetime (YYYY-MM-DDTHH:mm:ss)
  clientCreatedAt?: string; // Optional client-side timestamp with timezone (ISO)
  description?: string; // Optional description/note
  source?: string; // Optional income source (employer, refund origin, etc.)
  ownerType?: "me" | "partner" | "household"; // Owner attribution (default: 'me')
  privacyScope?: "private" | "balances_only" | "full"; // Visibility scope (default: 'full')
  householdId?: string; // If provided, share with this household
  isPortfolio?: boolean; // If true, treat as personal even with householdId
  fxRate?: number; // Optional FX rate for currency normalization
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
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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

    console.log("[save-income] Incoming request:", {
      userId: "[redacted]",
      amount: body.amount,
      category: body.category,
      householdId: body.householdId,
      privacyScope: body.privacyScope,
      isRecurring: body.isRecurring,
      hasRecurrenceRule: !!body.recurrence_rule,
    });

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
      return new Response(
        JSON.stringify({
          error: authResult.error ?? "Authentication required",
        }),
        {
          status: authResult.statusCode ?? 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = authResult.isInternalService
      ? sanitizeUuid(body.userId)
      : authResult.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Valid userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid amount greater than 0 is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!body.category) {
      return new Response(JSON.stringify({ error: "Category is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.date) {
      return new Response(JSON.stringify({ error: "Date is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate privacy scope
    const privacyScope = body.privacyScope || "full";
    if (!["private", "balances_only", "full"].includes(privacyScope)) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid privacy scope. Must be: private, balances_only, or full",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate owner type
    const ownerType = body.ownerType || "me";
    if (!["me", "partner", "household"].includes(ownerType)) {
      return new Response(
        JSON.stringify({
          error: "Invalid owner type. Must be: me, partner, or household",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
      return new Response(
        JSON.stringify({ error: "Failed to resolve user contact" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
      return new Response(
        JSON.stringify({ error: "Valid householdId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let resolvedHouseholdId: string | null = null;
    let warningMessage: string | null = null;

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
        return new Response(
          JSON.stringify({ error: "Failed to verify household membership" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (membership) {
        resolvedHouseholdId = requestedHouseholdId;
      } else {
        warningMessage = "Income saved but not shared (not a household member)";
      }
    }

    // Convert amount to cents
    const amountCents = Math.round(body.amount * 100);

    // Build income record
    const incomeRecord: any = {
      contact_id: contactId,
      user_id: userId,
      type: "income", // CRITICAL: Set transaction type to income
      amount_cents: amountCents,
      category: body.category,
      date: body.date,
      raw_text: body.description || "",
      currency: currency,
      source: body.source || null,
      owner_type: ownerType,
      privacy_scope: privacyScope,
      created_at: body.clientCreatedAt || new Date().toISOString(),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      is_recurring: body.isRecurring || false,
      recurrence_rule: body.recurrence_rule || null, // Don't stringify - Supabase handles JSONB automatically
    };

    console.log(
      "[save-income] incomeRecord being inserted:",
      JSON.stringify(incomeRecord, null, 2),
    );

    // Add household reference if resolved (portfolio uses household_id as a private space scope)
    if (resolvedHouseholdId) {
      incomeRecord.household_id = resolvedHouseholdId;

      // Add FX rate for normalization (if provided)
      if (body.fxRate) {
        incomeRecord.fx_rate = body.fxRate;
      }

      // Add idempotency key if provided
      if (body.idempotencyKey) {
        incomeRecord.idempotency_key = body.idempotencyKey;
      }
    }

    // Check for duplicate (idempotency)
    if (resolvedHouseholdId && body.idempotencyKey) {
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("household_id", resolvedHouseholdId)
        .eq("user_id", userId)
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();

      if (existing) {
        console.log(
          "[save-income] Duplicate detected (idempotency), returning existing:",
          existing.id,
        );
        // Return existing record
        const { data: existingIncome } = await supabase
          .from("expenses")
          .select("*")
          .eq("id", existing.id)
          .single();

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
      return new Response(
        JSON.stringify({
          error: "Failed to save income",
          details: incomeError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[save-income] Income saved successfully:", income.id);

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
            category: body.category,
            source: body.source || "",
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
        data: income,
        shared: !!resolvedHouseholdId && !isPortfolio,
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
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to save income",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
