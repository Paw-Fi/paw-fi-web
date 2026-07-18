export const PLAID_REQUIRED_RELINK_STATE = "required";
export const PLAID_NEW_ACCOUNTS_RELINK_STATE = "new_accounts_available";

const PLAID_ACCOUNT_SELECTION_COUNTRY_CODES = new Set(["US", "CA"]);
const PLAID_RELINK_ERROR_CODES = new Set([
  "ITEM_LOGIN_REQUIRED",
  "ACCESS_NOT_GRANTED",
  "ADDITIONAL_CONSENT_REQUIRED",
  "ITEM_LOCKED",
  "USER_SETUP_REQUIRED",
]);

export interface PlaidSelectedAccountMetadata {
  id: string;
  mask?: string | null;
  name?: string | null;
  subtype?: string | null;
  type?: string | null;
}

export interface PlaidItemWebhookAction {
  shouldEnqueueSync: boolean;
  status: string | null;
  itemStatus: string | null;
  itemHealthState: string | null;
  relinkState: string | null;
}

export function normalizePlaidSelectedAccounts(
  value: unknown,
): PlaidSelectedAccountMetadata[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: PlaidSelectedAccountMetadata[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const id = String(record.id || "").trim();
    if (!id) {
      continue;
    }

    normalized.push({
      id,
      mask: normalizeOptionalString(record.mask),
      name: normalizeOptionalString(record.name),
      subtype: normalizeOptionalString(record.subtype),
      type: normalizeOptionalString(record.type),
    });
  }

  return normalized;
}

export function normalizePlaidSelectedAccountIds(value: unknown): string[] {
  return Array.from(
    new Set(normalizePlaidSelectedAccounts(value).map((account) => account.id)),
  ).sort();
}

export function findMissingPlaidSelectedAccountIds(params: {
  selectedAccountIds: string[];
  returnedAccountIds: string[];
}): string[] {
  const returnedAccountIds = new Set(
    params.returnedAccountIds.map((value) => value.trim()).filter(Boolean),
  );

  return Array.from(
    new Set(
      params.selectedAccountIds.map((value) => value.trim()).filter(Boolean),
    ),
  )
    .filter((accountId) => !returnedAccountIds.has(accountId))
    .sort();
}

export function resolvePlaidAccountsToDisableAfterUpdate(params: {
  requiresAccountSelection: boolean;
  existingAccountIds: string[];
  returnedAccountIds: string[];
}): string[] {
  if (!params.requiresAccountSelection) {
    return [];
  }

  const returnedAccountIds = new Set(
    params.returnedAccountIds.map((value) => value.trim()).filter(Boolean),
  );
  if (returnedAccountIds.size === 0) {
    return [];
  }

  return Array.from(
    new Set(
      params.existingAccountIds.map((value) => value.trim()).filter(Boolean),
    ),
  )
    .filter((accountId) => !returnedAccountIds.has(accountId))
    .sort();
}

export function buildPlaidDuplicateGroupKey(params: {
  institutionId?: string | null;
  selectedAccountIds?: string[];
}): string | null {
  const institutionId = normalizeOptionalString(params.institutionId);
  const selectedAccountIds = Array.from(
    new Set((params.selectedAccountIds || []).map((value) => value.trim())),
  )
    .filter(Boolean)
    .sort();

  if (!institutionId || !selectedAccountIds.length) {
    return null;
  }

  return `plaid:${institutionId}:${selectedAccountIds.join(",")}`;
}

export function requiresPlaidPublicTokenExchange(params: {
  connectionId?: string | null;
}): boolean {
  return normalizeOptionalString(params.connectionId) == null;
}

export function shouldRunPlaidNewLinkDuplicateChecks(params: {
  connectionId?: string | null;
}): boolean {
  return requiresPlaidPublicTokenExchange(params);
}

export function shouldEnablePlaidAccountSelection(params: {
  countryCode?: string | null;
  relinkState?: string | null;
}): boolean {
  const relinkState = normalizeOptionalString(params.relinkState);
  if (relinkState !== PLAID_NEW_ACCOUNTS_RELINK_STATE) {
    return false;
  }

  const countryCode = normalizeOptionalString(
    params.countryCode,
  )?.toUpperCase();
  return (
    countryCode != null &&
    PLAID_ACCOUNT_SELECTION_COUNTRY_CODES.has(countryCode)
  );
}

export function classifyPlaidItemWebhook(params: {
  webhookCode?: string | null;
  errorCode?: string | null;
}): PlaidItemWebhookAction | null {
  const webhookCode = normalizeOptionalString(params.webhookCode);
  const errorCode = normalizeOptionalString(params.errorCode);

  if (webhookCode === "ERROR" && requiresPlaidRelinkForError(errorCode)) {
    return {
      shouldEnqueueSync: false,
      status: "needs_reauth",
      itemStatus: "pending_relink",
      itemHealthState: "unhealthy",
      relinkState: PLAID_REQUIRED_RELINK_STATE,
    };
  }

  if (
    webhookCode === "PENDING_EXPIRATION" ||
    webhookCode === "PENDING_DISCONNECT" ||
    webhookCode === "USER_PERMISSION_REVOKED"
  ) {
    return {
      shouldEnqueueSync: false,
      status: "needs_reauth",
      itemStatus: "pending_relink",
      itemHealthState: "unhealthy",
      relinkState: PLAID_REQUIRED_RELINK_STATE,
    };
  }

  if (webhookCode === "LOGIN_REPAIRED") {
    return {
      shouldEnqueueSync: true,
      status: "active",
      itemStatus: "active",
      itemHealthState: "healthy",
      relinkState: null,
    };
  }

  if (webhookCode === "NEW_ACCOUNTS_AVAILABLE") {
    return {
      shouldEnqueueSync: false,
      status: "active",
      itemStatus: "active",
      itemHealthState: "healthy",
      relinkState: PLAID_NEW_ACCOUNTS_RELINK_STATE,
    };
  }

  return null;
}

export function requiresPlaidRelinkForError(
  errorCode?: string | null,
): boolean {
  return PLAID_RELINK_ERROR_CODES.has(
    normalizeOptionalString(errorCode)?.toUpperCase() || "",
  );
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
}
