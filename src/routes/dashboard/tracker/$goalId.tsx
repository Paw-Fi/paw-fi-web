import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faEdit, 
  faTrash, 
  faPause, 
  faPlay,
  faFlag,
  faCalendarAlt,
  faDollarSign,
  faEllipsisV,
  faChevronDown,
  faChevronUp,
  faHome,
  faExclamationTriangle,
  faCheckCircle,
  faLightbulb,
  faUpLong,
  faCalendar,
  faBullseye,
  faClock,
  faRocket,
  faBrain,
  faChartLine,
  faFire,
  faArrowUp,
  faMinus,
  faCopy,
  faPrint
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/goal-tracker/use-goal";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressUpdater } from "@/components/goal-tracker/goal-detail/ProgressUpdater";
import { MilestonesList } from "@/components/goal-tracker/goal-detail/MilestonesList";
import { GoalMetrics } from "@/components/goal-tracker/goal-detail/GoalMetrics";
import { AdjustTimelineModal } from "@/components/goal-tracker/goal-detail/AdjustTimelineModal";
import { useState, useEffect, useRef, useOptimistic } from "react";

export const Route = createFileRoute("/dashboard/tracker/$goalId")({
  component: GoalDetail,
  head: ({ params }) => ({
    meta: [
      { title: 'Goal Details | Moneko' },
      { 
        name: 'description', 
        content: 'View and manage your financial goal progress, milestones, and AI-powered insights.' 
      },
    ],
  }),
});

function GoalDetail() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showSolutionsModal, setShowSolutionsModal] = useState(false);
  const [isAdjustTimelineModalOpen, setAdjustTimelineModalOpen] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showAllInsightsModal, setShowAllInsightsModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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

  // Optimistic state for goal updates
  const [optimisticGoal, setOptimisticGoal] = useOptimistic(
    goal,
    (state, newGoal) => ({ ...state, ...newGoal })
  );

  // Optimistic state for milestones
  const [optimisticMilestones, setOptimisticMilestones] = useOptimistic(
    milestones,
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

  // Optimistic state for insights
  const [optimisticInsights, setOptimisticInsights] = useOptimistic(
    insights,
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

  // Use optimistic data or fallback to real data
  const currentGoal = optimisticGoal || goal;
  const currentMilestones = optimisticMilestones || milestones;
  const currentInsights = optimisticInsights || insights;

  if (isLoading) {
    return <GoalDetailSkeleton />;
  }

  if (error || !currentGoal) {
    return <GoalNotFound onBack={() => navigate({ to: '/dashboard/tracker' })} />;
  }

  const handleDeleteGoal = async () => {
    // Optimistically mark goal as deleted (we'll navigate away)
    setOptimisticGoal({ ...currentGoal, status: 'deleted' });
    
    try {
      await deleteGoal();
      navigate({ to: '/dashboard/tracker' });
    } catch (error) {
      console.error('Failed to delete goal:', error);
      // Revert optimistic update by refetching
      refetch();
      // Show error toast to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete goal';
      console.error('Delete failed:', errorMessage);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = currentGoal.status === 'active' ? 'paused' : 'active';
    
    // Optimistically update the UI
    setOptimisticGoal({ status: newStatus });
    
    try {
      await updateGoal({ status: newStatus });
    } catch (error) {
      console.error('Failed to toggle status:', error);
      // Revert optimistic update by refetching
      refetch();
      const errorMessage = error instanceof Error ? error.message : 'Failed to update goal status';
      console.error('Status toggle failed:', errorMessage);
    }
  };

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
  
  // Categorize insights by priority and type
  const criticalInsights = (currentInsights || []).filter(insight => insight.priority === 'high');
  const actionableInsights = (currentInsights || []).filter(insight => insight.insight_type === 'savings' || insight.insight_type === 'timeline');
  
  // Get next milestone
  const nextMilestone = (currentMilestones || []).find(m => m.status === 'pending');
  const completedMilestones = (currentMilestones || []).filter(m => m.status === 'completed').length;
  
  // Determine user's stage
  const getProgressStage = () => {
    if (progressData.progressPercentage < 10) return 'getting-started';
    if (progressData.progressPercentage < 50) return 'building-momentum';
    if (progressData.progressPercentage < 80) return 'final-push';
    return 'almost-there';
  };
  
  const progressStage = getProgressStage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/10">
      {/* Floating Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="top-4 z-40 mx-4 md:mx-6 mb-6"
      >
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-800/20 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard/tracker'}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
              <span className="font-medium">Goals</span>
            </Button>

            <div className="flex items-center gap-2">
              {!isOnTrack && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                  <span>Needs attention</span>
                </div>
              )}
              
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  size="sm"
                  className="px-3 py-2 border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <FontAwesomeIcon icon={faEllipsisV} className="w-4 h-4" />
                </Button>
                
                {showActionsMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        handleToggleStatus();
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                    >
                      <FontAwesomeIcon 
                        icon={currentGoal.status === 'active' ? faPause : faPlay} 
                        className="w-4 h-4 mr-3" 
                      />
                      {currentGoal.status === 'active' ? 'Pause Goal' : 'Resume Goal'}
                    </button>
                    
                    <button
                      onClick={() => {
                        window.location.href = `/dashboard/tracker/${goalId}/edit`;
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                    >
                      <FontAwesomeIcon icon={faEdit} className="w-4 h-4 mr-3" />
                      Edit Goal
                    </button>

                    <div className="border-t border-gray-200 dark:border-gray-700" />
                    
                    <button
                      onClick={() => {
                        setShowDeleteModal(true);
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-4 h-4 mr-3" />
                      Delete Goal
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Smart Hero Section */}
      <div className="px-4 md:px-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative overflow-hidden bg-gradient-to-r from-white via-white to-blue-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-blue-900/20 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-black/5 dark:shadow-black/20"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.15),transparent_50%)]" />
          
          <div className="relative p-6 md:p-8">
            {/* Goal Type & Status */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                <FontAwesomeIcon icon={faHome} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {currentGoal.goal_type.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    currentGoal.status === 'active' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      currentGoal.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    {currentGoal.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                  {isOnTrack ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                      <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                      On Track
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                      Behind Target
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Goal Title & Description */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                {currentGoal.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed max-w-3xl">
                {currentGoal.description}
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${progressData.currentAmount.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faBullseye} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Target</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${progressData.targetAmount.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Timeline</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(progressData.daysLeft / 365)}y {Math.floor((progressData.daysLeft % 365) / 30)}m
                </p>
              </div>
              
              <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faUpLong} className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {progressData.progressPercentage.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progress to Goal
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ${(progressData.targetAmount - progressData.currentAmount).toLocaleString()} remaining
                </span>
              </div>
              <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.progressPercentage}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Primary Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Critical Insights Alert */}
            {!isOnTrack && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 dark:from-amber-900/20 dark:via-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-500/30 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-2xl">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                      Monthly Savings Gap Detected
                    </h3>
                    <p className="text-amber-800 dark:text-amber-200 mb-4 leading-relaxed">
                      You need <strong>${progressData.requiredMonthly}/month</strong> to reach your goal, but your current capacity is <strong>${progressData.monthlyCapacity}/month</strong>. 
                      That's a <strong>${savingsGap}/month shortfall</strong>.
                    </p>
                    <div className="flex items-center gap-3">
                      <motion.button
                        onClick={() => setShowSolutionsModal(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
                      >
                        <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4 mr-2" />
                        View Solutions
                      </motion.button>
                      <button onClick={() => setAdjustTimelineModalOpen(true)} className="text-sm text-amber-700 dark:text-amber-300 hover:underline">
                        Adjust timeline instead
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Next Action Card */}
            {nextMilestone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl">
                        <FontAwesomeIcon 
                          icon={nextMilestone.milestone_type === 'action' ? faRocket : 
                                nextMilestone.milestone_type === 'habit' ? faClock : faBullseye} 
                          className="w-5 h-5 text-blue-600 dark:text-blue-400" 
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                          Next {nextMilestone.milestone_type}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                          {nextMilestone.title}
                        </h3>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      nextMilestone.priority === 'critical' 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : nextMilestone.priority === 'high'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {nextMilestone.priority} priority
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {nextMilestone.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
                        Due {new Date(nextMilestone.due_date).toLocaleDateString()}
                      </span>
                      {nextMilestone.target_amount && (
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3" />
                          ${nextMilestone.target_amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Start Now
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Progress Update Interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <ProgressUpdater 
                goal={currentGoal} 
                onUpdate={refetch} 
                onOptimisticUpdate={setOptimisticGoal}
              />
            </motion.div>

            {/* Smart Milestones Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl">
                      <FontAwesomeIcon icon={faBullseye} className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Your Roadmap
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {completedMilestones} of {currentMilestones?.length || 0} completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {currentMilestones?.length ? Math.round((completedMilestones / currentMilestones.length) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
                  </div>
                </div>
                
                {/* Milestone Progress Bar */}
                <div className="mb-6">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${currentMilestones?.length ? (completedMilestones / currentMilestones.length) * 100 : 0}%` }}
                      transition={{ duration: 1.2, delay: 0.8 }}
                    />
                  </div>
                </div>
              </div>
              
              <MilestonesList 
                milestones={currentMilestones || []}
                goalId={goalId}
                onMilestoneUpdate={refetch}
                onOptimisticUpdate={setOptimisticMilestones}
              />
            </motion.div>

            {/* Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <GoalMetrics goal={currentGoal} milestones={currentMilestones || []} />
            </motion.div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Strategy Card */}
            {currentGoal.ai_generated_strategy && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-900/20 dark:via-gray-800 dark:to-purple-900/20 rounded-2xl border border-indigo-200/50 dark:border-indigo-500/30 shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-2xl">
                      <FontAwesomeIcon icon={faBrain} className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        AI Strategy
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Personalized recommendations
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white/50 dark:bg-gray-700/30 rounded-xl mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {currentGoal.ai_generated_strategy.split('.')[0]}.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setShowStrategyModal(true)}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
                  >
                    View Full Strategy
                  </button>
                </div>
              </motion.div>
            )}

            {/* Smart Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl">
                    <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Key Insights
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {criticalInsights.length} priority items
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {criticalInsights.slice(0, 2).map((insight, index) => (
                    <div key={insight.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          insight.insight_type === 'savings' ? 'bg-red-500' :
                          insight.insight_type === 'timeline' ? 'bg-amber-500' :
                          insight.insight_type === 'strategy' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                            {insight.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {insight.content.substring(0, 120)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setShowAllInsightsModal(true)}
                  className="w-full mt-4 px-4 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium rounded-xl transition-colors"
                >
                  View All Insights ({(currentInsights || []).length})
                </button>
              </div>
            </motion.div>
            
            {/* Quick Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              <div 
                className="flex items-center justify-between p-6 cursor-pointer"
                onClick={() => setShowTips(!showTips)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl">
                    <FontAwesomeIcon icon={faFire} className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Pro Tips
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Expert advice for success
                    </p>
                  </div>
                </div>
                <FontAwesomeIcon 
                  icon={showTips ? faChevronUp : faChevronDown} 
                  className="w-4 h-4 text-gray-500 dark:text-gray-400"
                />
              </div>
              
              {showTips && (
                <div className="px-6 pb-6 space-y-3">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">💵</span>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                        Automate Everything
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Set up automatic transfers on payday. Consistency beats perfection.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🎯</span>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                        Visual Motivation
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Keep photos of your dream home visible. Emotional connection drives success.
                    </p>
                  </div>
                  
                  {currentGoal.progress_percentage < 25 && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🚀</span>
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                          Start Small, Think Big
                        </h4>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        Focus on building the savings habit first. The amounts will grow naturally.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Goal"
      >
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete "<strong>{currentGoal.title}</strong>"? 
            This action cannot be undone and will permanently remove all associated milestones and progress data.
          </p>
          
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
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

      {/* Solutions Modal */}
            <SolutionsModal 
        isOpen={showSolutionsModal}
        onClose={() => setShowSolutionsModal(false)}
        savingsGap={savingsGap}
        goal={currentGoal}
        progressData={progressData}
        onAdjustTimeline={() => setAdjustTimelineModalOpen(true)}
      />

      {/* Adjust Timeline Modal */}
      <AdjustTimelineModal 
        isOpen={isAdjustTimelineModalOpen}
        onClose={() => setAdjustTimelineModalOpen(false)}
        goal={currentGoal}
        onOptimisticUpdate={setOptimisticGoal}
      />

      {/* Strategy Modal */}
      <StrategyModal 
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
        goal={currentGoal}
      />

      {/* All Insights Modal */}
      <AllInsightsModal 
        isOpen={showAllInsightsModal}
        onClose={() => setShowAllInsightsModal(false)}
        insights={currentInsights || []}
        onOptimisticUpdate={setOptimisticInsights}
        goal={currentGoal}
        onInsightUpdate={refetch}
      />
    </div>
  );
}

function GoalDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
        </div>
      </div>

      {/* Goal Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"></div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"></div>
          <div className="h-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"></div>
        </div>
      </div>
    </div>
  );
}

function GoalNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6">
            <FontAwesomeIcon icon={faFlag} className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground dark:text-dark-foreground mb-4">
            Goal Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The goal you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={onBack} variant="outline">
            Back to Goals
          </Button>
        </div>
      </div>
    </div>
  );
}

function SolutionsModal({ 
  isOpen, 
  onClose, 
  savingsGap, 
  goal, 
  progressData,
  onAdjustTimeline
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  savingsGap: number;
  goal: any;
  progressData: any;
  onAdjustTimeline: () => void;
}) {
  const solutions = [
    {
      id: 'increase-income',
      title: 'Increase Your Income',
      icon: faArrowUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30',
      strategies: [
        `Ask for a raise of $${Math.ceil(savingsGap * 1.3)}/month (accounting for taxes)`,
        'Start a side hustle or freelance work',
        'Sell unused items or rent out assets',
        'Pick up extra hours or overtime shifts'
      ],
      impact: 'High',
      difficulty: 'Medium'
    },
    {
      id: 'reduce-expenses',
      title: 'Cut Monthly Expenses',
      icon: faMinus,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
      strategies: [
        `Review subscriptions and cancel $${Math.ceil(savingsGap * 0.3)}/month worth`,
        'Cook more meals at home instead of eating out',
        'Switch to cheaper phone/internet plans',
        'Reduce entertainment and shopping expenses'
      ],
      impact: 'Medium',
      difficulty: 'Low'
    },
    {
      id: 'optimize-timeline',
      title: 'Adjust Your Timeline',
      icon: faCalendarAlt,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-500/30',
      strategies: [
        `Extend target date by ${Math.ceil(savingsGap / progressData.monthlyCapacity * 12)} months`,
        'Break goal into smaller milestones',
        'Start with a lower target amount first',
        'Consider a phased approach to reaching your goal'
      ],
      impact: 'High',
      difficulty: 'Very Low'
    },
    {
      id: 'investment-boost',
      title: 'Investment Strategy',
      icon: faChartLine,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-500/30',
      strategies: [
        'Invest existing savings for higher returns',
        'Use dollar-cost averaging for consistent growth',
        'Consider low-cost index funds or ETFs',
        'Automate investments to reduce required manual savings'
      ],
      impact: 'Medium',
      difficulty: 'Medium'
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Very Low': return 'text-green-600 bg-green-100';
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-emerald-600 bg-emerald-100';
      case 'Medium': return 'text-blue-600 bg-blue-100';
      case 'Low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Savings Gap Solutions"
      size="large"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Monthly Shortfall: ${savingsGap.toLocaleString()}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You need ${progressData.requiredMonthly}/month but can currently save ${progressData.monthlyCapacity}/month. 
                Here are proven strategies to close this gap:
              </p>
            </div>
          </div>
        </div>

        {/* Solutions Grid */}
        <div className="space-y-6">
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 bg-white dark:bg-gray-700/50 rounded-xl border-2 ${solution.borderColor}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${solution.bgColor} rounded-xl flex items-center justify-center`}>
                    <FontAwesomeIcon icon={solution.icon} className={`w-6 h-6 ${solution.color}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {solution.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(solution.impact)}`}>
                        {solution.impact} Impact
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(solution.difficulty)}`}>
                        {solution.difficulty} Difficulty
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {solution.strategies.map((strategy, strategyIndex) => (
                  <div
                    key={strategyIndex}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {strategyIndex + 1}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {strategy}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="sm:order-1"
            >
              Close
            </Button>
            <Button
              onClick={onAdjustTimeline}
              className="bg-amber-600 hover:bg-amber-700 text-white sm:order-2"
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 mr-2" />
              Adjust Timeline
            </Button>            
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface StrategySection {
  title: string;
  content: string[];
}

function StrategyModal({ 
  isOpen, 
  onClose, 
  goal 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: any;
}) {
  if (!goal?.ai_generated_strategy) {
    return null;
  }

  // Parse the AI strategy into structured sections
  const parseStrategy = (strategy: string): StrategySection[] => {
    const paragraphs = strategy.split('\n\n').filter(p => p.trim());
    const sections: StrategySection[] = [];
    let currentSection: StrategySection | null = null;
    
    for (const paragraph of paragraphs) {
      const lines = paragraph.split('\n').filter(l => l.trim());
      
      // Check if this looks like a section header
      if (lines.length === 1 && (
        lines[0].includes(':') ||
        lines[0].match(/^\d+\./) ||
        lines[0].toLowerCase().includes('strategy') ||
        lines[0].toLowerCase().includes('step') ||
        lines[0].toLowerCase().includes('phase')
      )) {
        // Start new section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: lines[0].replace(/^\d+\.\s*/, '').replace(/:$/, ''),
          content: []
        };
      } else {
        // Add to current section or create general section
        if (!currentSection) {
          currentSection = {
            title: 'Overview',
            content: []
          };
        }
        currentSection.content.push(paragraph);
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{
      title: 'AI Strategy',
      content: [strategy]
    }];
  };

  const strategySections = parseStrategy(goal.ai_generated_strategy);
  const wordCount = goal.ai_generated_strategy.split(' ').length;
  const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete AI Strategy"
      size="large"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faBrain} className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                AI-Generated Strategy for "{goal.title}"
              </h3>
              <div className="flex items-center gap-4 text-sm text-indigo-800 dark:text-indigo-200">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{readingTime} min read</span>
                <span>•</span>
                <span>Target: ${goal.target_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Content */}
        <div className="space-y-6">
          {strategySections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h3>
              </div>
              
              <div className="space-y-4">
                {section.content.map((paragraph, pIndex) => (
                  <div key={pIndex} className="prose prose-gray dark:prose-invert max-w-none">
                    {paragraph.split('\n').map((line, lIndex) => {
                      // Check if line is a bullet point or numbered item
                      if (line.trim().match(/^[-•*]\s/) || line.trim().match(/^\d+\./)) {
                        return (
                          <div key={lIndex} className="flex items-start gap-3 mb-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')}
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <p key={lIndex} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3 last:mb-0">
                            {line}
                          </p>
                        );
                      }
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Key Metrics Summary */}
        {goal.target_amount && (
          <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-indigo-50/50 dark:from-gray-700/50 dark:to-indigo-900/20 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Goal Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  ${goal.target_amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Target Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${goal.current_amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Current Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {goal.progress_percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Complete</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="sm:order-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Copy strategy to clipboard
                navigator.clipboard.writeText(goal.ai_generated_strategy);
                // Could show a toast here
                onClose();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white sm:order-2"
            >
              <FontAwesomeIcon icon={faCopy} className="w-4 h-4 mr-2" />
              Copy Strategy
            </Button>
            <Button
              onClick={() => {
                // TODO: Implement print functionality
                window.print();
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white sm:order-3"
            >
              <FontAwesomeIcon icon={faPrint} className="w-4 h-4 mr-2" />
              Print Strategy
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AllInsightsModal({ 
  isOpen, 
  onClose, 
  insights,
  goal,
  onInsightUpdate,
  onOptimisticUpdate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  insights: any[];
  goal: any;
  onInsightUpdate: () => void;
  onOptimisticUpdate?: (action: { type: string; insightId?: string; insight?: any; updates?: any }) => void;
}) {
  const { user } = useAuth();
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'type'>('priority');
  const [error, setError] = useState<string | null>(null);

  const insightTypeConfigs: Record<string, any> = {
    recommendation: {
      icon: faLightbulb,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
      label: 'Recommendation'
    },
    warning: {
      icon: faExclamationTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-500/30',
      label: 'Warning'
    },
    opportunity: {
      icon: faBullseye,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30',
      label: 'Opportunity'
    },
    milestone: {
      icon: faFlag,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-500/30',
      label: 'Milestone'
    },
    performance: {
      icon: faChartLine,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-500/30',
      label: 'Performance'
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'High Priority',
          order: 3
        };
      case 'medium':
        return {
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'Medium Priority',
          order: 2
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700/30',
          label: 'Low Priority',
          order: 1
        };
    }
  };

  const getTimeSinceCreated = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const filteredAndSortedInsights = insights
    .filter(insight => !dismissedInsights.has(insight.id))
    .filter(insight => selectedFilter === 'all' || insight.insight_type === selectedFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getPriorityConfig(b.priority).order - getPriorityConfig(a.priority).order;
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'type':
          return a.insight_type.localeCompare(b.insight_type);
        default:
          return 0;
      }
    });

  const toggleInsightExpansion = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const dismissInsight = async (insightId: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    // Apply optimistic update immediately
    setDismissedInsights(prev => new Set([...prev, insightId]));
    if (onOptimisticUpdate) {
      onOptimisticUpdate({ type: 'dismiss', insightId });
    }

    try {
      // Import supabase from the lib
      const { supabase } = await import('@/lib/supabase');
      
      // Mark insight as dismissed in the database
      const { error: updateError } = await supabase
        .from('goal_insights')
        .update({ 
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', insightId)
        .eq('goal_id', goal.id);

      if (updateError) throw updateError;

      onInsightUpdate();
    } catch (error) {
      // Revert optimistic update on error
      setDismissedInsights(prev => {
        const newSet = new Set(prev);
        newSet.delete(insightId);
        return newSet;
      });
      onInsightUpdate(); // This will refetch and revert parent optimistic state
      console.error('Failed to dismiss insight:', error);
      setError(error instanceof Error ? error.message : 'Failed to dismiss insight');
    }
  };

  const generateNewInsights = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsGeneratingNew(true);
    setError(null);

    try {
      // Import supabase from the lib
      const { supabase } = await import('@/lib/supabase');
      
      // Call the goal-insights-generator function
      const { data, error } = await supabase.functions.invoke('goal-insights-generator', {
        body: {
          goalId: goal.id,
          userId: user.id
        }
      });

      if (error) throw error;

      // Note: New insights generation doesn't need optimistic updates
      // since we're creating new data, not modifying existing data
      onInsightUpdate();
    } catch (error) {
      console.error('Failed to generate new insights:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate insights');
    } finally {
      setIsGeneratingNew(false);
    }
  };

  const handleInsightAction = async (insightId: string, action: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      // Import supabase from the lib
      const { supabase } = await import('@/lib/supabase');
      
      switch (action) {
        case 'helpful':
          // Apply optimistic update immediately
          if (onOptimisticUpdate) {
            onOptimisticUpdate({ 
              type: 'update', 
              insightId, 
              updates: { user_feedback: 'helpful' } 
            });
          }

          await supabase
            .from('goal_insights')
            .update({ user_feedback: 'helpful' })
            .eq('id', insightId)
            .eq('goal_id', goal.id);
          break;
          
        case 'dismiss':
          await dismissInsight(insightId);
          return; // dismissInsight handles its own optimistic updates
          
        case 'implement':
          // Apply optimistic update immediately
          if (onOptimisticUpdate) {
            onOptimisticUpdate({ 
              type: 'update', 
              insightId, 
              updates: { 
                user_feedback: 'implemented',
                implemented_at: new Date().toISOString()
              } 
            });
          }

          // Track that user wants to implement this insight
          await supabase
            .from('goal_insights')
            .update({ 
              user_feedback: 'implemented',
              implemented_at: new Date().toISOString()
            })
            .eq('id', insightId)
            .eq('goal_id', goal.id);
          break;
      }
      onInsightUpdate();
    } catch (error) {
      // Revert optimistic update on error by refetching
      onInsightUpdate();
      console.error('Failed to handle insight action:', error);
      setError(error instanceof Error ? error.message : 'Failed to process action');
    }
  };

  const getInsightActions = (insight: any) => {
    const actions = [];
    
    if (insight.actionable) {
      actions.push({
        id: 'implement',
        label: 'Implement',
        type: 'primary',
        icon: faCheckCircle
      });
    }
    
    actions.push(
      {
        id: 'helpful',
        label: 'Helpful',
        type: 'secondary',
        icon: faUpLong
      },
      {
        id: 'dismiss',
        label: 'Dismiss',
        type: 'danger',
        icon: faTrash
      }
    );
    
    return actions;
  };

  const insightTypes = ['all', ...new Set(insights.map(i => i.insight_type))];
  const highPriorityCount = insights.filter(i => i.priority === 'high' && !dismissedInsights.has(i.id)).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      width="xwide"
    >
      <div className="p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-pink-500/20 to-pink-600/10 dark:from-pink-400/30 dark:to-pink-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-pink-500/20 dark:border-pink-400/30">
              <FontAwesomeIcon
                icon={faLightbulb}
                className="w-7 h-7 text-pink-600 dark:text-pink-400"
              />
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  All AI Insights
                </h1>
                {highPriorityCount > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                    {highPriorityCount} urgent
                  </div>
                )}
                {insights.filter(i => i.is_ai_generated).length > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
                    AI Powered
                  </div>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive view of all insights for "{goal.title}"
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <motion.button
            onClick={generateNewInsights}
            disabled={isGeneratingNew}
            whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
            whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
            className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 transition-colors"
          >
            {isGeneratingNew ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
              </motion.div>
            ) : (
              <FontAwesomeIcon icon={faRocket} className="w-4 h-4" />
            )}
            <span>{isGeneratingNew ? 'Generating...' : 'Generate New'}</span>
          </motion.button>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter:</span>
            <div className="flex gap-2">
              {insightTypes.map((type) => (
                <motion.button
                  key={type}
                  onClick={() => setSelectedFilter(type)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                    selectedFilter === type
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {type}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            >
              <option value="priority">Priority</option>
              <option value="date">Date</option>
              <option value="type">Type</option>
            </select>
          </div>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{filteredAndSortedInsights.length} insights shown</span>
            <span>•</span>
            <span>{insights.length} total</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 mb-6"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
            <span className="font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Insights List */}
        {filteredAndSortedInsights.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <FontAwesomeIcon icon={faLightbulb} className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Insights Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Generate AI insights to get personalized recommendations for your goal.
            </p>
            <motion.button
              onClick={generateNewInsights}
              disabled={isGeneratingNew}
              whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
              whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
              className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 transition-colors"
            >
              <FontAwesomeIcon icon={faRocket} className="w-4 h-4" />
              Generate First Insights
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedInsights.map((insight, index) => {
              const typeConfig = insightTypeConfigs[insight.insight_type] || insightTypeConfigs.recommendation;
              const priorityConfig = getPriorityConfig(insight.priority);
              const isExpanded = expandedInsights.has(insight.id);
              const actions = getInsightActions(insight);

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white dark:bg-gray-700/50 rounded-xl border-2 ${typeConfig.borderColor} hover:shadow-lg transition-all group`}
                >
                  {/* Insight Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`flex-shrink-0 w-12 h-12 ${typeConfig.bgColor} rounded-xl flex items-center justify-center`}>
                          <FontAwesomeIcon icon={typeConfig.icon} className={`w-6 h-6 ${typeConfig.color}`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {insight.title}
                            </h3>
                            
                            <div className={`px-2 py-1 ${priorityConfig.bgColor} ${priorityConfig.color} rounded-full text-xs font-medium`}>
                              {priorityConfig.label}
                            </div>
                            
                            <div className={`px-2 py-1 ${typeConfig.bgColor} ${typeConfig.color} rounded-full text-xs font-medium`}>
                              {typeConfig.label}
                            </div>

                            {insight.is_ai_generated && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
                                AI
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                              {getTimeSinceCreated(insight.created_at)}
                            </div>
                            
                            {insight.ai_confidence_score && (
                              <div className="flex items-center gap-1">
                                <FontAwesomeIcon icon={faBullseye} className="w-3 h-3" />
                                {Math.round(insight.ai_confidence_score * 100)}% confidence
                              </div>
                            )}
                            
                            {insight.actionable && (
                              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                                Actionable
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <motion.button
                        onClick={() => toggleInsightExpansion(insight.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </motion.button>
                    </div>

                    {/* Content Preview */}
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {isExpanded ? insight.content : `${insight.content.substring(0, 200)}${insight.content.length > 200 ? '...' : ''}`}
                    </p>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600"
                      >
                        {insight.ai_confidence_score && (
                          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                AI Confidence Score
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {Math.round(insight.ai_confidence_score * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <motion.div
                                className="h-2 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${insight.ai_confidence_score * 100}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          {actions.map((action) => (
                            <motion.button
                              key={action.id}
                              onClick={() => handleInsightAction(insight.id, action.id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                                action.type === 'primary'
                                  ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                  : action.type === 'danger'
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <FontAwesomeIcon icon={action.icon} className="w-3 h-3" />
                              {action.label}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}