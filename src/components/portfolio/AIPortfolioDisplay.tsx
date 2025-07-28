import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPieChart,
  faChartLine,
  faCoins,
  faRocket,
  faShieldHalved,
  faUpLong,
  faBalanceScale,
  faRefresh,
  faSpinner,
  faCheckCircle,
  faBullseye,
  faExclamationTriangle,
  faLightbulb,
  faEye,
  faArrowRight,
  faBrain,
  faLock,
  faDollarSign,
  faCalendar,
  faChartBar,
  faInfoCircle,
  faExternalLinkAlt,
  faShield
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { ImplementationGuide } from './ImplementationGuide';

interface AIPortfolioDisplayProps {
  userId: string;
  goalId: string;
  userTier: 'free' | 'premium' | 'plus';
}

interface AIPortfolio {
  id: string;
  allocation: {
    stocks: number;
    bonds: number;
    alternatives: number;
    cash?: number;
  };
  recommended_holdings: Array<{
    symbol: string;
    name: string;
    allocation: number;
    category: string;
    reasoning: string;
    expenseRatio?: number;
    dividendYield?: number;
  }>;
  risk_score: number;
  expected_return: number;
  confidence_score: number;
  scenario_analysis: {
    best_case: { probability: number; value: number; };
    expected_case: { probability: number; value: number; };
    worst_case: { probability: number; value: number; };
  };
  rebalancing_triggers: {
    timeBasedMonths: number;
    allocationDriftPercent: number;
    marketVolatilityThreshold: number;
  };
  ai_reasoning: string;
  created_at: string;
}

interface GoalMilestone {
  id: string;
  milestone_type: string;
  target_value: number;
  current_value: number;
  achieved: boolean;
  achieved_at?: string;
  ai_message: string;
  badge_earned?: string;
}

interface PerformanceData {
  id: string;
  date: string;
  portfolio_value: number;
  daily_return: number;
  contributions: number;
  withdrawals: number;
  ai_commentary?: string;
}

// Constants for better maintainability
const QUERY_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const QUERY_CACHE_TIME = 1000 * 60 * 30; // 30 minutes

type TabType = 'overview' | 'holdings' | 'performance' | 'insights' | 'implementation';

export function AIPortfolioDisplay({ userId, goalId, userTier }: AIPortfolioDisplayProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>('overview');
  const queryClient = useQueryClient();

  // Query options
  const portfolioQueryOptions = {
    queryKey: ['ai-portfolio', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_portfolios')
        .select('*')
        .eq('goal_id', goalId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as AIPortfolio;
    },
    enabled: !!goalId,
    staleTime: QUERY_STALE_TIME,
    gcTime: QUERY_CACHE_TIME,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
  };

  // Fetch AI-generated portfolio from database
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = useQuery(portfolioQueryOptions);

  // Milestone query options
  const milestonesQueryOptions = {
    queryKey: ['goal-milestones', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('target_value', { ascending: true });
      
      if (error) throw error;
      return data as GoalMilestone[];
    },
    enabled: !!goalId,
    staleTime: QUERY_STALE_TIME,
    gcTime: QUERY_CACHE_TIME
  };

  // Fetch goal milestones
  const { data: milestones } = useQuery(milestonesQueryOptions);

  // Performance query options
  const performanceQueryOptions = {
    queryKey: ['portfolio-performance', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_performance')
        .select('*')
        .eq('goal_id', goalId)
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as PerformanceData[];
    },
    enabled: !!goalId,
    staleTime: QUERY_STALE_TIME,
    gcTime: QUERY_CACHE_TIME
  };

  // Fetch portfolio performance data
  const { data: performance } = useQuery(performanceQueryOptions);

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab);
  };

  // Generate new AI portfolio mutation with better error handling
  const generatePortfolioMutation = useMutation({
    mutationFn: async () => {
      // First, get goal data to pass to the portfolio generator
      const { data: goal, error: goalError } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (goalError) throw goalError;

      const { data, error } = await supabase.functions.invoke('ai-portfolio-generator', {
        body: {
          goalId,
          userId,
          goalType: goal.goal_type,
          targetAmount: goal.target_amount,
          timeline: Math.round((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365)),
          riskTolerance: goal.risk_tolerance || 'moderate',
          currentAmount: goal.current_amount,
          monthlyContribution: goal.monthly_contribution
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate portfolio');
      
      return data;
    },
    onSuccess: () => {
      // Invalidate related queries for consistent state
      queryClient.invalidateQueries({ queryKey: ['ai-portfolio', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-performance', goalId] });
      toast.success('🚀 AI Portfolio generated successfully!');
    },
    onError: (error: Error) => {
      console.error('Portfolio generation error:', error);
      toast.error(`Failed to generate portfolio: ${error.message || 'Unknown error occurred'}`);
    }
  });

  if (portfolioLoading) {
    return <AIPortfolioLoadingSkeleton />;
  }

  if (portfolioError || !portfolio) {
    return (
      <Card className="p-8 text-center">
        <FontAwesomeIcon icon={faPieChart} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-3">AI Portfolio Not Generated</h3>
        <p className="text-gray-600 mb-6">
          Let's create your personalized AI-powered investment portfolio based on your goals and risk tolerance.
        </p>
        <Button 
          onClick={() => generatePortfolioMutation.mutate()}
          disabled={generatePortfolioMutation.isPending}
          size="lg"
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {generatePortfolioMutation.isPending ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 mr-2 animate-spin" />
              Generating AI Portfolio...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faRocket} className="w-5 h-5 mr-2" />
              Generate AI Portfolio
            </>
          )}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-700 text-white border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">AI-Generated Portfolio</CardTitle>
              <CardDescription className="text-blue-100">
                Personalized investment strategy powered by artificial intelligence
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="mb-2 bg-white/20 text-white">
                {Math.round(portfolio.confidence_score * 100)}% AI Confidence
              </Badge>
              <p className="text-sm text-blue-100">
                Generated {new Date(portfolio.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{portfolio.expected_return.toFixed(1)}%</p>
              <p className="text-sm text-blue-100">Expected Return</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{(portfolio.risk_score * 10).toFixed(1)}/10</p>
              <p className="text-sm text-blue-100">Risk Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{portfolio.recommended_holdings.length}</p>
              <p className="text-sm text-blue-100">Holdings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{portfolio.rebalancing_triggers.timeBasedMonths}mo</p>
              <p className="text-sm text-blue-100">Rebalance</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: faPieChart },
          { key: 'holdings', label: 'Holdings', icon: faCoins },
          { key: 'implementation', label: 'How to Implement', icon: faRocket },
          { key: 'performance', label: 'Performance', icon: faChartLine },
          { key: 'insights', label: 'AI Insights', icon: faLightbulb }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              selectedTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetAllocationCard allocation={portfolio.allocation} />
          <ScenarioAnalysisCard scenarios={portfolio.scenario_analysis} />
        </div>
      )}

      {selectedTab === 'holdings' && (
        <HoldingsTable holdings={portfolio.recommended_holdings} userTier={userTier} />
      )}

      {selectedTab === 'implementation' && (
        <ImplementationGuide holdings={portfolio.recommended_holdings} />
      )}

      {selectedTab === 'performance' && (
        <div className="space-y-6">
          <PerformanceChart performance={performance || []} />
          <MilestonesProgress milestones={milestones || []} />
        </div>
      )}

      {selectedTab === 'insights' && (
        <AIInsightsPanel 
          reasoning={portfolio.ai_reasoning}
          riskScore={portfolio.risk_score}
          expectedReturn={portfolio.expected_return}
          rebalancingTriggers={portfolio.rebalancing_triggers}
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          variant="outline" 
          onClick={() => generatePortfolioMutation.mutate()}
          disabled={generatePortfolioMutation.isPending}
          className="flex-1"
        >
          {generatePortfolioMutation.isPending ? (
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faRefresh} className="w-4 h-4 mr-2" />
          )}
          Regenerate Portfolio
        </Button>
        
        <Button 
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={() => handleTabChange('implementation')}
        >
          <FontAwesomeIcon icon={faRocket} className="w-4 h-4 mr-2" />
          Learn How to Implement
        </Button>
      </div>
    </div>
  );
}


// Helper Components

function AssetAllocationCard({ allocation }: { allocation: AIPortfolio['allocation'] }) {
  const total = allocation.stocks + allocation.bonds + allocation.alternatives + (allocation.cash || 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faPieChart} className="w-5 h-5 text-blue-600" />
          Asset Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <AllocationBar label="Stocks" percentage={allocation.stocks} color="bg-blue-500" />
          <AllocationBar label="Bonds" percentage={allocation.bonds} color="bg-green-500" />
          <AllocationBar label="Alternatives" percentage={allocation.alternatives} color="bg-purple-500" />
          {allocation.cash && allocation.cash > 0 && (
            <AllocationBar label="Cash" percentage={allocation.cash} color="bg-gray-500" />
          )}
        </div>
        
        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Allocation</span>
            <span className="font-medium">{total.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AllocationBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-900">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`h-3 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ScenarioAnalysisCard({ scenarios }: { scenarios: AIPortfolio['scenario_analysis'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-green-600" />
          Scenario Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScenarioItem 
          label="Best Case" 
          probability={scenarios.best_case.probability}
          value={scenarios.best_case.value}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <ScenarioItem 
          label="Expected Case" 
          probability={scenarios.expected_case.probability}
          value={scenarios.expected_case.value}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <ScenarioItem 
          label="Worst Case" 
          probability={scenarios.worst_case.probability}
          value={scenarios.worst_case.value}
          color="text-red-600"
          bgColor="bg-red-50"
        />
      </CardContent>
    </Card>
  );
}

function ScenarioItem({ label, probability, value, color, bgColor }: {
  label: string;
  probability: number;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`p-3 rounded-lg ${bgColor}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">{probability}% probability</p>
        </div>
        <div className={`text-right ${color}`}>
          <p className="text-2xl font-bold">${value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function HoldingsTable({ holdings, userTier }: { holdings: AIPortfolio['recommended_holdings']; userTier: string }) {
  const displayHoldings = userTier === 'free' ? holdings.slice(0, 1) : holdings;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCoins} className="w-5 h-5 text-yellow-600" />
          Recommended Holdings
        </CardTitle>
        <CardDescription>
          Specific ETFs and funds selected by AI based on your goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayHoldings.map((holding, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{holding.symbol}</h4>
                  <p className="text-gray-700">{holding.name}</p>
                  <Badge variant="outline" className="mt-1">{holding.category}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{holding.allocation.toFixed(1)}%</p>
                  {holding.expenseRatio && (
                    <p className="text-sm text-gray-600">ER: {holding.expenseRatio.toFixed(2)}%</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{holding.reasoning}</p>
              {holding.dividendYield && (
                <p className="text-sm text-green-600 mt-2">
                  <FontAwesomeIcon icon={faUpLong} className="w-3 h-3 mr-1" />
                  Dividend Yield: {holding.dividendYield.toFixed(2)}%
                </p>
              )}
            </div>
          ))}
          
          {userTier === 'free' && holdings.length > 1 && (
            <div className="border-2 border-dashed border-yellow-300 rounded-lg p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="flex items-center gap-3 mb-3">
                <FontAwesomeIcon icon={faLock} className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">Complete Portfolio Access</h3>
              </div>
              <p className="text-yellow-700 text-sm mb-4">
                {holdings.length - 1} more holdings available with detailed analysis and reasoning
              </p>
              <Button 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined') {
                      window.location.href = '/pricing';
                    }
                  } catch (error) {
                    console.error('Navigation error:', error);
                    toast.error('Failed to navigate to pricing page');
                  }
                }}
              >
                Upgrade to Premium →
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceChart({ performance }: { performance: PerformanceData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-green-600" />
          Portfolio Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performance.length === 0 ? (
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faChartLine} className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No performance data available yet.</p>
            <p className="text-sm text-gray-500">Start tracking your portfolio to see performance metrics.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple performance summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">+12.5%</p>
                <p className="text-sm text-gray-600">Total Return</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">$1,250</p>
                <p className="text-sm text-gray-600">Total Gain</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">$10,000</p>
                <p className="text-sm text-gray-600">Current Value</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MilestonesProgress({ milestones }: { milestones: GoalMilestone[] }) {
  const [celebrationVisible, setCelebrationVisible] = useState<string | null>(null);
  
  // Check for recent achievements and show celebrations
  React.useEffect(() => {
    const recentAchievements = milestones.filter(m => 
      m.achieved && 
      m.achieved_at && 
      new Date(m.achieved_at).getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    if (recentAchievements.length > 0) {
      const latestAchievement = recentAchievements[0];
      setCelebrationVisible(latestAchievement.id);
      
      // Auto-hide celebration after 5 seconds
      setTimeout(() => setCelebrationVisible(null), 5000);
    }
  }, [milestones]);

  const sortedMilestones = [...milestones].sort((a, b) => a.target_value - b.target_value);
  const completedCount = milestones.filter(m => m.achieved).length;
  const progressPercentage = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBullseye} className="w-5 h-5 text-yellow-600" />
            Goal Milestones
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {completedCount}/{milestones.length} Achieved
            </Badge>
            <div className="text-right">
              <p className="text-sm font-medium">{Math.round(progressPercentage)}%</p>
              <p className="text-xs text-gray-500">Complete</p>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          Track your progress with AI-generated milestone celebrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Overall Milestone Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        <div className="space-y-4">
          {sortedMilestones.map((milestone, index) => {
            const isRecentAchievement = celebrationVisible === milestone.id;
            const badgeColor = getMilestoneBadgeColor(milestone.milestone_type);
            
            return (
              <div key={milestone.id} className={`relative p-4 rounded-lg border-2 transition-all ${
                milestone.achieved 
                  ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50' 
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              } ${isRecentAchievement ? 'ring-4 ring-yellow-300 ring-opacity-75 animate-pulse' : ''}`}>
                
                {/* Celebration Overlay */}
                {isRecentAchievement && (
                  <div className="absolute -top-2 -right-2 animate-bounce">
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      🎉 New Achievement!
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <FontAwesomeIcon 
                        icon={milestone.achieved ? faCheckCircle : faBullseye} 
                        className={`w-7 h-7 ${milestone.achieved ? 'text-green-600' : 'text-gray-400'}`}
                      />
                      {milestone.achieved && milestone.badge_earned && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-xs">🏅</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          ${milestone.target_value.toLocaleString()} Target
                        </p>
                        <Badge variant="outline" className={badgeColor}>
                          {getMilestoneTypeLabel(milestone.milestone_type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {milestone.ai_message}
                      </p>
                      {milestone.achieved && milestone.current_value > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Achieved with ${milestone.current_value.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {milestone.achieved ? (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          ✅ Completed
                        </Badge>
                        <p className="text-xs text-gray-500">
                          {milestone.achieved_at ? formatDateDistance(new Date(milestone.achieved_at)) : 'Recently'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-gray-600">
                          In Progress
                        </Badge>
                        <p className="text-xs text-gray-500">
                          ${(milestone.target_value - milestone.current_value).toLocaleString()} to go
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar for Individual Milestone */}
                {!milestone.achieved && milestone.target_value > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">
                        {Math.round((milestone.current_value / milestone.target_value) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(milestone.current_value / milestone.target_value) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            );
          })}
          
          {milestones.length === 0 && (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faBullseye} className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">No milestones set yet</p>
              <p className="text-sm text-gray-500">
                Milestones will be automatically created when you generate an AI portfolio
              </p>
            </div>
          )}
        </div>
        
        {/* Achievement Summary */}
        {completedCount > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Achievement Summary</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {completedCount} milestone{completedCount !== 1 ? 's' : ''} achieved! 
                </p>
                <p className="text-xs text-gray-500">
                  {milestones.length - completedCount} remaining
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getMilestoneBadgeColor(type: string): string {
  switch (type) {
    case 'percentage':
      return 'bg-blue-100 text-blue-800';
    case 'amount':
      return 'bg-green-100 text-green-800';
    case 'time_based':
      return 'bg-purple-100 text-purple-800';
    case 'contribution_streak':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getMilestoneTypeLabel(type: string): string {
  switch (type) {
    case 'percentage':
      return 'Progress';
    case 'amount':
      return 'Amount';
    case 'time_based':
      return 'Time';
    case 'contribution_streak':
      return 'Consistency';
    default:
      return 'Milestone';
  }
}

function formatDateDistance(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

function AIInsightsPanel({ 
  reasoning, 
  riskScore, 
  expectedReturn, 
  rebalancingTriggers 
}: {
  reasoning: string;
  riskScore: number;
  expectedReturn: number;
  rebalancingTriggers: AIPortfolio['rebalancing_triggers'];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yellow-600" />
            AI Reasoning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{reasoning}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} className="w-5 h-5 text-blue-600" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  <span className="font-medium">{(riskScore * 10).toFixed(1)}/10</span>
                </div>
                <Progress value={riskScore * 100} className="h-3" />
              </div>
              <p className="text-sm text-gray-600">
                {riskScore < 0.3 ? 'Conservative' : riskScore < 0.7 ? 'Moderate' : 'Aggressive'} risk profile
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBalanceScale} className="w-5 h-5 text-purple-600" />
              Rebalancing Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Time-based</span>
                <span className="font-medium">{rebalancingTriggers.timeBasedMonths} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Drift threshold</span>
                <span className="font-medium">{rebalancingTriggers.allocationDriftPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Volatility trigger</span>
                <span className="font-medium">{rebalancingTriggers.marketVolatilityThreshold}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AIPortfolioLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
      <div className="h-12 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}