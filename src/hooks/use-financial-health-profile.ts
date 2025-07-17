import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

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
  
  console.log('Fetching financial health profile for user:', userId);
  
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
  
  console.log('Successfully fetched financial health profile:', data.profile.id);
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
export function formatProfileForAI(profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'> | null): string {
  if (!profile) return '';
  
  return `
FINANCIAL CASE FILE FOR USER:

## User Profile Summary:
${profile.profile_description}

## Key Financial Data:
- Age: ${profile.profile_data.demographics.age}
- Dependents: ${profile.profile_data.demographics.dependents}
- Housing: ${profile.profile_data.demographics.housing}
- Monthly Income: $${profile.profile_data.demographics.income.net.toLocaleString()}
- Monthly Expenses: $${profile.profile_data.demographics.expenses.toLocaleString()}
- Monthly Savings: $${profile.profile_data.calculated_metrics.monthly_savings.toLocaleString()}

## Financial Situation:
- Cash Savings: $${profile.profile_data.financial_situation.cash_savings.toLocaleString()}
- Retirement Savings: $${profile.profile_data.financial_situation.pension_value.toLocaleString()}
- Total Assets: $${profile.profile_data.calculated_metrics.total_assets.toLocaleString()}
- Emergency Fund: $${profile.profile_data.financial_situation.emergency_fund.toLocaleString()}
- Debt Amount: $${profile.profile_data.financial_situation.debt_amount.toLocaleString()}

## Goals & Timeline:
- Target Retirement Age: ${profile.profile_data.goals_and_timeline.retirement_age}
- Years to Retirement: ${profile.profile_data.calculated_metrics.years_to_retirement}
- Target Retirement Fund: $${profile.profile_data.goals_and_timeline.target_retirement.toLocaleString()}
- Financial Priorities: ${profile.profile_data.goals_and_timeline.financial_priorities.join(', ')}
- Investment Goals: ${profile.profile_data.goals_and_timeline.investment_goals.join(', ')}

## Risk Profile:
- Investment Knowledge: ${profile.profile_data.risk_profile.investment_knowledge}
- Risk Preference: ${profile.profile_data.risk_profile.high_risk_preference === 'yes' ? 'High' : 'Low'}
- Market Downturn Response: ${profile.profile_data.risk_profile.market_downturn}
- Liquidity Importance: ${profile.profile_data.risk_profile.liquidity_importance}

Use this information to provide personalized financial advice and create relevant lessons for this user.
`;
}