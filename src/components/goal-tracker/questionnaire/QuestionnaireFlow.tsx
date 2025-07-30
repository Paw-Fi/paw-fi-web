import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faRocket,
  faExclamationTriangle,
  faCheck,
  faDollarSign,
  faPercent
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { useCreateGoalWithAI } from "@/hooks/goal-tracker/use-create-goal";
import { useSimulatedProgress } from "@/hooks/use-simulated-progress";
import type { 
  GoalType, 
  QuestionnaireTemplate, 
  QuestionnaireData,
  Question
} from "@/components/goal-tracker/types";

interface QuestionnaireFlowProps {
  goalType: GoalType;
  template: QuestionnaireTemplate;
  onComplete: (result: any) => void;
  onCancel: () => void;
}

export function QuestionnaireFlow({ 
  goalType, 
  template, 
  onComplete, 
  onCancel 
}: QuestionnaireFlowProps) {
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { 
    createGoalWithAI, 
    isLoading, 
    error: createError
  } = useCreateGoalWithAI();

  const simulatedProgress = useSimulatedProgress(isLoading, 350);

  const questions: Question[] = useMemo(() => 
    typeof template.questions === 'string' 
      ? JSON.parse(template.questions) 
      : template.questions, 
    [template.questions]
  );

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    questions.forEach((q) => {
      const value = answers[q.id];
      if (q.validation?.required && (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
        newErrors[q.id] = 'This field is required.';
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [questions, answers]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const isFormComplete = useMemo(() => {
    return questions
      .filter(q => q.validation?.required)
      .every(q => {
        const value = answers[q.id];
        return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
      });
  }, [questions, answers]);

  const handleSubmit = async () => {
    if (!validate()) return;
    
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

  const progress = useMemo(() => {
    const requiredQuestions = questions.filter(q => q.validation?.required);
    const answeredCount = requiredQuestions.filter(q => {
        const value = answers[q.id];
        return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
    }).length;
    if (requiredQuestions.length === 0) return 100;
    return (answeredCount / requiredQuestions.length) * 100;
  }, [questions, answers]);

  if (isLoading) {
    return <GeneratingGoalView progress={simulatedProgress} error={createError?.message} onCancel={onCancel} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Tell us about your goal
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Fill out the details below to create your personalized financial plan.
        </p>
      </motion.div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mb-12">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
        {questions.map(question => (
          <div 
            key={question.id} 
            className={question.layout?.colSpan === 2 ? 'md:col-span-2' : ''}
          >
            <QuestionRenderer
              question={question}
              value={answers[question.id]}
              onChange={(value) => handleAnswerChange(question.id, value)}
              error={errors[question.id]}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleSubmit} size="lg" className="px-12 py-7 text-lg" disabled={!isFormComplete}>
          <FontAwesomeIcon icon={faRocket} className="mr-3" />
          Create My Goal
        </Button>
      </div>
    </div>
  );
}

function QuestionRenderer({ question, value, onChange, error }: { question: Question, value: any, onChange: (value: any) => void, error?: string }) {
  const inputClasses = `w-full p-4 text-base border rounded-xl bg-white/50 dark:bg-gray-800/50 transition-all duration-300
    ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/50'}
    focus:ring-2 focus:outline-none`;

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
            className={inputClasses}
          />
        );
      case 'number':
      case 'currency':
      case 'percentage':
        return (
          <div className="relative">
            {question.type === 'currency' && <FontAwesomeIcon icon={faDollarSign} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />}
            <input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={question.placeholder}
              min={question.validation?.min}
              max={question.validation?.max}
              className={`${inputClasses} ${question.type === 'currency' ? 'pl-10' : ''} ${question.type === 'percentage' ? 'pr-10' : ''}`}
            />
            {question.type === 'percentage' && <FontAwesomeIcon icon={faPercent} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />}
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          />
        );
      case 'single_choice':
        return (
          <div className="grid grid-cols-2 gap-3">
            {question.options?.map((option: any) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`p-4 border rounded-xl text-center transition-all duration-200 ${value === option.value ? 'bg-blue-500 text-white border-blue-500 shadow-lg' : 'bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        );
      case 'multiple_choice':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="grid grid-cols-2 gap-3">
            {question.options?.map((option: any) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== option.value)
                      : [...selectedValues, option.value];
                    onChange(newValues);
                  }}
                  className={`p-4 border rounded-xl text-center transition-all duration-200 flex items-center justify-center space-x-2 ${isSelected ? 'bg-blue-500 text-white border-blue-500 shadow-lg' : 'bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
                >
                  <FontAwesomeIcon icon={faCheck} className={`w-4 h-4 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        );
      default:
        return <p>Unsupported question type: {question.type}</p>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col"
    >
      <label className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
        {question.question}
        {question.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {question.description && <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{question.description}</p>}
      {renderInput()}
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm text-red-500 flex items-center"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GeneratingGoalView({ progress, error, onCancel }: any) {
  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-4">
          Goal Creation Failed
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <Button onClick={onCancel} variant="outline">Go Back</Button>
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
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full"></div>
      </motion.div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Creating Your AI-Powered Goal
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Our AI is analyzing your responses and creating a personalized strategy...
      </p>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
        {Math.round(progress)}% Complete
      </p>
      <Button onClick={onCancel} variant="ghost">Cancel</Button>
    </div>
  );
}
