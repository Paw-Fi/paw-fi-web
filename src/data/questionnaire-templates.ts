import {QUESTIONNAIRE_TEMPLATES} from "../../supabase/functions/shared/goals-questionnaire-templates";
export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuestionValidation {
  required?: boolean;
  min?: number;
  max?: number;
}

export interface Question {
  id: string;
  type: 'number' | 'currency' | 'percentage' | 'single_choice' | 'multiple_choice' | 'text' | 'date';
  category: string;
  question: string;
  description?: string;
  placeholder?: string;
  options?: QuestionOption[];
  validation?: QuestionValidation;
  display_order: number;
  layout?: {
    colSpan?: number;
  };
}

export interface AIModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface QuestionnaireTemplate {
  goal_type: GoalType;
  template_name: string;
  description: string;
  questions: Question[];
  ai_prompt_template: string;
  ai_model_config: AIModelConfig;
  is_active: boolean;
  version: number;
}

// Helper function to get template by goal type
export function getQuestionnaireTemplate(goalType: GoalType): QuestionnaireTemplate | undefined {
  return QUESTIONNAIRE_TEMPLATES[goalType];
}

// Helper function to get all active templates
export function getActiveQuestionnaireTemplates(): QuestionnaireTemplate[] {
  return Object.values(QUESTIONNAIRE_TEMPLATES).filter(template => template.is_active);
}

// Export types for use in other files
export type GoalType ='retirement' | 'home_buying' | 'wealth' | 'investment' | 'debt_payoff' | 'emergency_fund' | 'passive_income' | 'custom';
export type QuestionnaireData = Record<string, any>;