// Export barrel for all goal tracker hooks
// This provides a clean interface for importing hooks throughout the application

// Core goal management hooks
export { useGoals, goalQueryKeys } from './use-goals';
export { useGoal } from './use-goal';
export { useCreateGoalWithAI, useCreateGoal } from './use-create-goal';

// Questionnaire and template hooks
export { 
  useQuestionnaireTemplate, 
  usePrefetchQuestionnaireTemplates,
  questionnaireQueryKeys 
} from './use-questionnaire-template';

// Re-export types for convenience
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
} from '@/components/goal-tracker/types';