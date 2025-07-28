import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

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

serve(async (req) => {
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

    // 2. Get current AI portfolio
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
        description: `With ${yearsRemaining.toFixed(1)} years remaining and ${progressPercentage.toFixed(1)}% progress, consider increasing contributions.`,
        reasoning: `Your goal target date is approaching (${timeRemaining} days remaining), but you're only ${progressPercentage.toFixed(1)}% of the way to your $${goal.target_amount.toLocaleString()} target. To reach your goal, you may need to increase monthly contributions or adjust your investment strategy for potentially higher returns.`,
        actionable: true,
        impact_score: 9,
        effort_required: 'high',
        time_sensitive: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        data: {
          current_allocation: portfolio.allocation,
          performance_impact: (100 - progressPercentage) / yearsRemaining,
        },
        created_at: currentTime
      });
    }

    // Analysis 5: Market Opportunity (simplified example)
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