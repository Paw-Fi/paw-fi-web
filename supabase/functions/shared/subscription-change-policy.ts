import { PLAN_HIERARCHY } from "./subscription-constants.ts";
import type { BillingInterval, PlanType } from "./subscription-constants.ts";

export type SubscriptionBillingBehavior =
  | "immediate"
  | "end_of_period"
  | "no_change";

export interface SubscriptionChangePolicy {
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSamePlan: boolean;
  isIntervalChange: boolean;
  billingBehavior: SubscriptionBillingBehavior;
}

export function getSubscriptionChangePolicy({
  currentPlan,
  newPlan,
  currentInterval,
  newInterval,
}: {
  currentPlan: PlanType;
  newPlan: PlanType;
  currentInterval?: BillingInterval | null;
  newInterval?: BillingInterval | null;
}): SubscriptionChangePolicy {
  const isUpgrade = PLAN_HIERARCHY[newPlan] > PLAN_HIERARCHY[currentPlan];
  const isDowngrade = PLAN_HIERARCHY[newPlan] < PLAN_HIERARCHY[currentPlan];
  const isSamePlan = newPlan === currentPlan;
  const isIntervalChange = Boolean(
    isSamePlan &&
      currentInterval &&
      newInterval &&
      currentInterval !== newInterval,
  );

  const billingBehavior: SubscriptionBillingBehavior = isDowngrade
    ? "end_of_period"
    : isUpgrade || isIntervalChange
    ? "immediate"
    : "no_change";

  return {
    isUpgrade,
    isDowngrade,
    isSamePlan,
    isIntervalChange,
    billingBehavior,
  };
}
