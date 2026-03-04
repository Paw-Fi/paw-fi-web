// AI Service - Robust Gemini Integration with Circuit Breaker Pattern
// Handles AI generation with graceful degradation and consistent schema enforcement

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Logger } from "./logger.ts";

interface AIGoalResponse {
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
    targetAmount: number | null;
    dueDate: string;
    habitDescription: string | null;
    frequency: string | null;
    habitTargetValue: number | null;
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
  projections: {
    monthlyRequired: number;
    projectedFinalAmount: number;
    incomeReplacement: number | null;
    confidenceLevel: number;
  };
  advisorMessages: {
    planMessage: { content: string; tone: string };
    insightsMessage: { content: string; tone: string };
    nextStepsMessage: { content: string; tone: string };
  };
  financialProfile: {
    profileDescription: string;
    profileData: {
      netWorth: number;
      monthlyIncome: number;
      monthlyExpenses: number;
      savingsRate: number;
      riskTolerance: string;
      financialGoals: string[];
      strengths: string[];
      recommendations: string[];
    };
  };
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private circuitBreakerState: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 3;
  private readonly recoveryTimeout = 60000; // 1 minute

  constructor(private logger: Logger) {
    // @ts-ignore: Deno is available in Supabase Edge Functions
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateGoalPlan(
    goalType: string,
    questionnaireAnswers: Record<string, any>,
  ): Promise<AIGoalResponse> {
    this.logger.info("Starting AI goal plan generation", {
      goalType,
      circuitBreakerState: this.circuitBreakerState,
      hasQuestionnaireData: Object.keys(questionnaireAnswers).length > 0,
    });

    // Check circuit breaker
    if (this.circuitBreakerState === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.circuitBreakerState = "HALF_OPEN";
        this.logger.info("Circuit breaker moving to HALF_OPEN state");
      } else {
        this.logger.error(
          "Circuit breaker is OPEN - AI should not be using fallback!",
          {
            lastFailureTime: this.lastFailureTime,
            timeSinceLastFailure: Date.now() - this.lastFailureTime,
          },
        );
        throw new Error(
          "AI service temporarily unavailable due to repeated failures",
        );
      }
    }

    try {
      this.logger.info("Calling Gemini AI API...");
      const response = await this.callGeminiAPI(goalType, questionnaireAnswers);

      // Success - reset circuit breaker
      if (this.circuitBreakerState === "HALF_OPEN") {
        this.circuitBreakerState = "CLOSED";
        this.failureCount = 0;
        this.logger.info("Circuit breaker reset to CLOSED state");
      }

      this.logger.info("AI generation successful!", {
        goalTitle: response.goal.title,
        targetAmount: response.goal.targetAmount,
        targetDate: response.goal.targetDate,
      });

      return response;
    } catch (error) {
      this.logger.error("AI generation failed with error", {
        error: error.message,
        stack: error.stack,
      });
      this.handleAIFailure(error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  private async callGeminiAPI(
    goalType: string,
    questionnaireAnswers: Record<string, any>,
  ): Promise<AIGoalResponse> {
    // Simplified approach - no function calling, direct JSON response
    const model = this.genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
    });

    const prompt = this.buildPrompt(goalType, questionnaireAnswers);

    this.logger.debug("Calling Gemini API for JSON response", { goalType });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();

    this.logger.debug("Gemini API response received", {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200),
    });

    // Parse the JSON response
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      let jsonText = responseText;

      // Remove markdown code block markers if present
      if (jsonText.includes("```json")) {
        const jsonStart = jsonText.indexOf("```json") + 7;
        const jsonEnd = jsonText.lastIndexOf("```");
        if (jsonEnd > jsonStart) {
          jsonText = jsonText.substring(jsonStart, jsonEnd);
        }
      } else if (jsonText.includes("```")) {
        const jsonStart = jsonText.indexOf("```") + 3;
        const jsonEnd = jsonText.lastIndexOf("```");
        if (jsonEnd > jsonStart) {
          jsonText = jsonText.substring(jsonStart, jsonEnd);
        }
      }

      jsonText = jsonText.trim();
      this.logger.debug("Extracted JSON text", { jsonLength: jsonText.length });

      const parsedResponse = JSON.parse(jsonText);
      this.logger.info("Successfully parsed JSON response");

      return this.validateAndNormalizeResponse(parsedResponse);
    } catch (parseError) {
      this.logger.error("Failed to parse AI JSON response", {
        error: parseError.message,
        responseText: responseText.substring(0, 500),
      });

      // Try one more time with explicit JSON request
      this.logger.info("Attempting retry with explicit JSON format request");

      const retryPrompt = `${prompt}

The previous response could not be parsed as JSON. Please respond with ONLY a valid JSON object, no additional text or markdown formatting.`;

      const retryResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: retryPrompt }] }],
      });

      const retryResponseText = retryResult.response.text();

      try {
        let retryJsonText = retryResponseText.trim();

        // Clean up any remaining markdown
        if (retryJsonText.includes("```")) {
          const lines = retryJsonText.split("\n");
          const cleanLines = lines.filter(
            (line: string) => !line.trim().startsWith("```"),
          );
          retryJsonText = cleanLines.join("\n");
        }

        const retryParsedResponse = JSON.parse(retryJsonText);
        this.logger.info("Successfully parsed retry JSON response");

        return this.validateAndNormalizeResponse(retryParsedResponse);
      } catch (retryParseError) {
        this.logger.error("Failed to parse retry JSON response", {
          error: retryParseError.message,
          retryResponseText: retryResponseText.substring(0, 500),
        });

        throw new Error(
          `AI failed to generate valid JSON response after retry. Parse errors: ${parseError.message}, ${retryParseError.message}`,
        );
      }
    }
  }

  private buildPrompt(goalType: string, answers: Record<string, any>): string {
    const today = new Date().toISOString().split("T")[0];

    // Log the raw questionnaire data for debugging
    this.logger.debug("Raw questionnaire data being sent to AI", {
      goalType,
      questionnaireFields: Object.keys(answers),
      rawData: answers,
    });

    return `You are an advanced financial planning AI model. Your sole function is to process user financial data and respond with ONLY a single, valid JSON object. Do not include any introductory text, explanations, or markdown formatting like json before or after the object.

You will be provided with a series of questions and the user's corresponding answers, detailing their current financial situation (e.g., income, expenses, assets, debts), risk tolerance, and specific long-term goals (e.g., retirement, home purchase, debt elimination).

Your task is to perform a deep, holistic analysis of this information. You must think critically to synthesize all provided data and generate a personalized, insightful, and actionable financial plan. Go beyond surface-level observations. Your analysis should identify potential risks and hidden opportunities within the user's financial profile, correlate their current habits and financial standing directly with their stated goals, generate concrete, prioritized recommendations that are logically derived from your analysis, and project potential outcomes based on following or ignoring your advice.

The JSON object you generate MUST provide a comprehensive financial snapshot. Structure your response to include a summary, a detailed analysis, and a clear set of actionable recommendations tailored to the user's unique situation.

Remember, your entire response must be nothing but the raw JSON object. Your output must begin with "{" and end with "}". Do not include any text before or after the JSON.

GOAL TYPE: ${goalType}
TODAY'S DATE: ${today}

USER'S ANSWER FOR QUESTIONNAIRE (EXTRACT ALL VALUES FROM THIS):
${JSON.stringify(answers, null, 2)}

CRITICAL INSTRUCTIONS - READ THE QUESTIONNAIRE DATA ABOVE CAREFULLY:

FOR CUSTOM GOALS:
- If you see "target_amount" or "goal_amount" in the data above, use that EXACT number
- If you see any amount field (like "amount", "target", etc.), use that EXACT number
- DO NOT modify, calculate, or adjust the target amount - use it exactly as provided
- Example: If questionnaire shows "target_amount": 2000, your JSON MUST have "targetAmount": 2000

FOR ALL GOAL TYPES:
- NEVER use any default values, sample numbers, or your own calculations
- Every single number in your response must come directly from the questionnaire data above
- If you see a field like "monthly_income": 5000, use exactly 5000, not 4999 or 5001
- If questionnaire says target is 2000, do NOT calculate it as 3000 or any other number

ABSOLUTE REQUIREMENTS:
1. Look at the questionnaire data JSON above
2. Find the target amount field (could be "target_amount", "goal_amount", "amount", etc.)
3. Use that EXACT number in your "targetAmount" field
4. Find the monthly income field and use the EXACT number
5. Use all other values exactly as provided in the questionnaire

WARNING: If your "targetAmount" does not exactly match what the user provided in their questionnaire, you have made a critical error. Double-check the questionnaire data above and use the exact values.

GOAL-SPECIFIC FIELD MAPPING:
- CUSTOM: Use "target_amount", "goal_amount", or "amount" exactly as provided
- HOME_BUYING: Use "target_home_price" for the house price (may need to add closing costs)  
- EMERGENCY_FUND: Calculate "target_months" × "monthly_essential_expenses"
- PASSIVE_INCOME: Calculate from "target_monthly_income" using 4% rule
- DEBT_PAYOFF: Sum all balances in "debts" array
- RETIREMENT/WEALTH/INVESTMENT: Use the target field exactly as provided

MANDATORY: Check the questionnaire data above one more time before responding. Use the EXACT numbers provided.

RESPONSE FORMAT - Return JSON with this exact structure:
{
  "goal": {
    "title": "[Clear goal title extracted from questionnaire data]",
    "description": "[Detailed description based on their specific goal and situation]",
    "targetAmount": [Extract exact target amount number from questionnaire - no sample numbers],
    "targetDate": "[Calculate realistic future date in YYYY-MM-DD format]",
    "rationale": "[Explanation why this goal makes sense for their situation]"
  },
  "strategy": "[Overall savings strategy explanation personalized to their income and target]",
  "milestones": [
    {
      "title": "[Milestone title specific to their goal]",
      "description": "[Action step description for their situation]", 
      "type": "[Choose: savings, action, habit, or review]",
      "targetAmount": [Milestone amount as portion of their total target - use real numbers],
      "dueDate": "[Progressive date in YYYY-MM-DD format]",
      "habitDescription": [null for non-habit milestones, or habit description string],
      "frequency": [null for non-habit milestones, or frequency string],
      "habitTargetValue": [null for non-habit milestones, or target value number],
      "priority": "[Choose: critical, high, medium, or low]",
      "aiRationale": "[Why this milestone helps them achieve their goal]"
    }
  ],
  "insights": [
    {
      "type": "[Choose: strategy_insight, risk_warning, opportunity, or behavioral_tip]", 
      "title": "[Insight title about their situation]",
      "content": "[Actionable advice specific to their income, target, and timeline]",
      "priority": "[Choose: critical, high, medium, or low]",
      "actionable": [true or false boolean]
    }
  ],
  "projections": {
    "monthlyRequired": [Calculate their target amount divided by months to goal],
    "projectedFinalAmount": [Their target amount plus potential growth],
    "incomeReplacement": [null unless retirement goal, then percentage number],
    "confidenceLevel": [Number between 0.5 and 1.0 based on their situation]
  },
  "advisorMessages": {
    "planMessage": {
      "content": "[Message starting with 'I suggest you to..., because..., so that...' format]",
      "tone": "[Choose: congratulatory, encouraging, motivational, reassuring, or informative]"
    },
    "insightsMessage": {
      "content": "[Message starting with 'I suggest you to..., because..., so that...' format]",
      "tone": "[Choose: congratulatory, encouraging, motivational, reassuring, or informative]"
    },
    "nextStepsMessage": {
      "content": "[Message starting with 'I suggest you to..., because..., so that...' format]",
      "tone": "[Choose: congratulatory, encouraging, motivational, reassuring, or informative]"
    }
  },
  "financialProfile": {
    "profileDescription": "[Complete summary of their financial situation from questionnaire]",
    "profileData": {
      "netWorth": [Calculate from their assets minus debts if available in data],
      "monthlyIncome": [Extract exact monthly income from their questionnaire],
      "monthlyExpenses": [Calculate or estimate from their spending information],
      "savingsRate": [Calculate percentage: (income minus expenses) divided by income times 100],
      "riskTolerance": "[Extract from questionnaire: conservative, moderate, or aggressive]",
      "financialGoals": ["[Array of their stated financial goals from questionnaire]"],
      "strengths": ["[Array of financial strengths based on their responses]"],
      "recommendations": ["[Array of specific recommendations for their situation]"]
    }
  }
}

ABSOLUTELY NO SAMPLE DATA - Replace every bracketed description with actual data from the questionnaire above!`;
  }

  private validateAndNormalizeResponse(args: any): AIGoalResponse {
    // MINIMAL validation - AI is single source of truth
    // Only check for required structure, do not modify any values

    if (!args.goal) {
      throw new Error("AI must provide a goal object");
    }

    if (!args.projections) {
      throw new Error("AI must provide projections object");
    }

    if (!args.advisorMessages) {
      throw new Error("AI must provide advisorMessages object");
    }

    if (!args.financialProfile) {
      throw new Error("AI must provide financialProfile object");
    }

    // Return AI response exactly as provided - no modifications
    const response: AIGoalResponse = {
      goal: {
        title: args.goal.title,
        description: args.goal.description,
        targetAmount: args.goal.targetAmount,
        targetDate: args.goal.targetDate,
        rationale: args.goal.rationale,
      },
      strategy: args.strategy,
      milestones: Array.isArray(args.milestones) ? args.milestones : [],
      insights: Array.isArray(args.insights) ? args.insights : [],
      projections: {
        monthlyRequired: args.projections.monthlyRequired,
        projectedFinalAmount: args.projections.projectedFinalAmount,
        incomeReplacement: args.projections.incomeReplacement,
        confidenceLevel: args.projections.confidenceLevel,
      },
      advisorMessages: {
        planMessage: args.advisorMessages.planMessage,
        insightsMessage: args.advisorMessages.insightsMessage,
        nextStepsMessage: args.advisorMessages.nextStepsMessage,
      },
      financialProfile: {
        profileDescription: args.financialProfile.profileDescription,
        profileData: args.financialProfile.profileData,
      },
    };

    this.logger.info(
      "AI response structure validated - using exact AI values",
      {
        targetAmount: response.goal.targetAmount,
        monthlyRequired: response.projections.monthlyRequired,
        targetDate: response.goal.targetDate,
      },
    );

    return response;
  }

  // All validation methods removed - AI is responsible for providing correct data

  // No extraction methods - AI is single source of truth for all data processing

  // Utility methods removed - no longer needed without fallback responses

  private handleAIFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.circuitBreakerState = "OPEN";
      this.logger.warn("Circuit breaker opened due to repeated failures", {
        failureCount: this.failureCount,
        error: error.message,
      });
    }
  }
}
