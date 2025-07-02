import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronRight, 
  faChevronLeft, 
  faCheck, 
  faHeartPulse, 
  faCoins, 
  faChartLine,
  faShieldAlt,
  faPiggyBank,
  faMoneyBillWave,
  faFileInvoiceDollar,
  faHandHoldingUsd,
  faTachometerAlt,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { Widget } from '../profile/types/dashboard-data.typings';
import { v4 as uuidv4 } from 'uuid';
import { calculateResults, generateDashboardWidgets, QuizAnswers, CalculationResults } from './quiz-calculations';
import { useQuizDashboard } from './useQuizDashboard';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';

// Define types for quiz questions and answers
interface QuizQuestion {
  id: string;
  question: string;
  description?: string;
  icon: any;
  type: 'single-choice' | 'multiple-choice' | 'number-input' | 'slider';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

// Define types for quiz state
interface QuizState {
  currentIndex: number;
  answers: Record<string, any>;
  isComplete: boolean;
  calculationResults: CalculationResults | null;
}

// Helper to check if an answer is selected in a multiple-choice question
const isAnswerSelected = (answers: any, questionId: string, value: string): boolean => {
  if (!answers[questionId]) return false;
  if (Array.isArray(answers[questionId])) {
    return answers[questionId].includes(value);
  }
  return answers[questionId] === value;
};

// Quiz questions array
const quizQuestions: QuizQuestion[] = [
  {
    id: 'current-age',
    question: 'What is your current age?',
    description: 'This helps us calculate your retirement timeline.',
    icon: faHeartPulse,
    type: 'number-input',
    min: 0,
    max: 100
  },
  {
    id: 'retirement-age',
    question: 'At what age do you plan to retire?',
    description: 'This helps us calculate your investment horizon.',
    icon: faHeartPulse,
    type: 'number-input',
    min: 0,
    max: 100
  },
  {
    id: 'annual-contribution',
    question: 'How much can you contribute annually to investments?',
    description: 'Consider your regular savings for long-term goals.',
    icon: faCoins,
    type: 'number-input',
    unit: '$'
  },
  {
    id: 'current-assets',
    question: 'What is the total value of your current investable assets?',
    description: 'Include savings, investments, and other liquid assets.',
    icon: faChartLine,
    type: 'number-input',
    unit: '$'
  },
  {
    id: 'target-retirement',
    question: 'What is your target retirement fund goal?',
    description: 'The amount you would like to have saved by retirement.',
    icon: faPiggyBank,
    type: 'number-input',
    unit: '$'
  },
  {
    id: 'return-rate',
    question: 'What annual return rate do you expect on your investments?',
    description: 'Typical market averages range from 6-8% before inflation.',
    icon: faChartLine,
    type: 'slider',
    min: 0,
    max: 12,
    step: 0.1,
    unit: '%'
  },
  {
    id: 'emergency-fund',
    question: 'How many months of expenses do you have in an emergency fund?',
    description: 'Financial experts recommend 3-6 months of expenses.',
    icon: faShieldAlt,
    type: 'multiple-choice',
    options: [
      { value: 'none', label: 'No emergency fund' },
      { value: 'less-than-1', label: 'Less than 1 month' },
      { value: '1-3', label: '1-3 months' },
      { value: '3-6', label: '3-6 months' },
      { value: 'more-than-6', label: 'More than 6 months' }
    ]
  },
  {
    id: 'savings-rate',
    question: 'What percentage of your income do you save each month?',
    description: 'Include retirement contributions and other savings.',
    icon: faMoneyBillWave,
    type: 'slider',
    min: 0,
    max: 50,
    step: 1,
    unit: '%'
  },
  {
    id: 'monthly-income',
    question: 'What is your monthly income after taxes?',
    description: 'Your take-home pay used for expenses and savings.',
    icon: faCoins,
    type: 'number-input',
    unit: '$'
  },
  {
    id: 'monthly-expenses',
    question: 'What are your total monthly expenses?',
    description: 'Include all regular spending: housing, food, utilities, etc.',
    icon: faFileInvoiceDollar,
    type: 'number-input',
    unit: '$'
  },
  {
    id: 'debt-types',
    question: 'What types of debt do you currently have?',
    description: 'Select all that apply.',
    icon: faHandHoldingUsd,
    type: 'multiple-choice',
    options: [
      { value: 'none', label: 'No debt' },
      { value: 'credit-card', label: 'Credit card debt' },
      { value: 'student-loans', label: 'Student loans' },
      { value: 'mortgage', label: 'Mortgage' },
      { value: 'car-loan', label: 'Car loan' },
      { value: 'personal-loan', label: 'Personal loan' },
      { value: 'other', label: 'Other debt' }
    ]
  },
  {
    id: 'risk-profile',
    question: 'How would you describe your investment risk tolerance?',
    description: 'This helps determine appropriate investment strategies.',
    icon: faChartLine,
    type: 'single-choice',
    options: [
      { value: 'conservative', label: 'Conservative - Avoid risk, accept lower returns' },
      { value: 'moderate', label: 'Moderate - Balance between risk and returns' },
      { value: 'aggressive', label: 'Aggressive - Accept higher risk for potentially higher returns' }
    ]
  },
  {
    id: 'time-horizon',
    question: 'When do you need to access most of your investments?',
    description: 'Shorter timelines generally mean lower risk tolerance.',
    icon: faChartLine,
    type: 'single-choice',
    options: [
      { value: 'short', label: 'Short-term (0-5 years)' },
      { value: 'medium', label: 'Medium-term (5-10 years)' },
      { value: 'long', label: 'Long-term (10+ years)' }
    ]
  },
  {
    id: 'insurance-coverage',
    question: 'Which types of insurance coverage do you currently have?',
    description: 'Select all that apply.',
    icon: faShieldAlt,
    type: 'multiple-choice',
    options: [
      { value: 'none', label: 'No insurance' },
      { value: 'health', label: 'Health insurance' },
      { value: 'life', label: 'Life insurance' },
      { value: 'disability', label: 'Disability insurance' },
      { value: 'home', label: 'Home/rental insurance' },
      { value: 'auto', label: 'Auto insurance' }
    ]
  }
];

interface FinancialHealthQuizProps {
  onComplete: (widgets: Widget[]) => void;
}

const FinancialHealthQuiz: React.FC<FinancialHealthQuizProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { status, error, createdViewId, createDashboardFromQuiz } = useQuizDashboard();
  
  // Initialize quiz state
  const [quizState, setQuizState] = useState<QuizState>({
    currentIndex: 0,
    answers: {},
    isComplete: false,
    calculationResults: null
  });
  
  const [dashboardName, setDashboardName] = useState('My Financial Health Dashboard');
  const [showNameInput, setShowNameInput] = useState(false);
  const [generatedWidgets, setGeneratedWidgets] = useState<Widget[] | null>(null);

  // Handle moving to the next question
  const handleNext = () => {
    if (quizState.currentIndex < quizQuestions.length - 1) {
      setQuizState(prevState => ({
        ...prevState,
        currentIndex: prevState.currentIndex + 1
      }));
    } else {
      // Calculate results and mark as complete
      const results = calculateResults(quizState.answers);
      const widgets = generateDashboardWidgets(results);
      
      setQuizState(prevState => ({
        ...prevState,
        isComplete: true,
        calculationResults: results
      }));
      
      setGeneratedWidgets(widgets);
      setShowNameInput(true);
    }
  };
  
  // Handle dashboard creation
  const handleCreateDashboard = async () => {
    if (!generatedWidgets) return;
    console.log("generatedWidgets",generatedWidgets)
    const viewId = await createDashboardFromQuiz(dashboardName, generatedWidgets);
    
    if (viewId) {
      // Navigate to the dashboard view
      navigate({ to: '/dashboard' });
      
      if (onComplete) {
        onComplete(generatedWidgets);
      }
    }
  };

  // Handle moving to the previous question
  const handlePrevious = () => {
    if (quizState.currentIndex > 0) {
      setQuizState(prevState => ({
        ...prevState,
        currentIndex: prevState.currentIndex - 1
      }));
    }
  };

  // Handle answer changes
  const handleAnswerChange = (questionId: string, value: any) => {
    const currentQuestion = quizQuestions.find(q => q.id === questionId);
    
    if (currentQuestion?.type === 'multiple-choice') {
      setQuizState(prevState => {
        // Get current answers for this question (or initialize empty array)
        const currentAnswers = Array.isArray(prevState.answers[questionId]) 
          ? [...prevState.answers[questionId]] 
          : [];
        
        // Toggle the selected value
        if (currentAnswers.includes(value)) {
          // Remove the value if already selected
          const updatedAnswers = currentAnswers.filter(item => item !== value);
          return {
            ...prevState,
            answers: {
              ...prevState.answers,
              [questionId]: updatedAnswers.length > 0 ? updatedAnswers : undefined
            }
          };
        } else {
          // Add the value if not already selected
          return {
            ...prevState,
            answers: {
              ...prevState.answers,
              [questionId]: [...currentAnswers, value]
            }
          };
        }
      });
    } else {
      // For single-choice, number-input, and slider, just set the value directly
      setQuizState(prevState => ({
        ...prevState,
        answers: {
          ...prevState.answers,
          [questionId]: value
        }
      }));
    }
  };

  // Determine if the current question has been answered
  const isCurrentQuestionAnswered = () => {
    const currentQuestion = quizQuestions[quizState.currentIndex];
    return quizState.answers[currentQuestion.id] !== undefined;
  };

  // Current question to display
  const currentQuestion = quizQuestions[quizState.currentIndex];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.3 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const optionVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.4 }
    }),
    hover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.98 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-40 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block mb-4"
          >
            <FontAwesomeIcon icon={faChartLine} className="text-6xl text-purple-300" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
            Financial Health Assessment
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Discover your financial wellness and unlock personalized insights
          </p>
        </motion.div>
        
        <AnimatePresence mode="wait">
          {!quizState.isComplete ? (
            <motion.div
              key="quiz"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-purple-200">Progress</span>
                  <span className="text-sm font-medium text-purple-200">
                    {quizState.currentIndex + 1} of {quizQuestions.length}
                  </span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-lg"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${((quizState.currentIndex + 1) / quizQuestions.length) * 100}%` 
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
              
              {/* Question */}
              <motion.div 
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="mb-10"
              >
                <div className="flex items-start mb-6">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mr-6 shadow-lg flex-shrink-0"
                  >
                    <FontAwesomeIcon icon={currentQuestion.icon} className="text-white text-xl" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
                      {currentQuestion.question}
                    </h3>
                    {currentQuestion.description && (
                      <p className="text-purple-200 text-lg leading-relaxed">
                        {currentQuestion.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Question input */}
                <div className="space-y-4">
                  {currentQuestion.type === 'single-choice' && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option, index) => (
                        <motion.div
                          key={option.value}
                          custom={index}
                          variants={optionVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                          whileTap="tap"
                          className={`p-4 backdrop-blur-md rounded-2xl cursor-pointer transition-all duration-300 border ${
                            quizState.answers[currentQuestion.id] === option.value 
                              ? 'border-purple-400 bg-purple-400/20 shadow-lg shadow-purple-500/25' 
                              : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-purple-300'
                          }`}
                          onClick={() => handleAnswerChange(currentQuestion.id, option.value)}
                        >
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
                              quizState.answers[currentQuestion.id] === option.value 
                                ? 'border-purple-400 bg-purple-400' 
                                : 'border-purple-300'
                            }`}>
                              {quizState.answers[currentQuestion.id] === option.value && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <FontAwesomeIcon icon={faCheck} className="text-white text-sm" />
                                </motion.div>
                              )}
                            </div>
                            <span className="text-white font-medium text-lg">{option.label}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.type === 'multiple-choice' && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option, index) => (
                        <motion.div
                          key={option.value}
                          custom={index}
                          variants={optionVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                          whileTap="tap"
                          className={`p-4 backdrop-blur-md rounded-2xl cursor-pointer transition-all duration-300 border ${
                            isAnswerSelected(quizState.answers, currentQuestion.id, option.value)
                              ? 'border-purple-400 bg-purple-400/20 shadow-lg shadow-purple-500/25' 
                              : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-purple-300'
                          }`}
                          onClick={() => handleAnswerChange(currentQuestion.id, option.value)}
                        >
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-4 transition-all ${
                              isAnswerSelected(quizState.answers, currentQuestion.id, option.value)
                                ? 'border-purple-400 bg-purple-400' 
                                : 'border-purple-300'
                            }`}>
                              {isAnswerSelected(quizState.answers, currentQuestion.id, option.value) && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <FontAwesomeIcon icon={faCheck} className="text-white text-sm" />
                                </motion.div>
                              )}
                            </div>
                            <span className="text-white font-medium text-lg">{option.label}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.type === 'number-input' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex max-w-md"
                    >
                      {currentQuestion.unit === '$' && (
                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-white/20 bg-white/10 text-purple-200 font-medium backdrop-blur-md">
                          {currentQuestion.unit}
                        </span>
                      )}
                      <input
                        type="number"
                        className={`block w-full border-white/20 ${currentQuestion.unit === '$' ? 'rounded-r-xl' : 'rounded-xl'} focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 bg-white/10 backdrop-blur-md text-white placeholder-purple-300 font-medium text-lg px-4 py-3 transition-all`}
                        value={quizState.answers[currentQuestion.id] || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && (currentQuestion.min === undefined || value >= currentQuestion.min) &&
                              (currentQuestion.max === undefined || value <= currentQuestion.max)) {
                            handleAnswerChange(currentQuestion.id, value);
                          } else if (e.target.value === '') {
                            handleAnswerChange(currentQuestion.id, undefined);
                          }
                        }}
                        min={currentQuestion.min}
                        max={currentQuestion.max}
                        step={currentQuestion.step || 1}
                        placeholder={`Enter value${currentQuestion.unit ? ` in ${currentQuestion.unit}` : ''}`}
                      />
                      {currentQuestion.unit !== '$' && currentQuestion.unit && (
                        <span className="inline-flex items-center px-4 rounded-r-xl border border-l-0 border-white/20 bg-white/10 text-purple-200 font-medium backdrop-blur-md">
                          {currentQuestion.unit}
                        </span>
                      )}
                    </motion.div>
                  )}
                  
                  {currentQuestion.type === 'slider' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-6 max-w-lg"
                    >
                      <div className="flex justify-between text-sm text-purple-300">
                        <span>{currentQuestion.min}{currentQuestion.unit}</span>
                        <span>{currentQuestion.max}{currentQuestion.unit}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          className="w-full h-3 bg-white/20 rounded-full appearance-none cursor-pointer backdrop-blur-md slider-thumb"
                          value={quizState.answers[currentQuestion.id] || currentQuestion.min}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, parseFloat(e.target.value))}
                          min={currentQuestion.min}
                          max={currentQuestion.max}
                          step={currentQuestion.step || 1}
                          style={{
                            background: `linear-gradient(to right, rgb(168 85 247) 0%, rgb(168 85 247) ${((quizState.answers[currentQuestion.id] || currentQuestion.min!) - currentQuestion.min!) / (currentQuestion.max! - currentQuestion.min!) * 100}%, rgba(255,255,255,0.2) ${((quizState.answers[currentQuestion.id] || currentQuestion.min!) - currentQuestion.min!) / (currentQuestion.max! - currentQuestion.min!) * 100}%, rgba(255,255,255,0.2) 100%)`
                          }}
                        />
                      </div>
                      {quizState.answers[currentQuestion.id] !== undefined && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-center"
                        >
                          <div className="inline-block bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-2xl px-6 py-3 rounded-2xl shadow-lg">
                            {quizState.answers[currentQuestion.id]}{currentQuestion.unit}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
              
              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-8">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePrevious}
                  disabled={quizState.currentIndex === 0}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
                    quizState.currentIndex === 0
                      ? 'text-purple-400 cursor-not-allowed'
                      : 'text-white hover:bg-white/10 backdrop-blur-md border border-white/20'
                  }`}
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
                  Previous
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  disabled={!isCurrentQuestionAnswered()}
                  className={`flex items-center px-8 py-3 rounded-xl font-medium transition-all ${
                    isCurrentQuestionAnswered()
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                      : 'bg-white/20 text-purple-300 cursor-not-allowed'
                  }`}
                >
                  {quizState.currentIndex < quizQuestions.length - 1 ? (
                    <>
                      Next
                      <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
                    </>
                  ) : (
                    <>
                      Complete Assessment
                      <FontAwesomeIcon icon={faCheck} className="ml-2" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          ) : showNameInput ? (
            <motion.div
              key="nameInput"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center max-w-2xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-6 shadow-lg"
              >
                <FontAwesomeIcon icon={faTachometerAlt} className="text-white text-3xl" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-3xl font-bold mb-4 text-white">Assessment Complete!</h3>
                <p className="text-purple-200 text-lg mb-8">
                  Name your personalized financial dashboard and unlock your insights
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                <label htmlFor="dashboardName" className="block text-lg font-medium text-purple-200 mb-3 text-left">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  id="dashboardName"
                  className="w-full border border-white/20 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/10 backdrop-blur-md text-white placeholder-purple-300 font-medium text-lg transition-all"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="My Financial Health Dashboard"
                />
              </motion.div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={handleCreateDashboard}
                disabled={status === 'creating' || !dashboardName.trim()}
                className={`w-full flex justify-center items-center py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                  status === 'creating' || !dashboardName.trim() ? 
                  'bg-white/20 text-purple-300 cursor-not-allowed' : 
                  'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                }`}
              >
                {status === 'creating' ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-3"
                    />
                    Creating Dashboard...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faStar} className="mr-3" />
                    Create My Dashboard
                  </>
                )}
              </motion.button>
              
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mt-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 backdrop-blur-md"
                  >
                    {error}
                  </motion.div>
                )}
                
                {status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mt-6 p-4 bg-green-500/20 border border-green-400/30 rounded-xl text-green-200 backdrop-blur-md"
                  >
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Dashboard created successfully! Redirecting...
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center max-w-2xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-lg"
              >
                <FontAwesomeIcon icon={faCheck} className="text-white text-3xl" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-3xl font-bold mb-4 text-white">Assessment Complete!</h3>
                <p className="text-purple-200 text-lg mb-8">
                  Your personalized financial dashboard is being generated...
                </p>
                
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full mx-auto"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Custom styles for slider */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgb(168 85 247), rgb(236 72 153));
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.6);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgb(168 85 247), rgb(236 72 153));
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
          transition: all 0.2s ease;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default FinancialHealthQuiz;
