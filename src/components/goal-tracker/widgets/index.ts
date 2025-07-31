// Export barrel for all goal tracker widgets
// This provides a clean interface for importing widget components

export { GoalTrackerSummaryWidget } from './GoalTrackerSummaryWidget';
export { GoalProgressWidget } from './GoalProgressWidget';
export { GoalsGridWidget } from './GoalsGridWidget';

// Re-export widget types for convenience
export type {
  IGoalTrackerSummaryWidget,
  IGoalProgressWidget,
  IGoalsGridWidget,
  IGoalTrackerSummaryData,
  IGoalProgressData,
  IGoalsGridData
} from '@/components/profile/types/dashboard-data.typings';