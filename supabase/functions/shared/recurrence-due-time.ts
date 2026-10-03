export function normalizeRecurrenceDueTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.exec(value.trim());
  if (!match) return null;
  return match[0].length === 5 ? `${match[0]}:00` : match[0];
}
