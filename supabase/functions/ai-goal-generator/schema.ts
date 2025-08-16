// AI Goal Generator Schema and Types
// Defines the structured response schema for AI goal generation using function calling

export type AdvisorTone = 'congratulatory' | 'encouraging' | 'motivational' | 'reassuring' | 'informative';

export interface AIGoalResponse {
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
  advisorMessages: {
    planMessage: {
      content: string;
      tone: AdvisorTone;
    };
    insightsMessage: {
      content: string;
      tone: AdvisorTone;
    };
    nextStepsMessage: {
      content: string;
      tone: AdvisorTone;
    };
  };
}

// Structured response schema for AI goal generation using Gemini function calling
export const goalGeneratorTool = {
  functionDeclarations: [
    {
      name: "generate_financial_goal",
      description: "Generates a structured financial goal with strategy, milestones, and insights based on questionnaire data.",
      parameters: {
        type: "OBJECT",
        properties: {
          goal: {
            type: "OBJECT",
            properties: {
              title: {
                type: "STRING",
                description: "A clear, specific title for the financial goal.",
              },
              description: {
                type: "STRING",
                description: "A detailed description of the financial goal and its purpose.",
              },
              targetAmount: {
                type: "NUMBER",
                description: "The target amount for the goal in dollars (must be positive).",
              },
              targetDate: {
                type: "STRING",
                description: "The target date for achieving the goal in YYYY-MM-DD format (must be future date).",
              },
              rationale: {
                type: "STRING",
                description: "The reasoning behind this specific goal and timeline.",
              },
            },
            required: ["title", "description", "targetAmount", "targetDate", "rationale"],
          },
          strategy: {
            type: "STRING",
            description: "A comprehensive strategy overview for achieving the goal.",
          },
          milestones: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: {
                  type: "STRING",
                  description: "Title of the milestone.",
                },
                description: {
                  type: "STRING",
                  description: "Detailed description of what needs to be accomplished.",
                },
                type: {
                  type: "STRING",
                  description: "Type of milestone: 'savings', 'action', 'habit', or 'review'.",
                },
                targetAmount: {
                  type: "NUMBER",
                  description: "Target amount for this milestone (optional, for savings milestones).",
                },
                dueDate: {
                  type: "STRING",
                  description: "Due date in YYYY-MM-DD format (must be future date).",
                },
                habitDescription: {
                  type: "STRING",
                  description: "Description of habit to be formed (optional, for habit milestones).",
                },
                frequency: {
                  type: "STRING",
                  description: "Frequency of the habit: 'daily', 'weekly', 'monthly' (optional).",
                },
                habitTargetValue: {
                  type: "NUMBER",
                  description: "Target value for the habit (optional).",
                },
                priority: {
                  type: "STRING",
                  description: "Priority level: 'critical', 'high', 'medium', or 'low'.",
                },
                aiRationale: {
                  type: "STRING",
                  description: "AI reasoning for this milestone.",
                },
              },
              required: ["title", "description", "type", "dueDate", "priority", "aiRationale"],
            },
            description: "An array of milestones to achieve the goal.",
          },
          insights: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: {
                  type: "STRING",
                  description: "Type of insight: 'strategy_insight', 'risk_warning', 'opportunity', or 'behavioral_tip'.",
                },
                title: {
                  type: "STRING",
                  description: "Title of the insight.",
                },
                content: {
                  type: "STRING",
                  description: "Detailed content of the insight.",
                },
                priority: {
                  type: "STRING",
                  description: "Priority level: 'critical', 'high', 'medium', or 'low'.",
                },
                actionable: {
                  type: "BOOLEAN",
                  description: "Whether this insight requires user action.",
                },
              },
              required: ["type", "title", "content", "priority", "actionable"],
            },
            description: "An array of AI-generated insights and recommendations.",
          },
          projections: {
            type: "OBJECT",
            properties: {
              monthlyRequired: {
                type: "NUMBER",
                description: "Monthly savings/investment amount required to reach the goal.",
              },
              projectedFinalAmount: {
                type: "NUMBER",
                description: "Projected final amount at target date.",
              },
              incomeReplacement: {
                type: "NUMBER",
                description: "Percentage of income this goal will replace (for retirement goals).",
              },
              confidenceLevel: {
                type: "NUMBER",
                description: "Confidence level of projections (0.0 to 1.0).",
              },
            },
            description: "Financial projections for the goal (optional).",
          },
          advisorMessages: {
            type: "OBJECT",
            properties: {
              planMessage: {
                type: "OBJECT",
                properties: {
                  content: {
                    type: "STRING",
                    description: "Detailed advisor message for the 'Your Plan' presentation page. Must follow format: 'I suggest you to [action], because [reason], so that [outcome].' Should be personalized based on user's financial situation and goals.",
                  },
                  tone: {
                    type: "STRING",
                    description: "Advisor tone for the message: 'congratulatory', 'encouraging', 'motivational', 'reassuring', or 'informative'.",
                    enum: ["congratulatory", "encouraging", "motivational", "reassuring", "informative"],
                  },
                },
                required: ["content", "tone"],
                description: "Advisor message for the 'Your Plan' presentation page.",
              },
              insightsMessage: {
                type: "OBJECT",
                properties: {
                  content: {
                    type: "STRING",
                    description: "Detailed advisor message for the 'Key Insights' presentation page. Must follow format: 'I suggest you to [action], because [reason], so that [outcome].' Should highlight key financial insights and opportunities.",
                  },
                  tone: {
                    type: "STRING",
                    description: "Advisor tone for the message: 'congratulatory', 'encouraging', 'motivational', 'reassuring', or 'informative'.",
                    enum: ["congratulatory", "encouraging", "motivational", "reassuring", "informative"],
                  },
                },
                required: ["content", "tone"],
                description: "Advisor message for the 'Key Insights' presentation page.",
              },
              nextStepsMessage: {
                type: "OBJECT",
                properties: {
                  content: {
                    type: "STRING",
                    description: "Detailed advisor message for the 'Next Steps' presentation page. Must follow format: 'I suggest you to [action], because [reason], so that [outcome].' Should focus on immediate actionable steps.",
                  },
                  tone: {
                    type: "STRING",
                    description: "Advisor tone for the message: 'congratulatory', 'encouraging', 'motivational', 'reassuring', or 'informative'.",
                    enum: ["congratulatory", "encouraging", "motivational", "reassuring", "informative"],
                  },
                },
                required: ["content", "tone"],
                description: "Advisor message for the 'Next Steps' presentation page.",
              },
            },
            required: ["planMessage", "insightsMessage", "nextStepsMessage"],
            description: "Personalized advisor messages for each presentation flow page.",
          },
        },
        required: ["goal", "strategy", "milestones", "insights", "advisorMessages"],
      },
    },
  ],
};