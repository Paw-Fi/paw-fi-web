import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Define types for subscription data
interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
  next_payment_date: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  bound_to_user_id?: string | null;
  bound_to_household_id?: string | null;
  created_at: string;
  updated_at: string;
  days_until_next_payment: number | null;
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
  subscription: Subscription | null;
  features: Feature[];
  payment_method: PaymentMethod | null;
  invoices: Invoice[];
  days_until_next_payment: number | null;
}

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
}: {
  userId: string;
  action: string;
  plan?: string;
  billingInterval?: string;
}) => {
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

    return data;
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
    queryKey: ["subscription", userId],
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
    mutate: mutateSubscription,
    isPending: isMutating,
    error: mutationError,
  } = useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => {
      // Invalidate and refetch subscription data after successful update
      queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
    },
    onError: (error: Error) => {
      console.error("Subscription update error:", error);
      // Error will be handled in the component
    },
  });

  // Helper functions for subscription actions
  const cancelSubscription = async () => {
    if (!userId) return;
    return mutateSubscription({
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
    return mutateSubscription({
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

  // Check if user's subscription is expired
  const isExpired = subscriptionData && subscriptionData.status === "canceled";

  // Check if user has an active subscription
  const isActive =
    subscriptionData && subscriptionData.plan !== "free" && !isExpired;

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
