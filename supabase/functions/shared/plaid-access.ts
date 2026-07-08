import { getPlaidConfig } from "./plaid-client.ts";
import { derivePlaidLinkProducts } from "./plaid-lifecycle.ts";

export interface PlaidUserAccessState {
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  isTrialingUser: boolean;
  isConvertedPaidUser: boolean;
  isRecurringTransactionsEnabled: boolean;
}

export async function loadPlaidUserAccessState(
  supabase: {
    from: (table: string) => any;
  },
  userId: string,
  now: Date = new Date(),
): Promise<PlaidUserAccessState> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, trial_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const plan = data?.plan ?? null;
  const normalizedPlan = plan?.toLowerCase().trim() ?? null;
  const subscriptionStatus = data?.status ?? null;
  const currentPeriodEnd = data?.current_period_end ?? null;
  const trialEnd = data?.trial_end ?? null;
  const entitlementPeriodEnd = currentPeriodEnd ?? trialEnd;
  const currentPeriodEndDate = entitlementPeriodEnd
    ? new Date(entitlementPeriodEnd)
    : null;
  const currentPeriodActive =
    currentPeriodEndDate != null &&
    !Number.isNaN(currentPeriodEndDate.getTime()) &&
    currentPeriodEndDate.getTime() > now.getTime();

  const isTrialingUser =
    subscriptionStatus === "trialing" && currentPeriodActive;
  const isConvertedPaidUser =
    subscriptionStatus === "active" &&
    normalizedPlan != null &&
    normalizedPlan !== "free" &&
    (normalizedPlan === "lifetime" || currentPeriodActive);

  const products = derivePlaidLinkProducts(getPlaidConfig().products, {
    isConvertedPaidUser,
    enableRecurringTransactionsProduct:
      Deno.env.get("PLAID_ENABLE_RECURRING_FOR_PAID")?.toLowerCase() === "true",
  });

  return {
    plan,
    subscriptionStatus,
    currentPeriodEnd,
    trialEnd,
    isTrialingUser,
    isConvertedPaidUser,
    isRecurringTransactionsEnabled: products.includes("recurring_transactions"),
  };
}

export function canUsePlaidBankSync(
  accessState: Pick<
    PlaidUserAccessState,
    "isTrialingUser" | "isConvertedPaidUser"
  >,
): boolean {
  return accessState.isTrialingUser || accessState.isConvertedPaidUser;
}
