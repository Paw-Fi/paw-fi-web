import { normalizeCategory } from "./category-colors.ts";
import { fetchWithRetry } from "./bank-retry.ts";

export const PLAID_PROVIDER = "plaid";

const BASE_URLS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

type PlaidEnv = keyof typeof BASE_URLS;

interface PlaidConfig {
  clientId: string;
  secret: string;
  env: PlaidEnv;
  baseUrl: string;
  products: string[];
  countryCodes: string[];
  clientName: string;
  redirectUri: string;
  androidPackageName: string;
  webhook?: string;
  linkCustomizationName?: string;
}

let cachedConfig: PlaidConfig | null = null;

export function getPlaidConfig(): PlaidConfig {
  if (cachedConfig) return cachedConfig;
  const redirectUri = "https://moneko.io/plaid/redirect";
  const androidPackageName = "com.moneko.mobile";
  const clientId = Deno.env.get("PLAID_CLIENT_ID")?.trim();
  const secret = Deno.env.get("PLAID_SECRET")?.trim();
  const env = (Deno.env.get("PLAID_ENV")?.trim()?.toLowerCase() || "sandbox") as PlaidEnv;
  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be configured");
  }
  const products = (Deno.env.get("PLAID_PRODUCTS") || "transactions")
    .split(",")
    .map((prod) => prod.trim())
    .filter(Boolean);
  const countryCodes = (Deno.env.get("PLAID_COUNTRY_CODES") || "US,CA")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  cachedConfig = {
    clientId,
    secret,
    env,
    baseUrl: BASE_URLS[env] || BASE_URLS.sandbox,
    products,
    countryCodes,
    clientName: Deno.env.get("PLAID_CLIENT_NAME")?.trim() || "Moneko",
    redirectUri,
    androidPackageName,
    webhook: Deno.env.get("PLAID_WEBHOOK_URL")?.trim() || undefined,
    linkCustomizationName: Deno.env.get("PLAID_LINK_CUSTOMIZATION_NAME")?.trim() || undefined,
  };
  return cachedConfig;
}

export class PlaidError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "PlaidError";
  }
}

async function plaidRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const config = getPlaidConfig();
  const response = await fetchWithRetry(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      client_id: config.clientId,
      secret: config.secret,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new PlaidError(
      payload?.error_message || `Plaid request failed: ${response.status}`,
      payload?.error_code,
      payload?.error_type,
      payload,
    );
  }
  return payload as T;
}

export interface CreateLinkTokenParams {
  userId: string;
  accessToken?: string;
  products?: string[];
  language?: string;
  countryCodes?: string[];
  transactionsDaysRequested?: number;
  platform?: "android" | "ios" | string;
}

export interface CreateLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export async function createPlaidLinkToken(
  params: CreateLinkTokenParams,
): Promise<CreateLinkTokenResponse> {
  const config = getPlaidConfig();
  const countryCodes = params.countryCodes && params.countryCodes.length > 0
    ? params.countryCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)
    : config.countryCodes;

  const platform = params.platform?.toLowerCase();
  const request: Record<string, unknown> = {
    user: { client_user_id: params.userId },
    client_name: config.clientName,
    country_codes: countryCodes,
    language: params.language || "en",
    products: params.products && params.products.length > 0 ? params.products : config.products,
  };

  if (platform === "android") {
    request.android_package_name = config.androidPackageName;
  } else {
    request.redirect_uri = config.redirectUri;
  }

  if (config.webhook) request.webhook = config.webhook;
  if (config.linkCustomizationName) request.link_customization_name = config.linkCustomizationName;
  if (params.accessToken) request.access_token = params.accessToken;
  if (typeof params.transactionsDaysRequested === "number") {
    request.transactions = { days_requested: params.transactionsDaysRequested };
  }

  return plaidRequest<CreateLinkTokenResponse>("/link/token/create", request);
}

export interface ExchangePublicTokenResponse {
  access_token: string;
  item_id: string;
}

export async function exchangePublicToken(publicToken: string): Promise<ExchangePublicTokenResponse> {
  return plaidRequest<ExchangePublicTokenResponse>("/item/public_token/exchange", {
    public_token: publicToken,
  });
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name?: string | null;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
  balances?: {
    iso_currency_code?: string | null;
    unofficial_currency_code?: string | null;
    current?: number | null;
  };
}

interface AccountsGetResponse {
  accounts: PlaidAccount[];
}

export async function getPlaidAccounts(accessToken: string): Promise<PlaidAccount[]> {
  const response = await plaidRequest<AccountsGetResponse>("/accounts/get", {
    access_token: accessToken,
  });
  return response.accounts || [];
}

export interface PlaidPersonalFinanceCategory {
  primary?: string;
  detailed?: string;
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  name: string;
  merchant_name?: string | null;
  amount: number;
  iso_currency_code?: string | null;
  unofficial_currency_code?: string | null;
  date: string;
  authorized_date?: string | null;
  pending?: boolean;
  pending_transaction_id?: string | null;
  payment_channel?: string | null;
  transaction_type?: string | null;
  personal_finance_category?: PlaidPersonalFinanceCategory;
  payment_meta?: {
    payment_method?: string | null;
    by_order_of?: string | null;
    payee?: string | null;
    payer?: string | null;
  };
}

interface PlaidSyncResponse {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  has_more: boolean;
  next_cursor: string;
}

export async function syncPlaidTransactions(
  accessToken: string,
  cursor?: string | null,
): Promise<PlaidSyncResponse> {
  return plaidRequest<PlaidSyncResponse>("/transactions/sync", {
    access_token: accessToken,
    cursor: cursor || undefined,
    options: { include_personal_finance_category: true },
  });
}

export interface ExpenseUpsertInput {
  user_id: string;
  bank_account_id: string;
  provider: string;
  provider_transaction_id: string;
  amount_cents: number;
  currency: string;
  date: string;
  type: "expense" | "income";
  category: string | null;
  raw_text: string | null;
  source: string | null;
  raw_provider_payload: unknown;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  household_id: string | null;
  contact_id: string | null;
  normalized_amount_cents: number;
  base_currency: string | null;
  fx_rate: number | null;
}

export interface MapPlaidTransactionInput {
  userId: string;
  bankAccountId: string;
  defaultCurrency?: string | null;
  transaction: PlaidTransaction;
}

type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom";

export function mapPlaidTransactionToExpense(
  params: MapPlaidTransactionInput,
): ExpenseUpsertInput {
  const txn = params.transaction;
  const categoryName = txn.personal_finance_category?.detailed
    || txn.personal_finance_category?.primary
    || null;
  const normalizedCategory = categoryName ? normalizeCategory(categoryName) : null;
  const currency = txn.iso_currency_code
    || txn.unofficial_currency_code
    || params.defaultCurrency
    || "USD";
  const amount = Number(txn.amount || 0);
  const absAmount = Math.abs(amount);
  const amountCents = Math.round(absAmount * 100);
  const personalPrimary = txn.personal_finance_category?.primary || "";
  const isIncome = amount < 0 || personalPrimary.toUpperCase() === "INCOME";
  const transactionType = isIncome ? "income" : "expense";
  const description = txn.merchant_name || txn.name;
  const { isRecurring, recurrenceRule } = detectRecurring(txn);

  return {
    user_id: params.userId,
    bank_account_id: params.bankAccountId,
    provider: PLAID_PROVIDER,
    provider_transaction_id: txn.transaction_id,
    amount_cents: amountCents,
    currency,
    date: txn.date || txn.authorized_date || new Date().toISOString().slice(0, 10),
    type: transactionType,
    category: normalizedCategory,
    raw_text: description,
    source: txn.merchant_name || txn.payment_meta?.payee || null,
    raw_provider_payload: txn,
    is_recurring: isRecurring,
    recurrence_rule: recurrenceRule,
    household_id: null,
    contact_id: null,
    normalized_amount_cents: amountCents,
    base_currency: currency,
    fx_rate: 1,
  };
}

function detectRecurring(transaction: PlaidTransaction): {
  isRecurring: boolean;
  recurrenceRule: Record<string, unknown> | null;
} {
  const detailed = transaction.personal_finance_category?.detailed?.toUpperCase() || "";
  const keywords = ["SUBSCRIPTION", "PAYROLL", "RENT", "MORTGAGE", "UTILITIES"];
  const description = `${transaction.name || ""} ${transaction.merchant_name || ""}`.toLowerCase();
  const keywordMatch = keywords.some((keyword) => detailed.includes(keyword));
  const nameMatch = description.includes("subscription") || description.includes("monthly");
  const isRecurring = Boolean(keywordMatch || nameMatch);
  if (!isRecurring) {
    return { isRecurring: false, recurrenceRule: null };
  }
  const frequency = guessFrequency(detailed);
  return {
    isRecurring: true,
    recurrenceRule: {
      frequency,
      anchor_date: transaction.date || transaction.authorized_date,
      provider_hint: {
        category: transaction.personal_finance_category,
      },
    },
  };
}

function guessFrequency(detailedCategory: string): RecurrenceFrequency {
  if (detailedCategory.includes("PAYROLL")) return "biweekly";
  if (detailedCategory.includes("RENT") || detailedCategory.includes("MORTGAGE") || detailedCategory.includes("SUBSCRIPTION")) {
    return "monthly";
  }
  return "monthly";
}
