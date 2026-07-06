export const HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT = 5;

export function hasReachedHouseholdSubscriptionGrantLimit(
  grantedUserCount: number,
  isAlreadyGranted = false,
): boolean {
  return (
    !isAlreadyGranted && grantedUserCount >= HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT
  );
}
