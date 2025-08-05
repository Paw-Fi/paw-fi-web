import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { logUserActivity, type ActivityData } from "../shared/activity-logger.ts";
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { formatPromptWithContext, buildContextPrompt, GOAL_TRACKER_PROMPT } from "./prompt.ts";
import { 
  parseUserIntent, 
  generateNextActions,
  type ExecutionPlan,
  type ExecutionResult 
} from "./function-registry.ts";

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
  context?: 'proactive_checkin' | 'user_initiated' | 'milestone_reminder';
}



async function executeFunction(plan: ExecutionPlan, supabase: any): Promise<ExecutionResult> {
  console.log('Executing function:', plan.function_name, plan.parameters);
  
  try {
    const { data, error } = await supabase.functions.invoke(plan.function_name, {
      body: plan.parameters
    });
    
    if (error) {
      console.error('Function execution error:', error);
      return {
        success: false,
        error: error.message || 'Function execution failed',
        function_executed: plan.function_name
      };
    }
    
    return {
      success: true,
      data,
      function_executed: plan.function_name,
      next_actions: generateNextActions(plan.function_name, data)
    };
  } catch (error) {
    console.error('Function execution exception:', error);
    return {
      success: false,
      error: error.message || 'Unexpected error during execution',
      function_executed: plan.function_name
    };
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
    const { message, userId, goalContext, isGlobalMode, goalId, goal, context }: GoalTrackerRequest = await req.json();

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

    // Parse user intent to determine if any functions should be executed
    const executionPlan = await parseUserIntent(message, goalContext || goal, userId, isGlobalMode || false);
    let executionResult: ExecutionResult | null = null;

    // Execute function if intent was detected and doesn't require confirmation
    if (executionPlan && !executionPlan.requires_confirmation) {
      executionResult = await executeFunction(executionPlan, supabaseClient);
    }

    // Generate AI response using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const generationConfig = {
      responseMimeType: "application/json",
      maxOutputTokens: 1000,
      temperature: 0.7,
    };

    const aiPrompt = formatPromptWithContext(
      goalContext || goal, 
      userId, 
      isGlobalMode || false,
      isGlobalMode ? goalContext : undefined
    );

    const contextPrompt = buildContextPrompt(
      message,
      executionPlan,
      executionResult,
      goalContext || goal,
      isGlobalMode || false
    );

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: aiPrompt + "\n\n" + contextPrompt }] }],
    }, generationConfig);

    const aiResponseText = result.response.text();
    console.log("AI response received:", aiResponseText);

    let aiResponse;
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonText = aiResponseText;
      
      // Check if response is wrapped in markdown code blocks
      const jsonMatch = aiResponseText.match(/```json\s*\n([\s\S]*?)\n\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log("Extracted JSON from markdown:", jsonText);
      }
      
      aiResponse = JSON.parse(jsonText);
      
      // Ensure we have a valid response structure
      if (!aiResponse.response && !aiResponse.message) {
        throw new Error("Invalid response structure: missing response/message field");
      }
      
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Raw AI response:", aiResponseText);
      
      // Extract any meaningful text from the response
      let cleanText = aiResponseText;
      
      // Try to extract JSON content even if it's malformed
      const jsonMatch = aiResponseText.match(/```json\s*\n([\s\S]*?)\n\s*```/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[1]);
          if (extractedJson.response || extractedJson.message) {
            aiResponse = {
              response: extractedJson.response || extractedJson.message,
              next_actions: extractedJson.next_actions || ["Keep making progress!", "Let me know how else I can help!"]
            };
          }
        } catch (innerError) {
          console.error("Failed to parse extracted JSON:", innerError);
        }
      }
      
      // Final fallback to simple text response
      if (!aiResponse) {
        // Remove markdown formatting and use clean text
        cleanText = aiResponseText
          .replace(/```json\s*\n/g, '')
          .replace(/\n\s*```/g, '')
          .replace(/^[\s\n]+|[\s\n]+$/g, '')
          .trim();
          
        aiResponse = {
          response: cleanText || "I'm here to help with your goal! Could you tell me more about what you'd like to do?",
          next_actions: ["Keep making progress!", "Let me know how else I can help!"]
        };
      }
    }

    // Log the interaction activity
    if (userId) {
      const activityData: ActivityData = {
        type: 'goal_interaction',
        action: RewardActions.GOAL_INTERACTION,
        source: 'goal-tracker-ai',
        metadata: {
          goalId: goalId,
          goalTitle: (goalContext || goal)?.title || (goalContext || goal)?.goalTitle,
          message: message.substring(0, 100), // Truncate for privacy
          functionExecuted: executionResult?.function_executed,
          executionSuccess: executionResult?.success,
          isGlobalMode: isGlobalMode || false,
          context
        },
        timestamp: new Date().toISOString()
      };
      
      logUserActivity(supabaseClient, userId, activityData).catch(error => {
        console.error('Failed to log goal tracker activity:', error);
      });
    }

    return new Response(JSON.stringify({
      response: aiResponse.response || aiResponse.message || "I'm here to help with your goals!",
      execution_result: executionResult,
      function_executed: executionResult?.function_executed,
      next_actions: aiResponse.next_actions || generateNextActions(executionResult?.function_executed || '', executionResult?.data),
      debug: {
        execution_plan: executionPlan,
        execution_result: executionResult,
        timestamp: new Date().toISOString()
      }
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