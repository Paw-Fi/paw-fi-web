// Supabase Edge Function: get-budget
// Retrieves a user's daily budget and projects totals for a specified day count.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { parseFinancialPeriodRangeUtc } from "../shared/budgets-helpers.ts";

interface GetBudgetRequest {
  phone?: string;
  userId?: string;
  date?: string;
  currency?: string;
  day?: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400, details?: unknown) {
  return jsonResponse({ error: message, details }, status);
}

function formatMoney(cents: number, currency: string) {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const detection = detectGptRequest(req);
  const conversationId = detection.conversationId ?? null;
  const ephemeralUserId = detection.ephemeralUserId ?? null;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server not configured", 500);
  }

  let payload: GetBudgetRequest;
  try {
    payload = await req.json();
  } catch (_) {
    return errorResponse("Invalid JSON body", 400);
  }

  const {
    phone,
    userId,
    date: inputDate,
    currency: inputCurrency,
    day: requestedDay,
  } = payload || {};

  if (detection.isGpt && !inputDate) {
    return errorResponse("'date' is required for GPT requests", 400);
  }

  if (!phone && !userId && !detection.isGpt) {
    return errorResponse("Either 'phone' or 'userId' must be provided", 400);
  }
  if (phone && typeof phone !== "string") {
    return errorResponse("'phone' must be a string", 400);
  }
  if (userId && typeof userId !== "string") {
    return errorResponse("'userId' must be a string", 400);
  }

  const targetDate = inputDate ? new Date(inputDate) : new Date();
  if (Number.isNaN(targetDate.getTime())) {
    return errorResponse("Invalid date format", 400);
  }
  const targetDateIso = targetDate.toISOString().slice(0, 10);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "moneko-get-budget" } },
  });

  let identityMeta: Record<string, unknown> = {};
  let resolvedUserId = userId?.trim() || null;
  let contactId: string | null = null;
  let contactRecord: any = null;

  if (detection.isGpt && !phone && !resolvedUserId) {
    if (!conversationId) {
      return errorResponse("Unable to resolve session identity", 400);
    }
    try {
      const identity = await ensureGuestIdentity({
        supabase,
        conversationId,
        currency: validateCurrency(inputCurrency),
      });
      resolvedUserId = identity.userId;
      contactId = identity.contactId;
      identityMeta = {
        conversationId,
        ephemeralUserId,
        guest: {
          contactId: identity.contactId,
          createdUser: identity.createdUser,
          createdContact: identity.createdContact,
        },
      };
    } catch (identityError) {
      console.error("get-budget identity error", identityError);
      return errorResponse("Failed to resolve GPT session", 500);
    }
  }

  let contactErr: unknown = null;
  if (!contactId && phone) {
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_currency, financial_month_start_day")
      .eq("phone_e164", phone)
      .order("id", { ascending: false })
      .limit(1);
    contactRecord = result.data?.[0] ?? null;
    contactErr = result.error;
    contactId = contactRecord?.id ?? null;
    resolvedUserId = resolvedUserId ?? contactRecord?.user_id ?? null;
  } else if (!contactId && resolvedUserId) {
    const result = await supabase
      .from("user_contacts")
      .select(
        "id, user_id, preferred_currency, phone_e164, financial_month_start_day",
      )
      .eq("user_id", resolvedUserId)
      .order("id", { ascending: false })
      .limit(1);
    contactRecord = result.data?.[0] ?? null;
    contactErr = result.error;
    contactId = contactRecord?.id ?? null;
  }

  if (!contactRecord && contactId) {
    const { data: fetchedContact, error: contactFetchErr } = await supabase
      .from("user_contacts")
      .select(
        "id, user_id, preferred_currency, phone_e164, financial_month_start_day",
      )
      .eq("id", contactId)
      .single();
    if (!contactFetchErr) {
      contactRecord = fetchedContact;
      resolvedUserId = resolvedUserId ?? fetchedContact?.user_id ?? null;
    } else {
      await reportEdgeFunctionError({
        functionName: "get-budget",
        error: contactFetchErr,
        context: { operation: "user_contacts.select_by_id", contactId },
      });
    }
  }

  if (contactErr) {
    console.error("contact select error", contactErr);
    await reportEdgeFunctionError({
      functionName: "get-budget",
      error: contactErr,
      context: {
        operation: "user_contacts.resolve_contact",
        phone,
        resolvedUserId,
      },
    });
    return errorResponse("Failed to fetch contact", 500);
  }

  if (!contactId) {
    return errorResponse("Failed to resolve contact", 500);
  }
  if (resolvedUserId) identityMeta.userId = resolvedUserId;

  const preferredCurrency = contactRecord?.preferred_currency
    ? validateCurrency(contactRecord.preferred_currency)
    : null;
  const targetCurrency =
    validateCurrency(inputCurrency) || preferredCurrency || "USD";

  const { data: budgetRows, error: budgetErr } = await supabase
    .from("daily_budgets")
    .select("date, amount_cents, currency")
    .eq("contact_id", contactId)
    .eq("currency", targetCurrency)
    .lte("date", targetDateIso)
    .order("date", { ascending: false })
    .limit(1);

  if (budgetErr) {
    console.error("daily_budgets query error", budgetErr);
    return errorResponse("Failed to fetch budget", 500);
  }

  const budgetRow = budgetRows?.[0];
  if (!budgetRow) {
    const message = `No daily budget found for ${targetCurrency}.`;
    if (detection.isGpt) {
      return new Response(message, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return jsonResponse({ ok: false, message, meta: identityMeta });
  }

  const { monthStartStr: monthStartIso, nextMonthStr } =
    parseFinancialPeriodRangeUtc(
      targetDateIso,
      contactRecord?.financial_month_start_day,
      { fullDateIsDateInPeriod: true },
    );
  const periodStart = new Date(`${monthStartIso}T00:00:00Z`);
  const periodEndExclusive = new Date(`${nextMonthStr}T00:00:00Z`);
  const daysInMonth = Math.max(
    1,
    Math.round(
      (periodEndExclusive.getTime() - periodStart.getTime()) / 86_400_000,
    ),
  );
  const elapsedDay = Math.max(
    1,
    Math.round((targetDate.getTime() - periodStart.getTime()) / 86_400_000) + 1,
  );
  const targetDay = Math.min(
    daysInMonth,
    Math.max(
      1,
      typeof requestedDay === "number" && Number.isFinite(requestedDay)
        ? Math.trunc(requestedDay)
        : elapsedDay,
    ),
  );

  const dailyBudgetCents = budgetRow.amount_cents ?? 0;
  const budgetToDateCents = dailyBudgetCents * targetDay;
  const monthBudgetCents = dailyBudgetCents * daysInMonth;

  const { data: expenseRows, error: expenseErr } = await supabase
    .from("expenses")
    .select("amount_cents, currency, date")
    .eq("contact_id", contactId)
    .eq("currency", targetCurrency)
    .is("deleted_at", null)
    .gte("date", monthStartIso)
    .lte("date", targetDateIso);

  if (expenseErr) {
    console.error("expenses query error", expenseErr);
    return errorResponse("Failed to compute expenses", 500);
  }

  const spentToDateCents = (expenseRows ?? []).reduce(
    (sum, row: any) => sum + (row.amount_cents ?? 0),
    0,
  );
  const remainingToDateCents = Math.max(
    budgetToDateCents - spentToDateCents,
    0,
  );
  const projectedMonthRemaining = Math.max(
    monthBudgetCents - spentToDateCents,
    0,
  );

  const report = {
    date: targetDateIso,
    currency: targetCurrency,
    dayRequested: requestedDay ?? null,
    dayApplied: targetDay,
    daysInMonth,
    dailyBudgetCents,
    totals: {
      monthBudgetCents,
      toDateBudgetCents: budgetToDateCents,
      spentToDateCents,
      remainingToDateCents,
      projectedMonthRemainingCents: projectedMonthRemaining,
    },
  };

  const messageLines = [
    `Daily budget: ${formatMoney(dailyBudgetCents, targetCurrency)}.`,
    `Budget to day ${targetDay} (${daysInMonth}-day month): ${formatMoney(
      budgetToDateCents,
      targetCurrency,
    )}.`,
    `Spent to date: ${formatMoney(spentToDateCents, targetCurrency)}.`,
    `Remaining for period: ${formatMoney(
      remainingToDateCents,
      targetCurrency,
    )}.`,
  ];

  if (detection.isGpt) {
    return new Response(messageLines.join(" "), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return jsonResponse({ ok: true, results: report, meta: identityMeta });
});
