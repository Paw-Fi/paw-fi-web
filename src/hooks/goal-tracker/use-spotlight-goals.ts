import { useMemo } from 'react';

export interface Goal {
  id: string;
  title: string;
  target_amount?: number;
  current_amount?: number;
  target_date?: string;
  created_at?: string;
  status: string;
}

export interface SpotlightGoal extends Goal {
  progress: number;
  daysUntilTarget: number;
  progressDeficit: number;
  spotlightScore: number;
  spotlightType: 'critical' | 'urgency' | 'attention' | 'upcoming' | 'success' | 'momentum' | 'stagnant';
  spotlightReason: string;
}

export function useSpotlightGoals(goals?: Goal[]): SpotlightGoal[] {
  return useMemo(() => {
    if (!goals || goals.length === 0) return [];
    
    const activeGoals = goals.filter(goal => goal.status !== 'completed');
    if (activeGoals.length === 0) return [];
    
    const currentDate = new Date();
    const spotlightCandidates = activeGoals.map(goal => {
      const progress = goal.current_amount && goal.target_amount 
        ? (goal.current_amount / goal.target_amount) * 100 
        : 0;
      
      const daysUntilTarget = goal.target_date 
        ? Math.ceil((new Date(goal.target_date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      
      // Calculate expected progress based on time elapsed
      const totalDays = goal.target_date && goal.created_at
        ? Math.ceil((new Date(goal.target_date).getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 365; // Default to 1 year if no creation date
      
      const elapsedDays = goal.created_at
        ? Math.ceil((currentDate.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const expectedProgress = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
      const progressDeficit = expectedProgress - progress;
      
      // Calculate spotlight priority score
      let spotlightScore = 0;
      let spotlightType: SpotlightGoal['spotlightType'] = 'progress' as any;
      let spotlightReason = '';
      
      // Critical urgency: Less than 7 days remaining
      if (daysUntilTarget <= 7 && daysUntilTarget > 0) {
        spotlightScore = 100;
        spotlightType = 'critical';
        spotlightReason = `Only ${daysUntilTarget} day${daysUntilTarget === 1 ? '' : 's'} remaining`;
      }
      // High urgency: Less than 30 days remaining
      else if (daysUntilTarget <= 30 && daysUntilTarget > 7) {
        spotlightScore = 80;
        spotlightType = 'urgency';
        spotlightReason = `${daysUntilTarget} days until target date`;
      }
      // Behind schedule: Progress deficit > 20%
      else if (progressDeficit > 20) {
        spotlightScore = 70;
        spotlightType = 'attention';
        spotlightReason = `${Math.round(progressDeficit)}% behind expected progress`;
      }
      // Moderate urgency: Less than 90 days remaining
      else if (daysUntilTarget <= 90 && daysUntilTarget > 30) {
        spotlightScore = 60;
        spotlightType = 'upcoming';
        spotlightReason = `${Math.round(daysUntilTarget / 30)} month${Math.round(daysUntilTarget / 30) === 1 ? '' : 's'} remaining`;
      }
      // Good progress: Ahead of schedule
      else if (progressDeficit < -10 && progress > 10) {
        spotlightScore = 50;
        spotlightType = 'success';
        spotlightReason = `${Math.round(Math.abs(progressDeficit))}% ahead of schedule`;
      }
      // Recently started: Less than 10% progress but recent activity
      else if (progress < 10 && progress > 0) {
        spotlightScore = 40;
        spotlightType = 'momentum';
        spotlightReason = 'Building momentum - keep it up!';
      }
      // Stagnant: No progress in a while
      else if (progress === 0 && elapsedDays > 30) {
        spotlightScore = 30;
        spotlightType = 'stagnant';
        spotlightReason = 'No progress yet - time to take action';
      }
      
      return {
        ...goal,
        progress,
        daysUntilTarget,
        progressDeficit,
        spotlightScore,
        spotlightType,
        spotlightReason
      };
    });
    
    // Sort by spotlight score (highest first) and select top 1-3
    const selectedSpotlights = spotlightCandidates
      .filter(goal => goal.spotlightScore > 0)
      .sort((a, b) => {
        // Primary sort: spotlight score
        if (b.spotlightScore !== a.spotlightScore) {
          return b.spotlightScore - a.spotlightScore;
        }
        // Secondary sort: closest target date
        if (a.daysUntilTarget !== b.daysUntilTarget) {
          return a.daysUntilTarget - b.daysUntilTarget;
        }
        // Tertiary sort: highest target amount (more significant goals)
        return (b.target_amount || 0) - (a.target_amount || 0);
      })
      .slice(0, 3); // Maximum 3 spotlight cards
    
    return selectedSpotlights;
  }, [goals]);
}