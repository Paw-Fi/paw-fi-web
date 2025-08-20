// Financial Goal Orchestrator - Core Business Logic
// Handles ACID transactions and coordinates AI generation with database persistence

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AIService } from "./ai-service.ts";
import { DatabaseService } from "./database-service.ts";
import { DataMapper } from "./data-mapper.ts";
import { Logger } from "./logger.ts";

interface GoalGenerationResult {
  goal: any;
  milestones: any[];
  profile: any;
  strategy: string;
  insights: any[];
  projections: any;
  advisorMessages: any;
}

export class FinancialGoalOrchestrator {
  private aiService: AIService;
  private databaseService: DatabaseService;
  private dataMapper: DataMapper;

  constructor(
    private supabaseClient: SupabaseClient,
    private logger: Logger
  ) {
    this.aiService = new AIService(logger);
    this.databaseService = new DatabaseService(supabaseClient, logger);
    this.dataMapper = new DataMapper();
  }

  async generateFinancialGoal(
    userId: string | null,
    goalType: string,
    questionnaireAnswers: Record<string, any>,
    requestId: string
  ): Promise<GoalGenerationResult> {
    
    this.logger.info("Starting goal generation orchestration", {
      requestId,
      userId: userId || "guest",
      goalType
    });

    try {
      // Step 1: Start database transaction
      this.logger.debug("Starting database transaction", { requestId });
      
      // Step 2: Generate AI response with structured schema
      this.logger.debug("Generating AI response", { requestId });
      const aiResponse = await this.aiService.generateGoalPlan(
        goalType,
        questionnaireAnswers
      );

      // Step 3: Map AI response to database entities
      this.logger.debug("Mapping AI response to database entities", { requestId });
      const mappedData = this.dataMapper.mapAIResponseToEntities(
        aiResponse,
        userId,
        goalType,
        questionnaireAnswers
      );

      // Step 4: Execute database operations in transaction
      this.logger.debug("Persisting data to database", { requestId });
      const persistedData = await this.databaseService.saveGoalData(
        mappedData,
        requestId
      );

      this.logger.info("Goal generation orchestration completed", {
        requestId,
        goalId: persistedData.goal.id,
        profileId: persistedData.profile.id,
        milestonesCount: persistedData.milestones.length
      });

      // Step 5: Return structured result
      return {
        goal: persistedData.goal,
        milestones: persistedData.milestones,
        profile: persistedData.profile,
        strategy: aiResponse.strategy,
        insights: aiResponse.insights || [],
        projections: aiResponse.projections,
        advisorMessages: aiResponse.advisorMessages
      };

    } catch (error) {
      this.logger.error("Goal generation orchestration failed", {
        requestId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}