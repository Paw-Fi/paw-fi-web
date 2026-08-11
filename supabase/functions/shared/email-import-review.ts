export const EMAIL_IMPORT_REVIEW_EXPIRY_HOURS = 72;

export function createEmailImportReviewToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64Url(bytes);
}

export async function hashEmailImportReviewToken(
  token: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function isValidReviewToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function createReviewOptionId(
  issueIndex: number,
  value: string,
): string {
  return `issue:${issueIndex}:${value}`;
}

interface StoredReviewIssue {
  field: string;
  choices: Array<{ id: string; value: unknown }>;
}

interface StoredReviewItem {
  id: string;
  issues: StoredReviewIssue[];
}

interface ReviewDecisionInput {
  itemId?: unknown;
  optionIds?: unknown;
  decline?: unknown;
}

export interface ValidatedReviewDecision {
  itemId: string;
  decline: boolean;
  optionIds: string[];
}

export interface EmailImportReviewSource {
  senderEmail: string | null;
  subjectLine: string | null;
  receivedAt: string | null;
  files: Array<{
    name: string;
    status: "processed" | "failed" | "unknown";
    transactionCount: number;
  }>;
}

export interface EmailImportReviewTransaction {
  type?: "expense" | "income";
  amount?: number;
  currency?: string;
  date?: string;
  merchant?: string;
  description?: string;
  category?: string;
}

export function buildEmailImportReviewSource(
  event: Record<string, unknown> | null | undefined,
): EmailImportReviewSource {
  const result = asRecord(event?.result);
  const emailSummary = asRecord(result?.emailSummary);
  const attachmentResults = Array.isArray(result?.attachmentResults)
    ? result.attachmentResults
    : [];

  return {
    senderEmail: boundedString(event?.sender_email, 320),
    subjectLine: boundedString(emailSummary?.subjectLine, 240),
    receivedAt: boundedString(emailSummary?.receivedAt, 64) ??
      boundedString(event?.created_at, 64),
    files: attachmentResults.slice(0, 25).flatMap((value) => {
      const attachment = asRecord(value);
      const name = boundedString(attachment?.filename, 240);
      if (!name) return [];
      return [
        {
          name,
          status: attachment?.success === true
            ? ("processed" as const)
            : attachment?.success === false
            ? ("failed" as const)
            : ("unknown" as const),
          transactionCount: nonNegativeInteger(attachment?.itemCount),
        },
      ];
    }),
  };
}

export function buildEmailImportReviewItem(
  item: Record<string, unknown>,
): Record<string, unknown> {
  const candidate = asRecord(item.candidate) ?? {};
  const resolved = asRecord(item.resolved_transaction);
  const transaction = buildEmailImportReviewTransaction(resolved ?? candidate);
  const saveResult = asRecord(item.save_result);
  const selectedOptionIds = Array.isArray(item.selected_option_ids)
    ? item.selected_option_ids
      .filter((value): value is string => typeof value === "string")
      .slice(0, 25)
    : null;

  return {
    id: boundedString(item.id, 64) ?? "",
    summary: reviewTransactionSummary(transaction),
    transaction,
    issues: Array.isArray(item.issues) ? item.issues : [],
    options: Array.isArray(item.options) ? item.options : [],
    selectedOptionIds,
    saveStatus: boundedString(item.save_status, 32) ?? "pending",
    transactionId: boundedString(saveResult?.id, 64),
  };
}

function buildEmailImportReviewTransaction(
  value: Record<string, unknown>,
): EmailImportReviewTransaction {
  const type = value.type === "expense" || value.type === "income"
    ? value.type
    : null;
  const amount =
    typeof value.amount === "number" && Number.isFinite(value.amount)
      ? value.amount
      : null;
  const currency = boundedString(value.currency, 8)?.toUpperCase();
  const date = boundedString(value.date, 32);
  const merchant = boundedString(value.merchant, 160);
  const description = boundedString(value.description, 240);
  const category = boundedString(value.category, 80);

  return {
    ...ifDefined("type", type),
    ...ifDefined("amount", amount),
    ...ifDefined("currency", currency),
    ...ifDefined("date", date),
    ...ifDefined("merchant", merchant),
    ...ifDefined("description", description),
    ...ifDefined("category", category),
  } as EmailImportReviewTransaction;
}

function reviewTransactionSummary(
  transaction: EmailImportReviewTransaction,
): string {
  return (
    transaction.description ??
      transaction.merchant ??
      (transaction.amount != null
        ? `${transaction.currency ?? ""} ${transaction.amount}`.trim()
        : "Transaction awaiting review")
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function nonNegativeInteger(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function ifDefined(key: string, value: unknown): Record<string, unknown> {
  return value == null ? {} : { [key]: value };
}

export function validateStoredReviewDecisions(
  items: StoredReviewItem[],
  decisions: ReviewDecisionInput[],
): ValidatedReviewDecision[] | null {
  if (decisions.length !== items.length) return null;
  const decisionsByItem = new Map<string, ReviewDecisionInput>();
  for (const decision of decisions) {
    if (
      typeof decision.itemId !== "string" ||
      decisionsByItem.has(decision.itemId)
    ) {
      return null;
    }
    decisionsByItem.set(decision.itemId, decision);
  }

  const validated: ValidatedReviewDecision[] = [];
  for (const item of items) {
    const decision = decisionsByItem.get(item.id);
    if (!decision) return null;
    if (decision.decline === true) {
      if (
        decision.optionIds !== undefined &&
        (!Array.isArray(decision.optionIds) || decision.optionIds.length > 0)
      ) {
        return null;
      }
      validated.push({ itemId: item.id, decline: true, optionIds: [] });
      continue;
    }
    if (
      !Array.isArray(decision.optionIds) ||
      decision.optionIds.some((value) => typeof value !== "string")
    ) {
      return null;
    }
    const selectedIds = new Set(decision.optionIds as string[]);
    if (selectedIds.size !== item.issues.length) return null;
    const normalizedIds: string[] = [];
    for (const issue of item.issues) {
      const selected = issue.choices.filter((choice) =>
        selectedIds.has(choice.id)
      );
      if (selected.length !== 1) return null;
      normalizedIds.push(selected[0].id);
    }
    validated.push({
      itemId: item.id,
      decline: false,
      optionIds: normalizedIds,
    });
  }
  return validated;
}

export function resolveStoredReviewDecision(params: {
  candidate: Record<string, unknown>;
  issues: Array<{
    field: string;
    choices: Array<{ id: string; value: unknown }>;
  }>;
  optionIds: string[];
}): Record<string, unknown> | null {
  if (new Set(params.optionIds).size !== params.issues.length) return null;
  const transaction = { ...params.candidate };
  for (const issue of params.issues) {
    const choices = issue.choices.filter((item) =>
      params.optionIds.includes(item.id)
    );
    if (choices.length !== 1) return null;
    transaction[issue.field] = choices[0].value;
  }
  return transaction;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
