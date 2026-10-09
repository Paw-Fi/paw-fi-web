export async function runWithTimeout<T>(params: {
  operation: (signal: AbortSignal) => Promise<T>;
  timeoutMs: number;
  timeoutMessage: string;
}): Promise<T> {
  if (params.timeoutMs <= 0) throw new Error(params.timeoutMessage);
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const timeout = new Promise<never>(
    (_, reject) =>
      (timeoutId = setTimeout(() => {
        const error = new Error(params.timeoutMessage);
        controller.abort(error);
        reject(error);
      }, params.timeoutMs)),
  );
  try {
    return await Promise.race([params.operation(controller.signal), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
