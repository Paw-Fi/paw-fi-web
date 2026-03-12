/**
 * useReferralCode Hook
 *
 * Fetches and manages the current user's referral code and acceptance data.
 * Uses React Query for caching and automatic refetching.
 */

import { supabase } from "@/lib/supabase";
import {
  UseReferralCodeState,
  GetReferralCodeResponse,
} from "@/types/referral.types";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch and manage user's referral code
 *
 * @param options - Hook configuration options
 * @param options.enabled - Whether to run the query (default: true)
 * @returns {UseReferralCodeState} Referral code data and loading state
 */
export function useReferralCode(options?: {
  enabled?: boolean;
}): UseReferralCodeState {
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["referral-code"],
    queryFn: async (): Promise<GetReferralCodeResponse> => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 30000),
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const invokePromise = supabase.functions.invoke<GetReferralCodeResponse>(
        "get-referral-code",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          method: "GET",
        },
      );

      const { data, error: invokeError } = await Promise.race([
        invokePromise,
        timeoutPromise,
      ]);

      if (invokeError) {
        throw new Error(invokeError.message || "Failed to fetch referral code");
      }

      if (!data) {
        throw new Error("Failed to fetch referral code");
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: options?.enabled !== false, // Default to true
  });

  const refetch = async () => {
    await queryRefetch();
  };

  return {
    code: data?.code ?? null,
    createdAt: data?.createdAt ?? null,
    acceptanceCount: data?.acceptanceCount ?? 0,
    completedCount: data?.completedCount ?? 0,
    acceptedBy: data?.acceptedBy ?? [],
    trialStart: data?.trialStart ?? null,
    trialEnd: data?.trialEnd ?? null,
    isTrialing: data?.isTrialing ?? false,
    trialEligible: data?.trialEligible ?? false,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
