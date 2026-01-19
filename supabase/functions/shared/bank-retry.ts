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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, "retryOnStatuses">>): number {
  const baseDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
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

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const resolvedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const retryStatuses = options.retryOnStatuses ?? DEFAULT_RETRY_STATUSES;
  let lastError: unknown;

  for (let attempt = 1; attempt <= resolvedOptions.maxRetries + 1; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (response.ok) return response;

      if (!retryStatuses.includes(response.status) || attempt > resolvedOptions.maxRetries) {
        return response;
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      const delay = Math.max(retryAfterMs, calculateDelay(attempt, resolvedOptions));
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
