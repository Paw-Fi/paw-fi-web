import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { assertScopeAccess, sanitizeUuid } from "../shared/accounts.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";

interface RequestBody {
  householdId?: string;
  userId?: string;
  selectedCurrency?: string;
  currentMonthStart?: string;
  monthStarts?: string[];
}

interface WalletRow {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  icon: string;
  color: string;
  logo_url: string | null;
  opening_balance_cents: number;
  goal_amount_cents: number | null;
  currency: string;
  is_default: boolean;
  is_system: boolean;
  is_archived: boolean;
  linked_bank_account_id: string | null;
  current_balance_cents?: number;
}

interface WalletTransaction {
  id: string;
  userId: string | null;
  householdId: string | null;
  date: Date;
  amountCents: number;
  currency: string;
  category: string | null;
  rawText: string | null;
  splitGroupId: string | null;
  walletId: string | null;
  type: string;
  analyticsIsFinal: boolean;
  analyticsSpendingMultiplier: number;
  analyticsCountsTowardIncome: boolean;
}

interface RecurringRule {
  frequency: string;
  interval: number;
  anchorDate: Date;
  endDate: Date | null;
  excludedDates: Date[];
  projectionEnabled: boolean;
}

interface RecurringTransaction {
  id: string;
  userId: string | null;
  householdId: string | null;
  date: Date;
  amountCents: number;
  currency: string;
  category: string | null;
  description: string | null;
  splitGroupId: string | null;
  accountId: string | null;
  type: string;
  recurrenceRule: RecurringRule | null;
}

interface WalletSnapshot {
  totalIncomeCents: number;
  totalSpentCents: number;
  netWorthCents: number;
  walletBalances: Record<string, number>;
}

const projectedRecurringExpenseIdPattern = /^recurring_(.+)_([0-9]{8})$/;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseDateOnly(value: unknown): Date | null {
  const raw = `${value ?? ""}`.trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateOnly(value: Date): string {
  const year = value.getFullYear().toString().padStart(4, "0");
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeMonthStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthKey(value: Date): string {
  return formatDateOnly(normalizeMonthStart(value));
}

function dateKey(value: Date): string {
  const year = value.getFullYear().toString().padStart(4, "0");
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildProjectedRecurringExpenseId(
  recurringTransactionId: string,
  occurrenceDate: Date,
): string {
  return `recurring_${recurringTransactionId}_${dateKey(occurrenceDate)}`;
}

function extractRecurringTransactionIdFromProjectedExpenseId(
  expenseId: string,
): string | null {
  const match = projectedRecurringExpenseIdPattern.exec(expenseId);
  return match?.[1] ?? null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampDayOfMonth(year: number, month: number, day: number): number {
  return new Date(year, month, 0).getDate() < day
    ? new Date(year, month, 0).getDate()
    : day;
}

function buildDatePreservingTime(
  anchor: Date,
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(
    year,
    month - 1,
    day,
    anchor.getHours(),
    anchor.getMinutes(),
    anchor.getSeconds(),
    anchor.getMilliseconds(),
  );
}

function addMonthsFromAnchor(anchor: Date, monthsToAdd: number): Date {
  const newMonth = anchor.getMonth() + 1 + monthsToAdd;
  const newYear = anchor.getFullYear() + Math.floor((newMonth - 1) / 12);
  const adjustedMonth = ((((newMonth - 1) % 12) + 12) % 12) + 1;
  const adjustedDay = clampDayOfMonth(newYear, adjustedMonth, anchor.getDate());
  return buildDatePreservingTime(anchor, newYear, adjustedMonth, adjustedDay);
}

function addYearsFromAnchor(anchor: Date, yearsToAdd: number): Date {
  const newYear = anchor.getFullYear() + yearsToAdd;
  const adjustedDay = clampDayOfMonth(
    newYear,
    anchor.getMonth() + 1,
    anchor.getDate(),
  );
  return buildDatePreservingTime(
    anchor,
    newYear,
    anchor.getMonth() + 1,
    adjustedDay,
  );
}

function minDate(a: Date, b: Date | null): Date {
  if (b == null) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

function firstOnOrAfterDayStep(
  anchor: Date,
  rangeStart: Date,
  stepDays: number,
): Date {
  if (stepDays <= 0) return anchor;
  if (rangeStart.getTime() <= anchor.getTime()) return anchor;

  const diffDays = Math.floor(
    (rangeStart.getTime() - anchor.getTime()) / 86400000,
  );
  const offsetDays = diffDays % stepDays;
  const deltaDays = offsetDays === 0
    ? diffDays
    : diffDays + (stepDays - offsetDays);
  return new Date(anchor.getTime() + deltaDays * 86400000);
}

function resolveTransactionWalletId(
  transaction: WalletTransaction,
  _wallets: WalletRow[],
): string | null {
  const rawWalletId = transaction.walletId?.trim();
  if (rawWalletId) return rawWalletId;
  return null;
}

function buildWalletAvailableMonths(
  now: Date,
  transactions: WalletTransaction[],
): Date[] {
  const currentMonth = normalizeMonthStart(now);
  if (transactions.length === 0) {
    return [currentMonth];
  }

  let earliest = currentMonth;
  for (const transaction of transactions) {
    const transactionMonth = normalizeMonthStart(transaction.date);
    if (transactionMonth.getTime() < earliest.getTime()) {
      earliest = transactionMonth;
    }
  }

  const months: Date[] = [];
  let cursor = currentMonth;
  while (cursor.getTime() >= earliest.getTime()) {
    months.push(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }
  return months;
}

function buildWalletSnapshot(
  wallets: WalletRow[],
  transactions: WalletTransaction[],
  endExclusive: Date,
): WalletSnapshot {
  const filteredTransactions = transactions.filter(
    (transaction) => transaction.date.getTime() < endExclusive.getTime(),
  );

  let totalIncomeCents = 0;
  let totalSpentCents = 0;
  for (const transaction of filteredTransactions) {
    if (!transaction.analyticsIsFinal) continue;
    if (transaction.analyticsCountsTowardIncome) {
      totalIncomeCents += Math.abs(transaction.amountCents);
    }
    if (transaction.analyticsSpendingMultiplier !== 0) {
      totalSpentCents += Math.abs(transaction.amountCents) *
        transaction.analyticsSpendingMultiplier;
    }
  }

  const walletBalances: Record<string, number> = {};
  for (const wallet of wallets) {
    walletBalances[wallet.id] = toNumber(wallet.opening_balance_cents);
  }

  for (const transaction of filteredTransactions) {
    const resolvedWalletId = resolveTransactionWalletId(transaction, wallets);
    if (!resolvedWalletId || !(resolvedWalletId in walletBalances)) {
      continue;
    }

    const amountCents = Math.abs(transaction.amountCents);
    if (transaction.type.toLowerCase() === "income") {
      walletBalances[resolvedWalletId] += amountCents;
    } else {
      walletBalances[resolvedWalletId] -= amountCents;
    }
  }

  const netWorthCents = Object.values(walletBalances).reduce(
    (sum, value) => sum + value,
    0,
  );
  return {
    totalIncomeCents,
    totalSpentCents,
    netWorthCents,
    walletBalances,
  };
}

function applyCurrentWalletBalances(
  snapshot: WalletSnapshot,
  wallets: WalletRow[],
): WalletSnapshot {
  const walletBalances = { ...snapshot.walletBalances };
  for (const wallet of wallets) {
    if (wallet.current_balance_cents != null) {
      walletBalances[wallet.id] = wallet.current_balance_cents;
    }
  }
  return {
    ...snapshot,
    walletBalances,
    netWorthCents: Object.values(walletBalances).reduce(
      (sum, balance) => sum + balance,
      0,
    ),
  };
}

function parseRecurringRule(value: unknown): RecurringRule | null {
  if (value == null) return null;

  let raw: Record<string, unknown> | null = null;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value) as Record<string, unknown>;
    } catch {
      raw = null;
    }
  } else if (typeof value === "object") {
    raw = value as Record<string, unknown>;
  }

  if (raw == null) return null;

  const frequency = `${raw.frequency ?? ""}`.trim().toLowerCase();
  const anchorDate = parseDateOnly(raw.anchorDate ?? raw.anchor_date);
  if (!frequency || anchorDate == null) {
    return null;
  }

  const excludedDatesRaw = Array.isArray(raw.excludedDates)
    ? raw.excludedDates
    : Array.isArray(raw.excluded_dates)
    ? raw.excluded_dates
    : [];

  return {
    frequency,
    interval: Math.max(1, Math.trunc(toNumber(raw.interval) || 1)),
    anchorDate,
    endDate: parseDateOnly(raw.endDate ?? raw.end_date),
    projectionEnabled: raw.projection_enabled !== false,
    excludedDates: excludedDatesRaw
      .map(parseDateOnly)
      .filter((value): value is Date => value != null),
  };
}

function projectRecurringTransactions(
  recurringTransactions: RecurringTransaction[],
  rangeStart: Date,
  rangeEnd: Date,
  selectedCurrency: string,
): WalletTransaction[] {
  if (rangeEnd.getTime() < rangeStart.getTime()) {
    return [];
  }

  const startDay = normalizeDate(rangeStart);
  const endDay = normalizeDate(rangeEnd);
  const currencyFilter = selectedCurrency.trim().toUpperCase();
  const result: WalletTransaction[] = [];

  for (const recurring of recurringTransactions) {
    if (recurring.currency.trim().toUpperCase() !== currencyFilter) {
      continue;
    }

    const rule = recurring.recurrenceRule;
    if (rule?.projectionEnabled === false) {
      continue;
    }
    const anchor = normalizeDate(rule?.anchorDate ?? recurring.date);
    const endLocal = rule?.endDate ? normalizeDate(rule.endDate) : null;
    if (endLocal != null && endLocal.getTime() < startDay.getTime()) {
      continue;
    }

    const effectiveEnd = normalizeDate(minDate(endDay, endLocal));
    if (anchor.getTime() > effectiveEnd.getTime()) {
      continue;
    }

    const excludedKeys = new Set(
      (rule?.excludedDates ?? []).map((value) => dateKey(normalizeDate(value))),
    );
    const occurrences: Date[] = [];

    if (rule == null) {
      if (
        anchor.getTime() >= startDay.getTime() &&
        anchor.getTime() <= effectiveEnd.getTime()
      ) {
        occurrences.push(anchor);
      }
    } else {
      switch (rule.frequency) {
        case "daily": {
          const stepDays = Math.max(1, rule.interval);
          let current = firstOnOrAfterDayStep(anchor, startDay, stepDays);
          while (current.getTime() <= effectiveEnd.getTime()) {
            occurrences.push(normalizeDate(current));
            current = new Date(current.getTime() + stepDays * 86400000);
          }
          break;
        }
        case "weekly": {
          const stepDays = Math.max(1, rule.interval) * 7;
          let current = firstOnOrAfterDayStep(anchor, startDay, stepDays);
          while (current.getTime() <= effectiveEnd.getTime()) {
            occurrences.push(normalizeDate(current));
            current = new Date(current.getTime() + stepDays * 86400000);
          }
          break;
        }
        case "biweekly": {
          let current = firstOnOrAfterDayStep(anchor, startDay, 14);
          while (current.getTime() <= effectiveEnd.getTime()) {
            occurrences.push(normalizeDate(current));
            current = new Date(current.getTime() + 14 * 86400000);
          }
          break;
        }
        case "monthly": {
          const stepMonths = Math.max(1, rule.interval);
          const monthsBetween =
            (startDay.getFullYear() - anchor.getFullYear()) * 12 +
            (startDay.getMonth() - anchor.getMonth());
          let n = monthsBetween <= 0
            ? 0
            : Math.floor(monthsBetween / stepMonths);
          let current = addMonthsFromAnchor(anchor, n * stepMonths);
          while (normalizeDate(current).getTime() < startDay.getTime()) {
            n += 1;
            current = addMonthsFromAnchor(anchor, n * stepMonths);
          }
          while (normalizeDate(current).getTime() <= effectiveEnd.getTime()) {
            occurrences.push(normalizeDate(current));
            n += 1;
            current = addMonthsFromAnchor(anchor, n * stepMonths);
          }
          break;
        }
        case "yearly": {
          const stepYears = Math.max(1, rule.interval);
          const yearsBetween = startDay.getFullYear() - anchor.getFullYear();
          let n = yearsBetween <= 0 ? 0 : Math.floor(yearsBetween / stepYears);
          let current = addYearsFromAnchor(anchor, n * stepYears);
          while (normalizeDate(current).getTime() < startDay.getTime()) {
            n += 1;
            current = addYearsFromAnchor(anchor, n * stepYears);
          }
          while (normalizeDate(current).getTime() <= effectiveEnd.getTime()) {
            occurrences.push(normalizeDate(current));
            n += 1;
            current = addYearsFromAnchor(anchor, n * stepYears);
          }
          break;
        }
        default: {
          if (
            anchor.getTime() >= startDay.getTime() &&
            anchor.getTime() <= effectiveEnd.getTime()
          ) {
            occurrences.push(anchor);
          }
        }
      }
    }

    for (const day of occurrences) {
      if (excludedKeys.has(dateKey(day))) {
        continue;
      }

      result.push({
        id: buildProjectedRecurringExpenseId(recurring.id, day),
        userId: recurring.userId,
        householdId: recurring.householdId,
        date: day,
        amountCents: recurring.amountCents,
        currency: recurring.currency,
        category: recurring.category,
        rawText: recurring.description,
        splitGroupId: recurring.splitGroupId,
        walletId: recurring.accountId,
        type: recurring.type,
        analyticsIsFinal: true,
        analyticsSpendingMultiplier: recurring.type.toLowerCase() === "income"
          ? 0
          : 1,
        analyticsCountsTowardIncome: recurring.type.toLowerCase() === "income",
      });
    }
  }

  return result;
}

function projectedExpenseComparisonKey(transaction: WalletTransaction): string {
  return [
    formatDateOnly(transaction.date),
    transaction.amountCents,
    transaction.currency,
    transaction.category ?? "",
    transaction.walletId ?? "",
    transaction.splitGroupId ?? "",
  ].join("|");
}

function dedupeProjectedRecurringTransactions(
  projectedTransactions: WalletTransaction[],
  actualTransactions: WalletTransaction[],
): WalletTransaction[] {
  if (projectedTransactions.length === 0 || actualTransactions.length === 0) {
    return projectedTransactions;
  }

  const actualKeys = new Set(
    actualTransactions
      .filter((transaction) => transaction.type.toLowerCase() !== "income")
      .map(projectedExpenseComparisonKey),
  );

  return projectedTransactions.filter(
    (transaction) =>
      !actualKeys.has(projectedExpenseComparisonKey(transaction)),
  );
}

function normalizeDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function walletSnapshotEndExclusive(monthStart: Date, now: Date): Date {
  const normalizedMonthStart = normalizeMonthStart(monthStart);
  const currentMonthStart = normalizeMonthStart(now);
  if (normalizedMonthStart.getTime() === currentMonthStart.getTime()) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  return new Date(
    normalizedMonthStart.getFullYear(),
    normalizedMonthStart.getMonth() + 1,
    1,
  );
}

function resolveProjectionRangeStart(
  actualTransactions: WalletTransaction[],
  recurringTransactions: RecurringTransaction[],
  fallbackMonthStart: Date,
): Date {
  let earliest = normalizeMonthStart(fallbackMonthStart);

  for (const transaction of actualTransactions) {
    const transactionMonth = normalizeMonthStart(transaction.date);
    if (transactionMonth.getTime() < earliest.getTime()) {
      earliest = transactionMonth;
    }
  }

  for (const recurring of recurringTransactions) {
    const anchor = recurring.recurrenceRule?.anchorDate ?? recurring.date;
    const recurringMonth = normalizeMonthStart(anchor);
    if (recurringMonth.getTime() < earliest.getTime()) {
      earliest = recurringMonth;
    }
  }

  return earliest;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      500,
    );
  }

  try {
    const body = (await req.json()) as RequestBody;
    const householdId = sanitizeUuid(body.householdId ?? null);
    if (body.householdId && !householdId) {
      return jsonResponse(
        { success: false, error: "Invalid householdId" },
        400,
      );
    }

    const selectedCurrency = `${body.selectedCurrency ?? ""}`
      .trim()
      .toUpperCase();
    if (!selectedCurrency) {
      return jsonResponse(
        { success: false, error: "selectedCurrency is required" },
        400,
      );
    }

    const currentMonthStart = parseDateOnly(body.currentMonthStart);
    if (currentMonthStart == null) {
      return jsonResponse(
        { success: false, error: "currentMonthStart is required" },
        400,
      );
    }

    const requestedMonthStarts = (body.monthStarts ?? [])
      .map(parseDateOnly)
      .filter((value): value is Date => value != null)
      .map(normalizeMonthStart);
    const requestedMonths = requestedMonthStarts.length > 0
      ? requestedMonthStarts
      : [normalizeMonthStart(currentMonthStart)];

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-wallets-overview" } },
    });

    const auth = await authenticateUserOrInternalSecret(req, supabase);
    if (!auth.success) {
      return jsonResponse(
        { success: false, error: auth.error ?? "Unauthorized" },
        auth.statusCode ?? 401,
      );
    }

    const userId = auth.isInternalService
      ? sanitizeUuid(body.userId ?? null)
      : auth.userId;
    if (!userId) {
      return jsonResponse(
        { success: false, error: "Valid userId is required" },
        400,
      );
    }

    const canAccess = await assertScopeAccess(supabase, userId, householdId);
    if (!canAccess) {
      return jsonResponse({ success: false, error: "Forbidden scope" }, 403);
    }

    let accountsQuery = supabase
      .from("accounts")
      .select(
        "id, user_id, household_id, name, icon, color, logo_url, currency, opening_balance_cents, goal_amount_cents, is_default, is_system, is_archived, linked_bank_account_id",
      )
      .eq("is_archived", false)
      .order("is_default", { ascending: false })
      .order("is_system", { ascending: false })
      .order("name", { ascending: true });

    if (householdId) {
      accountsQuery = accountsQuery.eq("household_id", householdId);
    } else {
      accountsQuery = accountsQuery
        .eq("user_id", userId)
        .is("household_id", null);
    }

    accountsQuery = accountsQuery.eq("currency", selectedCurrency);

    const { data: accounts, error: accountsError } = await accountsQuery;
    if (accountsError) {
      throw accountsError;
    }

    const wallets = ((accounts ?? []) as WalletRow[]).map((wallet) => ({
      ...wallet,
    }));
    const accountIds = wallets.map((wallet) => wallet.id);

    if (accountIds.length > 0) {
      const { data: expenseRows } = await supabase
        .from("expenses")
        .select("account_id, amount_cents, type, currency, analytics_is_final")
        .in("account_id", accountIds)
        .eq("is_recurring", false)
        .lte("date", formatDateOnly(new Date()))
        .is("deleted_at", null);

      const expenseOut = new Map<string, number>();
      const incomeIn = new Map<string, number>();
      for (const row of (expenseRows ?? []) as Array<Record<string, unknown>>) {
        const accountId = `${row.account_id ?? ""}`;
        if (!accountId) continue;
        if (`${row.currency ?? ""}`.trim().toUpperCase() !== selectedCurrency) {
          continue;
        }
        if (row.analytics_is_final === false) continue;
        const amount = toNumber(row.amount_cents);
        if (`${row.type ?? "expense"}`.toLowerCase() === "income") {
          incomeIn.set(accountId, (incomeIn.get(accountId) ?? 0) + amount);
        } else {
          expenseOut.set(accountId, (expenseOut.get(accountId) ?? 0) + amount);
        }
      }

      const { data: transferOutRows } = await supabase
        .from("account_transfers")
        .select("from_account_id, amount_cents, currency")
        .in("from_account_id", accountIds);
      const { data: transferInRows } = await supabase
        .from("account_transfers")
        .select("to_account_id, amount_cents, currency")
        .in("to_account_id", accountIds);

      const transferOut = new Map<string, number>();
      for (
        const row of (transferOutRows ?? []) as Array<
          Record<string, unknown>
        >
      ) {
        const key = `${row.from_account_id ?? ""}`;
        if (!key) continue;
        if (`${row.currency ?? ""}`.trim().toUpperCase() !== selectedCurrency) {
          continue;
        }
        transferOut.set(
          key,
          (transferOut.get(key) ?? 0) + toNumber(row.amount_cents),
        );
      }

      const transferIn = new Map<string, number>();
      for (
        const row of (transferInRows ?? []) as Array<
          Record<string, unknown>
        >
      ) {
        const key = `${row.to_account_id ?? ""}`;
        if (!key) continue;
        if (`${row.currency ?? ""}`.trim().toUpperCase() !== selectedCurrency) {
          continue;
        }
        transferIn.set(
          key,
          (transferIn.get(key) ?? 0) + toNumber(row.amount_cents),
        );
      }

      for (const wallet of wallets) {
        const opening = toNumber(wallet.opening_balance_cents);
        (
          wallet as WalletRow & { current_balance_cents?: number }
        ).current_balance_cents = opening +
          (incomeIn.get(wallet.id) ?? 0) -
          (expenseOut.get(wallet.id) ?? 0) +
          (transferIn.get(wallet.id) ?? 0) -
          (transferOut.get(wallet.id) ?? 0);
      }

      const linkedBankAccountIds = wallets
        .map((wallet) => wallet.linked_bank_account_id)
        .filter((id): id is string => Boolean(id));
      if (linkedBankAccountIds.length > 0) {
        const { data: providerBalanceRows, error: providerBalanceError } =
          await supabase
            .from("bank_accounts")
            .select("id, type, provider_balance_current_cents")
            .in("id", linkedBankAccountIds);
        if (providerBalanceError) throw providerBalanceError;
        const providerBalances = new Map(
          ((providerBalanceRows ?? []) as Array<Record<string, unknown>>)
            .filter((row) => row.provider_balance_current_cents != null)
            .map((row) => {
              const current = toNumber(row.provider_balance_current_cents);
              const accountType = `${row.type ?? ""}`.toLowerCase();
              const displayBalance =
                accountType === "credit" || accountType === "loan"
                  ? -Math.abs(current)
                  : current;
              return [`${row.id}`, displayBalance] as const;
            }),
        );
        for (const wallet of wallets) {
          const providerBalance = wallet.linked_bank_account_id
            ? providerBalances.get(wallet.linked_bank_account_id)
            : null;
          if (providerBalance != null) {
            wallet.current_balance_cents = providerBalance;
          }
        }
      }
    }

    let actualTransactionsQuery = supabase
      .from("expenses")
      .select(
        "id, user_id, household_id, date, amount_cents, currency, category, raw_text, split_group_id, account_id, type, analytics_is_final, analytics_spending_multiplier, analytics_counts_toward_income",
      )
      .eq("is_recurring", false)
      .is("deleted_at", null)
      .eq("currency", selectedCurrency)
      .lte("date", formatDateOnly(new Date()));

    if (householdId) {
      actualTransactionsQuery = actualTransactionsQuery.eq(
        "household_id",
        householdId,
      );
    } else {
      actualTransactionsQuery = actualTransactionsQuery
        .eq("user_id", userId)
        .is("household_id", null);
    }

    const { data: actualRows, error: actualError } =
      await actualTransactionsQuery;
    if (actualError) {
      throw actualError;
    }

    const actualTransactions: WalletTransaction[] = (
      (actualRows ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      id: `${row.id ?? ""}`,
      userId: row.user_id == null ? null : `${row.user_id}`,
      householdId: row.household_id == null ? null : `${row.household_id}`,
      date: normalizeDate(parseDateOnly(row.date) ?? new Date(1970, 0, 1)),
      amountCents: toNumber(row.amount_cents),
      currency: `${row.currency ?? selectedCurrency}`,
      category: row.category == null ? null : `${row.category}`,
      rawText: row.raw_text == null ? null : `${row.raw_text}`,
      splitGroupId: row.split_group_id == null ? null : `${row.split_group_id}`,
      walletId: row.account_id == null ? null : `${row.account_id}`,
      type: `${row.type ?? "expense"}`,
      analyticsIsFinal: row.analytics_is_final != false,
      analyticsSpendingMultiplier: toNumber(row.analytics_spending_multiplier),
      analyticsCountsTowardIncome: row.analytics_counts_toward_income == true,
    }));

    let recurringQuery = supabase
      .from("expenses")
      .select(
        "id, user_id, household_id, date, amount_cents, currency, category, raw_text, split_group_id, account_id, recurrence_rule, type",
      )
      .eq("is_recurring", true)
      .eq("currency", selectedCurrency)
      .is("deleted_at", null);

    if (householdId) {
      recurringQuery = recurringQuery.eq("household_id", householdId);
    } else {
      recurringQuery = recurringQuery
        .eq("user_id", userId)
        .is("household_id", null);
    }

    const { data: recurringRows, error: recurringError } = await recurringQuery;
    if (recurringError) {
      throw recurringError;
    }

    const recurringTransactions: RecurringTransaction[] = (
      (recurringRows ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      id: `${row.id ?? ""}`,
      userId: row.user_id == null ? null : `${row.user_id}`,
      householdId: row.household_id == null ? null : `${row.household_id}`,
      date: normalizeDate(parseDateOnly(row.date) ?? new Date(1970, 0, 1)),
      amountCents: toNumber(row.amount_cents),
      currency: `${row.currency ?? selectedCurrency}`,
      category: row.category == null ? null : `${row.category}`,
      description: row.raw_text == null ? null : `${row.raw_text}`,
      splitGroupId: row.split_group_id == null ? null : `${row.split_group_id}`,
      accountId: row.account_id == null ? null : `${row.account_id}`,
      type: `${row.type ?? "expense"}`,
      recurrenceRule: parseRecurringRule(row.recurrence_rule),
    }));

    const now = normalizeDate(new Date());
    const projectionRangeStart = resolveProjectionRangeStart(
      actualTransactions,
      recurringTransactions,
      normalizeMonthStart(currentMonthStart),
    );
    const projectedTransactions = dedupeProjectedRecurringTransactions(
      projectRecurringTransactions(
        recurringTransactions,
        projectionRangeStart,
        now,
        selectedCurrency,
      ),
      actualTransactions,
    );

    const recurringAwareTransactions = [
      ...actualTransactions,
      ...projectedTransactions,
    ];
    const availableMonths = buildWalletAvailableMonths(
      now,
      recurringAwareTransactions,
    );
    const netWorthSeries = [...availableMonths].reverse().map((monthStart) => {
      const baseSnapshot = buildWalletSnapshot(
        wallets,
        recurringAwareTransactions,
        walletSnapshotEndExclusive(monthStart, now),
      );
      const snapshot =
        monthStart.getTime() === normalizeMonthStart(now).getTime()
          ? applyCurrentWalletBalances(baseSnapshot, wallets)
          : baseSnapshot;
      return {
        month_start: formatDateOnly(monthStart),
        net_worth_cents: snapshot.netWorthCents,
      };
    });

    const monthSnapshots = requestedMonths.map((monthStart) => {
      const baseSnapshot = buildWalletSnapshot(
        wallets,
        recurringAwareTransactions,
        walletSnapshotEndExclusive(monthStart, now),
      );
      const snapshot =
        monthStart.getTime() === normalizeMonthStart(now).getTime()
          ? applyCurrentWalletBalances(baseSnapshot, wallets)
          : baseSnapshot;
      return {
        month_start: formatDateOnly(monthStart),
        month_end_exclusive: formatDateOnly(
          walletSnapshotEndExclusive(monthStart, now),
        ),
        income_total_cents: snapshot.totalIncomeCents,
        spent_total_cents: snapshot.totalSpentCents,
        net_worth_cents: snapshot.netWorthCents,
        wallet_balances: Object.entries(snapshot.walletBalances).map(
          ([walletId, balanceCents]) => ({
            wallet_id: walletId,
            balance_cents: balanceCents,
          }),
        ),
      };
    });

    return jsonResponse({
      success: true,
      data: {
        wallets,
        history: {
          available_months: availableMonths.map(formatDateOnly),
          net_worth_series: netWorthSeries,
        },
        month_snapshots: monthSnapshots,
      },
    });
  } catch (error) {
    console.error("[wallets-overview]", error);
    return jsonResponse(
      { success: false, error: "Failed to load wallet overview" },
      500,
    );
  }
});
