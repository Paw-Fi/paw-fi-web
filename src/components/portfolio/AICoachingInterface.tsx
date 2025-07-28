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
  faCheck,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

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
      action_url?: string;
    }>;
    marketCommentary?: string;
    personalizedMessage: string;
    engagementQuestions: string[];
    nextSteps: string[];
    confidenceScore: number;
  };
  engagement_score?: number;
  coaching_personality: string;
  created_at: string;
  completed_actions?: any[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function AICoachingInterface({ userId, goalId, userTier }: AICoachingInterfaceProps) {
  const [conversationMessage, setConversationMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [respondedQuestions, setRespondedQuestions] = useState<Set<string>>(new Set());
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [localResponseStates, setLocalResponseStates] = useState<Record<string, string>>({});
  
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch real goal data
  const { data: goalData } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('id', goalId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!goalId
  });

  // Fetch latest coaching session with proper error handling
  const { data: sessionData, isLoading, error, refetch } = useQuery({
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
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    enabled: !!userId && !!goalId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Generate new coaching session mutation
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
      toast.success('🤖 New coaching insights generated!');
    },
    onError: (error) => {
      toast.error(`Failed to generate coaching insights: ${error.message}`);
    }
  });

  // Send conversation message mutation with proper feedback
  const conversationMutation = useMutation({
    mutationFn: async (message: string) => {
      // Add user message to chat immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      
      // Add loading assistant message
      const loadingMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Thinking...',
        timestamp: new Date(),
        isLoading: true
      };
      
      setChatMessages(prev => [...prev, loadingMessage]);

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
      
      return { data, userMessage, loadingMessage };
    },
    onSuccess: ({ data, loadingMessage }) => {
      // Create a comprehensive response from the API data
      let responseContent = '';
      
      if (data.insights?.personalizedMessage) {
        responseContent = data.insights.personalizedMessage;
      } else if (data.insights?.summary) {
        responseContent = data.insights.summary;
      } else {
        responseContent = 'Thank you for your message! I\'ve noted this for your coaching plan.';
      }
      
      // Add next steps or recommendations if available
      if (data.insights?.nextSteps && data.insights.nextSteps.length > 0) {
        responseContent += `\n\n📋 Here are some next steps for you:\n${data.insights.nextSteps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}`;
      }
      
      // Add engagement questions if available
      if (data.insights?.engagementQuestions && data.insights.engagementQuestions.length > 0) {
        responseContent += `\n\n💭 I'd love to know: ${data.insights.engagementQuestions[0]}`;
      }
      
      // Replace loading message with actual response
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                content: responseContent,
                isLoading: false
              }
            : msg
        )
      );
      
      // Refresh coaching session data and portfolio data for real-time updates
      queryClient.invalidateQueries({ queryKey: ['coaching-session', userId, goalId] });
      queryClient.invalidateQueries({ queryKey: ['ai-portfolio', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-performance', goalId] });
      
      setConversationMessage('');
      toast.success('💬 AI coach updated your portfolio insights!');
    },
    onError: (error, _message, context: { userMessage: ChatMessage; loadingMessage: ChatMessage } | undefined) => {
      // Remove loading message on error
      if (context?.loadingMessage) {
        setChatMessages(prev => prev.filter(msg => msg.id !== context.loadingMessage.id));
      }
      toast.error(`Failed to send message: ${error.message}`);
    }
  });

  // Handle recommendation actions with immediate feedback
  const handleRecommendationAction = async (action: any) => {
    try {
      // Immediate UI feedback
      setCompletedActions(prev => new Set([...prev, action.id]));
      toast.success(`✅ Action taken: ${action.title}`);

      // Track the action in database
      if (action?.id && goalId) {
        await supabase.from('ai_recommendation_actions').insert({
          user_id: userId,
          coaching_session_id: sessionData?.latestSession?.id,
          recommendation_id: action.id,
          action_type: 'clicked',
          action_data: action
        });
      }

      // Navigate based on action category with validated routes
      switch (action.category) {
        case 'savings':
          router.navigate({ 
            to: '/calculators/saving-goals-calculator', 
            search: { goalId: goalId, source: 'ai_recommendation' } 
          });
          break;
        case 'investment':
          router.navigate({
            to: '/dashboard/learning',
            search: { 
              topic: 'investing', 
              source: 'ai_recommendation',
              action: 'learn',
              question: 'How to invest wisely?'
            }
          });
          break;
        case 'risk':
          router.navigate({
            to: '/portfolio/goal/$goalId',
            params: { goalId },
            search: { section: 'risk_analysis', source: 'ai_coaching' }
          });
          break;
        default:
          router.navigate({ to: '/dashboard/portfolio' });
      }
    } catch (error) {
      console.error('Error tracking recommendation action:', error);
      // Still show success to user since navigation worked
    }
  };

  // Handle check-in responses with immediate feedback
  const handleCheckInResponse = async (response: string, question: string) => {
    try {
      // Immediate UI feedback
      const questionKey = question.substring(0, 50); // Use truncated question as key
      setLocalResponseStates(prev => ({ ...prev, [questionKey]: response }));
      setRespondedQuestions(prev => new Set([...prev, questionKey]));
      
      // Show immediate toast feedback
      const responseText = {
        'yes': '👍 Great to hear!',
        'no': '👌 Thanks for letting me know',
        'tell_me_more': '🤔 Let me explain more...'
      }[response] || '✅ Response recorded';
      
      toast.success(responseText);

      // Record in database
      if (sessionData?.latestSession?.id) {
        await supabase.from('coaching_check_in_responses').insert({
          user_id: userId,
          coaching_session_id: sessionData.latestSession.id,
          question_text: question,
          response_type: response
        });
      }

      // Handle "tell me more" action
      if (response === 'tell_me_more') {
        setTimeout(() => {
          router.navigate({
            to: '/dashboard/learning',
            search: { 
              topic: 'coaching',
              source: 'ai_recommendation',
              action: 'learn',
              question: question
            }
          });
        }, 1000); // Small delay to show the toast
      }
      
    } catch (error) {
      console.error('Error recording check-in response:', error);
      toast.error('Failed to record response, but we noted your feedback!');
    }
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
        <div className="space-y-2">
          <Button 
            onClick={() => generateSessionMutation.mutate('weekly_checkin')}
            disabled={generateSessionMutation.isPending}
            className="mr-2"
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
          {error && (
            <Button 
              variant="outline"
              onClick={() => refetch()}
            >
              <FontAwesomeIcon icon={faRefresh} className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const latestSession = sessionData.latestSession;
  const insights = sessionData.insights || latestSession?.ai_insights || {
    greeting: "Great to see you back!",
    summary: "Here's your weekly financial check-in",
    observations: [],
    recommendations: [],
    personalizedMessage: "Keep up the great work on your financial journey!",
    engagementQuestions: [],
    nextSteps: [],
    confidenceScore: 0.85
  };

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
                {latestSession?.coaching_personality || 'friend'}
              </Badge>
              <p className="text-xs text-green-100">
                {latestSession?.created_at ? formatDistanceToNow(new Date(latestSession.created_at)) : 'just now'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressCard
          title="Goal Progress"
          value={goalData ? `${Math.round((goalData.current_amount / goalData.target_amount) * 100)}%` : "0%"}
          change={goalData ? `+${Math.round(((goalData.current_amount / goalData.target_amount) * 100) / 12)}%` : "+0%"}
          positive={true}
          iconName="target"
        />
        <ProgressCard
          title="Current Amount"
          value={goalData ? `$${goalData.current_amount.toLocaleString()}` : "$0"}
          change={goalData ? `Target: $${goalData.target_amount.toLocaleString()}` : "No target set"}
          positive={goalData ? goalData.current_amount > 0 : false}
          iconName="trending"
        />
        <ProgressCard
          title="Monthly Contribution"
          value={goalData ? `$${goalData.monthly_contribution.toLocaleString()}` : "$0"}
          change={goalData ? `${Math.ceil((new Date(goalData.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} months left` : "No deadline"}
          positive={goalData ? goalData.monthly_contribution > 0 : false}
          iconName="chart"
        />
      </div>

      {/* AI Insights & Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yellow-500" />
              AI Insights & Observations
            </div>
            {insights.confidenceScore && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {Math.round(insights.confidenceScore * 100)}% confidence
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Personalized insights based on your progress and market conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.observations?.map((observation: any, index: number) => (
              <AIInsightCard key={index} insight={observation} />
            ))}
          </div>
          
          {/* Personalized Message */}
          {insights.personalizedMessage && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Personal Message</h4>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    {insights.personalizedMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
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
              {insights.recommendations.map((recommendation: any) => (
                <RecommendationCard 
                  key={recommendation.id} 
                  recommendation={recommendation}
                  isCompleted={completedActions.has(recommendation.id)}
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

      {/* Next Steps */}
      {insights.nextSteps && insights.nextSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 text-green-500" />
              Next Steps
            </CardTitle>
            <CardDescription>
              Your personalized action plan to reach your financial goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.nextSteps.map((step: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-green-800 font-medium">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Questions */}
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
              {insights.engagementQuestions.map((question: string, index: number) => {
                const questionKey = question.substring(0, 50);
                const hasResponded = respondedQuestions.has(questionKey);
                const userResponse = localResponseStates[questionKey];
                
                return (
                  <div key={index} className={`p-3 rounded-lg transition-all ${hasResponded ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <p className="font-medium text-gray-800 mb-2">{question}</p>
                    {hasResponded ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                        <span className="text-sm">You responded: {userResponse}</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCheckInResponse('yes', question)}
                        >
                          <FontAwesomeIcon icon={faThumbsUp} className="w-3 h-3 mr-1" />
                          Yes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCheckInResponse('no', question)}
                        >
                          <FontAwesomeIcon icon={faThumbsDown} className="w-3 h-3 mr-1" />
                          No
                        </Button>
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleCheckInResponse('tell_me_more', question)}
                        >
                          Tell me more
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Conversation Mode - Premium Pro */}
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
              {/* Chat Messages */}
              {chatMessages.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-800 shadow-sm'
                      }`}>
                        {message.isLoading ? (
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                            <span>{message.content}</span>
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                        <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
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
              Upgrade to Premium Pro to chat directly with your AI coach and get personalized answers to any financial question.
            </p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => router.navigate({ to: '/pricing' })}
            >
              Upgrade to Premium Pro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
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
          onClick={() => router.navigate({ 
            to: '/portfolio/goal/$goalId',
            params: { goalId },
            search: { section: 'progress', source: 'ai_coaching' }
          })}
        >
          <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 mr-2" />
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
  isCompleted,
  onTakeAction 
}: { 
  recommendation: any; 
  isCompleted: boolean;
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

  return (
    <div className={`p-4 border rounded-lg transition-all ${isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:shadow-md'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            {recommendation.title}
            {isCompleted && <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-green-600" />}
          </h4>
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
          disabled={isCompleted}
          variant={isCompleted ? "outline" : "primary"}
        >
          {isCompleted ? 'Completed' : 'Take Action'}
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