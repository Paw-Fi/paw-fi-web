function safeParseUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function sanitizeRedirectUrl(
  value: string | null,
  allowedHosts: Set<string>,
): string | null {
  const parsed = safeParseUrl(value);
  if (!parsed) return null;

  const isLocalHost = parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1";
  if (
    parsed.protocol !== "https:" &&
    !(isLocalHost && parsed.protocol === "http:")
  ) {
    return null;
  }
  if (!allowedHosts.has(parsed.hostname)) return null;

  // Preserve Stripe placeholders like {CHECKOUT_SESSION_ID}.
  return value;
}

function isLocalHostName(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function checkoutAllowedHosts(
  appUrl: string,
  options: { allowLocalhost?: boolean } = {},
): Set<string> {
  const configuredAppUrl = safeParseUrl(appUrl);
  const configuredHostname = configuredAppUrl?.hostname;
  return new Set(
    [
      configuredHostname &&
        (options.allowLocalhost || !isLocalHostName(configuredHostname))
        ? configuredHostname
        : null,
      "moneko.io",
      "www.moneko.io",
      ...(options.allowLocalhost ? ["localhost", "127.0.0.1"] : []),
    ].filter((host): host is string => Boolean(host)),
  );
}

export function checkoutBaseOrigin(
  appUrl: string,
  options: { allowLocalhost?: boolean } = {},
): string {
  const parsed = safeParseUrl(appUrl);
  if (parsed && (options.allowLocalhost || !isLocalHostName(parsed.hostname))) {
    return parsed.origin;
  }

  return "https://moneko.io";
}

export function buildCheckoutRedirectUrls({
  appUrl,
  successUrl,
  cancelUrl,
  allowLocalhost,
}: {
  appUrl: string;
  successUrl: string | null;
  cancelUrl: string | null;
  allowLocalhost?: boolean;
}): { successUrl: string; cancelUrl: string } {
  const baseOrigin = checkoutBaseOrigin(appUrl, { allowLocalhost });
  const allowedHosts = checkoutAllowedHosts(appUrl, { allowLocalhost });

  return {
    successUrl: sanitizeRedirectUrl(successUrl, allowedHosts) ||
      `${baseOrigin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: sanitizeRedirectUrl(cancelUrl, allowedHosts) ||
      `${baseOrigin}/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}`,
  };
}

export function buildCheckoutPageUrl(
  appUrl: string,
  params: Record<string, string>,
): string {
  const checkoutUrl = new URL("/checkout", checkoutBaseOrigin(appUrl));
  for (const [key, value] of Object.entries(params)) {
    checkoutUrl.searchParams.set(key, value);
  }
  return checkoutUrl.toString();
}
