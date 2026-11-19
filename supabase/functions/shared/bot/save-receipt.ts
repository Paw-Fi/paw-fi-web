import { resolveBotIntlLocale } from "./bot-messages.ts";
import type { SavedTransactionFact } from "./turn-ledger.ts";

// Receipt lines are written by code from rows the persistence layer returned.
// They contain only stored values, symbols and locale-formatted numbers and
// dates, so they need no translation and cannot disagree with the database.

export const SAVE_RECEIPT_MARKER = "🧾";
const MAX_RECEIPT_LINES = 10;

function formatAmount(fact: SavedTransactionFact, locale: string): string {
  const amount = fact.amount as number;
  const currency = fact.currency as string;
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, { style: "currency", currency })
      .format(amount);
  } catch {
    formatted = `${amount} ${currency}`;
  }
  return fact.type === "income" ? `+${formatted}` : formatted;
}

function formatDate(date: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  } catch {
    return date;
  }
}

export function buildSavedTransactionReceipt(
  saved: readonly SavedTransactionFact[],
  language: unknown,
): string {
  const locale = resolveBotIntlLocale(language);
  const complete = saved.filter((fact) =>
    fact.amount !== null && fact.currency !== null && fact.date !== null
  );
  const lines = complete.slice(0, MAX_RECEIPT_LINES).map((fact) =>
    [
      `${SAVE_RECEIPT_MARKER} ${formatAmount(fact, locale)}`,
      fact.label,
      `${formatDate(fact.date as string, locale)}${fact.recurring ? " 🔁" : ""}`,
    ].filter(Boolean).join(" · ")
  );
  if (complete.length > MAX_RECEIPT_LINES) {
    lines.push(`${SAVE_RECEIPT_MARKER} +${complete.length - MAX_RECEIPT_LINES}`);
  }
  return lines.join("\n");
}

// The marker is reserved for the backend. Any line the model starts with it is
// dropped, so a reply can never carry a receipt that code did not write.
export function stripModelAuthoredReceiptLines(text: string): string {
  return String(text || "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(SAVE_RECEIPT_MARKER))
    .join("\n")
    .trim();
}

export function appendSavedTransactionReceipt(
  text: string,
  saved: readonly SavedTransactionFact[],
  language: unknown,
): string {
  const body = stripModelAuthoredReceiptLines(text);
  const receipt = buildSavedTransactionReceipt(saved, language);
  return [body, receipt].filter(Boolean).join("\n\n");
}
