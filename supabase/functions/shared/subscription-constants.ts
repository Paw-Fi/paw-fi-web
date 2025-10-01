/**
 * Subscription Constants - Production Ready
 * 
 * Centralized constants for subscription management
 * Following Stripe best practices and API version 2023-10-16
 */

// Plan hierarchy for upgrade/downgrade detection
// NOTE: Premium plan is not yet available - remove from production until price IDs are configured
export const PLAN_HIERARCHY = {
  free: 0,
  plus: 1,
  // premium: 2, // DISABLED - Not yet available
} as const;

export type PlanType = keyof typeof PLAN_HIERARCHY;

// Billing intervals
export const BILLING_INTERVALS = {
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

export type BillingInterval = keyof typeof BILLING_INTERVALS;

// Subscription statuses from Stripe
export const SUBSCRIPTION_STATUS = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'incomplete_expired',
  unpaid: 'unpaid',
  paused: 'paused',
} as const;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS;

// Active subscription statuses that grant access
export const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

// Statuses that indicate subscription is in good standing
export const GOOD_STANDING_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];

// Trial period in days
export const TRIAL_PERIOD_DAYS = 30;

// Payment retry settings (for past_due subscriptions)
export const PAYMENT_RETRY_CONFIG = {
  maxRetries: 4,
  retryIntervalDays: [3, 5, 7, 7], // Days between retries
};

// Webhook event types we handle
export const HANDLED_WEBHOOK_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.finalized',
  'payment_method.attached',
  'payment_method.detached',
] as const;

export type HandledWebhookEvent = typeof HANDLED_WEBHOOK_EVENTS[number];

// Subscription change types for email notifications
export const CHANGE_TYPES = {
  created: 'created',
  upgraded: 'upgraded',
  downgraded: 'downgraded',
  renewal: 'renewal',
  canceled: 'canceled',
  interval_changed: 'interval_changed',
} as const;

export type ChangeType = keyof typeof CHANGE_TYPES;

/**
 * Determines if a plan change is an upgrade
 */
export function isUpgrade(fromPlan: PlanType, toPlan: PlanType): boolean {
  return PLAN_HIERARCHY[toPlan] > PLAN_HIERARCHY[fromPlan];
}

/**
 * Determines if a plan change is a downgrade
 */
export function isDowngrade(fromPlan: PlanType, toPlan: PlanType): boolean {
  return PLAN_HIERARCHY[toPlan] < PLAN_HIERARCHY[fromPlan];
}

/**
 * Determines the change type for subscription updates
 */
export function getChangeType(
  fromPlan: PlanType,
  toPlan: PlanType,
  fromInterval?: BillingInterval,
  toInterval?: BillingInterval
): ChangeType {
  if (fromPlan === 'free' && toPlan !== 'free') {
    return 'created';
  }
  
  if (toPlan === 'free') {
    return 'canceled';
  }
  
  if (fromPlan !== toPlan) {
    return isUpgrade(fromPlan, toPlan) ? 'upgraded' : 'downgraded';
  }
  
  if (fromInterval && toInterval && fromInterval !== toInterval) {
    return 'interval_changed';
  }
  
  return 'renewal';
}

/**
 * Check if subscription status grants access to features
 */
export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Check if subscription is in good standing (includes past_due for grace period)
 */
export function isInGoodStanding(status: SubscriptionStatus): boolean {
  return GOOD_STANDING_STATUSES.includes(status);
}

/**
 * Validate plan type
 */
export function isValidPlan(plan: string): plan is PlanType {
  return plan in PLAN_HIERARCHY;
}

/**
 * Validate billing interval
 */
export function isValidInterval(interval: string): interval is BillingInterval {
  return interval in BILLING_INTERVALS;
}

/**
 * Validate subscription status
 */
export function isValidStatus(status: string): status is SubscriptionStatus {
  return status in SUBSCRIPTION_STATUS;
}
