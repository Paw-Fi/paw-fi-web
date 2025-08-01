import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPlus, 
  faChartLine, 
  faTrophy, 
  faExclamationTriangle, 
  faRefresh, 
  faCalendarAlt, 
  faDollarSign, 
  faArrowRight,
  faFire,
  faBullseye,
  faWandSparkles,
  faUpLong,
  faCheckCircle,
  faCirclePlay
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";
import { RecentActivity } from "@/components/goal-tracker/goal-overview/RecentActivity";
import { FinancialGlassMetricsPanel } from "@/components/shared/FinancialGlassMetricsPanel";
import { DashboardHeroSection } from "@/components/shared/DashboardHeroSection";
import { memo, useCallback, useState } from "react";

const trackerSearchSchema = z.object({
  tab: z.string().optional(),
  filter: z.string().optional(),
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
  const { goals, metrics, isLoading, error, refetch } = useGoals(user?.id);
  const [selectedView, setSelectedView] = useState<'all' | 'active' | 'completed'>('all');

  if (isLoading) {
    return <GoalsLoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const hasGoals = goals && goals.length > 0;
  const filteredGoals = goals?.filter(goal => {
    if (selectedView === 'active') return goal.status === 'active';
    if (selectedView === 'completed') return goal.status === 'completed';
    return true;
  }) || [];

  // Enhanced Animation variants with physics-based motion (2025 Design System)
  const pageVariants: Variants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.4, 
        staggerChildren: 0.08,
        ease: [0.2, 0.8, 0.4, 1] // Structured Expression easing
      }
    }
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.3,
        ease: [0.25, 0.8, 0.5, 1] // Educational reveal timing
      }
    }
  };

  // Financial Glass material variants
  const glassVariants: Variants = {
    initial: { 
      backdropFilter: "blur(0px)",
      background: "rgba(255, 255, 255, 0)"
    },
    animate: { 
      backdropFilter: "blur(20px)",
      background: "rgba(255, 255, 255, 0.08)",
      transition: { 
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }
    }
  };

  return (
    <>
      {/* Design System CSS Injection */}
      <style jsx global>{`
        /* Financial Glass Material System */
        .financial-glass {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.125);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        /* Expressive Typography Classes */
        .text-display {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        
        .text-headline {
          font-size: clamp(1.875rem, 3vw, 2.5rem);
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        
        .text-title {
          font-size: clamp(1.25rem, 2vw, 1.5rem);
          font-weight: 600;
          line-height: 1.3;
        }
        
        .text-body {
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.6;
        }
        
        .text-label {
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.4;
          letter-spacing: 0.01em;
        }
        
        /* Variable Font Support */
        * {
          font-family: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        
        /* Reduced Motion Support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <motion.main 
        className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/10" 
        role="main" 
        aria-label="Goal Tracker Dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        {/* Skip to main content link for keyboard navigation */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 font-medium"
        >
          Skip to main content
        </a>

        {/* Modern Hero Section with Stats */}
        <DashboardHeroSection
          title="Financial Goals"
          titleGradient="from-blue-600 dark:from-blue-400 via-purple-600 dark:via-purple-400 to-indigo-600 dark:to-indigo-400"
          emoji="🎯"
          emojiAnimation={{ rotate: [0, 15, 0], duration: 2, repeatDelay: 4 }}
          description={hasGoals 
            ? `Track and achieve your ${goals.length} financial goals with AI-powered insights and milestone management.`
            : 'Transform your financial dreams into achievable goals with personalized AI strategies and smart milestone tracking.'
          }
          backgroundGradient="from-blue-600/5 dark:from-blue-400/10 via-purple-600/5 dark:via-purple-400/10 to-indigo-600/5 dark:to-indigo-400/10"
          decorativeGradients={{
            topRight: "bg-blue-400/10 dark:bg-blue-400/20",
            bottomLeft: "bg-purple-400/10 dark:bg-purple-400/20"
          }}
          actions={[
            {
              label: "Create New Goal",
              icon: faWandSparkles,
              variant: 'primary',
              component: (
                <Link to="/dashboard/tracker/create">
                  <button className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-xl shadow-blue-600/20 dark:shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-600/30 dark:hover:shadow-blue-500/40 transition-all duration-300">
                    <FontAwesomeIcon icon={faWandSparkles} className="h-5 w-5" />
                    <span>Create New Goal</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              )
            },
            ...(hasGoals ? [{
              label: "View Analytics",
              icon: faChartLine,
              variant: 'secondary' as const,
              component: (
                <button className="group flex items-center gap-3 px-8 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-blue-300/70 dark:hover:border-blue-400/70 hover:text-blue-700 dark:hover:text-blue-400 transition-all duration-300">
                  <FontAwesomeIcon icon={faChartLine} className="h-5 w-5" />
                  <span>View Analytics</span>
                </button>
              )
            }] : [])
          ]}
          metrics={hasGoals ? [
            {
              icon: faBullseye,
              value: metrics?.totalGoals || 0,
              label: "Total Goals",
              gradientColors: "from-blue-600 to-indigo-600",
              iconColors: "from-blue-500 to-blue-600",
              delay: 0.5
            },
            {
              icon: faFire,
              value: metrics?.activeGoals || 0,
              label: "Active",
              gradientColors: "from-green-600 to-emerald-600",
              iconColors: "from-green-500 to-emerald-600",
              delay: 0.6
            },
            {
              icon: faTrophy,
              value: metrics?.completedGoals || 0,
              label: "Completed",
              gradientColors: "from-purple-600 to-pink-600",
              iconColors: "from-purple-500 to-purple-600",
              delay: 0.7
            },
            {
              icon: faDollarSign,
              value: `$${(metrics?.totalTargetAmount || 0).toLocaleString()}`,
              label: "Total Value",
              gradientColors: "from-amber-600 to-orange-600",
              iconColors: "from-amber-500 to-orange-500",
              delay: 0.8
            }
          ] : undefined}

          showMetrics={hasGoals}
        />

        {/* Main Content */}
        <div id="main-content" className="max-w-7xl mx-auto px-6 pb-12" tabIndex={-1}>
          {hasGoals ? (
            <>
              {/* Filter Tabs with Glass Material */}
              <motion.div 
                className="mb-8"
                variants={itemVariants}
              >
                <motion.div 
                  className="rounded-2xl p-2 shadow-xl border border-white/20 dark:border-gray-700/50 backdrop-blur-xl max-w-md"
                  variants={glassVariants}
                  style={{
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(59, 130, 246, 0.03) 100%)",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
                  }}
                >
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: 'All Goals', icon: faBullseye },
                      { id: 'active', label: 'Active', icon: faFire },
                      { id: 'completed', label: 'Completed', icon: faCheckCircle }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedView(tab.id as any)}
                        className={`
                          flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 relative overflow-hidden
                          ${selectedView === tab.id 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-[1.02]' 
                            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:backdrop-blur-sm hover:scale-[1.01]'
                          }
                        `}
                      >
                        <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Financial Bento Grid Layout */}
              <motion.div 
                className="grid grid-cols-1 xl:grid-cols-4 gap-6"
                variants={itemVariants}
              >
                {/* Goals Section - Takes 3/4 width */}
                <div className="xl:col-span-3 space-y-6">
                  {/* Primary Goal (Hero) */}
                  {filteredGoals.length > 0 && (
                    <PrimaryGoalCard goal={filteredGoals[0]} onUpdate={refetch} />
                  )}
                  
                  {/* Secondary Goals Grid */}
                  {filteredGoals.length > 1 && (
                    <motion.div 
                      className="space-y-4"
                      variants={itemVariants}
                    >
                      <h3 className="text-title font-semibold text-gray-900 dark:text-white">
                        {selectedView === 'all' ? 'Other Goals' : 
                         selectedView === 'active' ? 'Active Goals' : 
                         'Completed Goals'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredGoals.slice(1).map((goal, index) => (
                          <SecondaryGoalCard 
                            key={goal.id} 
                            goal={goal} 
                            onUpdate={refetch}
                            index={index} 
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Activity Sidebar - Takes 1/4 width */}
                <div className="xl:col-span-1">
                  <motion.div
                    className="sticky top-6"
                    variants={itemVariants}
                  >
                    <RecentActivity />
                  </motion.div>
                </div>
              </motion.div>
            </>
          ) : (
            <EmptyGoalsState />
          )}
        </div>
      </motion.main>
    </>
  );
}

// Enhanced Primary Goal Card with 2025 Design System
const PrimaryGoalCard = memo(function PrimaryGoalCard({ 
  goal, 
  onUpdate 
}: { 
  goal: any; 
  onUpdate: () => void 
}) {
  if (!goal) return null;

  const progress = goal.current_amount && goal.target_amount 
    ? (goal.current_amount / goal.target_amount) * 100 
    : 0;
  
  const isOnTrack = progress >= 50;
  const daysUntilTarget = goal.target_date 
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-3xl"
      whileHover={{ 
        y: -4,
        transition: { 
          duration: 0.2,
          ease: [0.4, 0.0, 0.2, 1]
        }
      }}
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
        backdropFilter: "blur(20px) saturate(150%)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
      }}
    >
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50/10 to-purple-50/10 dark:from-transparent dark:via-blue-950/10 dark:to-purple-950/10" />
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-400/5 rounded-full blur-2xl" />
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-amber-500'} animate-pulse shadow-lg`}></div>
              <span className={`text-label font-semibold ${isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isOnTrack ? 'On Track' : 'Needs Attention'}
              </span>
              <div className="text-right ml-auto">
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            
            <motion.h2 
              className="text-headline font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200"
              style={{
                fontVariationSettings: "'wght' 600",
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                lineHeight: "1.2"
              }}
            >
              {goal.title}
            </motion.h2>
            
            <p className="text-body text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              {goal.description || 'Working towards your financial goal with smart milestones and AI insights.'}
            </p>
          </div>
        </div>

        {/* Enhanced Progress Visualization */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-label text-gray-600 dark:text-gray-400 mb-1">Current</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(goal.current_amount || 0).toLocaleString()}
                </p>
              </div>
              <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-label text-gray-600 dark:text-gray-400 mb-1">Target</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(goal.target_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Animated Progress Bar with Glass Effect */}
          <div className="relative h-4 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              initial={{ width: 0, scaleX: 0 }}
              animate={{ 
                width: `${progress}%`,
                scaleX: 1
              }}
              transition={{ 
                duration: 1.5, 
                delay: 0.3,
                ease: [0.25, 0.8, 0.5, 1]
              }}
              className={`h-full rounded-full ${
                isOnTrack 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-600'
              }`}
              style={{
                transformOrigin: "left center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-100/80 to-blue-200/80 dark:from-blue-900/50 dark:to-blue-800/50 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm">
              <FontAwesomeIcon icon={faCalendarAlt} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-label text-gray-600 dark:text-gray-400 mb-1">Time Left</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {daysUntilTarget > 0 ? `${daysUntilTarget} days` : 'Overdue'}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-green-100/80 to-green-200/80 dark:from-green-900/50 dark:to-green-800/50 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm">
              <FontAwesomeIcon icon={faDollarSign} className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-label text-gray-600 dark:text-gray-400 mb-1">Remaining</p>
            <p className="font-bold text-gray-900 dark:text-white">
              ${((goal.target_amount || 0) - (goal.current_amount || 0)).toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-purple-100/80 to-purple-200/80 dark:from-purple-900/50 dark:to-purple-800/50 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm">
              <FontAwesomeIcon icon={faBullseye} className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-label text-gray-600 dark:text-gray-400 mb-1">Milestones</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {goal.milestones?.length || 0}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            to={`/dashboard/tracker/${goal.id}`}
            className="flex-1 flex justify-center items-center h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl group"
          >
            <FontAwesomeIcon icon={faCirclePlay} className="mr-2 group-hover:scale-110 transition-transform" />
            Continue Goal
          </Link>
          
          <Link
            to={`/dashboard/tracker/${goal.id}`}
            className="flex justify-center items-center h-12 px-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all duration-200 border border-gray-200/50 dark:border-gray-600/50"
          >
            <FontAwesomeIcon icon={faChartLine} className="mr-2" />
            View Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
});

// Enhanced Secondary Goal Card with 2025 Design System
const SecondaryGoalCard = memo(function SecondaryGoalCard({ 
  goal, 
  onUpdate, 
  index = 0 
}: { 
  goal: any; 
  onUpdate: () => void;
  index?: number;
}) {
  const progress = goal.current_amount && goal.target_amount 
    ? (goal.current_amount / goal.target_amount) * 100 
    : 0;
  
  const isOnTrack = progress >= 50;
  const daysUntilTarget = goal.target_date 
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { 
          delay: index * 0.1,
          duration: 0.4,
          ease: [0.15, 0.8, 0.4, 1]
        }
      }}
      whileHover={{ 
        y: -3,
        transition: { 
          duration: 0.2,
          ease: [0.4, 0.0, 0.2, 1]
        }
      }}
      className="group overflow-hidden rounded-2xl cursor-pointer"
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(59, 130, 246, 0.03) 100%)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)"
      }}
    >
      <Link to={`/dashboard/tracker/${goal.id}`} className="block p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-amber-500'} shadow-sm`}></div>
                <span className={`text-xs font-semibold ${isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {isOnTrack ? 'On Track' : 'Behind'}
                </span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round(progress)}%
              </span>
            </div>
            
            <h3 className="text-title font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200 mb-2">
              {goal.title}
            </h3>
            
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{goal.milestones?.length || 0} milestones</span>
              <span>
                Due {goal.target_date 
                  ? new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) 
                  : 'No deadline'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ 
                duration: 1.2, 
                delay: 0.2 + (index * 0.1),
                ease: [0.25, 0.8, 0.5, 1]
              }}
              className={`h-full rounded-full ${
                isOnTrack 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-600'
              }`}
            />
          </div>
        </div>

        {/* Financial Info */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-xs">Current</p>
            <p className="font-bold text-gray-900 dark:text-white">
              ${(goal.current_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 dark:text-gray-400 text-xs">Target</p>
            <p className="font-bold text-gray-900 dark:text-white">
              ${(goal.target_amount || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 mt-3 border-t border-gray-200/30 dark:border-gray-700/30">
          <span>
            Started {goal.created_at 
              ? new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
              : 'Recently'
            }
          </span>
          <span>
            {daysUntilTarget > 0 
              ? `${daysUntilTarget} days left`
              : daysUntilTarget === 0 
              ? 'Due today'
              : `${Math.abs(daysUntilTarget)} days overdue`
            }
          </span>
        </div>
      </Link>
    </motion.div>
  );
});

// Enhanced Empty State with 2025 Design System
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
          className="text-headline font-bold text-gray-900 dark:text-white mb-4 leading-tight"
          style={{
            fontVariationSettings: "'wght' 700",
            fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
          }}
        >
          Start Your Financial Journey
        </motion.h2>
        
        <motion.p 
          className="text-body text-gray-600 dark:text-gray-400 mb-12 leading-relaxed max-w-md mx-auto"
          style={{
            fontSize: "1.125rem",
            lineHeight: "1.6"
          }}
        >
          Transform your financial dreams into achievable goals with AI-powered strategies, smart milestones, and progress tracking.
        </motion.p>

        {/* Enhanced Benefits Grid */}
        <div className="grid grid-cols-3 gap-8 mb-12" role="list" aria-label="Goal tracker benefits">
          {[
            { icon: faWandSparkles, label: 'AI Strategy', color: 'from-blue-500 to-blue-600' },
            { icon: faBullseye, label: 'Smart Milestones', color: 'from-green-500 to-emerald-600' },
            { icon: faUpLong, label: 'Track Progress', color: 'from-purple-500 to-purple-600' }
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
              <p className="text-label font-semibold text-gray-700 dark:text-gray-300">
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
            <button className="group h-14 px-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl border-0 font-bold text-lg rounded-2xl transition-all duration-300" aria-label="Create your first financial goal">
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

// Enhanced Loading Skeleton with 2025 Design System
const GoalsLoadingSkeleton = memo(function GoalsLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/10" role="main" aria-label="Loading goal tracker data">
      <div aria-live="polite" aria-label="Loading your goals">
        <span className="sr-only">Loading your financial goals, please wait...</span>
      </div>
      
      {/* Hero Skeleton */}
      <div className="px-6 py-12 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="h-16 bg-gray-200/60 dark:bg-gray-700/60 rounded-2xl animate-pulse backdrop-blur-sm"></div>
              <div className="h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded-xl w-3/4 animate-pulse backdrop-blur-sm"></div>
              <div className="flex gap-4">
                <div className="h-12 w-48 bg-gray-200/60 dark:bg-gray-700/60 rounded-xl animate-pulse backdrop-blur-sm"></div>
                <div className="h-12 w-36 bg-gray-200/60 dark:bg-gray-700/60 rounded-xl animate-pulse backdrop-blur-sm"></div>
              </div>
            </div>
            <div className="w-80 h-64 bg-white/40 dark:bg-gray-800/40 rounded-2xl animate-pulse backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-6">
        {/* Filter Skeleton */}
        <div className="h-14 w-72 bg-white/40 dark:bg-gray-800/40 rounded-2xl animate-pulse backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30"></div>
        
        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            {/* Primary Goal Skeleton */}
            <div className="h-80 bg-white/40 dark:bg-gray-800/40 rounded-3xl animate-pulse backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30"></div>
            
            {/* Secondary Goals Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-white/40 dark:bg-gray-800/40 rounded-2xl animate-pulse backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30"></div>
              ))}
            </div>
          </div>
          
          {/* Sidebar Skeleton */}
          <div className="xl:col-span-1">
            <div className="h-96 bg-white/40 dark:bg-gray-800/40 rounded-2xl animate-pulse backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30"></div>
          </div>
        </div>
      </div>
    </main>
  );
});

// Enhanced Error State with 2025 Design System
const ErrorState = memo(function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/10 flex items-center justify-center" role="main">
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
        
        <h2 className="text-headline font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          Failed to Load Goals
        </h2>
        
        <p className="text-body text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          {error?.message || 'Something went wrong while loading your goals. Please try again.'}
        </p>
        
        <div role="alert" aria-live="polite" className="sr-only">
          Error loading goals: {error?.message || 'Unknown error occurred'}
        </div>
        
        <motion.button 
          onClick={handleRetry}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg border-0 font-semibold rounded-xl transition-all duration-200"
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