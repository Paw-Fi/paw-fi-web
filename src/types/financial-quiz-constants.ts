/**
 * Shared constants and types for the Financial Health Quiz
 * Used by both the quiz component and profile settings page
 */

// Types
export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export type QuestionCategory =
  | "current-situation"
  | "liquidity-needs"
  | "risk-assessment"
  | "time-horizon"
  | "financial-goals"
  | "goal-specific";

export type QuestionType = 
  | "text"
  | "number" 
  | "currency"
  | "percentage"
  | "date"
  | "single_choice"
  | "multiple_choice"
  | "rating_scale"
  | "slider"
  | "text_area"
  | "debt_list";

export interface QuestionValidation {
  required?: boolean;
  min?: number;
  max?: number;
  min_length?: number;
  min_items?: number;
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
  category: QuestionCategory;
  question: string;
  description?: string;
  placeholder?: string;
  options?: QuestionOption[];
  validation: QuestionValidation;
  conditional_logic?: ConditionalLogic;
  display_order: number;
  layout?: {
    colSpan?: number;
  };
  item_schema?: any[]; // For debt_list type
  unit?: string;
  step?: number;
  optionsPerRow?: 2 | 3 | 4;
}

// Backwards compatibility alias
export type QuizQuestion = Question;


export interface CategoryInfo {
  id: QuestionCategory;
  title: string;
  description: string;
  color: string;
}

// Financial Profile Data Interface
export interface FinancialProfileData {
  // Current Situation
  'current-age': number;
  'gross-monthly-income': number;
  'net-monthly-income': number;
  'total-monthly-expenses': number;
  'cash-savings': number;
  'pension-value': number;
  'monthly-pension-contribution': number;
  'other-investments': number;
  'number-of-dependents': number;
  'housing-situation': string;
  'total-debt-amount': number;
  'average-debt-interest': string;
  'emergency-fund': number;
  'insurance-coverage': string[];

  // Financial Goals
  'retirement-age': number;
  'target-retirement': number;
  'financial-priorities': string[];
  'investment-goals': string[];
  'time-horizon': string;
  'expect-lump-sum': string;

  // Risk Assessment
  'predictable-income': string;
  'high-risk-preference': string;
  'risky-investments': string;
  'market-downturn': string;
  'investment-knowledge': string;
  'liquidity-importance': string;
}

// Default profile data
export const defaultProfileData: FinancialProfileData = {
  'current-age': 0,
  'gross-monthly-income': 0,
  'net-monthly-income': 0,
  'total-monthly-expenses': 0,
  'cash-savings': 0,
  'pension-value': 0,
  'monthly-pension-contribution': 0,
  'other-investments': 0,
  'number-of-dependents': 0,
  'housing-situation': '',
  'total-debt-amount': 0,
  'average-debt-interest': '',
  'emergency-fund': 0,
  'insurance-coverage': [],
  'retirement-age': 0,
  'target-retirement': 0,
  'financial-priorities': [],
  'investment-goals': [],
  'time-horizon': '',
  'expect-lump-sum': '',
  'predictable-income': '',
  'high-risk-preference': '',
  'risky-investments': '',
  'market-downturn': '',
  'investment-knowledge': '',
  'liquidity-importance': ''
};

// Question option constants
export const housingOptions: QuestionOption[] = [
  { value: "rent", label: "Renting" },
  { value: "own-mortgage", label: "Own with mortgage" },
  { value: "own-paid", label: "Own outright (no mortgage)" },
  { value: "other", label: "Other arrangement" },
];

export const debtInterestOptions: QuestionOption[] = [
  { value: "none", label: "I don't have any debt" },
  { value: "low", label: "Low (under 7%)" },
  { value: "medium", label: "Medium (8-15%)" },
  { value: "high", label: "High (16%+)" },
];

export const insuranceOptions: QuestionOption[] = [
  { value: "health", label: "Health insurance" },
  { value: "life", label: "Life insurance" },
  { value: "disability", label: "Disability insurance" },
  { value: "auto", label: "Auto insurance" },
  { value: "home", label: "Home/renters insurance" },
  { value: "umbrella", label: "Umbrella policy" },
];

export const financialPriorityOptions: QuestionOption[] = [
  { value: "debt-reduction", label: "Reducing debt" },
  { value: "emergency-fund", label: "Building emergency fund" },
  { value: "retirement", label: "Retirement savings" },
  { value: "home", label: "Buying a home" },
  { value: "education", label: "Education savings" },
  { value: "income", label: "Increasing income" },
  { value: "tax-efficiency", label: "Tax efficiency" },
  { value: "estate-planning", label: "Estate planning" },
];

export const investmentGoalOptions: QuestionOption[] = [
  { value: "retirement", label: "Retirement" },
  { value: "education", label: "Education" },
  { value: "home", label: "Home purchase" },
  { value: "wealth", label: "General wealth building" },
  { value: "income", label: "Generate income" },
];

export const lumpSumOptions: QuestionOption[] = [
  { value: "no", label: "No" },
  { value: "within-2-years", label: "Yes, within 2 years" },
  { value: "2-10-years", label: "Yes, in 2-10 years" },
  { value: "10-plus-years", label: "Yes, in 10+ years" },
];

export const yesNoOptions: QuestionOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" }
];

export const marketDownturnOptions: QuestionOption[] = [
  { value: "sell", label: "Sell to prevent further losses" },
  { value: "worried", label: "Worried but would not sell" },
  { value: "wait", label: "Wait and see before making changes" },
  { value: "buy-more", label: "Buy more investments at lower prices" },
];

export const investmentKnowledgeOptions: QuestionOption[] = [
  { value: "beginner", label: "Beginner - Limited knowledge" },
  { value: "intermediate", label: "Intermediate - Understand basics" },
  { value: "advanced", label: "Advanced - Comfortable with complex investments" },
  { value: "expert", label: "Expert - Professional knowledge" },
];

export const timeHorizonOptions: QuestionOption[] = [
  { value: "short", label: "Short term (0-3 years)" },
  { value: "medium", label: "Medium term (3-7 years)" },
  { value: "long", label: "Long term (7+ years)" },
];

export const liquidityOptions: QuestionOption[] = [
  { value: "very-important", label: "Very important - Need frequent access" },
  { value: "important", label: "Important - May need occasional access" },
  { value: "somewhat-important", label: "Somewhat important - Rarely need access" },
  { value: "not-important", label: "Not important - Can lock up funds long-term" },
];

// Category information
export const categories: CategoryInfo[] = [
  {
    id: "current-situation",
    title: "The Snapshot (You Today)",
    description: "Core facts about your current finances",
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "financial-goals",
    title: "The Destination (Your Goals)",
    description: "What you want your money to achieve",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "risk-assessment",
    title: "The Journey (Your Risk Profile)",
    description: "How you handle the ups and downs",
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "time-horizon",
    title: "Time Horizon",
    description: "When will you need your investments?",
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "liquidity-needs",
    title: "Liquidity Needs",
    description: "How quickly might you need access to your money?",
    color: "bg-green-100 text-green-600",
  },
  {
    id: "goal-specific",
    title: "Goal Specifics",
    description: "Questions related to your specific financial goal.",
    color: "bg-pink-100 text-pink-600",
  }
];

// Debt detail interface for repeater component
export interface DebtDetail {
  id: string;
  type: string;
  amount: number;
  interestRate: number;
}

export const debtTypes = [
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'student-loan', label: 'Student Loan' },
  { value: 'personal-loan', label: 'Personal Loan' },
  { value: 'auto-loan', label: 'Auto Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'medical-debt', label: 'Medical Debt' },
  { value: 'other', label: 'Other' },
];

// Utility function to map quiz answers to profile data
export function mapQuizAnswersToProfileData(answers: Record<string, any>): Partial<FinancialProfileData> {
  const mappedData: Partial<FinancialProfileData> = {};

  Object.keys(defaultProfileData).forEach(key => {
    if (answers[key] !== undefined) {
      mappedData[key as keyof FinancialProfileData] = answers[key];
    }
  });

  return mappedData;
}

// Quiz questions array (moved from quiz component for reusability)
export const goalsQuestionTemplate: Question[] = [
  // === THE SNAPSHOT (You Today) ===
  {
    id: "current-age",
    question: "What is your current age?",
    description: "This helps us calculate your retirement timeline.",
    type: "number",
    category: "current-situation",
    validation: { min: 18, max: 100, required: true },
    display_order: 1,
  },
  {
    id: "gross-monthly-income",
    question: "What is your gross monthly income before taxes?",
    description: "Your total monthly income before any deductions.",
    type: "number",
    unit: "$",
    category: "current-situation",
    validation: { min: 0, required: true },
    display_order: 2,
  },
  {
    id: "net-monthly-income",
    question: "What is your net monthly take-home pay?",
    description: "Your monthly income after taxes and deductions.",
    type: "number",
    unit: "$",
    category: "current-situation",
    validation: { min: 0, required: true },
    display_order: 3,
  },
  {
    id: "total-monthly-expenses",
    question: "What are your total average monthly expenses?",
    description: "Estimate your total monthly spending, including rent/mortgage, bills, groceries, and entertainment.",
    type: "number",
    unit: "$",
    category: "current-situation",
    placeholder: "e.g., 3500",
    validation: { min: 0, required: true },
    display_order: 4,
  },
  {
    id: "cash-savings",
    question: "How much do you have in cash savings?",
    description: "Bank accounts, savings accounts, money market accounts.",
    type: "number",
    unit: "$",
    category: "current-situation",
    validation: { min: 0, required: true },
    display_order: 5,
  },
  {
    id: "pension-value",
    question: "What is the current value of all your pension/retirement accounts?",
    description: "401(k), IRA, pension plans, and other retirement accounts.",
    type: "number",
    unit: "$",
    category: "current-situation",
    validation: { min: 0, required: true },
    display_order: 6,
  },
  {
    id: "monthly-pension-contribution",
    question: "How much do you contribute monthly to pension/retirement accounts?",
    description: "Your regular monthly contributions to 401(k), IRA, etc.",
    type: "number",
    unit: "$",
    category: "current-situation",
    validation: { min: 0, required: true },
    display_order: 7,
  },
  {
    id: "other-investments",
    question: "What is the value of your other investments?",
    description: "Stocks, bonds, mutual funds, real estate investments (excluding your home).",
    type: "number",
    unit: "$",
    category: "current-situation",
    validation: { min: 0, required: true },
    display_order: 8,
  },
  {
    id: "number-of-dependents",
    question: "How many dependents do you have?",
    description: "Children, elderly parents, or others who depend on you financially.",
    type: "number",
    category: "current-situation",
    validation: { min: 0, max: 20, required: true },
    display_order: 9,
  },
  {
    id: "housing-situation",
    question: "What is your current housing situation?",
    description: "This helps us understand your housing expenses and assets.",
    type: "single_choice",
    options: housingOptions,
    category: "current-situation",
    validation: { required: true },
    display_order: 10,
  },
  {
    id: "total-debt-amount",
    question: "Roughly how much non-mortgage debt do you have?",
    description: "Include credit cards, car loans, student loans, personal loans, etc. Exclude your mortgage.",
    type: "number",
    unit: "$",
    category: "current-situation",
    placeholder: "e.g., 15000",
    validation: { min: 0, required: true },
    display_order: 11,
  },
  {
    id: "average-debt-interest",
    question: "What's the approximate average interest rate on your debt?",
    description: "If you have multiple debts, estimate the average rate across all of them.",
    type: "single_choice",
    options: debtInterestOptions,
    category: "current-situation",
    validation: { required: true },
    display_order: 12,
  },
  {
    id: "emergency-fund",
    question: "How much do you have set aside for emergencies?",
    description: "This is your safety net for unexpected expenses like job loss or medical bills. Separate from your regular savings.",
    type: "number",
    unit: "$",
    category: "liquidity-needs",
    placeholder: "e.g., 5000",
    validation: { min: 0, required: true },
    display_order: 13,
  },
  {
    id: "insurance-coverage",
    question: "Which types of insurance coverage do you currently have?",
    description: "Select all that apply to your current situation.",
    type: "multiple_choice",
    options: insuranceOptions,
    optionsPerRow: 3,
    category: "current-situation",
    validation: { required: true },
    display_order: 14,
  },

  // === THE DESTINATION (Your Goals) ===
  {
    id: "retirement-age",
    question: "At what age do you plan to retire?",
    description: "This helps us calculate your investment horizon.",
    type: "number",
    category: "financial-goals",
    validation: { min: 50, max: 100, required: true },
    display_order: 15,
  },
  {
    id: "target-retirement",
    question: "What is your target retirement fund goal?",
    description: "The amount you would like to have saved by retirement.",
    type: "number",
    unit: "$",
    category: "financial-goals",
    validation: { min: 0, required: true },
    display_order: 16,
  },
  {
    id: "financial-priorities",
    question: "What are your top financial priorities right now?",
    description: "Select that are most important to you.",
    type: "multiple_choice",
    options: financialPriorityOptions,
    optionsPerRow: 3,
    category: "financial-goals",
    validation: { required: true },
    display_order: 17,
  },
  {
    id: "investment-goals",
    question: "What are your primary investment goals?",
    description: "Select all that apply to your situation.",
    type: "multiple_choice",
    options: investmentGoalOptions,
    optionsPerRow: 3,
    category: "financial-goals",
    validation: { required: true },
    display_order: 18,
  },
  {
    id: "time-horizon",
    question: "When do you expect to need most of your investments?",
    description: "This helps determine appropriate investment vehicles.",
    type: "single_choice",
    options: timeHorizonOptions,
    optionsPerRow: 3,
    category: "time-horizon",
    validation: { required: true },
    display_order: 19,
  },
  {
    id: "expect-lump-sum",
    question: "Do you expect to receive a significant sum of money ($10,000+) in the future?",
    description: "Future windfalls may impact your investment horizon and risk tolerance.",
    type: "single_choice",
    options: lumpSumOptions,
    optionsPerRow: 2,
    category: "financial-goals",
    validation: { required: true },
    display_order: 20,
  },

  // === THE JOURNEY (Your Risk Profile) ===
  {
    id: "predictable-income",
    question: "Do you have a job with predictable income?",
    description: "Income stability affects how much risk you might be able to take on.",
    type: "single_choice",
    options: yesNoOptions,
    category: "risk-assessment",
    validation: { required: true },
    display_order: 21,
  },
  {
    id: "high-risk-preference",
    question: "Would you prefer a strategy that offers high returns despite the high risk?",
    description: "Your preference for risk vs. return is a key factor in portfolio design.",
    type: "single_choice",
    options: yesNoOptions,
    category: "risk-assessment",
    validation: { required: true },
    display_order: 22,
  },
  {
    id: "risky-investments",
    question: "Have you ever invested in highly risky assets (e.g. individual stocks, cryptocurrency, private equity)?",
    description: "Past investment experience can indicate comfort with certain types of risk.",
    type: "single_choice",
    options: yesNoOptions,
    category: "risk-assessment",
    validation: { required: true },
    display_order: 23,
  },
  {
    id: "market-downturn",
    question: "How would you react to a 20% market downturn?",
    description: "This helps assess your emotional response to market volatility.",
    type: "single_choice",
    options: marketDownturnOptions,
    category: "risk-assessment",
    validation: { required: true },
    display_order: 24,
  },
  {
    id: "investment-knowledge",
    question: "How would you rate your investment knowledge?",
    description: "Be honest about your familiarity with investment concepts.",
    type: "single_choice",
    options: investmentKnowledgeOptions,
    category: "risk-assessment",
    validation: { required: true },
    display_order: 25,
  },
  {
    id: "liquidity-importance",
    question: "How important is liquidity (quick access to your money) to you?",
    description: "This helps determine suitable investment types.",
    type: "single_choice",
    options: liquidityOptions,
    category: "liquidity-needs",
    validation: { required: true },
    display_order: 26,
  },

  // === GOAL SPECIFIC QUESTIONS ===

  // Retirement
  {
    id: 'current_annual_income',
    type: 'currency',
    category: 'goal-specific',
    question: 'What is your current annual pre-tax income?',
    description: 'Used to calculate replacement income needed in retirement',
    validation: { min: 0, required: true },
    display_order: 27,
  },
  {
    id: 'retirement_savings',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much have you already saved for retirement?',
    description: 'Include 401k, IRA, and other retirement accounts',
    validation: { min: 0, required: true },
    display_order: 28,
  },
  {
    id: 'existing_retirement_accounts',
    type: 'multiple_choice',
    category: 'goal-specific',
    question: 'In which types of accounts are your retirement savings held?',
    options: [
      { value: '401k_or_403b', label: 'Workplace Plan (401k, 403b)' },
      { value: 'traditional_ira', label: 'Traditional IRA' },
      { value: 'roth_ira', label: 'Roth IRA' },
      { value: 'brokerage', label: 'Taxable Brokerage Account' },
      { value: 'other', label: 'Other' }
    ],
    validation: { required: true },
    display_order: 29,
  },
  {
    id: 'retirement_lifestyle',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'What kind of retirement lifestyle do you envision?',
    options: [
      { value: 'modest', label: 'Modest - Basic needs covered', description: '60-70% of current income' },
      { value: 'comfortable', label: 'Comfortable - Maintain current lifestyle', description: '80-90% of current income' },
      { value: 'luxury', label: 'Luxury - Enhanced lifestyle with travel', description: '100%+ of current income' }
    ],
    validation: { required: true },
    display_order: 30,
  },
  {
    id: 'risk_tolerance',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'How do you feel about investment risk?',
    options: [
      { value: 'conservative', label: 'Conservative - Preserve capital', description: 'Lower returns, lower risk' },
      { value: 'moderate', label: 'Moderate - Balanced approach', description: 'Moderate returns, moderate risk' },
      { value: 'aggressive', label: 'Aggressive - Maximize growth', description: 'Higher returns, higher risk' }
    ],
    validation: { required: true },
    display_order: 31,
  },
  {
    id: 'employer_match',
    type: 'percentage',
    category: 'goal-specific',
    question: 'Does your employer match retirement contributions? If so, what percentage?',
    description: 'Free money - we will make sure you maximize this!',
    validation: { min: 0, max: 100 },
    display_order: 32,
  },
  {
    id: 'social_security_estimate',
    type: 'currency',
    category: 'goal-specific',
    question: 'What is your estimated monthly Social Security benefit at retirement? (Optional)',
    description: 'You can get an estimate from the official SSA.gov website. Leave blank if unsure.',
    validation: { min: 0, required: false },
    display_order: 33,
  },

  // Home Buying
  {
    id: 'target_location',
    type: 'text',
    category: 'goal-specific',
    question: 'In which city and state are you planning to buy?',
    description: 'e.g., "Austin, Texas". This helps estimate property taxes and closing costs.',
    validation: { required: true },
    display_order: 34,
  },
  {
    id: 'target_home_price',
    type: 'currency',
    category: 'goal-specific',
    question: 'What is your target home purchase price?',
    description: 'Consider the price range in your desired area',
    validation: { min: 50000, required: true },
    display_order: 35,
  },
  {
    id: 'down_payment_percentage',
    type: 'percentage',
    category: 'goal-specific',
    question: 'What percentage do you want to put down?',
    description: '20% avoids PMI, but lower is possible',
    validation: { min: 3, max: 50, required: true },
    display_order: 36,
  },
  {
    id: 'home_purchase_savings',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much have you already saved for this home?',
    description: 'Include all funds designated for home purchase',
    validation: { min: 0, required: true },
    display_order: 37,
  },
  {
    id: 'monthly_savings_capacity',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much can you save per month toward this goal?',
    description: 'Be realistic about your monthly budget',
    validation: { min: 0, required: true },
    display_order: 38,
  },
  {
    id: 'desired_timeline_years',
    type: "number",
    category: 'goal-specific',
    question: 'In how many years would you like to purchase your home?',
    description: 'e.g., 1.5, 2, 3, 5 years',
    validation: { required: true, min: 0.5 },
    display_order: 39,
  },
  {
    id: 'credit_score_range',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'What is your current estimated credit score range?',
    options: [
      { value: 'excellent', label: 'Excellent (740+)' },
      { value: 'good', label: 'Good (670-739)' },
      { value: 'fair', label: 'Fair (580-669)' },
      { value: 'poor', label: 'Needs Improvement (Below 580)' }
    ],
    validation: { required: true },
    display_order: 40,
  },
  {
    id: 'additional_costs',
    type: 'multiple_choice',
    category: 'goal-specific',
    question: 'Which additional costs do you want to save for?',
    options: [
      { value: 'closing_costs', label: 'Closing costs (3-5% of home price)' },
      { value: 'moving_expenses', label: 'Moving expenses' },
      { value: 'immediate_repairs', label: 'Immediate repairs/improvements' },
      { value: 'emergency_fund', label: 'Home emergency fund' },
      { value: 'furniture', label: 'New furniture/appliances' }
    ],
    validation: { required: true },
    display_order: 41,
  },

  // Wealth
  {
    id: 'wealth_target',
    type: 'currency',
    category: 'goal-specific',
    question: 'What is your wealth accumulation target?',
    description: 'The total net worth you want to achieve.',
    validation: { min: 10000, required: true },
    display_order: 42,
  },
  {
    id: 'current_net_worth',
    type: 'currency',
    category: 'goal-specific',
    question: 'What is your current estimated net worth?',
    description: 'Assets (savings, investments) minus liabilities (debts).',
    validation: { required: true },
    display_order: 43,
  },
  {
    id: 'monthly_investment',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much can you invest monthly toward wealth building?',
    description: 'Amount available for investments after expenses.',
    validation: { min: 0, required: true },
    display_order: 44,
  },
  {
    id: 'investment_experience',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'What is your investment experience level?',
    options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ],
    validation: { required: true },
    display_order: 45,
  },

  // Investment
  {
    id: 'investment_purpose',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'What is the primary purpose of this investment?',
    options: [
      { value: 'education', label: 'Education funding' },
      { value: 'major_purchase', label: 'Major purchase (car, vacation, etc.)' },
      { value: 'business', label: 'Business investment' },
      { value: 'income', label: 'Income generation' },
      { value: 'growth', label: 'General long-term growth' }
    ],
    validation: { required: true },
    display_order: 46,
  },
  {
    id: 'time_horizon_years',
    type: 'number',
    category: 'goal-specific',
    question: 'In how many years will you need to access the majority of this money?',
    description: 'Your timeline is crucial for determining risk.',
    validation: { min: 0.5, required: true },
    display_order: 47,
  },
  {
    id: 'investment_amount',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much do you want to invest initially?',
    description: 'Your starting investment amount',
    validation: { min: 100, required: true },
    display_order: 48,
  },
  {
    id: 'regular_contributions',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much will you invest regularly (monthly)?',
    description: 'Additional monthly contributions',
    validation: { min: 0, required: true },
    display_order: 49,
  },
  {
    id: 'risk_comfort',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'How comfortable are you with investment risk for this goal?',
    options: [
      { value: 'low', label: 'Low risk - I need to protect my initial investment.' },
      { value: 'moderate', label: 'Moderate risk - I can accept some volatility for better returns.' },
      { value: 'high', label: 'High risk - I am comfortable with significant volatility for high growth potential.' }
    ],
    validation: { required: true },
    display_order: 50,
  },

  // Debt Payoff
  {
    id: 'debts',
    type: 'debt_list',
    category: 'goal-specific',
    question: 'List your individual debts below.',
    description: 'Add each debt you want to pay off, including credit cards and loans. Be as accurate as possible.',
    item_schema: [
      { "id": "debt_name", "type": "text", "label": "Debt Name (e.g., 'Chase Credit Card')" },
      { "id": "balance", "type": "currency", "label": "Current Balance" },
      { "id": "interest_rate", "type": "percentage", "label": "Interest Rate (APR)" },
      { "id": "min_payment", "type": "currency", "label": "Minimum Monthly Payment" }
    ],
    validation: { required: true, min_items: 1 },
    display_order: 51,
  },
  {
    id: 'extra_payment_capacity',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much EXTRA can you pay towards your debt each month?',
    description: 'This is the amount *above* your total minimum payments that you can commit.',
    validation: { min: 0, required: true },
    display_order: 52,
  },
  {
    id: 'payoff_preference',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'Which payoff method do you prefer?',
    description: 'The "Avalanche" method saves more money on interest, while "Snowball" provides quick wins for motivation.',
    options: [
      { value: 'avalanche', label: 'Avalanche (Highest interest first)' },
      { value: 'snowball', label: 'Snowball (Smallest balance first)' },
      { value: 'recommend', label: 'Not sure, recommend one for me' }
    ],
    validation: { required: true },
    display_order: 53,
  },

  // Emergency Fund
  {
    id: 'monthly_essential_expenses',
    type: 'currency',
    category: 'goal-specific',
    question: 'What are your essential monthly living expenses?',
    description: 'Include only what you absolutely need: rent/mortgage, utilities, food, transportation, insurance.',
    validation: { min: 100, required: true },
    display_order: 54,
  },
  {
    id: 'income_stability',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'How stable is your household income?',
    options: [
      { value: 'stable', label: 'Very Stable (e.g., salaried employee, dual-income)' },
      { value: 'somewhat_stable', label: 'Somewhat Stable (e.g., consistent freelance work)' },
      { value: 'variable', label: 'Variable or Unstable (e.g., commission-based, irregular work)' }
    ],
    validation: { required: true },
    display_order: 55,
  },
  {
    id: 'target_months',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'How many months of expenses would you like to have saved?',
    options: [
      { value: '3', label: '3 Months (Standard safety net)' },
      { value: '6', label: '6 Months (Conservative buffer)' },
      { value: '12', label: '12 Months (Maximum security)' }
    ],
    validation: { required: true },
    display_order: 56,
  },
  {
    id: 'current_emergency_savings',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much do you currently have in liquid savings for emergencies?',
    description: 'Only include cash you can access quickly (e.g., in a savings account).',
    validation: { min: 0, required: true },
    display_order: 57,
  },
  {
    id: 'emergency_fund_monthly_contribution',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much can you save per month for your emergency fund?',
    description: 'Be realistic about what you can consistently set aside.',
    validation: { min: 1, required: true },
    display_order: 58,
  },

  // Passive Income
  {
    id: 'target_monthly_income',
    type: 'currency',
    category: 'goal-specific',
    question: 'What monthly passive income target would you like to achieve?',
    description: 'This is the amount you want to earn each month from investments and assets',
    validation: { min: 100, required: true },
    display_order: 59,
  },
  {
    id: 'current_investment_capital',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much capital do you currently have available to invest?',
    description: 'Include savings, investment accounts, and funds you can dedicate to passive income generation',
    validation: { min: 0, required: true },
    display_order: 60,
  },
  {
    id: 'monthly_investment_capacity',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much can you invest monthly toward building passive income?',
    description: 'Amount you can consistently add to your passive income investments',
    validation: { min: 0, required: true },
    display_order: 61,
  },
  {
    id: 'income_stream_preferences',
    type: 'multiple_choice',
    category: 'goal-specific',
    question: 'Which passive income strategies interest you most?',
    options: [
      { value: 'dividend_stocks', label: 'Dividend-paying stocks' },
      { value: 'reits', label: 'Real Estate Investment Trusts (REITs)' },
      { value: 'bonds_cds', label: 'Bonds and CDs' },
      { value: 'index_funds', label: 'Dividend-focused index funds/ETFs' },
      { value: 'peer_lending', label: 'Peer-to-peer lending' }
    ],
    validation: { required: true },
    display_order: 62,
  },
  {
    id: 'effort_level',
    type: 'single_choice',
    category: 'goal-specific',
    question: 'What level of initial setup effort are you comfortable with?',
    description: 'Some passive income requires more work upfront than others.',
    options: [
      { value: 'low', label: 'Low Effort - I prefer simple strategies like buying an ETF.' },
      { value: 'medium', label: 'Medium Effort - I am willing to do research, like selecting individual stocks or bonds.' },
      { value: 'high', label: 'High Effort - I am open to more complex setups if the return is justified (Note: This AI will not recommend active businesses).' }
    ],
    validation: { required: true },
    display_order: 63,
  },

  // Custom Goal
  {
    id: 'goal_description',
    type: 'text',
    category: 'goal-specific',
    question: 'What is your financial goal? Please be specific.',
    description: 'e.g., "Save for a wedding," "Buy a new MacBook Pro," "Fund a 3-week trip to Japan."',
    validation: { required: true, min_length: 10 },
    display_order: 64,
  },
  {
    id: 'target_amount',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much money do you need to achieve this goal?',
    description: 'The total estimated cost of your goal.',
    validation: { min: 1, required: true },
    display_order: 65,
  },
  {
    id: 'target_date',
    type: 'date',
    category: 'goal-specific',
    question: 'By when do you want to achieve this goal?',
    description: 'Select your target deadline.',
    validation: { required: true },
    display_order: 66,
  },
  {
    id: 'custom_goal_current_savings',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much have you already saved for this specific goal?',
    description: 'Enter 0 if you haven\'t started yet.',
    validation: { min: 0, required: true },
    display_order: 67,
  },
  {
    id: 'custom_goal_monthly_contribution',
    type: 'currency',
    category: 'goal-specific',
    question: 'How much can you realistically save each month towards this goal?',
    description: 'Consistency is key to reaching your goal.',
    validation: { min: 1, required: true },
    display_order: 68,
  },
];
