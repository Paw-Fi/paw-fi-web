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

// Goal-Specific Questions Interface (transient, not stored in profile)
export interface GoalSpecificAnswers {
  // Emergency Fund specific
  emergency_months_target?: number;
  emergency_priorities?: string[];
  emergency_account_preference?: string;
  current_emergency_savings?: number;
  sudden_expense_handling?: string;

  // Home Buying specific
  target_home_price?: number;
  down_payment_percentage?: number;
  preferred_home_type?: string;
  home_location_preference?: string;
  home_buying_timeline?: string;
  credit_score_range?: string;
  is_first_time_home_buyer?: boolean;
  down_payment_saved?: number;

  // Retirement specific
  retirement_income_percentage?: number;
  retirement_lifestyle_preference?: string;
  retirement_location_preference?: string;
  retirement_healthcare_concerns?: string[];
  has_employer_401k_match?: boolean;
  expected_social_security?: number;
  other_retirement_income_sources?: string[];

  // Wealth Building specific
  wealth_target?: number;
  wealth_timeline?: string;
  wealth_purpose?: string[];
  wealth_preservation_priority?: string;
  current_net_worth?: number;
  comfort_level_with_investments?: string[];
  philanthropic_goals?: string;

  // Investment specific
  investment_amount?: number;
  investment_purpose?: string;
  investment_timeline?: "short" | "medium" | "long";
  preferred_investment_types?: string[];
  max_willing_to_lose_percentage?: number;
  interest_in_esg?: boolean;
  investment_hands_on_preference?: string;

  // Debt Payoff specific
  debt_payoff_strategy?: 'avalanche' | 'snowball' | 'custom';
  debt_emotional_impact?: 'low' | 'medium' | 'high';
  debt_payoff_priority?: 'fastest_payoff' | 'lowest_interest' | 'smallest_balance_first';
  debt_types?: string[];
  attitude_towards_new_debt?: string;
  debt_clarity?: string;

  // Passive Income specific
  passive_income_target?: number;
  passive_income_streams?: string[];
  passive_income_risk_tolerance?: 'low' | 'medium' | 'high';
  capital_for_passive_income?: number;
  time_for_passive_income?: string;
  passive_income_strategy_preference?: string;

  // Custom Goal specific
  custom_goal_name?: string;
  custom_goal_description?: string;
  custom_goal_target_amount?: number;
  custom_goal_target_date?: string;
  custom_goal_priority?: 'low' | 'medium' | 'high';
  custom_goal_flexibility?: string;
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

// Goal-Specific Options
export const emergencyPriorityOptions: QuestionOption[] = [
  { value: "job_loss", label: "Job Loss Protection" },
  { value: "medical_emergency", label: "Medical Emergency" },
  { value: "car_repair", label: "Car/Transportation Repairs" },
  { value: "home_repair", label: "Home Repairs" },
  { value: "family_emergency", label: "Family Emergency" },
  { value: "general_peace_of_mind", label: "General Peace of Mind" },
];

export const emergencyAccountOptions: QuestionOption[] = [
  { value: "high_yield_savings", label: "High-Yield Savings Account" },
  { value: "money_market", label: "Money Market Account" },
  { value: "cd_ladder", label: "CD Ladder" },
  { value: "checking_account", label: "Checking Account" },
];

export const homeTypeOptions: QuestionOption[] = [
  { value: "single_family", label: "Single Family Home" },
  { value: "condo", label: "Condominium" },
  { value: "townhouse", label: "Townhouse" },
  { value: "duplex", label: "Duplex/Multi-family" },
  { value: "undecided", label: "Not Sure Yet" },
];

export const homeLocationOptions: QuestionOption[] = [
  { value: "current_city", label: "Current City/Area" },
  { value: "different_city_same_state", label: "Different City, Same State" },
  { value: "different_state", label: "Different State" },
  { value: "rural_area", label: "Rural Area" },
  { value: "urban_area", label: "Urban Area" },
  { value: "suburban_area", label: "Suburban Area" },
];

export const homeBuyingTimelineOptions: QuestionOption[] = [
  { value: "within_1_year", label: "Within 1 Year" },
  { value: "1_to_2_years", label: "1-2 Years" },
  { value: "2_to_5_years", label: "2-5 Years" },
  { value: "5_plus_years", label: "5+ Years" },
];

export const retirementLifestyleOptions: QuestionOption[] = [
  { value: "maintain_current", label: "Maintain Current Lifestyle" },
  { value: "modest_comfortable", label: "Modest but Comfortable" },
  { value: "luxury", label: "Luxury/Premium Lifestyle" },
  { value: "travel_focused", label: "Travel-Focused" },
  { value: "simple_living", label: "Simple Living" },
];

export const retirementLocationOptions: QuestionOption[] = [
  { value: "current_location", label: "Stay in Current Location" },
  { value: "lower_cost_area", label: "Move to Lower Cost Area" },
  { value: "warmer_climate", label: "Move to Warmer Climate" },
  { value: "near_family", label: "Move Near Family" },
  { value: "retirement_community", label: "Retirement Community" },
];

export const retirementHealthcareOptions: QuestionOption[] = [
  { value: "medicare_supplement", label: "Medicare + Supplement Insurance" },
  { value: "long_term_care", label: "Long-term Care Insurance" },
  { value: "health_savings", label: "Health Savings Account" },
  { value: "chronic_conditions", label: "Managing Chronic Conditions" },
  { value: "prescription_costs", label: "Prescription Drug Costs" },
];

export const wealthPurposeOptions: QuestionOption[] = [
  { value: "financial_independence", label: "Financial Independence" },
  { value: "family_legacy", label: "Family Legacy" },
  { value: "charitable_giving", label: "Charitable Giving" },
  { value: "business_investment", label: "Business Investment" },
  { value: "luxury_lifestyle", label: "Luxury Lifestyle" },
  { value: "security_peace_of_mind", label: "Security & Peace of Mind" },
];

export const wealthPreservationOptions: QuestionOption[] = [
  { value: "growth_focused", label: "Growth Focused (Higher Risk)" },
  { value: "balanced", label: "Balanced Growth & Preservation" },
  { value: "preservation_focused", label: "Preservation Focused (Lower Risk)" },
  { value: "inflation_protection", label: "Inflation Protection Priority" },
];

export const investmentPurposeOptions: QuestionOption[] = [
  { value: "retirement_supplement", label: "Retirement Supplement" },
  { value: "major_purchase", label: "Future Major Purchase" },
  { value: "passive_income", label: "Generate Passive Income" },
  { value: "wealth_building", label: "Long-term Wealth Building" },
  { value: "education_funding", label: "Education Funding" },
];

export const preferredInvestmentOptions: QuestionOption[] = [
  { value: "index_funds", label: "Index Funds/ETFs" },
  { value: "individual_stocks", label: "Individual Stocks" },
  { value: "bonds", label: "Bonds" },
  { value: "real_estate", label: "Real Estate Investment" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "commodities", label: "Commodities" },
  { value: "target_date_funds", label: "Target Date Funds" },
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

// Goal-Specific Questions (dynamically added based on goal type)
export const getGoalSpecificQuestions = (goalType: string): FinancialProfileQuestion[] => {
  const baseOrder = 1000; // Start after regular questions
  
  switch (goalType) {
    case 'emergency_fund':
      return [
        {
          id: "current_emergency_savings" as any,
          type: "currency",
          category: "goal-specific",
          question: "How much do you currently have in your emergency fund?",
          validation: { required: true, min: 0 },
          display_order: baseOrder + 1,
        },
        {
          id: "emergency_months_target" as any,
          type: "number",
          category: "goal-specific",
          question: "How many months of expenses do you want to cover?",
          description: "Most experts recommend 3-6 months for basic security, or 6-12 months for extra peace of mind.",
          validation: { required: true, min: 1, max: 24 },
          display_order: baseOrder + 2,
        },
        {
          id: "emergency_priorities" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "What emergencies are you most concerned about?",
          options: emergencyPriorityOptions,
          validation: { required: true, min_items: 1 },
          display_order: baseOrder + 3,
        },
        {
          id: "sudden_expense_handling" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "How would you handle a sudden $1,000 expense today?",
          options: [
            { value: "emergency_fund", label: "Use my emergency fund" },
            { value: "savings", label: "Use my regular savings" },
            { value: "credit_card", label: "Put it on a credit card" },
            { value: "borrow", label: "Borrow from family/friends" },
            { value: "unsure", label: "I'm not sure" },
          ],
          validation: { required: true },
          display_order: baseOrder + 4,
        },
        {
          id: "emergency_account_preference" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What type of account do you prefer for your emergency fund?",
          options: emergencyAccountOptions,
          validation: { required: true },
          display_order: baseOrder + 5,
        },
      ];
      
    case 'home_buying':
      return [
        {
          id: "down_payment_saved" as any,
          type: "currency",
          category: "goal-specific",
          question: "How much have you already saved for a down payment?",
          validation: { required: true, min: 0 },
          display_order: baseOrder + 1,
        },
        {
          id: "target_home_price" as any,
          type: "currency",
          category: "goal-specific",
          question: "What's your target home price?",
          description: "Enter the approximate price of the home you want to buy.",
          validation: { required: true, min: 50000, max: 5000000 },
          display_order: baseOrder + 2,
        },
        {
          id: "down_payment_percentage" as any,
          type: "percentage",
          category: "goal-specific",
          question: "What down payment percentage are you planning?",
          description: "20% is ideal to avoid PMI, but FHA loans allow as little as 3.5%.",
          validation: { required: true, min: 3, max: 50 },
          display_order: baseOrder + 3,
        },
        {
          id: "credit_score_range" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What is your approximate credit score?",
          options: [
            { value: "excellent", label: "Excellent (780+)" },
            { value: "good", label: "Good (700-779)" },
            { value: "fair", label: "Fair (620-699)" },
            { value: "poor", label: "Poor (<620)" },
            { value: "unsure", label: "I'm not sure" },
          ],
          validation: { required: true },
          display_order: baseOrder + 4,
        },
        {
          id: "is_first_time_home_buyer" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "Are you a first-time homebuyer?",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
          validation: { required: true },
          display_order: baseOrder + 5,
        },
        {
          id: "preferred_home_type" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What type of home are you looking for?",
          options: homeTypeOptions,
          validation: { required: true },
          display_order: baseOrder + 6,
        },
        {
          id: "home_location_preference" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "Where are you looking to buy?",
          options: homeLocationOptions,
          validation: { required: true },
          display_order: baseOrder + 7,
        },
        {
          id: "home_buying_timeline" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "When do you want to buy?",
          options: homeBuyingTimelineOptions,
          validation: { required: true },
          display_order: baseOrder + 8,
        },
      ];
      
    case 'retirement':
      return [
        {
          id: "retirement_income_percentage" as any,
          type: "percentage",
          category: "goal-specific",
          question: "What percentage of your current income do you want in retirement?",
          description: "Most people need 70-90% of their pre-retirement income to maintain their lifestyle.",
          validation: { required: true, min: 50, max: 150 },
          display_order: baseOrder + 1,
        },
        {
          id: "has_employer_401k_match" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "Does your employer offer a 401(k) match?",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
            { value: "unsure", label: "I don't know" },
          ],
          validation: { required: true },
          display_order: baseOrder + 2,
        },
        {
          id: "expected_social_security" as any,
          type: "currency",
          category: "goal-specific",
          question: "What is your estimated monthly Social Security benefit?",
          description: "You can get an estimate from the Social Security Administration website.",
          validation: { required: false, min: 0 },
          display_order: baseOrder + 3,
        },
        {
          id: "other_retirement_income_sources" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "Do you expect other sources of income in retirement?",
          options: [
            { value: "pension", label: "Pension" },
            { value: "rental_income", label: "Rental Income" },
            { value: "part_time_work", label: "Part-time Work" },
            { value: "inheritance", label: "Inheritance" },
            { value: "none", label: "None" },
          ],
          validation: { required: false },
          display_order: baseOrder + 4,
        },
        {
          id: "retirement_lifestyle_preference" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What kind of retirement lifestyle do you envision?",
          options: retirementLifestyleOptions,
          validation: { required: true },
          display_order: baseOrder + 5,
        },
        {
          id: "retirement_location_preference" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "Where do you plan to live in retirement?",
          options: retirementLocationOptions,
          validation: { required: true },
          display_order: baseOrder + 6,
        },
        {
          id: "retirement_healthcare_concerns" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "What are your main healthcare concerns for retirement?",
          options: retirementHealthcareOptions,
          validation: { required: false },
          display_order: baseOrder + 7,
        },
      ];
      
    case 'wealth':
      return [
        {
          id: "current_net_worth" as any,
          type: "currency",
          category: "goal-specific",
          question: "What is your current estimated net worth?",
          description: "Your net worth is your total assets minus your total liabilities.",
          validation: { required: true },
          display_order: baseOrder + 1,
        },
        {
          id: "wealth_target" as any,
          type: "currency",
          category: "goal-specific",
          question: "What's your wealth building target?",
          description: "What amount would make you feel financially secure and wealthy?",
          validation: { required: true, min: 100000, max: 50000000 },
          display_order: baseOrder + 2,
        },
        {
          id: "wealth_timeline" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What's your timeline for building this wealth?",
          options: [
            { value: "5-10 years", label: "5-10 Years" },
            { value: "10-20 years", label: "10-20 Years" },
            { value: "20-30 years", label: "20-30 Years" },
            { value: "30+ years", label: "30+ Years" },
          ],
          validation: { required: true },
          display_order: baseOrder + 3,
        },
        {
          id: "comfort_level_with_investments" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "Which of these investment types are you comfortable with?",
          options: preferredInvestmentOptions,
          validation: { required: true, min_items: 1 },
          display_order: baseOrder + 4,
        },
        {
          id: "wealth_purpose" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "What do you want this wealth for?",
          options: wealthPurposeOptions,
          validation: { required: true, min_items: 1 },
          display_order: baseOrder + 5,
        },
        {
          id: "philanthropic_goals" as any,
          type: "text_area",
          category: "goal-specific",
          question: "Do you have any philanthropic goals for your wealth?",
          validation: { required: false },
          display_order: baseOrder + 6,
        },
        {
          id: "wealth_preservation_priority" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What's more important: growing your wealth or preserving it?",
          options: wealthPreservationOptions,
          validation: { required: true },
          display_order: baseOrder + 7,
        },
      ];
      
    case 'investment':
      return [
        {
          id: "investment_amount" as any,
          type: "currency",
          category: "goal-specific",
          question: "How much do you want to invest?",
          description: "Enter the total amount you plan to invest over time.",
          validation: { required: true, min: 100, max: 10000000 },
          display_order: baseOrder + 1,
        },
        {
          id: "max_willing_to_lose_percentage" as any,
          type: "percentage",
          category: "goal-specific",
          question: "What is the maximum percentage you are willing to lose in a market downturn?",
          validation: { required: true, min: 0, max: 100 },
          display_order: baseOrder + 2,
        },
        {
          id: "interest_in_esg" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "Are you interested in socially responsible (ESG) investing?",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
            { value: "learn_more", label: "I'd like to learn more" },
          ],
          validation: { required: true },
          display_order: baseOrder + 3,
        },
        {
          id: "investment_hands_on_preference" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "How hands-on do you want to be with your investments?",
          options: [
            { value: "hands_off", label: "Completely hands-off, I want to set it and forget it" },
            { value: "somewhat_involved", label: "I'd like to be somewhat involved" },
            { value: "very_involved", label: "I want to be very involved in managing my portfolio" },
          ],
          validation: { required: true },
          display_order: baseOrder + 4,
        },
        {
          id: "investment_purpose" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What's the main purpose of this investment?",
          options: investmentPurposeOptions,
          validation: { required: true },
          display_order: baseOrder + 5,
        },
        {
          id: "investment_timeline" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What's your investment timeline?",
          options: investmentTimelineOptions,
          validation: { required: true },
          display_order: baseOrder + 6,
        },
        {
          id: "preferred_investment_types" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "What types of investments interest you?",
          options: preferredInvestmentOptions,
          validation: { required: true, min_items: 1 },
          display_order: baseOrder + 7,
        },
      ];

    case 'debt_payoff':
      return [
        {
          id: "debt_types" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "What types of debt are you focused on paying off?",
          options: debtTypes,
          validation: { required: true, min_items: 1 },
          display_order: baseOrder + 1,
        },
        {
          id: "debt_clarity" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "How clearly do you understand your total debt, including interest rates?",
          options: [
            { value: "very_clear", label: "Very clearly, I have a detailed list" },
            { value: "somewhat_clear", label: "I have a general idea" },
            { value: "not_clear", label: "I'm not very clear on the details" },
          ],
          validation: { required: true },
          display_order: baseOrder + 2,
        },
        {
          id: "debt_payoff_strategy" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "Which debt payoff method do you prefer?",
          options: [
            { value: "avalanche", label: "Avalanche (highest interest first)" },
            { value: "snowball", label: "Snowball (smallest balance first)" },
            { value: "custom", label: "Custom" },
          ],
          validation: { required: true },
          display_order: baseOrder + 3,
        },
        {
          id: "debt_emotional_impact" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "How much does your debt weigh on you emotionally?",
          options: [
            { value: "low", label: "Not much, it's just numbers" },
            { value: "medium", label: "It's a concern, but manageable" },
            { value: "high", label: "It's a significant source of stress" },
          ],
          validation: { required: true },
          display_order: baseOrder + 4,
        },
        {
          id: "attitude_towards_new_debt" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What is your attitude towards taking on new debt while paying off existing debt?",
          options: [
            { value: "avoid_at_all_costs", label: "Avoid at all costs" },
            { value: "only_for_emergencies", label: "Only for emergencies" },
            { value: "open_if_necessary", label: "Open to it if necessary" },
          ],
          validation: { required: true },
          display_order: baseOrder + 5,
        },
        {
          id: "debt_payoff_priority" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What is your main priority with debt payoff?",
          options: [
            { value: "fastest_payoff", label: "Pay it off as fast as possible" },
            { value: "lowest_interest", label: "Pay the least amount of interest" },
            { value: "smallest_balance_first", label: "Get some quick wins by paying off small debts" },
          ],
          validation: { required: true },
          display_order: baseOrder + 6,
        },
      ];

    case 'passive_income':
      return [
        {
          id: "passive_income_target" as any,
          type: "currency",
          category: "goal-specific",
          question: "What is your monthly passive income target?",
          validation: { required: true, min: 100 },
          display_order: baseOrder + 1,
        },
        {
          id: "capital_for_passive_income" as any,
          type: "currency",
          category: "goal-specific",
          question: "How much capital are you willing to invest to generate passive income?",
          validation: { required: true, min: 0 },
          display_order: baseOrder + 2,
        },
        {
          id: "time_for_passive_income" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "How much time are you willing to dedicate to managing your passive income streams per month?",
          options: [
            { value: "less_than_1_hour", label: "Less than 1 hour" },
            { value: "1_to_5_hours", label: "1 to 5 hours" },
            { value: "5_to_10_hours", label: "5 to 10 hours" },
            { value: "10_plus_hours", label: "10+ hours" },
          ],
          validation: { required: true },
          display_order: baseOrder + 3,
        },
        {
          id: "passive_income_strategy_preference" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "Which passive income strategy do you prefer?",
          options: [
            { value: "buy_and_hold", label: "Buy and Hold (e.g., real estate, dividend stocks)" },
            { value: "cash_flow", label: "Cash Flow (e.g., rentals, royalties)" },
            { value: "appreciation", label: "Appreciation (e.g., growth stocks, collectibles)" },
          ],
          validation: { required: true },
          display_order: baseOrder + 4,
        },
        {
          id: "passive_income_streams" as any,
          type: "multiple_choice",
          category: "goal-specific",
          question: "Which passive income streams are you interested in?",
          options: [
            { value: "dividend_stocks", label: "Dividend Stocks" },
            { value: "real_estate_rentals", label: "Real Estate Rentals" },
            { value: "reits", label: "REITs" },
            { value: "high_yield_savings", label: "High-Yield Savings" },
            { value: "peer_to_peer_lending", label: "Peer-to-Peer Lending" },
            { value: "other", label: "Other" },
          ],
          validation: { required: true, min_items: 1 },
          display_order: baseOrder + 5,
        },
        {
          id: "passive_income_risk_tolerance" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "What is your risk tolerance for passive income investments?",
          options: [
            { value: "low", label: "Low - I prefer stable, lower returns" },
            { value: "medium", label: "Medium - I'm open to some risk for higher returns" },
            { value: "high", label: "High - I'm comfortable with high risk for the highest potential returns" },
          ],
          validation: { required: true },
          display_order: baseOrder + 6,
        },
      ];
    case 'custom':
      return [
        {
          id: "custom_goal_name" as any,
          type: "text",
          category: "goal-specific",
          question: "What is the name of your goal?",
          placeholder: "e.g., Sabbatical in Southeast Asia",
          validation: { required: true, min_length: 3 },
          display_order: baseOrder + 1,
        },
        {
          id: "custom_goal_description" as any,
          type: "text_area",
          category: "goal-specific",
          question: "Please describe your goal in more detail.",
          validation: { required: true, min_length: 10 },
          display_order: baseOrder + 2,
        },
        {
          id: "custom_goal_target_amount" as any,
          type: "currency",
          category: "goal-specific",
          question: "How much do you need to save for this goal?",
          validation: { required: true, min: 0 },
          display_order: baseOrder + 3,
        },
        {
          id: "custom_goal_target_date" as any,
          type: "date",
          category: "goal-specific",
          question: "When do you want to achieve this goal?",
          validation: { required: true },
          display_order: baseOrder + 4,
        },
        {
          id: "custom_goal_priority" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "How important is this goal compared to your other financial goals?",
          options: [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ],
          validation: { required: true },
          display_order: baseOrder + 5,
        },
        {
          id: "custom_goal_flexibility" as any,
          type: "single_choice",
          category: "goal-specific",
          question: "How flexible is the target date and amount?",
          options: [
            { value: "very_flexible", label: "Very flexible" },
            { value: "somewhat_flexible", label: "Somewhat flexible" },
            { value: "not_flexible", label: "Not flexible at all" },
          ],
          validation: { required: true },
          display_order: baseOrder + 6,
        },
      ];
      
    default:
      return [];
  }
};''
''

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
