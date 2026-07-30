export const PRICING_URL = "https://www.moneko.io/pricing";

export type PlusEntitlementSubscription = {
  plan?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | Date | null;
  current_period_end?: string | Date | null;
};

function normalize(value?: string | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function isFutureDate(value?: string | Date | null): boolean {
  if (value == null) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

export function hasPlusEntitlement(
  subscription?: PlusEntitlementSubscription | null,
): boolean {
  if (!subscription) return false;

  const plan = normalize(subscription.plan) || "free";
  if (plan === "free") return false;

  const status = normalize(subscription.status);
  if (plan === "lifetime" && status === "active") return true;

  if (status !== "trialing" && status !== "active" && status !== "past_due") {
    return false;
  }

  return isFutureDate(
    subscription.currentPeriodEnd ?? subscription.current_period_end ?? null,
  );
}

export function isSubscriptionRequired(
  subscription?: PlusEntitlementSubscription | null,
): boolean {
  return !hasPlusEntitlement(subscription);
}

export function buildSubscriptionRequiredMessage(feature: string): string {
  return `To use ${feature}, you'll need an active Moneko Plus plan. If your trial or subscription has ended, you can continue here: ${PRICING_URL}`;
}

export function jsonSubscriptionRequired(feature: string): {
  success: false;
  error: string;
  code: "SUBSCRIPTION_REQUIRED";
  pricingUrl: string;
} {
  return {
    success: false,
    error: buildSubscriptionRequiredMessage(feature),
    code: "SUBSCRIPTION_REQUIRED",
    pricingUrl: PRICING_URL,
  };
}

export async function loadLatestSubscriptionForUser(
  supabase: any,
  userId: string,
): Promise<PlusEntitlementSubscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
      plan: data.plan,
      status: data.status,
      currentPeriodEnd: data.current_period_end,
    }
    : null;
}
