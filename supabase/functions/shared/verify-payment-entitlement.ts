import { BillingInterval, PlanType } from "./subscription-constants.ts";
import { resolveSubscriptionPlanFromPrice } from "./stripe-subscription-prices.ts";

export interface VerifiedPaymentSubscriptionSnapshot {
  provider: "stripe";
  plan: string;
  status: string;
  billing_interval: string | null;
  payment_interval?: string | null;
  commitment_months?: number | null;
  commitment_end?: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
}

export interface VerifiedPaymentResult {
  verified: boolean;
  message?: string;
  subscription?: VerifiedPaymentSubscriptionSnapshot;
}

export interface RecurringPaymentEntitlement {
  verified: true;
  plan: PlanType;
  billingInterval: BillingInterval;
}

export interface FailedPaymentEntitlement {
  verified: false;
  message: string;
}

interface StripeSubscriptionPriceSource {
  metadata?: Record<string, string | null | undefined> | null;
  items?: {
    data?: Array<
      {
        price?: {
          id?: string | null;
          recurring?: {
            interval?: string | null;
          } | null;
        } | null;
      } | null
    >;
  } | null;
}

const ENTITLEMENT_PENDING_MESSAGE =
  "Payment confirmed, entitlement pending. Please refresh in a moment.";

export function buildPaymentVerificationResult(params: {
  persistenceError: unknown;
  success: VerifiedPaymentResult;
}): VerifiedPaymentResult {
  if (params.persistenceError) {
    return {
      verified: false,
      message: ENTITLEMENT_PENDING_MESSAGE,
    };
  }

  return params.success;
}

export function resolveRecurringPaymentEntitlement(
  subscription: StripeSubscriptionPriceSource,
): RecurringPaymentEntitlement | FailedPaymentEntitlement {
  const pricePlanInfo = resolveSubscriptionPlanFromPrice(subscription);

  if (!pricePlanInfo || pricePlanInfo.plan === "lifetime") {
    return {
      verified: false,
      message: "Subscription price could not be verified",
    };
  }

  if (!pricePlanInfo.interval) {
    return {
      verified: false,
      message: "Subscription billing interval could not be verified",
    };
  }

  return {
    verified: true,
    plan: pricePlanInfo.plan,
    billingInterval: pricePlanInfo.interval,
  };
}
