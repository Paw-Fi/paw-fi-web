import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

// Define types for subscription data
interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
  next_payment_date: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
  stripe_customer_id: string;
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
const fetchSubscription = async (userId: string | undefined): Promise<SubscriptionData> => {
  if (!userId) throw new Error("User ID is required");
  
  console.log('Fetching subscription for user ID:', userId);
  
  // For GET requests with Supabase Edge Functions, we need to construct the URL with query parameters
  // directly as a string to ensure they're properly passed
  const { data, error } = await supabase.functions.invoke(
    `get-subscription?userId=${encodeURIComponent(userId)}`,
    { method: 'GET' }
  );
  
  if (error) {
    console.error('Error fetching subscription:', error);
    throw new Error(`Failed to fetch subscription data: ${error.message}`);
  }
  
  console.log('Subscription data received:', data);
  return data as SubscriptionData;
};

// Mutation function for updating subscription
const updateSubscription = async ({ 
  userId, 
  action, 
  plan, 
  billingInterval 
}: { 
  userId: string; 
  action: string; 
  plan?: string; 
  billingInterval?: string 
}) => {
  const { data, error } = await supabase.functions.invoke('update-subscription', {
    method: 'POST',
    body: { userId, action, plan, billingInterval }
  });

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  return data;
};

export function useSubscription(userId: string | undefined) {
  const queryClient = useQueryClient();
  
  // Fetch subscription data
  const { 
    data, 
    error, 
    isLoading 
  } = useQuery<SubscriptionData>({ 
    queryKey: ['subscription', userId],
    queryFn: () => fetchSubscription(userId),
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Update subscription mutation
  const { mutate: mutateSubscription, isPending: isMutating } = useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => {
      // Invalidate and refetch subscription data after successful update
      queryClient.invalidateQueries({ queryKey: ['subscription', userId] });
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
  
  // The subscription data is in the first element of the array
  const subscriptionData = Array.isArray(data?.subscription) ? data?.subscription[0] : data?.subscription;


  // Check if user has an active subscription
  const isActive = subscriptionData && subscriptionData.status === "active";
  
  // Check if user's subscription is expired
  const isExpired = subscriptionData && subscriptionData.status === "canceled";
  
  
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
    isActive,
    isExpired,
  };
}
