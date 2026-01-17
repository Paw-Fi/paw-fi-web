export function getLocalTimeMinutes(timezone?: string | null, date = new Date()): number {
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
