import {
  Environment,
  GetTransactionHistoryVersion,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  Order,
  ProductType,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";

interface AppStoreStatusResponse {
  environment?: Environment | string;
  data?: Array<{
    lastTransactions?: Array<{
      status?: number;
      originalTransactionId?: string;
      signedTransactionInfo?: string;
      signedRenewalInfo?: string;
    }>;
  }>;
}

export interface AppStoreApiConfig {
  issuerId: string;
  keyId: string;
  bundleId: string;
  privateKey: string;
}

export interface AppStoreSubscriptionStatusLookup {
  status: number | null;
  originalTransactionId: string | null;
  transaction: JWSTransactionDecodedPayload | null;
  renewalInfo: JWSRenewalInfoDecodedPayload | null;
}

interface AppStoreApiRequestParams {
  config: AppStoreApiConfig;
  path: string;
  environment: Environment;
  query?: Record<string, string | string[] | undefined | null>;
  userAgent?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

const APP_STORE_API_TIMEOUT_MS = 8000;
const APP_STORE_HISTORY_MAX_PAGES = 3;
const APP_STORE_API_MAX_RETRIES = 2;
const APP_STORE_API_RETRY_BASE_DELAY_MS = 250;
const APP_STORE_RETRYABLE_ERROR_CODES = new Set([
  4040002, // AccountNotFoundRetryableError
  4040004, // AppNotFoundRetryableError
  4040006, // OriginalTransactionIdNotFoundRetryableError
  4290000, // RateLimitExceededError
  5000001, // GeneralInternalRetryableError
]);

let cachedImportedPrivateKeyPem: string | null = null;
let cachedImportedPrivateKey: CryptoKey | null = null;

export class AppStoreApiError extends Error {
  status: number;
  responseBody: string;
  path: string;

  constructor(params: { status: number; responseBody: string; path: string }) {
    super(
      `App Store API request failed (${params.status}) for ${params.path}: ${params.responseBody}`,
    );
    this.name = "AppStoreApiError";
    this.status = params.status;
    this.responseBody = params.responseBody;
    this.path = params.path;
  }
}

export function normalizeAppStorePrivateKey(value: string): string {
  if (!value) return "";

  let normalized = value.trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  normalized = normalized
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\n")
    .replace(/\r/g, "")
    .trim();

  const compactValue = normalized.replace(/\s+/g, "");

  if (!normalized.includes("-----BEGIN") && compactValue.length > 0) {
    const decodeCandidates = [
      normalized,
      compactValue,
      compactValue.replace(/-/g, "+").replace(/_/g, "/"),
    ];

    for (const candidate of decodeCandidates) {
      try {
        const decoded = atob(candidate);
        if (decoded.includes("-----BEGIN") && decoded.includes("PRIVATE KEY")) {
          normalized = decoded.trim();
          break;
        }
      } catch {
        // Try next candidate.
      }
    }
  }

  if (normalized.includes("-----BEGIN") && normalized.includes("-----END")) {
    normalized = normalized.replace(/\r/g, "");

    const beginMarker = normalized.includes("-----BEGIN PRIVATE KEY-----")
      ? "-----BEGIN PRIVATE KEY-----"
      : normalized.includes("-----BEGIN EC PRIVATE KEY-----")
      ? "-----BEGIN EC PRIVATE KEY-----"
      : null;

    const endMarker = normalized.includes("-----END PRIVATE KEY-----")
      ? "-----END PRIVATE KEY-----"
      : normalized.includes("-----END EC PRIVATE KEY-----")
      ? "-----END EC PRIVATE KEY-----"
      : null;

    if (beginMarker && endMarker) {
      const beginIndex = normalized.indexOf(beginMarker);
      const endIndex = normalized.indexOf(endMarker);
      const bodyStart = beginIndex + beginMarker.length;
      const bodyRaw = normalized.slice(bodyStart, endIndex).replace(/\s+/g, "");
      const bodyLines = bodyRaw.match(/.{1,64}/g)?.join("\n") ?? "";
      normalized = `${beginMarker}\n${bodyLines}\n${endMarker}`.trim();
    }
  }

  return normalized;
}

export function getValidatedAppStorePrivateKey(value: string): string {
  const normalized = normalizeAppStorePrivateKey(value);
  if (!normalized) {
    throw new Error("APPLE_APP_STORE_PRIVATE_KEY is empty after normalization");
  }

  if (normalized.includes("-----BEGIN EC PRIVATE KEY-----")) {
    throw new Error(
      "APPLE_APP_STORE_PRIVATE_KEY must be an unencrypted PKCS#8 PEM (.p8)",
    );
  }

  const hasBegin = normalized.includes("-----BEGIN") &&
    normalized.includes("PRIVATE KEY-----");
  const hasEnd = normalized.includes("-----END") &&
    normalized.includes("PRIVATE KEY-----");

  if (!hasBegin || !hasEnd) {
    throw new Error("APPLE_APP_STORE_PRIVATE_KEY is missing PEM markers");
  }

  return normalized;
}

export function isAppStoreServerApiConfigured(
  config: AppStoreApiConfig,
): boolean {
  return Boolean(
    config.issuerId && config.keyId && config.bundleId && config.privateKey,
  );
}

export function decodeJwsPayload<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format: expected 3 parts");
  }

  const payloadJson = base64UrlDecode(parts[1]);
  return JSON.parse(payloadJson) as T;
}

export async function createAppStoreBearerToken(
  config: AppStoreApiConfig,
): Promise<string> {
  const cryptoKey = await importApplePrivateKey(config.privateKey);
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: config.keyId,
    typ: "JWT",
  };
  const payload = {
    bid: config.bundleId,
    iss: config.issuerId,
    aud: "appstoreconnect-v1",
    iat: issuedAt,
    exp: issuedAt + 300,
  };

  const unsignedToken = `${
    base64UrlEncode(utf8Encode(JSON.stringify(header)))
  }.${
    base64UrlEncode(
      utf8Encode(JSON.stringify(payload)),
    )
  }`;

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      utf8Encode(unsignedToken),
    ),
  );

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

export async function makeAppStoreApiRequest<T>(
  params: AppStoreApiRequestParams,
): Promise<T> {
  const bearerToken = await createAppStoreBearerToken(params.config);
  const url = new URL(
    `${getAppStoreApiBaseUrl(params.environment)}${params.path}`,
  );

  for (const [key, rawValue] of Object.entries(params.query ?? {})) {
    if (rawValue == null) continue;
    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        url.searchParams.append(key, item);
      }
      continue;
    }
    url.searchParams.set(key, rawValue);
  }

  const maxRetries = Math.max(
    0,
    Math.min(params.maxRetries ?? APP_STORE_API_MAX_RETRIES, 4),
  );
  const retryBaseDelayMs = Math.max(
    0,
    params.retryBaseDelayMs ?? APP_STORE_API_RETRY_BASE_DELAY_MS,
  );

  for (let attempt = 0;; attempt += 1) {
    let response: Response;
    try {
      response = await (params.fetchImpl ?? fetch)(url.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(APP_STORE_API_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: "application/json",
          "User-Agent": params.userAgent ?? "moneko-app-store-api",
        },
      });
    } catch (error) {
      if (attempt >= maxRetries) throw error;

      const delayMs = calculateAppStoreRetryDelay(
        attempt,
        retryBaseDelayMs,
      );
      console.warn("[AppStoreApiRetry]", {
        path: params.path,
        environment: params.environment === Environment.SANDBOX
          ? "sandbox"
          : "production",
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        delayMs,
        reason: "network_error",
        errorName: error instanceof Error ? error.name : typeof error,
      });
      await waitForAppStoreRetry(delayMs);
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const responseText = await response.text().catch(() => "");
    const errorCode = parseAppStoreErrorCode(responseText);
    const retryable = isRetryableAppStoreApiResponse({
      status: response.status,
      errorCode,
    });

    if (retryable && attempt < maxRetries) {
      const retryAfterMs = parseRetryAfterMs(
        response.headers.get("retry-after"),
      );
      const delayMs = Math.max(
        retryAfterMs,
        calculateAppStoreRetryDelay(attempt, retryBaseDelayMs),
      );
      console.warn("[AppStoreApiRetry]", {
        path: params.path,
        environment: params.environment === Environment.SANDBOX
          ? "sandbox"
          : "production",
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        delayMs,
        reason: "retryable_response",
        status: response.status,
        errorCode,
      });
      await waitForAppStoreRetry(delayMs);
      continue;
    }

    throw new AppStoreApiError({
      status: response.status,
      responseBody: responseText,
      path: params.path,
    });
  }
}

function parseAppStoreErrorCode(responseBody: string): number | null {
  try {
    const decoded = JSON.parse(responseBody) as { errorCode?: unknown };
    const parsed = Number(decoded.errorCode);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRetryableAppStoreApiResponse(params: {
  status: number;
  errorCode: number | null;
}): boolean {
  if (
    params.errorCode !== null &&
    APP_STORE_RETRYABLE_ERROR_CODES.has(params.errorCode)
  ) {
    return true;
  }

  return params.status === 429 ||
    params.status === 502 ||
    params.status === 503 ||
    params.status === 504;
}

function calculateAppStoreRetryDelay(
  attempt: number,
  baseDelayMs: number,
): number {
  if (baseDelayMs === 0) return 0;
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelayMs;
  return Math.round(exponentialDelay + jitter);
}

function parseRetryAfterMs(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : Math.max(timestamp - Date.now(), 0);
}

function waitForAppStoreRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function fetchAppStoreTransactionByTransactionId(params: {
  config: AppStoreApiConfig;
  transactionId: string;
  environment: Environment;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}): Promise<JWSTransactionDecodedPayload | null> {
  const response = await makeAppStoreApiRequest<{
    signedTransactionInfo?: string;
  }>({
    config: params.config,
    path: `/inApps/v1/transactions/${params.transactionId}`,
    environment: params.environment,
    userAgent: "moneko-verify-iap-purchase",
    fetchImpl: params.fetchImpl,
    maxRetries: params.maxRetries,
    retryBaseDelayMs: params.retryBaseDelayMs,
  });
  const signedTransaction = asString(response?.signedTransactionInfo);
  if (!signedTransaction) return null;

  return decodeJwsPayload<JWSTransactionDecodedPayload>(signedTransaction);
}

export async function fetchLatestAppStoreTransactionByOriginalId(params: {
  config: AppStoreApiConfig;
  originalTransactionId: string;
  environment: Environment;
  revoked?: boolean;
  transactionId?: string | null;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}): Promise<JWSTransactionDecodedPayload | null> {
  const historyRequest = {
    sort: Order.DESCENDING,
    revoked: params.revoked ?? false,
    productTypes: [ProductType.AUTO_RENEWABLE, ProductType.NON_CONSUMABLE],
  };

  let revision: string | null = null;
  let pagesChecked = 0;

  do {
    pagesChecked += 1;
    if (pagesChecked > APP_STORE_HISTORY_MAX_PAGES) {
      throw new Error("App Store history lookup exceeded page budget");
    }

    const historyResponse: {
      signedTransactions?: string[];
      hasMore?: boolean;
      revision?: string | null;
    } = await makeAppStoreApiRequest<{
      signedTransactions?: string[];
      hasMore?: boolean;
      revision?: string | null;
    }>({
      config: params.config,
      path:
        `/inApps/${GetTransactionHistoryVersion.V2}/history/${params.originalTransactionId}`,
      environment: params.environment,
      query: {
        sort: historyRequest.sort,
        revoked: String(historyRequest.revoked),
        productType: historyRequest.productTypes,
        revision,
      },
      userAgent: "moneko-verify-iap-purchase",
      fetchImpl: params.fetchImpl,
      maxRetries: params.maxRetries,
      retryBaseDelayMs: params.retryBaseDelayMs,
    });

    const signedTransactions = historyResponse.signedTransactions ?? [];
    if (!params.transactionId) {
      const signedTransaction = signedTransactions[0];
      if (!signedTransaction) return null;
      return decodeJwsPayload<JWSTransactionDecodedPayload>(signedTransaction);
    }

    for (const signedTransaction of signedTransactions) {
      const decoded = decodeJwsPayload<JWSTransactionDecodedPayload>(
        signedTransaction,
      );
      if (decoded.transactionId === params.transactionId) {
        return decoded;
      }
    }

    if (!historyResponse.hasMore || !historyResponse.revision) {
      return null;
    }

    revision = historyResponse.revision;
  } while (true);
}

export async function fetchAppStoreTransactionHistoryByOriginalId(params: {
  config: AppStoreApiConfig;
  originalTransactionId: string;
  environment: Environment;
  revoked?: boolean;
  limit?: number;
  fetchImpl?: typeof fetch;
}): Promise<JWSTransactionDecodedPayload[]> {
  const maxItems = Math.max(1, Math.min(params.limit ?? 20, 100));
  const transactions: JWSTransactionDecodedPayload[] = [];
  let revision: string | null = null;
  let pagesChecked = 0;

  do {
    pagesChecked += 1;
    if (pagesChecked > APP_STORE_HISTORY_MAX_PAGES) {
      return transactions;
    }

    const historyResponse: {
      signedTransactions?: string[];
      hasMore?: boolean;
      revision?: string | null;
    } = await makeAppStoreApiRequest<{
      signedTransactions?: string[];
      hasMore?: boolean;
      revision?: string | null;
    }>({
      config: params.config,
      path:
        `/inApps/${GetTransactionHistoryVersion.V2}/history/${params.originalTransactionId}`,
      environment: params.environment,
      query: {
        sort: Order.DESCENDING,
        revoked: String(params.revoked ?? false),
        productType: [ProductType.AUTO_RENEWABLE, ProductType.NON_CONSUMABLE],
        revision,
      },
      userAgent: "moneko-creator-user-lookup",
      fetchImpl: params.fetchImpl,
    });

    for (const signedTransaction of historyResponse.signedTransactions ?? []) {
      transactions.push(
        decodeJwsPayload<JWSTransactionDecodedPayload>(signedTransaction),
      );

      if (transactions.length >= maxItems) {
        return transactions;
      }
    }

    if (!historyResponse.hasMore || !historyResponse.revision) {
      return transactions;
    }

    revision = historyResponse.revision;
  } while (true);
}

export async function fetchAppStoreSubscriptionStatusByTransactionId(params: {
  config: AppStoreApiConfig;
  transactionId: string;
  environment: Environment;
  originalTransactionId?: string | null;
  productId?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<AppStoreSubscriptionStatusLookup | null> {
  const response = await makeAppStoreApiRequest<AppStoreStatusResponse>({
    config: params.config,
    path: `/inApps/v1/subscriptions/${params.transactionId}`,
    environment: params.environment,
    userAgent: "moneko-verify-iap-purchase",
    fetchImpl: params.fetchImpl,
  });

  const candidates = (response.data ?? [])
    .flatMap((group) => group.lastTransactions ?? [])
    .map((item, index) => decodeSubscriptionStatusItem(item, index));

  let bestMatch: AppStoreSubscriptionStatusLookup | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = scoreSubscriptionStatusCandidate({
      candidate,
      transactionId: params.transactionId,
      originalTransactionId: params.originalTransactionId ?? null,
      productId: params.productId ?? null,
    });

    if (score > bestScore) {
      bestMatch = candidate;
      bestScore = score;
    }
  }

  if (bestScore <= 0) {
    return null;
  }

  return bestMatch;
}

export function matchesVerifiedAppStoreTransaction(params: {
  hint: Pick<
    JWSTransactionDecodedPayload,
    "transactionId" | "originalTransactionId" | "bundleId"
  >;
  verified: Pick<
    JWSTransactionDecodedPayload,
    "transactionId" | "originalTransactionId" | "bundleId"
  >;
}): boolean {
  if (!params.hint.transactionId || !params.verified.transactionId) {
    return false;
  }

  if (params.hint.transactionId !== params.verified.transactionId) {
    return false;
  }

  if (
    params.hint.originalTransactionId &&
    params.verified.originalTransactionId &&
    params.hint.originalTransactionId !== params.verified.originalTransactionId
  ) {
    return false;
  }

  if (
    params.hint.bundleId &&
    params.verified.bundleId &&
    params.hint.bundleId !== params.verified.bundleId
  ) {
    return false;
  }

  return true;
}

export function isAppStoreLookupNotFoundError(error: unknown): boolean {
  return error instanceof AppStoreApiError && error.status === 404;
}

export function isAppStoreRetryableApiError(
  error: unknown,
): error is AppStoreApiError {
  if (!(error instanceof AppStoreApiError)) return false;

  return isRetryableAppStoreApiResponse({
    status: error.status,
    errorCode: parseAppStoreErrorCode(error.responseBody),
  });
}

export async function findAppStoreTransactionWithEnvironmentFallback(params: {
  config: AppStoreApiConfig;
  environmentHint: Environment;
  transactionId?: string | null;
  originalTransactionId?: string | null;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}): Promise<{
  transaction: JWSTransactionDecodedPayload | null;
  environment: Environment;
}> {
  const lookupInEnvironment = async (
    environment: Environment,
  ): Promise<JWSTransactionDecodedPayload | null> => {
    let transactionById: JWSTransactionDecodedPayload | null = null;

    if (params.transactionId) {
      try {
        transactionById = await fetchAppStoreTransactionByTransactionId({
          config: params.config,
          transactionId: params.transactionId,
          environment,
          fetchImpl: params.fetchImpl,
          maxRetries: params.maxRetries,
          retryBaseDelayMs: params.retryBaseDelayMs,
        });
      } catch (error) {
        if (
          !isAppStoreLookupNotFoundError(error) &&
          !isAppStoreRetryableApiError(error)
        ) {
          throw error;
        }
        if (isAppStoreRetryableApiError(error)) {
          console.warn("[AppStoreApiFallback]", {
            phase: "transaction_lookup_exhausted_trying_history",
            environment: environment === Environment.SANDBOX
              ? "sandbox"
              : "production",
            transactionId: params.transactionId,
            originalTransactionId: params.originalTransactionId ?? null,
            status: error.status,
            errorCode: parseAppStoreErrorCode(error.responseBody),
          });
        }
      }
    }

    if (transactionById) {
      return transactionById;
    }

    if (params.originalTransactionId) {
      try {
        return await fetchLatestAppStoreTransactionByOriginalId({
          config: params.config,
          originalTransactionId: params.originalTransactionId,
          environment,
          revoked: false,
          transactionId: params.transactionId,
          fetchImpl: params.fetchImpl,
          maxRetries: params.maxRetries,
          retryBaseDelayMs: params.retryBaseDelayMs,
        });
      } catch (error) {
        if (isAppStoreLookupNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    }

    return null;
  };

  const hintedTransaction = await lookupInEnvironment(params.environmentHint);
  if (hintedTransaction) {
    return {
      transaction: hintedTransaction,
      environment: params.environmentHint,
    };
  }

  const fallbackEnvironment = params.environmentHint === Environment.SANDBOX
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
  const fallbackTransaction = await lookupInEnvironment(fallbackEnvironment);

  return {
    transaction: fallbackTransaction,
    environment: fallbackTransaction
      ? fallbackEnvironment
      : params.environmentHint,
  };
}

export async function findAppStoreSubscriptionStatusWithEnvironmentFallback(
  params: {
    config: AppStoreApiConfig;
    environmentHint: Environment;
    transactionId: string;
    originalTransactionId?: string | null;
    productId?: string | null;
    fetchImpl?: typeof fetch;
  },
): Promise<{
  subscription: AppStoreSubscriptionStatusLookup | null;
  environment: Environment;
}> {
  const lookupInEnvironment = async (
    environment: Environment,
  ): Promise<AppStoreSubscriptionStatusLookup | null> => {
    try {
      return await fetchAppStoreSubscriptionStatusByTransactionId({
        config: params.config,
        transactionId: params.transactionId,
        environment,
        originalTransactionId: params.originalTransactionId,
        productId: params.productId,
        fetchImpl: params.fetchImpl,
      });
    } catch (error) {
      if (isAppStoreLookupNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  };

  const hintedSubscription = await lookupInEnvironment(params.environmentHint);
  if (hintedSubscription) {
    return {
      subscription: hintedSubscription,
      environment: params.environmentHint,
    };
  }

  const fallbackEnvironment = params.environmentHint === Environment.SANDBOX
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
  const fallbackSubscription = await lookupInEnvironment(fallbackEnvironment);

  return {
    subscription: fallbackSubscription,
    environment: fallbackSubscription
      ? fallbackEnvironment
      : params.environmentHint,
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function scoreSubscriptionStatusCandidate(params: {
  candidate: AppStoreSubscriptionStatusLookup;
  transactionId: string;
  originalTransactionId: string | null;
  productId: string | null;
}): number {
  let score = 0;

  if (params.candidate.transaction?.transactionId === params.transactionId) {
    score += 8;
  }

  if (
    params.originalTransactionId &&
    params.candidate.originalTransactionId === params.originalTransactionId
  ) {
    score += 10;
  }

  if (
    params.originalTransactionId &&
    params.candidate.transaction?.originalTransactionId ===
      params.originalTransactionId
  ) {
    score += 10;
  }

  if (params.productId && matchesSubscriptionProduct(params)) {
    score += 6;
  }

  return score;
}

function matchesSubscriptionProduct(params: {
  candidate: AppStoreSubscriptionStatusLookup;
  transactionId: string;
  originalTransactionId: string | null;
  productId: string | null;
}): boolean {
  if (!params.productId) return false;

  return [
    params.candidate.transaction?.productId,
    asString(params.candidate.renewalInfo?.productId),
    asString(params.candidate.renewalInfo?.autoRenewProductId),
  ].includes(params.productId);
}

function decodeSubscriptionStatusItem(
  item: NonNullable<
    NonNullable<AppStoreStatusResponse["data"]>[number]["lastTransactions"]
  >[number],
  index: number,
): AppStoreSubscriptionStatusLookup {
  try {
    const transaction = item.signedTransactionInfo
      ? decodeJwsPayload<JWSTransactionDecodedPayload>(
        item.signedTransactionInfo,
      )
      : null;
    const renewalInfo = item.signedRenewalInfo
      ? decodeJwsPayload<JWSRenewalInfoDecodedPayload>(item.signedRenewalInfo)
      : null;

    return {
      status: typeof item.status === "number" ? item.status : null,
      originalTransactionId: asString(item.originalTransactionId) ??
        asString(transaction?.originalTransactionId),
      transaction,
      renewalInfo,
    } satisfies AppStoreSubscriptionStatusLookup;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to decode App Store subscription status item ${index}: ${message}; status=${
        item.status ?? "null"
      }; originalTransactionId=${
        item.originalTransactionId ?? "null"
      }; hasSignedTransactionInfo=${
        Boolean(item.signedTransactionInfo)
      }; hasSignedRenewalInfo=${Boolean(item.signedRenewalInfo)}`,
    );
  }
}

function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  return atob(base64);
}

function getAppStoreApiBaseUrl(environment: Environment): string {
  return environment === Environment.SANDBOX
    ? "https://api.storekit-sandbox.itunes.apple.com"
    : "https://api.storekit.itunes.apple.com";
}

function utf8Encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getPkcs8BodyFromPem(privateKey: string): Uint8Array {
  const match = privateKey.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/,
  );

  if (!match?.[1]) {
    throw new Error(
      "APPLE_APP_STORE_PRIVATE_KEY must be an unencrypted PKCS#8 PEM (.p8)",
    );
  }

  const body = match[1].replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

async function importApplePrivateKey(privateKey: string): Promise<CryptoKey> {
  try {
    if (
      cachedImportedPrivateKey &&
      cachedImportedPrivateKeyPem === privateKey
    ) {
      return cachedImportedPrivateKey;
    }

    const importedKey = await crypto.subtle.importKey(
      "pkcs8",
      getPkcs8BodyFromPem(privateKey),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );

    cachedImportedPrivateKeyPem = privateKey;
    cachedImportedPrivateKey = importedKey;
    return importedKey;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `APPLE_APP_STORE_PRIVATE_KEY could not be imported as ES256 key: ${message}`,
    );
  }
}
