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

  // 1. Already YYYY-MM-DD (optionally with time suffix)
  const ymdPrefixMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt\s].*)?$/.exec(trimmed);
  if (ymdPrefixMatch) {
    const ymdPrefix = `${ymdPrefixMatch[1]}-${ymdPrefixMatch[2]}-${
      ymdPrefixMatch[3]
    }`;
    return isValidYyyyMmDd(ymdPrefix) ? ymdPrefix : null;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (day-first, common outside US)
  const dmyMatch = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    // If day > 12, it can only be DD/MM/YYYY
    // If both <= 12, prefer DD/MM/YYYY (international convention)
    const candidate = `${y}-${pad2(m)}-${pad2(d)}`;
    if (isValidYyyyMmDd(candidate)) return candidate;
    // Try swapped (MM/DD/YYYY)
    const swapped = `${y}-${pad2(d)}-${pad2(m)}`;
    if (isValidYyyyMmDd(swapped)) return swapped;
    return null;
  }

  // 3. YYYY/MM/DD or YYYY.MM.DD
  const ymdAlt = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(trimmed);
  if (ymdAlt) {
    const candidate = `${ymdAlt[1]}-${pad2(Number(ymdAlt[2]))}-${
      pad2(Number(ymdAlt[3]))
    }`;
    return isValidYyyyMmDd(candidate) ? candidate : null;
  }

  // 4. Fallback: JS Date constructor
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = pad2(parsed.getUTCMonth() + 1);
  const day = pad2(parsed.getUTCDate());
  const normalized = `${year}-${month}-${day}`;

  return isValidYyyyMmDd(normalized) ? normalized : null;
}
