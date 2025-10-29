export function getDaysInMonth(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function clampDayToMonth(date: Date, day: number): number {
  if (!Number.isFinite(day) || day <= 0) {
    return date.getUTCDate();
  }
  return Math.min(day, getDaysInMonth(date));
}
