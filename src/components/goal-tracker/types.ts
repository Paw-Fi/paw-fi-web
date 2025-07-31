// Goal Tracker Types
// This file contains all the TypeScript interfaces and types used in the goal tracker system

// Re-export types from data files for compatibility
export type { 
  QuestionnaireTemplate, 
  Question, 
  QuestionOption, 
  QuestionValidation,
  AIModelConfig
} from '@/data/questionnaire-templates';

export type { 
  GoalTypeConfig 
} from '@/data/goal-type-configs';

// Import the configurations for re-export
export { GOAL_TYPE_CONFIGS } from '@/data/goal-type-configs';

// Define GoalType and QuestionnaireData locally to avoid circular imports
export type GoalType = 'retirement' | 'home_buying' | 'wealth' | 'investment' | 'debt_payoff' | 'emergency_fund' | 'custom';
export type QuestionnaireData = Record<string, any>;

// Additional types specific to the goal tracker components
export interface CreateGoalRequest {
  goalType: GoalType;
  questionnaireAnswers: QuestionnaireData;
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
  milestones: Milestone[];
  insights: Insight[];
  projections?: {
    monthlyRequired: number;
    projectedFinalAmount: number;
    confidenceLevel: number;
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
