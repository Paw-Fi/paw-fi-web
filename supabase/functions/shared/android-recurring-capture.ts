import { normalizeNotificationCounterparty } from "./notification-capture-identity.ts";

export interface AndroidRecurringScheduleRow {
  id: string;
  date: string;
  amount_cents: number;
  currency: string;
  type: string;
  merchant?: string | null;
  account_id?: string | null;
  household_id?: string | null;
  split_group_id?: string | null;
  recurrence_rule?: Record<string, unknown> | null;
}

export interface AndroidRecurringCaptureCandidate {
  merchant: string;
  currency: string;
  transactionType: "expense" | "income";
  accountId: string | null;
  frequency?: string | null;
  interval?: number;
  date: string;
}

export interface NotificationRecurringOccurrence {
  schedule: AndroidRecurringScheduleRow;
  scheduledOccurrenceDate: string;
}

export function normalizeAndroidRecurringMerchant(value: string): string {
  return normalizeNotificationCounterparty(value);
}

function calendarDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function offsetDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Compare AI-extracted identities, never raw notification phrases. A name
// prefix or amount alone cannot authorize modifying a recurring occurrence.
export async function resolveNotificationRecurringOccurrence(
  schedules: readonly AndroidRecurringScheduleRow[],
  candidate: AndroidRecurringCaptureCandidate,
  nextOccurrence: (args: Record<string, unknown>) => Promise<unknown>,
): Promise<NotificationRecurringOccurrence | null> {
  if (!calendarDate(candidate.date)) throw new Error("INVALID_CAPTURE_DATE");
  if (!candidate.frequency) return null;
  const merchant = normalizeAndroidRecurringMerchant(candidate.merchant);
  if (!merchant) return null;
  const matches: NotificationRecurringOccurrence[] = [];
  for (const schedule of schedules) {
    if (
      normalizeAndroidRecurringMerchant(schedule.merchant ?? "") !== merchant ||
      schedule.currency.trim().toUpperCase() !== candidate.currency ||
      schedule.type !== candidate.transactionType ||
      (schedule.account_id != null &&
        schedule.account_id !== candidate.accountId)
    ) continue;
    const rule = schedule.recurrence_rule;
    if (!rule) continue;
    const frequency = String(rule.frequency ?? "").toLowerCase();
    if (
      !["daily", "weekly", "biweekly", "monthly", "yearly"].includes(
        frequency,
      ) ||
      (candidate.frequency && candidate.frequency !== frequency)
    ) continue;
    const anchor = calendarDate(rule.anchor_date ?? schedule.date);
    const endDate = rule.end_date == null ? null : calendarDate(rule.end_date);
    const interval = rule.interval == null ? 1 : Number(rule.interval);
    if (
      !anchor || (rule.end_date != null && !endDate) ||
      !Number.isSafeInteger(interval) || interval <= 0 ||
      interval !== (candidate.interval ?? 1)
    ) continue;
    // A daily notification cannot identify a different daily cycle by proximity.
    const drift = frequency === "daily" ? 0 : 3;
    const start = offsetDate(candidate.date, -drift);
    const end = offsetDate(candidate.date, drift);
    const args = {
      p_anchor_date: anchor,
      p_frequency: frequency,
      p_interval: interval,
      p_end_date: endDate,
      p_reference_date: start,
    };
    const rawDate = await nextOccurrence(args);
    if (rawDate == null) continue;
    const scheduledDate = calendarDate(rawDate);
    if (!scheduledDate) throw new Error("INVALID_RECURRING_CALENDAR_RESPONSE");
    if (scheduledDate < start || scheduledDate > end) continue;
    const rawFollowing = await nextOccurrence({
      ...args,
      p_reference_date: offsetDate(scheduledDate, 1),
    });
    const following = rawFollowing == null ? null : calendarDate(rawFollowing);
    if (rawFollowing != null && (!following || following <= scheduledDate)) {
      throw new Error("INVALID_RECURRING_CALENDAR_RESPONSE");
    }
    if (following != null && following <= end) {
      throw new Error("NOTIFICATION_RECURRING_MATCH_AMBIGUOUS");
    }
    matches.push({ schedule, scheduledOccurrenceDate: scheduledDate });
  }
  if (matches.length > 1) {
    throw new Error("NOTIFICATION_RECURRING_MATCH_AMBIGUOUS");
  }
  return matches[0] ?? null;
}

// Preserve concrete saved allocations, including zero shares, instead of using
// today's household default or redistributing newly joined members.
export function scaleNotificationRecurringSplit(
  lines: readonly { user_id: string; amount_cents: number }[],
  storedTotal: number,
  actualTotal: number,
) {
  if (
    !Number.isSafeInteger(storedTotal) || storedTotal <= 0 ||
    !Number.isSafeInteger(actualTotal) || actualTotal <= 0 ||
    lines.length === 0 ||
    new Set(lines.map((line) => line.user_id)).size !== lines.length ||
    lines.some((line) =>
      !line.user_id || !Number.isSafeInteger(line.amount_cents) ||
      line.amount_cents < 0
    ) ||
    lines.reduce((sum, line) => sum + line.amount_cents, 0) !== storedTotal
  ) throw new Error("INVALID_RECURRING_SAVED_SPLIT");
  const denominator = BigInt(storedTotal);
  const scaled = [...lines].sort((a, b) =>
    a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0
  )
    .map((line) => {
      const numerator = BigInt(line.amount_cents) * BigInt(actualTotal);
      return {
        userId: line.user_id,
        cents: Number(numerator / denominator),
        remainder: numerator % denominator,
      };
    });
  let remaining = actualTotal -
    scaled.reduce((sum, line) => sum + line.cents, 0);
  const byRemainder = [...scaled].sort((a, b) =>
    a.remainder > b.remainder ? -1 : a.remainder < b.remainder ? 1 : 0
  );
  for (const line of byRemainder) {
    if (remaining-- > 0) line.cents++;
  }
  return {
    splitType: "amount",
    memberSplits: scaled.map((line) => ({
      userId: line.userId,
      amount: line.cents / 100,
    })),
  };
}

export function notificationRecurringConfirmationPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const data = payload.data as Record<string, unknown> | null;
  const transaction = data?.transaction as Record<string, unknown> | null;
  if (
    payload.success !== true || typeof transaction?.id !== "string" ||
    !transaction.id
  ) {
    throw new Error("INVALID_RECURRING_CONFIRMATION_RESPONSE");
  }
  return {
    success: true,
    duplicate: data?.duplicate === true,
    data: transaction,
    occurrence: data?.occurrence,
    meta: { recurringOccurrenceConfirmed: true },
  };
}
