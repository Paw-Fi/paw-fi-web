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
import ReactMarkdown from 'react-markdown';
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
    <div className="min-h-screen bg-white dark:bg-gray-900 relative">
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
        <div className="mb-8 sm:mb-12 md:mb-16">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 sm:justify-between mb-6 sm:mb-8 lg:mb-12">
            <div className="flex-1">
              {/* Title - Inline Editing */}
              <div className="mb-3 sm:mb-4 lg:mb-6" data-tour="goal-title">
                {isEditingTitle ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 flex-1 pb-2 min-h-[44px]"  
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
                    className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group min-h-[44px] flex items-center break-words hyphens-auto"
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
                      className="bg-transparent border-b-2 border-blue-500 text-gray-600 dark:text-gray-400 focus:outline-none focus:border-blue-600 flex-1 pb-2 resize-none text-sm sm:text-base lg:text-lg min-h-[44px]"
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
                    className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group text-sm sm:text-base lg:text-lg min-h-[44px] flex items-center break-words hyphens-auto"
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
            
            <div className="relative flex items-center gap-3 sm:gap-4 w-full sm:w-auto sm:ml-4 lg:ml-8">
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
                      className="min-w-[44px] min-h-[44px] p-3 sm:p-3 rounded-lg sm:rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 transition-all duration-200 disabled:opacity-50 touch-manipulation flex items-center justify-center"
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
                      className="min-w-[44px] min-h-[44px] p-3 sm:p-3 rounded-lg sm:rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all duration-200 disabled:opacity-50 touch-manipulation flex items-center justify-center"
                      title="Cancel editing"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={() => setShowGoalMenu(!showGoalMenu)}
                className="min-w-[44px] min-h-[44px] p-3 sm:p-3 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group touch-manipulation flex items-center justify-center"
                aria-label="Goal options"
              >
                <FontAwesomeIcon 
                  icon={faEllipsisV} 
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" 
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
                    className="absolute right-0 top-full mt-2 w-64 sm:w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-w-[calc(100vw-2rem)] mx-2 sm:mx-0"
                  >
                    <div className="py-3">
                      <button
                        onClick={() => {
                          startWalkthrough();
                          setShowGoalMenu(false);
                        }}
                        className="w-full text-left px-4 py-4 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors group min-h-[48px]"
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                          <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium">Take Tour</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Learn about goal features</div>
                        </div>
                      </button>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                      
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowGoalMenu(false);
                        }}
                        className="w-full text-left px-4 py-4 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors group min-h-[48px]"
                      >
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <div className="font-medium">Delete Goal</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Permanently remove goal</div>
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
          <div className="mb-6 sm:mb-8 lg:mb-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 sm:justify-between mb-6 sm:mb-8">
              <div data-tour="current-savings">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Current Saving</div>
                <AnimatedNumber 
                  value={progressData.currentAmount} 
                  prefix="$" 
                  className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white"
                  isAnimated={numbersAnimated}
                />
                <div className="text-sm sm:text-base lg:text-lg text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                  ${(progressData.targetAmount - progressData.currentAmount).toLocaleString()} to go
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                {!isGoalCompleted && (
                  <button
                    onClick={() => setShowUpdateProgressModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-6 py-3 sm:py-3 rounded-lg sm:rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] text-sm sm:text-base"
                    data-tour="update-progress-btn"
                  >
                    Update Progress
                  </button>
                )}
                
                {isGoalCompleted && (
                  <div className="flex items-center justify-center gap-2 px-6 sm:px-6 py-3 sm:py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg sm:rounded-xl font-semibold min-h-[48px] text-sm sm:text-base">
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                    Goal Completed!
                  </div>
                )}
                
                <button 
                  onClick={() => setShowTrackerModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 sm:px-6 py-3 sm:py-3 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] text-sm sm:text-base"
                  data-tour="goal-summary-btn"
                >
                 Goal Summary
                </button>
              </div>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="relative" data-tour="progress-bar">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 sm:h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 sm:h-3 rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.progressPercentage}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-white/20" />
                </motion.div>
              </div>
              <div className="flex justify-between mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span>$0</span>
                <span className="font-medium text-gray-900 dark:text-white">${progressData.targetAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6" data-tour="key-metrics">
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faCalendar} className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</div>
                        <div className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 dark:text-white break-all">
                          {currentGoal.start_date ? new Date(currentGoal.start_date).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                      
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faBullseye} className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target</div>
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white break-all">
                          <AnimatedNumber value={progressData.targetAmount} prefix="$" isAnimated={numbersAnimated} />
                        </div>
                      </div>
                      
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faClock} className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timeline</div>
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white break-all">
                          {Math.floor(progressData.daysLeft / 365)}y {Math.floor((progressData.daysLeft % 365) / 30)}m
                        </div>
                      </div>
                      
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-center justify-center mb-2 sm:mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faChartLine} className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Progress</div>
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white break-all">
                          <AnimatedNumber value={progressData.progressPercentage} suffix="%" isAnimated={numbersAnimated} />
                        </div>
                      </div>
                    </div>
        </div>
        
        {/* Tabbed Interface */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          {/* Tab Navigation */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Goal sections" data-tour="tab-navigation">
              {[
                { id: "Quick Actions", label: "Quick Actions", icon: faFlag, tour: "quick-actions-tab" },
                { id: 'Analytics', label: 'Analytics', icon: faChartLine, tour: "analytics-tab" },
                { id: 'fine-tune', label: 'Fine-tune', icon: faSlidersH, tour: "fine-tune-tab" },
                { id: 'activity', label: 'Activity', icon: faClock, tour: "activity-tab" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-3 sm:py-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  data-tour={tab.tour}
                >
                  <FontAwesomeIcon 
                    icon={tab.icon} 
                    className={`w-3 h-3 sm:w-4 sm:h-4 transition-colors ${
                      activeTab === tab.id 
                        ? 'text-blue-500 dark:text-blue-400' 
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                    }`} 
                  />
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
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6 lg:mb-8 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3 mb-3 sm:mb-4 lg:mb-6">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Personalised Strategy</h3>
                      </div>
                      
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown 
                          components={{
                            h1: ({...props}) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" {...props} />,
                            h2: ({...props}) => <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-6" {...props} />,
                            h3: ({...props}) => <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4" {...props} />,
                            p: ({...props}) => <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
                            ul: ({...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                            ol: ({...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                            li: ({...props}) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
                            strong: ({...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                            em: ({...props}) => <em className="italic text-gray-700 dark:text-gray-300" {...props} />,
                            blockquote: ({...props}) => <blockquote className="border-l-4 border-purple-300 dark:border-purple-600 pl-4 italic text-gray-600 dark:text-gray-400 mb-4" {...props} />,
                            table: ({...props}) => <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 mb-4" {...props} />,
                            th: ({...props}) => <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left" {...props} />,
                            td: ({...props}) => <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props} />,
                          }}
                        >
                          {currentGoal.ai_generated_strategy}
                        </ReactMarkdown>
                      </div>
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
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <FontAwesomeIcon icon={faMagicWandSparkles} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Savings Projection Chart</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Fine-tune your goal parameters and see how they affect your projection</p>
                      </div>
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
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <FontAwesomeIcon icon={faClock} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Activity & Progress History</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Track your progress updates and goal modifications</p>
                      </div>
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
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 50}%`,
                  }}
                  animate={{
                    y: [0, -100, 100],
                    x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
                    rotate: [0, 360],
                    opacity: [1, 0.8, 0],
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

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 text-center border border-green-200 dark:border-green-800">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                className="mb-4 sm:mb-6"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-green-500 text-white rounded-full text-2xl sm:text-3xl lg:text-4xl xl:text-5xl mb-3 sm:mb-4">
                  🎯
                </div>
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              
                🎉 Congratulations! 🎉
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 mb-4 sm:mb-6 lg:mb-8">
              
                You've successfully achieved your "{currentGoal.title}" goal!<br className="hidden sm:block" />
                <span className="sm:hidden"> </span>You've saved <span className="font-bold text-green-600 dark:text-green-400">${progressData.targetAmount.toLocaleString()}</span> and reached 100% of your target.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💰</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-green-600 dark:text-green-400">
                    ${progressData.targetAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Saved</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">📈</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 dark:text-blue-400">
                    100%
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Goal Achieved</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm">
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏆</div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 dark:text-purple-400">
                    Success!
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Mission Complete</div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-4"
              >
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">What's Next?</h3>
                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => navigate({ to: '/dashboard/tracker' })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold flex items-center justify-center gap-2 sm:gap-3 transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] text-sm sm:text-base"
                  >
                    <FontAwesomeIcon icon={faBullseye} className="w-4 h-4 sm:w-5 sm:h-5" />
                    Create New Goal
                  </button>
                  
                  <button
                    onClick={() => navigate({ to: '/dashboard/tracker' })}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold flex items-center justify-center gap-2 sm:gap-3 transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] text-sm sm:text-base"
                  >
                    <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 sm:w-5 sm:h-5" />
                    View All Goals
                  </button>
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                Delete "{currentGoal.title}"?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
              className="bg-red-600 hover:bg-red-700 text-white"
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

