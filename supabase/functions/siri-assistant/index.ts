import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { corsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import {
  createOrUpdateBudget,
  getBudgetStatusDirect,
  type SupabaseClient as BudgetSupabaseClient,
} from "../shared/budgets-helpers.ts";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SiriAssistantAction =
  | "budget.set_total"
  | "budget.status"
  | "spend.total"
  | "spend.analysis";

interface SiriAssistantRequestBody {
  action?: SiriAssistantAction;
  householdId?: string;
  isPortfolio?: boolean;
  currency?: string;
  amount?: number;
  periodMonth?: string;
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
}

interface ResolvedScope {
  householdId: string | null;
  isPortfolio: boolean;
  displayName: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400, details?: unknown) {
  return jsonResponse({ success: false, error: message, details }, status);
}

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function normalizeDateInput(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizePeriodMonth(value?: string | null): string {
  const now = new Date();
  const fallback = `${now.getUTCFullYear()}-${
    String(now.getUTCMonth() + 1).padStart(2, "0")
  }`;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function formatMoney(amountCents: number, currency: string): string {
  const symbol = getCurrencySymbol(currency) || currency.toUpperCase();
  return `${symbol}${(amountCents / 100).toFixed(2)}`;
}

function titleCaseCategory(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function currentMonthLabel(): string {
  return "this month";
}

function buildDateRangeFromPeriodLabel(periodLabel?: string | null): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const now = new Date();
  const label = (periodLabel || "").trim().toLowerCase();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (label === "today") {
    const day = end.toISOString().slice(0, 10);
    return { startDate: day, endDate: day, label: "today" };
  }

  if (label === "this week") {
    const weekday = end.getUTCDay();
    const offset = weekday === 0 ? 6 : weekday - 1;
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - offset);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      label: "this week",
    };
  }

  if (label === "last month") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const lastDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0),
    );
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: lastDay.toISOString().slice(0, 10),
      label: "last month",
    };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    label: currentMonthLabel(),
  };
}

async function loadUserContext(supabase: BudgetSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_contacts")
    .select("id, preferred_currency")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    await reportEdgeFunctionError({
      functionName: "siri-assistant",
      error,
      context: { operation: "user_contacts.load_user_context", userId },
    });
    throw new Error(`Failed to load user context: ${error.message}`);
  }

  return {
    contactId: (data?.id as string | undefined) ?? null,
    preferredCurrency: validateCurrency(
      data?.preferred_currency as string | undefined,
    ),
  };
}

async function resolveScope(
  supabase: BudgetSupabaseClient,
  userId: string,
  requestedHouseholdId?: string,
): Promise<ResolvedScope> {
  const householdId = sanitizeUuid(requestedHouseholdId);
  if (!householdId) {
    return {
      householdId: null,
      isPortfolio: false,
      displayName: "your personal account",
    };
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, name, owner_id, is_portfolio")
    .eq("id", householdId)
    .maybeSingle();

  if (householdError) {
    throw new Error(`Failed to resolve space: ${householdError.message}`);
  }

  if (!household) {
    throw new Error("The requested space no longer exists.");
  }

  if (household.owner_id !== userId) {
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      throw new Error(
        `Failed to verify space access: ${membershipError.message}`,
      );
    }

    if (!membership) {
      throw new Error("You do not have access to that space.");
    }
  }

  const displayName = typeof household.name === "string"
    ? household.name
    : "that space";

  return {
    householdId,
    isPortfolio: household.is_portfolio === true,
    displayName,
  };
}

async function queryExpenseRows(
  supabase: BudgetSupabaseClient,
  userId: string,
  scope: ResolvedScope,
  startDate: string,
  endDate: string,
  currency?: string | null,
) {
  let query = supabase
    .from("expenses")
    .select("amount_cents, currency, category, date")
    .eq("type", "expense")
    .is("deleted_at", null)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (scope.householdId) {
    query = query.eq("household_id", scope.householdId);
    if (scope.isPortfolio) {
      query = query.eq("user_id", userId);
    }
  } else {
    query = query.eq("user_id", userId).is("household_id", null);
  }

  if (currency) {
    query = query.eq("currency", currency);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load spending data: ${error.message}`);
  }

  return data ?? [];
}

function summarizeCategories(
  rows: Array<{ amount_cents: number; category: string | null }>,
) {
  const totals = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    const amount = Number(row.amount_cents) || 0;
    total += amount;
    const category = (row.category || "other").trim().toLowerCase() || "other";
    totals.set(category, (totals.get(category) || 0) + amount);
  }

  return Array.from(totals.entries())
    .map(([category, amountCents]) => ({
      category,
      amountCents,
      share: total > 0 ? amountCents / total : 0,
    }))
    .sort((left, right) => right.amountCents - left.amountCents);
}

async function buildBudgetStatusResponse(
  supabase: BudgetSupabaseClient,
  userId: string,
  scope: ResolvedScope,
  preferredCurrency: string | null,
  contactId: string | null,
  body: SiriAssistantRequestBody,
) {
  const currency = validateCurrency(body.currency) || preferredCurrency ||
    "USD";
  const periodMonth = normalizePeriodMonth(body.periodMonth);
  const budgetStatus = await getBudgetStatusDirect(
    supabase,
    userId,
    scope.householdId,
    periodMonth,
    currency,
    scope.isPortfolio,
    contactId ?? undefined,
  );

  if ((budgetStatus as { error?: { message?: string } }).error) {
    throw new Error(
      (budgetStatus as { error?: { message?: string } }).error?.message ||
        "Failed to fetch budget status.",
    );
  }

  if (!budgetStatus.budget) {
    return {
      success: true,
      data: {
        speech:
          `You do not have a ${currency} budget set for ${scope.displayName} this month yet.`,
        shouldOpenApp: false,
      },
    };
  }

  const totals = budgetStatus.totals;
  const remaining = formatMoney(totals.remaining_cents, currency);
  const budget = formatMoney(totals.budget_cents, currency);
  const spent = formatMoney(totals.spent_cents, currency);
  const leadEnvelope = (budgetStatus.envelopes || [])
    .slice()
    .sort((left: any, right: any) => right.spent_cents - left.spent_cents)[0];

  let speech =
    `For ${scope.displayName}, you have ${remaining} left out of ${budget} this month. You have spent ${spent} so far.`;
  if (leadEnvelope?.name) {
    speech += ` ${leadEnvelope.name} is your biggest pocket right now.`;
  }

  return {
    success: true,
    data: {
      speech,
      shouldOpenApp: false,
      totals,
      budgetId: budgetStatus.budget.id,
    },
  };
}

async function buildSpendTotalResponse(
  supabase: BudgetSupabaseClient,
  userId: string,
  scope: ResolvedScope,
  preferredCurrency: string | null,
  body: SiriAssistantRequestBody,
) {
  const normalizedCurrency = validateCurrency(body.currency);
  const explicitStartDate = normalizeDateInput(body.startDate);
  const explicitEndDate = normalizeDateInput(body.endDate);
  const period = explicitStartDate && explicitEndDate
    ? {
      startDate: explicitStartDate,
      endDate: explicitEndDate,
      label: (body.periodLabel || currentMonthLabel()).trim() ||
        currentMonthLabel(),
    }
    : buildDateRangeFromPeriodLabel(body.periodLabel);

  const rows = await queryExpenseRows(
    supabase,
    userId,
    scope,
    period.startDate,
    period.endDate,
    normalizedCurrency,
  );

  if (rows.length === 0) {
    return {
      success: true,
      data: {
        speech:
          `I could not find any expenses for ${scope.displayName} ${period.label}.`,
        shouldOpenApp: false,
      },
    };
  }

  const currencies = Array.from(
    new Set(rows.map((row: any) => String(row.currency || "USD"))),
  );
  if (!normalizedCurrency && currencies.length > 1) {
    const fallbackCurrency =
      preferredCurrency && currencies.includes(preferredCurrency)
        ? preferredCurrency
        : currencies[0];

    return {
      success: true,
      data: {
        speech:
          `You spent in ${currencies.length} currencies for ${scope.displayName} ${period.label}. Open Moneko for the full breakdown, or ask again in ${fallbackCurrency}.`,
        shouldOpenApp: false,
      },
    };
  }

  const currency = normalizedCurrency || currencies[0] || preferredCurrency ||
    "USD";
  const totalCents = rows.reduce(
    (sum: number, row: any) => sum + (Number(row.amount_cents) || 0),
    0,
  );
  const categories = summarizeCategories(
    rows as Array<{ amount_cents: number; category: string | null }>,
  );
  const topCategory = categories[0];
  let speech = `${period.label[0].toUpperCase()}${
    period.label.slice(1)
  } you spent ${
    formatMoney(totalCents, currency)
  } across ${rows.length} expense${
    rows.length == 1 ? "" : "s"
  } in ${scope.displayName}.`;
  if (topCategory) {
    speech += ` ${
      titleCaseCategory(topCategory.category)
    } was your top category.`;
  }

  return {
    success: true,
    data: {
      speech,
      shouldOpenApp: false,
      totalCents,
      currency,
      transactionCount: rows.length,
    },
  };
}

async function buildSpendAnalysisResponse(
  supabase: BudgetSupabaseClient,
  userId: string,
  scope: ResolvedScope,
  preferredCurrency: string | null,
  contactId: string | null,
  body: SiriAssistantRequestBody,
) {
  const totalResponse = await buildSpendTotalResponse(
    supabase,
    userId,
    scope,
    preferredCurrency,
    {
      ...body,
      periodLabel: body.periodLabel || currentMonthLabel(),
    },
  );

  const totalData = (totalResponse as { data?: Record<string, unknown> }).data;
  if (
    !totalData ||
    typeof totalData.currency !== "string" ||
    typeof totalData.totalCents !== "number"
  ) {
    return {
      success: true,
      data: {
        speech: totalData?.speech ??
          `I could not analyze spending for ${scope.displayName}.`,
        shouldOpenApp: true,
      },
    };
  }

  const explicitStartDate = normalizeDateInput(body.startDate);
  const explicitEndDate = normalizeDateInput(body.endDate);
  const period = explicitStartDate && explicitEndDate
    ? {
      startDate: explicitStartDate,
      endDate: explicitEndDate,
      label: (body.periodLabel || currentMonthLabel()).trim() ||
        currentMonthLabel(),
    }
    : buildDateRangeFromPeriodLabel(body.periodLabel || currentMonthLabel());
  const rows = await queryExpenseRows(
    supabase,
    userId,
    scope,
    period.startDate,
    period.endDate,
    totalData.currency as string,
  );
  const categories = summarizeCategories(
    rows as Array<{ amount_cents: number; category: string | null }>,
  ).slice(0, 3);

  let budgetMessage = "";
  const budgetStatus = await getBudgetStatusDirect(
    supabase,
    userId,
    scope.householdId,
    normalizePeriodMonth(body.periodMonth),
    totalData.currency as string,
    scope.isPortfolio,
    contactId ?? undefined,
  );
  const analysisBudget = budgetStatus as {
    budget?: { id: string } | null;
    totals?: { remaining_cents: number };
  };
  if (analysisBudget.budget && analysisBudget.totals) {
    const remaining = formatMoney(
      analysisBudget.totals.remaining_cents,
      totalData.currency as string,
    );
    budgetMessage = ` You have ${remaining} left in budget.`;
  }

  const categoryMessage = categories
    .map(
      (entry) =>
        `${titleCaseCategory(entry.category)} at ${
          Math.round(entry.share * 100)
        }%`,
    )
    .join(", ");

  let speech = `${period.label[0].toUpperCase()}${
    period.label.slice(1)
  } you spent ${
    formatMoney(totalData.totalCents as number, totalData.currency as string)
  } in ${scope.displayName}.`;
  if (categoryMessage) {
    speech += ` Your top categories were ${categoryMessage}.`;
  }
  speech += budgetMessage;

  return {
    success: true,
    data: {
      speech,
      shouldOpenApp: true,
      currency: totalData.currency,
      totalCents: totalData.totalCents,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse("Server not configured", 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "moneko-siri-assistant" } },
  });
  const budgetSupabase = supabase as unknown as BudgetSupabaseClient;

  const authResult = await authenticateUser(req, supabase);
  if (!authResult.success || !authResult.userId) {
    return errorResponse(
      authResult.error || "Unauthorized",
      authResult.statusCode || 401,
    );
  }

  let body: SiriAssistantRequestBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const action = body.action;
  if (!action) {
    return errorResponse("'action' is required", 400);
  }

  try {
    const scope = await resolveScope(
      budgetSupabase,
      authResult.userId,
      body.householdId,
    );
    const { contactId, preferredCurrency } = await loadUserContext(
      budgetSupabase,
      authResult.userId,
    );

    switch (action) {
      case "budget.set_total": {
        const amount =
          typeof body.amount === "number" && Number.isFinite(body.amount)
            ? body.amount
            : NaN;
        if (!Number.isFinite(amount) || amount <= 0) {
          return errorResponse("A positive budget amount is required", 400);
        }

        const currency = validateCurrency(body.currency) || preferredCurrency ||
          "USD";
        const periodMonth = normalizePeriodMonth(body.periodMonth);
        const budgetResponse = await createOrUpdateBudget(
          budgetSupabase,
          authResult.userId,
          scope.householdId,
          periodMonth,
          currency,
          Math.round(amount * 100),
          scope.isPortfolio,
        );

        if (budgetResponse.error) {
          throw new Error(
            `Failed to save budget: ${budgetResponse.error.message}`,
          );
        }

        return jsonResponse({
          success: true,
          data: {
            speech: `Set the ${currency} budget for ${scope.displayName} to ${
              formatMoney(Math.round(amount * 100), currency)
            } this month.`,
            shouldOpenApp: false,
            budgetId: budgetResponse.data?.id ?? null,
          },
        });
      }
      case "budget.status":
        return jsonResponse(
          await buildBudgetStatusResponse(
            budgetSupabase,
            authResult.userId,
            scope,
            preferredCurrency,
            contactId,
            body,
          ),
        );
      case "spend.total":
        return jsonResponse(
          await buildSpendTotalResponse(
            budgetSupabase,
            authResult.userId,
            scope,
            preferredCurrency,
            body,
          ),
        );
      case "spend.analysis":
        return jsonResponse(
          await buildSpendAnalysisResponse(
            budgetSupabase,
            authResult.userId,
            scope,
            preferredCurrency,
            contactId,
            body,
          ),
        );
      default:
        return errorResponse("Unsupported Siri assistant action", 400);
    }
  } catch (error) {
    console.error("[siri-assistant] request failed", error);
    let safeMessage = "I could not complete that Siri request right now.";
    let status = 500;

    if (error instanceof Error) {
      if (error.message == "You do not have access to that space.") {
        safeMessage = error.message;
        status = 403;
      } else if (error.message == "The requested space no longer exists.") {
        safeMessage = error.message;
        status = 404;
      }
    }

    return errorResponse(safeMessage, status);
  }
});
