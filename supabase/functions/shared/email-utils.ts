// Escape HTML to prevent XSS
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Sanitize email subjects to prevent header injection
export function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, "");
}

// International formatters
export function formatDate(
  date: string | Date | undefined,
  locale: string = "en-US",
): string {
  if (!date) return "";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return date === "N/A" ? "N/A" : "";
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

// Simple pluralizer
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  return count === 1 ? singular : plural || singular + "s";
}
