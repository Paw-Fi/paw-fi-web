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

// Debt Payoff Goal Template
const debtPayoffTemplate: QuestionnaireTemplate = {
  goal_type: 'debt_payoff',
  template_name: 'Debt Payoff Plan',
  description: 'Create a personalized strategy to become debt-free faster.',
  questions: [
    {
      id: 'total_debt_amount',
      type: 'currency',
      category: 'financial',
      question: 'What is the total amount of debt you want to pay off?',
      description: 'Include credit cards, loans, etc.',
      validation: { min: 1, required: true },
      display_order: 1
    },
    {
      id: 'debt_type',
      type: 'multiple_choice',
      category: 'financial',
      question: 'What types of debt do you have? (Select all that apply)',
      options: [
        { value: 'credit_card', label: 'Credit Card' },
        { value: 'student_loan', label: 'Student Loan' },
        { value: 'auto_loan', label: 'Auto Loan' },
        { value: 'personal_loan', label: 'Personal Loan' },
        { value: 'medical_debt', label: 'Medical Debt' },
        { value: 'other', label: 'Other' }
      ],
      validation: { required: true },
      display_order: 2
    },
    {
      id: 'extra_payment_capacity',
      type: 'currency',
      category: 'financial',
      question: 'How much extra can you realistically pay towards your debt each month?',
      description: 'This is the amount above your minimum payments.',
      validation: { min: 0, required: true },
      display_order: 3
    },
    {
      id: 'payoff_preference',
      type: 'single_choice',
      category: 'strategy',
      question: 'Which payoff method do you prefer?',
      description: 'The "Avalanche" method saves more money, while "Snowball" provides motivation.',
      options: [
        { value: 'avalanche', label: 'Avalanche (Highest interest first)' },
        { value: 'snowball', label: 'Snowball (Smallest balance first)' },
        { value: 'recommend', label: 'Not sure, recommend one for me' }
      ],
      validation: { required: true },
      display_order: 4
    }
  ],
  ai_prompt_template: `You are a debt management expert. Based on the user's data, create a clear, actionable debt payoff plan.

USER QUESTIONNAIRE DATA:
{{QUESTIONNAIRE_DATA}}

Generate a response in the following JSON format:

{
  "goal": {
    "title": "Your Debt-Free Plan",
    "description": "A personalized strategy to eliminate your debt and build financial freedom.",
    "targetAmount": [total debt amount],
    "projectedPayoffDate": "YYYY-MM-DD",
    "rationale": "Explanation of the projected payoff date and the chosen strategy."
  },
  "strategy": {
     "name": "'Avalanche' or 'Snowball'",
     "description": "A detailed explanation of the chosen strategy and why it's recommended for the user's situation. If the user was unsure, explain why you chose one over the other."
  },
  "action_plan": [
    {
      "title": "Step 1: Focus on [Debt Name/Type]",
      "description": "Instructions to focus all extra payments on this debt while paying minimums on others.",
      "priority": "critical",
      "dueDate": "YYYY-MM-DD"
    },
    {
      "title": "Step 2: Roll over payments",
      "description": "Once the first debt is paid, roll that entire payment amount onto the next target debt.",
      "priority": "high",
      "dueDate": "YYYY-MM-DD"
    }
  ],
  "insights": [
    {
      "type": "strategy_insight",
      "title": "Potential Interest Savings",
      "content": "An estimate of how much money the user can save in interest by following this plan.",
      "priority": "high",
      "actionable": false
    },
    {
      "type": "actionable_tip",
      "title": "Accelerate Your Progress",
      "content": "Suggest one or two ways to pay off debt even faster, such as looking for opportunities to increase income or cut expenses.",
      "priority": "medium",
      "actionable": true
    }
  ]
}

CALCULATION GUIDELINES:
- Based on the payoff preference, determine the payoff order. If 'recommend', choose 'Avalanche' for mathematical optimality but acknowledge the psychological benefits of 'Snowball'.
- Calculate a realistic payoff timeline based on the total debt and the extra monthly payment capacity.
- Create a simple, 2-3 step action plan focusing on the process.`,
  ai_model_config: { model: 'gemini-2.5-flash', temperature: 0.6, max_tokens: 3000 },
  is_active: true,
  version: 1
};

// Emergency Fund Goal Template
const emergencyFundTemplate: QuestionnaireTemplate = {
  goal_type: 'emergency_fund',
  template_name: 'Emergency Fund Builder',
  description: 'Build a financial safety net for unexpected life events.',
  questions: [
    {
      id: 'monthly_essential_expenses',
      type: 'currency',
      category: 'financial',
      question: 'What are your essential monthly living expenses?',
      description: 'Include rent/mortgage, utilities, food, transportation, and insurance.',
      validation: { min: 100, required: true },
      display_order: 1
    },
    {
      id: 'current_emergency_savings',
      type: 'currency',
      category: 'financial',
      question: 'How much do you currently have in savings for emergencies?',
      description: 'Only include liquid cash you can access quickly (e.g., in a savings account).',
      validation: { min: 0, required: true },
      display_order: 2
    },
    {
      id: 'target_months',
      type: 'single_choice',
      category: 'timeline',
      question: 'How many months of expenses would you like to have saved?',
      options: [
        { value: '3', label: '3 Months', description: 'A standard safety net' },
        { value: '6', label: '6 Months', description: 'A more conservative buffer' },
        { value: '12', label: '12 Months', description: 'For variable income or maximum security' }
      ],
      validation: { required: true },
      display_order: 3
    },
    {
      id: 'monthly_contribution',
      type: 'currency',
      category: 'financial',
      question: 'How much can you save per month for your emergency fund?',
      description: 'Be realistic about what you can consistently set aside.',
      validation: { min: 1, required: true },
      display_order: 4
    }
  ],
  ai_prompt_template: `You are a pragmatic financial coach helping a user build their emergency fund. Your tone should be encouraging and clear.

USER QUESTIONNAIRE DATA:
{{QUESTIONNAIRE_DATA}}

Generate a response in the following JSON format:

{
  "goal": {
    "title": "Your Emergency Fund Plan",
    "description": "A strategic plan to build a financial safety net, giving you peace of mind.",
    "targetAmount": [calculated target amount],
    "targetDate": "YYYY-MM-DD",
    "rationale": "Your emergency fund target of [targetAmount] is based on [target_months] months of your essential expenses of [monthly_essential_expenses]."
  },
  "strategy": "A 1-2 paragraph strategy explaining the importance of an emergency fund and the plan to reach the goal. Recommend keeping the funds in a High-Yield Savings Account (HYSA) for safety and some growth. Explain the timeline based on their monthly contribution.",
  "milestones": [
    {
      "title": "Save Your First $1,000",
      "description": "This is a critical first step to handle small, unexpected emergencies without derailing your finances.",
      "type": "amount",
      "targetAmount": 1000,
      "dueDate": "YYYY-MM-DD",
      "priority": "critical",
      "aiRationale": "Achieving this first milestone provides an immediate psychological boost and a small safety net."
    },
    {
      "title": "Reach 50% of Your Goal",
      "description": "You're halfway there! This milestone represents significant progress towards financial security.",
      "type": "amount",
      "targetAmount": [50% of targetAmount],
      "dueDate": "YYYY-MM-DD",
      "priority": "high",
      "aiRationale": "Hitting the halfway point demonstrates commitment and makes the final goal feel much more attainable."
    },
    {
      "title": "Fully Funded!",
      "description": "Congratulations! You've reached your emergency fund goal and have a robust financial safety net.",
      "type": "amount",
      "targetAmount": [targetAmount],
      "dueDate": "YYYY-MM-DD",
      "priority": "high",
      "aiRationale": "Completing this goal is a major financial achievement that unlocks the ability to pursue other financial goals more aggressively."
    }
  ],
  "insights": [
    {
      "type": "actionable_tip",
      "title": "Automate Your Savings",
      "content": "The easiest way to reach your goal is to make it automatic. Set up an automatic transfer from your checking to your savings account for [monthly_contribution] each month.",
      "priority": "high",
      "actionable": true
    }
  ]
}

CALCULATION GUIDELINES:
- Target Amount = monthly_essential_expenses * target_months.
- Savings Needed = Target Amount - current_emergency_savings.
- Months to Goal = Savings Needed / monthly_contribution.
- Calculate the targetDate and all milestone dueDates based on the 'Months to Goal' calculation.
- Ensure milestones are logical. If the user has already saved over $1,000, the first milestone should be adjusted or removed.`,
  ai_model_config: { model: 'gemini-2.5-flash', temperature: 0.5, max_tokens: 3000 },
  is_active: true,
  version: 1
};

// Custom Goal Template
const customGoalTemplate: QuestionnaireTemplate = {
  goal_type: 'custom',
  template_name: 'Custom Goal Planner',
  description: 'Define and create a savings plan for any personal financial goal.',
  questions: [
    {
      id: 'goal_description',
      type: 'text',
      category: 'definition',
      question: 'What is your financial goal? Please be specific.',
      description: 'e.g., Save for a wedding, buy a new car, fund a dream vacation.',
      validation: { required: true },
      display_order: 1
    },
    {
      id: 'target_amount',
      type: 'currency',
      category: 'financial',
      question: 'How much money do you need to achieve this goal?',
      description: 'The total cost of your goal.',
      validation: { min: 1, required: true },
      display_order: 2
    },
    {
      id: 'target_date',
      type: 'date',
      category: 'timeline',
      question: 'By when do you want to achieve this goal?',
      description: 'Select your target deadline.',
      validation: { required: true },
      display_order: 3
    },
    {
      id: 'current_savings',
      type: 'currency',
      category: 'financial',
      question: 'How much have you already saved for this specific goal?',
      description: 'Enter 0 if you haven\'t started yet.',
      validation: { min: 0, required: true },
      display_order: 4
    },
    {
      id: 'monthly_contribution',
      type: 'currency',
      category: 'financial',
      question: 'How much can you realistically save each month towards this goal?',
      description: 'Consistency is key to reaching your goal.',
      validation: { min: 1, required: true },
      display_order: 5
    }
  ],
  ai_prompt_template: `You are a versatile financial planner. A user has defined a custom financial goal. Your task is to take their inputs and create a clear, structured, and motivating savings plan.

USER QUESTIONNAIRE DATA:
{{QUESTIONNAIRE_DATA}}

Generate a response in the following JSON format:

{
  "goal": {
    "title": "A concise, motivating title based on the user's goal_description",
    "description": "A 1-2 sentence summary of the goal and the plan to achieve it.",
    "targetAmount": [target_amount],
    "targetDate": "[target_date]",
    "rationale": "Explanation of the goal's feasibility based on the provided numbers."
  },
  "strategy": "A 1-2 paragraph strategy explaining the path to achieve this specific goal. Calculate the required monthly savings and compare it to the user's contribution. If there's a shortfall (user's monthly contribution is less than required), provide actionable advice on how to bridge the gap (e.g., 'To meet your deadline, you need to save X per month. You are currently saving Y. Here are some ideas to find an extra Z...'). If the user is on track or ahead, be encouraging.",
  "milestones": [
    {
      "title": "Save 25% of Your Goal",
      "description": "You've made a quarter of the way to your goal!",
      "type": "amount",
      "targetAmount": [25% of targetAmount],
      "dueDate": "YYYY-MM-DD",
      "priority": "medium",
      "aiRationale": "Breaking the goal into smaller chunks makes it more manageable and helps build momentum."
    },
    {
      "title": "Reach the Halfway Point",
      "description": "You're 50% there! Keep up the great work.",
      "type": "amount",
      "targetAmount": [50% of targetAmount],
      "dueDate": "YYYY-MM-DD",
      "priority": "high",
      "aiRationale": "This is a major milestone that shows your strategy is working."
    },
    {
      "title": "Goal Achieved!",
      "description": "Congratulations on achieving your goal!",
      "type": "amount",
      "targetAmount": [targetAmount],
      "dueDate": "[target_date]",
      "priority": "critical",
      "aiRationale": "You followed the plan and successfully reached your financial target."
    }
  ],
  "insights": [
    {
      "type": "savings_tip",
      "title": "Automate for Success",
      "content": "The most effective way to guarantee you'll meet your savings goal is to automate it. Set up a recurring transfer of [monthly_contribution] from your checking account to a dedicated savings account each payday.",
      "priority": "high",
      "actionable": true
    }
  ]
}

CALCULATION GUIDELINES:
- Title should be smart and derived from goal_description (e.g., if goal_description is "I want to buy a new honda civic", title could be "New Car Fund: Honda Civic").
- Calculate the total number of months between today and the target_date.
- Calculate required monthly savings: (target_amount - current_savings) / number of months.
- Compare required monthly savings with the user's monthly_contribution to form the core of the 'strategy' and 'rationale'.
- Calculate the dueDate for each milestone based on the user's stated monthly_contribution.`,
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
  debt_payoff: debtPayoffTemplate,
  emergency_fund: emergencyFundTemplate,
  custom: customGoalTemplate,

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
export type GoalType ='retirement' | 'home_buying' | 'wealth' | 'investment' | 'debt_payoff' | 'emergency_fund' | 'custom';
export type QuestionnaireData = Record<string, any>;