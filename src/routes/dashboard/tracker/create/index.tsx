import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
      links: [
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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
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
    <div className="bg-card rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-md transition-all duration-200 max-w-2xl mx-auto">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-24 h-24 mx-auto bg-success rounded-3xl flex items-center justify-center mb-8 shadow-sm"
        >
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
            <div className="text-success text-2xl font-light">✓</div>
          </div>
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }} 
          className="text-4xl font-light text-foreground mb-6"
        >
          Goal Created!
        </motion.h1>
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
          className="mb-8"
        >
          {result?.goal && (
            <div className="bg-muted/30 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-medium text-foreground mb-3">
                {result.goal.title}
              </h3>
              <p className="text-muted-foreground mb-3">
                Target: ${result.goal.target_amount?.toLocaleString()} by {new Date(result.goal.target_date).toLocaleDateString()}
              </p>
              {result.milestones && result.milestones.length > 0 && (
                <p className="text-sm text-primary font-medium">
                  {result.milestones.length} milestones created to help you reach your goal
                </p>
              )}
            </div>
          )}
          <p className="text-lg text-muted-foreground">
            You're all set to start working on your financial future.
          </p>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}>
          <Button 
            onClick={() => navigate({ to: '/dashboard/tracker/$goalId', params: { goalId: result.goal.id } })} 
            size="lg"
            className="rounded-full px-8"
          >
            Check your goal
          </Button>
        </motion.div>
      </div>
    </div>
  );
}