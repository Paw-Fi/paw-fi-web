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
  faSlidersH
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/goal-tracker/use-goal";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MilestonesList } from "@/components/goal-tracker/goal-detail/MilestonesList";
import { AdjustTimelineModal } from "@/components/goal-tracker/goal-detail/AdjustTimelineModal";
import { GoalInsights } from "@/components/goal-tracker/goal-detail/GoalInsights";
import { useState, useEffect, useOptimistic } from "react";
import { Markdown } from '@/components/ui/markdown';
import { useGoalTrackerWalkthrough } from '@/hooks/walkthrough/use-goal-tracker-walkthrough';
import '@/styles/walkthrough.css';

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
    const description = `Track and manage your ${goal.goal_type} goal: ${goal.title}. ${goal.description || 'View progress, milestones, and AI-powered insights.'}`;
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
      "name": goal.title,
      "description": description,
      "url": pageUrl,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": pageUrl
      },
      "hasPart": goal.milestones?.map(m => ({
        "@type": "Action", // Or a more specific type for milestones
        "name": m.title,
        "description": m.description,
        "startTime": m.due_date,
        "actionStatus": m.status === 'completed' ? 'CompletedActionStatus' : 'ActiveActionStatus'
      })) || []
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});



function GoalDetail() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {isActive} = useSubscription(user?.id);
  // Main UI state
  const [activeTab, setActiveTab] = useState<'Analytics' | "Quick Actions" | 'fine-tune' | 'activity' | 'chat' | 'reminders'>('Quick Actions');
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerActiveTab, setTrackerActiveTab] = useState<'activity' | 'milestones'>('activity');
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
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
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
    refetch
  } = useGoal(goalId, user?.id);

  // Get user activities for the activity timeline
  const { activities, isLoading: activitiesLoading } = useUserActivities();

  // Walkthrough integration
  const { startWalkthrough, autoStartWalkthrough, hasSeenWalkthrough, isWalkthroughActive } = useGoalTrackerWalkthrough();

  // Optimistic state for goal updates - always called, even with null data
  const [optimisticGoal, setOptimisticGoal] = useOptimistic(
    goal || null,
    (state, newGoal) => ({ ...state, ...newGoal })
  );

  // Optimistic state for milestones - always called, even with empty array
  const [optimisticMilestones, setOptimisticMilestones] = useOptimistic(
    milestones || [],
    (state, action) => {
      switch (action.type) {
        case 'update':
          return state?.map(m => m.id === action.milestoneId ? { ...m, ...action.updates } : m) || [];
        case 'add':
          return [...(state || []), action.milestone];
        case 'delete':
          return state?.filter(m => m.id !== action.milestoneId) || [];
        default:
          return state || [];
      }
    }
  );

  // Optimistic state for insights - always called, even with empty array
  const [optimisticInsights, setOptimisticInsights] = useOptimistic(
    insights || [],
    (state, action) => {
      switch (action.type) {
        case 'update':
          return state?.map(i => i.id === action.insightId ? { ...i, ...action.updates } : i) || [];
        case 'add':
          return [...(state || []), action.insight];
        case 'dismiss':
          return state?.filter(i => i.id !== action.insightId) || [];
        default:
          return state || [];
      }
    }
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
    return <GoalNotFound onBack={() => navigate({ to: '/dashboard/tracker' })} />;
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
    monthlyCapacity: currentGoal.ai_questionnaire_data?.monthly_savings_capacity ? parseInt(currentGoal.ai_questionnaire_data.monthly_savings_capacity) : 0,
    requiredMonthly: currentGoal.target_amount && currentGoal.target_date ? 
      Math.ceil((currentGoal.target_amount - (currentGoal.current_amount || 0)) / Math.max(1, Math.ceil((new Date(currentGoal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44)))) : 0,
    daysLeft: currentGoal.target_date ? Math.ceil((new Date(currentGoal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
  };

  const savingsGap = progressData.requiredMonthly - progressData.monthlyCapacity;
  const isOnTrack = savingsGap <= 0;
  const isGoalCompleted = progressData.progressPercentage >= 100;
  
  // Calculate timeline extension needed (fix for Infinity bug)
  const timelineExtensionMonths = savingsGap > 0 && progressData.monthlyCapacity > 0 
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
      navigate({ to: '/dashboard/tracker' });
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  // Handle subscription requirement
  const handleSubscriptionRequired = () => {
    setShowSubscriptionModal(true);
  };
  
  // Inline editing functions
  const startEditingTitle = () => {
    setEditedTitle(currentGoal.title || '');
    setIsEditingTitle(true);
    setShowGoalMenu(false);
  };
  
  const startEditingDescription = () => {
    setEditedDescription(currentGoal.description || '');
    setIsEditingDescription(true);
    setShowGoalMenu(false);
  };
  
  const cancelEditing = () => {
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setEditedTitle('');
    setEditedDescription('');
  };
  
  const saveInlineChanges = async () => {
    if (isUpdatingGoal) return;
    
    setIsUpdatingGoal(true);
    try {
      const updates: any = {};
      
      if (isEditingTitle && editedTitle.trim() !== currentGoal.title) {
        updates.title = editedTitle.trim();
      }
      
      if (isEditingDescription && editedDescription.trim() !== currentGoal.description) {
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
      console.error('Failed to update goal:', error);
      // Revert optimistic update
      refetch();
    } finally {
      setIsUpdatingGoal(false);
    }
  };
  
  // Animation effect moved above early returns

  // Generate confetti colors and pieces (similar to completion display)
  const confettiColors = ["#7458FF", "#9181FF", "#16CDA2", "#FFD166", "#FF6B6B"];
  const confettiPieces = Array.from({ length: 50 }).map((_, i) => {
    const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
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
      y: typeof window !== 'undefined' ? window.innerHeight : 800,
      x: (Math.random() - 0.5) * 200,
      rotate: Math.random() * 360,
      transition: {
        duration: Math.random() * 3 + 2,
        repeat: Infinity,
        delay: Math.random() * 2,
        ease: "linear" as const
      }
    })
  } as const;

  return (
    <div className="min-h-screen bg-background relative">
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
                borderRadius: confetti.isCircle ? '50%' : '0',
                backgroundColor: confetti.color,
                top: '-10px',
                left: confetti.left,
                position: 'absolute'
              }}
              initial="hidden"
              animate="visible"
              variants={confettiAnimation}
              custom={confetti.id}
            />
          ))}
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Hero Header */}
        <div className="mb-12">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:justify-between mb-8">
            <div className="flex-1">
              {/* Title - Inline Editing */}
              <div className="mb-4" data-tour="goal-title">
                {isEditingTitle ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-3xl font-semibold bg-transparent border-b text-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary flex-1 pb-2 min-h-[44px]"  
                      placeholder="Enter goal title"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveInlineChanges();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                  </div>
                ) : (
                  <h1 
                    className="text-3xl font-semibold text-foreground cursor-pointer hover:text-primary transition-colors group min-h-[44px] flex items-center"
                    onClick={startEditingTitle}
                  >
                    {currentGoal.title}
                    <FontAwesomeIcon 
                      icon={faEdit} 
                      className="w-4 h-4 ml-3 opacity-0 group-hover:opacity-50 transition-opacity" 
                    />
                  </h1>
                )}
              </div>
              
              {/* Description - Inline Editing */}
              <div>
                {isEditingDescription ? (
                  <div className="flex items-start gap-3">
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="bg-transparent border-b text-muted-foreground-color focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary flex-1 pb-2 resize-none min-h-[44px]"
                      placeholder="Describe your goal"
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) saveInlineChanges();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                  </div>
                ) : (
                  <p 
                    className="text-muted-foreground-color max-w-3xl cursor-pointer hover:text-foreground transition-colors group min-h-[44px] flex items-center"
                    onClick={startEditingDescription}
                  >
                    {currentGoal.description || 'Working towards your financial independence goal'}
                    <FontAwesomeIcon 
                      icon={faEdit} 
                      className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-50 transition-opacity" 
                    />
                  </p>
                )}
              </div>
            </div>
            
            <div className="relative flex items-center gap-3 w-full sm:w-auto">
              {/* Inline Edit Controls */}
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
                      className="min-w-[44px] min-h-[44px] p-3 rounded-xl bg-subtle-background hover:bg-subtle-background/80 text-success transition-all duration-200 disabled:opacity-50"
                      title="Save changes"
                    >
                      <FontAwesomeIcon 
                        icon={isUpdatingGoal ? faClock : faCheck} 
                        className={`w-4 h-4 ${isUpdatingGoal ? 'animate-spin' : ''}`} 
                      />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={isUpdatingGoal}
                      className="min-w-[44px] min-h-[44px] p-3 rounded-xl bg-subtle-background hover:bg-subtle-background/80 text-destructive transition-all duration-200 disabled:opacity-50"
                      title="Cancel editing"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={() => setShowGoalMenu(!showGoalMenu)}
                className="min-w-[44px] min-h-[44px] p-3 rounded-xl hover:bg-subtle-background transition-all duration-200 group"
                aria-label="Goal options"
              >
                <FontAwesomeIcon 
                  icon={faEllipsisV} 
                  className="w-5 h-5 text-muted-foreground-color group-hover:text-foreground" 
                />
              </button>
          
              {/* Enhanced Dropdown Menu */}
              <AnimatePresence>
                {showGoalMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-64 sm:w-56 bg-card rounded-2xl shadow-lg border z-50 overflow-hidden max-w-[calc(100vw-2rem)] mx-2 sm:mx-0"
                  >
                    <div className="py-3">
                      <button
                        onClick={() => {
                          startWalkthrough();
                          setShowGoalMenu(false);
                        }}
                        className="w-full text-left px-4 py-4 text-sm text-primary hover:bg-subtle-background flex items-center gap-3 transition-colors group min-h-[48px]"
                      >
                        <div className="w-8 h-8 bg-subtle-background rounded-lg flex items-center justify-center transition-colors">
                          <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Take Tour</div>
                          <div className="text-xs text-muted-foreground-color">Learn about goal features</div>
                        </div>
                      </button>
                      
                      <div className="border-t my-2"></div>
                      
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowGoalMenu(false);
                        }}
                        className="w-full text-left px-4 py-4 text-sm text-destructive hover:bg-subtle-background flex items-center gap-3 transition-colors group min-h-[48px]"
                      >
                        <div className="w-8 h-8 bg-subtle-background rounded-lg flex items-center justify-center transition-colors">
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <div className="font-medium">Delete Goal</div>
                          <div className="text-xs text-muted-foreground-color">Permanently remove goal</div>
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
          
          {/* Visual Progress Section */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:justify-between mb-8">
              <div data-tour="current-savings">
                <div className="text-sm font-medium text-muted-foreground-color mb-2">Current Saving</div>
                <AnimatedNumber 
                  value={progressData.currentAmount} 
                  prefix="$" 
                  className="text-4xl font-semibold text-foreground"
                  isAnimated={numbersAnimated}
                />
                <div className="text-muted-foreground-color mt-2">
                  ${(progressData.targetAmount - progressData.currentAmount).toLocaleString()} to go
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {!isGoalCompleted && (
                  <Button onClick={() => setShowUpdateProgressModal(true)} size="lg" data-tour="update-progress-btn">
                    Update Progress
                  </Button>
                )}
                
                {isGoalCompleted && (
                  <div className="flex items-center justify-center gap-2 px-6 py-3 bg-subtle-background text-success rounded-2xl font-medium">
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                    Goal Completed!
                  </div>
                )}
                
                <Button onClick={() => setShowTrackerModal(true)} variant="outline" size="lg" data-tour="goal-summary-btn">
                  Goal Summary
                </Button>
              </div>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="relative" data-tour="progress-bar">
              <div className="w-full bg-subtle-background rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-primary h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.progressPercentage}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between mt-3 text-sm text-muted-foreground-color">
                <span>$0</span>
                <span className="font-medium text-foreground">${progressData.targetAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6" data-tour="key-metrics">
              <div className="text-center bg-card border rounded-2xl p-6 shadow-sm">
                <div className="mb-1"></div>
                <div className="text-xs font-medium text-muted-foreground-color mb-1">Start Date</div>
                <div className="text-sm font-semibold text-foreground">
                  {currentGoal.start_date ? new Date(currentGoal.start_date).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              
              <div className="text-center bg-card border rounded-2xl p-6 shadow-sm">
                <div className="mb-1"></div>
                <div className="text-xs font-medium text-muted-foreground-color mb-1">Target</div>
                <div className="text-sm font-semibold text-foreground">
                  <AnimatedNumber value={progressData.targetAmount} prefix="$" isAnimated={numbersAnimated} />
                </div>
              </div>
              
              <div className="text-center bg-card border rounded-2xl p-6 shadow-sm">
                <div className="mb-1"></div>
                <div className="text-xs font-medium text-muted-foreground-color mb-1">Timeline</div>
                <div className="text-sm font-semibold text-foreground">
                  {Math.floor(progressData.daysLeft / 365)}y {Math.floor((progressData.daysLeft % 365) / 30)}m
                </div>
              </div>
              
              <div className="text-center bg-card border rounded-2xl p-6 shadow-sm">
                <div className="mb-1"></div>
                <div className="text-xs font-medium text-muted-foreground-color mb-1">Progress</div>
                <div className="text-sm font-semibold text-foreground">
                  <AnimatedNumber value={progressData.progressPercentage} suffix="%" isAnimated={numbersAnimated} />
                </div>
              </div>
            </div>
        </div>
        
        {/* Tabbed Interface */}
        <div className="mb-12">
          {/* Tab Navigation */}
          <div className="mb-8">
            <nav className="flex flex-wrap gap-2" aria-label="Goal sections" data-tour="tab-navigation">
              {[
                { id: "Quick Actions", label: "Quick Actions", tour: "quick-actions-tab" },
                { id: 'Analytics', label: 'Analytics', tour: "analytics-tab" },
                { id: 'fine-tune', label: 'Fine-tune', tour: "fine-tune-tab" },
                { id: 'activity', label: 'Activity', tour: "activity-tab" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-2xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground-color hover:bg-subtle-background'
                  }`}
                  data-tour={tab.tour}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === 'Quick Actions' ? 'Actions' : tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div>
            <AnimatePresence mode="wait">
              {activeTab === 'Analytics' && (
                <motion.div
                  key="Analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 sm:space-y-6 lg:space-y-8"
                >               
                   {/* AI Insights Section - "What Moneko thinks" */}
                   <GoalInsights 
                    insights={currentInsights || []} 
                    goal={currentGoal}
                    onInsightUpdate={refetch}
                    onOptimisticUpdate={(action) => setOptimisticInsights(action)}
                    onSubscriptionRequired={handleSubscriptionRequired}
                  />

                  {/* AI Generated Strategy */}
                  {currentGoal.ai_generated_strategy && (
                    <div className="bg-card border rounded-xl p-6 mb-8 shadow-sm">
                      <h3 className="text-xl font-bold text-foreground mb-4">Personalised Strategy</h3>
                      <Markdown 
                        content={currentGoal.ai_generated_strategy}
                        className="prose mx-auto max-w-none dark:prose-invert lg:prose-lg"
                        components={{
                          h1: ({children}: any) => <h1 className="text-2xl font-bold text-foreground mb-4">{children}</h1>,
                          h2: ({children}: any) => <h2 className="text-xl font-bold text-foreground mb-3 mt-6">{children}</h2>,
                          h3: ({children}: any) => <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h3>,
                          p: ({children}: any) => <p className="mb-4 text-muted-foreground-color leading-relaxed">{children}</p>,
                          ul: ({children}: any) => <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground-color">{children}</ul>,
                          ol: ({children}: any) => <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground-color">{children}</ol>,
                          li: ({children}: any) => <li className="text-muted-foreground-color">{children}</li>,
                          strong: ({children}: any) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({children}: any) => <em className="italic text-muted-foreground-color">{children}</em>,
                          blockquote: ({children}: any) => <blockquote className="border-l border pl-4 italic text-muted-foreground-color mb-4">{children}</blockquote>,
                          table: ({children}: any) => <table className="w-full border-collapse border mb-4">{children}</table>,
                          th: ({children}: any) => <th className="border px-3 py-2 bg-subtle-background font-semibold text-left">{children}</th>,
                          td: ({children}: any) => <td className="border px-3 py-2">{children}</td>,
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
                    onOptimisticUpdate={(action) => setOptimisticMilestones(action)}
                    onSubscriptionRequired={handleSubscriptionRequired}
                  />
                </motion.div>
              )}
              
              {activeTab === 'fine-tune' && (
                <motion.div
                  key='fine-tune'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-4 sm:space-y-6">
                    <div className="mb-6">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Savings Projection Chart</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground-color">Fine-tune your goal parameters and see how they affect your projection</p>
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
              
              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                    <div className="mb-6">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Activity & Progress History</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground-color">Track your progress updates and goal modifications</p>
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
                  className="absolute w-2 h-2 bg-primary rounded-full opacity-60"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 50}%`,
                  }}
                  animate={{
                    y: [0, -100, 100],
                    x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
                    rotate: [0, 360],
                    opacity: [0.6, 0.4, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>

            <div className="bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 text-center border shadow-sm">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                className="mb-4 sm:mb-6"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-success text-white rounded-full text-2xl sm:text-3xl lg:text-4xl xl:text-5xl mb-3 sm:mb-4">
                  🎯
                </div>
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-3 sm:mb-4">
              
                🎉 Congratulations! 🎉
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm sm:text-base lg:text-lg text-muted-foreground-color mb-4 sm:mb-6 lg:mb-8">
              
                You've successfully achieved your "{currentGoal.title}" goal!<br className="hidden sm:block" />
                <span className="sm:hidden"> </span>You've saved <span className="font-bold text-success">${progressData.targetAmount.toLocaleString()}</span> and reached 100% of your target.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
              >
                <div className="bg-card border rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💰</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-success">
                    ${progressData.targetAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground-color">Total Saved</div>
                </div>
                
                <div className="bg-card border rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">📈</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                    100%
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground-color">Goal Achieved</div>
                </div>
                
                <div className="bg-card border rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏆</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                    Success!
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground-color">Mission Complete</div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-4"
              >
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-3 sm:mb-4">What's Next?</h3>
                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <Button onClick={() => navigate({ to: '/dashboard/tracker' })} size="lg" className="min-h-[48px]">
                    Create New Goal
                  </Button>
                  
                  <Button onClick={() => navigate({ to: '/dashboard/tracker' })} variant="outline" size="lg" className="min-h-[48px]">
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Goal"
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-subtle-background rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground break-words">
                Delete "{currentGoal.title}"?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground-color">
                This action cannot be undone. All milestones and progress will be permanently deleted.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteGoal}
              variant="destructive"
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

