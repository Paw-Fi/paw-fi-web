export async function runWithTimeout<T>(params: {
  operation: () => Promise<T>;
  timeoutMs: number;
  timeoutMessage: string;
}): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) =>
    timeoutId = setTimeout(
      () => reject(new Error(params.timeoutMessage)),
      params.timeoutMs,
    )
  );
  try {
    return await Promise.race([params.operation(), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
