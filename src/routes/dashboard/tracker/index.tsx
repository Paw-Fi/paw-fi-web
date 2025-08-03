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
  faCalendarAlt, 
  faDollarSign, 
  faArrowRight,
  faBullseye,
  faWandSparkles,
  faCheckCircle,
  faEllipsisH,
  faFilter,
  faHome,
  faPlane,
  faCar,
  faGraduationCap,
  faHeart,
  faRocket,
  faChartBar,
  faCreditCard,
  faShieldAlt
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";
import { memo, useCallback, useState, useMemo } from "react";
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

  if (isLoading) {
    return <GoalsLoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const hasGoals = goals && goals.length > 0;
  
  const getGoalStatus = (goal: any) => {
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
  
  const sortedGoals = useMemo(() => {
    if (!goals) return [];
    
    return goals.sort((a, b) => {
      if (!a.target_date && !b.target_date) return 0;
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
    });
  }, [goals]);
  
  const spotlightGoals = useMemo(() => {
    if (!goals || goals.length === 0) return [];
    
    const activeGoals = goals.filter(goal => goal.status !== 'completed');
    if (activeGoals.length === 0) return [];
    
    const currentDate = new Date();
    const spotlightCandidates = activeGoals.map(goal => {
      const progress = goal.current_amount && goal.target_amount 
        ? (goal.current_amount / goal.target_amount) * 100 
        : 0;
      
      const daysUntilTarget = goal.target_date 
        ? Math.ceil((new Date(goal.target_date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      
      // Calculate expected progress based on time elapsed
      const totalDays = goal.target_date && goal.created_at
        ? Math.ceil((new Date(goal.target_date).getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 365; // Default to 1 year if no creation date
      
      const elapsedDays = goal.created_at
        ? Math.ceil((currentDate.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const expectedProgress = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
      const progressDeficit = expectedProgress - progress;
      
      // Calculate spotlight priority score
      let spotlightScore = 0;
      let spotlightType = 'progress';
      let spotlightReason = '';
      
      // Critical urgency: Less than 7 days remaining
      if (daysUntilTarget <= 7 && daysUntilTarget > 0) {
        spotlightScore = 100;
        spotlightType = 'critical';
        spotlightReason = `Only ${daysUntilTarget} day${daysUntilTarget === 1 ? '' : 's'} remaining`;
      }
      // High urgency: Less than 30 days remaining
      else if (daysUntilTarget <= 30 && daysUntilTarget > 7) {
        spotlightScore = 80;
        spotlightType = 'urgency';
        spotlightReason = `${daysUntilTarget} days until target date`;
      }
      // Behind schedule: Progress deficit > 20%
      else if (progressDeficit > 20) {
        spotlightScore = 70;
        spotlightType = 'attention';
        spotlightReason = `${Math.round(progressDeficit)}% behind expected progress`;
      }
      // Moderate urgency: Less than 90 days remaining
      else if (daysUntilTarget <= 90 && daysUntilTarget > 30) {
        spotlightScore = 60;
        spotlightType = 'upcoming';
        spotlightReason = `${Math.round(daysUntilTarget / 30)} month${Math.round(daysUntilTarget / 30) === 1 ? '' : 's'} remaining`;
      }
      // Good progress: Ahead of schedule
      else if (progressDeficit < -10 && progress > 10) {
        spotlightScore = 50;
        spotlightType = 'success';
        spotlightReason = `${Math.round(Math.abs(progressDeficit))}% ahead of schedule`;
      }
      // Recently started: Less than 10% progress but recent activity
      else if (progress < 10 && progress > 0) {
        spotlightScore = 40;
        spotlightType = 'momentum';
        spotlightReason = 'Building momentum - keep it up!';
      }
      // Stagnant: No progress in a while
      else if (progress === 0 && elapsedDays > 30) {
        spotlightScore = 30;
        spotlightType = 'stagnant';
        spotlightReason = 'No progress yet - time to take action';
      }
      
      return {
        ...goal,
        progress,
        daysUntilTarget,
        progressDeficit,
        spotlightScore,
        spotlightType,
        spotlightReason
      };
    });
    
    // Sort by spotlight score (highest first) and select top 1-3
    const selectedSpotlights = spotlightCandidates
      .filter(goal => goal.spotlightScore > 0)
      .sort((a, b) => {
        // Primary sort: spotlight score
        if (b.spotlightScore !== a.spotlightScore) {
          return b.spotlightScore - a.spotlightScore;
        }
        // Secondary sort: closest target date
        if (a.daysUntilTarget !== b.daysUntilTarget) {
          return a.daysUntilTarget - b.daysUntilTarget;
        }
        // Tertiary sort: highest target amount (more significant goals)
        return (b.target_amount || 0) - (a.target_amount || 0);
      })
      .slice(0, 3); // Maximum 3 spotlight cards
    
    return selectedSpotlights;
  }, [goals]);
  
  const statsData = useMemo(() => {
    if (!goals || goals.length === 0) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        onTrackPercentage: 0
      };
    }
    
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
  
  const getGoalIcon = (goal: any) => {
    // First check if goal has a type property for exact matching
    if (goal.type) {
      switch (goal.type) {
        case 'retirement': return faRocket;
        case 'home_buying': return faHome;
        case 'wealth': return faChartLine;
        case 'investment': return faChartBar;
        case 'debt_payoff': return faCreditCard;
        case 'emergency_fund': return faShieldAlt;
        case 'custom': return faBullseye;
        default: break;
      }
    }
    
    // Fallback to title-based matching for legacy goals
    const titleLower = goal.title?.toLowerCase() || '';
    if (titleLower.includes('retirement') || titleLower.includes('future')) return faRocket;
    if (titleLower.includes('home') || titleLower.includes('house') || titleLower.includes('buying')) return faHome;
    if (titleLower.includes('wealth') || titleLower.includes('rich')) return faChartLine;
    if (titleLower.includes('invest') || titleLower.includes('stock') || titleLower.includes('portfolio')) return faChartBar;
    if (titleLower.includes('debt') || titleLower.includes('loan') || titleLower.includes('payoff')) return faCreditCard;
    if (titleLower.includes('emergency') || titleLower.includes('fund') || titleLower.includes('safety')) return faShieldAlt;
    if (titleLower.includes('travel') || titleLower.includes('vacation')) return faPlane;
    if (titleLower.includes('car') || titleLower.includes('vehicle')) return faCar;
    if (titleLower.includes('education') || titleLower.includes('school')) return faGraduationCap;
    if (titleLower.includes('wedding') || titleLower.includes('marriage')) return faHeart;
    return faBullseye;
  };

  return (
    <motion.main 
      className="min-h-screen bg-gray-50" 
      role="main" 
      aria-label="Goals Dashboard"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Skip to main content link for keyboard navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-purple-600 text-white px-4 py-2 rounded-md z-50 font-medium"
      >
        Skip to main content
      </a>

      {/* Clean Header inspired by the design */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Goals
              </h1>
              <p className="text-gray-500 text-lg">
                Track your financial goals with AI-powered insights
              </p>
            </div>
            <Link to="/dashboard/tracker/create">
              <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg">
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                Create Goal
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="main-content" className="max-w-6xl mx-auto px-6 py-8 space-y-8" tabIndex={-1}>
        {hasGoals ? (
          <>
            <SpotlightSection 
              spotlightGoals={spotlightGoals}
              getGoalIcon={getGoalIcon}
              getGoalStatus={getGoalStatus}
            />
            
            <StatsBar stats={statsData} />
            
            <CommandCenter 
              goals={sortedGoals}
              getGoalStatus={getGoalStatus}
              onUpdate={refetch}
            />
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
  getGoalIcon, 
  getGoalStatus 
}: {
  spotlightGoals: any[];
  getGoalIcon: (goal: any) => any;
  getGoalStatus: (goal: any) => string;
}) {
  if (!spotlightGoals || spotlightGoals.length === 0) return null;
  
  // Determine grid layout based on number of cards
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid grid-cols-1 max-w-md mx-auto';
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-6';
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };
  
  return (
    <motion.section 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Spotlight</h2>
      <div className={getGridClass(spotlightGoals.length)}>
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
  const getCardBackground = (goalType: string, spotlightType: string) => {
    // Primary colors based on goal type
    const goalTypeColors = {
      'retirement': 'bg-gradient-to-br from-purple-200 to-purple-300',
      'home_buying': 'bg-gradient-to-br from-blue-200 to-blue-300', 
      'wealth': 'bg-gradient-to-br from-green-200 to-green-300',
      'investment': 'bg-gradient-to-br from-indigo-200 to-indigo-300',
      'debt_payoff': 'bg-gradient-to-br from-red-200 to-red-300',
      'emergency_fund': 'bg-gradient-to-br from-orange-200 to-orange-300',
      'custom': 'bg-gradient-to-br from-gray-200 to-gray-300'
    };
    
    // Override with spotlight urgency colors if critical
    if (spotlightType === 'critical') {
      return 'bg-gradient-to-br from-red-300 to-red-400';
    }
    if (spotlightType === 'urgency') {
      return 'bg-gradient-to-br from-orange-300 to-orange-400';
    }
    
    return goalTypeColors[goalType as keyof typeof goalTypeColors] || goalTypeColors.custom;
  };
  
  // Get decorative elements based on goal type
  const getDecorativeElements = (goalType: string) => {
    const decorativeMap = {
      'retirement': ['🚀', '⭐', '✨', '●', '✦'],
      'home_buying': ['🏠', '⭐', '●', '✦'],
      'wealth': ['💎', '⭐', '✨', '●'],
      'investment': ['📈', '⭐', '●', '✦'],
      'debt_payoff': ['💳', '⚡', '●', '✦'],
      'emergency_fund': ['🛡️', '⭐', '●', '✦'],
      'custom': ['🎯', '⭐', '●', '✦']
    };
    
    const elements = decorativeMap[goalType as keyof typeof decorativeMap] || decorativeMap.custom;
    return elements.slice(0, 4); // Limit to 4 elements
  };
  
  const cardBackground = getCardBackground(goal.type || 'custom', type);
  const decorativeElements = getDecorativeElements(goal.type || 'custom');
  
  return (
    <Link to={`/dashboard/tracker/${goal.id}`}>
      
      <motion.div 
        className={`relative overflow-hidden bg-[#d6cffe] rounded-3xl h-40 p-8 cursor-pointer transition-all duration-300 hover:shadow-lg ${cardBackground}`}
        whileHover={{ y: -2, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ backgroundImage: `url(${travelBgImage})`, backgroundSize: '80%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
      >
        {/* Decorative Elements */}
        {/* <div className="absolute top-4 right-6 text-2xl opacity-30">{decorativeElements[0]}</div>
        <div className="absolute top-8 right-12 text-sm opacity-25">{decorativeElements[1]}</div>
        <div className="absolute bottom-6 left-6 text-lg opacity-20">{decorativeElements[2]}</div>
        <div className="absolute bottom-4 right-8 text-xs opacity-25">{decorativeElements[3]}</div>
         */}
        <div className="relative z-10">
          {/* Large Icon */}
          {/* <div className="mb-6">
            <div className="w-16 h-16 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <FontAwesomeIcon icon={icon} className="w-8 h-8 text-gray-700" />
            </div>
          </div> */}
          
          {/* Main Content */}
          <div className="space-y-2 pt-6">
            {/* Days Display */}
            <div className="text-4xl font-bold text-gray-900 text-right">
              {daysUntilTarget > 0 ? `${daysUntilTarget} Days` : daysUntilTarget === 0 ? 'Due Today' : 'Overdue'}
            </div>
            
            {/* Goal Title */}
            <div className="text-gray-800 font-medium text-lg leading-tight text-right pl-24 line-clamp-2 text-ellipsis">
              Until {goal.title}
            </div>
            
            {/* Additional Info for certain types */}
            {(type === 'attention' || type === 'stagnant') && (
              <div className="text-sm text-gray-700 font-medium mt-3">
                {reason || 'Next Milestone:'}
              </div>
            )}
          </div>
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
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500'
    },
    { 
      label: 'Active Goals', 
      value: stats.activeGoals, 
      icon: faChartLine,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500'
    },
    { 
      label: 'Completed Goals', 
      value: stats.completedGoals, 
      icon: faTrophy,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500'
    },
    { 
      label: 'Overall Progress', 
      value: `${stats.onTrackPercentage}%`, 
      icon: faCheckCircle,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-500',
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
          className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-lg transition-all duration-300"
          whileHover={{ y: -2 }}
        >
          <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
            <FontAwesomeIcon icon={stat.icon} className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {stat.label}
          </div>
          {stat.subtitle && (
            <div className="text-xs text-gray-500 mt-1">
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
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Goals</h2>
      </div>
      
      {/* Goals List */}
      <div className="divide-y divide-gray-100">
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faFilter} className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No goals match your current filter</p>
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
  
  const getGoalIcon = (title: string) => {
    const titleLower = title?.toLowerCase() || '';
    if (titleLower.includes('home') || titleLower.includes('house')) return faHome;
    if (titleLower.includes('travel') || titleLower.includes('vacation') || titleLower.includes('trip')) return faPlane;
    if (titleLower.includes('car') || titleLower.includes('vehicle')) return faCar;
    if (titleLower.includes('education') || titleLower.includes('school')) return faGraduationCap;
    if (titleLower.includes('wedding') || titleLower.includes('marriage')) return faHeart;
    if (titleLower.includes('retirement') || titleLower.includes('future')) return faRocket;
    return faBullseye; // Default
  };
  
  return (
    <Link to={`/dashboard/tracker/${goal.id}`}>
      <motion.div 
        className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
        whileHover={{ x: 4 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon 
              icon={getGoalIcon(goal.title)} 
              className="w-6 h-6 text-gray-600" 
            />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {goal.title}
              </h3>
              <span className="text-lg font-bold text-gray-900 ml-4">
                {Math.round(progress)}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
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