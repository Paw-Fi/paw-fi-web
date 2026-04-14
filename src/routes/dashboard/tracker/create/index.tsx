import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GoalTypeSelector } from "@/components/goal-tracker/questionnaire/GoalTypeSelector";
import { QuestionnaireFlow } from "@/components/goal-tracker/questionnaire/QuestionnaireFlow";
import { getQuestionnaireTemplate } from "@/data/questionnaire-templates";
import { useAuth } from "@/contexts/auth-context";
import type {
  GoalType,
  GoalCreationState,
  GoalCreationResult,
} from "@/components/goal-tracker/types";

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute("/dashboard/tracker/create/")({
  component: CreateGoalPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/dashboard/tracker/create");
    const title = "Create New Financial Goal | Moneko Goal Tracker";
    const description =
      "Start your financial journey by creating a new personalized goal with Moneko's AI-powered goal tracker. Define your objectives and get a tailored plan.";
    const keywords =
      "create financial goal, new goal, financial planning, goal setting, AI goal tracker, Moneko";
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
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description: description,
            url: pageUrl,
          }),
        },
      ],
    };
  },
});

function CreateGoalPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<GoalCreationState>({
    currentStep: "goal_type_selection",
  });

  // Show loading if auth is still loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGoalTypeSelect = (goalType: GoalType) => {
    setState({ currentStep: "questionnaire", selectedGoalType: goalType });
  };

  const handleQuestionnaireComplete = (result: GoalCreationResult) => {
    setState({ currentStep: "complete", result });
  };

  const handleBack = () => {
    if (state.currentStep === "questionnaire") {
      setState({ currentStep: "goal_type_selection" });
    } else {
      navigate({ to: "/dashboard/tracker" });
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case "goal_type_selection":
        return <GoalTypeSelector onSelect={handleGoalTypeSelect} />;
      case "questionnaire":
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
      case "complete":
        return (
          <GoalCreationSuccess
            result={state.result!}
            onGoToDashboard={() => navigate({ to: "/dashboard/tracker" })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl">
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

function GoalCreationSuccess({
  result,
  onGoToDashboard,
}: {
  result: GoalCreationResult;
  onGoToDashboard: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-card mx-auto max-w-2xl rounded-3xl p-8 shadow-sm transition-all duration-200 hover:shadow-md sm:p-12">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="bg-success mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
            <div className="text-success text-2xl font-light">✓</div>
          </div>
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
          className="text-foreground mb-6 text-4xl font-light"
        >
          Goal Created!
        </motion.h1>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
          className="mb-8"
        >
          {result?.goal && (
            <div className="bg-muted/30 mb-6 rounded-2xl p-6">
              <h3 className="text-foreground mb-3 text-xl font-medium">
                {result.goal.title}
              </h3>
              <p className="text-muted-foreground mb-3">
                Target: ${result.goal.target_amount?.toLocaleString()} by{" "}
                {new Date(result.goal.target_date).toLocaleDateString()}
              </p>
              {result.milestones && result.milestones.length > 0 && (
                <p className="text-primary text-sm font-medium">
                  {result.milestones.length} milestones created to help you
                  reach your goal
                </p>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-lg">
            You're all set to start working on your financial future.
          </p>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}
        >
          <Button
            onClick={() =>
              navigate({
                to: "/dashboard/tracker/$goalId",
                params: { goalId: result.goal.id },
              })
            }
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
