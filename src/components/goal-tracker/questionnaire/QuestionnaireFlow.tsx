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
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { supabase } from "@/lib/supabase";
import { useCookie } from "@/utils/use-cookie";
import MonekoAdvisorMessage, { type AdvisorMessage } from "@/components/ui/MonekoAdvisorMessage";
import { GoalAdvisorMessageGenerator } from "./goal-advisor-messages";
import type { 
  GoalType, 
  QuestionnaireTemplate, 
} from "@/data/questionnaire-templates";
import type { ComprehensiveFinancialProfile, CategoryInfo, FinancialProfileQuestion, QuestionCategory, GoalSpecificAnswers } from "@/types/financial-quiz-constants";
import { categories as allCategories, getGoalSpecificQuestions } from "@/types/financial-quiz-constants";

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
  const [answers, setAnswers] = useState<Partial<ComprehensiveFinancialProfile>>({});
  const [goalSpecificAnswers, setGoalSpecificAnswers] = useState<GoalSpecificAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [advisorMessage, setAdvisorMessage] = useState<AdvisorMessage | null>(null);
  const [showAdvisorMessage, setShowAdvisorMessage] = useState(false);
  
  // Cookie utilities for guest profile management
  const { getCookie, setCookie } = useCookie();

  // Fetch existing financial profile for auto-fill
  const { profile, isLoading: isLoadingProfile } = useFinancialHealthProfile(userId || undefined);

  // Guest financial health profile management functions
  const getGuestProfileIds = (): string[] => {
    const profileIds = getCookie('moneko-guest-profiles');
    return profileIds ? JSON.parse(profileIds) : [];
  };

  const addGuestProfileId = (profileId: string) => {
    const existingProfileIds = getGuestProfileIds();
    const updatedProfileIds = [...existingProfileIds, profileId];
    setCookie('moneko-guest-profiles', JSON.stringify(updatedProfileIds), { days: 365 });
  };
  
  const { 
    createGoalWithAI, 
    isLoading, 
    error: createError
  } = useCreateGoalWithAI();

  const simulatedProgress = useSimulatedProgress(isLoading, 200);

  const questions: FinancialProfileQuestion[] = useMemo(() => 
    typeof template.questions === 'string' 
      ? JSON.parse(template.questions) 
      : template.questions, 
    [template.questions]
  );

  // Get goal-specific questions
  const goalSpecificQuestions: FinancialProfileQuestion[] = useMemo(() => 
    getGoalSpecificQuestions(goalType), 
    [goalType]
  );

  // Combine template questions with goal-specific questions
  const allQuestions: FinancialProfileQuestion[] = useMemo(() => [
    ...questions,
    ...goalSpecificQuestions
  ], [questions, goalSpecificQuestions]);

  const categories: CategoryInfo[] = useMemo(() => {
    const categoryIds = [...new Set(allQuestions.map(q => q.category))];
    return allCategories.filter(c => categoryIds.includes(c.id));
  }, [allQuestions]);

  const questionsByCategory = useMemo(() => {
    const grouped: Record<string, FinancialProfileQuestion[]> = {};
    categories.forEach(c => grouped[c.id] = []);
    allQuestions.forEach((question) => {
      if (grouped[question.category]) {
        grouped[question.category].push(question);
      }
    });
    return grouped;
  }, [allQuestions, categories]);

  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    allQuestions.forEach((q) => {
      // Determine if this is a goal-specific question or regular question
      const isGoalSpecific = goalSpecificQuestions.some(gq => gq.id === q.id);
      const value = isGoalSpecific ? 
        goalSpecificAnswers[q.id as keyof GoalSpecificAnswers] :
        answers[q.id as keyof ComprehensiveFinancialProfile];
      
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
          if (typeof value === 'string' && !Date.parse(value)) {
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
  }, [allQuestions, answers, goalSpecificAnswers, goalSpecificQuestions]);

  const handleAnswerChange = (questionId: string, value: any) => {
    // Determine if this is a goal-specific question
    const isGoalSpecific = goalSpecificQuestions.some(q => q.id === questionId);
    
    if (isGoalSpecific) {
      setGoalSpecificAnswers(prev => ({ ...prev, [questionId]: value }));
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
    
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

  // Auto-fill questionnaire with existing profile data
  useEffect(() => {
    if (profile?.quiz_answers && Object.keys(answers).length === 0) {
      const existingData = profile.quiz_answers as any;
      
      // Map existing data to questionnaire answers (with backwards compatibility)
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
        console.log('Auto-filling questionnaire with existing profile data:', Object.keys(filteredAnswers));
        setAnswers(filteredAnswers);
      }
    }
  }, [profile, answers]);

  // Real-time validation effect - validates instantly when answers change
  useEffect(() => {
    // Only run validation if we have some answers to avoid initial validation noise
    if (Object.keys(answers).length > 0) {
      validate();
    }
  }, [answers, validate]);

  const isFormComplete = useMemo(() => {
    return allQuestions
      .filter(q => q.validation?.required)
      .every(q => {
        const isGoalSpecific = goalSpecificQuestions.some(gq => gq.id === q.id);
        const value = isGoalSpecific ? 
          goalSpecificAnswers[q.id as keyof GoalSpecificAnswers] :
          answers[q.id as keyof ComprehensiveFinancialProfile];
        return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
      });
  }, [allQuestions, answers, goalSpecificAnswers, goalSpecificQuestions]);

  const handleSubmit = async () => {
    // Clear previous errors
    setGeneralError('');
    
    // Validate and show errors if validation fails
    if (!validate()) {
      // Find the first category with validation errors
      const firstErrorQuestion = allQuestions.find(q => errors[q.id]);
      if (firstErrorQuestion) {
        const errorCategory = Object.keys(questionsByCategory).find(categoryId =>
          questionsByCategory[categoryId].some(q => q.id === firstErrorQuestion.id)
        );
        if (errorCategory) {
          setActiveCategory(errorCategory as QuestionCategory);
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
      console.log('Goal-specific answers:', goalSpecificAnswers);
      
      // Combine answers with goal-specific answers for backend
      const combinedAnswers = {
        ...answers,
        ...goalSpecificAnswers
      };
      
      const requestParams: any = {
        goalType,
        questionnaireAnswers: combinedAnswers,
        userId,
      };

      // Create the goal first
      const result = await createGoalWithAI(requestParams);
      
      // Show result modal immediately after goal creation
      onComplete(result);
      
      // Update financial health profile asynchronously in the background
      // This runs after the result modal is shown, providing better UX
      setTimeout(async () => {
        try {
          console.log('Creating/updating financial health profile with questionnaire answers...');
          
          // Use the correct parameter structure for the financial-health-profile function
          // NOTE: Only pass regular answers to profile, goal-specific answers are not stored
          const { data: profileData, error: profileError } = await supabase.functions.invoke('financial-health-profile', {
            body: {
              userId: userId, // null for guest users
              quizAnswers: answers, // Only regular profile answers, NOT goal-specific answers
              isPartialUpdate: true // Flag to indicate this is a partial update from questionnaire
            }
          });
          
          if (profileError) {
            console.error('Failed to create/update financial health profile:', profileError);
            // Don't fail the goal creation, just log the error
          } else if (profileData?.success) {
            console.log('Successfully created/updated financial health profile:', profileData);
            
            // For guest users, store the profile ID in cookies for later migration
            if (!userId && profileData?.profile?.id) {
              console.log('Storing guest financial health profile ID in cookie:', profileData.profile.id);
              addGuestProfileId(profileData.profile.id);
              
              // Verify the ID was stored correctly
              const storedIds = getGuestProfileIds();
              console.log('Current guest profile IDs in cookies:', storedIds);
            }
          } else {
            console.warn('Financial health profile creation/update returned unsuccessful response:', profileData);
          }
        } catch (profileUpdateError) {
          console.error('Error creating/updating financial health profile:', profileUpdateError);
          // Background operation - don't affect user experience
        }
      }, 100); // Small delay to ensure modal transition is smooth
    } catch (error) {
      console.error('Failed to create goal:', error);
      console.error('Questionnaire answers that caused error:', answers);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // Enhanced error parsing for the new bulletproof backend
      if (error instanceof Error) {
        if (error.message.includes('Validation failed:')) {
          // Frontend validation errors
          errorMessage = error.message.replace('Validation failed: ', '');
        } else {
          // Use the error message directly from the hook (already parsed)
          errorMessage = error.message;
        }
      }
      
      // Check if it's a validation error that should highlight specific fields
      const isValidationError = errorMessage.includes('Validation failed:') || 
                               errorMessage.includes('must be at least') ||
                               errorMessage.includes('is required') ||
                               errorMessage.includes('must be a valid');
      
      if (isValidationError) {
        const backendErrors: Record<string, string> = {};
        
        // Try to match error messages to specific questions
        allQuestions.forEach(q => {
          if (errorMessage.toLowerCase().includes(q.question.toLowerCase()) || 
              errorMessage.includes(q.id)) {
            backendErrors[q.id] = errorMessage;
          }
        });
        
        // If we found specific field errors, show them and navigate to the category
        if (Object.keys(backendErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...backendErrors }));
          
          // Navigate to the category containing the first error
          const firstErrorQuestion = allQuestions.find(q => backendErrors[q.id]);
          if (firstErrorQuestion) {
            const errorCategory = Object.keys(questionsByCategory).find(categoryId =>
              questionsByCategory[categoryId].some(q => q.id === firstErrorQuestion.id)
            );
            if (errorCategory) {
              setActiveCategory(errorCategory as QuestionCategory);
            }
          }
        } else {
          // Show general validation error message
          setGeneralError(errorMessage);
        }
      } else {
        // Show the backend error message directly (user-friendly messages from new backend)
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
      const value = answers[q.id as keyof ComprehensiveFinancialProfile];
      if (q.validation?.required) {
        return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
      }
      return true;
    });
  }, [questionsByCategory, answers]);

  // Generate advisor message for current category
  const updateAdvisorMessage = useCallback(() => {
    if (isCategoryComplete(activeCategory)) {
      // Combine both answer sets for advisor message generation
      const combinedAnswersForAdvisor = { ...answers, ...goalSpecificAnswers };
      const message = GoalAdvisorMessageGenerator.getCategoryMessage(activeCategory, goalType, combinedAnswersForAdvisor);
      if (message) {
        setAdvisorMessage(message);
        setShowAdvisorMessage(true);
      }
    } else {
      setShowAdvisorMessage(false);
    }
  }, [activeCategory, goalType, answers, goalSpecificAnswers, isCategoryComplete]);

  // Update advisor message when answers change or category is complete
  useEffect(() => {
    updateAdvisorMessage();
  }, [updateAdvisorMessage]);

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

  // Show loading state while fetching profile data for auto-fill
  if (userId && isLoadingProfile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto mb-6">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Loading Your Profile
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          We're loading your existing information to save you time...
        </p>
      </div>
    );
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
                  value={
                    goalSpecificQuestions.some(q => q.id === question.id) ?
                    goalSpecificAnswers[question.id as keyof GoalSpecificAnswers] :
                    answers[question.id as keyof ComprehensiveFinancialProfile]
                  }
                  onChange={(value) => handleAnswerChange(question.id, value)}
                  error={errors[question.id]}
                  placeholder={question.placeholder}
                  validation={question.validation}
                />
              </div>  
            ))}
          </div>

          {/* Moneko Advisor Message */}
          {showAdvisorMessage && advisorMessage && (
            <div className="mt-6">
              <MonekoAdvisorMessage
                message={advisorMessage}
                showMessage={showAdvisorMessage}
                typewriterSpeed={80}
              />
            </div>
          )}
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
    </div>
  );
}