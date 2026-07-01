import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess, sanitizeUuid } from "../shared/accounts.ts";
import { getUserPremiumAccessByUserId } from "../shared/premium-access.ts";

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
  recurrence_rule?: unknown;
  created_at?: string | null;
}

interface AccountRow {
  id: string;
  name: string;
  currency: string | null;
  opening_balance_cents: number | null;
  is_default?: boolean | null;
  is_system?: boolean | null;
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
  icon?: string | null;
  color?: string | null;
  category?: string | null;
}

interface CurrencyRateTable {
  rates: Record<string, number>;
}

interface ActionItem {
  id: string;
  severity: "info" | "warning" | "urgent" | "success";
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
    const filters = validateFilters(body);
    if ("error" in filters) {
      return jsonResponse(
        { success: false, error: filters.error },
        400,
        corsHeaders,
      );
    }

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

    if (filters.shouldResolveDefaultCurrency) {
      const defaultCurrency = await resolveDefaultDisplayCurrency(
        supabase,
        auth.userId,
        filters.householdId,
      );
      filters.displayCurrency = defaultCurrency;
      filters.selectedCurrencies = [defaultCurrency];
    }

    const contactIds = await fetchContactIds(supabase, auth.userId);

    const [
      transactions,
      accounts,
      budgets,
      envelopes,
      recurring,
      emailAttachmentCount,
      currencyRates,
    ] = await Promise.all([
      fetchTransactions(supabase, auth.userId, filters, contactIds),
      fetchAccounts(supabase, auth.userId, filters),
      fetchBudgets(supabase, auth.userId, filters),
      fetchEnvelopes(supabase, auth.userId, filters),
      fetchRecurring(supabase, auth.userId, filters, contactIds),
      fetchEmailAttachmentCount(supabase, auth.userId, filters),
      fetchCurrencyRates(supabase),
    ]);

    const accountNameById = new Map(
      accounts.map((account) => [account.id, account.name]),
    );
    const aggregateRows = transactions;
    const expenseRows = aggregateRows.filter(
      (row) => normalizeType(row.type) === "expense",
    );
    const incomeRows = aggregateRows.filter(
      (row) => normalizeType(row.type) === "income",
    );
    const expenseCents = sumConvertedAbs(
      expenseRows,
      filters.displayCurrency,
      currencyRates,
    );
    const incomeCents = sumConvertedAbs(
      incomeRows,
      filters.displayCurrency,
      currencyRates,
    );
    const walletSummary = buildWalletSummary({
      accounts,
      transactions,
      displayCurrency: filters.displayCurrency,
      currencyRates,
    });
    const cashOnHandCents = walletSummary.netWorthCents;
    const receiptCount = transactions.filter(hasReceiptOrAttachment).length;
    const missingReceiptCount = expenseRows.filter(
      (row) => !hasReceiptOrAttachment(row),
    ).length;
    const uncategorizedCount = transactions.filter((row) =>
      isUncategorized(row.category)
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
        receiptCoveragePercent: expenseRows.length === 0 ? 100 : Math.round(
          ((expenseRows.length - missingReceiptCount) /
            expenseRows.length) *
            100,
        ),
      },
      trends: buildTrends({
        transactions: aggregateRows,
        displayCurrency: filters.displayCurrency,
        currencyRates,
      }),
      actionItems: buildActionItems({
        uncategorizedCount,
        missingReceiptCount,
        recurringCount: recurring.length,
        emailAttachmentCount,
      }),
      budgetProgress: buildBudgetProgress({
        budgets,
        envelopes,
        expenseRows,
        displayCurrency: filters.displayCurrency,
        currencyRates,
      }),
      topCategories: buildTopCategories({
        expenseRows,
        displayCurrency: filters.displayCurrency,
        currencyRates,
      }),
      recurring: buildRecurringSummary({
        recurring,
        accountNameById,
        displayCurrency: filters.displayCurrency,
        currencyRates,
      }),
      wallets: walletSummary,
      recentTransactions: transactions.slice(0, 25).map((row) => ({
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
        transactionCount: transactions.length,
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
): NormalizedFilters | { error: string } {
  const now = new Date();
  const startDate = normalizeDate(body.startDate) ??
    `${now.getUTCFullYear()}-${
      String(now.getUTCMonth() + 1).padStart(2, "0")
    }-01`;
  const endDate = normalizeDate(body.endDate) ?? now.toISOString().slice(0, 10);
  if (
    (body.startDate && !normalizeDate(body.startDate)) ||
    (body.endDate && !normalizeDate(body.endDate))
  ) {
    return { error: "Invalid date range" };
  }
  if (startDate > endDate) return { error: "startDate must be before endDate" };
  if (body.displayCurrency && !isValidCurrency(body.displayCurrency)) {
    return { error: "Invalid displayCurrency" };
  }

  const explicitDisplayCurrency = isValidCurrency(body.displayCurrency)
    ? normalizeCurrency(body.displayCurrency)
    : null;
  const providedSelectedCurrencies = normalizeCurrencies(
    body.selectedCurrencies,
  );
  if (
    body.selectedCurrencies != null &&
    (!providedSelectedCurrencies || providedSelectedCurrencies.length === 0)
  ) {
    return { error: "Invalid selectedCurrencies" };
  }
  const displayCurrency = explicitDisplayCurrency ??
    providedSelectedCurrencies?.[0] ?? "USD";
  const selectedCurrencies = providedSelectedCurrencies ??
    (explicitDisplayCurrency ? [displayCurrency] : []);

  const accountId = body.accountId == null
    ? null
    : sanitizeUuid(body.accountId);
  if (body.accountId && !accountId) return { error: "Invalid accountId" };
  const householdId = body.householdId == null
    ? null
    : sanitizeUuid(body.householdId);
  if (body.householdId && !householdId) return { error: "Invalid householdId" };

  return {
    startDate,
    endDate,
    displayCurrency,
    selectedCurrencies: selectedCurrencies.length > 0
      ? selectedCurrencies
      : [displayCurrency],
    shouldResolveDefaultCurrency: !explicitDisplayCurrency &&
      body.selectedCurrencies == null,
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
  shouldResolveDefaultCurrency: boolean;
  accountId: string | null;
  householdId: string | null;
  category: string | null;
  search: string | null;
}

async function resolveDefaultDisplayCurrency(
  supabase: any,
  userId: string,
  householdId: string | null,
): Promise<string> {
  let query = supabase
    .from("accounts")
    .select("currency")
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  query = householdId
    ? query.eq("household_id", householdId)
    : query.eq("user_id", userId).is("household_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return normalizeCurrency(data?.[0]?.currency);
}

async function fetchContactIds(
  supabase: any,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_contacts")
    .select("id")
    .eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function fetchTransactions(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
  contactIds: string[],
): Promise<TransactionRow[]> {
  let query = supabase
    .from("expenses")
    .select(
      "id, date, amount_cents, currency, category, raw_text, receipt_image_url, attachments, account_id, type, merchant, created_at",
    )
    .eq("is_recurring", false)
    .is("deleted_at", null)
    .gte("date", filters.startDate)
    .lte("date", filters.endDate)
    .in("currency", filters.selectedCurrencies)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  query = applyScope(query, userId, filters.householdId, contactIds);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.category) query = query.ilike("category", filters.category);
  if (filters.search) {
    query = query.or(
      `raw_text.ilike.%${escapeIlike(filters.search)}%,merchant.ilike.%${
        escapeIlike(filters.search)
      }%,category.ilike.%${escapeIlike(filters.search)}%`,
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
  contactIds: string[],
): Promise<TransactionRow[]> {
  let query = supabase
    .from("expenses")
    .select(
      "id, date, amount_cents, currency, category, raw_text, receipt_image_url, attachments, account_id, type, merchant, recurrence_rule, created_at",
    )
    .eq("is_recurring", true)
    .is("deleted_at", null)
    .in("currency", filters.selectedCurrencies)
    .order("date", { ascending: true })
    .limit(50);
  query = applyScope(query, userId, filters.householdId, contactIds);
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
    .select("id, name, currency, opening_balance_cents, is_default, is_system")
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
  const monthStart = filters.startDate.slice(0, 7) + "-01";
  let query = supabase
    .from("budgets")
    .select("id, total_budget_cents, currency")
    .eq("period_month", monthStart)
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
      "id, budget_id, name, currency, budget_amount_cents, budget_percentage, icon, color, category",
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

async function fetchCurrencyRates(supabase: any): Promise<CurrencyRateTable> {
  const { data, error } = await supabase
    .from("currency_rate_snapshots")
    .select("rates")
    .eq("base_currency", "USD")
    .maybeSingle();
  if (error) throw error;
  const rawRates = data?.rates;
  const rates: Record<string, number> = { USD: 1 };
  if (rawRates && typeof rawRates === "object") {
    for (const [rawCurrency, rawRate] of Object.entries(rawRates)) {
      const currency = normalizeCurrency(rawCurrency);
      const rate = typeof rawRate === "number"
        ? rawRate
        : typeof rawRate === "string"
        ? Number.parseFloat(rawRate)
        : Number.NaN;
      if (Number.isFinite(rate) && rate > 0) {
        rates[currency] = rate;
      }
    }
  }
  return { rates };
}

function applyScope(
  query: any,
  userId: string,
  householdId: string | null,
  contactIds: string[] = [],
) {
  if (householdId) return query.eq("household_id", householdId);

  query = query.is("household_id", null);
  if (contactIds.length === 0) return query.eq("user_id", userId);
  return query.or(`user_id.eq.${userId},contact_id.in.(${contactIds.join(",")})`);
}

function buildTrends(params: {
  transactions: TransactionRow[];
  displayCurrency: string;
  currencyRates: CurrencyRateTable;
}) {
  const byDate = new Map<
    string,
    { incomeCents: number; expenseCents: number }
  >();
  for (const row of params.transactions) {
    const bucket = byDate.get(row.date) ?? { incomeCents: 0, expenseCents: 0 };
    const amount = convertAmountCents(
      Math.abs(Number(row.amount_cents ?? 0)),
      normalizeCurrency(row.currency),
      params.displayCurrency,
      params.currencyRates,
    );
    if (normalizeType(row.type) === "income") bucket.incomeCents += amount;
    else bucket.expenseCents += amount;
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
  const items: ActionItem[] = [];
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
  currencyRates: CurrencyRateTable;
}) {
  const budgetById = new Map(
    params.budgets.map((budget) => [budget.id, budget]),
  );
  return params.envelopes
    .slice(0, 12)
    .map((envelope) => {
      const budget = budgetById.get(envelope.budget_id);
      const currency = normalizeCurrency(envelope.currency ?? budget?.currency);
      const allocated = Number(envelope.budget_amount_cents ?? 0) ||
        Math.round(
          (Number(budget?.total_budget_cents ?? 0) *
            Number(envelope.budget_percentage ?? 0)) /
            100,
        );
      const spent = sumAbs(
        params.expenseRows
          .filter(
            (row) =>
              normalizeCurrency(row.currency) === currency &&
              normalizeCategory(row.category) ===
                normalizeCategory(envelope.name),
          )
          .map((row) => row.amount_cents),
      );
      return {
        id: envelope.id,
        name: envelope.name,
        allocatedCents: allocated,
        spentCents: spent,
        remainingCents: allocated - spent,
        currency,
        displayAllocatedCents: convertAmountCents(
          allocated,
          currency,
          params.displayCurrency,
          params.currencyRates,
        ),
        displaySpentCents: convertAmountCents(
          spent,
          currency,
          params.displayCurrency,
          params.currencyRates,
        ),
        displayRemainingCents: convertAmountCents(
          allocated - spent,
          currency,
          params.displayCurrency,
          params.currencyRates,
        ),
        icon: envelope.icon ?? null,
        color: envelope.color ?? null,
        category: envelope.category ?? envelope.name,
      };
    });
}

function buildTopCategories(params: {
  expenseRows: TransactionRow[];
  displayCurrency: string;
  currencyRates: CurrencyRateTable;
}) {
  const categories = new Map<
    string,
    { amountCents: number; transactionCount: number }
  >();
  for (const row of params.expenseRows) {
    const category = normalizeCategory(row.category);
    const current = categories.get(category) ?? {
      amountCents: 0,
      transactionCount: 0,
    };
    current.amountCents += convertAmountCents(
      Math.abs(Number(row.amount_cents ?? 0)),
      normalizeCurrency(row.currency),
      params.displayCurrency,
      params.currencyRates,
    );
    current.transactionCount += 1;
    categories.set(category, current);
  }
  return Array.from(categories.entries())
    .map(([category, value]) => ({
      category,
      ...value,
      currency: params.displayCurrency,
    }))
    .sort((left, right) => right.amountCents - left.amountCents)
    .slice(0, 8);
}

function buildRecurringSummary(params: {
  recurring: TransactionRow[];
  accountNameById: Map<string, string>;
  displayCurrency: string;
  currencyRates: CurrencyRateTable;
}) {
  let incomeCents = 0;
  let expenseCents = 0;
  const upcoming = params.recurring.slice(0, 8).map((row) => {
    const type = normalizeType(row.type);
    const nativeAmountCents = Math.abs(Number(row.amount_cents ?? 0));
    const currency = normalizeCurrency(row.currency);
    const displayAmountCents = convertAmountCents(
      nativeAmountCents,
      currency,
      params.displayCurrency,
      params.currencyRates,
    );
    if (type === "income") incomeCents += displayAmountCents;
    else expenseCents += displayAmountCents;

    return {
      id: row.id,
      type,
      date: row.date,
      amountCents: nativeAmountCents,
      displayAmountCents,
      currency,
      displayCurrency: params.displayCurrency,
      category: row.category || "uncategorized",
      description: row.raw_text,
      merchant: row.merchant,
      accountId: row.account_id,
      accountName: row.account_id
        ? (params.accountNameById.get(row.account_id) ?? null)
        : null,
      recurrenceRule: row.recurrence_rule ?? null,
    };
  });

  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    displayCurrency: params.displayCurrency,
    totalCount: params.recurring.length,
    upcoming,
  };
}

function buildWalletSummary(params: {
  accounts: AccountRow[];
  transactions: TransactionRow[];
  displayCurrency: string;
  currencyRates: CurrencyRateTable;
}) {
  const transactionsByAccount = new Map<string, TransactionRow[]>();
  for (const transaction of params.transactions) {
    if (!transaction.account_id) continue;
    const rows = transactionsByAccount.get(transaction.account_id) ?? [];
    rows.push(transaction);
    transactionsByAccount.set(transaction.account_id, rows);
  }

  let netWorthCents = 0;
  const wallets = params.accounts.map((account) => {
    const currency = normalizeCurrency(account.currency);
    let incomeCents = 0;
    let expenseCents = 0;
    for (const transaction of transactionsByAccount.get(account.id) ?? []) {
      if (normalizeCurrency(transaction.currency) !== currency) continue;
      const amount = Math.abs(Number(transaction.amount_cents ?? 0));
      if (normalizeType(transaction.type) === "income") incomeCents += amount;
      else expenseCents += amount;
    }
    const balanceCents =
      Number(account.opening_balance_cents ?? 0) + incomeCents - expenseCents;
    const displayBalanceCents = convertAmountCents(
      balanceCents,
      currency,
      params.displayCurrency,
      params.currencyRates,
    );
    netWorthCents += displayBalanceCents;
    return {
      id: account.id,
      name: account.name,
      currency,
      balanceCents,
      displayBalanceCents,
      incomeCents,
      expenseCents,
      isDefault: account.is_default == true,
      isSystem: account.is_system == true,
    };
  });

  return {
    netWorthCents,
    displayCurrency: params.displayCurrency,
    wallets: wallets.sort((left, right) => {
      if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
      return right.displayBalanceCents - left.displayBalanceCents;
    }),
  };
}

function hasReceiptOrAttachment(row: TransactionRow): boolean {
  return Boolean(row.receipt_image_url) || attachmentCount(row.attachments) > 0;
}

function attachmentCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function convertAmountCents(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string,
  table: CurrencyRateTable,
): number {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return Math.round(amountCents);

  const fromRate = table.rates[from];
  const toRate = table.rates[to];
  if (!fromRate || !toRate) {
    return Math.round(amountCents);
  }
  return Math.round((amountCents / fromRate) * toRate);
}

function sumConvertedAbs(
  rows: TransactionRow[],
  displayCurrency: string,
  currencyRates: CurrencyRateTable,
): number {
  return rows.reduce(
    (sum, row) =>
      sum +
      convertAmountCents(
        Math.abs(Number(row.amount_cents ?? 0)),
        normalizeCurrency(row.currency),
        displayCurrency,
        currencyRates,
      ),
    0,
  );
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

function isValidCurrency(value?: string | null): boolean {
  return Boolean(value && CURRENCY_REGEX.test(value.trim().toUpperCase()));
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
