import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { corsHeaders } from '../shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

interface PortfolioRequest {
  goalId: string;
  userId: string;
  goalType: string;
  targetAmount: number;
  timeline: number; // years
  riskTolerance: string;
  userProfile: {
    age: number;
    income: string;
    investmentExperience: string;
    existingInvestments?: any[];
    esgPreferences?: boolean;
    taxSituation?: any;
  };
  currentAmount?: number;
  monthlyContribution?: number;
}

interface AIPortfolioResponse {
  allocation: {
    stocks: number;
    bonds: number;
    alternatives: number;
    cash?: number;
  };
  holdings: Array<{
    symbol: string;
    name: string;
    allocation: number;
    category: string;
    reasoning: string;
    expenseRatio?: number;
    dividendYield?: number;
  }>;
  riskScore: number;
  expectedReturn: number;
  confidenceScore: number;
  scenarios: {
    best_case: { probability: number; value: number; };
    expected_case: { probability: number; value: number; };
    worst_case: { probability: number; value: number; };
  };
  rebalancingTriggers: {
    timeBasedMonths: number;
    allocationDriftPercent: number;
    marketVolatilityThreshold: number;
  };
  insights: {
    keyStrengths: string[];
    potentialConcerns: string[];
    actionableRecommendations: string[];
    personalizedMessage: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: PortfolioRequest = await req.json();
    console.log('Portfolio generation request:', { goalId: requestData.goalId, goalType: requestData.goalType });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate user and goal
    const { data: goal, error: goalError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', requestData.goalId)
      .eq('user_id', requestData.userId)
      .single();

    if (goalError || !goal) {
      throw new Error('Goal not found or access denied');
    }

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_investment_profiles')
      .select('*')
      .eq('user_id', requestData.userId)
      .single();

    // If no user profile exists, create a default one based on goal data
    let profile = userProfile;
    if (profileError || !userProfile) {
      console.log('No user profile found, creating default profile...');
      
      // Calculate a reasonable age and experience level from the goal
      const defaultAge = 35; // Default middle age
      const timelineYears = Math.round((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365));
      
      const defaultProfile = {
        user_id: requestData.userId,
        age: defaultAge,
        income_range: '50k_75k', // Default middle income
        investment_experience: 'beginner',
        risk_tolerance: goal.risk_tolerance || 'moderate',
        investment_timeline: timelineYears,
        esg_preferences: false,
        behavioral_preferences: {},
        onboarding_completed: false,
        profile_version: 1
      };
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_investment_profiles')
        .insert(defaultProfile)
        .select()
        .single();
        
      if (createError) {
        console.error('Failed to create default profile:', createError);
        throw new Error('Unable to generate portfolio without user profile');
      }
      
      profile = newProfile;
    }

    // Build complete request with user profile
    const completeRequest: PortfolioRequest = {
      goalId: requestData.goalId,
      userId: requestData.userId,
      goalType: goal.goal_type,
      targetAmount: goal.target_amount,
      timeline: Math.round((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365)),
      riskTolerance: goal.risk_tolerance,
      userProfile: {
        age: profile.age,
        income: profile.income_range,
        investmentExperience: profile.investment_experience,
        existingInvestments: [],
        esgPreferences: profile.esg_preferences || false,
        taxSituation: {}
      },
      currentAmount: goal.current_amount,
      monthlyContribution: goal.monthly_contribution
    };

    // Generate AI portfolio analysis
    const portfolioAnalysis = await generateAIPortfolio(completeRequest);

    // Store AI-generated portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('ai_portfolios')
      .insert({
        goal_id: requestData.goalId,
        user_id: requestData.userId,
        allocation: portfolioAnalysis.allocation,
        recommended_holdings: portfolioAnalysis.holdings,
        risk_score: portfolioAnalysis.riskScore,
        expected_return: portfolioAnalysis.expectedReturn,
        confidence_score: portfolioAnalysis.confidenceScore,
        scenario_analysis: portfolioAnalysis.scenarios,
        rebalancing_triggers: portfolioAnalysis.rebalancingTriggers,
        ai_reasoning: portfolioAnalysis.insights.personalizedMessage,
        version: 1,
        is_active: true
      })
      .select()
      .single();

    if (portfolioError) {
      console.error('Database error:', portfolioError);
      throw new Error('Failed to save portfolio analysis');
    }

    // Create initial milestones for this goal
    await createInitialMilestones(supabase, requestData.goalId, requestData.targetAmount);

    console.log('Portfolio successfully generated:', portfolio.id);

    // Prepare the portfolio response with proper structure for frontend
    const portfolioResponse = {
      id: portfolio.id,
      allocation: portfolioAnalysis.allocation,
      recommended_holdings: portfolioAnalysis.holdings,
      risk_score: portfolioAnalysis.riskScore,
      expected_return: portfolioAnalysis.expectedReturn,
      confidence_score: portfolioAnalysis.confidenceScore,
      scenario_analysis: portfolioAnalysis.scenarios,
      ai_reasoning: portfolioAnalysis.insights.personalizedMessage
    };

    return new Response(JSON.stringify({ 
      success: true, 
      portfolio: portfolioResponse,
      aiInsights: portfolioAnalysis.insights,
      allocation: portfolioAnalysis.allocation,
      holdings: portfolioAnalysis.holdings,
      scenarios: portfolioAnalysis.scenarios
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Portfolio generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate portfolio',
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAIPortfolio(params: PortfolioRequest): Promise<AIPortfolioResponse> {
  const prompt = buildPortfolioPrompt(params);

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const generationConfig = {
    responseMimeType: "text/plain",
    maxOutputTokens: 4000,
    temperature: 0.3,
  };

  const systemPrompt = `You are an expert financial advisor AI specializing in goal-based portfolio construction. 

CRITICAL REQUIREMENTS:
1. Always return valid JSON that matches the expected schema exactly
2. Provide specific, actionable investment recommendations with real ETFs/funds
3. Consider tax efficiency, expense ratios, and diversification
4. Tailor risk level to timeline and user preferences
5. Include detailed reasoning for each recommendation
6. Provide realistic scenario projections based on historical data

RESPONSE FORMAT: Return ONLY valid JSON with no additional text, explanations, markdown formatting, or code blocks. Start your response with { and end with }.

Expected JSON Schema:
{
  "allocation": {"stocks": number, "bonds": number, "alternatives": number},
  "holdings": [{"symbol": string, "name": string, "allocation": number, "category": string, "reasoning": string, "expenseRatio": number, "dividendYield": number}],
  "riskScore": number (0.0-1.0),
  "expectedReturn": number (annual %),
  "confidenceScore": number (0.0-1.0),
  "scenarios": {"best_case": {"probability": number, "value": number}, "expected_case": {"probability": number, "value": number}, "worst_case": {"probability": number, "value": number}},
  "rebalancingTriggers": {"timeBasedMonths": number, "allocationDriftPercent": number, "marketVolatilityThreshold": number},
  "insights": {"keyStrengths": [string], "potentialConcerns": [string], "actionableRecommendations": [string], "personalizedMessage": string}
}`;

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: fullPrompt }],
    }],
  }, generationConfig);

  const response = result.response;
  let portfolioContent = response.text();

  if (!portfolioContent) {
    throw new Error('Failed to generate portfolio recommendations');
  }

  try {
    // Clean up the response content
    let cleanedContent = portfolioContent.trim();
    
    // Remove any markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Log the cleaned content for debugging
    console.log('Gemini portfolio response (cleaned):', cleanedContent);
    
    const portfolioData = JSON.parse(cleanedContent);
    
    // Validate the response structure
    validatePortfolioResponse(portfolioData);
    
    return portfolioData;
  } catch (parseError) {
    console.error('Failed to parse AI response. Raw content:', portfolioContent);
    console.error('Parse error:', parseError);
    throw new Error('Failed to parse AI portfolio recommendations');
  }
}

function buildPortfolioPrompt(params: PortfolioRequest): string {
  const timelineText = params.timeline <= 5 ? 'short-term' : params.timeline <= 15 ? 'medium-term' : 'long-term';
  const incomeLevel = getIncomeLevel(params.userProfile.income);
  
  return `Generate a personalized investment portfolio with the following parameters:

GOAL DETAILS:
- Goal Type: ${params.goalType}
- Target Amount: $${params.targetAmount.toLocaleString()}
- Timeline: ${params.timeline} years (${timelineText})
- Current Amount: $${params.currentAmount || 0}
- Monthly Contribution: $${params.monthlyContribution || 0}

USER PROFILE:
- Age: ${params.userProfile.age}
- Income Level: ${incomeLevel}
- Investment Experience: ${params.userProfile.investmentExperience}
- Risk Tolerance: ${params.riskTolerance}
- ESG Preferences: ${params.userProfile.esgPreferences ? 'Yes' : 'No'}

REQUIREMENTS:
1. Recommend 5-8 specific ETFs/mutual funds with real symbols (VTI, VOO, BND, etc.)
2. Provide asset allocation percentages that sum to 100%
3. Consider expense ratios (<0.20% preferred for core holdings)
4. Include tax-efficient funds for taxable accounts
5. Account for the ${params.timeline}-year timeline in risk allocation
6. Provide Monte Carlo-style scenario projections
7. Include specific rebalancing guidance

GOAL-SPECIFIC CONSIDERATIONS:
${getGoalSpecificGuidance(params.goalType, params.timeline)}

Calculate projected portfolio values for best case (90th percentile), expected case (50th percentile), and worst case (10th percentile) scenarios at the target date.

Return only valid JSON with no additional formatting.`;
}

function getIncomeLevel(incomeRange: string): string {
  const incomeMap: Record<string, string> = {
    'under_30k': 'Low ($0-30k)',
    '30k_50k': 'Lower-middle ($30-50k)',
    '50k_75k': 'Middle ($50-75k)',
    '75k_100k': 'Upper-middle ($75-100k)',
    '100k_150k': 'High ($100-150k)',
    '150k_250k': 'Very high ($150-250k)',
    'over_250k': 'Ultra-high ($250k+)'
  };
  return incomeMap[incomeRange] || 'Not specified';
}

function getGoalSpecificGuidance(goalType: string, timeline: number): string {
  const guidance: Record<string, string> = {
    'retirement': `
- Prioritize tax-advantaged growth for ${timeline}-year timeline
- Include target-date fund considerations
- Balance growth and stability based on age
- Consider inflation protection for long-term purchasing power`,
    
    'home_purchase': `
- Emphasize capital preservation for ${timeline < 5 ? 'near-term' : 'medium-term'} goal
- Higher cash/bond allocation for stability
- Consider high-yield savings for < 2 year timeline
- Minimize volatility risk near purchase date`,
    
    'education': `
- Use age-based glide path (more aggressive early, conservative near use)
- Consider 529 plan tax advantages
- Balance growth with preservation as date approaches
- Plan for tuition inflation (typically 3-5% annually)`,
    
    'wealth_building': `
- Focus on long-term growth and compound returns
- Higher equity allocation appropriate for wealth building
- Include international diversification
- Consider factor-based investing (value, growth, small-cap)`,
    
    'emergency_fund': `
- Emphasize liquidity and capital preservation
- High-yield savings or short-term bond focus
- Minimal risk tolerance appropriate
- Quick access more important than returns`,
    
    'custom': `
- Balance growth and preservation based on timeline
- Consider goal-specific liquidity needs
- Customize risk profile for specific objective
- Include inflation protection if long-term goal`
  };
  
  return guidance[goalType] || 'Apply general balanced portfolio principles';
}

function validatePortfolioResponse(data: any): void {
  const required = ['allocation', 'holdings', 'riskScore', 'expectedReturn', 'confidenceScore', 'scenarios', 'rebalancingTriggers', 'insights'];
  
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate allocation sums to ~100%
  const { stocks, bonds, alternatives } = data.allocation;
  const total = stocks + bonds + alternatives + (data.allocation.cash || 0);
  if (Math.abs(total - 100) > 2) {
    throw new Error(`Allocation must sum to 100%, got ${total}%`);
  }
  
  // Validate holdings array
  if (!Array.isArray(data.holdings) || data.holdings.length === 0) {
    throw new Error('Holdings must be a non-empty array');
  }
  
  // Validate numeric ranges
  if (data.riskScore < 0 || data.riskScore > 1) {
    throw new Error('Risk score must be between 0 and 1');
  }
  
  if (data.expectedReturn < 0 || data.expectedReturn > 30) {
    throw new Error('Expected return must be between 0 and 30%');
  }
}

async function createInitialMilestones(supabase: any, goalId: string, targetAmount: number): Promise<void> {
  const milestones = [
    { percentage: 10, type: 'percentage', message: '🎉 Great start! You\'ve reached 10% of your goal!' },
    { percentage: 25, type: 'percentage', message: '🚀 Fantastic progress! You\'re 25% of the way there!' },
    { percentage: 50, type: 'percentage', message: '🎯 Amazing! You\'ve hit the halfway mark!' },
    { percentage: 75, type: 'percentage', message: '🏆 Outstanding! You\'re 75% complete!' },
    { percentage: 90, type: 'percentage', message: '🌟 So close! Just 10% to go until you reach your goal!' }
  ];
  
  const milestoneInserts = milestones.map(milestone => ({
    goal_id: goalId,
    milestone_type: milestone.type,
    target_value: (targetAmount * milestone.percentage) / 100,
    ai_message: milestone.message,
    achieved: false
  }));
  
  const { error } = await supabase
    .from('goal_milestones')
    .insert(milestoneInserts);
    
  if (error) {
    console.error('Failed to create milestones:', error);
    // Don't throw here - milestones are nice-to-have, not critical
  }
}