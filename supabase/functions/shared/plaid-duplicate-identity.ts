export interface PlaidDuplicateAccountIdentity {
  providerAccountId?: string | null;
  persistentAccountId?: string | null;
  institutionId?: string | null;
  name?: string | null;
  mask?: string | null;
  currency?: string | null;
  type?: string | null;
  subtype?: string | null;
}

export type PlaidDuplicateIdentityDecision =
  | "duplicate"
  | "distinct"
  | "candidate"
  | "ambiguous"
  | "none";

export function classifyPlaidDuplicateIdentity(params: {
  selected: PlaidDuplicateAccountIdentity;
  existing: PlaidDuplicateAccountIdentity;
  phase: "link" | "authoritative";
}): PlaidDuplicateIdentityDecision {
  const selectedPersistentId = normalize(params.selected.persistentAccountId);
  const existingPersistentId = normalize(params.existing.persistentAccountId);

  if (selectedPersistentId && existingPersistentId) {
    return selectedPersistentId === existingPersistentId
      ? "duplicate"
      : "distinct";
  }

  const selectedProviderId = normalize(params.selected.providerAccountId);
  const existingProviderId = normalize(params.existing.providerAccountId);
  if (
    selectedProviderId &&
    existingProviderId &&
    selectedProviderId === existingProviderId
  ) {
    return "duplicate";
  }

  if (
    !sameNormalizedValue(
      params.selected.institutionId,
      params.existing.institutionId,
    )
  ) {
    return "none";
  }

  if (params.phase === "link") {
    const selectedSignature = plaidLinkAccountSignature(params.selected);
    const existingSignature = plaidLinkAccountSignature(params.existing);
    return selectedSignature && selectedSignature === existingSignature
      ? "candidate"
      : "none";
  }

  const selectedSignature = plaidAuthoritativeAccountSignature(
    params.selected,
  );
  const existingSignature = plaidAuthoritativeAccountSignature(
    params.existing,
  );
  return selectedSignature && selectedSignature === existingSignature
    ? "ambiguous"
    : "none";
}

export function plaidLinkAccountSignature(
  account: PlaidDuplicateAccountIdentity,
): string | null {
  return buildSignature([
    normalizeLower(account.name),
    normalizeLower(account.mask),
  ]);
}

export function plaidAuthoritativeAccountSignature(
  account: PlaidDuplicateAccountIdentity,
): string | null {
  return buildSignature([
    normalizeLower(account.name),
    normalizeLower(account.mask),
    normalizeUpper(account.currency),
    normalizeLower(account.type),
    normalizeLower(account.subtype),
  ]);
}

function sameNormalizedValue(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return Boolean(normalizedLeft && normalizedLeft === normalizedRight);
}

function buildSignature(parts: Array<string | null>): string | null {
  return parts.every(Boolean) ? parts.join("|") : null;
}

function normalize(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function normalizeLower(value: string | null | undefined): string | null {
  return normalize(value)?.toLowerCase() || null;
}

function normalizeUpper(value: string | null | undefined): string | null {
  return normalize(value)?.toUpperCase() || null;
}
