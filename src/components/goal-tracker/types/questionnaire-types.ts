// Questionnaire interfaces and types for AI-driven goal creation

export type QuestionType = 
  | 'text'
  | 'number' 
  | 'currency'
  | 'percentage'
  | 'date'
  | 'single_choice'
  | 'multiple_choice'
  | 'rating_scale'
  | 'slider'
  | 'text_area';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  followup_questions?: string[]; // IDs of questions to show if this option is selected
}

export interface QuestionValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom_validator?: string;
  error_message?: string;
}

export interface ConditionalLogic {
  show_if: {
    question_id: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }[];
}

export interface Question {
  id: string;
  type: QuestionType;
  category: string;
  question: string;
  description?: string;
  options?: QuestionOption[];
  validation: QuestionValidation;
  conditional_logic?: ConditionalLogic;
  display_order: number;
}

export interface QuestionnaireTemplate {
  id: string;
  goal_type: string;
  template_name: string;
  description: string;
  questions: Question[];
  ai_prompt_template: string;
  ai_model_config: AIModelConfig;
  created_at?: string;
  updated_at?: string;
  version: number;
  is_active: boolean;
}

export interface AIModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
}

export interface QuestionnaireData {
  [questionId: string]: any;
}

// Questionnaire flow state management
export interface QuestionnaireState {
  currentStep: number;
  totalSteps: number;
  answers: QuestionnaireData;
  isValid: boolean;
  errors: Record<string, string>;
  isGenerating: boolean;
  generationProgress: number;
}

export interface QuestionnaireFlowProps {
  goalType: string;
  template: QuestionnaireTemplate;
  onComplete: (result: any) => void;
  onCancel: () => void;
}

// Question rendering props
export interface QuestionRendererProps {
  question: Question;
  answer: any;
  onAnswerChange: (answer: any) => void;
  error?: string;
  disabled?: boolean;
}

// Validation results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Question type-specific interfaces
export interface NumberQuestionProps extends QuestionRendererProps {
  question: Question & { type: 'number' | 'currency' | 'percentage' };
}

export interface ChoiceQuestionProps extends QuestionRendererProps {
  question: Question & { type: 'single_choice' | 'multiple_choice' };
}

export interface TextQuestionProps extends QuestionRendererProps {
  question: Question & { type: 'text' | 'text_area' };
}

export interface DateQuestionProps extends QuestionRendererProps {
  question: Question & { type: 'date' };
}

export interface RatingQuestionProps extends QuestionRendererProps {
  question: Question & { type: 'rating_scale' };
}

export interface SliderQuestionProps extends QuestionRendererProps {
  question: Question & { type: 'slider' };
}

// Goal type configurations
export interface GoalTypeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  estimatedTime: string; // e.g., "5-7 minutes"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  benefits: string[];
  templateId?: string;
}

export const GOAL_TYPE_CONFIGS: Record<string, GoalTypeConfig> = {
  retirement: {
    id: 'retirement',
    name: 'Retirement Planning',
    description: 'Build a comprehensive retirement savings strategy',
    icon: 'fas fa-piggy-bank',
    color: 'bg-blue-500',
    estimatedTime: '6-8 minutes',
    difficulty: 'intermediate',
    benefits: [
      'Personalized retirement timeline',
      'AI-generated milestone plan',
      'Tax-optimization strategies',
      'Regular progress insights'
    ]
  },
  home_buying: {
    id: 'home_buying',
    name: 'Home Purchase',
    description: 'Save strategically for your dream home',
    icon: 'fas fa-home',
    color: 'bg-green-500',
    estimatedTime: '4-6 minutes',
    difficulty: 'beginner',
    benefits: [
      'Down payment calculation',
      'Closing costs planning',
      'Timeline optimization',
      'Market-aware strategy'
    ]
  },
  wealth: {
    id: 'wealth',
    name: 'Wealth Building',
    description: 'Accelerate your path to financial independence',
    icon: 'fas fa-chart-line',
    color: 'bg-purple-500',
    estimatedTime: '5-7 minutes',
    difficulty: 'advanced',
    benefits: [
      'Investment allocation plan',
      'Risk-adjusted strategy',
      'Tax-efficient growth',
      'Milestone tracking'
    ]
  },
  investment: {
    id: 'investment',
    name: 'Investment Portfolio',
    description: 'Build a targeted investment strategy',
    icon: 'fas fa-coins',
    color: 'bg-orange-500',
    estimatedTime: '4-5 minutes',
    difficulty: 'intermediate',
    benefits: [
      'Diversified portfolio plan',
      'Risk management strategy',
      'Performance tracking',
      'Rebalancing guidance'
    ]
  },
  custom: {
    id: 'custom',
    name: 'Custom Goal',
    description: 'Create a personalized financial goal',
    icon: 'fas fa-target',
    color: 'bg-gray-500',
    estimatedTime: '3-5 minutes',
    difficulty: 'beginner',
    benefits: [
      'Flexible goal structure',
      'Custom milestone creation',
      'Personalized strategy',
      'Adaptive tracking'
    ]
  }
};

// API response types for questionnaires
export interface QuestionnaireTemplateResponse {
  success: boolean;
  template: QuestionnaireTemplate;
}

export interface QuestionnaireSubmissionResponse {
  success: boolean;
  goal: any;
  milestones: any[];
  strategy: string;
  insights: any[];
  projections?: any;
  debug?: any;
}