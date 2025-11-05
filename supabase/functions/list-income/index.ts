// Supabase Edge Function: list-income
// Returns income transactions for a user with privacy-aware filtering
// Supports personal and household income with date/currency filters

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId: string; // User ID (required)
  limit?: number; // Max records to return (default: 50, max: 200)
  startDate?: string; // Filter by start date (inclusive)
  endDate?: string; // Filter by end date (inclusive)
  currency?: string; // Filter by currency
  householdId?: string; // Filter by household (optional)
  ownerType?: 'me' | 'partner' | 'household'; // Filter by owner (optional)
  includeRecurring?: boolean; // Include recurring parent records (default: false)
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

    console.log("[list-income] Incoming request:", {
      userId: body.userId,
      householdId: body.householdId,
      startDate: body.startDate,
      endDate: body.endDate,
    });

    // Validate userId
    const userId = sanitizeUuid(body.userId);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Valid userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const limit = Math.max(1, Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT));

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

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: { headers: { "X-Client-Info": "moneko-list-income" } },
      },
    );

    // Build query for income transactions
    let query = supabase
      .from("expenses")
      .select(`
        id,
        date,
        category,
        raw_text,
        amount_cents,
        currency,
        source,
        owner_type,
        privacy_scope,
        household_id,
        acknowledged_by,
        normalized_amount_cents,
        base_currency,
        fx_rate,
        is_recurring,
        recurrence_rule,
        parent_recurring_id,
        attachments,
        created_at,
        updated_at
      `)
      .eq("type", "income") // CRITICAL: Filter for income only
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (body.startDate) {
      query = query.gte("date", body.startDate);
    }
    if (body.endDate) {
      query = query.lte("date", body.endDate);
    }
    if (body.currency) {
      query = query.eq("currency", validateCurrency(body.currency));
    }
    if (body.householdId) {
      query = query.eq("household_id", body.householdId);
    }
    if (body.ownerType) {
      query = query.eq("owner_type", body.ownerType);
    }

    // Exclude recurring parent records unless explicitly requested
    if (!body.includeRecurring) {
      query = query.or("is_recurring.is.false,is_recurring.is.null");
    }

    const { data: incomeRecords, error } = await query;

    if (error) {
      console.error("[list-income] Database error:", error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch income' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform and normalize data with privacy-aware rendering
    const data = incomeRecords.map(record => {
      // Check if current user has acknowledged this income
      const acknowledgedBy = record.acknowledged_by || [];
      const isAcknowledged = acknowledgedBy.includes(userId);

      // Privacy-aware field redaction for non-owners
      const isOwner = record.user_id === userId;
      let privacyRedacted = false;

      // For balances_only: redact details for non-owners
      if (!isOwner && record.privacy_scope === 'balances_only') {
        privacyRedacted = true;
      }

      return {
        id: record.id,
        date: record.date,
        category: record.category,
        description: privacyRedacted ? null : record.raw_text,
        source: privacyRedacted ? null : record.source,
        amountMajor: record.amount_cents / 100,
        currency: record.currency,
        ownerType: privacyRedacted ? null : record.owner_type,
        privacyScope: record.privacy_scope,
        householdId: record.household_id,
        isAcknowledged: isAcknowledged,
        acknowledgedCount: acknowledgedBy.length,
        normalizedAmountMajor: record.normalized_amount_cents ? record.normalized_amount_cents / 100 : null,
        baseCurrency: record.base_currency,
        fxRate: record.fx_rate,
        isRecurring: record.is_recurring || false,
        recurrenceRule: record.recurrence_rule,
        parentRecurringId: record.parent_recurring_id,
        attachments: record.attachments || [],
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        privacyRedacted: privacyRedacted,
      };
    });

    // Calculate summary statistics
    const totalIncome = data.reduce((sum, record) => {
      // Use normalized amount if available, otherwise use original amount
      const amount = record.normalizedAmountMajor || record.amountMajor;
      return sum + amount;
    }, 0);

    const currencyBreakdown = data.reduce((acc, record) => {
      const curr = record.currency;
      if (!acc[curr]) {
        acc[curr] = { count: 0, total: 0 };
      }
      acc[curr].count += 1;
      acc[curr].total += record.amountMajor;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const categoryBreakdown = data.reduce((acc, record) => {
      const cat = record.category;
      if (!acc[cat]) {
        acc[cat] = { count: 0, total: 0 };
      }
      acc[cat].count += 1;
      acc[cat].total += record.normalizedAmountMajor || record.amountMajor;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        summary: {
          count: data.length,
          totalIncome: totalIncome,
          currencyBreakdown: currencyBreakdown,
          categoryBreakdown: categoryBreakdown,
        },
        meta: {
          limit,
          filters: {
            startDate: body.startDate || null,
            endDate: body.endDate || null,
            currency: body.currency || null,
            householdId: body.householdId || null,
            ownerType: body.ownerType || null,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[list-income] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch income",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
