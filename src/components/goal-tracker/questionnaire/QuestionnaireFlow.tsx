import { useState, useMemo, useCallback } from "react";
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

  const completedCategories = useMemo(() => {
    return categories.filter(cat => isCategoryComplete(cat.id)).map(cat => cat.id);
  }, [categories, isCategoryComplete]);

  const canGoNext = isCategoryComplete(activeCategory);
  const canGoBack = categories.findIndex(cat => cat.id === activeCategory) > 0;
  const isLastCategory = categories.findIndex(cat => cat.id === activeCategory) === categories.length - 1;

  const handleNext = () => {
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

      <CategoryProgress
        categories={categories}
        activeCategory={activeCategory}
        completedCategories={completedCategories}
        progress={progress}
        onCategoryChange={setActiveCategory}
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
      <Button onClick={onCancel} variant="ghost">Cancel</Button>
    </div>
  );
}
