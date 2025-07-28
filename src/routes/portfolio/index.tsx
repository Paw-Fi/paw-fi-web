import React, { useState, useMemo } from 'react';
import { createFileRoute, useRouter, useSearch, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullseye,
  faPlus,
  faChartLine,
  faDollarSign,
  faChartBar,
  faArrowRight,
  faTimes,
  faGraduationCap,
  faHome,
  faShield,
  faStar,
  faCheckCircle,
  faExclamationTriangle,
  faLightbulb,
  faRocket,
  faClock,
  faHeart,
  faFire,
  faCrown,
  faArrowUp,
  faPlayCircle,
  faBrain,
  faQuestionCircle,
  faBriefcaseMedical,
  faCar,
  faHouse,
  faPiggyBank,
  faUmbrellaBeach,
  faCreditCard,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription as usePortfolioSubscription } from '@/hooks/use-subscription';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AIPortfolioDisplay } from '@/components/portfolio/AIPortfolioDisplay';
import { AICoachingInterface } from '@/components/portfolio/AICoachingInterface';
import { RealTimeRecommendations } from '@/components/portfolio/RealTimeRecommendations';
import { ValuePropositionCard } from '@/components/portfolio/ValuePropositionCard';

// Local Type Definitions
interface FinancialGoal {
  id: string;
  user_id: string;
  goal_type: string;
  title: string; 
  description: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number | null;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
}

// Route Definition
export const Route = createFileRoute('/portfolio/')({
  component: ModernPortfolioDashboard,
});

// Local Data Fetching Function
async function fetchUserGoals(userId: string): Promise<FinancialGoal[]> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching financial goals:", error);
    throw error;
  }

  return data || [];
}

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// Main Dashboard Component
function ModernPortfolioDashboard() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { subscription } = usePortfolioSubscription(user?.id);
  console.log('Subscription:', subscription);
  const userTier = subscription?.plan|| 'free';
  const search = useSearch({ from: Route.id }) as { new?: string };

  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const { data: goals, isLoading: isGoalsLoading, error } = useQuery<FinancialGoal[]>({
    queryKey: ['user-goals', user?.id],
    queryFn: () => fetchUserGoals(user!.id),
    enabled: !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  React.useEffect(() => {
    if (error) {
      console.error('Failed to fetch user goals:', error);
      toast.error(
        <div>
          <p className="font-bold">Failed to load goals</p>
          <p className="text-sm">Please try again later.</p>
        </div>
      );
    }
  }, [error]);

  const activeGoal = useMemo(() => {
    if (!goals) return null;
    return goals?.find(g => g.id === activeGoalId) || goals?.[0] || null;
  }, [goals, activeGoalId]);

  React.useEffect(() => {
    if (goals && goals.length > 0 && !activeGoalId) {
      setActiveGoalId(goals[0].id);
    }
  }, [goals, activeGoalId]);

  if (authIsLoading || isGoalsLoading) {
    return <ModernLoadingSkeleton />;
  }

  if (!user) {
    router.navigate({ to: '/login', search: { redirect: '/portfolio' } });
    return null;
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <motion.div 
          className="text-center p-8 max-w-lg"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <FontAwesomeIcon icon={faBullseye} className="text-6xl text-purple-500 mb-6" />
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Start Your Financial Journey</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Create your first financial goal to unlock your personalized AI-powered portfolio.
            </p>
            <Link to={'/portfolio/goal/new' as any}>
              <Button size="lg">
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Create First Goal
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-1/3 xl:w-1/4">
            <PortfolioSummary
              goals={goals}
              onSelectGoal={setActiveGoalId}
              activeGoalId={activeGoalId}
            />
          </aside>

          <main className="w-full lg:w-2/3 xl:w-3/4 space-y-8">
            {activeGoal ? (
              <>
                <AIPortfolioDisplay userId={user.id} goalId={activeGoal.id} userTier={userTier} />
                <AICoachingInterface userId={user.id} goalId={activeGoal.id} userTier={userTier} />
                <RealTimeRecommendations userId={user.id} goalId={activeGoal.id} userTier={userTier} />
              </>
            ) : (
              <Card className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FontAwesomeIcon icon={faArrowUp} className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold">Select a Goal</h3>
                  <p className="text-gray-500">Choose a goal to see your AI-powered analysis.</p>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <ValuePropositionCard userTier={userTier} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PortfolioSummary({ 
  goals, 
  onSelectGoal,
  activeGoalId
}: {
  goals: FinancialGoal[];
  onSelectGoal: (id: string) => void;
  activeGoalId: string | null;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-content flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Your Goals</h2>
        <Button variant="text" size="sm" onClick={() => onSelectGoal('')}>
          Overview
        </Button>
      </div>
      <div className="overflow-y-auto -mr-2 pr-2 space-y-2">
        {goals.map(goal => {
          const isActive = goal.id === activeGoalId;
          const progress = (goal.current_amount / goal.target_amount) * 100;
          return (
            <motion.div
              key={goal.id}
              variants={itemVariants}
              layoutId={`goal-card-${goal.id}`}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-all duration-200 border-2',
                isActive 
                  ? 'bg-purple-50 border-purple-500 shadow-md dark:bg-purple-900/30 dark:border-purple-600'
                  : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-700/50 dark:hover:bg-gray-700'
              )}
              onClick={() => onSelectGoal(goal.id)}
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', isActive ? 'bg-purple-100 dark:bg-purple-800' : 'bg-gray-200 dark:bg-gray-600')}>
                  {getGoalIcon(goal.goal_type, isActive)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className={cn('font-semibold', isActive ? 'text-purple-800 dark:text-purple-200' : 'text-gray-800 dark:text-gray-100')}>
                      {goal.title}
                    </h3>
                    <p className={cn('text-xs font-mono', isActive ? 'text-purple-600' : 'text-gray-500 dark:text-gray-400')}>
                      {getTimeRemaining(goal.target_date)}
                    </p>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-1.5 mt-1 bg-gray-200 dark:bg-gray-600"
                    indicatorClassName={isActive ? 'bg-purple-500' : 'bg-gray-400 dark:bg-gray-300'}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link to={'/portfolio/goal/new' as any} className="w-full">
          <Button variant="outline" className="w-full">
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            New Goal
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function getTimeRemaining(targetDate: string): string {
  const now = new Date();
  const target = new Date(targetDate);
  const diffInMs = target.getTime() - now.getTime();

  if (diffInMs <= 0) {
    return "Goal Reached";
  }

  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
  if (diffInDays < 1) {
    return "Today";
  }
  if (diffInDays < 30) {
    return `${Math.ceil(diffInDays)}d left`;
  }

  const diffInMonths = diffInDays / 30.44; // Average days in a month
  if (diffInMonths < 12) {
    return `${Math.ceil(diffInMonths)}mo left`;
  }

  const diffInYears = diffInDays / 365.25;
  const roundedYears = Math.round(diffInYears * 10) / 10;
  return `~${roundedYears}y left`;
}

function getGoalIcon(goalType: string, isActive: boolean): JSX.Element {
  const iconClass = "w-4 h-4";
  const activeClass = "text-purple-600";
  const inactiveClass = "text-gray-400";

  const icons: { [key: string]: IconDefinition } = {
    'house': faHouse,
    'car': faCar,
    'vacation': faUmbrellaBeach,
    'education': faGraduationCap,
    'investment': faChartLine,
    'retirement': faPiggyBank,
    'debt': faCreditCard,
    'emergency': faBriefcaseMedical,
    'default': faStar,
  };

  const icon = icons[goalType] || icons['default'];
  return <FontAwesomeIcon icon={icon} className={`${iconClass} ${isActive ? activeClass : inactiveClass}`} />;
}

function ModernLoadingSkeleton() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header skeleton */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-80 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-96 animate-pulse" />
              </div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        {/* Goal tabs skeleton */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-4" />
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-80 h-24 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Main content skeleton */}
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}