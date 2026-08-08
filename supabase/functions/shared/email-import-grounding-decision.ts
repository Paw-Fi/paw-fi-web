import { sanitizeTransactionSourceGrounding } from "./analyze-core.ts";

export interface GroundedTransaction extends Record<string, unknown> {
  amount: number;
  currency: string;
}

export interface ImportFieldRepair {
  field: "currency";
  from: string | null;
  to: string;
  evidence: string;
}

export interface ImportReviewChoice {
  id: string;
  value: string;
  label: string;
  evidence: string;
}

export interface ImportReviewIssue {
  field: "currency";
  code: "MULTIPLE_GROUNDED_CURRENCIES";
  choices: ImportReviewChoice[];
}

export type ImportGroundingDecision =
  | { kind: "accept"; transaction: GroundedTransaction }
  | {
      kind: "auto_repair";
      transaction: GroundedTransaction;
      repairs: ImportFieldRepair[];
    }
  | {
      kind: "review";
      candidate: GroundedTransaction;
      issues: ImportReviewIssue[];
    }
  | { kind: "reject"; reasons: string[] };

export function decideEmailImportGrounding(params: {
  sourceText: string;
  item: Record<string, unknown>;
}): ImportGroundingDecision {
  const firstPass = sanitizeTransactionSourceGrounding({
    sourceText: params.sourceText,
    item: params.item,
  });
  const sanitized = firstPass.reasons.includes("MERCHANT_NOT_FOUND_IN_SOURCE")
    ? withoutField(firstPass.item, "merchant")
    : firstPass.item;
  const initial = sanitizeTransactionSourceGrounding({
    sourceText: params.sourceText,
    item: sanitized,
  });

  if (initial.grounded) {
    return { kind: "accept", transaction: initial.item as GroundedTransaction };
  }

  if (!initial.reasons.includes("CURRENCY_CONTRADICTS_SOURCE")) {
    return { kind: "reject", reasons: initial.reasons };
  }

  const amount = Number(initial.item.amount);
  const choices = currencyChoicesForAmount(params.sourceText, amount);
  if (choices.length === 1) {
    const repaired = { ...initial.item, currency: choices[0].value };
    const revalidated = sanitizeTransactionSourceGrounding({
      sourceText: params.sourceText,
      item: repaired,
    });
    if (revalidated.grounded) {
      return {
        kind: "auto_repair",
        transaction: revalidated.item as GroundedTransaction,
        repairs: [
          {
            field: "currency",
            from:
              typeof initial.item.currency === "string"
                ? initial.item.currency
                : null,
            to: choices[0].value,
            evidence: choices[0].evidence,
          },
        ],
      };
    }
    return { kind: "reject", reasons: revalidated.reasons };
  }

  if (
    choices.length > 1 &&
    initial.reasons.every((reason) => reason === "CURRENCY_CONTRADICTS_SOURCE")
  ) {
    return {
      kind: "review",
      candidate: initial.item as GroundedTransaction,
      issues: [
        { field: "currency", code: "MULTIPLE_GROUNDED_CURRENCIES", choices },
      ],
    };
  }

  return { kind: "reject", reasons: initial.reasons };
}

function withoutField(
  item: Record<string, unknown>,
  field: string,
): Record<string, unknown> {
  const sanitized = { ...item };
  delete sanitized[field];
  return sanitized;
}

function currencyChoicesForAmount(
  sourceText: string,
  amount: number,
): ImportReviewChoice[] {
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const escapedAmount = amount.toFixed(2).replace(".", "[.,]");
  const amountPattern = `(?:${amount}|${escapedAmount})`;
  const matches = sourceText.matchAll(
    new RegExp(
      `(?:\\b([A-Z]{3})\\b\\s*${amountPattern}|${amountPattern}\\s*\\b([A-Z]{3})\\b)`,
      "g",
    ),
  );
  const byCurrency = new Map<string, string>();
  for (const match of matches) {
    const currency = match[1] ?? match[2];
    if (!currency) continue;
    byCurrency.set(currency, match[0].slice(0, 80));
  }
  return [...byCurrency.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, evidence]) => ({
      id: `currency:${currency}`,
      value: currency,
      label: currency,
      evidence,
    }));
}
