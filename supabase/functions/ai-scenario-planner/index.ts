import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Initialize Supabase client with service role key for DB access
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

interface ScenarioRequestBody {
  question?: string; // e.g., "Can I buy a $1,200 laptop?"
  targetDate?: string; // YYYY-MM-DD
  userId?: string; // ignored for auth, we derive from JWT
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req.headers.get('Origin') || undefined),
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req.headers.get('Origin') || undefined), "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate user using JWT
    const authRes = await authenticateUser(req, supabaseClient);
    if (!authRes.success || !authRes.userId) {
      return new Response(JSON.stringify({ error: authRes.error || "Unauthorized" }), {
        status: authRes.statusCode || 401,
        headers: { ...getCorsHeaders(req.headers.get('Origin') || undefined), "Content-Type": "application/json" },
      });
    }
    const userId = authRes.userId;

    const body: ScenarioRequestBody = await req.json();
    const question = (body.question || "").trim();
    const targetDateStr = (body.targetDate || "").trim();

    if (!question || !question.toLowerCase().startsWith("can i")) {
      return new Response(JSON.stringify({ error: "Please provide a question starting with 'Can I...'." }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('Origin') || undefined), "Content-Type": "application/json" },
      });
    }

    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(targetDateStr)) {
      return new Response(JSON.stringify({ error: "Invalid targetDate. Use YYYY-MM-DD format." }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('Origin') || undefined), "Content-Type": "application/json" },
      });
    }

    const targetDate = new Date(targetDateStr);

    // Get the user's contact (to map to expenses/budgets contact_id)
    const { data: contact, error: contactError } = await supabaseClient
      .from('user_contacts')
      .select('id,user_id,phone_e164,verified,preferred_currency')
      .eq('user_id', userId)
      .eq('verified', true)
      .maybeSingle();

    if (contactError || !contact) {
      return new Response(JSON.stringify({ error: "Verified contact not found for user" }), {
        status: 404,
        headers: { ...getCorsHeaders(req.headers.get('Origin') || undefined), "Content-Type": "application/json" },
      });
    }

    const contactId = contact.id as string;

    // Build date range: last 6 months of data for context
    const today = new Date();
    const fromDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
    const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth()+1).padStart(2,'0')}-${String(fromDate.getDate()).padStart(2,'0')}`;
    const toStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // Fetch expenses and budgets
    const { data: expenses, error: expensesError } = await supabaseClient
      .from('expenses')
      .select('id,contact_id,date,amount_cents,currency,category')
      .eq('contact_id', contactId)
      .gte('date', fromStr)
      .lte('date', toStr)
      .order('date', { ascending: true });

    const { data: budgets, error: budgetsError } = await supabaseClient
      .from('daily_budgets')
      .select('id,contact_id,date,amount_cents,currency')
      .eq('contact_id', contactId)
      .gte('date', fromStr)
      .lte('date', toStr)
      .order('date', { ascending: true });

    if (expensesError) console.warn('Expenses fetch error:', expensesError.message);
    if (budgetsError) console.warn('Budgets fetch error:', budgetsError.message);

    // Optionally fetch goals & financial profiles if available (best-effort)
    const { data: goals } = await supabaseClient
      .from('financial_goals')
      .select('id, name, target_amount, current_amount, start_date, target_date, is_on_track')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: finProfiles } = await supabaseClient
      .from('financial_health_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Aggregate stats
    function centsToAmount(x?: number | null) { return ((x || 0) / 100.0); }

    const daily: Record<string, { spent: number; budget: number }> = {};
    for (const e of expenses || []) {
      const k = (e.date as string).slice(0, 10);
      daily[k] ??= { spent: 0, budget: 0 };
      daily[k].spent += centsToAmount(e.amount_cents as number);
    }
    for (const b of budgets || []) {
      const k = (b.date as string).slice(0, 10);
      daily[k] ??= { spent: 0, budget: 0 };
      daily[k].budget += centsToAmount(b.amount_cents as number);
    }

    const sortedDates = Object.keys(daily).sort();
    let running = 0;
    let totalSpent = 0;
    let totalBudget = 0;
    const deltas: number[] = [];
    for (const d of sortedDates) {
      const net = (daily[d].budget || 0) - (daily[d].spent || 0);
      deltas.push(net);
      running += net;
      totalSpent += daily[d].spent || 0;
      totalBudget += daily[d].budget || 0;
    }

    const days = sortedDates.length || 1;
    const avgDailySpent = totalSpent / days;
    const avgDailyBudget = totalBudget / days;
    const avgNetPerDay = deltas.length ? deltas.reduce((a,b)=>a+b,0) / deltas.length : 0;

    // Monthly summaries and top categories (last 90 days)
    const categoryTotals: Record<string, number> = {};
    const monthly: Record<string, { spent: number; budget: number; net: number }> = {};
    const ninetyDaysAgo = new Date(today.getTime() - 90*24*60*60*1000);

    for (const e of expenses || []) {
      const dt = new Date(e.date as string);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      monthly[ym] ??= { spent: 0, budget: 0, net: 0 };
      const amt = centsToAmount(e.amount_cents as number);
      monthly[ym].spent += amt;
      if (e.category) {
        const key = String(e.category).toLowerCase();
        if (dt >= ninetyDaysAgo) categoryTotals[key] = (categoryTotals[key] || 0) + amt;
      }
    }
    for (const b of budgets || []) {
      const dt = new Date(b.date as string);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      monthly[ym] ??= { spent: 0, budget: 0, net: 0 };
      const amt = centsToAmount(b.amount_cents as number);
      monthly[ym].budget += amt;
    }
    for (const k in monthly) monthly[k].net = monthly[k].budget - monthly[k].spent;

    const topCategories = Object.entries(categoryTotals)
      .sort((a,b)=>b[1]-a[1])
      .slice(0, 8)
      .map(([category, amount])=>({ category, amount }));

    // Projection to target date (linear baseline)
    const lastDate = sortedDates.length ? new Date(sortedDates[sortedDates.length-1]) : today;
    const daysUntilTarget = Math.max(0, Math.ceil((targetDate.getTime() - new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime()) / (1000*60*60*24)));
    const projectedNoScenario = running + avgNetPerDay * daysUntilTarget;

    // Prepare prompt for Gemini
    const currency = contact.preferred_currency || 'USD';
    const advisoryPrompt = `You are a fiduciary financial advisor (Moneko) with deep expertise in personal finance, budgeting, and savings strategy. A user asked a scenario question they want evaluated by ${targetDateStr}. Provide a thorough, data-driven assessment using the provided user data. If their goal is not achievable within the timeframe, propose realistic alternatives, trade-offs, and a step-by-step plan to get as close as possible.

Strict requirements:
- Speak in a supportive, clear, and actionable tone.
- Base your analysis on the supplied data only; do not invent numbers.
- Include: (1) Feasibility verdict, (2) Key drivers (income/budget vs spending by category), (3) Risks and assumptions, (4) Concrete plan with quantified adjustments (category cuts, timeline shifts, or additional income), (5) A short "week-by-week" or "month-by-month" playbook until ${targetDateStr}, (6) What to monitor weekly.
- Use the user's currency ${currency} for any amounts.
- Keep the final answer as plain text (markdown is OK). Avoid code fences.

USER_QUESTION: ${question}
TARGET_DATE: ${targetDateStr}

USER_DATA:
- Contact: ${JSON.stringify({ id: contact.id, currency, phone: contact.phone_e164 }, null, 2)}
- SummaryStats: ${JSON.stringify({
      windowFrom: fromStr,
      windowTo: toStr,
      daysWithData: days,
      totalSpent,
      totalBudget,
      avgDailySpent,
      avgDailyBudget,
      avgNetPerDay,
      currentRunningBalance: running,
      projectedNoScenarioByTarget: projectedNoScenario,
      daysUntilTarget: daysUntilTarget,
    }, null, 2)}
- Monthly: ${JSON.stringify(monthly, null, 2)}
- TopCategories90d: ${JSON.stringify(topCategories, null, 2)}
- Goals: ${JSON.stringify(goals || [], null, 2)}
- FinancialHealthProfile: ${JSON.stringify(finProfiles && finProfiles[0] || null, null, 2)}

Now analyze deeply and provide a comprehensive advisory response.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 2000,
      temperature: 0.6,
    } as const;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: advisoryPrompt }] }],
    }, generationConfig);

    const aiAdvice = result.response.text();

    return new Response(JSON.stringify({
      success: true,
      advice: aiAdvice,
      meta: {
        currency,
        targetDate: targetDateStr,
        stats: {
          windowFrom: fromStr,
          windowTo: toStr,
          daysWithData: days,
          avgNetPerDay,
          currentRunningBalance: running,
          projectedNoScenarioByTarget: projectedNoScenario,
        },
      },
    }), {
      headers: { ...getCorsHeaders(req.headers.get('Origin') || undefined), "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Scenario planner error:", errorMessage);
    if (error instanceof Error && error.stack) console.error(error.stack);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('Origin') || undefined), "Content-Type": "application/json" },
    });
  }
});
