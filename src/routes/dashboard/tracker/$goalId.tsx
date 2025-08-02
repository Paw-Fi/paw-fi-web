import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);
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
  faPrint,
  faInfoCircle,
  faTimes,
  faPlus,
  faMagicWandSparkles
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/goal-tracker/use-goal";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressUpdater } from "@/components/goal-tracker/goal-detail/ProgressUpdater";
import { MilestonesList } from "@/components/goal-tracker/goal-detail/MilestonesList";
import { GoalMetrics } from "@/components/goal-tracker/goal-detail/GoalMetrics";
import { AdjustTimelineModal } from "@/components/goal-tracker/goal-detail/AdjustTimelineModal";
import { GoalInsights } from "@/components/goal-tracker/goal-detail/GoalInsights";
import { useState, useEffect, useRef, useOptimistic } from "react";
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

// Animated Number Component - moved outside to prevent hooks violation
function AnimatedNumber({ value, prefix = '', suffix = '', className = '', isAnimated }: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  className?: string;
  isAnimated: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (isAnimated) {
      const duration = 1000;
      const steps = 60;
      const stepValue = value / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        setDisplayValue(Math.round(stepValue * currentStep));
        
        if (currentStep >= steps) {
          setDisplayValue(value);
          clearInterval(timer);
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, isAnimated]);
  
  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

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
  const [showEditGoalModal, setShowEditGoalModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  
  // Animation states
  const [numbersAnimated, setNumbersAnimated] = useState(false);

  
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

  // Animation effect moved above early returns

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          {/* Header with Actions */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                {currentGoal.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                {currentGoal.description || 'Working towards your financial independence goal'}
              </p>
            </div>
            
            <div className="relative ml-6">
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
                          setShowEditGoalModal(true);
                          setShowGoalMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                          <FontAwesomeIcon icon={faEdit} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium">Edit Goal</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Modify title and details</div>
                        </div>
                      </button>
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
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Savings Projection Playground</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Explore different scenarios and see how they affect your goal</p>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Playground Mode</span>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Changes here are for exploration only and won't affect your actual goal settings.
                      </p>
                    </div>
                    
                    <InteractiveProjectionChart 
                      goal={currentGoal} 
                      progressData={progressData}
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

      {/* Edit Goal Modal */}
      <EditGoalModal
        isOpen={showEditGoalModal}
        onClose={() => setShowEditGoalModal(false)}
        goal={currentGoal}
        onGoalUpdate={updateGoal}
        onOptimisticUpdate={setOptimisticGoal}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Goal"
        size="small"
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

function EditGoalModal({ 
  isOpen, 
  onClose, 
  goal,
  onGoalUpdate,
  onOptimisticUpdate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: any;
  onGoalUpdate: any;
  onOptimisticUpdate: any;
}) {
  const [formData, setFormData] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    target_amount: goal?.target_amount || 0,
    target_date: goal?.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when goal changes
  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        target_amount: goal.target_amount || 0,
        target_date: goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : ''
      });
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Optimistic update
      const optimisticUpdates = {
        ...formData,
        target_amount: Number(formData.target_amount),
        updated_at: new Date().toISOString()
      };
      
      onOptimisticUpdate(optimisticUpdates);

      // API call
      await onGoalUpdate({
        title: formData.title,
        description: formData.description,
        target_amount: Number(formData.target_amount),
        target_date: formData.target_date
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
      // Revert optimistic update by refetching
      window.location.reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Goal"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Goal Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
            placeholder="Enter goal title"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white resize-none"
            rows={3}
            placeholder="Describe your goal"
          />
        </div>

        {/* Target Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
              $
            </span>
            <input
              type="number"
              value={formData.target_amount}
              onChange={(e) => handleInputChange('target_amount', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Target Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Date
          </label>
          <input
            type="date"
            value={formData.target_date}
            onChange={(e) => handleInputChange('target_date', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
                Updating...
              </div>
            ) : (
              'Update Goal'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function GoalDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900">
      {/* Header Skeleton */}
      <div className="bg-white/95 dark:bg-gray-900/95 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats Skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="p-6">
            <div className="mb-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
            ))}
          </div>
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faFlag} className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Goal Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The goal you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={onBack} variant="outline">
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
          Back to Goals
        </Button>
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
            {/* <Button
              onClick={() => {
                // Create a comprehensive print window with goal details
                const printContent = `
                  <html>
                    <head>
                      <title>${currentGoal.title} - Financial Goal Strategy</title>
                      <style>
                        body { 
                          font-family: Arial, sans-serif; 
                          max-width: 800px; 
                          margin: 0 auto; 
                          padding: 20px; 
                          line-height: 1.6; 
                        }
                        .header { 
                          border-bottom: 2px solid #e2e8f0; 
                          padding-bottom: 20px; 
                          margin-bottom: 30px; 
                        }
                        .title { 
                          font-size: 24px; 
                          font-weight: bold; 
                          color: #1a202c; 
                          margin-bottom: 10px; 
                        }
                        .goal-type { 
                          color: #4a5568; 
                          text-transform: uppercase; 
                          font-size: 12px; 
                          letter-spacing: 1px; 
                        }
                        .section { 
                          margin-bottom: 30px; 
                        }
                        .section-title { 
                          font-size: 18px; 
                          font-weight: bold; 
                          color: #2d3748; 
                          margin-bottom: 15px; 
                          border-bottom: 1px solid #e2e8f0; 
                          padding-bottom: 5px; 
                        }
                        .metric-grid { 
                          display: grid; 
                          grid-template-columns: 1fr 1fr; 
                          gap: 20px; 
                          margin-bottom: 20px; 
                        }
                        .metric { 
                          padding: 15px; 
                          border: 1px solid #e2e8f0; 
                          border-radius: 8px; 
                        }
                        .metric-label { 
                          font-size: 12px; 
                          color: #4a5568; 
                          text-transform: uppercase; 
                          letter-spacing: 1px; 
                          margin-bottom: 5px; 
                        }
                        .metric-value { 
                          font-size: 20px; 
                          font-weight: bold; 
                          color: #1a202c; 
                        }
                        .milestone { 
                          padding: 10px; 
                          border-left: 4px solid #4299e1; 
                          margin-bottom: 10px; 
                          background-color: #f7fafc; 
                        }
                        .milestone-title { 
                          font-weight: bold; 
                          margin-bottom: 5px; 
                        }
                        .insight { 
                          padding: 15px; 
                          border-left: 4px solid #48bb78; 
                          background-color: #f0fff4; 
                          margin-bottom: 10px; 
                        }
                        .print-date { 
                          text-align: center; 
                          color: #4a5568; 
                          font-size: 12px; 
                          margin-top: 40px; 
                          border-top: 1px solid #e2e8f0; 
                          padding-top: 20px; 
                        }
                        @media print {
                          body { margin: 0; padding: 15px; }
                          .section { page-break-inside: avoid; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div class="goal-type">${currentGoal.goal_type.replace('_', ' ')}</div>
                        <div class="title">${currentGoal.title}</div>
                        <p>${currentGoal.description || 'No description provided'}</p>
                      </div>
                      
                      <div class="section">
                        <div class="section-title">Goal Overview</div>
                        <div class="metric-grid">
                          <div class="metric">
                            <div class="metric-label">Target Amount</div>
                            <div class="metric-value">$${(currentGoal.target_amount || 0).toLocaleString()}</div>
                          </div>
                          <div class="metric">
                            <div class="metric-label">Current Amount</div>
                            <div class="metric-value">$${(currentGoal.current_amount || 0).toLocaleString()}</div>
                          </div>
                          <div class="metric">
                            <div class="metric-label">Progress</div>
                            <div class="metric-value">${progressData.progressPercentage.toFixed(1)}%</div>
                          </div>
                          <div class="metric">
                            <div class="metric-label">Target Date</div>
                            <div class="metric-value">${currentGoal.target_date ? new Date(currentGoal.target_date).toLocaleDateString() : 'Not set'}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="section">
                        <div class="section-title">Financial Analysis</div>
                        <div class="metric-grid">
                          <div class="metric">
                            <div class="metric-label">Required Monthly Savings</div>
                            <div class="metric-value">$${progressData.requiredMonthly.toLocaleString()}</div>
                          </div>
                          <div class="metric">
                            <div class="metric-label">Days Remaining</div>
                            <div class="metric-value">${progressData.daysLeft > 0 ? progressData.daysLeft : 'Target date passed'}</div>
                          </div>
                          <div class="metric">
                            <div class="metric-label">Status</div>
                            <div class="metric-value">${isOnTrack ? 'On Track ✓' : 'Behind Target ⚠'}</div>
                          </div>
                          <div class="metric">
                            <div class="metric-label">Monthly Capacity</div>
                            <div class="metric-value">$${progressData.monthlyCapacity.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                      
                      ${(currentMilestones || []).length > 0 ? `
                        <div class="section">
                          <div class="section-title">Milestones</div>
                          ${(currentMilestones || []).map(milestone => `
                            <div class="milestone">
                              <div class="milestone-title">${milestone.title}</div>
                              <div>Target: $${(milestone.target_amount || 0).toLocaleString()}</div>
                              <div>Status: ${milestone.status === 'completed' ? 'Completed ✓' : 'Pending'}</div>
                              ${milestone.target_date ? `<div>Due: ${new Date(milestone.target_date).toLocaleDateString()}</div>` : ''}
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                      
                      ${(currentInsights || []).length > 0 ? `
                        <div class="section">
                          <div class="section-title">AI Insights & Recommendations</div>
                          ${(currentInsights || []).slice(0, 5).map(insight => `
                            <div class="insight">
                              <strong>${insight.insight_type.replace('_', ' ').toUpperCase()}:</strong> ${insight.insight_text}
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                      
                      <div class="print-date">
                        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                      </div>
                    </body>
                  </html>
                `;
                
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(printContent);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                  }, 250);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white sm:order-3"
            >
              <FontAwesomeIcon icon={faPrint} className="w-4 h-4 mr-2" />
              Print Strategy
            </Button> */}
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
                  All of Moneko's Insights
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
                    Moneko
                  </div>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Everything Moneko has learned about "{goal.title}"
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
            <span>{isGeneratingNew ? 'Moneko is thinking...' : 'Ask Moneko for More'}</span>
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
              Moneko Hasn't Shared Insights Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Let Moneko analyze your goal and provide personalized recommendations to help you succeed.
            </p>
            <motion.button
              onClick={generateNewInsights}
              disabled={isGeneratingNew}
              whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
              whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
              className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 transition-colors"
            >
              <FontAwesomeIcon icon={faRocket} className="w-4 h-4" />
              Get Moneko's First Insights
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
                                Moneko
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
                                Moneko's Confidence
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

// Interactive Projection Chart Component
function InteractiveProjectionChart({ goal, progressData }: { goal: any; progressData: any }) {
  const [monthlyContribution, setMonthlyContribution] = useState(progressData.monthlyCapacity || 0);
  const [showProjection, setShowProjection] = useState(true);

  // Calculate projection data based on current monthly contribution
  const calculateProjection = (monthly: number) => {
    const currentAmount = goal.current_amount || 0;
    const targetAmount = goal.target_amount || 0;
    const targetDate = new Date(goal.target_date);
    const currentDate = new Date();
    const monthsToTarget = Math.max(1, Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    
    const labels = [];
    const projectedData = [];
    const targetLine = [];
    
    // Generate monthly projections
    for (let i = 0; i <= monthsToTarget; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      
      const projectedAmount = currentAmount + (monthly * i);
      projectedData.push(Math.min(projectedAmount, targetAmount));
      targetLine.push(targetAmount);
    }
    
    return { labels, projectedData, targetLine, monthsToTarget };
  };

  const { labels, projectedData, targetLine, monthsToTarget } = calculateProjection(monthlyContribution);
  
  // Calculate completion date and gap
  const projectedCompletion = monthlyContribution > 0 
    ? Math.ceil((goal.target_amount - goal.current_amount) / monthlyContribution)
    : monthsToTarget;
  
  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + projectedCompletion);
  
  const isOnTrack = projectedCompletion <= monthsToTarget;
  const monthlyGap = Math.ceil((goal.target_amount - goal.current_amount) / monthsToTarget) - monthlyContribution;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Projected Savings',
        data: projectedData,
        borderColor: isOnTrack ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: isOnTrack ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: isOnTrack ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Target Amount',
        data: targetLine,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: $${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
            Savings Projection Playground
          </h3>
        </div>
        <button
          onClick={() => setShowProjection(!showProjection)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <FontAwesomeIcon icon={showProjection ? faChevronUp : faChevronDown} className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showProjection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Slider Control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Monthly Contribution
                </label>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  ${monthlyContribution.toLocaleString()}
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={Math.max(5000, progressData.monthlyCapacity * 2)}
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>$0</span>
                  <span className="text-blue-600 dark:text-blue-400">Current: ${progressData.monthlyCapacity}</span>
                  <span>${Math.max(5000, progressData.monthlyCapacity * 2).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Projection Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${
                isOnTrack 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon 
                    icon={isOnTrack ? faCheckCircle : faExclamationTriangle} 
                    className={`w-4 h-4 ${
                      isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`} 
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Completion Date
                  </span>
                </div>
                <div className={`text-lg font-bold ${
                  isOnTrack ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                }`}>
                  {completionDate.toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {projectedCompletion} months
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Monthly Gap
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {monthlyGap > 0 ? `+$${monthlyGap}` : monthlyGap < 0 ? `-$${Math.abs(monthlyGap)}` : '$0'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {monthlyGap > 0 ? 'Need more' : monthlyGap < 0 ? 'Ahead of schedule' : 'On track'}
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Time Difference
                  </span>
                </div>
                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {projectedCompletion - monthsToTarget > 0 
                    ? `+${projectedCompletion - monthsToTarget}` 
                    : projectedCompletion - monthsToTarget < 0 
                    ? `${projectedCompletion - monthsToTarget}` 
                    : '0'} months
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  vs. target timeline
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* Disclaimer */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Playground Mode:</strong> This chart is for experimentation only. 
                  Changes here don't affect your actual goal settings. Use this to explore different savings scenarios.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </motion.div>
  );
}

// Tooltip Component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg z-50 max-w-xs whitespace-normal"
          >
            {content}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tip Card Component
function TipCard({ emoji, title, content }: { emoji: string; title: string; content: string }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{emoji}</span>
        <h4 className="font-medium text-xs text-gray-900 dark:text-white">
          {title}
        </h4>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {content}
      </p>
    </div>
  );
}

// Tracker Modal Component
function TrackerModal({ 
  isOpen, 
  onClose, 
  goal,
  progressData,
  milestones,
  activeTab,
  setActiveTab,
  savingsGap,
  onUpdate,
  onOptimisticUpdate,
  onProgressUpdate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: any;
  progressData: any;
  milestones: any[];
  activeTab: 'activity' | 'milestones';
  setActiveTab: (tab: 'activity' | 'milestones') => void;
  savingsGap: number;
  onUpdate: () => void;
  onOptimisticUpdate: (updates: any) => void;
  onProgressUpdate: any;
}) {
  const [showAIAdvice, setShowAIAdvice] = useState(true);
  const [currentAdviceIndex, setCurrentAdviceIndex] = useState(0);
  const [showAddFundsForm, setShowAddFundsForm] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  
  // Get real activities and filter for this goal
  const { activities, isLoading: activitiesLoading } = useUserActivities();
  const goalActivities = activities.filter(activity => activity.goalId === goal.id);

  // Handle adding funds
  const handleAddFunds = async () => {
    if (!addFundsAmount || isAddingFunds) return;
    
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsAddingFunds(true);
    try {
      await onProgressUpdate({
        goalId: goal.id,
        newAmount: (goal.current_amount || 0) + amount,
        source: 'manual_update'
      });
      
      setAddFundsAmount('');
      setShowAddFundsForm(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add funds:', error);
    } finally {
      setIsAddingFunds(false);
    }
  };
  
  const aiAdviceMessages = [
    {
      message: `You'll need to save $${Math.abs(savingsGap)}/month to stay on track, and right now you're at $${progressData.monthlyCapacity}/month. We've got some work to do!`,
      type: savingsGap > 0 ? 'warning' : 'success'
    },
    {
      message: "Great progress! Your consistent saving habits are building a strong foundation for your financial future.",
      type: 'success'
    },
    {
      message: "Consider automating your savings to make reaching your goal even easier!",
      type: 'tip'
    }
  ];

  // Transform activities to display format
  const recentActivities = goalActivities.slice(0, 10).map(activity => ({
    type: activity.action,
    date: new Date(activity.created_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    amount: activity.metadata?.amount || 0,
    icon: activity.action.toLowerCase().includes('deposit') ? faRocket : faDollarSign
  }));

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="large">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              Goal Tracker
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Advice Section */}
        {showAIAdvice && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faBrain} className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {aiAdviceMessages[currentAdviceIndex].message}
                </p>
                
                {/* Pagination dots */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  {aiAdviceMessages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentAdviceIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentAdviceIndex 
                          ? 'bg-indigo-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowAIAdvice(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Current Saving */}
        <div className="px-6 py-4">
          <div className="mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Saving</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ${progressData.currentAmount.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ${(progressData.targetAmount - progressData.currentAmount).toLocaleString()} to go
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressData.progressPercentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Countdown Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Days Until Target */}
            <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faHome} className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {progressData.daysLeft} Days
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Until {goal.goal_type === 'house' ? 'Home Purchase' : 'Goal Achievement'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Percentage */}
            <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {progressData.progressPercentage.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Progress to Goal
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'milestones'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Milestones
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {activeTab === 'activity' ? (
            <div className="space-y-3">
              {activitiesLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon={faClock} className="w-8 h-8 mb-2 animate-spin" />
                  <p className="text-sm">Loading activities...</p>
                </div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon 
                          icon={activity.icon} 
                          className="w-4 h-4 text-gray-600 dark:text-gray-400" 
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {activity.type}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.date}
                        </div>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${activity.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon={faRocket} className="w-8 h-8 mb-2" />
                  <p className="text-sm">No activities yet</p>
                  <p className="text-xs">Activity for this goal will appear here</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {milestones && milestones.length > 0 ? (
                milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        milestone.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <FontAwesomeIcon 
                          icon={milestone.status === 'completed' ? faCheckCircle : faFlag} 
                          className={`w-4 h-4 ${
                            milestone.status === 'completed' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`} 
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {milestone.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'No due date'}
                        </div>
                      </div>
                    </div>
                    {milestone.target_amount && (
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        ${milestone.target_amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon={faFlag} className="w-8 h-8 mb-2" />
                  <p className="text-sm">No milestones yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Funds Section (only in activity tab) */}
        {activeTab === 'activity' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {!showAddFundsForm ? (
              <button 
                onClick={() => setShowAddFundsForm(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                Add Funds
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={addFundsAmount}
                      onChange={(e) => setAddFundsAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 dark:text-white"
                      min="0"
                      step="0.01"
                      disabled={isAddingFunds}
                    />
                  </div>
                  <button
                    onClick={handleAddFunds}
                    disabled={!addFundsAmount || isAddingFunds || parseFloat(addFundsAmount) <= 0}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    {isAddingFunds ? (
                      <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    )}
                    {isAddingFunds ? 'Adding...' : 'Add'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowAddFundsForm(false);
                    setAddFundsAmount('');
                  }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  disabled={isAddingFunds}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Enhanced Update Progress Modal
function UpdateProgressModal({ isOpen, onClose, goal, onProgressUpdate, onOptimisticUpdate }: {
  isOpen: boolean;
  onClose: () => void;
  goal: any;
  onProgressUpdate: (data: any) => void;
  onOptimisticUpdate: (data: any) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickAmounts = [100, 250, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const amountValue = parseFloat(amount);
      
      // Optimistic update
      const newAmount = goal.current_amount + amountValue;
      const newProgressPercentage = (newAmount / goal.target_amount) * 100;
      
      onOptimisticUpdate({
        current_amount: newAmount,
        progress_percentage: Math.min(100, newProgressPercentage),
        updated_at: new Date().toISOString()
      });

      await onProgressUpdate({
        goalId: goal.id,
        amountChange: amountValue,
        note: note || undefined
      });

      // Reset form and close modal
      setAmount('');
      setNote('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Progress">
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Amount to Add
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Add
            </label>
            <div className="grid grid-cols-2 gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white resize-none"
              rows={3}
              placeholder="Add a note about this progress update..."
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4" />
              )}
              {isSubmitting ? 'Updating...' : 'Update Progress'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// Activity Timeline Component
function ActivityTimelineComponent({ goalId }: { goalId: string }) {
  const { activities, isLoading, error } = useUserActivities();
  
  // Filter activities for this specific goal
  const goalActivities = activities?.filter(activity => 
    activity.metadata?.goalId === goalId ||
    activity.description?.toLowerCase().includes('goal') ||
    activity.activity_type === 'goal_progress_updated'
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Failed to load activity</p>
      </div>
    );
  }

  if (goalActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faClock} className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activity yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Updates and changes to your goal will appear here</p>
      </div>
    );
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'goal_progress_updated':
        return faDollarSign;
      case 'goal_created':
        return faFlag;
      case 'goal_updated':
        return faEdit;
      case 'milestone_completed':
        return faCheckCircle;
      default:
        return faClock;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'goal_progress_updated':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'goal_created':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'goal_updated':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      case 'milestone_completed':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {goalActivities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
            <FontAwesomeIcon 
              icon={getActivityIcon(activity.activity_type)} 
              className="w-4 h-4" 
            />
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {activity.description}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(activity.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          {activity.amount && (
            <div className="text-right">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                +${activity.amount.toLocaleString()}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}