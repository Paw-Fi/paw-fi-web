import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck } from '@fortawesome/free-solid-svg-icons';
import { GoalTypeSelector } from '@/components/goal-tracker/questionnaire/GoalTypeSelector';
import { QuestionnaireFlow } from '@/components/goal-tracker/questionnaire/QuestionnaireFlow';
import { getQuestionnaireTemplate } from '@/data/questionnaire-templates';
import type { 
  GoalType, 
  GoalCreationStep, 
  GoalCreationState,
  GoalCreationResult 
} from '@/components/goal-tracker/types';

export const Route = createFileRoute('/dashboard/tracker/create')({
  component: CreateGoalPage,
});

function CreateGoalPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<GoalCreationState>({
    currentStep: 'goal_type_selection'
  });

  const handleGoalTypeSelect = (goalType: GoalType) => {
    setState(prev => ({
      ...prev,
      currentStep: 'questionnaire',
      selectedGoalType: goalType
    }));
  };

  const handleQuestionnaireComplete = (result: GoalCreationResult) => {
    setState(prev => ({
      ...prev,
      currentStep: 'complete',
      result
    }));
  };

  const handleCancel = () => {
    if (state.currentStep === 'goal_type_selection') {
      navigate({ to: '/dashboard/tracker' });
    } else {
      setState(prev => ({
        ...prev,
        currentStep: 'goal_type_selection',
        selectedGoalType: undefined,
        questionnaireAnswers: undefined,
        result: undefined,
        error: undefined
      }));
    }
  };

  const handleGoToDashboard = () => {
    navigate({ to: '/dashboard/tracker' });
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 'goal_type_selection':
        return (
          <GoalTypeSelector 
            onSelect={handleGoalTypeSelect}
            onCancel={handleCancel}
          />
        );
      
      case 'questionnaire':
        if (!state.selectedGoalType) {
          setState(prev => ({ ...prev, currentStep: 'goal_type_selection' }));
          return null;
        }
        
        const template = getQuestionnaireTemplate(state.selectedGoalType);
        if (!template) {
          return (
            <div className="text-center py-16">
              <p className="text-red-600 dark:text-red-400 mb-4">
                No questionnaire template found for {state.selectedGoalType}
              </p>
              <Button onClick={handleCancel} variant="outline">
                Go Back
              </Button>
            </div>
          );
        }
        
        return (
          <QuestionnaireFlow
            goalType={state.selectedGoalType}
            template={template}
            onComplete={handleQuestionnaireComplete}
            onCancel={handleCancel}
          />
        );
      
      case 'complete':
        return (
          <GoalCreationSuccess 
            result={state.result!}
            onGoToDashboard={handleGoToDashboard}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleCancel}
                variant="ghost" 
                size="sm"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
                {state.currentStep === 'goal_type_selection' ? 'Back to Tracker' : 'Back'}
              </Button>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                state.currentStep === 'goal_type_selection' 
                  ? 'bg-primary' 
                  : 'bg-green-500'
              }`} />
              <div className={`w-2 h-2 rounded-full ${
                state.currentStep === 'questionnaire' 
                  ? 'bg-primary' 
                  : state.currentStep === 'complete'
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <div className={`w-2 h-2 rounded-full ${
                state.currentStep === 'complete' 
                  ? 'bg-primary' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Success component
function GoalCreationSuccess({ 
  result, 
  onGoToDashboard 
}: { 
  result: GoalCreationResult; 
  onGoToDashboard: () => void; 
}) {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-8"
      >
        <FontAwesomeIcon icon={faCheck} className="w-10 h-10 text-green-600 dark:text-green-400" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold text-foreground dark:text-dark-foreground mb-4">
          🎉 Goal Created Successfully!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Your AI-powered financial goal has been created with personalized milestones and strategy.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8 text-left"
      >
        <h2 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-4">
          {result.goal.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {result.goal.description}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-foreground dark:text-dark-foreground mb-2">
              Target Amount
            </h3>
            <p className="text-2xl font-bold text-primary">
              ${result.goal.target_amount.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-foreground dark:text-dark-foreground mb-2">
              Target Date
            </h3>
            <p className="text-2xl font-bold text-primary">
              {new Date(result.goal.target_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold text-foreground dark:text-dark-foreground mb-2">
            Milestones Created
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {result.milestones.length} personalized milestones with AI-generated timelines
          </p>
        </div>
        
        <div>
          <h3 className="font-semibold text-foreground dark:text-dark-foreground mb-2">
            AI Insights
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {result.insights.length} actionable insights to optimize your strategy
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Button 
          onClick={onGoToDashboard}
          size="lg"
          className="px-8 py-3"
        >
          View Your Goal Dashboard
        </Button>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
          You can track progress, update milestones, and get AI insights from your dashboard.
        </p>
      </motion.div>
    </div>
  );
}
