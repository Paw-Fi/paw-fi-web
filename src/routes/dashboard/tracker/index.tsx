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
    <main className="p-4 sm:p-6 space-y-6" role="main" aria-label="Goal Tracker Dashboard">
      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-md z-50">
        Skip to main content
      </a>
      
      {/* Page Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ANIMATION_DURATION.normal }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-dark-foreground">
            Goal Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Track your financial goals with AI-powered insights
          </p>
        </div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-shrink-0"
        >
          <Link to="/dashboard/tracker/create">
            <Button 
              className={`bg-primary hover:bg-primary-dark text-white shadow-lg ${TOUCH_TARGET_SIZE} px-4 py-2 sm:px-6 sm:py-3`}
              aria-label="Create a new financial goal"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" aria-hidden="true" />
              <span>Create Goal</span>
            </Button>
          </Link>
        </motion.div>
      </motion.header>

      <div id="main-content" tabIndex={-1}>
        {hasGoals ? (
          <>
            {/* Summary Statistics */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal, delay: STAGGER_DELAY }}
              aria-labelledby="stats-heading"
            >
              <h2 id="stats-heading" className="sr-only">Goal Statistics Overview</h2>
              <GoalsSummaryStats metrics={metrics} />
            </motion.section>
            
            {/* Quick Actions */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal, delay: STAGGER_DELAY * 2 }}
              aria-labelledby="quick-actions-heading"
            >
              <h2 id="quick-actions-heading" className="sr-only">Quick Actions</h2>
              <QuickActions goals={goals} />
            </motion.section>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Main Goals Grid */}
              <motion.section
                className="lg:col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: ANIMATION_DURATION.normal, delay: STAGGER_DELAY * 3 }}
                aria-labelledby="goals-grid-heading"
              >
                <h2 id="goals-grid-heading" className="sr-only">Your Financial Goals</h2>
                <GoalsGrid goals={goals} onGoalUpdate={refetch} />
              </motion.section>
              
              {/* Recent Activity Sidebar */}
              <motion.aside
                className="lg:col-span-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: ANIMATION_DURATION.normal, delay: STAGGER_DELAY * 4 }}
                aria-labelledby="recent-activity-heading"
              >
                <h2 id="recent-activity-heading" className="sr-only">Recent Activity</h2>
                <RecentActivity />
              </motion.aside>
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: ANIMATION_DURATION.normal }}
      className="flex flex-col items-center justify-center py-8 sm:py-16 px-4"
      role="region"
      aria-labelledby="empty-state-heading"
    >
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="relative mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center">
            <FontAwesomeIcon 
              icon={faBullseye} 
              className="w-10 h-10 sm:w-12 sm:h-12 text-primary"
              aria-hidden="true"
            />
          </div>
          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center">
            <FontAwesomeIcon 
              icon={faPlus} 
              className="w-3 h-3 sm:w-4 sm:h-4 text-white"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Content */}
        <h2 id="empty-state-heading" className="text-xl sm:text-2xl font-bold text-foreground dark:text-dark-foreground mb-4 text-center">
          Start Your Financial Journey
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 leading-relaxed text-center text-sm sm:text-base">
          Set your first financial goal and let our AI create a personalized strategy with smart milestones to help you succeed.
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8" role="list" aria-label="Goal tracker benefits">
          <div className="text-center" role="listitem">
            <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-2">
              <FontAwesomeIcon icon={faChartLine} className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Strategy</p>
          </div>
          <div className="text-center" role="listitem">
            <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-2">
              <FontAwesomeIcon icon={faBullseye} className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Smart Milestones</p>
          </div>
          <div className="text-center" role="listitem">
            <div className="w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-2">
              <FontAwesomeIcon icon={faTrophy} className="w-6 h-6 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Track Progress</p>
          </div>
        </div>

        {/* Call to Action */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/dashboard/tracker/create" aria-describedby="empty-state-heading">
            <Button className={`bg-primary hover:bg-primary-dark text-white px-6 sm:px-8 py-3 text-base sm:text-lg shadow-lg ${TOUCH_TARGET_SIZE}`} aria-label="Create your first financial goal">
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
    <main className="p-4 sm:p-6 space-y-6" role="main" aria-label="Loading goal tracker data">
      <div aria-live="polite" aria-label="Loading your goals">
        <span className="sr-only">Loading your financial goals, please wait...</span>
      </div>
      
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-40 sm:w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 sm:w-64 animate-pulse"></div>
        </div>
        <div className="h-10 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20 mb-2 animate-pulse"></div>
            <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-12 sm:w-16 mb-1 animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 sm:w-24 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="h-12 sm:h-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse"></div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 sm:h-32 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse"></div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-48 sm:h-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse"></div>
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
    <main className="p-4 sm:p-6" role="main">
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-dark-foreground mb-4">
            Failed to Load Goals
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base leading-relaxed">
            {error?.message || 'Something went wrong while loading your goals. Please try again.'}
          </p>
          <div role="alert" aria-live="polite" className="sr-only">
            Error loading goals: {error?.message || 'Unknown error occurred'}
          </div>
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            className={`${TOUCH_TARGET_SIZE} px-6 py-3`}
            aria-label="Retry loading goals"
          >
            <FontAwesomeIcon icon={faRefresh} className="mr-2" aria-hidden="true" />
            Try Again
          </Button>
        </div>
      </div>
    </main>
  );
});