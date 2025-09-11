import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
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
      title: 'Financial Profile Settings - Personal Info | Moneko',
      description: 'Update financial information & preferences for personalized AI recommendations and financial planning.',
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
      // Call the financial-health-profile edge function to update profile and regenerate calculations
      console.log('Calling financial-health-profile edge function for profile update...');
      console.log('Profile data:', profileData);
      
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('financial-health-profile', {
        body: { 
          quizAnswers: profileData,
          userId: user.id,
          isPartialUpdate: false // Full update since we have complete profile data
        }
      });
      
      if (edgeFunctionError) {
        console.error('Error calling financial-health-profile:', edgeFunctionError);
        throw edgeFunctionError;
      }
      
      if (data?.success) {
        console.log('✅ Financial profile updated and calculations regenerated');
        
        // Now run the quiz calculations to update widgets
        const { calculateResults, generateDashboardWidgets } = await import('@/components/financial-health/quiz-calculations');
        const { getAllDashboardViews, updateDashboardViewWithWidgets, createDashboardWithWidgets } = await import('@/lib/api/dashboard');
        
        const calculationResults = calculateResults(profileData);
        const widgets = generateDashboardWidgets(calculationResults);
        
        try {
          // Check if there's a stored dashboard ID in the profile data
          const storedDashboardId = profile?.profile_data?.dashboard_view_id;
          
          if (storedDashboardId) {
            // Try to update the existing dashboard
            console.log('Updating existing financial health dashboard:', storedDashboardId);
            try {
              await updateDashboardViewWithWidgets(user.id, {
                viewId: storedDashboardId,
                name: undefined, // Keep existing name - don't update it
                description: 'Updated financial health dashboard based on your profile',
                widgets: widgets
              });
              console.log('✅ Dashboard widgets updated successfully');
            } catch (updateError) {
              // Dashboard might have been deleted, create a new one
              console.warn('Failed to update dashboard (may have been deleted), creating new one:', updateError);
              await createNewFinancialDashboard();
            }
          } else {
            // No stored dashboard ID, check for existing dashboard using string matching
            console.log('No stored dashboard ID found, checking for existing financial health dashboard');
            
            // Get all dashboard views to search for financial health dashboard
            const dashboardViews = await getAllDashboardViews(user.id);
            
            // Look for existing financial health dashboard (created from quiz or previous profile update)
            const existingFinancialDashboard = dashboardViews.find(view => 
              view.name.toLowerCase().includes('financial health') || 
              view.name.toLowerCase().includes('assessment') ||
              view.description?.toLowerCase().includes('financial health') ||
              view.description?.toLowerCase().includes('profile')
            );
            
            if (existingFinancialDashboard) {
              console.log('Found existing financial health dashboard:', existingFinancialDashboard.id);
              
              try {
                // Update the existing dashboard
                await updateDashboardViewWithWidgets(user.id, {
                  viewId: existingFinancialDashboard.id,
                  name: undefined, // Keep existing name
                  description: 'Updated financial health dashboard based on your profile',
                  widgets: widgets
                });
                
                // Store this dashboard ID in the profile for future use
                await supabase
                  .from('financial_health_profiles')
                  .update({
                    profile_data: {
                      ...profile.profile_data,
                      dashboard_view_id: existingFinancialDashboard.id
                    }
                  })
                  .eq('id', profile.id);
                  
                console.log('✅ Updated existing dashboard and stored ID in profile');
              } catch (updateError) {
                console.warn('Failed to update existing dashboard, creating new one:', updateError);
                await createNewFinancialDashboard();
              }
            } else {
              // No existing dashboard found, create a new one
              console.log('No existing financial health dashboard found, creating new one');
              await createNewFinancialDashboard();
            }
          }
          
          async function createNewFinancialDashboard() {
            const dashboardName = profile?.profile_description || 'My Financial Health Assessment';
            const result = await createDashboardWithWidgets({
              viewName: dashboardName,
              description: 'Financial health dashboard based on your profile',
              widgets: widgets,
              userId: user.id
            });
            
            // Store the new dashboard ID back to the profile for future updates
            if (result?.view?.id) {
              console.log('Storing dashboard ID in profile:', result.view.id);
              // Update the profile_data to include dashboard_view_id
              await supabase
                .from('financial_health_profiles')
                .update({
                  profile_data: {
                    ...profile.profile_data,
                    dashboard_view_id: result.view.id
                  }
                })
                .eq('id', profile.id);
            }
          }
        } catch (dashboardError) {
          console.warn('Dashboard update failed, but profile was saved:', dashboardError);
          // Don't throw here - profile save was successful
        }

        setHasChanges(false);
        setIsEditMode(false);
        toast.success('Financial profile updated successfully! Dashboard widgets have been refreshed.');
        
        // Invalidate queries to refresh dashboard and other components
        queryClient.invalidateQueries({ 
          queryKey: ['financialHealthProfile', user.id] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['dashboards', user.id] 
        });
        
        await refetch();
      } else {
        console.error('Edge function returned unsuccessful response:', data);
        throw new Error(data?.error || 'Failed to update financial profile');
      }
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
  const ViewMode = () => {
    // Memoize calculated values for performance optimization
    const totalMonthlyExpenses = useMemo(() => {
      return (
        Number(profileData.housing_cost || 0) +
        Number(profileData.food_expenses || 0) +
        Number(profileData.transportation_expenses || 0) +
        Number(profileData.healthcare_expenses || 0) +
        Number(profileData.insurance_expenses || 0) +
        Number(profileData.entertainment_expenses || 0) +
        Number(profileData.other_monthly_expenses || 0)
      );
    }, [
      profileData.housing_cost,
      profileData.food_expenses,
      profileData.transportation_expenses,
      profileData.healthcare_expenses,
      profileData.insurance_expenses,
      profileData.entertainment_expenses,
      profileData.other_monthly_expenses
    ]);

    const totalAssets = useMemo(() => {
      return (
        Number(profileData.emergency_fund || 0) +
        Number(profileData.checking_account || 0) +
        Number(profileData.savings_account || 0) +
        Number(profileData.investment_accounts || 0) +
        Number(profileData.retirement_accounts || 0) +
        Number(profileData.real_estate_value || 0) +
        Number(profileData.other_assets || 0)
      );
    }, [
      profileData.emergency_fund,
      profileData.checking_account,
      profileData.savings_account,
      profileData.investment_accounts,
      profileData.retirement_accounts,
      profileData.real_estate_value,
      profileData.other_assets
    ]);

    const totalSavings = useMemo(() => {
      return (
        Number(profileData.emergency_fund || 0) + 
        Number(profileData.savings_account || 0)
      );
    }, [
      profileData.emergency_fund,
      profileData.savings_account
    ]);

    return (
    <div className="space-y-8">
      {/* Profile Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-primary">
              Financial Profile Overview
            </CardTitle>
            <Button
              onClick={() => setIsEditMode(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(profileData.net_monthly_income)}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Net Income</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(totalSavings)}
              </div>
              <div className="text-sm text-muted-foreground">Total Savings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {Math.round(profileData.savings_rate)}%
              </div>
              <div className="text-sm text-muted-foreground">Savings Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Sections */}
      <Accordion type="multiple" defaultValue={["personal", "income"]} className="space-y-4">
        {/* Personal Information */}
        <AccordionItem value="personal" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2 text-foreground">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-primary" />
                  Personal Information
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Age</span>
                    <div className="font-semibold">{profileData.current_age || 'Not specified'}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Marital Status</span>
                    <div className="font-semibold capitalize">{profileData.marital_status.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Dependents</span>
                    <div className="font-semibold">{profileData.dependents}</div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Income & Cash Flow */}
        <AccordionItem value="income" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faDollarSign} className="text-primary" />
                  Income & Cash Flow
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Gross Monthly Income</span>
                    <div className="font-semibold text-lg">{formatCurrency(profileData.gross_monthly_income)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Net Monthly Income</span>
                    <div className="font-semibold text-lg">{formatCurrency(profileData.net_monthly_income)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Income Stability</span>
                    <div className="font-semibold capitalize">{profileData.income_stability.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Annual Bonus</span>
                    <div className="font-semibold">{formatCurrency(profileData.annual_bonus)}</div>
                  </div>
                </div>
                {profileData.additional_income_sources.length > 0 && (
                  <div className="mt-4">
                    <span className="text-sm text-muted-foreground">Additional Income Sources</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profileData.additional_income_sources.map((source) => (
                        <Badge key={source} variant="secondary">
                          {source.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Monthly Expenses */}
        <AccordionItem value="expenses" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faHome} className="text-primary" />
                  Monthly Expenses
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Housing</span>
                    <div className="font-semibold">{formatCurrency(profileData.housing_cost)}</div>
                    <div className="text-xs text-muted-foreground/75 capitalize">{profileData.housing_type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Food</span>
                    <div className="font-semibold">{formatCurrency(profileData.food_expenses)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Transportation</span>
                    <div className="font-semibold">{formatCurrency(profileData.transportation_expenses)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Healthcare</span>
                    <div className="font-semibold">{formatCurrency(profileData.healthcare_expenses)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Insurance</span>
                    <div className="font-semibold">{formatCurrency(profileData.insurance_expenses)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Entertainment</span>
                    <div className="font-semibold">{formatCurrency(profileData.entertainment_expenses)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Other</span>
                    <div className="font-semibold">{formatCurrency(profileData.other_monthly_expenses)}</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <span className="text-sm text-muted-foreground">Total Monthly</span>
                    <div className="font-semibold text-lg">
                      {formatCurrency(totalMonthlyExpenses)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Assets & Savings */}
        <AccordionItem value="assets" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartLine} className="text-primary" />
                  Assets & Savings
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Emergency Fund</span>
                    <div className="font-semibold">{formatCurrency(profileData.emergency_fund)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Checking Account</span>
                    <div className="font-semibold">{formatCurrency(profileData.checking_account)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Savings Account</span>
                    <div className="font-semibold">{formatCurrency(profileData.savings_account)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Investment Accounts</span>
                    <div className="font-semibold">{formatCurrency(profileData.investment_accounts)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Retirement Accounts</span>
                    <div className="font-semibold">{formatCurrency(profileData.retirement_accounts)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Real Estate</span>
                    <div className="font-semibold">{formatCurrency(profileData.real_estate_value)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Other Assets</span>
                    <div className="font-semibold">{formatCurrency(profileData.other_assets)}</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <span className="text-sm text-muted-foreground">Total Assets</span>
                    <div className="font-semibold text-lg">
                      {formatCurrency(totalAssets)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Debts & Liabilities */}
        <AccordionItem value="debts" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCreditCard} className="text-primary" />
                  Debts & Liabilities
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  {profileData.credit_card_debt > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <span className="font-medium">Credit Card Debt</span>
                        <div className="text-sm text-muted-foreground">{formatPercentage(profileData.credit_card_interest_rate)} APR</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(profileData.credit_card_debt)}</div>
                    </div>
                  )}
                  {profileData.student_loan_debt > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <span className="font-medium">Student Loans</span>
                        <div className="text-sm text-muted-foreground">{formatPercentage(profileData.student_loan_interest_rate)} APR</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(profileData.student_loan_debt)}</div>
                    </div>
                  )}
                  {profileData.mortgage_balance > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <span className="font-medium">Mortgage</span>
                        <div className="text-sm text-muted-foreground">{formatPercentage(profileData.mortgage_interest_rate)} APR</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(profileData.mortgage_balance)}</div>
                    </div>
                  )}
                  {profileData.auto_loan_balance > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <span className="font-medium">Auto Loan</span>
                        <div className="text-sm text-muted-foreground">{formatPercentage(profileData.auto_loan_interest_rate)} APR</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(profileData.auto_loan_balance)}</div>
                    </div>
                  )}
                  {profileData.other_debt > 0 && (
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <span className="font-medium">Other Debt</span>
                        <div className="text-sm text-muted-foreground">{formatPercentage(profileData.other_debt_interest_rate)} APR</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(profileData.other_debt)}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Financial Goals */}
        <AccordionItem value="goals" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faBullseye} className="text-primary" />
                  Financial Goals
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm text-muted-foreground">Retirement Age</span>
                    <div className="font-semibold text-lg">{profileData.retirement_age || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Desired Retirement Income</span>
                    <div className="font-semibold text-lg">{formatCurrency(profileData.desired_retirement_income)}</div>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {profileData.short_term_goals.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Short-term Goals (1-2 years)</span>
                      <div className="flex flex-wrap gap-2">
                        {profileData.short_term_goals.map((goal) => (
                          <Badge key={goal} variant="secondary">
                            {goal.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profileData.medium_term_goals.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Medium-term Goals (3-7 years)</span>
                      <div className="flex flex-wrap gap-2">
                        {profileData.medium_term_goals.map((goal) => (
                          <Badge key={goal} variant="secondary">
                            {goal.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profileData.long_term_goals.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">Long-term Goals (7+ years)</span>
                      <div className="flex flex-wrap gap-2">
                        {profileData.long_term_goals.map((goal) => (
                          <Badge key={goal} variant="secondary">
                            {goal.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Risk Profile & Investment Preferences */}
        <AccordionItem value="risk" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faShieldAlt} className="text-primary" />
                  Risk Profile & Investment Preferences
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Risk Tolerance</span>
                    <div className="font-semibold capitalize">{profileData.risk_tolerance}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Investment Experience</span>
                    <div className="font-semibold capitalize">{profileData.investment_experience}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Investment Timeline</span>
                    <div className="font-semibold capitalize">{profileData.investment_timeline}</div>
                  </div>
                </div>
                {profileData.investment_priorities.length > 0 && (
                  <div className="mt-4">
                    <span className="text-sm text-muted-foreground block mb-2">Investment Priorities</span>
                    <div className="flex flex-wrap gap-2">
                      {profileData.investment_priorities.map((priority) => (
                        <Badge key={priority} variant="secondary">
                          {priority.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Financial Behavior */}
        <AccordionItem value="behavior" className="border-b-0">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="p-0">
              <AccordionTrigger className="px-6 py-4 text-base md:text-lg">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-primary" />
                  Financial Behavior
                </span>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent className="px-0">
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Spending Tracking</span>
                    <div className="font-semibold capitalize">{profileData.spending_tracking.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Budget Adherence</span>
                    <div className="font-semibold capitalize">{profileData.budget_adherence}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Financial Stress Level</span>
                    <div className="font-semibold">{profileData.financial_stress_level}/10</div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
    );
  };

  // Edit Mode Component (Current form layout but improved)
  const EditMode = () => (
    <div className="space-y-8">  

      {/* Personal Information */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Age</label>
            <Input
              type="number"
              value={profileData.current_age || ''}
              onChange={(e) => handleNumberInputChange('current_age', e.target.value)}
              min={18}
              max={100}
              placeholder=""
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Marital Status</label>
            <div className="grid grid-cols-2 gap-2">
              {maritalStatusOptions.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => handleInputChange('marital_status', option.value)}
                  variant={profileData.marital_status === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start"
                >
                  {option.label}
                </Button>
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
              placeholder=""
            />
          </div>
        </div>
      </div>

      {/* Income Details */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Income Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Gross Monthly Income</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.gross_monthly_income || ''}
                onChange={(e) => handleNumberInputChange('gross_monthly_income', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="Monthly income before taxes"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Net Monthly Income (After taxes)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.net_monthly_income || ''}
                onChange={(e) => handleNumberInputChange('net_monthly_income', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="Monthly take-home pay"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Annual Bonus</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.annual_bonus || ''}
                onChange={(e) => handleNumberInputChange('annual_bonus', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder=""
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
                placeholder="Percentage of income saved"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Income Stability</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {incomeStabilityOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleInputChange('income_stability', option.value)}
                variant={profileData.income_stability === option.value ? 'default' : 'outline'}
                size="sm"
                className="justify-start"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Additional Income Sources (Select all that apply)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {additionalIncomeOptions.map((option) => {
              const isSelected = profileData.additional_income_sources.includes(option.value);
              return (
                <Button
                  key={option.value}
                  onClick={() => handleMultipleChoice('additional_income_sources', option.value)}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start"
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Expenses */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Monthly Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Housing Cost (Rent/Mortgage)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.housing_cost || ''}
                onChange={(e) => handleNumberInputChange('housing_cost', e.target.value)}
                className="pl-8"
                min={0}
                step={50}
                placeholder="Monthly housing payment"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Housing Type</label>
            <div className="grid grid-cols-2 gap-2">
              {housingTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => handleInputChange('housing_type', option.value)}
                  variant={profileData.housing_type === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Food & Groceries</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.food_expenses || ''}
                onChange={(e) => handleNumberInputChange('food_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="Monthly grocery budget"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Transportation</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.transportation_expenses || ''}
                onChange={(e) => handleNumberInputChange('transportation_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="Car payment, gas, public transit"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Healthcare</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.healthcare_expenses || ''}
                onChange={(e) => handleNumberInputChange('healthcare_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="Medical expenses per month"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Insurance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.insurance_expenses || ''}
                onChange={(e) => handleNumberInputChange('insurance_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="Health, auto, life insurance"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Entertainment</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.entertainment_expenses || ''}
                onChange={(e) => handleNumberInputChange('entertainment_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="Dining, movies, hobbies"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Other Monthly Expenses</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.other_monthly_expenses || ''}
                onChange={(e) => handleNumberInputChange('other_monthly_expenses', e.target.value)}
                className="pl-8"
                min={0}
                step={25}
                placeholder="Miscellaneous monthly expenses"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Assets & Savings */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Assets & Savings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Emergency Fund</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.emergency_fund || ''}
                onChange={(e) => handleNumberInputChange('emergency_fund', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="3-6 months of expenses"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Checking Account</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.checking_account || ''}
                onChange={(e) => handleNumberInputChange('checking_account', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder="Current checking balance"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Savings Account</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.savings_account || ''}
                onChange={(e) => handleNumberInputChange('savings_account', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="High-yield savings balance"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Investment Accounts</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.investment_accounts || ''}
                onChange={(e) => handleNumberInputChange('investment_accounts', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="Brokerage, mutual funds"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Retirement Accounts (401k, IRA, etc.)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.retirement_accounts || ''}
                onChange={(e) => handleNumberInputChange('retirement_accounts', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="401k, IRA, pension balance"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Real Estate Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.real_estate_value || ''}
                onChange={(e) => handleNumberInputChange('real_estate_value', e.target.value)}
                className="pl-8"
                min={0}
                step={5000}
                placeholder="Current home value"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Other Assets</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.other_assets || ''}
                onChange={(e) => handleNumberInputChange('other_assets', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder="Cars, jewelry, collectibles"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Debts & Liabilities */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Debts & Liabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Credit Card Debt</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.credit_card_debt || ''}
                onChange={(e) => handleNumberInputChange('credit_card_debt', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder=""
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
                placeholder="Annual percentage rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Student Loan Debt</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.student_loan_debt || ''}
                onChange={(e) => handleNumberInputChange('student_loan_debt', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder=""
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
                placeholder="Annual percentage rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mortgage Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.mortgage_balance || ''}
                onChange={(e) => handleNumberInputChange('mortgage_balance', e.target.value)}
                className="pl-8"
                min={0}
                step={1000}
                placeholder=""
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
                placeholder="Annual percentage rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Auto Loan Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.auto_loan_balance || ''}
                onChange={(e) => handleNumberInputChange('auto_loan_balance', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder=""
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
                placeholder="Annual percentage rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Other Debt</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.other_debt || ''}
                onChange={(e) => handleNumberInputChange('other_debt', e.target.value)}
                className="pl-8"
                min={0}
                step={100}
                placeholder=""
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
                placeholder=""
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Goals */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Financial Goals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Retirement Age</label>
            <Input
              type="number"
              value={profileData.retirement_age || ''}
              onChange={(e) => handleNumberInputChange('retirement_age', e.target.value)}
              min={50}
              max={100}
              placeholder="Target retirement age"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Desired Retirement Income (Monthly)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={profileData.desired_retirement_income || ''}
                onChange={(e) => handleNumberInputChange('desired_retirement_income', e.target.value)}
                className="pl-8"
                min={0}
                step={500}
                placeholder="Desired monthly income in retirement"
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
                <Button
                  key={option.value}
                  onClick={() => handleMultipleChoice('short_term_goals', option.value)}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                >
                  {option.label}
                </Button>
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
                <Button
                  key={option.value}
                  onClick={() => handleMultipleChoice('medium_term_goals', option.value)}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                >
                  {option.label}
                </Button>
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
                <Button
                  key={option.value}
                  onClick={() => handleMultipleChoice('long_term_goals', option.value)}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Risk Profile & Investment */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Risk Profile & Investment</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Risk Tolerance</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {riskToleranceOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleInputChange('risk_tolerance', option.value)}
                variant={profileData.risk_tolerance === option.value ? 'default' : 'outline'}
                size="sm"
                className="justify-start"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Investment Experience</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {investmentExperienceOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleInputChange('investment_experience', option.value)}
                variant={profileData.investment_experience === option.value ? 'default' : 'outline'}
                size="sm"
                className="justify-start"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Investment Timeline</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => handleInputChange('investment_timeline', 'short')}
              variant={profileData.investment_timeline === 'short' ? 'default' : 'outline'}
              size="sm"
            >
              Short (0-3 years)
            </Button>
            <Button
              onClick={() => handleInputChange('investment_timeline', 'medium')}
              variant={profileData.investment_timeline === 'medium' ? 'default' : 'outline'}
              size="sm"
            >
              Medium (3-10 years)
            </Button>
            <Button
              onClick={() => handleInputChange('investment_timeline', 'long')}
              variant={profileData.investment_timeline === 'long' ? 'default' : 'outline'}
              size="sm"
            >
              Long (10+ years)
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Investment Priorities</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {investmentPriorityOptions.map((option) => {
              const isSelected = profileData.investment_priorities.includes(option.value);
              return (
                <Button
                  key={option.value}
                  onClick={() => handleMultipleChoice('investment_priorities', option.value)}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Financial Behavior */}
      <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-primary">Financial Behavior</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">How often do you track your spending?</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {spendingTrackingOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleInputChange('spending_tracking', option.value)}
                variant={profileData.spending_tracking === option.value ? 'default' : 'outline'}
                size="sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">How well do you stick to your budget?</label>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
            {budgetAdherenceOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleInputChange('budget_adherence', option.value)}
                variant={profileData.budget_adherence === option.value ? 'default' : 'outline'}
                size="sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Financial Stress Level (1-10 scale)</label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[profileData.financial_stress_level]}
            onValueChange={(v) => handleInputChange('financial_stress_level', v[0])}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
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
          <div className="bg-muted border border-border rounded-lg p-4 mb-6">
            <p className="text-foreground">
              You haven't completed your financial profile yet. 
              <Button 
                variant="link" 
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="ml-1 p-0 h-auto align-baseline"
              >
                Create your profile
              </Button> to get personalized financial advice and recommendations.
            </p>
          </div>
        )}

        {isEditMode ? <EditMode /> : <ViewMode />}
      </div>
    </div>
  );
}

export default FinancialProfileSettings;