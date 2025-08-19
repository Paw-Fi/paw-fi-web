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
import { useAuth } from '@/contexts/auth-context';
import type { 
  GoalType, 
  GoalCreationState,
  GoalCreationResult 
} from '@/components/goal-tracker/types';

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute('/dashboard/tracker/create/')({
  component: CreateGoalPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/dashboard/tracker/create");
    const title = "Create New Financial Goal | Moneko Goal Tracker";
    const description = "Start your financial journey by creating a new personalized goal with Moneko's AI-powered goal tracker. Define your objectives and get a tailored plan.";
    const keywords = "create financial goal, new goal, financial planning, goal setting, AI goal tracker, Moneko";
    const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image

    return {
      meta: seo({
        title,
        description,
        keywords,
        image: imageUrl,
        url: pageUrl,
      }),
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": title,
            "description": description,
            "url": pageUrl,
          })
        }
      ]
    };
  },
});

function CreateGoalPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<GoalCreationState>({ currentStep: 'goal_type_selection' });

  // Show loading if auth is still loading
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGoalTypeSelect = (goalType: GoalType) => {
    /* eslint-disable */console.log(...oo_oo(`4180365050_78_4_78_75_4`,'Starting authenticated goal creation for user:', user?.id));
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
            userId={user?.id || null}
          />
        );
      case 'complete':
        return <GoalCreationSuccess result={state.result!} onGoToDashboard={() => navigate({ to: '/dashboard/tracker' })} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/50 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl">
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
    </div>
  );
}

function GoalCreationSuccess({ result, onGoToDashboard }: { result: GoalCreationResult; onGoToDashboard: () => void; }) {
  const navigate = useNavigate();
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
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
        className="mb-8"
      >
        {result?.goal && (
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {result.goal.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Target: ${result.goal.target_amount?.toLocaleString()} by {new Date(result.goal.target_date).toLocaleDateString()}
            </p>
            {result.milestones && result.milestones.length > 0 && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {result.milestones.length} milestones created to help you reach your goal
              </p>
            )}
          </div>
        )}
        <p className="text-lg text-gray-600 dark:text-gray-400">
          You're all set to start working on your financial future.
        </p>
      </motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}>
        <Button onClick={() => navigate({ to: '/dashboard/tracker/$goalId', params: { goalId: result.goal.id } })} size="lg">
          Check your goal
        </Button>
      </motion.div>
    </div>
  );
}