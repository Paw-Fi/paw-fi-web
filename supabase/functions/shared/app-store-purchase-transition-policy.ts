export interface ExistingAppStoreEntitlement {
  provider?: string | null;
  plan?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
}

export type AppStorePurchaseTransitionDecision =
  | { kind: "apply" }
  | {
    kind: "preserve";
    reason:
      | "active_lifetime_includes_recurring_access"
      | "active_recurring_must_end_before_lifetime";
  };

const ACCESS_GRANTING_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Stops a direct App Store verification from replacing an entitlement with a
 * conflicting purchase. Subscription-to-subscription changes stay under
 * App Store subscription-group rules and are reconciled by the effective
 * transaction/notification; only recurring <-> Lifetime needs this guard.
 */
export function decideAppStorePurchaseTransition(
  existing: ExistingAppStoreEntitlement | null | undefined,
  incomingPlan: string,
  now = new Date(),
): AppStorePurchaseTransitionDecision {
  if (!existing || !hasCurrentAccess(existing, now)) return { kind: "apply" };

  if (existing.plan === "lifetime" && incomingPlan !== "lifetime") {
    return {
      kind: "preserve",
      reason: "active_lifetime_includes_recurring_access",
    };
  }

  if (
    existing.provider === "app_store" &&
    existing.plan !== "lifetime" &&
    incomingPlan === "lifetime"
  ) {
    return {
      kind: "preserve",
      reason: "active_recurring_must_end_before_lifetime",
    };
  }

  return { kind: "apply" };
}

function hasCurrentAccess(
  subscription: ExistingAppStoreEntitlement,
  now: Date,
): boolean {
  if (!ACCESS_GRANTING_STATUSES.has(subscription.status ?? "")) return false;
  if (subscription.plan === "lifetime") return true;

  if (!subscription.currentPeriodEnd) return true;
  const end = new Date(subscription.currentPeriodEnd);
  return Number.isNaN(end.getTime()) || end > now;
}
