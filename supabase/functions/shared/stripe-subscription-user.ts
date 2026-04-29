export type StripeSubscriptionUserSource =
  | "customer_mapping"
  | "subscription_metadata";

export interface StripeSubscriptionUserCandidate {
  userId: string | null;
  source: StripeSubscriptionUserSource | null;
  metadataUserId: string | null;
  hasConflict: boolean;
}

export function resolveStripeSubscriptionUserCandidate(params: {
  mappedUserId: unknown;
  metadata: Record<string, unknown> | null | undefined;
}): StripeSubscriptionUserCandidate {
  const mappedUserId = isUuid(params.mappedUserId) ? params.mappedUserId : null;
  const metadataUserId = getStripeSubscriptionMetadataUserId(params.metadata);

  if (mappedUserId) {
    return {
      userId: mappedUserId,
      source: "customer_mapping",
      metadataUserId,
      hasConflict: metadataUserId !== null && metadataUserId !== mappedUserId,
    };
  }

  return {
    userId: metadataUserId,
    source: metadataUserId ? "subscription_metadata" : null,
    metadataUserId,
    hasConflict: false,
  };
}

export function getStripeSubscriptionMetadataUserId(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const rawUserId = metadata?.user_id ?? metadata?.userId;
  return isUuid(rawUserId) ? rawUserId : null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value)
  );
}
