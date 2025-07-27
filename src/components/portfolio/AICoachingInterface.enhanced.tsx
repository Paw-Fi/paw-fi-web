import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRobot, 
  faComment, 
  faChartLine, 
  faBullseye, 
  faChartBar, 
  faLightbulb,
  faGlobe,
  faCheckCircle,
  faClock,
  faArrowRight,
  faPaperPlane,
  faSpinner,
  faExclamationCircle,
  faStar,
  faThumbsUp,
  faThumbsDown,
  faCalculator,
  faGraduationCap,
  faEye,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '@/lib/supabase';

// Utility function to format relative time
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

interface AICoachingInterfaceProps {
  userId: string;
  goalId: string;
  userTier: 'free' | 'premium' | 'plus';
}

interface CoachingSession {
  id: string;
  session_type: string;
  ai_insights: {
    greeting: string;
    summary: string;
    observations: Array<{
      type: string;
      title: string;
      message: string;
      severity: string;
      actionable: boolean;
    }>;
    recommendations: Array<{
      id: string;
      title: string;
      description: string;
      impact: string;
      effort: string;
      category: string;
    }>;
    marketCommentary?: string;
    personalizedMessage: string;
    engagementQuestions: string[];
    nextSteps: string[];
  };
  engagement_score?: number;
  coaching_personality: string;
  created_at: string;
  completed_actions?: any[];
}

interface WeeklyProgress {
  goalProgress: number;
  progressChange: number;
  portfolioValue: number;
  valueChange: number;
  weeklyReturn: number;
}

export function AICoachingInterface({ userId, goalId, userTier }: AICoachingInterfaceProps) {
  const [conversationMessage, setConversationMessage] = useState('');
  const [showConversationMode, setShowConversationMode] = useState(false);
  const [checkInResponses, setCheckInResponses] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch latest coaching session
  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['coaching-session', userId, goalId],
    queryFn: async () => {
      const { data, error: functionError } = await supabase.functions.invoke('ai-coaching-engine', {
        body: {
          userId,
          goalId,
          sessionType: 'weekly_checkin'
        }
      });
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch coaching session');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Coaching session generation failed');
      }
      
      return {
        latestSession: data.session as CoachingSession,
        insights: data.insights
      };
    },
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
    enabled: !!userId && !!goalId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Generate new coaching session
  const generateSessionMutation = useMutation({
    mutationFn: async (sessionType: string = 'weekly_checkin') => {
      const { data, error: functionError } = await supabase.functions.invoke('ai-coaching-engine', {
        body: {
          userId,
          goalId,
          sessionType
        }
      });
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate coaching session');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Coaching session generation failed');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-session', userId, goalId] });
    }
  });

  // Send conversation message (Plusfeature)
  const conversationMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data, error: functionError } = await supabase.functions.invoke('ai-coaching-engine', {
        body: {
          userId,
          goalId,
          sessionType: 'behavioral_insight',
          userMessage: message
        }
      });
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to send message');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process conversation');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-session', userId, goalId] });
      setConversationMessage('');
    }
  });

  // Record check-in response
  const recordCheckInMutation = useMutation({
    mutationFn: async ({ questionText, response, followUpAction }: {
      questionText: string;
      response: 'yes' | 'no' | 'tell_me_more';
      followUpAction?: string;
    }) => {
      const { error } = await supabase
        .from('coaching_check_in_responses')
        .insert({
          user_id: userId,
          coaching_session_id: sessionData?.latestSession?.id,
          question_text: questionText,
          response_type: response,
          follow_up_action: followUpAction
        });
      
      if (error) throw error;
    }
  });

  // Record recommendation action
  const recordRecommendationMutation = useMutation({
    mutationFn: async ({ recommendationId, actionType, actionData }: {
      recommendationId: string;
      actionType: 'clicked' | 'completed' | 'dismissed';
      actionData?: any;
    }) => {
      const { error } = await supabase
        .from('ai_recommendation_actions')
        .insert({
          user_id: userId,
          coaching_session_id: sessionData?.latestSession?.id,
          recommendation_id: recommendationId,
          action_type: actionType,
          action_data: actionData
        });
      
      if (error) throw error;
    }
  });

  // Handle recommendation actions - CONNECT TO REAL FEATURES
  const handleRecommendationAction = (recommendation: any) => {
    // Record the action
    recordRecommendationMutation.mutate({
      recommendationId: recommendation.id,
      actionType: 'clicked',
      actionData: { category: recommendation.category, title: recommendation.title }
    });

    // Route based on recommendation category
    switch (recommendation.category) {
      case 'savings':
        router.navigate({ to: '/calculators/saving-goals-calculator', search: { goalId } });
        break;
      
      case 'investment':
        router.navigate({ 
          to: '/dashboard/learning',
          search: { topic: 'investing', source: 'ai_recommendation' }
        });
        break;
      
      case 'risk':
        router.navigate({ 
          to: '/portfolio/goal/$goalId',
          params: { goalId },
          search: { section: 'risk_analysis' }
        });
        break;
      
      case 'tax':
        router.navigate({ to: '/calculators' }); // Navigate to calculators index since tax-calculator doesn't exist
        break;
      
      case 'behavioral':
        router.navigate({ 
          to: '/dashboard/learning',
          search: { 
            topic: 'behavioral_finance',
            action: 'create_course',
            source: 'ai_recommendation'
          }
        });
        break;
      
      default:
        // Generic learning recommendation
        router.navigate({ 
          to: '/dashboard/learning',
          search: { 
            topic: recommendation.category,
            source: 'ai_recommendation'
          }
        });
    }
  };

  // Handle check-in responses - REAL FUNCTIONALITY
  const handleCheckInResponse = (questionText: string, response: 'yes' | 'no' | 'tell_me_more') => {
    let followUpAction = '';

    switch (response) {
      case 'yes':
        followUpAction = 'positive_feedback_recorded';
        // Set response and potentially trigger next action
        setCheckInResponses(prev => ({ ...prev, [questionText]: 'yes' }));
        break;
      
      case 'no':
        followUpAction = 'negative_feedback_recorded';
        setCheckInResponses(prev => ({ ...prev, [questionText]: 'no' }));
        // Trigger follow-up conversation or alternative suggestions
        if (userTier === 'plus') {
          setShowConversationMode(true);
          setConversationMessage(`I answered "no" to: "${questionText}". Can you help me understand why and what I should do instead?`);
        }
        break;
      
      case 'tell_me_more':
        followUpAction = 'more_info_requested';
        setCheckInResponses(prev => ({ ...prev, [questionText]: 'tell_me_more' }));
        // Open AI conversation with context
        if (userTier === 'plus') {
          setShowConversationMode(true);
          setConversationMessage(`Can you tell me more about: "${questionText}"?`);
        } else {
          // Route to learning for non-premium users
          router.navigate({ 
            to: '/dashboard/learning',
            search: { 
              topic: 'general_advice',
              question: questionText,
              source: 'coaching_checkin'
            }
          });
        }
        break;
    }

    // Record the response
    recordCheckInMutation.mutate({
      questionText,
      response,
      followUpAction
    });
  };

  // Handle "View Full Progress" - CONNECT TO REAL PAGES
  const handleViewFullProgress = () => {
    // Route to goal detail page with progress focus
    router.navigate({ 
      to: '/portfolio/goal/$goalId',
      params: { goalId },
      search: { section: 'progress' }
    });
  };

  if (isLoading) {
    return <CoachingLoadingSkeleton />;
  }

  if (error || !sessionData?.latestSession) {
    return (
      <Card className="p-8 text-center">
        <FontAwesomeIcon icon={faRobot} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Coaching Session Yet</h3>
        <p className="text-gray-600 mb-4">
          Let's generate your first AI coaching session to get started.
        </p>
        <Button 
          onClick={() => generateSessionMutation.mutate()}
          disabled={generateSessionMutation.isPending}
        >
          {generateSessionMutation.isPending ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faRobot} className="w-4 h-4 mr-2" />
              Start AI Coaching
            </>
          )}
        </Button>
      </Card>
    );
  }

  const latestSession = sessionData.latestSession;
  const insights = sessionData.insights || latestSession?.ai_insights;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* AI Coach Header */}
      <Card className="bg-gradient-to-r from-green-400 to-blue-500 text-white border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faRobot} className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">
                  {insights.greeting || "Great to see you back!"}
                </h1>
                <p className="text-green-100 text-sm">
                  {insights.summary || "Here's your weekly financial check-in"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="mb-2">
                {latestSession.coaching_personality}
              </Badge>
              <p className="text-xs text-green-100">
                {formatDistanceToNow(new Date(latestSession.created_at))}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressCard
          title="Goal Progress"
          value="67%"
          change="+3%"
          positive={true}
          iconName="target"
        />
        <ProgressCard
          title="Portfolio Value"
          value="$12,450"
          change="+$340"
          positive={true}
          iconName="trending"
        />
        <ProgressCard
          title="This Week's Return"
          value="+2.1%"
          change={null}
          positive={true}
          iconName="chart"
        />
      </div>

      {/* AI Insights & Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yellow-500" />
            AI Insights & Observations
          </CardTitle>
          <CardDescription>
            Personalized insights based on your progress and market conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.observations?.map((observation, index) => (
              <AIInsightCard key={index} insight={observation} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations - NOW WITH REAL ACTIONS */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-green-500" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              Personalized recommendations to improve your financial progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.recommendations.map((recommendation, index) => (
                <RecommendationCard 
                  key={recommendation.id} 
                  recommendation={recommendation}
                  onTakeAction={() => handleRecommendationAction(recommendation)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Commentary */}
      {insights.marketCommentary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faGlobe} className="w-5 h-5 text-blue-500" />
              Market Intelligence
            </CardTitle>
            <CardDescription>
              Current market conditions and their impact on your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {insights.marketCommentary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Engagement Questions - NOW WITH REAL FUNCTIONALITY */}
      {insights.engagementQuestions && insights.engagementQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faComment} className="w-5 h-5 text-purple-500" />
              Quick Check-In
            </CardTitle>
            <CardDescription>
              Help us understand how you're feeling about your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.engagementQuestions.map((question, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-800 mb-2">{question}</p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCheckInResponse(question, 'yes')}
                      className={checkInResponses[question] === 'yes' ? 'bg-green-100 border-green-300' : ''}
                    >
                      <FontAwesomeIcon icon={faThumbsUp} className="w-3 h-3 mr-1" />
                      Yes
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCheckInResponse(question, 'no')}
                      className={checkInResponses[question] === 'no' ? 'bg-red-100 border-red-300' : ''}
                    >
                      <FontAwesomeIcon icon={faThumbsDown} className="w-3 h-3 mr-1" />
                      No
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCheckInResponse(question, 'tell_me_more')}
                      className={checkInResponses[question] === 'tell_me_more' ? 'bg-blue-100 border-blue-300' : ''}
                    >
                      Tell me more
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Conversation Mode - Plus*/}
      {userTier === 'plus' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-blue-500" />
              Ask Your AI Coach
            </CardTitle>
            <CardDescription>
              Have a specific question? Chat directly with your AI financial coach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Ask me anything about your portfolio, goals, or financial strategy..."
                value={conversationMessage}
                onChange={(e) => setConversationMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Your AI coach has full context of your goals and portfolio
                </p>
                <Button 
                  onClick={() => conversationMutation.mutate(conversationMessage)}
                  disabled={!conversationMessage.trim() || conversationMutation.isPending}
                >
                  {conversationMutation.isPending ? (
                    <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
          <CardContent className="p-6 text-center">
            <FontAwesomeIcon icon={faRobot} className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="font-semibold text-blue-800 mb-2">AI Conversation Mode</h3>
            <p className="text-blue-700 text-sm mb-4">
              Upgrade to Plus to chat directly with your AI coach and get personalized answers to any financial question.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Upgrade to Plus
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - NOW WITH REAL FUNCTIONALITY */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          variant="outline" 
          onClick={() => generateSessionMutation.mutate('weekly_checkin')}
          disabled={generateSessionMutation.isPending}
          className="flex-1"
        >
          {generateSessionMutation.isPending ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faClock} className="w-4 h-4 mr-2" />
              Refresh Insights
            </>
          )}
        </Button>
        <Button 
          className="flex-1"
          onClick={handleViewFullProgress}
        >
          <FontAwesomeIcon icon={faEye} className="w-4 h-4 mr-2" />
          View Full Progress
        </Button>
      </div>
    </div>
  );
}

function ProgressCard({ 
  title, 
  value, 
  change, 
  positive, 
  iconName 
}: { 
  title: string; 
  value: string; 
  change: string | null; 
  positive: boolean; 
  iconName: string;
}) {
  const getIcon = (name: string) => {
    switch (name) {
      case 'target':
        return <FontAwesomeIcon icon={faBullseye} className={`w-6 h-6 ${positive ? 'text-green-600' : 'text-red-600'}`} />;
      case 'trending':
        return <FontAwesomeIcon icon={faChartLine} className={`w-6 h-6 ${positive ? 'text-green-600' : 'text-red-600'}`} />;
      case 'chart':
        return <FontAwesomeIcon icon={faChartBar} className={`w-6 h-6 ${positive ? 'text-green-600' : 'text-red-600'}`} />;
      default:
        return <FontAwesomeIcon icon={faChartLine} className={`w-6 h-6 ${positive ? 'text-green-600' : 'text-red-600'}`} />;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={`text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}>
                {change} from last week
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${positive ? 'bg-green-100' : 'bg-red-100'}`}>
            {getIcon(iconName)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AIInsightCard({ insight }: { insight: any }) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'progress':
        return <FontAwesomeIcon icon={faBullseye} className="w-5 h-5 text-blue-500" />;
      case 'behavior':
        return <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-purple-500" />;
      case 'market':
        return <FontAwesomeIcon icon={faGlobe} className="w-5 h-5 text-green-500" />;
      case 'milestone':
        return <FontAwesomeIcon icon={faStar} className="w-5 h-5 text-yellow-500" />;
      case 'concern':
        return <FontAwesomeIcon icon={faExclamationCircle} className="w-5 h-5 text-red-500" />;
      default:
        return <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}>
      <div className="flex items-start gap-3">
        {getInsightIcon(insight.type)}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
          <p className="text-sm text-gray-700">{insight.message}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ 
  recommendation, 
  onTakeAction 
}: { 
  recommendation: any; 
  onTakeAction: () => void;
}) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-700 bg-green-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'low':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'text-green-700 bg-green-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'high':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getActionIcon = (category: string) => {
    switch (category) {
      case 'savings':
        return faCalculator;
      case 'investment':
      case 'behavioral':
        return faGraduationCap;
      case 'risk':
        return faChartLine;
      case 'tax':
        return faCalculator;
      default:
        return faArrowRight;
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2">{recommendation.title}</h4>
          <p className="text-sm text-gray-700 mb-3">{recommendation.description}</p>
          <div className="flex gap-2">
            <Badge variant="secondary" className={getImpactColor(recommendation.impact)}>
              {recommendation.impact} impact
            </Badge>
            <Badge variant="secondary" className={getEffortColor(recommendation.effort)}>
              {recommendation.effort} effort
            </Badge>
            <Badge variant="outline">
              {recommendation.category}
            </Badge>
          </div>
        </div>
        <Button 
          size="sm"
          onClick={onTakeAction}
          className="flex items-center gap-1"
        >
          <FontAwesomeIcon icon={getActionIcon(recommendation.category)} className="w-3 h-3" />
          Take Action
        </Button>
      </div>
    </div>
  );
}

function CoachingLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-48 bg-gray-200 rounded-lg" />
      <div className="h-32 bg-gray-200 rounded-lg" />
    </div>
  );
}