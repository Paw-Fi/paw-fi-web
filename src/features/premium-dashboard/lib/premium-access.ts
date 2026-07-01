export interface SubscriptionAccessLike {
  plan?: string | null;
  status?: string | null;
}

const PREMIUM_PLANS = new Set(["plus", "premium", "lifetime"]);
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function hasPremiumDashboardAccess(
  subscription: SubscriptionAccessLike | null | undefined,
): boolean {
  if (!subscription?.plan || !subscription.status) return false;
  
  return (
    PREMIUM_PLANS.has(subscription.plan.toLowerCase()) &&
    ACTIVE_STATUSES.has(subscription.status.toLowerCase())
  );
}
