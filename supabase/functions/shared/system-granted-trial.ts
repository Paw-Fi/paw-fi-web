export type SystemGrantedTrialSubscription = {
  provider?: string | null;
  plan?: string | null;
  status?: string | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  store_product_id?: string | null;
  bound_to_user_id?: string | null;
  bound_to_household_id?: string | null;
};

function hasIdentifier(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Identifies the seven-day Plus trial granted by Moneko itself.
 *
 * The exact persisted identity is the source of truth. Earlier automatic
 * trials predate the durable user marker, so requiring that marker would
 * incorrectly classify those users as Stripe-managed. The identifier checks
 * keep genuine Stripe purchases and household grants fail-closed.
 */
export function isSystemGrantedTrial(
  subscription: SystemGrantedTrialSubscription | null | undefined,
): boolean {
  return hasSystemGrantedTrialShape(subscription);
}

export function hasSystemGrantedTrialShape(
  subscription: SystemGrantedTrialSubscription | null | undefined,
): boolean {
  if (!subscription) return false;

  return (
    subscription.provider?.trim().toLowerCase() === "stripe" &&
    subscription.plan?.trim().toLowerCase() === "plus" &&
    subscription.status?.trim().toLowerCase() === "trialing" &&
    !hasIdentifier(subscription.stripe_subscription_id) &&
    !hasIdentifier(subscription.stripe_customer_id) &&
    !hasIdentifier(subscription.store_product_id) &&
    !hasIdentifier(subscription.bound_to_user_id) &&
    !hasIdentifier(subscription.bound_to_household_id)
  );
}
