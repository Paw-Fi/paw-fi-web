/// <reference path="./types.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { logUserActivity, type ActivityData } from "../shared/activity-logger.ts";
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { formatPromptWithContext, buildContextPrompt } from "./prompt.ts";
import { 
  GOAL_FUNCTIONS_REGISTRY,
  generateNextActions
} from "./function-registry.ts";
import { GoalType } from "../shared/goals-questionnaire-templates.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

interface GoalTrackerRequest {
  message: string;
  userId: string;
  goalContext?: any;
  isGlobalMode?: boolean;
  goalId?: string;
  goal?: any;
  conversationHistory?: ConversationMessage[];
}

interface ConversationMessage {
  role: 'user' | 'model' | 'tool';
  parts: Array<{
    text?: string;
    function_call?: {
      name: string;
      args: any;
    };
    function_response?: {
      name: string;
      response: any;
    };
  }>;
}



async function executeGoalFunction(
  functionName: string, 
  parameters: any, 
  supabase: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log('Executing function:', functionName, parameters);
  
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: parameters
    });
    
    if (error) {
      console.error('Function execution error:', error);
      return {
        success: false,
        error: error.message || 'Function execution failed'
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Function execution exception:', error);
    return {
      success: false,
      error: error.message || 'Unexpected error during execution'
    };
  }
}

// Convert function registry to Gemini function definitions
function getGeminiFunctionDeclarations() {
  return Object.entries(GOAL_FUNCTIONS_REGISTRY).map(([key, func]) => ({
    name: func.function_name,
    description: func.description,
    parameters: {
      type: "object",
      properties: getParameterSchema(key),
      required: getRequiredParameters(key)
    }
  }));
}

function getParameterSchema(functionKey: string) {
  const baseSchema = {
    userId: { type: "string", description: "User ID" },
    isGlobalMode: { type: "boolean", description: "Whether operating in global mode" },
    goalContext: { type: "object", description: "Current goal context data" }
  };

  switch (functionKey) {
    case "update_progress":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Goal ID to update" },
        amountChange: { type: "number", description: "Amount to add (positive) or subtract (negative)" },
        updateType: { type: "string", description: "Type of update: goal_progress_updated or milestone_completed" },
        milestoneId: { type: "string", description: "Milestone ID if completing milestone (optional)" }
      };
    case "adjust_timeline":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Goal ID to adjust" },
        action: { type: "string", description: "Action type: update_timeline" },
        payload: { type: "object", description: "Timeline adjustment data" }
      };
    case "manage_milestones":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Goal ID for milestone" },
        action: { type: "string", description: "Action: create, update, or delete" },
        payload: { type: "object", description: "Milestone data" }
      };
    case "create_goal":
      return {
        ...baseSchema,
        goalType: { 
          type: "string", 
          description: "Type of goal: emergency_fund, retirement, home_buying, wealth, investment, debt_payoff, or custom. Use 'custom' for travel, vacation, car, or other personal goals." 
        },
        questionnaireAnswers: { 
          type: "object", 
          description: "User's financial information including goalName, targetAmount, timeframe, monthlyIncome, monthlyExpenses, currentSavings, riskTolerance, financialPriorities" 
        }
      };
    case "generate_insights":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Goal ID for insights (optional in global mode)" }
      };
    default:
      return baseSchema;
  }
}

function getRequiredParameters(functionKey: string): string[] {
  const baseRequired = ["userId"];
  
  switch (functionKey) {
    case "update_progress":
      return [...baseRequired, "updateType"];
    case "adjust_timeline":
    case "manage_milestones":
      return [...baseRequired, "action"];
    case "generate_insights":
      return [...baseRequired];
    case "create_goal":
      return [...baseRequired, "goalType", "questionnaireAnswers"];
    default:
      return baseRequired;
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
    const { 
      message, 
      userId, 
      goalContext, 
      isGlobalMode, 
      goalId, 
      goal, 
      conversationHistory = []
    }: GoalTrackerRequest = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: message and userId are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing goal tracker message for user: ${userId}, global mode: ${isGlobalMode}`);

    // Get function declarations and log for debugging
    const functionDeclarations = getGeminiFunctionDeclarations();
    console.log('Function declarations:', JSON.stringify(functionDeclarations, null, 2));
    
    // Initialize Gemini model with function calling
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{
        function_declarations: functionDeclarations
      }]
    });

    // Build conversation history for context
    const systemPrompt = formatPromptWithContext(
      goalContext || goal, 
      userId, 
      isGlobalMode || false,
      isGlobalMode ? goalContext : undefined
    );
    
    const contextualMessage = buildContextPrompt(
      message,
      goalContext || goal,
      isGlobalMode || false
    );
    
    // Combine system prompt and contextual message
    const fullPrompt = systemPrompt + "\n\n" + contextualMessage;
    
    const contents = [
      ...conversationHistory,
      {
        role: "user",
        parts: [{ text: fullPrompt }]
      }
    ];

    console.log('Sending to Gemini with contents:');
    console.log('Full prompt preview:', fullPrompt.substring(0, 300) + '...');
    console.log('Full contents:', JSON.stringify(contents, null, 2));
    
    // Generate initial response
    const result = await model.generateContent({ contents });
    const response = result.response;
    
    console.log('Gemini response:', JSON.stringify(response, null, 2));
    
    // Check if AI wants to call a function
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    
    // Handle both function_call and functionCall formats
    const functionCall = part?.function_call || part?.functionCall;
    
    if (functionCall) {
      console.log('Function call detected:', functionCall);
      
      // Add goal context to function arguments if not present
      let functionArgs = {
        ...functionCall.args,
        goalContext: functionCall.args.goalContext || goalContext || goal,
        goalId: functionCall.args.goalId || (goalContext || goal)?.goalId || goalId,
        userId: functionCall.args.userId || userId,
        isGlobalMode: functionCall.args.isGlobalMode !== undefined ? functionCall.args.isGlobalMode : isGlobalMode
      };
      
      // Special handling for goal-progress-tracker
      if (functionCall.name === 'goal-progress-tracker') {
        functionArgs = {
          ...functionArgs,
          updateType: functionArgs.updateType || RewardActions.GOAL_PROGRESS_UPDATED, // Use RewardActions constant
          // Ensure we have required parameters
          goalId: functionArgs.goalId || (isGlobalMode && goalContext?.goalsSummary?.[0]?.id),
        };
      }
      
      // Special handling for ai-goal-generator
      if (functionCall.name === 'ai-goal-generator') {
        // Extract goalType from payload or directly from args
        let goalType = functionArgs.goalType || functionArgs.payload?.goal_type || 'custom';
        
        // Map unsupported goal types to supported ones
        const supportedGoalTypes:GoalType[] = ['emergency_fund', 'retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'custom'];
        if (!supportedGoalTypes.includes(goalType)) {
          console.log(`Mapping unsupported goal type '${goalType}' to 'custom'`);
          goalType = 'custom';
        }
        
        // Extract more comprehensive data from payload
        const payload = functionArgs.payload || {};
        
        // Validate and fix target date
        let targetDate = payload.target_date;
        if (targetDate) {
          const dateObj = new Date(targetDate);
          const minDate = new Date();
          minDate.setDate(minDate.getDate() + 30); // At least 30 days from now
          
          if (isNaN(dateObj.getTime()) || dateObj <= minDate) {
            console.log(`Invalid target date '${targetDate}', using 1 year from now`);
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            targetDate = oneYearFromNow.toISOString().split('T')[0];
          }
        } else {
          // Default to 1 year from now
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          targetDate = oneYearFromNow.toISOString().split('T')[0];
        }
        
        // Create enhanced questionnaire answers using available payload data
        const basicQuestionnaireAnswers = functionArgs.questionnaireAnswers || {
          // Goal-specific information from payload (handle multiple formats) 
          goal_description: payload.goal_name || payload.title || 'New Goal',
          target_amount: payload.target_amount || 10000,
          target_date: targetDate,
          current_savings: payload.current_savings || 0,
          monthly_contribution: payload.monthly_contribution || Math.round((payload.target_amount || 10000) / 12), // Default to 12 months
          
          // General financial defaults (can be improved with user context)
          monthlyIncome: 5000,
          monthlyExpenses: 3500,
          riskTolerance: 'moderate',
          financialPriorities: [goalType === 'custom' ? payload.goal_type || 'travel' : goalType]
        };
        
        // Create the exact structure expected by ai-goal-generator
        functionArgs = {
          userId: functionArgs.userId || userId,
          goalType: goalType,
          questionnaireAnswers: basicQuestionnaireAnswers
        };
        
        // Remove any extra fields that might cause issues
        delete functionArgs.payload;
        delete functionArgs.goalContext;
        delete functionArgs.isGlobalMode;
        delete functionArgs.goalId;
        
        console.log(`Enhanced ai-goal-generator args:`, JSON.stringify({
          goalType,
          originalGoalType: payload.goal_type || 'not provided', 
          payloadKeys: Object.keys(payload),
          questionnaireKeys: Object.keys(basicQuestionnaireAnswers),
          correctedTargetDate: targetDate,
          originalTargetDate: payload.target_date,
          finalStructure: Object.keys(functionArgs)
        }, null, 2));
      }
      
      console.log('Enhanced function args:', JSON.stringify(functionArgs, null, 2));
      
      const functionResult = await executeGoalFunction(
        functionCall.name,
        functionArgs,
        supabaseClient
      );
      
      console.log('Function execution result:', functionResult);
      
      // Add function result to conversation history
      const updatedContents = [
        ...contents,
        {
          role: "tool" as const,
          parts: [{
            function_response: {
              name: functionCall.name,
              response: functionResult
            }
          }]
        }
      ];
      
      // Generate final user-facing response
      const finalResult = await model.generateContent({ contents: updatedContents });
      const finalResponse = finalResult.response;
      const finalText = finalResponse.text();
      
      console.log('Final AI response:', finalText);
      
      return new Response(JSON.stringify({
        response: finalText,
        function_executed: functionCall.name,
        function_result: functionResult,
        next_actions: generateNextActions(functionCall.name, functionResult.data),
        cache_refresh_needed: true, // Always refresh cache when function is executed
        conversation_history: [
          ...conversationHistory,
          {
            role: "user",
            parts: [{ text: message }]
          },
          {
            role: "model", 
            parts: [{ functionCall: functionCall }]
          },
          {
            role: "tool",
            parts: [{
              function_response: {
                name: functionCall.name,
                response: functionResult
              }
            }]
          },
          {
            role: "model",
            parts: [{ text: finalText }]
          }
        ],
        debug: {
          function_call: functionCall,
          function_result: functionResult,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // No function call, just return the text response
      const responseText = response.text();
      
      return new Response(JSON.stringify({
        response: responseText,
        next_actions: ["Keep making progress!", "Let me know how else I can help!"],
        conversation_history: [
          ...conversationHistory,
          {
            role: "user",
            parts: [{ text: message }]
          },
          {
            role: "model",
            parts: [{ text: responseText }]
          }
        ],
        debug: {
          no_function_call: true,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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