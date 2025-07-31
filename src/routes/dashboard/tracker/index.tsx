import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChartLine, faBullseye, faTrophy, faExclamationTriangle, faRefresh, faCalendarAlt, faDollarSign, faArrowRight, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";
import { GoalsGrid } from "@/components/goal-tracker/goal-overview/GoalsGrid";
import { GoalsSummaryStats } from "@/components/goal-tracker/goal-overview/GoalsSummaryStats";
import { QuickActions } from "@/components/goal-tracker/goal-overview/QuickActions";
import { RecentActivity } from "@/components/goal-tracker/goal-overview/RecentActivity";
import { EmptyState } from "@/components/goal-tracker/shared/EmptyState";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { memo, useCallback } from "react";onst;

const trackerSearchSchema = z.object({
  tab: z.string().optional(),
  filter: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/tracker/")({
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
});

function GoalsTracker() {
  const { user } = useAuth();
  const { goals, metrics, isLoading, error, refetch } = useGoals(user?.id);

  if (isLoading) {
    return <GoalsLoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const hasGoals = goals && goals.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 dark:from-gray-950 dark:to-blue-950/20" role="main" aria-label="Goal Tracker Dashboard">
      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-md z-50">
        Skip to main content
      </a>
      
      {/* Modern Compact Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Goals
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 -mt-0.5">
                  {hasGoals ? `${goals.length} active goals` : 'Start your journey'}
                </p>
              </div>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to="/dashboard/tracker/create">
                <Button 
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm border-0 font-medium text-sm rounded-lg transition-all duration-200"
                  aria-label="Create a new financial goal"
                >
                  <FontAwesomeIcon icon={faPlus} className="size-4 mr-2" />
                  New Goal
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <div id="main-content" className="max-w-7xl mx-auto px-6 py-6" tabIndex={-1}>
        {hasGoals ? (
          <>
            {/* Redesigned Layout - Dynamic Priority-Based Design */}
            <div className="space-y-8">
              {/* Integrated Header Bar - Consolidated Stats */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
              >
                <div className="px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Overview</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBullseye} className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Goals</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics?.totalGoals || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics?.activeGoals || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faTrophy} className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics?.completedGoals || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">$</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              ${metrics?.totalTargetAmount?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Hero + Secondary Layout */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 xl:grid-cols-3 gap-8"
              >
                {/* Hero Goal Section - Takes 2/3 width */}
                <div className="xl:col-span-2 space-y-6">
                  <HeroGoalCard goal={goals[0]} onUpdate={refetch} />
                  
                 
                </div>
  

                {/* Activity Timeline - Takes 1/3 width */}
                <div className="xl:col-span-1">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm h-fit"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                      <RecentActivity />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
               {/* Secondary Goals Grid */}
               {goals.length > 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Other Goals</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {goals.slice(1).map((goal) => (
                          <SecondaryGoalCard key={goal.id} goal={goal} onUpdate={refetch} />
                        ))}
                      </div>
                    </div>
                  )}
            </div>
          </>
        ) : (
          <EmptyGoalsState />
        )}
      </div>
    </main>
  );
}

const EmptyGoalsState = memo(function EmptyGoalsState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center py-16 px-4"
      role="region"
      aria-labelledby="empty-state-heading"
    >
      <div className="max-w-lg text-center">
        {/* Modern Icon Design */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-3xl flex items-center justify-center shadow-inner">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <FontAwesomeIcon 
                icon={faBullseye} 
                className="w-8 h-8 text-white"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <FontAwesomeIcon 
              icon={faPlus} 
              className="w-4 h-4 text-white"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Content */}
        <h2 id="empty-state-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
          Start Your Financial Journey
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-base max-w-md mx-auto">
          Set your first financial goal and let our AI create a personalized strategy with smart milestones.
        </p>

        {/* Modern Benefits Grid */}
        <div className="grid grid-cols-3 gap-6 mb-10" role="list" aria-label="Goal tracker benefits">
          <div className="text-center" role="listitem">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mb-3">
              <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Strategy</p>
          </div>
          <div className="text-center" role="listitem">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl flex items-center justify-center mb-3">
              <FontAwesomeIcon icon={faBullseye} className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Smart Milestones</p>
          </div>
          <div className="text-center" role="listitem">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl flex items-center justify-center mb-3">
              <FontAwesomeIcon icon={faTrophy} className="w-6 h-6 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Track Progress</p>
          </div>
        </div>

        {/* Modern CTA */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/dashboard/tracker/create" aria-describedby="empty-state-heading">
            <Button className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg border-0 font-medium text-base rounded-xl transition-all duration-200" aria-label="Create your first financial goal">
              <FontAwesomeIcon icon={faPlus} className="mr-2" aria-hidden="true" />
              Create Your First Goal
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
});

const GoalsLoadingSkeleton = memo(function GoalsLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 dark:from-gray-950 dark:to-blue-950/20" role="main" aria-label="Loading goal tracker data">
      <div aria-live="polite" aria-label="Loading your goals">
        <span className="sr-only">Loading your financial goals, please wait...</span>
      </div>
      
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
              </div>
            </div>
            <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top Row Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Stats Skeleton */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/30 dark:border-gray-700/30">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3 animate-pulse"></div>
                  <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-2 animate-pulse"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Skeleton */}
          <div className="xl:col-span-2">
            <div className="h-32 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/30 dark:border-gray-700/30 animate-pulse"></div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/30 dark:border-gray-700/30 animate-pulse"></div>
            ))}
          </div>
          <div className="xl:col-span-1">
            <div className="h-64 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/30 dark:border-gray-700/30 animate-pulse"></div>
          </div>
        </div>
      </div>
    </main>
  );
});

const ErrorState = memo(function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/30 dark:from-gray-950 dark:to-blue-950/20 flex items-center justify-center" role="main">
      <div className="max-w-md text-center px-6">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
          Failed to Load Goals
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-sm">
          {error?.message || 'Something went wrong while loading your goals. Please try again.'}
        </p>
        <div role="alert" aria-live="polite" className="sr-only">
          Error loading goals: {error?.message || 'Unknown error occurred'}
        </div>
        <Button 
          onClick={handleRetry} 
          className="h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm border-0 font-medium text-sm rounded-xl transition-all duration-200"
          aria-label="Retry loading goals"
        >
          <FontAwesomeIcon icon={faRefresh} className="mr-2 w-4 h-4" aria-hidden="true" />
          Try Again
        </Button>
      </div>
    </main>
  );
});

// Hero Goal Card Component - Pillar 1: Dynamic Layout
const HeroGoalCard = memo(function HeroGoalCard({ goal, onUpdate }: { goal: any; onUpdate: () => void }) {
  if (!goal) return null;

  const progress = goal.current_amount && goal.target_amount 
    ? (goal.current_amount / goal.target_amount) * 100 
    : 0;
  
  const isOnTrack = progress >= 50; // Simple on-track logic
  const daysUntilTarget = goal.target_date 
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
      transition={{ duration: 0.2 }}
      className="bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-800/60 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden"
    >
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
                <span className={`text-sm font-medium ${isOnTrack ? 'text-green-600' : 'text-amber-600'}`}>
                  {isOnTrack ? 'On Track' : 'Needs Attention'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created {goal.created_at ? new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Target: {goal.target_date ? new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'No deadline'}
                </p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
              {goal.title}
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {goal.description || 'Working towards your financial goal'}
              </p>
              <div className="text-right ml-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {goal.milestones?.length || 0} milestones
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated {goal.updated_at ? new Date(goal.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently'}
                </p>
              </div>
            </div>
          </div>
         
        </div>

        {/* Rich Progress Visualization - Pillar 2 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${goal.current_amount?.toLocaleString() || '0'}
                </p>
              </div>
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Target</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${goal.target_amount?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(progress)}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Complete</p>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isOnTrack 
                  ? 'bg-gradient-to-r from-green-400 to-green-600' 
                  : 'bg-gradient-to-r from-amber-400 to-orange-500'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Time Left</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {daysUntilTarget > 0 ? `${daysUntilTarget} days` : 'Past due'}
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-2">
              <FontAwesomeIcon icon={faDollarSign} className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              ${((goal.target_amount || 0) - (goal.current_amount || 0)).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-2">
              <FontAwesomeIcon icon={faTrophy} className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">
              {goal.priority || 'Medium'}
            </p>
          </div>
        </div>

        {/* Quick Actions - Pillar 3 */}
        <div className="flex space-x-3">
        <Link
            to={`/dashboard/tracker/${goal.id}`}
            className="flex-1 flex justify-center items-center h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200"
          >
            Add Money
          </Link>
          <Link
            to={`/dashboard/tracker/${goal.id}`}
            className="flex justify-center items-center h-12 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-200"
          >
            Update Progress
          </Link>
        </div>
      </div>
    </motion.div>
  );
});

// Secondary Goal Card Component - Pillar 1: Compact Design
const SecondaryGoalCard = memo(function SecondaryGoalCard({ goal, onUpdate }: { goal: any; onUpdate: () => void }) {
  const progress = goal.current_amount && goal.target_amount 
    ? (goal.current_amount / goal.target_amount) * 100 
    : 0;
  
  const isOnTrack = progress >= 50;
  const daysUntilTarget = goal.target_date 
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <motion.div
      whileHover={{ 
        y: -4, 
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2 }
      }}
      className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden cursor-pointer"
    >
      <Link to={`/dashboard/tracker/${goal.id}`} className="block p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <span className={`text-xs font-medium ${isOnTrack ? 'text-green-600' : 'text-amber-600'}`}>
                  {isOnTrack ? 'On Track' : 'Behind'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{Math.round(progress)}%</p>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors mb-1">
              {goal.title}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {goal.milestones?.length || 0} milestones
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Due {goal.target_date ? new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'No deadline'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isOnTrack 
                  ? 'bg-gradient-to-r from-green-400 to-green-600' 
                  : 'bg-gradient-to-r from-amber-400 to-orange-500'
              }`}
            />
          </div>
        </div>

        {/* Essential Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Current</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                ${goal.current_amount?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 dark:text-gray-400">Target</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                ${goal.target_amount?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          
          {/* Additional timing info */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div>
              <p>Started {goal.created_at ? new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently'}</p>
            </div>
            <div className="text-right">
              <p>
                {daysUntilTarget > 0 
                  ? `${daysUntilTarget} days left`
                  : daysUntilTarget === 0 
                  ? 'Due today'
                  : `${Math.abs(daysUntilTarget)} days overdue`
                }
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});