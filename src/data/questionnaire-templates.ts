import { goalsQuestionTemplate, type Question } from "@/types/financial-quiz-constants";

export interface QuestionnaireTemplate {
  id: string;
  goal_type: GoalType;
  template_name: string;
  description: string;
  questions: Question[];
  ai_prompt_template: string;
  ai_model_config: {
    model: string;
    temperature: number;
    max_tokens: number;
    top_p?: number;
    frequency_penalty?: number;
  };
  created_at?: string;
  updated_at?: string;
  version: number;
  is_active: boolean;
}

// Retirement Goal Template - ENHANCED
const retirementTemplate: QuestionnaireTemplate = {
  id: 'retirement-template-v1',
  goal_type: 'retirement',
  template_name: 'Retirement Planning Assessment',
  description: 'AI-driven assessment to create your personalized retirement savings strategy',
  questions: goalsQuestionTemplate.filter(q => [
    'current-age',
    'retirement-age',
    'current_annual_income',
    'retirement_savings',
    'existing_retirement_accounts',
    'monthly-pension-contribution',
    'retirement_lifestyle',
    'risk_tolerance',
    'employer_match',
    'social_security_estimate'
  ].includes(q.id)),
  ai_prompt_template: 'Create a personalized retirement plan based on current age {{current-age}}, retirement age {{retirement-age}}, and desired lifestyle {{retirement_lifestyle}}.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};

// Home Buying Goal Template - ENHANCED
const homeBuyingTemplate: QuestionnaireTemplate = {
  id: 'home-buying-template-v1',
  goal_type: 'home_buying',
  template_name: 'Home Purchase Planning',
  description: 'Create a personalized home buying savings strategy with timeline and milestones',
  questions:  goalsQuestionTemplate.filter(q => [
    'target_location',
    'target_home_price',
    'down_payment_percentage',
    'home_purchase_savings',
    'monthly_savings_capacity',
    'desired_timeline_years',
    'credit_score_range',
    'additional_costs'
  ].includes(q.id)),
  ai_prompt_template: 'Create a home buying savings plan for {{target_location}} with target price {{target_home_price}} and {{down_payment_percentage}}% down payment.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};
// Wealth Building Goal Template - ENHANCED
const wealthTemplate: QuestionnaireTemplate = {
  id: 'wealth-template-v1',
  goal_type: 'wealth',
  template_name: 'Wealth Building Strategy',
  description: 'Develop a personalized wealth accumulation plan with investment strategy',
  questions:  goalsQuestionTemplate.filter(q => [
    'wealth_target',
    'current_net_worth',
    'monthly_investment',
    'time-horizon',
    'investment_experience',
    'risk_tolerance'
  ].includes(q.id)),
  ai_prompt_template: 'Develop a wealth building strategy to reach {{wealth_target}} with current net worth {{current_net_worth}} and {{risk_tolerance}} risk tolerance.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};

// Investment Goal Template - ENHANCED
const investmentTemplate: QuestionnaireTemplate = {
  id: 'investment-template-v1',
  goal_type: 'investment',
  template_name: 'Investment Portfolio Planning',
  description: 'Create a targeted investment strategy for specific financial objectives',
  questions:  goalsQuestionTemplate.filter(q => [
    'investment_purpose',
    'time_horizon_years',
    'investment_amount',
    'regular_contributions',
    'risk_comfort'
  ].includes(q.id)),
  ai_prompt_template: 'Create an investment portfolio for {{investment_purpose}} with {{investment_amount}} initial investment and {{time_horizon_years}} year timeline.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};

// Debt Payoff Goal Template - ENHANCED
const debtPayoffTemplate: QuestionnaireTemplate = {
  id: 'debt-payoff-template-v1',
  goal_type: 'debt_payoff',
  template_name: 'Debt Payoff Plan',
  description: 'Create a personalized strategy to become debt-free faster.',
  questions:  goalsQuestionTemplate.filter(q => [
    'debts',
    'extra_payment_capacity',
    'payoff_preference'
  ].includes(q.id)),
  ai_prompt_template: 'Create a debt payoff plan using {{payoff_preference}} method with {{extra_payment_capacity}} extra monthly payment capacity.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};

// Emergency Fund Goal Template - ENHANCED
const emergencyFundTemplate: QuestionnaireTemplate = {
  id: 'emergency-fund-template-v1',
  goal_type: 'emergency_fund',
  template_name: 'Emergency Fund Builder',
  description: 'Build a financial safety net for unexpected life events.',
  questions:  goalsQuestionTemplate.filter(q => [
    'monthly_essential_expenses',
    'income_stability',
    'target_months',
    'current_emergency_savings',
    'emergency_fund_monthly_contribution'
  ].includes(q.id)),
  ai_prompt_template: 'Build an emergency fund for {{target_months}} months of expenses ({{monthly_essential_expenses}}) with {{income_stability}} income stability.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};
// Passive Income Goal Template - ENHANCED
const passiveIncomeTemplate: QuestionnaireTemplate = {
  id: 'passive-income-template-v1',
  goal_type: 'passive_income',
  template_name: 'Passive Income Strategy Builder',
  description: 'Create a personalized plan to generate sustainable income streams with minimal ongoing effort',
  questions:  goalsQuestionTemplate.filter(q => [
    'target_monthly_income',
    'current_investment_capital',
    'monthly_investment_capacity',
    'time-horizon',
    'income_stream_preferences',
    'risk_tolerance',
    'effort_level'
  ].includes(q.id)),
  ai_prompt_template: 'Create a passive income strategy to generate {{target_monthly_income}} monthly with {{current_investment_capital}} starting capital and {{risk_tolerance}} risk tolerance.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};

// Custom Goal Template - ENHANCED
const customGoalTemplate: QuestionnaireTemplate = {
  id: 'custom-goal-template-v1',
  goal_type: 'custom',
  template_name: 'Custom Goal Planner',
  description: 'Define and create a savings plan for any personal financial goal.',
  questions:  goalsQuestionTemplate.filter(q => [
    'goal_description',
    'target_amount',
    'target_date',
    'custom_goal_current_savings',
    'custom_goal_monthly_contribution'
  ].includes(q.id)),
  ai_prompt_template: 'Create a savings plan for "{{goal_description}}" with target amount {{target_amount}} by {{target_date}}.',
  ai_model_config: {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0
  },
  version: 1,
  is_active: true
};

// Export all templates
export const QUESTIONNAIRE_TEMPLATES: Record<GoalType, QuestionnaireTemplate> = {
  retirement: retirementTemplate,
  home_buying: homeBuyingTemplate,
  wealth: wealthTemplate,
  investment: investmentTemplate,
  debt_payoff: debtPayoffTemplate,
  emergency_fund: emergencyFundTemplate,
  custom: customGoalTemplate,
  passive_income: passiveIncomeTemplate,

};

// Helper function to get template by goal type
export function getQuestionnaireTemplate(goalType: GoalType): QuestionnaireTemplate | undefined {
  return QUESTIONNAIRE_TEMPLATES[goalType];
}

// Export types for use in other files
export type GoalType ='retirement' | 'home_buying' | 'wealth' | 'investment' | 'debt_payoff' | 'emergency_fund' | 'passive_income' | 'custom';
export type QuestionnaireData = Record<string, any>;
