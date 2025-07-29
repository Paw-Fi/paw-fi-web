import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { goalQueryKeys } from "./use-goals";
import type { 
  FinancialGoal, 
  GoalMilestone, 
  GoalInsight,
  UpdateGoalRequest,
  ProgressUpdateRequest
} from "@/components/goal-tracker/types";

// Fetch individual goal with full details
async function fetchGoalDetails(goalId: string, userId: string): Promise<{
  goal: FinancialGoal;
  milestones: GoalMilestone[];
  insights: GoalInsight[];
}> {
  if (!goalId || !userId) {
    throw new Error('Goal ID and User ID are required');
  }

  // Fetch goal with related data
  const { data: goal, error: goalError } = await supabase
    .from('financial_goals')
    .select(`
      *,
      goal_milestones (*),
      goal_insights (*)
    `)
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (goalError) {
    console.error('Error fetching goal details:', goalError);
    throw new Error(`Failed to fetch goal: ${goalError.message}`);
  }

  if (!goal) {
    throw new Error('Goal not found');
  }

  // Extract milestones and insights from the joined data
  const milestones = goal.goal_milestones || [];
  const insights = goal.goal_insights || [];

  // Sort milestones by display order and due date
  milestones.sort((a: GoalMilestone, b: GoalMilestone) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Sort insights by created date (newest first) and priority
  insights.sort((a: GoalInsight, b: GoalInsight) => {
    // Priority order: critical > high > medium > low
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = (priorityOrder[b.priority] || 0) - 
                        (priorityOrder[a.priority] || 0);
    
    if (priorityDiff !== 0) return priorityDiff;
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    goal: {
      ...goal,
      milestones: undefined, // Remove joined data from goal object
      goal_insights: undefined,
    } as FinancialGoal,
    milestones,
    insights,
  };
}

// Update goal progress
async function updateGoalProgress(request: ProgressUpdateRequest): Promise<any> {
  const { data, error } = await supabase.functions.invoke('goal-progress-tracker', {
    body: request,
  });

  if (error) {
    console.error('Error updating goal progress:', error);
    throw new Error(`Failed to update progress: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to update progress');
  }

  return data;
}

// Update goal basic information
async function updateGoalInfo(goalId: string, updates: UpdateGoalRequest, userId: string): Promise<FinancialGoal> {
  if (!userId) throw new Error('User ID is required');

  const { data, error } = await supabase
    .from('financial_goals')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating goal:', error);
    throw new Error(`Failed to update goal: ${error.message}`);
  }

  return data;
}

// Delete goal
async function deleteGoalById(goalId: string, userId: string): Promise<void> {
  if (!userId) throw new Error('User ID is required');

  const { error } = await supabase
    .from('financial_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting goal:', error);
    throw new Error(`Failed to delete goal: ${error.message}`);
  }
}

// Generate insights for a goal
async function generateInsights(goalId: string, userId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('goal-insights-generator', {
    body: { goalId, userId },
  });

  if (error) {
    console.error('Error generating insights:', error);
    throw new Error(`Failed to generate insights: ${error.message}`);
  }

  return data;
}

// Hook for managing a single goal
export function useGoal(goalId: string, userId?: string) {
  const queryClient = useQueryClient();

  // Fetch goal details query
  const goalQuery = useQuery({
    queryKey: goalQueryKeys.detail(goalId),
    queryFn: () => fetchGoalDetails(goalId, userId!),
    enabled: !!goalId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Optimistic update for goal progress
  const updateProgressMutation = useMutation({
    mutationFn: updateGoalProgress,
    onMutate: async (newProgress: ProgressUpdateRequest) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: goalQueryKeys.detail(goalId) });

      // Snapshot the previous value
      const previousGoalData = queryClient.getQueryData<{ goal: FinancialGoal; milestones: GoalMilestone[]; insights: GoalInsight[] }>(goalQueryKeys.detail(goalId));

      // Optimistically update to the new value
      if (previousGoalData) {
        const amountChange = newProgress.amountChange || 0;
        const newAmount = previousGoalData.goal.current_amount + amountChange;
        const newProgressPercentage = (newAmount / previousGoalData.goal.target_amount) * 100;

        queryClient.setQueryData(goalQueryKeys.detail(goalId), {
          ...previousGoalData,
          goal: {
            ...previousGoalData.goal,
            current_amount: newAmount,
            progress_percentage: Math.min(100, newProgressPercentage),
          },
        });
      }

      return { previousGoalData };
    },
    onError: (err, newProgress, context) => {
      // Rollback to the previous value on error
      if (context?.previousGoalData) {
        queryClient.setQueryData(goalQueryKeys.detail(goalId), context.previousGoalData);
      }
      console.error('Update progress mutation error:', err);
      // Here you might want to show a toast notification to the user
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.detail(goalId) });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(userId || '') });
    },
  });

  // Update goal info mutation
  const updateGoalMutation = useMutation({
    mutationFn: (updates: UpdateGoalRequest) => updateGoalInfo(goalId, updates, userId!),
    onSuccess: (updatedGoal) => {
      // Update the goal data in cache
      queryClient.setQueryData(
        goalQueryKeys.detail(goalId),
        (old: { goal: FinancialGoal; milestones: GoalMilestone[]; insights: GoalInsight[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            goal: updatedGoal,
          };
        }
      );

      // Invalidate goals list to update overview
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(userId || '') });
    },
    onError: (error) => {
      console.error('Update goal mutation error:', error);
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: () => deleteGoalById(goalId, userId!),
    onSuccess: () => {
      // Remove goal from cache
      queryClient.removeQueries({ queryKey: goalQueryKeys.detail(goalId) });
      
      // Invalidate goals list
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(userId || '') });
    },
    onError: (error) => {
      console.error('Delete goal mutation error:', error);
    },
  });

  // Generate insights mutation
  const generateInsightsMutation = useMutation({
    mutationFn: () => generateInsights(goalId, userId!),
    onSuccess: (data) => {
      // Add new insights to cache
      if (data?.insights && data.insights.length > 0) {
        queryClient.setQueryData(
          goalQueryKeys.detail(goalId),
          (old: { goal: FinancialGoal; milestones: GoalMilestone[]; insights: GoalInsight[] } | undefined) => {
            if (!old) return old;
            
            // Merge new insights with existing ones, avoiding duplicates
            const existingInsightIds = new Set(old.insights.map(insight => insight.id));
            const newInsights = data.insights.filter((insight: GoalInsight) => 
              !existingInsightIds.has(insight.id)
            );
            
            return {
              ...old,
              insights: [...newInsights, ...old.insights].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ),
            };
          }
        );
      }
    },
    onError: (error) => {
      console.error('Generate insights mutation error:', error);
    },
  });

  // Refetch function
  const refetch = () => {
    goalQuery.refetch();
  };

  return {
    // Data
    goal: goalQuery.data?.goal,
    milestones: goalQuery.data?.milestones || [],
    insights: goalQuery.data?.insights || [],
    
    // Loading states
    isLoading: goalQuery.isLoading,
    isUpdatingProgress: updateProgressMutation.isPending,
    isUpdatingGoal: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isGeneratingInsights: generateInsightsMutation.isPending,
    
    // Error states
    error: goalQuery.error,
    updateProgressError: updateProgressMutation.error,
    updateGoalError: updateGoalMutation.error,
    deleteError: deleteGoalMutation.error,
    generateInsightsError: generateInsightsMutation.error,
    
    // Actions
    updateProgress: updateProgressMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    generateInsights: generateInsightsMutation.mutateAsync,
    refetch,
    
    // Query info
    isStale: goalQuery.isStale,
    isFetching: goalQuery.isFetching,
  };
}