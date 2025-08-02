import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faEdit, 
  faTrash, 
  faFlag,
  faCalendarAlt,
  faDollarSign,
  faEllipsisV,
  faChevronDown,
  faChevronUp,
  faCalendar,
  faBullseye,
  faClock,
  faRocket,
  faChartLine,
  faArrowUp,
  faInfoCircle,
  faMagicWandSparkles,
  faCheck,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/goal-tracker/use-goal";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MilestonesList } from "@/components/goal-tracker/goal-detail/MilestonesList";
import { AdjustTimelineModal } from "@/components/goal-tracker/goal-detail/AdjustTimelineModal";
import { GoalInsights } from "@/components/goal-tracker/goal-detail/GoalInsights";
import { useState, useEffect, useOptimistic } from "react";

// Extracted components
import { AnimatedNumber } from "@/components/goal-tracker/AnimatedNumber";
import { GoalDetailSkeleton } from "@/components/goal-tracker/GoalDetailSkeleton";
import { GoalNotFound } from "@/components/goal-tracker/GoalNotFound";
import { AllInsightsModal } from "@/components/goal-tracker/AllInsightsModal";
import { InteractiveProjectionChart } from "@/components/goal-tracker/InteractiveProjectionChart";
import { TrackerModal } from "@/components/goal-tracker/TrackerModal";
import { UpdateProgressModal } from "@/components/goal-tracker/UpdateProgressModal";
import { ActivityTimelineComponent } from "@/components/goal-tracker/ActivityTimelineComponent";

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

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
  // Main UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'playground' | 'activity'>('overview');
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerActiveTab, setTrackerActiveTab] = useState<'activity' | 'milestones'>('activity');
  const [showAdjustTimelineModal, setShowAdjustTimelineModal] = useState(false);
  const [showAllInsightsModal, setShowAllInsightsModal] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showGoalMenu, setShowGoalMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          {/* Header with Actions */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              {/* Title - Inline Editing */}
              <div className="mb-4">
                {isEditingTitle ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-3xl font-bold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 flex-1 pb-1"
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
                    className="text-3xl font-bold text-gray-900 dark:text-white leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                    onClick={startEditingTitle}
                  >
                    {currentGoal.title}
                    <FontAwesomeIcon 
                      icon={faEdit} 
                      className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-50 transition-opacity" 
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
                      className="bg-transparent border-b-2 border-blue-500 text-gray-600 dark:text-gray-400 focus:outline-none focus:border-blue-600 flex-1 pb-1 resize-none"
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
                    className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
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
            
            <div className="relative ml-6 flex items-center gap-2">
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
                      className="p-2 rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-all duration-200 disabled:opacity-50"
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
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 disabled:opacity-50"
                      title="Cancel editing"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={() => setShowGoalMenu(!showGoalMenu)}
                className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
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
                    className="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                  >
                    <div className="py-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowGoalMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors group"
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
          <div className="mb-8">
            <div className="flex items-end justify-between mb-4">
              <div>
                <AnimatedNumber 
                  value={progressData.currentAmount} 
                  prefix="$" 
                  className="text-5xl font-bold text-gray-900 dark:text-white"
                  isAnimated={numbersAnimated}
                />
                <div className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                  of <AnimatedNumber value={progressData.targetAmount} prefix="$" className="font-semibold" isAnimated={numbersAnimated} /> target
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  <AnimatedNumber value={progressData.progressPercentage} suffix="%" isAnimated={numbersAnimated} />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">complete</div>
              </div>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 h-4 rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.progressPercentage}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>$0</span>
                <span>${(progressData.targetAmount / 2).toLocaleString()}</span>
                <span>${progressData.targetAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {/* Primary CTA */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUpdateProgressModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <FontAwesomeIcon icon={faArrowUp} className="w-5 h-5" />
              Update Progress
            </button>
            
            <button
              onClick={() => setShowTrackerModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <FontAwesomeIcon icon={faBullseye} className="w-4 h-4" />
              Tracker
            </button>
          </div>
        </div>
        
        {/* Tabbed Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex" aria-label="Goal sections">
              {[
                { id: 'overview', label: 'Overview', icon: faChartLine },
                { id: 'milestones', label: 'Milestones', icon: faFlag },
                { id: 'playground', label: 'Playground', icon: faMagicWandSparkles },
                { id: 'activity', label: 'Activity', icon: faClock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <FontAwesomeIcon 
                    icon={tab.icon} 
                    className={`w-4 h-4 transition-colors ${
                      activeTab === tab.id 
                        ? 'text-blue-500 dark:text-blue-400' 
                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                    }`} 
                  />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Key Metrics Card */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon icon={faCalendar} className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Days Left</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        <AnimatedNumber value={progressData.daysLeft} isAnimated={numbersAnimated} />
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {Math.floor(progressData.daysLeft / 365)} years remaining
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Progress</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                        <AnimatedNumber value={progressData.progressPercentage} suffix="%" isAnimated={numbersAnimated} />
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        On track: {isOnTrack ? 'Yes' : 'Needs adjustment'}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon icon={faDollarSign} className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Monthly Gap</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {savingsGap > 0 ? '+' : ''}<AnimatedNumber value={Math.abs(savingsGap)} prefix="$" isAnimated={numbersAnimated} />
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {savingsGap > 0 ? 'Increase needed' : 'Surplus available'}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon icon={faCalendarAlt} className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Projected Finish</div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        {new Date(currentGoal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Target completion
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Insights Section */}
                  <GoalInsights 
                    insights={currentInsights || []} 
                    goal={currentGoal}
                    onInsightUpdate={refetch}
                    onOptimisticUpdate={(action) => setOptimisticInsights(action)}
                  />
                </motion.div>
              )}
              
              {activeTab === 'milestones' && (
                <motion.div
                  key="milestones"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <MilestonesList 
                    milestones={currentMilestones || []}
                    goalId={goalId}
                    onMilestoneUpdate={refetch}
                    onOptimisticUpdate={(action) => setOptimisticMilestones(action)}
                  />
                </motion.div>
              )}
              
              {activeTab === 'playground' && (
                <motion.div
                  key="playground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <FontAwesomeIcon icon={faMagicWandSparkles} className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Savings Projection Chart</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Fine-tune your goal parameters and see how they affect your projection</p>
                      </div>
                    </div>
                    
                  
                    
                    <InteractiveProjectionChart 
                      goal={currentGoal} 
                      progressData={progressData}
                      onGoalUpdate={updateGoal}
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
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <FontAwesomeIcon icon={faClock} className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress updates and goal modifications</p>
                      </div>
                    </div>
                    
                    <ActivityTimelineComponent goalId={goalId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      {/* Next Steps - Now outside of tabs as requested in original design */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faRocket} className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Next Steps</h3>
        </div>
        <div className="space-y-4">
          {/* Increase Income */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button 
              onClick={() => toggleStepExpansion('increase-income')}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📈</span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Increase Your Income</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ask for a raise of ${Math.ceil(savingsGap * 1.3)}/month (accounting for taxes)
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('increase-income') ? faChevronUp : faChevronDown} 
                className="w-4 h-4 text-gray-400" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('increase-income') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <strong>Impact:</strong> High • <strong>Difficulty:</strong> Medium
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        Ask for a raise of ${Math.ceil(savingsGap * 1.3)}/month (accounting for taxes)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        Start a side hustle or freelance work
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        Sell unused items or rent out assets
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        Pick up extra hours or overtime shifts
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Cut Expenses */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button 
              onClick={() => toggleStepExpansion('cut-expenses')}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">💰</span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Cut Monthly Expenses</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Review subscriptions and cancel ${Math.ceil(Math.abs(savingsGap) * 0.3)}/month worth
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('cut-expenses') ? faChevronUp : faChevronDown} 
                className="w-4 h-4 text-gray-400" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('cut-expenses') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <strong>Impact:</strong> Medium • <strong>Difficulty:</strong> Low
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        Review subscriptions and cancel ${Math.ceil(savingsGap * 0.3)}/month worth
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        Cook more meals at home instead of eating out
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        Switch to cheaper phone/internet plans
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        Reduce entertainment and shopping expenses
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Adjust Timeline */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button 
              onClick={() => toggleStepExpansion('adjust-timeline')}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📅</span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Adjust Your Timeline</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Extend target date by {Math.ceil(savingsGap / progressData.monthlyCapacity * 12) || 0} months
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('adjust-timeline') ? faChevronUp : faChevronDown} 
                className="w-4 h-4 text-gray-400" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('adjust-timeline') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <strong>Impact:</strong> High • <strong>Difficulty:</strong> Very Low
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-1">•</span>
                        Extend target date by {Math.ceil(savingsGap / progressData.monthlyCapacity * 12)} months
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-1">•</span>
                        Break goal into smaller milestones
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-1">•</span>
                        Start with a lower target amount first
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-1">•</span>
                        Consider a phased approach to reaching your goal
                      </li>
                    </ul>
                    <button
                      onClick={() => setShowAdjustTimelineModal(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Adjust Timeline Now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Investment Strategy */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button 
              onClick={() => toggleStepExpansion('investment-strategy')}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📊</span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Investment Strategy</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Invest existing savings for higher returns
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('investment-strategy') ? faChevronUp : faChevronDown} 
                className="w-4 h-4 text-gray-400" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('investment-strategy') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <strong>Impact:</strong> Medium • <strong>Difficulty:</strong> Medium
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        Invest existing savings for higher returns
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        Use dollar-cost averaging for consistent growth
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        Consider low-cost index funds or ETFs
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        Automate investments to reduce required manual savings
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Goal Tracker Modal */}
      {/* Update Progress Modal */}
      <UpdateProgressModal 
        isOpen={showUpdateProgressModal}
        onClose={() => setShowUpdateProgressModal(false)}
        goal={currentGoal}
        onProgressUpdate={updateProgress}
        onOptimisticUpdate={setOptimisticGoal}
      />
      
      <TrackerModal 
        isOpen={showTrackerModal}
        onClose={() => setShowTrackerModal(false)}
        goal={currentGoal}
        progressData={progressData}
        milestones={currentMilestones || []}
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
        onGoalUpdate={updateGoal}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Goal"
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faTrash} className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete "{currentGoal.title}"?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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

