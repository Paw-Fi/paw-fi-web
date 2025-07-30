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
  GoalCreationState,
  GoalCreationResult 
} from '@/components/goal-tracker/types';

export const Route = createFileRoute('/dashboard/tracker/create')({
  component: CreateGoalPage,
});

function CreateGoalPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<GoalCreationState>({ currentStep: 'goal_type_selection' });

  const handleGoalTypeSelect = (goalType: GoalType) => {
    setState({ currentStep: 'questionnaire', selectedGoalType: goalType });
  };

  const handleQuestionnaireComplete = (result: GoalCreationResult) => {
    setState({ currentStep: 'complete', result });
  };

  const handleBack = () => {
    if (state.currentStep === 'questionnaire') {
      setState({ currentStep: 'goal_type_selection' });
    } else {
      navigate({ to: '/dashboard/tracker' });
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 'goal_type_selection':
        return <GoalTypeSelector onSelect={handleGoalTypeSelect} />;
      case 'questionnaire':
        const template = getQuestionnaireTemplate(state.selectedGoalType!);
        if (!template) {
          return <div>Error: Questionnaire template not found.</div>;
        }
        return (
          <QuestionnaireFlow
            goalType={state.selectedGoalType!}
            template={template}
            onComplete={handleQuestionnaireComplete}
            onCancel={handleBack}
          />
        );
      case 'complete':
        return <GoalCreationSuccess result={state.result!} onGoToDashboard={() => navigate({ to: '/dashboard/tracker' })} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/50 dark:to-gray-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Button onClick={handleBack} variant="ghost" className="text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10">
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          {state.currentStep === 'goal_type_selection' ? 'Back to Tracker' : 'Back'}
        </Button>
      </div>
    </div>
  );
}

function GoalCreationSuccess({ result, onGoToDashboard }: { result: GoalCreationResult; onGoToDashboard: () => void; }) {
  return (
    <div className="text-center p-8">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-lg"
      >
        <FontAwesomeIcon icon={faCheck} className="w-12 h-12 text-white" />
      </motion.div>
      <motion.h1 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }} 
        className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
      >
        Goal Created!
      </motion.h1>
      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }} 
        className="text-lg text-gray-600 dark:text-gray-400 mb-8"
      >
        You're all set to start working on your financial future.
      </motion.p>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}>
        <Button onClick={onGoToDashboard} size="lg">
          Go to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
