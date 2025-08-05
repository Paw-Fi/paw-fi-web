import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { Action, RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { logUserActivity, type ActivityData } from "../shared/activity-logger.ts";

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

interface ProgressUpdateRequest {
  goalId: string;
  milestoneId?: string;
  updateType: Action;
  amountChange?: number;
  userNote?: string;
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const requestData: ProgressUpdateRequest = await req.json();
    let { goalId, milestoneId, updateType, amountChange, userNote, userId } = requestData;

    if (!goalId || !updateType || !userId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: goalId, updateType, and userId are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing progress update for goal: ${goalId}, type: ${updateType}`);

    // Get current goal state
    const { data: goal, error: goalError } = await supabaseClient
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (goalError || !goal) {
      console.error("Goal not found:", goalError);
      return new Response(
        JSON.stringify({ 
          error: "Goal not found or access denied",
          details: goalError?.message 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let newAmount = goal.current_amount;
    let milestoneUpdate: { id: string; status: string; progress_percentage: number; completed_date: string; } | null = null;

    // Handle different update types
    switch (updateType) { 

      case RewardActions.GOAL_PROGRESS_UPDATED:
        // Handle basic amount additions/subtractions
        if (amountChange !== undefined) {
          newAmount += amountChange;
        }
        break;

      case RewardActions.MILESTONE_COMPLETED:
        if (!milestoneId) {
          return new Response(
            JSON.stringify({ error: "milestoneId is required for milestone_completed updates" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Get milestone data
        const { data: milestone, error: milestoneError } = await supabaseClient
          .from("goal_milestones")
          .select("*")
          .eq("id", milestoneId)
          .eq("goal_id", goalId)
          .single();

        if (milestoneError || !milestone) {
          return new Response(
            JSON.stringify({ 
              error: "Milestone not found",
              details: milestoneError?.message 
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        milestoneUpdate = {
          id: milestoneId,
          status: 'completed',
          progress_percentage: 100,
          completed_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        };

        // Calculate the remaining amount to complete the milestone
        const remainingAmount = (milestone.target_amount || 0) - (milestone.current_amount || 0);
        if (remainingAmount > 0) {
          newAmount += remainingAmount;
        }

        // The amount change for the progress record is the remaining amount
        if (amountChange === undefined && remainingAmount > 0) {
          amountChange = remainingAmount;
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Invalid update type: ${updateType}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Ensure amount doesn't go negative
    newAmount = Math.max(0, newAmount);

    // Calculate new progress percentage
    const newProgressPercentage = Math.min((newAmount / goal.target_amount) * 100, 100);
    
    // Calculate if goal is on track
    const isOnTrack = calculateOnTrackStatus(goal, newAmount, newProgressPercentage);

    console.log(`Updating goal ${goalId}: ${goal.current_amount} -> ${newAmount} (${newProgressPercentage.toFixed(2)}%)`);

    // Start database transaction by creating all updates
    const tasks: Promise<any>[] = [];

    // Update goal
    tasks.push(
      supabaseClient
        .from("financial_goals")
        .update({
          current_amount: newAmount,
          progress_percentage: Math.round(newProgressPercentage * 100) / 100, // Round to 2 decimal places
          is_on_track: isOnTrack,
          updated_at: new Date().toISOString(),
          ...(newProgressPercentage >= 100 && { 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
        })
        .eq("id", goalId)
        .select()
    );

    // Update milestone if needed
    if (milestoneUpdate) {
      tasks.push(
        supabaseClient
          .from("goal_milestones")
          .update({
            status: milestoneUpdate.status,
            progress_percentage: milestoneUpdate.progress_percentage,
            completed_date: milestoneUpdate.completed_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", milestoneId)
          .select()
      );
    }

    // Record progress update
    tasks.push(
      supabaseClient
        .from("goal_progress_updates")
        .insert({
          goal_id: goalId,
          milestone_id: milestoneId || null,
          update_type: updateType,
          amount_change: amountChange || null,
          previous_amount: goal.current_amount,
          new_amount: newAmount,
          user_note: userNote || null,
          created_by: userId,
        })
        .select()
    );

    // Determine activity type for logging
    let activityType = 'goal_progress';
    let activityAction = RewardActions.GOAL_PROGRESS_UPDATED;

    if (newProgressPercentage >= 100 && goal.status !== 'completed') {
      activityType = 'goal_completed';
      activityAction = RewardActions.GOAL_COMPLETED;
    } else if (updateType === RewardActions.MILESTONE_COMPLETED) {
      activityType = 'milestone_completed';
      activityAction = RewardActions.MILESTONE_COMPLETED;
    }

    // Add user activity tracking using shared logger
    const activityData: ActivityData = {
      type: activityType,
      action: activityAction,
      source: 'goal-progress-tracker',
      metadata: {
        goalId,
        milestoneId: milestoneId || undefined,
        amountChange: amountChange || 0,
        newProgressPercentage: Math.round(newProgressPercentage * 100) / 100,
        isOnTrack,
      },
    };
    
    // Log activity asynchronously (don't block the main update)
    logUserActivity(supabaseClient, userId, activityData).catch(error => {
      console.error('[goal-progress-tracker] Failed to log activity:', error);
    });

    // Execute all updates
    const results = await Promise.all(tasks);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error("Update errors:", errors);
      return new Response(
        JSON.stringify({ 
          error: "Failed to update progress", 
          details: errors.map(e => e.error?.message).join(", ") 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updatedGoalResult = results[0];
    const updatedGoal = updatedGoalResult.data?.[0];

    let updatedMilestone = null;
    let progressUpdate = null;

    if (milestoneUpdate) {
      updatedMilestone = results[1].data?.[0];
      progressUpdate = results[2].data?.[0];
    } else {
      progressUpdate = results[1].data?.[0];
    }

    // Trigger insights generation if significant progress (>= 10% change)
    const progressDelta = newProgressPercentage - goal.progress_percentage;
    if (progressDelta >= 10 || newProgressPercentage >= 100) {
      console.log(`Significant progress detected (${progressDelta.toFixed(2)}%), triggering insights generation`);
      
      // Call insights generator function (fire and forget)
      supabaseClient.functions.invoke('goal-insights-generator', {
        body: { goalId, userId },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      goal: updatedGoal,
      milestone: updatedMilestone,
      progressUpdate: progressUpdate,
      metrics: {
        previousAmount: goal.current_amount,
        newAmount,
        newProgressPercentage: Math.round(newProgressPercentage * 100) / 100,
        isOnTrack,
        progressDelta: Math.round(progressDelta * 100) / 100,
        isCompleted: newProgressPercentage >= 100,
      },
      debug: {
        message: "Progress updated successfully",
        timestamp: new Date().toISOString(),
        updateType,
        triggeredInsights: progressDelta >= 10 || newProgressPercentage >= 100,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateOnTrackStatus(goal: any, currentAmount: number, progressPercentage: number): boolean {
  try {
    const startDate = new Date(goal.start_date);
    const targetDate = new Date(goal.target_date);
    const currentDate = new Date();

    // Calculate total days and days passed
    const daysTotal = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Avoid division by zero or negative values
    if (daysTotal <= 0 || daysPassed < 0) {
      return true; // Default to on track for edge cases
    }

    // If we're past the target date, only on track if completed
    if (daysPassed >= daysTotal) {
      return progressPercentage >= 100;
    }

    // Calculate expected progress based on time elapsed
    const expectedProgress = (daysPassed / daysTotal) * 100;
    
    // Allow 20% tolerance (goal is on track if current progress >= 80% of expected)
    return progressPercentage >= (expectedProgress * 0.8);
  } catch (error) {
    console.warn("Error calculating on-track status:", error);
    return true; // Default to on track if calculation fails
  }
}