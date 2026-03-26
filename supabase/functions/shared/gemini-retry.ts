interface GeminiRetryOptions {
  preRequestDelayMs?: number;
  maxRetries?: number;
  initialRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  jitterRatio?: number;
  logPrefix?: string;
  fallbackModelName?: string;
  fallbackChatFactory?: (
    modelName: string,
    history: any[],
  ) => { sendMessage: (content: unknown) => Promise<any> };
  onChatSwitched?: (
    chat: { sendMessage: (content: unknown) => Promise<any> },
    modelName: string,
  ) => void;
}

const DEFAULT_OPTIONS: Omit<
  Required<GeminiRetryOptions>,
  "fallbackModelName" | "fallbackChatFactory" | "onChatSwitched"
> = {
  preRequestDelayMs: 1200,
  maxRetries: 3,
  initialRetryDelayMs: 900,
  maxRetryDelayMs: 8000,
  jitterRatio: 0.25,
  logPrefix: "gemini",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const candidates: unknown[] = [
    (error as any).status,
    (error as any).statusCode,
    (error as any).code,
    (error as any)?.response?.status,
    (error as any)?.error?.code,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === "string" && /^\d{3}$/.test(value.trim())) {
      return Number(value.trim());
    }
  }

  return null;
}

function normalizeErrorText(error: unknown): string {
  if (!error) return "";

  if (typeof error === "string") return error.toLowerCase();

  if (error instanceof Error) {
    return `${error.name} ${error.message}`.toLowerCase();
  }

  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return String(error).toLowerCase();
  }
}

export function isRetryableGeminiError(error: unknown): boolean {
  const statusCode = extractStatusCode(error);
  if (statusCode != null) {
    if (statusCode === 408 || statusCode === 429) return true;
    if ([500, 502, 503, 504].includes(statusCode)) return true;
    return false;
  }

  const text = normalizeErrorText(error);
  if (!text) return false;

  const retryablePhrases = [
    "on demand",
    "try again later",
    "resource_exhausted",
    "quota",
    "rate limit",
    "temporarily unavailable",
    "unavailable",
    "overloaded",
    "deadline exceeded",
    "internal error",
    "service unavailable",
    "aborterror",
    "aborted",
    "signal has been aborted",
    "timeout",
    "timed out",
  ];

  return retryablePhrases.some((phrase) => text.includes(phrase));
}

export async function sendGeminiMessageWithRetry(
  chat: { sendMessage: (content: unknown) => Promise<any> },
  content: unknown,
  options: GeminiRetryOptions = {},
): Promise<any> {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (config.preRequestDelayMs > 0) {
    await sleep(config.preRequestDelayMs);
  }

  let activeChat = chat;
  let usedFallbackModel = false;

  let attempt = 0;
  for (;;) {
    try {
      return await activeChat.sendMessage(content);
    } catch (error) {
      const shouldRetry =
        attempt < config.maxRetries && isRetryableGeminiError(error);

      if (!shouldRetry) {
        const canFallback =
          !usedFallbackModel &&
          Boolean(config.fallbackModelName) &&
          Boolean(config.fallbackChatFactory) &&
          isRetryableGeminiError(error);

        if (canFallback) {
          let history: any[] = [];
          if (typeof (activeChat as any)?.getHistory === "function") {
            try {
              const loaded = await (activeChat as any).getHistory();
              if (!Array.isArray(loaded)) {
                throw new Error("Gemini chat history is not an array");
              }
              history = loaded;
            } catch {
              throw error;
            }
          }
          console.warn(
            `[${config.logPrefix}] switching Gemini model fallback`,
            {
              from: "primary",
              to: config.fallbackModelName,
              statusCode: extractStatusCode(error),
              error:
                error instanceof Error
                  ? `${error.name}: ${error.message}`
                  : String(error),
            },
          );
          activeChat = config.fallbackChatFactory!(
            config.fallbackModelName!,
            history,
          );
          usedFallbackModel = true;
          if (typeof config.onChatSwitched === "function") {
            config.onChatSwitched(activeChat, config.fallbackModelName!);
          }
          continue;
        }

        throw error;
      }

      const backoffBase = Math.min(
        config.initialRetryDelayMs * 2 ** attempt,
        config.maxRetryDelayMs,
      );
      const jitter = Math.floor(
        backoffBase * config.jitterRatio * Math.random(),
      );
      const delayMs = backoffBase + jitter;

      console.warn(`[${config.logPrefix}] retrying Gemini call`, {
        attempt: attempt + 1,
        nextDelayMs: delayMs,
        statusCode: extractStatusCode(error),
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
      });

      await sleep(delayMs);
      attempt += 1;
    }
  }
}
