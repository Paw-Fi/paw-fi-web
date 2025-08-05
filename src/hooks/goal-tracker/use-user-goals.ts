import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export interface UserGoal {
  id: string;
  title: string;
  description?: string;
  current_amount: number;
  target_amount: number;
  progress_percentage: number;
  target_date?: string;
  start_date?: string;
  goal_type: string;
  status: string;
  is_on_track: boolean;
  created_at: string;
  updated_at: string;
  goal_milestones?: any[];
}

export interface GoalContextSummary {
  id: string;
  title: string;
  current_amount: number;
  target_amount: number;
  progress_percentage: number;
  target_date?: string;
  goal_type: string;
  status: string;
  is_on_track: boolean;
  milestone_count: number;
}

async function fetchUserGoals(userId: string): Promise<UserGoal[]> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select(`
      id,
      title,
      description,
      current_amount,
      target_amount,
      progress_percentage,
      target_date,
      start_date,
      goal_type,
      status,
      is_on_track,
      created_at,
      updated_at,
      goal_milestones (
        id,
        title,
        description,
        target_amount,
        due_date,
        status,
        completed_date
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user goals:', error);
    throw new Error('Failed to fetch goals');
  }

  return data || [];
}

export function useUserGoals() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-goals', user?.id],
    queryFn: () => fetchUserGoals(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// Utility functions for creating AI context
export function createSingleGoalContext(goal: UserGoal) {
  return {
    goalId: goal.id,
    goalTitle: goal.title,
    currentAmount: goal.current_amount,
    targetAmount: goal.target_amount,
    progressPercentage: goal.progress_percentage,
    targetDate: goal.target_date,
    goalType: goal.goal_type,
    isOnTrack: goal.is_on_track,
    milestones: goal.goal_milestones || [],
    status: goal.status,
  };
}

export function createAllGoalsContext(goals: UserGoal[]): {
  totalGoals: number;
  activeGoals: number;
  totalProgress: number;
  goalsSummary: GoalContextSummary[];
} {
  const activeGoals = goals.filter(g => g.status === 'active');
  const totalProgress = activeGoals.length > 0 
    ? activeGoals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / activeGoals.length 
    : 0;

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    totalProgress: Math.round(totalProgress),
    goalsSummary: goals.map(goal => ({
      id: goal.id,
      title: goal.title,
      current_amount: goal.current_amount,
      target_amount: goal.target_amount,
      progress_percentage: goal.progress_percentage,
      target_date: goal.target_date,
      goal_type: goal.goal_type,
      status: goal.status,
      is_on_track: goal.is_on_track,
      milestone_count: goal.goal_milestones?.length || 0,
    }))
  };
}