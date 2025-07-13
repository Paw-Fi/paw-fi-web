import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRemainingSpots, claimEarlyAccessSpot, type EarlyAccessClaim, type EarlyAccessResponse } from '@/lib/early-access';

// Query keys
export const earlyAccessKeys = {
  all: ['early-access'] as const,
  remainingSpots: () => [...earlyAccessKeys.all, 'remaining-spots'] as const,
};

/**
 * Hook to get remaining early access spots with caching
 */
export function useRemainingSpots() {
  return useQuery({
    queryKey: earlyAccessKeys.remainingSpots(),
    queryFn: getRemainingSpots,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook to claim an early access spot
 */
export function useClaimEarlyAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (claim: EarlyAccessClaim) => claimEarlyAccessSpot(claim),
    onSuccess: (data: EarlyAccessResponse) => {
      // If the claim was successful and we got updated remaining spots
      if (data.success && data.remainingSpots !== undefined) {
        // Update the cached remaining spots data
        queryClient.setQueryData(
          earlyAccessKeys.remainingSpots(),
          data.remainingSpots
        );
      }
      
      // Optionally invalidate to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: earlyAccessKeys.remainingSpots(),
      });
    },
    onError: (error) => {
      console.error('Failed to claim early access spot:', error);
    },
  });
}