/**
 * useAcceptReferral Hook
 *
 * Handles referral acceptance process including Stripe checkout redirect.
 * Manages acceptance state and error handling.
 */

import { supabase } from "@/lib/supabase";
import {
  UseAcceptReferralState,
  AcceptReferralResponse,
} from "@/types/referral.types";
import { useState, useCallback } from "react";

/**
 * Hook to accept referral invitations
 *
 * @returns {UseAcceptReferralState} Acceptance state and functions
 */
export function useAcceptReferral(): UseAcceptReferralState {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const accept = useCallback(
    async (code: string): Promise<AcceptReferralResponse> => {
      setIsAccepting(true);
      setError(null);

      console.log("[useAcceptReferral] Accepting referral for code:", code);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("You must be logged in to accept a referral");
        }

        const { data, error: invokeError } =
          await supabase.functions.invoke<AcceptReferralResponse>(
            "accept-referral",
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: { code },
            },
          );

        if (invokeError) {
          console.error(
            "[useAcceptReferral] Edge function error:",
            invokeError,
          );
          throw new Error(invokeError.message || "Failed to accept referral");
        }

        if (!data) {
          throw new Error("Failed to accept referral");
        }

        console.log("[useAcceptReferral] Accept result:", data);

        // Redirect to Stripe checkout if successful
        if (data.success && data.checkoutUrl) {
          console.log(
            "[useAcceptReferral] Redirecting to checkout:",
            data.checkoutUrl,
          );
          window.location.href = data.checkoutUrl;
        }

        return data;
      } catch (err: any) {
        console.error("[useAcceptReferral] Error accepting referral:", err);
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsAccepting(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading: isAccepting,
    error,
    accept,
    reset,
  };
}
