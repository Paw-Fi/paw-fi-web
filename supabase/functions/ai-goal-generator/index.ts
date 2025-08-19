// AI Goal Generator - BULLETPROOF VERSION
// Completely rewritten for 100% reliability without retry logic

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { logUserActivity } from "../shared/activity-logger.ts";
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { getQuestionnaireTemplate } from "../shared/goals-questionnaire-templates.ts";
import { transformAdvisorMessages } from "../shared/advisor-message-transformer.ts";

// Import rewritten modules
import { goalGeneratorTool, type AIGoalResponse } from "./schema.ts";
import { validateComplete } from "./validation.ts";
import { normalizeAIResponse } from "./normalization.ts";
import { validateBusinessLogic } from "./business-validation.ts";
import { 
  generatePrecisePrompt, 
  getGoalContext,
  validatePromptInputs
} from "./prompts.ts";
import { monitor, createOperationTimer, logPerformanceMetric } from "./monitoring.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  throw new Error("CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

interface QuestionnaireAnswers {
  [key: string]: string | number | boolean | string[];
}

// Generate AI response - SINGLE ATTEMPT, MUST SUCCEED
async function generateAIResponse(
  goalType: string,
  questionnaireAnswers: QuestionnaireAnswers,
  operationId: string
): Promise<AIGoalResponse> {
  console.log("🤖 Generating AI response with bulletproof schema...");
  const aiTimer = createOperationTimer();

  // Pre-validate inputs
  const inputValidation = validatePromptInputs(goalType, questionnaireAnswers);
  if (!inputValidation.isValid) {
    throw new Error(`Input validation failed: ${inputValidation.errors.join(', ')}`);
  }

  // Initialize model with strict function calling
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    tools: [goalGeneratorTool],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistency
    }
  });

  // Generate precise prompt
  const prompt = generatePrecisePrompt(goalType, questionnaireAnswers);
  const contextualPrompt = `${getGoalContext(goalType)}\n\n${prompt}`;

  console.log("📝 Sending request to Gemini AI...");

  try {
    const result = await model.generateContent(contextualPrompt);
    const response = result.response;

    // Extract function call result
    const functionCalls = response.functionCalls();
    
    if (!functionCalls || functionCalls.length === 0) {
      const responseText = response.text();
      console.error("❌ AI did not use function calling. Response:", responseText?.substring(0, 200));
      throw new Error("AI failed to use required function calling format");
    }

    const functionCall = functionCalls[0];
    
    if (functionCall.name !== "generate_complete_financial_plan") {
      throw new Error(`AI used wrong function: ${functionCall.name}`);
    }

    console.log("✅ AI used correct function calling format");
    
    // Extract structured data
    let aiResponse = functionCall.args as AIGoalResponse;
    
    // Track AI generation metrics
    const responseText = JSON.stringify(aiResponse);
    monitor.trackAIGeneration(operationId, {
      responseTime: aiTimer.elapsed(),
      functionCallUsed: true,
      responseSize: responseText.length,
      tokenEstimate: Math.ceil(responseText.length / 4) // Rough token estimate
    });

    console.log("🔧 Normalizing AI response to handle edge cases...");
    const normalizationTimer = createOperationTimer();
    
    // STEP 1: Comprehensive normalization - fixes common AI issues
    let normalizationIssues = 0;
    try {
      const originalResponse = JSON.stringify(aiResponse);
      aiResponse = normalizeAIResponse(aiResponse, goalType, questionnaireAnswers);
      const normalizedResponse = JSON.stringify(aiResponse);
      normalizationIssues = originalResponse !== normalizedResponse ? 1 : 0;
    } catch (error) {
      normalizationIssues = 1;
      throw error;
    }
    const normalizationTime = normalizationTimer.elapsed();
    
    console.log("🔍 Validating business logic and financial realism...");
    const businessTimer = createOperationTimer();
    
    // STEP 2: Business logic validation - ensures realistic scenarios
    const businessValidation = validateBusinessLogic(aiResponse, goalType, questionnaireAnswers);
    if (!businessValidation.isValid) {
      console.error("❌ Business logic validation failed:", businessValidation.errors);
      throw new Error(`Business validation failed: ${businessValidation.errors.join(', ')}`);
    }
    
    // Log warnings and adjustments for monitoring
    if (businessValidation.warnings.length > 0) {
      console.warn("⚠️ Business validation warnings:", businessValidation.warnings);
    }
    if (businessValidation.adjustments.length > 0) {
      console.log("💡 Suggested adjustments:", businessValidation.adjustments);
    }
    const businessValidationTime = businessTimer.elapsed();
    
    console.log("✅ Performing final structural validation...");
    const structuralTimer = createOperationTimer();
    
    // STEP 3: Final structural validation - ensures database compatibility
    const structuralValidation = validateComplete(aiResponse);
    if (!structuralValidation.isValid) {
      console.error("❌ Structural validation failed:", structuralValidation.errors);
      throw new Error(`Structural validation failed: ${structuralValidation.errors.join(', ')}`);
    }
    const structuralValidationTime = structuralTimer.elapsed();

    // Track validation metrics
    monitor.trackValidation(operationId, {
      normalizationTime,
      businessValidationTime,
      structuralValidationTime,
      normalizationIssues,
      businessWarnings: businessValidation.warnings.length,
      structuralErrors: structuralValidation.errors.length
    });

    console.log("✅ All validations passed successfully");
    console.log("📊 Final response structure:", {
      goalTitle: aiResponse.goal.title,
      targetAmount: aiResponse.goal.targetAmount,
      targetDate: aiResponse.goal.targetDate,
      milestoneCount: aiResponse.milestones?.length || 0,
      insightCount: aiResponse.insights?.length || 0,
      hasAdvisorMessages: !!aiResponse.advisorMessages,
      hasFinancialProfile: !!aiResponse.financialProfile,
      businessWarnings: businessValidation.warnings.length,
      suggestedAdjustments: businessValidation.adjustments.length
    });

    return aiResponse;

  } catch (error) {
    console.error("💥 AI generation failed:", error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Store data to BOTH tables in single transaction
async function storeCompleteFinancialPlan(
  userId: string | null,
  goalType: string,
  aiResponse: AIGoalResponse,
  questionnaireAnswers: QuestionnaireAnswers,
  operationId: string
): Promise<{ goal: any; milestones: any[]; profile: any; advisorMessages: any }> {
  console.log("💾 Storing complete financial plan to database...");
  const dbTimer = createOperationTimer();

  try {
    // 1. Create financial health profile first
    console.log("📋 Creating financial health profile...");
    const profileTimer = createOperationTimer();
    
    const { data: profileData, error: profileError } = await supabaseClient
      .from("financial_health_profiles")
      .insert({
        user_id: userId,
        profile_description: aiResponse.financialProfile.profileDescription,
        quiz_answers: questionnaireAnswers,
        profile_data: aiResponse.financialProfile.profileData,
      })
      .select()
      .single();

    if (profileError) {
      console.error("❌ Failed to create financial health profile:", profileError);
      throw new Error(`Failed to create financial health profile: ${profileError.message}`);
    }
    const profileCreationTime = profileTimer.elapsed();

    console.log("✅ Financial health profile created:", profileData.id);

    // 2. Create financial goal
    console.log("🎯 Creating financial goal...");
    const goalTimer = createOperationTimer();
    
    const { data: goalData, error: goalError } = await supabaseClient
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
        ai_advisor_messages: aiResponse.advisorMessages,
      })
      .select()
      .single();

    if (goalError) {
      // Rollback profile creation
      console.error("❌ Failed to create goal, rolling back profile...");
      await supabaseClient.from("financial_health_profiles").delete().eq("id", profileData.id);
      throw new Error(`Failed to create financial goal: ${goalError.message}`);
    }
    const goalCreationTime = goalTimer.elapsed();

    console.log("✅ Financial goal created:", goalData.id);

    // 3. Create milestones
    console.log("🏃 Creating milestones...");
    const milestonesTimer = createOperationTimer();
    
    let milestonesData: any[] = [];
    
    if (aiResponse.milestones && aiResponse.milestones.length > 0) {
      const milestoneInserts = aiResponse.milestones.map((milestone, index) => ({
        goal_id: goalData.id,
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

      const { data: milestonesResult, error: milestonesError } = await supabaseClient
        .from("goal_milestones")
        .insert(milestoneInserts)
        .select();

      if (milestonesError) {
        // Rollback everything
        console.error("❌ Failed to create milestones, rolling back...");
        await supabaseClient.from("financial_goals").delete().eq("id", goalData.id);
        await supabaseClient.from("financial_health_profiles").delete().eq("id", profileData.id);
        throw new Error(`Failed to create milestones: ${milestonesError.message}`);
      }

      milestonesData = milestonesResult || [];
      console.log(`✅ Created ${milestonesData.length} milestones`);
    }
    const milestonesCreationTime = milestonesTimer.elapsed();

    // 4. Create insights
    console.log("💡 Creating insights...");
    const insightsTimer = createOperationTimer();
    
    if (aiResponse.insights && aiResponse.insights.length > 0) {
      const insightInserts = aiResponse.insights.map((insight) => ({
        goal_id: goalData.id,
        insight_type: insight.type,
        title: insight.title,
        content: insight.content,
        priority: insight.priority,
        is_ai_generated: true,
        ai_confidence_score: 0.8,
      }));

      const { error: insightsError } = await supabaseClient
        .from("goal_insights")
        .insert(insightInserts);

      if (insightsError) {
        // Rollback everything
        console.error("❌ Failed to create insights, rolling back...");
        await supabaseClient.from("goal_milestones").delete().eq("goal_id", goalData.id);
        await supabaseClient.from("financial_goals").delete().eq("id", goalData.id);
        await supabaseClient.from("financial_health_profiles").delete().eq("id", profileData.id);
        throw new Error(`Failed to create insights: ${insightsError.message}`);
      }

      console.log(`✅ Created ${aiResponse.insights.length} insights`);
    }
    const insightsCreationTime = insightsTimer.elapsed();

    // Track database metrics
    monitor.trackDatabase(operationId, {
      profileCreationTime,
      goalCreationTime,
      milestonesCreationTime,
      insightsCreationTime
    });

    // 5. Log user activity (for authenticated users only)
    if (userId) {
      try {
        await logUserActivity(supabaseClient, userId, {
          type: 'goal',
          action: RewardActions.GOAL_CREATED,
          source: 'ai-goal-generator',
          metadata: {
            goalId: goalData.id,
            profileId: profileData.id,
            goalTitle: aiResponse.goal.title,
            goalType: goalType,
            targetAmount: aiResponse.goal.targetAmount,
            targetDate: aiResponse.goal.targetDate,
            milestonesCount: milestonesData.length,
          },
          timestamp: new Date().toISOString()
        });
        console.log('✅ User activity logged successfully');
      } catch (activityError) {
        console.warn('⚠️ Failed to log user activity (non-critical):', activityError);
      }
    }

    // Transform advisor messages for frontend
    const transformedAdvisorMessages = transformAdvisorMessages(aiResponse.advisorMessages);

    console.log("🎉 Complete financial plan stored successfully!");

    return {
      goal: goalData,
      milestones: milestonesData,
      profile: profileData,
      advisorMessages: transformedAdvisorMessages
    };

  } catch (error) {
    console.error("💥 Database operation failed:", error);
    throw error;
  }
}

// Main handler
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Health check endpoint
  if (req.method === "GET") {
    const health = monitor.getSystemHealth();
    return new Response(JSON.stringify({
      service: "ai-goal-generator",
      version: "bulletproof-v2.0",
      status: "operational",
      health: health,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Declare variables outside try block for error logging
  let userId: string | null = null;
  let goalType: string = 'unknown';
  let questionnaireAnswers: QuestionnaireAnswers = {};
  let operationId: string | null = null;

  try {
    const body = await req.json();
    const requestData: {
      userId?: string | null;
      goalType: string;
      questionnaireAnswers: QuestionnaireAnswers;
    } = body;
    
    userId = requestData.userId || null;
    goalType = requestData.goalType;
    questionnaireAnswers = requestData.questionnaireAnswers;

    // Validate required fields
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

    console.log(`🚀 Processing AI goal generation for user: ${userId || 'guest'}, goal type: ${goalType}`);

    // Start operation monitoring
    operationId = monitor.startOperation(goalType, userId);

    // Get questionnaire template
    const template = getQuestionnaireTemplate(goalType as any);
    if (!template) {
      console.error(`❌ No template found for goal type: ${goalType}`);
      monitor.failOperation(operationId, 'template', `No active questionnaire template found for goal type: ${goalType}`);
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

    console.log(`📋 Using template for goal type: ${goalType}`);

    // Generate AI response (SINGLE ATTEMPT - MUST SUCCEED)
    const aiResponse = await generateAIResponse(goalType, questionnaireAnswers, operationId);

    // Store complete plan to both tables
    const result = await storeCompleteFinancialPlan(userId, goalType, aiResponse, questionnaireAnswers, operationId);

    // Track business metrics
    monitor.trackBusinessMetrics(operationId, {
      targetAmount: result.goal.target_amount,
      monthsToGoal: Math.round((new Date(result.goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)),
      monthlyRequired: aiResponse.projections.monthlyRequired,
      milestonesCount: result.milestones.length,
      insightsCount: aiResponse.insights?.length || 0
    });

    // Complete operation monitoring
    monitor.completeOperation(operationId);

    // Success response
    console.log("🎉 OPERATION SUCCESS - Goal generation completed successfully", {
      operationId,
      goalId: result.goal.id,
      profileId: result.profile.id,
      goalType: goalType,
      userId: userId || 'guest',
      targetAmount: result.goal.target_amount,
      timeline: result.goal.target_date,
      milestonesCount: result.milestones.length,
      version: "bulletproof-v2.0"
    });

    return new Response(JSON.stringify({
      success: true,
      goal: result.goal,
      milestones: result.milestones,
      profile: result.profile,
      strategy: aiResponse.strategy,
      insights: aiResponse.insights || [],
      projections: aiResponse.projections || null,
      advisorMessages: result.advisorMessages,
      message: `🎉 Great! I've created your **${result.goal.title}** goal with a target of $${result.goal.target_amount.toLocaleString()} by ${new Date(result.goal.target_date).toLocaleDateString()}. I've also generated ${result.milestones.length} milestones and your complete financial profile to help you stay on track.\\n\\n\`\`GOAL:${result.goal.id}\`\``,
      debugInfo: {
        message: "Complete financial plan generated and stored successfully",
        timestamp: new Date().toISOString(),
        goalId: result.goal.id,
        profileId: result.profile.id,
        milestonesCreated: result.milestones.length,
        version: "bulletproof-v2.0"
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    
    // Determine error type and appropriate status code
    let statusCode = 500;
    let errorType = "Internal Server Error";
    let errorCategory = "unknown";

    if (errorMessage.includes("validation failed") || errorMessage.includes("Input validation")) {
      statusCode = 400;
      errorType = "Validation Error";
      errorCategory = "validation";
    } else if (errorMessage.includes("Business validation failed")) {
      statusCode = 422;
      errorType = "Business Logic Error";
      errorCategory = "business_logic";
    } else if (errorMessage.includes("AI failed") || errorMessage.includes("function calling")) {
      statusCode = 422;
      errorType = "AI Generation Error";
      errorCategory = "ai_generation";
    } else if (errorMessage.includes("template found")) {
      statusCode = 404;
      errorType = "Template Not Found";
      errorCategory = "template";
    } else if (errorMessage.includes("database") || errorMessage.includes("Failed to create")) {
      statusCode = 500;
      errorType = "Database Error";
      errorCategory = "database";
    }

    // Fail operation monitoring if started
    if (operationId) {
      monitor.failOperation(operationId, errorCategory, errorMessage);
    }

    // Comprehensive error logging for monitoring
    console.error("🚨 OPERATION FAILURE - Goal generation failed", {
      operationId: operationId || 'not_started',
      errorType: errorType,
      errorCategory: errorCategory,
      errorMessage: errorMessage,
      goalType: goalType || 'unknown',
      userId: userId || 'guest',
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      version: "bulletproof-v2.0"
    });
    
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }

    return new Response(
      JSON.stringify({ 
        error: errorType,
        message: errorMessage,
        category: errorCategory,
        timestamp: new Date().toISOString(),
        version: "bulletproof-v2.0"
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});