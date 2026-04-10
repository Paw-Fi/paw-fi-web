const PLAID_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

export function normalizePlaidCountryCode(
  value?: string | null,
): string | undefined {
  const normalizedValue = value?.trim().toUpperCase();
  if (!normalizedValue || !PLAID_COUNTRY_CODE_REGEX.test(normalizedValue)) {
    return undefined;
  }

  return normalizedValue;
}

export function resolvePlaidCountryCode(params: {
  requestedCountryCode?: string | null;
  connectionCountryCode?: string | null;
}): string | undefined {
  return (
    normalizePlaidCountryCode(params.connectionCountryCode) ||
    normalizePlaidCountryCode(params.requestedCountryCode)
  );
}
