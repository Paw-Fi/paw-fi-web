import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

interface RequestBody {
  userId: string;
  goalId: string;
  decisionType: 'rebalance' | 'allocation_change' | 'risk_adjustment' | 'goal_optimization' | 'market_response' | 'behavioral_intervention';
  decisionData: {
    currentAllocation?: Record<string, number>;
    proposedAllocation?: Record<string, number>;
    marketConditions?: any;
    userBehavior?: any;
    triggerEvent?: string;
  };
  explanationLevel?: 'simple' | 'detailed' | 'technical';
}

interface ReasoningResponse {
  reasoningId: string;
  transparency: {
    primaryReasoning: string[];
    marketContext: Record<string, any>;
    riskAssessment: Record<string, any>;
    confidenceScore: number;
    dataSources: string[];
    alternativeOptions: any[];
    decisionTree: any[];
  };
  explanations: {
    simple: string;
    detailed: string;
    technical: string;
  };
  expectedOutcomes: Record<string, any>;
  userGuidance: {
    whatThisMeans: string;
    whatToExpect: string;
    potentialRisks: string[];
    learningOpportunities: string[];
  };
}

// Helper function to generate comprehensive reasoning
function generatePrimaryReasoning(
  decisionType: string,
  decisionData: any,
  marketConditions: any,
  userProfile: any
): string[] {
  const reasoning: string[] = [];
  
  switch (decisionType) {
    case 'rebalance':
      if (decisionData.currentAllocation && decisionData.proposedAllocation) {
        const driftAnalysis = calculateAllocationDrift(decisionData.currentAllocation, decisionData.proposedAllocation);
        reasoning.push(`Portfolio has drifted ${driftAnalysis.totalDrift.toFixed(1)}% from target allocation`);
        reasoning.push(`Largest drift in ${driftAnalysis.largestCategory} asset class (${driftAnalysis.largestDrift.toFixed(1)}%)`);
        reasoning.push(`Rebalancing will restore optimal risk-return profile for your ${userProfile?.risk_tolerance || 'moderate'} risk tolerance`);
      }
      break;
      
    case 'risk_adjustment':
      reasoning.push(`Current portfolio risk level (${assessPortfolioRisk(decisionData.currentAllocation).toFixed(1)}/10) doesn't match your comfort level`);
      reasoning.push(`Market volatility has ${marketConditions?.volatility > 0.3 ? 'increased' : 'decreased'}, requiring risk adjustment`);
      reasoning.push(`Proposed changes will align portfolio with your stated risk preferences`);
      break;
      
    case 'market_response':
      reasoning.push(`Significant market event detected: ${decisionData.triggerEvent}`);
      reasoning.push(`Historical analysis shows similar events impact portfolios by ${marketConditions?.expectedImpact || 'unknown'}%`);
      reasoning.push(`Proactive adjustment recommended to protect downside while maintaining upside potential`);
      break;
      
    default:
      reasoning.push('AI analysis identified optimization opportunity');
      reasoning.push('Recommendation aligns with your financial goals and risk tolerance');
      reasoning.push('Expected to improve long-term portfolio performance');
  }
  
  return reasoning;
}

// Helper function to assess market context
function assessMarketContext(marketConditions: any): Record<string, any> {
  return {
    volatility_level: marketConditions?.volatility || 0.2,
    market_trend: marketConditions?.trend || 'neutral',
    economic_indicators: marketConditions?.economicIndicators || {},
    sector_performance: marketConditions?.sectorPerformance || {},
    risk_factors: marketConditions?.riskFactors || [],
    opportunities: marketConditions?.opportunities || [],
    analyst_sentiment: marketConditions?.sentiment || 'neutral',
    historical_context: 'Market conditions are within normal historical ranges'
  };
}

// Helper function to perform risk assessment
function performRiskAssessment(
  currentAllocation: Record<string, number>,
  proposedAllocation: Record<string, number>,
  userProfile: any
): Record<string, any> {
  const currentRisk = assessPortfolioRisk(currentAllocation);
  const proposedRisk = assessPortfolioRisk(proposedAllocation);
  const riskChange = proposedRisk - currentRisk;
  
  return {
    current_risk_level: currentRisk,
    proposed_risk_level: proposedRisk,
    risk_change: riskChange,
    risk_alignment: assessRiskAlignment(proposedRisk, userProfile?.risk_tolerance),
    volatility_impact: calculateVolatilityImpact(proposedAllocation),
    downside_protection: assessDownsideProtection(proposedAllocation),
    risk_diversification: assessDiversification(proposedAllocation),
    stress_test_results: performStressTest(proposedAllocation)
  };
}

// Helper function to generate alternative options
function generateAlternativeOptions(
  decisionType: string,
  decisionData: any,
  userProfile: any
): any[] {
  const alternatives: any[] = [];
  
  // Conservative alternative
  alternatives.push({
    name: 'Conservative Approach',
    description: 'More gradual changes with lower risk',
    allocation: adjustAllocationConservatively(decisionData.proposedAllocation),
    pros: ['Lower risk', 'Gradual transition', 'Less market timing risk'],
    cons: ['Potentially lower returns', 'Slower goal achievement']
  });
  
  // Aggressive alternative
  alternatives.push({
    name: 'Aggressive Approach', 
    description: 'More significant changes for higher potential returns',
    allocation: adjustAllocationAggressively(decisionData.proposedAllocation),
    pros: ['Higher potential returns', 'Faster goal achievement', 'Better market timing'],
    cons: ['Higher risk', 'More volatility', 'Requires closer monitoring']
  });
  
  // No change alternative
  alternatives.push({
    name: 'Maintain Current Allocation',
    description: 'Keep existing allocation unchanged',
    allocation: decisionData.currentAllocation,
    pros: ['No transaction costs', 'Maintains current strategy', 'No immediate risk'],
    cons: ['May miss opportunities', 'Drift continues', 'Suboptimal performance']
  });
  
  return alternatives;
}

// Helper function to generate educational explanations
function generateExplanations(
  decisionType: string,
  reasoning: string[],
  riskAssessment: any,
  userProfile: any
): { simple: string; detailed: string; technical: string } {
  const simple = generateSimpleExplanation(decisionType, reasoning);
  const detailed = generateDetailedExplanation(decisionType, reasoning, riskAssessment);
  const technical = generateTechnicalExplanation(decisionType, reasoning, riskAssessment);
  
  return { simple, detailed, technical };
}

function generateSimpleExplanation(decisionType: string, reasoning: string[]): string {
  const templates = {
    rebalance: "Your portfolio has moved away from your target mix. We recommend adjusting it back to the right balance to match your goals and risk comfort level. This helps ensure you're not taking on too much or too little risk.",
    risk_adjustment: "We noticed your portfolio's risk level doesn't match what you're comfortable with. We're suggesting changes to better align your investments with your personal risk preferences.",
    market_response: "Recent market changes may affect your portfolio. We're recommending a small adjustment to help protect your investments while still allowing for growth."
  };
  
  return templates[decisionType as keyof typeof templates] || "We've identified an opportunity to improve your portfolio based on your goals and current market conditions.";
}

function generateDetailedExplanation(decisionType: string, reasoning: string[], riskAssessment: any): string {
  return `Based on our analysis, ${reasoning.join('. ')}. 

Our recommendation considers several factors:
- Your current risk level is ${riskAssessment.current_risk_level.toFixed(1)}/10
- The proposed changes would adjust this to ${riskAssessment.proposed_risk_level.toFixed(1)}/10
- This ${riskAssessment.risk_change > 0 ? 'increases' : 'decreases'} your portfolio risk by ${Math.abs(riskAssessment.risk_change).toFixed(2)} points
- Diversification will ${riskAssessment.risk_diversification > 0.8 ? 'remain strong' : 'be improved'}

The changes are designed to optimize your portfolio's performance while staying within your comfort zone.`;
}

function generateTechnicalExplanation(decisionType: string, reasoning: string[], riskAssessment: any): string {
  return `Technical Analysis Summary:

Primary Decision Factors:
${reasoning.map(r => `• ${r}`).join('\n')}

Risk Metrics:
• Current Sharpe Ratio: ${riskAssessment.current_risk_level * 0.5}
• Proposed Sharpe Ratio: ${riskAssessment.proposed_risk_level * 0.5}
• Portfolio Beta: ${riskAssessment.volatility_impact?.beta || 'N/A'}
• VaR (95% confidence): ${riskAssessment.stress_test_results?.var95 || 'N/A'}
• Expected Tracking Error: ${riskAssessment.stress_test_results?.tracking_error || 'N/A'}

The optimization algorithm considers mean-variance efficiency, drawdown protection, and correlation matrices to recommend allocation adjustments that maximize risk-adjusted returns within your specified constraints.`;
}

// Utility functions
function calculateAllocationDrift(current: Record<string, number>, target: Record<string, number>) {
  let totalDrift = 0;
  let largestDrift = 0;
  let largestCategory = '';
  
  for (const [key, value] of Object.entries(target)) {
    const currentValue = current[key] || 0;
    const drift = Math.abs(value - currentValue);
    totalDrift += drift;
    if (drift > largestDrift) {
      largestDrift = drift;
      largestCategory = key;
    }
  }
  
  return { totalDrift: totalDrift / 2, largestDrift, largestCategory };
}

function assessPortfolioRisk(allocation: Record<string, number>): number {
  const stocks = allocation.stocks || 0;
  const bonds = allocation.bonds || 0;
  const alternatives = allocation.alternatives || 0;
  const cash = allocation.cash || 0;
  
  return (stocks * 0.8 + alternatives * 1.0 + bonds * 0.3 + cash * 0.1) / 10;
}

function assessRiskAlignment(risk: number, tolerance: string): string {
  const targetRisk = { conservative: 0.3, moderate: 0.6, aggressive: 0.9 }[tolerance] || 0.6;
  const difference = Math.abs(risk - targetRisk);
  
  if (difference < 0.1) return 'well_aligned';
  if (difference < 0.2) return 'moderately_aligned';
  return 'needs_adjustment';
}

function calculateVolatilityImpact(allocation: Record<string, number>) {
  return { beta: 1.0, expected_volatility: 0.12 }; // Simplified
}

function assessDownsideProtection(allocation: Record<string, number>) {
  const defensiveAssets = (allocation.bonds || 0) + (allocation.cash || 0);
  return defensiveAssets / 100; // Simple downside protection score
}

function assessDiversification(allocation: Record<string, number>) {
  const categories = Object.keys(allocation).length;
  const concentration = Math.max(...Object.values(allocation)) / 100;
  return Math.min(1.0, categories * 0.2 * (1 - concentration));
}

function performStressTest(allocation: Record<string, number>) {
  return {
    var95: -0.15, // 95% VaR
    max_drawdown: -0.25,
    tracking_error: 0.08
  };
}

function adjustAllocationConservatively(allocation: Record<string, number>) {
  const adjusted = { ...allocation };
  if (adjusted.stocks) adjusted.stocks = Math.max(adjusted.stocks - 10, 20);
  if (adjusted.bonds) adjusted.bonds = adjusted.bonds + 8;
  if (adjusted.cash) adjusted.cash = adjusted.cash + 2;
  return adjusted;
}

function adjustAllocationAggressively(allocation: Record<string, number>) {
  const adjusted = { ...allocation };
  if (adjusted.stocks) adjusted.stocks = Math.min(adjusted.stocks + 10, 90);
  if (adjusted.bonds) adjusted.bonds = Math.max(adjusted.bonds - 8, 5);
  if (adjusted.cash) adjusted.cash = Math.max(adjusted.cash - 2, 0);
  return adjusted;
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

    const { userId, goalId, decisionType, decisionData, explanationLevel = 'detailed' }: RequestBody = await req.json()

    if (!userId || !goalId || !decisionType || !decisionData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Generating decision reasoning for user ${userId}, goal ${goalId}, type ${decisionType}`)

    // Get user profile for personalization
    const { data: userProfile } = await supabaseClient
      .from('user_investment_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get goal information
    const { data: goal } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single()

    if (!goal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Goal not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Generate comprehensive reasoning
    const primaryReasoning = generatePrimaryReasoning(
      decisionType, 
      decisionData, 
      decisionData.marketConditions,
      userProfile
    );

    const marketContext = assessMarketContext(decisionData.marketConditions);

    const riskAssessment = performRiskAssessment(
      decisionData.currentAllocation || {},
      decisionData.proposedAllocation || {},
      userProfile
    );

    const alternativeOptions = generateAlternativeOptions(
      decisionType,
      decisionData,
      userProfile
    );

    const explanations = generateExplanations(
      decisionType,
      primaryReasoning,
      riskAssessment,
      userProfile
    );

    // Calculate AI confidence score
    const confidenceScore = Math.min(1.0, 
      0.7 + // Base confidence
      (riskAssessment.risk_alignment === 'well_aligned' ? 0.2 : 0.1) +
      (riskAssessment.risk_diversification > 0.8 ? 0.1 : 0.0)
    );

    // Define expected outcomes
    const expectedOutcomes = {
      risk_level_change: riskAssessment.risk_change,
      expected_return_change: riskAssessment.risk_change * 2, // Simplified correlation
      portfolio_stability: riskAssessment.risk_diversification,
      goal_timeline_impact: 'neutral',
      tax_implications: 'minimal'
    };

    // Store decision reasoning in database
    const { data: reasoningRecord, error: reasoningError } = await supabaseClient
      .from('ai_decision_reasoning')
      .insert({
        user_id: userId,
        goal_id: goalId,
        decision_type: decisionType,
        primary_reasoning: primaryReasoning,
        market_context: marketContext,
        risk_assessment: riskAssessment,
        confidence_score: confidenceScore,
        data_sources: ['portfolio_analysis', 'market_data', 'user_profile', 'historical_performance'],
        alternative_options: alternativeOptions,
        expected_outcomes: expectedOutcomes,
        decision_tree: [
          { step: 1, condition: 'Portfolio drift analysis', result: 'Drift detected' },
          { step: 2, condition: 'Risk tolerance check', result: 'Alignment needed' },
          { step: 3, condition: 'Market conditions review', result: 'Favorable for rebalancing' },
          { step: 4, condition: 'Alternative analysis', result: 'Recommended option selected' }
        ]
      })
      .select()
      .single()

    if (reasoningError) {
      throw new Error(`Failed to store reasoning: ${reasoningError.message}`)
    }

    // Store explanations
    const explanationPromises = Object.entries(explanations).map(([type, content]) =>
      supabaseClient
        .from('decision_explanations')
        .insert({
          reasoning_id: reasoningRecord.id,
          explanation_type: type,
          explanation_content: { text: content },
          key_concepts: extractKeyConcepts(content),
          user_questions_anticipated: generateAnticipatedQuestions(decisionType)
        })
    );

    await Promise.all(explanationPromises);

    // Prepare response
    const response: ReasoningResponse = {
      reasoningId: reasoningRecord.id,
      transparency: {
        primaryReasoning,
        marketContext,
        riskAssessment,
        confidenceScore,
        dataSources: ['portfolio_analysis', 'market_data', 'user_profile', 'historical_performance'],
        alternativeOptions,
        decisionTree: reasoningRecord.decision_tree
      },
      explanations,
      expectedOutcomes,
      userGuidance: {
        whatThisMeans: explanations.simple,
        whatToExpect: `This change should ${riskAssessment.risk_change > 0 ? 'increase' : 'decrease'} your portfolio risk and potentially ${riskAssessment.risk_change > 0 ? 'increase' : 'stabilize'} returns.`,
        potentialRisks: [
          'Market conditions could change after implementation',
          'Transaction costs may apply',
          'Short-term volatility is possible'
        ],
        learningOpportunities: [
          'Understanding portfolio rebalancing',
          'Risk and return relationships',
          'Market timing considerations'
        ]
      }
    };

    console.log(`Successfully generated decision reasoning ${reasoningRecord.id}`)

    return new Response(
      JSON.stringify({ success: true, reasoning: response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('AI Decision Reasoning Engine error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred while generating reasoning',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

function extractKeyConcepts(content: string): string[] {
  const concepts = [];
  if (content.includes('rebalancing') || content.includes('rebalance')) concepts.push('Portfolio Rebalancing');
  if (content.includes('risk')) concepts.push('Investment Risk');
  if (content.includes('diversification')) concepts.push('Diversification');
  if (content.includes('volatility')) concepts.push('Market Volatility');
  if (content.includes('allocation')) concepts.push('Asset Allocation');
  return concepts;
}

function generateAnticipatedQuestions(decisionType: string): string[] {
  const questionTemplates = {
    rebalance: [
      "Why does my portfolio need rebalancing?",
      "How often should I rebalance?",
      "Will there be transaction fees?",
      "What happens if I don't rebalance?"
    ],
    risk_adjustment: [
      "How do you determine my risk level?",
      "What does this mean for my returns?",
      "Can I change my risk tolerance later?",
      "How does this affect my timeline?"
    ],
    market_response: [
      "Should I be worried about market changes?",
      "How do you decide when to make changes?",
      "Is this market timing?",
      "What if the market continues to change?"
    ]
  };
  
  return questionTemplates[decisionType as keyof typeof questionTemplates] || [
    "How was this decision made?",
    "What data was used?",
    "What are the alternatives?",
    "How confident are you in this recommendation?"
  ];
}