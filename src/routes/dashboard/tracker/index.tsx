import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPlus, 
  faChartLine, 
  faTrophy, 
  faExclamationTriangle, 
  faRefresh, 
  faArrowRight,
  faBullseye,
  faWandSparkles,
  faCheckCircle,
  faFilter
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";
import { memo, useCallback, useState, useMemo, useEffect } from "react";
import { useTrackerIndexWalkthrough } from "@/hooks/walkthrough/use-tracker-index-walkthrough";
import { useSpotlightGoals } from "@/hooks/goal-tracker/use-spotlight-goals";
import { getGoalIcon } from "@/lib/utils/goal-icons";
import travelBgImage from "@/assets/images/tracker/spotlight-travel.svg";

const trackerSearchSchema = z.object({
  filter: z.enum(['all', 'on-track', 'needs-attention', 'completed']).optional().default('all'),
  sort: z.enum(['due-date', 'progress', 'recently-updated']).optional().default('due-date'),
});

export const Route = createFileRoute("/dashboard/tracker/")(({
  validateSearch: trackerSearchSchema,
  component: GoalsTracker,
  head: () => ({
    meta: [
      { title: 'Goal Tracker | Moneko - AI-Powered Financial Goal Management' },
      { 
        name: 'description', 
        content: 'Track your financial goals with AI-powered insights and milestone management. Set, monitor, and achieve your financial objectives with personalized strategies and smart recommendations.' 
      },
      {
        name: 'keywords',
        content: 'financial goals, goal tracker, AI financial planning, milestone management, savings tracker, financial objectives, budgeting, personal finance'
      },
      {
        property: 'og:title',
        content: 'Goal Tracker - AI-Powered Financial Goal Management | Moneko'
      },
      {
        property: 'og:description',
        content: 'Set and achieve your financial goals with AI-powered insights, smart milestones, and personalized strategies.'
      },
      {
        property: 'og:type',
        content: 'website'
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image'
      },
      {
        name: 'twitter:title',
        content: 'Goal Tracker - AI-Powered Financial Management'
      },
      {
        name: 'twitter:description',
        content: 'Track and achieve your financial goals with personalized AI insights and milestone management.'
      }
    ],
  }),
  }))


  function GoalsTracker() {
    const { user } = useAuth();
    const { goals, isLoading, error, refetch } = useGoals(user?.id);
    const { autoStartWalkthrough, startWalkthrough } = useTrackerIndexWalkthrough();
  
    // Move all useMemo hooks before any conditional returns
    const sortedGoals = useMemo(() => {
      if (!goals) return [];
      
      return goals.sort((a, b) => {
        if (!a.target_date && !b.target_date) return 0;
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      });
    }, [goals]);
    
    // Use the new spotlight hook for better performance
    const spotlightGoals = useSpotlightGoals(goals);
    
    const statsData = useMemo(() => {
      if (!goals || goals.length === 0) {
        return {
          totalGoals: 0,
          activeGoals: 0,
          completedGoals: 0,
          onTrackPercentage: 0
        };
      }
      
      const getGoalStatus = (goal) => {
        if (goal.status === 'completed') return 'completed';
        
        const progress = goal.current_amount && goal.target_amount 
          ? (goal.current_amount / goal.target_amount) * 100 
          : 0;
        
        const daysUntilTarget = goal.target_date 
          ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        if (progress >= 50 || daysUntilTarget > 30) return 'on-track';
        return 'needs-attention';
      };
      
      const totalGoals = goals.length;
      const activeGoals = goals.filter(goal => goal.status === 'active').length;
      const completedGoals = goals.filter(goal => goal.status === 'completed').length;
      const onTrackGoals = goals.filter(goal => getGoalStatus(goal) === 'on-track').length;
      const onTrackPercentage = Math.round((onTrackGoals / totalGoals) * 100);
      
      return {
        totalGoals,
        activeGoals,
        completedGoals,
        onTrackPercentage
      };
    }, [goals]);

    const hasGoals = goals && goals.length > 0;

    // Auto-start walkthrough for new users
    useEffect(() => {
      if (hasGoals) {
        autoStartWalkthrough();
      }
    }, [hasGoals, autoStartWalkthrough]);
  
    // Now the early returns after all hooks are called
    if (isLoading) {
      return <GoalsLoadingSkeleton />;
    }
  
    if (error) {
      return <ErrorState error={error} onRetry={refetch} />;
    }
    
    const getGoalStatus = (goal) => {
      if (goal.status === 'completed') return 'completed';
      
      const progress = goal.current_amount && goal.target_amount 
        ? (goal.current_amount / goal.target_amount) * 100 
        : 0;
      
      const daysUntilTarget = goal.target_date 
        ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      if (progress >= 50 || daysUntilTarget > 30) return 'on-track';
      return 'needs-attention';
    };
  
    const pageVariants = {
      initial: { opacity: 0 },
      animate: { 
        opacity: 1,
        transition: {   
          duration: 0.3, 
          staggerChildren: 0.1
        }
      }
    };
  
    const itemVariants = {
      initial: { opacity: 0, y: 16 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.4,
          ease: [0.25, 0.8, 0.5, 1]
        }
      }
    };
  
    return (
      <motion.main 
        className="min-h-screen bg-gray-50 dark:bg-gray-900" 
        role="main" 
        aria-label="Goals Dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        {/* Skip to main content link for keyboard navigation */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-md z-50 font-medium"
        >
          Skip to main content
        </a>
  
        {/* Clean Header inspired by the design */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between" data-tour="page-header">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Goals
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Track your financial goals with AI-powered insights
                </p>
              </div>
              <div className="flex items-center gap-3">
              
                <Link to="/dashboard/tracker/create">
                  <button 
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg"
                    data-tour="create-goal-btn"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    Create Goal
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
  
        {/* Main Content */}
        <div id="main-content" className="max-w-6xl mx-auto px-6 py-8 space-y-8" tabIndex={-1}>
          {hasGoals ? (
            <>
              <div data-tour="spotlight-section">
                <SpotlightSection 
                  spotlightGoals={spotlightGoals}
                  getGoalStatus={getGoalStatus}
                />
              </div>
              
              <div data-tour="stats-bar">
                <StatsBar stats={statsData} />
              </div>
              
              <div data-tour="goals-list">
                <CommandCenter 
                  goals={sortedGoals}
                  getGoalStatus={getGoalStatus}
                  onUpdate={refetch}
                />
              </div>
            </>
          ) : (
            <EmptyGoalsState />
          )}
        </div>
      </motion.main>
    );
  }

// Spotlight Section Component
const SpotlightSection = memo(function SpotlightSection({ 
  spotlightGoals, 
  getGoalStatus 
}: {
  spotlightGoals: any[];
  getGoalStatus: (goal: any) => string;
}) {
  if (!spotlightGoals || spotlightGoals.length === 0) return null;

  
  return (
    <motion.section 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Spotlight</h2>
      <div className="grid grid-cols-3 gap-6">
        {spotlightGoals.map((goal, index) => (
          <SpotlightCard 
            key={goal.id}
            goal={goal}
            type={goal.spotlightType}
            icon={getGoalIcon(goal)}
            status={getGoalStatus(goal)}
            reason={goal.spotlightReason}
            priority={index + 1}
          />
        ))}
      </div>
    </motion.section>
  );
});

// Clean Spotlight Card Component matching the attached design
const SpotlightCard = memo(function SpotlightCard({ 
  goal, 
  type, 
  icon, 
  status,
  reason,
  priority 
}: {
  goal: any;
  type: 'critical' | 'urgency' | 'attention' | 'upcoming' | 'success' | 'momentum' | 'stagnant';
  icon: any;
  status: string;
  reason?: string;
  priority?: number;
}) {
  const daysUntilTarget = goal.target_date 
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Get background color based on goal type and spotlight type
  const getCardBackground = (priority?: number) => {
    if(priority === 1) return 'bg-[#d7ceff] dark:bg-purple-800/30';
    if(priority === 2) return 'bg-[#f2e9fe] dark:bg-purple-700/20';
    if(priority === 3) return 'bg-[#daeafe] dark:bg-blue-800/30';
    return 'bg-[#d7ceff] dark:bg-purple-800/30';
  };
  
  const cardBackground = getCardBackground(priority);
  
  return (
    <Link to={`/dashboard/tracker/${goal.id}` as '/dashboard/tracker/$goalId'}>
      
      <motion.div 
        className={`relative overflow-hidden flex justify-center items-center bg-[#d6cffe] dark:bg-gray-700 rounded-3xl h-40 p-8 cursor-pointer transition-all duration-300 hover:shadow-lg dark:hover:bg-gray-600 ${cardBackground}`}
        whileHover={{ y: -2, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >                
          {/* Main Content */}
          <div className="flex flex-col gap-2">
            {/* Days Display */}
            <div className="text-4xl font-hepta-slab  font-bold text-gray-900 dark:text-white">
              {daysUntilTarget > 0 ? `${daysUntilTarget} Days` : daysUntilTarget === 0 ? 'Due Today' : 'Overdue'}
            </div>
            
            {/* Goal Title */}
            <div className="text-gray-500 dark:text-gray-300 font-medium text-lg leading-tight line-clamp-2 text-ellipsis">
              Until {goal.title}
            </div>
            
            {/* Additional Info for certain types */}
            {(type === 'attention' || type === 'stagnant') && (
              <div className="text-sm text-gray-700 dark:text-gray-200 font-medium mt-3">
                {reason || 'Next Milestone:'}
              </div>
            )}
          </div>
      </motion.div>
    </Link>
  );
});

// Clean Stats Bar inspired by the design
const StatsBar = memo(function StatsBar({ stats }: { stats: any }) {
  const statItems = [
    { 
      label: 'Total Goals', 
      value: stats.totalGoals, 
      icon: faBullseye,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-500 dark:text-blue-400'
    },
    { 
      label: 'Active Goals', 
      value: stats.activeGoals, 
      icon: faChartLine,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-500 dark:text-green-400'
    },
    { 
      label: 'Completed Goals', 
      value: stats.completedGoals, 
      icon: faTrophy,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-500 dark:text-purple-400'
    },
    { 
      label: 'Overall Progress', 
      value: `${stats.onTrackPercentage}%`, 
      icon: faCheckCircle,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-500 dark:text-orange-400',
      subtitle: `${stats.activeGoals} of ${stats.totalGoals} goals on track`
    }
  ];
  
  return (
    <motion.section 
      className="grid grid-cols-2 lg:grid-cols-4 gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {statItems.map((stat) => (
        <motion.div 
          key={stat.label} 
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-300"
          whileHover={{ y: -2 }}
        >
          <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
            <FontAwesomeIcon icon={stat.icon} className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {stat.label}
          </div>
          {stat.subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stat.subtitle}
            </div>
          )}
        </motion.div>
      ))}
    </motion.section>
  );
});

// Clean Goals List inspired by the design
const CommandCenter = memo(function CommandCenter({ 
  goals, 
  getGoalStatus, 
  onUpdate 
}: {
  goals: any[];
  getGoalStatus: (goal: any) => string;
  onUpdate: () => void;
}) {
  return (
    <motion.section 
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h2>
      </div>
      
      {/* Goals List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faFilter} className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No goals match your current filter</p>
          </div>
        ) : (
          goals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              getGoalStatus={getGoalStatus}
            />
          ))
        )}
      </div>
    </motion.section>
  );
});

// Clean Goal Card inspired by the design
const GoalCard = memo(function GoalCard({ 
  goal, 
  getGoalStatus 
}: {
  goal: any;
  getGoalStatus: (goal: any) => string;
}) {
  const progress = goal.current_amount && goal.target_amount 
    ? (goal.current_amount / goal.target_amount) * 100 
    : 0;
  
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-gradient-to-r from-purple-500 to-purple-600';
    if (progress >= 50) return 'bg-gradient-to-r from-blue-500 to-purple-500';
    if (progress >= 25) return 'bg-gradient-to-r from-orange-400 to-orange-500';
    return 'bg-gradient-to-r from-gray-300 to-gray-400';
  };
  
  
  return (
    <Link to={`/dashboard/tracker/${goal.id}` as '/dashboard/tracker/$goalId'}>
      <motion.div 
        className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
        whileHover={{ x: 4 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon 
              icon={getGoalIcon(goal)} 
              className="w-6 h-6 text-gray-600 dark:text-gray-300" 
            />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {goal.title}
              </h3>
              <span className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                {Math.round(progress)}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
              <motion.div 
                className={`h-full rounded-full ${getProgressColor(progress)}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

// Mission Control: Enhanced Empty State
const EmptyGoalsState = memo(function EmptyGoalsState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center py-20 px-4"
      role="region"
      aria-labelledby="empty-state-heading"
    >
      <div className="max-w-lg text-center">
        {/* Enhanced Icon Design */}
        <div className="relative mb-12">
          <motion.div 
            className="w-40 h-40 mx-auto rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}
            animate={{ 
              rotate: [0, 5, 0, -5, 0],
              scale: [1, 1.02, 1]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <FontAwesomeIcon 
                icon={faBullseye} 
                className="w-10 h-10 text-white"
                aria-hidden="true"
              />
            </div>
          </motion.div>
          
          <motion.div 
            className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl"
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <FontAwesomeIcon 
              icon={faPlus} 
              className="w-6 h-6 text-white"
              aria-hidden="true"
            />
          </motion.div>
        </div>

        {/* Content with Expressive Typography */}
        <motion.h2 
          id="empty-state-heading" 
          className="text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight"
        >
          Start Your Financial Journey
        </motion.h2>
        
        <motion.p 
          className="text-lg text-gray-600 dark:text-gray-400 mb-12 leading-relaxed max-w-md mx-auto"
        >
          Transform your financial dreams into achievable goals with AI-powered strategies, smart milestones, and progress tracking.
        </motion.p>

        {/* Enhanced Benefits Grid */}
        <div className="grid grid-cols-3 gap-8 mb-12" role="list" aria-label="Goal tracker benefits">
          {[
            { icon: faWandSparkles, label: 'AI Strategy', color: 'from-blue-500 to-blue-600' },
            { icon: faBullseye, label: 'Smart Milestones', color: 'from-green-500 to-emerald-600' },
            { icon: faTrophy, label: 'Track Progress', color: 'from-purple-500 to-purple-600' }
          ].map((benefit, index) => (
            <motion.div 
              key={benefit.label}
              className="text-center" 
              role="listitem"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.2 + (index * 0.1),
                duration: 0.4,
                ease: [0.25, 0.8, 0.5, 1]
              }}
            >
              <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                <FontAwesomeIcon icon={benefit.icon} className="w-7 h-7 text-white" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {benefit.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Enhanced CTA */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/dashboard/tracker/create" aria-describedby="empty-state-heading">
            <button className="group h-14 px-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-2xl border-0 font-bold text-lg rounded-2xl transition-all duration-300" aria-label="Create your first financial goal">
              <FontAwesomeIcon icon={faWandSparkles} className="mr-3 group-hover:rotate-12 transition-transform" aria-hidden="true" />
              Create Your First Goal
              <FontAwesomeIcon icon={faArrowRight} className="ml-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
});

// Mission Control: Enhanced Loading Skeleton
const GoalsLoadingSkeleton = memo(function GoalsLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900" role="main" aria-label="Loading goal tracker data">
      <div aria-live="polite" aria-label="Loading your goals">
        <span className="sr-only">Loading your financial goals, please wait...</span>
      </div>
      
      {/* Hero Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-8 bg-gray-200/60 dark:bg-gray-700/60 rounded w-32 animate-pulse"></div>
              <div className="h-5 bg-gray-200/60 dark:bg-gray-700/60 rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-12 w-40 bg-gray-200/60 dark:bg-gray-700/60 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Spotlight Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-24 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"></div>
            <div className="h-40 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"></div>
          </div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center space-y-3">
                <div className="w-12 h-12 bg-gray-200/60 dark:bg-gray-700/60 rounded-lg mx-auto animate-pulse"></div>
                <div className="h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-16 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200/60 dark:bg-gray-700/60 rounded w-20 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Goals List Skeleton */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-24 animate-pulse"></div>
            <div className="flex gap-4">
              <div className="h-10 bg-gray-200/60 dark:bg-gray-700/60 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200/60 dark:bg-gray-700/60 rounded w-40 animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
});

// Mission Control: Enhanced Error State
const ErrorState = memo(function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" role="main">
      <div className="max-w-md text-center px-6">
        <motion.div 
          className="w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 101, 101, 0.1) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(239, 68, 68, 0.2)"
          }}
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
        </motion.div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          Failed to Load Goals
        </h2>
        
        <p className="text-base text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          {error?.message || 'Something went wrong while loading your goals. Please try again.'}
        </p>
        
        <div role="alert" aria-live="polite" className="sr-only">
          Error loading goals: {error?.message || 'Unknown error occurred'}
        </div>
        
        <motion.button 
          onClick={handleRetry}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-lg border-0 font-semibold rounded-xl transition-all duration-200"
          aria-label="Retry loading goals"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FontAwesomeIcon icon={faRefresh} className="mr-2 w-4 h-4" aria-hidden="true" />
          Try Again
        </motion.button>
      </div>
    </main>
  );
});

export default GoalsTracker;