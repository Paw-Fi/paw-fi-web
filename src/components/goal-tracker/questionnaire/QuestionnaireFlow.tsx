import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faArrowRight, 
  faCheck,
  faSpinner,
  faRocket,
  faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { useCreateGoalWithAI } from "@/hooks/goal-tracker/use-create-goal";
import { useSimulatedProgress } from "@/hooks/use-simulated-progress";
import type { 
  GoalType, 
  QuestionnaireTemplate, 
  QuestionnaireData 
} from "@/components/goal-tracker/types";

interface QuestionnaireFlowProps {
  goalType: GoalType;
  template: QuestionnaireTemplate;
  onComplete: (result: any) => void;
  onCancel: () => void;
}

interface QuestionProps {
  question: any;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function QuestionnaireFlow({ 
  goalType, 
  template, 
  onComplete, 
  onCancel 
}: QuestionnaireFlowProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { 
    createGoalWithAI, 
    isLoading, 
    error: createError
  } = useCreateGoalWithAI();

  const simulatedProgress = useSimulatedProgress(isLoading, 350);

  const questions = typeof template.questions === 'string' 
    ? JSON.parse(template.questions) 
    : template.questions;

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const validateCurrentQuestion = () => {
    if (!currentQuestion) return true;
    
    const value = answers[currentQuestion.id];
    const validation = currentQuestion.validation;
    
    const newErrors = { ...errors };
    delete newErrors[currentQuestion.id];
    
    if (validation?.required && (!value || value === '')) {
      newErrors[currentQuestion.id] = `This field is required`;
      setErrors(newErrors);
      return false;
    }
    
    if (value && value !== '') {
      switch (currentQuestion.type) {
        case 'number':
        case 'currency':
        case 'percentage':
          const num = Number(value);
          if (isNaN(num)) {
            newErrors[currentQuestion.id] = 'Please enter a valid number';
            setErrors(newErrors);
            return false;
          }
          if (validation?.min !== undefined && num < validation.min) {
            newErrors[currentQuestion.id] = `Must be at least ${validation.min}`;
            setErrors(newErrors);
            return false;
          }
          if (validation?.max !== undefined && num > validation.max) {
            newErrors[currentQuestion.id] = `Must not exceed ${validation.max}`;
            setErrors(newErrors);
            return false;
          }
          break;
        
        case 'date':
          if (!Date.parse(value)) {
            newErrors[currentQuestion.id] = 'Please enter a valid date';
            setErrors(newErrors);
            return false;
          }
          break;
      }
    }
    
    setErrors(newErrors);
    return true;
  };

  const handleNext = () => {
    if (validateCurrentQuestion()) {
      setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  };

  const handleAnswerChange = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
    
    if (errors[currentQuestion.id]) {
      const newErrors = { ...errors };
      delete newErrors[currentQuestion.id];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentQuestion()) return;
    
    try {
      const result = await createGoalWithAI({
        goalType,
        questionnaireAnswers: answers,
      });
      onComplete(result);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (isLoading) {
    return (
      <GeneratingGoalView 
        progress={simulatedProgress} 
        currentStep={"Our AI is analyzing your responses and creating a personalized strategy..."}
        error={createError?.message}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8"
        >
          <QuestionRenderer
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={handleAnswerChange}
            error={errors[currentQuestion.id]}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <Button
          onClick={currentQuestionIndex === 0 ? onCancel : handlePrevious}
          className="flex items-center space-x-2"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          <span>{currentQuestionIndex === 0 ? 'Cancel' : 'Previous'}</span>
        </Button>

        <div className="flex items-center space-x-2">
          {questions.map((_: any, index: number) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index < currentQuestionIndex
                  ? 'bg-green-500'
                  : index === currentQuestionIndex
                  ? 'bg-primary'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white"
          >
            <FontAwesomeIcon icon={faRocket} className="w-4 h-4" />
            <span>Create Goal</span>
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionRenderer({ question, value, onChange, error }: QuestionProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'text':
      case 'email':
        return (
          <input
            type={question.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className={`w-full p-4 border rounded-lg bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground ${
              error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'
            }`}
          />
        );

      case 'text_area':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            className={`w-full p-4 border rounded-lg bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground resize-none ${
              error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'
            }`}
          />
        );

      case 'number':
      case 'currency':
      case 'percentage':
        return (
          <div className="relative">
            {question.type === 'currency' && (
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400">$</span>
              </div>
            )}
            <input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={question.placeholder}
              min={question.validation?.min}
              max={question.validation?.max}
              step={question.type === 'currency' ? '0.01' : question.type === 'percentage' ? '0.1' : '1'}
              className={`w-full p-4 border rounded-lg bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground ${
                question.type === 'currency' ? 'pl-8' : ''
              } ${question.type === 'percentage' ? 'pr-8' : ''} ${
                error 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'
              }`}
            />
            {question.type === 'percentage' && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400">%</span>
              </div>
            )}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-4 border rounded-lg bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground ${
              error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'
            }`}
          />
        );

      case 'single_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option: any, index: number) => (
              <div
                key={index}
                onClick={() => onChange(option.value)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  value === option.value
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    value === option.value
                      ? 'border-primary bg-primary'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {value === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground dark:text-dark-foreground">
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'multiple_choice':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            {question.options?.map((option: any, index: number) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <div
                  key={index}
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== option.value)
                      : [...selectedValues, option.value];
                    onChange(newValues);
                  }}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && (
                        <FontAwesomeIcon icon={faCheck} className="w-2 h-2 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground dark:text-dark-foreground">
                        {option.label}
                      </p>
                      {option.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              Unsupported question type: {question.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-2">
        {question.question}
      </h2>
      {question.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {question.description}
        </p>
      )}
      {renderInput()}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 mt-2 text-red-600 dark:text-red-400"
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </motion.div>
      )}
    </div>
  );
}

function GeneratingGoalView({ 
  progress, 
  currentStep, 
  error, 
  onCancel 
}: { 
  progress: number; 
  currentStep: string; 
  error?: string;
  onCancel: () => void;
}) {
  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-4">
          Goal Creation Failed
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error}
        </p>
        <Button onClick={onCancel} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 mx-auto mb-6"
      >
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"></div>
      </motion.div>
      
      <h2 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-4">
        Creating Your AI-Powered Goal
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {currentStep || 'Our AI is analyzing your responses and creating a personalized strategy...'}
      </p>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
        {progress}% Complete
      </p>

      <Button onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}