export interface SubscriptionItem {
  plan: string;
  status: string;
  current_period_end?: string;
}

const PREMIUM_PLANS = new Set(["premium", "lifetime"]);
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function hasPremiumDashboardAccess(subscription: SubscriptionItem | null | undefined): boolean {
  if (!subscription) return false;
  
  return (
    PREMIUM_PLANS.has(subscription.plan.toLowerCase()) &&
    ACTIVE_STATUSES.has(subscription.status.toLowerCase())
  );
}
