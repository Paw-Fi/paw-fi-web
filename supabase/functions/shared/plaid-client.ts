import { normalizeCategory } from "./category-colors.ts";
import {
  classifyPlaidTransaction,
  derivePlaidClassificationReview,
} from "./plaid-transaction-classification.ts";
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
  linkCustomizationName?: string;
}

let cachedConfig: PlaidConfig | null = null;
const MAX_TRANSACTIONS_DAYS_REQUESTED = 730;

export function getPlaidConfig(): PlaidConfig {
  if (cachedConfig) return cachedConfig;
  const redirectUri = "https://moneko.io/plaid/redirect";
  const androidPackageName = "com.moneko.mobile";
  const clientId = Deno.env.get("PLAID_CLIENT_ID")?.trim();
  const secret = Deno.env.get("PLAID_SECRET")?.trim();
  const env = (Deno.env.get("PLAID_ENV")?.trim()?.toLowerCase() ||
    "sandbox") as PlaidEnv;
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
    linkCustomizationName:
      Deno.env.get("PLAID_LINK_CUSTOMIZATION_NAME")?.trim() || undefined,
  };
  return cachedConfig;
}

function getDefaultPlaidWebhookUrl(): string | undefined {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!supabaseUrl) return undefined;
  const normalized = supabaseUrl.replace(/\/+$/, "");
  return `${normalized}/functions/v1/plaid-webhook`;
}

export class PlaidError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = "PlaidError";
  }
}

async function plaidRequest<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
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
      payload?.request_id,
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
  omitProducts?: boolean;
  omitTransactions?: boolean;
  update?: {
    accountSelectionEnabled?: boolean;
  };
}

export interface CreateLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id?: string;
}

export async function createPlaidLinkToken(
  params: CreateLinkTokenParams,
): Promise<CreateLinkTokenResponse> {
  const config = getPlaidConfig();
  const countryCodes =
    params.countryCodes && params.countryCodes.length > 0
      ? params.countryCodes
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean)
      : config.countryCodes;

  const platform = params.platform?.toLowerCase();
  const request: Record<string, unknown> = {
    user: { client_user_id: params.userId },
    client_name: config.clientName,
    country_codes: countryCodes,
    language: params.language || "en",
  };

  if (!params.omitProducts) {
    const products =
      params.products && params.products.length > 0
        ? params.products
        : config.products;
    request.products = products;
    if (!params.accessToken && products.includes("transactions")) {
      request.account_filters = {
        depository: { account_subtypes: ["all"] },
        credit: { account_subtypes: ["all"] },
        loan: { account_subtypes: ["mortgage", "student"] },
      };
    }
  }

  if (platform === "android") {
    request.android_package_name = config.androidPackageName;
  } else {
    request.redirect_uri = config.redirectUri;
  }

  const webhookUrl = getDefaultPlaidWebhookUrl();
  if (webhookUrl) request.webhook = webhookUrl;
  if (config.linkCustomizationName) {
    request.link_customization_name = config.linkCustomizationName;
  }
  if (params.accessToken) request.access_token = params.accessToken;
  if (params.update?.accountSelectionEnabled) {
    request.update = { account_selection_enabled: true };
  }
  const transactionsDaysRequested = normalizeTransactionsDaysRequested(
    params.transactionsDaysRequested,
  );
  if (!params.omitTransactions && transactionsDaysRequested != null) {
    request.transactions = { days_requested: transactionsDaysRequested };
  }

  return plaidRequest<CreateLinkTokenResponse>("/link/token/create", request);
}

function normalizeTransactionsDaysRequested(
  value?: number,
): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const roundedValue = Math.round(value!);
  if (roundedValue < 1) {
    return undefined;
  }

  return Math.min(roundedValue, MAX_TRANSACTIONS_DAYS_REQUESTED);
}

export interface ExchangePublicTokenResponse {
  access_token: string;
  item_id: string;
  request_id?: string;
}

export async function exchangePublicToken(
  publicToken: string,
): Promise<ExchangePublicTokenResponse> {
  return plaidRequest<ExchangePublicTokenResponse>(
    "/item/public_token/exchange",
    {
      public_token: publicToken,
    },
  );
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

export interface PlaidInstitution {
  institution_id: string;
  name: string;
  logo?: string | null;
  primary_color?: string | null;
  url?: string | null;
}

interface InstitutionGetByIdResponse {
  institution: PlaidInstitution;
  request_id?: string;
}

interface AccountsGetResponse {
  accounts: PlaidAccount[];
  request_id?: string;
}

export async function getPlaidAccounts(
  accessToken: string,
): Promise<PlaidAccount[]> {
  const response = await plaidRequest<AccountsGetResponse>("/accounts/get", {
    access_token: accessToken,
  });
  return response.accounts || [];
}

export async function getPlaidInstitutionById(params: {
  institutionId: string;
  countryCodes: string[];
}): Promise<PlaidInstitution> {
  const response = await plaidRequest<InstitutionGetByIdResponse>(
    "/institutions/get_by_id",
    {
      institution_id: params.institutionId,
      country_codes: params.countryCodes,
      options: { include_optional_metadata: true },
    },
  );
  return response.institution;
}

export interface PlaidPersonalFinanceCategory {
  primary?: string;
  detailed?: string;
  confidence_level?: string | null;
  version?: string | null;
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
  transaction_code?: string | null;
  personal_finance_category?: PlaidPersonalFinanceCategory;
  payment_meta?: {
    payment_method?: string | null;
    by_order_of?: string | null;
    payee?: string | null;
    payer?: string | null;
  };
}

export interface PlaidSyncResponse {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  has_more: boolean;
  next_cursor: string;
  request_id?: string;
}

interface PlaidTransactionsRefreshResponse {
  request_id: string;
}

interface PlaidItemRemoveResponse {
  removed: boolean;
  request_id: string;
}

export async function syncPlaidTransactions(
  accessToken: string,
  cursor?: string | null,
): Promise<PlaidSyncResponse> {
  return plaidRequest<PlaidSyncResponse>("/transactions/sync", {
    access_token: accessToken,
    cursor: cursor || undefined,
    count: 500,
    options: {
      include_personal_finance_category: true,
      personal_finance_category_version: "v2",
    },
  });
}

export async function requestPlaidTransactionsRefresh(
  accessToken: string,
): Promise<PlaidTransactionsRefreshResponse> {
  return plaidRequest<PlaidTransactionsRefreshResponse>(
    "/transactions/refresh",
    {
      access_token: accessToken,
    },
  );
}

export async function removePlaidItem(
  accessToken: string,
): Promise<PlaidItemRemoveResponse> {
  return plaidRequest<PlaidItemRemoveResponse>("/item/remove", {
    access_token: accessToken,
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
  merchant: string | null;
  source: string | null;
  raw_provider_payload: unknown;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  household_id: string | null;
  account_id?: string | null;
  contact_id: string | null;
  normalized_amount_cents: number;
  base_currency: string | null;
  fx_rate: number | null;
  provider_pfc_primary: string | null;
  provider_pfc_detailed: string | null;
  provider_pfc_confidence: string | null;
  provider_pfc_version: string | null;
  provider_transaction_code: string | null;
  provider_pending: boolean;
  analytics_class: string;
  analytics_direction: string;
  analytics_is_final: boolean;
  analytics_spending_multiplier: number;
  analytics_counts_toward_income: boolean;
  classification_source: string;
  classification_version: number;
  classification_review_state?: string;
  classification_review_reason?: string | null;
}

export interface MapPlaidTransactionInput {
  userId: string;
  bankAccountId: string;
  defaultCurrency?: string | null;
  accountType?: string | null;
  transaction: PlaidTransaction;
}

type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "custom";

export function mapPlaidTransactionToExpense(
  params: MapPlaidTransactionInput,
): ExpenseUpsertInput {
  const txn = params.transaction;
  const categoryName =
    txn.personal_finance_category?.detailed ||
    txn.personal_finance_category?.primary ||
    null;
  const normalizedCategory = categoryName
    ? normalizeCategory(categoryName)
    : null;
  const currency =
    txn.iso_currency_code ||
    txn.unofficial_currency_code ||
    params.defaultCurrency ||
    "USD";
  const amount = Number(txn.amount || 0);
  const absAmount = Math.abs(amount);
  const amountCents = Math.round(absAmount * 100);
  const personalPrimary = txn.personal_finance_category?.primary || "";
  const isIncome = amount < 0 || personalPrimary.toUpperCase() === "INCOME";
  const transactionType = isIncome ? "income" : "expense";
  const merchantLabel =
    txn.merchant_name ||
    txn.payment_meta?.payee ||
    txn.payment_meta?.payer ||
    null;
  const description = txn.name || txn.merchant_name || null;
  const { isRecurring, recurrenceRule } = detectRecurring(txn);
  const classification = classifyPlaidTransaction({
    amount,
    pending: txn.pending ?? false,
    pfcPrimary: txn.personal_finance_category?.primary,
    transactionCode: txn.transaction_code,
    accountType: params.accountType,
  });
  const classificationReview = derivePlaidClassificationReview(
    {
      pfcConfidence: txn.personal_finance_category?.confidence_level,
    },
    classification,
  );
  const effectiveClassification =
    classificationReview.reason === "low_provider_confidence"
      ? classifyPlaidTransaction({
          amount,
          pending: txn.pending ?? false,
          pfcPrimary: null,
          transactionCode: txn.transaction_code,
          accountType: params.accountType,
        })
      : classification;

  return {
    user_id: params.userId,
    bank_account_id: params.bankAccountId,
    provider: PLAID_PROVIDER,
    provider_transaction_id: txn.transaction_id,
    amount_cents: amountCents,
    currency,
    date:
      txn.date || txn.authorized_date || new Date().toISOString().slice(0, 10),
    type: transactionType,
    category: normalizedCategory,
    raw_text: description,
    merchant: merchantLabel || txn.name || null,
    source: merchantLabel || txn.name || null,
    raw_provider_payload: txn,
    is_recurring: isRecurring,
    recurrence_rule: recurrenceRule,
    household_id: null,
    contact_id: null,
    normalized_amount_cents: amountCents,
    base_currency: currency,
    fx_rate: 1,
    provider_pfc_primary:
      txn.personal_finance_category?.primary?.trim().toUpperCase() || null,
    provider_pfc_detailed:
      txn.personal_finance_category?.detailed?.trim().toUpperCase() || null,
    provider_pfc_confidence:
      txn.personal_finance_category?.confidence_level?.trim().toUpperCase() ||
      null,
    provider_pfc_version:
      txn.personal_finance_category?.version?.trim().toLowerCase() || "v2",
    provider_transaction_code:
      txn.transaction_code?.trim().toLowerCase() || null,
    provider_pending: txn.pending ?? false,
    analytics_class: effectiveClassification.analyticsClass,
    analytics_direction: effectiveClassification.direction,
    analytics_is_final: effectiveClassification.isFinal,
    analytics_spending_multiplier: effectiveClassification.spendingMultiplier,
    analytics_counts_toward_income: effectiveClassification.countsTowardIncome,
    classification_source: effectiveClassification.classificationSource,
    classification_version: 2,
    classification_review_state: classificationReview.state,
    classification_review_reason: classificationReview.reason,
  };
}

function detectRecurring(transaction: PlaidTransaction): {
  isRecurring: boolean;
  recurrenceRule: Record<string, unknown> | null;
} {
  const detailed =
    transaction.personal_finance_category?.detailed?.toUpperCase() || "";
  const keywords = ["SUBSCRIPTION", "PAYROLL", "RENT", "MORTGAGE", "UTILITIES"];
  const keywordMatch = keywords.some((keyword) => detailed.includes(keyword));
  const isRecurring = Boolean(keywordMatch);
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
  if (
    detailedCategory.includes("RENT") ||
    detailedCategory.includes("MORTGAGE") ||
    detailedCategory.includes("SUBSCRIPTION")
  ) {
    return "monthly";
  }
  return "monthly";
}
