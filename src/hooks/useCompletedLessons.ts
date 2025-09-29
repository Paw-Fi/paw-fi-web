import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getEdgeFunctionQueryConfig } from '@/lib/query-config';

interface CompletedLesson {
  id: string;
  lesson_id: string;
  created_at: string;
}

interface CompletedLessonsResponse {
  success: boolean;
  completed_lessons: CompletedLesson[];
}

export const useCompletedLessons = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['completed-lessons', userId],
    queryFn: async (): Promise<CompletedLesson[]> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase.functions.invoke('get-user-completed-lessons', {
        body: { userId }
      });

      if (error) {
        throw new Error(`Failed to fetch completed lessons: ${error.message}`);
      }

      const response = data as CompletedLessonsResponse;
      
      if (!response.success) {
        throw new Error('Failed to fetch completed lessons');
      }

      return response.completed_lessons || [];
    },
    enabled: !!userId,
    // More balanced stale time for better performance
    staleTime: 60 * 1000, // 1 minute (was 30 seconds)
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Refetch only when data is stale (more efficient than 'always')
    refetchOnMount: true, // Default behavior - only refetch if stale
    ...getEdgeFunctionQueryConfig(), // Optimized for Edge Function cold starts
  });
};