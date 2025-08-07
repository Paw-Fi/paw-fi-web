import React, { useState, useEffect, useCallback } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { additionalIncomeOptions, budgetAdherenceOptions, ComprehensiveFinancialProfile, defaultProfile, housingTypeOptions, incomeStabilityOptions, investmentExperienceOptions, investmentPriorityOptions, longTermGoalOptions, maritalStatusOptions, mediumTermGoalOptions, riskToleranceOptions, shortTermGoalOptions, spendingTrackingOptions } from '@/types/financial-quiz-constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faEdit, 
  faSave, 
  faTimes, 
  faDollarSign,
  faHome,
  faCreditCard,
  faChartLine,
  faBullseye,
  faShieldAlt,
  faCalendarAlt,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

export const Route = createFileRoute('/dashboard/user-settings/profile')({
  component: FinancialProfileSettings,
  head: () => {
    const pageUrl = getCanonicalUrl('/dashboard/user-settings/financial-profile');
    const meta = seo({
      title: 'Financial Profile Settings | Moneko',
      description: 'Update your financial information and preferences to get personalized recommendations.',
      keywords: 'financial profile, settings, personal finance, Moneko',
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

function FinancialProfileSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile, isLoading, refetch } = useFinancialHealthProfile(user?.id);
  const [profileData, setProfileData] = useState<ComprehensiveFinancialProfile>(defaultProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load existing financial profile
  useEffect(() => {
    if (profile?.quiz_answers) {
      // Map existing data to new structure (with backwards compatibility)
      const existingData = profile.quiz_answers as any;
      
      // The quiz now uses snake_case field names that match the backend
      // But we still support old kebab-case for backwards compatibility
      const mappedData: Partial<ComprehensiveFinancialProfile> = {
        // Personal Information
        current_age: existingData['current_age'] || existingData['current-age'] || 0,
        marital_status: existingData['marital_status'] || existingData['marital-status'] || 'single',
        dependents: existingData['dependents'] || 0,
        
        // Income Details
        gross_monthly_income: existingData['gross_monthly_income'] || existingData['gross-monthly-income'] || 0,
        net_monthly_income: existingData['net_monthly_income'] || existingData['net-monthly-income'] || 0,
        income_stability: existingData['income_stability'] || existingData['income-stability'] || 'stable',
        additional_income_sources: existingData['additional_income_sources'] || existingData['additional-income-sources'] || [],
        annual_bonus: existingData['annual_bonus'] || existingData['annual-bonus'] || 0,
        
        // Expenses
        housing_cost: existingData['housing_cost'] || existingData['housing-cost'] || 0,
        housing_type: existingData['housing_type'] || existingData['housing-type'] || 'rent',
        food_expenses: existingData['food_expenses'] || existingData['food-expenses'] || 0,
        transportation_expenses: existingData['transportation_expenses'] || existingData['transportation-expenses'] || 0,
        healthcare_expenses: existingData['healthcare_expenses'] || existingData['healthcare-expenses'] || 0,
        insurance_expenses: existingData['insurance_expenses'] || existingData['insurance-expenses'] || 0,
        entertainment_expenses: existingData['entertainment_expenses'] || existingData['entertainment-expenses'] || 0,
        other_monthly_expenses: existingData['other_monthly_expenses'] || existingData['other-monthly-expenses'] || 0,
        
        // Assets & Savings
        emergency_fund: existingData['emergency_fund'] || existingData['emergency-fund'] || 0,
        checking_account: existingData['checking_account'] || existingData['checking-account'] || 0,
        savings_account: existingData['savings_account'] || existingData['savings-account'] || 0,
        investment_accounts: existingData['investment_accounts'] || existingData['investment-accounts'] || 0,
        retirement_accounts: existingData['retirement_accounts'] || existingData['retirement-accounts'] || 0,
        real_estate_value: existingData['real_estate_value'] || existingData['real-estate-value'] || 0,
        other_assets: existingData['other_assets'] || existingData['other-assets'] || 0,
        
        // Debts & Liabilities
        credit_card_debt: existingData['credit_card_debt'] || existingData['credit-card-debt'] || 0,
        credit_card_interest_rate: existingData['credit_card_interest_rate'] || existingData['credit-card-interest-rate'] || 0,
        student_loan_debt: existingData['student_loan_debt'] || existingData['student-loan-debt'] || 0,
        student_loan_interest_rate: existingData['student_loan_interest_rate'] || existingData['student-loan-interest-rate'] || 0,
        mortgage_balance: existingData['mortgage_balance'] || existingData['mortgage-balance'] || 0,
        mortgage_interest_rate: existingData['mortgage_interest_rate'] || existingData['mortgage-interest-rate'] || 0,
        auto_loan_balance: existingData['auto_loan_balance'] || existingData['auto-loan-balance'] || 0,
        auto_loan_interest_rate: existingData['auto_loan_interest_rate'] || existingData['auto-loan-interest-rate'] || 0,
        other_debt: existingData['other_debt'] || existingData['other-debt'] || 0,
        other_debt_interest_rate: existingData['other_debt_interest_rate'] || existingData['other-debt-interest-rate'] || 0,
        
        // Financial Goals
        retirement_age: existingData['retirement_age'] || existingData['retirement-age'] || 65,
        desired_retirement_income: existingData['desired_retirement_income'] || existingData['desired-retirement-income'] || 0,
        short_term_goals: existingData['short_term_goals'] || existingData['short-term-goals'] || [],
        medium_term_goals: existingData['medium_term_goals'] || existingData['medium-term-goals'] || [],
        long_term_goals: existingData['long_term_goals'] || existingData['long-term-goals'] || [],
        major_purchase_timeline: existingData['major_purchase_timeline'] || existingData['major-purchase-timeline'] || '',
        
        // Risk Profile & Investment
        risk_tolerance: existingData['risk_tolerance'] || existingData['risk-tolerance'] || 'moderate',
        investment_experience: existingData['investment_experience'] || existingData['investment-experience'] || 'beginner',
        investment_timeline: existingData['investment_timeline'] || existingData['investment-timeline'] || 'long',
        investment_priorities: existingData['investment_priorities'] || existingData['investment-priorities'] || [],
        
        // Financial Behavior
        savings_rate: existingData['savings_rate'] || existingData['savings-rate'] || 0,
        spending_tracking: existingData['spending_tracking'] || existingData['spending-tracking'] || 'occasionally',
        budget_adherence: existingData['budget_adherence'] || existingData['budget-adherence'] || 'sometimes',
        financial_stress_level: existingData['financial_stress_level'] || existingData['financial-stress-level'] || 5,
      };
      
      setProfileData(prev => ({ ...prev, ...mappedData }));
    }
  }, [profile]);

  const handleInputChange = useCallback((field: keyof ComprehensiveFinancialProfile, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleMultipleChoice = useCallback((field: keyof ComprehensiveFinancialProfile, value: string) => {
    setProfileData(prev => {
      const currentValues = (prev[field] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      
      setHasChanges(true);
      return { ...prev, [field]: newValues };
    });
  }, []);

  // Fix for number input clearing issue
  const handleNumberInputChange = useCallback((field: keyof ComprehensiveFinancialProfile, value: string) => {
    // Allow empty string to clear the field
    if (value === '') {
      handleInputChange(field, 0);
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      handleInputChange(field, numValue);
    }
  }, [handleInputChange]);

  const handleSaveProfile = async () => {
    if (!user || !hasChanges) return;

    setIsSaving(true);
    try {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('financial_health_profiles')
          .update({
            quiz_answers: profileData,
            profile_data: profile.profile_data,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('financial_health_profiles')
          .insert({
            user_id: user.id,
            profile_description: 'Comprehensive financial profile',
            quiz_answers: profileData,
            profile_data: {}
          });

        if (error) throw error;
      }

      setHasChanges(false);
      setIsEditMode(false);
      toast.success('Financial profile updated successfully!');
      
      // Invalidate queries to refresh dashboard and other components
      queryClient.invalidateQueries({ 
        queryKey: ['financialHealthProfile', user.id] 
      });
      
      await refetch();
    } catch (error) {
      console.error('Error saving financial profile:', error);
      toast.error('Failed to save financial profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // View Mode Component
  const ViewMode = () => (
    <div className="space-y-8">
      {/* Profile Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-200">Financial Profile Overview</h2>
          <Button
            onClick={() => setIsEditMode(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FontAwesomeIcon icon={faEdit} className="mr-2" />
            Edit Profile
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{formatCurrency(profileData.net_monthly_income)}</div>
            <div className="text-sm text-gray-600">Monthly Net Income</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(profileData.emergency_fund + profileData.savings_account)}</div>
            <div className="text-sm text-gray-600">Total Savings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{Math.round(profileData.savings_rate)}%</div>
            <div className="text-sm text-gray-600">Savings Rate</div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-500" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500">Age</span>
            <div className="font-semibold">{profileData.current_age || 'Not specified'}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Marital Status</span>
            <div className="font-semibold capitalize">{profileData.marital_status.replace('_', ' ')}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Dependents</span>
            <div className="font-semibold">{profileData.dependents}</div>
          </div>
        </div>
      </div>

      {/* Income Details */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-green-600 flex items-center">
          <FontAwesomeIcon icon={faDollarSign} className="mr-2" />
          Income & Cash Flow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Gross Monthly Income</span>
            <div className="font-semibold text-lg">{formatCurrency(profileData.gross_monthly_income)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Net Monthly Income</span>
            <div className="font-semibold text-lg">{formatCurrency(profileData.net_monthly_income)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Income Stability</span>
            <div className="font-semibold capitalize">{profileData.income_stability.replace('_', ' ')}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Annual Bonus</span>
            <div className="font-semibold">{formatCurrency(profileData.annual_bonus)}</div>
          </div>
        </div>
        {profileData.additional_income_sources.length > 0 && (
          <div className="mt-4">
            <span className="text-sm text-gray-500">Additional Income Sources</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {profileData.additional_income_sources.map((source) => (
                <span key={source} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {source.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Expenses */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-orange-600 flex items-center">
          <FontAwesomeIcon icon={faHome} className="mr-2" />
          Monthly Expenses
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Housing</span>
            <div className="font-semibold">{formatCurrency(profileData.housing_cost)}</div>
            <div className="text-xs text-gray-400 capitalize">{profileData.housing_type.replace('_', ' ')}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Food</span>
            <div className="font-semibold">{formatCurrency(profileData.food_expenses)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Transportation</span>
            <div className="font-semibold">{formatCurrency(profileData.transportation_expenses)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Healthcare</span>
            <div className="font-semibold">{formatCurrency(profileData.healthcare_expenses)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Insurance</span>
            <div className="font-semibold">{formatCurrency(profileData.insurance_expenses)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Entertainment</span>
            <div className="font-semibold">{formatCurrency(profileData.entertainment_expenses)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Other</span>
            <div className="font-semibold">{formatCurrency(profileData.other_monthly_expenses)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <span className="text-sm text-gray-500">Total Monthly</span>
            <div className="font-semibold text-lg">
              {formatCurrency(
                profileData.housing_cost +
                profileData.food_expenses +
                profileData.transportation_expenses +
                profileData.healthcare_expenses +
                profileData.insurance_expenses +
                profileData.entertainment_expenses +
                profileData.other_monthly_expenses
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assets & Savings */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-blue-600 flex items-center">
          <FontAwesomeIcon icon={faChartLine} className="mr-2" />
          Assets & Savings
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Emergency Fund</span>
            <div className="font-semibold">{formatCurrency(profileData.emergency_fund)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Checking Account</span>
            <div className="font-semibold">{formatCurrency(profileData.checking_account)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Savings Account</span>
            <div className="font-semibold">{formatCurrency(profileData.savings_account)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Investment Accounts</span>
            <div className="font-semibold">{formatCurrency(profileData.investment_accounts)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Retirement Accounts</span>
            <div className="font-semibold">{formatCurrency(profileData.retirement_accounts)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Real Estate</span>
            <div className="font-semibold">{formatCurrency(profileData.real_estate_value)}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Other Assets</span>
            <div className="font-semibold">{formatCurrency(profileData.other_assets)}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            <span className="text-sm text-gray-500">Total Assets</span>
            <div className="font-semibold text-lg">
              {formatCurrency(
                profileData.emergency_fund +
                profileData.checking_account +
                profileData.savings_account +
                profileData.investment_accounts +
                profileData.retirement_accounts +
                profileData.real_estate_value +
                profileData.other_assets
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Debts & Liabilities */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-red-600 flex items-center">
          <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
          Debts & Liabilities
        </h3>
        <div className="space-y-3">
          {profileData.credit_card_debt > 0 && (
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
              <div>
                <span className="font-medium">Credit Card Debt</span>
                <div className="text-sm text-gray-600">{formatPercentage(profileData.credit_card_interest_rate)} APR</div>
              </div>
              <div className="font-semibold">{formatCurrency(profileData.credit_card_debt)}</div>
            </div>
          )}
          {profileData.student_loan_debt > 0 && (
            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <div>
                <span className="font-medium">Student Loans</span>
                <div className="text-sm text-gray-600">{formatPercentage(profileData.student_loan_interest_rate)} APR</div>
              </div>
              <div className="font-semibold">{formatCurrency(profileData.student_loan_debt)}</div>
            </div>
          )}
          {profileData.mortgage_balance > 0 && (
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div>
                <span className="font-medium">Mortgage</span>
                <div className="text-sm text-gray-600">{formatPercentage(profileData.mortgage_interest_rate)} APR</div>
              </div>
              <div className="font-semibold">{formatCurrency(profileData.mortgage_balance)}</div>
            </div>
          )}
          {profileData.auto_loan_balance > 0 && (
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div>
                <span className="font-medium">Auto Loan</span>
                <div className="text-sm text-gray-600">{formatPercentage(profileData.auto_loan_interest_rate)} APR</div>
              </div>
              <div className="font-semibold">{formatCurrency(profileData.auto_loan_balance)}</div>
            </div>
          )}
          {profileData.other_debt > 0 && (
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <div>
                <span className="font-medium">Other Debt</span>
                <div className="text-sm text-gray-600">{formatPercentage(profileData.other_debt_interest_rate)} APR</div>
              </div>
              <div className="font-semibold">{formatCurrency(profileData.other_debt)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Goals */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-indigo-600 flex items-center">
          <FontAwesomeIcon icon={faBullseye} className="mr-2" />
          Financial Goals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-sm text-gray-500">Retirement Age</span>
            <div className="font-semibold text-lg">{profileData.retirement_age || 'Not set'}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Desired Retirement Income</span>
            <div className="font-semibold text-lg">{formatCurrency(profileData.desired_retirement_income)}</div>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          {profileData.short_term_goals.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 block mb-2">Short-term Goals (1-2 years)</span>
              <div className="flex flex-wrap gap-2">
                {profileData.short_term_goals.map((goal) => (
                  <span key={goal} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {goal.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {profileData.medium_term_goals.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 block mb-2">Medium-term Goals (3-7 years)</span>
              <div className="flex flex-wrap gap-2">
                {profileData.medium_term_goals.map((goal) => (
                  <span key={goal} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {goal.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {profileData.long_term_goals.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 block mb-2">Long-term Goals (7+ years)</span>
              <div className="flex flex-wrap gap-2">
                {profileData.long_term_goals.map((goal) => (
                  <span key={goal} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                    {goal.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Profile & Investment Preferences */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-purple-600 flex items-center">
          <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
          Risk Profile & Investment Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500">Risk Tolerance</span>
            <div className="font-semibold capitalize">{profileData.risk_tolerance}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Investment Experience</span>
            <div className="font-semibold capitalize">{profileData.investment_experience}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Investment Timeline</span>
            <div className="font-semibold capitalize">{profileData.investment_timeline}</div>
          </div>
        </div>
        
        {profileData.investment_priorities.length > 0 && (
          <div className="mt-4">
            <span className="text-sm text-gray-500 block mb-2">Investment Priorities</span>
            <div className="flex flex-wrap gap-2">
              {profileData.investment_priorities.map((priority) => (
                <span key={priority} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                  {priority.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Financial Behavior */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-teal-600 flex items-center">
          <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
          Financial Behavior
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500">Spending Tracking</span>
            <div className="font-semibold capitalize">{profileData.spending_tracking.replace('_', ' ')}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Budget Adherence</span>
            <div className="font-semibold capitalize">{profileData.budget_adherence}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Financial Stress Level</span>
            <div className="font-semibold">{profileData.financial_stress_level}/10</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Edit Mode Component (Current form layout but improved)
  const EditMode = () => (
    <div className="space-y-8">  

      {/* Personal Information */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-blue-600">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Age</label>
            <Input
              type="number"
              value={profileData.current_age || ''}
              onChange={(e) => handleNumberInputChange('current_age', e.target.value)}
              min={18}
              max={100}
              placeholder="Enter your age"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Marital Status</label>
            <div className="grid grid-cols-2 gap-2">
              {maritalStatusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleInputChange('marital_status', option.value)}
                  className={`p-3 text-sm rounded-md transition-colors ${
                    profileData.marital_status === option.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Number of Dependents</label>
            <Input
              type="number"
              value={profileData.dependents || ''}
              onChange={(e) => handleNumberInputChange('dependents', e.target.value)}
              min={0}
              max={20}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Income Details */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-green-600">Income Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Gross Monthly Income</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.gross_monthly_income || ''}
                onChange={(e) => handleNumberInputChange('gross_monthly_income', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="5,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Net Monthly Income (After taxes)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.net_monthly_income || ''}
                onChange={(e) => handleNumberInputChange('net_monthly_income', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="3,800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Annual Bonus</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.annual_bonus || ''}
                onChange={(e) => handleNumberInputChange('annual_bonus', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Savings Rate (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={profileData.savings_rate || ''}
                onChange={(e) => handleNumberInputChange('savings_rate', e.target.value)}
                min={0}
                max={100}
                step={1}
                placeholder="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Income Stability</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {incomeStabilityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleInputChange('income_stability', option.value)}
                className={`p-3 text-sm rounded-md transition-colors text-left ${
                  profileData.income_stability === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Additional Income Sources (Select all that apply)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {additionalIncomeOptions.map((option) => {
              const isSelected = profileData.additional_income_sources.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleMultipleChoice('additional_income_sources', option.value)}
                  className={`p-3 text-sm rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Expenses */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-orange-600">Monthly Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Housing Cost (Rent/Mortgage)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.housing_cost || ''}
                onChange={(e) => handleNumberInputChange('housing_cost', e.target.value)}
                className="pl-8"
                min={0}
                step={50}
                placeholder="1,500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Housing Type</label>
            <div className="grid grid-cols-2 gap-2">
              {housingTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleInputChange('housing_type', option.value)}
                  className={`p-2 text-xs rounded-md transition-colors ${
                    profileData.housing_type === option.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Food & Groceries</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.food_expenses || ''}
                onChange={(e) => handleNumberInputChange('food_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="600"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Transportation</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.transportation_expenses || ''}
                onChange={(e) => handleNumberInputChange('transportation_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Healthcare</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.healthcare_expenses || ''}
                onChange={(e) => handleNumberInputChange('healthcare_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Insurance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.insurance_expenses || ''}
                onChange={(e) => handleNumberInputChange('insurance_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="150"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Entertainment</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.entertainment_expenses || ''}
                onChange={(e) => handleNumberInputChange('entertainment_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Other Monthly Expenses</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.other_monthly_expenses || ''}
                onChange={(e) => handleNumberInputChange('other_monthly_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Assets & Savings */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-blue-600">Assets & Savings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Emergency Fund</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.emergency_fund || ''}
                onChange={(e) => handleNumberInputChange('emergency_fund', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="10,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Checking Account</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.checking_account || ''}
                onChange={(e) => handleNumberInputChange('checking_account', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="2,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Savings Account</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.savings_account || ''}
                onChange={(e) => handleNumberInputChange('savings_account', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="15,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Investment Accounts</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.investment_accounts || ''}
                onChange={(e) => handleNumberInputChange('investment_accounts', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="25,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Retirement Accounts (401k, IRA, etc.)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.retirement_accounts || ''}
                onChange={(e) => handleNumberInputChange('retirement_accounts', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="50,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Real Estate Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.real_estate_value || ''}
                onChange={(e) => handleNumberInputChange('real_estate_value', e.target.value)}
                className="pl-8"
                min={0}
                step={5000}
                placeholder="250,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Other Assets</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.other_assets || ''}
                onChange={(e) => handleNumberInputChange('other_assets', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="5,000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Debts & Liabilities */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-red-600">Debts & Liabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Credit Card Debt</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.credit_card_debt || ''}
                onChange={(e) => handleNumberInputChange('credit_card_debt', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Credit Card Interest Rate (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={profileData.credit_card_interest_rate || ''}
                onChange={(e) => handleNumberInputChange('credit_card_interest_rate', e.target.value)}
                min={0}
                max={50}
                step={0.1}
                placeholder="18.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Student Loan Debt</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.student_loan_debt || ''}
                onChange={(e) => handleNumberInputChange('student_loan_debt', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Student Loan Interest Rate (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={profileData.student_loan_interest_rate || ''}
                onChange={(e) => handleNumberInputChange('student_loan_interest_rate', e.target.value)}
                min={0}
                max={15}
                step={0.1}
                placeholder="4.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mortgage Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.mortgage_balance || ''}
                onChange={(e) => handleNumberInputChange('mortgage_balance', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mortgage Interest Rate (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={profileData.mortgage_interest_rate || ''}
                onChange={(e) => handleNumberInputChange('mortgage_interest_rate', e.target.value)}
                min={0}
                max={10}
                step={0.1}
                placeholder="3.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Auto Loan Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.auto_loan_balance || ''}
                onChange={(e) => handleNumberInputChange('auto_loan_balance', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Auto Loan Interest Rate (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={profileData.auto_loan_interest_rate || ''}
                onChange={(e) => handleNumberInputChange('auto_loan_interest_rate', e.target.value)}
                min={0}
                max={15}
                step={0.1}
                placeholder="5.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Other Debt</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.other_debt || ''}
                onChange={(e) => handleNumberInputChange('other_debt', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Other Debt Interest Rate (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={profileData.other_debt_interest_rate || ''}
                onChange={(e) => handleNumberInputChange('other_debt_interest_rate', e.target.value)}
                min={0}
                max={30}
                step={0.1}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Goals */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-indigo-600">Financial Goals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Retirement Age</label>
            <Input
              type="number"
              value={profileData.retirement_age || ''}
              onChange={(e) => handleNumberInputChange('retirement_age', e.target.value)}
              min={50}
              max={100}
              placeholder="65"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Desired Retirement Income (Monthly)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={profileData.desired_retirement_income || ''}
                onChange={(e) => handleNumberInputChange('desired_retirement_income', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="5,000"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Short-term Goals (1-2 years)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {shortTermGoalOptions.map((option) => {
              const isSelected = profileData.short_term_goals.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleMultipleChoice('short_term_goals', option.value)}
                  className={`p-3 text-sm rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Medium-term Goals (3-7 years)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {mediumTermGoalOptions.map((option) => {
              const isSelected = profileData.medium_term_goals.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleMultipleChoice('medium_term_goals', option.value)}
                  className={`p-3 text-sm rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Long-term Goals (7+ years)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {longTermGoalOptions.map((option) => {
              const isSelected = profileData.long_term_goals.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleMultipleChoice('long_term_goals', option.value)}
                  className={`p-3 text-sm rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Risk Profile & Investment */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-purple-600">Risk Profile & Investment</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Risk Tolerance</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {riskToleranceOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleInputChange('risk_tolerance', option.value)}
                className={`p-3 text-sm rounded-md transition-colors text-left ${
                  profileData.risk_tolerance === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Investment Experience</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {investmentExperienceOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleInputChange('investment_experience', option.value)}
                className={`p-3 text-sm rounded-md transition-colors text-left ${
                  profileData.investment_experience === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Investment Timeline</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleInputChange('investment_timeline', 'short')}
              className={`p-3 text-sm rounded-md transition-colors ${
                profileData.investment_timeline === 'short'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Short (0-3 years)
            </button>
            <button
              onClick={() => handleInputChange('investment_timeline', 'medium')}
              className={`p-3 text-sm rounded-md transition-colors ${
                profileData.investment_timeline === 'medium'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Medium (3-10 years)
            </button>
            <button
              onClick={() => handleInputChange('investment_timeline', 'long')}
              className={`p-3 text-sm rounded-md transition-colors ${
                profileData.investment_timeline === 'long'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Long (10+ years)
            </button>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Investment Priorities</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {investmentPriorityOptions.map((option) => {
              const isSelected = profileData.investment_priorities.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleMultipleChoice('investment_priorities', option.value)}
                  className={`p-3 text-sm rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Financial Behavior */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-teal-600">Financial Behavior</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">How often do you track your spending?</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {spendingTrackingOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleInputChange('spending_tracking', option.value)}
                className={`p-3 text-sm rounded-md transition-colors ${
                  profileData.spending_tracking === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">How well do you stick to your budget?</label>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
            {budgetAdherenceOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleInputChange('budget_adherence', option.value)}
                className={`p-3 text-sm rounded-md transition-colors ${
                  profileData.budget_adherence === option.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Financial Stress Level (1-10 scale)</label>
          <Input
            type="range"
            min="1"
            max="10"
            step="1"
            value={profileData.financial_stress_level}
            onChange={(e) => handleInputChange('financial_stress_level', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>1 (No stress)</span>
            <span className="font-semibold text-primary">{profileData.financial_stress_level}</span>
            <span>10 (Very stressed)</span>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <div className="bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-dark-foreground">
              Financial Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditMode 
                ? "Update your financial information to get personalized recommendations" 
                : "Your comprehensive financial overview"}
            </p>
          </div>
          {isEditMode&& <div className="flex gap-3">
          <Button
            onClick={() => {
              setIsEditMode(false);
              setHasChanges(false);
              // Reset to original data using the same mapping logic
              if (profile?.quiz_answers) {
                const existingData = profile.quiz_answers as any;
                const mappedData: Partial<ComprehensiveFinancialProfile> = {
                  // Personal Information
                  current_age: existingData['current_age'] || existingData['current-age'] || 0,
                  marital_status: existingData['marital_status'] || existingData['marital-status'] || 'single',
                  dependents: existingData['dependents'] || 0,
                  
                  // Income Details
                  gross_monthly_income: existingData['gross_monthly_income'] || existingData['gross-monthly-income'] || 0,
                  net_monthly_income: existingData['net_monthly_income'] || existingData['net-monthly-income'] || 0,
                  income_stability: existingData['income_stability'] || existingData['income-stability'] || 'stable',
                  additional_income_sources: existingData['additional_income_sources'] || existingData['additional-income-sources'] || [],
                  annual_bonus: existingData['annual_bonus'] || existingData['annual-bonus'] || 0,
                  
                  // All other fields following the same pattern...
                  housing_cost: existingData['housing_cost'] || existingData['housing-cost'] || 0,
                  housing_type: existingData['housing_type'] || existingData['housing-type'] || 'rent',
                  food_expenses: existingData['food_expenses'] || existingData['food-expenses'] || 0,
                  transportation_expenses: existingData['transportation_expenses'] || existingData['transportation-expenses'] || 0,
                  healthcare_expenses: existingData['healthcare_expenses'] || existingData['healthcare-expenses'] || 0,
                  insurance_expenses: existingData['insurance_expenses'] || existingData['insurance-expenses'] || 0,
                  entertainment_expenses: existingData['entertainment_expenses'] || existingData['entertainment-expenses'] || 0,
                  other_monthly_expenses: existingData['other_monthly_expenses'] || existingData['other-monthly-expenses'] || 0,
                  emergency_fund: existingData['emergency_fund'] || existingData['emergency-fund'] || 0,
                  checking_account: existingData['checking_account'] || existingData['checking-account'] || 0,
                  savings_account: existingData['savings_account'] || existingData['savings-account'] || 0,
                  investment_accounts: existingData['investment_accounts'] || existingData['investment-accounts'] || 0,
                  retirement_accounts: existingData['retirement_accounts'] || existingData['retirement-accounts'] || 0,
                  real_estate_value: existingData['real_estate_value'] || existingData['real-estate-value'] || 0,
                  other_assets: existingData['other_assets'] || existingData['other-assets'] || 0,
                  credit_card_debt: existingData['credit_card_debt'] || existingData['credit-card-debt'] || 0,
                  credit_card_interest_rate: existingData['credit_card_interest_rate'] || existingData['credit-card-interest-rate'] || 0,
                  student_loan_debt: existingData['student_loan_debt'] || existingData['student-loan-debt'] || 0,
                  student_loan_interest_rate: existingData['student_loan_interest_rate'] || existingData['student-loan-interest-rate'] || 0,
                  mortgage_balance: existingData['mortgage_balance'] || existingData['mortgage-balance'] || 0,
                  mortgage_interest_rate: existingData['mortgage_interest_rate'] || existingData['mortgage-interest-rate'] || 0,
                  auto_loan_balance: existingData['auto_loan_balance'] || existingData['auto-loan-balance'] || 0,
                  auto_loan_interest_rate: existingData['auto_loan_interest_rate'] || existingData['auto-loan-interest-rate'] || 0,
                  other_debt: existingData['other_debt'] || existingData['other-debt'] || 0,
                  other_debt_interest_rate: existingData['other_debt_interest_rate'] || existingData['other-debt-interest-rate'] || 0,
                  retirement_age: existingData['retirement_age'] || existingData['retirement-age'] || 65,
                  desired_retirement_income: existingData['desired_retirement_income'] || existingData['desired-retirement-income'] || 0,
                  short_term_goals: existingData['short_term_goals'] || existingData['short-term-goals'] || [],
                  medium_term_goals: existingData['medium_term_goals'] || existingData['medium-term-goals'] || [],
                  long_term_goals: existingData['long_term_goals'] || existingData['long-term-goals'] || [],
                  major_purchase_timeline: existingData['major_purchase_timeline'] || existingData['major-purchase-timeline'] || '',
                  risk_tolerance: existingData['risk_tolerance'] || existingData['risk-tolerance'] || 'moderate',
                  investment_experience: existingData['investment_experience'] || existingData['investment-experience'] || 'beginner',
                  investment_timeline: existingData['investment_timeline'] || existingData['investment-timeline'] || 'long',
                  investment_priorities: existingData['investment_priorities'] || existingData['investment-priorities'] || [],
                  savings_rate: existingData['savings_rate'] || existingData['savings-rate'] || 0,
                  spending_tracking: existingData['spending_tracking'] || existingData['spending-tracking'] || 'occasionally',
                  budget_adherence: existingData['budget_adherence'] || existingData['budget-adherence'] || 'sometimes',
                  financial_stress_level: existingData['financial_stress_level'] || existingData['financial-stress-level'] || 5,
                };
                setProfileData(prev => ({ ...prev, ...mappedData }));
              }
            }}
            variant="outline"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving || !hasChanges}
            className="bg-primary hover:bg-secondary text-white"
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>}
        </div>

        {!profile && !isLoading && !isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              You haven't completed your financial profile yet. 
              <button 
                onClick={() => setIsEditMode(true)}
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                Create your profile
              </button> to get personalized financial advice and recommendations.
            </p>
          </div>
        )}

        {isEditMode ? <EditMode /> : <ViewMode />}
      </div>
    </div>
  );
}

export default FinancialProfileSettings;