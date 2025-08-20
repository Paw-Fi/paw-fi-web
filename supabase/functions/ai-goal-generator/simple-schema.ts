// Simplified AI Schema - Reduced complexity for Gemini function calling
// Minimal schema that avoids "too many states" error

export const SimpleAISchema = {
  goalGeneratorFunction: {
    name: "generate_complete_financial_plan",
    description: "Generate a complete financial goal plan with essential components.",
    parameters: {
      type: "OBJECT",
      properties: {
        goal: {
          type: "OBJECT",
          properties: {
            title: {
              type: "STRING",
              description: "Goal title"
            },
            description: {
              type: "STRING", 
              description: "Goal description"
            },
            targetAmount: {
              type: "NUMBER",
              description: "Target amount in USD"
            },
            targetDate: {
              type: "STRING",
              description: "Target date in YYYY-MM-DD format"
            },
            rationale: {
              type: "STRING",
              description: "Explanation of goal rationale"
            }
          },
          required: ["title", "description", "targetAmount", "targetDate", "rationale"]
        },
        strategy: {
          type: "STRING",
          description: "Overall strategy explanation"
        },
        milestones: {
          type: "ARRAY",
          items: {
            type: "OBJECT", 
            properties: {
              title: {
                type: "STRING",
                description: "Milestone title"
              },
              description: {
                type: "STRING",
                description: "Milestone description"
              },
              type: {
                type: "STRING",
                description: "Type: savings, action, habit, or review"
              },
              targetAmount: {
                type: "NUMBER",
                description: "Target amount for savings milestones"
              },
              dueDate: {
                type: "STRING", 
                description: "Due date in YYYY-MM-DD format"
              },
              priority: {
                type: "STRING",
                description: "Priority: critical, high, medium, or low"
              },
              aiRationale: {
                type: "STRING",
                description: "AI reasoning for this milestone"
              }
            },
            required: ["title", "description", "type", "dueDate", "priority", "aiRationale"]
          }
        },
        insights: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: {
                type: "STRING",
                description: "Type of insight"
              },
              title: {
                type: "STRING",
                description: "Insight title"
              },
              content: {
                type: "STRING",
                description: "Insight content"
              },
              priority: {
                type: "STRING",
                description: "Priority level"
              },
              actionable: {
                type: "BOOLEAN",
                description: "Whether this requires user action"
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
              description: "Monthly amount needed to reach goal"
            },
            projectedFinalAmount: {
              type: "NUMBER", 
              description: "Projected final amount"
            },
            incomeReplacement: {
              type: "NUMBER",
              description: "Income replacement percentage for retirement goals only"
            },
            confidenceLevel: {
              type: "NUMBER",
              description: "Confidence level between 0.5 and 1.0"
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
                  description: "Plan message content"
                },
                tone: {
                  type: "STRING",
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
                  description: "Insights message content"
                },
                tone: {
                  type: "STRING",
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
                  description: "Next steps message content"
                },
                tone: {
                  type: "STRING",
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
              description: "Financial profile summary"
            },
            profileData: {
              type: "OBJECT",
              properties: {
                netWorth: {
                  type: "NUMBER",
                  description: "Net worth"
                },
                monthlyIncome: {
                  type: "NUMBER",
                  description: "Monthly income"
                },
                monthlyExpenses: {
                  type: "NUMBER",
                  description: "Monthly expenses"
                },
                savingsRate: {
                  type: "NUMBER",
                  description: "Savings rate percentage"
                },
                riskTolerance: {
                  type: "STRING",
                  description: "Risk tolerance level"
                },
                financialGoals: {
                  type: "ARRAY",
                  items: {
                    type: "STRING"
                  },
                  description: "List of financial goals"
                },
                strengths: {
                  type: "ARRAY",
                  items: {
                    type: "STRING"
                  },
                  description: "Financial strengths"
                },
                recommendations: {
                  type: "ARRAY",
                  items: {
                    type: "STRING"
                  },
                  description: "Recommendations"
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
};