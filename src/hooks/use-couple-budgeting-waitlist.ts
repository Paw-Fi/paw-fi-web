import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCoupleBudgetingWaitlistCount,
  joinCoupleBudgetingWaitlist,
  checkUserCoupleBudgetingClaim,
  type CoupleBudgetingClaim,
  type CoupleBudgetingResponse
} from '@/lib/couple-budgeting-waitlist';

// Query keys
export const coupleBudgetingKeys = {
  all: ['couple-budgeting-waitlist'] as const,
  waitlistCount: () => [...coupleBudgetingKeys.all, 'waitlist-count'] as const,
  userClaimed: (userId: string) => [...coupleBudgetingKeys.all, 'user-claimed', userId] as const,
};

/**
 * Hook to get couple budgeting waitlist count with caching
 */
export function useCoupleBudgetingWaitlistCount() {
  return useQuery({
    queryKey: coupleBudgetingKeys.waitlistCount(),
    queryFn: getCoupleBudgetingWaitlistCount,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook to check if the current user has already joined the couple budgeting waitlist
 */
export function useCoupleBudgetingUserClaimed(userId?: string) {
  return useQuery({
    queryKey: coupleBudgetingKeys.userClaimed(userId || 'unauthenticated'),
    queryFn: checkUserCoupleBudgetingClaim,
    enabled: !!userId, // Only run query if userId is provided (user is authenticated)
    staleTime: 0, // Set to 0 to always fetch fresh data
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: 'always', // Always refetch on mount to get fresh database state
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once for faster failure
    retryDelay: 1000, // Wait 1 second before retry
    networkMode: 'online',
  });
}

/**
 * Hook to join the couple budgeting waitlist
 */
export function useJoinCoupleBudgetingWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claim: CoupleBudgetingClaim) => joinCoupleBudgetingWaitlist(claim),
    onSuccess: (data: CoupleBudgetingResponse, variables) => {
      // If the claim was successful and we got updated waitlist count
      if (data.success && data.waitlistCount !== undefined) {
        // Update the cached waitlist count
        queryClient.setQueryData(
          coupleBudgetingKeys.waitlistCount(),
          data.waitlistCount
        );

        // Update the user claimed status if we have userId
        if (variables.userId) {
          queryClient.setQueryData(
            coupleBudgetingKeys.userClaimed(variables.userId),
            true
          );
        }
      }

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: coupleBudgetingKeys.waitlistCount(),
      });

      // Invalidate user claimed queries for this user
      if (variables.userId) {
        queryClient.invalidateQueries({
          queryKey: coupleBudgetingKeys.userClaimed(variables.userId),
        });
      }
    },
    onError: (error) => {
      console.error('Failed to join couple budgeting waitlist:', error);
    },
  });
}
