import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

interface RequestBody {
  userId: string;
  goalId: string;
  recommendationId: string;
} 

// Helper function to calculate optimal allocation based on recommendation
function calculateOptimalAllocation(
  currentAllocation: Record<string, number>,
  recommendationType: string,
  riskTolerance: string,
  goalTimeline: number
): Record<string, number> {
  // Base allocations by risk tolerance
  const riskProfiles = {
    conservative: { stocks: 30, bonds: 60, alternatives: 5, cash: 5 },
    moderate: { stocks: 60, bonds: 30, alternatives: 8, cash: 2 },
    aggressive: { stocks: 80, bonds: 15, alternatives: 5, cash: 0 }
  };
  
  let baseAllocation = riskProfiles[riskTolerance as keyof typeof riskProfiles] || riskProfiles.moderate;
  
  // Adjust based on timeline (closer to goal = more conservative)
  if (goalTimeline < 3) { // Less than 3 years
    baseAllocation.stocks = Math.max(baseAllocation.stocks - 20, 20);
    baseAllocation.bonds += 15;
    baseAllocation.cash += 5;
  } else if (goalTimeline < 7) { // 3-7 years
    baseAllocation.stocks = Math.max(baseAllocation.stocks - 10, 30);
    baseAllocation.bonds += 8;
    baseAllocation.cash += 2;
  }
  
  // Normalize to ensure 100%
  const total = Object.values(baseAllocation).reduce((sum, val) => sum + val, 0);
  const normalizedAllocation: Record<string, number> = {};
  for (const [key, value] of Object.entries(baseAllocation)) {
    normalizedAllocation[key] = Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
  }
  
  return normalizedAllocation;
}

// Helper function to generate rebalancing recommendations
function generateRebalancingPlan(
  currentAllocation: Record<string, number>,
  targetAllocation: Record<string, number>,
  currentValue: number
): Record<string, any> {
  const rebalancingPlan: Record<string, any> = {
    actions: [],
    estimatedCost: 0,
    taxImplications: 'minimal', // Simplified
  };
  
  for (const [assetClass, targetPercent] of Object.entries(targetAllocation)) {
    const currentPercent = currentAllocation[assetClass] || 0;
    const difference = targetPercent - currentPercent;
    
    if (Math.abs(difference) > 1) { // Only rebalance if difference > 1%
      const dollarAmount = (difference / 100) * currentValue;
      
      rebalancingPlan.actions.push({
        assetClass,
        action: difference > 0 ? 'buy' : 'sell',
        currentPercent: Math.round(currentPercent * 100) / 100,
        targetPercent: Math.round(targetPercent * 100) / 100,
        dollarAmount: Math.abs(Math.round(dollarAmount * 100) / 100),
        percentageChange: Math.round(difference * 100) / 100
      });
    }
  }
  
  return rebalancingPlan;
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
    const { userId, goalId, recommendationId }: RequestBody = await req.json()

    if (!userId || !goalId || !recommendationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: userId, goalId, and recommendationId' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    console.log(`Executing recommendation ${recommendationId} for user ${userId}, goal ${goalId}`)

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
    const { data: currentPortfolio, error: portfolioError } = await supabaseClient
      .from('ai_portfolios')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (portfolioError || !currentPortfolio) {
      console.error('Portfolio fetch error:', portfolioError)
      return new Response(
        JSON.stringify({ success: false, error: 'No active portfolio found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 404 
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

    // 4. Parse recommendation ID to understand the type and data
    // Recommendation IDs follow pattern: rec_{timestamp}_{random}
    const recommendationTimestamp = recommendationId.split('_')[1];
    const recommendationAge = Date.now() - parseInt(recommendationTimestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (recommendationAge > maxAge) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recommendation has expired. Please refresh recommendations and try again.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    // 5. Determine action based on recommendation context
    // Since recommendations are ephemeral, we'll infer the action type and execute based on current portfolio state
    
    const riskTolerance = userProfile?.risk_tolerance || goal.risk_tolerance || 'moderate';
    const timeRemaining = Math.max(0, Math.ceil(
      (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ));
    const yearsRemaining = timeRemaining / 365;

    // Calculate optimal allocation for this user
    const optimalAllocation = calculateOptimalAllocation(
      currentPortfolio.allocation,
      'rebalance', // Default to rebalancing
      riskTolerance,
      yearsRemaining
    );

    // Generate rebalancing plan
    const rebalancingPlan = generateRebalancingPlan(
      currentPortfolio.allocation,
      optimalAllocation,
      goal.current_amount
    );

    // 6. Create new portfolio version with updated allocation
    const newPortfolioData = {
      goal_id: goalId,
      user_id: userId,
      allocation: optimalAllocation,
      recommended_holdings: currentPortfolio.recommended_holdings, // Keep same holdings for now
      risk_score: currentPortfolio.risk_score,
      expected_return: currentPortfolio.expected_return,
      confidence_score: Math.min(currentPortfolio.confidence_score + 0.05, 1.0), // Slight confidence boost
      scenario_analysis: currentPortfolio.scenario_analysis,
      rebalancing_triggers: currentPortfolio.rebalancing_triggers,
      ai_reasoning: `Portfolio rebalanced based on AI recommendation ${recommendationId}. Updated allocation to better align with ${riskTolerance} risk tolerance and ${yearsRemaining.toFixed(1)} year timeline. ${rebalancingPlan.actions.length > 0 ? `Rebalancing actions: ${rebalancingPlan.actions.map(a => `${a.action} ${a.assetClass}`).join(', ')}.` : 'Minor adjustments made.'}`,
      version: (currentPortfolio.version || 1) + 1,
      is_active: true
    };

    // 7. Deactivate current portfolio and create new one
    const { error: deactivateError } = await supabaseClient
      .from('ai_portfolios')
      .update({ is_active: false })
      .eq('id', currentPortfolio.id);

    if (deactivateError) {
      console.error('Error deactivating current portfolio:', deactivateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update portfolio' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      )
    }

    const { data: newPortfolio, error: createError } = await supabaseClient
      .from('ai_portfolios')
      .insert(newPortfolioData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating new portfolio:', createError);
      // Try to reactivate the old portfolio
      await supabaseClient
        .from('ai_portfolios')
        .update({ is_active: true })
        .eq('id', currentPortfolio.id);
        
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create updated portfolio' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      )
    }

    // 8. Record the action in tracking table
    const { error: trackingError } = await supabaseClient
      .from('ai_recommendation_actions')
      .insert({
        user_id: userId,
        recommendation_id: recommendationId,
        action_type: 'applied',
        action_data: {
          applied_at: new Date().toISOString(),
          portfolio_version: newPortfolioData.version,
          rebalancing_plan: rebalancingPlan,
          previous_allocation: currentPortfolio.allocation,
          new_allocation: optimalAllocation
        }
      });

    if (trackingError) {
      console.error('Error tracking recommendation action:', trackingError);
      // Don't fail the whole operation for tracking issues
    }

    // 9. Create a portfolio performance entry to track this change
    const { error: performanceError } = await supabaseClient
      .from('portfolio_performance')
      .insert({
        goal_id: goalId,
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        portfolio_value: goal.current_amount,
        daily_return: 0, // Initial value for rebalancing day
        contributions: 0,
        withdrawals: 0,
        rebalancing_actions: rebalancingPlan,
        ai_commentary: `Portfolio rebalanced via AI recommendation. New allocation: ${Object.entries(optimalAllocation).map(([k, v]) => `${k} ${v}%`).join(', ')}.`
      });

    if (performanceError) {
      console.error('Error creating performance entry:', performanceError);
      // Don't fail the whole operation for performance tracking issues
    }

    console.log(`Successfully executed recommendation ${recommendationId} for user ${userId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Recommendation applied successfully',
        portfolio_version: newPortfolioData.version,
        rebalancing_plan: rebalancingPlan,
        new_allocation: optimalAllocation
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Execute portfolio recommendation error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred while executing recommendation',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})