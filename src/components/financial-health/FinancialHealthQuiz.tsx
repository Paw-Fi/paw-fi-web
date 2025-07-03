import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useQuizDashboard } from "./useQuizDashboard";
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
    id: "retirement-age",
    question: "At what age do you plan to retire?",
    description: "This helps us calculate your investment horizon.",
    type: "number-input",
    min: 0,
    max: 100,
    category: "time-horizon",
  },
  {
    id: "debt-level",
    question: "How much total debt do you have?",
    description: "Add up all loans, credit cards, and other money you owe.",
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
    unit: " months",
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
    id: "annual-contribution",
    question: "How much can you contribute annually to investments?",
    description: "Consider your regular savings for long-term goals.",
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

export function FinancialHealthQuiz() {
  const navigate = useNavigate();
  const {
    createDashboardFromQuiz,
    status,
    error: dashboardError,
  } = useQuizDashboard();
  const [error, setError] = useState<string | null>(null);

  // Initial quiz state
  const [state, setState] = useState<QuizState>({
    answers: {},
    activeCategory: "current-situation",
    showResults: false,
    calculationResults: null,
    dashboardName: "My Financial Health Assessment",
    isComplete: false,
  });

  // Group questions by category
  const questionsByCategory = useMemo<
    Record<QuestionCategory, QuizQuestion[]>
  >(() => {
    const categories: Record<QuestionCategory, QuizQuestion[]> = {
      "current-situation": [],
      "liquidity-needs": [],
      "risk-assessment": [],
      "time-horizon": [],
      "financial-goals": [],
    };

    quizQuestions.forEach((question: QuizQuestion) => {
      if (question.category) {
        categories[question.category].push(question);
      }
    });
    return categories;
  }, []);

  // Calculate progress
  const progress = useMemo(() => {
    const current= state.activeCategory?
    Object.keys(questionsByCategory).indexOf(
        state.activeCategory,
      )  :0
      const total = Object.keys(questionsByCategory).length;
      return current / total;
    
  }, [state.activeCategory]);
  // Helper function to get category label
  const getCategoryLabel = useCallback((category: QuestionCategory): string => {
    const found = categories.find((c) => c.id === category);
    return found ? found.title : "";
  }, []);

  // Helper function to check if a category is complete
  const isCategoryComplete = useCallback(
    (category: QuestionCategory): boolean => {
      const categoryQuestions = questionsByCategory[category] || [];

      // If there are no questions in this category, consider it complete
      if (categoryQuestions.length === 0) return true;

      // Check if all questions in the category have been answered
      return categoryQuestions.every((question: QuizQuestion) => {
        const answer = state.answers[question.id];

        // For multiple choice questions, ensure at least one option is selected
        if (question.type === "multiple-choice") {
          return Array.isArray(answer) && answer.length > 0;
        }

        // For all other question types, ensure an answer exists
        return answer !== undefined && answer !== "";
      });
    },
    [questionsByCategory, state.answers],
  );

  // Handle answer changes
  const handleAnswerChange = useCallback(
    (questionId: string, value: string | string[] | number | boolean) => {
      setState((prev) => {
        // Handle multiple choice questions (toggle selection)
        if (Array.isArray(prev.answers[questionId])) {
          const currentAnswers = prev.answers[questionId] as string[];
          let newAnswers: string[];

          if (currentAnswers.includes(value as string)) {
            // Remove the value if already selected
            newAnswers = currentAnswers.filter((v) => v !== value);
          } else {
            // Add the value if not selected
            newAnswers = [...currentAnswers, value as string];
          }

          return {
            ...prev,
            answers: {
              ...prev.answers,
              [questionId]: newAnswers,
            },
          };
        }

        // Handle single choice, number input, and slider questions
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: value,
          },
        };
      });
    },
    [],
  );

  // Helper function for multiple choice questions
  const handleMultipleChoiceChange = useCallback(
    (questionId: string, value: string) => {
      setState((prev) => {
        const currentAnswers = (prev.answers[questionId] as string[]) || [];
        let newAnswers: string[];

        if (currentAnswers.includes(value)) {
          // Remove the value if it's already selected
          newAnswers = currentAnswers.filter((v) => v !== value);
        } else {
          // Add the value if it's not already selected
          newAnswers = [...currentAnswers, value];
        }

        return {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: newAnswers,
          },
        };
      });
    },
    [],
  );

  // Helper function to render input fields (number-input, slider) with responsive layout
  const renderInputFields = useCallback(
    (category: QuestionCategory) => {
      const inputQuestions = questionsByCategory[category]?.filter(
        (question: QuizQuestion) =>
          question.type === "number-input" || question.type === "slider",
      );

      if (!inputQuestions || inputQuestions.length === 0) {
        return null;
      }

      return (
        <div
          className={`grid grid-cols-1 ${inputQuestions.length === 1 ? "" : "md:grid-cols-2"} gap-6`}
        >
          {inputQuestions.map((question: QuizQuestion) => (
            <div key={question.id} className="">
              <h3 className="mb-1 text-sm font-medium text-gray-800">
                {question.question}
                {question.type === "slider" && (
                    <span className="text-md text-bold text-green-600 ml-2">
                      {state.answers[question.id] || question.min}
                      {question.unit}
                    </span>
                  )}
              </h3>
              {question.description && (
                <p className="mb-1 mb-4 text-xs text-gray-600">
                  {question.description}

                
                </p>
              )}

              {question.type === "number-input" && (
                <input
                  type="number"
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  placeholder={question.placeholder || ""}
                  value={(state.answers[question.id] as string) || ""}
                  onChange={(e) =>
                    handleAnswerChange(question.id, e.target.value)
                  }
                  min={question.min}
                  max={question.max}
                  step={question.step || 1}
                />
              )}

              {question.type === "slider" && (
                <div className="mt-2">
                  <input
                    type="range"
                    className="w-full"
                    min={question.min}
                    max={question.max}
                    step={question.step || 1}
                    value={
                      (state.answers[question.id] as number) || question.min
                    }
                    onChange={(e) =>
                      handleAnswerChange(question.id, parseInt(e.target.value))
                    }
                  />
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>
                      {question.min}
                      {question.unit}
                    </span>
                    <span>
                      {((question?.max || 0) - (question?.min || 0)) / 2}
                      {question.unit}
                    </span>
                    <span>
                      {question.max}
                      {question.unit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
    [questionsByCategory, state.answers, handleAnswerChange],
  );

  // Check if all categories are complete
  const isQuizComplete = useCallback((): boolean => {
    return categories.every((category) => isCategoryComplete(category.id));
  }, [isCategoryComplete]);

  // Handle quiz completion
  const handleCompleteQuiz = useCallback(() => {
    // Calculate results based on answers
    console.log('Quiz answers before calculation:', state.answers);
    const baseResults = calculateResults(state.answers);
    
    console.log('Base calculation results:', baseResults);
    
    // Map the base results to the extended results format
    const currentAge = state.answers['current-age'] as number || 30;
    const retirementAge = state.answers['retirement-age'] as number || 65;
    
    // Create extended results with additional properties
    const extendedResults: ExtendedCalculationResults = {
      ...baseResults,
      healthScore: baseResults.financialHealthScore.overallScore,
      healthAssessment: baseResults.financialHealthScore.status,
      projectedRetirementFund: baseResults.portfolioProjection.futureValue,
      yearsUntilRetirement: retirementAge - currentAge,
      monthlyRetirementIncome: baseResults.portfolioProjection.futureValue / (25 * 12) // Simple estimation
    };
    
    console.log('Extended calculation results:', extendedResults);

    // Update state to show results
    setState((prev) => {
      console.log('Setting calculation results:', extendedResults);
      return {
        ...prev,
        isComplete: true,
        calculationResults: extendedResults,
        showResults: true,
      };
    });
  }, [state.answers]);

  // Handle dashboard creation and navigation
  const handleCreateDashboard = useCallback(async () => {
    if (!state.calculationResults) return;

    // Create dashboard view with the generated widgets
    try {
      const viewName = state.dashboardName || "Financial Health Assessment";
      const widgets = generateDashboardWidgets(state.calculationResults);

      // Create the dashboard view
      await createDashboardFromQuiz(viewName, widgets);

      // Navigate to the dashboard
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("Error creating dashboard:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Error creating dashboard: ${errorMessage}`);
    }
  }, [
    state.calculationResults,
    state.dashboardName,
    navigate,
    createDashboardFromQuiz,
  ]);

  // Handle submitting the quiz
  const handleSubmitQuiz = useCallback(() => {
    if (!isQuizComplete()) {
      setError("Please complete all questions before submitting.");
      return;
    }

    handleCompleteQuiz();
  }, [isQuizComplete, handleCompleteQuiz]);

  // Handle dashboard name change
  const handleDashboardNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({
        ...prev,
        dashboardName: e.target.value,
      }));
    },
    [],
  );

  // Handle category change
  const handleCategoryChange = useCallback((category: QuestionCategory) => {
    setState((prev) => ({
      ...prev,
      activeCategory: category,
    }));
  }, []);

  // Initialize multiple choice answers as arrays
  useEffect(() => {
    const initialAnswers = { ...state.answers };

    quizQuestions.forEach((question) => {
      if (question.type === "multiple-choice" && !initialAnswers[question.id]) {
        initialAnswers[question.id] = [];
      }
    });

    if (
      Object.keys(initialAnswers).length > Object.keys(state.answers).length
    ) {
      setState((prev) => ({
        ...prev,
        answers: initialAnswers,
      }));
    }
  }, []);

  // Render the quiz
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-3 py-6 sm:px-4 sm:py-12">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
        {/* Results screen */}
        {state.showResults ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={resultVariants}
            className="w-full"
          >
            <div className="p-8 sm:p-10">
              <div className="mb-8 border-b border-gray-100 pb-6">
                <h2 className="mb-2 text-2xl font-bold text-gray-800">
                  Financial Health Assessment Results
                </h2>
                <p className="text-gray-600">
                  Review your financial health assessment and create a
                  personalized dashboard.
                </p>
              </div>

              {state.calculationResults && (
                <div className="space-y-8">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
                    <h3 className="mb-4 text-xl font-semibold text-blue-800">
                      Your Financial Health Score
                    </h3>
                    <div className="flex items-center justify-center">
                      <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-blue-500 bg-white shadow-lg">
                        <span className="text-3xl font-bold text-blue-700">
                          {state.calculationResults?.healthScore || 0}%
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-center text-blue-700">
                      {state.calculationResults?.healthAssessment || 'No assessment available'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="mb-4 text-xl font-semibold text-gray-800">
                      Retirement Projection
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          Projected Retirement Fund:
                        </span>
                        <span className="font-semibold text-gray-800">
                          $
                          {state.calculationResults?.projectedRetirementFund?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          Years Until Retirement:
                        </span>
                        <span className="font-semibold text-gray-800">
                          {state.calculationResults?.yearsUntilRetirement?.toLocaleString()  || 'N/A'} years
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          Monthly Income in Retirement:
                        </span>
                        <span className="font-semibold text-gray-800">
                          $
                          {state.calculationResults?.monthlyRetirementIncome?.toLocaleString() || 'N/A'}
                          /month
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="mb-4 text-xl font-semibold text-gray-800">
                      Create Your Financial Dashboard
                    </h3>
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="My Financial Health Dashboard"
                      />
                    </div>

                    <button
                      onClick={handleCreateDashboard}
                      disabled={status === "creating"}
                      className="flex w-full items-center justify-center rounded-lg bg-blue-500 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
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
            <div className="border-b border-gray-100 p-6 sm:p-8">
              <div className="mb-2 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-800">
                  Financial Health Assessment
                </h1>
                <span className="text-sm font-medium text-gray-500">
                  {Math.round(progress * 100)}% Complete
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Main content area */}
            <div className="bg-white p-8 sm:p-10">
          

              {/* Category tabs */}
              <div className="mb-8 flex flex-wrap gap-2">
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
              </div>

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
                            q.type === "multiple-choice",
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
                                      className={`rounded-md p-2 text-sm transition-colors ${state.answers[question.id] === option.value ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
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
                                        className={`rounded-md p-2 text-sm transition-colors ${isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
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
                  className={`flex items-center rounded-lg px-6 py-2.5 font-medium shadow-sm transition-all ${isCategoryComplete(state.activeCategory) ? "bg-blue-500 text-white hover:bg-blue-600" : "cursor-not-allowed bg-gray-300 text-gray-500"}`}
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
