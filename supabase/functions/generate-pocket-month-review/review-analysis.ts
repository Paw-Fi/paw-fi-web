export interface CategorySpendContext {
  category: string;
  actual_spend_cents: number;
  actual_transaction_count: number;
  actual_active_day_count: number;
  average_actual_transaction_cents: number;
  largest_actual_transaction_cents: number;
  largest_actual_transaction_share_bps: number;
  projected_recurring_cents: number;
  projected_recurring_count: number;
}

export interface PocketCycleEvidence {
  actual_spend_cents: number;
  available_cents?: number;
  actual_transaction_count: number;
  largest_actual_transaction_cents: number;
}

export interface PocketHistoryAnalysis {
  observed_cycle_count: number;
  average_actual_spend_cents: number;
  minimum_actual_spend_cents: number;
  maximum_actual_spend_cents: number;
  actual_spend_range_cents: number;
  over_budget_cycle_count: number;
  within_budget_cycle_count: number;
  latest_budget_variance_cents?: number;
  latest_budget_utilization_bps?: number;
  latest_largest_transaction_share_bps: number;
}

export interface PocketIdentity {
  id: string;
  rollover_group_id?: string;
}

export type IncomeCoverageStatus = "covered" | "tight" | "deficit" | "unknown";
export type MonthFundingStatus = "funded" | "shortfall" | "unknown";
export type CashFlowDataStatus = "complete" | "partial" | "unavailable";

export interface KnownCashFlowInput {
  dataStatus: CashFlowDataStatus;
  recordedIncomeCents: number;
  projectedRecurringIncomeCents: number;
  actualExpenseCents: number;
  projectedRecurringExpenseCents: number;
  incomingCarryCents: number;
}

export interface KnownCashFlowContext {
  data_status: CashFlowDataStatus;
  income_coverage_status: IncomeCoverageStatus;
  month_funding_status: MonthFundingStatus;
  recorded_income_cents: number;
  projected_recurring_income_cents: number;
  known_income_cents: number;
  actual_expense_cents: number;
  projected_recurring_expense_cents: number;
  known_outflow_cents: number;
  income_margin_cents: number;
  incoming_carry_cents: number;
  known_funding_cents: number;
  funding_margin_after_carry_cents: number;
  known_commitments_covered: boolean | null;
  safe_to_spend_status: "unavailable";
}

export interface UpcomingRecurringItem {
  date: string;
  category: string;
  amount_cents: number;
}

export function financialCycleEndKey(cycleStart: string): string {
  const [year, month, day] = cycleStart.split("-").map(Number);
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const nextYear = nextMonthDate.getUTCFullYear();
  const nextMonth = nextMonthDate.getUTCMonth() + 1;
  const daysInNextMonth = new Date(
    Date.UTC(nextYear, nextMonth, 0),
  ).getUTCDate();
  const nextStart = new Date(
    Date.UTC(nextYear, nextMonth - 1, Math.min(day, daysInNextMonth)),
  );
  nextStart.setUTCDate(nextStart.getUTCDate() - 1);
  return nextStart.toISOString().slice(0, 10);
}

interface SpendAccumulator {
  total: number;
  count: number;
  dates: Set<string>;
  largest: number;
}

function finiteCents(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function deriveKnownCashFlow(
  input: KnownCashFlowInput,
): KnownCashFlowContext {
  const recordedIncome = Math.max(0, finiteCents(input.recordedIncomeCents));
  const projectedIncome = Math.max(
    0,
    finiteCents(input.projectedRecurringIncomeCents),
  );
  const actualExpenses = Math.max(0, finiteCents(input.actualExpenseCents));
  const projectedExpenses = Math.max(
    0,
    finiteCents(input.projectedRecurringExpenseCents),
  );
  const incomingCarry = finiteCents(input.incomingCarryCents);
  const knownIncome = recordedIncome + projectedIncome;
  const knownOutflow = actualExpenses + projectedExpenses;
  const incomeMargin = knownIncome - knownOutflow;
  const knownFunding = knownIncome + incomingCarry;
  const fundingMargin = knownFunding - knownOutflow;
  const hasCompleteIncomeEvidence =
    input.dataStatus === "complete" && knownIncome > 0;
  const incomeCoverageStatus: IncomeCoverageStatus = !hasCompleteIncomeEvidence
    ? "unknown"
    : incomeMargin < 0
      ? "deficit"
      : incomeMargin * 10000 <= knownIncome * 1000
        ? "tight"
        : "covered";
  const monthFundingStatus: MonthFundingStatus = !hasCompleteIncomeEvidence
    ? "unknown"
    : fundingMargin < 0
      ? "shortfall"
      : "funded";

  return {
    data_status: input.dataStatus,
    income_coverage_status: incomeCoverageStatus,
    month_funding_status: monthFundingStatus,
    recorded_income_cents: recordedIncome,
    projected_recurring_income_cents: projectedIncome,
    known_income_cents: knownIncome,
    actual_expense_cents: actualExpenses,
    projected_recurring_expense_cents: projectedExpenses,
    known_outflow_cents: knownOutflow,
    income_margin_cents: incomeMargin,
    incoming_carry_cents: incomingCarry,
    known_funding_cents: knownFunding,
    funding_margin_after_carry_cents: fundingMargin,
    known_commitments_covered: hasCompleteIncomeEvidence
      ? fundingMargin >= 0
      : null,
    // Category roles are not authoritative enough to calculate discretionary spending.
    safe_to_spend_status: "unavailable",
  };
}

export function buildUpcomingRecurringItems(
  rows: unknown,
  type: "expense" | "income",
  limit = 12,
): UpcomingRecurringItem[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .flatMap((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return [];
      }
      const row = value as Record<string, unknown>;
      if (String(row.type ?? "expense").toLowerCase() !== type) return [];
      const amount = positiveExpenseAmount(row.amount_cents);
      if (amount === 0 || typeof row.date !== "string" || !row.date.trim()) {
        return [];
      }
      return [
        {
          date: row.date.trim(),
          category: normalizedCategory(row.category),
          amount_cents: amount,
        },
      ];
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || b.amount_cents - a.amount_cents,
    )
    .slice(0, Math.max(0, limit));
}

export function matchingHistoricalPocket<T extends PocketIdentity>(
  pocket: PocketIdentity,
  historicalPockets: T[],
): T | undefined {
  const exactMatch = historicalPockets.find((item) => item.id === pocket.id);
  if (exactMatch) return exactMatch;
  if (!pocket.rollover_group_id) return undefined;
  return historicalPockets.find(
    (item) => item.rollover_group_id === pocket.rollover_group_id,
  );
}

function normalizedCategory(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase()
    : "uncategorized";
}

function positiveExpenseAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function aggregateRows(rows: unknown): Map<string, SpendAccumulator> {
  const totals = new Map<string, SpendAccumulator>();
  if (!Array.isArray(rows)) return totals;

  for (const value of rows) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    if (String(row.type ?? "expense").toLowerCase() === "income") continue;
    const amount = positiveExpenseAmount(row.amount_cents);
    if (amount === 0) continue;
    const category = normalizedCategory(row.category);
    const current = totals.get(category) ?? {
      total: 0,
      count: 0,
      dates: new Set<string>(),
      largest: 0,
    };
    current.total += amount;
    current.count += 1;
    current.largest = Math.max(current.largest, amount);
    if (typeof row.date === "string" && row.date.trim().length > 0) {
      current.dates.add(row.date.trim());
    }
    totals.set(category, current);
  }
  return totals;
}

export function buildCategorySpending(
  month: Record<string, unknown>,
): CategorySpendContext[] {
  const actual = aggregateRows(month.actual_expenses);
  const projected = aggregateRows(month.projected_recurring_expenses);
  const categories = new Set([...actual.keys(), ...projected.keys()]);

  return [...categories]
    .map((category) => {
      const actualStats = actual.get(category);
      const projectedStats = projected.get(category);
      const actualSpend = actualStats?.total ?? 0;
      const actualCount = actualStats?.count ?? 0;
      const largestActual = actualStats?.largest ?? 0;
      return {
        category,
        actual_spend_cents: actualSpend,
        actual_transaction_count: actualCount,
        actual_active_day_count: actualStats?.dates.size ?? 0,
        average_actual_transaction_cents:
          actualCount > 0 ? Math.round(actualSpend / actualCount) : 0,
        largest_actual_transaction_cents: largestActual,
        largest_actual_transaction_share_bps:
          actualSpend > 0
            ? Math.round((largestActual * 10000) / actualSpend)
            : 0,
        projected_recurring_cents: projectedStats?.total ?? 0,
        projected_recurring_count: projectedStats?.count ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.actual_spend_cents +
          b.projected_recurring_cents -
          (a.actual_spend_cents + a.projected_recurring_cents) ||
        a.category.localeCompare(b.category),
    );
}

export function derivePocketHistoryAnalysis(
  cycles: PocketCycleEvidence[],
): PocketHistoryAnalysis {
  const observed = cycles.filter(
    (cycle) => cycle.actual_spend_cents > 0 || (cycle.available_cents ?? 0) > 0,
  );
  const spends = observed.map((cycle) => cycle.actual_spend_cents);
  const minimumSpend = spends.length > 0 ? Math.min(...spends) : 0;
  const maximumSpend = spends.length > 0 ? Math.max(...spends) : 0;
  const budgeted = observed.filter((cycle) => (cycle.available_cents ?? 0) > 0);
  const latest = observed[0];
  const latestAvailable = latest?.available_cents;

  return {
    observed_cycle_count: observed.length,
    average_actual_spend_cents:
      spends.length > 0
        ? Math.round(
            spends.reduce((sum, amount) => sum + amount, 0) / spends.length,
          )
        : 0,
    minimum_actual_spend_cents: minimumSpend,
    maximum_actual_spend_cents: maximumSpend,
    actual_spend_range_cents: maximumSpend - minimumSpend,
    over_budget_cycle_count: budgeted.filter(
      (cycle) => cycle.actual_spend_cents > cycle.available_cents!,
    ).length,
    within_budget_cycle_count: budgeted.filter(
      (cycle) => cycle.actual_spend_cents <= cycle.available_cents!,
    ).length,
    ...(latestAvailable != null && latestAvailable > 0
      ? {
          latest_budget_variance_cents:
            latest.actual_spend_cents - latestAvailable,
          latest_budget_utilization_bps: Math.round(
            (latest.actual_spend_cents * 10000) / latestAvailable,
          ),
        }
      : {}),
    latest_largest_transaction_share_bps:
      latest != null && latest.actual_spend_cents > 0
        ? Math.round(
            (latest.largest_actual_transaction_cents * 10000) /
              latest.actual_spend_cents,
          )
        : 0,
  };
}
