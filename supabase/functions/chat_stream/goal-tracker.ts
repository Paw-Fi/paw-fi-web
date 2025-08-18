/**
 * Goal Tracker Integration - Production Ready
 * Simple, robust solution: AI gets all data, AI decides everything
 */

import { formatPromptWithContext, buildContextPrompt } from "./fa-prompt-util.ts";

export interface ExecutionResult {
  success: boolean;
  function_executed?: string;
  data?: any;
  error?: string;
  next_actions?: string[];
}

export interface ConversationMessage {
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

export interface GoalTrackerRequest {
  message: string;
  userId: string;
  goalContext?: any;  // All user goals - AI will decide which one to use
  conversationHistory?: ConversationMessage[];
}

// Function registry with descriptions for AI
export const GOAL_FUNCTIONS_REGISTRY = {
  "update_progress": {
    function_name: "goal-progress-tracker",
    description: "Update goal progress when user mentions adding money, saving amounts, or completing milestones. Use updateType: 'goal_progress_updated' for money changes, 'milestone_completed' for milestone completion."
  },
  "adjust_timeline": {
    function_name: "goal-timeline-manager", 
    description: "Manage timelines, target amounts, status, and priority changes. Handles deadline extensions, target amount adjustments, goal status updates, priority changes, timeline optimization, and feasibility validation."
  },
  "manage_milestones": {
    function_name: "goal-milestone-manager",
    description: "Complete milestone management: create, update, delete, reorder, bulk operations, status changes, priority adjustments, and template generation."
  },
  "generate_insights": {
    function_name: "goal-insights-generator",
    description: "Generate personalized AI insights based on goal progress and patterns. Provides analysis, recommendations, and progress assessment."
  },
  "create_goal": {
    function_name: "ai-goal-generator",
    description: "Create comprehensive new financial goals with AI assistance. Requires goalType and questionnaireAnswers with user's financial information."
  }
};

export function generateNextActions(functionName: string, data: any): string[] {
  switch (functionName) {
    case "goal-progress-tracker":
      return ["Keep up the momentum!", "Set a reminder for your next update", "Check out your updated progress chart"];
    case "goal-milestone-manager":
      return ["Work towards your new milestone", "Share your progress with friends", "Set up milestone reminders"];
    case "goal-timeline-manager":
      return ["Update your monthly savings plan", "Review your progress schedule", "Consider if other goals need adjustment"];
    case "ai-goal-generator":
      return ["Start making your first contribution", "Set up automatic transfers", "Create milestones to track progress"];
    case "goal-insights-generator":
      return ["Review your insights regularly", "Apply the suggested improvements", "Track your progress patterns"];
    default:
      return ["Keep making progress!", "Stay consistent with updates"];
  }
}

export async function executeGoalFunction(
  functionName: string, 
  parameters: any, 
  supabase: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: parameters
    });
    
    if (error) {
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
    return {
      success: false,
      error: error.message || 'Unexpected error during execution'
    };
  }
}

// Convert function registry to Gemini function definitions
export function getGeminiFunctionDeclarations() {
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
    goalContext: { type: "object", description: "All user goals data - AI will select appropriate goal" }
  };

  switch (functionKey) {
    case "update_progress":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Specific goal ID to update" },
        amountChange: { type: "number", description: "Amount to add (positive) or subtract (negative)" },
        updateType: { type: "string", description: "Type: goal_progress_updated or milestone_completed" },
        milestoneId: { type: "string", description: "Milestone ID if completing milestone (optional)" }
      };
    case "adjust_timeline":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Specific goal ID to adjust" },
        action: { type: "string", description: "Action: update_timeline, extend_timeline, adjust_target, change_status, change_priority, optimize_timeline, or validate_timeline" },
        payload: { type: "object", description: "Action data: target_date, target_amount, new_status, new_priority, reason, etc." }
      };
    case "manage_milestones":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Specific goal ID for milestone" },
        action: { type: "string", description: "Action: create, update, delete, reorder, bulk_create, bulk_update, bulk_delete, change_status, change_priority, create_template" },
        payload: { type: "object", description: "Milestone data, bulk operations, status/priority changes, or template parameters" }
      };
    case "create_goal":
      return {
        ...baseSchema,
        goalType: { 
          type: "string", 
          description: "Goal type: emergency_fund, retirement, home_buying, wealth, investment, debt_payoff, or custom" 
        },
        questionnaireAnswers: { 
          type: "object", 
          description: "User's financial information: goalName, targetAmount, timeframe, monthlyIncome, monthlyExpenses, currentSavings, riskTolerance, financialPriorities" 
        }
      };
    case "generate_insights":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Specific goal ID for insights (required)" }
      };
    default:
      return baseSchema;
  }
}

function getRequiredParameters(functionKey: string): string[] {
  const baseRequired = ["userId"];
  
  switch (functionKey) {
    case "update_progress":
      return [...baseRequired, "goalId", "updateType"];
    case "adjust_timeline":
    case "manage_milestones":
      return [...baseRequired, "goalId", "action"];
    case "generate_insights":
      return [...baseRequired, "goalId"];
    case "create_goal":
      return [...baseRequired, "goalType", "questionnaireAnswers"];
    default:
      return baseRequired;
  }
}

export async function processGoalTrackingRequest(
  request: GoalTrackerRequest,
  supabaseClient: any,
  genAI: any
): Promise<{
  response: string;
  function_executed?: string;
  function_result?: any;
  next_actions?: string[];
  cache_refresh_needed?: boolean;
  conversation_history?: ConversationMessage[];
  debug?: any;
}> {
  const { 
    message, 
    userId, 
    goalContext,
    conversationHistory = []
  } = request;


  // Get function declarations for AI
  const functionDeclarations = getGeminiFunctionDeclarations();
  
  // Initialize Gemini model with function calling
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [{
      function_declarations: functionDeclarations
    }]
  });

  // Build complete prompt with context (AI will have ALL information)
  const systemPrompt = formatPromptWithContext(
    goalContext, 
    userId, 
    false, // No global mode - AI always gets all goals
    goalContext
  );
  
  const contextualMessage = buildContextPrompt(
    message,
    goalContext,
    false // No global mode
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


  try {
    // Let AI process everything and decide what to do
    const result = await model.generateContent({ contents });
    const response = result.response;
    
    // Check if AI wants to call a function
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const functionCall = part?.function_call || part?.functionCall;
    
    if (functionCall) {
      // Ensure userId is always included in function parameters
      const enhancedArgs = {
        ...functionCall.args,
        userId: userId // Always inject userId from request context
      };
      
      const functionResult = await executeGoalFunction(
        functionCall.name,
        enhancedArgs,
        supabaseClient
      );
      
      // Add function result to conversation and get final response
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
      
      // Get AI's final response - wrap in try/catch to preserve function execution data
      let finalText = '';
      try {
        const finalResult = await model.generateContent({ contents: updatedContents });
        const finalResponse = finalResult.response;
        finalText = finalResponse.text();
      } catch (aiError) {
        console.error('⚠️ Final AI response generation failed, using fallback:', aiError);
        finalText = ''; // Will trigger fallback below
      }
      
      // Fallback response if AI doesn't provide text or AI call failed
      if (!finalText || finalText.trim().length === 0) {
        
        if (functionResult.success) {
          finalText = `Great! I've successfully completed that action. Your goal has been updated.`;
        } else {
          finalText = `I encountered an issue while processing your request. Please try again or contact support if the problem persists.`;
        }
      }
      
      const newConversationHistory = [
        ...conversationHistory,
        {
          role: "user" as const,
          parts: [{ text: message }]
        },
        {
          role: "model" as const, 
          parts: [{ function_call: functionCall }]
        },
        {
          role: "tool" as const,
          parts: [{
            function_response: {
              name: functionCall.name,
              response: functionResult
            }
          }]
        },
        {
          role: "model" as const,
          parts: [{ text: finalText }]
        }
      ];
      

      return {
        response: finalText,
        function_executed: functionCall.name,
        function_result: functionResult,
        next_actions: generateNextActions(functionCall.name, functionResult.data),
        cache_refresh_needed: true,
        conversation_history: newConversationHistory,
        debug: {
          function_call: functionCall,
          function_result: functionResult,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      // No function call - just return AI's response
      const responseText = response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        const fallbackResponse = "I understand you want to work with your goals. Could you please be more specific about what you'd like to do? For example:\n\n- 'Add $100 to my emergency fund'\n- 'Update the target amount for my vacation goal'\n- 'Show me progress on my retirement savings'\n\nThis will help me assist you more effectively!";
        
        return {
          response: fallbackResponse,
          next_actions: ["Be more specific about your goal", "Try a different request"],
          conversation_history: [
            ...conversationHistory,
            {
              role: "user",
              parts: [{ text: message }]
            },
            {
              role: "model",
              parts: [{ text: fallbackResponse }]
            }
          ],
          debug: {
            no_function_call: true,
            fallback_used: true,
            timestamp: new Date().toISOString()
          }
        };
      }
      
      const normalConversationHistory = [
        ...conversationHistory,
        {
          role: "user" as const,
          parts: [{ text: message }]
        },
        {
          role: "model" as const,
          parts: [{ text: responseText }]
        }
      ];
      
      
      return {
        response: responseText,
        next_actions: ["Keep making progress!", "Let me know how else I can help!"],
        conversation_history: normalConversationHistory,
        debug: {
          no_function_call: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  } catch (error) {
    console.error('❌ Error in goal tracking:', error);
    return {
      response: "I encountered an error while processing your request. Please try again.",
      debug: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}