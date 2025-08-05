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
    description: "ALWAYS use when user mentions money amounts like 'add $100', 'saved $50', 'put in $200'. Use updateType: 'goal_progress_updated' for amount changes. For milestone completion, use updateType: 'milestone_completed'."
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
      /(?:help me|can you)\s+(?:create|make|set up)\s+(?:a\s+)?(?:new\s+)?goal/i,
      /(?:new|another)\s+(?:savings\s+)?goal/i,
    ],
    description: "Creates comprehensive new financial goals with AI assistance. Requires goalType (e.g., 'emergency_fund', 'retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'custom') and questionnaireAnswers object with user's financial information. Generates complete goal with strategy, milestones, and insights."
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