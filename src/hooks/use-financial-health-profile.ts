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
export function formatProfileForAI(user: AuthContextType['user'], profile?: Pick<FinancialHealthProfile, 'profile_description' | 'quiz_answers'> | null): string {
  if (!profile || !profile.quiz_answers) return '';
  
  const quizAnswers = profile.quiz_answers as ComprehensiveFinancialProfile;
  
  // Calculate total monthly expenses
  const totalExpenses = (quizAnswers.housing_cost || 0) + 
                       (quizAnswers.food_expenses || 0) + 
                       (quizAnswers.transportation_expenses || 0) + 
                       (quizAnswers.healthcare_expenses || 0) + 
                       (quizAnswers.insurance_expenses || 0) + 
                       (quizAnswers.entertainment_expenses || 0) + 
                       (quizAnswers.other_monthly_expenses || 0);
  
  // Calculate monthly savings
  const monthlySavings = (quizAnswers.net_monthly_income || 0) - totalExpenses;
  
  // Calculate total assets
  const totalAssets = (quizAnswers.checking_account || 0) + 
                     (quizAnswers.savings_account || 0) + 
                     (quizAnswers.investment_accounts || 0) + 
                     (quizAnswers.retirement_accounts || 0) + 
                     (quizAnswers.real_estate_value || 0) + 
                     (quizAnswers.other_assets || 0);
  
  // Calculate total debt
  const totalDebt = (quizAnswers.credit_card_debt || 0) + 
                   (quizAnswers.student_loan_debt || 0) + 
                   (quizAnswers.mortgage_balance || 0) + 
                   (quizAnswers.auto_loan_balance || 0) + 
                   (quizAnswers.other_debt || 0);
  
  // Calculate years to retirement
  const yearsToRetirement = quizAnswers.retirement_age && quizAnswers.current_age ? 
                           Math.max(0, quizAnswers.retirement_age - quizAnswers.current_age) : null;
  
  return `
FINANCIAL CASE FILE FOR USER:

## User Profile Summary:
${user ? `Name: ${user?.user_metadata?.full_name}` : ''}
${profile.profile_description}

## Personal Information:
- Age: ${quizAnswers.current_age || 'Not provided'}
- Dependents: ${quizAnswers.dependents || 0}
- Marital Status: ${quizAnswers.marital_status || 'Not provided'}

## Income & Cash Flow:
- Gross Monthly Income: $${(quizAnswers.gross_monthly_income || 0).toLocaleString()}
- Net Monthly Income: $${(quizAnswers.net_monthly_income || 0).toLocaleString()}
- Income Stability: ${quizAnswers.income_stability || 'Not provided'}
- Monthly Expenses: $${totalExpenses.toLocaleString()}
- Monthly Savings: $${monthlySavings.toLocaleString()}
- Savings Rate: ${quizAnswers.savings_rate || 0}%

## Assets & Investments:
- Emergency Fund: $${(quizAnswers.emergency_fund || 0).toLocaleString()}
- Checking Account: $${(quizAnswers.checking_account || 0).toLocaleString()}
- Savings Account: $${(quizAnswers.savings_account || 0).toLocaleString()}
- Investment Accounts: $${(quizAnswers.investment_accounts || 0).toLocaleString()}
- Retirement Accounts: $${(quizAnswers.retirement_accounts || 0).toLocaleString()}
- Real Estate Value: $${(quizAnswers.real_estate_value || 0).toLocaleString()}
- Total Assets: $${totalAssets.toLocaleString()}

## Debts & Liabilities:
- Credit Card Debt: $${(quizAnswers.credit_card_debt || 0).toLocaleString()}
- Student Loan Debt: $${(quizAnswers.student_loan_debt || 0).toLocaleString()}
- Mortgage Balance: $${(quizAnswers.mortgage_balance || 0).toLocaleString()}
- Auto Loan Balance: $${(quizAnswers.auto_loan_balance || 0).toLocaleString()}
- Other Debt: $${(quizAnswers.other_debt || 0).toLocaleString()}
- Total Debt: $${totalDebt.toLocaleString()}

## Financial Goals:
- Target Retirement Age: ${quizAnswers.retirement_age || 'Not set'}
${yearsToRetirement !== null ? `- Years to Retirement: ${yearsToRetirement}` : ''}
- Desired Retirement Income: $${(quizAnswers.desired_retirement_income || 0).toLocaleString()}/month
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
- Financial Stress Level: ${quizAnswers.financial_stress_level || 'Not provided'}/10

Use this comprehensive financial information to provide personalized financial advice and create relevant lessons for this user.
`;
}