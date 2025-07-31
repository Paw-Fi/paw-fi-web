import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faRocket,
  faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { FormQuestion } from "@/components/ui/form-question";
import { CategoryProgress } from "@/components/ui/category-progress";
import { FormNavigation } from "@/components/ui/form-navigation";
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
  userId?: string | null;
}

export function QuestionnaireFlow({ 
  goalType, 
  template, 
  onComplete, 
  onCancel,
  userId 
}: QuestionnaireFlowProps) {
  const [answers, setAnswers] = useState<QuestionnaireData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  
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

  // Group questions by category for compact display
  const questionsByCategory = useMemo(() => {
    const grouped: Record<string, Question[]> = {
      'basic': [],
      'financial': [],
      'timeline': [],
      'preferences': []
    };
    
    questions.forEach((question, index) => {
      // Simple categorization based on question type and content
      if (index < Math.ceil(questions.length * 0.3)) {
        grouped.basic.push(question);
      } else if (index < Math.ceil(questions.length * 0.6)) {
        grouped.financial.push(question);
      } else if (index < Math.ceil(questions.length * 0.8)) {
        grouped.timeline.push(question);
      } else {
        grouped.preferences.push(question);
      }
    });
    
    return grouped;
  }, [questions]);

  const categories = [
    { id: 'basic', title: 'Goal Basics', description: 'Tell us about your goal', color: 'bg-blue-100 text-blue-600' },
    { id: 'financial', title: 'Financial Details', description: 'Money matters and targets', color: 'bg-green-100 text-green-600' },
    { id: 'timeline', title: 'Timeline & Planning', description: 'When and how you want to achieve this', color: 'bg-purple-100 text-purple-600' },
    { id: 'preferences', title: 'Your Preferences', description: 'Customize your approach', color: 'bg-orange-100 text-orange-600' }
  ];

  const [activeCategory, setActiveCategory] = useState('basic');

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    questions.forEach((q) => {
      const value = answers[q.id];
      
      // Required field validation
      if (q.validation?.required && (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
        newErrors[q.id] = 'This field is required.';
        isValid = false;
        return;
      }
      
      // Skip further validation if no value provided and not required
      if (!value && !q.validation?.required) {
        return;
      }
      
      // Type-specific validation
      switch (q.type) {
        case 'number':
        case 'currency':
        case 'percentage':
          const num = Number(value);
          if (isNaN(num)) {
            newErrors[q.id] = `${q.question} must be a valid number`;
            isValid = false;
          } else {
            if (q.validation?.min !== undefined && num < q.validation.min) {
              newErrors[q.id] = `${q.question} must be at least ${q.validation.min.toLocaleString()}`;
              isValid = false;
            }
            if (q.validation?.max !== undefined && num > q.validation.max) {
              newErrors[q.id] = `${q.question} must not exceed ${q.validation.max.toLocaleString()}`;
              isValid = false;
            }
          }
          break;
          
        case 'date':
          if (!Date.parse(value)) {
            newErrors[q.id] = `${q.question} must be a valid date`;
            isValid = false;
          }
          break;
          
        case 'single_choice':
          if (q.options && !q.options.some((opt: any) => opt.value === value)) {
            newErrors[q.id] = `${q.question} must be one of the provided options`;
            isValid = false;
          }
          break;
          
        case 'multiple_choice':
          if (Array.isArray(value) && q.options) {
            const validValues = q.options.map((opt: any) => opt.value);
            const invalidAnswers = value.filter(a => !validValues.includes(a));
            if (invalidAnswers.length > 0) {
              newErrors[q.id] = `${q.question} contains invalid options: ${invalidAnswers.join(', ')}`;
              isValid = false;
            }
          }
          break;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [questions, answers]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Clear any existing error for this field
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
    
    // Clear general error when user starts fixing issues
    if (generalError) {
      setGeneralError('');
    }
  };

  // Real-time validation effect - validates instantly when answers change
  useEffect(() => {
    // Only run validation if we have some answers to avoid initial validation noise
    if (Object.keys(answers).length > 0) {
      validate();
    }
  }, [answers, validate]);

  const isFormComplete = useMemo(() => {
    return questions
      .filter(q => q.validation?.required)
      .every(q => {
        const value = answers[q.id];
        return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
      });
  }, [questions, answers]);

  const handleSubmit = async () => {
    // Clear previous errors
    setGeneralError('');
    
    // Validate and show errors if validation fails
    if (!validate()) {
      // Find the first category with validation errors
      const firstErrorQuestion = questions.find(q => errors[q.id]);
      if (firstErrorQuestion) {
        const errorCategory = Object.keys(questionsByCategory).find(categoryId =>
          questionsByCategory[categoryId].some(q => q.id === firstErrorQuestion.id)
        );
        if (errorCategory) {
          setActiveCategory(errorCategory);
        }
      }
      
      // Show a general error message if there are validation errors but no specific category found
      const errorCount = Object.keys(errors).length;
      if (errorCount > 0) {
        setGeneralError(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before submitting.`);
      } else {
        setGeneralError('Please complete all required fields before submitting.');
      }
      
      // Scroll to show the error message and focus on first error field
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Focus on the first field with an error after scrolling
        setTimeout(() => {
          const firstErrorFieldId = Object.keys(errors)[0];
          if (firstErrorFieldId) {
            const firstErrorField = document.getElementById(firstErrorFieldId);
            if (firstErrorField) {
              firstErrorField.focus();
              firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 300);
      }, 100);
      
      return;
    }
    
    try {
      console.log('Submitting goal creation with answers:', answers);
      const requestParams: any = {
        goalType,
        questionnaireAnswers: answers,
        userId,
      };


      const result = await createGoalWithAI(requestParams);
      onComplete(result);
    } catch (error) {
      console.error('Failed to create goal:', error);
      console.error('Questionnaire answers that caused error:', answers);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // Parse different types of errors from the backend
      if (error instanceof Error) {
        if (error.message.includes('Validation failed:')) {
          // Frontend validation errors
          errorMessage = error.message.replace('Validation failed: ', '');
        } else {
          // Try to parse backend API errors
          try {
            // Check if it's a structured API error response
            const apiError = JSON.parse(error.message);
            if (apiError.error && apiError.details) {
              errorMessage = `${apiError.error}: ${apiError.details}`;
            } else if (apiError.message) {
              errorMessage = apiError.message;
            } else {
              errorMessage = error.message;
            }
          } catch {
            // Not JSON, use the raw error message
            errorMessage = error.message;
          }
        }
      }
      
      // Try to match error messages to specific questions for validation errors
      if (errorMessage.includes('Validation failed:') || errorMessage.includes('must be at least')) {
        const backendErrors: Record<string, string> = {};
        
        questions.forEach(q => {
          if (errorMessage.includes(q.question) || errorMessage.includes(q.id)) {
            backendErrors[q.id] = errorMessage;
          }
        });
        
        // If we found specific field errors, show them
        if (Object.keys(backendErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...backendErrors }));
          
          // Navigate to the category containing the first error
          const firstErrorQuestion = questions.find(q => backendErrors[q.id]);
          if (firstErrorQuestion) {
            const errorCategory = Object.keys(questionsByCategory).find(categoryId =>
              questionsByCategory[categoryId].some(q => q.id === firstErrorQuestion.id)
            );
            if (errorCategory) {
              setActiveCategory(errorCategory);
            }
          }
        } else {
          // Show general error if we couldn't match to specific fields
          setGeneralError(errorMessage);
        }
      } else {
        // Show the actual backend error message
        setGeneralError(errorMessage);
      }
      
      // Scroll to show the error
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const progress = useMemo(() => {
    const currentCategoryIndex = categories.findIndex(cat => cat.id === activeCategory);
    return (currentCategoryIndex + 1) / categories.length;
  }, [activeCategory, categories]);

  const isCategoryComplete = useCallback((categoryId: string) => {
    const categoryQuestions = questionsByCategory[categoryId] || [];
    return categoryQuestions.every(q => {
      const value = answers[q.id];
      if (q.validation?.required) {
        return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
      }
      return true;
    });
  }, [questionsByCategory, answers]);

  // Note: Removed completedCategories and categoriesWithErrors since they're not used in the simplified CategoryProgress

  // Check if current category is complete AND has no validation errors
  const categoryHasErrors = useMemo(() => {
    const categoryQuestions = questionsByCategory[activeCategory] || [];
    return categoryQuestions.some(q => errors[q.id]);
  }, [questionsByCategory, activeCategory, errors]);

  const canGoNext = isCategoryComplete(activeCategory) && !categoryHasErrors;
  const canGoBack = categories.findIndex(cat => cat.id === activeCategory) > 0;
  const isLastCategory = categories.findIndex(cat => cat.id === activeCategory) === categories.length - 1;

  const handleNext = () => {
    // Double-check validation before allowing navigation
    if (!isCategoryComplete(activeCategory) || categoryHasErrors) {
      // Highlight errors and show message
      const categoryQuestions = questionsByCategory[activeCategory] || [];
      const errorQuestions = categoryQuestions.filter(q => errors[q.id]);
      
      if (errorQuestions.length > 0) {
        setGeneralError(`Please fix ${errorQuestions.length} error${errorQuestions.length > 1 ? 's' : ''} in this section before continuing.`);
        
        // Focus on first error field
        setTimeout(() => {
          const firstErrorField = document.getElementById(errorQuestions[0].id);
          if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return;
    }
    
    const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
    if (currentIndex < categories.length - 1) {
      setActiveCategory(categories[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
    if (currentIndex > 0) {
      setActiveCategory(categories[currentIndex - 1].id);
    }
  };

  if (isLoading) {
    return <GeneratingGoalView progress={simulatedProgress} error={createError?.message} onCancel={onCancel} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Tell us about your goal
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Fill out the details below to create your personalized financial plan.
        </p>
      </motion.div>

      {generalError && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg shadow-lg"
        >
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 animate-pulse" />
            <div>
              <p className="text-red-800 dark:text-red-200 text-sm font-semibold">
                {generalError}
              </p>
              {Object.keys(errors).length > 0 && (
                <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                  Check the highlighted fields below for specific errors.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <CategoryProgress
        categories={categories}
        activeCategory={activeCategory}
        progress={progress}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionsByCategory[activeCategory]?.map(question => (
              <div 
                key={question.id} 
                className={question.layout?.colSpan === 2 ? 'md:col-span-2' : ''}
              >
                <FormQuestion
                  id={question.id}
                  question={question.question}
                  description={question.description}
                  type={question.type}
                  options={question.options}
                  value={answers[question.id]}
                  onChange={(value) => handleAnswerChange(question.id, value)}
                  error={errors[question.id]}
                  placeholder={question.placeholder}
                  validation={question.validation}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <FormNavigation
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isLastStep={isLastCategory}
        isFormComplete={isFormComplete}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        submitLabel="Create My Goal"
        submitIcon={faRocket}
        isSubmitting={isLoading}
        hasValidationErrors={Object.keys(errors).length > 0 || !!generalError}
      />
    </div>
  );
}

// Question renderer component is now replaced by FormQuestion component

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
      <Button onClick={onCancel} variant="outline">Cancel</Button>
    </div>
  );
}
