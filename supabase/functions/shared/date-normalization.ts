function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidYyyyMmDd(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function normalizeCalendarDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ymdPrefix = /^(\d{4}-\d{2}-\d{2})(?:[Tt\s].*)?$/.exec(trimmed)?.[1];
  if (ymdPrefix && isValidYyyyMmDd(ymdPrefix)) {
    return ymdPrefix;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = pad2(parsed.getUTCMonth() + 1);
  const day = pad2(parsed.getUTCDate());
  const normalized = `${year}-${month}-${day}`;

  return isValidYyyyMmDd(normalized) ? normalized : null;
}
