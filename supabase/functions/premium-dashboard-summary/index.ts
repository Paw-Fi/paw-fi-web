import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess, sanitizeUuid } from "../shared/accounts.ts";
import { getUserPremiumAccessByUserId } from "../shared/premium-access.ts";
import { resolveFinancialPeriodStartForUser } from "../shared/budgets-helpers.ts";

interface DashboardSummaryRequest {
  startDate?: string;
  endDate?: string;
  displayCurrency?: string;
  selectedCurrencies?: string[];
  accountId?: string | null;
  householdId?: string | null;
  category?: string | null;
  search?: string | null;
}

interface TransactionRow {
  id: string;
  user_id: string;
  privacy_scope: string | null;
  date: string;
  amount_cents: number;
  currency: string | null;
  category: string | null;
  raw_text: string | null;
  receipt_image_url: string | null;
  attachments: unknown;
  account_id: string | null;
  type: string | null;
  merchant: string | null;
  analytics_is_final: boolean;
  analytics_spending_multiplier: number;
  analytics_counts_toward_income: boolean;
}

interface AccountRow {
  id: string;
  name: string;
  currency: string | null;
  opening_balance_cents: number | null;
}

interface BudgetRow {
  id: string;
  total_budget_cents: number | null;
  currency: string | null;
}

interface EnvelopeRow {
  id: string;
  budget_id: string;
  name: string;
  currency: string | null;
  budget_amount_cents: number | null;
  budget_percentage: number | null;
}

interface DashboardActionItem {
  id: string;
  severity: "info" | "success" | "warning";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405,
      corsHeaders,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      500,
      corsHeaders,
    );
  }

  try {
    const body = await readJsonBody(req);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-premium-dashboard-summary" },
      },
    });

    const auth = await authenticateUser(req, supabase);
    if (!auth.success || !auth.userId) {
      return jsonResponse(
        { success: false, error: auth.error ?? "Unauthorized" },
        auth.statusCode ?? 401,
        corsHeaders,
      );
    }

    const access = await getUserPremiumAccessByUserId(supabase, auth.userId);
    if (!access.hasPremiumAccess) {
      return jsonResponse(
        {
          success: false,
          error: "Premium access required",
          code: "PREMIUM_REQUIRED",
          plan: access.plan,
          status: access.status,
        },
        403,
        corsHeaders,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const defaultStartDate = await resolveFinancialPeriodStartForUser(
      supabase,
      auth.userId,
      today,
    );
    const filters = validateFilters(body, defaultStartDate, today);
    if ("error" in filters) {
      return jsonResponse(
        { success: false, error: filters.error },
        400,
        corsHeaders,
      );
    }

    const canAccessScope = await assertScopeAccess(
      supabase,
      auth.userId,
      filters.householdId,
    );
    if (!canAccessScope) {
      return jsonResponse(
        { success: false, error: "Forbidden scope" },
        403,
        corsHeaders,
      );
    }

    const [
      transactions,
      accounts,
      budgets,
      envelopes,
      recurring,
      emailAttachmentCount,
    ] = await Promise.all([
      fetchTransactions(supabase, auth.userId, filters),
      fetchAccounts(supabase, auth.userId, filters),
      fetchBudgets(supabase, auth.userId, filters),
      fetchEnvelopes(supabase, auth.userId, filters),
      fetchRecurring(supabase, auth.userId, filters),
      fetchEmailAttachmentCount(supabase, auth.userId, filters),
    ]);

    const accountNameById = new Map(
      accounts.map((account) => [account.id, account.name]),
    );
    const displayTransactions = transactions.filter(
      (row) => normalizeCurrency(row.currency) === filters.displayCurrency,
    );
    const detailTransactions = displayTransactions.filter(
      (row) =>
        row.user_id === auth.userId || row.privacy_scope !== "balances_only",
    );
    const expenseRows = displayTransactions.filter(
      (row) => row.analytics_spending_multiplier !== 0,
    );
    const detailExpenseRows = detailTransactions.filter(
      (row) => row.analytics_spending_multiplier !== 0,
    );
    const incomeRows = displayTransactions.filter(
      (row) => row.analytics_counts_toward_income,
    );
    const expenseCents = expenseRows.reduce(
      (sum, row) => sum + canonicalSpendingCents(row),
      0,
    );
    const incomeCents = sumAbs(incomeRows.map((row) => row.amount_cents));
    const cashOnHandCents = computeCashOnHand(
      accounts,
      transactions,
      filters.displayCurrency,
    );
    const receiptCount = detailTransactions.filter(
      hasReceiptOrAttachment,
    ).length;
    const purchaseRows = detailExpenseRows.filter(
      (row) => row.analytics_spending_multiplier > 0,
    );
    const missingReceiptCount = purchaseRows.filter(
      (row) => !hasReceiptOrAttachment(row),
    ).length;
    const uncategorizedCount = purchaseRows.filter((row) =>
      isUncategorized(row.category),
    ).length;

    const payload = {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        displayCurrency: filters.displayCurrency,
      },
      totals: {
        cashOnHandCents,
        netWorthCents: cashOnHandCents,
        incomeCents,
        expenseCents,
        netCashflowCents: incomeCents - expenseCents,
        profitLossCents: incomeCents - expenseCents,
        receiptCoveragePercent:
          detailExpenseRows.length === 0
            ? 100
            : Math.round(
                ((detailExpenseRows.length - missingReceiptCount) /
                  detailExpenseRows.length) *
                  100,
              ),
      },
      trends: buildTrends(detailTransactions),
      actionItems: buildActionItems({
        uncategorizedCount,
        missingReceiptCount,
        recurringCount: recurring.length,
        emailAttachmentCount,
      }),
      budgetProgress: buildBudgetProgress({
        budgets,
        envelopes,
        expenseRows: detailExpenseRows,
        displayCurrency: filters.displayCurrency,
      }),
      topCategories: buildTopCategories(
        detailExpenseRows,
        filters.displayCurrency,
      ),
      recentTransactions: transactions
        .filter(
          (row) =>
            row.user_id === auth.userId ||
            row.privacy_scope !== "balances_only",
        )
        .slice(0, 25)
        .map((row) => ({
          id: row.id,
          type: normalizeType(row.type),
          date: row.date,
          amountCents: Math.abs(Number(row.amount_cents ?? 0)),
          currency: normalizeCurrency(row.currency),
          category: row.category || "uncategorized",
          description: row.raw_text,
          merchant: row.merchant,
          accountId: row.account_id,
          accountName: row.account_id
            ? (accountNameById.get(row.account_id) ?? null)
            : null,
          receiptImageUrl: row.receipt_image_url,
          attachmentCount: attachmentCount(row.attachments),
        })),
      exportReadiness: {
        transactionCount: detailTransactions.length,
        receiptCount,
        emailAttachmentCount,
        uncategorizedCount,
        missingReceiptCount,
      },
    };

    return jsonResponse({ success: true, data: payload }, 200, corsHeaders);
  } catch (error) {
    console.error("[premium-dashboard-summary] failed", error);
    return jsonResponse(
      { success: false, error: "Failed to build dashboard summary" },
      500,
      corsHeaders,
    );
  }
});

async function readJsonBody(req: Request): Promise<DashboardSummaryRequest> {
  const text = await req.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as DashboardSummaryRequest;
}

function validateFilters(
  body: DashboardSummaryRequest,
  defaultStartDate: string,
  defaultEndDate: string,
): NormalizedFilters | { error: string } {
  const startDate = normalizeDate(body.startDate) ?? defaultStartDate;
  const endDate = normalizeDate(body.endDate) ?? defaultEndDate;
  if (
    (body.startDate && !normalizeDate(body.startDate)) ||
    (body.endDate && !normalizeDate(body.endDate))
  ) {
    return { error: "Invalid date range" };
  }
  if (startDate > endDate) return { error: "startDate must be before endDate" };

  const displayCurrency = normalizeCurrency(body.displayCurrency) ?? "USD";
  const selectedCurrencies = normalizeCurrencies(body.selectedCurrencies) ?? [
    displayCurrency,
  ];
  if (body.selectedCurrencies != null && selectedCurrencies.length === 0) {
    return { error: "Invalid selectedCurrencies" };
  }

  const accountId =
    body.accountId == null ? null : sanitizeUuid(body.accountId);
  if (body.accountId && !accountId) return { error: "Invalid accountId" };
  const householdId =
    body.householdId == null ? null : sanitizeUuid(body.householdId);
  if (body.householdId && !householdId) return { error: "Invalid householdId" };

  return {
    startDate,
    endDate,
    displayCurrency,
    selectedCurrencies,
    accountId,
    householdId,
    category: normalizeTextFilter(body.category),
    search: normalizeTextFilter(body.search),
  };
}

interface NormalizedFilters {
  startDate: string;
  endDate: string;
  displayCurrency: string;
  selectedCurrencies: string[];
  accountId: string | null;
  householdId: string | null;
  category: string | null;
  search: string | null;
}

async function fetchTransactions(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<TransactionRow[]> {
  let query = supabase
    .from("expenses")
    .select(
      "id, user_id, privacy_scope, date, amount_cents, currency, category, raw_text, receipt_image_url, attachments, account_id, type, merchant, analytics_is_final, analytics_spending_multiplier, analytics_counts_toward_income",
    )
    .eq("is_recurring", false)
    .is("deleted_at", null)
    .gte("date", filters.startDate)
    .lte("date", filters.endDate)
    .in("currency", filters.selectedCurrencies)
    .order("date", { ascending: false })
    .limit(500);

  query = applyScope(query, userId, filters.householdId);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.category) query = query.ilike("category", filters.category);
  if (filters.search) {
    query = query.or(
      `raw_text.ilike.%${escapeIlike(filters.search)}%,merchant.ilike.%${escapeIlike(
        filters.search,
      )}%,category.ilike.%${escapeIlike(filters.search)}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TransactionRow[];
}

async function fetchRecurring(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<TransactionRow[]> {
  let query = supabase
    .from("expenses")
    .select(
      "id, user_id, privacy_scope, date, amount_cents, currency, category, raw_text, receipt_image_url, attachments, account_id, type, merchant, analytics_is_final, analytics_spending_multiplier, analytics_counts_toward_income",
    )
    .eq("is_recurring", true)
    .is("deleted_at", null)
    .in("currency", filters.selectedCurrencies)
    .limit(50);
  query = applyScope(query, userId, filters.householdId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TransactionRow[];
}

async function fetchAccounts(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<AccountRow[]> {
  let query = supabase
    .from("accounts")
    .select("id, name, currency, opening_balance_cents")
    .eq("is_archived", false)
    .in("currency", filters.selectedCurrencies);
  query = filters.householdId
    ? query.eq("household_id", filters.householdId)
    : query.eq("user_id", userId).is("household_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

async function fetchBudgets(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<BudgetRow[]> {
  const financialPeriodStart = await resolveFinancialPeriodStartForUser(
    supabase,
    userId,
    filters.startDate,
  );
  const periodStart = `${financialPeriodStart.slice(0, 7)}-01`;
  let query = supabase
    .from("budgets")
    .select("id, total_budget_cents, currency")
    .eq("period_month", periodStart)
    .in("currency", filters.selectedCurrencies);
  query = filters.householdId
    ? query.eq("household_id", filters.householdId)
    : query.eq("user_id", userId).is("household_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BudgetRow[];
}

async function fetchEnvelopes(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<EnvelopeRow[]> {
  let query = supabase
    .from("budget_envelopes")
    .select(
      "id, budget_id, name, currency, budget_amount_cents, budget_percentage",
    )
    .in("currency", filters.selectedCurrencies);
  query = filters.householdId
    ? query.eq("household_id", filters.householdId)
    : query.eq("user_id", userId).is("household_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EnvelopeRow[];
}

async function fetchEmailAttachmentCount(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<number> {
  let query = supabase
    .from("email_import_attachments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${filters.startDate}T00:00:00.000Z`)
    .lte("created_at", `${filters.endDate}T23:59:59.999Z`);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function applyScope(query: any, userId: string, householdId: string | null) {
  return householdId
    ? query.eq("household_id", householdId)
    : query.eq("user_id", userId).is("household_id", null);
}

function computeCashOnHand(
  accounts: AccountRow[],
  transactions: TransactionRow[],
  displayCurrency: string,
): number {
  const displayAccounts = accounts.filter(
    (account) => normalizeCurrency(account.currency) === displayCurrency,
  );
  const accountIds = new Set(displayAccounts.map((account) => account.id));
  const opening = sumAbs(
    displayAccounts.map((account) =>
      Number(account.opening_balance_cents ?? 0),
    ),
  );
  let transactionNet = 0;
  for (const transaction of transactions) {
    if (normalizeCurrency(transaction.currency) !== displayCurrency) continue;
    if (transaction.account_id && !accountIds.has(transaction.account_id)) {
      continue;
    }
    if (!transaction.analytics_is_final) continue;
    const amount = Math.abs(Number(transaction.amount_cents ?? 0));
    transactionNet +=
      normalizeType(transaction.type) === "income" ? amount : -amount;
  }
  return opening + transactionNet;
}

function buildTrends(transactions: TransactionRow[]) {
  const byDate = new Map<
    string,
    { incomeCents: number; expenseCents: number }
  >();
  for (const row of transactions) {
    const bucket = byDate.get(row.date) ?? { incomeCents: 0, expenseCents: 0 };
    const amount = Math.abs(Number(row.amount_cents ?? 0));
    if (row.analytics_counts_toward_income) bucket.incomeCents += amount;
    bucket.expenseCents += canonicalSpendingCents(row);
    byDate.set(row.date, bucket);
  }
  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, totals]) => ({
      date,
      incomeCents: totals.incomeCents,
      expenseCents: totals.expenseCents,
      netCashflowCents: totals.incomeCents - totals.expenseCents,
    }));
}

function buildActionItems(params: {
  uncategorizedCount: number;
  missingReceiptCount: number;
  recurringCount: number;
  emailAttachmentCount: number;
}) {
  const items: DashboardActionItem[] = [];
  if (params.missingReceiptCount > 0) {
    items.push({
      id: "missing-receipts",
      severity: "warning",
      title: `${params.missingReceiptCount} expenses are missing receipts`,
      description:
        "Add receipts or export the list for cleanup before tax time.",
      actionLabel: "Review transactions",
      actionHref: "/dashboard",
    });
  }
  if (params.uncategorizedCount > 0) {
    items.push({
      id: "uncategorized",
      severity: "warning",
      title: `${params.uncategorizedCount} transactions need categories`,
      description:
        "Categorized transactions make reports and exports more useful.",
      actionLabel: "Review categories",
      actionHref: "/dashboard",
    });
  }
  if (params.recurringCount > 0) {
    items.push({
      id: "upcoming-recurring",
      severity: "info",
      title: `${params.recurringCount} recurring items are active`,
      description:
        "Check upcoming recurring bills and income before month end.",
    });
  }
  items.push({
    id: "export-ready",
    severity: params.emailAttachmentCount > 0 ? "success" : "info",
    title: "Your tax package can be exported",
    description:
      "Download transactions, category data, receipts, and retained premium originals from the Export Center.",
    actionLabel: "Export for your accountant",
    actionHref: "#export-center",
  });
  return items;
}

function buildBudgetProgress(params: {
  budgets: BudgetRow[];
  envelopes: EnvelopeRow[];
  expenseRows: TransactionRow[];
  displayCurrency: string;
}) {
  const budgetById = new Map(
    params.budgets.map((budget) => [budget.id, budget]),
  );
  return params.envelopes
    .filter(
      (envelope) =>
        normalizeCurrency(envelope.currency) === params.displayCurrency,
    )
    .slice(0, 12)
    .map((envelope) => {
      const budget = budgetById.get(envelope.budget_id);
      const allocated =
        Number(envelope.budget_amount_cents ?? 0) ||
        Math.round(
          (Number(budget?.total_budget_cents ?? 0) *
            Number(envelope.budget_percentage ?? 0)) /
            100,
        );
      const spent = params.expenseRows
        .filter(
          (row) =>
            normalizeCategory(row.category) ===
            normalizeCategory(envelope.name),
        )
        .reduce((sum, row) => sum + canonicalSpendingCents(row), 0);
      return {
        id: envelope.id,
        name: envelope.name,
        allocatedCents: allocated,
        spentCents: spent,
        remainingCents: allocated - spent,
        currency: params.displayCurrency,
      };
    });
}

function buildTopCategories(
  expenseRows: TransactionRow[],
  displayCurrency: string,
) {
  const categories = new Map<
    string,
    { amountCents: number; transactionCount: number }
  >();
  for (const row of expenseRows) {
    const category = normalizeCategory(row.category);
    const current = categories.get(category) ?? {
      amountCents: 0,
      transactionCount: 0,
    };
    current.amountCents += canonicalSpendingCents(row);
    current.transactionCount += 1;
    categories.set(category, current);
  }
  return Array.from(categories.entries())
    .map(([category, value]) => ({
      category,
      ...value,
      currency: displayCurrency,
    }))
    .sort((left, right) => right.amountCents - left.amountCents)
    .slice(0, 8);
}

function canonicalSpendingCents(row: TransactionRow): number {
  if (!row.analytics_is_final) return 0;
  return (
    Math.abs(Number(row.amount_cents ?? 0)) *
    Number(row.analytics_spending_multiplier ?? 0)
  );
}

function hasReceiptOrAttachment(row: TransactionRow): boolean {
  return Boolean(row.receipt_image_url) || attachmentCount(row.attachments) > 0;
}

function attachmentCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function isUncategorized(category: string | null): boolean {
  const normalized = normalizeCategory(category);
  return (
    normalized === "" ||
    normalized === "uncategorized" ||
    normalized === "other"
  );
}

function normalizeCategory(category: string | null): string {
  return (category ?? "uncategorized").trim().toLowerCase();
}

function normalizeType(value: string | null): "income" | "expense" {
  return String(value ?? "expense").toLowerCase() === "income"
    ? "income"
    : "expense";
}

function sumAbs(values: Array<number | null | undefined>): number {
  return values.reduce<number>(
    (sum, value) => sum + Math.abs(Number(value ?? 0)),
    0,
  );
}

function normalizeDate(value?: string | null): string | null {
  if (!value || !DATE_REGEX.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function normalizeCurrency(value?: string | null): string {
  const normalized = (value ?? "USD").trim().toUpperCase();
  return CURRENCY_REGEX.test(normalized) ? normalized : "USD";
}

function normalizeCurrencies(values?: string[] | null): string[] | null {
  if (!Array.isArray(values)) return null;
  const normalized = Array.from(new Set(values.map(normalizeCurrency)));
  return normalized.length <= 20 ? normalized : [];
}

function normalizeTextFilter(value?: string | null): string | null {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 && normalized.length <= 120 ? normalized : null;
}

function escapeIlike(value: string): string {
  return value
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .replaceAll(",", " ");
}

function jsonResponse(
  payload: unknown,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}
