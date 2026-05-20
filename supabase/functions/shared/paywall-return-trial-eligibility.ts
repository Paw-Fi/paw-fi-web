export type ExistingSubscriptionRow = {
  id?: string | null;
  status?: string | null;
  plan?: string | null;
  current_period_end?: string | null;
} | null;

export function canGrantPaywallReturnTrial(
  subscription: ExistingSubscriptionRow,
): boolean {
  return subscription == null;
}
