// Supabase Edge Function: list-income
// Returns income transactions for a user with privacy-aware filtering
// Supports personal and household income with date/currency filters

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";
import {
  normalizeCategoryForStorage,
  sanitizeCategoryName,
} from "../shared/category-colors.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId: string; // User ID (required)
  limit?: number; // Max records to return (default: 50, max: 200)
  offset?: number; // NEW: For pagination
  startDate?: string; // Filter by start date (inclusive)
  endDate?: string; // Filter by end date (inclusive)
  currency?: string; // Filter by currency
  householdId?: string; // Filter by household (optional)
  ownerType?: "me" | "partner" | "household"; // Filter by owner (optional)

  // Recurring filters (NEW - for proper data separation)
  includeRecurring?: boolean; // If true, ONLY fetch recurring transactions
  excludeRecurring?: boolean; // If true, EXCLUDE recurring transactions

  // Household filters (NEW - for proper data separation)
  personalOnly?: boolean; // If true, only fetch personal (split_group_id IS NULL)
  householdOnly?: boolean; // If true, only fetch household (split_group_id IS NOT NULL)
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

    const requestedUserId = sanitizeUuid(body.userId);
    if (!requestedUserId) {
      return new Response(
        JSON.stringify({ error: "Valid userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const limit = Math.max(1, Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
    const offset = Number.isFinite(body.offset) ? Math.max(0, body.offset!) : 0;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } =
      await supabaseAuthed.auth.getUser();
    const callerId = userData?.user?.id;
    if (userErr || !callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerId !== requestedUserId) {
      return new Response(JSON.stringify({ error: "userId mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
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

    const householdId = sanitizeUuid(body.householdId ?? null);
    if (body.householdId && !householdId) {
      return new Response(JSON.stringify({ error: "Invalid householdId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute household access lists for the caller.
    const [memberRows, ownedRows] = await Promise.all([
      supabaseAdmin
        .from("household_members")
        .select("household_id")
        .eq("user_id", callerId),
      supabaseAdmin.from("households").select("id").eq("owner_id", callerId),
    ]);

    const memberHouseholdIds = Array.isArray(memberRows.data)
      ? (memberRows.data as any[])
          .map((r) => String(r?.household_id || ""))
          .filter((id) => sanitizeUuid(id))
      : [];

    const ownedHouseholdIds = Array.isArray(ownedRows.data)
      ? (ownedRows.data as any[])
          .map((r) => String(r?.id || ""))
          .filter((id) => sanitizeUuid(id))
      : [];

    const accessibleHouseholdIds = Array.from(
      new Set([...memberHouseholdIds, ...ownedHouseholdIds]),
    );

    const { data: householdRows } = accessibleHouseholdIds.length
      ? await supabaseAdmin
          .from("households")
          .select("id, is_portfolio")
          .in("id", accessibleHouseholdIds)
      : { data: [] as any[] };

    const portfolioHouseholdIds = (householdRows || [])
      .filter((h: any) => h?.is_portfolio === true)
      .map((h: any) => String(h?.id || ""))
      .filter((id: string) => sanitizeUuid(id));

    const sharedHouseholdIds = (householdRows || [])
      .filter((h: any) => h?.is_portfolio !== true)
      .map((h: any) => String(h?.id || ""))
      .filter((id: string) => sanitizeUuid(id));

    if (householdId && !accessibleHouseholdIds.includes(householdId)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Early return: householdOnly with no accessible shared spaces.
    if (
      body.householdOnly === true &&
      !householdId &&
      sharedHouseholdIds.length === 0
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          summary: {
            count: 0,
            totalIncome: 0,
            currencyBreakdown: {},
            categoryBreakdown: {},
          },
          meta: {
            count: 0,
            total: 0,
            limit,
            offset,
            hasMore: false,
            filters: {
              startDate: body.startDate || null,
              endDate: body.endDate || null,
              currency: body.currency || null,
              householdId: body.householdId || null,
              ownerType: body.ownerType || null,
              includeRecurring: body.includeRecurring || false,
              excludeRecurring: body.excludeRecurring || false,
              personalOnly: body.personalOnly || false,
              householdOnly: body.householdOnly || false,
            },
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let query = supabaseAdmin
      .from("expenses")
      .select(
        `
        id,
        user_id,
        type,
        date,
        category,
        raw_text,
        amount_cents,
        currency,
        source,
        owner_type,
        privacy_scope,
        household_id,
        split_group_id,
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
      `,
        { count: "exact" },
      )
      .eq("type", "income")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (body.includeRecurring === true) {
      query = query.eq("is_recurring", true);
    } else if (body.excludeRecurring === true) {
      query = query.or("is_recurring.is.false,is_recurring.is.null");
    }

    if (body.personalOnly === true) {
      query = query.eq("user_id", callerId).is("split_group_id", null);
    } else if (body.householdOnly === true) {
      query = query.not("split_group_id", "is", null);
      if (householdId) {
        query = query.eq("household_id", householdId);
      } else {
        query = query.in("household_id", sharedHouseholdIds);
      }
    } else if (householdId) {
      query = query.eq("household_id", householdId);
    } else {
      if (portfolioHouseholdIds.length > 0) {
        query = query
          .eq("user_id", callerId)
          .or(
            `household_id.is.null,household_id.in.(${portfolioHouseholdIds.join(",")})`,
          );
      } else {
        query = query.eq("user_id", callerId).is("household_id", null);
      }
    }

    if (body.startDate) {
      query = query.gte("date", body.startDate);
    }
    if (body.endDate) {
      query = query.lte("date", body.endDate);
    }
    if (body.currency) {
      query = query.eq("currency", validateCurrency(body.currency));
    }
    if (body.ownerType) {
      query = query.eq("owner_type", body.ownerType);
    }

    const { data: incomeRecordsRaw, error, count } = await query;

    if (error) {
      console.error("[list-income] Database error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch income" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incomeRecords = Array.isArray(incomeRecordsRaw)
      ? incomeRecordsRaw
      : [];

    const data = incomeRecords.map((record: any) => {
      const acknowledgedBy = record.acknowledged_by || [];
      const isAcknowledged = Array.isArray(acknowledgedBy)
        ? acknowledgedBy.includes(callerId)
        : false;

      const isOwner = record.user_id === callerId;
      const privacyRedacted =
        !isOwner && record.privacy_scope === "balances_only";

      let recurrenceRule = record.recurrence_rule;
      if (typeof recurrenceRule === "string") {
        try {
          recurrenceRule = JSON.parse(recurrenceRule);
        } catch {
          recurrenceRule = null;
        }
      }

      let attachments = record.attachments || [];
      if (typeof attachments === "string") {
        try {
          attachments = JSON.parse(attachments);
        } catch {
          attachments = [];
        }
      }

      return {
        id: record.id,
        type: record.type || "income",
        date: record.date,
        category: privacyRedacted
          ? "other"
          : (sanitizeCategoryName(record.category ?? "") ??
            normalizeCategoryForStorage(record.category)),
        description: privacyRedacted ? null : record.raw_text,
        source: privacyRedacted ? null : record.source,
        amountMajor: (Number(record.amount_cents) || 0) / 100,
        currency: record.currency,
        ownerType: privacyRedacted ? null : record.owner_type,
        privacyScope: record.privacy_scope,
        householdId: record.household_id,
        splitGroupId: record.split_group_id,
        isAcknowledged,
        acknowledgedCount: Array.isArray(acknowledgedBy)
          ? acknowledgedBy.length
          : 0,
        normalizedAmountMajor: record.normalized_amount_cents
          ? (Number(record.normalized_amount_cents) || 0) / 100
          : null,
        baseCurrency: record.base_currency,
        fxRate: record.fx_rate,
        isRecurring: record.is_recurring || false,
        recurrenceRule,
        parentRecurringId: record.parent_recurring_id,
        attachments,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        privacyRedacted,
      };
    });

    const totalIncome = data.reduce((sum, record) => {
      const amount = record.normalizedAmountMajor || record.amountMajor;
      return sum + amount;
    }, 0);

    const currencyBreakdown = data.reduce(
      (acc, record) => {
        const curr = record.currency;
        if (!acc[curr]) {
          acc[curr] = { count: 0, total: 0 };
        }
        acc[curr].count += 1;
        acc[curr].total += record.amountMajor;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    const categoryBreakdown = data.reduce(
      (acc, record) => {
        const cat = record.category;
        if (!acc[cat]) {
          acc[cat] = { count: 0, total: 0 };
        }
        acc[cat].count += 1;
        acc[cat].total += record.normalizedAmountMajor || record.amountMajor;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data,
        summary: {
          count: data.length,
          totalIncome,
          currencyBreakdown,
          categoryBreakdown,
        },
        meta: {
          count: data.length,
          total: count || 0,
          limit,
          offset,
          hasMore: offset + data.length < (count || 0),
          filters: {
            startDate: body.startDate || null,
            endDate: body.endDate || null,
            currency: body.currency || null,
            householdId: body.householdId || null,
            ownerType: body.ownerType || null,
            includeRecurring: body.includeRecurring || false,
            excludeRecurring: body.excludeRecurring || false,
            personalOnly: body.personalOnly || false,
            householdOnly: body.householdOnly || false,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
