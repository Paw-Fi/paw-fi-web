import React, { useState, useCallback, useMemo, useEffect } from "react";
import RangeSlider from "@/components/ui/RangeSlider";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faCheck,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@components/ui/button";
import { useQuizDashboard } from "./useQuizDashboard";
import { supabase } from "@/lib/supabase";
import {
  calculateResults,
  generateDashboardWidgets,
  CalculationResults,
  calculateFinancialHealthScore,
} from "./quiz-calculations";
import { toast } from "react-toastify";
import { User } from "@/contexts/auth-context";
import { FinancialHealthProfile, useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { FinancialAdvisorMessageGenerator, AdvisorMessage } from "./financial-advisor-messages";
import { PresetProfileSelector } from "./PresetProfileSelector";
import MonekoAdvisorMessage from "@/components/ui/MonekoAdvisorMessage";

// Import shared types and constants
import {
  QuestionCategory,
  QuizQuestion,
  DebtDetail,
  categories,
  goalsQuestionTemplate as quizQuestions,
  debtTypes,
} from '@/types/financial-quiz-constants';


interface QuizState {
  answers: Record<string, string | string[] | number | boolean | DebtDetail[]>;
  activeCategory: QuestionCategory;
  showResults: boolean;
  calculationResults: ExtendedCalculationResults | null;
  dashboardName: string;
  isComplete: boolean;
  isProcessing: boolean;
  currentTip: number;
  advisorMessage: AdvisorMessage | null;
  showAdvisorMessage: boolean;
  showPresetBanner: boolean;
  appliedProfileName: string;
}

interface ExtendedCalculationResults extends CalculationResults {
  healthScore: number;
  healthAssessment: string;
  projectedRetirementFund: number;
  yearsUntilRetirement: number;
  monthlyRetirementIncome: number;
}

// Categories are now imported from shared constants

// Debt Repeater Component
const DebtRepeater: React.FC<{
  debts: DebtDetail[];
  onChange: (debts: DebtDetail[]) => void;
}> = ({ debts, onChange }) => {
  const addDebt = () => {
    const newDebt: DebtDetail = {
      id: Date.now().toString(),
      type: '',
      amount: 0,
      interestRate: 0,
    };
    onChange([...debts, newDebt]);
  };

  const removeDebt = (id: string) => {
    onChange(debts.filter(debt => debt.id !== id));
  };

  const updateDebt = (id: string, field: keyof DebtDetail, value: string | number) => {
    onChange(debts.map(debt => 
      debt.id === id ? { ...debt, [field]: value } : debt
    ));
  };

  return (
    <div className="space-y-4">
      {debts.map((debt, index) => (
        <div key={debt.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-800 dark:text-gray-200">Debt #{index + 1}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeDebt(debt.id)}
              className="text-red-500 hover:text-red-700"
            >
              Remove
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Debt Type
              </label>
              <select
                value={debt.type}
                onChange={(e) => updateDebt(debt.id, 'type', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
              >
                <option value="">Select type</option>
                {debtTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Amount Owed
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={debt.amount === 0 ? "" : debt.amount}
                  onChange={(e) => updateDebt(debt.id, 'amount', e.target.value === "" ? 0 : Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 pl-8 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 5000"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interest Rate (APR %)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={debt.interestRate === 0 ? "" : debt.interestRate}
                  onChange={(e) => updateDebt(debt.id, 'interestRate', e.target.value === "" ? 0 : Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 pr-8 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 5.5"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <Button
        variant="outline"
        onClick={addDebt}
        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        + Add Debt
      </Button>
      
      {debts.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500 dark:text-gray-400">No debts added yet. Click "Add Debt" to get started.</p>
        </div>
      )}
    </div>
  );
};


// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const categoryVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
};

const resultVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FinancialHealthQuiz(props: {onDashboardCreated: (profile: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => void, user: User}) {
  const {onDashboardCreated, user} = props;
  const { createDashboardFromQuiz } = useQuizDashboard();
  const [financialProfile, setFinancialProfile] = useState<Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'> | null>(null);
  
  // Fetch existing financial health profile for auto-fill
  const { profile, isLoading: isProfileLoading } = useFinancialHealthProfile(user?.id);

  // State for error handling
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating' | 'complete'>('idle');
  
  // Initial quiz state
  const [state, setState] = useState<QuizState>({
    answers: {
      'debt-details': [], // Initialize debt details as empty array
      'additional_income_sources': [], // Initialize multiple choice as empty array
    },
    activeCategory: "personal-information", // Use first category from new structure
    showResults: false,
    calculationResults: null,
    dashboardName: "My Financial Health Assessment",
    isComplete: false,
    isProcessing: false,
    currentTip: 0,
    advisorMessage: null,
    showAdvisorMessage: false,
    showPresetBanner: false,
    appliedProfileName: "",
  });

  // Group questions by category for easier rendering
  const questionsByCategory = useMemo(() => {
    // Initialize with all categories from the constants
    const grouped: Record<QuestionCategory, QuizQuestion[]> = {
      'personal-information': [],
      'income-details': [],
      'detailed-expenses': [],
      'assets-and-savings': [],
      'debts-and-liabilities': [],
      'financial-goals': [],
      'risk-profile-and-investment': [],
      'financial-behavior': [],
      'goal-specific': [],
    };
    
    quizQuestions.forEach((question) => {
      if (grouped[question.category]) {
        grouped[question.category].push(question);
      }
    });
    
    // Sort questions within each category by display_order
    Object.keys(grouped).forEach(category => {
      grouped[category as QuestionCategory].sort((a, b) => a.display_order - b.display_order);
    });
    
    return grouped;
  }, []);
  
  // Calculate progress through the quiz
  const progress = useMemo(() => {
    const totalCategories = categories.length;
    const currentCategoryIndex = categories.findIndex(
      (category) => category.id === state.activeCategory
    );
    
    // Progress is based on which step you're on (0-based to 1-based)
    return (currentCategoryIndex + 1) / totalCategories;
  }, [state.activeCategory, categories]);
  
  // Investment tips to show during processing
  const investmentTips = [
    "Diversify your investments across different asset classes to reduce risk.",
    "Consider setting up automatic contributions to your retirement accounts.",
    "Emergency funds should cover 3-6 months of essential expenses.",
    "Review your investment portfolio at least once a year.",
    "Tax-advantaged accounts like 401(k)s and IRAs can boost your long-term returns.",
    "Dollar-cost averaging can help reduce the impact of market volatility.",
    "As you approach retirement, gradually shift to more conservative investments.",
    "Consider low-cost index funds for long-term investing.",
    "Rebalance your portfolio periodically to maintain your target asset allocation.",
    "Compound interest is powerful - start investing early and consistently."
  ];

  // Auto-fill quiz with existing profile data
  useEffect(() => {
    if (profile?.quiz_answers && !state.isComplete) {
      const existingData = profile.quiz_answers as any;
      
      // Map existing data to quiz state (with backwards compatibility)
      const autoFillAnswers: Record<string, any> = {
        // Personal Information
        'current_age': existingData['current_age'] || existingData['current-age'] || undefined,
        'marital_status': existingData['marital_status'] || existingData['marital-status'] || undefined,
        'dependents': existingData['dependents'] || undefined,
        
        // Income Details
        'gross_monthly_income': existingData['gross_monthly_income'] || existingData['gross-monthly-income'] || undefined,
        'net_monthly_income': existingData['net_monthly_income'] || existingData['net-monthly-income'] || undefined,
        'income_stability': existingData['income_stability'] || existingData['income-stability'] || undefined,
        'additional_income_sources': existingData['additional_income_sources'] || existingData['additional-income-sources'] || [],
        'annual_bonus': existingData['annual_bonus'] || existingData['annual-bonus'] || undefined,
        
        // Detailed Expenses
        'housing_cost': existingData['housing_cost'] || existingData['housing-cost'] || undefined,
        'housing_type': existingData['housing_type'] || existingData['housing-type'] || undefined,
        'food_expenses': existingData['food_expenses'] || existingData['food-expenses'] || undefined,
        'transportation_expenses': existingData['transportation_expenses'] || existingData['transportation-expenses'] || undefined,
        'healthcare_expenses': existingData['healthcare_expenses'] || existingData['healthcare-expenses'] || undefined,
        'insurance_expenses': existingData['insurance_expenses'] || existingData['insurance-expenses'] || undefined,
        'entertainment_expenses': existingData['entertainment_expenses'] || existingData['entertainment-expenses'] || undefined,
        'other_monthly_expenses': existingData['other_monthly_expenses'] || existingData['other-monthly-expenses'] || undefined,
        
        // Assets & Savings
        'emergency_fund': existingData['emergency_fund'] || existingData['emergency-fund'] || undefined,
        'checking_account': existingData['checking_account'] || existingData['checking-account'] || undefined,
        'savings_account': existingData['savings_account'] || existingData['savings-account'] || undefined,
        'investment_accounts': existingData['investment_accounts'] || existingData['investment-accounts'] || undefined,
        'retirement_accounts': existingData['retirement_accounts'] || existingData['retirement-accounts'] || undefined,
        'real_estate_value': existingData['real_estate_value'] || existingData['real-estate-value'] || undefined,
        'other_assets': existingData['other_assets'] || existingData['other-assets'] || undefined,
        
        // Debts & Liabilities
        'credit_card_debt': existingData['credit_card_debt'] || existingData['credit-card-debt'] || undefined,
        'credit_card_interest_rate': existingData['credit_card_interest_rate'] || existingData['credit-card-interest-rate'] || undefined,
        'student_loan_debt': existingData['student_loan_debt'] || existingData['student-loan-debt'] || undefined,
        'student_loan_interest_rate': existingData['student_loan_interest_rate'] || existingData['student-loan-interest-rate'] || undefined,
        'mortgage_balance': existingData['mortgage_balance'] || existingData['mortgage-balance'] || undefined,
        'mortgage_interest_rate': existingData['mortgage_interest_rate'] || existingData['mortgage-interest-rate'] || undefined,
        'auto_loan_balance': existingData['auto_loan_balance'] || existingData['auto-loan-balance'] || undefined,
        'auto_loan_interest_rate': existingData['auto_loan_interest_rate'] || existingData['auto-loan-interest-rate'] || undefined,
        'other_debt': existingData['other_debt'] || existingData['other-debt'] || undefined,
        'other_debt_interest_rate': existingData['other_debt_interest_rate'] || existingData['other-debt-interest-rate'] || undefined,
        'debt-details': existingData['debt-details'] || [],
        
        // Financial Goals
        'retirement_age': existingData['retirement_age'] || existingData['retirement-age'] || undefined,
        'desired_retirement_income': existingData['desired_retirement_income'] || existingData['desired-retirement-income'] || undefined,
        'short_term_goals': existingData['short_term_goals'] || existingData['short-term-goals'] || [],
        'medium_term_goals': existingData['medium_term_goals'] || existingData['medium-term-goals'] || [],
        'long_term_goals': existingData['long_term_goals'] || existingData['long-term-goals'] || [],
        'major_purchase_timeline': existingData['major_purchase_timeline'] || existingData['major-purchase-timeline'] || undefined,
        
        // Risk Profile & Investment
        'risk_tolerance': existingData['risk_tolerance'] || existingData['risk-tolerance'] || undefined,
        'investment_experience': existingData['investment_experience'] || existingData['investment-experience'] || undefined,
        'investment_timeline': existingData['investment_timeline'] || existingData['investment-timeline'] || undefined,
        'investment_priorities': existingData['investment_priorities'] || existingData['investment-priorities'] || [],
        
        // Financial Behavior
        'savings_rate': existingData['savings_rate'] || existingData['savings-rate'] || undefined,
        'spending_tracking': existingData['spending_tracking'] || existingData['spending-tracking'] || undefined,
        'budget_adherence': existingData['budget_adherence'] || existingData['budget-adherence'] || undefined,
        'financial_stress_level': existingData['financial_stress_level'] || existingData['financial-stress-level'] || undefined,
      };
      
      // Filter out undefined values to avoid overriding empty inputs
      const filteredAnswers = Object.fromEntries(
        Object.entries(autoFillAnswers).filter(([_, value]) => value !== undefined)
      );
      
      // Only apply auto-fill if we have actual data to fill
      if (Object.keys(filteredAnswers).length > 2) { // More than just debt-details and additional_income_sources arrays
        setState(prev => ({
          ...prev,
          answers: {
            ...prev.answers,
            ...filteredAnswers,
          },
        }));
      }
    }
  }, [profile, state.isComplete]);

  // Rotate through investment tips during processing
  useEffect(() => {
    let tipInterval: NodeJS.Timeout;
    
    if (state.isProcessing) {
      tipInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          currentTip: (prev.currentTip + 1) % investmentTips.length
        }));
      }, 4000); // Change tip every 4 seconds
    }
    
    return () => {
      if (tipInterval) clearInterval(tipInterval);
    };
  }, [state.isProcessing, investmentTips.length]);

  // Check if a category is complete (all questions answered)
  const isCategoryComplete = useCallback(
    (category: QuestionCategory): boolean => {
      const questions = questionsByCategory[category] || [];
      
      // Debug logging for specific categories
      if (category === "income-details" || category === "debts-and-liabilities" || category === "financial-goals") {
        console.log(`Checking ${category} category completion:`);
        questions.forEach(question => {
          const answer = state.answers[question.id];
          let isComplete = false;
          
          if (question.type === "multiple_choice") {
            isComplete = Array.isArray(answer) && (answer as string[]).length > 0;
          } else if (question.type === "single_choice") {
            isComplete = answer !== undefined && answer !== "";
          } else if (question.type === "debt_list") {
            isComplete = Array.isArray(answer);
          } else if (question.type === "number" || question.type === "currency" || question.type === "percentage" || question.type === "text") {
            isComplete = answer !== undefined && answer !== "" && answer !== null;
          } else {
            isComplete = answer !== undefined;
          }
          
          console.log(`Question ${question.id} (${question.type}):`, {
            answer,
            isComplete,
            validation: question.validation
          });
        });
      }
      
      return questions.every((question) => {
        if (question.type === "multiple_choice") {
          // Check if the question is required
          const isRequired = question.validation?.required !== false;
          const answer = state.answers[question.id];
          
          if (!isRequired) {
            // Optional multiple choice questions are complete if they have an answer array (even empty)
            return Array.isArray(answer);
          }
          
          // Required multiple choice questions need at least one selection
          return (
            Array.isArray(answer) &&
            (answer as string[]).length > 0
          );
        }
        if (question.type === "debt_list") {
          // Debt repeater is considered complete if it exists (even if empty array)
          return Array.isArray(state.answers[question.id]);
        }
        if (question.type === "number" || question.type === "currency" || question.type === "percentage" || question.type === "text") {
          const answer = state.answers[question.id];
          // Check if the question is required
          const isRequired = question.validation?.required !== false;
          
          if (!isRequired) {
            // Optional fields are always considered complete
            return true;
          }
          
          // Required fields must have a valid value (not empty string or undefined)
          return answer !== undefined && answer !== "" && answer !== null;
        }
        return state.answers[question.id] !== undefined;
      });
    },
    [questionsByCategory, state.answers]
  );

  // Check if the entire quiz is complete
  const isQuizComplete = useCallback((): boolean => {
    return categories.every((category) => isCategoryComplete(category.id));
  }, [categories, isCategoryComplete]);

  // Generate advisor message for current category
  const updateAdvisorMessage = useCallback(() => {
    if (isCategoryComplete(state.activeCategory)) {
      const message = FinancialAdvisorMessageGenerator.getCategoryMessage(state.activeCategory, state.answers);
      setState(prev => ({
        ...prev,
        advisorMessage: message,
        showAdvisorMessage: true
      }));
    } else {
      setState(prev => ({
        ...prev,
        showAdvisorMessage: false
      }));
    }
  }, [state.activeCategory, state.answers, isCategoryComplete]);

  // Update advisor message when answers change or category is complete
  useEffect(() => {
    updateAdvisorMessage();
  }, [updateAdvisorMessage]);

  // Handle answer changes for single-choice and number inputs
  const handleAnswerChange = (questionId: string, value: string | number | boolean | string[] | DebtDetail[]) => {
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value,
      },
    }));
  };

  // Handle multiple-choice questions (toggle selection)
  const handleMultipleChoiceChange = useCallback(
    (questionId: string, value: string) => {
      setState((prev) => {
        const currentAnswers = prev.answers[questionId] as string[] || [];
        const updatedAnswers = currentAnswers.includes(value)
          ? currentAnswers.filter((item) => item !== value)
          : [...currentAnswers, value];

        return {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: updatedAnswers,
          },
        };
      });
    },
    []
  );

  // Handle category change
  const handleCategoryChange = useCallback((category: QuestionCategory) => {
    setState((prev) => ({
      ...prev,
      activeCategory: category,
    }));
    
    // Scroll to top smoothly for better UX - use setTimeout to ensure state update happens first
    setTimeout(() => {
      // Try modern smooth scrolling first
      if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        // Fallback for older browsers with manual smooth scrolling
        const scrollToTop = () => {
          const currentScroll = window.pageYOffset;
          if (currentScroll > 0) {
            window.requestAnimationFrame(scrollToTop);
            window.scrollTo(0, currentScroll - (currentScroll / 8));
          }
        };
        scrollToTop();
      }
    }, 50);
  }, []);

  // Handle dashboard name change
  const handleDashboardNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({
        ...prev,
        dashboardName: e.target.value,
      }));
    },
    []
  );

  // Handle preset profile application
  const handlePresetProfileSelect = useCallback((profileAnswers: Record<string, any>, profileName: string) => {
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        ...profileAnswers,
        // Preserve debt-details and multiple choice arrays structure
        'debt-details': profileAnswers['debt-details'] || [],
        'additional_income_sources': profileAnswers['additional_income_sources'] || [],
      },
      showPresetBanner: true,
      appliedProfileName: profileName,
    }));
  }, []);


  // Handle quiz submission
  const handleSubmitQuiz = useCallback(async () => {
    if (!isQuizComplete()) {
      setError("Please complete all questions before submitting.");
      return;
    }

    // Start processing state with loading indicator
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      // Call the financial-health-profile edge function
      console.log('Calling financial-health-profile edge function...');
      console.log('Quiz answers:', state.answers);
      
      const { data, error } = await supabase.functions.invoke('financial-health-profile', {
        body: { 
          quizAnswers: state.answers,
          userId: user.id,
        }
      });
      
      if (error) {
        console.error('Error calling financial-health-profile:', error);
        throw error;
      }
      
      if (data?.success) {
        console.log('✅ AI-generated financial profile:');
        console.log(data.profileDescription);
        console.log('📋 Profile data sent to AI:', data.profileData);
        setFinancialProfile({
          profile_description: data.profileDescription,
          profile_data: data.profileData,
        });
        // Continue with client-side calculation since edge function only generates profile
        handleCompleteQuiz();
      } else {
        console.error('Edge function returned unsuccessful response:', data);
        throw new Error(data?.error || 'Failed to generate financial profile');
      }
    } catch (error) {
      console.error('Error generating financial profile:', error);
      toast.error('Something went wrong, please try again later');
      
      // Reset processing state and go back to previous screen
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        showResults: false 
      }));
    }
  }, [isQuizComplete, state.answers]);

  // Handle quiz completion
  const handleCompleteQuiz = useCallback((precomputedResults?: CalculationResults) => {
    // Debug: Log the answers to see what we're working with
    console.log('Quiz answers:', state.answers);
    console.log('Financial profile from AI:', financialProfile);
    
    // Use AI-generated profile data if available, otherwise fallback to client-side calculation
    let baseResults: CalculationResults;
    let healthScore: number;
    let projectedRetirementFund: number;
    let monthlyRetirementIncome: number;
    let currentAge: number;
    let retirementAge: number;
    
    // Always use client-side calculation to ensure accuracy
    // The AI may not provide reliable numeric data, so calculate from raw answers
    console.log('Using client-side calculation with raw answers for accuracy');
    
    currentAge = Number(state.answers['current_age']) || 28;
    retirementAge = Number(state.answers['retirement_age']) || 65;
    
    // Calculate from the original answers to ensure accuracy
    const netIncome = Number(state.answers['net_monthly_income']) || 0;
    const totalExpenses = Number(state.answers['housing_cost'] || 0) + 
                         Number(state.answers['food_expenses'] || 0) + 
                         Number(state.answers['transportation_expenses'] || 0) + 
                         Number(state.answers['healthcare_expenses'] || 0) + 
                         Number(state.answers['insurance_expenses'] || 0) + 
                         Number(state.answers['entertainment_expenses'] || 0) + 
                         Number(state.answers['other_monthly_expenses'] || 0);
    const actualMonthlySavings = netIncome - totalExpenses;
    const emergencyFund = Number(state.answers['emergency_fund']) || 0;
    const emergencyFundMonths = totalExpenses > 0 ? emergencyFund / totalExpenses : 0;
    const grossIncome = Number(state.answers['gross_monthly_income']) || 0;
    const totalDebt = Number(state.answers['credit_card_debt'] || 0) + 
                     Number(state.answers['student_loan_debt'] || 0) + 
                     Number(state.answers['mortgage_balance'] || 0) + 
                     Number(state.answers['auto_loan_balance'] || 0) + 
                     Number(state.answers['other_debt'] || 0);
    const debtToIncomeRatio = grossIncome > 0 ? totalDebt / (grossIncome * 12) : 0;
    
    // Calculate net worth from original answers
    const allAssets = Number(state.answers['emergency_fund'] || 0) + 
                     Number(state.answers['checking_account'] || 0) + 
                     Number(state.answers['savings_account'] || 0) + 
                     Number(state.answers['investment_accounts'] || 0) + 
                     Number(state.answers['retirement_accounts'] || 0) + 
                     Number(state.answers['real_estate_value'] || 0) + 
                     Number(state.answers['other_assets'] || 0);
    const netWorth = allAssets - totalDebt;
    
    // Calculate health score based on actual data
    healthScore = 30; // Base score
    if (netWorth > 50000) healthScore += 20;
    else if (netWorth > 0) healthScore += 10;
    
    if (actualMonthlySavings > 1000) healthScore += 20;
    else if (actualMonthlySavings > 0) healthScore += 10;
    
    if (emergencyFundMonths >= 6) healthScore += 20;
    else if (emergencyFundMonths >= 3) healthScore += 15;
    else if (emergencyFundMonths >= 1) healthScore += 5;
    
    if (debtToIncomeRatio < 0.2) healthScore += 15;
    else if (debtToIncomeRatio < 0.3) healthScore += 10;
    else if (debtToIncomeRatio < 0.4) healthScore += 5;
    
    healthScore = Math.min(100, Math.max(0, healthScore));
    
    // Project retirement fund based on current savings and time to retirement
    const yearsToRetirement = retirementAge - currentAge;
    const annualSavings = actualMonthlySavings * 12;
    const growthRate = 0.07; // Assume 7% annual return
    
    // Future value calculation: FV = PMT * [((1 + r)^n - 1) / r] + PV * (1 + r)^n
    const futureValueAnnuity = annualSavings > 0 ? 
      annualSavings * (Math.pow(1 + growthRate, yearsToRetirement) - 1) / growthRate : 0;
    const futureValuePresent = allAssets * Math.pow(1 + growthRate, yearsToRetirement);
    projectedRetirementFund = futureValueAnnuity + futureValuePresent;
    
    monthlyRetirementIncome = (projectedRetirementFund * 0.04) / 12;
    
    // Use the existing calculateResults function for proper type compatibility but override key values
    baseResults = calculateResults(state.answers);
    
    // Override with our more accurate calculations
    baseResults.cashFlow.monthlySavings = actualMonthlySavings;
    baseResults.cashFlow.savingsRatePercent = netIncome > 0 ? Math.round((actualMonthlySavings / netIncome) * 100) : 0;
    baseResults.portfolioProjection.futureValue = projectedRetirementFund;
    
    // Debug: Log the results
    console.log('Final results:', { healthScore, projectedRetirementFund, monthlyRetirementIncome });
    
    // Determine health assessment based on score
    const getHealthAssessment = (score: number): string => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Fair';
      return 'Needs Improvement';
    };
    
    // Create extended results with additional properties
    const extendedResults: ExtendedCalculationResults = {
      ...baseResults,
      healthScore: healthScore,
      healthAssessment: getHealthAssessment(healthScore),
      projectedRetirementFund,
      yearsUntilRetirement: retirementAge - currentAge,
      monthlyRetirementIncome
    };
    

    // Update state to show results
    setState((prev) => {
      return {
        ...prev,
        isComplete: true,
        calculationResults: extendedResults,
        showResults: true,
        isProcessing: false, // End processing state
      };
    });
  }, [state.answers, financialProfile]);

  // Handle dashboard creation
  const handleCreateDashboard = useCallback(async () => {
    if (!state.calculationResults) return;
    
    setStatus('creating');
    setError(null);
    
    try {
      // Generate dashboard widgets from calculation results
      const widgets = generateDashboardWidgets(state.calculationResults);
      
      // Create dashboard using the quiz dashboard hook
      const dashboardViewId = await createDashboardFromQuiz(
        state.dashboardName,
        widgets
      );
      
      // If dashboard was created successfully, store the dashboard ID in the financial profile
      if (dashboardViewId) {
        try {
          // Update the financial health profile to include the dashboard ID
          const { error: updateError } = await supabase
            .from('financial_health_profiles')
            .update({
              profile_data: {
                ...financialProfile?.profile_data,
                dashboard_view_id: dashboardViewId
              },
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
            
          if (updateError) {
            console.error('Error updating financial profile with dashboard ID:', updateError);
            // Don't fail the entire operation if profile update fails
          } else {
            console.log('Successfully stored dashboard ID in financial profile:', dashboardViewId);
          }
        } catch (profileUpdateError) {
          console.error('Error updating profile with dashboard ID:', profileUpdateError);
          // Don't fail the entire operation if profile update fails
        }
      }
      
      setStatus('complete');
      if (financialProfile) {
        onDashboardCreated(financialProfile);
      }
    
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError('Failed to create portfolio. Please try again.');
      setStatus('idle');
    }
  }, [state.calculationResults, state.dashboardName, createDashboardFromQuiz, user.id, financialProfile, onDashboardCreated]);

  // Render input fields (number-input, slider) with responsive layout
  const renderInputFields = useCallback(
    (category: QuestionCategory) => {
      const inputQuestions = questionsByCategory[category]?.filter(
        (q) => q.type === "number" || q.type === "slider" || q.type === "currency" || q.type === "percentage" || q.type === "text"
      );

      if (!inputQuestions || inputQuestions.length === 0) return null;

      // If there's only one input question, make it full width
      if (inputQuestions.length === 1) {
        const question = inputQuestions[0];
        return (
          <div key={question.id} className="w-full">
            <h3 className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
              {question.question}
          {question.type === "slider" &&     <span className="text-md ml-2 font-bold text-green-500">
              {(state.answers[question.id] as number) || (question.validation?.min || 0)}%

              </span>}
            </h3>
            {question.description && (
              <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">{question.description}</p>
            )}

            {(question.type === "number" || question.type === "currency" || question.type === "percentage") && (
              <div className="relative rounded-lg border border-transparent">
                {/* Show $ symbol for currency questions */}
                {question.type === "currency" && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    $
                  </span>
                )}
                {/* Show % symbol for percentage questions */}
                {question.type === "percentage" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    %
                  </span>
                )}
                {/* Show custom unit for number questions */}
                {question.type === "number" && question.unit && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    {question.unit}
                  </span>
                )}
              <input
  type="number"
  value={typeof state.answers[question.id] === "number" ? state.answers[question.id] as number : ""}
  onChange={(e) => {
    const value = e.target.value;
    handleAnswerChange(question.id, value === "" ? "" : Number(value));
  }}
  min={question.validation?.min}
  max={question.validation?.max}
  step={question.step || 1}
  placeholder={question.placeholder}
  className={`w-full rounded-lg bg-transparent border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary ${(question.type === "currency" || question.unit) ? "pl-8" : ""} ${question.type === "percentage" ? "pr-8" : ""}`}
/>
              </div>
            )}

            {question.type === "slider" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {question.validation?.min || 0}%
                  </span>
                  <span className="text-xs font-medium">
                  {(((question?.validation?.max||0) - (question?.validation?.min||0)) / 2).toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {question.validation?.max}%
                  </span>
                </div>
                <RangeSlider
                  min={question.validation?.min}
                  max={question.validation?.max}
                  step={question.step || 1}
                  value={Number(state.answers[question.id]) || (question.validation?.min || 0)}
                  onChange={(value) => handleAnswerChange(question.id, value as number)}
                  className="w-full"
                  label=""
                  showValue={false}
                />
              </div>
            )}

            {question.type === "text" && (
              <div className="relative">
                <input
                  type="text"
                  value={state.answers[question.id] as string || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder={question.placeholder}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>
        );
      }

      // Otherwise, create a responsive grid for multiple input questions
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {inputQuestions.map((question) => (
            <div key={question.id}>
              <h3 className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                {question.question}
               {question.type === "slider" &&  <span className="text-md ml-2 font-bold text-green-500">
              {(state.answers[question.id] as number) || (question.validation?.min || 0)}%

              </span>}
              </h3>
              {question.description && (
                <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                  {question.description}
                </p>
              )}

              {(question.type === "number" || question.type === "currency" || question.type === "percentage") && (
                <div className="relative">
                  {/* Show $ symbol for currency questions */}
                  {question.type === "currency" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                  )}
                  {/* Show % symbol for percentage questions */}
                  {question.type === "percentage" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      %
                    </span>
                  )}
                  {/* Show custom unit for number questions */}
                  {question.type === "number" && question.unit && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {question.unit}
                    </span>
                  )}
                 <input
  type="number"
  value={typeof state.answers[question.id] === "number" ? state.answers[question.id] as number : ""}
  onChange={(e) => {
    const value = e.target.value;
    // Only update if it's a valid number, otherwise, set it as an empty string
    handleAnswerChange(question.id, value === "" ? "" : Number(value));
  }}
  min={question.validation?.min}
  max={question.validation?.max}
  step={question.step || 1}
  placeholder={question.placeholder}
  className={`w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary ${(question.type === "currency" || question.unit) ? "pl-8" : ""} ${question.type === "percentage" ? "pr-8" : ""}`}
/>
                </div>
              )}

              {question.type === "slider" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {question?.validation?.min || 0}%
                    </span>
                    <span className="text-xs font-medium">
                      {(((question?.validation?.max||0) - (question?.validation?.min||0)) / 2).toFixed(0)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {question?.validation?.max}%
                    </span>
                  </div>
                  <RangeSlider
                    min={question.validation?.min}
                    max={question.validation?.max}
                    step={question.step || 1}
                    value={Number(state.answers[question.id]) || (question.validation?.min || 0)}
                    onChange={(value) => handleAnswerChange(question.id, value as number)}
                    className="w-full"
                    label=""
                    showValue={false}
                  />
                </div>
              )}

              {question.type === "text" && (
                <div className="relative">
                  <input
                    type="text"
                    value={state.answers[question.id] as string || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder={question.placeholder}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
    [questionsByCategory, state.answers, handleAnswerChange]
  );

  // Render the quiz
  return (
    <div className="flex items-start justify-center">
      <div className="w-full">
        {/* Processing state with loading indicator and investment tips */}
        {state.isProcessing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-8 h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-primary"></div>
            <h3 className="mb-3 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Analyzing Your Financial Profile
            </h3>
            <p className="mb-8 max-w-md text-gray-600 dark:text-gray-300">
              We're creating your personalized financial portfolio based on your answers...
            </p>
            <div className="max-w-md rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6">
              <h4 className="mb-3 font-medium text-blue-800 dark:text-blue-300">Financial Tip</h4>
              <p className="text-blue-700 dark:text-blue-200">
                {investmentTips[state.currentTip]}
              </p>
            </div>
          </motion.div>
        ) : state.showResults ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={resultVariants}
            className="mx-auto max-w-3xl rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm"
          >           

            {state.calculationResults && (
              <div className="mb-8 space-y-6">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-6">
                  <h3 className="mb-2 text-lg font-semibold text-blue-800 dark:text-blue-300">
                    Financial Health Score: {state.calculationResults.healthScore.toFixed(0)}/100
                  </h3>
                  <p className="text-blue-700 dark:text-blue-200">
                    Your financial health is rated as{" "}
                    <span className="font-medium">
                      {state.calculationResults.healthAssessment}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Projected Retirement Fund
                    </h4>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      ${state.calculationResults.projectedRetirementFund.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      At age {state.calculationResults.portfolioProjection.retirementAge}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Monthly Retirement Income
                    </h4>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      ${state.calculationResults.monthlyRetirementIncome.toLocaleString(undefined, {maximumFractionDigits: 0})}/month
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Using 4% withdrawal rule
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Years Until Retirement
                    </h4>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {state.calculationResults.yearsUntilRetirement} years
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Time to build wealth
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Current Savings Rate
                    </h4>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {state.calculationResults.cashFlow.savingsRatePercent}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ${state.calculationResults.cashFlow.monthlySavings.toLocaleString()}/month
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Risk Profile
                    </h4>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {state.calculationResults.portfolioAllocation.riskScore >= 80 ? 'Aggressive' : 
                       state.calculationResults.portfolioAllocation.riskScore >= 60 ? 'Growth' :
                       state.calculationResults.portfolioAllocation.riskScore >= 40 ? 'Balanced' :
                       state.calculationResults.portfolioAllocation.riskScore >= 20 ? 'Cautious' : 'Conservative'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {state.calculationResults.portfolioAllocation.equityPercentage}% stocks, {state.calculationResults.portfolioAllocation.bondPercentage}% bonds
                    </p>
                  </div>

                  <div className={`rounded-lg p-4 ${state.calculationResults.portfolioProjection.onTrack ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <h4 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Retirement Goal Status
                    </h4>
                    <p className={`text-lg font-semibold ${state.calculationResults.portfolioProjection.onTrack ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                      {state.calculationResults.portfolioProjection.onTrack ? 'On Track' : 'Behind Goal'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {state.calculationResults.portfolioProjection.progressPercentage}% of target (${state.calculationResults.portfolioProjection.targetAmount.toLocaleString()})
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
                Create Your Financial Portfolio
              </h3>
              <p className="mb-4 text-gray-600 dark:text-gray-300">
                We'll create a personalized portfolio based on your assessment results.
              </p>
              
              <div className="mb-4">
                <label
                  htmlFor="portfolio-name"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Portfolio Name
                </label>
                <input
                  type="text"
                  id="dashboard-name"
                  value={state.dashboardName}
                  onChange={handleDashboardNameChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="My Financial Health Portfolio"
                />
              </div>

              <Button
                onClick={handleCreateDashboard}
                disabled={status === "creating"}
                className="w-full"
                size="lg"
              >
                {status === "creating"
                  ? "Creating Portfolio..."
                  : "Create Portfolio"}
              </Button>

              {error && (
                <div className="mt-4 rounded-lg border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full"
          >
            {/* Header with progress bar */}
            <div className=" my-4">
              <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                  Step { categories.findIndex(cat => cat.id === state.activeCategory) + 1 } of {categories.length}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  {categories.find((category)=> category.id === state.activeCategory)?.title}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              
              {/* Preset Profile Selector - only show on first category */}
              {state.activeCategory === "personal-information" && (
                <div className="mt-4">
                  <PresetProfileSelector onProfileSelect={handlePresetProfileSelect} />
                </div>
              )}
              
              {/* Profile Applied Banner */}
              {state.showPresetBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faCheck} className="text-white text-sm" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
                        "{state.appliedProfileName}" profile applied successfully!
                      </h4>
                      <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                        All questions have been pre-filled. You can still modify any answers before submitting.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setState(prev => ({ ...prev, showPresetBanner: false }))}
                    className="flex-shrink-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-sm" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Main content area */}
            <div className="mt-8">
          

              {/* Category tabs */}
              {/* <div className="mb-8 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${state.activeCategory === category.id ? `${category.color} shadow-sm` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {category.title}
                    {isCategoryComplete(category.id) && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="ml-2 text-xs"
                      />
                    )}
                  </button>
                ))}
              </div> */}

              {/* Questions for active category */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.activeCategory}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={categoryVariants}
                  className="space-y-4"
                >
                  {state.activeCategory && (
                    <div className="mb-6 flex flex-col gap-4 space-y-4">
                      {/* Render input fields (number-input, slider) with responsive layout */}
                      {renderInputFields(state.activeCategory)}

                      {/* Render debt repeater */}
                      {questionsByCategory[state.activeCategory]
                        ?.filter((q) => q.type === "debt_list")
                        .map((question) => (
                          <div key={question.id} className="">
                            <h3 className="mb-1 text-sm font-medium text-gray-800">
                              {question.question}
                            </h3>
                            {question.description && (
                              <p className="mb-4 text-xs text-gray-600">
                                {question.description}
                              </p>
                            )}
                            <DebtRepeater
                              debts={(state.answers[question.id] as DebtDetail[]) || []}
                              onChange={(debts) => {
                                handleAnswerChange(question.id, debts);
                              }}
                            />
                          </div>
                        ))}

                      {/* Render choice questions (single-choice, multiple-choice) */}
                      {questionsByCategory[state.activeCategory]
                        ?.filter(
                          (q) =>
                            q.type === "single_choice" ||
                            q.type === "multiple_choice"
                        )
                        .map((question) => (
                          <div key={question.id} className="">
                            <h3 className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                              {question.question}
                            </h3>
                            {question.description && (
                              <p className="mb-4 text-xs text-gray-600">
                                {question.description}
                              </p>
                            )}

                            {/* Single Choice Question */}
                            {question.type === "single_choice" &&
                              question.options && (
                                <div
                                  className={`grid grid-cols-1 ${question.optionsPerRow === 4 ? "md:grid-cols-4" : question.optionsPerRow === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-2`}
                                >
                                  {question.options.map((option) => (
                                    <Button
                                      key={option.value}
                                      variant={state.answers[question.id] === option.value ? "default" : "outline"}
                                      size="sm"
                                      className="p-2 text-sm"
                                      onClick={() =>
                                        handleAnswerChange(
                                          question.id,
                                          option.value,
                                        )
                                      }
                                    >
                                      {option.label}
                                    </Button>
                                  ))}
                                </div>
                              )}

                            {/* Multiple Choice Question */}
                            {question.type === "multiple_choice" &&
                              question.options && (
                                <div
                                  className={`grid grid-cols-1 ${question.optionsPerRow === 4 ? "md:grid-cols-4" : question.optionsPerRow === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-2`}
                                >
                                  {question.options.map((option) => {
                                    const isSelected =
                                      Array.isArray(
                                        state.answers[question.id],
                                      ) &&
                                      (
                                        state.answers[question.id] as string[]
                                      )?.includes(option.value);
                                    return (
                                      <Button
                                        key={option.value}
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        className="p-2 text-sm"
                                        onClick={() =>
                                          handleMultipleChoiceChange(
                                            question.id,
                                            option.value,
                                          )
                                        }
                                      >
                                        {option.label}
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        ))}
                      
                      {/* Moneko AI Advisor Message */}
                      {state.showAdvisorMessage && state.advisorMessage && (
                        <MonekoAdvisorMessage
                          message={state.advisorMessage}
                          showMessage={state.showAdvisorMessage}
                          typewriterSpeed={25}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer with navigation buttons */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 p-6 sm:p-8">
              <Button
                variant="outline"
                onClick={() => {
                  // Find previous category
                  const currentIndex = categories.findIndex(cat => cat.id === state.activeCategory);
                  if (currentIndex > 0) {
                    handleCategoryChange(categories[currentIndex - 1].id);
                  }
                }}
                disabled={
                  state.activeCategory
                    ? categories.findIndex(cat => cat.id === state.activeCategory) <= 0
                    : true
                }
              >
                <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
                Previous
              </Button>

              {state.activeCategory &&
              categories.findIndex(cat => cat.id === state.activeCategory) <
                categories.length - 1 ? (
                <Button
                  variant={isCategoryComplete(state.activeCategory) ? "default" : "secondary"}
                  onClick={() => {
                    // Only proceed if category is complete
                    if (isCategoryComplete(state.activeCategory)) {
                      // Find next category
                      const currentIndex = categories.findIndex(cat => cat.id === state.activeCategory);
                      if (currentIndex < categories.length - 1) {
                        handleCategoryChange(categories[currentIndex + 1].id);
                      }
                    }
                  }}
                  disabled={!isCategoryComplete(state.activeCategory)}
                >
                  Next
                  <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
                </Button>
              ) : (
                <Button
                  variant={isCategoryComplete(state.activeCategory) && isQuizComplete() ? "default" : "secondary"}
                  className={isCategoryComplete(state.activeCategory) && isQuizComplete() ? "bg-green-500 hover:bg-green-600" : ""}
                  onClick={handleSubmitQuiz}
                  disabled={!isCategoryComplete(state.activeCategory) || !isQuizComplete()}
                >
                  Complete Assessment
                  <FontAwesomeIcon icon={faCheck} className="ml-2" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default FinancialHealthQuiz;
