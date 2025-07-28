import { createFileRoute, useParams, useRouter, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AIPortfolioDisplay } from '@/components/portfolio/AIPortfolioDisplay';
import { PortfolioPerformanceChart } from '@/components/portfolio/PortfolioPerformanceChart';
import { useAuth } from '@/hooks/useAuth';
import { usePortfolioSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faBullseye, 
  faCalendar, 
  faDollarSign,
  faChartLine,
  faCog,
  faShare,
  faExclamationCircle
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
  risk_tolerance: string;
  status: string;
  created_at: string;
  ai_assessment: any;
}

interface GoalMilestone {
  id: string;
  milestone_type: string;
  target_value: number;
  current_value: number;
  achieved: boolean;
  achieved_at: string | null;
  ai_message: string;
}

export const Route = createFileRoute('/portfolio/goal/$goalId')({
  component: GoalDetailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      section: (search.section as string) || '',
      source: (search.source as string) || ''
    };
  }
});

async function fetchGoalDetails(goalId: string, userId: string): Promise<FinancialGoal> {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();
    
  if (error) {
    throw error;
  }
  
  return data;
}

async function fetchGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('target_value', { ascending: true });
    
  if (error) {
    throw error;
  }
  
  return data || [];
}

function GoalDetailPage() {
  const { goalId } = useParams({ from: '/portfolio/goal/$goalId' });
  const { section, source } = useSearch({ from: '/portfolio/goal/$goalId' });
  const router = useRouter();
  const { user } = useAuth();
  const { tier: userTier } = usePortfolioSubscription();


  const { data: goal, isLoading: goalLoading, error: goalError } = useQuery({
    queryKey: ['goal-details', goalId, user?.id],
    queryFn: () => fetchGoalDetails(goalId, user!.id),
    enabled: !!goalId && !!user?.id
  });

  const { data: milestones, isLoading: milestonesLoading } = useQuery({
    queryKey: ['goal-milestones', goalId],
    queryFn: () => fetchGoalMilestones(goalId),
    enabled: !!goalId
  });

  // Handle AI coaching redirects
  useEffect(() => {
    if (source === 'ai_coaching') {
      if (section === 'progress') {
        // Scroll to progress section or highlight it
        const progressSection = document.getElementById('progress-section');
        progressSection?.scrollIntoView({ behavior: 'smooth' });
      } else if (section === 'risk_analysis') {
        // Show risk analysis modal or section - for now just scroll to overview
        const overviewSection = document.getElementById('goal-overview-section');
        overviewSection?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [section, source]);

  if (!user) {
    router.navigate({ to: '/early-access' });
    return null;
  }

  if (goalLoading) {
    return <GoalDetailLoadingSkeleton />;
  }

  if (goalError || !goal) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8 text-center max-w-md mx-auto">
          <FontAwesomeIcon icon={faExclamationCircle} className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Goal Not Found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find this financial goal or you don't have access to it.
          </p>
          <Button onClick={() => router.navigate({ to: '/portfolio' })}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  const amountRemaining = goal.target_amount - goal.current_amount;
  const timeRemaining = Math.ceil(
    (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* AI Coaching Context */}
      {source === 'ai_coaching' && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <FontAwesomeIcon icon={faExclamationCircle} className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Your AI coach recommended reviewing this section of your goal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.navigate({ to: '/portfolio' })}
            className="flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            Back to Portfolio
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{goal.title}</h1>
            <p className="text-gray-600">{goal.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `My ${goal.title} Progress`,
                  text: `Check out my financial goal progress: ${Math.round(progressPercentage)}% complete!`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href).then(() => {
                  toast.success('📋 Goal link copied to clipboard!');
                }).catch(() => {
                  toast.error('Failed to copy link to clipboard');
                });
              }
            }}
          >
            <FontAwesomeIcon icon={faShare} className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.navigate({ 
              to: '/portfolio/goal/$goalId/settings',
              params: { goalId: goal.id }
            })}
          >
            <FontAwesomeIcon icon={faCog} className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Goal Overview */}
      <div id="goal-overview-section">
        <div id="progress-section">
          <GoalOverviewSection 
            goal={goal}
            progressPercentage={progressPercentage}
            amountRemaining={amountRemaining}
            timeRemaining={timeRemaining}
          />
        </div>
      </div>

      {/* AI Portfolio Display */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">AI-Generated Portfolio</h2>
          <Badge variant="outline">
            {userTier === 'free' ? 'Free Tier' : userTier === 'premium' ? 'Premium' : 'Premium Pro'}
          </Badge>
        </div>
        <AIPortfolioDisplay 
          goalId={goalId}
          userId={user.id}
          userTier={userTier as 'free' | 'premium' | 'plus'}
        />
      </div>

      {/* Milestones */}
      {!milestonesLoading && milestones && milestones.length > 0 && (
        <GoalMilestonesSection 
          milestones={milestones}
          currentAmount={goal.current_amount}
          targetAmount={goal.target_amount}
        />
      )}

      {/* Real Portfolio Performance Chart */}
      <PortfolioPerformanceChart 
        userId={user.id}
        goalId={goalId}
        goalAmount={goal.current_amount}
        targetAmount={goal.target_amount}
      />
    </div>
  );
}

function GoalOverviewSection({ 
  goal, 
  progressPercentage, 
  amountRemaining, 
  timeRemaining 
}: {
  goal: FinancialGoal;
  progressPercentage: number;
  amountRemaining: number;
  timeRemaining: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FontAwesomeIcon icon={faBullseye} className="w-5 h-5" />
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Amount</span>
                <span className="font-semibold text-green-600">
                  ${goal.current_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target Amount</span>
                <span className="font-semibold">
                  ${goal.target_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining</span>
                <span className="font-semibold text-blue-600">
                  ${amountRemaining.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FontAwesomeIcon icon={faCalendar} className="w-5 h-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              {(() => {
                // Smart time formatting function
                const formatTimeRemaining = (days: number) => {
                  if (days <= 0) {
                    return { value: 'Overdue', unit: '' };
                  }
                  
                  const years = days / 365;
                  const hours = days * 24;
                  const minutes = hours * 60;
                  
                  if (days >= 365) {
                    // Show years if >= 1 year
                    return { 
                      value: Math.ceil(years), 
                      unit: Math.ceil(years) === 1 ? 'year remaining' : 'years remaining' 
                    };
                  } else if (days >= 1) {
                    // Show days if >= 1 day
                    return { 
                      value: Math.ceil(days), 
                      unit: Math.ceil(days) === 1 ? 'day remaining' : 'days remaining' 
                    };
                  } else if (hours >= 1) {
                    // Show hours if >= 1 hour
                    return { 
                      value: Math.ceil(hours), 
                      unit: Math.ceil(hours) === 1 ? 'hour remaining' : 'hours remaining' 
                    };
                  } else {
                    // Show minutes for anything less than 1 hour
                    return { 
                      value: Math.max(1, Math.ceil(minutes)), 
                      unit: Math.ceil(minutes) === 1 ? 'minute remaining' : 'minutes remaining' 
                    };
                  }
                };
                
                const timeDisplay = formatTimeRemaining(timeRemaining);
                
                return (
                  <>
                    <p className={`text-3xl font-bold ${
                      timeRemaining <= 0 ? 'text-red-600' : 
                      timeRemaining < 30 ? 'text-orange-600' : 
                      'text-blue-600'
                    }`}>
                      {timeDisplay.value}
                    </p>
                    <p className="text-sm text-gray-600">{timeDisplay.unit}</p>
                  </>
                );
              })()}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Target Date</span>
                <span className="font-semibold">
                  {new Date(goal.target_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Left</span>
                <span className="font-semibold">
                  {timeRemaining > 0 ? timeRemaining : 'Overdue'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contribution Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FontAwesomeIcon icon={faDollarSign} className="w-5 h-5" />
            Monthly Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                ${goal.monthly_contribution.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">per month</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Risk Tolerance</span>
                <Badge variant="outline" className="capitalize">
                  {goal.risk_tolerance}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Goal Type</span>
                <span className="font-semibold capitalize">
                  {goal.goal_type.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalMilestonesSection({ 
  milestones, 
  currentAmount, 
  targetAmount 
}: {
  milestones: GoalMilestone[];
  currentAmount: number;
  targetAmount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faBullseye} className="w-5 h-5" />
          Progress Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.map((milestone, index) => {
            const progressToMilestone = (currentAmount / milestone.target_value) * 100;
            const isAchieved = milestone.achieved;
            const isNext = !isAchieved && currentAmount < milestone.target_value;

            return (
              <div 
                key={milestone.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isAchieved 
                    ? 'bg-green-50 border-green-200' 
                    : isNext 
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isAchieved 
                        ? 'bg-green-500 text-white' 
                        : isNext
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {isAchieved ? '✓' : index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">
                        ${milestone.target_value.toLocaleString()} 
                        {milestone.milestone_type === 'percentage' && 
                          ` (${Math.round((milestone.target_value / targetAmount) * 100)}%)`
                        }
                      </p>
                      {milestone.ai_message && (
                        <p className="text-sm text-gray-600">
                          {milestone.ai_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {isAchieved ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Achieved {milestone.achieved_at && new Date(milestone.achieved_at).toLocaleDateString()}
                      </Badge>
                    ) : isNext ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Next Goal
                      </Badge>
                    ) : null}
                  </div>
                </div>
                
                {!isAchieved && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress to milestone</span>
                      <span>{Math.min(Math.round(progressToMilestone), 100)}%</span>
                    </div>
                    <Progress value={Math.min(progressToMilestone, 100)} className="h-2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function GoalDetailLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
      
      <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}