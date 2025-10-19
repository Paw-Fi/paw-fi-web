// Supabase Edge Function: finance-update
// Accepts free text + (phone OR userId), uses Gemini to derive structured update ops, then updates DB.

import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { getCurrencySymbol } from "../shared/whatsapp-helpers.ts";
import { parse } from "https://esm.sh/partial-json@0.1.7";



// Types
interface UpdateRequest {
  phone?: string;      // E.164 format (optional if userId provided)
  userId?: string;     // User ID (optional if phone provided)
  text: string;        // free text, e.g., "I spent 4 on food"
  date?: string;       // ISO date like 2025-10-07; default today (UTC)
  currency?: string;   // Optional currency code, default USD
  receipt_image_url?: string;  // Optional Supabase Storage URL for receipt image
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
const DEBUG = Deno.env.get('DEBUG_LOG') === 'true';


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
    if (DEBUG) console.error('config error', { hasGemini: !!GEMINI_API_KEY, hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_SERVICE_ROLE_KEY });
    return errorResponse("Server not configured", 500);
  }

  let payload: UpdateRequest;
  try {
    payload = await req.json();
  } catch (e) {
    return errorResponse("Invalid JSON body", 400);
  }

  const { phone, userId, text, date: inputDate, currency: inputCurrency, receipt_image_url } = payload || {};
  
  // Validate: either phone or userId must be provided
  if ((!phone && !userId) || !text || typeof text !== "string") {
    return errorResponse("'text' is required, and either 'phone' or 'userId' must be provided", 400);
  }
  if (phone && typeof phone !== "string") {
    return errorResponse("'phone' must be a string", 400);
  }
  if (userId && typeof userId !== "string") {
    return errorResponse("'userId' must be a string", 400);
  }

  const date = inputDate ? new Date(inputDate) : new Date();
  if (isNaN(date.getTime())) {
    return errorResponse("Invalid date format", 400);
  }
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const providedCurrency = (inputCurrency || "USD").toUpperCase();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "moneko-finance-update" } },
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

  const preferredCurrency = (contact?.preferred_currency as string | null) || providedCurrency || 'USD';

  if (!contactId) {
    // Create new contact using UPSERT to prevent duplicates
    if (phone) {
      // If phone provided, upsert contact with phone (prevents duplicates on phone_e164)
      const { data: upserted, error: upsertErr } = await supabase
        .from("user_contacts")
        .upsert(
          { phone_e164: phone, user_id: userId || null, preferred_currency: preferredCurrency, updated_at: new Date().toISOString() },
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
        .insert({ user_id: userId, preferred_currency: preferredCurrency })
        .select("id")
        .single();
      if (insertErr) {
        console.error("contact insert error", insertErr);
        return errorResponse("Failed to create contact", 500);
      }
      contactId = inserted.id;
    }
  }

  // Use Gemini to derive operations
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        { role: "user", parts: [{ text: `${systemPrompt}\n\nCaller Currency: ${preferredCurrency}\nCaller Date: ${dateStr}\n\nUser Text:\n${userText}` }] },
      ],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1024 },
    });
    llmText = result.response.text();
  } catch (e) {
    console.error("Gemini error", e);
    return errorResponse("AI processing failed", 500, { contactId, dateStr });
  }

  let ops: LlmResult = {};
  try {
    // Be tolerant to slightly malformed JSON
    const parsed = parse(llmText);
    ops = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch (e) {
    console.error("Parse ops error", e, llmText);
    return errorResponse("AI returned invalid JSON", 500, { llmText, contactId, dateStr });
  }

  const actions = ops?.actions || {};
  const results: any = { date: dateStr, currency: preferredCurrency };

  // Upsert budget if provided
  if (actions.set_budget?.amount && contactId) {
    const budgetCents = Math.round(actions.set_budget.amount * 100);
    
    // Validate and sanitize the budget date
    let budgetDate = dateStr; // Default to caller's date (today)
    if (actions.set_budget.date) {
      const parsedDate = new Date(actions.set_budget.date);
      // Check if date is valid and in reasonable range
      if (!isNaN(parsedDate.getTime()) && actions.set_budget.date.length >= 8) {
        budgetDate = parsedDate.toISOString().slice(0, 10);
      } else {
        console.warn('[finance-update] Invalid budget date from AI, using default:', actions.set_budget.date);
      }
    }
    
    const budgetCurrency = (actions.set_budget.currency || preferredCurrency).toUpperCase();

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
    const rows = actions.add_expenses.map((e) => {
      // Validate and sanitize the date
      let expenseDate = dateStr; // Default to caller's date (today)
      if (e.date) {
        const parsedDate = new Date(e.date);
        // Check if date is valid and in reasonable range (not just "20" or malformed)
        if (!isNaN(parsedDate.getTime()) && e.date.length >= 8) {
          expenseDate = parsedDate.toISOString().slice(0, 10);
        } else {
          console.warn('[finance-update] Invalid date from AI, using default:', e.date);
        }
      }
      
      return {
        contact_id: contactId!,
        date: expenseDate,
        amount_cents: Math.round((e.amount || 0) * 100),
        currency: (e.currency || preferredCurrency).toUpperCase(),
        category: e.category || null,
        raw_text: userText,
        receipt_image_url: receipt_image_url || null,
        updated_at: new Date().toISOString(),
      };
    }).filter(r => r.amount_cents > 0);

    if (rows.length) {
      const { data: insertedExpenses, error: insertErr } = await supabase.from("expenses").insert(rows).select("*");
      if (insertErr) {
        console.error("expenses insert error", insertErr);
        return errorResponse("Failed to save expenses", 500);
      }
      results.expenses_added = rows.length;
      results.expenses = insertedExpenses; // Return full expense data
    }
  }

  // Compute today totals and remaining
  if (contactId) {
    // Try to fetch budget for the specific date
    const { data: budgetRow } = await supabase
      .from("daily_budgets")
      .select("amount_cents,currency")
      .eq("contact_id", contactId)
      .eq("date", dateStr)
      .maybeSingle();

    // If no budget for today, fetch the most recent budget before today
    let effectiveBudgetRow = budgetRow;
    if (!budgetRow) {
      const { data: recentBudget } = await supabase
        .from("daily_budgets")
        .select("amount_cents,currency")
        .eq("contact_id", contactId)
        .lt("date", dateStr)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      effectiveBudgetRow = recentBudget;
    }

    // Smart currency handling: prioritize user's preferred currency
    const budgetCurrency = (effectiveBudgetRow?.currency || preferredCurrency).toUpperCase();
    const userPreferredCurrency = preferredCurrency.toUpperCase();
    
    // If budget currency differs from preferred currency, use preferred currency for totals
    const calculationCurrency = userPreferredCurrency;
    
    // Get expenses in user's preferred currency
    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("amount_cents")
      .eq("contact_id", contactId)
      .eq("date", dateStr)
      .eq("currency", calculationCurrency);

    const totalCents = (expenseRows || []).reduce((sum, r: any) => sum + (r.amount_cents || 0), 0);
    
    // If budget currency differs from preferred currency, convert or use zero budget
    let budgetCents = 0;
    let budgetMismatch = false;
    if (effectiveBudgetRow) {
      if (budgetCurrency === userPreferredCurrency) {
        budgetCents = effectiveBudgetRow.amount_cents || 0;
      } else {
        budgetMismatch = true;
        // Budget exists in different currency - user should set budget in their preferred currency
      }
    }
    // Note: We could add currency conversion here in the future
    
    const remainingCents = Math.max(budgetCents - totalCents, 0);

    results.totals = {
      budget_cents: budgetCents,
      spent_cents: totalCents,
      remaining_cents: remainingCents,
      currency: calculationCurrency,
    };
  }

  // Simple text reply for bots to display
  // Determine the appropriate date for totals display
  let dateForTotals = dateStr;
  let dateLabel = 'Today';
  
  if (Array.isArray(results.expenses) && results.expenses.length) {
    const dates = new Set(results.expenses.map((r: any) => r.date));
    if (dates.size === 1) {
      dateForTotals = [...dates][0] as string;
      dateLabel = dateForTotals === new Date().toISOString().slice(0, 10) ? 'Today' : dateForTotals;
    }
  }

  // Recompute totals for the effective date
  if (contactId && dateForTotals !== dateStr) {
    // Try to fetch budget for the specific date
    const { data: budgetRow } = await supabase
      .from("daily_budgets")
      .select("amount_cents,currency")
      .eq("contact_id", contactId)
      .eq("date", dateForTotals)
      .maybeSingle();

    // If no budget for that date, fetch the most recent budget before that date
    let effectiveBudgetRow = budgetRow;
    if (!budgetRow) {
      const { data: recentBudget } = await supabase
        .from("daily_budgets")
        .select("amount_cents,currency")
        .eq("contact_id", contactId)
        .lt("date", dateForTotals)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      effectiveBudgetRow = recentBudget;
    }

    // Smart currency handling: prioritize user's preferred currency for effective date too
    const budgetCurrency = (effectiveBudgetRow?.currency || preferredCurrency).toUpperCase();
    const userPreferredCurrency = preferredCurrency.toUpperCase();
    const calculationCurrency = userPreferredCurrency;
    
    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("amount_cents")
      .eq("contact_id", contactId)
      .eq("date", dateForTotals)
      .eq("currency", calculationCurrency);

    const totalCents = (expenseRows || []).reduce((sum, r: any) => sum + (r.amount_cents || 0), 0);
    
    // If budget currency differs from preferred currency, convert or use zero budget
    let budgetCents = 0;
    if (effectiveBudgetRow && budgetCurrency === userPreferredCurrency) {
      budgetCents = effectiveBudgetRow.amount_cents || 0;
    }
    
    const remainingCents = Math.max(budgetCents - totalCents, 0);

    results.totals = {
      budget_cents: budgetCents,
      spent_cents: totalCents,
      remaining_cents: remainingCents,
      currency: calculationCurrency,
    };
  }

  let reply = "";
  if (results.totals) {
    const code = (results.totals.currency || preferredCurrency).toUpperCase();
    const sym = getCurrencySymbol(code);
    const toMoney = (cents: number) => (cents / 100).toFixed(2);
    const setPart = results.budget_set ? `Budget set to ${sym}${toMoney(results.budget_set.amount_cents)}. ` : "";
    const added = results.expenses_added ? `${results.expenses_added} expense(s) logged. ` : "";
    
    // Check if budget is zero due to currency mismatch
    const budgetMismatch = results.totals.budget_cents === 0 && results.totals.spent_cents > 0;
    
    if (budgetMismatch) {
      reply = `${setPart}${added}${dateLabel}: spent ${sym}${toMoney(results.totals.spent_cents)} (no budget set in ${code}). Set budget: /setBudget <amount> or change currency: /setCurrency <code>`;
    } else {
      reply = `${setPart}${added}${dateLabel}: spent ${sym}${toMoney(results.totals.spent_cents)} / budget ${sym}${toMoney(results.totals.budget_cents)}. Remaining: ${sym}${toMoney(results.totals.remaining_cents)}.`;
    }
  } else {
    reply = "Update recorded.";
  }

  return jsonResponse({ ok: true, results, reply });
});
