import { resolveFinancialPeriodRangeForUser } from "../budgets-helpers.ts";
import { formatAmount } from "../formatting-helpers.ts";
import { formatDateInTimeZone } from "./date-utils.ts";
import {
  buildFinancialSnapshotTotals,
  type FinancialSnapshotRow,
  projectRecurringSnapshotRows,
} from "./financial-snapshot.ts";
import {
  type BotSpaceMeta,
  ensureHouseholdMember,
  listBotSpaceIds,
  resolveBotSpaceScope,
} from "./household-utils.ts";
import { resolveWalletIdInScope } from "./wallet-scope.ts";

interface SupabaseLike {
  from(table: string): any;
}

export interface FinancialInsightDateRange {
  startDate: string;
  endDate: string;
  period: string;
  includesFutureRecurring: boolean;
}

export interface FinancialInsightSnapshot {
  totalExpense: number;
  totalIncome: number;
  net: number;
  startDate: string;
  endDate: string;
  period: string;
  currency: string;
  categories: { category: string; amount_cents: number }[];
  budget_cents: number | null;
  includes_projected_recurring: boolean;
  projected_recurring_count: number;
  projected_recurring: Array<{
    date: string;
    amount_cents: number;
    currency: string;
    category: string;
    type: string;
  }>;
  chart_url?: string;
}

const SNAPSHOT_COLUMNS =
  "id, amount_cents, type, category, raw_text, date, currency, account_id, household_id, split_group_id, parent_recurring_id, scheduled_occurrence_date, recurrence_rule, analytics_is_final, analytics_spending_multiplier, analytics_counts_toward_income";

export async function resolveFinancialInsightDateRange(params: {
  args?: Record<string, unknown> | null;
  today: string;
  resolveFinancialPeriod: (
    date: string,
  ) => Promise<{ monthStartStr: string; nextMonthStr: string }>;
}): Promise<FinancialInsightDateRange | { error: string }> {
  const args = params.args || {};
  const today = parseDateOnly(params.today);
  if (!today) return { error: "Unable to resolve the current date" };

  const explicitStart = parseDateOnly(args.start_date);
  const explicitEnd = parseDateOnly(args.end_date);
  if (args.start_date != null || args.end_date != null) {
    if (!explicitStart || !explicitEnd) {
      return { error: "Both start_date and end_date must be valid dates" };
    }
    if (explicitEnd.getTime() < explicitStart.getTime()) {
      return { error: "end_date must be on or after start_date" };
    }
    return buildRange(explicitStart, explicitEnd, "custom", today);
  }

  const periodMonth = parseYearMonth(args.period_month);
  if (periodMonth) {
    return buildRange(
      periodMonth,
      endOfMonth(periodMonth),
      "calendar_month",
      today,
    );
  }

  const period = normalizePeriod(args.period ?? args.scope);
  switch (period) {
    case "today":
      return buildRange(today, today, period, today);
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return buildRange(yesterday, yesterday, period, today);
    }
    case "this_month":
      return buildRange(startOfMonth(today), endOfMonth(today), period, today);
    case "last_month": {
      const previousMonth = startOfMonth(addMonths(today, -1));
      return buildRange(
        previousMonth,
        endOfMonth(previousMonth),
        period,
        today,
      );
    }
    case "this_week": {
      const weekStart = startOfWeek(today);
      return buildRange(weekStart, addDays(weekStart, 6), period, today);
    }
    case "last_week": {
      const weekStart = addDays(startOfWeek(today), -7);
      return buildRange(weekStart, addDays(weekStart, 6), period, today);
    }
    case "last_30_days":
      return buildRange(addDays(today, -29), today, period, today);
    case "this_year":
      return buildRange(
        new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
        new Date(Date.UTC(today.getUTCFullYear(), 11, 31)),
        period,
        today,
      );
    case "all_time":
      return buildRange(new Date(Date.UTC(1970, 0, 1)), today, period, today);
    case "last_financial_period": {
      const current = await params.resolveFinancialPeriod(params.today);
      const previousPeriodDate = addDays(
        parseDateOnly(current.monthStartStr)!,
        -1,
      );
      const previous = await params.resolveFinancialPeriod(
        formatDateOnly(previousPeriodDate),
      );
      return buildFinancialPeriodRange(previous, period, today);
    }
    default: {
      const date = parseDateOnly(args.date) ?? today;
      const range = await params.resolveFinancialPeriod(formatDateOnly(date));
      return buildFinancialPeriodRange(
        range,
        "current_financial_period",
        today,
      );
    }
  }
}

export async function executeBotFinancialInsight(params: {
  supabase: SupabaseLike;
  userId: string;
  contactId: string;
  currency: string;
  timezone?: string | null;
  args?: Record<string, unknown> | null;
  spaceMap: Map<string, BotSpaceMeta>;
  logPrefix: string;
  chartRequested?: boolean;
  includeRecurringSelectionItems?: boolean;
}): Promise<Record<string, unknown>> {
  try {
    const args = params.args || {};
    const today = formatDateInTimeZone(params.timezone);
    const range = await resolveFinancialInsightDateRange({
      args,
      today,
      resolveFinancialPeriod: (date) =>
        resolveFinancialPeriodRangeForUser(
          params.supabase as any,
          params.userId,
          date,
        ),
    });
    if ("error" in range) return range;

    const scope = await resolveInsightScope({
      supabase: params.supabase,
      userId: params.userId,
      args,
      spaceMap: params.spaceMap,
    });
    if (scope.error) return { error: scope.error };
    const householdId =
      !scope.isAggregate && scope.householdIds.length === 1
        ? scope.householdIds[0]
        : null;

    const walletName =
      typeof args.wallet_name === "string" ? args.wallet_name.trim() : "";
    if (walletName && scope.isAggregate) {
      return {
        error: "Please choose one specific space before selecting a wallet.",
      };
    }
    const wallet = await resolveInsightWallet({
      supabase: params.supabase,
      userId: params.userId,
      householdId,
      walletName,
      logPrefix: params.logPrefix,
    });
    if (wallet.error) return { error: wallet.error };
    const requestedCurrency = normalizeCurrency(args.currency);
    const currency = (wallet.currency || requestedCurrency || params.currency)
      .trim()
      .toUpperCase();

    let actualQuery = params.supabase
      .from("expenses")
      .select(SNAPSHOT_COLUMNS)
      .gte("date", range.startDate)
      .lte("date", range.endDate)
      .eq("currency", currency)
      .or("is_recurring.eq.false,is_recurring.is.null")
      .is("deleted_at", null);
    let recurringQuery = params.supabase
      .from("expenses")
      .select(SNAPSHOT_COLUMNS)
      .eq("currency", currency)
      .eq("is_recurring", true)
      .is("deleted_at", null);

    if (scope.includePersonal && scope.householdIds.length > 0) {
      const accessibleIds = scope.householdIds.join(",");
      actualQuery = actualQuery.or(
        `and(contact_id.eq.${params.contactId},household_id.is.null),household_id.in.(${accessibleIds})`,
      );
      recurringQuery = recurringQuery.or(
        `and(contact_id.eq.${params.contactId},household_id.is.null),household_id.in.(${accessibleIds})`,
      );
    } else if (scope.householdIds.length === 1) {
      actualQuery = actualQuery.eq("household_id", scope.householdIds[0]);
      recurringQuery = recurringQuery.eq("household_id", scope.householdIds[0]);
    } else if (scope.householdIds.length > 1) {
      actualQuery = actualQuery.in("household_id", scope.householdIds);
      recurringQuery = recurringQuery.in("household_id", scope.householdIds);
    } else {
      actualQuery = actualQuery
        .eq("contact_id", params.contactId)
        .is("household_id", null);
      recurringQuery = recurringQuery
        .eq("contact_id", params.contactId)
        .is("household_id", null);
    }
    if (wallet.accountId) {
      actualQuery = actualQuery.eq("account_id", wallet.accountId);
      recurringQuery = recurringQuery.eq("account_id", wallet.accountId);
    }

    const [
      { data: actualRows, error },
      { data: recurringRows, error: recurringError },
    ] = await Promise.all([actualQuery, recurringQuery]);
    if (error || recurringError) {
      console.error(`[${params.logPrefix}] financial insight query failed`, {
        error: error || recurringError,
      });
      return { error: "Unable to load financial insight right now." };
    }

    const actual = (actualRows || []) as FinancialSnapshotRow[];
    const projected = projectRecurringSnapshotRows(
      (recurringRows || []) as FinancialSnapshotRow[],
      actual,
      range.startDate,
      range.endDate,
    );
    const rawTotals = buildFinancialSnapshotTotals([...actual, ...projected]);
    const totals = {
      ...rawTotals,
      categories: rawTotals.categories.map((entry) => ({
        ...entry,
        category: sanitizeToolLabel(entry.category),
      })),
    };
    const budgetCents =
      wallet.accountId || scope.isAggregate
        ? null
        : await loadBudgetCents({
            supabase: params.supabase,
            userId: params.userId,
            householdId,
            currency,
            range,
          });
    const chartUrl =
      params.chartRequested === true
        ? buildFinancialInsightChart(totals.categories)
        : undefined;
    const snapshot: FinancialInsightSnapshot = {
      ...totals,
      startDate: range.startDate,
      endDate: range.endDate,
      period: range.period,
      currency,
      budget_cents: budgetCents,
      includes_projected_recurring: projected.length > 0,
      projected_recurring_count: projected.length,
      projected_recurring: projected.slice(0, 25).map((row) => ({
        date: row.date,
        amount_cents: row.amount_cents,
        currency: row.currency,
        category: sanitizeToolLabel(String(row.category || "other")),
        type: String(row.type || "expense"),
      })),
      ...(chartUrl ? { chart_url: chartUrl } : {}),
    };

    const projectedSourceIds = new Set(
      projected
        .map((row) => row.parent_recurring_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    const recurringSelectionItems = (
      (recurringRows || []) as FinancialSnapshotRow[]
    )
      .filter((row) => !!row.id && projectedSourceIds.has(row.id))
      .map((row) => ({
        id: row.id as string,
        amountMajor: (Number(row.amount_cents) || 0) / 100,
        currency: String(row.currency || currency).toUpperCase(),
        date: String(row.date || "").slice(0, 10),
        category: sanitizeToolLabel(String(row.category || "other")),
        description: sanitizeToolLabel(String(row.raw_text || "")),
        type:
          String(row.type || "expense").toLowerCase() === "income"
            ? "income"
            : "expense",
        household_id:
          typeof row.household_id === "string" ? row.household_id : null,
      }));

    return {
      success: true,
      snapshot,
      // Internal bot state only. Opt-in callers must remove this before
      // sending the tool response to the model so IDs are never exposed.
      ...(params.includeRecurringSelectionItems
        ? { _recurring_selection_items: recurringSelectionItems }
        : {}),
      chart_url: chartUrl,
      summary: buildFinancialInsightSummary(
        snapshot,
        range.includesFutureRecurring,
      ),
      scope: {
        household_id: householdId,
        space_name: scope.spaceName,
        wallet_name: wallet.name ?? null,
      },
    };
  } catch (error) {
    console.error(`[${params.logPrefix}] financial insight failed`, { error });
    return { error: "Unable to load financial insight right now." };
  }
}

function normalizePeriod(value: unknown): string {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    month: "this_month",
    current_month: "this_month",
    previous_month: "last_month",
    year: "this_year",
    current_year: "this_year",
    financial_period: "current_financial_period",
    pay_period: "current_financial_period",
  };
  return aliases[normalized] || normalized || "current_financial_period";
}

function buildFinancialPeriodRange(
  range: { monthStartStr: string; nextMonthStr: string },
  period: string,
  today: Date,
): FinancialInsightDateRange {
  return buildRange(
    parseDateOnly(range.monthStartStr)!,
    addDays(parseDateOnly(range.nextMonthStr)!, -1),
    period,
    today,
  );
}

function buildRange(
  start: Date,
  end: Date,
  period: string,
  today: Date,
): FinancialInsightDateRange {
  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
    period,
    includesFutureRecurring: end.getTime() > today.getTime(),
  };
}

async function resolveInsightScope(params: {
  supabase: SupabaseLike;
  userId: string;
  args: Record<string, unknown>;
  spaceMap: Map<string, BotSpaceMeta>;
}): Promise<{
  householdIds: string[];
  spaceName: string | null;
  includePersonal: boolean;
  isAggregate: boolean;
  error?: string;
}> {
  const normalizedScope = String(params.args.space_scope || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (["personal", "personal_account"].includes(normalizedScope)) {
    return {
      householdIds: [],
      spaceName: null,
      includePersonal: true,
      isAggregate: false,
    };
  }

  const resolved = resolveBotSpaceScope(params.args, params.spaceMap);
  const isAllSpaces = ["all", "all_spaces"].includes(normalizedScope);
  let householdIds: string[] = [];
  let includePersonal = false;
  if (resolved.householdId) {
    if (!params.spaceMap.has(resolved.householdId)) {
      return {
        householdIds: [],
        spaceName: null,
        includePersonal: false,
        isAggregate: false,
        error: "Unknown space",
      };
    }
    householdIds = [resolved.householdId];
  } else if (!normalizedScope || isAllSpaces) {
    includePersonal = true;
    householdIds = listBotSpaceIds(params.spaceMap);
  } else if (
    ["shared", "shared_space", "private_space"].includes(normalizedScope)
  ) {
    const wantsPrivate = normalizedScope === "private_space";
    householdIds = listBotSpaceIds(
      params.spaceMap,
      wantsPrivate ? "private" : "shared",
    );
    if (!householdIds.length) {
      return {
        householdIds: [],
        spaceName: null,
        includePersonal: false,
        isAggregate: false,
        error: wantsPrivate
          ? "No private spaces are available."
          : "No shared spaces are available.",
      };
    }
  }

  for (const householdId of householdIds) {
    if (
      !(await ensureHouseholdMember(
        params.supabase,
        householdId,
        params.userId,
      ))
    ) {
      return {
        householdIds: [],
        spaceName: null,
        includePersonal: false,
        isAggregate: false,
        error: "You do not have access to that space",
      };
    }
  }

  const isAggregate = includePersonal || householdIds.length > 1;
  const spaceName = includePersonal
    ? "All spaces"
    : householdIds.length === 1
      ? (params.spaceMap.get(householdIds[0])?.name ?? null)
      : householdIds.length > 1
        ? normalizedScope === "private_space"
          ? "All private spaces"
          : "All shared spaces"
        : null;
  return { householdIds, spaceName, includePersonal, isAggregate };
}

async function resolveInsightWallet(params: {
  supabase: SupabaseLike;
  userId: string;
  householdId: string | null;
  walletName: string;
  logPrefix: string;
}): Promise<{
  accountId?: string;
  currency?: string;
  name?: string;
  error?: string;
}> {
  if (!params.walletName) return {};
  const normalized = params.walletName.toLowerCase();
  if (
    ["primary", "primary wallet", "default", "default wallet"].includes(
      normalized,
    )
  ) {
    let query = params.supabase
      .from("accounts")
      .select("id, name, currency")
      .eq("is_default", true)
      .eq("is_archived", false);
    query = params.householdId
      ? query.eq("household_id", params.householdId)
      : query.eq("user_id", params.userId).is("household_id", null);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      console.error(`[${params.logPrefix}] primary wallet lookup failed`, {
        error,
      });
      return { error: "Unable to resolve that wallet right now." };
    }
    if (!data) return { error: "No primary wallet was found in this scope." };
    return { accountId: data.id, currency: data.currency, name: data.name };
  }

  const resolved = await resolveWalletIdInScope(
    params.supabase,
    params.userId,
    params.householdId,
    params.walletName,
    params.logPrefix,
  );
  return resolved.error
    ? { error: resolved.error }
    : {
        accountId: resolved.accountId || undefined,
        currency: resolved.currency,
        name: params.walletName,
      };
}

async function loadBudgetCents(params: {
  supabase: SupabaseLike;
  userId: string;
  householdId: string | null;
  currency: string;
  range: FinancialInsightDateRange;
}): Promise<number | null> {
  if (
    !["current_financial_period", "last_financial_period"].includes(
      params.range.period,
    )
  ) {
    return null;
  }
  let query = params.supabase
    .from("budgets")
    .select("total_budget_cents")
    .eq("currency", params.currency)
    .eq("period_month", `${params.range.startDate.slice(0, 7)}-01`)
    .limit(1);
  query = params.householdId
    ? query.eq("household_id", params.householdId)
    : query.eq("user_id", params.userId).is("household_id", null);
  const { data } = await query;
  return data?.[0]?.total_budget_cents ?? null;
}

function buildFinancialInsightChart(
  categories: { category: string; amount_cents: number }[],
): string | undefined {
  if (!categories.length) return undefined;
  const chartConfig = {
    type: "radar",
    data: {
      labels: categories.map((entry) => entry.category),
      datasets: [
        {
          label: "Spend",
          data: categories.map((entry) => Math.round(entry.amount_cents / 100)),
          backgroundColor: "rgba(75,192,192,0.3)",
          borderColor: "#4BC0C0",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Top spending categories" },
      },
    },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig),
  )}`;
}

function buildFinancialInsightSummary(
  snapshot: FinancialInsightSnapshot,
  includesFutureRecurring: boolean,
): string {
  const lines = [
    `Snapshot ${snapshot.startDate} to ${snapshot.endDate}`,
    `Income: ${formatAmount(snapshot.totalIncome / 100, snapshot.currency)}`,
    `Spending: ${formatAmount(snapshot.totalExpense / 100, snapshot.currency)}`,
    `Net: ${formatAmount(snapshot.net / 100, snapshot.currency)}`,
  ];
  if (snapshot.categories.length) {
    lines.push("", "Top categories:");
    snapshot.categories.forEach((entry, index) => {
      lines.push(
        `${index + 1}. ${entry.category}: ${formatAmount(
          entry.amount_cents / 100,
          snapshot.currency,
        )}`,
      );
    });
  }
  if (snapshot.budget_cents != null) {
    lines.push(
      "",
      `Budget: ${formatAmount(
        snapshot.budget_cents / 100,
        snapshot.currency,
      )} | Remaining: ${formatAmount(
        (snapshot.budget_cents - snapshot.totalExpense) / 100,
        snapshot.currency,
      )}`,
    );
  }
  if (snapshot.projected_recurring_count > 0) {
    lines.push(
      "",
      includesFutureRecurring
        ? `Includes ${snapshot.projected_recurring_count} scheduled recurring occurrence(s), including future projections through ${snapshot.endDate}.`
        : `Includes ${snapshot.projected_recurring_count} recurring occurrence(s) scheduled in this period.`,
    );
  }
  return lines.join("\n");
}

function normalizeCurrency(value: unknown): string | null {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function sanitizeToolLabel(value: string): string {
  const sanitized = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(
      /\b(?:ignore|instructions?|system|assistant|reveal|prompt|tools?|execute|forget|override)\b/gi,
      "[redacted]",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return sanitized || "other";
}

function parseDateOnly(value: unknown): Date | null {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

function parseYearMonth(value: unknown): Date | null {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return parseDateOnly(`${match[1]}-${match[2]}-01`);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 86400000);
}

function addMonths(value: Date, months: number): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1),
  );
}

function startOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function endOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
}

function startOfWeek(value: Date): Date {
  const daysSinceMonday = (value.getUTCDay() + 6) % 7;
  return addDays(value, -daysSinceMonday);
}
