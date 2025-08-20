// Bulletproof AI Goal Generator - Enterprise Architecture
// Single-purpose, robust, ACID-compliant financial goal generation system

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { FinancialGoalOrchestrator } from "./orchestrator.ts";
import { Logger } from "./logger.ts";
import { RequestValidator } from "./validator.ts";
import { ErrorHandler } from "./error-handler.ts";

// Initialize core services
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const logger = new Logger("ai-goal-generator");
const validator = new RequestValidator();
const errorHandler = new ErrorHandler(logger);
const orchestrator = new FinancialGoalOrchestrator(supabaseClient, logger);

interface GoalGenerationRequest {
  userId?: string | null;
  goalType: string;
  questionnaireAnswers: Record<string, any>;
}

serve(async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  logger.info("Request received", { requestId, method: req.method });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      service: "ai-goal-generator",
      status: "healthy",
      version: "2.0.0",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method !== "POST") {
    return errorHandler.handleError(
      new Error("Method not allowed"),
      "METHOD_NOT_ALLOWED",
      405,
      requestId
    );
  }

  try {
    // Parse and validate request
    const body = await req.json();
    const request: GoalGenerationRequest = {
      userId: body.userId !== undefined ? body.userId : null,
      goalType: body.goalType,
      questionnaireAnswers: body.questionnaireAnswers || {}
    };

    // Validate request structure
    const validationResult = validator.validateRequest(request);
    if (!validationResult.isValid) {
      return errorHandler.handleError(
        new Error(`Validation failed: ${validationResult.errors.join(", ")}`),
        "VALIDATION_ERROR",
        400,
        requestId
      );
    }

    logger.info("Processing goal generation", {
      requestId,
      userId: request.userId || "guest",
      userIdType: typeof request.userId,
      userIdReceived: body.userId,
      userIdReceivedType: typeof body.userId,
      goalType: request.goalType
    });

    // Execute goal generation through orchestrator
    const result = await orchestrator.generateFinancialGoal(
      request.userId ?? null,
      request.goalType,
      request.questionnaireAnswers,
      requestId
    );

    logger.info("Goal generation completed successfully", {
      requestId,
      goalId: result.goal.id,
      profileId: result.profile.id
    });

    // Success response
    return new Response(JSON.stringify({
      success: true,
      goal: result.goal,
      milestones: result.milestones,
      profile: result.profile,
      strategy: result.strategy,
      insights: result.insights,
      projections: result.projections,
      advisorMessages: result.advisorMessages,
      message: `Successfully created your ${result.goal.title} with target of $${result.goal.target_amount.toLocaleString()}.`,
      requestId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return errorHandler.handleError(error, "INTERNAL_ERROR", 500, requestId);
  }
});