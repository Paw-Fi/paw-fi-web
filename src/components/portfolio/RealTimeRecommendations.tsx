import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLightbulb,
  faChartLine,
  faUpLong,
  faBalanceScale,
  faExclamationTriangle,
  faCheckCircle,
  faRefresh,
  faSpinner,
  faClock,
  faRocket,
  faShield,
  faDollarSign,
  faEye,
  faTimes,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface RealTimeRecommendationsProps {
  userId: string;
  goalId: string;
  userTier: 'free' | 'premium' | 'plus';
}

interface PortfolioRecommendation {
  id: string;
  type: 'rebalance' | 'opportunity' | 'risk_alert' | 'optimization' | 'market_insight';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  reasoning: string;
  actionable: boolean;
  impact_score: number; // 0-10
  effort_required: 'low' | 'medium' | 'high';
  time_sensitive: boolean;
  expires_at?: string;
  data: {
    current_allocation?: any;
    suggested_allocation?: any;
    market_data?: any;
    performance_impact?: number;
    risk_change?: number;
    lesson_id?: string;
    lesson_url?: string;
    estimated_time?: string;
  };
  created_at: string;
}

// Constants for better maintainability
const REFETCH_INTERVAL = 1000 * 60 * 15; // 15 minutes
const RETRY_COUNT = 2;
const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 } as const;

export function RealTimeRecommendations({ userId, goalId, userTier }: RealTimeRecommendationsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch user's completed lessons to avoid recommending completed content
  const { data: completedLessons } = useQuery({
    queryKey: ['completed-lessons', userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-user-completed-lessons', {
        body: { userId }
      });
      if (error) throw error;
      return data?.completed_lessons || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Query options
  const recommendationsQueryOptions = {
    queryKey: ['portfolio-recommendations', goalId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('portfolio-recommendations-engine', {
        body: {
          userId,
          goalId,
          includeMarketData: true,
          includePerformanceAnalysis: true
        }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch recommendations');
      
      return data.recommendations as PortfolioRecommendation[];
    },
    refetchInterval: REFETCH_INTERVAL,
    enabled: !!goalId,
    retry: RETRY_COUNT,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  };

  // Fetch real-time recommendations
  const { data: recommendations, isLoading, error, refetch } = useQuery(recommendationsQueryOptions);

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  }, [error]);

  // Execute recommendation action
  const executeRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      setExecutingId(recommendationId);
      const { data, error } = await supabase.functions.invoke('execute-portfolio-recommendation', {
        body: {
          userId,
          goalId,
          recommendationId
        }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to execute recommendation');
      
      return data;
    },
    onSuccess: () => {
      setExecutingId(null);
      queryClient.invalidateQueries({ queryKey: ['ai-portfolio', goalId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-recommendations', goalId] });
      toast.success('🚀 Portfolio recommendation applied successfully!');
    },
    onError: (error: any) => {
      setExecutingId(null);
      toast.error(`Failed to apply recommendation: ${error.message}`);
    }
  });

  // Filter and sort recommendations
  const activeRecommendations = (() => {
    if (!recommendations) return [];
    
    const now = new Date();
    return recommendations
      .filter(rec => !dismissedIds.has(rec.id))
      .filter(rec => !rec.expires_at || new Date(rec.expires_at) > now)
      .sort((a, b) => {
        // Sort by priority and impact
        const aPriority = PRIORITY_ORDER[a.priority];
        const bPriority = PRIORITY_ORDER[b.priority];
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return b.impact_score - a.impact_score;
      });
  })();

  // Calculate counts
  const recommendationCounts = (() => {
    const urgentCount = activeRecommendations.filter(r => r.priority === 'urgent').length;
    const highCount = activeRecommendations.filter(r => r.priority === 'high').length;
    return { urgentCount, highCount };
  })();

  const handleDismissRecommendation = async (recommendationId: string) => {
    setDismissedIds(prev => new Set([...prev, recommendationId]));
    
    // Track dismissal in database
    try {
      const { error } = await supabase.from('ai_recommendation_actions').insert({
        user_id: userId,
        recommendation_id: recommendationId,
        action_type: 'dismissed',
        action_data: { dismissed_at: new Date().toISOString() }
      });
      
      if (error) {
        console.error('Error tracking recommendation dismissal:', error);
      }
    } catch (error) {
      console.error('Error tracking recommendation dismissal:', error);
    }
  };

  const handleExecuteRecommendation = async (recommendationId: string) => {
    // Track action click
    try {
      const { error } = await supabase.from('ai_recommendation_actions').insert({
        user_id: userId,
        recommendation_id: recommendationId,
        action_type: 'clicked',
        action_data: { clicked_at: new Date().toISOString() }
      });
      
      if (error) {
        console.error('Error tracking recommendation click:', error);
      }
    } catch (error) {
      console.error('Error tracking recommendation click:', error);
    }

    executeRecommendationMutation.mutate(recommendationId);
  };

  if (isLoading) {
    return <RecommendationsLoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-red-700 font-medium mb-2">Unable to load recommendations</p>
          <p className="text-red-600 text-sm mb-4">
            We're having trouble fetching your latest portfolio insights.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <FontAwesomeIcon icon={faRefresh} className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!activeRecommendations || activeRecommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-green-600" />
              Portfolio Recommendations
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <FontAwesomeIcon icon={faRefresh} className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FontAwesomeIcon icon={faCheckCircle} className="w-12 h-12 text-green-500 mb-4" />
          <p className="text-gray-700 font-medium mb-2">All set! 🎉</p>
          <p className="text-gray-600 text-sm">
            Your portfolio is optimized. We'll notify you when new opportunities arise.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { urgentCount } = recommendationCounts;

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl mb-1">Live Portfolio Insights</CardTitle>
              <CardDescription className="text-blue-100">
                AI-powered recommendations updated every 15 minutes
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-4">
                {urgentCount > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-300">{urgentCount}</p>
                    <p className="text-xs text-blue-100">Urgent</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-2xl font-bold">{activeRecommendations.length}</p>
                  <p className="text-xs text-blue-100">Total</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-3">
        {activeRecommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            isExpanded={expandedId === recommendation.id}
            onExpand={() => setExpandedId(expandedId === recommendation.id ? null : recommendation.id)}
            onDismiss={() => handleDismissRecommendation(recommendation.id)}
            onExecute={() => handleExecuteRecommendation(recommendation.id)}
            isExecuting={executingId === recommendation.id}
            userTier={userTier}
          />
        ))}
      </div>

      {/* Refresh info */}
      <div className="text-center text-sm text-gray-500">
        <FontAwesomeIcon icon={faClock} className="w-3 h-3 mr-1" />
        Last updated: {new Date().toLocaleTimeString()} • Next update in ~15 minutes
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  isExpanded,
  onExpand,
  onDismiss,
  onExecute,
  isExecuting,
  userTier
}: {
  recommendation: PortfolioRecommendation;
  isExpanded: boolean;
  onExpand: () => void;
  onDismiss: () => void;
  onExecute: () => void;
  isExecuting: boolean;
  userTier: string;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case 'rebalance':
        return faBalanceScale;
      case 'opportunity':
        return faRocket;
      case 'risk_alert':
        return faShield;
      case 'optimization':
        return faUpLong;
      case 'market_insight':
        return faChartLine;
      default:
        return faLightbulb;
    }
  };

  const isTimeSensitive = recommendation.time_sensitive;
  const canExecute = recommendation.actionable && userTier !== 'free';

  return (
    <Card className={`border-2 transition-all ${getPriorityColor(recommendation.priority)} `}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <FontAwesomeIcon 
              icon={getPriorityIcon(recommendation.type)} 
              className={`w-5 h-5 mt-1 ${
                recommendation.priority === 'urgent' ? 'text-red-600' :
                recommendation.priority === 'high' ? 'text-orange-600' :
                recommendation.priority === 'medium' ? 'text-yellow-600' :
                'text-blue-600'
              }`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    recommendation.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    recommendation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}
                >
                  {recommendation.priority}
                </Badge>
                {isTimeSensitive && (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300 animate-pulse">
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3 mr-1" />
                    Time Sensitive
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-3">{recommendation.description}</p>
              
              {/* Impact and Effort Indicators */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Impact:</span>
                  <div className="flex items-center gap-1">
                    <Progress value={recommendation.impact_score * 10} className="w-12 h-2" />
                    <span className="font-medium">{recommendation.impact_score}/10</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Effort:</span>
                  <Badge variant="outline" className="text-xs">
                    {recommendation.effort_required}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExpand}
              className="text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-4">
              {/* AI Reasoning */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 text-blue-500" />
                  AI Analysis
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded">
                  {recommendation.reasoning}
                </p>
              </div>

              {/* Data visualization if available */}
              {recommendation.data?.current_allocation && recommendation.data?.suggested_allocation && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Suggested Changes</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Current</p>
                      <div className="space-y-1">
                        {Object.entries(recommendation.data.current_allocation).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}</span>
                            <span>{String(value)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Suggested</p>
                      <div className="space-y-1">
                        {Object.entries(recommendation.data.suggested_allocation).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}</span>
                            <span className="font-medium text-green-600">{String(value)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance impact */}
              {recommendation.data?.performance_impact && (
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm text-green-800">
                    <FontAwesomeIcon icon={faUpLong} className="w-4 h-4 mr-2" />
                    Estimated impact: <strong>+{recommendation.data.performance_impact}% annual return</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}

      {/* Action buttons */}
      <div className="px-6 pb-4">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(recommendation.created_at))}
          </div>
          <div className="flex gap-2">
            {/* Handle lesson recommendations differently */}
            {recommendation.data?.lesson_url ? (
              <Button 
                size="sm"
                onClick={() => window.location.href = recommendation.data.lesson_url!}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faRocket} className="w-4 h-4 mr-2" />
                Start Learning
              </Button>
            ) : canExecute ? (
              <Button 
                size="sm"
                onClick={onExecute}
                disabled={isExecuting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExecuting ? (
                  <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4" />
                )}
                {isExecuting ? 'Applying...' : 'Apply'}
              </Button>
            ) : (
              <div className="text-xs text-gray-500">
                {userTier === 'free' ? 'Premium required' : 'View only'}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function RecommendationsLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-gray-200 rounded-lg" />
      ))}
    </div>
  );
}

function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return date.toLocaleDateString();
}