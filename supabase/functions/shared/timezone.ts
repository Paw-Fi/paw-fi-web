export function getLocalTimeMinutes(
  timezone?: string | null,
  date = new Date(),
): number {
  const tz = (timezone || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    const hour = Number(map.get("hour") ?? "0");
    const minute = Number(map.get("minute") ?? "0");
    return hour * 60 + minute;
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}

export function localDateTimeToUtcIso(params: {
  date: string;
  time: string;
  timeZone: string;
  referenceInstant?: string | Date | null;
}): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.date.trim());
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    params.time.trim(),
  );
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  const desiredUtcParts = Date.UTC(year, month - 1, day, hour, minute, second);
  const desiredDate = new Date(desiredUtcParts);
  if (
    desiredDate.getUTCFullYear() !== year ||
    desiredDate.getUTCMonth() !== month - 1 ||
    desiredDate.getUTCDate() !== day ||
    hour > 23 || minute > 59 || second > 59
  ) {
    return null;
  }

  const timeZone = params.timeZone.trim();
  const fixedOffset = parseUtcOffsetMinutes(timeZone);
  if (fixedOffset != null) {
    return new Date(desiredUtcParts - fixedOffset * 60_000).toISOString();
  }

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    return null;
  }

  const matchingInstants = new Set<number>();
  for (const seedOffsetHours of [-12, 0, 12]) {
    let guess = desiredUtcParts + seedOffsetHours * 3_600_000;
    for (let iteration = 0; iteration < 4; iteration++) {
      const localParts = readZonedParts(formatter, new Date(guess));
      if (!localParts) break;
      const renderedAsUtc = Date.UTC(
        localParts.year,
        localParts.month - 1,
        localParts.day,
        localParts.hour,
        localParts.minute,
        localParts.second,
      );
      const adjustment = desiredUtcParts - renderedAsUtc;
      if (adjustment === 0) {
        matchingInstants.add(guess);
        break;
      }
      guess += adjustment;
    }
  }

  if (matchingInstants.size === 0) return null;
  const reference = params.referenceInstant instanceof Date
    ? params.referenceInstant
    : typeof params.referenceInstant === "string"
    ? new Date(params.referenceInstant)
    : null;
  const referenceMs = reference && !Number.isNaN(reference.getTime())
    ? reference.getTime()
    : desiredUtcParts;
  const selected =
    Array.from(matchingInstants).sort((a, b) =>
      Math.abs(a - referenceMs) - Math.abs(b - referenceMs)
    )[0];
  return new Date(selected).toISOString();
}

function parseUtcOffsetMinutes(value: string): number | null {
  if (/^(UTC|GMT|Z)$/i.test(value)) return 0;
  const match = /^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(value);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) {
    return null;
  }
  const total = hours * 60 + minutes;
  return match[1] === "-" ? -total : total;
}

function readZonedParts(
  formatter: Intl.DateTimeFormat,
  date: Date,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} | null {
  const values = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const result = {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second")),
  };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

export function isInQuietHours(
  localMinutes: number,
  quietStartHour: number,
  quietEndHour: number,
): boolean {
  if (quietStartHour === quietEndHour) return false;
  const startMinutes = quietStartHour * 60;
  const endMinutes = quietEndHour * 60;
  return startMinutes < endMinutes
    ? localMinutes >= startMinutes && localMinutes < endMinutes
    : localMinutes >= startMinutes || localMinutes < endMinutes;
}
