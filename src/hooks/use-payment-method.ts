import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

// Define types for payment method data
interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

// Fetcher function for payment methods
const fetchPaymentMethods = async (userId: string | undefined): Promise<{ payment_methods: PaymentMethod[] }> => {
  if (!userId) throw new Error("User ID is required");
  
  const { data, error } = await supabase.functions.invoke('manage-payment-method', {
    method: 'POST',
    body: { userId, action: 'list_payment_methods' }
  });
  
  if (error) {
    throw new Error(`Failed to fetch payment methods: ${error.message}`);
  }
  
  return data as { payment_methods: PaymentMethod[] };
};

// Mutation function for payment method operations
const managePaymentMethod = async ({ 
  userId, 
  action, 
  paymentMethodId 
}: { 
  userId: string; 
  action: string; 
  paymentMethodId?: string 
}) => {
  const { data, error } = await supabase.functions.invoke('manage-payment-method', {
    method: 'POST',
    body: { userId, action, paymentMethodId }
  });

  if (error) {
    throw new Error(`Failed to update payment method: ${error.message}`);
  }

  return data;
};

export function useManagePaymentMethod(userId: string | undefined) {
  const queryClient = useQueryClient();
  
  // Fetch payment methods
  const { data, error, isLoading } = useQuery<{ payment_methods: PaymentMethod[] }>({ 
    queryKey: ['paymentMethods', userId],
    queryFn: () => fetchPaymentMethods(userId),
    enabled: !!userId,
  });

  // Payment method mutation
  const { mutate, isPending: isMutating } = useMutation({
    mutationFn: managePaymentMethod,
    onSuccess: () => {
      // Invalidate and refetch payment methods after successful update
      queryClient.invalidateQueries({ queryKey: ['paymentMethods', userId] });
    },
  });

  // Helper functions for payment method actions
  const createSetupIntent = async () => {
    if (!userId) return { client_secret: null };
    const result = await mutate({
      userId,
      action: "create_setup_intent",
    });
    return result;
  };

  const updateDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!userId) return;
    return mutate({
      userId,
      action: "update_default_payment_method",
      paymentMethodId,
    });
  };

  const detachPaymentMethod = async (paymentMethodId: string) => {
    if (!userId) return;
    return mutate({
      userId,
      action: "detach_payment_method",
      paymentMethodId,
    });
  };

  const createPortalSession = async () => {
    if (!userId) return { url: null };
    const result = await mutate({
      userId,
      action: "create_portal_session",
    });
    return result;
  };

  return {
    paymentMethods: data?.payment_methods || [],
    isLoading,
    error,
    isMutating,
    createSetupIntent,
    updateDefaultPaymentMethod,
    detachPaymentMethod,
    createPortalSession,
  };
}
