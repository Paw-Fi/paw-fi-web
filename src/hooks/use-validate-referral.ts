/**
 * useValidateReferral Hook
 *
 * Validates referral codes and retrieves referrer information.
 * Provides state management for validation flow.
 */

import { supabase } from "@/lib/supabase";
import {
  UseValidateReferralState,
  ReferrerInfo,
  ValidateReferralCodeResponse,
} from "@/types/referral.types";
import { useState, useCallback } from "react";

/**
 * Hook to validate referral codes
 *
 * @returns {UseValidateReferralState} Validation state and functions
 */
export function useValidateReferral(): UseValidateReferralState {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const validate = useCallback(
    async (code: string): Promise<ValidateReferralCodeResponse> => {
      setIsValidating(true);
      setError(null);

      console.log("[useValidateReferral] Starting validation for code:", code);

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 30000),
        );

        const invokePromise =
          supabase.functions.invoke<ValidateReferralCodeResponse>(
            "validate-referral-code",
            {
              body: { code },
            },
          );

        const { data, error: invokeError } = await Promise.race([
          invokePromise,
          timeoutPromise,
        ]);

        if (invokeError) {
          console.error(
            "[useValidateReferral] Edge function error:",
            invokeError,
          );
          throw new Error(
            invokeError.message || "Failed to validate referral code",
          );
        }

        if (!data) {
          throw new Error("Failed to validate referral code");
        }

        console.log("[useValidateReferral] Validation result:", data);

        setIsValid(data.valid);
        setReferrer(data.referrer ?? null);

        return data;
      } catch (err: any) {
        console.error(
          "[useValidateReferral] Error validating referral code:",
          err,
        );

        // Provide more specific error messages
        let errorMessage =
          "Failed to validate referral code. Please try again.";

        if (err.message === "Request timeout") {
          errorMessage =
            "Request timed out. Please check your network connection and try again.";
        } else if (
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("NetworkError")
        ) {
          errorMessage =
            "Cannot connect to the server. Please check your network connection and try again.";
        } else if (err.message) {
          errorMessage = err.message;
        }

        const errorObj = new Error(errorMessage);
        setError(errorObj);
        setIsValid(false);
        setReferrer(null);
        throw errorObj;
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setIsValid(null);
    setReferrer(null);
    setError(null);
  }, []);

  return {
    isValid,
    referrerInfo: referrer,
    isLoading: isValidating,
    error,
    validate,
    reset,
  };
}
