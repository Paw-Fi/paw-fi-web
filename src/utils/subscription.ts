export interface SubscriptionPlanStatus {
  plan?: string | null;
  status?: string | null;
}

export function isSystemGrantedFreeTrialUser(
  subscription: SubscriptionPlanStatus | null | undefined,
) {
  return isSystemGrantedPlusTrial(subscription);
}

export function isSystemGrantedPlusTrial(
  subscription: SubscriptionPlanStatus | null | undefined,
) {
  return (
    subscription?.plan?.toLowerCase() === "plus" &&
    subscription?.status?.toLowerCase() === "trialing"
  );
}
