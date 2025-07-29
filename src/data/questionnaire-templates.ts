// Questionnaire Templates - Migrated from database seed data
// This file contains all questionnaire templates for different goal types

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
  options?: QuestionOption[];
  validation?: QuestionValidation;
  display_order: number;
}

export interface AIModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface QuestionnaireTemplate {
  goal_type: string;
  template_name: string;
  description: string;
  questions: Question[];
  ai_prompt_template: string;
  ai_model_config: AIModelConfig;
  is_active: boolean;
  version: number;
}

// Retirement Goal Template
const retirementTemplate: QuestionnaireTemplate = {
  goal_type: 'retirement',
  template_name: 'Retirement Planning Assessment',
  description: 'AI-driven assessment to create your personalized retirement savings strategy',
  questions: [
    {
      id: 'current_age',
      type: 'number',
      category: 'demographics',
      question: 'What is your current age?',
      description: 'This helps us calculate your investment horizon',
      validation: { min: 18, max: 80, required: true },
      display_order: 1
    },
    {
      id: 'retirement_age',
      type: 'number',
      category: 'timeline',
      question: 'At what age would you like to retire?',
      description: 'Your target retirement age affects how aggressively we need to save',
      validation: { min: 50, max: 80, required: true },
      display_order: 2
    },
    {
      id: 'current_income',
      type: 'currency',
      category: 'financial',
      question: 'What is your current annual income?',
      description: 'Used to calculate replacement income needed in retirement',
      validation: { min: 0, required: true },
      display_order: 3
    },
    {
      id: 'current_savings',
      type: 'currency',
      category: 'financial',
      question: 'How much have you already saved for retirement?',
      description: 'Include 401k, IRA, and other retirement accounts',
      validation: { min: 0, required: true },
      display_order: 4
    },
    {
      id: 'monthly_contribution',
      type: 'currency',
      category: 'financial',
      question: 'How much can you realistically save per month for retirement?',
      description: 'Be honest about what you can sustain long-term',
      validation: { min: 0, required: true },
      display_order: 5
    },
    {
      id: 'retirement_lifestyle',
      type: 'single_choice',
      category: 'preferences',
      question: 'What kind of retirement lifestyle do you envision?',
      options: [
        { value: 'modest', label: 'Modest - Basic needs covered', description: '60-70% of current income' },
        { value: 'comfortable', label: 'Comfortable - Maintain current lifestyle', description: '80-90% of current income' },
        { value: 'luxury', label: 'Luxury - Enhanced lifestyle with travel', description: '100%+ of current income' }
      ],
      validation: { required: true },
      display_order: 6
    },
    {
      id: 'risk_tolerance',
      type: 'single_choice',
      category: 'risk_profile',
      question: 'How do you feel about investment risk?',
      options: [
        { value: 'conservative', label: 'Conservative - Preserve capital', description: 'Lower returns, lower risk' },
        { value: 'moderate', label: 'Moderate - Balanced approach', description: 'Moderate returns, moderate risk' },
        { value: 'aggressive', label: 'Aggressive - Maximize growth', description: 'Higher returns, higher risk' }
      ],
      validation: { required: true },
      display_order: 7
    },
    {
      id: 'employer_match',
      type: 'percentage',
      category: 'financial',
      question: 'Does your employer match retirement contributions? If so, what percentage?',
      description: 'Free money - we will make sure you maximize this!',
      validation: { min: 0, max: 100 },
      display_order: 8
    }
  ],
  ai_prompt_template: `You are an expert financial advisor specializing in retirement planning. Based on the user's questionnaire responses, create a comprehensive, personalized retirement savings strategy.

USER QUESTIONNAIRE DATA:
{{QUESTIONNAIRE_DATA}}

Generate a response in the following JSON format:

{
  "goal": {
    "title": "Personalized title for their retirement goal",
    "description": "2-3 sentence description of their retirement strategy",
    "targetAmount": [calculated target amount needed],
    "targetDate": "YYYY-MM-DD format target retirement date",
    "rationale": "Explanation of how the target was calculated"
  },
  "strategy": "Detailed 2-3 paragraph strategy explaining the approach, key factors considered, and why this plan will work for them",
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Detailed milestone description",
      "type": "amount",
      "targetAmount": [if type is amount],
      "dueDate": "YYYY-MM-DD",
      "priority": "high",
      "aiRationale": "Why this milestone is important"
    }
  ],
  "insights": [
    {
      "type": "strategy_insight",
      "title": "Key insight title",
      "content": "Detailed insight explanation",
      "priority": "high",
      "actionable": true
    }
  ]
}

CALCULATION GUIDELINES:
- Use standard 4% retirement withdrawal rule
- Factor in inflation (assume 3% annually)
- Consider their risk tolerance for return assumptions:
  - Conservative: 5-6% annual return
  - Moderate: 7-8% annual return
  - Aggressive: 9-10% annual return
- Include employer match optimization
- Create 3-5 meaningful milestones spread across their timeline

Make all content personalized, encouraging, and actionable.`,
  ai_model_config: { model: 'gemini-2.5-flash', temperature: 0.7, max_tokens: 3000 },
  is_active: true,
  version: 1
};

// Home Buying Goal Template
const homeBuyingTemplate: QuestionnaireTemplate = {
  goal_type: 'home_buying',
  template_name: 'Home Purchase Planning',
  description: 'Create a personalized home buying savings strategy with timeline and milestones',
  questions: [
    {
      id: 'target_home_price',
      type: 'currency',
      category: 'financial',
      question: 'What is your target home purchase price?',
      description: 'Consider the price range in your desired area',
      validation: { min: 50000, required: true },
      display_order: 1
    },
    {
      id: 'down_payment_percentage',
      type: 'percentage',
      category: 'financial',
      question: 'What percentage do you want to put down?',
      description: '20% avoids PMI, but lower is possible',
      validation: { min: 3, max: 50, required: true },
      display_order: 2
    },
    {
      id: 'current_savings',
      type: 'currency',
      category: 'financial',
      question: 'How much have you already saved for this home?',
      description: 'Include all funds designated for home purchase',
      validation: { min: 0, required: true },
      display_order: 3
    },
    {
      id: 'monthly_savings_capacity',
      type: 'currency',
      category: 'financial',
      question: 'How much can you save per month toward this goal?',
      description: 'Be realistic about your monthly budget',
      validation: { min: 0, required: true },
      display_order: 4
    },
    {
      id: 'desired_timeline',
      type: 'single_choice',
      category: 'timeline',
      question: 'When would you like to purchase your home?',
      options: [
        { value: '1_year', label: 'Within 1 year', description: 'Aggressive saving required' },
        { value: '2_years', label: 'Within 2 years', description: 'Moderate saving pace' },
        { value: '3_years', label: 'Within 3 years', description: 'Comfortable saving pace' },
        { value: '5_years', label: 'Within 5 years', description: 'Long-term planning' }
      ],
      validation: { required: true },
      display_order: 5
    },
    {
      id: 'additional_costs',
      type: 'multiple_choice',
      category: 'planning',
      question: 'Which additional costs do you want to save for?',
      options: [
        { value: 'closing_costs', label: 'Closing costs (2-5% of home price)' },
        { value: 'moving_expenses', label: 'Moving expenses' },
        { value: 'immediate_repairs', label: 'Immediate repairs/improvements' },
        { value: 'emergency_fund', label: 'Home emergency fund' },
        { value: 'furniture', label: 'New furniture/appliances' }
      ],
      validation: { required: true },
      display_order: 6
    }
  ],
  ai_prompt_template: `You are a real estate financial advisor helping someone plan their home purchase. Create a comprehensive savings strategy based on their responses.

USER QUESTIONNAIRE DATA:
{{QUESTIONNAIRE_DATA}}

Generate a response in the following JSON format with realistic calculations for home buying costs and savings timeline:

{
  "goal": {
    "title": "string - Clear, motivating goal title",
    "description": "string - Detailed description of the goal",
    "targetAmount": number - Total amount needed (down payment + closing costs + additional costs),
    "targetDate": "YYYY-MM-DD - Target purchase date",
    "rationale": "string - AI explanation of why this goal makes sense"
  },
  "strategy": "string - Comprehensive savings strategy and recommendations",
  "milestones": [
    {
      "title": "string - Milestone name",
      "description": "string - What this milestone represents",
      "type": "amount" | "habit" | "action" | "date",
      "targetAmount": number - Optional, for amount-based milestones,
      "dueDate": "YYYY-MM-DD - When this should be completed",
      "habitDescription": "string - Optional, for habit milestones",
      "frequency": "daily" | "weekly" | "monthly" | "one-time",
      "habitTargetValue": number - Optional, for habit milestones,
      "priority": "low" | "medium" | "high" | "critical",
      "aiRationale": "string - Why this milestone is important"
    }
  ],
  "insights": [
    {
      "type": "savings" | "timeline" | "market" | "strategy",
      "title": "string - Insight title",
      "content": "string - Detailed insight content",
      "priority": "low" | "medium" | "high",
      "actionable": boolean - Whether this requires user action
    }
  ],
  "projections": {
    "monthlyRequired": number - Monthly savings needed to meet goal,
    "projectedFinalAmount": number - Total projected savings,
    "confidenceLevel": number - AI confidence in projections (0-1)
  }
}

Ensure all calculations are accurate and the strategy is personalized to their specific situation.`,
  ai_model_config: { model: 'gemini-2.5-flash', temperature: 0.7, max_tokens: 3000 },
  is_active: true,
  version: 1
};

// Wealth Building Goal Template
const wealthTemplate: QuestionnaireTemplate = {
  goal_type: 'wealth',
  template_name: 'Wealth Building Strategy',
  description: 'Develop a personalized wealth accumulation plan with investment strategy',
  questions: [
    {
      id: 'wealth_target',
      type: 'currency',
      category: 'financial',
      question: 'What is your wealth accumulation target?',
      description: 'The total amount you want to accumulate',
      validation: { min: 10000, required: true },
      display_order: 1
    },
    {
      id: 'current_net_worth',
      type: 'currency',
      category: 'financial',
      question: 'What is your current estimated net worth?',
      description: 'Assets minus liabilities',
      validation: { min: 0, required: true },
      display_order: 2
    },
    {
      id: 'monthly_investment',
      type: 'currency',
      category: 'financial',
      question: 'How much can you invest monthly toward wealth building?',
      description: 'Amount available for investments after expenses',
      validation: { min: 0, required: true },
      display_order: 3
    },
    {
      id: 'time_horizon',
      type: 'single_choice',
      category: 'timeline',
      question: 'What is your timeline for reaching this wealth target?',
      options: [
        { value: '5_years', label: '5 years', description: 'Aggressive growth needed' },
        { value: '10_years', label: '10 years', description: 'Moderate growth strategy' },
        { value: '15_years', label: '15 years', description: 'Balanced approach' },
        { value: '20_plus', label: '20+ years', description: 'Long-term wealth building' }
      ],
      validation: { required: true },
      display_order: 4
    },
    {
      id: 'investment_experience',
      type: 'single_choice',
      category: 'risk_profile',
      question: 'What is your investment experience level?',
      options: [
        { value: 'beginner', label: 'Beginner', description: 'New to investing' },
        { value: 'intermediate', label: 'Intermediate', description: 'Some investment experience' },
        { value: 'advanced', label: 'Advanced', description: 'Experienced investor' }
      ],
      validation: { required: true },
      display_order: 5
    }
  ],
  ai_prompt_template: `You are a wealth management advisor creating a personalized wealth building strategy. Focus on investment allocation, growth strategies, and milestone planning.

USER QUESTIONNAIRE DATA:
{{QUESTIONNAIRE_DATA}}

Create a comprehensive wealth building plan with specific investment strategies and milestone targets.`,
  ai_model_config: { model: 'gemini-2.5-flash', temperature: 0.7, max_tokens: 3000 },
  is_active: true,
  version: 1
};

// Investment Goal Template
const investmentTemplate: QuestionnaireTemplate = {
  goal_type: 'investment',
  template_name: 'Investment Portfolio Planning',
  description: 'Create a targeted investment strategy for specific financial objectives',
  questions: [
    {
      id: 'investment_purpose',
      type: 'single_choice',
      category: 'purpose',
      question: 'What is the primary purpose of this investment?',
      options: [
        { value: 'education', label: 'Education funding', description: 'College or education expenses' },
        { value: 'major_purchase', label: 'Major purchase', description: 'Car, vacation, etc.' },
        { value: 'business', label: 'Business investment', description: 'Start or expand business' },
        { value: 'income', label: 'Income generation', description: 'Dividend/rental income' },
        { value: 'growth', label: 'Long-term growth', description: 'Capital appreciation' }
      ],
      validation: { required: true },
      display_order: 1
    },
    {
      id: 'investment_amount',
      type: 'currency',
      category: 'financial',
      question: 'How much do you want to invest initially?',
      description: 'Your starting investment amount',
      validation: { min: 100, required: true },
      display_order: 2
    },
    {
      id: 'regular_contributions',
      type: 'currency',
      category: 'financial',
      question: 'How much will you invest regularly (monthly)?',
      description: 'Additional monthly contributions',
      validation: { min: 0, required: true },
      display_order: 3
    },
    {
      id: 'target_return',
      type: 'percentage',
      category: 'expectations',
      question: 'What annual return are you targeting?',
      description: 'Realistic expectation for annual returns',
      validation: { min: 1, max: 30, required: true },
      display_order: 4
    },
    {
      id: 'risk_comfort',
      type: 'single_choice',
      category: 'risk_profile',
      question: 'How comfortable are you with investment risk?',
      options: [
        { value: 'low', label: 'Low risk', description: 'Prefer stable, predictable returns' },
        { value: 'moderate', label: 'Moderate risk', description: 'Accept some volatility for higher returns' },
        { value: 'high', label: 'High risk', description: 'Comfortable with significant volatility' }
      ],
      validation: { required: true },
      display_order: 5
    }
  ],
  ai_prompt_template: `You are an investment advisor creating a personalized investment strategy. Focus on asset allocation, risk management, and performance tracking.

USER QUESTIONNAIRE DATA:
{{QUESTIONNAIRE_DATA}}

Generate a detailed investment plan with specific recommendations and milestone tracking.`,
  ai_model_config: { model: 'gemini-2.5-flash', temperature: 0.7, max_tokens: 3000 },
  is_active: true,
  version: 1
};

// Export all templates
export const QUESTIONNAIRE_TEMPLATES: Record<string, QuestionnaireTemplate> = {
  retirement: retirementTemplate,
  home_buying: homeBuyingTemplate,
  wealth: wealthTemplate,
  investment: investmentTemplate,
};

// Helper function to get template by goal type
export function getQuestionnaireTemplate(goalType: string): QuestionnaireTemplate | undefined {
  return QUESTIONNAIRE_TEMPLATES[goalType];
}

// Helper function to get all active templates
export function getActiveQuestionnaireTemplates(): QuestionnaireTemplate[] {
  return Object.values(QUESTIONNAIRE_TEMPLATES).filter(template => template.is_active);
}

// Export types for use in other files
export type GoalType = keyof typeof QUESTIONNAIRE_TEMPLATES;
export type QuestionnaireData = Record<string, any>;
