// Supabase Edge Function: finance-update
// Accepts free text + (phone OR userId), uses Gemini to derive structured update ops, then updates DB.

import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { parse } from "https://esm.sh/partial-json@0.1.7";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";



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
  
  // CURRENCY FALLBACK HIERARCHY (when Gemini doesn't detect currency):
  // 1. Currency detected in photo/text (Gemini handles this)
  // 2. inputCurrency from request (user's selected currency for this transaction)
  // 3. preferred_currency from user_contacts table
  // 4. 'USD' as final fallback
  const providedCurrency = inputCurrency ? inputCurrency.toUpperCase() : null;

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

  // Apply currency fallback hierarchy (layers 2-4, layer 1 is handled by Gemini)
  // Layer 2: User's selected currency (from request)
  // Layer 3: User's preferred_currency (from database)
  // Layer 4: 'USD' (final fallback)
  const preferredCurrency = providedCurrency || (contact?.preferred_currency as string | null) || 'USD';
  
  console.log('[finance-update] Currency fallback applied:', {
    layer: providedCurrency ? '2-inputCurrency' : contact?.preferred_currency ? '3-preferred_currency' : '4-USD',
    value: preferredCurrency,
    providedCurrency,
    dbPreferredCurrency: contact?.preferred_currency
  });

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
  // NOTE: results.currency will be updated later based on actual expenses added
  // Don't rely on this initial value - it's just a placeholder for the fallback
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
      .upsert([{ contact_id: contactId, date: budgetDate, amount_cents: budgetCents, currency: budgetCurrency, updated_at: new Date().toISOString() }], { onConflict: "contact_id,date,currency" });  // Updated: now includes currency

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
      
      // Ensure user_id is set so RLS policies (which rely on user_id) include this row
      // Prefer contact.user_id (from DB); fallback to provided userId when available
      const expenseUserId = (contact?.user_id as string | null) || (userId as string | null) || null;

      return {
        contact_id: contactId!,
        user_id: expenseUserId,
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
      
      console.log('[finance-update] Expenses inserted:', {
        count: insertedExpenses?.length || 0,
        currencies: insertedExpenses?.map((e: any) => e.currency),
        firstExpense: insertedExpenses?.[0] ? {
          id: insertedExpenses[0].id,
          currency: insertedExpenses[0].currency,
          amount_cents: insertedExpenses[0].amount_cents
        } : null
      });
    }
  }

  // Compute today totals and remaining - MULTI-CURRENCY SUPPORT
  if (contactId) {
    // SMART: Determine which currency to use for totals
    // Priority: 1) Currency of just-added expenses, 2) Preferred currency
    let calculationCurrency = preferredCurrency.toUpperCase();
    
    // If we just added expenses, use THEIR currency for totals (more intuitive)
    if (Array.isArray(results.expenses) && results.expenses.length > 0) {
      const expenseCurrencies = new Set(results.expenses.map((e: any) => (e.currency || preferredCurrency).toUpperCase()));
      
      console.log('[finance-update] Smart currency detection:', {
        expensesCount: results.expenses.length,
        detectedCurrencies: [...expenseCurrencies],
        preferredCurrency,
        firstExpense: results.expenses[0]
      });
      
      // If all expenses are in the same currency, use that
      if (expenseCurrencies.size === 1) {
        calculationCurrency = [...expenseCurrencies][0];
        console.log('[finance-update] Using expense currency for totals:', calculationCurrency);
      } else if (expenseCurrencies.size > 1) {
        console.log('[finance-update] Multiple currencies detected, using preferred:', preferredCurrency);
      }
    } else {
      console.log('[finance-update] No expenses added, using preferred currency:', preferredCurrency);
    }
    
    // Get ALL expenses for today to calculate totals by currency
    const { data: allExpenseRows } = await supabase
      .from("expenses")
      .select("amount_cents,currency")
      .eq("contact_id", contactId)
      .eq("date", dateStr);

    // Group expenses by currency
    const currencyTotals = new Map<string, number>();
    (allExpenseRows || []).forEach((r: any) => {
      const curr = (r.currency || 'USD').toUpperCase();
      const current = currencyTotals.get(curr) || 0;
      currencyTotals.set(curr, current + (r.amount_cents || 0));
    });

    // Get budget for the calculation currency
    const { data: budgetRow } = await supabase
      .from("daily_budgets")
      .select("amount_cents,currency")
      .eq("contact_id", contactId)
      .eq("date", dateStr)
      .eq("currency", calculationCurrency)
      .maybeSingle();

    // If no budget for today, fetch the most recent budget in that currency
    let effectiveBudgetRow = budgetRow;
    if (!budgetRow) {
      const { data: recentBudget } = await supabase
        .from("daily_budgets")
        .select("amount_cents,currency")
        .eq("contact_id", contactId)
        .eq("currency", calculationCurrency)
        .lt("date", dateStr)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      effectiveBudgetRow = recentBudget;
    }
    
    const budgetCents = effectiveBudgetRow?.amount_cents || 0;
    const totalCents = currencyTotals.get(calculationCurrency) || 0;
    const remainingCents = Math.max(budgetCents - totalCents, 0);

    results.totals = {
      budget_cents: budgetCents,
      spent_cents: totalCents,
      remaining_cents: remainingCents,
      currency: calculationCurrency,
      all_currencies: Object.fromEntries(currencyTotals),  // Include breakdown for multi-currency support
    };
  }

  // Simple text reply for bots to display
  // Determine the appropriate date for totals display
  let dateForTotals = dateStr;
  let dateLabel = dateForTotals; // Use actual date to avoid timezone issues
  
  if (Array.isArray(results.expenses) && results.expenses.length) {
    const dates = new Set(results.expenses.map((r: any) => r.date));
    if (dates.size === 1) {
      dateForTotals = [...dates][0] as string;
      dateLabel = dateForTotals; // Always show the actual date
    }
  }

  // Recompute totals for the effective date (if different from today)
  if (contactId && dateForTotals !== dateStr) {
    // SMART: Use same currency logic as above
    let calculationCurrency = preferredCurrency.toUpperCase();
    
    if (Array.isArray(results.expenses) && results.expenses.length > 0) {
      const expenseCurrencies = new Set(results.expenses.map((e: any) => (e.currency || preferredCurrency).toUpperCase()));
      if (expenseCurrencies.size === 1) {
        calculationCurrency = [...expenseCurrencies][0];
      }
    }
    
    // Get ALL expenses for that date
    const { data: allExpenseRows } = await supabase
      .from("expenses")
      .select("amount_cents,currency")
      .eq("contact_id", contactId)
      .eq("date", dateForTotals);

    const currencyTotals = new Map<string, number>();
    (allExpenseRows || []).forEach((r: any) => {
      const curr = (r.currency || 'USD').toUpperCase();
      const current = currencyTotals.get(curr) || 0;
      currencyTotals.set(curr, current + (r.amount_cents || 0));
    });

    // Get budget for the calculation currency
    const { data: budgetRow } = await supabase
      .from("daily_budgets")
      .select("amount_cents,currency")
      .eq("contact_id", contactId)
      .eq("date", dateForTotals)
      .eq("currency", calculationCurrency)
      .maybeSingle();

    let effectiveBudgetRow = budgetRow;
    if (!budgetRow) {
      const { data: recentBudget } = await supabase
        .from("daily_budgets")
        .select("amount_cents,currency")
        .eq("contact_id", contactId)
        .eq("currency", calculationCurrency)
        .lt("date", dateForTotals)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      effectiveBudgetRow = recentBudget;
    }
    
    const budgetCents = effectiveBudgetRow?.amount_cents || 0;
    const totalCents = currencyTotals.get(calculationCurrency) || 0;
    const remainingCents = Math.max(budgetCents - totalCents, 0);

    results.totals = {
      budget_cents: budgetCents,
      spent_cents: totalCents,
      remaining_cents: remainingCents,
      currency: calculationCurrency,
      all_currencies: Object.fromEntries(currencyTotals),
    };
    
    // CRITICAL: Update top-level currency to match totals currency
    // This ensures response.currency matches the actual calculations
    results.currency = calculationCurrency;
    console.log('[finance-update] Final currency set:', {
      topLevel: results.currency,
      totals: results.totals.currency,
      match: results.currency === results.totals.currency
    });
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
