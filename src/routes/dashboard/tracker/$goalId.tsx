import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash,
  faFlag,
  faEllipsisV,
  faChevronDown,
  faChevronUp,
  faCalendar,
  faBullseye,
  faClock,
  faRocket,
  faChartLine,
  faMagicWandSparkles,
  faCheck,
  faTimes,
  faCalculator,
  faComments,
  faBell,
  faLightbulb,
  faInfoCircle,
  faExclamationCircle,
  faCheckCircle,
  faSlidersH,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/goal-tracker/use-goal";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MilestonesList } from "@/components/goal-tracker/goal-detail/MilestonesList";
import { AdjustTimelineModal } from "@/components/goal-tracker/goal-detail/AdjustTimelineModal";
import { GoalInsights } from "@/components/goal-tracker/goal-detail/GoalInsights";
import { useState, useEffect, useOptimistic } from "react";
import { Markdown } from "@/components/ui/markdown";
import { useGoalTrackerWalkthrough } from "@/hooks/walkthrough/use-goal-tracker-walkthrough";
import "@/styles/walkthrough.css";

// Extracted components
import { AnimatedNumber } from "@/components/goal-tracker/AnimatedNumber";
import { GoalDetailSkeleton } from "@/components/goal-tracker/GoalDetailSkeleton";
import { GoalNotFound } from "@/components/goal-tracker/GoalNotFound";
import { AllInsightsModal } from "@/components/goal-tracker/AllInsightsModal";
import { InteractiveProjectionChart } from "@/components/goal-tracker/InteractiveProjectionChart";
import { TrackerModal } from "@/components/goal-tracker/TrackerModal";
import { UpdateProgressModal } from "@/components/goal-tracker/UpdateProgressModal";
import { ActivityList } from "@/components/shared/ActivityList";
import { useUserActivities } from "@/hooks/useUserActivities";

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { useSubscription } from "@/hooks/use-subscription";
import { DashboardBlockModal } from "@/components/dashboard/DashboardBlockModal";

export const Route = createFileRoute("/dashboard/tracker/$goalId")({
  component: GoalDetail,
  loader: ({ params }) => {
    const { goalId } = params;
    // Assuming you have a way to fetch goal details by ID
    // Goal data for SEO and metadata
    const goal = {
      id: goalId,
      title: "My Financial Goal",
      description: "A detailed description of my financial goal.",
      goal_type: "savings",
      target_amount: 10000,
      // Add other relevant goal properties for SEO
    };
    return { goal };
  },
  head: ({ params, loaderData }) => {
    const { goal } = loaderData;
    const pageUrl = getCanonicalUrl(`/dashboard/tracker/${params.goalId}`);
    const title = `${goal.title} | Goal Tracker | Moneko`;
    const description = `Track and manage your ${goal.goal_type} goal: ${goal.title}. ${goal.description || "View progress, milestones, and AI-powered insights."}`;
    const keywords = `financial goal, goal tracker, ${goal.goal_type}, ${goal.title}, Moneko, personal finance`;
    const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image for goals

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Thing", // Or more specific type if applicable, e.g., "FinancialProduct"
      name: goal.title,
      description: description,
      url: pageUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
      hasPart:
        goal.milestones?.map((m) => ({
          "@type": "Action", // Or a more specific type for milestones
          name: m.title,
          description: m.description,
          startTime: m.due_date,
          actionStatus:
            m.status === "completed"
              ? "CompletedActionStatus"
              : "ActiveActionStatus",
        })) || [],
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function GoalDetail() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isActive } = useSubscription(user?.id);
  // Main UI state
  const [activeTab, setActiveTab] = useState<
    | "Analytics"
    | "Quick Actions"
    | "fine-tune"
    | "activity"
    | "chat"
    | "reminders"
  >("Quick Actions");
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerActiveTab, setTrackerActiveTab] = useState<
    "activity" | "milestones"
  >("activity");
  const [showAdjustTimelineModal, setShowAdjustTimelineModal] = useState(false);
  const [showAllInsightsModal, setShowAllInsightsModal] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showGoalMenu, setShowGoalMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Animation states
  const [numbersAnimated, setNumbersAnimated] = useState(false);

  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  const {
    goal,
    milestones,
    insights,
    isLoading,
    error,
    updateProgress,
    updateGoal,
    deleteGoal,
    refetch,
  } = useGoal(goalId, user?.id);

  // Get user activities for the activity timeline
  const { activities, isLoading: activitiesLoading } = useUserActivities();

  // Walkthrough integration
  const {
    startWalkthrough,
    autoStartWalkthrough,
    hasSeenWalkthrough,
    isWalkthroughActive,
  } = useGoalTrackerWalkthrough();

  // Optimistic state for goal updates - always called, even with null data
  const [optimisticGoal, setOptimisticGoal] = useOptimistic(
    goal || null,
    (state, newGoal) => ({ ...state, ...newGoal }),
  );

  // Optimistic state for milestones - always called, even with empty array
  const [optimisticMilestones, setOptimisticMilestones] = useOptimistic(
    milestones || [],
    (state, action) => {
      switch (action.type) {
        case "update":
          return (
            state?.map((m) =>
              m.id === action.milestoneId ? { ...m, ...action.updates } : m,
            ) || []
          );
        case "add":
          return [...(state || []), action.milestone];
        case "delete":
          return state?.filter((m) => m.id !== action.milestoneId) || [];
        default:
          return state || [];
      }
    },
  );

  // Optimistic state for insights - always called, even with empty array
  const [optimisticInsights, setOptimisticInsights] = useOptimistic(
    insights || [],
    (state, action) => {
      switch (action.type) {
        case "update":
          return (
            state?.map((i) =>
              i.id === action.insightId ? { ...i, ...action.updates } : i,
            ) || []
          );
        case "add":
          return [...(state || []), action.insight];
        case "dismiss":
          return state?.filter((i) => i.id !== action.insightId) || [];
        default:
          return state || [];
      }
    },
  );

  // Trigger number animation on mount - always called
  useEffect(() => {
    const timer = setTimeout(() => setNumbersAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-start walkthrough for new users (after goal loads)
  useEffect(() => {
    if (goal && !isLoading && !error) {
      autoStartWalkthrough();
    }
  }, [goal, isLoading, error, autoStartWalkthrough]);

  // Early returns AFTER all hooks are called
  if (isLoading) {
    return <GoalDetailSkeleton />;
  }

  if (error || !goal) {
    return (
      <GoalNotFound onBack={() => navigate({ to: "/dashboard/tracker" })} />
    );
  }

  // Use optimistic data or fallback to real data
  const currentGoal = optimisticGoal || goal;
  const currentMilestones = optimisticMilestones || milestones;
  const currentInsights = optimisticInsights || insights;

  // Calculate key metrics
  const progressData = {
    currentAmount: currentGoal.current_amount || 0,
    targetAmount: currentGoal.target_amount || 0,
    progressPercentage: currentGoal.progress_percentage || 0,
    monthlyCapacity: currentGoal.ai_questionnaire_data?.monthly_savings_capacity
      ? parseInt(currentGoal.ai_questionnaire_data.monthly_savings_capacity)
      : 0,
    requiredMonthly:
      currentGoal.target_amount && currentGoal.target_date
        ? Math.ceil(
            (currentGoal.target_amount - (currentGoal.current_amount || 0)) /
              Math.max(
                1,
                Math.ceil(
                  (new Date(currentGoal.target_date).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24 * 30.44),
                ),
              ),
          )
        : 0,
    daysLeft: currentGoal.target_date
      ? Math.ceil(
          (new Date(currentGoal.target_date).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0,
  };

  const savingsGap =
    progressData.requiredMonthly - progressData.monthlyCapacity;
  const isOnTrack = savingsGap <= 0;
  const isGoalCompleted = progressData.progressPercentage >= 100;

  // Calculate timeline extension needed (fix for Infinity bug)
  const timelineExtensionMonths =
    savingsGap > 0 && progressData.monthlyCapacity > 0
      ? Math.ceil(Math.abs(savingsGap) / progressData.monthlyCapacity)
      : 6; // Default fallback of 6 months

  // Toggle step expansion
  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  // Handle goal deletion
  const handleDeleteGoal = async () => {
    try {
      await deleteGoal();
      navigate({ to: "/dashboard/tracker" });
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  // Handle subscription requirement
  const handleSubscriptionRequired = () => {
    setShowSubscriptionModal(true);
  };

  // Inline editing functions
  const startEditingTitle = () => {
    setEditedTitle(currentGoal.title || "");
    setIsEditingTitle(true);
    setShowGoalMenu(false);
  };

  const startEditingDescription = () => {
    setEditedDescription(currentGoal.description || "");
    setIsEditingDescription(true);
    setShowGoalMenu(false);
  };

  const cancelEditing = () => {
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setEditedTitle("");
    setEditedDescription("");
  };

  const saveInlineChanges = async () => {
    if (isUpdatingGoal) return;

    setIsUpdatingGoal(true);
    try {
      const updates: any = {};

      if (isEditingTitle && editedTitle.trim() !== currentGoal.title) {
        updates.title = editedTitle.trim();
      }

      if (
        isEditingDescription &&
        editedDescription.trim() !== currentGoal.description
      ) {
        updates.description = editedDescription.trim();
      }

      if (Object.keys(updates).length > 0) {
        // Optimistic update
        setOptimisticGoal(updates);

        // API call
        await updateGoal(updates);
      }

      // Reset editing states
      cancelEditing();
    } catch (error) {
      console.error("Failed to update goal:", error);
      // Revert optimistic update
      refetch();
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  // Animation effect moved above early returns

  // Generate confetti colors and pieces (similar to completion display)
  const confettiColors = [
    "#7458FF",
    "#9181FF",
    "#16CDA2",
    "#FFD166",
    "#FF6B6B",
  ];
  const confettiPieces = Array.from({ length: 50 }).map((_, i) => {
    const color =
      confettiColors[Math.floor(Math.random() * confettiColors.length)];
    const size = Math.random() * 10 + 5;
    const isCircle = Math.random() > 0.5;
    const left = `${Math.random() * 100}%`;

    return { color, size, isCircle, left, id: i };
  });

  // Confetti animation variants (from completion display)
  const confettiAnimation = {
    hidden: { opacity: 0, y: -10 },
    visible: (i: number) => ({
      opacity: 1,
      y: typeof window !== "undefined" ? window.innerHeight : 800,
      x: (Math.random() - 0.5) * 200,
      rotate: Math.random() * 360,
      transition: {
        duration: Math.random() * 3 + 2,
        repeat: Infinity,
        delay: Math.random() * 2,
        ease: "linear" as const,
      },
    }),
  } as const;

  return (
    <div className="bg-moneko-background relative min-h-screen">
      {/* Full-page confetti overlay - only show when goal is completed */}
      {isGoalCompleted && (
        <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
          {/* Animated confetti particles */}
          {confettiPieces.map((confetti) => (
            <motion.div
              key={confetti.id}
              className="absolute"
              style={{
                width: `${confetti.size}px`,
                height: `${confetti.size}px`,
                borderRadius: confetti.isCircle ? "50%" : "0",
                backgroundColor: confetti.color,
                top: "-10px",
                left: confetti.left,
                position: "absolute",
              }}
              initial="hidden"
              animate="visible"
              variants={confettiAnimation}
              custom={confetti.id}
            />
          ))}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
        {/* Hero Header - Mobile Optimized */}
        <div className="mb-8 sm:mb-10 md:mb-12">
          {/* Header with Actions - Mobile Optimized */}
          <div className="mb-6 flex flex-col items-start gap-4 sm:mb-8 sm:flex-row sm:justify-between sm:gap-6">
            <div className="w-full flex-1">
              {/* Title - Inline Editing - Mobile Optimized */}
              <div className="mb-3 sm:mb-4" data-tour="goal-title">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-mobile-lg text-foreground focus-visible:border-primary text-mobile-base min-h-[44px] flex-1 border-b bg-transparent pb-2 font-light focus-visible:ring-0 focus-visible:outline-none sm:text-2xl sm:text-base md:text-3xl"
                      placeholder="Enter goal title"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveInlineChanges();
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                  </div>
                ) : (
                  <h1
                    className="text-mobile-lg text-foreground hover:text-primary group flex min-h-[44px] cursor-pointer items-center font-light transition-colors sm:text-2xl md:text-3xl"
                    onClick={startEditingTitle}
                  >
                    {currentGoal.title}
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="ml-2 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50 sm:ml-3 sm:h-4 sm:w-4"
                    />
                  </h1>
                )}
              </div>

              {/* Description - Inline Editing - Mobile Optimized */}
              <div>
                {isEditingDescription ? (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="text-mobile-sm text-muted-foreground focus-visible:border-primary min-h-[44px] flex-1 resize-none border-b bg-transparent pb-2 focus-visible:ring-0 focus-visible:outline-none sm:text-base"
                      placeholder="Describe your goal"
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) saveInlineChanges();
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                  </div>
                ) : (
                  <p
                    className="text-mobile-sm text-muted-foreground hover:text-foreground group flex min-h-[44px] max-w-3xl cursor-pointer items-center transition-colors sm:text-base"
                    onClick={startEditingDescription}
                  >
                    {currentGoal.description ||
                      "Working towards your financial independence goal"}
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="ml-1.5 h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-50 sm:ml-2 sm:h-3 sm:w-3"
                    />
                  </p>
                )}
              </div>
            </div>

            <div className="relative flex w-full items-center gap-2 sm:w-auto sm:gap-3">
              {/* Inline Edit Controls - Mobile Optimized */}
              <AnimatePresence>
                {(isEditingTitle || isEditingDescription) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={saveInlineChanges}
                      disabled={isUpdatingGoal}
                      className="bg-subtle-background hover:bg-subtle-background/80 text-success min-h-[44px] min-w-[44px] touch-manipulation rounded-2xl p-2.5 transition-all duration-200 disabled:opacity-50 sm:p-3"
                      title="Save changes"
                    >
                      <FontAwesomeIcon
                        icon={isUpdatingGoal ? faClock : faCheck}
                        className={`h-4 w-4 ${isUpdatingGoal ? "animate-spin" : ""}`}
                      />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={isUpdatingGoal}
                      className="bg-subtle-background hover:bg-subtle-background/80 text-destructive min-h-[44px] min-w-[44px] touch-manipulation rounded-2xl p-2.5 transition-all duration-200 disabled:opacity-50 sm:p-3"
                      title="Cancel editing"
                    >
                      <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setShowGoalMenu(!showGoalMenu)}
                className="hover:bg-subtle-background group min-h-[44px] min-w-[44px] touch-manipulation rounded-2xl p-2.5 transition-all duration-200 sm:p-3"
                aria-label="Goal options"
              >
                <FontAwesomeIcon
                  icon={faEllipsisV}
                  className="text-muted-foreground group-hover:text-foreground h-4 w-4 sm:h-5 sm:w-5"
                />
              </button>

              {/* Enhanced Dropdown Menu - Mobile Optimized */}
              <AnimatePresence>
                {showGoalMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card absolute top-full right-0 z-50 mx-3 mt-2 w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl shadow-lg transition-all duration-200 hover:shadow-md sm:mx-0 sm:w-64 sm:rounded-3xl sm:shadow-sm md:w-56"
                  >
                    <div className="py-2 sm:py-3">
                      <button
                        onClick={() => {
                          startWalkthrough();
                          setShowGoalMenu(false);
                        }}
                        className="text-mobile-sm text-primary hover:bg-subtle-background group flex min-h-[48px] w-full touch-manipulation items-center gap-3 px-3 py-3 text-left transition-colors sm:px-4 sm:py-4 sm:text-sm"
                      >
                        <div className="bg-subtle-background flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl transition-colors">
                          <FontAwesomeIcon
                            icon={faLightbulb}
                            className="text-primary h-4 w-4"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">Take Tour</div>
                          <div className="text-mobile-xs text-muted-foreground sm:text-xs">
                            Learn about goal features
                          </div>
                        </div>
                      </button>

                      <div className="my-2 border-t"></div>

                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowGoalMenu(false);
                        }}
                        className="text-mobile-sm text-destructive hover:bg-subtle-background group flex min-h-[48px] w-full touch-manipulation items-center gap-3 px-3 py-3 text-left transition-colors sm:px-4 sm:py-4 sm:text-sm"
                      >
                        <div className="bg-subtle-background flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl transition-colors">
                          <FontAwesomeIcon
                            icon={faTrash}
                            className="text-destructive h-4 w-4"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">Delete Goal</div>
                          <div className="text-mobile-xs text-muted-foreground sm:text-xs">
                            Permanently remove goal
                          </div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Click outside to close menu */}
              {showGoalMenu && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowGoalMenu(false)}
                />
              )}
            </div>
          </div>

          {/* Visual Progress Section - Mobile Optimized */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <div className="mb-6 flex flex-col items-start gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div data-tour="current-savings" className="w-full sm:w-auto">
                <div className="text-mobile-xs text-muted-foreground-color mb-1 font-medium sm:mb-2 sm:text-sm">
                  Current Saving
                </div>
                <AnimatedNumber
                  value={progressData.currentAmount}
                  prefix="$"
                  className="text-foreground text-2xl font-semibold sm:text-3xl md:text-4xl"
                  isAnimated={numbersAnimated}
                />
                <div className="text-mobile-xs text-muted-foreground-color mt-1 sm:mt-2 sm:text-sm">
                  $
                  {(
                    progressData.targetAmount - progressData.currentAmount
                  ).toLocaleString()}{" "}
                  to go
                </div>
              </div>

              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                {!isGoalCompleted && (
                  <Button
                    onClick={() => setShowUpdateProgressModal(true)}
                    size="lg"
                    data-tour="update-progress-btn"
                    className="text-mobile-sm min-h-[48px] w-full !text-white sm:w-auto sm:text-base"
                  >
                    Update Progress
                  </Button>
                )}

                {isGoalCompleted && (
                  <div className="bg-subtle-background text-success text-mobile-sm flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 py-3 font-medium sm:px-6 sm:text-base">
                    <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                    Goal Completed!
                  </div>
                )}

                <Button
                  onClick={() => setShowTrackerModal(true)}
                  variant="outline"
                  size="lg"
                  data-tour="goal-summary-btn"
                  className="text-mobile-sm min-h-[48px] w-full sm:w-auto sm:text-base"
                >
                  Goal Summary
                </Button>
              </div>
            </div>

            {/* Enhanced Progress Bar - Mobile Optimized */}
            <div className="relative" data-tour="progress-bar">
              <div className="bg-subtle-background h-2.5 w-full overflow-hidden rounded-full sm:h-3">
                <motion.div
                  className="bg-primary h-2.5 rounded-full sm:h-3"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.progressPercentage}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="text-mobile-xs text-muted-foreground-color mt-2 flex justify-between sm:mt-3 sm:text-sm">
                <span>$0</span>
                <span className="text-foreground font-medium">
                  ${progressData.targetAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          {/* Key Metrics - Mobile Optimized */}
          <div
            className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-4"
            data-tour="key-metrics"
          >
            <div className="bg-card rounded-xl border p-3 text-center shadow-sm sm:rounded-2xl sm:p-4 md:p-6">
              <div className="mb-0.5 sm:mb-1"></div>
              <div className="text-mobile-xs text-muted-foreground-color mb-0.5 font-medium sm:mb-1 sm:text-xs">
                Start Date
              </div>
              <div className="text-mobile-sm text-foreground font-semibold sm:text-sm">
                {currentGoal.start_date
                  ? new Date(currentGoal.start_date).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "2-digit" },
                    )
                  : "Not set"}
              </div>
            </div>

            <div className="bg-card rounded-xl border p-3 text-center shadow-sm sm:rounded-2xl sm:p-4 md:p-6">
              <div className="mb-0.5 sm:mb-1"></div>
              <div className="text-mobile-xs text-muted-foreground-color mb-0.5 font-medium sm:mb-1 sm:text-xs">
                Target
              </div>
              <div className="text-mobile-sm text-foreground font-semibold sm:text-sm">
                <AnimatedNumber
                  value={progressData.targetAmount}
                  prefix="$"
                  isAnimated={numbersAnimated}
                />
              </div>
            </div>

            <div className="bg-card rounded-xl border p-3 text-center shadow-sm sm:rounded-2xl sm:p-4 md:p-6">
              <div className="mb-0.5 sm:mb-1"></div>
              <div className="text-mobile-xs text-muted-foreground-color mb-0.5 font-medium sm:mb-1 sm:text-xs">
                Timeline
              </div>
              <div className="text-mobile-sm text-foreground font-semibold sm:text-sm">
                {Math.floor(progressData.daysLeft / 365)}y{" "}
                {Math.floor((progressData.daysLeft % 365) / 30)}m
              </div>
            </div>

            <div className="bg-card rounded-xl border p-3 text-center shadow-sm sm:rounded-2xl sm:p-4 md:p-6">
              <div className="mb-0.5 sm:mb-1"></div>
              <div className="text-mobile-xs text-muted-foreground-color mb-0.5 font-medium sm:mb-1 sm:text-xs">
                Progress
              </div>
              <div className="text-mobile-sm text-foreground font-semibold sm:text-sm">
                <AnimatedNumber
                  value={progressData.progressPercentage}
                  suffix="%"
                  isAnimated={numbersAnimated}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Interface - Mobile Optimized */}
        <div className="mb-8 sm:mb-10 md:mb-12">
          {/* Tab Navigation - Mobile Optimized */}
          <div className="mb-6 sm:mb-8">
            <nav
              className="flex flex-wrap gap-1.5 sm:gap-2"
              aria-label="Goal sections"
              data-tour="tab-navigation"
            >
              {[
                {
                  id: "Quick Actions",
                  label: "Quick Actions",
                  tour: "quick-actions-tab",
                },
                { id: "Analytics", label: "Analytics", tour: "analytics-tab" },
                { id: "fine-tune", label: "Fine-tune", tour: "fine-tune-tab" },
                { id: "activity", label: "Activity", tour: "activity-tab" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group text-mobile-xs flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-xl px-3 py-2.5 font-medium transition-all duration-200 sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm md:px-6 ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground-color hover:bg-subtle-background"
                  }`}
                  data-tour={tab.tour}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.id === "Quick Actions" ? "Actions" : tab.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content - Mobile Optimized */}
          <div>
            <AnimatePresence mode="wait">
              {activeTab === "Analytics" && (
                <motion.div
                  key="Analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 sm:space-y-6 lg:space-y-8"
                >
                  {/* AI Insights Section - "What Moneko thinks" - Mobile Optimized */}
                  <GoalInsights
                    insights={currentInsights || []}
                    goal={currentGoal}
                    onInsightUpdate={refetch}
                    onOptimisticUpdate={(action) =>
                      setOptimisticInsights(action)
                    }
                    onSubscriptionRequired={handleSubscriptionRequired}
                  />

                  {/* AI Generated Strategy - Mobile Optimized */}
                  {currentGoal.ai_generated_strategy && (
                    <div className="bg-card mb-6 rounded-xl border p-4 shadow-sm sm:mb-8 sm:rounded-2xl sm:p-6">
                      <h3 className="text-mobile-base text-foreground mb-3 font-bold sm:mb-4 sm:text-lg md:text-xl">
                        Personalised Strategy
                      </h3>
                      <Markdown
                        content={currentGoal.ai_generated_strategy}
                        className="prose prose-sm sm:prose dark:prose-invert mx-auto max-w-none"
                        components={{
                          h1: ({ children }: any) => (
                            <h1 className="text-mobile-lg text-foreground mb-3 font-bold sm:mb-4 sm:text-xl md:text-2xl">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }: any) => (
                            <h2 className="text-mobile-base text-foreground mt-4 mb-2 font-bold sm:mt-6 sm:mb-3 sm:text-lg md:text-xl">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }: any) => (
                            <h3 className="text-mobile-sm text-foreground mt-3 mb-1.5 font-semibold sm:mt-4 sm:mb-2 sm:text-base md:text-lg">
                              {children}
                            </h3>
                          ),
                          p: ({ children }: any) => (
                            <p className="text-mobile-sm text-muted-foreground-color mb-3 leading-relaxed sm:mb-4 sm:text-base">
                              {children}
                            </p>
                          ),
                          ul: ({ children }: any) => (
                            <ul className="text-mobile-sm text-muted-foreground-color mb-3 list-inside list-disc space-y-1.5 sm:mb-4 sm:space-y-2 sm:text-base">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }: any) => (
                            <ol className="text-mobile-sm text-muted-foreground-color mb-3 list-inside list-decimal space-y-1.5 sm:mb-4 sm:space-y-2 sm:text-base">
                              {children}
                            </ol>
                          ),
                          li: ({ children }: any) => (
                            <li className="text-mobile-sm text-muted-foreground-color sm:text-base">
                              {children}
                            </li>
                          ),
                          strong: ({ children }: any) => (
                            <strong className="text-foreground font-semibold">
                              {children}
                            </strong>
                          ),
                          em: ({ children }: any) => (
                            <em className="text-muted-foreground-color italic">
                              {children}
                            </em>
                          ),
                          blockquote: ({ children }: any) => (
                            <blockquote className="text-mobile-sm text-muted-foreground-color mb-3 border border-l pl-3 italic sm:mb-4 sm:pl-4 sm:text-base">
                              {children}
                            </blockquote>
                          ),
                          table: ({ children }: any) => (
                            <div className="overflow-x-auto">
                              <table className="text-mobile-xs mb-3 w-full border-collapse border sm:mb-4 sm:text-sm">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }: any) => (
                            <th className="bg-subtle-background text-mobile-xs border px-2 py-1.5 text-left font-semibold sm:px-3 sm:py-2 sm:text-sm">
                              {children}
                            </th>
                          ),
                          td: ({ children }: any) => (
                            <td className="text-mobile-xs border px-2 py-1.5 sm:px-3 sm:py-2 sm:text-sm">
                              {children}
                            </td>
                          ),
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "Quick Actions" && (
                <motion.div
                  key="Quick Actions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <MilestonesList
                    milestones={currentMilestones || []}
                    goalId={goalId}
                    isSubscriptionActive={isActive}
                    onMilestoneUpdate={refetch}
                    onOptimisticUpdate={(action) =>
                      setOptimisticMilestones(action)
                    }
                    onSubscriptionRequired={handleSubscriptionRequired}
                  />
                </motion.div>
              )}

              {activeTab === "fine-tune" && (
                <motion.div
                  key="fine-tune"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-4 sm:space-y-6">
                    <div className="mb-6">
                      <h3 className="text-foreground text-base font-bold sm:text-lg lg:text-xl">
                        Savings Projection Chart
                      </h3>
                      <p className="text-muted-foreground-color text-xs sm:text-sm">
                        Fine-tune your goal parameters and see how they affect
                        your projection
                      </p>
                    </div>

                    <InteractiveProjectionChart
                      goal={currentGoal}
                      progressData={progressData}
                      onGoalUpdate={updateGoal}
                      isSubscriptionActive={isActive}
                      onSubscriptionRequired={handleSubscriptionRequired}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === "activity" && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                    <div className="mb-6">
                      <h3 className="text-foreground text-base font-bold sm:text-lg lg:text-xl">
                        Activity & Progress History
                      </h3>
                      <p className="text-muted-foreground-color text-xs sm:text-sm">
                        Track your progress updates and goal modifications
                      </p>
                    </div>

                    {/* General Activity List */}
                    <div>
                      <ActivityList
                        activities={activities || []}
                        isLoading={activitiesLoading}
                        goalId={goalId}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Goal Completed Celebration Section */}
        {isGoalCompleted && (
          <div className="mb-6 sm:mb-8 lg:mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Animated confetti particles */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="bg-primary absolute h-2 w-2 rounded-full opacity-60"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 50}%`,
                    }}
                    animate={{
                      y: [0, -100, 100],
                      x: [
                        (Math.random() - 0.5) * 100,
                        (Math.random() - 0.5) * 200,
                      ],
                      rotate: [0, 360],
                      opacity: [0.6, 0.4, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>

              <div className="bg-card rounded-xl border p-4 text-center shadow-sm sm:rounded-2xl sm:p-6 lg:rounded-3xl lg:p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                    delay: 0.3,
                  }}
                  className="mb-4 sm:mb-6"
                >
                  <div className="bg-success mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white sm:mb-4 sm:h-20 sm:w-20 sm:text-4xl lg:h-24 lg:w-24 lg:text-5xl">
                    🎯
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-mobile-lg text-foreground mb-3 font-bold sm:mb-4 sm:text-xl md:text-2xl lg:text-3xl"
                >
                  🎉 Congratulations! 🎉
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-mobile-sm text-muted-foreground-color mb-4 sm:mb-6 sm:text-sm md:text-base lg:mb-8 lg:text-lg"
                >
                  You've successfully achieved your "{currentGoal.title}" goal!
                  <br className="hidden sm:block" />
                  <span className="sm:hidden"> </span>You've saved{" "}
                  <span className="text-success font-bold">
                    ${progressData.targetAmount.toLocaleString()}
                  </span>{" "}
                  and reached 100% of your target.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-3 sm:gap-4 lg:mb-8 lg:gap-6"
                >
                  <div className="bg-card rounded-lg border p-3 shadow-sm sm:rounded-xl sm:p-4 lg:rounded-2xl lg:p-6">
                    <div className="mb-1 text-2xl sm:mb-2 sm:text-3xl">💰</div>
                    <div className="text-mobile-base text-success font-bold sm:text-lg lg:text-xl">
                      ${progressData.targetAmount.toLocaleString()}
                    </div>
                    <div className="text-mobile-xs text-muted-foreground-color sm:text-xs">
                      Total Saved
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border p-3 shadow-sm sm:rounded-xl sm:p-4 lg:rounded-2xl lg:p-6">
                    <div className="mb-1 text-2xl sm:mb-2 sm:text-3xl">📈</div>
                    <div className="text-mobile-base text-primary font-bold sm:text-lg lg:text-xl">
                      100%
                    </div>
                    <div className="text-mobile-xs text-muted-foreground-color sm:text-xs md:text-sm">
                      Goal Achieved
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border p-3 shadow-sm sm:rounded-xl sm:p-4 lg:rounded-2xl lg:p-6">
                    <div className="mb-1 text-2xl sm:mb-2 sm:text-3xl">🏆</div>
                    <div className="text-mobile-base text-primary font-bold sm:text-lg lg:text-xl">
                      Success!
                    </div>
                    <div className="text-mobile-xs text-muted-foreground-color sm:text-xs md:text-sm">
                      Mission Complete
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-3 sm:space-y-4"
                >
                  <h3 className="text-mobile-base text-foreground mb-3 font-bold sm:mb-4 sm:text-lg md:text-xl lg:text-2xl">
                    What's Next?
                  </h3>
                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4">
                    <Button
                      onClick={() => navigate({ to: "/dashboard/tracker" })}
                      size="lg"
                      className="text-mobile-sm min-h-[48px] sm:text-base"
                    >
                      Create New Goal
                    </Button>

                    <Button
                      onClick={() => navigate({ to: "/dashboard/tracker" })}
                      variant="outline"
                      size="lg"
                      className="text-mobile-sm min-h-[48px] sm:text-base"
                    >
                      View All Goals
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Goal Tracker Modal */}
        {/* Update Progress Modal */}
        <UpdateProgressModal
          isOpen={showUpdateProgressModal}
          onClose={() => setShowUpdateProgressModal(false)}
          goal={currentGoal}
          onProgressUpdate={updateProgress}
        />

        <TrackerModal
          isOpen={showTrackerModal}
          onClose={() => setShowTrackerModal(false)}
          goal={currentGoal}
          progressData={progressData}
          milestones={currentMilestones || []}
          insights={currentInsights || []}
          activeTab={trackerActiveTab}
          setActiveTab={setTrackerActiveTab}
          savingsGap={savingsGap}
          onUpdate={refetch}
          onOptimisticUpdate={setOptimisticGoal}
          onProgressUpdate={updateProgress}
        />

        {/* Adjust Timeline Modal */}
        <AdjustTimelineModal
          isOpen={showAdjustTimelineModal}
          onClose={() => setShowAdjustTimelineModal(false)}
          goal={currentGoal}
          onOptimisticUpdate={setOptimisticGoal}
        />

        {/* All Insights Modal */}
        <AllInsightsModal
          isOpen={showAllInsightsModal}
          onClose={() => setShowAllInsightsModal(false)}
          insights={currentInsights || []}
          goal={currentGoal}
          onInsightUpdate={refetch}
          onOptimisticUpdate={(action) => setOptimisticInsights(action)}
        />

        {/* Subscription Modal */}
        <DashboardBlockModal
          isVisible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />

        {/* Delete Confirmation Modal - Mobile Optimized */}
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Goal"
        >
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-start gap-3 sm:mb-6 sm:gap-4">
              <div className="bg-subtle-background flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12">
                <FontAwesomeIcon
                  icon={faTrash}
                  className="text-destructive h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-mobile-base text-foreground mb-1 font-semibold break-words sm:text-base md:text-lg">
                  Delete "{currentGoal.title}"?
                </h3>
                <p className="text-mobile-xs text-muted-foreground-color sm:text-xs md:text-sm">
                  This action cannot be undone. All milestones and progress will
                  be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-2 sm:flex-row sm:gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="text-mobile-sm min-h-[44px] w-full sm:w-auto sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteGoal}
                variant="destructive"
                className="text-mobile-sm min-h-[44px] w-full sm:w-auto sm:text-sm"
              >
                Delete Goal
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
