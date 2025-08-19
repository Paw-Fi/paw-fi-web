// AI Goal Generator Schema - BULLETPROOF VERSION
// Completely rewritten for 100% consistent AI responses

export type AdvisorTone = 'congratulatory' | 'encouraging' | 'motivational' | 'reassuring' | 'informative';

export interface AIGoalResponse {
  goal: {
    title: string;
    description: string;
    targetAmount: number;
    targetDate: string; // YYYY-MM-DD format
    rationale: string;
  };
  strategy: string;
  milestones: Array<{
    title: string;
    description: string;
    type: 'savings' | 'action' | 'habit' | 'review';
    targetAmount: number | null;
    dueDate: string; // YYYY-MM-DD format
    habitDescription: string | null;
    frequency: 'daily' | 'weekly' | 'monthly' | 'one-time' | null;
    habitTargetValue: number | null;
    priority: 'critical' | 'high' | 'medium' | 'low';
    aiRationale: string;
  }>;
  insights: Array<{
    type: 'strategy_insight' | 'risk_warning' | 'opportunity' | 'behavioral_tip';
    title: string;
    content: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  projections: {
    monthlyRequired: number;
    projectedFinalAmount: number;
    incomeReplacement: number | null;
    confidenceLevel: number; // 0.0 to 1.0
  };
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
  financialProfile: {
    profileDescription: string;
    profileData: {
      netWorth: number;
      monthlyIncome: number;
      monthlyExpenses: number;
      savingsRate: number;
      riskTolerance: 'conservative' | 'moderate' | 'aggressive';
      financialGoals: string[];
      strengths: string[];
      recommendations: string[];
    };
  };
}

// Ultra-strict schema for Gemini function calling - ZERO ambiguity
export const goalGeneratorTool = {
  functionDeclarations: [
    {
      name: "generate_complete_financial_plan",
      description: "Generate a complete financial goal plan and user financial profile in exact format required for database storage.",
      parameters: {
        type: "OBJECT",
        properties: {
          goal: {
            type: "OBJECT",
            properties: {
              title: {
                type: "STRING",
                description: "Goal title (max 255 chars, no special characters)"
              },
              description: {
                type: "STRING", 
                description: "Detailed goal description (500-2000 chars)"
              },
              targetAmount: {
                type: "NUMBER",
                description: "Target amount in USD (must be positive integer, no decimals)"
              },
              targetDate: {
                type: "STRING",
                description: "Target date in YYYY-MM-DD format (must be future date)"
              },
              rationale: {
                type: "STRING",
                description: "Reasoning for this goal (200-500 chars)"
              }
            },
            required: ["title", "description", "targetAmount", "targetDate", "rationale"]
          },
          strategy: {
            type: "STRING",
            description: "Overall strategy (500-1500 chars)"
          },
          milestones: {
            type: "ARRAY",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "OBJECT", 
              properties: {
                title: {
                  type: "STRING",
                  description: "Milestone title (max 255 chars)"
                },
                description: {
                  type: "STRING",
                  description: "Milestone description (200-500 chars)"
                },
                type: {
                  type: "STRING",
                  enum: ["savings", "action", "habit", "review"],
                  description: "Milestone type (must be one of: savings, action, habit, review)"
                },
                targetAmount: {
                  type: "NUMBER",
                  description: "Target amount for this milestone (positive integer or null)"
                },
                dueDate: {
                  type: "STRING", 
                  description: "Due date in YYYY-MM-DD format (must be future date)"
                },
                habitDescription: {
                  type: "STRING",
                  description: "Habit description (only for habit type, otherwise null)"
                },
                frequency: {
                  type: "STRING",
                  enum: ["daily", "weekly", "monthly", "one-time"],
                  description: "Frequency (only for habit type, otherwise null)"
                },
                habitTargetValue: {
                  type: "NUMBER",
                  description: "Habit target value (only for habit type, otherwise null)"
                },
                priority: {
                  type: "STRING",
                  enum: ["critical", "high", "medium", "low"],
                  description: "Priority level"
                },
                aiRationale: {
                  type: "STRING",
                  description: "AI reasoning for this milestone (100-300 chars)"
                }
              },
              required: ["title", "description", "type", "dueDate", "priority", "aiRationale"]
            }
          },
          insights: {
            type: "ARRAY",
            minItems: 2,
            maxItems: 5,
            items: {
              type: "OBJECT",
              properties: {
                type: {
                  type: "STRING",
                  enum: ["strategy_insight", "risk_warning", "opportunity", "behavioral_tip"],
                  description: "Insight type"
                },
                title: {
                  type: "STRING",
                  description: "Insight title (max 255 chars)"
                },
                content: {
                  type: "STRING",
                  description: "Insight content (300-800 chars)"
                },
                priority: {
                  type: "STRING",
                  enum: ["critical", "high", "medium", "low"],
                  description: "Priority level"
                },
                actionable: {
                  type: "BOOLEAN",
                  description: "Whether this insight requires user action"
                }
              },
              required: ["type", "title", "content", "priority", "actionable"]
            }
          },
          projections: {
            type: "OBJECT",
            properties: {
              monthlyRequired: {
                type: "NUMBER",
                description: "Monthly savings amount required to reach goal (calculate: target_amount / months_to_goal, must be positive)"
              },
              projectedFinalAmount: {
                type: "NUMBER", 
                description: "Projected final amount (positive number)"
              },
              incomeReplacement: {
                type: "NUMBER",
                description: "Income replacement percentage (0-100, only for retirement goals, otherwise null)"
              },
              confidenceLevel: {
                type: "NUMBER",
                description: "Confidence level (0.5 to 1.0)"
              }
            },
            required: ["monthlyRequired", "projectedFinalAmount", "confidenceLevel"]
          },
          advisorMessages: {
            type: "OBJECT",
            properties: {
              planMessage: {
                type: "OBJECT",
                properties: {
                  content: {
                    type: "STRING",
                    description: "Plan page message: 'I suggest you to [action], because [reason], so that [outcome].' (300-600 chars)"
                  },
                  tone: {
                    type: "STRING",
                    enum: ["congratulatory", "encouraging", "motivational", "reassuring", "informative"],
                    description: "Message tone"
                  }
                },
                required: ["content", "tone"]
              },
              insightsMessage: {
                type: "OBJECT",
                properties: {
                  content: {
                    type: "STRING", 
                    description: "Insights page message: 'I suggest you to [action], because [reason], so that [outcome].' (300-600 chars)"
                  },
                  tone: {
                    type: "STRING",
                    enum: ["congratulatory", "encouraging", "motivational", "reassuring", "informative"],
                    description: "Message tone"
                  }
                },
                required: ["content", "tone"]
              },
              nextStepsMessage: {
                type: "OBJECT",
                properties: {
                  content: {
                    type: "STRING",
                    description: "Next steps page message: 'I suggest you to [action], because [reason], so that [outcome].' (300-600 chars)"
                  },
                  tone: {
                    type: "STRING",
                    enum: ["congratulatory", "encouraging", "motivational", "reassuring", "informative"],
                    description: "Message tone"
                  }
                },
                required: ["content", "tone"]
              }
            },
            required: ["planMessage", "insightsMessage", "nextStepsMessage"]
          },
          financialProfile: {
            type: "OBJECT",
            properties: {
              profileDescription: {
                type: "STRING",
                description: "Professional financial profile description (800-1500 chars)"
              },
              profileData: {
                type: "OBJECT",
                properties: {
                  netWorth: {
                    type: "NUMBER",
                    description: "Calculated net worth"
                  },
                  monthlyIncome: {
                    type: "NUMBER",
                    description: "Monthly income from questionnaire"
                  },
                  monthlyExpenses: {
                    type: "NUMBER",
                    description: "Calculated monthly expenses"
                  },
                  savingsRate: {
                    type: "NUMBER",
                    description: "Savings rate as percentage (0-100)"
                  },
                  riskTolerance: {
                    type: "STRING",
                    enum: ["conservative", "moderate", "aggressive"],
                    description: "Risk tolerance level"
                  },
                  financialGoals: {
                    type: "ARRAY",
                    minItems: 2,
                    maxItems: 5,
                    items: {
                      type: "STRING",
                      description: "Financial goal (max 100 chars each)"
                    },
                    description: "List of financial goals"
                  },
                  strengths: {
                    type: "ARRAY",
                    minItems: 2,
                    maxItems: 4,
                    items: {
                      type: "STRING",
                      description: "Financial strength (max 100 chars each)"
                    },
                    description: "List of financial strengths"
                  },
                  recommendations: {
                    type: "ARRAY",
                    minItems: 3,
                    maxItems: 6,
                    items: {
                      type: "STRING",
                      description: "Recommendation (max 200 chars each)"
                    },
                    description: "List of recommendations"
                  }
                },
                required: ["netWorth", "monthlyIncome", "monthlyExpenses", "savingsRate", "riskTolerance", "financialGoals", "strengths", "recommendations"]
              }
            },
            required: ["profileDescription", "profileData"]
          }
        },
        required: ["goal", "strategy", "milestones", "insights", "projections", "advisorMessages", "financialProfile"]
      }
    }
  ]
};