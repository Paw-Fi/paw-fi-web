import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { presetProfiles } from "@/types/preset-profiles";

// Privacy Info Expandable Component
const PrivacyInfoExpandable: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <span className="font-medium">Why do we need this information?</span>
        <span className={`text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} inline-block`}>
          ▼
        </span>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              We collect these details to ensure your personalized financial plan is fully dedicated to your unique situation, goals, and circumstances. The more accurate information you provide, the better we can tailor recommendations specifically for you.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  
  // Setup flow state
  const [currentStep, setCurrentStep] = useState<'setup-experience' | 'preset-profile' | 'questionnaire'>('setup-experience');
  const [selectedSetupMode, setSelectedSetupMode] = useState<'customized' | 'faster' | null>('customized');
  const [showConfirmationButton, setShowConfirmationButton] = useState(false);
  const [selectedPresetProfile, setSelectedPresetProfile] = useState<string | null>(null);
  const [showPresetConfirmation, setShowPresetConfirmation] = useState(false);
  
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

  // Handle setup experience selection
  const handleSetupExperienceSelect = (mode: 'customized' | 'faster') => {
    setSelectedSetupMode(mode);
    setShowConfirmationButton(true);
  };

  // Handle confirmation after setup experience selection
  const handleSetupConfirmation = () => {
    if (selectedSetupMode === 'customized') {
      setCurrentStep('questionnaire');
    } else {
      setCurrentStep('preset-profile');
    }
  };

  // Handle preset profile selection (just select, don't create yet)
  const handlePresetProfileSelect = (profileType: string) => {
    setSelectedPresetProfile(profileType);
    setShowPresetConfirmation(true);
  };

  // Handle preset profile confirmation and goal creation
  const handlePresetProfileConfirm = async () => {
    if (!selectedPresetProfile) return;
    
    // Clear any previous errors
    setGeneralError('');
    
    // Generate minimal answers based on preset profile
    const presetAnswers = generatePresetProfileAnswers(selectedPresetProfile);
    
    console.log('Creating goal with preset profile:', selectedPresetProfile);
    console.log('Generated preset answers:', presetAnswers);
    
    try {
      const requestParams = {
        goalType,
        questionnaireAnswers: presetAnswers,
        userId: userId || null,
        isPresetProfile: true,
        presetProfileType: selectedPresetProfile
      };

      console.log('Calling createGoalWithAI with params:', requestParams);
      
      // Create the goal with preset profile - this will trigger the loading state
      const result = await createGoalWithAI(requestParams);
      
      console.log('Goal creation result:', result);
      
      // Call onComplete to show the result
      onComplete(result);
    } catch (error) {
      console.error('Failed to create goal with preset profile:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to create goal with preset profile. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setGeneralError(errorMessage);
    }
  };

  // Generate preset profile answers based on profile type
  const generatePresetProfileAnswers = (profileType: string) => {
    // Find the matching preset profile
    const profile = presetProfiles.find(p => p.id === profileType);
    
    if (!profile) {
      console.error('Preset profile not found:', profileType);
      // Return a basic profile as fallback
      return {
        current_age: 30,
        marital_status: 'single',
        dependents: 0,
        gross_monthly_income: 5000,
        net_monthly_income: 4000,
        income_stability: 'stable',
        housing_cost: 1500,
        investment_timeline: 'long',
        risk_tolerance: 'moderate',
        investment_experience: 'beginner',
      };
    }
    
    console.log('Using preset profile:', profile.name, profile.answers);
    return profile.answers;
  };

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
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-8">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-medium text-foreground mb-4">
          Loading Your Profile
        </h2>
        <p className="text-muted-foreground">
          We're loading your existing information to save you time...
        </p>
      </div>
    );
  }

  // Render Setup Experience Selection (Step 1)
  if (currentStep === 'setup-experience') {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-light text-foreground mb-3">
            Choose Your Setup Experience
          </h1>
          <p className="text-muted-foreground">
            How would you like to create your financial plan? Choose the option that works best for you.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Customized Setup Option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={() => handleSetupExperienceSelect('customized')}
              className={`w-full bg-card hover:bg-muted/20 border rounded-2xl p-8 text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                selectedSetupMode === 'customized' 
                  ? 'border-primary bg-primary/10 shadow-sm' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex justify-end mb-4">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>

              <h3 className="text-lg font-medium text-foreground mb-3">
                Customized Setup
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Answer detailed questions to get a personalized financial plan tailored specifically to your situation and goals.
              </p>

              <div className="space-y-3 mb-6">
                <div className="text-sm text-muted-foreground">
                  • Fully personalized recommendations
                </div>
                <div className="text-sm text-muted-foreground">
                  • Detailed financial analysis
                </div>
                <div className="text-sm text-muted-foreground">
                  • Custom strategies & milestones
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <span>⏱ 5-8 minutes</span>
              </div>
            </button>
          </motion.div>

          {/* Faster Setup Option */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => handleSetupExperienceSelect('faster')}
              className={`w-full bg-card hover:bg-subtle-background border rounded-xl p-6 text-left transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                selectedSetupMode === 'faster' 
                  ? 'border-primary bg-primary/5' 
                  : 'border hover:border-primary/50'
              }`}
            >
              <div className="flex justify-end mb-4">
                <span className="bg-success text-white text-xs font-medium px-3 py-1 rounded-lg">
                  Express
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">
                Faster Setup
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Choose from pre-built financial profiles and get started immediately with proven strategies tailored to common financial situations.
              </p>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-muted-foreground">
                  • Pre-built expert templates
                </div>
                <div className="text-sm text-muted-foreground">
                  • Instant plan generation
                </div>
                <div className="text-sm text-muted-foreground">
                  • Easy to customize later
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <span>⏱ 1-2 minutes</span>
              </div>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Don't worry, you can always modify your plan later as your situation changes.
          </p>
          
       
           <div className="flex gap-2 justify-center">
           <Button
              onClick={onCancel}
              variant="outline"
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
                onClick={handleSetupConfirmation}
                disabled={!selectedSetupMode}
                className="px-8 py-2"
              >
                Confirm
              </Button>
           </div>
          
        </motion.div>
      </div>
    );
  }

  // Render Preset Profile Selection (Step 2 for faster setup)
  if (currentStep === 'preset-profile') {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Choose Your Profile
          </h1>
          <p className="text-muted-foreground">
            Select the profile that best matches your current situation.
          </p>
        </motion.div>

        {generalError && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-8 p-6 bg-card border border-red-200 dark:border-red-800 rounded-xl shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-5 h-5 text-warning flex-shrink-0 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-foreground font-medium mb-1">
                  {generalError}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {presetProfiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => handlePresetProfileSelect(profile.id)}
                className={`w-full bg-card hover:bg-subtle-background border rounded-xl p-4 text-left transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  selectedPresetProfile === profile.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {profile.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {profile.description}
                </p>               
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >          
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setCurrentStep('setup-experience')}
                variant="outline"
                className="px-6 py-2"
              >
                Back
              </Button>
              <Button
                onClick={handlePresetProfileConfirm}
                disabled={isLoading}
                className="px-8 py-2"
              >
                {isLoading ? 'Creating Goal...' : `Create Goal`}
              </Button>
            </div>
          
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-light text-foreground mb-3">
          Tell us about your goal
        </h1>
        <p className="text-muted-foreground">
          Fill out the details below to create your personalized financial plan.
        </p>
      </motion.div>

      {generalError && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mb-8 p-6 bg-warning/5 rounded-2xl shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-5 h-5 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-warning text-xs font-medium">!</span>
            </div>
            <div className="flex-1">
              <p className="text-foreground font-medium mb-1">
                {generalError}
              </p>
              {Object.keys(errors).length > 0 && (
                <p className="text-muted-foreground text-sm">
                  Check the highlighted fields below for specific errors.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
      {/* 1. CategoryProgress - Steps component */}
      <CategoryProgress
        categories={categories}
        activeCategory={activeCategory}
        progress={progress}
      />

      {/* 2. Main Form Component */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="mt-8">
              <MonekoAdvisorMessage
                message={advisorMessage}
                showMessage={showAdvisorMessage}
                typewriterSpeed={80}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 3. Navigation Component */}
      <FormNavigation
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        isLastStep={isLastCategory}
        isFormComplete={isFormComplete}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        submitLabel="Create My Goal"
        isSubmitting={isLoading}
        hasValidationErrors={Object.keys(errors).length > 0 || !!generalError}
      />

      {/* 4. Privacy Notice Component (least important, at the bottom) */}
      <div className="mt-16 bg-subtle-background rounded-xl p-8">
        <h4 className="font-semibold text-foreground mb-4">
          Privacy Protected
        </h4>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Your financial information is stored privately with end-to-end encryption. 
          No one can access your data, not even our developers. Your privacy are always our top priority.
        </p>
        <PrivacyInfoExpandable />
      </div>
    </div>
  );
}

// Question renderer component is now replaced by FormQuestion component

function GeneratingGoalView({ progress, error, onCancel }: any) {
  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto bg-warning/10 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <div className="w-8 h-8 bg-warning/20 rounded-full flex items-center justify-center">
            <span className="text-warning text-lg font-medium">!</span>
          </div>
        </div>
        <h2 className="text-2xl font-light text-foreground mb-4">
          Goal Creation Failed
        </h2>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Button onClick={onCancel} variant="outline">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 mx-auto mb-8"
      >
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"></div>
      </motion.div>
      <h2 className="text-2xl font-bold text-foreground mb-4">
        Creating Your AI-Powered Goal
      </h2>
      <p className="text-muted-foreground mb-8">
        Our AI is analyzing your responses and creating a personalized strategy...
      </p>
      <div className="w-full bg-subtle-background rounded-full h-3 mb-6 shadow-inner">
        <motion.div
          className="bg-primary h-3 rounded-full shadow-sm"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {Math.round(progress)}% Complete
      </p>     
    </div>
  );
}