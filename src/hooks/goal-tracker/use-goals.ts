import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { 
  FinancialGoal, 
  GoalFilters, 
  GoalSortOptions, 
  GoalMetrics,
  CreateGoalRequest,
  UpdateGoalRequest
} from "@/components/goal-tracker/types";

// Query key factory for goals
export const goalQueryKeys = {
  all: ['goals'] as const,
  lists: () => [...goalQueryKeys.all, 'list'] as const,
  list: (userId: string, filters?: GoalFilters) => [...goalQueryKeys.lists(), userId, filters] as const,
  details: () => [...goalQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...goalQueryKeys.details(), id] as const,
  metrics: (userId: string) => [...goalQueryKeys.all, 'metrics', userId] as const,
};

// Fetch goals for a user
async function fetchGoals(
  userId: string, 
  filters?: GoalFilters, 
  sortOptions?: GoalSortOptions
): Promise<FinancialGoal[]> {
  if (!userId) throw new Error('User ID is required');

  let query = supabase
    .from('financial_goals')
    .select(`
      *,
      goal_milestones (*),
      goal_insights (*)
    `)
    .eq('user_id', userId);

  // Apply filters
  if (filters) {
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters.goal_type && filters.goal_type.length > 0) {
      query = query.in('goal_type', filters.goal_type);
    }
    
    if (filters.is_on_track !== undefined) {
      query = query.eq('is_on_track', filters.is_on_track);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
  }

  // Apply sorting
  if (sortOptions) {
    query = query.order(sortOptions.field, { ascending: sortOptions.direction === 'asc' });
  } else {
    // Default sorting: active goals first, then by updated date
    query = query.order('status', { ascending: false }).order('updated_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching goals:', error);
    throw new Error(`Failed to fetch goals: ${error.message}`);
  }

  return data || [];
}

// Calculate goal metrics
async function calculateGoalMetrics(userId: string): Promise<GoalMetrics> {
  if (!userId) throw new Error('User ID is required');

  const { data: goals, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error calculating metrics:', error);
    throw new Error(`Failed to calculate metrics: ${error.message}`);
  }

  if (!goals || goals.length === 0) {
    return {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      totalTargetAmount: 0,
      totalCurrentAmount: 0,
      overallProgress: 0,
      goalsOnTrack: 0,
      goalsOffTrack: 0,
      averageProgress: 0,
    };
  }

  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  const onTrackGoals = goals.filter(goal => goal.is_on_track);
  const offTrackGoals = goals.filter(goal => !goal.is_on_track && goal.status === 'active');

  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
  
  const progressSum = goals.reduce((sum, goal) => sum + goal.progress_percentage, 0);
  const averageProgress = goals.length > 0 ? progressSum / goals.length : 0;

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    totalTargetAmount,
    totalCurrentAmount,
    overallProgress,
    goalsOnTrack: onTrackGoals.length,
    goalsOffTrack: offTrackGoals.length,
    averageProgress,
  };
}

// Create a new goal with AI
async function createGoalWithAI(request: CreateGoalRequest, userId: string): Promise<any> {
  if (!userId) throw new Error('User ID is required');

  const { data, error } = await supabase.functions.invoke('ai-goal-generator', {
    body: {
      userId,
      goalType: request.goalType,
      questionnaireAnswers: request.questionnaireAnswers,
    },
  });

  if (error) {
    console.error('Error creating goal with AI:', error);
    throw new Error(`Failed to create goal: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to create goal');
  }

  return data;
}

// Update a goal
async function updateGoal(goalId: string, updates: UpdateGoalRequest, userId: string): Promise<FinancialGoal> {
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

// Delete a goal
async function deleteGoal(goalId: string, userId: string): Promise<void> {
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

// Main hook for managing goals
export function useGoals(
  userId?: string,
  filters?: GoalFilters,
  sortOptions?: GoalSortOptions
) {
  const queryClient = useQueryClient();

  // Fetch goals query
  const goalsQuery = useQuery({
    queryKey: goalQueryKeys.list(userId || '', filters),
    queryFn: () => fetchGoals(userId!, filters, sortOptions),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch metrics query
  const metricsQuery = useQuery({
    queryKey: goalQueryKeys.metrics(userId || ''),
    queryFn: () => calculateGoalMetrics(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: (request: CreateGoalRequest) => createGoalWithAI(request, userId!),
    onSuccess: () => {
      // Invalidate and refetch goals data
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(userId || '') });
    },
    onError: (error) => {
      console.error('Create goal mutation error:', error);
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, updates }: { goalId: string; updates: UpdateGoalRequest }) =>
      updateGoal(goalId, updates, userId!),
    onSuccess: (updatedGoal) => {
      // Update cache with new data
      queryClient.setQueryData(
        goalQueryKeys.list(userId || '', filters),
        (old: FinancialGoal[] | undefined) =>
          old?.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal) || []
      );
      
      // Invalidate metrics to recalculate
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(userId || '') });
    },
    onError: (error) => {
      console.error('Update goal mutation error:', error);
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId, userId!),
    onSuccess: (_, goalId) => {
      // Remove goal from cache
      queryClient.setQueryData(
        goalQueryKeys.list(userId || '', filters),
        (old: FinancialGoal[] | undefined) =>
          old?.filter(goal => goal.id !== goalId) || []
      );
      
      // Invalidate metrics to recalculate
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(userId || '') });
    },
    onError: (error) => {
      console.error('Delete goal mutation error:', error);
    },
  });

  // Refetch function
  const refetch = () => {
    goalsQuery.refetch();
    metricsQuery.refetch();
  };

  return {
    // Data
    goals: goalsQuery.data || [],
    metrics: metricsQuery.data,
    
    // Loading states
    isLoading: goalsQuery.isLoading || metricsQuery.isLoading,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    
    // Error states
    error: goalsQuery.error || metricsQuery.error,
    createError: createGoalMutation.error,
    updateError: updateGoalMutation.error,
    deleteError: deleteGoalMutation.error,
    
    // Actions
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    refetch,
    
    // Query info
    isStale: goalsQuery.isStale || metricsQuery.isStale,
    isFetching: goalsQuery.isFetching || metricsQuery.isFetching,
  };
}