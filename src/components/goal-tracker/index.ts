// Export barrel for all goal tracker components
// This provides a clean interface for importing goal tracker components

// Widget components
export * from './widgets';

// Types
export * from './types';

// Re-export commonly used components and types
export type {
  FinancialGoal,
  GoalMilestone,
  GoalInsight,
  GoalMetrics,
  CreateGoalRequest,
  UpdateGoalRequest,
  ProgressUpdateRequest,
  QuestionnaireTemplate,
  QuestionnaireData,
  GoalType,
  GoalStatus,
  MilestoneType,
  MilestoneStatus,
  GoalFilters,
  GoalSortOptions,
} from './types';