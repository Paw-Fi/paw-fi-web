import {
  hasPlusEntitlement,
  type PlusEntitlementSubscription,
} from "./plus-entitlement.ts";

export const HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT = 5;

type HouseholdSubscriptionAccess = PlusEntitlementSubscription & {
  trialEnd?: string | Date | null;
  trial_end?: string | Date | null;
};

export function hasActiveHouseholdSubscriptionAccess(
  subscription?: HouseholdSubscriptionAccess | null,
): boolean {
  if (!subscription) return false;

  return hasPlusEntitlement({
    ...subscription,
    currentPeriodEnd: subscription.currentPeriodEnd ??
      subscription.current_period_end ??
      subscription.trialEnd ??
      subscription.trial_end ??
      null,
  });
}

export function hasReachedHouseholdSubscriptionGrantLimit(
  grantedUserCount: number,
  isAlreadyGranted = false,
): boolean {
  return (
    !isAlreadyGranted && grantedUserCount >= HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT
  );
}
