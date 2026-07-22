export interface SubscriptionEntitlementSnapshot {
  provider?: string | null;
  plan?: string | null;
  status?: string | null;
  stripeSubscriptionId?: string | null;
  appStoreOriginalTransactionId?: string | null;
}

export interface IncomingProviderEntitlement {
  provider: "stripe" | "app_store" | "play_store";
  plan: string;
  status: string;
  stripeSubscriptionId?: string | null;
  appStoreOriginalTransactionId?: string | null;
  allowProviderSwitch?: boolean;
}

export type SubscriptionEntitlementDecision =
  | { kind: "apply" }
  | {
    kind: "preserve";
    reason:
      | "active_lifetime_has_priority"
      | "access_event_from_non_current_provider"
      | "access_event_for_non_current_purchase"
      | "terminal_event_from_non_current_provider"
      | "terminal_event_for_non_current_purchase";
  };

const TERMINAL_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
  "unpaid",
]);

/**
 * Decides whether a provider lifecycle event may replace the effective
 * entitlement row. This policy deliberately treats terminal events more
 * strictly than access-granting events: a cancellation may only cancel the
 * provider purchase that currently owns the row.
 *
 * Active Lifetime is globally dominant. It can only be revoked through the
 * source-verified lifetime revocation RPC, never through this generic path.
 */
export function decideSubscriptionEntitlementMutation(
  existing: SubscriptionEntitlementSnapshot | null | undefined,
  incoming: IncomingProviderEntitlement,
): SubscriptionEntitlementDecision {
  if (!existing) return { kind: "apply" };

  if (existing.plan === "lifetime" && existing.status === "active") {
    return { kind: "preserve", reason: "active_lifetime_has_priority" };
  }

  const isDifferentStripePurchase = existing.provider === "stripe" &&
    incoming.provider === "stripe" &&
    Boolean(existing.stripeSubscriptionId) &&
    Boolean(incoming.stripeSubscriptionId) &&
    existing.stripeSubscriptionId !== incoming.stripeSubscriptionId;
  const isDifferentAppStorePurchase = existing.provider === "app_store" &&
    incoming.provider === "app_store" &&
    Boolean(existing.appStoreOriginalTransactionId) &&
    Boolean(incoming.appStoreOriginalTransactionId) &&
    existing.appStoreOriginalTransactionId !==
      incoming.appStoreOriginalTransactionId;

  if (
    incoming.allowProviderSwitch !== true &&
    (isDifferentStripePurchase || isDifferentAppStorePurchase)
  ) {
    return {
      kind: "preserve",
      reason: TERMINAL_STATUSES.has(incoming.status)
        ? "terminal_event_for_non_current_purchase"
        : "access_event_for_non_current_purchase",
    };
  }

  if (!TERMINAL_STATUSES.has(incoming.status)) {
    const existingHasPaidAccess = existing.plan !== "free" &&
      (existing.status === "active" ||
        existing.status === "trialing" ||
        existing.status === "past_due");
    if (
      existingHasPaidAccess &&
      existing.provider !== incoming.provider &&
      incoming.allowProviderSwitch !== true
    ) {
      return {
        kind: "preserve",
        reason: "access_event_from_non_current_provider",
      };
    }
    return { kind: "apply" };
  }

  if (existing.provider !== incoming.provider) {
    return {
      kind: "preserve",
      reason: "terminal_event_from_non_current_provider",
    };
  }

  return { kind: "apply" };
}
