export function merchantAutoResolutionValidationError(
  value: unknown,
): string | null {
  return value !== undefined && typeof value !== "boolean"
    ? "merchantAutoResolutionBlocked must be a boolean"
    : null;
}

export function merchantAutoResolutionPatch(
  value: unknown,
  userOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const error = merchantAutoResolutionValidationError(value);
  if (error) throw new TypeError(error);
  return value === true
    ? {
        merchant_id: null,
        merchant_structured_name: null,
        user_overrides: {
          ...userOverrides,
          merchant_auto_resolution_blocked: true,
        },
      }
    : {};
}

export function blockAnalyzedMerchantIdentity(
  item: Record<string, unknown>,
): Record<string, unknown> {
  const fields = [
    "merchantCountry",
    "merchant_id",
    "merchant_domain",
    "merchant_structured_name",
    "merchant_resolution_source",
    "merchant_candidates",
    "merchant_logo_url",
    "merchant_auto_resolution_blocked",
  ];
  return {
    ...Object.fromEntries(
      Object.entries(item).filter(([field]) => !fields.includes(field)),
    ),
    merchant_auto_resolution_blocked: true,
  };
}

export function analyzedMerchantSaveFields(item: Record<string, unknown>): {
  merchantId?: string;
  merchantStructuredName?: string;
  merchantAutoResolutionBlocked?: boolean;
} {
  if (item.merchant_auto_resolution_blocked === true)
    return { merchantAutoResolutionBlocked: true };
  return {
    ...(typeof item.merchant_id === "string"
      ? { merchantId: item.merchant_id }
      : {}),
    ...(typeof item.merchant_structured_name === "string"
      ? { merchantStructuredName: item.merchant_structured_name }
      : {}),
  };
}
