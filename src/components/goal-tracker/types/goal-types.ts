// Core goal interfaces and types for the AI-driven goal tracking system

import { GoalType } from '../types';
import { GoalMilestone, ProgressUpdate, GoalInsight, MilestoneType, MilestoneFrequency, MilestonePriority } from './milestone-types';


export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface FinancialGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  goal_type: GoalType;
  category?: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  start_date: string;
  target_date: string;
  estimated_completion_date?: string;
  ai_questionnaire_data?: QuestionnaireData;
  ai_generated_strategy?: string;
  ai_generated_milestones?: AIMilestone[];
  ai_insights?: AIInsight[];
  status: GoalStatus;
  progress_percentage: number;
  is_on_track: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  
  // Related data (populated via joins)
  milestones?: GoalMilestone[];
  recent_updates?: ProgressUpdate[];
  insights?: GoalInsight[];
}

export interface AIMilestone {
  title: string;
  description: string;
  type: MilestoneType;
  targetAmount?: number;
  dueDate: string;
  habitDescription?: string;
  frequency?: MilestoneFrequency;
  habitTargetValue?: number;
  priority: MilestonePriority;
  aiRationale: string;
}

export interface AIInsight {
  type: string;
  title: string;
  content: string;
  priority: string;
  actionable: boolean;
}

export interface QuestionnaireData {
  [questionId: string]: any;
}

// Goal creation and editing
export interface CreateGoalRequest {
  goalType: GoalType;
  questionnaireAnswers: QuestionnaireData;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  target_amount?: number;
  target_date?: string;
  status?: GoalStatus;
}

// Goal metrics and analytics
export interface GoalMetrics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  goalsOnTrack: number;
  goalsOffTrack: number;
  averageProgress: number;
}

export interface GoalProgressTrend {
  date: string;
  amount: number;
  progress_percentage: number;
}

// Goal filtering and sorting
export interface GoalFilters {
  status?: GoalStatus[];
  goal_type?: GoalType[];
  is_on_track?: boolean;
  search?: string;
}

export interface GoalSortOptions {
  field: 'created_at' | 'updated_at' | 'target_date' | 'progress_percentage' | 'target_amount';
  direction: 'asc' | 'desc';
}

// API response types
export interface GoalResponse {
  success: boolean;
  goal: FinancialGoal;
  milestones?: GoalMilestone[];
  strategy?: string;
  insights?: GoalInsight[];
  projections?: {
    monthlyRequired?: number;
    projectedFinalAmount?: number;
    incomeReplacement?: number;
    confidenceLevel?: number;
  };
  debug?: {
    message: string;
    timestamp: string;
    goalId: string;
    milestonesCreated?: number;
  };
}

export interface GoalListResponse {
  success: boolean;
  goals: FinancialGoal[];
  totalCount: number;
  page: number;
  limit: number;
}

// Dashboard widget integration
export interface IGoalTrackerWidget extends IBaseWidget {
  type: 'goalTracker';
  data: IGoalTrackerData;
}

export interface IGoalTrackerData {
  goals: FinancialGoal[];
  displayMode: 'grid' | 'list' | 'summary';
  showCompleted?: boolean;
  sortBy?: 'progress' | 'target_date' | 'created_at' | 'priority';
  maxDisplayItems?: number;
  filterByGoalType?: GoalType;
}

// Import base widget interface from existing system
interface IBaseWidget {
  id: string;
  type: string;
  title: string;
  icon: string;
  column_span: 1 | 2;
  row_span?: 1 | 2 | 3 | 4;
  controls?: React.ReactNode;
  order?: number;
}

// Re-export milestone and related types
export type {
  GoalMilestone,
  MilestoneType,
  MilestoneStatus,
  MilestoneFrequency,
  MilestonePriority,
  ProgressUpdate,
  UpdateType,
  UpdateSource,
  GoalInsight,
  InsightType,
} from './milestone-types';

export type {
  FinancialProfileQuestion as Question,
  QuestionType,
  QuestionOption,
  QuestionValidation,
  ConditionalLogic,
} from '@/types/financial-quiz-constants';

export type { QuestionnaireTemplate } from '@/data/questionnaire-templates';