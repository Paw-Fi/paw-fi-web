import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRemainingSpots, claimEarlyAccessSpot, checkUserHasClaimed, type EarlyAccessClaim, type EarlyAccessResponse } from '@/lib/early-access';

// Query keys
export const earlyAccessKeys = {
  all: ['early-access'] as const,
  remainingSpots: () => [...earlyAccessKeys.all, 'remaining-spots'] as const,
  userClaimed: (userId: string) => [...earlyAccessKeys.all, 'user-claimed', userId] as const,
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
 * Hook to check if the current user has already claimed a spot
 */
export function useUserHasClaimed(userId?: string) {
  return useQuery({
    queryKey: earlyAccessKeys.userClaimed(userId || 'unauthenticated'),
    queryFn: checkUserHasClaimed,
    enabled: !!userId, // Only run query if userId is provided (user is authenticated)
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false, // Prevent infinite loading on window focus (global refetchOnMount handles freshness)
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
    onSuccess: (data: EarlyAccessResponse, variables) => {
      // If the claim was successful and we got updated remaining spots
      if (data.success && data.remainingSpots !== undefined) {
        // Update the cached remaining spots data
        queryClient.setQueryData(
          earlyAccessKeys.remainingSpots(),
          data.remainingSpots
        );
        
        // Update the user claimed status if we have userId
        if (variables.userId) {
          queryClient.setQueryData(
            earlyAccessKeys.userClaimed(variables.userId),
            true
          );
        }
      }
      
      // Optionally invalidate to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: earlyAccessKeys.remainingSpots(),
      });
      
      // Invalidate user claimed queries for this user
      if (variables.userId) {
        queryClient.invalidateQueries({
          queryKey: earlyAccessKeys.userClaimed(variables.userId),
        });
      }
    },
    onError: (error) => {
      console.error('Failed to claim early access spot:', error);
    },
  });
}