interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryOnStatuses?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "retryOnStatuses">> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];
const TRANSIENT_NETWORK_ERROR_MARKERS = [
  "connection reset",
  "connection error",
  "sendrequest",
  "network error",
  "network request failed",
  "fetch failed",
  "timed out",
  "timeout",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, "retryOnStatuses">>,
): number {
  const baseDelay =
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * baseDelay;
  return Math.min(baseDelay + jitter, options.maxDelayMs);
}

function parseRetryAfterMs(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  const date = Date.parse(value);
  if (Number.isNaN(date)) return 0;
  return Math.max(date - Date.now(), 0);
}

export function isTransientBankNetworkError(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    String((error as { code?: unknown }).code || "").length > 0
  ) {
    return false;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object"
          ? [
              (error as { message?: unknown }).message,
              (error as { details?: unknown }).details,
            ]
              .filter((value): value is string => typeof value === "string")
              .join(" ")
          : "";
  const normalized = message.toLowerCase();
  return TRANSIENT_NETWORK_ERROR_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

/** Retries read-only Supabase operations after Edge-to-PostgREST transport failures. */
export async function withTransientBankReadRetry<T>(
  operation: () => Promise<T>,
  options: Pick<
    RetryOptions,
    "maxRetries" | "initialDelayMs" | "maxDelayMs" | "backoffMultiplier"
  > = {},
): Promise<T> {
  const resolvedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isTransientBankNetworkError(error) ||
        attempt > resolvedOptions.maxRetries
      ) {
        throw error;
      }
      await sleep(calculateDelay(attempt, resolvedOptions));
    }
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const resolvedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const retryStatuses = options.retryOnStatuses ?? DEFAULT_RETRY_STATUSES;
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= resolvedOptions.maxRetries + 1;
    attempt += 1
  ) {
    try {
      const response = await fetch(input, init);
      if (response.ok) return response;

      if (
        !retryStatuses.includes(response.status) ||
        attempt > resolvedOptions.maxRetries
      ) {
        return response;
      }

      const retryAfterMs = parseRetryAfterMs(
        response.headers.get("retry-after"),
      );
      const delay = Math.max(
        retryAfterMs,
        calculateDelay(attempt, resolvedOptions),
      );
      await sleep(delay);
      continue;
    } catch (error) {
      lastError = error;
      if (attempt > resolvedOptions.maxRetries) {
        throw error;
      }
      const delay = calculateDelay(attempt, resolvedOptions);
      await sleep(delay);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Failed to execute request after retries");
}
