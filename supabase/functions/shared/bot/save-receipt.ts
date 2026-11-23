import { botMessage, resolveBotIntlLocale } from "./bot-messages.ts";
import {
  type BotTurnLedger,
  type SavedTransactionFact,
  summarizeBotTurn,
} from "./turn-ledger.ts";

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
      `${formatDate(fact.date as string, locale)}${
        fact.recurring ? " 🔁" : ""
      }`,
    ].filter(Boolean).join(" · ")
  );
  if (complete.length > MAX_RECEIPT_LINES) {
    lines.push(
      `${SAVE_RECEIPT_MARKER} +${complete.length - MAX_RECEIPT_LINES}`,
    );
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

// One code-authored line that states where a transaction stands when the
// turn touched the save path and did not store everything. It is derived from
// tool outcomes only, so it is true even if the reply above it is not.
export function buildSaveStatusLine(
  ledger: BotTurnLedger,
  language: unknown,
): string {
  const facts = summarizeBotTurn(ledger);
  const savedCount = ledger.savedTransactions.length;
  if (savedCount > 0) {
    return ledger.batchRowsNotSaved > 0
      ? botMessage("someNotSaved", language, ledger.batchRowsNotSaved)
      : "";
  }
  if (facts.saveAttempted) return botMessage("saveNotConfirmed", language);
  return facts.hasUnsavedDraft ? botMessage("notSavedYet", language) : "";
}

// Closes every reply with the facts code can vouch for: a receipt per stored
// transaction, and a status line when something was extracted or attempted
// but not stored. A reply that was already replaced by a backend notice says
// this itself, so it gets receipts only.
export function appendTurnStatus(params: {
  text: string;
  ledger: BotTurnLedger;
  language: unknown;
  replyWasReplaced: boolean;
}): string {
  return [
    stripModelAuthoredReceiptLines(params.text),
    buildSavedTransactionReceipt(
      params.ledger.savedTransactions,
      params.language,
    ),
    params.replyWasReplaced
      ? ""
      : buildSaveStatusLine(params.ledger, params.language),
  ].filter(Boolean).join("\n\n");
}
