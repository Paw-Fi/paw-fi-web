import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChartLine, faBullseye, faTrophy, faExclamationTriangle, faRefresh } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";
import { GoalsGrid } from "@/components/goal-tracker/goal-overview/GoalsGrid";
import { GoalsSummaryStats } from "@/components/goal-tracker/goal-overview/GoalsSummaryStats";
import { QuickActions } from "@/components/goal-tracker/goal-overview/QuickActions";
import { RecentActivity } from "@/components/goal-tracker/goal-overview/RecentActivity";
import { EmptyState } from "@/components/goal-tracker/shared/EmptyState";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { memo, useCallback } from "react";

// Animation constants for consistent motion design
const ANIMATION_DURATION = {
  fast: 0.3,
  normal: 0.5,
  slow: 0.8
} as const;

const STAGGER_DELAY = 0.1;
const TOUCH_TARGET_SIZE = "min-h-[44px] min-w-[44px]"; // Minimum touch target size for accessibility

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
            {/* Redesigned Layout - More Compact and Sophisticated */}
            <div className="space-y-6">
              {/* Top Row: Stats + Quick Actions Combined */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="grid grid-cols-1 xl:grid-cols-5 gap-6"
              >
                {/* Stats take up 3 columns */}
                <div className="xl:col-span-3">
                  <GoalsSummaryStats metrics={metrics} />
                </div>
                
                {/* Quick Actions take up 2 columns */}
                <div className="xl:col-span-2">
                <RecentActivity />
                </div>
              </motion.div>
              
              
                  <GoalsGrid goals={goals} onGoalUpdate={refetch} />                
               

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