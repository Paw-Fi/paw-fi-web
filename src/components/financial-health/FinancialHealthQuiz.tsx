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
import { calculateFinancialHealthScore } from "../profile/widgets/FinancialWidgets";
import {
  calculateResults,
  generateDashboardWidgets,
  CalculationResults,
} from "./quiz-calculations";

// Types
type QuestionCategory =
  | "current-situation"
  | "liquidity-needs"
  | "risk-assessment"
  | "time-horizon"
  | "financial-goals";

type QuestionType =
  | "single-choice"
  | "multiple-choice"
  | "number-input"
  | "slider";

interface QuestionOption {
  value: string;
  label: string;
}

interface QuizQuestion {
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
  optionsPerRow?: 2 | 3 | 4; // Controls how many option buttons appear per row
  placeholder?: string;
}

interface CategoryInfo {
  id: QuestionCategory;
  title: string;
  description: string;
  color: string;
}

interface QuizState {
  answers: Record<string, string | string[] | number | boolean>;
  activeCategory: QuestionCategory;
  showResults: boolean;
  calculationResults: ExtendedCalculationResults | null;
  dashboardName: string;
  isComplete: boolean;
  isProcessing: boolean;
  currentTip: number;
}

interface ExtendedCalculationResults extends CalculationResults {
  healthScore: number;
  healthAssessment: string;
  projectedRetirementFund: number;
  yearsUntilRetirement: number;
  monthlyRetirementIncome: number;
}

// Category information
const categories: CategoryInfo[] = [
  {
    id: "current-situation",
    title: "Current Financial Situation",
    description: "Tell us about your current financial status",
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "liquidity-needs",
    title: "Liquidity Needs",
    description: "How quickly might you need access to your money?",
    color: "bg-green-100 text-green-600",
  },
  {
    id: "risk-assessment",
    title: "Risk Assessment",
    description: "How comfortable are you with investment risk?",
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "time-horizon",
    title: "Time Horizon",
    description: "When will you need your investments?",
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "financial-goals",
    title: "Financial Goals",
    description: "What are you saving and investing for?",
    color: "bg-indigo-100 text-indigo-600",
  },
];

// Quiz questions array
const quizQuestions: QuizQuestion[] = [
  // Investment risk profile questions
  {
    id: "paid-all-debt",
    question: "Have you currently paid all the debt (e.g., mortgage, credit cards, student loans)?",
    description: "Your debt status affects recommended investment strategies.",
    type: "single-choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    category: "risk-assessment",
  },
  {
    id: "expect-lump-sum",
    question: "Do you expect lump sum income in the future (e.g., inheritance, asset sale)?",
    description: "Future windfalls may impact your investment horizon and risk tolerance.",
    type: "single-choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    category: "risk-assessment",
  },
  {
    id: "long-term-goal",
    question: "Do you like to achieve your financial goal in more than 1 year?",
    description: "Long-term goals often allow for different investment strategies.",
    type: "single-choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    category: "risk-assessment",
  },
  {
    id: "predictable-income",
    question: "Do you have a job with predictable income?",
    description: "Income stability affects how much risk you might be able to take on.",
    type: "single-choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    category: "risk-assessment",
  },
  {
    id: "high-risk-preference",
    question: "Would you prefer a strategy that offers high returns despite the high risk?",
    description: "Your preference for risk vs. return is a key factor in portfolio design.",
    type: "single-choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    category: "risk-assessment",
  },
  {
    id: "risky-investments",
    question: "Have you ever invested some highly risky assets (e.g. hedge fund, private equity)?",
    description: "Past investment experience can indicate comfort with certain types of risk.",
    type: "single-choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    category: "risk-assessment",
  },
  {
    id: "extreme-sports",
    question: "Do you like extreme sports such as Bungee Jumping, Parachuting, Rock Climbing?",
    description: "Comfort with physical risk often correlates with financial risk tolerance.",
    type: "single-choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" }
    ],
    category: "risk-assessment",
  },
  {
    id: "current-age",
    question: "What is your current age?",
    description: "This helps us calculate your retirement timeline.",
    type: "number-input",
    min: 0,
    max: 100,
    category: "current-situation",
  },
  {
    id: "monthly-income",
    question: "What is your monthly income?",
    description: "Your gross monthly income before taxes and deductions.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "monthly-expenses",
    question: "What are your approximate monthly expenses?",
    description: "Include an estimate of all regular monthly expenditures such as housing, utilities, food, transportation, etc.",
    type: "number-input",
    min: 0,
    unit: "$",
    category: "current-situation",
  },
  {
    id: "retirement-age",
    question: "At what age do you plan to retire?",
    description: "This helps us calculate your investment horizon.",
    type: "number-input",
    min: 0,
    max: 100,
    category: "time-horizon",
  },
  {
    id: "annual-contribution",
    question: "How much can you contribute annually to investments?",
    description: "Consider your regular savings for long-term goals.",
    type: "number-input",
    unit: "$",
    category: "current-situation",
  },
  {
    id: "current-assets",
    question: "What is the total value of your current investable assets?",
    description: "Include savings, investments, and other liquid assets.",
    type: "number-input",
    unit: "$",
    category: "current-situation",
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
    id: "emergency-fund",
    question:
      "How many months of expenses can your emergency fund cover?",
    description:
      "Experts recommend 3-6 months of basic living expenses.",
    type: "number-input",
    min: 0,
    max: 36,
    category: "liquidity-needs",
  },
  {
    id: "investment-goals",
    question: "What are your primary investment goals?",
    description: "Select all that apply to your situation.",
    type: "multiple-choice",
    options: [
      { value: "retirement", label: "Retirement" },
      { value: "education", label: "Education" },
      { value: "home", label: "Home purchase" },
      { value: "wealth", label: "General wealth building" },
      { value: "income", label: "Generate income" },
    ],
    optionsPerRow: 3,
    category: "financial-goals",
  },
  {
    id: "time-horizon",
    question: "When do you expect to need most of your investments?",
    description: "This helps determine appropriate investment vehicles.",
    type: "single-choice",
    options: [
      { value: "short", label: "Short term (0-3 years)" },
      { value: "medium", label: "Medium term (3-7 years)" },
      { value: "long", label: "Long term (7+ years)" },
    ],
    optionsPerRow: 3,
    category: "time-horizon",
  },
  {
    id: "debt-level",
    question: "How much total debt do you have at the moment?",
    description: "Add up all loans, credit cards, and other money you owe.",
    type: "number-input",
    unit: "$",
    category: "current-situation",
  },
  {
    id: "debt-type",
    question: "What types of debt do you currently have?",
    description: "Select all that apply to your situation.",
    type: "multiple-choice",
    options: [
      { value: "mortgage", label: "Mortgage" },
      { value: "student", label: "Student loans" },
      { value: "auto", label: "Auto loans" },
      { value: "credit-card", label: "Credit card debt" },
      { value: "personal-loan", label: "Personal loan" },
      { value: "medical-debt", label: "Medical debt" },
    ],
    optionsPerRow: 3,
    category: "current-situation",
  },
  {
    id: "liquidity-importance",
    question: "How important is liquidity (quick access to your money) to you?",
    description: "This helps determine suitable investment types.",
    type: "single-choice",
    options: [
      {
        value: "very-important",
        label: "Very important - Need frequent access",
      },
      { value: "important", label: "Important - May need occasional access" },
      {
        value: "somewhat-important",
        label: "Somewhat important - Rarely need access",
      },
      {
        value: "not-important",
        label: "Not important - Can lock up funds long-term",
      },
    ],
    category: "liquidity-needs",
  },
  {
    id: "market-downturn",
    question: "How would you react to a 20% market downturn?",
    description:
      "This helps assess your emotional response to market volatility.",
    type: "single-choice",
    options: [
      { value: "sell", label: "Sell to prevent further losses" },
      { value: "worried", label: "Worried but would not sell" },
      { value: "wait", label: "Wait and see before making changes" },
      { value: "buy-more", label: "Buy more investments at lower prices" },
    ],
    category: "risk-assessment",
  },
  {
    id: "investment-knowledge",
    question: "How would you rate your investment knowledge?",
    description: "Be honest about your familiarity with investment concepts.",
    type: "single-choice",
    options: [
      { value: "beginner", label: "Beginner - Limited knowledge" },
      { value: "intermediate", label: "Intermediate - Understand basics" },
      {
        value: "advanced",
        label: "Advanced - Comfortable with complex investments",
      },
      { value: "expert", label: "Expert - Professional knowledge" },
    ],
    category: "risk-assessment",
  },
  {
    id: "housing-situation",
    question: "What is your current housing situation?",
    description: "This helps us understand your housing expenses and assets.",
    type: "single-choice",
    options: [
      { value: "rent", label: "Renting" },
      { value: "own-mortgage", label: "Own with mortgage" },
      { value: "own-paid", label: "Own outright (no mortgage)" },
      { value: "other", label: "Other arrangement" },
    ],
    category: "current-situation",
  },
  {
    id: "expected-return",
    question: "What annual return do you expect from your investments?",
    description: "Typical market averages range from 6-8% before inflation.",
    type: "slider",
    min: 0,
    max: 12,
    step: 0.1,
    unit: "%",
    category: "financial-goals",
  },
  {
    id: "inflation-rate",
    question: "What inflation rate do you expect over your investment horizon?",
    description: "Historical average is around 2-3% in the US.",
    type: "slider",
    min: 0,
    max: 10,
    step: 0.1,
    unit: "%",
    category: "risk-assessment",
  },
  {
    id: "education-timeframe",
    question: "If saving for education, when will funds be needed?",
    description: "This helps determine appropriate education savings vehicles.",
    type: "single-choice",
    options: [
      { value: "0-2", label: "0-2 years" },
      { value: "3-5", label: "3-5 years" },
      { value: "6-10", label: "6-10 years" },
      { value: "10+", label: "10+ years" },
    ],
    optionsPerRow: 4,
    category: "time-horizon",
  },
  {
    id: "insurance-coverage",
    question: "Which types of insurance coverage do you currently have?",
    description: "Select all that apply to your current situation.",
    type: "multiple-choice",
    options: [
      { value: "health", label: "Health insurance" },
      { value: "life", label: "Life insurance" },
      { value: "disability", label: "Disability insurance" },
      { value: "auto", label: "Auto insurance" },
      { value: "home", label: "Home/renters insurance" },
      { value: "umbrella", label: "Umbrella policy" },
      { value: "ltc", label: "Long-term care insurance" },
    ],
    optionsPerRow: 3,
    category: "risk-assessment",
  },
  {
    id: "financial-priorities",
    question: "What are your top financial priorities right now?",
    description: "Select up to 3 that are most important to you.",
    type: "multiple-choice",
    options: [
      { value: "debt-reduction", label: "Reducing debt" },
      { value: "emergency-fund", label: "Building emergency fund" },
      { value: "retirement", label: "Retirement savings" },
      { value: "home", label: "Buying a home" },
      { value: "education", label: "Education savings" },
      { value: "income", label: "Increasing income" },
      { value: "tax-efficiency", label: "Tax efficiency" },
      { value: "estate-planning", label: "Estate planning" },
    ],
    optionsPerRow: 3,
    category: "financial-goals",
  },
  {
    id: "health-status",
    question: "How would you describe your overall health?",
    description: "Health status can impact financial planning needs.",
    type: "single-choice",
    options: [
      { value: "excellent", label: "Excellent - No health concerns" },
      { value: "good", label: "Good - Minor health concerns" },
      { value: "fair", label: "Fair - Some health issues" },
      { value: "poor", label: "Poor - Significant health concerns" },
    ],
    category: "risk-assessment",
  },
];

// Helper function to check if an answer is selected in multiple choice questions
const isAnswerSelected = (
  answers: Record<string, string | string[] | number | boolean>,
  questionId: string,
  value: string,
): boolean => {
  if (!answers[questionId]) return false;
  if (Array.isArray(answers[questionId])) {
    return (answers[questionId] as string[]).includes(value);
  }
  return answers[questionId] === value;
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

export function FinancialHealthQuiz(props: {onDashboardCreated: () => void}) {
  const {onDashboardCreated} = props;
  const navigate = useNavigate();
  const { createDashboardFromQuiz } = useQuizDashboard();

  // State for error handling
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating' | 'complete'>('idle');
  
  // Initial quiz state
  const [state, setState] = useState<QuizState>({
    answers: {},
    activeCategory: "current-situation",
    showResults: false,
    calculationResults: null,
    dashboardName: "My Financial Health Assessment",
    isComplete: false,
    isProcessing: false,
    currentTip: 0,
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
    return (currentCategoryIndex + 1) / totalCategories;
  }, [state.activeCategory]);
  
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
      }, 3000); // Change tip every 3 seconds
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
        if (question.type === "multiple-choice") {
          return (
            Array.isArray(state.answers[question.id]) &&
            (state.answers[question.id] as string[]).length > 0
          );
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

  // Handle answer changes for single-choice and number inputs
  const handleAnswerChange = (questionId: string, value: string | number | boolean | string[]) => {
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
  const handleSubmitQuiz = useCallback(() => {
    if (!isQuizComplete()) {
      setError("Please complete all questions before submitting.");
      return;
    }

    // Start processing state with loading indicator
    setState(prev => ({ ...prev, isProcessing: true }));
    
    // Simulate processing time (7 seconds)
    setTimeout(() => {
      handleCompleteQuiz();
    }, 8000);
  }, [isQuizComplete]);

  // Handle quiz completion
  const handleCompleteQuiz = useCallback(() => {
    // Calculate results based on answers
    const baseResults = calculateResults(state.answers);
    
    
    // Calculate financial health score using the shared utility
    const financialHealthResult = calculateFinancialHealthScore(state.answers);
    
    // Ensure proper number conversion for age values
    const currentAge = Number(state.answers['current-age']) || 30;
    const retirementAge = Number(state.answers['retirement-age']) || 65;
    
    // Use retirement projections from the financial health utility
    const projectedRetirementFund = financialHealthResult.projectedRetirementFund || 0;
    const monthlyRetirementIncome = financialHealthResult.monthlyRetirementIncome || 0;
    
    // Create extended results with additional properties
    const extendedResults: ExtendedCalculationResults = {
      ...baseResults,
      healthScore: financialHealthResult.overallScore, 
      healthAssessment: financialHealthResult.status,
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
      onDashboardCreated();
      
      // Navigate to the dashboard
      navigate({ to: '/dashboard' });
    } catch (err) {
      console.error('Error creating dashboard:', err);
      setError('Failed to create dashboard. Please try again.');
      setStatus('idle');
    }
  }, [state.calculationResults, state.dashboardName, createDashboardFromQuiz, navigate, onDashboardCreated]);

  // Render input fields (number-input, slider) with responsive layout
  const renderInputFields = useCallback(
    (category: QuestionCategory) => {
      const inputQuestions = questionsByCategory[category]?.filter(
        (q) => q.type === "number-input" || q.type === "slider"
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
              {state.answers[question.id] || question.min}%

              </span>}
            </h3>
            {question.description && (
              <p className="mb-4 text-xs text-gray-600">{question.description}</p>
            )}

            {question.type === "number-input" && (
              <div className="relative rounded-lg border border-transparent">
                {question.unit && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {question.unit}
                  </span>
                )}
              <input
  type="number"
  value={state.answers[question.id] === "" ? "" : Number(state.answers[question.id])}
  onChange={(e) => {
    const value = e.target.value;
    handleAnswerChange(question.id, value === "" ? "" : Number(value));
  }}
  min={question.min}
  max={question.max}
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
                    {question.min}%
                  </span>
                  <span className="text-xs font-medium">
                  {((question?.max||0 - question?.min||0) / 2).toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {question.max}%
                  </span>
                </div>
                <RangeSlider
                  min={question.min}
                  max={question.max}
                  step={question.step || 1}
                  value={Number(state.answers[question.id]) || question.min}
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
              {state.answers[question.id] || question.min}%

              </span>}
              </h3>
              {question.description && (
                <p className="mb-2 text-xs text-gray-600">
                  {question.description}
                </p>
              )}

              {question.type === "number-input" && (
                <div className="relative">
                  {question.unit && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {question.unit}
                    </span>
                  )}
                 <input
  type="number"
  value={state.answers[question.id] ?? ""}
  onChange={(e) => {
    const value = e.target.value;
    // Only update if it's a valid number, otherwise, set it as an empty string
    handleAnswerChange(question.id, value === "" ? "" : Number(value));
  }}
  min={question.min}
  max={question.max}
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
                      {question?.min}%
                    </span>
                    <span className="text-xs font-medium">
                      {((question?.max||0 - question?.min||0) / 2).toFixed(0)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {question?.max}%
                    </span>
                  </div>
                  <RangeSlider
                    min={question.min}
                    max={question.max}
                    step={question.step || 1}
                    value={Number(state.answers[question.id]) || question.min}
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
              We're creating your personalized financial dashboard based on your answers...
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Projected Retirement Fund
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      ${state.calculationResults.projectedRetirementFund.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Years Until Retirement
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {state.calculationResults.yearsUntilRetirement} years
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-1 text-sm font-medium text-gray-700">
                      Estimated Monthly Income in Retirement
                    </h4>
                    <p className="text-lg font-semibold text-gray-900">
                      ${state.calculationResults.monthlyRetirementIncome.toLocaleString(undefined, {maximumFractionDigits: 0})}/month
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                Create Your Financial Dashboard
              </h3>
              <p className="mb-4 text-gray-600">
                We'll create a personalized dashboard based on your assessment results.
              </p>
              
              <div className="mb-4">
                <label
                  htmlFor="dashboard-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Dashboard Name
                </label>
                <input
                  type="text"
                  id="dashboard-name"
                  value={state.dashboardName}
                  onChange={handleDashboardNameChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="My Financial Health Dashboard"
                />
              </div>

              <button
                onClick={handleCreateDashboard}
                disabled={status === "creating"}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "creating"
                  ? "Creating Dashboard..."
                  : "Create Dashboard"}
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
                  Step { Object.keys(questionsByCategory).indexOf(state.activeCategory) +1 } of {categories.length}
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

                      {/* Render choice questions (single-choice, multiple-choice) */}
                      {questionsByCategory[state.activeCategory]
                        ?.filter(
                          (q) =>
                            q.type === "single-choice" ||
                            q.type === "multiple-choice"
                        )
                        .map((question) => (
                          <div key={question.id} className="">
                            <h3 className="mb-1 text-sm font-medium text-gray-800">
                              {question.question}
                            </h3>
                            {question.description && (
                              <p className="mb-2 mb-4 text-xs text-gray-600">
                                {question.description}
                              </p>
                            )}

                            {/* Single Choice Question */}
                            {question.type === "single-choice" &&
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
                            {question.type === "multiple-choice" &&
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
                  const categoryList = Object.keys(
                    questionsByCategory,
                  ) as QuestionCategory[];
                  const currentIndex = state.activeCategory
                    ? categoryList.indexOf(state.activeCategory)
                    : -1;
                  if (currentIndex > 0) {
                    handleCategoryChange(categoryList[currentIndex - 1]);
                  }
                }}
                disabled={
                  state.activeCategory
                    ? Object.keys(questionsByCategory).indexOf(
                        state.activeCategory,
                      ) <= 0
                    : true
                }
              >
                <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
                Previous
              </button>

              {state.activeCategory &&
              Object.keys(questionsByCategory).indexOf(state.activeCategory) <
                Object.keys(questionsByCategory).length - 1 ? (
                <button
                  className={`flex items-center rounded-lg px-6 py-2.5 font-medium shadow-sm transition-all ${isCategoryComplete(state.activeCategory) ? "bg-primary text-white hover:bg-secondary" : "cursor-not-allowed bg-gray-300 text-gray-500"}`}
                  onClick={() => {
                    // Only proceed if category is complete
                    if (isCategoryComplete(state.activeCategory)) {
                      // Find next category
                      const categoryList = Object.keys(
                        questionsByCategory,
                      ) as QuestionCategory[];
                      const currentIndex = state.activeCategory
                        ? categoryList.indexOf(state.activeCategory)
                        : -1;
                      if (currentIndex < categoryList.length - 1) {
                        handleCategoryChange(categoryList[currentIndex + 1]);
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
