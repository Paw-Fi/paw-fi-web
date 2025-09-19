// Goal Tracker Types
// This file contains all the TypeScript interfaces and types used in the goal tracker system

// Re-export types from data files for compatibility
export type { 
  QuestionnaireTemplate,
  QuestionnaireData
} from '../../data/questionnaire-templates';

export type { 
  GoalTypeConfig 
} from '../../data/goal-type-configs';

// Import the configurations for re-export
export { GOAL_TYPE_CONFIGS } from '../../data/goal-type-configs';

// Define GoalType locally to avoid circular imports
export type GoalType = 'retirement' | 'home_buying' | 'wealth' | 'investment' | 'debt_payoff' | 'emergency_fund' | 'passive_income' | 'custom';

// Additional types specific to the goal tracker components
export interface CreateGoalRequest {
  goalType: GoalType;
  questionnaireAnswers: QuestionnaireData;
}

export type AdvisorTone = 'congratulatory' | 'encouraging' | 'motivational' | 'reassuring' | 'informative';

export interface AdvisorMessage {
  content: string;
  tone: AdvisorTone;
}

export interface GoalCreationResult {
  goal: {
    id: string;
    title: string;
    description: string;
    target_amount: number;
    target_date: string;
    rationale: string;
  };
  strategy: string;
  milestones: DBMilestone[];
  insights: Insight[];
  projections?: {
    monthlyRequired: number;
    projectedFinalAmount: number;
    confidenceLevel: number;
  };
  advisorMessages?: {
    planMessage: AdvisorMessage;
    insightsMessage: AdvisorMessage;
    nextStepsMessage: AdvisorMessage;
  };
}

export interface Milestone {
  title: string;
  description: string;
  type: 'amount' | 'habit' | 'action' | 'date';
  targetAmount?: number;
  dueDate: string;
  habitDescription?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'one-time';
  habitTargetValue?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  aiRationale: string;
}

// Database milestone interface that matches the actual API response
export interface DBMilestone {
  id?: string;
  goal_id?: string;
  title: string;
  description: string;
  milestone_type: string;
  target_amount?: number | null;
  current_amount?: number;
  habit_description?: string | null;
  frequency?: string | null;
  habit_target_value?: number | null;
  start_date?: string;
  due_date: string;
  completed_date?: string | null;
  status?: string;
  progress_percentage?: number;
  is_ai_generated?: boolean;
  display_order?: number;
  priority: string;
  created_at?: string;
  updated_at?: string;
}

export interface Insight {
  type: 'strategy_insight' | 'savings' | 'timeline' | 'market' | 'strategy';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
}

// Goal creation flow states
export type GoalCreationStep = 'goal_type_selection' | 'questionnaire' | 'generating' | 'complete';

export interface GoalCreationState {
  currentStep: GoalCreationStep;
  selectedGoalType?: GoalType;
  questionnaireAnswers?: QuestionnaireData;
  result?: GoalCreationResult;
  error?: string;
}
