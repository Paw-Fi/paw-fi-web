import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error(
    "CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.",
  );
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
  language?: string; // ISO 639-1 or language tag, e.g., "en" or "zh-CN"
  currency?: string; // e.g., "USD", "EUR"
  currencies?: string[];
  mode?: "personal" | "household";
  householdId?: string;
}

interface CurrencyTotals {
  income: number;
  spent: number;
  budget: number;
  netCashflow: number;
  budgetRemaining: number;
}

function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

function normalizeCurrencyList(value: unknown, fallbackCurrency: string) {
  const values = Array.isArray(value) ? value : [];
  const normalized = values
    .map((item) => normalizeCurrencyCode(item))
    .filter((item): item is string => Boolean(item));
  const unique = Array.from(new Set([fallbackCurrency, ...normalized]));
  return unique.length > 0 ? unique : [fallbackCurrency];
}

function createCurrencyTotals(): CurrencyTotals {
  return {
    income: 0,
    spent: 0,
    budget: 0,
    netCashflow: 0,
    budgetRemaining: 0,
  };
}

function addCurrencyAmount(
  totals: Record<string, CurrencyTotals>,
  currency: string,
  field: "income" | "spent" | "budget",
  amount: number,
) {
  totals[currency] ??= createCurrencyTotals();
  totals[currency][field] += amount;
  totals[currency].netCashflow =
    totals[currency].income - totals[currency].spent;
  totals[currency].budgetRemaining =
    totals[currency].budget - totals[currency].spent;
}

function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
) {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

// Convert locale-specific digits (Arabic-Indic, Eastern-Arabic, Thai, etc.) to ASCII
function toAsciiDigits(s: string): string {
  const maps: Record<string, string> = {
    // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
    "\u0660": "0",
    "\u0661": "1",
    "\u0662": "2",
    "\u0663": "3",
    "\u0664": "4",
    "\u0665": "5",
    "\u0666": "6",
    "\u0667": "7",
    "\u0668": "8",
    "\u0669": "9",
    // Eastern Arabic (Persian) ۰۱۲۳۴۵۶۷۸۹
    "\u06F0": "0",
    "\u06F1": "1",
    "\u06F2": "2",
    "\u06F3": "3",
    "\u06F4": "4",
    "\u06F5": "5",
    "\u06F6": "6",
    "\u06F7": "7",
    "\u06F8": "8",
    "\u06F9": "9",
    // Thai ๐๑๒๓๔๕๖๗๘๙
    "\u0E50": "0",
    "\u0E51": "1",
    "\u0E52": "2",
    "\u0E53": "3",
    "\u0E54": "4",
    "\u0E55": "5",
    "\u0E56": "6",
    "\u0E57": "7",
    "\u0E58": "8",
    "\u0E59": "9",
  };
  return s.replace(
    /[\u0660-\u0669\u06F0-\u06F9\u0E50-\u0E59]/g,
    (d) => maps[d] || d,
  );
}

// Decide numeric date order for a locale
function dateOrderFor(lang: string): "YMD" | "DMY" | "MDY" {
  const lc = (lang || "en").toLowerCase();
  const ymd = new Set(["zh", "ja", "ko"]);
  const mdy = new Set(["en", "en-us"]);
  if (ymd.has(lc)) return "YMD";
  if (mdy.has(lc)) return "MDY";
  return "DMY";
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (!y || !m || !d) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

function normalizeYear(year: number, lang: string): number {
  // Handle Thai Buddhist Era years ~256x → Gregorian
  if (year > 2200 && (lang.startsWith("th") || lang === "th")) {
    return year - 543;
  }
  if (year < 100) return 2000 + year; // assume near future
  return year;
}

function parseLocalizedDate(
  input: string,
  lang: string,
): { date: Date; iso: string } | null {
  if (!input) return null;
  let s = toAsciiDigits(input.trim());

  // Keep only digits and common separators
  s = s.replace(/[^0-9\-./]/g, "");

  // Try ISO quickly: YYYY-MM-DD (or with / or .)
  let m = s.match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$/);
  if (m) {
    let y = normalizeYear(parseInt(m[1], 10), lang);
    const mo = parseInt(m[2], 10);
    const da = parseInt(m[3], 10);
    if (isValidYMD(y, mo, da)) {
      const iso = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(
        2,
        "0",
      )}`;
      return { date: new Date(iso), iso };
    }
  }

  // Patterns like 01/02/2025 or 01-02-25
  m = s.match(/^(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2,4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    let y = normalizeYear(parseInt(m[3], 10), lang);
    const order = dateOrderFor(lang);
    // DMY vs MDY
    const [dd, mm] = order === "MDY" ? [b, a] : [a, b];
    if (isValidYMD(y, mm, dd)) {
      const iso = `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
        2,
        "0",
      )}`;
      return { date: new Date(iso), iso };
    }
  }

  // Compact digits 8 chars: YYYYMMDD or DDMMYYYY or MMDDYYYY (locale guided)
  m = s.match(/^(\d{8})$/);
  if (m) {
    const raw = m[1];
    const order = dateOrderFor(lang);
    // Prefer YYYYMMDD if starts with 19xx/20xx/21xx/25xx
    const yCandidate = parseInt(raw.slice(0, 4), 10);
    if (yCandidate >= 1900) {
      const y = normalizeYear(yCandidate, lang);
      const mo = parseInt(raw.slice(4, 6), 10);
      const da = parseInt(raw.slice(6, 8), 10);
      if (isValidYMD(y, mo, da)) {
        const iso = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(
          2,
          "0",
        )}`;
        return { date: new Date(iso), iso };
      }
    }
    // Fall back by locale order
    if (order === "MDY") {
      const mo = parseInt(raw.slice(0, 2), 10);
      const da = parseInt(raw.slice(2, 4), 10);
      const y = normalizeYear(parseInt(raw.slice(4, 8), 10), lang);
      if (isValidYMD(y, mo, da)) {
        const iso = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(
          2,
          "0",
        )}`;
        return { date: new Date(iso), iso };
      }
    } else {
      const da = parseInt(raw.slice(0, 2), 10);
      const mo = parseInt(raw.slice(2, 4), 10);
      const y = normalizeYear(parseInt(raw.slice(4, 8), 10), lang);
      if (isValidYMD(y, mo, da)) {
        const iso = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(
          2,
          "0",
        )}`;
        return { date: new Date(iso), iso };
      }
    }
  }

  return null;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req.headers.get("Origin") || undefined),
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: {
        ...getCorsHeaders(req.headers.get("Origin") || undefined),
        "Content-Type": "application/json",
      },
    });
  }

  try {
    // Authenticate user using JWT
    const authRes = await authenticateUser(req, supabaseClient);
    if (!authRes.success || !authRes.userId) {
      return new Response(
        JSON.stringify({ error: authRes.error || "Unauthorized" }),
        {
          status: authRes.statusCode || 401,
          headers: {
            ...getCorsHeaders(req.headers.get("Origin") || undefined),
            "Content-Type": "application/json",
          },
        },
      );
    }
    const userId = authRes.userId;

    const body: ScenarioRequestBody = await req.json();
    const question = (body.question || "").trim();
    const targetDateInput = (body.targetDate || "").trim();
    const languageRaw = (body.language || "").trim();
    const language = /^[a-z]{2}(-[A-Z]{2})?$/.test(languageRaw)
      ? languageRaw
      : "en";
    const displayCurrency = normalizeCurrencyCode(body.currency) || "USD";
    const selectedCurrencies = normalizeCurrencyList(
      body.currencies,
      displayCurrency,
    );
    const currencySymbol = getCurrencySymbol(displayCurrency);
    const mode: "personal" | "household" =
      body.mode === "household" ? "household" : "personal";
    const householdId =
      mode === "household" ? (body.householdId || "").trim() : "";

    // Accept non-English and various word orders; only require non-empty content
    if (!question) {
      return new Response(
        JSON.stringify({ error: "Please provide a non-empty question." }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req.headers.get("Origin") || undefined),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const parsed = parseLocalizedDate(targetDateInput, language.toLowerCase());
    if (!parsed) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid targetDate. Supply a valid date in your locale (e.g., YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, or YYYY/MM/DD).",
        }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req.headers.get("Origin") || undefined),
            "Content-Type": "application/json",
          },
        },
      );
    }
    const targetDate = parsed.date;
    const targetDateStr = parsed.iso;

    if (mode === "household" && !householdId) {
      return new Response(
        JSON.stringify({
          error: "householdId is required when mode is 'household'.",
        }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req.headers.get("Origin") || undefined),
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (mode === "household") {
      const { data: membership, error: membershipError } = await supabaseClient
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError || !membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: {
            ...getCorsHeaders(req.headers.get("Origin") || undefined),
            "Content-Type": "application/json",
          },
        });
      }
    }

    // Build date range: last 12 months of data for seasonal context.
    const today = new Date();
    const fromDate = new Date(
      today.getFullYear(),
      today.getMonth() - 12,
      today.getDate(),
    );
    const fromStr = `${fromDate.getFullYear()}-${String(
      fromDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`;
    const toStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Build base queries for expenses and budgets (select only fields actually used)
    let expensesQuery = supabaseClient
      .from("expenses")
      .select("user_id,date,amount_cents,currency,category,owner_type,type")
      .gte("date", fromStr)
      .lte("date", toStr)
      .in("type", ["expense", "income"])
      .in("currency", selectedCurrencies)
      .is("deleted_at", null);

    if (mode === "household") {
      expensesQuery = expensesQuery.eq("household_id", householdId);
    } else {
      expensesQuery = expensesQuery.eq("user_id", userId);
    }

    // Budgets are now stored as monthly totals in the budgets table.
    // We fetch the relevant months for the current window and derive
    // both monthly and per-day budget figures from total_budget_cents.
    let budgetsQuery = supabaseClient
      .from("budgets")
      .select("period_month,total_budget_cents,currency")
      .gte("period_month", fromStr)
      .lte("period_month", toStr)
      .in("currency", selectedCurrencies);

    const { data: rateSnapshot } = await supabaseClient
      .from("currency_rate_snapshots")
      .select("rates")
      .eq("base_currency", "USD")
      .maybeSingle();
    const currencyRates =
      rateSnapshot?.rates && typeof rateSnapshot.rates === "object"
        ? (rateSnapshot.rates as Record<string, number>)
        : { USD: 1 };

    if (mode === "household") {
      budgetsQuery = budgetsQuery.eq("household_id", householdId);
    } else {
      budgetsQuery = budgetsQuery
        .eq("user_id", userId)
        .is("household_id", null);
    }

    let accountsQuery = supabaseClient
      .from("accounts")
      .select("name, opening_balance_cents, currency, is_default, is_system")
      .eq("is_archived", false)
      .in("currency", selectedCurrencies);
    if (mode === "household") {
      accountsQuery = accountsQuery.eq("household_id", householdId);
    } else {
      accountsQuery = accountsQuery
        .eq("user_id", userId)
        .is("household_id", null);
    }

    // Run expenses, budgets, accounts, and financial profiles queries in parallel
    const [
      { data: expenses, error: expensesError },
      { data: budgets, error: budgetsError },
      { data: accounts },
      { data: finProfiles },
    ] = await Promise.all([
      expensesQuery.order("date", { ascending: true }),
      budgetsQuery.order("period_month", { ascending: true }),
      accountsQuery.order("is_default", { ascending: false }),
      supabaseClient
        .from("financial_health_profiles")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (expensesError) {
      console.warn("Expenses fetch error:", expensesError.message);
    }
    if (budgetsError) {
      console.warn("Budgets fetch error:", budgetsError.message);
    }

    // Aggregate stats
    function centsToAmount(x?: number | null) {
      return (x || 0) / 100.0;
    }

    const daily: Record<
      string,
      { spent: number; budget: number; income: number }
    > = {};
    const memberTotalsByUser: Record<string, CurrencyTotals> = {};
    const ownerTypeTotals: Record<string, CurrencyTotals> = {};
    const categoryTotals: Record<string, number> = {};
    const monthly: Record<string, CurrencyTotals> = {};
    const nativeCurrencyTotals: Record<string, CurrencyTotals> = {};
    const observedCurrencies = new Set<string>();
    const missingRateCurrencies = new Set<string>();

    function convertToDisplayCurrency(amount: number, fromCurrency: string) {
      const converted = convertAmount(
        amount,
        fromCurrency,
        displayCurrency,
        currencyRates,
      );
      if (converted == null) {
        missingRateCurrencies.add(fromCurrency);
        missingRateCurrencies.add(displayCurrency);
      }
      return converted;
    }

    function ensureDaily(dateStr: string) {
      daily[dateStr] ??= { spent: 0, budget: 0, income: 0 };
      return daily[dateStr];
    }

    // Aggregate transactions in both native currencies and display currency.
    for (const e of expenses || []) {
      const dateStr = (e.date as string).slice(0, 10);
      const dt = new Date(e.date as string);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const rowCurrency = normalizeCurrencyCode(e.currency) || displayCurrency;
      const amount = centsToAmount(Math.abs(e.amount_cents as number));
      const transactionType = String(e.type || "expense").toLowerCase();
      const isIncome = transactionType === "income";
      observedCurrencies.add(rowCurrency);
      addCurrencyAmount(
        nativeCurrencyTotals,
        rowCurrency,
        isIncome ? "income" : "spent",
        amount,
      );

      const converted = convertToDisplayCurrency(amount, rowCurrency);
      if (converted == null) continue;

      const day = ensureDaily(dateStr);
      monthly[ym] ??= createCurrencyTotals();
      addCurrencyAmount(monthly, ym, isIncome ? "income" : "spent", converted);
      if (isIncome) {
        day.income += converted;
      } else {
        day.spent += converted;
        if (e.category) {
          const key = String(e.category).toLowerCase();
          const ninetyDaysAgo = new Date(
            today.getTime() - 90 * 24 * 60 * 60 * 1000,
          );
          if (dt >= ninetyDaysAgo) {
            categoryTotals[key] = (categoryTotals[key] || 0) + converted;
          }
        }
      }

      if (mode === "household") {
        const uid = (e.user_id as string) || "unknown";
        const ownerType = (e.owner_type as string) || "unknown";
        addCurrencyAmount(
          memberTotalsByUser,
          uid,
          isIncome ? "income" : "spent",
          converted,
        );
        addCurrencyAmount(
          ownerTypeTotals,
          ownerType,
          isIncome ? "income" : "spent",
          converted,
        );
      }
    }

    // Aggregate monthly budgets and derive a per-day budget series by
    // spreading each month's total evenly across its days.
    const monthlyBudgetTotals: Record<string, number> = {};
    for (const b of budgets || []) {
      const period = (b.period_month as string).slice(0, 10); // YYYY-MM-DD
      const ym = period.slice(0, 7); // YYYY-MM
      const rowCurrency = normalizeCurrencyCode(b.currency) || displayCurrency;
      const amount = centsToAmount(Math.abs(b.total_budget_cents as number));
      observedCurrencies.add(rowCurrency);
      addCurrencyAmount(nativeCurrencyTotals, rowCurrency, "budget", amount);
      const amt = convertToDisplayCurrency(amount, rowCurrency);
      if (amt == null) continue;

      monthly[ym] ??= createCurrencyTotals();
      addCurrencyAmount(monthly, ym, "budget", amt);
      monthlyBudgetTotals[ym] = (monthlyBudgetTotals[ym] || 0) + amt;
    }

    for (const ym in monthlyBudgetTotals) {
      const [yearStr, monthStr] = ym.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (!year || !month) continue;

      const firstOfMonth = new Date(year, month - 1, 1);
      const lastOfMonth = new Date(year, month, 0);
      const daysInMonth = lastOfMonth.getDate();
      const perDay = monthlyBudgetTotals[ym] / daysInMonth;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
          day,
        ).padStart(2, "0")}`;
        if (dateStr < fromStr || dateStr > toStr) continue;
        ensureDaily(dateStr).budget += perDay;
      }
    }

    const sortedDates = Object.keys(daily).sort();
    let budgetRemainingToDate = 0;
    let netCashflowToDate = 0;
    let totalSpent = 0;
    let totalBudget = 0;
    let totalIncome = 0;
    const budgetDeltas: number[] = [];
    const cashflowDeltas: number[] = [];
    for (const d of sortedDates) {
      const budgetRemaining = (daily[d].budget || 0) - (daily[d].spent || 0);
      const netCashflow = (daily[d].income || 0) - (daily[d].spent || 0);
      budgetDeltas.push(budgetRemaining);
      cashflowDeltas.push(netCashflow);
      budgetRemainingToDate += budgetRemaining;
      netCashflowToDate += netCashflow;
      totalSpent += daily[d].spent || 0;
      totalBudget += daily[d].budget || 0;
      totalIncome += daily[d].income || 0;
    }

    const days = sortedDates.length || 1;
    const avgDailySpent = totalSpent / days;
    const avgDailyBudget = totalBudget / days;
    const avgDailyIncome = totalIncome / days;
    const avgDailyBudgetRemaining = budgetDeltas.length
      ? budgetDeltas.reduce((a, b) => a + b, 0) / budgetDeltas.length
      : 0;
    const avgDailyNetCashflow = cashflowDeltas.length
      ? cashflowDeltas.reduce((a, b) => a + b, 0) / cashflowDeltas.length
      : 0;

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, amount]) => ({ category, amount }));

    // Projection to target date (linear baseline)
    const lastDate = sortedDates.length
      ? new Date(sortedDates[sortedDates.length - 1])
      : today;
    const daysUntilTarget = Math.max(
      0,
      Math.ceil(
        (targetDate.getTime() -
          new Date(
            lastDate.getFullYear(),
            lastDate.getMonth(),
            lastDate.getDate(),
          ).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const projectedBudgetRemainingByTarget =
      budgetRemainingToDate + avgDailyBudgetRemaining * daysUntilTarget;
    const projectedNetCashflowByTarget =
      netCashflowToDate + avgDailyNetCashflow * daysUntilTarget;

    // Prepare prompt for Gemini
    const perspective =
      mode === "household"
        ? "their household's shared finances"
        : "their personal finances";
    const actorLabel = mode === "household" ? "A household" : "A user";
    const householdMembersSummary =
      mode === "household"
        ? {
            byMember: Object.fromEntries(
              Object.values(memberTotalsByUser).map((totals, index) => [
                `member_${index + 1}`,
                totals,
              ]),
            ),
            byOwnerType: ownerTypeTotals,
          }
        : null;
    const allCurrenciesInData = Array.from(observedCurrencies).sort();
    const missingRates = Array.from(missingRateCurrencies).sort();
    const accountsForPrompt = (accounts || []).map((account) => ({
      name: account.name ?? null,
      openingBalance: centsToAmount(account.opening_balance_cents as number),
      currency: normalizeCurrencyCode(account.currency) || displayCurrency,
      isDefault: account.is_default === true,
      isSystem: account.is_system === true,
    }));
    const rawFinancialProfile = (finProfiles && finProfiles[0]) as Record<
      string,
      unknown
    > | null;
    const financialHealthProfile = rawFinancialProfile
      ? Object.fromEntries(
          Object.entries(rawFinancialProfile).filter(
            ([key]) =>
              !["id", "user_id", "created_at", "updated_at"].includes(key),
          ),
        )
      : null;

    const advisoryPrompt = `You are Moneko's financial scenario coach. Help the user make a practical budgeting decision using ONLY the provided data. Be direct, calm, and useful for real financial stress, not harsh or moralizing.

SCOPE:
- "we/our/family" -> use Household data.
- "I/my" -> use Personal data.
- Current request context: ${actorLabel} asking about ${perspective}.
- The data may include multiple currencies. Use displayCurrency for comparable math, but never ignore native currency totals.
- If exchange rates are missing for any native currency, say the affected math is incomplete instead of pretending it is exact.

HARD OUTPUT RULES (violating = failure):
1. Output MUST be Markdown.
2. Keep the answer concise: 8–14 visible lines.
3. Header MUST be translated to ${language}: "# YES", "# NO", or "# CAUTION" (e.g. "# OUI").
4. Tone: supportive, concrete, non-judgmental.
5. Use ${currencySymbol} for display-currency amounts and include currency codes when useful.

ANALYSIS RULES:
- First answer the user's actual question, not only affordability.
- Use net cashflow (income - spending), budget remaining (budget - spending), top categories, accounts, and financial health profile when relevant.
- For purchase questions, compare the cost against projectedBudgetRemainingByTarget and projectedNetCashflowByTarget.
- For anxiety, debt, savings, or budget-control questions, give a small next action and one guardrail metric.
- If data is sparse or missing, state the assumption and give a safer recommendation.

REQUIRED FORMAT (Strictly follow this structure):

# [Translated YES / NO / CAUTION]
**Verdict:** [Direct answer with confidence level.]
**Why:** [Use the most relevant numbers, not every number.]
**Currency note:** [Mention multi-currency context only if it changes confidence.]
**Trade-off:** [What category, account, or cashflow is affected.]
**Path to Yes:**
- [One immediate action]
- [One timing or spending guardrail]
**Watch:** [The 1 number/category to monitor next.]

USER_QUESTION: ${question}
TARGET_DATE: ${targetDateStr || "Not specified"}

USER_DATA:
- Context: ${JSON.stringify({ mode, householdScope: mode === "household", displayCurrency, displayCurrencySymbol: currencySymbol, selectedCurrenciesFromUi: selectedCurrencies, allCurrenciesInData, missingRates })}
- DisplayCurrencyTrends: ${JSON.stringify({
      daysAnalyzed: days,
      totalIncomeInPeriod: totalIncome,
      totalSpentInPeriod: totalSpent,
      totalBudgetInPeriod: totalBudget,
      avgDailySpend: avgDailySpent,
      avgDailyIncome,
      avgDailyBudget,
      avgDailyNetCashflow,
      avgDailyBudgetRemaining,
      netCashflowToDate,
      budgetRemainingToDate,
      projectedNetCashflowByTarget,
      projectedBudgetRemainingByTarget,
    })}
- NativeCurrencyTotals: ${JSON.stringify(nativeCurrencyTotals)}
- MonthlyDisplayCurrency: ${JSON.stringify(monthly)}
- TopSpendCategoriesInDisplayCurrency: ${JSON.stringify(topCategories)}
- Accounts: ${JSON.stringify(accountsForPrompt)}
- AccountBalanceNote: ${JSON.stringify("Account rows include opening balances only; do not treat them as current cash unless supported by cashflow data.")}
- FinancialHealthProfile: ${JSON.stringify(financialHealthProfile)}
${mode === "household" ? `- HouseholdMembers: ${JSON.stringify(householdMembersSummary)}` : ""}

LANGUAGE:
- Response MUST be in ${language}.
- Translate ALL labels and headers (including "# YES/NO/CAUTION", "Verdict", "The Math", etc) to ${language}.
- Use local currency/number format.`;

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 2000,
      temperature: 0.6,
    } as const;

    const encoder = new TextEncoder();

    const metaPayload = {
      currency: displayCurrency,
      targetDate: targetDateStr,
      language,
      mode,
      householdId: mode === "household" ? householdId : null,
      currencies: {
        selected: selectedCurrencies,
        observed: allCurrenciesInData,
        missingRates,
      },
      stats: {
        windowFrom: fromStr,
        windowTo: toStr,
        daysWithData: days,
        avgDailyNetCashflow,
        avgDailyBudgetRemaining,
        netCashflowToDate,
        budgetRemainingToDate,
        projectedNetCashflowByTarget,
        projectedBudgetRemainingByTarget,
      },
    };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // 1) Emit meta information first so the client can set up UI/state.
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "meta", meta: metaPayload }) + "\n",
            ),
          );

          // 2) Stream Gemini content chunks as they arrive.
          const result = await model.generateContentStream({
            contents: [{ role: "user", parts: [{ text: advisoryPrompt }] }],
            generationConfig,
          });

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (!text) continue;
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "chunk", text }) + "\n"),
            );
          }

          // 3) Final done marker so client knows the stream is complete.
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "done" }) + "\n"),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "error", error: message }) + "\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...getCorsHeaders(req.headers.get("Origin") || undefined),
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Scenario planner error:", errorMessage);
    if (error instanceof Error && error.stack) console.error(error.stack);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: errorMessage }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(req.headers.get("Origin") || undefined),
          "Content-Type": "application/json",
        },
      },
    );
  }
});
