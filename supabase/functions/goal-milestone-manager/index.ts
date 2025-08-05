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

interface MilestoneManagerRequest {
  action: 'create' | 'update' | 'delete' | 'reorder';
  payload: any;
  userId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, payload, userId }: MilestoneManagerRequest = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data, error;

    switch (action) {
      case 'create':
        // First, get the current max display_order for the goal
        const { data: maxOrderData, error: maxOrderError } = await supabaseClient
          .from('goal_milestones')
          .select('display_order')
          .eq('goal_id', payload.goal_id)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        if (maxOrderError && maxOrderError.code !== 'PGRST116') { // Ignore 'range not found' error
          throw maxOrderError;
        }

        const newDisplayOrder = maxOrderData ? maxOrderData.display_order + 1 : 0;

        // Now, insert the new milestone with the correct display_order
                        const { user_id, ...milestoneData } = payload;
        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .insert({ ...milestoneData, display_order: newDisplayOrder })
          .select()
          .single());
        break;

      case 'update':
        const { user_id: uId, ...updateData } = payload;
        
        // Get the current milestone data before updating (for activity logging)
        let currentMilestone = null;
        if (updateData.status) {
          const { data: currentData, error: currentError } = await supabaseClient
            .from('goal_milestones')
            .select('*, financial_goals(title)')
            .eq('id', payload.id)
            .single();
            
          if (!currentError) {
            currentMilestone = currentData;
          }
        }
        
        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .update(updateData)
          .eq('id', payload.id)
          .select('*, financial_goals(title)')
          .single());
          
        // Log activity if milestone was completed
        if (data && currentMilestone && updateData.status === 'completed' && currentMilestone.status !== 'completed') {
          const activityData: ActivityData = {
            type: 'milestone',
            action: actions.MILESTONE_COMPLETED,
            source: 'goal-milestone-manager',
            metadata: {
              milestoneId: data.id,
              goalId: data.goal_id,
              goalTitle: data.financial_goals?.title || 'Goal',
              milestoneTitle: data.title,
              milestonePriority: data.priority,
              milestoneType: data.milestone_type,
              targetAmount: data.target_amount,
            },
            timestamp: new Date().toISOString(),
          };
          
          // Log the activity (don't await to avoid blocking the response)
          logUserActivity(supabaseClient, userId, activityData).catch(error => {
            console.error('Failed to log milestone completion activity:', error);
          });
        }
        break;

      case 'delete':
                ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .delete()
          .eq('id', payload.id));
        break;
      
      case 'reorder':
        const updates = payload.map((item: {id: string; display_order: number}) => 
          supabaseClient
            .from('goal_milestones')
            .update({ display_order: item.display_order })
            .eq('id', item.id)
        );
        const results = await Promise.all(updates);
        const firstError = results.find(res => res.error);
        if (firstError) {
          error = firstError.error;
        } else {
          data = results.map(res => res.data);
        }
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate appropriate message based on the action
    let responseMessage = "";
    let goalId = "";
    
    switch (action) {
      case 'create':
        if (data && data.goal_id) {
          goalId = data.goal_id;
          responseMessage = `📋 **Milestone created!** Added "${data.title}" to your goal. This will help you stay on track!`;
        }
        break;
      case 'update':
        if (data && data.goal_id) {
          goalId = data.goal_id;
          if (data.status === 'completed') {
            responseMessage = `✅ **Milestone completed!** Great job completing "${data.title}". You're making excellent progress!`;
          } else {
            responseMessage = `📝 **Milestone updated!** Your milestone "${data.title}" has been successfully updated.`;
          }
        }
        break;
      case 'delete':
        // For delete, we need to get the goal_id from payload since data will be null
        goalId = payload.goal_id;
        responseMessage = `🗑️ **Milestone deleted!** The milestone has been removed from your goal.`;
        break;
      case 'reorder':
        // For reorder, get goal_id from the first item in payload
        if (payload && payload.length > 0 && payload[0].goal_id) {
          goalId = payload[0].goal_id;
          responseMessage = `🔄 **Milestones reordered!** Your milestone order has been updated successfully.`;
        }
        break;
    }
    
    // Add goal button if we have a goalId
    if (goalId && responseMessage) {
      responseMessage += `\n\n\`\`GOAL:${goalId}\`\``;
    }

    return new Response(JSON.stringify({
      success: true,
      data: data,
      message: responseMessage || undefined
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
