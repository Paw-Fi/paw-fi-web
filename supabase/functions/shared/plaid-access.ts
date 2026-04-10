import { getPlaidConfig } from "./plaid-client.ts";
import { derivePlaidLinkProducts } from "./plaid-lifecycle.ts";

export interface PlaidUserAccessState {
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
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
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const plan = data?.plan ?? null;
  const subscriptionStatus = data?.status ?? null;
  const currentPeriodEnd = data?.current_period_end ?? null;
  const currentPeriodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const currentPeriodActive = currentPeriodEndDate != null &&
    !Number.isNaN(currentPeriodEndDate.getTime()) &&
    currentPeriodEndDate.getTime() > now.getTime();

  const isTrialingUser = subscriptionStatus === "trialing" && currentPeriodActive;
  const isConvertedPaidUser = subscriptionStatus === "active" && plan != null &&
    plan !== "free";

  const products = derivePlaidLinkProducts(getPlaidConfig().products, {
    isConvertedPaidUser,
    enableRecurringTransactionsProduct:
      Deno.env.get("PLAID_ENABLE_RECURRING_FOR_PAID")?.toLowerCase() === "true",
  });

  return {
    plan,
    subscriptionStatus,
    currentPeriodEnd,
    isTrialingUser,
    isConvertedPaidUser,
    isRecurringTransactionsEnabled: products.includes("recurring_transactions"),
  };
}
