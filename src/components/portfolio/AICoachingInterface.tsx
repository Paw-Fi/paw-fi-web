import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useInView } from 'framer-motion';
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
  faArrowRight,
  faSpinner,
  faExclamationCircle,
  faStar,
  faThumbsUp,
  faThumbsDown,
  faCheck,
  faRefresh,
  faBrain,
  faEye,
  faChevronDown,
  faChevronUp,
  faMagic,
  faSync,
  faZap,
  faRotateLeft,
  faCog,
  faArrowUpLong,
  faMagicWandSparkles,
  faUser,
  faMessage
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
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function AICoachingInterface({ userId, goalId, userTier }: AICoachingInterfaceProps) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [respondedQuestions, setRespondedQuestions] = useState<Set<string>>(new Set());
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [localResponseStates, setLocalResponseStates] = useState<Record<string, string>>({});
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [portfolioUpdateIndicator, setPortfolioUpdateIndicator] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [aiThinkingProcess, setAiThinkingProcess] = useState<string>('');
  
  const router = useRouter();
  const queryClient = useQueryClient();
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef);

  // Fetch financial goal data for display
  const { data: financialGoal } = useQuery({
    queryKey: ['financial-goal', goalId],
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

  // Handle sending messages in the new portfolio optimization interface
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !conversationMutation.isPending) {
      conversationMutation.mutate(newMessage.trim());
    }
  };

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
    }
  });

  // Handle generateSessionMutation errors
  React.useEffect(() => {
    if (generateSessionMutation.error) {
      toast.error(`Failed to generate coaching insights: ${generateSessionMutation.error.message}`);
    }
  }, [generateSessionMutation.error]);

  // Enhanced conversation mutation with portfolio update indicators
  const conversationMutation = useMutation({
    mutationFn: async (message: string) => {
      // Add user message to both chat interfaces immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Show AI thinking process
      setAiThinkingProcess('Analyzing your message...');
      
      // Add sophisticated loading assistant message
      const loadingMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Analyzing your portfolio and generating insights...',
        timestamp: new Date(),
        isLoading: true
      };
      
      setMessages(prev => [...prev, loadingMessage]);

      // Simulate progressive thinking updates
      setTimeout(() => setAiThinkingProcess('Reviewing your portfolio performance...'), 1000);
      setTimeout(() => setAiThinkingProcess('Analyzing market conditions...'), 2000);
      setTimeout(() => setAiThinkingProcess('Generating personalized recommendations...'), 3000);

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
      // Clear thinking process
      setAiThinkingProcess('');
      
      // Create comprehensive response with rich data presentation
      let responseContent = '';
      
      // Handle the rich backend response structure
      if (data.insights?.personalizedMessage) {
        responseContent = data.insights.personalizedMessage;
      } else if (data.insights?.summary) {
        responseContent = data.insights.summary;
      } else {
        responseContent = 'Thank you for your message! I\'ve analyzed your portfolio and updated your insights.';
      }
      
      // Add AI observations in structured format
      if (data.insights?.observations && data.insights.observations.length > 0) {
        responseContent += '\n\n🔍 **Key Observations:**\n';
        data.insights.observations.slice(0, 3).forEach((obs: any, i: number) => {
          responseContent += `${i + 1}. ${obs.title}: ${obs.message}\n`;
        });
      }
      
      // Add recommendations with actionable format
      if (data.insights?.recommendations && data.insights.recommendations.length > 0) {
        responseContent += '\n\n💡 **Recommended Actions:**\n';
        data.insights.recommendations.slice(0, 2).forEach((rec: any, i: number) => {
          responseContent += `${i + 1}. ${rec.title} (${rec.impact} impact)\n`;
        });
      }
      
      // Add engagement questions
      if (data.insights?.engagementQuestions && data.insights.engagementQuestions.length > 0) {
        responseContent += `\n\n❓ ${data.insights.engagementQuestions[0]}`;
      }
      
      // Replace loading message with enhanced response
      setMessages(prev => 
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
      
      // Show portfolio update indicator
      setPortfolioUpdateIndicator(true);
      setTimeout(() => setPortfolioUpdateIndicator(false), 5000);
      
      // Refresh coaching session data and portfolio data for real-time updates
      queryClient.invalidateQueries({ queryKey: ['coaching-session', userId, goalId] });
      queryClient.invalidateQueries({ queryKey: ['ai-portfolio', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-performance', goalId] });
      
      setNewMessage('');
      toast.success('🧠 AI insights updated! Portfolio data synchronized.');
    }
  });

  // Handle conversationMutation errors
  React.useEffect(() => {
    if (conversationMutation.error) {
      // Remove loading message on error
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      toast.error(`Failed to send message: ${conversationMutation.error.message}`);
    }
  }, [conversationMutation.error]);

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
    <div className="relative min-h-screen">
      {/* Portfolio Update Indicator */}
      <AnimatePresence>
        {portfolioUpdateIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border border-white/20"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faSync} className="w-4 h-4 animate-spin" />
              <span className="text-sm font-semibold">Portfolio Updated</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Thinking Process Indicator */}
      <AnimatePresence>
        {aiThinkingProcess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-4 left-4 z-50 bg-black/80 backdrop-blur-xl text-white px-4 py-2 rounded-full border border-white/10"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBrain} className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-sm">{aiThinkingProcess}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8 p-6">
        {/* Glassmorphism AI Coach Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-800 opacity-90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
          
          <div className="relative backdrop-blur-2xl border border-white/10 rounded-3xl p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20"
                >
                  <FontAwesomeIcon icon={faRobot} className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-bold text-white mb-2"
                  >
                    {insights.greeting || "Great to see you back!"}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80 text-lg"
                  >
                    {insights.summary || "Here's your weekly financial check-in"}
                  </motion.p>
                  {insights.confidenceScore && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 }}
                      className="mt-3 flex items-center gap-2"
                    >
                      <div className="px-3 py-1 bg-white/20 backdrop-blur-xl rounded-full border border-white/30">
                        <span className="text-white text-sm font-semibold">
                          {Math.round(insights.confidenceScore * 100)}% AI Confidence
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <div className="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                    <span className="text-white text-sm font-medium">
                      {latestSession?.coaching_personality || 'friend'} mode
                    </span>
                  </div>
                  <p className="text-white/70 text-xs">
                    {latestSession?.created_at ? formatDistanceToNow(new Date(latestSession.created_at)) : 'just now'}
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Progress Overview with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <EnhancedProgressCard
            title="Goal Progress"
            value={goalData ? `${Math.round((goalData.current_amount / goalData.target_amount) * 100)}%` : "0%"}
            change={goalData ? `+${Math.round(((goalData.current_amount / goalData.target_amount) * 100) / 12)}%` : "+0%"}
            positive={true}
            iconName="target"
            progress={goalData ? (goalData.current_amount / goalData.target_amount) * 100 : 0}
            index={0}
          />
          <EnhancedProgressCard
            title="Current Amount"
            value={goalData ? `$${goalData.current_amount.toLocaleString()}` : "$0"}
            change={goalData ? `Target: $${goalData.target_amount.toLocaleString()}` : "No target set"}
            positive={goalData ? goalData.current_amount > 0 : false}
            iconName="trending"
            progress={goalData ? Math.min((goalData.current_amount / goalData.target_amount) * 100, 100) : 0}
            index={1}
          />
          <EnhancedProgressCard
            title="Monthly Contribution"
            value={goalData ? `$${goalData.monthly_contribution.toLocaleString()}` : "$0"}
            change={goalData ? `${Math.ceil((new Date(goalData.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} months left` : "No deadline"}
            positive={goalData ? goalData.monthly_contribution > 0 : false}
            iconName="chart"
            progress={goalData ? Math.min((goalData.monthly_contribution / (goalData.target_amount / 120)) * 100, 100) : 0}
            index={2}
          />
        </motion.div>

        {/* Enhanced AI Insights with Progressive Disclosure */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl opacity-60" />
          <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg"
                >
                  <FontAwesomeIcon icon={faBrain} className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    AI Intelligence Center
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Smart insights powered by your financial data
                  </p>
                </div>
              </div>
              
              {insights.confidenceScore && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: "spring" }}
                  className="flex items-center gap-2"
                >
                  <div className="w-16 h-16 relative">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="2"
                      />
                      <motion.path
                        d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                        fill="none"
                        stroke="url(#confidenceGradient)"
                        strokeWidth="2"
                        strokeDasharray={`${insights.confidenceScore * 100}, 100`}
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ strokeDasharray: `${insights.confidenceScore * 100}, 100` }}
                        transition={{ duration: 2, ease: "easeOut" }}
                      />
                      <defs>
                        <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-700">
                        {Math.round(insights.confidenceScore * 100)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Enhanced Insight Cards with Progressive Disclosure */}
            <div className="space-y-4">
              {insights.observations?.map((observation: any, index: number) => (
                <EnhancedInsightCard 
                  key={index} 
                  insight={observation} 
                  index={index}
                  isExpanded={expandedInsights.has(index.toString())}
                  onToggleExpand={() => {
                    const newExpanded = new Set(expandedInsights);
                    if (newExpanded.has(index.toString())) {
                      newExpanded.delete(index.toString());
                    } else {
                      newExpanded.add(index.toString());
                    }
                    setExpandedInsights(newExpanded);
                  }}
                />
              ))}
            </div>
            
            {/* Enhanced Personalized Message */}
            {insights.personalizedMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="mt-8 relative overflow-hidden rounded-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10" />
                <div className="relative bg-white/50 backdrop-blur-lg border border-white/30 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <motion.div
                      animate={{ 
                        boxShadow: ["0 0 20px rgba(59, 130, 246, 0.5)", "0 0 30px rgba(147, 51, 234, 0.5)", "0 0 20px rgba(59, 130, 246, 0.5)"]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"
                    >
                      <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        Personal AI Message
                        <FontAwesomeIcon icon={faMagic} className="w-4 h-4 text-purple-500" />
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {insights.personalizedMessage}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Enhanced Recommendations */}
        {insights.recommendations && insights.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl opacity-60" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg"
                >
                  <FontAwesomeIcon icon={faCheckCircle} className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Actionable Recommendations
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Personalized steps to accelerate your progress
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {insights.recommendations.map((recommendation: any, index: number) => (
                  <EnhancedRecommendationCard 
                    key={recommendation.id} 
                    recommendation={recommendation}
                    isCompleted={completedActions.has(recommendation.id)}
                    onTakeAction={() => handleRecommendationAction(recommendation)}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Market Commentary */}
        {insights.marketCommentary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl opacity-60" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="p-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl shadow-lg"
                >
                  <FontAwesomeIcon icon={faGlobe} className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Market Intelligence
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Real-time market insights for your portfolio
                  </p>
                </div>
              </div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-gray-700 leading-relaxed text-lg"
              >
                {insights.marketCommentary}
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Enhanced Next Steps */}
        {insights.nextSteps && insights.nextSteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl opacity-60" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="p-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-lg"
                >
                  <FontAwesomeIcon icon={faArrowRight} className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Your Action Plan
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Personalized steps to reach your goals faster
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {insights.nextSteps.map((step: string, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.6 + index * 0.1 }}
                    className="group relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl transform group-hover:scale-105 transition-transform duration-200 opacity-50" />
                    <div className="relative p-4 bg-white/40 backdrop-blur-lg border border-white/30 rounded-2xl hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start gap-4">
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                        >
                          {index + 1}
                        </motion.div>
                        <p className="text-gray-800 font-medium leading-relaxed">{step}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Engagement Questions */}
        {insights.engagementQuestions && insights.engagementQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-orange-50 rounded-3xl opacity-60" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="p-3 bg-gradient-to-br from-rose-400 to-orange-500 rounded-2xl shadow-lg"
                >
                  <FontAwesomeIcon icon={faComment} className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
                    Quick Check-In
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Help your AI coach understand your progress
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {insights.engagementQuestions.map((question: string, index: number) => {
                  const questionKey = question.substring(0, 50);
                  const hasResponded = respondedQuestions.has(questionKey);
                  const userResponse = localResponseStates[questionKey];
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.8 + index * 0.1 }}
                      className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                        hasResponded 
                          ? 'bg-green-100/70 border-green-300' 
                          : 'bg-white/50 border-white/30 hover:bg-white/70'
                      } border backdrop-blur-lg`}
                    >
                      <div className="p-5">
                        <p className="font-medium text-gray-800 mb-4 text-lg">{question}</p>
                        {hasResponded ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-green-700"
                          >
                            <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
                            <span className="font-medium">You responded: {userResponse}</span>
                          </motion.div>
                        ) : (
                          <div className="flex gap-3">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCheckInResponse('yes', question)}
                              className="px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                            >
                              <FontAwesomeIcon icon={faThumbsUp} className="w-4 h-4" />
                              Yes
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCheckInResponse('no', question)}
                              className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                            >
                              <FontAwesomeIcon icon={faThumbsDown} className="w-4 h-4" />
                              No
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCheckInResponse('tell_me_more', question)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                            >
                              <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                              Tell me more
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Portfolio Optimization Interface */}
        {userTier === 'plus' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl border border-purple-200/50 shadow-2xl overflow-hidden"
          >
            {/* Enhanced Header with Portfolio Context */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 p-6 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                    <FontAwesomeIcon icon={faBrain} className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-white">AI Portfolio Optimizer</h3>
                      <div className="flex items-center space-x-1 px-2 py-1 bg-white/20 rounded-full">
                        <div className="h-2 w-2 bg-green-300 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-300 font-medium">Live</span>
                      </div>
                    </div>
                    <p className="text-purple-100 opacity-90">Fine-tune your portfolio with AI insights</p>
                  </div>
                </div>
                
                {/* Portfolio Status Indicator */}
                <div className="text-right">
                  <div className="text-white/90 text-sm">Current Value</div>
                  <div className="text-white font-bold text-lg">
                    ${financialGoal?.current_amount?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation Area with Enhanced Context */}
            <div className="p-6 max-h-96 overflow-y-auto bg-gradient-to-b from-slate-50/50 to-white/80">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={`mb-6 flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start space-x-3 max-w-[85%]">
                      {message.type === 'ai' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg flex-shrink-0 mt-1">
                          <FontAwesomeIcon icon={faBrain} className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-auto'
                            : 'bg-white border border-gray-200/80 text-gray-800'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      {message.type === 'user' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg flex-shrink-0 mt-1">
                          <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Enhanced Loading State */}
              {conversationMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start mb-6"
                >
                  <div className="flex items-start space-x-3 max-w-[85%]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg flex-shrink-0">
                      <FontAwesomeIcon icon={faBrain} className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <div className="bg-white border border-gray-200/80 text-gray-800 px-4 py-3 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                            className="w-2 h-2 bg-purple-500 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                            className="w-2 h-2 bg-purple-500 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
                            className="w-2 h-2 bg-purple-500 rounded-full"
                          />
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-purple-600">Optimizing Portfolio</div>
                          <div className="text-gray-500 text-xs">Analyzing allocations & generating insights...</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Enhanced Input Interface with Portfolio Context */}
            <div className="p-6 border-t border-gray-200/50 bg-gradient-to-r from-slate-50/80 to-white/90">
              <form onSubmit={handleSendMessage} className="space-y-4">
                {/* Input Field with Enhanced Styling */}
                <div className="relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Describe how you'd like to adjust your portfolio strategy..."
                    className="w-full px-5 py-4 border-2 border-gray-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/90 backdrop-blur-sm text-gray-800 placeholder-gray-500 shadow-sm transition-all duration-300"
                    disabled={conversationMutation.isPending}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <FontAwesomeIcon icon={faMessage} className="h-5 w-5" />
                  </div>
                </div>

                {/* Smart Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {/* Primary Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={conversationMutation.isPending || !newMessage.trim()}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg border border-purple-400/30 font-medium"
                  >
                    <FontAwesomeIcon icon={faZap} className="h-4 w-4" />
                    <span>Optimize Portfolio</span>
                  </motion.button>

                  {/* Quick Action Buttons */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setNewMessage("Rebalance my portfolio to match my risk tolerance")}
                    disabled={conversationMutation.isPending}
                    className="flex items-center space-x-2 px-4 py-3 bg-white border-2 border-purple-200 text-purple-600 rounded-2xl hover:bg-purple-50 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm font-medium"
                  >
                    <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                    <span>Rebalance</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setNewMessage("Fine-tune my allocations for better performance")}
                    disabled={conversationMutation.isPending}
                    className="flex items-center space-x-2 px-4 py-3 bg-white border-2 border-indigo-200 text-indigo-600 rounded-2xl hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm font-medium"
                  >
                    <FontAwesomeIcon icon={faCog} className="h-4 w-4" />
                    <span>Fine-tune</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setNewMessage("Analyze my portfolio performance and suggest improvements")}
                    disabled={conversationMutation.isPending}
                    className="flex items-center space-x-2 px-4 py-3 bg-white border-2 border-emerald-200 text-emerald-600 rounded-2xl hover:bg-emerald-50 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm font-medium"
                  >
                    <FontAwesomeIcon icon={faArrowUpLong} className="h-4 w-4" />
                    <span>Analyze</span>
                  </motion.button>
                </div>

                {/* Status Information */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>AI Portfolio Coach is ready to optimize</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FontAwesomeIcon icon={faMagicWandSparkles} className="h-3 w-3" />
                    <span>Powered by advanced AI analysis</span>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 opacity-10" />
            <div className="relative bg-white/50 backdrop-blur-xl border-2 border-dashed border-indigo-300 rounded-3xl p-8 text-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
              >
                <FontAwesomeIcon icon={faRobot} className="w-10 h-10 text-white" />
              </motion.div>
              
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                AI Portfolio Optimizer
              </h3>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Unlock intelligent portfolio optimization with your personal AI coach. Get real-time rebalancing, fine-tuning, and strategic guidance.
              </p>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.navigate({ to: '/pricing' })}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 text-lg"
              >
                Upgrade to Premium Pro
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Enhanced Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-6"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => generateSessionMutation.mutate('weekly_checkin')}
            disabled={generateSessionMutation.isPending}
            className="flex-1 relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-500/20" />
            <div className="relative flex items-center justify-center gap-3">
              {generateSessionMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 text-blue-600" />
                  </motion.div>
                  <span className="font-semibold text-gray-700">Generating...</span>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FontAwesomeIcon icon={faRefresh} className="w-5 h-5 text-blue-600" />
                  </motion.div>
                  <span className="font-semibold text-gray-700">Refresh AI Insights</span>
                </>
              )}
            </div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.navigate({ 
              to: '/portfolio/goal/$goalId',
              params: { goalId },
              search: { section: 'progress', source: 'ai_coaching' }
            })}
            className="flex-1 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex items-center justify-center gap-3 text-white">
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5" />
              </motion.div>
              <span className="font-semibold">View Full Progress</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Floating Navigation Indicator */}
        <AnimatePresence>
          {!isHeaderInView && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-40"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => headerRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-xl backdrop-blur-lg border border-white/20"
              >
                <FontAwesomeIcon icon={faRobot} className="w-6 h-6" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EnhancedProgressCard({ 
  title, 
  value, 
  change, 
  positive, 
  iconName,
  progress,
  index
}: { 
  title: string; 
  value: string; 
  change: string | null; 
  positive: boolean; 
  iconName: string;
  progress: number;
  index: number;
}) {
  const getIcon = (name: string) => {
    switch (name) {
      case 'target':
        return <FontAwesomeIcon icon={faBullseye} className="w-7 h-7 text-white" />;
      case 'trending':
        return <FontAwesomeIcon icon={faChartLine} className="w-7 h-7 text-white" />;
      case 'chart':
        return <FontAwesomeIcon icon={faChartBar} className="w-7 h-7 text-white" />;
      default:
        return <FontAwesomeIcon icon={faChartLine} className="w-7 h-7 text-white" />;
    }
  };

  const gradientClasses = [
    'from-emerald-400 to-green-500',
    'from-blue-400 to-indigo-500', 
    'from-purple-400 to-pink-500'
  ];

  const bgGradient = gradientClasses[index % gradientClasses.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="relative group"
    >
      {/* Background Glass Effect */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl group-hover:shadow-2xl transition-all duration-300" />
      
      {/* Progress Background */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ delay: 1 + index * 0.1, duration: 1.5, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${bgGradient} opacity-10`}
        />
      </div>
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <motion.p 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              className="text-3xl font-bold text-gray-900"
            >
              {value}
            </motion.p>
            {change && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 + index * 0.1 }}
                className={`text-sm font-medium mt-1 ${positive ? 'text-green-600' : 'text-red-600'}`}
              >
                {change}
              </motion.p>
            )}
          </div>
          
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`p-4 bg-gradient-to-br ${bgGradient} rounded-2xl shadow-lg`}
          >
            {getIcon(iconName)}
          </motion.div>
        </div>
        
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ delay: 1 + index * 0.1, duration: 1.5, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${bgGradient} rounded-full`}
            />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.8 + index * 0.1, type: "spring" }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-current text-transparent"
            style={{ left: `${Math.min(progress, 95)}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function EnhancedInsightCard({ 
  insight, 
  index, 
  isExpanded, 
  onToggleExpand 
}: { 
  insight: any; 
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'progress':
        return <FontAwesomeIcon icon={faBullseye} className="w-6 h-6 text-white" />;
      case 'behavior':
        return <FontAwesomeIcon icon={faRobot} className="w-6 h-6 text-white" />;
      case 'market':
        return <FontAwesomeIcon icon={faGlobe} className="w-6 h-6 text-white" />;
      case 'milestone':
        return <FontAwesomeIcon icon={faStar} className="w-6 h-6 text-white" />;
      case 'concern':
        return <FontAwesomeIcon icon={faExclamationCircle} className="w-6 h-6 text-white" />;
      default:
        return <FontAwesomeIcon icon={faLightbulb} className="w-6 h-6 text-white" />;
    }
  };

  const getSeverityGradient = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'from-green-400 to-emerald-500';
      case 'warning':
        return 'from-yellow-400 to-orange-500';
      case 'error':
        return 'from-red-400 to-pink-500';
      default:
        return 'from-blue-400 to-indigo-500';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'from-green-50 to-emerald-50';
      case 'warning':
        return 'from-yellow-50 to-orange-50';
      case 'error':
        return 'from-red-50 to-pink-50';
      default:
        return 'from-blue-50 to-indigo-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
      className="relative group"
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${getSeverityBg(insight.severity)} rounded-2xl opacity-50`} />
      <div className="relative bg-white/60 backdrop-blur-lg border border-white/30 rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
        
        <div className="flex items-start gap-4">
          {/* Icon */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`p-3 bg-gradient-to-br ${getSeverityGradient(insight.severity)} rounded-xl shadow-lg flex-shrink-0`}
          >
            {getInsightIcon(insight.type)}
          </motion.div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800 text-lg">{insight.title}</h4>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleExpand}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon 
                  icon={isExpanded ? faChevronUp : faChevronDown} 
                  className="w-4 h-4" 
                />
              </motion.button>
            </div>
            
            <p className="text-gray-700 leading-relaxed mb-3">
              {insight.message}
            </p>
            
            {/* Severity Indicator */}
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 bg-gradient-to-r ${getSeverityGradient(insight.severity)} text-white text-xs font-medium rounded-full`}>
                {insight.severity || 'info'}
              </div>
              {insight.actionable && (
                <div className="px-3 py-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs font-medium rounded-full">
                  Actionable
                </div>
              )}
            </div>
            
            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 pt-4 border-t border-gray-200/50"
                >
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-gray-800 text-sm mb-1">Impact Analysis</h5>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '75%' }}
                          transition={{ delay: 0.2, duration: 1 }}
                          className={`h-2 bg-gradient-to-r ${getSeverityGradient(insight.severity)} rounded-full`}
                        />
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">Recommended Actions:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Review portfolio allocation</li>
                        <li>Consider rebalancing opportunities</li>
                        <li>Monitor market conditions</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EnhancedRecommendationCard({ 
  recommendation, 
  isCompleted,
  onTakeAction,
  index
}: { 
  recommendation: any; 
  isCompleted: boolean;
  onTakeAction: () => void;
  index: number;
}) {
  const getImpactGradient = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'from-emerald-400 to-green-500';
      case 'medium':
        return 'from-yellow-400 to-orange-500';
      case 'low':
        return 'from-blue-400 to-cyan-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getEffortGradient = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'from-green-400 to-emerald-500';
      case 'medium':
        return 'from-yellow-400 to-orange-500';
      case 'high':
        return 'from-red-400 to-pink-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'investment':
        return <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />;
      case 'savings':
        return <FontAwesomeIcon icon={faBullseye} className="w-4 h-4" />;
      case 'risk':
        return <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4" />;
      default:
        return <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1 + index * 0.1, duration: 0.5 }}
      className={`relative group overflow-hidden rounded-2xl transition-all duration-300 ${
        isCompleted 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
          : 'bg-white/60 border-white/30 hover:bg-white/80 hover:shadow-xl'
      } border backdrop-blur-lg`}
    >
      {/* Completion Overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10" />
      )}
      
      <div className="relative p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`p-2 bg-gradient-to-br ${getImpactGradient(recommendation.impact)} rounded-lg shadow-lg`}
              >
                {getCategoryIcon(recommendation.category)}
                <span className="sr-only">{recommendation.category}</span>
              </motion.div>
              
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  {recommendation.title}
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      <FontAwesomeIcon icon={faCheck} className="w-5 h-5 text-green-600" />
                    </motion.div>
                  )}
                </h4>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4 leading-relaxed">{recommendation.description}</p>
            
            {/* Enhanced Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className={`px-3 py-1 bg-gradient-to-r ${getImpactGradient(recommendation.impact)} text-white text-xs font-bold rounded-full shadow-sm`}>
                {recommendation.impact} impact
              </div>
              <div className={`px-3 py-1 bg-gradient-to-r ${getEffortGradient(recommendation.effort)} text-white text-xs font-bold rounded-full shadow-sm`}>
                {recommendation.effort} effort
              </div>
              <div className="px-3 py-1 bg-gradient-to-r from-indigo-400 to-purple-500 text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1">
                {getCategoryIcon(recommendation.category)}
                {recommendation.category}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onTakeAction}
          disabled={isCompleted}
          className={`w-full relative overflow-hidden rounded-xl p-4 font-semibold transition-all duration-300 ${
            isCompleted 
              ? 'bg-green-100 text-green-700 cursor-default border border-green-200' 
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl disabled:opacity-50'
          }`}
        >
          <div className="relative flex items-center justify-center gap-2">
            {isCompleted ? (
              <>
                <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
                Completed
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5" />
                Take Action
              </>
            )}
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

function CoachingLoadingSkeleton() {
  return (
    <div className="relative min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        {/* Header Skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden rounded-3xl h-48"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 animate-pulse" />
          <div className="relative backdrop-blur-2xl border border-white/10 rounded-3xl p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full animate-pulse" />
                <div className="space-y-2">
                  <div className="h-8 w-64 bg-white/20 rounded-lg animate-pulse" />
                  <div className="h-4 w-48 bg-white/20 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-6 w-24 bg-white/20 rounded-full animate-pulse" />
                <div className="h-3 w-16 bg-white/20 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Progress Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl" />
              <div className="relative p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse" />
                </div>
                <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Content Sections Skeleton */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl opacity-60" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}