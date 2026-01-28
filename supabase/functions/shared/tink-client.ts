import { normalizeCategory } from "./category-colors.ts";
import { fetchWithRetry } from "./bank-retry.ts";

export const TINK_PROVIDER = "tink";

const API_BASE_URLS = {
  sandbox: "https://api.tink.com",
  production: "https://api.tink.com",
};

const LINK_BASE_URLS = {
  sandbox: "https://link.tink.com",
  production: "https://link.tink.com",
};

const MARKET_LOCALE_OVERRIDES: Record<string, string> = {
  IE: "en_IE",
};

/**
 * Tink Link's constant actor client ID.
 * This is documented by Tink and required for delegated authorization grants
 * that will be consumed by Tink Link.
 * @see https://docs.tink.com/resources/tink-link-web/tink-link-web-permanent-users
 */
const TINK_LINK_ACTOR_CLIENT_ID = "df05e4b379934cd09963197cc855bfe9";

type TinkEnv = keyof typeof API_BASE_URLS;

interface TinkConfig {
  clientId: string;
  clientSecret: string;
  env: TinkEnv;
  apiBaseUrl: string;
  linkBaseUrl: string;
  redirectUri: string;
  scopes: string[];
  defaultMarket: string;
  defaultLocale: string;
}

interface TinkLinkParams {
  state?: string;
  market?: string;
  locale?: string;
  scopes?: string[];
  authorizationCode: string;
}

export interface TinkTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  user_id?: string;
  id_hint?: string;
}

export interface TinkAccountBalance {
  amount?: number | null;
  currencyCode?: string | null;
}

export interface TinkAccount {
  id: string;
  name?: string | null;
  type?: { name?: string | null } | null;
  accountNumber?: { iban?: string | null } | null;
  balances?: {
    booked?: TinkAccountBalance | null;
    available?: TinkAccountBalance | null;
  } | null;
  financialInstitutionId?: string | null;
}

export interface TinkTransaction {
  id: string;
  accountId: string;
  amount?: {
    currencyCode?: string | null;
    value?: {
      unscaledValue?: number | string | null;
      scale?: number | string | null;
    } | null;
  } | null;
  dates?: { booked?: string | null; value?: string | null };
  descriptions?: {
    original?: string | null;
    display?: string | null;
    detailed?: { unstructured?: string | null } | null;
  };
  merchantName?: string | null;
  categories?: { pfm?: { detailed?: string | null; primary?: string | null } };
  identifiers?: { providerTransactionId?: string | null } | null;
  types?: { type?: string | null } | null;
}

function getTinkLinkScopes(scopes: string[]): string[] {
  return scopes.filter((scope) => scope !== "offline_access");
}

let cachedConfig: TinkConfig | null = null;

export function getTinkConfig(): TinkConfig {
  if (cachedConfig) return cachedConfig;

  const clientId = Deno.env.get("TINK_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("TINK_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("TINK_CLIENT_ID and TINK_CLIENT_SECRET must be configured");
  }

  const env = (Deno.env.get("TINK_ENV")?.trim()?.toLowerCase() ||
    "sandbox") as TinkEnv;
  const redirectUri =
    Deno.env.get("TINK_REDIRECT_URI")?.trim() || "moneko://tink";
  const scopes = (
    Deno.env.get("TINK_SCOPES") || "accounts:read,transactions:read"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  cachedConfig = {
    clientId,
    clientSecret,
    env,
    apiBaseUrl: API_BASE_URLS[env] || API_BASE_URLS.sandbox,
    linkBaseUrl: LINK_BASE_URLS[env] || LINK_BASE_URLS.sandbox,
    redirectUri,
    scopes,
    defaultMarket: Deno.env.get("TINK_DEFAULT_MARKET")?.trim() || "GB",
    defaultLocale: Deno.env.get("TINK_DEFAULT_LOCALE")?.trim() || "en_US",
  };

  return cachedConfig;
}

export function createTinkLinkUrl(
  params: TinkLinkParams & {
    credentialsId?: string;
  },
): {
  link_url: string;
  state: string;
} {
  const config = getTinkConfig();
  const state = params.state || crypto.randomUUID();
  const market = (params.market || config.defaultMarket).toUpperCase();
  const scopes = getTinkLinkScopes(params.scopes || config.scopes);
  const locale =
    params.locale ?? MARKET_LOCALE_OVERRIDES[market] ?? config.defaultLocale;

  // Use UPDATE mode if credentialsId provided (reconnection), otherwise ADD mode (new connection)
  const path = params.credentialsId
    ? `/1.0/credentials/${params.credentialsId}/update`
    : "/1.0/credentials/add";

  const url = new URL(`${config.linkBaseUrl}${path}`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("authorization_code", params.authorizationCode);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("market", market);
  url.searchParams.set("locale", locale);
  url.searchParams.set("state", state);

  return { link_url: url.toString(), state };
}

async function getTinkClientAccessToken(): Promise<string> {
  const config = getTinkConfig();
  const scope = (
    Deno.env.get("TINK_CLIENT_SCOPES") || "authorization:grant,user:create"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(",");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope,
  });

  const response = await fetchWithRetry(
    `${config.apiBaseUrl}/api/v1/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    console.error("[tink-client] Client token error", {
      status: response.status,
      payload,
    });
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to get Tink client token",
    );
  }

  const accessToken = payload?.access_token as string | undefined;
  if (!accessToken) {
    throw new Error("Missing Tink client access token");
  }

  return accessToken;
}

export interface TinkProviderInfo {
  name?: string | null;
  displayName?: string | null;
  images?: { icon?: string | null; banner?: string | null } | null;
}

export async function getTinkProviderByName(params: {
  market: string;
  name: string;
  accessToken?: string;
}): Promise<TinkProviderInfo | null> {
  const config = getTinkConfig();
  const market = params.market.toUpperCase();
  const token = params.accessToken || (await getTinkClientAccessToken());
  const url = new URL(`${config.apiBaseUrl}/api/v1/providers/${market}`);
  url.searchParams.set("name", params.name);

  const response = await fetchWithRetry(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to fetch providers",
    );
  }

  const providers = (payload?.providers || []) as TinkProviderInfo[];
  return providers[0] || null;
}

export async function createTinkUserAuthorizationCode(params: {
  externalUserId: string;
  scopes?: string[];
  market?: string;
  locale?: string;
  // Delegated grant actor (who can exchange/consume this authorization code).
  // For Tink Link (browser flow), this is typically a Tink-managed actor client.
  // For server-side exchange (token endpoint with client_secret), this should be our own clientId.
  actorClientId?: string;
}): Promise<string> {
  const config = getTinkConfig();
  const accessToken = await getTinkClientAccessToken();
  const requestedScopes = params.scopes || config.scopes;
  const linkScopes = getTinkLinkScopes(requestedScopes);

  // `offline_access` is used for refresh tokens, but it is not always a valid
  // scope for the delegated grant on a given client. Keep it out of the delegated
  // grant to avoid hard failures; token exchange can still succeed without it.
  const requestedScopesForDelegation = requestedScopes.filter(
    (scope) => scope !== "offline_access",
  );
  const delegateScopes = (
    Deno.env.get("TINK_LINK_DELEGATE_SCOPES") ||
    "credentials:read,credentials:refresh,credentials:write,providers:read,user:read,authorization:read"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .concat(requestedScopesForDelegation)
    .filter(Boolean)
    // Deduplicate while preserving order
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(",");
  const market = (params.market || config.defaultMarket).toUpperCase();
  const locale =
    params.locale ?? MARKET_LOCALE_OVERRIDES[market] ?? config.defaultLocale;

  let userId: string | undefined;
  const createUserResponse = await fetchWithRetry(
    `${config.apiBaseUrl}/api/v1/user/create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_user_id: params.externalUserId,
        market,
        locale,
        retention_class: "permanent",
      }),
    },
  );

  const createUserPayload = await createUserResponse.json();
  if (!createUserResponse.ok && createUserResponse.status !== 409) {
    console.error("[tink-client] User create error", {
      status: createUserResponse.status,
      payload: createUserPayload,
    });
    throw new Error(
      createUserPayload?.error_description ||
        createUserPayload?.error ||
        createUserPayload?.errorMessage ||
        "Failed to create Tink user",
    );
  }

  if (createUserResponse.ok) {
    userId = createUserPayload?.user_id as string | undefined;
    console.log("[tink-client] Created user", {
      userId,
      externalUserId: params.externalUserId,
      market,
      locale,
    });
  } else if (createUserResponse.status === 409) {
    console.log("[tink-client] User already exists", {
      externalUserId: params.externalUserId,
      market,
      locale,
    });
  }

  const body = new URLSearchParams({
    scope: delegateScopes,
    id_hint: params.externalUserId,
  });

  // Tink Link requires actor_client_id to be set to the constant Tink Link actor client ID.
  // Use custom actor client ID if provided (e.g., for server-to-server exchange), otherwise
  // default to the Tink Link actor client ID.
  const actorClientId = params.actorClientId || TINK_LINK_ACTOR_CLIENT_ID;
  body.set("actor_client_id", actorClientId);

  if (userId) {
    body.set("user_id", userId);
  } else {
    body.set("external_user_id", params.externalUserId);
  }

  const delegateUrl = `${config.apiBaseUrl}/api/v1/oauth/authorization-grant/delegate`;

  const delegate = async (scope: string) => {
    const delegateBody = new URLSearchParams(body);
    delegateBody.set("scope", scope);
    const response = await fetchWithRetry(delegateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: delegateBody.toString(),
    });

    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  };

  let { response, payload } = await delegate(delegateScopes);

  // Some clients reject `offline_access` at the delegation step even if it's in TINK_SCOPES.
  // If that happens, retry once with it removed.
  if (
    !response.ok &&
    payload?.errorCode === "oauth.invalid_scope" &&
    typeof payload?.errorDetails === "string" &&
    payload.errorDetails.includes("offline_access")
  ) {
    const retryScope = delegateScopes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => s !== "offline_access")
      .join(",");

    console.warn(
      "[tink-client] Delegated grant rejected offline_access; retrying without it",
    );
    ({ response, payload } = await delegate(retryScope));
  }

  if (!response.ok) {
    console.error("[tink-client] Authorization grant error", {
      status: response.status,
      payload,
    });
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        payload?.errorMessage ||
        "Failed to create Tink authorization code",
    );
  }

  const code = payload?.code as string | undefined;
  if (!code) {
    throw new Error("Missing Tink authorization code");
  }

  return code;
}

/**
 * Get a user access token for an existing Tink user after Tink Link callback.
 * This creates a new authorization code and immediately exchanges it for an access token.
 * Use this when the user has completed Tink Link and you need to access their data.
 */
export async function getTinkUserAccessToken(params: {
  externalUserId: string;
  scopes?: string[];
  market?: string;
  locale?: string;
}): Promise<TinkTokenResponse> {
  const config = getTinkConfig();

  // Generate a new authorization code for this user.
  // IMPORTANT: Use our own client ID as the actor_client_id because WE will be
  // exchanging this code (not Tink Link). The actor_client_id must match the
  // client_id used in the token exchange request.
  const authorizationCode = await createTinkUserAuthorizationCode({
    ...params,
    actorClientId: config.clientId,
  });

  // Immediately exchange it for an access token
  return await exchangeTinkAuthorizationCode(authorizationCode);
}

export async function exchangeTinkAuthorizationCode(
  code: string,
): Promise<TinkTokenResponse> {
  const config = getTinkConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetchWithRetry(
    `${config.apiBaseUrl}/api/v1/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    console.error("[tink-client] Token exchange error", {
      status: response.status,
      error: payload?.error,
      error_description: payload?.error_description,
      error_code: payload?.error_code,
    });
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to exchange Tink auth code",
    );
  }

  return payload as TinkTokenResponse;
}

export async function refreshTinkAccessToken(
  refreshToken: string,
): Promise<TinkTokenResponse> {
  const config = getTinkConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetchWithRetry(
    `${config.apiBaseUrl}/api/v1/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to refresh Tink access token",
    );
  }

  return payload as TinkTokenResponse;
}

export async function getTinkAccounts(
  accessToken: string,
): Promise<TinkAccount[]> {
  const config = getTinkConfig();
  const response = await fetchWithRetry(
    `${config.apiBaseUrl}/data/v2/accounts`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to fetch Tink accounts",
    );
  }

  return (payload?.accounts || []) as TinkAccount[];
}

export interface TinkCredential {
  id: string;
  providerId?: string;
  providerName?: string;
  type?: string;
  status?: string;
  updated?: number;
  userId?: string;
}

interface TinkTransactionsResponse {
  transactions: TinkTransaction[];
  nextPageToken?: string | null;
}

/**
 * List credentials for a Tink user
 * Returns array of credentials with their IDs and status
 */
export async function listTinkCredentials(
  accessToken: string,
): Promise<TinkCredential[]> {
  const config = getTinkConfig();
  const response = await fetchWithRetry(
    `${config.apiBaseUrl}/api/v1/credentials/list`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to list Tink credentials",
    );
  }

  return (payload?.credentials || []) as TinkCredential[];
}

/**
 * Delete a specific credential by ID
 * Use this to remove old credentials before adding new ones
 */
export async function deleteTinkCredential(
  accessToken: string,
  credentialsId: string,
): Promise<void> {
  const config = getTinkConfig();
  const response = await fetchWithRetry(
    `${config.apiBaseUrl}/api/v1/credentials/${credentialsId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        `Failed to delete Tink credential ${credentialsId}`,
    );
  }
}

export async function syncTinkTransactions(
  accessToken: string,
  pageToken?: string | null,
): Promise<TinkTransactionsResponse> {
  const config = getTinkConfig();
  const url = new URL(`${config.apiBaseUrl}/data/v2/transactions`);
  url.searchParams.set("limit", "250");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await fetchWithRetry(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Failed to sync Tink transactions",
    );
  }

  return {
    transactions: (payload?.transactions || []) as TinkTransaction[],
    nextPageToken: payload?.nextPageToken || null,
  };
}

export interface MapTinkTransactionInput {
  userId: string;
  bankAccountId: string;
  householdId?: string | null;
  defaultCurrency?: string | null;
  transaction: TinkTransaction;
}

export function mapTinkTransactionToExpense(input: MapTinkTransactionInput) {
  const txn = input.transaction;
  const rawAmount = txn.amount?.value?.unscaledValue;
  const scale = Number(txn.amount?.value?.scale ?? 0);
  const numericAmount = rawAmount == null ? 0 : Number(rawAmount);
  const divisor = Number.isFinite(scale) ? Math.pow(10, scale) : 1;
  const amount = divisor ? numericAmount / divisor : numericAmount;
  const currency = txn.amount?.currencyCode || input.defaultCurrency || "USD";
  const absAmount = Math.abs(amount);
  const amountCents = Math.round(absAmount * 100);
  const isIncome = amount > 0;
  const description =
    txn.descriptions?.display ||
    txn.descriptions?.original ||
    txn.descriptions?.detailed?.unstructured ||
    txn.merchantName ||
    "Transaction";

  const rawCategory =
    txn.categories?.pfm?.detailed ||
    txn.categories?.pfm?.primary ||
    mapTinkTypeToCategoryInput(txn.types?.type) ||
    null;
  const normalizedCategory = rawCategory
    ? normalizeCategory(rawCategory)
    : null;

  return {
    user_id: input.userId,
    bank_account_id: input.bankAccountId,
    provider: TINK_PROVIDER,
    provider_transaction_id: txn.identifiers?.providerTransactionId || txn.id,
    amount_cents: amountCents,
    currency,
    date:
      txn.dates?.booked ||
      txn.dates?.value ||
      new Date().toISOString().slice(0, 10),
    type: isIncome ? "income" : ("expense" as const),
    category: normalizedCategory,
    raw_text: description,
    source: txn.merchantName || null,
    raw_provider_payload: txn,
    is_recurring: false,
    recurrence_rule: null,
    household_id: input.householdId || null,
    contact_id: null,
    normalized_amount_cents: amountCents,
    base_currency: currency,
    fx_rate: 1,
  };
}

function mapTinkTypeToCategoryInput(type?: string | null): string | null {
  if (!type) return null;
  const normalized = type.trim().toLowerCase().replace(/_/g, " ");
  switch (normalized) {
    case "default":
    case "unknown":
      return "other";
    case "transfer":
    case "transfer in":
    case "transfer out":
    case "cash withdrawal":
      return "transfer";
    case "payroll":
    case "salary":
      return "salary";
    case "interest":
      return "interest";
    case "dividend":
      return "dividend";
    case "loan payment":
      return "loan";
    case "credit card payment":
      return "debt";
    case "fee":
    case "bank fee":
      return "bank fee";
    case "refund":
      return "refund";
    case "savings":
      return "savings";
    default:
      return normalized;
  }
}
