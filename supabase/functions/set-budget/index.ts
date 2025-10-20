// Supabase Edge Function: set-budget
// Simple API to set/update daily budget for a user (no AI involved, direct database operation)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";

// Types
interface SetBudgetRequest {
  phone?: string;      // E.164 format (optional if userId provided)
  userId?: string;     // User ID (optional if phone provided)
  amount: number;      // Budget amount (in dollars/currency units, not cents)
  date?: string;       // ISO date like 2025-01-07; default today (UTC)
  currency?: string;   // Optional currency code, default USD
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function errorResponse(message: string, status = 400, details?: unknown) {
  return jsonResponse({ error: message, details }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server not configured", 500);
  }

  let payload: SetBudgetRequest;
  try {
    payload = await req.json();
  } catch (e) {
    return errorResponse("Invalid JSON body", 400);
  }

  const { phone, userId, amount, date: inputDate, currency: inputCurrency } = payload || {};
  
  // Validate: either phone or userId must be provided
  if (!phone && !userId) {
    return errorResponse("Either 'phone' or 'userId' must be provided", 400);
  }
  if (phone && typeof phone !== "string") {
    return errorResponse("'phone' must be a string", 400);
  }
  if (userId && typeof userId !== "string") {
    return errorResponse("'userId' must be a string", 400);
  }
  if (typeof amount !== "number" || amount <= 0) {
    return errorResponse("'amount' must be a positive number", 400);
  }

  const date = inputDate ? new Date(inputDate) : new Date();
  if (isNaN(date.getTime())) {
    return errorResponse("Invalid date format", 400);
  }
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const providedCurrency = validateCurrency(inputCurrency);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "moneko-set-budget" } },
  });

  // Find or create contact - search by phone if provided, otherwise by userId
  let contact: any = null;
  let contactErr: any = null;
  
  if (phone) {
    // Search by phone number (handle duplicates by getting most recent)
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_currency")
      .eq("phone_e164", phone)
      .order('id', { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  } else if (userId) {
    // Search by user_id (handle duplicates by getting most recent)
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_currency, phone_e164")
      .eq("user_id", userId)
      .order('id', { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  }

  let contactId: string | null = contact?.id ?? null;
  if (contactErr) {
    console.error("contact select error", contactErr);
    return errorResponse("Failed to fetch contact", 500);
  }

  // FIX: Prioritize incoming currency over contact's preferred (for per-currency budgets)
  const budgetCurrency = providedCurrency || validateCurrency(contact?.preferred_currency as string | null);

  if (!contactId) {
    // Create new contact using UPSERT to prevent duplicates
    if (phone) {
      // If phone provided, upsert contact with phone (prevents duplicates on phone_e164)
      const { data: upserted, error: upsertErr } = await supabase
        .from("user_contacts")
        .upsert(
          { phone_e164: phone, user_id: userId || null, preferred_currency: budgetCurrency, updated_at: new Date().toISOString() },
          { onConflict: 'phone_e164' }
        )
        .select("id")
        .single();
      if (upsertErr) {
        console.error("contact upsert error", upsertErr);
        return errorResponse("Failed to create contact", 500);
      }
      contactId = upserted.id;
    } else if (userId) {
      // If only userId provided, insert contact (no unique constraint on user_id, but query fix prevents duplicates)
      const { data: inserted, error: insertErr } = await supabase
        .from("user_contacts")
        .insert({ user_id: userId, preferred_currency: budgetCurrency })
        .select("id")
        .single();
      if (insertErr) {
        console.error("contact insert error", insertErr);
        return errorResponse("Failed to create contact", 500);
      }
      contactId = inserted.id;
    }
  }

  // Convert amount to cents
  const budgetCents = Math.round(amount * 100);

  // Upsert budget using new multi-currency constraint
  const { error: upsertErr } = await supabase
    .from("daily_budgets")
    .upsert(
      [{ 
        contact_id: contactId, 
        date: dateStr, 
        amount_cents: budgetCents, 
        currency: budgetCurrency, 
        updated_at: new Date().toISOString() 
      }], 
      { onConflict: "contact_id,date,currency" }  // Updated: now includes currency
    );

  if (upsertErr) {
    console.error("budget upsert error", upsertErr);
    return errorResponse("Failed to save budget", 500);
  }

  // Get totals for today - ONLY sum expenses matching the budget currency
  const { data: expenseRows } = await supabase
    .from("expenses")
    .select("amount_cents,currency")
    .eq("contact_id", contactId)
    .eq("date", dateStr)
    .eq("currency", budgetCurrency);

  const totalSpentCents = (expenseRows || []).reduce((sum, r: any) => sum + (r.amount_cents || 0), 0);
  const remainingCents = Math.max(budgetCents - totalSpentCents, 0);

  // Prepare response
  const results = {
    date: dateStr,
    currency: budgetCurrency,
    budget_set: { 
      amount_cents: budgetCents, 
      date: dateStr, 
      currency: budgetCurrency 
    },
    totals: {
      budget_cents: budgetCents,
      spent_cents: totalSpentCents,
      remaining_cents: remainingCents,
      currency: budgetCurrency,
    },
  };

  // Simple text reply
  const sym = getCurrencySymbol(budgetCurrency);
  const toMoney = (cents: number) => (cents / 100).toFixed(2);
  const reply = `Budget set to ${sym}${toMoney(budgetCents)}. Today: spent ${sym}${toMoney(totalSpentCents)} / budget ${sym}${toMoney(budgetCents)}. Remaining: ${sym}${toMoney(remainingCents)}.`;

  return jsonResponse({ ok: true, results, reply });
});
