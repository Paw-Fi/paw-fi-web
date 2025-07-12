import { supabase } from "@/lib/supabase";
import { useState } from "react";

interface SubscriptionFormData {
  email: string;
  firstName?: string;
  lastName?: string;
  interests?: string[];
  referralSource?: string;
  marketingConsent: boolean;
}

interface SubscriptionResponse {
  success: boolean;
  message: string;
  isNewSubscriber?: boolean;
}

export function useNewsletterSubscription() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const subscribeToNewsletter = async (formData: SubscriptionFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.functions.invoke('newsletter-subscription', {
        method: 'POST',
        body: formData
      });

      if (error) {
        throw new Error(error.message || 'Failed to subscribe. Please try again.');
      }

      setSuccess(data?.message || 'Successfully subscribed!');
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscribeToNewsletter,
    isLoading,
    error,
    success,
    clearStatus: () => {
      setError(null);
      setSuccess(null);
    }
  };
}
