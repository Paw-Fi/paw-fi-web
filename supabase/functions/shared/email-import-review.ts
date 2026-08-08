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

export function resolveStoredReviewDecision(params: {
  candidate: Record<string, unknown>;
  issues: Array<{
    field: string;
    choices: Array<{ id: string; value: unknown }>;
  }>;
  optionIds: string[];
}): Record<string, unknown> | null {
  const expectedIds = params.issues.map((issue) =>
    issue.choices.map((choice) => choice.id),
  );
  if (params.optionIds.length !== expectedIds.length) return null;
  const transaction = { ...params.candidate };
  for (let index = 0; index < params.issues.length; index++) {
    const choice = params.issues[index].choices.find(
      (item) => item.id === params.optionIds[index],
    );
    if (!choice) return null;
    transaction[params.issues[index].field] = choice.value;
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
