import React, { useState, useMemo } from 'react';
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GoalSelector } from '@/components/portfolio/GoalSelector';
import { AICoachingInterface } from '@/components/portfolio/AICoachingInterface';
import { AIPortfolioDisplay } from '@/components/portfolio/AIPortfolioDisplay';
import { RealTimeRecommendations } from '@/components/portfolio/RealTimeRecommendations';
import { PortfolioDisclaimer } from '@/components/portfolio/ComplianceDisclaimer';
import { DashboardValueProp } from '@/components/portfolio/ValuePropositionCard';
import { useAuth } from '@/hooks/useAuth';
import { usePortfolioSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
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
  faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import IntelligentPortfolioDashboard from '@/components/portfolio/IntelligentPortfolioDashboard';
import TransparentDecisionInterface from '@/components/portfolio/TransparentDecisionInterface';

interface FinancialGoal {
  id: string;
  goal_type: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number;
  status: string;
  created_at: string;
}

export const Route = createFileRoute('/portfolio/')({
  component: ModernPortfolioDashboard,
});

async function fetchUserGoals(userId: string): Promise<FinancialGoal[]> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
    
  if (error) {
    throw error;
  }
  
  return data || [];
}

// Animation variants for smooth transitions
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1 
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

const slideVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

function ModernPortfolioDashboard() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tier: userTier } = usePortfolioSubscription();
  const search = useSearch({ from: '/portfolio/' }) as { new?: string };
  
  // Active goal selection state
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['user-goals', user?.id],
    queryFn: () => fetchUserGoals(user!.id),
    enabled: !!user?.id
  });

  // Set default active goal when goals load
  React.useEffect(() => {
    if (goals && goals.length > 0 && !activeGoalId) {
      setActiveGoalId(goals[0].id);
    }
  }, [goals, activeGoalId]);

  const activeGoal = useMemo(() => 
    goals?.find(goal => goal.id === activeGoalId) || null, 
    [goals, activeGoalId]
  );

  const handleRetryGoals = () => {
    queryClient.invalidateQueries({ queryKey: ['user-goals', user?.id] });
  };

  // Redirect to auth if not logged in
  if (!user && !authIsLoading) {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/login/?redirect=' + encodeURIComponent('/portfolio');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback using router if window.location fails
      router.navigate({ to: '/login', search: { redirect: '/portfolio' } });
    }
    return null;
  }

  // Show goal selector if no goals exist or if new=true in query params
  if (!isLoading && ((!goals || goals.length === 0) || search.new === 'true')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8">
          <GoalSelector />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <ModernLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="container mx-auto py-8">
          <Card className="p-8 text-center max-w-md mx-auto border-red-200 bg-red-50">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-red-800">Unable to Load Portfolio</h3>
            <p className="text-red-600 mb-4">
              We couldn't load your financial goals. Please try again.
            </p>
            <Button onClick={handleRetryGoals} className="bg-red-600 hover:bg-red-700">
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const handleAddNewGoal = () => {
    router.navigate({ to: '/portfolio', search: { new: 'true' } });
  };

  // If user has goals, show the intelligent dashboard
  if (activeGoal) {
    return (
      <IntelligentPortfolioDashboard 
        goalId={activeGoal.id}
        layout="adaptive"
        personalizeLayout={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div 
        className="container mx-auto py-6 space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Modern Header with CTA */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faRocket} className="w-8 h-8 text-blue-200" />
                    <h1 className="text-3xl font-bold">Your Financial Journey</h1>
                  </div>
                  <p className="text-blue-100 text-lg max-w-2xl">
                    AI-powered portfolio management tailored to achieve your dreams. 
                    Track progress, get insights, and stay on course.
                  </p>
                  {showOnboarding && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-blue-700/30 rounded-lg p-4 mt-4 border border-blue-400/30"
                    >
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yellow-300 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-100">Getting Started</h4>
                          <p className="text-blue-200 text-sm mt-1">
                            Select a goal below to view its AI-generated portfolio, live recommendations, 
                            and chat with your personal financial coach.
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowOnboarding(false)}
                          className="text-blue-300 hover:text-white ml-auto"
                        >
                          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!showOnboarding && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOnboarding(true)}
                      className="text-blue-200 hover:text-white hover:bg-blue-700/30 border-blue-400/50"
                    >
                      <FontAwesomeIcon icon={faQuestionCircle} className="w-4 h-4 mr-2" />
                      Help
                    </Button>
                  )}
                  <Button 
                    onClick={handleAddNewGoal}
                    className="bg-transparent text-blue-600 font-semibold shadow-lg"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
                    Add New Goal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compliance Disclaimer */}
        <motion.div variants={itemVariants}>
          <PortfolioDisclaimer />
        </motion.div>

        {/* Value Proposition Card */}
        <motion.div variants={itemVariants}>
          <DashboardValueProp userTier={userTier as 'free' | 'premium' | 'plus'} />
        </motion.div>

        {/* Goal Selection Tabs */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FontAwesomeIcon icon={faBullseye} className="w-5 h-5 text-blue-600" />
                  Your Financial Goals
                </h2>
                <Badge variant="outline" className="text-sm">
                  {goals?.length || 0} Active {goals?.length === 1 ? 'Goal' : 'Goals'}
                </Badge>
              </div>

              {/* Goal Navigation Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {goals?.map((goal) => {
                  const isActive = activeGoalId === goal.id;
                  const progressPercentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                  const icon = getGoalIcon(goal.goal_type);
                  
                  return (
                    <motion.button
                      key={goal.id}
                      onClick={() => setActiveGoalId(goal.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left min-w-[280px] ${
                        isActive 
                          ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                      whileHover={{ scale: isActive ? 1.05 : 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", duration: 0.5 }}
                        >
                          <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                      
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                            {goal.title}
                          </h3>
                          <p className={`text-sm truncate ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                            ${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}
                          </p>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className={isActive ? 'text-blue-600' : 'text-gray-500'}>
                                {Math.round(progressPercentage)}% complete
                              </span>
                              <span className={isActive ? 'text-blue-600' : 'text-gray-500'}>
                                {getTimeRemaining(goal.target_date)}
                              </span>
                            </div>
                            <Progress 
                              value={progressPercentage} 
                              className={`h-1.5 ${isActive ? 'bg-blue-200' : 'bg-gray-200'}`} 
                            />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Quick Stats for Active Goal */}
              {activeGoal && (
                <motion.div
                  key={activeGoal.id}
                  initial="hidden"
                  animate="visible"
                  variants={slideVariants}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl"
                >
                  <StatCard
                    icon={faDollarSign}
                    label="Current Value"
                    value={`$${activeGoal.current_amount.toLocaleString()}`}
                    color="text-green-600"
                  />
                  <StatCard
                    icon={faBullseye}
                    label="Target Amount"
                    value={`$${activeGoal.target_amount.toLocaleString()}`}
                    color="text-blue-600"
                  />
                  <StatCard
                    icon={faArrowUp}
                    label="Monthly Contribution"
                    value={`$${activeGoal.monthly_contribution.toLocaleString()}`}
                    color="text-purple-600"
                  />
                  <StatCard
                    icon={faClock}
                    label="Time Remaining"
                    value={getTimeRemaining(activeGoal.target_date)}
                    color="text-orange-600"
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Area - Only show if we have an active goal */}
        {activeGoal && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeGoal.id}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={slideVariants}
              className="space-y-6"
            >
              {/* AI Portfolio Display */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FontAwesomeIcon icon={faStar} className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">AI-Generated Portfolio</CardTitle>
                          <CardDescription>
                            Personalized investment strategy for {activeGoal.title}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-sm font-medium">
                        <FontAwesomeIcon icon={faCrown} className="w-3 h-3 mr-1" />
                        {userTier === 'free' ? 'Free' : userTier === 'premium' ? 'Premium' : 'Premium Pro'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AIPortfolioDisplay 
                      userId={user!.id} 
                      goalId={activeGoal.id}
                      userTier={userTier as 'free' | 'premium' | 'plus'}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Real-time Portfolio Recommendations */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FontAwesomeIcon icon={faFire} className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Live Portfolio Insights</CardTitle>
                          <CardDescription>
                            Real-time AI recommendations to optimize your portfolio
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-sm font-medium bg-green-50 text-green-700 border-green-200">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Live Updates
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <RealTimeRecommendations 
                      userId={user!.id} 
                      goalId={activeGoal.id}
                      userTier={userTier as 'free' | 'premium' | 'plus'}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* AI Coaching Interface */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FontAwesomeIcon icon={faHeart} className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">AI Financial Coach</CardTitle>
                          <CardDescription>
                            Get personalized guidance and insights for {activeGoal.title}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-sm font-medium">
                        <FontAwesomeIcon icon={faPlayCircle} className="w-3 h-3 mr-1" />
                        Interactive Chat
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AICoachingInterface 
                      userId={user!.id} 
                      goalId={activeGoal.id}
                      userTier={userTier as 'free' | 'premium' | 'plus'}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Portfolio Summary */}
        <motion.div variants={itemVariants}>
          <PortfolioSummary goals={goals || []} />
        </motion.div>
      </motion.div>
    </div>
  );
}

// Helper Components

function StatCard({ icon, label, value, color }: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center p-3">
      <FontAwesomeIcon icon={icon} className={`w-5 h-5 ${color} mb-2`} />
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className={`font-bold text-sm ${color}`}>{value}</p>
    </div>
  );
}

function PortfolioSummary({ goals }: { goals: FinancialGoal[] }) {
  const stats = useMemo(() => {
    if (!goals || goals.length === 0) {
      return {
        totalGoals: 0,
        totalTarget: 0,
        currentValue: 0,
        monthlyContributions: 0,
        totalProgress: 0
      };
    }
    
    const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
    const currentValue = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
    
    return {
      totalGoals: goals.length,
      totalTarget,
      currentValue,
      monthlyContributions: goals.reduce((sum, goal) => sum + goal.monthly_contribution, 0),
      totalProgress: totalTarget > 0 ? (currentValue / totalTarget) * 100 : 0
    };
  }, [goals]);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <FontAwesomeIcon icon={faChartBar} className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Portfolio Overview</CardTitle>
            <CardDescription>
              Your complete financial journey at a glance
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <FontAwesomeIcon icon={faBullseye} className="w-8 h-8 text-blue-600 mb-3" />
            <p className="text-sm text-blue-700 mb-1">Active Goals</p>
            <p className="text-3xl font-bold text-blue-900">{stats.totalGoals}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <FontAwesomeIcon icon={faDollarSign} className="w-8 h-8 text-green-600 mb-3" />
            <p className="text-sm text-green-700 mb-1">Current Value</p>
            <p className="text-3xl font-bold text-green-900">${stats.currentValue.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <FontAwesomeIcon icon={faArrowUp} className="w-8 h-8 text-purple-600 mb-3" />
            <p className="text-sm text-purple-700 mb-1">Monthly Contributions</p>
            <p className="text-3xl font-bold text-purple-900">${stats.monthlyContributions.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
            <FontAwesomeIcon icon={faChartLine} className="w-8 h-8 text-orange-600 mb-3" />
            <p className="text-sm text-orange-700 mb-1">Overall Progress</p>
            <p className="text-3xl font-bold text-orange-900">{Math.round(stats.totalProgress)}%</p>
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Overall Portfolio Progress</span>
            <span className="font-medium text-gray-900">{Math.round(stats.totalProgress)}%</span>
          </div>
          <Progress value={stats.totalProgress} className="h-3" />
          <p className="text-xs text-gray-500 mt-2">
            ${(stats.totalTarget - stats.currentValue).toLocaleString()} remaining to reach all your goals
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions

function getGoalIcon(goalType: string): JSX.Element {
  const iconClass = "w-5 h-5";
  
  switch (goalType) {
    case 'retirement':
      return <FontAwesomeIcon icon={faBullseye} className={`${iconClass} text-blue-600`} />;
    case 'home_purchase':
      return <FontAwesomeIcon icon={faHome} className={`${iconClass} text-green-600`} />;
    case 'education':
      return <FontAwesomeIcon icon={faGraduationCap} className={`${iconClass} text-purple-600`} />;
    case 'emergency_fund':
      return <FontAwesomeIcon icon={faShield} className={`${iconClass} text-orange-600`} />;
    case 'wealth_building':
      return <FontAwesomeIcon icon={faChartLine} className={`${iconClass} text-indigo-600`} />;
    case 'custom':
      return <FontAwesomeIcon icon={faStar} className={`${iconClass} text-pink-600`} />;
    default:
      return <FontAwesomeIcon icon={faBullseye} className={`${iconClass} text-gray-600`} />;
  }
}

function getTimeRemaining(targetDate: string): string {
  const now = new Date();
  const target = new Date(targetDate);
  const diffInMs = target.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays <= 0) return 'Overdue';
  if (diffInDays < 30) return `${diffInDays} days`;
  if (diffInDays < 365) return `${Math.ceil(diffInDays / 30)} months`;
  
  const years = Math.floor(diffInDays / 365);
  const months = Math.ceil((diffInDays % 365) / 30);
  
  if (months === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${months}m`;
}

function ModernLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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