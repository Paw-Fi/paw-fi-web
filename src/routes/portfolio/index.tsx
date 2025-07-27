import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GoalSelector } from '@/components/portfolio/GoalSelector';
import { AICoachingInterface } from '@/components/portfolio/AICoachingInterface';
import { useAuth } from '@/hooks/useAuth';
import { usePortfolioSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBullseye, 
  faPlus, 
  faChartLine, 
  faCalendar, 
  faDollarSign,
  faChartBar,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';


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
  component: PortfolioDashboard,
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

function PortfolioDashboard() {
  const { user,isLoading:authIsLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tier: userTier } = usePortfolioSubscription();
  const search = useSearch({ from: '/portfolio/' }) as { new?: string };

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['user-goals', user?.id],
    queryFn: () => fetchUserGoals(user!.id),
    enabled: !!user?.id
  });

  // Redirect to auth if not logged in
  if (!user && !authIsLoading) {
    // Use window.location for redirect to avoid TypeScript router issues
    if (typeof window !== 'undefined') {
      window.location.href = '/login/?redirect=' + encodeURIComponent('/portfolio');
    }
    return null;
  }

  // Show goal selector if no goals exist or if new=true in query params
  if (!isLoading && ((!goals || goals.length === 0) || search.new === 'true')) {
    return (
      <div className="container mx-auto py-8">
        <GoalSelector />
      </div>
    );
  }

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8 text-center max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">Unable to Load Portfolio</h3>
          <p className="text-gray-600 mb-4">
            We couldn't load your financial goals. Please try again.
          </p>
          <Button onClick={() => {
            // Clear the error and retry the query
            queryClient.invalidateQueries({ queryKey: ['user-goals', user?.id] });
          }}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const primaryGoal = goals && goals.length > 0 ? goals[0] : null;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Financial Goals</h1>
          <p className="text-gray-600 mt-1">
            AI-powered portfolio management tailored to your objectives
          </p>
        </div>
        <Button 
          onClick={() => router.navigate({ to: '/portfolio', search: { new: 'true' } })}
          className="flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Add New Goal
        </Button>
      </div>

      {/* Goals Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals?.map(goal => (
          <GoalOverviewCard 
            key={goal.id} 
            goal={goal} 
            onClick={() => router.navigate({ 
              to: '/portfolio/goal/$goalId', 
              params: { goalId: goal.id },
              search: { section: 'overview', source: 'portfolio_dashboard' }
            })}
          />
        ))}
      </div>

      {/* AI Coaching Interface */}
      {primaryGoal && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Financial Coach</h2>
            <Badge variant="outline" className="text-sm">
              {userTier === 'free' ? 'Free' : userTier === 'premium' ? 'Premium' : 'Premium Pro'}
            </Badge>
          </div>
          <AICoachingInterface 
            userId={user!.id} 
            goalId={primaryGoal.id}
            userTier={userTier as 'free' | 'premium' | 'premium_pro'}
          />
        </div>
      )}

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faChartBar} className="w-5 h-5" />
            Portfolio Summary
          </CardTitle>
          <CardDescription>
            Overview of all your financial goals and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Goals</p>
              <p className="text-2xl font-bold text-gray-900">{goals?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Target</p>
              <p className="text-2xl font-bold text-gray-900">
                ${goals?.reduce((sum, goal) => sum + goal.target_amount, 0).toLocaleString() || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Current Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${goals?.reduce((sum, goal) => sum + goal.current_amount, 0).toLocaleString() || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Monthly Contributions</p>
              <p className="text-2xl font-bold text-gray-900">
                ${goals?.reduce((sum, goal) => sum + goal.monthly_contribution, 0).toLocaleString() || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalOverviewCard({ 
  goal, 
  onClick 
}: { 
  goal: FinancialGoal; 
  onClick: () => void;
}) {
  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  const timeRemaining = Math.ceil(
    (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'retirement':
        return <FontAwesomeIcon icon={faBullseye} className="w-5 h-5" />;
      case 'home_purchase':
        return <FontAwesomeIcon icon={faDollarSign} className="w-5 h-5" />;
      case 'education':
        return <FontAwesomeIcon icon={faBullseye} className="w-5 h-5" />;
      default:
        return <FontAwesomeIcon icon={faChartLine} className="w-5 h-5" />;
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-blue-300"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {getGoalIcon(goal.goal_type)}
          <Badge variant={getStatusColor(goal.status)}>
            {goal.status}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight">
          {goal.title}
        </CardTitle>
        <CardDescription className="text-sm">
          {goal.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Amounts */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Current</span>
            <span className="font-medium">${goal.current_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Target</span>
            <span className="font-medium">${goal.target_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Monthly</span>
            <span className="font-medium">${goal.monthly_contribution.toLocaleString()}</span>
          </div>
        </div>

        {/* Time remaining */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
            {timeRemaining > 0 ? `${Math.ceil(timeRemaining / 365)} years left` : 'Overdue'}
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
      
      <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}