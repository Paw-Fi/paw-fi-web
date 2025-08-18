import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { AuthContextType } from "@/contexts/auth-context";
import { ComprehensiveFinancialProfile } from "@/types/financial-quiz-constants";

// Define types for financial health profile data
export interface FinancialHealthProfile {
  id: string;
  user_id: string;
  profile_description: string;
  quiz_answers: Record<string, any>;
  profile_data: {
    demographics: {
      age: number | string;
      dependents: number;
      housing: string;
      income: {
        gross: number;
        net: number;
      };
      expenses: number;
    };
    financial_situation: {
      cash_savings: number;
      pension_value: number;
      other_investments: number;
      monthly_pension_contribution: number;
      emergency_fund: number;
      debt_amount: number;
      debt_interest: string;
      insurance_coverage: string[];
    };
    goals_and_timeline: {
      retirement_age: number;
      target_retirement: number;
      financial_priorities: string[];
      investment_goals: string[];
      time_horizon: string;
      expect_lump_sum: string;
    };
    risk_profile: {
      predictable_income: string;
      high_risk_preference: string;
      risky_investments: string;
      market_downturn: string;
      investment_knowledge: string;
      liquidity_importance: string;
    };
    calculated_metrics: {
      monthly_savings: number;
      years_to_retirement: number;
      total_assets: number;
    };
  };
  created_at: string;
  updated_at: string;
}

// Fetcher function for financial health profile
const fetchFinancialHealthProfile = async (userId: string | undefined): Promise<FinancialHealthProfile | null> => {
  if (!userId) return null;
    
  const { data, error } = await supabase.functions.invoke('get-financial-health-profile', {
    body: { userId }
  });
  
  if (error) {
    console.error('Error fetching financial health profile:', error);
    // Don't throw error for 404 - just return null
    if (error.message?.includes('No profile found')) {
      return null;
    }
    throw new Error(`Failed to fetch financial health profile: ${error.message}`);
  }
  
  if (!data?.success || !data?.profile) {
    console.log('No financial health profile found for user:', userId);
    return null;
  }
  
  console.log('Successfully fetched financial health profile:', data.profile);
  return data.profile as FinancialHealthProfile;
};

// Hook to fetch financial health profile
export function useFinancialHealthProfile(userId: string | undefined) {
  const { data: profile, error, isLoading, refetch } = useQuery<FinancialHealthProfile | null>({ 
    queryKey: ['financialHealthProfile', userId],
    queryFn: () => fetchFinancialHealthProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if profile doesn't exist
      if (error?.message?.includes('No profile found')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    hasProfile: !!profile,
  };
}

// Helper function to format profile data for AI context
export function formatProfileForAI(user: AuthContextType['user'], profile?: Pick<FinancialHealthProfile, 'profile_description' | 'quiz_answers'> | null): string | undefined {
  if (!profile || !profile.quiz_answers) return undefined;
  
  const quizAnswers = profile.quiz_answers as ComprehensiveFinancialProfile;
  
  // Helper function to handle undefined vs 0 distinction
  const getValueOrUndefined = (value: any): number | undefined => {
    return value !== null && value !== undefined && value !== '' ? Number(value) : undefined;
  };
  
  // Calculate total monthly expenses only if we have expense data
  const expenseFields = [
    getValueOrUndefined(quizAnswers.housing_cost),
    getValueOrUndefined(quizAnswers.food_expenses),
    getValueOrUndefined(quizAnswers.transportation_expenses),
    getValueOrUndefined(quizAnswers.healthcare_expenses),
    getValueOrUndefined(quizAnswers.insurance_expenses),
    getValueOrUndefined(quizAnswers.entertainment_expenses),
    getValueOrUndefined(quizAnswers.other_monthly_expenses)
  ];
  const hasExpenseData = expenseFields.some(val => val !== undefined);
  const totalExpenses = hasExpenseData ? expenseFields.reduce((sum, val) => sum + (val || 0), 0) : undefined;
  
  // Calculate monthly savings only if we have both income and expense data
  const netIncome = getValueOrUndefined(quizAnswers.net_monthly_income);
  const monthlySavings = (netIncome !== undefined && totalExpenses !== undefined) ? netIncome - totalExpenses : undefined;
  
  // Calculate total assets only if we have asset data
  const assetFields = [
    getValueOrUndefined(quizAnswers.checking_account),
    getValueOrUndefined(quizAnswers.savings_account),
    getValueOrUndefined(quizAnswers.investment_accounts),
    getValueOrUndefined(quizAnswers.retirement_accounts),
    getValueOrUndefined(quizAnswers.real_estate_value),
    getValueOrUndefined(quizAnswers.other_assets)
  ];
  const hasAssetData = assetFields.some(val => val !== undefined);
  const totalAssets = hasAssetData ? assetFields.reduce((sum, val) => sum + (val || 0), 0) : undefined;
  
  // Calculate total debt only if we have debt data
  const debtFields = [
    getValueOrUndefined(quizAnswers.credit_card_debt),
    getValueOrUndefined(quizAnswers.student_loan_debt),
    getValueOrUndefined(quizAnswers.mortgage_balance),
    getValueOrUndefined(quizAnswers.auto_loan_balance),
    getValueOrUndefined(quizAnswers.other_debt)
  ];
  const hasDebtData = debtFields.some(val => val !== undefined);
  const totalDebt = hasDebtData ? debtFields.reduce((sum, val) => sum + (val || 0), 0) : undefined;
  
  // Calculate years to retirement
  const currentAge = getValueOrUndefined(quizAnswers.current_age);
  const retirementAge = getValueOrUndefined(quizAnswers.retirement_age);
  const yearsToRetirement = (currentAge !== undefined && retirementAge !== undefined) ? 
                           Math.max(0, retirementAge - currentAge) : undefined;
  
  // Helper function to format currency or show "Not provided"
  const formatCurrency = (value: number | undefined): string => {
    return value !== undefined ? `$${value.toLocaleString()}` : 'Not provided';
  };

  // Helper function to format percentage or show "Not provided"
  const formatPercentage = (value: number | undefined): string => {
    return value !== undefined ? `${value}%` : 'Not provided';
  };

  return `
FINANCIAL CASE FILE FOR USER:

## User Profile Summary:
${user ? `Name: ${user?.user_metadata?.full_name}` : ''}
${profile.profile_description}

## Personal Information:
- Age: ${currentAge !== undefined ? currentAge : 'Not provided'}
- Dependents: ${getValueOrUndefined(quizAnswers.dependents) !== undefined ? getValueOrUndefined(quizAnswers.dependents) : 'Not provided'}
- Marital Status: ${quizAnswers.marital_status || 'Not provided'}

## Income & Cash Flow:
- Gross Monthly Income: ${formatCurrency(getValueOrUndefined(quizAnswers.gross_monthly_income))}
- Net Monthly Income: ${formatCurrency(netIncome)}
- Income Stability: ${quizAnswers.income_stability || 'Not provided'}
- Monthly Expenses: ${formatCurrency(totalExpenses)}
- Monthly Savings: ${formatCurrency(monthlySavings)}
- Savings Rate: ${formatPercentage(getValueOrUndefined(quizAnswers.savings_rate))}

## Assets & Investments:
- Emergency Fund: ${formatCurrency(getValueOrUndefined(quizAnswers.emergency_fund))}
- Checking Account: ${formatCurrency(getValueOrUndefined(quizAnswers.checking_account))}
- Savings Account: ${formatCurrency(getValueOrUndefined(quizAnswers.savings_account))}
- Investment Accounts: ${formatCurrency(getValueOrUndefined(quizAnswers.investment_accounts))}
- Retirement Accounts: ${formatCurrency(getValueOrUndefined(quizAnswers.retirement_accounts))}
- Real Estate Value: ${formatCurrency(getValueOrUndefined(quizAnswers.real_estate_value))}
- Total Assets: ${formatCurrency(totalAssets)}

## Debts & Liabilities:
- Credit Card Debt: ${formatCurrency(getValueOrUndefined(quizAnswers.credit_card_debt))}
- Student Loan Debt: ${formatCurrency(getValueOrUndefined(quizAnswers.student_loan_debt))}
- Mortgage Balance: ${formatCurrency(getValueOrUndefined(quizAnswers.mortgage_balance))}
- Auto Loan Balance: ${formatCurrency(getValueOrUndefined(quizAnswers.auto_loan_balance))}
- Other Debt: ${formatCurrency(getValueOrUndefined(quizAnswers.other_debt))}
- Total Debt: ${formatCurrency(totalDebt)}

## Financial Goals:
- Target Retirement Age: ${retirementAge !== undefined ? retirementAge : 'Not set'}
${yearsToRetirement !== undefined ? `- Years to Retirement: ${yearsToRetirement}` : '- Years to Retirement: Not calculable'}
- Desired Retirement Income: ${formatCurrency(getValueOrUndefined(quizAnswers.desired_retirement_income))}/month
- Short-term Goals: ${quizAnswers.short_term_goals?.join(', ') || 'None set'}
- Medium-term Goals: ${quizAnswers.medium_term_goals?.join(', ') || 'None set'}
- Long-term Goals: ${quizAnswers.long_term_goals?.join(', ') || 'None set'}

## Risk Profile & Investment:
- Risk Tolerance: ${quizAnswers.risk_tolerance || 'Not assessed'}
- Investment Experience: ${quizAnswers.investment_experience || 'Not provided'}
- Investment Timeline: ${quizAnswers.investment_timeline || 'Not specified'}
- Investment Priorities: ${quizAnswers.investment_priorities?.join(', ') || 'Not set'}

## Financial Behavior:
- Spending Tracking: ${quizAnswers.spending_tracking || 'Not specified'}
- Budget Adherence: ${quizAnswers.budget_adherence || 'Not specified'}
- Financial Stress Level: ${getValueOrUndefined(quizAnswers.financial_stress_level) !== undefined ? `${getValueOrUndefined(quizAnswers.financial_stress_level)}/10` : 'Not provided'}

Use this comprehensive financial information to provide personalized financial advice and create relevant lessons for this user.
`;
}