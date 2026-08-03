export interface AndroidRecurringScheduleRow {
  id: string;
  date: string;
  amount_cents: number;
  currency: string;
  type: string;
  merchant?: string | null;
  raw_text?: string | null;
  account_id?: string | null;
  recurrence_rule?: Record<string, unknown> | null;
}

export interface AndroidRecurringCaptureCandidate {
  merchant: string;
  amountCents: number;
  currency: string;
  transactionType: "expense" | "income";
  accountId: string | null;
  frequency: string;
  date: string;
}

export interface AndroidRecurringCaptureMatch {
  kind: "existing" | "replacement";
  schedule: AndroidRecurringScheduleRow;
}

export interface AndroidSavedRecurringRow {
  id: string;
  amount_cents: number;
  currency: string;
  type: string;
  account_id?: string | null;
  is_recurring: boolean;
  recurrence_rule?: Record<string, unknown> | null;
}

export interface AndroidRecurringReplacementExpectation {
  replacedScheduleId: string;
  amountCents: number;
  currency: string;
  transactionType: "expense" | "income";
  accountId: string | null;
  frequency: string;
}

export function normalizeAndroidRecurringMerchant(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(
      /\b(?:subscription|payment|purchase|charged|charge|renewed|renewal|monthly|weekly|yearly|annual|premium)\b/g,
      " ",
    )
    .replace(/\b\d{2,}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function merchantMatches(left: string, right: string): boolean {
  const normalizedLeft = normalizeAndroidRecurringMerchant(left);
  const normalizedRight = normalizeAndroidRecurringMerchant(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  const shorter = normalizedLeft.length <= normalizedRight.length
    ? normalizedLeft
    : normalizedRight;
  const longer = normalizedLeft.length <= normalizedRight.length
    ? normalizedRight
    : normalizedLeft;
  return shorter.length >= 5 && longer.startsWith(shorter);
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function scheduleMatchesDate(
  schedule: AndroidRecurringScheduleRow,
  candidate: AndroidRecurringCaptureCandidate,
): boolean {
  const rule = schedule.recurrence_rule ?? {};
  if (String(rule.frequency ?? "").toLowerCase() !== candidate.frequency) {
    return false;
  }
  const anchor = parseDate(String(rule.anchor_date ?? schedule.date));
  const eventDate = parseDate(candidate.date);
  if (!anchor || !eventDate) return false;

  if (candidate.frequency === "monthly") {
    return Math.abs(anchor.getUTCDate() - eventDate.getUTCDate()) <= 3;
  }
  if (candidate.frequency === "yearly") {
    return (
      anchor.getUTCMonth() === eventDate.getUTCMonth() &&
      Math.abs(anchor.getUTCDate() - eventDate.getUTCDate()) <= 3
    );
  }
  if (candidate.frequency === "weekly" || candidate.frequency === "biweekly") {
    return anchor.getUTCDay() === eventDate.getUTCDay();
  }
  return true;
}

export function findAndroidRecurringCaptureMatch(
  schedules: AndroidRecurringScheduleRow[],
  candidate: AndroidRecurringCaptureCandidate,
): AndroidRecurringCaptureMatch | null {
  for (const schedule of schedules) {
    const scheduleMerchant = schedule.merchant || schedule.raw_text || "";
    if (!merchantMatches(scheduleMerchant, candidate.merchant)) continue;
    if (schedule.currency.trim().toUpperCase() !== candidate.currency) continue;
    if (schedule.type.trim().toLowerCase() !== candidate.transactionType) {
      continue;
    }
    const scheduleAccountId = schedule.account_id ?? null;
    if (scheduleAccountId && scheduleAccountId !== candidate.accountId) {
      continue;
    }
    if (!scheduleMatchesDate(schedule, candidate)) continue;

    return {
      kind: schedule.amount_cents === candidate.amountCents
        ? "existing"
        : "replacement",
      schedule,
    };
  }
  return null;
}

export function savedExpenseMatchesRecurringReplacement(
  saved: AndroidSavedRecurringRow,
  expected: AndroidRecurringReplacementExpectation,
): boolean {
  if (saved.id === expected.replacedScheduleId || !saved.is_recurring) {
    return false;
  }
  if (saved.amount_cents !== expected.amountCents) return false;
  if (saved.currency.trim().toUpperCase() !== expected.currency) return false;
  if (saved.type.trim().toLowerCase() !== expected.transactionType) {
    return false;
  }
  const savedAccountId = saved.account_id ?? null;
  if (savedAccountId && savedAccountId !== expected.accountId) {
    return false;
  }
  return (
    String(saved.recurrence_rule?.frequency ?? "").toLowerCase() ===
      expected.frequency
  );
}
