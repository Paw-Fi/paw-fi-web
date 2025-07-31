import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { logUserActivity } from "../shared/activity-logger.ts";
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { getQuestionnaireTemplate } from "../shared/goals-questionnaire-templates.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

// Helper function to extract target amount from questionnaire answers
function extractTargetAmountFromAnswers(answers: any): number {
  // Actual field names from questionnaire templates
  const targetAmountFields = [
    // Direct target amounts
    'target_amount',           // custom template
    'target_home_price',       // home_buying template
    'wealth_target',           // wealth template
    'investment_amount',       // investment template
    'total_debt_amount',       // debt_payoff template
    
    // Calculated target amounts
    'monthly_essential_expenses', // emergency_fund (needs multiplication)
    
    // Income-based targets (retirement)
    'current_income',          // retirement template (used for calculation)
    
    // Generic fallbacks
    'goal_amount',
    'purchase_price',
    'savings_goal',
    'desired_amount'
  ];
  
  // Look for direct target amount fields first
  for (const field of targetAmountFields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        // Special case for emergency fund - multiply by target months
        if (field === 'monthly_essential_expenses' && answers['target_months']) {
          const months = parseInt(answers['target_months']) || 6;
          const targetAmount = amount * months;
          console.log(`Calculated emergency fund target: ${amount} * ${months} months = ${targetAmount}`);
          return targetAmount;
        }
        
        // Special case for retirement - use conservative calculation
        if (field === 'current_income') {
          // Use 10x annual income as a conservative retirement target
          const retirementTarget = amount * 10;
          console.log(`Calculated retirement target: ${amount} * 10 = ${retirementTarget}`);
          return retirementTarget;
        }
        
        console.log(`Found target amount in field ${field}: ${amount}`);
        return amount;
      }
    }
  }
  
  // If no direct target amount found, look for any large numeric field
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === 'string' || typeof value === 'number') {
      const amount = parseFloat(String(value).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 1000) { // Assume goals are at least $1000
        console.log(`Using ${key} as fallback target amount: ${amount}`);
        return amount;
      }
    }
  }
  
  // Last resort: return a reasonable default
  console.warn('No valid target amount found in questionnaire answers, using default $10,000');
  return 10000; // Default $10,000 goal
}

interface AIGoalResponse {
  goal: {
    title: string;
    description: string;
    targetAmount: number;
    targetDate: string;
    rationale: string;
  };
  strategy: string;
  milestones: Array<{
    title: string;
    description: string;
    type: string;
    targetAmount?: number;
    dueDate: string;
    habitDescription?: string;
    frequency?: string;
    habitTargetValue?: number;
    priority: string;
    aiRationale: string;
  }>;
  insights: Array<{
    type: string;
    title: string;
    content: string;
    priority: string;
    actionable: boolean;
  }>;
  projections?: {
    monthlyRequired?: number;
    projectedFinalAmount?: number;
    incomeReplacement?: number;
    confidenceLevel?: number;
  } | null;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { userId = null, goalType, questionnaireAnswers } = await req.json();

    if (!goalType || !questionnaireAnswers) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: goalType and questionnaireAnswers are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing AI goal generation for user: ${userId}, goal type: ${goalType}`);
    console.log('Questionnaire answers:', JSON.stringify(questionnaireAnswers, null, 2));

    // Get questionnaire template from shared templates
    const template = getQuestionnaireTemplate(goalType);

    if (!template) {
      console.error(`No template found for goal type: ${goalType}`);
      return new Response(
        JSON.stringify({ 
          error: `No active questionnaire template found for goal type: ${goalType}` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Using local template for goal type: ${goalType}`);

    // Prepare AI prompt with questionnaire data
    let aiPrompt = template.ai_prompt_template.replace(
      "{{QUESTIONNAIRE_DATA}}", 
      JSON.stringify(questionnaireAnswers, null, 2)
    );
    
    // Ensure the prompt emphasizes JSON output and date validation
    if (!aiPrompt.toLowerCase().includes('json')) {
      aiPrompt += "\n\nIMPORTANT: You must respond with valid JSON only. Do not include any explanatory text, markdown formatting, or conversational responses. Return only the JSON object as specified.";
    }
    
    // Add current date context and validation instructions
    const today = new Date().toISOString().split('T')[0];
    aiPrompt += `\n\nIMPORTANT DATE VALIDATION: Today's date is ${today}. The goal's targetDate MUST be a future date (at least 30 days from today). Ensure all milestone dueDates are also in the future and properly sequenced.`;

    console.log("Sending request to Gemini AI...");

    // Generate AI response
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 8000,
      temperature: 0.7,
    };

    // Retry mechanism for AI generation
    let aiResponseText = "";
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        }, generationConfig);

        aiResponseText = result.response.text();
        console.log(`AI Response received (attempt ${attempts}):`, aiResponseText);
        
        // Check if response contains JSON-like structure and is complete
        if (aiResponseText.includes('{') && aiResponseText.includes('}')) {
          // Check if JSON appears to be truncated
          const openBraces = (aiResponseText.match(/\{/g) || []).length;
          const closeBraces = (aiResponseText.match(/\}/g) || []).length;
          
          if (openBraces === closeBraces || aiResponseText.includes('```') && aiResponseText.lastIndexOf('```') > aiResponseText.indexOf('```json')) {
            break; // Success, exit retry loop
          } else {
            console.warn(`Attempt ${attempts}: AI response appears truncated (${openBraces} open, ${closeBraces} close braces)`);
            if (attempts < maxAttempts) {
              // Modify prompt for retry with shorter response requirement
              aiPrompt += "\n\nPLEASE RESPOND WITH CONCISE JSON ONLY. Keep descriptions brief to avoid truncation.";
              continue;
            }
          }
        } else {
          console.warn(`Attempt ${attempts}: AI returned non-JSON response`);
          if (attempts < maxAttempts) {
            // Modify prompt for retry
            aiPrompt += "\n\nPLEASE RESPOND WITH VALID JSON ONLY. No explanatory text.";
            continue;
          }
        }
      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    // Parse AI response - handle JSON wrapped in markdown code blocks
    let aiResponse: AIGoalResponse;
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = aiResponseText.trim();
      
      // Handle cases where AI returns plain text instead of JSON
      if (!jsonText.includes('{') && !jsonText.includes('}')) {
        console.error("AI returned plain text instead of JSON:", jsonText.substring(0, 200));
        throw new Error("AI returned plain text instead of JSON format. Please try again.");
      }
      
      // Try to extract JSON from markdown code blocks
      if (jsonText.includes('```json')) {
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim();
        }
      } else if (jsonText.includes('```')) {
        const jsonMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim();
        }
      } else {
        // Try to extract JSON object from mixed content
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0]) {
          jsonText = jsonMatch[0];
        }
      }
      
      // Additional validation before parsing
      if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
        console.error("Extracted text is not valid JSON format:", jsonText.substring(0, 200));
        throw new Error("Could not extract valid JSON from AI response");
      }
      
      const parsed = JSON.parse(jsonText);

      // Validate and normalize the AI response structure
      let normalizedResponse: AIGoalResponse;
      
      // Handle different response formats from AI
      if (parsed.goal && parsed.strategy) {
        // Standard format - ensure target amount is valid
        normalizedResponse = parsed as AIGoalResponse;
        if (normalizedResponse.goal.targetAmount <= 0) {
          // Try to extract from questionnaire answers if AI response has invalid amount
          const targetAmount = extractTargetAmountFromAnswers(questionnaireAnswers);
          normalizedResponse.goal.targetAmount = targetAmount;
        }
        
        // Ensure target date is in the future
        const targetDate = new Date(normalizedResponse.goal.targetDate);
        const minTargetDate = new Date();
        minTargetDate.setDate(minTargetDate.getDate() + 30); // At least 30 days from now
        
        if (targetDate <= minTargetDate) {
          console.warn("AI provided invalid target date, auto-correcting:", normalizedResponse.goal.targetDate);
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          normalizedResponse.goal.targetDate = oneYearFromNow.toISOString().split('T')[0];
          console.log("Auto-corrected target date to:", normalizedResponse.goal.targetDate);
        }
      } else if (parsed.investment_plan_title || parsed.overall_strategy_overview) {
        // Investment-specific format - convert to standard format
        let targetAmount = parseFloat(parsed.client_profile_summary?.initial_investment?.replace(/[$,]/g, '') || '0');
        
        // If target amount is 0 or invalid, extract from questionnaire answers
        if (targetAmount <= 0) {
          targetAmount = extractTargetAmountFromAnswers(questionnaireAnswers);
        }
        
        normalizedResponse = {
          goal: {
            title: parsed.investment_plan_title || "Investment Goal",
            description: parsed.client_profile_summary?.purpose || "Investment planning for major purchase",
            targetAmount: targetAmount,
            targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 year from now
            rationale: parsed.overall_strategy_overview || "AI-generated investment strategy"
          },
          strategy: parsed.overall_strategy_overview || "Investment strategy not provided",
          milestones: parsed.milestone_tracking ? Object.values(parsed.milestone_tracking)
            .filter((phase: any) => phase.target && phase.timeframe)
            .map((phase: any, index: number) => ({
              title: phase.target,
              description: phase.activities ? phase.activities.join('. ') : '',
              type: 'action',
              dueDate: new Date(Date.now() + (index + 1) * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months apart
              priority: index === 0 ? 'critical' : 'high',
              aiRationale: `Phase ${index + 1}: ${phase.timeframe}`
            })) : [],
          insights: parsed.specific_recommendations?.action_items ? 
            parsed.specific_recommendations.action_items.map((item: string, index: number) => ({
              type: 'strategy_insight',
              title: `Action Item ${index + 1}`,
              content: item,
              priority: 'high',
              actionable: true
            })) : [],
          projections: parsed.milestone_tracking?.projected_growth_illustration ? {
            monthlyRequired: parseFloat(parsed.client_profile_summary?.regular_contributions?.replace(/[$,]/g, '') || '0'),
            projectedFinalAmount: parseFloat(parsed.milestone_tracking.projected_growth_illustration.scenario?.[2]?.estimated_portfolio_value?.replace(/[~$,]/g, '') || '0'),
            confidenceLevel: 0.75
          } : null
        };
      } else {
        throw new Error("AI response doesn't match expected format - missing goal/strategy or investment plan structure");
      }

      // Ensure required arrays exist
      normalizedResponse.milestones = normalizedResponse.milestones || [];
      normalizedResponse.insights = normalizedResponse.insights || [];
      normalizedResponse.projections = normalizedResponse.projections || null;

      aiResponse = normalizedResponse;

    } catch (e) {
      console.error("AI Response parsing error:", e);
      console.error("Raw AI response that failed to parse:", aiResponseText);
      
      return new Response(
        JSON.stringify({
          error: "Failed to generate goal plan",
          message: "Our AI had trouble processing your request. Please try again with slightly different answers.",
          details: e instanceof Error ? e.message : "Unknown parsing error",
          debug: {
            aiResponsePreview: aiResponseText.substring(0, 200),
            timestamp: new Date().toISOString(),
          }
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Final validation before database insertion
    console.log('Final normalized response:', JSON.stringify({
      goalTitle: aiResponse.goal.title,
      targetAmount: aiResponse.goal.targetAmount,
      targetDate: aiResponse.goal.targetDate,
      milestoneCount: aiResponse.milestones?.length || 0,
      insightCount: aiResponse.insights?.length || 0
    }, null, 2));
    
    if (aiResponse.goal.targetAmount <= 0) {
      console.error("Invalid target amount after normalization:", aiResponse.goal.targetAmount);
      console.error("Questionnaire answers that led to this:", JSON.stringify(questionnaireAnswers, null, 2));
      return new Response(
        JSON.stringify({ 
          error: "Invalid goal target amount", 
          message: "The goal target amount must be greater than zero. Please check your questionnaire answers and try again.",
          details: `Received target amount: ${aiResponse.goal.targetAmount}`,
          debug: {
            questionnaireAnswers,
            extractedAmount: extractTargetAmountFromAnswers(questionnaireAnswers)
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate target date is in the future
    const targetDate = new Date(aiResponse.goal.targetDate);
    const _today = new Date();
    _today.setHours(0, 0, 0, 0); // Set to start of today for comparison
    
    if (targetDate <= _today) {
      console.error("Invalid target date - must be in the future:", aiResponse.goal.targetDate);
      
      // Auto-fix by setting target date to 1 year from now
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      aiResponse.goal.targetDate = oneYearFromNow.toISOString().split('T')[0];
      
      console.log("Auto-corrected target date to:", aiResponse.goal.targetDate);
    }

    // Create goal in database
    const { data: newGoal, error: goalError } = await supabaseClient
      .from("financial_goals")
      .insert({
        user_id: userId,
        title: aiResponse.goal.title,
        description: aiResponse.goal.description,
        goal_type: goalType,
        target_amount: aiResponse.goal.targetAmount,
        target_date: aiResponse.goal.targetDate,
        ai_questionnaire_data: questionnaireAnswers,
        ai_generated_strategy: aiResponse.strategy,
        ai_generated_milestones: aiResponse.milestones,
      })
      .select()
      .single();

    if (goalError) {
      console.error("Goal creation error:", goalError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create goal in database", 
          details: goalError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Goal created successfully:", newGoal.id);

    // Log the goal creation activity (only for authenticated users)
    if (userId) {
      try {
        await logUserActivity(supabaseClient, userId, {
          type: 'goal',
          action: RewardActions.GOAL_CREATED,
          source: 'ai-goal-generator',
          metadata: {
            goalId: newGoal.id,
            goalTitle: aiResponse.goal.title,
            goalType: goalType,
            targetAmount: aiResponse.goal.targetAmount,
            targetDate: aiResponse.goal.targetDate,
            milestonesCount: aiResponse.milestones?.length || 0,
            hasAiStrategy: !!aiResponse.strategy,
            hasProjections: !!aiResponse.projections,
            questionnaireAnswers: Object.keys(questionnaireAnswers).length
          },
          timestamp: new Date().toISOString()
        });
        console.log('Goal creation activity logged successfully');
      } catch (activityError) {
        console.warn('Failed to log goal creation activity:', activityError);
        // Don't fail the entire operation for activity logging errors
      }
    } else {
      console.log('Skipping activity logging for guest user');
    }

    let newMilestones: any[] | null = [];
    // Create AI-generated milestones
    if (aiResponse.milestones && aiResponse.milestones.length > 0) {
      const milestoneInserts = aiResponse.milestones.map((milestone, index) => ({
        goal_id: newGoal.id,
        title: milestone.title,
        description: milestone.description,
        milestone_type: milestone.type,
        target_amount: milestone.targetAmount || null,
        due_date: milestone.dueDate,
        habit_description: milestone.habitDescription || null,
        frequency: milestone.frequency || null,
        habit_target_value: milestone.habitTargetValue || null,
        is_ai_generated: true,
        display_order: index,
        priority: milestone.priority || 'medium',
      }));

      const { data, error: milestonesError } = await supabaseClient
        .from("goal_milestones")
        .insert(milestoneInserts)
        .select();
      
      newMilestones = data;

      if (milestonesError) {
        console.error("Milestones creation error:", milestonesError);
        // Don't fail the entire operation, just log the error
        console.warn("Continuing without milestones due to creation error");
      } else {
        console.log(`Created ${newMilestones?.length || 0} milestones`);
      }
    }

    // Create AI insights if provided
    if (aiResponse.insights && aiResponse.insights.length > 0) {
      const insightInserts = aiResponse.insights.map((insight) => ({
        goal_id: newGoal.id,
        insight_type: insight.type,
        title: insight.title,
        content: insight.content,
        priority: insight.priority,
        is_ai_generated: true,
        ai_confidence_score: 0.8, // Default confidence for initial insights
      }));

      const { error: insightsError } = await supabaseClient
        .from("goal_insights")
        .insert(insightInserts);

      if (insightsError) {
        console.warn("Failed to create insights:", insightsError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      goal: newGoal,
      milestones: newMilestones || [],
      strategy: aiResponse.strategy,
      insights: aiResponse.insights || [],
      projections: aiResponse.projections || null,
      debug: {
        message: "Goal generated and stored successfully",
        timestamp: new Date().toISOString(),
        goalId: newGoal.id,
        milestonesCreated: newMilestones?.length || 0,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});