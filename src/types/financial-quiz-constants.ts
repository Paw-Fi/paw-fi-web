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
  | "personal-information"
  | "income-details"
  | "detailed-expenses"
  | "assets-and-savings"
  | "debts-and-liabilities"
  | "financial-goals"
  | "risk-profile-and-investment"
  | "financial-behavior"
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
    operator:
      | "equals"
      | "not_equals"
      | "greater_than"
      | "less_than"
      | "contains";
    value: any;
  }[];
}

export interface FinancialProfileQuestion {
  id: keyof ComprehensiveFinancialProfile;
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
export type QuizQuestion = FinancialProfileQuestion;

export interface CategoryInfo {
  id: QuestionCategory;
  title: string;
  description: string;
  color: string;
}

// Enhanced Financial Profile Data Interface
export interface ComprehensiveFinancialProfile {
  // Personal Information
  current_age: number;
  dependents: number;
  marital_status: "single" | "married" | "divorced" | "widowed";

  // Income Details
  gross_monthly_income: number;
  net_monthly_income: number;
  income_stability:
    | "very_stable"
    | "stable"
    | "somewhat_unstable"
    | "very_unstable";
  additional_income_sources: string[];
  annual_bonus: number;

  // Detailed Expenses
  housing_cost: number;
  housing_type: "rent" | "mortgage" | "owned_outright" | "living_with_family";
  food_expenses: number;
  transportation_expenses: number;
  healthcare_expenses: number;
  insurance_expenses: number;
  entertainment_expenses: number;
  other_monthly_expenses: number;

  // Assets & Savings
  emergency_fund: number;
  checking_account: number;
  savings_account: number;
  investment_accounts: number;
  retirement_accounts: number;
  real_estate_value: number;
  other_assets: number;

  // Debts & Liabilities
  credit_card_debt: number;
  credit_card_interest_rate: number;
  student_loan_debt: number;
  student_loan_interest_rate: number;
  mortgage_balance: number;
  mortgage_interest_rate: number;
  auto_loan_balance: number;
  auto_loan_interest_rate: number;
  other_debt: number;
  other_debt_interest_rate: number;

  // Financial Goals
  retirement_age: number;
  desired_retirement_income: number;
  short_term_goals: string[];
  medium_term_goals: string[];
  long_term_goals: string[];
  major_purchase_timeline: string;

  // Risk Profile & Investment
  risk_tolerance:
    | "conservative"
    | "moderate"
    | "aggressive"
    | "very_aggressive";
  investment_experience:
    | "none"
    | "beginner"
    | "intermediate"
    | "advanced"
    | "expert";
  investment_timeline: "short" | "medium" | "long";
  investment_priorities: string[];

  // Financial Behavior
  savings_rate: number;
  spending_tracking: "never" | "occasionally" | "monthly" | "weekly" | "daily";
  budget_adherence: "never" | "sometimes" | "usually" | "always";
  financial_stress_level: number; // 1-10 scale
}

export const defaultProfile: ComprehensiveFinancialProfile = {
  current_age: 0,
  dependents: 0,
  marital_status: "single",
  gross_monthly_income: 0,
  net_monthly_income: 0,
  income_stability: "stable",
  additional_income_sources: [],
  annual_bonus: 0,
  housing_cost: 0,
  housing_type: "rent",
  food_expenses: 0,
  transportation_expenses: 0,
  healthcare_expenses: 0,
  insurance_expenses: 0,
  entertainment_expenses: 0,
  other_monthly_expenses: 0,
  emergency_fund: 0,
  checking_account: 0,
  savings_account: 0,
  investment_accounts: 0,
  retirement_accounts: 0,
  real_estate_value: 0,
  other_assets: 0,
  credit_card_debt: 0,
  credit_card_interest_rate: 0,
  student_loan_debt: 0,
  student_loan_interest_rate: 0,
  mortgage_balance: 0,
  mortgage_interest_rate: 0,
  auto_loan_balance: 0,
  auto_loan_interest_rate: 0,
  other_debt: 0,
  other_debt_interest_rate: 0,
  retirement_age: 0,
  desired_retirement_income: 0,
  short_term_goals: [],
  medium_term_goals: [],
  long_term_goals: [],
  major_purchase_timeline: "",
  risk_tolerance: "moderate",
  investment_experience: "beginner",
  investment_timeline: "long",
  investment_priorities: [],
  savings_rate: 0,
  spending_tracking: "occasionally",
  budget_adherence: "sometimes",
  financial_stress_level: 5,
};

// Option constants
export const maritalStatusOptions: QuestionOption[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

export const incomeStabilityOptions: QuestionOption[] = [
  { value: "very_stable", label: "Very Stable (salaried, guaranteed)" },
  { value: "stable", label: "Stable (regular but may fluctuate)" },
  {
    value: "somewhat_unstable",
    label: "Somewhat Unstable (commission, gig work)",
  },
  { value: "very_unstable", label: "Very Unstable (seasonal, irregular)" },
];

export const additionalIncomeOptions: QuestionOption[] = [
  { value: "rental_income", label: "Rental Income" },
  { value: "investment_dividends", label: "Investment Dividends" },
  { value: "freelance_work", label: "Freelance Work" },
  { value: "side_business", label: "Side Business" },
  { value: "government_benefits", label: "Government Benefits" },
  { value: "alimony", label: "Alimony/Child Support" },
];

export const housingTypeOptions: QuestionOption[] = [
  { value: "rent", label: "Renting" },
  { value: "mortgage", label: "Own with Mortgage" },
  { value: "owned_outright", label: "Own Outright" },
  { value: "living_with_family", label: "Living with Family" },
];

export const shortTermGoalOptions: QuestionOption[] = [
  { value: "emergency_fund", label: "Build Emergency Fund" },
  { value: "vacation", label: "Plan a Vacation" },
  { value: "car_purchase", label: "Buy a Car" },
  { value: "debt_payoff", label: "Pay Off Debt" },
  { value: "home_down_payment", label: "Save for Home Down Payment" },
];

export const mediumTermGoalOptions: QuestionOption[] = [
  { value: "home_purchase", label: "Buy a Home" },
  { value: "career_change", label: "Career Change/Education" },
  { value: "start_business", label: "Start a Business" },
  { value: "major_renovation", label: "Major Home Renovation" },
  { value: "children_education", label: "Children's Education Fund" },
];

export const longTermGoalOptions: QuestionOption[] = [
  { value: "comfortable_retirement", label: "Comfortable Retirement" },
  { value: "early_retirement", label: "Early Retirement (FIRE)" },
  { value: "legacy_wealth", label: "Build Legacy Wealth" },
  { value: "charity_giving", label: "Major Charitable Giving" },
  { value: "multiple_properties", label: "Own Multiple Properties" },
];

export const riskToleranceOptions: QuestionOption[] = [
  {
    value: "conservative",
    label: "Conservative - Prefer stability over returns",
  },
  { value: "moderate", label: "Moderate - Balanced approach" },
  { value: "aggressive", label: "Aggressive - Higher risk for higher returns" },
  {
    value: "very_aggressive",
    label: "Very Aggressive - Maximum growth potential",
  },
];

export const investmentExperienceOptions: QuestionOption[] = [
  { value: "none", label: "None - Never invested before" },
  { value: "beginner", label: "Beginner - Basic understanding" },
  { value: "intermediate", label: "Intermediate - Some experience" },
  {
    value: "advanced",
    label: "Advanced - Comfortable with complex investments",
  },
  { value: "expert", label: "Expert - Professional knowledge" },
];

export const investmentPriorityOptions: QuestionOption[] = [
  { value: "growth", label: "Long-term Growth" },
  { value: "income", label: "Regular Income/Dividends" },
  { value: "stability", label: "Capital Preservation" },
  { value: "tax_efficiency", label: "Tax Efficiency" },
  { value: "liquidity", label: "Easy Access to Funds" },
  { value: "diversification", label: "Risk Diversification" },
];

export const spendingTrackingOptions: QuestionOption[] = [
  { value: "never", label: "Never track spending" },
  { value: "occasionally", label: "Check occasionally" },
  { value: "monthly", label: "Review monthly" },
  { value: "weekly", label: "Track weekly" },
  { value: "daily", label: "Track daily" },
];

export const budgetAdherenceOptions: QuestionOption[] = [
  { value: "never", label: "Don't follow a budget" },
  { value: "sometimes", label: "Try but often overspend" },
  { value: "usually", label: "Usually stick to budget" },
  { value: "always", label: "Strictly follow budget" },
];

export const investmentTimelineOptions: QuestionOption[] = [
  { value: "short", label: "Short term (0-3 years)" },
  { value: "medium", label: "Medium term (3-7 years)" },
  { value: "long", label: "Long term (7+ years)" },
];

export interface DebtDetail {
  id: string;
  type: string;
  amount: number;
  interestRate: number;
}

export const debtTypes = [
  { value: "credit-card", label: "Credit Card" },
  { value: "student-loan", label: "Student Loan" },
  { value: "personal-loan", label: "Personal Loan" },
  { value: "auto-loan", label: "Auto Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "medical-debt", label: "Medical Debt" },
  { value: "other", label: "Other" },
];

// Category information
export const goalsQuestionTemplate: FinancialProfileQuestion[] = [
  // Personal Information
  {
    id: "current_age",
    type: "number",
    category: "personal-information",
    question: "What is your current age?",
    validation: { required: true, min: 18, max: 100 },
    display_order: 1,
  },
  {
    id: "dependents",
    type: "number",
    category: "personal-information",
    question: "Number of Dependents",
    validation: { required: true, min: 0, max: 20 },
    display_order: 2,
  },
  {
    id: "marital_status",
    type: "single_choice",
    category: "personal-information",
    question: "Marital Status",
    options: maritalStatusOptions,
    validation: { required: true },
    display_order: 3,
  },

  // Income Details
  {
    id: "gross_monthly_income",
    type: "currency",
    category: "income-details",
    question: "Gross Monthly Income",
    validation: { required: true, min: 0 },
    display_order: 4,
  },
  {
    id: "net_monthly_income",
    type: "currency",
    category: "income-details",
    question: "Net Monthly Income (After taxes)",
    validation: { required: true, min: 0 },
    display_order: 5,
  },
  {
    id: "income_stability",
    type: "single_choice",
    category: "income-details",
    question: "Income Stability",
    options: incomeStabilityOptions,
    validation: { required: true },
    display_order: 6,
  },
  {
    id: "additional_income_sources",
    type: "multiple_choice",
    category: "income-details",
    question: "Additional Income Sources",
    options: additionalIncomeOptions,
    validation: { required: false },
    display_order: 7,
  },
  {
    id: "annual_bonus",
    type: "currency",
    category: "income-details",
    question: "Annual Bonus",
    validation: { required: false, min: 0 },
    display_order: 8,
  },

  // Detailed Expenses
  {
    id: "housing_cost",
    type: "currency",
    category: "detailed-expenses",
    question: "Housing Cost (Rent/Mortgage)",
    validation: { required: true, min: 0 },
    display_order: 9,
  },
  {
    id: "housing_type",
    type: "single_choice",
    category: "detailed-expenses",
    question: "Housing Type",
    options: housingTypeOptions,
    validation: { required: true },
    display_order: 10,
  },
  {
    id: "food_expenses",
    type: "currency",
    category: "detailed-expenses",
    question: "Food & Groceries",
    validation: { required: true, min: 0 },
    display_order: 11,
  },
  {
    id: "transportation_expenses",
    type: "currency",
    category: "detailed-expenses",
    question: "Transportation",
    validation: { required: true, min: 0 },
    display_order: 12,
  },
  {
    id: "healthcare_expenses",
    type: "currency",
    category: "detailed-expenses",
    question: "Healthcare",
    validation: { required: true, min: 0 },
    display_order: 13,
  },
  {
    id: "insurance_expenses",
    type: "currency",
    category: "detailed-expenses",
    question: "Insurance",
    validation: { required: true, min: 0 },
    display_order: 14,
  },
  {
    id: "entertainment_expenses",
    type: "currency",
    category: "detailed-expenses",
    question: "Entertainment",
    validation: { required: true, min: 0 },
    display_order: 15,
  },
  {
    id: "other_monthly_expenses",
    type: "currency",
    category: "detailed-expenses",
    question: "Other Monthly Expenses",
    validation: { required: true, min: 0 },
    display_order: 16,
  },

  // Assets & Savings
  {
    id: "emergency_fund",
    type: "currency",
    category: "assets-and-savings",
    question: "Emergency Fund",
    validation: { required: true, min: 0 },
    display_order: 17,
  },
  {
    id: "checking_account",
    type: "currency",
    category: "assets-and-savings",
    question: "Checking Account",
    validation: { required: true, min: 0 },
    display_order: 18,
  },
  {
    id: "savings_account",
    type: "currency",
    category: "assets-and-savings",
    question: "Savings Account",
    validation: { required: true, min: 0 },
    display_order: 19,
  },
  {
    id: "investment_accounts",
    type: "currency",
    category: "assets-and-savings",
    question: "Investment Accounts",
    validation: { required: true, min: 0 },
    display_order: 20,
  },
  {
    id: "retirement_accounts",
    type: "currency",
    category: "assets-and-savings",
    question: "Retirement Accounts (401k, IRA, etc.)",
    validation: { required: true, min: 0 },
    display_order: 21,
  },
  {
    id: "real_estate_value",
    type: "currency",
    category: "assets-and-savings",
    question: "Real Estate Value",
    validation: { required: false, min: 0 },
    display_order: 22,
  },
  {
    id: "other_assets",
    type: "currency",
    category: "assets-and-savings",
    question: "Other Assets",
    validation: { required: false, min: 0 },
    display_order: 23,
  },

  // Debts & Liabilities
  {
    id: "credit_card_debt",
    type: "currency",
    category: "debts-and-liabilities",
    question: "Credit Card Debt",
    validation: { required: false, min: 0 },
    display_order: 24,
  },
  {
    id: "credit_card_interest_rate",
    type: "percentage",
    category: "debts-and-liabilities",
    question: "Credit Card Interest Rate (%)",
    validation: { required: false, min: 0, max: 50 },
    display_order: 25,
  },
  {
    id: "student_loan_debt",
    type: "currency",
    category: "debts-and-liabilities",
    question: "Student Loan Debt",
    validation: { required: false, min: 0 },
    display_order: 26,
  },
  {
    id: "student_loan_interest_rate",
    type: "percentage",
    category: "debts-and-liabilities",
    question: "Student Loan Interest Rate (%)",
    validation: { required: false, min: 0, max: 15 },
    display_order: 27,
  },
  {
    id: "mortgage_balance",
    type: "currency",
    category: "debts-and-liabilities",
    question: "Mortgage Balance",
    validation: { required: false, min: 0 },
    display_order: 28,
  },
  {
    id: "mortgage_interest_rate",
    type: "percentage",
    category: "debts-and-liabilities",
    question: "Mortgage Interest Rate (%)",
    validation: { required: false, min: 0, max: 10 },
    display_order: 29,
  },
  {
    id: "auto_loan_balance",
    type: "currency",
    category: "debts-and-liabilities",
    question: "Auto Loan Balance",
    validation: { required: false, min: 0 },
    display_order: 30,
  },
  {
    id: "auto_loan_interest_rate",
    type: "percentage",
    category: "debts-and-liabilities",
    question: "Auto Loan Interest Rate (%)",
    validation: { required: false, min: 0, max: 15 },
    display_order: 31,
  },
  {
    id: "other_debt",
    type: "currency",
    category: "debts-and-liabilities",
    question: "Other Debt",
    validation: { required: false, min: 0 },
    display_order: 32,
  },
  {
    id: "other_debt_interest_rate",
    type: "percentage",
    category: "debts-and-liabilities",
    question: "Other Debt Interest Rate (%)",
    validation: { required: false, min: 0, max: 30 },
    display_order: 33,
  },

  // Financial Goals
  {
    id: "retirement_age",
    type: "number",
    category: "financial-goals",
    question: "Retirement Age",
    validation: { required: true, min: 50, max: 100 },
    display_order: 34,
  },
  {
    id: "desired_retirement_income",
    type: "currency",
    category: "financial-goals",
    question: "Desired Retirement Income (Monthly)",
    validation: { required: true, min: 0 },
    display_order: 35,
  },
  {
    id: "short_term_goals",
    type: "multiple_choice",
    category: "financial-goals",
    question: "Short-term Goals (1-2 years)",
    options: shortTermGoalOptions,
    validation: { required: false },
    display_order: 36,
  },
  {
    id: "medium_term_goals",
    type: "multiple_choice",
    category: "financial-goals",
    question: "Medium-term Goals (3-7 years)",
    options: mediumTermGoalOptions,
    validation: { required: false },
    display_order: 37,
  },
  {
    id: "long_term_goals",
    type: "multiple_choice",
    category: "financial-goals",
    question: "Long-term Goals (7+ years)",
    options: longTermGoalOptions,
    validation: { required: false },
    display_order: 38,
  },
  {
    id: "major_purchase_timeline",
    type: "text",
    category: "financial-goals",
    question: "Major Purchase Timeline",
    validation: { required: false },
    display_order: 39,
  },

  // Risk Profile & Investment
  {
    id: "risk_tolerance",
    type: "single_choice",
    category: "risk-profile-and-investment",
    question: "Risk Tolerance",
    options: riskToleranceOptions,
    validation: { required: true },
    display_order: 40,
  },
  {
    id: "investment_experience",
    type: "single_choice",
    category: "risk-profile-and-investment",
    question: "Investment Experience",
    options: investmentExperienceOptions,
    validation: { required: true },
    display_order: 41,
  },
  {
    id: "investment_timeline",
    type: "single_choice",
    category: "risk-profile-and-investment",
    question: "Investment Timeline",
    options: investmentTimelineOptions,
    validation: { required: true },
    display_order: 42,
  },
  {
    id: "investment_priorities",
    type: "multiple_choice",
    category: "risk-profile-and-investment",
    question: "Investment Priorities",
    options: investmentPriorityOptions,
    validation: { required: false },
    display_order: 43,
  },

  // Financial Behavior
  {
    id: "savings_rate",
    type: "percentage",
    category: "financial-behavior",
    question: "Savings Rate (%)",
    validation: { required: true, min: 0, max: 100 },
    display_order: 44,
  },
  {
    id: "spending_tracking",
    type: "single_choice",
    category: "financial-behavior",
    question: "How often do you track your spending?",
    options: spendingTrackingOptions,
    validation: { required: true },
    display_order: 45,
  },
  {
    id: "budget_adherence",
    type: "single_choice",
    category: "financial-behavior",
    question: "How well do you stick to your budget?",
    options: budgetAdherenceOptions,
    validation: { required: true },
    display_order: 46,
  },
  {
    id: "financial_stress_level",
    type: "slider",
    category: "financial-behavior",
    question: "Financial Stress Level (1-10 scale)",
    validation: { required: true, min: 1, max: 10 },
    display_order: 47,
  },
];

export const categories: CategoryInfo[] = [
  {
    id: "personal-information",
    title: "Personal Information",
    description: "Core facts about you.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "income-details",
    title: "Income Details",
    description: "Your income and cash flow.",
    color: "bg-green-100 text-green-600",
  },
  {
    id: "detailed-expenses",
    title: "Detailed Expenses",
    description: "Your monthly spending.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "assets-and-savings",
    title: "Assets & Savings",
    description: "What you own.",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "debts-and-liabilities",
    title: "Debts & Liabilities",
    description: "What you owe.",
    color: "bg-red-100 text-red-600",
  },
  {
    id: "financial-goals",
    title: "Financial Goals",
    description: "What you want to achieve.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "risk-profile-and-investment",
    title: "Risk Profile & Investment",
    description: "Your investment preferences.",
    color: "bg-teal-100 text-teal-600",
  },
  {
    id: "financial-behavior",
    title: "Financial Behavior",
    description: "Your financial habits.",
    color: "bg-pink-100 text-pink-600",
  },
  {
    id: "goal-specific",
    title: "Goal Specifics",
    description: "Questions related to your specific financial goal.",
    color: "bg-yellow-100 text-yellow-600",
  },
];
