export type VerificationPersistenceResult = {
  error?: unknown;
};

export async function persistCheckoutSessionVerificationOrExpire({
  sessionId,
  persist,
  expire,
  reportError,
}: {
  sessionId: string;
  persist: () =>
    | PromiseLike<VerificationPersistenceResult>
    | VerificationPersistenceResult;
  expire: (sessionId: string) => Promise<unknown>;
  reportError: (phase: string, error: unknown) => void;
}): Promise<boolean> {
  try {
    const { error } = await persist();
    if (!error) return true;

    reportError("persist_verification_nonce", error);
  } catch (error) {
    reportError("persist_verification_nonce", error);
  }

  try {
    await expire(sessionId);
  } catch (error) {
    reportError("expire_unverified_checkout_session", error);
  }

  return false;
}

export function checkoutVerificationPersistenceErrorResponse(
  headers: HeadersInit,
): Response {
  return new Response(
    JSON.stringify({ error: "Failed to prepare checkout session" }),
    {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    },
  );
}

export function isEmailCheckoutAuthorized(
  headers: Headers,
  configuredToken: string | null | undefined,
): boolean {
  const token = configuredToken?.trim();
  if (!token) return false;
  return headers.get("x-checkout-token") === token;
}

export function unauthorizedEmailCheckoutResponse(
  headers: HeadersInit,
): Response {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
