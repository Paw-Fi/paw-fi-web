/**
 * Shared constants and types for the Financial Health Quiz
 * Used by both the quiz component and profile settings page
 */

// Types
export interface QuestionOption {
  value: string;
  label: string;
}

export type QuestionCategory =
  | "current-situation"
  | "liquidity-needs"
  | "risk-assessment"
  | "time-horizon"
  | "financial-goals";

export type QuestionType =
  | "single-choice"
  | "multiple-choice"
  | "number-input"
  | "slider"
  | "debt-repeater";

export interface QuizQuestion {
  id: string;
  question: string;
  description?: string;
  type: QuestionType;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  category: QuestionCategory;
  optionsPerRow?: 2 | 3 | 4;
  placeholder?: string;
}

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
export const quizQuestions: QuizQuestion[] = [
  // === THE SNAPSHOT (You Today) ===
  {
    id: "current-age",
    question: "What is your current age?",
    description: "This helps us calculate your retirement timeline.",
    type: "number-input",
    min: 18,
    max: 100,
    category: "current-situation",
  },
  {
    id: "gross-monthly-income",
    question: "What is your gross monthly income before taxes?",
    description: "Your total monthly income before any deductions.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "net-monthly-income",
    question: "What is your net monthly take-home pay?",
    description: "Your monthly income after taxes and deductions.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "total-monthly-expenses",
    question: "What are your total average monthly expenses?",
    description: "Estimate your total monthly spending, including rent/mortgage, bills, groceries, and entertainment.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
    placeholder: "e.g., 3500"
  },
  {
    id: "cash-savings",
    question: "How much do you have in cash savings?",
    description: "Bank accounts, savings accounts, money market accounts.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "pension-value",
    question: "What is the current value of all your pension/retirement accounts?",
    description: "401(k), IRA, pension plans, and other retirement accounts.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "monthly-pension-contribution",
    question: "How much do you contribute monthly to pension/retirement accounts?",
    description: "Your regular monthly contributions to 401(k), IRA, etc.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "other-investments",
    question: "What is the value of your other investments?",
    description: "Stocks, bonds, mutual funds, real estate investments (excluding your home).",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "number-of-dependents",
    question: "How many dependents do you have?",
    description: "Children, elderly parents, or others who depend on you financially.",
    type: "number-input",
    min: 0,
    max: 20,
    category: "current-situation",
  },
  {
    id: "housing-situation",
    question: "What is your current housing situation?",
    description: "This helps us understand your housing expenses and assets.",
    type: "single-choice",
    options: housingOptions,
    category: "current-situation",
  },
  {
    id: "total-debt-amount",
    question: "Roughly how much non-mortgage debt do you have?",
    description: "Include credit cards, car loans, student loans, personal loans, etc. Exclude your mortgage.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
    placeholder: "e.g., 15000"
  },
  {
    id: "average-debt-interest",
    question: "What's the approximate average interest rate on your debt?",
    description: "If you have multiple debts, estimate the average rate across all of them.",
    type: "single-choice",
    options: debtInterestOptions,
    category: "current-situation",
  },
  {
    id: "emergency-fund",
    question: "How much do you have set aside for emergencies?",
    description: "This is your safety net for unexpected expenses like job loss or medical bills. Separate from your regular savings.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "liquidity-needs",
    placeholder: "e.g., 5000"
  },
  {
    id: "insurance-coverage",
    question: "Which types of insurance coverage do you currently have?",
    description: "Select all that apply to your current situation.",
    type: "multiple-choice",
    options: insuranceOptions,
    optionsPerRow: 3,
    category: "current-situation",
  },

  // === THE DESTINATION (Your Goals) ===
  {
    id: "retirement-age",
    question: "At what age do you plan to retire?",
    description: "This helps us calculate your investment horizon.",
    type: "number-input",
    min: 50,
    max: 100,
    category: "financial-goals",
  },
  {
    id: "target-retirement",
    question: "What is your target retirement fund goal?",
    description: "The amount you would like to have saved by retirement.",
    type: "number-input",
    unit: "$",
    category: "financial-goals",
  },
  {
    id: "financial-priorities",
    question: "What are your top financial priorities right now?",
    description: "Select that are most important to you.",
    type: "multiple-choice",
    options: financialPriorityOptions,
    optionsPerRow: 3,
    category: "financial-goals",
  },
  {
    id: "investment-goals",
    question: "What are your primary investment goals?",
    description: "Select all that apply to your situation.",
    type: "multiple-choice",
    options: investmentGoalOptions,
    optionsPerRow: 3,
    category: "financial-goals",
  },
  {
    id: "time-horizon",
    question: "When do you expect to need most of your investments?",
    description: "This helps determine appropriate investment vehicles.",
    type: "single-choice",
    options: timeHorizonOptions,
    optionsPerRow: 3,
    category: "time-horizon",
  },
  {
    id: "expect-lump-sum",
    question: "Do you expect to receive a significant sum of money ($10,000+) in the future?",
    description: "Future windfalls may impact your investment horizon and risk tolerance.",
    type: "single-choice",
    options: lumpSumOptions,
    optionsPerRow: 2,
    category: "financial-goals",
  },

  // === THE JOURNEY (Your Risk Profile) ===
  {
    id: "predictable-income",
    question: "Do you have a job with predictable income?",
    description: "Income stability affects how much risk you might be able to take on.",
    type: "single-choice",
    options: yesNoOptions,
    category: "risk-assessment",
  },
  {
    id: "high-risk-preference",
    question: "Would you prefer a strategy that offers high returns despite the high risk?",
    description: "Your preference for risk vs. return is a key factor in portfolio design.",
    type: "single-choice",
    options: yesNoOptions,
    category: "risk-assessment",
  },
  {
    id: "risky-investments",
    question: "Have you ever invested in highly risky assets (e.g. individual stocks, cryptocurrency, private equity)?",
    description: "Past investment experience can indicate comfort with certain types of risk.",
    type: "single-choice",
    options: yesNoOptions,
    category: "risk-assessment",
  },
  {
    id: "market-downturn",
    question: "How would you react to a 20% market downturn?",
    description: "This helps assess your emotional response to market volatility.",
    type: "single-choice",
    options: marketDownturnOptions,
    category: "risk-assessment",
  },
  {
    id: "investment-knowledge",
    question: "How would you rate your investment knowledge?",
    description: "Be honest about your familiarity with investment concepts.",
    type: "single-choice",
    options: investmentKnowledgeOptions,
    category: "risk-assessment",
  },
  {
    id: "liquidity-importance",
    question: "How important is liquidity (quick access to your money) to you?",
    description: "This helps determine suitable investment types.",
    type: "single-choice",
    options: liquidityOptions,
    category: "liquidity-needs",
  },
];