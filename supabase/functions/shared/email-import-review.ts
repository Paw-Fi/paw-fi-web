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
