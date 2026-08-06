import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";

export type RangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_14_days"
  | "last_28_days"
  | "last_30_days"
  | "this_month"
  | "custom";

export interface DateRange {
  start: string;
  end: string;
}

interface PresetOption {
  value: RangePreset;
  label: string;
}

/**
 * Preset options shown in the Range & Comparison dropdown, in display order.
 * Pages can filter this list via `visiblePresets` on the card component.
 */
export const PRESET_OPTIONS: readonly PresetOption[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_14_days", label: "Last 14 days" },
  { value: "last_28_days", label: "Last 28 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "custom", label: "Custom" },
] as const;

const DEFAULT_RANGE_DAYS = 6; // last_7_days is the default preset

export function dateToIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isValidIsoDate(value: string): boolean {
  if (!value) return false;
  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime());
}

export function getInclusiveDayCount(startIso: string, endIso: string): number {
  const days = eachDayOfInterval({
    start: parseISO(startIso),
    end: parseISO(endIso),
  });
  return days.length;
}

/**
 * Resolve a preset to a concrete `{ start, end }` ISO date range.
 * Returns `null` for the `custom` preset (caller keeps existing dates).
 */
export function applyRangePreset(preset: RangePreset): DateRange | null {
  const today = new Date();

  switch (preset) {
    case "today":
      return { start: dateToIso(today), end: dateToIso(today) };
    case "yesterday":
      return {
        start: dateToIso(subDays(today, 1)),
        end: dateToIso(subDays(today, 1)),
      };
    case "last_7_days":
      return {
        start: dateToIso(subDays(today, 6)),
        end: dateToIso(today),
      };
    case "last_14_days":
      return {
        start: dateToIso(subDays(today, 13)),
        end: dateToIso(today),
      };
    case "last_28_days":
      return {
        start: dateToIso(subDays(today, 27)),
        end: dateToIso(today),
      };
    case "last_30_days":
      return {
        start: dateToIso(subDays(today, 29)),
        end: dateToIso(today),
      };
    case "this_month":
      return {
        start: format(today, "yyyy-MM-01"),
        end: dateToIso(today),
      };
    case "custom":
      return null;
  }
}

/**
 * Normalize raw start/end inputs into a valid ordered range, falling back
 * to the default (last 7 days) when inputs are invalid.
 */
export function buildNormalizedRange(
  startDate: string,
  endDate: string,
): DateRange {
  const safeStart = isValidIsoDate(startDate)
    ? startDate
    : dateToIso(subDays(new Date(), DEFAULT_RANGE_DAYS));
  const safeEnd = isValidIsoDate(endDate) ? endDate : dateToIso(new Date());

  return safeStart <= safeEnd
    ? { start: safeStart, end: safeEnd }
    : { start: safeEnd, end: safeStart };
}

/**
 * Build the comparison range: the immediately preceding period of the same
 * length as the normalized range.
 */
export function buildCompareRange(normalized: DateRange): DateRange {
  const days = getInclusiveDayCount(normalized.start, normalized.end);
  const currentStart = parseISO(normalized.start);
  const priorEnd = subDays(currentStart, 1);
  const priorStart = subDays(priorEnd, days - 1);

  return {
    start: dateToIso(priorStart),
    end: dateToIso(priorEnd),
  };
}

export function formatRangeLabel(range: DateRange): string {
  return `${format(parseISO(range.start), "MMM d, yyyy")} - ${format(
    parseISO(range.end),
    "MMM d, yyyy",
  )}`;
}
