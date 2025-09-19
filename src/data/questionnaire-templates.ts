import { goalsQuestionTemplate, type FinancialProfileQuestion } from "../types/financial-quiz-constants";

export interface QuestionnaireTemplate {
  id: string;
  goal_type: GoalType;
  template_name: string;
  description: string;
  questions: FinancialProfileQuestion[];  
  created_at?: string;
  updated_at?: string;
}

// Retirement Goal Template - ENHANCED
const retirementTemplate: QuestionnaireTemplate = {
  id: 'retirement-template-v1',
  goal_type: 'retirement',
  template_name: 'Retirement Planning Assessment',
  description: 'AI-driven assessment to create your personalized retirement savings strategy',
  questions: goalsQuestionTemplate.filter(q => [
    'current_age',
    'retirement_age',
    'gross_monthly_income',
    'net_monthly_income',
    'retirement_accounts',
    'desired_retirement_income',
  ].includes(q.id)),
};

// Home Buying Goal Template - ENHANCED
const homeBuyingTemplate: QuestionnaireTemplate = {
  id: 'home-buying-template-v1',
  goal_type: 'home_buying',
  template_name: 'Home Purchase Planning',
  description: 'Create a personalized home buying savings strategy with timeline and milestones',
  questions:  goalsQuestionTemplate.filter(q => [
    'current_age',
    'gross_monthly_income',
    'net_monthly_income',
    'housing_cost',
    'savings_account',
    'credit_card_debt',
    'student_loan_debt',
    'auto_loan_balance',
  ].includes(q.id)),
};
// Wealth Building Goal Template - ENHANCED
const wealthTemplate: QuestionnaireTemplate = {
  id: 'wealth-template-v1',
  goal_type: 'wealth',
  template_name: 'Wealth Building Strategy',
  description: 'Develop a personalized wealth accumulation plan with investment strategy',
  questions:  goalsQuestionTemplate.filter(q => [
    'current_age',
    'net_monthly_income',
    'investment_accounts',
    'retirement_accounts',
    'real_estate_value',
    'other_assets',
    'credit_card_debt',
    'student_loan_debt',
    'mortgage_balance',
    'auto_loan_balance',
    'other_debt',
  ].includes(q.id))
};

// Investment Goal Template - ENHANCED
const investmentTemplate: QuestionnaireTemplate = {
  id: 'investment-template-v1',
  goal_type: 'investment',
  template_name: 'Investment Portfolio Planning',
  description: 'Create a targeted investment strategy for specific financial objectives',
  questions:  goalsQuestionTemplate.filter(q => [
    'current_age',
    'investment_experience',
    'investment_timeline',
    'risk_tolerance',
    'investment_accounts',
    'savings_account',
  ].includes(q.id)),
};

// Debt Payoff Goal Template - ENHANCED
const debtPayoffTemplate: QuestionnaireTemplate = {
  id: 'debt-payoff-template-v1',
  goal_type: 'debt_payoff',
  template_name: 'Debt Payoff Plan',
  description: 'Create a personalized strategy to become debt-free faster.',
  questions:  goalsQuestionTemplate.filter(q => [
  'net_monthly_income',
    'credit_card_debt',
    'credit_card_interest_rate',
    'student_loan_debt',
    'student_loan_interest_rate',
    'auto_loan_balance',
    'auto_loan_interest_rate',
    'other_debt',
    'other_debt_interest_rate',
  ].includes(q.id)),
};

// Emergency Fund Goal Template - ENHANCED
const emergencyFundTemplate: QuestionnaireTemplate = {
  id: 'emergency-fund-template-v1',
  goal_type: 'emergency_fund',
  template_name: 'Emergency Fund Builder',
  description: 'Build a financial safety net for unexpected life events.',
  questions:  goalsQuestionTemplate.filter(q => [
    'net_monthly_income',
    'emergency_fund',
    'food_expenses',
    'transportation_expenses',
    'healthcare_expenses',
    'insurance_expenses',
    'other_monthly_expenses',
  ].includes(q.id)),
};
// Passive Income Goal Template - ENHANCED
const passiveIncomeTemplate: QuestionnaireTemplate = {
  id: 'passive-income-template-v1',
  goal_type: 'passive_income',
  template_name: 'Passive Income Strategy Builder',
  description: 'Create a personalized plan to generate sustainable income streams with minimal ongoing effort',
  questions:  goalsQuestionTemplate.filter(q => [
    'net_monthly_income',
    'investment_accounts',
    'real_estate_value',
    'other_assets',
    'risk_tolerance',
  ].includes(q.id)),
};

// Custom Goal Template - ENHANCED
const customGoalTemplate: QuestionnaireTemplate = {
  id: 'custom-goal-template-v1',
  goal_type: 'custom',
  template_name: 'Custom Goal Planner',
  description: 'Define and create a savings plan for any personal financial goal.',
  questions:  goalsQuestionTemplate.filter(q => [
    'current_age',
    'net_monthly_income',
    'savings_account',
    'emergency_fund',
    'risk_tolerance',
    'investment_timeline',
  ].includes(q.id)),
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
