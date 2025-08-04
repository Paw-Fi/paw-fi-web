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
  faCalculator
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
import { ActivityList } from "@/components/shared/ActivityList";
import { useUserActivities } from "@/hooks/useUserActivities";

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
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'calculator' | 'activity'>('overview');
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

  // Get user activities for the activity timeline
  const { activities, isLoading: activitiesLoading } = useUserActivities();

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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Header */}
        <div className="mb-16">
          {/* Header with Actions */}
          <div className="flex items-start justify-between mb-12">
            <div className="flex-1">
              {/* Title - Inline Editing */}
              <div className="mb-6">
                {isEditingTitle ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-4xl font-bold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 flex-1 pb-2"
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
                    className="text-4xl font-bold text-gray-900 dark:text-white leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
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
                      className="bg-transparent border-b-2 border-blue-500 text-gray-600 dark:text-gray-400 focus:outline-none focus:border-blue-600 flex-1 pb-2 resize-none text-lg"
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
                    className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group text-lg"
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
            
            <div className="relative ml-8 flex items-center gap-3">
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
                      className="p-3 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 transition-all duration-200 disabled:opacity-50"
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
                      className="p-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all duration-200 disabled:opacity-50"
                      title="Cancel editing"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={() => setShowGoalMenu(!showGoalMenu)}
                className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group"
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
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Current Saving</div>
                <AnimatedNumber 
                  value={progressData.currentAmount} 
                  prefix="$" 
                  className="text-5xl font-bold text-gray-900 dark:text-white"
                  isAnimated={numbersAnimated}
                />
                <div className="text-lg text-gray-500 dark:text-gray-400 mt-2">
                  ${(progressData.targetAmount - progressData.currentAmount).toLocaleString()} to go
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowUpdateProgressModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Update Progress
                </button>
                
                <button 
                  onClick={() => setShowTrackerModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Tracker
                </button>
              </div>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="relative">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.progressPercentage}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-white/20" />
                </motion.div>
              </div>
              <div className="flex justify-between mt-3 text-sm text-gray-500 dark:text-gray-400">
                <span>$0</span>
                <span className="font-medium text-gray-900 dark:text-white">${progressData.targetAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Tabbed Interface */}
        <div className="mb-16">
          {/* Tab Navigation */}
          <div className="mb-12">
            <nav className="flex gap-1" aria-label="Goal sections">
              {[
                { id: 'overview', label: 'Overview', icon: faChartLine },
                { id: 'milestones', label: 'Milestones', icon: faFlag },
                { id: 'calculator', label: 'Calculator', icon: faCalculator },
                { id: 'activity', label: 'Activity', icon: faClock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
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
          <div>
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
                  {/* Key Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faCalendar} className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Retirement Age</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          <AnimatedNumber value={55} isAnimated={numbersAnimated} />
                        </div>
                      </div>
                      
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faBullseye} className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Target</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          <AnimatedNumber value={progressData.targetAmount} prefix="$" isAnimated={numbersAnimated} />
                        </div>
                      </div>
                      
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faClock} className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Timeline</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          {Math.floor(progressData.daysLeft / 365)}y {Math.floor((progressData.daysLeft % 365) / 30)}m
                        </div>
                      </div>
                      
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Progress</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          <AnimatedNumber value={progressData.progressPercentage} suffix="%" isAnimated={numbersAnimated} />
                        </div>
                      </div>
                    </div>
                  {/* AI Insights Section - "What Moneko thinks" */}
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
              
              {activeTab === 'calculator' && (
                <motion.div
                  key="calculator"
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
                    
                    <ActivityList 
                      activities={activities || []} 
                      isLoading={activitiesLoading} 
                      goalId={goalId} 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      {/* Next Steps - Now outside of tabs as requested in original design */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <FontAwesomeIcon icon={faRocket} className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Next Step:</h2>
        </div>
        <div className="space-y-3">
          {/* Increase Income */}
          <div className="py-6 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <button 
              onClick={() => toggleStepExpansion('increase-income')}
              className="w-full text-left flex items-center justify-between group hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">📈</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">Increase Your Income</h4>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Ask for a raise of ${Math.ceil(savingsGap * 1.3)}/month (accounting for taxes)
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('increase-income') ? faChevronUp : faChevronDown} 
                className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('increase-income') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 pl-16 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 ml-12">
                    <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-1 text-xs">●</span>
                        Ask for a raise of ${Math.ceil(savingsGap * 1.3)}/month (accounting for taxes)
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-1 text-xs">●</span>
                        Start a side hustle or freelance work
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-1 text-xs">●</span>
                        Sell unused items or rent out assets
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-1 text-xs">●</span>
                        Pick up extra hours or overtime shifts
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Cut Expenses */}
          <div className="py-6 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <button 
              onClick={() => toggleStepExpansion('cut-expenses')}
              className="w-full text-left flex items-center justify-between group hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">💰</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">Cut Monthly Expense</h4>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Review subscriptions and cancel ${Math.ceil(Math.abs(savingsGap) * 0.3)}/month worth
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('cut-expenses') ? faChevronUp : faChevronDown} 
                className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('cut-expenses') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 pl-16 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 ml-12">
                    <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-3">
                        <span className="text-blue-500 mt-1 text-xs">●</span>
                        Review subscriptions and cancel ${Math.ceil(savingsGap * 0.3)}/month worth
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-blue-500 mt-1 text-xs">●</span>
                        Cook more meals at home instead of eating out
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-blue-500 mt-1 text-xs">●</span>
                        Switch to cheaper phone/internet plans
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-blue-500 mt-1 text-xs">●</span>
                        Reduce entertainment and shopping expenses
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Adjust Timeline */}
          <div className="py-6 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <button 
              onClick={() => toggleStepExpansion('adjust-timeline')}
              className="w-full text-left flex items-center justify-between group hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">📅</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">Adjust Your Timeline</h4>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Extend target date by Infinity months
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('adjust-timeline') ? faChevronUp : faChevronDown} 
                className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('adjust-timeline') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 pl-16 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 ml-12">
                    <ul className="space-y-3 text-gray-700 dark:text-gray-300 mb-6">
                      <li className="flex items-start gap-3">
                        <span className="text-purple-500 mt-1 text-xs">●</span>
                        Extend target date by Infinity months
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-purple-500 mt-1 text-xs">●</span>
                        Break goal into smaller milestones
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-purple-500 mt-1 text-xs">●</span>
                        Start with a lower target amount first
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-purple-500 mt-1 text-xs">●</span>
                        Consider a phased approach to reaching your goal
                      </li>
                    </ul>
                    <button
                      onClick={() => setShowAdjustTimelineModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
                    >
                      Adjust Timeline Now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Investment Strategy */}
          <div className="py-6 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <button 
              onClick={() => toggleStepExpansion('investment-strategy')}
              className="w-full text-left flex items-center justify-between group hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">📊</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">Investment Strategy</h4>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Invest existing savings for higher returns
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={expandedSteps.has('investment-strategy') ? faChevronUp : faChevronDown} 
                className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" 
              />
            </button>
            <AnimatePresence>
              {expandedSteps.has('investment-strategy') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 pl-16 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 ml-12">
                    <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-3">
                        <span className="text-orange-500 mt-1 text-xs">●</span>
                        Invest existing savings for higher returns
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-orange-500 mt-1 text-xs">●</span>
                        Use dollar-cost averaging for consistent growth
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-orange-500 mt-1 text-xs">●</span>
                        Consider low-cost index funds or ETFs
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-orange-500 mt-1 text-xs">●</span>
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

