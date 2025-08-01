import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faRocket } from "@fortawesome/free-solid-svg-icons";
import { GoalTypeSelector } from "@/components/goal-tracker/questionnaire/GoalTypeSelector";
import { QuestionnaireFlow } from "@/components/goal-tracker/questionnaire/QuestionnaireFlow";
import { useQuestionnaireTemplate } from "@/hooks/goal-tracker/use-questionnaire-template";
import { GOAL_TYPE_CONFIGS, type GoalType } from "@/components/goal-tracker/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/tracker/create/")({
  component: CreateGoal,
  head: () => ({
    meta: [
      { title: 'Create Goal | Moneko' },
      { 
        name: 'description', 
        content: 'Create a new financial goal with AI-powered strategy and milestone generation. Choose from retirement, home buying, wealth building, and more.' 
      },
    ],
  }),
});

type CreateGoalStep = 'goal-type' | 'questionnaire' | 'generating' | 'complete';

function CreateGoal() {
  const [currentStep, setCurrentStep] = useState<CreateGoalStep>('goal-type');
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType | null>(null);
  const [createdGoal, setCreatedGoal] = useState<any>(null);
  
  const { template, isLoading: templateLoading, error: templateError } = useQuestionnaireTemplate(
    selectedGoalType || undefined
  );

  const handleGoalTypeSelect = (goalType: GoalType) => {
    setSelectedGoalType(goalType);
    setCurrentStep('questionnaire');
  };

  const handleBackToGoalTypes = () => {
    setSelectedGoalType(null);
    setCurrentStep('goal-type');
  };

  const handleQuestionnaireComplete = (result: any) => {
    setCreatedGoal(result);
    setCurrentStep('complete');
  };

  const handleCancel = () => {
    window.location.href = '/dashboard/tracker';
  };

  const handleGoToGoal = () => {
    if (createdGoal?.goal?.id) {
      window.location.href = `/dashboard/tracker/${createdGoal.goal.id}`;
    } else {
      window.location.href = '/dashboard/tracker';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background dark:from-dark-background to-purple-50/50 dark:to-purple-900/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={currentStep === 'questionnaire' ? handleBackToGoalTypes : handleCancel}
              className="p-2"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground dark:text-dark-foreground">
                Create Financial Goal
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {getStepDescription(currentStep, selectedGoalType)}
              </p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="hidden md:flex items-center space-x-2">
            <StepIndicator step={1} currentStep={currentStep} label="Goal Type" />
            <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
            <StepIndicator step={2} currentStep={currentStep} label="Details" />
            <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
            <StepIndicator step={3} currentStep={currentStep} label="Complete" />
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {currentStep === 'goal-type' && (
              <motion.div
                key="goal-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GoalTypeSelector
                  onSelect={handleGoalTypeSelect}
                  onCancel={handleCancel}
                />
              </motion.div>
            )}

            {currentStep === 'questionnaire' && selectedGoalType && template && (
              <motion.div
                key="questionnaire"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <QuestionnaireFlow
                  goalType={selectedGoalType}
                  template={template}
                  onComplete={handleQuestionnaireComplete}
                  onCancel={handleBackToGoalTypes}
                />
              </motion.div>
            )}

            {currentStep === 'complete' && createdGoal && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
              >
                <GoalCreationSuccess
                  goal={createdGoal}
                  onGoToGoal={handleGoToGoal}
                  onCreateAnother={() => setCurrentStep('goal-type')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading States */}
          {templateLoading && currentStep === 'questionnaire' && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading questionnaire...</p>
              </div>
            </div>
          )}

          {/* Error States */}
          {templateError && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                  <FontAwesomeIcon icon={faRocket} className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground dark:text-dark-foreground mb-4">
                  Failed to Load Questionnaire
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {templateError.message || 'Something went wrong. Please try again.'}
                </p>
                <Button onClick={handleBackToGoalTypes} variant="outline">
                  Go Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ 
  step, 
  currentStep, 
  label 
}: { 
  step: number; 
  currentStep: CreateGoalStep; 
  label: string;
}) {
  const stepMap = {
    'goal-type': 1,
    'questionnaire': 2,
    'generating': 2,
    'complete': 3,
  };
  
  const current = stepMap[currentStep];
  const isActive = step <= current;
  const isCurrent = step === current;

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          isActive
            ? isCurrent
              ? 'bg-primary text-white'
              : 'bg-green-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
      >
        {step <= current - 1 ? '✓' : step}
      </div>
      <span
        className={`text-sm font-medium ${
          isActive
            ? 'text-foreground dark:text-dark-foreground'
            : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function GoalCreationSuccess({ 
  goal, 
  onGoToGoal, 
  onCreateAnother 
}: { 
  goal: any; 
  onGoToGoal: () => void; 
  onCreateAnother: () => void;
}) {
  return (
    <div className="text-center py-16">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 20,
          delay: 0.2 
        }}
        className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-8"
      >
        <FontAwesomeIcon icon={faRocket} className="w-12 h-12 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-bold text-foreground dark:text-dark-foreground mb-4">
          Goal Created Successfully! 🎉
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          <strong>{goal.goal?.title}</strong>
        </p>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Your AI-powered strategy is ready with {goal.milestones?.length || 0} smart milestones 
          to help you achieve your goal of ${typeof goal.goal?.target_amount === 'number' ? goal.goal.target_amount.toLocaleString() : 'a certain amount'}.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onGoToGoal}
              className="bg-primary hover:bg-primary-dark text-white px-8 py-3"
            >
              View Your Goal
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onCreateAnother}
              variant="outline"
              className="px-8 py-3"
            >
              Create Another Goal
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function getStepDescription(step: CreateGoalStep, goalType: GoalType | null): string {
  switch (step) {
    case 'goal-type':
      return 'Choose the type of financial goal you want to create';
    case 'questionnaire':
      return goalType 
        ? `Answer questions about your ${GOAL_TYPE_CONFIGS[goalType]?.name.toLowerCase()} goal`
        : 'Answer questions about your goal';
    case 'generating':
      return 'AI is creating your personalized strategy and milestones';
    case 'complete':
      return 'Your goal has been created successfully';
    default:
      return '';
  }
}