import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";

/**
 * Function Registry - Maps natural language patterns to Supabase functions
 */

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

// Function registry with natural language patterns
export const GOAL_FUNCTIONS_REGISTRY = {
  "update_progress": {
    function_name: "goal-progress-tracker",
    patterns: [
      /(?:saved?|add(?:ed)?|put in|deposit(?:ed)?|contributed?)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:spent|took out|withdrew?|removed?)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:from|out of)/i,
      /(?:mark|complete|finish)(?:ed)?\s+(?:my\s+)?(.+?)\s+(?:milestone|step)/i,
    ],
    description: "Updates goal progress by adding/subtracting amounts or completing milestones"
  },
  "adjust_timeline": {
    function_name: "goal-timeline-manager", 
    patterns: [
      /(?:extend|push back|move)\s+(?:my\s+)?(?:deadline|target date|timeline)\s+(?:by\s+|to\s+)(.+)/i,
      /(?:need|want)\s+(?:more\s+time|\d+\s+more\s+(?:days|weeks|months))/i,
      /change\s+(?:my\s+)?(?:goal\s+)?(?:deadline|target date)\s+to\s+(.+)/i,
    ],
    description: "Modifies goal timelines, extends deadlines, and adjusts target dates"
  },
  "manage_milestones": {
    function_name: "goal-milestone-manager",
    patterns: [
      /create\s+(?:a\s+)?(?:new\s+)?milestone\s+(?:for|at)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /add\s+(?:a\s+)?milestone\s+(?:called|named)\s+['"](.*?)['"]?/i,
      /(?:change|update|edit)\s+(?:the\s+)?milestone\s+(?:title|name)\s+to\s+['"](.*?)['"]?/i,
      /delete\s+(?:the\s+)?milestone\s+(?:about|called|named)\s+(.*)/i,
    ],
    description: "Create, update, delete, and reorder goal milestones"
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
    ],
    description: "Creates new financial goals with AI assistance"
  }
};

export async function parseUserIntent(
  message: string, 
  goalContext: any, 
  userId: string,
  isGlobalMode: boolean
): Promise<ExecutionPlan | null> {
  console.log('Parsing user intent:', message, 'Global mode:', isGlobalMode);
  
  // Check patterns against function registry
  for (const [functionKey, functionData] of Object.entries(GOAL_FUNCTIONS_REGISTRY)) {
    for (const pattern of functionData.patterns) {
      const match = message.match(pattern);
      if (match) {
        console.log(`Matched pattern for ${functionKey}:`, match);
        
        // Extract parameters based on function type
        let parameters: any = { userId };
        
        // Add goal context based on mode
        if (isGlobalMode) {
          parameters.goalContext = goalContext;
          parameters.isGlobalMode = true;
        } else {
          parameters.goalId = goalContext?.goalId;
          parameters.isGlobalMode = false;
        }
        
        switch (functionKey) {
          case "update_progress":
            if (match[1]) {
              const amount = parseFloat(match[1].replace(/,/g, ''));
              parameters.updateType = RewardActions.GOAL_PROGRESS_UPDATED;
              parameters.amountChange = message.toLowerCase().includes('spent') || 
                                     message.toLowerCase().includes('took out') || 
                                     message.toLowerCase().includes('withdrew') 
                                     ? -amount : amount;
            }
            if (message.toLowerCase().includes('milestone')) {
              parameters.updateType = RewardActions.MILESTONE_COMPLETED;
              // Would need to resolve milestone ID from title
            }
            break;
            
          case "adjust_timeline":
            parameters.action = 'update_timeline';
            if (match[1]) {
              // Parse date/duration from match
              parameters.payload = {
                target_date: match[1], // Would need proper date parsing
                reason: "User requested timeline adjustment"
              };
            }
            break;
            
          case "manage_milestones":
            parameters.action = 'create';
            if (match[1]) {
              const amount = parseFloat(match[1].replace(/,/g, ''));
              parameters.payload = {
                goal_id: goalContext?.goalId,
                title: `$${amount.toLocaleString()} Milestone`,
                target_amount: amount,
                milestone_type: 'amount',
                priority: 'medium'
              };
            }
            break;
            
          case "create_goal":
            if (match[1]) {
              const amount = parseFloat(match[1].replace(/,/g, ''));
              parameters.payload = {
                target_amount: amount,
                goal_type: 'savings',
                title: match[2] ? `Save for ${match[2]}` : `$${amount.toLocaleString()} Savings Goal`,
                user_id: userId
              };
            }
            break;
            
          case "generate_insights":
            // No additional parameters needed
            break;
        }
        
        return {
          function_name: functionData.function_name,
          parameters,
          confidence: 0.8,
          requires_confirmation: functionKey === "adjust_timeline" || 
                                (functionKey === "update_progress" && Math.abs(parameters.amountChange || 0) > 100) ||
                                functionKey === "create_goal",
          natural_language_summary: `I'll ${functionData.description.toLowerCase()}`,
          extracted_entities: {
            amounts: match[1] ? [parseFloat(match[1].replace(/,/g, ''))] : [],
          }
        };
      }
    }
  }
  
  return null;
}

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