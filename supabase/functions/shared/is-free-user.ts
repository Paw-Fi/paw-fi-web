// Utility to determine whether a user should be treated as on the Free plan
// Considers webhook behavior:
// - Users are downgraded to plan === 'free' when subscription is deleted,
//   incomplete_expired, unpaid, or lifetime is refunded.
// - Paid/trialing users have plan !== 'free'.
// Therefore, FE/backend can treat missing subscription or plan === 'free' as Free access.

export type BasicSubscription = {
  plan?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | Date | null;
};

// Returns true when there is no subscription or plan === 'free'
export function isFreeUser(subscription?: BasicSubscription | null): boolean {
  if (!subscription) return true;
  if ((subscription.plan ?? "free") === "free") return true;

  const normalizedStatus = String(subscription.status ?? "").toLowerCase();
  const requiresValidPeriod =
    normalizedStatus === "trialing" || normalizedStatus === "active";

  if (requiresValidPeriod && subscription.currentPeriodEnd != null) {
    const periodEnd = new Date(subscription.currentPeriodEnd);
    if (
      !Number.isNaN(periodEnd.getTime()) &&
      periodEnd.getTime() <= Date.now()
    ) {
      return true;
    }
  }

  return false;
}

export default isFreeUser;
