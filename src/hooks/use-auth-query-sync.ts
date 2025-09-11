import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';

/**
 * Hook to sync query invalidation with authentication state changes
 * This ensures data is refetched when user changes (login/logout)
 */
export function useAuthQuerySync() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null>(null);
  const isHydrated = useRef(false);

  useEffect(() => {
    // Don't run during initial loading or hydration
    if (isLoading) return;

    // Mark as hydrated after first successful load
    if (!isHydrated.current) {
      isHydrated.current = true;
      previousUserId.current = user?.id || null;
      return;
    }

    const currentUserId = user?.id || null;
    const userChanged = previousUserId.current !== currentUserId;

    if (userChanged) {
      // Invalidate user-dependent queries with precise array-based matching
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as (string | undefined)[];
          // Check the first element of the query key array for precise match
          const primaryKey = queryKey[0];
          return [
            'user',
            'user-profile',
            'dashboard',
            'courses',
            'lessons',
            'completed-lessons',
            'goals',
            'conversations',
            'activities',
            'chat-sessions'
          ].includes(primaryKey ?? '');
        }
      });

      // Clear all queries when user logs out for security
      if (!currentUserId && previousUserId.current) {
        queryClient.clear();
      }

      previousUserId.current = currentUserId;
    }
  }, [user?.id, isLoading, queryClient]);
}