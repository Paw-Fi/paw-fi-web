export interface FinancialSnapshotRow {
  id?: string | null;
  date: string;
  amount_cents: number;
  currency: string;
  category?: string | null;
  raw_text?: string | null;
  account_id?: string | null;
  split_group_id?: string | null;
  parent_recurring_id?: string | null;
  type?: string | null;
  analytics_is_final?: boolean | null;
  analytics_spending_multiplier?: number | null;
  analytics_counts_toward_income?: boolean | null;
  recurrence_rule?: Record<string, unknown> | string | null;
}

export interface FinancialSnapshotTotals {
  totalExpense: number;
  totalIncome: number;
  net: number;
  categories: { category: string; amount_cents: number }[];
}

interface RecurrenceRule {
  frequency: string;
  interval: number;
  anchorDate: Date;
  endDate: Date | null;
  projectionEnabled: boolean;
  excludedDates: Set<string>;
}

export function projectRecurringSnapshotRows(
  recurringRows: FinancialSnapshotRow[],
  actualRows: FinancialSnapshotRow[],
  startDate: string,
  endDate: string,
): FinancialSnapshotRow[] {
  const rangeStart = parseDateOnly(startDate);
  const rangeEnd = parseDateOnly(endDate);
  if (!rangeStart || !rangeEnd || rangeEnd.getTime() < rangeStart.getTime()) {
    return [];
  }

  const actualKeys = new Set(actualRows.map(snapshotRowComparisonKey));
  const linkedActualOccurrences = new Set(
    actualRows
      .filter((row) => row.parent_recurring_id?.trim())
      .map(
        (row) => `${row.parent_recurring_id!.trim()}|${row.date.slice(0, 10)}`,
      ),
  );
  const projectedRows: FinancialSnapshotRow[] = [];

  for (const row of recurringRows) {
    const rule = parseRecurrenceRule(row.recurrence_rule);
    if (!rule || !rule.projectionEnabled) continue;

    const effectiveEnd =
      rule.endDate && rule.endDate.getTime() < rangeEnd.getTime()
        ? rule.endDate
        : rangeEnd;
    if (
      rule.anchorDate.getTime() > effectiveEnd.getTime() ||
      effectiveEnd.getTime() < rangeStart.getTime()
    ) {
      continue;
    }

    for (const occurrence of buildOccurrences(rule, rangeStart, effectiveEnd)) {
      const occurrenceDate = formatDateOnly(occurrence);
      if (rule.excludedDates.has(occurrenceDate)) continue;

      const projected = {
        ...row,
        id: `recurring_${row.id ?? "transaction"}_${
          occurrenceDate.replaceAll(
            "-",
            "",
          )
        }`,
        date: occurrenceDate,
        recurrence_rule: null,
      };
      const hasLinkedOccurrence = row.id &&
        linkedActualOccurrences.has(`${row.id}|${occurrenceDate}`);
      if (
        !hasLinkedOccurrence &&
        !actualKeys.has(snapshotRowComparisonKey(projected))
      ) {
        projectedRows.push(projected);
      }
    }
  }

  return projectedRows;
}

export function buildFinancialSnapshotTotals(
  rows: FinancialSnapshotRow[],
): FinancialSnapshotTotals {
  let totalExpense = 0;
  let totalIncome = 0;
  const categoryTotals = new Map<string, number>();

  for (const row of rows) {
    if (row.analytics_is_final === false) continue;

    const absoluteAmount = Math.abs(Number(row.amount_cents) || 0);
    const isIncome = row.analytics_counts_toward_income === true ||
      (row.analytics_counts_toward_income == null &&
        `${row.type ?? ""}`.toLowerCase() === "income");
    if (isIncome) totalIncome += absoluteAmount;

    const spendingMultiplier = Number(
      row.analytics_spending_multiplier ?? (isIncome ? 0 : 1),
    );
    const spendingAmount = absoluteAmount * spendingMultiplier;
    if (spendingAmount === 0) continue;

    totalExpense += spendingAmount;
    const category = `${row.category || "other"}`.toLowerCase();
    categoryTotals.set(
      category,
      (categoryTotals.get(category) || 0) + spendingAmount,
    );
  }

  return {
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
    categories: Array.from(categoryTotals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([category, amount_cents]) => ({ category, amount_cents })),
  };
}

function parseRecurrenceRule(value: unknown): RecurrenceRule | null {
  let raw: Record<string, unknown> | null = null;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    raw = value as Record<string, unknown>;
  }
  if (!raw) return null;

  const frequency = `${raw.frequency ?? ""}`.trim().toLowerCase();
  const anchorDate = parseDateOnly(raw.anchor_date ?? raw.anchorDate);
  if (!frequency || !anchorDate) return null;

  const intervalValue = Number(raw.interval);
  const interval = Number.isFinite(intervalValue)
    ? Math.max(1, Math.trunc(intervalValue))
    : 1;
  const excludedValues = Array.isArray(raw.excluded_dates)
    ? raw.excluded_dates
    : Array.isArray(raw.excludedDates)
    ? raw.excludedDates
    : [];

  return {
    frequency,
    interval,
    anchorDate,
    endDate: parseDateOnly(raw.end_date ?? raw.endDate),
    projectionEnabled: raw.projection_enabled !== false,
    excludedDates: new Set(
      excludedValues
        .map(parseDateOnly)
        .filter((date): date is Date => date != null)
        .map(formatDateOnly),
    ),
  };
}

function buildOccurrences(
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const occurrences: Date[] = [];
  const addOccurrence = (date: Date) => {
    if (
      date.getTime() >= rangeStart.getTime() &&
      date.getTime() <= rangeEnd.getTime()
    ) {
      occurrences.push(date);
    }
  };

  if (["daily", "weekly", "biweekly"].includes(rule.frequency)) {
    const frequencyDays = rule.frequency === "daily"
      ? 1
      : rule.frequency === "weekly"
      ? 7
      : 14;
    const stepDays = frequencyDays * rule.interval;
    let current = firstOnOrAfterDayStep(rule.anchorDate, rangeStart, stepDays);
    while (current.getTime() <= rangeEnd.getTime()) {
      occurrences.push(current);
      current = addDays(current, stepDays);
    }
    return occurrences;
  }

  if (rule.frequency === "monthly") {
    const monthsBetween =
      (rangeStart.getUTCFullYear() - rule.anchorDate.getUTCFullYear()) * 12 +
      rangeStart.getUTCMonth() -
      rule.anchorDate.getUTCMonth();
    let occurrenceIndex = monthsBetween <= 0
      ? 0
      : Math.floor(monthsBetween / rule.interval);
    let current = addMonthsFromAnchor(
      rule.anchorDate,
      occurrenceIndex * rule.interval,
    );
    while (current.getTime() < rangeStart.getTime()) {
      occurrenceIndex += 1;
      current = addMonthsFromAnchor(
        rule.anchorDate,
        occurrenceIndex * rule.interval,
      );
    }
    while (current.getTime() <= rangeEnd.getTime()) {
      occurrences.push(current);
      occurrenceIndex += 1;
      current = addMonthsFromAnchor(
        rule.anchorDate,
        occurrenceIndex * rule.interval,
      );
    }
    return occurrences;
  }

  if (rule.frequency === "yearly") {
    const yearsBetween = rangeStart.getUTCFullYear() -
      rule.anchorDate.getUTCFullYear();
    let occurrenceIndex = yearsBetween <= 0
      ? 0
      : Math.floor(yearsBetween / rule.interval);
    let current = addYearsFromAnchor(
      rule.anchorDate,
      occurrenceIndex * rule.interval,
    );
    while (current.getTime() < rangeStart.getTime()) {
      occurrenceIndex += 1;
      current = addYearsFromAnchor(
        rule.anchorDate,
        occurrenceIndex * rule.interval,
      );
    }
    while (current.getTime() <= rangeEnd.getTime()) {
      occurrences.push(current);
      occurrenceIndex += 1;
      current = addYearsFromAnchor(
        rule.anchorDate,
        occurrenceIndex * rule.interval,
      );
    }
    return occurrences;
  }

  addOccurrence(rule.anchorDate);
  return occurrences;
}

function snapshotRowComparisonKey(row: FinancialSnapshotRow): string {
  return [
    row.date.slice(0, 10),
    Number(row.amount_cents) || 0,
    row.currency.trim().toUpperCase(),
    `${row.category ?? ""}`.trim().toLowerCase(),
    row.account_id ?? "",
    row.split_group_id ?? "",
    `${row.raw_text ?? ""}`.trim().toLowerCase(),
  ].join("|");
}

function parseDateOnly(value: unknown): Date | null {
  const match = `${value ?? ""}`.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ? date
    : null;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 86400000);
}

function firstOnOrAfterDayStep(
  anchor: Date,
  rangeStart: Date,
  stepDays: number,
): Date {
  if (rangeStart.getTime() <= anchor.getTime()) return anchor;
  const differenceDays = Math.floor(
    (rangeStart.getTime() - anchor.getTime()) / 86400000,
  );
  const occurrenceIndex = Math.ceil(differenceDays / stepDays);
  return addDays(anchor, occurrenceIndex * stepDays);
}

function addMonthsFromAnchor(anchor: Date, monthsToAdd: number): Date {
  const targetMonth = anchor.getUTCMonth() + monthsToAdd;
  const year = anchor.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(
    anchor.getUTCDate(),
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  );
  return new Date(Date.UTC(year, month, day));
}

function addYearsFromAnchor(anchor: Date, yearsToAdd: number): Date {
  const year = anchor.getUTCFullYear() + yearsToAdd;
  const month = anchor.getUTCMonth();
  const day = Math.min(
    anchor.getUTCDate(),
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  );
  return new Date(Date.UTC(year, month, day));
}
