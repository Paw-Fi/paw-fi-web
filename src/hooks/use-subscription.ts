import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Define types for subscription data
interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  next_payment_date: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  bound_to_user_id?: string | null;
  bound_to_household_id?: string | null;
  created_at: string;
  updated_at: string;
  days_until_next_payment: number | null;
  billing_interval?: string | null;
  pending_plan?: string | null;
  pending_interval?: string | null;
  pending_effective_date?: string | null;
}

interface Feature {
  feature: string;
  included: boolean;
  limit_value: number | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: string;
  hosted_invoice_url: string | null;
  pdf: string | null;
}

interface SubscriptionData {
  subscription: Subscription | Subscription[] | null;
  features: Feature[];
  payment_method: PaymentMethod | null;
  invoices: Invoice[];
  days_until_next_payment: number | null;
}

interface SubscriptionMutationVariables {
  userId: string;
  action: string;
  plan?: string;
  billingInterval?: string;
}

interface SubscriptionMutationResponse {
  success?: boolean;
  action?: string;
  subscription?: {
    status?: string;
    current_period_end?: number | null;
    cancel_at_period_end?: boolean;
  };
  pendingChange?: {
    plan: string;
    billingInterval: string;
    effectiveDate: string;
  };
}

const subscriptionQueryKey = (userId: string | undefined) => [
  "subscription",
  userId,
];

const normalizeSubscriptionData = (
  subscription: SubscriptionData["subscription"],
): Subscription | null => {
  return Array.isArray(subscription) ? subscription[0] || null : subscription;
};

const updateCachedSubscription = (
  current: SubscriptionData | undefined,
  updater: (subscription: Subscription | null) => Subscription | null,
): SubscriptionData | undefined => {
  if (!current) return current;

  const nextSubscription = updater(
    normalizeSubscriptionData(current.subscription),
  );

  return {
    ...current,
    subscription: Array.isArray(current.subscription)
      ? nextSubscription
        ? [nextSubscription]
        : []
      : nextSubscription,
  };
};

const unixSecondsToIso = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
};

const getDaysUntil = (dateIso: string | null) => {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(
    0,
    Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
};

// Fetcher function for subscription data
const fetchSubscription = async (
  userId: string | undefined,
): Promise<SubscriptionData> => {
  if (!userId) throw new Error("User ID is required");

  console.log("Fetching subscription for user ID:", userId);

  // For GET requests with Supabase Edge Functions, we need to construct the URL with query parameters
  // directly as a string to ensure they're properly passed
  const { data, error } = await supabase.functions.invoke(
    `get-subscription?userId=${encodeURIComponent(userId)}`,
    { method: "GET" },
  );

  if (error) {
    console.error("Error fetching subscription:", error);
    throw new Error(`Failed to fetch subscription data: ${error.message}`);
  }

  console.log("Subscription data received:", data);
  return data as SubscriptionData;
};

// Mutation function for previewing subscription change
const previewSubscriptionChange = async ({
  userId,
  newPlan,
  newBillingInterval,
}: {
  userId: string;
  newPlan: string;
  newBillingInterval: string;
}) => {
  try {
    const response = await supabase.functions.invoke(
      "preview-subscription-change",
      {
        method: "POST",
        body: { userId, newPlan, newBillingInterval },
      },
    );

    const { data, error } = response;

    // If there's a network/request error
    if (error) {
      // Try to get the error message from context or data
      let errorMessage =
        "Failed to preview subscription change. Please try again.";

      // The actual error message might be in the data even when there's an error
      if (data && typeof data === "object" && "error" in data) {
        errorMessage = data.error as string;
      } else if (
        error.message &&
        !error.message.includes("Edge Function returned")
      ) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }

    // Check if the response itself contains an error field
    if (data && typeof data === "object" && "error" in data) {
      throw new Error(data.error as string);
    }

    return data;
  } catch (err) {
    // Re-throw if it's already our custom error
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to preview subscription change. Please try again.");
  }
};

// Mutation function for updating subscription
const updateSubscription = async ({
  userId,
  action,
  plan,
  billingInterval,
}: SubscriptionMutationVariables): Promise<SubscriptionMutationResponse> => {
  try {
    const response = await supabase.functions.invoke("update-subscription", {
      method: "POST",
      body: { userId, action, plan, billingInterval },
    });

    const { data, error } = response;

    // If there's a network/request error
    if (error) {
      // Try to get the error message from context or data
      let errorMessage = "Failed to update subscription. Please try again.";

      // The actual error message might be in the data even when there's an error
      if (data && typeof data === "object" && "error" in data) {
        errorMessage = data.error as string;
      } else if (
        error.message &&
        !error.message.includes("Edge Function returned")
      ) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }

    // Check if the response itself contains an error field
    if (data && typeof data === "object" && "error" in data) {
      throw new Error(data.error as string);
    }

    return data as SubscriptionMutationResponse;
  } catch (err) {
    // Re-throw if it's already our custom error
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to update subscription. Please try again.");
  }
};

export function useSubscription(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch subscription data
  const { data, error, isLoading } = useQuery<SubscriptionData>({
    queryKey: subscriptionQueryKey(userId),
    queryFn: () => fetchSubscription(userId),
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Preview subscription change mutation
  const {
    mutate: mutatePreview,
    isPending: isPreviewLoading,
    data: previewData,
    reset: resetPreview,
    error: previewError,
  } = useMutation({
    mutationFn: previewSubscriptionChange,
    onError: (error: Error) => {
      console.error("Preview error:", error);
      // Error will be handled in the component
    },
  });

  // Update subscription mutation
  const {
    mutateAsync: mutateSubscription,
    isPending: isMutating,
    error: mutationError,
  } = useMutation({
    mutationFn: updateSubscription,
    onSuccess: async (response, variables) => {
      const queryKey = subscriptionQueryKey(variables.userId);

      queryClient.setQueryData<SubscriptionData>(queryKey, (current) => {
        if (variables.action === "change_plan") {
          if (response.pendingChange) {
            return updateCachedSubscription(current, (subscription) => {
              if (!subscription) return subscription;

              return {
                ...subscription,
                pending_plan: response.pendingChange?.plan ?? null,
                pending_interval:
                  response.pendingChange?.billingInterval ?? null,
                pending_effective_date:
                  response.pendingChange?.effectiveDate ?? null,
                updated_at: new Date().toISOString(),
              };
            });
          }

          if (response.success && variables.plan && variables.billingInterval) {
            return updateCachedSubscription(current, (subscription) => {
              if (!subscription) return subscription;

              const currentPeriodEnd =
                unixSecondsToIso(response.subscription?.current_period_end) ??
                subscription.current_period_end;

              return {
                ...subscription,
                plan: variables.plan!,
                billing_interval: variables.billingInterval!,
                status: response.subscription?.status ?? subscription.status,
                current_period_end: currentPeriodEnd,
                next_payment_date: currentPeriodEnd,
                days_until_next_payment: getDaysUntil(currentPeriodEnd),
                cancel_at_period_end:
                  response.subscription?.cancel_at_period_end ?? false,
                pending_plan: null,
                pending_interval: null,
                pending_effective_date: null,
                updated_at: new Date().toISOString(),
              };
            });
          }
        }

        if (variables.action === "cancel") {
          return updateCachedSubscription(current, (subscription) =>
            subscription
              ? {
                  ...subscription,
                  cancel_at_period_end: true,
                  updated_at: new Date().toISOString(),
                }
              : subscription,
          );
        }

        if (variables.action === "resume") {
          return updateCachedSubscription(current, (subscription) =>
            subscription
              ? {
                  ...subscription,
                  cancel_at_period_end: false,
                  updated_at: new Date().toISOString(),
                }
              : subscription,
          );
        }

        return current;
      });

      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      console.error("Subscription update error:", error);
      // Error will be handled in the component
    },
  });

  // Helper functions for subscription actions
  const cancelSubscription = async () => {
    if (!userId) return;
    await mutateSubscription({
      userId,
      action: "cancel",
    });
  };

  const cancelImmediately = async () => {
    if (!userId) return;
    return mutateSubscription({
      userId,
      action: "cancel_immediately",
    });
  };

  const resumeSubscription = async () => {
    if (!userId) return;
    return mutateSubscription({
      userId,
      action: "resume",
    });
  };

  const changePlan = async (plan: string, billingInterval: string) => {
    if (!userId) return;
    await mutateSubscription({
      userId,
      action: "change_plan",
      plan,
      billingInterval,
    });
  };

  const previewPlanChange = async (
    newPlan: string,
    newBillingInterval: string,
  ) => {
    if (!userId) return;
    return mutatePreview({
      userId,
      newPlan,
      newBillingInterval,
    });
  };

  // The subscription data is in the first element of the array
  const subscriptionData = Array.isArray(data?.subscription)
    ? data?.subscription[0]
    : data?.subscription;

  const subscriptionStatus = subscriptionData?.status?.toLowerCase() || "";
  const isExpired = Boolean(
    subscriptionData &&
      ["canceled", "incomplete_expired", "unpaid"].includes(subscriptionStatus),
  );

  // Check if user has an active subscription
  const isActive = Boolean(
    subscriptionData &&
      subscriptionData.plan !== "free" &&
      ["active", "trialing", "past_due"].includes(subscriptionStatus),
  );

  return {
    subscription: subscriptionData || null,
    features: data?.features || [],
    paymentMethod: data?.payment_method || null,
    invoices: data?.invoices || [],
    isLoading,
    error,
    isMutating,
    cancelSubscription,
    cancelImmediately,
    resumeSubscription,
    changePlan,
    previewPlanChange,
    isPreviewLoading,
    previewData,
    previewError,
    mutationError,
    resetPreview,
    isActive,
    isExpired,
  };
}
