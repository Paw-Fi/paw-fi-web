import React, { useState, useCallback, useMemo, useEffect } from "react";
import RangeSlider from "@/components/ui/RangeSlider";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
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
import { FinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { FinancialAdvisorMessageGenerator, AdvisorMessage } from "./financial-advisor-messages";

// Import shared types and constants
import {
  QuestionCategory,
  QuestionType,
  QuestionOption,
  QuizQuestion,
  CategoryInfo,
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
}

interface ExtendedCalculationResults extends CalculationResults {
  healthScore: number;
  healthAssessment: string;
  projectedRetirementFund: number;
  yearsUntilRetirement: number;
  monthlyRetirementIncome: number;
}

// Categories are now imported from shared constants

// DebtDetail interface is now imported from shared constants

// Quiz questions are now imported from shared constants


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

  // debtTypes is now imported from shared constants

  return (
    <div className="space-y-4">
      {debts.map((debt, index) => (
        <div key={debt.id} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-800">Debt #{index + 1}</h4>
            <button
              onClick={() => removeDebt(debt.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Debt Type
              </label>
              <select
                value={debt.type}
                onChange={(e) => updateDebt(debt.id, 'type', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount Owed
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={debt.amount === 0 ? "" : debt.amount}
                  onChange={(e) => updateDebt(debt.id, 'amount', e.target.value === "" ? 0 : Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-8 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate (APR %)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={debt.interestRate === 0 ? "" : debt.interestRate}
                  onChange={(e) => updateDebt(debt.id, 'interestRate', e.target.value === "" ? 0 : Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="0"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={addDebt}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
      >
        + Add Debt
      </button>
      
      {debts.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500">No debts added yet. Click "Add Debt" to get started.</p>
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
  const navigate = useNavigate();
  const { createDashboardFromQuiz } = useQuizDashboard();
  const [financialProfile, setFinancialProfile] = useState<Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'> | null>(null);

  // State for error handling
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating' | 'complete'>('idle');
  
  // Initial quiz state
  const [state, setState] = useState<QuizState>({
    answers: {
      'debt-details': [], // Initialize debt details as empty array
    },
    activeCategory: "current-situation",
    showResults: false,
    calculationResults: null,
    dashboardName: "My Financial Health Assessment",
    isComplete: false,
    isProcessing: false,
    currentTip: 0,
    advisorMessage: null,
    showAdvisorMessage: false,
  });

  // Group questions by category for easier rendering
  const questionsByCategory = useMemo(() => {
    const grouped: Record<QuestionCategory, QuizQuestion[]> = {
      'current-situation': [],
      'liquidity-needs': [],
      'risk-assessment': [],
      'time-horizon': [],
      'financial-goals': [],
    };
    
    quizQuestions.forEach((question) => {
      if (grouped[question.category]) {
        grouped[question.category].push(question);
      }
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
      return questions.every((question) => {
        if (question.type === "multiple_choice") {
          return (
            Array.isArray(state.answers[question.id]) &&
            (state.answers[question.id] as string[]).length > 0
          );
        }
        if (question.type === "debt_list") {
          // Debt repeater is considered complete if it exists (even if empty array)
          return Array.isArray(state.answers[question.id]);
        }
        if (question.type === "number") {
          // Number inputs are complete if they have a value (not empty string or undefined)
          const answer = state.answers[question.id];
          return answer !== undefined && answer !== "";
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
    
    // Use precomputed results from edge function if available, otherwise calculate client-side
    const baseResults = precomputedResults || calculateResults(state.answers);
    
    // Debug: Log the base results
    console.log('Base results:', baseResults);
    console.log('Portfolio projection:', baseResults.portfolioProjection);
    
    // Calculate financial health score using our quiz calculations
    const healthScore = calculateFinancialHealthScore(state.answers);
    
    // Ensure proper number conversion for age values
    const currentAge = Number(state.answers['current-age']) || 30;
    const retirementAge = Number(state.answers['retirement-age']) || 65;
    
    // Use retirement projections from the new calculation system
    const projectedRetirementFund = baseResults.portfolioProjection.futureValue || 0;
    
    // Debug: Log the projected retirement fund
    console.log('Projected retirement fund:', projectedRetirementFund);
    
    // Calculate monthly retirement income (4% withdrawal rule)
    const monthlyRetirementIncome = (projectedRetirementFund * 0.04) / 12;
    
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
  }, [state.answers]);

  // Handle dashboard creation
  const handleCreateDashboard = useCallback(async () => {
    if (!state.calculationResults) return;
    
    setStatus('creating');
    setError(null);
    
    try {
      // Generate dashboard widgets from calculation results
      const widgets = generateDashboardWidgets(state.calculationResults);
      
      // Create dashboard using the quiz dashboard hook
      await createDashboardFromQuiz(
        state.dashboardName,
        widgets
      );
      
      setStatus('complete');
      if (financialProfile) {
        onDashboardCreated(financialProfile);
      }
    
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError('Failed to create portfolio. Please try again.');
      setStatus('idle');
    }
  }, [state.calculationResults, state.dashboardName, createDashboardFromQuiz, navigate, onDashboardCreated]);

  // Render input fields (number-input, slider) with responsive layout
  const renderInputFields = useCallback(
    (category: QuestionCategory) => {
      const inputQuestions = questionsByCategory[category]?.filter(
        (q) => q.type === "number" || q.type === "slider"
      );

      if (!inputQuestions || inputQuestions.length === 0) return null;

      // If there's only one input question, make it full width
      if (inputQuestions.length === 1) {
        const question = inputQuestions[0];
        return (
          <div key={question.id} className="w-full">
            <h3 className="mb-1 text-sm font-medium text-gray-800">
              {question.question}
          {question.type === "slider" &&     <span className="text-md ml-2 font-bold text-green-500">
              {(state.answers[question.id] as number) || (question.validation?.min || 0)}%

              </span>}
            </h3>
            {question.description && (
              <p className="mb-4 text-xs text-gray-600">{question.description}</p>
            )}

            {question.type === "number" && (
              <div className="relative rounded-lg border border-transparent">
                {question.unit && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
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
  className={`w-full rounded-lg bg-transparent border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary ${question.unit ? "pl-8" : ""}`}
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
          </div>
        );
      }

      // Otherwise, create a responsive grid for multiple input questions
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {inputQuestions.map((question) => (
            <div key={question.id}>
              <h3 className="mb-1 text-sm font-medium text-gray-800">
                {question.question}
               {question.type === "slider" &&  <span className="text-md ml-2 font-bold text-green-500">
              {(state.answers[question.id] as number) || (question.validation?.min || 0)}%

              </span>}
              </h3>
              {question.description && (
                <p className="mb-2 text-xs text-gray-600">
                  {question.description}
                </p>
              )}

              {question.type === "number" && (
                <div className="relative">
                  {question.unit && (
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
  className={`w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary ${question.unit ? "pl-8" : ""}`}
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
            <h3 className="mb-3 text-xl font-semibold text-gray-800">
              Analyzing Your Financial Profile
            </h3>
            <p className="mb-8 max-w-md text-gray-600">
              We're creating your personalized financial portfolio based on your answers...
            </p>
            <div className="max-w-md rounded-lg border border-blue-100 bg-blue-50 p-6">
              <h4 className="mb-3 font-medium text-blue-800">Financial Tip</h4>
              <p className="text-blue-700">
                {investmentTips[state.currentTip]}
              </p>
            </div>
          </motion.div>
        ) : state.showResults ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={resultVariants}
            className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
              Your Financial Health Assessment
            </h2>

            {state.calculationResults && (
              <div className="mb-8 space-y-6">
                <div className="rounded-lg bg-blue-50 p-6">
                  <h3 className="mb-2 text-lg font-semibold text-blue-800">
                    Financial Health Score: {state.calculationResults.healthScore.toFixed(0)}/100
                  </h3>
                  <p className="text-blue-700">
                    Your financial health is rated as{" "}
                    <span className="font-medium">
                      {state.calculationResults.healthAssessment}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Projected Retirement Fund
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      ${state.calculationResults.projectedRetirementFund.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      At age {state.calculationResults.portfolioProjection.retirementAge}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Monthly Retirement Income
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      ${state.calculationResults.monthlyRetirementIncome.toLocaleString(undefined, {maximumFractionDigits: 0})}/month
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Using 4% withdrawal rule
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Years Until Retirement
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {state.calculationResults.yearsUntilRetirement} years
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Time to build wealth
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Current Savings Rate
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {state.calculationResults.cashFlow.savingsRatePercent}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ${state.calculationResults.cashFlow.monthlySavings.toLocaleString()}/month
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Risk Profile
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {state.calculationResults.portfolioAllocation.riskScore >= 80 ? 'Aggressive' : 
                       state.calculationResults.portfolioAllocation.riskScore >= 60 ? 'Growth' :
                       state.calculationResults.portfolioAllocation.riskScore >= 40 ? 'Balanced' :
                       state.calculationResults.portfolioAllocation.riskScore >= 20 ? 'Cautious' : 'Conservative'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {state.calculationResults.portfolioAllocation.equityPercentage}% stocks, {state.calculationResults.portfolioAllocation.bondPercentage}% bonds
                    </p>
                  </div>

                  <div className={`rounded-lg p-4 ${state.calculationResults.portfolioProjection.onTrack ? 'bg-green-50' : 'bg-red-50'}`}>
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Retirement Goal Status
                    </h4>
                    <p className={`text-lg font-semibold ${state.calculationResults.portfolioProjection.onTrack ? 'text-green-900' : 'text-red-900'}`}>
                      {state.calculationResults.portfolioProjection.onTrack ? 'On Track' : 'Behind Goal'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {state.calculationResults.portfolioProjection.progressPercentage}% of target (${state.calculationResults.portfolioProjection.targetAmount.toLocaleString()})
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                Create Your Financial Portfolio
              </h3>
              <p className="mb-4 text-gray-600">
                We'll create a personalized portfolio based on your assessment results.
              </p>
              
              <div className="mb-4">
                <label
                  htmlFor="portfolio-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Portfolio Name
                </label>
                <input
                  type="text"
                  id="dashboard-name"
                  value={state.dashboardName}
                  onChange={handleDashboardNameChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="My Financial Health Portfolio"
                />
              </div>

              <button
                onClick={handleCreateDashboard}
                disabled={status === "creating"}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "creating"
                  ? "Creating Portfolio..."
                  : "Create Portfolio"}
              </button>

              {error && (
                <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
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
                            <h3 className="mb-1 text-sm font-medium text-gray-800">
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
                                    <button
                                      key={option.value}
                                      className={`rounded-md p-2 text-sm transition-colors ${state.answers[question.id] === option.value ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                      onClick={() =>
                                        handleAnswerChange(
                                          question.id,
                                          option.value,
                                        )
                                      }
                                    >
                                      {option.label}
                                    </button>
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
                                      <button
                                        key={option.value}
                                        className={`rounded-md p-2 text-sm transition-colors ${isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                        onClick={() =>
                                          handleMultipleChoiceChange(
                                            question.id,
                                            option.value,
                                          )
                                        }
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        ))}
                      
                      {/* Advisor Message */}
                      {state.showAdvisorMessage && state.advisorMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className={`rounded-lg p-6 shadow-sm border-l-4 ${
                            state.advisorMessage.tone === 'congratulatory' 
                              ? 'bg-green-50 border-green-400' 
                              : state.advisorMessage.tone === 'encouraging'
                              ? 'bg-blue-50 border-blue-400'
                              : state.advisorMessage.tone === 'motivational'
                              ? 'bg-purple-50 border-purple-400'
                              : 'bg-amber-50 border-amber-400'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                              state.advisorMessage.tone === 'congratulatory' 
                                ? 'bg-green-500' 
                                : state.advisorMessage.tone === 'encouraging'
                                ? 'bg-blue-500'
                                : state.advisorMessage.tone === 'motivational'
                                ? 'bg-purple-500'
                                : 'bg-amber-500'
                            }`}>
                              <FontAwesomeIcon 
                                icon={state.advisorMessage.tone === 'congratulatory' ? faCheck : faChevronRight} 
                                className="text-sm" 
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className={`text-sm font-semibold mb-2 ${
                                state.advisorMessage.tone === 'congratulatory' 
                                  ? 'text-green-800' 
                                  : state.advisorMessage.tone === 'encouraging'
                                  ? 'text-blue-800'
                                  : state.advisorMessage.tone === 'motivational'
                                  ? 'text-purple-800'
                                  : 'text-amber-800'
                              }`}>
                                {state.advisorMessage.tone === 'congratulatory' && '🎉 Great work!'}
                                {state.advisorMessage.tone === 'encouraging' && '💪 You\'re on the right track!'}
                                {state.advisorMessage.tone === 'motivational' && '🚀 Let\'s build momentum!'}
                                {state.advisorMessage.tone === 'reassuring' && '🤝 You\'re not alone in this!'}
                              </h4>
                              <p className={`text-sm leading-relaxed ${
                                state.advisorMessage.tone === 'congratulatory' 
                                  ? 'text-green-700' 
                                  : state.advisorMessage.tone === 'encouraging'
                                  ? 'text-blue-700'
                                  : state.advisorMessage.tone === 'motivational'
                                  ? 'text-purple-700'
                                  : 'text-amber-700'
                              }`}>
                                {state.advisorMessage.message}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer with navigation buttons */}
            <div className="flex items-center justify-between border-t border-gray-100 p-6 sm:p-8">
              <button
                className="flex items-center rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-gray-600 transition-all hover:bg-gray-100"
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
              </button>

              {state.activeCategory &&
              categories.findIndex(cat => cat.id === state.activeCategory) <
                categories.length - 1 ? (
                <button
                  className={`flex items-center rounded-lg px-6 py-2.5 font-medium shadow-sm transition-all ${isCategoryComplete(state.activeCategory) ? "bg-primary text-white hover:bg-secondary" : "cursor-not-allowed bg-gray-300 text-gray-500"}`}
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
                </button>
              ) : (
                <button
                  className={`flex items-center rounded-lg px-6 py-2.5 font-medium shadow-sm transition-all ${isCategoryComplete(state.activeCategory) && isQuizComplete() ? "bg-green-500 text-white hover:bg-green-600" : "cursor-not-allowed bg-gray-300 text-gray-500"}`}
                  onClick={handleSubmitQuiz}
                  disabled={!isCategoryComplete(state.activeCategory) || !isQuizComplete()}
                >
                  Complete Assessment
                  <FontAwesomeIcon icon={faCheck} className="ml-2" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default FinancialHealthQuiz;
