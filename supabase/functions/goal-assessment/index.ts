import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { corsHeaders } from '../shared/cors.ts';
import { logUserActivity } from '../shared/activity-logger.ts';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

interface GoalAssessmentRequest {
  userId: string;
  goalType: string;
  responses: Record<string, any>;
  timestamp: string;
}

interface AssessmentAnalysis {
  goalDetails: {
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    riskTolerance: string;
    priority: number;
  };
  userProfile: {
    age: number;
    income: string;
    investmentExperience: string;
    riskTolerance: string;
    timeline: number;
    esgPreferences: boolean;
    behavioralProfile: any;
  };
  aiInsights: {
    feasibilityScore: number;
    recommendedAdjustments: string[];
    keyRisks: string[];
    successFactors: string[];
    personalizedGuidance: string;
  };
  confidenceLevel: number;
}

serve(async (req) => {
  const startTime = Date.now(); // Track request start time for activity logging

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const assessmentData: GoalAssessmentRequest = await req.json();
    console.log('Goal assessment request:', { 
      userId: assessmentData.userId, 
      goalType: assessmentData.goalType 
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user exists and is authenticated
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    // Process the assessment with AI
    const analysis = await processGoalAssessment(assessmentData);

    // Create or update user investment profile
    await upsertUserProfile(supabase, assessmentData.userId, analysis.userProfile);

    // Extract current amount from user responses
    const currentAmount = extractCurrentAmount(assessmentData.goalType, assessmentData.responses);
    
    // Create the financial goal
    const { data: goal, error: goalError } = await supabase
      .from('financial_goals')
      .insert({
        user_id: assessmentData.userId,
        goal_type: assessmentData.goalType,
        title: generateGoalTitle(assessmentData.goalType, analysis.goalDetails),
        description: generateGoalDescription(assessmentData.goalType, analysis.goalDetails),
        target_amount: analysis.goalDetails.targetAmount,
        target_date: analysis.goalDetails.targetDate,
        current_amount: currentAmount,
        monthly_contribution: analysis.goalDetails.monthlyContribution,
        risk_tolerance: analysis.goalDetails.riskTolerance,
        priority: analysis.goalDetails.priority,
        status: 'active',
        ai_assessment: {
          ...analysis.aiInsights,
          assessment_date: new Date().toISOString(),
          raw_responses: assessmentData.responses,
          confidence_level: analysis.confidenceLevel
        }
      })
      .select()
      .single();

    if (goalError) {
      console.error('Goal creation error:', goalError);
      throw new Error('Failed to create financial goal');
    }

    // Set goal preferences
    await supabase
      .from('goal_preferences')
      .insert({
        user_id: assessmentData.userId,
        goal_id: goal.id,
        notification_frequency: 'weekly',
        auto_rebalancing: false,
        tax_optimization: true,
        performance_tracking: true,
        ai_insights_enabled: true
      });

    console.log('Goal created successfully:', goal.id);

    // Log user activity for goal assessment completion
    await logUserActivity(
      supabase,
      assessmentData.userId,
      'goal_assessment',
      'completed',
      {
        goal_id: goal.id,
        goal_type: assessmentData.goalType,
        target_amount: analysis.goalDetails.targetAmount,
        current_amount: currentAmount,
        monthly_contribution: analysis.goalDetails.monthlyContribution,
        risk_tolerance: analysis.goalDetails.riskTolerance,
        time_horizon: analysis.goalDetails.targetDate,
        priority: analysis.goalDetails.priority,
        confidence_level: analysis.confidenceLevel,
        assessment_duration_ms: Date.now() - startTime,
        ai_model_used: 'gemini-2.5-flash',
        response_count: Object.keys(assessmentData.responses).length
      },
      'goal-assessment'
    );

    return new Response(JSON.stringify({ 
      success: true, 
      goalId: goal.id,
      goal: goal,
      analysis: analysis,
      nextStep: 'portfolio_generation'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Goal assessment error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process goal assessment',
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processGoalAssessment(assessmentData: GoalAssessmentRequest): Promise<AssessmentAnalysis> {
  const prompt = buildAssessmentPrompt(assessmentData);

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const generationConfig = {
    responseMimeType: "text/plain",
    maxOutputTokens: 3000,
    temperature: 0.3,
  };

  const systemPrompt = `You are an expert financial planning AI that analyzes user goal assessments and provides comprehensive analysis.

CRITICAL REQUIREMENTS:
1. Always return valid JSON matching the expected schema exactly
2. Analyze feasibility of goals based on user inputs
3. Provide realistic target amounts and timelines
4. Identify potential risks and success factors
5. Generate personalized guidance and recommendations
6. Calculate appropriate monthly contribution amounts
7. Assess user risk tolerance and investment experience

RESPONSE FORMAT: Return ONLY valid JSON with no additional text, explanations, markdown formatting, or code blocks. Start your response with { and end with }.

Expected JSON Schema:
{
  "goalDetails": {
    "targetAmount": number,
    "targetDate": "YYYY-MM-DD",
    "monthlyContribution": number,
    "riskTolerance": "conservative|moderate|aggressive",
    "priority": number
  },
  "userProfile": {
    "age": integer (18-100),
    "income": string,
    "investmentExperience": string,
    "riskTolerance": string,
    "timeline": integer (years),
    "esgPreferences": boolean,
    "behavioralProfile": object
  },
  "aiInsights": {
    "feasibilityScore": number (0.0-1.0),
    "recommendedAdjustments": [string],
    "keyRisks": [string],
    "successFactors": [string],
    "personalizedGuidance": string
  },
  "confidenceLevel": number (0.0-1.0)
}`;

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: fullPrompt }],
    }],
  }, generationConfig);

  const response = result.response;
  let assessmentContent = response.text();

  if (!assessmentContent) {
    throw new Error('Failed to generate goal assessment');
  }

  try {
    // Clean up the response content
    let cleanedContent = assessmentContent.trim();
    
    // Remove any markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Log the cleaned content for debugging
    console.log('Gemini response (cleaned):', cleanedContent);
    
    const analysisData = JSON.parse(cleanedContent);
    
    // Log the parsed data for debugging
    console.log('Parsed analysis data:', JSON.stringify(analysisData, null, 2));
    
    // Validate the response structure
    validateAssessmentResponse(analysisData);
    
    return analysisData;
  } catch (parseError) {
    console.error('Failed to parse AI assessment response. Raw content:', assessmentContent);
    console.error('Parse error:', parseError);
    throw new Error('Failed to parse AI goal assessment');
  }
}

function buildAssessmentPrompt(data: GoalAssessmentRequest): string {
  const { goalType, responses } = data;
  
  let prompt = `Analyze this ${goalType} goal assessment and provide comprehensive analysis:

GOAL TYPE: ${goalType.toUpperCase()}

USER RESPONSES:
${Object.entries(responses).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}

ANALYSIS REQUIREMENTS:

1. GOAL DETAILS:
   - Calculate realistic target amount based on responses
   - Set appropriate target date
   - Determine required monthly contribution
   - Assess risk tolerance from scenario responses
   - Set priority level (1-5)

2. USER PROFILE:
   - Extract age from responses.current_age field (must be integer 18-100)
   - Map income_range to one of these EXACT values based on context or default to 'not_provided':
     * 'under_30k', '30k_50k', '50k_75k', '75k_100k', '100k_150k', '150k_250k', 'over_250k'
   - Map investment_experience to one of: 'beginner', 'intermediate', 'advanced'
   - Map risk_tolerance from responses to one of: 'conservative', 'moderate', 'aggressive'
   - Calculate timeline in years (integer only)
   - Set esgPreferences to false (default)
   - Build behavioral_profile object from available responses

3. AI INSIGHTS:
   - Score goal feasibility (0.0-1.0)
   - Identify recommended adjustments
   - List key risks to success
   - Highlight success factors
   - Provide personalized guidance

4. CONFIDENCE ASSESSMENT:
   - Rate confidence in analysis (0.0-1.0)
   - Consider completeness of responses
   - Factor in goal complexity`;

  // Add goal-specific analysis requirements
  if (goalType === 'retirement') {
    prompt += `\n\nRETIREMENT-SPECIFIC MAPPING:
- age: use responses.current_age (integer)
- income_range: estimate based on responses.monthly_contribution and responses.current_savings, map to enum values only
- investment_experience: infer from responses.risk_scenario - 'buy_more'=advanced, 'hold_steady'=intermediate, 'reduce_risk'=beginner  
- risk_tolerance: map responses.risk_scenario to 'conservative'|'moderate'|'aggressive'
- timeline: calculate from responses.target_retirement_age - responses.current_age (integer years)

RETIREMENT-SPECIFIC ANALYSIS:
- Use replacement income ratios (70-90% of current income)
- Factor in Social Security and existing retirement savings
- Consider inflation impact over timeline
- Account for healthcare costs in retirement
- Analyze withdrawal rate sustainability`;

  } else if (goalType === 'home_purchase') {
    prompt += `\n\nHOME PURCHASE-SPECIFIC MAPPING:
- age: use responses.current_age (integer)
- income_range: use responses.annual_income, map to exact enum values
- investment_experience: use responses.investment_experience directly
- risk_tolerance: use responses.risk_tolerance directly
- timeline: calculate years from target_purchase_date to now (integer)

HOME PURCHASE ANALYSIS:
- Factor in down payment percentage (typically 10-20%)
- Include closing costs (2-3% of home price)
- Consider PMI if down payment < 20%
- Account for property taxes and maintenance
- Assess debt-to-income ratios`;
  } else if (goalType === 'education') {
    prompt += `\n\nEDUCATION FUNDING ANALYSIS:
- Use current education cost trends
- Factor in education inflation (3-5% annually)
- Consider 529 plan tax advantages
- Account for multiple children if applicable
- Balance with other financial priorities`;
  }

  prompt += `\n\nReturn only valid JSON with no additional formatting or explanation.`;

  return prompt;
}

function validateAssessmentResponse(data: any): void {
  const required = ['goalDetails', 'userProfile', 'aiInsights', 'confidenceLevel'];
  
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate goalDetails
  const goalDetails = data.goalDetails;
  if (!goalDetails.targetAmount || goalDetails.targetAmount <= 0) {
    throw new Error('Target amount must be positive');
  }
  
  if (!goalDetails.targetDate) {
    throw new Error('Target date is required');
  }
  
  // Validate userProfile
  const userProfile = data.userProfile;
  if (!userProfile.age || userProfile.age < 18 || userProfile.age > 100) {
    throw new Error('Age must be between 18 and 100');
  }
  
  // Validate feasibility score
  const feasibilityScore = data.aiInsights.feasibilityScore;
  if (typeof feasibilityScore !== 'number' || feasibilityScore < 0 || feasibilityScore > 1) {
    throw new Error('Feasibility score must be between 0 and 1');
  }
  
  // Validate confidence level
  if (typeof data.confidenceLevel !== 'number' || data.confidenceLevel < 0 || data.confidenceLevel > 1) {
    throw new Error('Confidence level must be between 0 and 1');
  }
}

// Validate and fix income_range if invalid
function validateIncomeRange(income: string): string {
  const validValues = ['under_30k', '30k_50k', '50k_75k', '75k_100k', '100k_150k', '150k_250k', 'over_250k'];
  
  if (validValues.includes(income)) {
    return income;
  }
  
  // Default to reasonable estimate based on common patterns
  if (income.includes('30') || income.includes('low')) return '30k_50k';
  if (income.includes('50')) return '50k_75k';
  if (income.includes('75') || income.includes('100')) return '75k_100k';
  if (income.includes('150')) return '100k_150k';
  if (income.includes('250') || income.includes('high')) return '150k_250k';
  
  // Conservative default
  return '50k_75k';
}

async function upsertUserProfile(supabase: any, userId: string, userProfile: any): Promise<void> {
  // Validate income_range before database insert
  const validatedIncomeRange = validateIncomeRange(userProfile.income);
  
  const { error } = await supabase
    .from('user_investment_profiles')
    .upsert({
      user_id: userId,
      age: Math.round(userProfile.age),
      income_range: validatedIncomeRange,
      investment_experience: userProfile.investmentExperience,
      risk_tolerance: userProfile.riskTolerance,
      investment_timeline: Math.round(userProfile.timeline),
      esg_preferences: userProfile.esgPreferences || false,
      behavioral_preferences: userProfile.behavioralProfile || {},
      onboarding_completed: true,
      profile_version: 1
    }, {
      onConflict: 'user_id'
    });
    
  if (error) {
    console.error('Profile upsert error:', error);
    throw new Error('Failed to update user profile');
  }
}

function generateGoalTitle(goalType: string, goalDetails: any): string {
  const titles: Record<string, string> = {
    'retirement': `Retirement by ${new Date(goalDetails.targetDate).getFullYear()}`,
    'home_purchase': `Home Purchase - $${goalDetails.targetAmount.toLocaleString()}`,
    'education': `Education Fund - $${goalDetails.targetAmount.toLocaleString()}`,
    'wealth_building': `Wealth Building - $${goalDetails.targetAmount.toLocaleString()}`,
    'emergency_fund': `Emergency Fund - $${goalDetails.targetAmount.toLocaleString()}`,
    'custom': `Financial Goal - $${goalDetails.targetAmount.toLocaleString()}`
  };
  
  return titles[goalType] || `${goalType} Goal`;
}

// Extract current amount from assessment responses based on goal type
function extractCurrentAmount(goalType: string, responses: Record<string, any>): number {
  // Different goal types use different field names for current amount
  const currentAmountFields = {
    'retirement': ['current_savings', 'current_amount'],
    'home_purchase': ['current_savings', 'current_amount', 'down_payment_saved'],
    'education': ['current_savings', 'current_amount', 'education_savings'],
    'wealth_building': ['current_amount', 'current_savings', 'investment_amount'],
    'emergency_fund': ['current_amount', 'current_savings', 'emergency_savings'],
    'custom': ['current_amount', 'current_savings', 'starting_amount']
  };
  
  const fieldsToCheck = currentAmountFields[goalType] || ['current_amount', 'current_savings'];
  
  for (const field of fieldsToCheck) {
    if (responses[field] !== undefined && responses[field] !== null) {
      const value = Number(responses[field]);
      if (!isNaN(value) && value >= 0) {
        console.log(`Extracted current amount: $${value} from field: ${field}`);
        return value;
      }
    }
  }
  
  console.log('No valid current amount found in responses, defaulting to 0');
  return 0;
}

function generateGoalDescription(goalType: string, goalDetails: any): string {
  const targetYear = new Date(goalDetails.targetDate).getFullYear();
  const monthlyAmount = goalDetails.monthlyContribution.toLocaleString();
  
  const descriptions: Record<string, string> = {
    'retirement': `Build a retirement portfolio of $${goalDetails.targetAmount.toLocaleString()} by ${targetYear} with monthly contributions of $${monthlyAmount}.`,
    'home_purchase': `Save $${goalDetails.targetAmount.toLocaleString()} for a home purchase by ${targetYear} with monthly savings of $${monthlyAmount}.`,
    'education': `Create an education fund of $${goalDetails.targetAmount.toLocaleString()} by ${targetYear} with monthly contributions of $${monthlyAmount}.`,
    'wealth_building': `Build wealth to $${goalDetails.targetAmount.toLocaleString()} by ${targetYear} through monthly investments of $${monthlyAmount}.`,
    'emergency_fund': `Establish an emergency fund of $${goalDetails.targetAmount.toLocaleString()} by ${targetYear} with monthly savings of $${monthlyAmount}.`,
    'custom': `Achieve financial goal of $${goalDetails.targetAmount.toLocaleString()} by ${targetYear} with monthly contributions of $${monthlyAmount}.`
  };
  
  return descriptions[goalType] || `Financial goal targeting $${goalDetails.targetAmount.toLocaleString()}.`;
}