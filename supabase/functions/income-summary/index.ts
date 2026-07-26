// Supabase Edge Function: income-summary
// Returns aggregated income statistics with privacy-aware filtering
// Supports MTD, YTD totals, by-member breakdown, by-category breakdown, and forecast

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUser } from "../shared/auth.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId: string; // User ID (required)
  householdId?: string; // Household ID for household income summary
  startDate?: string; // Filter by start date (default: start of current month)
  endDate?: string; // Filter by end date (default: today)
  currency?: string; // Filter by specific currency (optional)
  includeForecast?: boolean; // Include 3-month forecast from recurring income (v1.5)
}

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

    console.log("[income-summary] Incoming request:", {
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
      global: { headers: { "X-Client-Info": "moneko-income-summary" } },
    });
    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (authResult.userId !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default date range: start of current month to today
    const now = new Date();
    const startDate =
      body.startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    const endDate = body.endDate || now.toISOString().split("T")[0];

    // If household summary requested, use database function
    if (body.householdId) {
      const { data, error } = await supabase.rpc(
        "get_household_income_summary_v2",
        {
          p_user_id: userId,
          p_household_id: body.householdId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_currency: body.currency || null,
        },
      );

      if (error) {
        console.error(
          "[income-summary] Error fetching household summary:",
          error,
        );

        if (error.message?.includes("not a member")) {
          return new Response(
            JSON.stringify({ error: "You are not a member of the household" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            error: "Failed to fetch household income summary",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Return household summary (privacy already handled by database function)
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            totalIncome: (data[0]?.total_income_cents || 0) / 100,
            currency: data[0]?.currency || body.currency || "USD",
            memberBreakdown: data[0]?.member_breakdown || {},
            categoryBreakdown: data[0]?.category_breakdown || {},
            transactionCount: data[0]?.transaction_count || 0,
            period: {
              startDate,
              endDate,
            },
          },
          meta: {
            householdId: body.householdId,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Personal income summary
    let query = supabase
      .from("expenses")
      .select(
        "amount_cents, currency, category, date, normalized_amount_cents, base_currency, analytics_is_final, analytics_counts_toward_income",
      )
      .eq("analytics_is_final", true)
      .eq("analytics_counts_toward_income", true)
      .eq("user_id", userId)
      .is("household_id", null) // Personal income only
      .is("deleted_at", null) // Exclude soft-deleted transactions
      .or("is_recurring.eq.false,is_recurring.is.null")
      .gte("date", startDate)
      .lte("date", endDate);

    if (body.currency) {
      query = query.eq("currency", body.currency);
    }

    const { data: incomeRecords, error } = await query;

    if (error) {
      console.error("[income-summary] Error fetching personal income:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch personal income summary" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Calculate totals
    const aggregateAmountCents = (record: {
      amount_cents: number;
      normalized_amount_cents?: number | null;
    }) =>
      Number(
        body.currency
          ? record.amount_cents
          : (record.normalized_amount_cents ?? record.amount_cents),
      ) || 0;
    const totalIncome =
      incomeRecords.reduce(
        (sum, record) => sum + aggregateAmountCents(record),
        0,
      ) / 100;

    // Category breakdown
    const categoryBreakdown = incomeRecords.reduce(
      (acc, record) => {
        const cat = record.category;
        if (!acc[cat]) {
          acc[cat] = 0;
        }
        acc[cat] += aggregateAmountCents(record) / 100;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Currency breakdown
    const currencyBreakdown = incomeRecords.reduce(
      (acc, record) => {
        const curr = record.currency;
        if (!acc[curr]) {
          acc[curr] = { count: 0, total: 0 };
        }
        acc[curr].count += 1;
        acc[curr].total += record.amount_cents / 100;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    // MTD calculation
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const mtdIncome =
      incomeRecords
        .filter((r) => r.date >= mtdStart)
        .reduce((sum, record) => sum + aggregateAmountCents(record), 0) / 100;

    // YTD calculation
    const ytdStart = new Date(now.getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0];
    let ytdQuery = supabase
      .from("expenses")
      .select("amount_cents, normalized_amount_cents")
      .eq("analytics_is_final", true)
      .eq("analytics_counts_toward_income", true)
      .eq("user_id", userId)
      .is("household_id", null)
      .is("deleted_at", null)
      .gte("date", ytdStart)
      .lte("date", endDate);
    if (body.currency) {
      ytdQuery = ytdQuery.eq("currency", body.currency);
    }
    const { data: ytdRecords, error: ytdError } = await ytdQuery;
    if (ytdError) throw ytdError;

    const ytdIncome =
      (ytdRecords || []).reduce(
        (sum, record) => sum + aggregateAmountCents(record),
        0,
      ) / 100;
    const aggregateCurrency =
      body.currency ||
      incomeRecords.find((record) => record.base_currency)?.base_currency ||
      incomeRecords[0]?.currency ||
      "USD";

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalIncome: totalIncome,
          mtdIncome: mtdIncome,
          ytdIncome: ytdIncome,
          currency: aggregateCurrency,
          categoryBreakdown: categoryBreakdown,
          currencyBreakdown: currencyBreakdown,
          transactionCount: incomeRecords.length,
          period: {
            startDate,
            endDate,
          },
        },
        meta: {
          userId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[income-summary] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch income summary",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
