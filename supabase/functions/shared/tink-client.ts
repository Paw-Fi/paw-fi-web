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
  amount: { value: { amount: number; currencyCode?: string | null } };
  dates?: { booked?: string | null; value?: string | null };
  descriptions?: { original?: string | null; display?: string | null };
  merchantName?: string | null;
  categories?: { pfm?: { detailed?: string | null; primary?: string | null } };
}

let cachedConfig: TinkConfig | null = null;

export function getTinkConfig(): TinkConfig {
  if (cachedConfig) return cachedConfig;

  const clientId = Deno.env.get("TINK_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("TINK_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("TINK_CLIENT_ID and TINK_CLIENT_SECRET must be configured");
  }

  const env = (Deno.env.get("TINK_ENV")?.trim()?.toLowerCase() || "sandbox") as TinkEnv;
  const redirectUri = Deno.env.get("TINK_REDIRECT_URI")?.trim() || "moneko://tink";
  const scopes = (Deno.env.get("TINK_SCOPES") || "accounts:read,transactions:read,offline_access")
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

export function createTinkLinkUrl(params: TinkLinkParams): { link_url: string; state: string } {
  const config = getTinkConfig();
  const state = params.state || crypto.randomUUID();
  const market = (params.market || config.defaultMarket).toUpperCase();
  const scopes = params.scopes || config.scopes;
  const locale = params.locale || config.defaultLocale;

  const url = new URL(`${config.linkBaseUrl}/1.0/`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("market", market);
  url.searchParams.set("locale", locale);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("test", config.env === "production" ? "false" : "true");

  return { link_url: url.toString(), state };
}

export async function exchangeTinkAuthorizationCode(code: string): Promise<TinkTokenResponse> {
  const config = getTinkConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetchWithRetry(`${config.apiBaseUrl}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "Failed to exchange Tink auth code");
  }

  return payload as TinkTokenResponse;
}

export async function refreshTinkAccessToken(refreshToken: string): Promise<TinkTokenResponse> {
  const config = getTinkConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetchWithRetry(`${config.apiBaseUrl}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "Failed to refresh Tink access token");
  }

  return payload as TinkTokenResponse;
}

export async function getTinkAccounts(accessToken: string): Promise<TinkAccount[]> {
  const config = getTinkConfig();
  const response = await fetchWithRetry(`${config.apiBaseUrl}/data/v2/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "Failed to fetch Tink accounts");
  }

  return (payload?.accounts || []) as TinkAccount[];
}

interface TinkTransactionsResponse {
  transactions: TinkTransaction[];
  nextPageToken?: string | null;
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
    throw new Error(payload?.error_description || payload?.error || "Failed to sync Tink transactions");
  }

  return {
    transactions: (payload?.transactions || []) as TinkTransaction[],
    nextPageToken: payload?.nextPageToken || null,
  };
}

export interface MapTinkTransactionInput {
  userId: string;
  bankAccountId: string;
  defaultCurrency?: string | null;
  transaction: TinkTransaction;
}

export function mapTinkTransactionToExpense(input: MapTinkTransactionInput) {
  const txn = input.transaction;
  const amount = Number(txn.amount?.value?.amount || 0);
  const currency = txn.amount?.value?.currencyCode || input.defaultCurrency || "USD";
  const absAmount = Math.abs(amount);
  const amountCents = Math.round(absAmount * 100);
  const isIncome = amount > 0;
  const description = txn.descriptions?.display
    || txn.descriptions?.original
    || txn.merchantName
    || "Transaction";

  const categoryName = txn.categories?.pfm?.detailed
    || txn.categories?.pfm?.primary
    || null;
  const normalizedCategory = categoryName ? normalizeCategory(categoryName) : null;

  return {
    user_id: input.userId,
    bank_account_id: input.bankAccountId,
    provider: TINK_PROVIDER,
    provider_transaction_id: txn.id,
    amount_cents: amountCents,
    currency,
    date: txn.dates?.booked || txn.dates?.value || new Date().toISOString().slice(0, 10),
    type: isIncome ? "income" : "expense" as const,
    category: normalizedCategory,
    raw_text: description,
    source: txn.merchantName || null,
    raw_provider_payload: txn,
    is_recurring: false,
    recurrence_rule: null,
    household_id: null,
    contact_id: null,
    normalized_amount_cents: amountCents,
    base_currency: currency,
    fx_rate: 1,
  };
}
