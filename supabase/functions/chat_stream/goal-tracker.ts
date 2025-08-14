/**
 * Goal Tracker Integration - Migrated from goal-tracker-ai
 * Handles function calling and execution for goal tracking capabilities
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { formatPromptWithContext, buildContextPrompt } from "./fa-prompt.ts";
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { GoalType } from "../shared/goals-questionnaire-templates.ts";

export interface ExecutionPlan {
  function_name: string;
  parameters: any;
  confidence: number;
  requires_confirmation: boolean;
  natural_language_summary: string;
  extracted_entities: {
    amounts?: number[];
    dates?: string[];
    milestones?: string[];
    goals?: string[];
  };
}

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
  goalContext?: any;
  isGlobalMode?: boolean;
  goalId?: string;
  goal?: any;
  conversationHistory?: ConversationMessage[];
}

// Function registry with natural language patterns
export const GOAL_FUNCTIONS_REGISTRY = {
  "update_progress": {
    function_name: "goal-progress-tracker",
    patterns: [
      /(?:saved?|add(?:ed)?|put in|deposit(?:ed)?|contributed?)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:spent|took out|withdrew?|removed?)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:from|out of)/i,
      /(?:mark|complete|finish)(?:ed)?\s+(?:my\s+)?(.+?)\s+(?:milestone|step)/i,
    ],
    description: "ALWAYS use when user mentions money amounts like 'add $100', 'saved $50', 'put in $200'. Use updateType: 'goal_progress_updated' for amount changes. For milestone completion, use updateType: 'milestone_completed'."
  },
  "adjust_timeline": {
    function_name: "goal-timeline-manager", 
    patterns: [
      /(?:extend|push back|move)\s+(?:my\s+)?(?:deadline|target date|timeline)\s+(?:by\s+|to\s+)(.+)/i,
      /(?:need|want)\s+(?:more\s+time|\d+\s+more\s+(?:days|weeks|months))/i,
      /change\s+(?:my\s+)?(?:goal\s+)?(?:deadline|target date)\s+to\s+(.+)/i,
      /(?:update|change|modify|set)\s+(?:the\s+)?goal\s+.+?\s+(?:with\s+amount\s+to|target\s+to|amount\s+to)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:change|update|modify|set)\s+(?:the\s+)?(?:target\s+)?amount\s+(?:of|for|to)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:increase|decrease|adjust)\s+(?:the\s+)?target\s+(?:amount\s+)?(?:to\s+)?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:change|update|set)\s+goal\s+status\s+to\s+(active|paused|completed|cancelled)/i,
      /(?:mark|set)\s+goal\s+(?:as\s+)?(active|paused|completed|cancelled)/i,
      /(?:change|update|set)\s+goal\s+priority\s+to\s+(low|medium|high|critical)/i,
      /(?:optimize|improve)\s+(?:my\s+)?(?:goal\s+)?timeline/i,
      /(?:validate|check)\s+(?:if\s+)?(?:my\s+)?timeline\s+(?:is\s+)?(?:realistic|feasible)/i,
      /(?:is\s+my\s+timeline|am\s+I\s+on\s+track)/i,
    ],
    description: "Comprehensive goal management: modifies timelines, extends deadlines, adjusts target dates, updates target amounts, changes goal status, adjusts priority, optimizes timelines, and validates feasibility"
  },
  "manage_milestones": {
    function_name: "goal-milestone-manager",
    patterns: [
      /create\s+(?:a\s+)?(?:new\s+)?milestone\s+(?:for|at)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /add\s+(?:a\s+)?milestone\s+(?:called|named)\s+['"](.*)['"]?/i,
      /(?:change|update|edit)\s+(?:the\s+)?milestone\s+(?:title|name)\s+to\s+['"](.*)['"]?/i,
      /delete\s+(?:the\s+)?milestone\s+(?:about|called|named)\s+(.*)/i,
      /(?:create|add)\s+(?:multiple|several|bulk)\s+milestones/i,
      /(?:change|update|set)\s+milestone\s+(?:status|priority)/i,
      /(?:mark|set)\s+milestone\s+(?:as\s+)?(completed|pending|in_progress|overdue|cancelled)/i,
      /(?:set|change)\s+milestone\s+priority\s+to\s+(low|medium|high|critical)/i,
      /(?:create|add|generate)\s+(?:milestone\s+)?template/i,
      /(?:bulk|mass)\s+(?:update|delete|create)\s+milestones/i,
    ],
    description: "Comprehensive milestone management: create, update, delete, reorder, bulk operations, status changes, priority adjustments, and template generation"
  },
  "generate_insights": {
    function_name: "goal-insights-generator",
    patterns: [
      /(?:how\s+am\s+I|how'm\s+I)\s+doing/i,
      /(?:give me|show me|provide)\s+insights?/i,
      /analyze\s+my\s+progress/i,
      /what\s+should\s+I\s+focus\s+on/i,
    ],
    description: "Generates personalized AI insights based on goal progress and patterns"
  },
  "create_goal": {
    function_name: "ai-goal-generator",
    patterns: [
      /create\s+(?:a\s+)?(?:new\s+)?goal\s+(?:for|to save)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:want to|need to|plan to)\s+save\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:for|by)\s+(.+)/i,
      /set up\s+(?:a\s+)?(?:savings\s+)?goal\s+(?:for|of)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:my|a)\s+(?:new\s+)?(?:financial\s+)?goal\s+is\s+to\s+save\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:help me|can you)\s+(?:create|make|set up)\s+(?:a\s+)?(?:new\s+)?goal/i,
      /(?:new|another)\s+(?:savings\s+)?goal/i,
    ],
    description: "Creates comprehensive new financial goals with AI assistance. Requires goalType (e.g., 'emergency_fund', 'retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'custom', 'passive_income') and questionnaireAnswers object with user's financial information. Generates complete goal with strategy, milestones, and insights."
  }
};

export function generateNextActions(functionName: string, data: any): string[] {
  switch (functionName) {
    case "goal-progress-tracker":
      return [
        "Keep up the momentum!",
        "Set a reminder for your next update",
        "Check out your updated progress chart"
      ];
    case "goal-milestone-manager":
      return [
        "Work towards your new milestone",
        "Share your progress with friends",
        "Set up milestone reminders"
      ];
    case "goal-timeline-manager":
      return [
        "Update your monthly savings plan",
        "Review your progress schedule",
        "Consider if other goals need adjustment"
      ];
    case "ai-goal-generator":
      return [
        "Start making your first contribution",
        "Set up automatic transfers",
        "Create milestones to track progress"
      ];
    case "goal-insights-generator":
      return [
        "Review your insights regularly",
        "Apply the suggested improvements",
        "Track your progress patterns"
      ];
    default:
      return ["Keep making progress!", "Stay consistent with updates"];
  }
}

export async function executeGoalFunction(
  functionName: string, 
  parameters: any, 
  supabase: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log('Executing function:', functionName, parameters);
  
  try {
    // Transform parameters based on the function being called
    let requestBody: any = {};
    
    switch (functionName) {
      case 'goal-milestone-manager':
        // Expected structure: { action, payload, userId }
        requestBody = {
          action: parameters.action || 'create',
          payload: parameters.payload || parameters,
          userId: parameters.userId
        };
        
        // If we have a goalId but no payload, structure it correctly
        if (parameters.goalId && !parameters.payload) {
          requestBody.payload = {
            ...parameters,
            goal_id: parameters.goalId
          };
          delete requestBody.payload.userId;
          delete requestBody.payload.action;
          delete requestBody.payload.goalId;
        }
        break;
        
      case 'goal-timeline-manager':
        // Expected structure: { action, goalId, userId, payload }
        requestBody = {
          action: parameters.action || 'adjust_target',
          goalId: parameters.goalId,
          userId: parameters.userId,
          payload: parameters.payload || {}
        };
        break;
        
      case 'goal-progress-tracker':
        // This function expects different structure, pass as-is for now
        requestBody = parameters;
        break;
        
      case 'ai-goal-generator':
        // This function expects different structure, pass as-is for now
        requestBody = parameters;
        break;
        
      default:
        // For other functions, pass parameters as-is
        requestBody = parameters;
        break;
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: requestBody
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
        action: { type: "string", description: "Action type: update_timeline, extend_timeline, adjust_target, change_status, change_priority, optimize_timeline, or validate_timeline" },
        payload: { type: "object", description: "Adjustment data including target_date, target_amount, new_status, new_priority, reason, etc." }
      };
    case "manage_milestones":
      return {
        ...baseSchema,
        goalId: { type: "string", description: "Goal ID for milestone" },
        action: { type: "string", description: "Action: create, update, delete, reorder, bulk_create, bulk_update, bulk_delete, change_status, change_priority, or create_template" },
        payload: { type: "object", description: "Milestone data, bulk operations array, status/priority changes, or template parameters" }
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
    isGlobalMode, 
    goalId, 
    goal, 
    conversationHistory = []
  } = request;

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
    
    // Special handling for goal-timeline-manager (target amount updates)
    if (functionCall.name === 'goal-timeline-manager') {
      // Extract target amount from the original message if present
      const targetAmountMatch = message.match(/(?:with\s+amount\s+to|target\s+to|amount\s+to)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
      
      if (targetAmountMatch) {
        const targetAmount = parseFloat(targetAmountMatch[1].replace(/,/g, ''));
        functionArgs = {
          ...functionArgs,
          action: 'adjust_target',
          payload: {
            ...functionArgs.payload,
            target_amount: targetAmount,
            reason: `Target amount updated via chat to $${targetAmount.toLocaleString()}`,
            auto_generated: false
          }
        };
      }
    }
    
    // Special handling for ai-goal-generator
    if (functionCall.name === 'ai-goal-generator') {
      // Extract goalType from payload or directly from args
      let goalType = functionArgs.goalType || functionArgs.payload?.goal_type || 'custom';
      
      // Map unsupported goal types to supported ones
      const supportedGoalTypes:GoalType[] = ['emergency_fund', 'retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'passive_income', 'custom'];
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
    
    return {
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
    };
  } else {
    // No function call, just return the text response
    const responseText = response.text();
    
    return {
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
    };
  }
}