// Supabase Edge Function: list-expenses
// Returns recent expenses for a user (optionally filtered by date range)

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { normalizeCategory } from "../shared/category-colors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId?: string;
  limit?: number;
  offset?: number; // NEW: For pagination
  startDate?: string;
  endDate?: string;
  currency?: string;
  householdId?: string; // If provided, fetch household expenses
  
  // Recurring filters (NEW - for proper data separation)
  includeRecurring?: boolean;   // If true, ONLY fetch recurring transactions
  excludeRecurring?: boolean;   // If true, EXCLUDE recurring transactions
  
  // Household filters (NEW - for proper data separation)
  personalOnly?: boolean;       // If true, only fetch personal (split_group_id IS NULL)
  householdOnly?: boolean;      // If true, only fetch household (split_group_id IS NOT NULL)
}

interface ExpenseRecord {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  category: string;
  date: string;
  raw_text: string | null;
  receipt_image_url: string | null;
  created_at: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as RequestBody;

    console.log("[list-expenses] Incoming request body:", body);

    const detection = detectGptRequest(req);

    let userId = sanitizeUuid(body.userId ?? null);

    if (body.userId && !userId) {
      console.warn("[list-expenses] Ignoring invalid userId provided in payload", {
        provided: body.userId,
        conversationId: detection.conversationId,
      });
    }

    if (!userId && !detection.isGpt) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const limit = Math.max(1, Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
    let supabase



    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

     supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: { headers: { "X-Client-Info": "moneko-list-expenses" } },
      },
    );

    if (!userId && detection.isGpt) {
      if (!detection.conversationId) {
        return new Response(
          JSON.stringify({ error: "conversationId required for GPT requests" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId: detection.conversationId,
        });
        userId = guestIdentity.userId;
        console.log("[list-expenses] Resolved GPT guest identity", {
          conversationId: detection.conversationId,
          userId,
        });
      } catch (guestError) {
        console.error("[list-expenses] Failed to resolve GPT guest identity:", guestError);
        return new Response(
          JSON.stringify({ error: "Failed to prepare GPT guest user" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unable to resolve user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const resolvedMeta: Record<string, unknown> = {};
    if (detection.conversationId) {
      resolvedMeta.conversationId = detection.conversationId;
    }
    if (detection.ephemeralUserId) {
      resolvedMeta.ephemeralUserId = detection.ephemeralUserId;
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

     supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-list-expenses" } },
    });

    const offset = body.offset || 0;

    // Start building query
    let query = supabase
      .from("expenses")
      .select("id, type, date, category, raw_text, amount_cents, currency, receipt_image_url, split_group_id, household_id, is_recurring, recurrence_rule, attachments, created_at", { count: 'exact' })
      .eq("type", "expense") // CRITICAL: Only fetch expenses (not income)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1); // Pagination support

    // Apply recurring filters (NEW)
    if (body.includeRecurring === true) {
      // ONLY recurring transactions
      query = query.eq("is_recurring", true);
    } else if (body.excludeRecurring === true) {
      // EXCLUDE recurring transactions (for home page)
      query = query.or("is_recurring.is.false,is_recurring.is.null");
    }
    
    // Apply household filters (NEW)
    // CRITICAL: In household mode, fetch ALL expenses for the household (any member)
    // In personal mode, filter by user_id AND ensure household_id is null OR is a portfolio household
    if (body.personalOnly === true) {
      // ONLY personal expenses (split_group_id IS NULL)
      query = query.eq("user_id", userId).is("split_group_id", null);
    } else if (body.householdOnly === true) {
      // ONLY household expenses (split_group_id IS NOT NULL)
      query = query.not("split_group_id", "is", null);
    } else if (body.householdId) {
      // Specific household - fetch ALL expenses for this household (any member)
      query = query.eq("household_id", body.householdId);
    } else {
      // Default personal mode: filter by user_id and exclude non-portfolio household expenses
      // Portfolio households (is_portfolio=true) should be included in personal view
      // We need to fetch portfolio household IDs for this user first
      const { data: userHouseholds } = await supabase
        .from("households")
        .select("id, is_portfolio")
        .or(`owner_id.eq.${userId},id.in.(select household_id from household_members where user_id='${userId}')`);
      
      const portfolioHouseholdIds = (userHouseholds || [])
        .filter(h => h.is_portfolio === true)
        .map(h => h.id);
      
      if (portfolioHouseholdIds.length > 0) {
        // Include expenses where household_id is null OR in portfolio households
        query = query.eq("user_id", userId)
          .or(`household_id.is.null,household_id.in.(${portfolioHouseholdIds.join(',')})`);
      } else {
        // No portfolio households, simple null check
        query = query.eq("user_id", userId).is("household_id", null);
      }
    }

    // Apply date filters if provided
    if (body.startDate) {
      query = query.gte("date", body.startDate);
    }
    if (body.endDate) {
      query = query.lte("date", body.endDate);
    }
    
    // Apply currency filter if provided
    if (body.currency) {
      query = query.eq("currency", validateCurrency(body.currency));
    }

    const { data: expenses, error, count } = await query;

    if (error) {
      console.error("[list-expenses] Database error:", error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expenses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[list-expenses] Fetched ${expenses.length} expenses, total: ${count}`);

    // Transform and normalize data
    // IMPORTANT: Use snake_case keys to match mobile ExpenseEntry.fromJson expectations
    const data = expenses.map(expense => {
      // Parse recurrence_rule if it's a string (JSONB sometimes comes as string)
      let recurrenceRule = expense.recurrence_rule;
      if (typeof recurrenceRule === 'string') {
        try {
          recurrenceRule = JSON.parse(recurrenceRule);
        } catch (e) {
          console.warn('[list-expenses] Failed to parse recurrence_rule:', e);
          recurrenceRule = null;
        }
      }
      
      // Parse attachments if it's a string
      let attachments = expense.attachments || [];
      if (typeof attachments === 'string') {
        try {
          attachments = JSON.parse(attachments);
        } catch (e) {
          console.warn('[list-expenses] Failed to parse attachments:', e);
          attachments = [];
        }
      }
      
      return {
        id: expense.id,
        type: expense.type || 'expense',
        date: expense.date,
        category: normalizeCategory(expense.category),
        raw_text: expense.raw_text,
        amount_cents: expense.amount_cents, // Keep as cents, mobile divides by 100
        currency: validateCurrency(expense.currency || "USD"),
        receipt_image_url: expense.receipt_image_url,
        split_group_id: expense.split_group_id,
        household_id: expense.household_id,
        is_recurring: expense.is_recurring || false,
        recurrence_rule: recurrenceRule,
        attachments: attachments,
        created_at: expense.created_at,
        contact_id: expense.contact_id,
        user_id: expense.user_id,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data,
        resolvedUserId: userId,
        meta: {
          count: data.length,          // Items in this response
          total: count || 0,            // Total matching items (NEW)
          limit,
          offset: offset,               // Current offset (NEW)
          hasMore: (offset + data.length) < (count || 0), // Has more pages (NEW)
          filters: {
            startDate: body.startDate || null,
            endDate: body.endDate || null,
            currency: body.currency || null,
            includeRecurring: body.includeRecurring || false,
            excludeRecurring: body.excludeRecurring || false,
            personalOnly: body.personalOnly || false,
            householdOnly: body.householdOnly || false,
          },
          identity: resolvedMeta,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[list-expenses] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch expenses",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
