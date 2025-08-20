// Database Service - ACID Transaction Management
// Handles all database operations with proper transaction boundaries and rollback

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Logger } from "./logger.ts";

interface MappedGoalData {
  profile: {
    user_id: string | null;
    profile_description: string;
    quiz_answers: Record<string, any>;
    profile_data: Record<string, any>;
  };
  goal: {
    user_id: string | null;
    title: string;
    description: string;
    goal_type: string;
    target_amount: number;
    target_date: string;
    ai_questionnaire_data: Record<string, any>;
    ai_generated_strategy: string;
    ai_generated_milestones: any[];
    ai_advisor_messages: any;
  };
  milestones: Array<{
    title: string;
    description: string;
    milestone_type: string;
    target_amount: number | null;
    due_date: string;
    habit_description: string | null;
    frequency: string | null;
    habit_target_value: number | null;
    is_ai_generated: boolean;
    display_order: number;
    priority: string;
  }>;
  insights: Array<{
    insight_type: string;
    title: string;
    content: string;
    priority: string;
    is_ai_generated: boolean;
    ai_confidence_score: number;
  }>;
}

interface PersistedGoalData {
  profile: any;
  goal: any;
  milestones: any[];
  insights: any[];
}

export class DatabaseService {
  constructor(
    private supabaseClient: SupabaseClient,
    private logger: Logger
  ) {}

  async saveGoalData(
    mappedData: MappedGoalData,
    requestId: string
  ): Promise<PersistedGoalData> {
    
    this.logger.debug("Starting database transaction", { requestId });
    
    // Use Supabase's built-in transaction handling through RPC
    try {
      // Execute the complete goal creation as a single database transaction
      const { data, error } = await this.supabaseClient.rpc(
        'create_complete_financial_goal',
        {
          p_user_id: mappedData.profile.user_id,
          p_profile_data: mappedData.profile,
          p_goal_data: mappedData.goal,
          p_milestones_data: mappedData.milestones,
          p_insights_data: mappedData.insights,
          p_request_id: requestId
        }
      );

      if (error) {
        this.logger.error("Database transaction failed", {
          requestId,
          error: error.message,
          code: error.code
        });
        throw new Error(`Database transaction failed: ${error.message}`);
      }

      this.logger.info("Database transaction completed successfully", {
        requestId,
        goalId: data.goal_id,
        profileId: data.profile_id,
        milestonesCount: data.milestones_count,
        insightsCount: data.insights_count
      });

      // Fetch the created records for response
      return await this.fetchCreatedRecords(data.goal_id, data.profile_id, requestId);

    } catch (error) {
      this.logger.error("Database operation failed", {
        requestId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private async fetchCreatedRecords(
    goalId: string,
    profileId: string,
    requestId: string
  ): Promise<PersistedGoalData> {
    
    this.logger.debug("Fetching created records", { requestId, goalId, profileId });

    try {
      // Fetch all created records in parallel
      const [profileResult, goalResult, milestonesResult, insightsResult] = await Promise.all([
        this.supabaseClient
          .from('financial_health_profiles')
          .select('*')
          .eq('id', profileId)
          .single(),
        
        this.supabaseClient
          .from('financial_goals')
          .select('*')
          .eq('id', goalId)
          .single(),
        
        this.supabaseClient
          .from('goal_milestones')
          .select('*')
          .eq('goal_id', goalId)
          .order('display_order'),
        
        this.supabaseClient
          .from('goal_insights')
          .select('*')
          .eq('goal_id', goalId)
          .order('created_at')
      ]);

      // Check for errors
      if (profileResult.error) {
        throw new Error(`Failed to fetch profile: ${profileResult.error.message}`);
      }
      if (goalResult.error) {
        throw new Error(`Failed to fetch goal: ${goalResult.error.message}`);
      }
      if (milestonesResult.error) {
        throw new Error(`Failed to fetch milestones: ${milestonesResult.error.message}`);
      }
      if (insightsResult.error) {
        throw new Error(`Failed to fetch insights: ${insightsResult.error.message}`);
      }

      this.logger.debug("Successfully fetched all created records", {
        requestId,
        milestonesCount: milestonesResult.data.length,
        insightsCount: insightsResult.data.length
      });

      return {
        profile: profileResult.data,
        goal: goalResult.data,
        milestones: milestonesResult.data,
        insights: insightsResult.data
      };

    } catch (error) {
      this.logger.error("Failed to fetch created records", {
        requestId,
        error: error.message
      });
      throw error;
    }
  }

  // Health check method for database connectivity
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('financial_goals')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      this.logger.error("Database health check failed", { error: error.message });
      return false;
    }
  }
}