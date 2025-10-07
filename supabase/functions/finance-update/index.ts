// Supabase Edge Function: finance-update
// Accepts free text + phone, uses Gemini to derive structured update ops, then updates DB.

import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { parse } from "https://esm.sh/partial-json@0.1.7";

// Types
interface UpdateRequest {
  phone: string;       // E.164 format
  text: string;        // free text, e.g., "I spent 4 on food"
  date?: string;       // ISO date like 2025-10-07; default today (UTC)
  currency?: string;   // Optional currency code, default USD
}

interface LlmResult {
  actions?: {
    set_budget?: { amount: number; currency?: string; date?: string };
    add_expenses?: Array<{ amount: number; category?: string; currency?: string; date?: string }>;
  }
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

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server not configured", 500);
  }

  let payload: UpdateRequest;
  try {
    payload = await req.json();
  } catch (e) {
    return errorResponse("Invalid JSON body", 400);
  }

  const { phone, text, date: inputDate, currency: inputCurrency } = payload || {};
  if (!phone || !text || typeof phone !== "string" || typeof text !== "string") {
    return errorResponse("'phone' and 'text' are required strings", 400);
  }

  const date = inputDate ? new Date(inputDate) : new Date();
  if (isNaN(date.getTime())) {
    return errorResponse("Invalid date format", 400);
  }
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const currency = (inputCurrency || "USD").toUpperCase();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "moneko-finance-update" } },
  });

  // Ensure contact exists
  const { data: contact, error: contactErr } = await supabase
    .from("user_contacts")
    .select("id, user_id")
    .eq("phone_e164", phone)
    .maybeSingle();

  let contactId: string | null = contact?.id ?? null;
  if (contactErr) {
    console.error("contact select error", contactErr);
    return errorResponse("Failed to fetch contact", 500);
  }

  if (!contactId) {
    const { data: inserted, error: insertErr } = await supabase
      .from("user_contacts")
      .insert({ phone_e164: phone })
      .select("id")
      .single();
    if (insertErr) {
      console.error("contact insert error", insertErr);
      return errorResponse("Failed to create contact", 500);
    }
    contactId = inserted.id;
  }

  // Use Gemini to derive operations
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const systemPrompt = `You are a budgeting extraction engine.
Given arbitrary user text (possibly casual or multi-intent), produce STRICT JSON with this shape:
{
  "actions": {
    "set_budget"?: { "amount": number, "currency"?: string, "date"?: string },
    "add_expenses"?: [ { "amount": number, "category"?: string, "currency"?: string, "date"?: string } ]
  }
}
Rules:
- All numeric amounts are positive numbers in the given currency.
- If currency is missing, default to the one provided by the caller.
- If a date is missing for an item, default to caller-provided date (today).
- If text includes a command /setBudget <amount> [<currency>], set set_budget accordingly.
- If text includes multiple spends, include each in add_expenses with reasonable categories from the text (food, groceries, transport, etc.).
- Output ONLY valid JSON, no markdown fences, no extra commentary.`;

  const userText = text;
  let llmText = "";
  try {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nCaller Currency: ${currency}\nCaller Date: ${dateStr}\n\nUser Text:\n${userText}` }] },
      ],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1024 },
    });
    llmText = result.response.text();
  } catch (e) {
    console.error("Gemini error", e);
    return errorResponse("AI processing failed", 500);
  }

  let ops: LlmResult = {};
  try {
    // Be tolerant to slightly malformed JSON
    const parsed = parse(llmText);
    ops = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch (e) {
    console.error("Parse ops error", e, llmText);
    return errorResponse("AI returned invalid JSON", 500, { llmText });
  }

  const actions = ops?.actions || {};
  const results: any = { date: dateStr, currency };

  // Upsert budget if provided
  if (actions.set_budget?.amount && contactId) {
    const budgetCents = Math.round(actions.set_budget.amount * 100);
    const budgetDate = (actions.set_budget.date || dateStr).slice(0, 10);
    const budgetCurrency = (actions.set_budget.currency || currency).toUpperCase();

    const { error: upsertErr } = await supabase
      .from("daily_budgets")
      .upsert([{ contact_id: contactId, date: budgetDate, amount_cents: budgetCents, currency: budgetCurrency, updated_at: new Date().toISOString() }], { onConflict: "contact_id,date" });

    if (upsertErr) {
      console.error("budget upsert error", upsertErr);
      return errorResponse("Failed to save budget", 500);
    }
    results.budget_set = { amount_cents: budgetCents, date: budgetDate, currency: budgetCurrency };
  }

  // Insert expenses if provided
  if (Array.isArray(actions.add_expenses) && actions.add_expenses.length && contactId) {
    const rows = actions.add_expenses.map((e) => ({
      contact_id: contactId!,
      date: (e.date || dateStr).slice(0, 10),
      amount_cents: Math.round((e.amount || 0) * 100),
      currency: (e.currency || currency).toUpperCase(),
      category: e.category || null,
      raw_text: userText,
      updated_at: new Date().toISOString(),
    })).filter(r => r.amount_cents > 0);

    if (rows.length) {
      const { error: insertErr } = await supabase.from("expenses").insert(rows);
      if (insertErr) {
        console.error("expenses insert error", insertErr);
        return errorResponse("Failed to save expenses", 500);
      }
      results.expenses_added = rows.length;
    }
  }

  // Compute today totals and remaining
  if (contactId) {
    const { data: budgetRow } = await supabase
      .from("daily_budgets")
      .select("amount_cents,currency")
      .eq("contact_id", contactId)
      .eq("date", dateStr)
      .maybeSingle();

    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("amount_cents")
      .eq("contact_id", contactId)
      .eq("date", dateStr);

    const totalCents = (expenseRows || []).reduce((sum, r: any) => sum + (r.amount_cents || 0), 0);
    const budgetCents = budgetRow?.amount_cents || 0;
    const remainingCents = Math.max(budgetCents - totalCents, 0);

    results.totals = {
      budget_cents: budgetCents,
      spent_cents: totalCents,
      remaining_cents: remainingCents,
      currency: budgetRow?.currency || currency,
    };
  }

  // Simple text reply for bots to display
  let reply = "";
  if (results.totals) {
    const c = results.totals.currency || currency;
    const toMoney = (cents: number) => (cents / 100).toFixed(2);
    const setPart = results.budget_set ? `Budget set to ${c} ${toMoney(results.budget_set.amount_cents)}. ` : "";
    const added = results.expenses_added ? `${results.expenses_added} expense(s) logged. ` : "";
    reply = `${setPart}${added}Today: spent ${c} ${toMoney(results.totals.spent_cents)} / budget ${c} ${toMoney(results.totals.budget_cents)}. Remaining: ${c} ${toMoney(results.totals.remaining_cents)}.`;
  } else {
    reply = "Update recorded.";
  }

  return jsonResponse({ ok: true, results, reply });
});
