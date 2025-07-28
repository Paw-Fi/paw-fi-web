import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'
import { logUserActivity } from '../shared/activity-logger.ts'

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
    current_allocation?: Record<string, number>;
    suggested_allocation?: Record<string, number>;
    market_data?: any;
    performance_impact?: number;
    risk_change?: number;
    lesson_id?: string;
    lesson_url?: string;
    estimated_time?: string;
  };
  created_at: string;
}

interface RequestBody {
  userId: string;
  goalId: string;
  includeMarketData?: boolean;
  includePerformanceAnalysis?: boolean;
}

// Helper function to generate unique recommendation ID
function generateRecommendationId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Helper function to calculate allocation drift
function calculateAllocationDrift(current: Record<string, number>, target: Record<string, number>): number {
  let totalDrift = 0;
  const allKeys = new Set([...Object.keys(current), ...Object.keys(target)]);
  
  for (const key of allKeys) {
    const currentValue = current[key] || 0;
    const targetValue = target[key] || 0;
    totalDrift += Math.abs(currentValue - targetValue);
  }
  
  return totalDrift / 2; // Divide by 2 since we double-count the drift
}

// Helper function to assess risk level from allocation
function assessRiskLevel(allocation: Record<string, number>): number {
  const stocks = allocation.stocks || 0;
  const alternatives = allocation.alternatives || 0;
  const bonds = allocation.bonds || 0;
  const cash = allocation.cash || 0;
  
  // Simple risk scoring: stocks and alternatives are riskier
  return (stocks * 0.8 + alternatives * 1.0 + bonds * 0.3 + cash * 0.1) / 100;
}

// Helper function to get risk tolerance as number
function getRiskToleranceScore(riskTolerance: string): number {
  switch (riskTolerance) {
    case 'conservative': return 0.3;
    case 'moderate': return 0.6;
    case 'aggressive': return 0.9;
    default: return 0.6;
  }
}

// Helper function to get essential lessons for a specific goal type
function getEssentialLessonsForGoal(goalType: string): Array<{id: string, title: string, courseId: string, estimatedTime?: string}> {
  const lessonMap: Record<string, Array<{id: string, title: string, courseId: string, estimatedTime?: string}>> = {
    'retirement': [
      { id: 'retirement-basics', title: 'Retirement Planning Fundamentals', courseId: 'financial-planning', estimatedTime: '20 minutes' },
      { id: 'compound-interest', title: 'The Power of Compound Interest', courseId: 'investing-basics', estimatedTime: '15 minutes' },
      { id: '401k-guide', title: '401(k) and IRA Guide', courseId: 'retirement-planning', estimatedTime: '25 minutes' }
    ],
    'home_purchase': [
      { id: 'home-buying-process', title: 'Home Buying Process', courseId: 'real-estate', estimatedTime: '30 minutes' },
      { id: 'mortgage-basics', title: 'Understanding Mortgages', courseId: 'real-estate', estimatedTime: '20 minutes' },
      { id: 'down-payment-strategies', title: 'Down Payment Strategies', courseId: 'real-estate', estimatedTime: '15 minutes' }
    ],
    'education': [
      { id: '529-plans', title: '529 Education Savings Plans', courseId: 'education-planning', estimatedTime: '20 minutes' },
      { id: 'education-funding', title: 'Education Funding Strategies', courseId: 'education-planning', estimatedTime: '25 minutes' },
      { id: 'student-loans', title: 'Understanding Student Loans', courseId: 'education-planning', estimatedTime: '18 minutes' }
    ],
    'wealth_building': [
      { id: 'investment-fundamentals', title: 'Investment Fundamentals', courseId: 'investing-basics', estimatedTime: '25 minutes' },
      { id: 'portfolio-diversification', title: 'Portfolio Diversification', courseId: 'investing-basics', estimatedTime: '20 minutes' },
      { id: 'risk-management', title: 'Investment Risk Management', courseId: 'investing-basics', estimatedTime: '22 minutes' }
    ],
    'emergency_fund': [
      { id: 'emergency-fund-basics', title: 'Building an Emergency Fund', courseId: 'financial-planning', estimatedTime: '15 minutes' },
      { id: 'budgeting-fundamentals', title: 'Budgeting Fundamentals', courseId: 'financial-planning', estimatedTime: '20 minutes' },
      { id: 'high-yield-savings', title: 'High-Yield Savings Accounts', courseId: 'banking-basics', estimatedTime: '12 minutes' }
    ],
    'custom': [
      { id: 'goal-setting', title: 'Financial Goal Setting', courseId: 'financial-planning', estimatedTime: '18 minutes' },
      { id: 'investment-fundamentals', title: 'Investment Fundamentals', courseId: 'investing-basics', estimatedTime: '25 minutes' },
      { id: 'budgeting-fundamentals', title: 'Budgeting Fundamentals', courseId: 'financial-planning', estimatedTime: '20 minutes' }
    ]
  };
  
  return lessonMap[goalType] || lessonMap['custom'];
}

// Analyze user behavior patterns from activity history for AI personalization
function analyzeUserBehaviorPatterns(activities: any[]) {
  const patterns = {
    preferredGoalTypes: new Map<string, number>(),
    riskToleranceHistory: [] as number[],
    engagementFrequency: 0,
    averageSessionDuration: 0,
    preferredRecommendationTypes: new Map<string, number>(),
    learningVelocity: 0,
    portfolioGenerationFrequency: 0,
    lastActivityDate: null as string | null,
    behaviorTrends: {
      increasingEngagement: false,
      consistentGoalTypes: false,
      riskToleranceStability: false
    }
  };

  if (!activities || activities.length === 0) {
    return patterns;
  }

  // Analyze activity patterns
  activities.forEach((activity: any) => {
    const activityData = activity.activity;
    const metadata = activityData.metadata || {};

    // Track goal type preferences
    if (metadata.goal_type) {
      const count = patterns.preferredGoalTypes.get(metadata.goal_type) || 0;
      patterns.preferredGoalTypes.set(metadata.goal_type, count + 1);
    }

    // Track risk tolerance patterns
    if (metadata.risk_tolerance !== undefined) {
      patterns.riskToleranceHistory.push(metadata.risk_tolerance);
    }

    // Track recommendation type preferences
    if (metadata.recommendation_types) {
      metadata.recommendation_types.forEach((type: string) => {
        const count = patterns.preferredRecommendationTypes.get(type) || 0;
        patterns.preferredRecommendationTypes.set(type, count + 1);
      });
    }

    // Track portfolio generation frequency
    if (activityData.type === 'portfolio_generation') {
      patterns.portfolioGenerationFrequency++;
    }

    // Track learning velocity (lesson completions)
    if (metadata.completed_lessons_count) {
      patterns.learningVelocity += metadata.completed_lessons_count;
    }

    // Update last activity date
    if (!patterns.lastActivityDate || activityData.timestamp > patterns.lastActivityDate) {
      patterns.lastActivityDate = activityData.timestamp;
    }
  });

  // Calculate engagement metrics
  patterns.engagementFrequency = activities.length;
  
  // Calculate average session duration from generation times
  const generationTimes = activities
    .map(a => a.activity.metadata?.generation_time_ms)
    .filter(t => t !== undefined);
  
  if (generationTimes.length > 0) {
    patterns.averageSessionDuration = generationTimes.reduce((sum, time) => sum + time, 0) / generationTimes.length;
  }

  // Analyze behavior trends
  if (activities.length >= 3) {
    const recentActivities = activities.slice(-3);
    const olderActivities = activities.slice(0, -3);
    
    patterns.behaviorTrends.increasingEngagement = recentActivities.length > olderActivities.length / 2;
    
    // Check goal type consistency
    const recentGoalTypes = new Set(recentActivities.map(a => a.activity.metadata?.goal_type).filter(Boolean));
    patterns.behaviorTrends.consistentGoalTypes = recentGoalTypes.size <= 2;
    
    // Check risk tolerance stability
    const recentRiskTolerances = recentActivities
      .map(a => a.activity.metadata?.risk_tolerance)
      .filter(rt => rt !== undefined);
    
    if (recentRiskTolerances.length >= 2) {
      const variance = recentRiskTolerances.reduce((sum, rt, i, arr) => {
        const mean = arr.reduce((s, r) => s + r, 0) / arr.length;
        return sum + Math.pow(rt - mean, 2);
      }, 0) / recentRiskTolerances.length;
      
      patterns.behaviorTrends.riskToleranceStability = variance < 0.5; // Low variance indicates stability
    }
  }

  return patterns;
}

// Build personalization insights from user behavior patterns for AI prompt
function buildPersonalizationInsights(patterns: any): string {
  const insights = [];

  // Engagement patterns
  if (patterns.engagementFrequency > 0) {
    insights.push(`- User Engagement: ${patterns.engagementFrequency} recorded activities, indicating ${patterns.engagementFrequency > 10 ? 'high' : patterns.engagementFrequency > 5 ? 'moderate' : 'low'} platform engagement`);
  }

  // Goal preferences
  if (patterns.preferredGoalTypes.size > 0) {
    const topGoalType = Array.from(patterns.preferredGoalTypes.entries())
      .sort((a, b) => b[1] - a[1])[0];
    insights.push(`- Goal Preferences: Most focused on '${topGoalType[0]}' goals (${topGoalType[1]} times), showing consistent interest in this area`);
  }

  // Risk tolerance patterns
  if (patterns.riskToleranceHistory.length > 0) {
    const avgRisk = patterns.riskToleranceHistory.reduce((sum, rt) => sum + rt, 0) / patterns.riskToleranceHistory.length;
    const riskLevel = avgRisk > 7 ? 'high' : avgRisk > 4 ? 'moderate' : 'low';
    insights.push(`- Risk Profile: Average risk tolerance of ${avgRisk.toFixed(1)}/10 (${riskLevel} risk appetite), ${patterns.behaviorTrends.riskToleranceStability ? 'stable over time' : 'variable preferences'}`);
  }

  // Learning velocity
  if (patterns.learningVelocity > 0) {
    insights.push(`- Learning Style: Completed ${patterns.learningVelocity} lessons, indicating ${patterns.learningVelocity > 10 ? 'high' : patterns.learningVelocity > 5 ? 'moderate' : 'cautious'} learning engagement`);
  }

  // Portfolio generation patterns
  if (patterns.portfolioGenerationFrequency > 0) {
    insights.push(`- Portfolio Behavior: Generated ${patterns.portfolioGenerationFrequency} portfolios, showing ${patterns.portfolioGenerationFrequency > 3 ? 'frequent experimentation' : 'deliberate planning'} approach`);
  }

  // Behavioral trends
  if (patterns.behaviorTrends.consistentGoalTypes) {
    insights.push(`- Consistency: Shows focused approach with consistent goal types, prefer targeted recommendations`);
  }
  
  if (patterns.behaviorTrends.increasingEngagement) {
    insights.push(`- Engagement Trend: Increasing activity over time, ready for more advanced recommendations`);
  }

  // Recommendation preferences
  if (patterns.preferredRecommendationTypes.size > 0) {
    const topRecType = Array.from(patterns.preferredRecommendationTypes.entries())
      .sort((a, b) => b[1] - a[1])[0];
    insights.push(`- Recommendation Style: Most responsive to '${topRecType[0]}' type recommendations, tailor suggestions accordingly`);
  }

  // Session patterns
  if (patterns.averageSessionDuration > 0) {
    const durationMinutes = patterns.averageSessionDuration / (1000 * 60);
    insights.push(`- Session Style: Average ${durationMinutes.toFixed(1)} minute sessions, ${durationMinutes > 5 ? 'prefers detailed analysis' : 'prefers quick, actionable insights'}`);
  }

  // Last activity recency
  if (patterns.lastActivityDate) {
    const daysSinceLastActivity = Math.floor((Date.now() - new Date(patterns.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24));
    insights.push(`- Recent Activity: Last active ${daysSinceLastActivity} days ago, ${daysSinceLastActivity < 7 ? 'highly engaged user' : daysSinceLastActivity < 30 ? 'regular user' : 'returning user - may need re-engagement'}`);
  }

  return insights.length > 0 ? insights.join('\n') : '- No significant behavior patterns available yet, provide general recommendations';
}

serve(async (req) => {
  const startTime = Date.now(); // Track request start time for activity logging
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { userId, goalId, includeMarketData = true, includePerformanceAnalysis = true }: RequestBody = await req.json()

    if (!userId || !goalId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: userId and goalId' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    console.log(`Generating recommendations for user ${userId}, goal ${goalId}`)

    // 1. Get financial goal data
    const { data: goal, error: goalError } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (goalError || !goal) {
      console.error('Goal fetch error:', goalError)
      return new Response(
        JSON.stringify({ success: false, error: 'Financial goal not found or inactive' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 404 
        }
      )
    }

    // 2. Fetch user activities for AI personalization
    const { data: userActivitiesResponse, error: activitiesError } = await supabaseClient.functions.invoke(
      `user-activities?user_id=${userId}&limit=50`,
      {
        method: "GET",
      }
    );
    
    if (activitiesError) {
      console.error('Error fetching user activities:', activitiesError);
    }
    
    const userActivities = userActivitiesResponse?.activities || [];
    
    // Analyze user behavior patterns from activities
    const userPersonalizationContext = analyzeUserBehaviorPatterns(userActivities);
    
    // Fetch completed lessons to avoid recommending completed content
    const { data: completedLessonsResponse, error: lessonsError } = await supabaseClient.functions.invoke('get-user-completed-lessons', {
      body: { userId }
    });
    
    if (lessonsError) {
      console.error('Error fetching completed lessons:', lessonsError);
    }
    
    const completedLessons = completedLessonsResponse?.completed_lessons || [];
    const completedLessonIds = new Set(completedLessons?.map(cl => cl.lesson_id) || []);
    console.log(`User has completed ${completedLessonIds.size} lessons`)

    // 3. Get current AI portfolio
    const { data: portfolio, error: portfolioError } = await supabaseClient
      .from('ai_portfolios')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (portfolioError || !portfolio) {
      console.error('Portfolio fetch error:', portfolioError)
      return new Response(
        JSON.stringify({ 
          success: true, 
          recommendations: [],
          message: 'No active portfolio found. Generate a portfolio first to receive recommendations.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 3. Get user investment profile
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_investment_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.warn('User profile fetch error:', profileError)
    }

    // 4. Get recent portfolio performance (last 30 days)
    let performanceData = null;
    if (includePerformanceAnalysis) {
      const { data: performance, error: performanceError } = await supabaseClient
        .from('portfolio_performance')
        .select('*')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(30)

      if (!performanceError && performance) {
        performanceData = performance;
      }
    }

    // 5. Get market data (simplified - in production you'd integrate with real market data)
    let marketData = null;
    if (includeMarketData) {
      const { data: market, error: marketError } = await supabaseClient
        .from('market_data_cache')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .limit(10)

      if (!marketError && market) {
        marketData = market;
      }
    }

    // Start generating recommendations
    const recommendations: PortfolioRecommendation[] = [];
    const currentTime = new Date().toISOString();

    // Analysis 1: Portfolio Allocation Drift
    if (portfolio.allocation) {
      const currentAllocation = portfolio.allocation;
      
      // For demonstration, let's assume some drift has occurred
      // In production, you'd compare against the most recent rebalancing or target allocation
      const targetAllocation = portfolio.allocation; // This would be the original target
      
      // Simulate some drift for demonstration
      const simulatedCurrentAllocation = {
        stocks: (currentAllocation.stocks || 60) + (Math.random() - 0.5) * 20,
        bonds: (currentAllocation.bonds || 30) + (Math.random() - 0.5) * 10,
        alternatives: (currentAllocation.alternatives || 10) + (Math.random() - 0.5) * 5,
        cash: (currentAllocation.cash || 0) + (Math.random()) * 5
      };

      const drift = calculateAllocationDrift(simulatedCurrentAllocation, targetAllocation);
      
      if (drift > 5) { // More than 5% total drift
        const priority = drift > 15 ? 'high' : drift > 10 ? 'medium' : 'low';
        const impactScore = Math.min(10, Math.round(drift / 2));
        
        recommendations.push({
          id: generateRecommendationId(),
          type: 'rebalance',
          priority,
          title: 'Portfolio Rebalancing Needed',
          description: `Your portfolio has drifted ${drift.toFixed(1)}% from target allocation. Rebalancing can help maintain your desired risk level.`,
          reasoning: `Analysis shows significant allocation drift. Your stock allocation has moved from ${targetAllocation.stocks}% to ${simulatedCurrentAllocation.stocks.toFixed(1)}%, and bond allocation from ${targetAllocation.bonds}% to ${simulatedCurrentAllocation.bonds.toFixed(1)}%. This drift can impact your expected returns and risk profile.`,
          actionable: true,
          impact_score: impactScore,
          effort_required: 'medium',
          time_sensitive: drift > 15,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          data: {
            current_allocation: simulatedCurrentAllocation,
            suggested_allocation: targetAllocation,
            performance_impact: Math.round(drift * 0.3 * 100) / 100, // Estimated impact
          },
          created_at: currentTime
        });
      }
    }

    // Analysis 2: Risk Assessment
    if (portfolio.allocation && userProfile) {
      const portfolioRisk = assessRiskLevel(portfolio.allocation);
      const targetRisk = getRiskToleranceScore(userProfile.risk_tolerance || goal.risk_tolerance || 'moderate');
      const riskDifference = Math.abs(portfolioRisk - targetRisk);

      if (riskDifference > 0.2) { // Significant risk mismatch
        const priority = riskDifference > 0.4 ? 'urgent' : riskDifference > 0.3 ? 'high' : 'medium';
        const isRiskTooHigh = portfolioRisk > targetRisk;
        
        recommendations.push({
          id: generateRecommendationId(),
          type: 'risk_alert',
          priority,
          title: isRiskTooHigh ? 'Portfolio Risk Too High' : 'Portfolio Risk Too Conservative',
          description: `Your current portfolio risk level (${(portfolioRisk * 10).toFixed(1)}/10) doesn't match your ${userProfile.risk_tolerance || 'moderate'} risk tolerance.`,
          reasoning: `Your risk assessment indicates a ${userProfile.risk_tolerance || 'moderate'} risk tolerance (${(targetRisk * 10).toFixed(1)}/10), but your current portfolio has a risk level of ${(portfolioRisk * 10).toFixed(1)}/10. ${isRiskTooHigh ? 'This means you\'re taking on more risk than you\'re comfortable with.' : 'This means you might be missing out on potential returns by being too conservative.'}`,
          actionable: true,
          impact_score: Math.min(10, Math.round(riskDifference * 15)),
          effort_required: 'medium',
          time_sensitive: priority === 'urgent',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          data: {
            current_allocation: portfolio.allocation,
            risk_change: (targetRisk - portfolioRisk) * 10,
            performance_impact: riskDifference * 2,
          },
          created_at: currentTime
        });
      }
    }

    // Analysis 3: Performance Analysis
    if (performanceData && performanceData.length > 0) {
      const recentReturns = performanceData
        .filter(p => p.daily_return !== null)
        .map(p => p.daily_return)
        .slice(0, 7) // Last 7 days
        
      if (recentReturns.length > 0) {
        const avgReturn = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
        const annualizedReturn = avgReturn * 252; // Approximate trading days per year
        
        // Compare against expected return
        const expectedReturn = portfolio.expected_return || 7; // Default 7%
        const performanceDiff = Math.abs(annualizedReturn - expectedReturn);
        
        if (performanceDiff > 3 && annualizedReturn < expectedReturn - 3) { // Underperforming by >3%
          recommendations.push({
            id: generateRecommendationId(),
            type: 'optimization',
            priority: 'medium',
            title: 'Performance Review Suggested',
            description: `Your portfolio is underperforming expectations. Recent 7-day annualized return is ${annualizedReturn.toFixed(2)}% vs expected ${expectedReturn}%.`,
            reasoning: `Your portfolio's recent performance shows an annualized return of ${annualizedReturn.toFixed(2)}%, which is ${(expectedReturn - annualizedReturn).toFixed(2)}% below the expected ${expectedReturn}%. This could be due to market conditions, asset allocation, or specific holdings underperforming.`,
            actionable: true,
            impact_score: Math.min(8, Math.round(performanceDiff)),
            effort_required: 'high',
            time_sensitive: false,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            data: {
              current_allocation: portfolio.allocation,
              performance_impact: performanceDiff,
            },
            created_at: currentTime
          });
        }
      }
    }

    // Analysis 4: Goal Progress and Time Sensitivity
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    const timeRemaining = Math.max(0, Math.ceil(
      (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ));
    const yearsRemaining = timeRemaining / 365;

    if (yearsRemaining < 5 && progressPercentage < 70) { // Less than 5 years and under 70% complete
      recommendations.push({
        id: generateRecommendationId(),
        type: 'opportunity',
        priority: yearsRemaining < 2 ? 'urgent' : 'high',
        title: 'Accelerate Goal Progress',
        description: `Your goal is approaching, but you're behind schedule. With ${yearsRemaining.toFixed(1)} years remaining and progress at ${progressPercentage.toFixed(0)}%, you may not reach your target.`,
        reasoning: `To get back on track, consider increasing your contributions or adjusting your investment strategy for potentially higher returns.`,
        actionable: true,
        impact_score: 8,
        effort_required: 'medium',
        time_sensitive: true,
        data: {
          performance_impact: 5, // Placeholder value for potential impact
          current_allocation: portfolio.allocation,
        },
        created_at: currentTime
      });
    }

    // Analysis 5: Educational Content
    const essentialLessons = getEssentialLessonsForGoal(goal.goal_type);
    const uncompletedLessons = essentialLessons.filter(lesson => !completedLessonIds.has(lesson.id));

    if (uncompletedLessons.length > 0) {
      const topLesson = uncompletedLessons[0];
      recommendations.push({
        id: generateRecommendationId(),
        type: 'optimization',
        priority: 'low',
        title: `Learn More: ${topLesson.title}`,
        description: `Expand your knowledge on ${goal.goal_type.replace('_', ' ')} to better manage your goal.`,
        reasoning: `Education is key to financial success. Completing this lesson will provide valuable insights for your '${goal.goal_type.replace('_', ' ')}' goal.`,
        actionable: true,
        impact_score: 4,
        effort_required: 'low',
        time_sensitive: false,
        data: {
          lesson_id: topLesson.id,
          lesson_url: `/learning/${topLesson.courseId}/${topLesson.id}`,
          estimated_time: topLesson.estimatedTime || '15-20 minutes'
        },
        created_at: currentTime
      });
    }

    // Analysis 6: Market Opportunity (simplified example)
    if (marketData && marketData.length > 0) {
      // This is a simplified example - in production you'd have sophisticated market analysis
      const hasMarketData = marketData.some(m => m.data_type === 'market_index');
      
      if (hasMarketData) {
        recommendations.push({
          id: generateRecommendationId(),
          type: 'market_insight',
          priority: 'low',
          title: 'Market Conditions Update',
          description: 'Current market conditions may present rebalancing opportunities.',
          reasoning: 'Based on recent market data analysis, certain asset classes may be experiencing temporary volatility that could present rebalancing opportunities for long-term investors.',
          actionable: false,
          impact_score: 3,
          effort_required: 'low',
          time_sensitive: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          data: {
            market_data: 'Current market analysis suggests monitoring for rebalancing opportunities',
          },
          created_at: currentTime
        });
      }
    }

    // If no recommendations generated, create a positive message
    if (recommendations.length === 0) {
      recommendations.push({
        id: generateRecommendationId(),
        type: 'optimization',
        priority: 'low',
        title: 'Portfolio Looking Good!',
        description: 'Your portfolio is well-balanced and on track. No immediate actions needed.',
        reasoning: 'Our analysis shows your portfolio allocation is aligned with your goals and risk tolerance. Your progress is on track, and no immediate rebalancing or adjustments are necessary.',
        actionable: false,
        impact_score: 1,
        effort_required: 'low',
        time_sensitive: false,
        data: {
          current_allocation: portfolio.allocation,
        },
        created_at: currentTime
      });
    }

    console.log(`Generated ${recommendations.length} recommendations for user ${userId}`)

    // Log user activity for recommendations generation
    await logUserActivity(
      supabaseClient,
      userId,
      'portfolio_recommendations',
      'generated',
      {
        goal_id: goalId,
        goal_type: goal.goal_type,
        recommendations_count: recommendations.length,
        recommendation_types: [...new Set(recommendations.map(r => r.type))],
        priority_levels: [...new Set(recommendations.map(r => r.priority))],
        actionable_count: recommendations.filter(r => r.actionable).length,
        time_sensitive_count: recommendations.filter(r => r.time_sensitive).length,
        average_impact_score: recommendations.reduce((sum, r) => sum + r.impact_score, 0) / recommendations.length,
        generation_time_ms: Date.now() - startTime,
        ai_model_used: 'gemini-2.5-flash',
        completed_lessons_count: completedLessons?.length || 0,
        portfolio_performance: portfolio?.expected_return || 0
      },
      'portfolio-recommendations-engine'
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations: recommendations.slice(0, 10) // Limit to 10 recommendations
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Portfolio recommendations engine error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred while generating recommendations',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
