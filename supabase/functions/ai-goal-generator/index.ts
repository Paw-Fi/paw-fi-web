import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { logUserActivity } from "../shared/activity-logger.ts";
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { getQuestionnaireTemplate } from "../shared/goals-questionnaire-templates.ts";
import { transformAdvisorMessages } from "../shared/advisor-message-transformer.ts";

// Import separated modules
import { goalGeneratorTool, type AIGoalResponse } from "./schema.ts";
import { validateAndNormalizeResponse, validateFinalResponse } from "./validation.ts";
import { 
  enhancePromptForStructuredOutput, 
  addRetryInstructions, 
  generateContextPrompt 
} from "./prompts.ts";

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

// Types for better type safety
interface QuestionnaireAnswers {
  [key: string]: string | number | boolean;
}

// Generate AI response using structured function calling
async function generateStructuredAIResponse(
  goalType: string,
  basePrompt: string,
  questionnaireAnswers: QuestionnaireAnswers
): Promise<AIGoalResponse> {
  console.log("Sending request to Gemini AI with structured output...");

  // Initialize model with the tool schema for structured output
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    tools: [goalGeneratorTool],
    // Force the model to use function calling
    generationConfig: {
      temperature: 0.1, // Lower temperature for more consistent function calling
    }
  });

  // Enhance the prompt with structured output instructions
  let aiPrompt = enhancePromptForStructuredOutput(basePrompt, questionnaireAnswers);
  
  // Add contextual instructions based on goal type
  const contextPrompt = generateContextPrompt(goalType, questionnaireAnswers);
  aiPrompt = contextPrompt + "\n\n" + aiPrompt;

  let aiResponse: AIGoalResponse | null = null;
  const maxAttempts = 2;

  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    try {
      console.log(`Attempt ${attempts}: Generating structured response...`);
      
      const result = await model.generateContent(aiPrompt);
      const response = result.response;

      // Get the structured data from function calls
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0];
        
        if (functionCall.name === "generate_financial_goal") {
          console.log("✅ Received structured AI response");
          
          // Extract the structured data
          const structuredData = functionCall.args as AIGoalResponse;
          
          // Log advisor messages details
          if (structuredData.advisorMessages) {
            console.log('✅ Advisor messages found in AI response:', {
              hasPlanMessage: !!structuredData.advisorMessages.planMessage,
              hasInsightsMessage: !!structuredData.advisorMessages.insightsMessage,
              hasNextStepsMessage: !!structuredData.advisorMessages.nextStepsMessage,
              planMessage: structuredData.advisorMessages.planMessage || 'MISSING',
              insightsMessage: structuredData.advisorMessages.insightsMessage || 'MISSING',
              nextStepsMessage: structuredData.advisorMessages.nextStepsMessage || 'MISSING'
            });
          } else {
            console.error('❌ NO ADVISOR MESSAGES found in AI response!');
          }
          
          // Validate and normalize the response
          aiResponse = await validateAndNormalizeResponse(structuredData, questionnaireAnswers);
          
          // Log advisor messages after validation
          if (aiResponse.advisorMessages) {
            console.log('✅ Advisor messages after validation:', {
              hasPlanMessage: !!aiResponse.advisorMessages.planMessage,
              hasInsightsMessage: !!aiResponse.advisorMessages.insightsMessage,
              hasNextStepsMessage: !!aiResponse.advisorMessages.nextStepsMessage,
            });
          } else {
            console.error('❌ NO ADVISOR MESSAGES after validation!');
          }
          
          console.log('Structured response validation successful:', {
            goalTitle: aiResponse.goal.title,
            targetAmount: aiResponse.goal.targetAmount,
            targetDate: aiResponse.goal.targetDate,
            milestoneCount: aiResponse.milestones?.length || 0,
            insightCount: aiResponse.insights?.length || 0,
            hasAdvisorMessages: !!aiResponse.advisorMessages
          });
          
          break; // Success, exit retry loop
        } else {
          throw new Error(`Unexpected function call: ${functionCall.name}`);
        }
      } else {
        console.warn(`Attempt ${attempts}: AI did not return a function call`);
        
        // Get and log the actual response to understand what AI returned
        const responseText = response.text();
        console.log("Full AI response text:", responseText);
        console.log("Response candidates:", response.candidates());
        
        // Check if AI returned any content at all
        if (!responseText || responseText.trim().length === 0) {
          console.error("AI returned empty response");
        }
        
        if (attempts < maxAttempts) {
          console.log(`Retrying with stronger function calling instructions...`);
          aiPrompt = addRetryInstructions(aiPrompt, attempts);
          continue;
        } else {
          throw new Error(`AI failed to use function calling for structured output after ${maxAttempts} attempts. Last response: ${responseText?.substring(0, 200)}...`);
        }
      }
    } catch (error) {
      console.error(`Attempt ${attempts} failed:`, error);
      if (attempts >= maxAttempts) {
        throw error;
      }
      // Add more specific instructions for retry
      aiPrompt = addRetryInstructions(aiPrompt, attempts);
    }
  }

  if (!aiResponse) {
    throw new Error("Failed to generate structured AI response after all attempts");
  }

  return aiResponse;
}

// Create goal and related entities in database with transaction
async function createGoalInDatabase(
  userId: string | null,
  goalType: string,
  aiResponse: AIGoalResponse,
  questionnaireAnswers: QuestionnaireAnswers
) {
  // Use a transaction-like approach with error handling
  let newGoal;
  let newMilestones: any[] = [];
  
  try {
    // Log what we're trying to insert for advisor messages
    console.log('📝 Inserting goal with advisor messages:', {
      hasAdvisorMessages: !!aiResponse.advisorMessages,
      advisorMessages: aiResponse.advisorMessages || 'NULL',
      advisorMessagesStringified: JSON.stringify(aiResponse.advisorMessages || null, null, 2)
    });
    
    // Create goal in database
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
        ai_advisor_messages: aiResponse.advisorMessages || null,
      })
      .select()
      .single();

    if (goalError) {
      console.error("Goal creation error:", goalError);
      throw new Error(`Failed to create goal in database: ${goalError.message}`);
    }

    newGoal = goalData;
    console.log("Goal created successfully:", newGoal.id);
    
    // Verify advisor messages were stored
    console.log('✅ Goal stored with advisor messages:', {
      goalId: newGoal.id,
      storedAdvisorMessages: newGoal.ai_advisor_messages,
      hasStoredAdvisorMessages: !!newGoal.ai_advisor_messages,
      advisorMessagesType: typeof newGoal.ai_advisor_messages
    });

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
      
      if (milestonesError) {
        // Rollback goal creation on milestone failure
        await supabaseClient.from("financial_goals").delete().eq("id", newGoal.id);
        throw new Error(`Failed to create milestones: ${milestonesError.message}`);
      }
      
      newMilestones = data || [];
      console.log(`Created ${newMilestones.length} milestones`);
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
        // Rollback goal and milestones on insights failure
        await supabaseClient.from("goal_milestones").delete().eq("goal_id", newGoal.id);
        await supabaseClient.from("financial_goals").delete().eq("id", newGoal.id);
        throw new Error(`Failed to create insights: ${insightsError.message}`);
      }
    }

    // Transform advisor messages from backend format (content) to frontend format (message)
    let transformedAdvisorMessages = null;
    
    // First try to transform from AI response
    if (aiResponse.advisorMessages) {
      transformedAdvisorMessages = transformAdvisorMessages(aiResponse.advisorMessages);
    } 
    // Fallback to stored database messages if AI response doesn't have them
    else if (newGoal.ai_advisor_messages) {
      console.log('🔄 Using stored database advisor messages as fallback');
      transformedAdvisorMessages = transformAdvisorMessages(newGoal.ai_advisor_messages);
    }

    return {
      goal: newGoal,
      milestones: newMilestones,
      strategy: aiResponse.strategy,
      insights: aiResponse.insights || [],
      projections: aiResponse.projections || null,
      advisorMessages: transformedAdvisorMessages
    };
  } catch (error) {
    // Rollback any created data on error
    if (newGoal?.id) {
      try {
        await supabaseClient.from("goal_milestones").delete().eq("goal_id", newGoal.id);
        await supabaseClient.from("goal_insights").delete().eq("goal_id", newGoal.id);
        await supabaseClient.from("financial_goals").delete().eq("id", newGoal.id);
        console.log("Rolled back goal creation due to error");
      } catch (rollbackError) {
        console.error("Failed to rollback goal creation:", rollbackError);
      }
    }
    throw error;
  }
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
    const body = await req.json();
    const { userId = null, goalType, questionnaireAnswers }: {
      userId?: string | null;
      goalType: string;
      questionnaireAnswers: QuestionnaireAnswers;
    } = body;

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

    // Generate AI response using structured function calling with timeout
    const aiResponse = await Promise.race([
      generateStructuredAIResponse(
        goalType,
        template.ai_prompt_template,
        questionnaireAnswers
      ),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('AI generation timeout after 60 seconds')), 60000)
      )
    ]);

    // Final validation before database insertion
    const validation = validateFinalResponse(aiResponse);
    if (!validation.isValid) {
      console.error("Final validation failed:", validation.errors);
      return new Response(
        JSON.stringify({ 
          error: "Generated goal failed validation", 
          message: "The AI-generated goal contains invalid data. Please try again.",
          details: validation.errors.join(', ')
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Final normalized response:', JSON.stringify({
      goalTitle: aiResponse.goal.title,
      targetAmount: aiResponse.goal.targetAmount,
      targetDate: aiResponse.goal.targetDate,
      milestoneCount: aiResponse.milestones?.length || 0,
      insightCount: aiResponse.insights?.length || 0
    }, null, 2));

    // Create goal and related entities in database
    const result = await createGoalInDatabase(userId, goalType, aiResponse, questionnaireAnswers);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      message: `🎉 Great! I've created your **${result.goal.title}** goal with a target of $${result.goal.target_amount.toLocaleString()} by ${new Date(result.goal.target_date).toLocaleDateString()}. I've also generated ${result.milestones.length} milestones to help you stay on track.\n\n\`\`GOAL:${result.goal.id}\`\``,
      debug: {
        message: "Goal generated and stored successfully",
        timestamp: new Date().toISOString(),
        goalId: result.goal.id,
        milestonesCreated: result.milestones.length,
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
    
    // Check if this is an AI generation error
    if (errorMessage.includes("function calling") || errorMessage.includes("structured output")) {
      return new Response(
        JSON.stringify({ 
          error: "AI Generation Failed", 
          message: "Our AI had trouble generating a structured response. Please try again.",
          details: errorMessage,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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