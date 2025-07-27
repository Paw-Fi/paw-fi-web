import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { corsHeaders } from '../shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

interface CoachingRequest {
  userId: string;
  goalId?: string;
  sessionType?: 'weekly_checkin' | 'goal_assessment' | 'market_update' | 'behavioral_insight' | 'crisis_support' | 'milestone_celebration';
  context?: any;
  userMessage?: string; // For conversation mode
}

interface CoachingInsights {
  greeting: string;
  summary: string;
  observations: Array<{
    type: 'progress' | 'behavior' | 'market' | 'milestone' | 'concern';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'success' | 'error';
    actionable: boolean;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    category: 'savings' | 'investment' | 'risk' | 'tax' | 'behavioral';
    action_url?: string;
  }>;
  marketCommentary?: string;
  personalizedMessage: string;
  engagementQuestions: string[];
  nextSteps: string[];
  confidenceScore: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, sessionType = 'weekly_checkin', goalId, context, userMessage }: CoachingRequest = await req.json();
    console.log('Coaching request:', { userId, sessionType, goalId });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch comprehensive user context
    let userContext: any = {
      user_profile: null,
      goals: [],
      recent_performance: [],
      recent_sessions: []
    };

    try {
      // Fetch user profile
      const { data: userProfile } = await supabase
        .from('user_investment_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch user goals
      const { data: goals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Fetch recent coaching sessions
      const { data: recentSessions } = await supabase
        .from('ai_coaching_sessions')
        .select('session_type, engagement_score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      userContext = {
        user_profile: userProfile,
        goals: goals || [],
        recent_performance: [], // Would be populated with actual portfolio performance data
        recent_sessions: recentSessions || []
      };
    } catch (error) {
      console.error('Error fetching user context:', error);
      // Continue with empty context rather than failing
    }

    // Get current market conditions (if available)
    const marketData = await getCurrentMarketData(supabase);

    // Generate AI coaching insights
    const coachingInsights = await generateCoachingInsights({
      userContext,
      sessionType,
      marketData,
      userMessage,
      goalId
    });

    // Store coaching session
    const { data: session, error: sessionError } = await supabase
      .from('ai_coaching_sessions')
      .insert({
        user_id: userId,
        goal_id: goalId,
        session_type: sessionType,
        ai_insights: coachingInsights,
        recommended_actions: coachingInsights.recommendations,
        coaching_personality: userContext.user_profile?.preferred_coaching_personality || 'friend',
        scheduled_for: new Date(),
        engagement_score: null // Will be updated when user interacts
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session storage error:', sessionError);
      throw new Error('Failed to store coaching session');
    }

    // Check for milestone achievements
    await checkMilestoneAchievements(supabase, userId, goalId);

    console.log('Coaching session created:', session.id);

    // Fetch any existing sessions for this user/goal to provide as latestSession
    const { data: existingSessions } = await supabase
      .from('ai_coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ 
      success: true, 
      session: session,
      latestSession: session, // Use the current session as latest
      insights: coachingInsights,
      contextUsed: !!userContext,
      sessions: existingSessions || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Coaching generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate coaching insights',
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateCoachingInsights(params: {
  userContext: any;
  sessionType: string;
  marketData?: any;
  userMessage?: string;
  goalId?: string;
}): Promise<CoachingInsights> {
  const prompt = buildCoachingPrompt(params);

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const generationConfig = {
    responseMimeType: "application/json",
    maxOutputTokens: 3000,
    temperature: 0.3,
  };

  const systemPrompt = `You are an expert AI financial coach providing personalized guidance and support.

CRITICAL REQUIREMENTS:
1. Always return valid JSON matching the expected schema exactly
2. Provide specific, actionable recommendations
3. Include appropriate encouragement and motivation
4. confidenceScore must be a decimal number between 0.0 and 1.0
5. All arrays must contain at least 1 item
6. All string fields must be concise (max 150 characters)

RESPONSE FORMAT: Return ONLY valid JSON with no additional text, explanations, markdown formatting, or code blocks.

Expected JSON Schema:
{
  "greeting": "string (max 50 chars)",
  "summary": "string (max 150 chars)",
  "observations": [
    {
      "type": "progress|behavior|market|milestone|concern",
      "title": "string (max 50 chars)",
      "message": "string (max 100 chars)",
      "severity": "info|warning|success|error",
      "actionable": true|false
    }
  ],
  "recommendations": [
    {
      "id": "string (uuid format)",
      "title": "string (max 50 chars)",
      "description": "string (max 100 chars)",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "category": "savings|investment|risk|tax|behavioral",
      "action_url": "string (optional)"
    }
  ],
  "marketCommentary": "string (max 150 chars, optional)",
  "personalizedMessage": "string (max 150 chars)",
  "engagementQuestions": ["string (max 80 chars)"],
  "nextSteps": ["string (max 100 chars)"],
  "confidenceScore": 0.85
}`;

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: fullPrompt }],
    }],
  }, generationConfig);

  const response = result.response;
  let coachingContent = response.text();

  if (!coachingContent) {
    throw new Error('Failed to generate coaching insights');
  }

  try {
    // Clean up the response content
    let cleanedContent = coachingContent.trim();
    
    // Remove any markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Ensure the JSON is complete
    if (!cleanedContent.endsWith('}')) {
      console.warn('Incomplete JSON response detected, attempting to complete...');
      // Try to find the last complete field and close the JSON
      const lastCommaIndex = cleanedContent.lastIndexOf(',');
      if (lastCommaIndex > 0) {
        cleanedContent = cleanedContent.substring(0, lastCommaIndex) + '}';
      } else {
        cleanedContent += '}';
      }
    }
    
    // Log the cleaned content for debugging
    console.log('Gemini coaching response (cleaned):', cleanedContent.substring(0, 200) + '...');
    
    const coachingData = JSON.parse(cleanedContent);
    
    // Validate and fix the response structure
    const validatedData = validateAndFixCoachingResponse(coachingData);
    
    return validatedData;
  } catch (parseError) {
    console.error('Failed to parse AI coaching response. Raw content:', coachingContent.substring(0, 200) + '...');
    console.error('Parse error:', parseError);
    
    // Return a safe fallback response
    return createFallbackCoachingResponse();
  }
}

function buildCoachingPrompt(params: {
  userContext: any;
  sessionType: string;
  marketData?: any;
  userMessage?: string;
  goalId?: string;
}): string {
  const { userContext, sessionType, marketData, userMessage } = params;
  const profile = userContext?.user_profile || {};
  const goals = userContext?.goals || [];
  const recentPerformance = userContext?.recent_performance || [];
  const recentSessions = userContext?.recent_sessions || [];
  
  const personality = profile.preferred_coaching_personality || 'friend';
  const currentGoal = goals.find((g: any) => g.id === params.goalId) || goals[0];
  
  let basePrompt = `Generate personalized financial coaching insights for a ${sessionType} session.

USER PROFILE:
- Age: ${profile.age || 'Not specified'}
- Income: ${profile.income_range || 'Not specified'}
- Experience: ${profile.investment_experience || 'beginner'}
- Risk Tolerance: ${profile.risk_tolerance || 'moderate'}
- Preferred Coaching Style: ${personality}

CURRENT GOAL:${currentGoal ? `
- Type: ${currentGoal.goal_type}
- Title: ${currentGoal.title}
- Target: $${currentGoal.target_amount?.toLocaleString()}
- Current: $${currentGoal.current_amount?.toLocaleString()}
- Progress: ${currentGoal.progress_percentage}%
- Target Date: ${currentGoal.target_date}` : ' No active goals found'}

RECENT PERFORMANCE:${recentPerformance.length > 0 ? `
${recentPerformance.slice(0, 7).map((perf: any) => 
  `- ${perf.date}: $${perf.portfolio_value?.toLocaleString()} (${perf.daily_return > 0 ? '+' : ''}${perf.daily_return}%)`
).join('\n')}` : ' No recent performance data'}

RECENT ACTIVITY:${recentSessions.length > 0 ? `
${recentSessions.slice(0, 3).map((session: any) => 
  `- ${session.session_type}: Engagement ${session.engagement_score}/10`
).join('\n')}` : ' First coaching session'}`;

  // Add session-specific context
  if (sessionType === 'weekly_checkin') {
    basePrompt += `\n\nFOCUS AREAS FOR WEEKLY CHECK-IN:
1. Progress toward goal since last week
2. Recent market performance impact
3. Contribution consistency
4. Behavioral patterns and opportunities
5. Upcoming actions and motivation`;
  } else if (sessionType === 'crisis_support') {
    basePrompt += `\n\nCRISIS SUPPORT CONTEXT:
Market conditions may be causing user anxiety. Focus on:
1. Reassurance about long-term strategy
2. Historical perspective on market recoveries
3. Opportunity in market downturns
4. Emotional support and behavioral guidance`;
  } else if (sessionType === 'milestone_celebration') {
    basePrompt += `\n\nCELEBRATION CONTEXT:
User has achieved a significant milestone. Focus on:
1. Celebrating the achievement enthusiastically
2. Highlighting progress made
3. Motivating toward next milestone
4. Reinforcing positive behaviors`;
  }

  if (userMessage) {
    basePrompt += `\n\nUSER MESSAGE: "${userMessage}"
Address their specific question or concern while providing broader coaching insights.`;
  }

  if (marketData) {
    basePrompt += `\n\nCURRENT MARKET CONDITIONS:
${JSON.stringify(marketData, null, 2)}
Consider market context in your recommendations.`;
  }

  basePrompt += `\n\nGENERATE INSIGHTS IN THE "${personality.toUpperCase()}" COACHING STYLE:
- Use appropriate tone and language for this personality
- Include 3-5 specific observations about their progress
- Provide 2-4 actionable recommendations
- Ask 1-2 engaging questions to encourage interaction
- End with encouraging next steps

Return only valid JSON with no additional formatting.`;

  return basePrompt;
}

function validateAndFixCoachingResponse(data: any): CoachingInsights {
  const fixed: any = {};
  
  // Fix required fields with defaults
  fixed.greeting = typeof data.greeting === 'string' ? data.greeting : "Hi there! 👋";
  fixed.summary = typeof data.summary === 'string' ? data.summary : "Let's review your financial progress together.";
  fixed.personalizedMessage = typeof data.personalizedMessage === 'string' ? data.personalizedMessage : "Keep up the great work on your financial journey!";
  
  // Fix and validate arrays
  fixed.observations = Array.isArray(data.observations) ? data.observations : [
    {
      type: 'progress',
      title: 'Goal Progress',
      message: 'Continue making steady progress toward your goals.',
      severity: 'info',
      actionable: true
    }
  ];
  
  fixed.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [
    {
      id: crypto.randomUUID(),
      title: 'Review Your Goals',
      description: 'Take time to review your current financial goals and progress.',
      impact: 'medium',
      effort: 'low',
      category: 'behavioral',
      action_url: '/portfolio'
    }
  ];
  
  fixed.engagementQuestions = Array.isArray(data.engagementQuestions) ? data.engagementQuestions : [
    "How are you feeling about your financial progress this week?"
  ];
  
  fixed.nextSteps = Array.isArray(data.nextSteps) ? data.nextSteps : [
    "Continue with your regular contributions",
    "Monitor your goal progress"
  ];
  
  // Fix optional fields
  fixed.marketCommentary = typeof data.marketCommentary === 'string' ? data.marketCommentary : "";
  
  // Fix confidence score
  if (typeof data.confidenceScore === 'number' && data.confidenceScore >= 0 && data.confidenceScore <= 1) {
    fixed.confidenceScore = data.confidenceScore;
  } else {
    fixed.confidenceScore = 0.85; // Default confidence
  }
  
  return fixed as CoachingInsights;
}

function createFallbackCoachingResponse(): CoachingInsights {
  return {
    greeting: "Hi there! 👋",
    summary: "Welcome to your weekly financial check-in.",
    observations: [
      {
        type: 'progress',
        title: 'Keep Going',
        message: 'Your financial journey is important - keep making progress!',
        severity: 'info',
        actionable: true
      }
    ],
    recommendations: [
      {
        id: crypto.randomUUID(),
        title: 'Review Your Portfolio',
        description: 'Take a look at your current financial goals and progress.',
        impact: 'medium',
        effort: 'low',
        category: 'behavioral',
        action_url: '/portfolio'
      }
    ],
    marketCommentary: "Stay focused on your long-term financial goals.",
    personalizedMessage: "You're doing great! Keep up the momentum with your financial goals.",
    engagementQuestions: [
      "How do you feel about your financial progress this week?"
    ],
    nextSteps: [
      "Continue with regular contributions",
      "Review your goal progress"
    ],
    confidenceScore: 0.75
  };
}

async function getCurrentMarketData(supabase: any): Promise<any> {
  try {
    const { data: marketData } = await supabase
      .from('market_data_cache')
      .select('*')
      .in('symbol', ['SPY', 'VTI', 'BND', 'VIX'])
      .eq('date', new Date().toISOString().split('T')[0])
      .limit(10);
    
    return marketData || [];
  } catch (error) {
    console.log('Market data not available:', error);
    return null;
  }
}

async function checkMilestoneAchievements(supabase: any, userId: string, goalId?: string): Promise<void> {
  if (!goalId) return;
  
  try {
    // Get current goal amount
    const { data: goal } = await supabase
      .from('financial_goals')
      .select('current_amount, target_amount')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();
    
    if (!goal) return;
    
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    
    // Check for newly achieved milestones
    const { data: milestones } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .eq('achieved', false)
      .lte('target_value', goal.current_amount);
    
    if (milestones && milestones.length > 0) {
      // Mark milestones as achieved
      const { error } = await supabase
        .from('goal_milestones')
        .update({ 
          achieved: true, 
          achieved_at: new Date(),
          current_value: goal.current_amount 
        })
        .in('id', milestones.map(m => m.id));
      
      if (!error) {
        console.log(`Marked ${milestones.length} milestones as achieved for goal ${goalId}`);
        
        // Could trigger celebration notifications here
        for (const milestone of milestones) {
          console.log(`🎉 Milestone achieved: ${milestone.milestone_type} - ${milestone.target_value}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking milestones:', error);
    // Don't throw - this is a nice-to-have feature
  }
}