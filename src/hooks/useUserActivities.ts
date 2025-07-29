import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { Action } from '@/utils/reward-actions-clone';

// Import shared types from the activity logger
import type { ActivityRecord, ActivityData } from '../../supabase/functions/shared/activity-logger.ts';

// This is the UI-friendly activity interface that includes additional enriched data
export interface Activity {
  id: string;
  created_at: string;
  type: string;
  action: Action;
  source: string;
  goalId?: string;
  goalTitle?: string; // Enriched data for UI
  metadata: ActivityData['metadata'];
}

async function fetchUserActivities(userId: string): Promise<Activity[]> {
  const { data, error } = await supabase.functions.invoke(`user-activities?user_id=${userId}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error fetching user activities:', error);
    throw new Error(error.message);
  }

  if (!data || !data.activities) {
    throw new Error('No activities data received');
  }

  const rawActivities = data.activities as ActivityRecord[];

  // Extract unique goal IDs for fetching goal titles
  const goalIds = [...new Set(
    rawActivities
      .map(activity => activity.activity.metadata?.goalId)
      .filter(Boolean)
  )] as string[];

  let goalTitleMap = new Map<string, string>();

  // If there are goal-related activities, fetch their titles
  if (goalIds.length > 0) {
    const { data: goalsData, error: goalsError } = await supabase
      .from('financial_goals')
      .select('id, title')
      .in('id', goalIds);

    if (goalsError) {
      console.error('Error fetching goal titles:', goalsError);
      // Don't throw, just log the error and continue. The UI can handle missing titles.
    } else if (goalsData) {
      goalTitleMap = new Map(goalsData.map((g: { id: string; title: string }) => [g.id, g.title]));
    }
  }

  // Transform the raw activities into the structure the UI expects
  return rawActivities.map(raw => ({
    id: raw.id,
    created_at: raw.created_at,
    type: raw.activity.type,
    action: raw.activity.action as Action,
    source: raw.activity.source,
    goalId: raw.activity.metadata?.goalId,
    goalTitle: raw.activity.metadata?.goalId ? goalTitleMap.get(raw.activity.metadata.goalId) || 'Untitled Goal' : undefined,
    metadata: raw.activity.metadata,
  }));
}

export function useUserActivities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['user-activities', user?.id];

  const { data, isLoading, error, refetch } = useQuery<Activity[], Error>({
    queryKey,
    queryFn: () => fetchUserActivities(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-activities-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<ActivityRecord>) => {
          console.log('New activity detected, refetching activities:', payload);
          // Invalidate the query to trigger a refetch
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  return { 
    activities: data ?? [], 
    isLoading, 
    error, 
    refetch 
  };
}
