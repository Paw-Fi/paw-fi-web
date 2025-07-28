import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

interface RequestBody {
  userId: string;
  goalId?: string;
  message: string;
  conversationId?: string;
  conversationType?: 'general' | 'decision_explanation' | 'educational' | 'crisis_support' | 'goal_coaching';
  requestedComplexity?: 'simple' | 'detailed' | 'technical';
  contextualInfo?: Record<string, any>;
}

interface ConversationResponse {
  conversationId: string;
  response: {
    message: string;
    type: 'text' | 'educational' | 'decision_explanation' | 'action_required' | 'crisis_support';
    complexity: 'simple' | 'detailed' | 'technical';
    confidence: number;
    personalizedElements: PersonalizedElement[];
    followUpSuggestions: string[];
    educationalResources?: EducationalResource[];
    actionItems?: ActionItem[];
    emergencySupport?: EmergencySupport;
  };
  context: ConversationContext;
  learningUpdate?: LearningUpdate;
}

interface PersonalizedElement {
  type: 'greeting' | 'goal_reference' | 'portfolio_reference' | 'risk_preference' | 'recent_activity';
  content: string;
}

interface EducationalResource {
  title: string;
  description: string;
  type: 'article' | 'video' | 'interactive' | 'calculation';
  estimatedTime: number;
  relevanceScore: number;
}

interface ActionItem {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTime: number;
  category: 'portfolio' | 'goal' | 'education' | 'administrative';
}

interface EmergencySupport {
  severity: number;
  supportType: 'emotional' | 'financial' | 'technical';
  immediateActions: string[];
  escalationRecommended: boolean;
}

interface ConversationContext {
  userProfile: any;
  currentGoals: any[];
  portfolioState: any[];
  recentDecisions: any[];
  marketConditions: any;
  conversationHistory: any[];
  userEmotionalState: 'calm' | 'concerned' | 'worried' | 'excited' | 'confused';
  urgencyLevel: number;
}

interface LearningUpdate {
  topicsDiscussed: string[];
  understandingGained: number;
  engagementScore: number;
  followUpNeeded: boolean;
}

// Helper function to build conversation context
async function buildConversationContext(
  supabaseClient: any,
  userId: string,
  goalId?: string,
  conversationId?: string
): Promise<ConversationContext> {
  try {
    // Get user profile
    const { data: userProfile } = await supabaseClient
      .from('user_investment_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get user learning progress
    const { data: learningProgress } = await supabaseClient
      .from('user_learning_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get financial goals
    const { data: goals } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Get active portfolios
    const { data: portfolios } = await supabaseClient
      .from('ai_portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Get recent decisions
    const { data: recentDecisions } = await supabaseClient
      .from('ai_decision_reasoning')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get conversation history
    const { data: conversationHistory } = await supabaseClient
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent market data
    const { data: marketData } = await supabaseClient
      .from('market_data_cache')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0])
      .limit(5);

    // Assess user emotional state based on recent interactions
    const emotionalState = assessEmotionalState(conversationHistory, recentDecisions);

    return {
      userProfile: { ...userProfile, learningProgress },
      currentGoals: goals || [],
      portfolioState: portfolios || [],
      recentDecisions: recentDecisions || [],
      marketConditions: marketData || [],
      conversationHistory: conversationHistory || [],
      userEmotionalState: emotionalState,
      urgencyLevel: calculateUrgencyLevel(emotionalState, recentDecisions, goals)
    };

  } catch (error) {
    console.error('Error building conversation context:', error);
    return {
      userProfile: null,
      currentGoals: [],
      portfolioState: [],
      recentDecisions: [],
      marketConditions: [],
      conversationHistory: [],
      userEmotionalState: 'calm',
      urgencyLevel: 1
    };
  }
}

// Helper function to generate personalized response
function generatePersonalizedResponse(
  message: string,
  context: ConversationContext,
  conversationType: string,
  requestedComplexity: string
): {
  response: string;
  personalizedElements: PersonalizedElement[];
  confidence: number;
  followUpSuggestions: string[];
} {
  const personalizedElements: PersonalizedElement[] = [];
  let response = '';
  let confidence = 0.8;

  // Generate personalized greeting
  const userName = context.userProfile?.behavioral_preferences?.preferred_name || 'there';
  const timeOfDay = getTimeOfDay();
  
  personalizedElements.push({
    type: 'greeting',
    content: `Good ${timeOfDay}, ${userName}!`
  });

  // Analyze user message for intent
  const intent = analyzeMessageIntent(message);
  
  switch (conversationType) {
    case 'general':
      response = generateGeneralResponse(message, context, requestedComplexity, intent);
      break;
    case 'decision_explanation':
      response = generateDecisionExplanation(message, context, requestedComplexity);
      break;
    case 'educational':
      response = generateEducationalResponse(message, context, requestedComplexity);
      break;
    case 'crisis_support':
      response = generateCrisisSupport(message, context);
      confidence = 0.9; // High confidence in crisis support
      break;
    case 'goal_coaching':
      response = generateGoalCoaching(message, context, requestedComplexity);
      break;
    default:
      response = generateGeneralResponse(message, context, requestedComplexity, intent);
  }

  // Add contextual references
  if (context.currentGoals.length > 0) {
    const primaryGoal = context.currentGoals[0];
    const progress = (primaryGoal.current_amount / primaryGoal.target_amount) * 100;
    personalizedElements.push({
      type: 'goal_reference',
      content: `Your ${primaryGoal.goal_type} goal is ${progress.toFixed(1)}% complete.`
    });
  }

  if (context.portfolioState.length > 0) {
    const latestPortfolio = context.portfolioState[0];
    personalizedElements.push({
      type: 'portfolio_reference',
      content: `Your current portfolio has a ${(latestPortfolio.confidence_score * 100).toFixed(0)}% AI confidence score.`
    });
  }

  // Generate follow-up suggestions
  const followUpSuggestions = generateFollowUpSuggestions(intent, context, conversationType);

  return {
    response,
    personalizedElements,
    confidence,
    followUpSuggestions
  };
}

function generateGeneralResponse(
  message: string,
  context: ConversationContext,
  complexity: string,
  intent: string
): string {
  const templates = {
    portfolio_question: {
      simple: "I'd be happy to help you understand your portfolio. Based on your current allocation, here's what you need to know...",
      detailed: "Let me break down your portfolio performance and allocation for you. Looking at your current holdings and recent market conditions...",
      technical: "Analyzing your portfolio metrics, risk-adjusted returns, and correlation matrices, here's the comprehensive assessment..."
    },
    goal_question: {
      simple: "Great question about your financial goals! Let me help you understand where you stand...",
      detailed: "Looking at your goal progress and timeline, here's a detailed analysis of your current trajectory...",
      technical: "Based on your goal parameters, contribution patterns, and expected returns, here's the quantitative analysis..."
    },
    market_question: {
      simple: "The current market situation is definitely worth discussing. Here's what it means for you...",
      detailed: "Current market conditions show several key trends that could impact your investments. Let me explain...",
      technical: "Market analysis indicates volatility patterns and correlation structures that suggest..."
    }
  };

  const template = templates[intent as keyof typeof templates];
  if (template) {
    return template[complexity as keyof typeof template];
  }

  return "I'm here to help with any questions you have about your investments, goals, or financial planning. What would you like to know more about?";
}

function generateDecisionExplanation(
  message: string,
  context: ConversationContext,
  complexity: string
): string {
  if (context.recentDecisions.length === 0) {
    return "I don't see any recent investment decisions to explain. Would you like me to walk you through how our AI makes recommendations in general?";
  }

  const latestDecision = context.recentDecisions[0];
  
  switch (complexity) {
    case 'simple':
      return `Let me explain our latest recommendation in simple terms. We suggested this change because ${latestDecision.primary_reasoning?.[0] || 'it aligns with your goals and risk preferences'}. The main benefit is improving your portfolio's balance.`;
    
    case 'detailed':
      return `Here's a detailed explanation of our recent recommendation: 

Primary reasoning: ${latestDecision.primary_reasoning?.join('. ') || 'Analysis completed'}

Market context: We considered current market conditions including volatility levels and sector performance.

Risk assessment: The change would ${latestDecision.risk_assessment?.risk_change > 0 ? 'slightly increase' : 'maintain or reduce'} your portfolio risk while staying aligned with your ${context.userProfile?.risk_tolerance || 'moderate'} risk tolerance.

Confidence level: We're ${Math.round((latestDecision.confidence_score || 0.8) * 100)}% confident in this recommendation based on our analysis.`;

    case 'technical':
      return `Technical analysis of the decision:

Quantitative factors: ${JSON.stringify(latestDecision.risk_assessment || {})}
Data sources: ${latestDecision.data_sources?.join(', ') || 'Portfolio analysis, market data'}
Expected outcomes: ${JSON.stringify(latestDecision.expected_outcomes || {})}
Alternative options considered: ${latestDecision.alternative_options?.length || 0} alternatives evaluated

The recommendation optimizes for risk-adjusted returns within your constraint parameters.`;

    default:
      return generateDecisionExplanation(message, context, 'detailed');
  }
}

function generateEducationalResponse(
  message: string,
  context: ConversationContext,
  complexity: string
): string {
  const educationalTopics = {
    'diversification': {
      simple: "Diversification means not putting all your eggs in one basket. By spreading your investments across different types of assets, you reduce the risk of losing money if one investment performs poorly.",
      detailed: "Diversification is a risk management strategy that involves spreading investments across various asset classes, sectors, and geographic regions. The goal is to reduce portfolio volatility by ensuring that poor performance in one area doesn't significantly impact your overall returns.",
      technical: "Diversification reduces unsystematic risk through correlation coefficient optimization. The modern portfolio theory demonstrates that a well-diversified portfolio can achieve better risk-adjusted returns (higher Sharpe ratio) than individual securities."
    },
    'rebalancing': {
      simple: "Rebalancing means adjusting your investments back to your target mix. If stocks go up a lot, you might have too much in stocks, so you'd sell some and buy bonds to get back to your preferred balance.",
      detailed: "Portfolio rebalancing is the process of realigning the weightings of assets in your portfolio. When market movements cause your asset allocation to drift from your target, rebalancing helps maintain your desired risk level and can potentially improve returns through systematic buying low and selling high.",
      technical: "Rebalancing addresses allocation drift that occurs due to differential asset class returns. Systematic rebalancing strategies (calendar-based vs. threshold-based) can reduce portfolio volatility and potentially enhance risk-adjusted returns through contrarian positioning."
    }
  };

  const topic = identifyEducationalTopic(message);
  const content = educationalTopics[topic as keyof typeof educationalTopics];
  
  if (content) {
    return content[complexity as keyof typeof content];
  }

  return "That's a great question! I'd love to help you learn more about that topic. Can you be more specific about what aspect you'd like to understand better?";
}

function generateCrisisSupport(message: string, context: ConversationContext): string {
  const crisisKeywords = ['panic', 'worried', 'scared', 'lost', 'crash', 'emergency'];
  const isCrisis = crisisKeywords.some(keyword => message.toLowerCase().includes(keyword));

  if (isCrisis) {
    return `I understand you're feeling concerned about your investments right now, and that's completely normal. Market volatility can be stressful, but let's take a step back and look at this calmly.

First, remember that your investment strategy was designed for long-term growth, and short-term market movements are expected. Your portfolio is diversified to help weather these storms.

Here's what I recommend right now:
1. Take a deep breath - emotional decisions often lead to poor outcomes
2. Review your original investment timeline - are your goals still years away?
3. Consider this: historically, markets recover from downturns

Would you like me to show you how your portfolio has performed over the longer term, or would you prefer to discuss specific concerns you have?

Remember, I'm here to support you through this, and we can always schedule a more detailed conversation if needed.`;
  }

  return "I'm here to provide support and guidance. What specifically is concerning you about your investments or financial situation?";
}

function generateGoalCoaching(
  message: string,
  context: ConversationContext,
  complexity: string
): string {
  if (context.currentGoals.length === 0) {
    return "I'd love to help you with goal coaching! It looks like you haven't set up any financial goals yet. Would you like me to guide you through creating your first goal?";
  }

  const goal = context.currentGoals[0];
  const progress = (goal.current_amount / goal.target_amount) * 100;
  const timeRemaining = Math.max(0, Math.ceil(
    (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ));

  return `Let's talk about your ${goal.goal_type} goal: "${goal.title}"

Current progress: ${progress.toFixed(1)}% complete (${goal.current_amount.toLocaleString()} of ${goal.target_amount.toLocaleString()})
Time remaining: ${Math.floor(timeRemaining / 365)} years and ${Math.floor((timeRemaining % 365) / 30)} months

${progress >= 75 ? 
  "Fantastic progress! You're well on your way to achieving this goal." :
  progress >= 50 ?
  "Good progress so far! Let's discuss strategies to accelerate your savings." :
  "We have some work to do, but don't worry - with the right strategy, you can get there."
}

What specific aspect of this goal would you like to discuss? I can help with contribution strategies, timeline adjustments, or investment optimization.`;
}

// Utility functions
function analyzeMessageIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('portfolio') || lowerMessage.includes('investment') || lowerMessage.includes('allocation')) {
    return 'portfolio_question';
  }
  if (lowerMessage.includes('goal') || lowerMessage.includes('target') || lowerMessage.includes('saving')) {
    return 'goal_question';
  }
  if (lowerMessage.includes('market') || lowerMessage.includes('economic') || lowerMessage.includes('news')) {
    return 'market_question';
  }
  if (lowerMessage.includes('risk') || lowerMessage.includes('volatility')) {
    return 'risk_question';
  }
  
  return 'general';
}

function identifyEducationalTopic(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('diversif')) return 'diversification';
  if (lowerMessage.includes('rebalanc')) return 'rebalancing';
  if (lowerMessage.includes('compound')) return 'compound_interest';
  if (lowerMessage.includes('risk')) return 'risk_management';
  
  return 'general';
}

function assessEmotionalState(conversationHistory: any[], recentDecisions: any[]): 'calm' | 'concerned' | 'worried' | 'excited' | 'confused' {
  if (!conversationHistory || conversationHistory.length === 0) return 'calm';
  
  const recentMessages = conversationHistory.slice(0, 5);
  const stressKeywords = ['worried', 'concerned', 'scared', 'panic', 'nervous'];
  const excitedKeywords = ['excited', 'great', 'amazing', 'fantastic'];
  const confusedKeywords = ['confused', 'don\'t understand', 'unclear', 'help'];
  
  let stressScore = 0;
  let excitementScore = 0;
  let confusionScore = 0;
  
  for (const msg of recentMessages) {
    const text = (msg.message || '').toLowerCase();
    stressScore += stressKeywords.filter(keyword => text.includes(keyword)).length;
    excitementScore += excitedKeywords.filter(keyword => text.includes(keyword)).length;
    confusionScore += confusedKeywords.filter(keyword => text.includes(keyword)).length;
  }
  
  if (stressScore >= 2) return 'worried';
  if (stressScore >= 1) return 'concerned';
  if (excitementScore >= 2) return 'excited';
  if (confusionScore >= 2) return 'confused';
  
  return 'calm';
}

function calculateUrgencyLevel(emotionalState: string, recentDecisions: any[], goals: any[]): number {
  let urgency = 1;
  
  if (emotionalState === 'worried') urgency += 3;
  else if (emotionalState === 'concerned') urgency += 2;
  else if (emotionalState === 'confused') urgency += 1;
  
  // Check for urgent goal situations
  if (goals) {
    for (const goal of goals) {
      const timeRemaining = Math.max(0, Math.ceil(
        (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ));
      const progress = (goal.current_amount / goal.target_amount) * 100;
      
      if (timeRemaining < 730 && progress < 70) { // Less than 2 years and under 70%
        urgency += 2;
        break;
      }
    }
  }
  
  return Math.min(10, urgency);
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function generateFollowUpSuggestions(intent: string, context: ConversationContext, conversationType: string): string[] {
  const suggestions: string[] = [];
  
  switch (intent) {
    case 'portfolio_question':
      suggestions.push("Would you like to see your portfolio performance over time?");
      suggestions.push("Should we discuss rebalancing opportunities?");
      suggestions.push("Want to learn about diversification strategies?");
      break;
    case 'goal_question':
      suggestions.push("Would you like to adjust your savings strategy?");
      suggestions.push("Should we review your goal timeline?");
      suggestions.push("Want to explore ways to accelerate progress?");
      break;
    case 'market_question':
      suggestions.push("Would you like to see how market changes affect your portfolio?");
      suggestions.push("Should we discuss defensive positioning?");
      suggestions.push("Want to learn about market volatility?");
      break;
    default:
      suggestions.push("What else would you like to know?");
      suggestions.push("Would you like me to explain any investment concepts?");
      suggestions.push("Should we review your financial goals?");
  }
  
  return suggestions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      userId,
      goalId,
      message,
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      conversationType = 'general',
      requestedComplexity = 'detailed',
      contextualInfo = {}
    }: RequestBody = await req.json();

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: userId and message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing conversation for user ${userId}, type: ${conversationType}`);

    // Build conversation context
    const context = await buildConversationContext(supabaseClient, userId, goalId, conversationId);

    // Generate personalized response
    const responseData = generatePersonalizedResponse(
      message,
      context,
      conversationType,
      requestedComplexity
    );

    // Generate educational resources if applicable
    const educationalResources: EducationalResource[] = [];
    if (conversationType === 'educational' || message.toLowerCase().includes('learn')) {
      educationalResources.push({
        title: "Understanding Portfolio Diversification",
        description: "Learn how spreading investments reduces risk",
        type: "interactive",
        estimatedTime: 10,
        relevanceScore: 8
      });
    }

    // Generate action items if needed
    const actionItems: ActionItem[] = [];
    if (context.urgencyLevel > 5) {
      actionItems.push({
        title: "Review Portfolio Performance",
        description: "Check your recent portfolio performance and consider adjustments",
        priority: "high",
        estimatedTime: 15,
        category: "portfolio"
      });
    }

    // Store conversation in database
    await supabaseClient
      .from('ai_conversations')
      .insert([
        {
          user_id: userId,
          goal_id: goalId,
          conversation_id: conversationId,
          role: 'user',
          message: message,
          context: contextualInfo
        },
        {
          user_id: userId,
          goal_id: goalId,
          conversation_id: conversationId,
          role: 'assistant',
          message: responseData.response,
          context: {
            conversation_type: conversationType,
            complexity: requestedComplexity,
            confidence: responseData.confidence,
            personalized_elements: responseData.personalizedElements
          }
        }
      ]);

    // Update learning progress
    const learningUpdate: LearningUpdate = {
      topicsDiscussed: [conversationType],
      understandingGained: conversationType === 'educational' ? 2 : 1,
      engagementScore: Math.min(10, responseData.confidence * 10),
      followUpNeeded: context.urgencyLevel > 6
    };

    if (context.userProfile) {
      await supabaseClient
        .from('user_learning_progress')
        .upsert({
          user_id: userId,
          questions_asked: (context.userProfile.learningProgress?.questions_asked || 0) + 1,
          explanations_requested: (context.userProfile.learningProgress?.explanations_requested || 0) + 
            (conversationType === 'decision_explanation' ? 1 : 0),
          last_learning_session: new Date().toISOString()
        });
    }

    const response: ConversationResponse = {
      conversationId,
      response: {
        message: responseData.response,
        type: conversationType as any,
        complexity: requestedComplexity as any,
        confidence: responseData.confidence,
        personalizedElements: responseData.personalizedElements,
        followUpSuggestions: responseData.followUpSuggestions,
        educationalResources: educationalResources.length > 0 ? educationalResources : undefined,
        actionItems: actionItems.length > 0 ? actionItems : undefined,
        emergencySupport: context.urgencyLevel > 8 ? {
          severity: context.urgencyLevel,
          supportType: 'emotional',
          immediateActions: ['Take a deep breath', 'Review long-term goals', 'Consider professional consultation'],
          escalationRecommended: context.urgencyLevel > 9
        } : undefined
      },
      context,
      learningUpdate
    };

    console.log(`Generated conversation response with ${responseData.confidence} confidence`);

    return new Response(
      JSON.stringify({ success: true, conversation: response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced Conversation Engine error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred during conversation processing',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})