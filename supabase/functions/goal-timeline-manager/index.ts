import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { logUserActivity, type ActivityData } from "../shared/activity-logger.ts";
import { actions } from "../shared/update-reward-actions/reward-actions.ts";

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

interface TimelineManagerRequest {
  action: 'update_timeline' | 'extend_timeline' | 'adjust_target' | 'change_status' | 'change_priority' | 'optimize_timeline' | 'validate_timeline';
  goalId: string;
  userId: string;
  payload: {
    target_date?: string;
    original_target_date?: string;
    target_amount?: number;
    new_status?: string;
    new_priority?: string;
    reason?: string;
    auto_generated?: boolean;
    metadata?: {
      [key: string]: any;
    };
  };
}

interface GoalUpdateData {
  target_date?: string;
  target_amount?: number;
  status?: string;
  priority?: string;
  updated_at?: string;
  completed_at?: string;
  [key: string]: any;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, goalId, userId, payload }: TimelineManagerRequest = await req.json();

    console.log(`[goal-timeline-manager] Processing ${action} for goal ${goalId}`);

    // Input validation
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!goalId) {
      return new Response(JSON.stringify({ error: 'Goal ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validActions = ['update_timeline', 'extend_timeline', 'adjust_target', 'change_status', 'change_priority', 'optimize_timeline', 'validate_timeline'];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Valid actions: ${validActions.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload && action !== 'optimize_timeline' && action !== 'validate_timeline') {
      return new Response(JSON.stringify({ error: 'Payload is required for this action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate specific payload requirements
    if (payload) {
      // Validate target_amount if provided
      if (payload.target_amount !== undefined && (typeof payload.target_amount !== 'number' || payload.target_amount <= 0)) {
        return new Response(JSON.stringify({ error: 'Target amount must be a positive number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate target_date if provided
      if (payload.target_date && isNaN(Date.parse(payload.target_date))) {
        return new Response(JSON.stringify({ error: 'Invalid target date format. Use YYYY-MM-DD' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate target_date is in the future
      if (payload.target_date && new Date(payload.target_date) <= new Date()) {
        return new Response(JSON.stringify({ error: 'Target date must be in the future' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate status values
      if (payload.new_status && !['active', 'paused', 'completed', 'cancelled'].includes(payload.new_status)) {
        return new Response(JSON.stringify({ error: 'Invalid status. Valid values: active, paused, completed, cancelled' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate priority values
      if (payload.new_priority && !['low', 'medium', 'high', 'critical'].includes(payload.new_priority)) {
        return new Response(JSON.stringify({ error: 'Invalid priority. Valid values: low, medium, high, critical' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // First, fetch the current goal to get existing data and calculate changes
    const { data: currentGoal, error: fetchError } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching goal:', fetchError);
      return new Response(JSON.stringify({ error: 'Goal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updateData: GoalUpdateData = {
      updated_at: new Date().toISOString(),
    };
    let activityAction: string = '';
    let activityMetadata: any = {
      goalId,
      goalTitle: currentGoal.title,
    };

    switch (action) {
      case 'update_timeline':
        if (!payload.target_date) {
          return new Response(JSON.stringify({ error: 'Target date is required for timeline update' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        updateData.target_date = payload.target_date;
        activityAction = actions.GOAL_TIMELINE_UPDATED;
        
        const originalDate = new Date(currentGoal.target_date);
        const newDate = new Date(payload.target_date);
        const daysDifference = Math.ceil((newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));
        
        activityMetadata = {
          ...activityMetadata,
          originalTargetDate: currentGoal.target_date,
          newTargetDate: payload.target_date,
          daysDifference,
          isExtension: daysDifference > 0,
          reason: payload.reason,
          autoGenerated: payload.auto_generated || false,
        };
        break;

      case 'extend_timeline':
        if (!payload.target_date) {
          return new Response(JSON.stringify({ error: 'New target date is required for timeline extension' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        updateData.target_date = payload.target_date;
        activityAction = actions.GOAL_TIMELINE_EXTENDED;
        
        const extensionDays = Math.ceil((new Date(payload.target_date).getTime() - new Date(currentGoal.target_date).getTime()) / (1000 * 60 * 60 * 24));
        
        activityMetadata = {
          ...activityMetadata,
          originalTargetDate: currentGoal.target_date,
          newTargetDate: payload.target_date,
          extensionDays,
          reason: payload.reason,
          autoGenerated: payload.auto_generated || false,
        };
        break;

      case 'adjust_target':
        // Handle target amount changes
        if (payload.target_amount !== undefined) {
          updateData.target_amount = payload.target_amount;
        }
        
        // Handle target date changes
        if (payload.target_date) {
          updateData.target_date = payload.target_date;
        }
        
        // Include any additional metadata from payload
        if (payload.metadata) {
          Object.assign(updateData, payload.metadata);
        }

        activityAction = actions.GOAL_TARGET_ADJUSTED;
        
        // Determine adjustment type based on what was changed
        let adjustmentType = 'general';
        if (payload.target_amount !== undefined && payload.target_date) {
          adjustmentType = 'amount_and_timeline';
        } else if (payload.target_amount !== undefined) {
          adjustmentType = 'target_amount';
        } else if (payload.target_date) {
          adjustmentType = 'timeline';
        }
        
        activityMetadata = {
          ...activityMetadata,
          originalTargetDate: currentGoal.target_date,
          newTargetDate: payload.target_date,
          originalTargetAmount: currentGoal.target_amount,
          newTargetAmount: payload.target_amount,
          adjustmentType,
          reason: payload.reason,
          autoGenerated: payload.auto_generated || false,
          ...payload.metadata,
        };
        break;

      case 'change_status':
        if (!payload.new_status) {
          return new Response(JSON.stringify({ error: 'New status is required for status change' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        updateData.status = payload.new_status;

        // Set completion date if marking as completed
        if (payload.new_status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        } else if (payload.new_status !== 'completed' && currentGoal.completed_at) {
          // Remove completion date if unmarking as completed
          updateData.completed_at = null;
        }

        activityAction = actions.GOAL_TARGET_ADJUSTED;
        activityMetadata = {
          ...activityMetadata,
          adjustmentType: 'status_change',
          oldStatus: currentGoal.status,
          newStatus: payload.new_status,
          reason: payload.reason || `Goal status changed to ${payload.new_status}`,
          autoGenerated: payload.auto_generated || false,
        };
        break;

      case 'change_priority':
        if (!payload.new_priority) {
          return new Response(JSON.stringify({ error: 'New priority is required for priority change' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        updateData.priority = payload.new_priority;

        activityAction = actions.GOAL_TARGET_ADJUSTED;
        activityMetadata = {
          ...activityMetadata,
          adjustmentType: 'priority_change',
          oldPriority: currentGoal.priority,
          newPriority: payload.new_priority,
          reason: payload.reason || `Goal priority changed to ${payload.new_priority}`,
          autoGenerated: payload.auto_generated || false,
        };
        break;

      case 'optimize_timeline':
        // Calculate optimized timeline based on current progress
        const currentProgress = currentGoal.current_amount || 0;
        const targetAmount = currentGoal.target_amount;
        const progressRate = currentProgress / Math.max(1, (Date.now() - new Date(currentGoal.created_at).getTime()) / (1000 * 60 * 60 * 24));
        
        if (progressRate > 0 && targetAmount > currentProgress) {
          const remainingAmount = targetAmount - currentProgress;
          const daysNeeded = Math.ceil(remainingAmount / progressRate);
          const optimizedDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
          
          updateData.target_date = optimizedDate.toISOString().split('T')[0];
          
          activityAction = actions.GOAL_TIMELINE_UPDATED;
          activityMetadata = {
            ...activityMetadata,
            originalTargetDate: currentGoal.target_date,
            newTargetDate: updateData.target_date,
            adjustmentType: 'optimization',
            progressRate: progressRate.toFixed(2),
            daysNeeded,
            reason: payload.reason || 'Timeline optimized based on current progress rate',
            autoGenerated: true,
          };
        } else {
          return new Response(JSON.stringify({ error: 'Cannot optimize timeline - insufficient progress data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;

      case 'validate_timeline':
        // Validate if current timeline is realistic
        const currentProgressValidation = currentGoal.current_amount || 0;
        const targetAmountValidation = currentGoal.target_amount;
        const daysRemaining = Math.ceil((new Date(currentGoal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const requiredDailyProgress = (targetAmountValidation - currentProgressValidation) / Math.max(1, daysRemaining);
        
        // Calculate historical daily progress
        const daysSinceStart = Math.max(1, (Date.now() - new Date(currentGoal.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const historicalDailyProgress = currentProgressValidation / daysSinceStart;
        
        const isRealistic = requiredDailyProgress <= historicalDailyProgress * 1.5; // Allow 50% increase
        
        // Don't update the goal, just return validation results
        return new Response(JSON.stringify({
          success: true,
          validation: {
            isRealistic,
            daysRemaining,
            requiredDailyProgress: requiredDailyProgress.toFixed(2),
            historicalDailyProgress: historicalDailyProgress.toFixed(2),
            recommendedTargetDate: isRealistic ? currentGoal.target_date : 
              new Date(Date.now() + Math.ceil((targetAmountValidation - currentProgressValidation) / historicalDailyProgress) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          message: isRealistic ? 
            "✅ **Timeline looks realistic!** Your current progress rate suggests you're on track to meet your goal." :
            "⚠️ **Timeline may need adjustment.** Based on your progress, consider extending your deadline for a more achievable target."
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Update the goal in the database
    const { data, error } = await supabaseClient
      .from('financial_goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the activity
    const activityData: ActivityData = {
      type: 'goal_management',
      action: activityAction,
      source: 'goal-timeline-manager',
      metadata: activityMetadata,
      timestamp: new Date().toISOString(),
    };
    
    const activityResult = await logUserActivity(supabaseClient, userId, activityData);

    if (!activityResult.success) {
      console.error('Failed to log activity:', activityResult.error);
      // Don't fail the request, just log the error
    }

    console.log(`[goal-timeline-manager] Successfully processed ${action} for goal ${goalId}`);

    // Generate appropriate message based on the action
    let responseMessage = "";
    
    switch (action) {
      case 'update_timeline':
        const newDate = new Date(data.target_date).toLocaleDateString();
        responseMessage = `📅 **Timeline updated!** Your goal "${data.title}" target date has been updated to ${newDate}.`;
        break;
      case 'extend_timeline':
        const extendedDate = new Date(data.target_date).toLocaleDateString();
        responseMessage = `⏰ **Timeline extended!** Your goal "${data.title}" has been extended to ${extendedDate}. You've got more time to reach your target!`;
        break;
      case 'adjust_target':
        // Generate message based on what was adjusted
        const adjustmentType = activityMetadata.adjustmentType;
        if (adjustmentType === 'target_amount') {
          const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.target_amount);
          responseMessage = `💰 **Target amount updated!** Your goal "${data.title}" target amount has been updated to ${formattedAmount}.`;
        } else if (adjustmentType === 'amount_and_timeline') {
          const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.target_amount);
          const adjustedDate = new Date(data.target_date).toLocaleDateString();
          responseMessage = `🎯 **Goal updated!** Your goal "${data.title}" target amount is now ${formattedAmount} with a target date of ${adjustedDate}.`;
        } else {
          const adjustedDate = new Date(data.target_date).toLocaleDateString();
          responseMessage = `📅 **Goal adjusted!** Your goal "${data.title}" target date has been updated to ${adjustedDate}.`;
        }
        break;
      case 'change_status':
        const statusEmoji = {
          'active': '🎯',
          'paused': '⏸️',
          'completed': '✅',
          'cancelled': '❌'
        }[data.status] || '📝';
        responseMessage = `${statusEmoji} **Status updated!** Your goal "${data.title}" is now ${data.status}.`;
        break;
      case 'change_priority':
        const priorityEmoji = {
          'low': '🔵',
          'medium': '🟡',
          'high': '🟠',
          'critical': '🔴'
        }[data.priority] || '📝';
        responseMessage = `${priorityEmoji} **Priority updated!** Your goal "${data.title}" priority is now ${data.priority}.`;
        break;
      case 'optimize_timeline':
        const optimizedDate = new Date(data.target_date).toLocaleDateString();
        responseMessage = `🚀 **Timeline optimized!** Based on your progress rate, your goal "${data.title}" timeline has been optimized to ${optimizedDate}.`;
        break;
      default:
        const defaultDate = new Date(data.target_date).toLocaleDateString();
        responseMessage = `📅 **Goal timeline updated!** Your goal "${data.title}" target date is now ${defaultDate}.`;
    }
    
    responseMessage += `\n\n\`\`GOAL:${goalId}\`\``;

    return new Response(JSON.stringify({
      success: true,
      goal: data,
      message: responseMessage,
      activity_logged: activityResult.success,
      activity_id: activityResult.activity_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Function error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});