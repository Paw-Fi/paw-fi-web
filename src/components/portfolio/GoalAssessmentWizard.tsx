import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import RangeSlider from '@/components/ui/RangeSlider';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faArrowRight, 
  faCheckCircle, 
  faSpinner, 
  faExclamationCircle,
  faBrain,
  faBullseye,
  faDollarSign,
  faCalendar,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { GoalType, AssessmentQuestion } from './GoalSelector';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';

interface GoalAssessmentWizardProps {
  goal: GoalType;
  onBack: () => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const stepVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
};

const resultVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface ValidationError {
  field: string;
  message: string;
}

export function GoalAssessmentWizard({ goal, onBack }: GoalAssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const { user } = useAuth();
  const router = useRouter();
  
  const totalSteps = goal.assessmentQuestions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = goal.assessmentQuestions[currentStep];

  // Set default values for certain question types
  useEffect(() => {
    if (currentQuestion && !responses[currentQuestion.id]) {
      if (currentQuestion.type === 'slider' && currentQuestion.range) {
        const [min, max] = currentQuestion.range;
        const defaultValue = Math.round((min + max) / 2);
        setResponses(prev => ({ ...prev, [currentQuestion.id]: defaultValue }));
      }
    }
  }, [currentStep, currentQuestion, responses]);

  const validateCurrentStep = (): boolean => {
    const errors: ValidationError[] = [];
    const value = responses[currentQuestion.id];

    if (currentQuestion.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: currentQuestion.id,
        message: 'This field is required'
      });
    }

    if (currentQuestion.validation && value !== undefined && value !== null && value !== '') {
      const { min, max, pattern } = currentQuestion.validation;
      
      if (min !== undefined && Number(value) < min) {
        errors.push({
          field: currentQuestion.id,
          message: `Value must be at least ${min}`
        });
      }
      
      if (max !== undefined && Number(value) > max) {
        errors.push({
          field: currentQuestion.id,
          message: `Value must be no more than ${max}`
        });
      }
      
      if (pattern && typeof value === 'string' && !new RegExp(pattern).test(value)) {
        errors.push({
          field: currentQuestion.id,
          message: 'Invalid format'
        });
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setValidationErrors([]);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    setValidationErrors(prev => prev.filter(error => error.field !== questionId));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to create your goal');
      router.navigate({ to: '/login' });
      return;
    }

    setIsSubmitting(true);
    setShowAnalysis(true);

    try {
      // Call goal assessment API
      const { data, error } = await supabase.functions.invoke('goal-assessment', {
        body: JSON.stringify({
          userId: user.id,
          goalType: goal.id,
          responses,
          timestamp: new Date().toISOString()
        })
      });

      if (error) {
        throw new Error(error.message || 'Failed to assess goal');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to assess goal');
      }

      setAnalysis(data.analysis);
      
      // CRITICAL FIX: Validate goalId before navigation and avoid timeout race condition
      if (data?.goalId && typeof data.goalId === 'string') {
        // Wait a moment to show the analysis, then redirect to portfolio
        setTimeout(() => {
          try {
            router.navigate({ 
              to: '/portfolio/goal/$goalId', 
              params: { goalId: data.goalId }
            });
          } catch (navigationError) {
            console.error('Navigation failed:', navigationError);
            // Fallback to portfolio dashboard
            router.navigate({ to: '/portfolio' });
          }
        }, 3000);
      } else {
        console.error('Invalid goalId from assessment:', data?.goalId);
        // Fallback to portfolio dashboard immediately
        router.navigate({ to: '/portfolio' });
      }

    } catch (error) {
      console.error('Goal assessment error:', error);
      toast.error('Failed to assess your goal. Please try again.');
      setShowAnalysis(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionInput = (question: AssessmentQuestion) => {
    const value = responses[question.id];
    const hasError = validationErrors.some(error => error.field === question.id);
    const errorMessage = validationErrors.find(error => error.field === question.id)?.message;

    switch (question.type) {
      case 'slider':
        // CRITICAL FIX: Add null checks for question.range
        if (!question.range || question.range.length < 2) {
          return <div className="text-red-500">Invalid range configuration for this question</div>;
        }
        
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {question.range[0]}
              </span>
              <span className="text-xs font-medium">
                {Math.round(((question.range[1] - question.range[0]) / 2) + question.range[0])}
              </span>
              <span className="text-xs text-gray-500">
                {question.range[1]}
              </span>
            </div>
            <RangeSlider
              min={question.range[0]}
              max={question.range[1]}
              step={1}
              value={value || question.range[0]}
              onChange={(newValue) => handleResponseChange(question.id, newValue)}
              className="w-full"
              label=""
              showValue={false}
            />
            <div className="text-center">
              <span className="text-md font-bold text-green-500">
                {value || question.range[0]}
              </span>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Textarea
              value={value || ''}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              className={`min-h-[120px] ${hasError ? 'border-red-500' : ''}`}
              rows={4}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4" />
                {errorMessage}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <div className="relative">
              <FontAwesomeIcon icon={faDollarSign} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="number"
                value={value || ''}
                onChange={(e) => handleResponseChange(question.id, Number(e.target.value))}
                placeholder={question.placeholder}
                className={`pl-10 ${hasError ? 'border-red-500' : ''}`}
                min={question.validation?.min}
                max={question.validation?.max}
              />
            </div>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4" />
                {errorMessage}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Input
              type="date"
              value={value || ''}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              className={hasError ? 'border-red-500' : ''}
              min={new Date().toISOString().split('T')[0]}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4" />
                {errorMessage}
              </p>
            )}
          </div>
        );

      case 'single_choice':
        // CRITICAL FIX: Add null check for question.options
        if (!question.options || !Array.isArray(question.options)) {
          return <div className="text-red-500">No options available for this question</div>;
        }
        
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  className={`rounded-md p-3 text-sm transition-colors text-left ${
                    value === option.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => handleResponseChange(question.id, option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4" />
                {errorMessage}
              </p>
            )}
          </div>
        );

      case 'multiple_choice':
        // CRITICAL FIX: Add null check for question.options
        if (!question.options || !Array.isArray(question.options)) {
          return <div className="text-red-500">No options available for this question</div>;
        }
        
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {question.options.map((option) => {
                const selectedValues = value || [];
                const isSelected = selectedValues.includes(option.id);
                
                return (
                  <button
                    key={option.id}
                    className={`p-3 border-2 rounded-lg transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter((v: string) => v !== option.id)
                        : [...selectedValues, option.id];
                      handleResponseChange(question.id, newValues);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4" />
                {errorMessage}
              </p>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className={hasError ? 'border-red-500' : ''}
          />
        );
    }
  };

  if (showAnalysis) {
    return (
      <div className="flex items-start justify-center">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-8 h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-primary"></div>
            <h3 className="mb-3 text-xl font-semibold text-gray-800">
              Analyzing Your {goal.title}
            </h3>
            <p className="mb-8 max-w-md text-gray-600">
              Our AI is creating a personalized investment strategy based on your assessment...
            </p>
            
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="max-w-md rounded-lg border border-blue-100 bg-blue-50 p-6 mb-6"
              >
                <div className="flex items-center justify-center gap-2 text-blue-700 mb-4">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
                  <span className="font-semibold">Analysis Complete!</span>
                </div>
                
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBullseye} className="w-4 h-4 text-blue-500" />
                      Feasibility Score:
                    </span>
                    <span className="font-medium">{Math.round(analysis.aiInsights.feasibilityScore * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 text-green-500" />
                      Target Amount:
                    </span>
                    <span className="font-medium">${analysis.goalDetails.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-purple-500" />
                      Risk Level:
                    </span>
                    <span className="font-medium capitalize">{analysis.goalDetails.riskTolerance}</span>
                  </div>
                </div>
                
                <p className="text-blue-700 text-sm mt-4 leading-relaxed">
                  {analysis.aiInsights.personalizedGuidance}
                </p>
              </motion.div>
            )}
            
            <div className="flex items-center gap-2 text-gray-500">
              <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
              <span>Generating your personalized portfolio...</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center">
      <div className="w-full">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full"
        >
          {/* Header with progress bar */}
          <div className="my-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {goal.title} Assessment
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Main content area */}
          <div className="mt-8">
            {/* Questions for current step */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={stepVariants}
                className="space-y-4"
              >
                <div className="mb-6 flex flex-col gap-4 space-y-4">
                  <div className="">
                    <h3 className="mb-1 text-lg font-semibold text-gray-800">
                      {currentQuestion.question}
                    </h3>
                    {currentQuestion.required && (
                      <p className="mb-2 text-sm text-gray-500">* Required</p>
                    )}
                    <div className="mt-4">
                      {renderQuestionInput(currentQuestion)}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer with navigation buttons */}
          <div className="flex items-center justify-between border-t border-gray-100 p-6 sm:p-8">
            <button
              className="flex items-center rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-gray-600 transition-all hover:bg-gray-100"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
              Previous
            </button>

            {currentStep < totalSteps - 1 ? (
              <button
                className="flex items-center rounded-lg px-6 py-2.5 font-medium shadow-sm transition-all bg-primary text-white hover:bg-secondary"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next
                <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
              </button>
            ) : (
              <button
                className="flex items-center rounded-lg px-6 py-2.5 font-medium shadow-sm transition-all bg-green-500 text-white hover:bg-green-600"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Complete Assessment
                    <FontAwesomeIcon icon={faCheck} className="ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}