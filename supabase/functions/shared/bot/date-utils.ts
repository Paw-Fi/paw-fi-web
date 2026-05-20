import { normalizeCalendarDateString } from "../date-normalization.ts";

export function normalizeDateInput(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
}

export function getDatePartsInTimeZone(
  tz: string | null | undefined,
  date = new Date(),
): { year: number; month: number; day: number } {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    return {
      year: Number(map.get("year")),
      month: Number(map.get("month")),
      day: Number(map.get("day")),
    };
  } catch {
    const match = timezone
      .toUpperCase()
      .match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      const hours = Number(match[2]);
      const minutes = Number(match[3] || "0");
      const offsetMinutes = sign * (hours * 60 + minutes);
      const shifted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
      return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
      };
    }
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDateInTimeZone(
  tz: string | null | undefined,
  date = new Date(),
): string {
  const { year, month, day } = getDatePartsInTimeZone(tz, date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function formatMonthStartInTimeZone(
  tz: string | null | undefined,
  date = new Date(),
): string {
  const { year, month } = getDatePartsInTimeZone(tz, date);
  return `${year}-${pad2(month)}-01`;
}

export function nextMonthStart(dateStr: string): string {
  const [yearStr, monthStr] = dateStr.split("-").slice(0, 2);
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const dt = new Date(Date.UTC(year, month, 1));
  dt.setUTCMonth(dt.getUTCMonth() + 1);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-01`;
}

export function buildRecurrenceRule(
  args: any,
  fallbackAnchor: string,
): Record<string, unknown> | null {
  const provided = args?.recurrence_rule;
  if (provided && typeof provided === "object" && !Array.isArray(provided)) {
    const rule = { ...(provided as Record<string, unknown>) };
    const normalizedAnchorDate = normalizeCalendarDateString(
      normalizeDateInput(rule.anchor_date, fallbackAnchor),
    );
    if (!normalizedAnchorDate) return null;
    rule.anchor_date = normalizedAnchorDate;

    if (rule.end_date != null) {
      const normalizedEndDate = normalizeCalendarDateString(rule.end_date);
      if (normalizedEndDate) {
        rule.end_date = normalizedEndDate;
      } else {
        delete rule.end_date;
      }
    }

    return rule;
  }

  const frequency =
    typeof args?.frequency === "string" && args.frequency.trim()
      ? args.frequency.trim().toLowerCase()
      : null;
  const interval = Number.isFinite(args?.interval)
    ? Math.trunc(args.interval)
    : null;
  const anchor_date = normalizeDateInput(args?.anchor_date, fallbackAnchor);
  const end_date =
    typeof args?.end_date === "string" && args.end_date.trim()
      ? normalizeDateInput(args.end_date, "")
      : "";
  const reminderValue = Number.isFinite(args?.reminder_value)
    ? Math.trunc(args.reminder_value)
    : null;
  const reminderUnit =
    typeof args?.reminder_unit === "string" ? args.reminder_unit : null;

  if (!frequency) return null;

  const rule: Record<string, unknown> = {
    frequency,
    anchor_date,
  };

  if (interval && interval > 0) rule.interval = interval;
  if (end_date) rule.end_date = end_date;
  if (args?.reminder && typeof args.reminder === "object") {
    rule.reminder = args.reminder;
  } else if (reminderValue && reminderUnit) {
    rule.reminder = { enabled: true, value: reminderValue, unit: reminderUnit };
  }

  return rule;
}
