// Export barrel for all goal tracker types
// This provides a clean interface for importing types throughout the application

// Core goal types
export type {
  FinancialGoal,
  GoalType,
  GoalStatus,
  AIMilestone,
  AIInsight,
  QuestionnaireData,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalMetrics,
  GoalProgressTrend,
  GoalFilters,
  GoalSortOptions,
  GoalResponse,
  GoalListResponse,
  IGoalTrackerWidget,
  IGoalTrackerData,
} from './goal-types';

// Milestone types
export type {
  GoalMilestone,
  MilestoneType,
  MilestoneStatus,
  MilestoneFrequency,
  MilestonePriority,
  ProgressUpdate,
  UpdateType,
  UpdateSource,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  ProgressUpdateRequest,
  ProgressUpdateResponse,
  MilestoneMetrics,
  MilestoneFilters,
  MilestoneSortOptions,
  GoalInsight,
  InsightType,
  CreateInsightRequest,
  InsightResponse,
  MilestoneDisplayData,
  BulkMilestoneOperation,
  BulkOperationResponse,
} from './milestone-types';

// Questionnaire types
export type {
  QuestionnaireTemplate,
  Question,
  QuestionType,
  QuestionOption,
  QuestionValidation,
  ConditionalLogic,
  AIModelConfig,
  QuestionnaireState,
  QuestionnaireFlowProps,
  QuestionRendererProps,
  ValidationResult,
  NumberQuestionProps,
  ChoiceQuestionProps,
  TextQuestionProps,
  DateQuestionProps,
  RatingQuestionProps,
  SliderQuestionProps,
  GoalTypeConfig,
  QuestionnaireTemplateResponse,
  QuestionnaireSubmissionResponse,
} from './questionnaire-types';

// Constants and configurations
export { GOAL_TYPE_CONFIGS } from './questionnaire-types';

// Utility types for the goal tracker system
export interface GoalTrackerError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface GoalTrackerLoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

export interface GoalTrackerState {
  goals: FinancialGoal[];
  currentGoal?: FinancialGoal;
  milestones: GoalMilestone[];
  insights: GoalInsight[];
  filters: GoalFilters;
  sortOptions: GoalSortOptions;
  isLoading: boolean;
  error?: GoalTrackerError;
}

// API response wrappers
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// React component prop types
export interface BaseGoalTrackerProps {
  className?: string;
  loading?: boolean;
  error?: GoalTrackerError;
  onError?: (error: GoalTrackerError) => void;
}

export interface GoalCardProps extends BaseGoalTrackerProps {
  goal: FinancialGoal;
  onClick?: (goal: FinancialGoal) => void;
  onEdit?: (goal: FinancialGoal) => void;
  onDelete?: (goal: FinancialGoal) => void;
  showActions?: boolean;
}

export interface MilestoneItemProps extends BaseGoalTrackerProps {
  milestone: GoalMilestone;
  goalId: string;
  onUpdate?: (milestone: GoalMilestone) => void;
  onComplete?: (milestone: GoalMilestone) => void;
  onEdit?: (milestone: GoalMilestone) => void;
  onDelete?: (milestone: GoalMilestone) => void;
  showActions?: boolean;
}

export interface ProgressIndicatorProps extends BaseGoalTrackerProps {
  current: number;
  target: number;
  showPercentage?: boolean;
  showLabels?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface AIInsightCardProps extends BaseGoalTrackerProps {
  insight: GoalInsight;
  onDismiss?: (insight: GoalInsight) => void;
  onFeedback?: (insight: GoalInsight, feedback: any) => void;
  showActions?: boolean;
}

// Form data types
export interface GoalFormData {
  title: string;
  description: string;
  goal_type: GoalType;
  target_amount: number;
  target_date: string;
  category?: string;
}

export interface MilestoneFormData {
  title: string;
  description: string;
  milestone_type: MilestoneType;
  target_amount?: number;
  habit_description?: string;
  frequency?: MilestoneFrequency;
  habit_target_value?: number;
  due_date: string;
  priority: MilestonePriority;
}

// Dashboard integration types
export interface DashboardGoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalProgress: number;
  onTrackGoals: number;
  upcomingMilestones: number;
  recentAchievements: number;
}

export interface GoalTrackerWidgetConfig {
  displayMode: 'grid' | 'list' | 'summary';
  maxItems: number;
  showCompleted: boolean;
  sortBy: string;
  goalTypes: GoalType[];
  refreshInterval: number;
}

// Analytics and reporting types
export interface GoalAnalytics {
  completionRate: number;
  averageTimeToComplete: number; // in days
  mostSuccessfulGoalType: GoalType;
  totalAmountSaved: number;
  averageGoalSize: number;
  milestonesCompletedThisMonth: number;
  progressTrend: 'up' | 'down' | 'stable';
}

export interface GoalReport {
  period: string;
  summary: GoalAnalytics;
  goals: FinancialGoal[];
  insights: GoalInsight[];
  recommendations: string[];
  generatedAt: string;
}