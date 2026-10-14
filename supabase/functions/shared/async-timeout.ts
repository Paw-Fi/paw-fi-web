/** Internal request scope; never sourced from a transaction payload. */
export interface AnalysisExecutionOptions {
  deadlineAt?: number;
  signal?: AbortSignal;
}

export async function runWithTimeout<T>(params: {
  operation: (signal: AbortSignal) => Promise<T>;
  timeoutMs: number;
  timeoutMessage: string;
  signal?: AbortSignal;
}): Promise<T> {
  if (params.signal?.aborted) throw params.signal.reason;
  if (params.timeoutMs <= 0) throw new Error(params.timeoutMessage);
  const controller = new AbortController();
  let timeoutId: number | undefined;
  let onAbort: (() => void) | undefined;
  const timeout = new Promise<never>((_, reject) => {
    onAbort = () => {
      controller.abort(params.signal?.reason);
      reject(params.signal?.reason);
    };
    params.signal?.addEventListener("abort", onAbort, { once: true });
    timeoutId = setTimeout(() => {
      const error = new Error(params.timeoutMessage);
      controller.abort(error);
      reject(error);
    }, params.timeoutMs);
  });
  try {
    return await Promise.race([params.operation(controller.signal), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (onAbort) params.signal?.removeEventListener("abort", onAbort);
  }
}
