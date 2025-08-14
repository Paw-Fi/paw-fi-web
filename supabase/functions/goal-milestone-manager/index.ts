import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { logUserActivity, type ActivityData } from "../shared/activity-logger.ts";
import { actions } from "../shared/update-reward-actions/reward-actions.ts";

// Milestone template generator
function generateMilestoneTemplates(goalType: string, targetAmount: number, targetDate: string): any[] {
  const targetDateObj = new Date(targetDate);
  const currentDate = new Date();
  const totalDays = Math.ceil((targetDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (goalType) {
    case 'emergency_fund':
      const emergencyMilestones = [
        {
          title: 'First $500 Emergency Buffer',
          description: 'Build your initial emergency cushion for small unexpected expenses',
          milestone_type: 'amount',
          target_amount: Math.min(500, targetAmount * 0.1),
          due_date: new Date(currentDate.getTime() + (totalDays * 0.2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: 'One Month of Expenses Covered',
          description: 'Reach one month of essential expenses in your emergency fund',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.33,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.4) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: 'Three Months Security',
          description: 'Build three months of expenses for job loss protection',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.67,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium'
        },
        {
          title: 'Full Emergency Fund Complete',
          description: 'Achieve your complete emergency fund goal',
          milestone_type: 'amount',
          target_amount: targetAmount,
          due_date: targetDate,
          priority: 'medium'
        }
      ];
      return emergencyMilestones;
      
    case 'retirement':
      const retirementMilestones = [
        {
          title: 'First $1,000 Invested',
          description: 'Start your retirement investing journey',
          milestone_type: 'amount',
          target_amount: Math.min(1000, targetAmount * 0.05),
          due_date: new Date(currentDate.getTime() + (totalDays * 0.1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: '25% to Retirement Goal',
          description: 'Reach the first quarter of your retirement target',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.25,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium'
        },
        {
          title: 'Halfway to Financial Security',
          description: 'Achieve 50% of your retirement savings goal',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.5,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.6) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium'
        },
        {
          title: 'Retirement Goal Achievement',
          description: 'Complete your retirement savings target',
          milestone_type: 'amount',
          target_amount: targetAmount,
          due_date: targetDate,
          priority: 'low'
        }
      ];
      return retirementMilestones;
      
    case 'home_buying':
      const homeBuyingMilestones = [
        {
          title: 'Down Payment Foundation',
          description: 'Build the foundation of your down payment',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.3,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.4) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: 'Closing Costs Coverage',
          description: 'Save enough to cover estimated closing costs',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.6,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: 'Pre-approval Ready',
          description: 'Complete down payment and closing costs savings',
          milestone_type: 'amount',
          target_amount: targetAmount,
          due_date: targetDate,
          priority: 'medium'
        }
      ];
      return homeBuyingMilestones;
      
    case 'debt_payoff':
      const debtMilestones = [
        {
          title: 'First 25% Debt Eliminated',
          description: 'Pay off the first quarter of your debt',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.25,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.25) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: 'Halfway Debt Free',
          description: 'Eliminate 50% of your total debt',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.5,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high'
        },
        {
          title: 'Almost Debt Free',
          description: 'Pay off 75% of your debt',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.75,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.75) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium'
        },
        {
          title: 'Completely Debt Free',
          description: 'Achieve complete debt freedom',
          milestone_type: 'amount',
          target_amount: targetAmount,
          due_date: targetDate,
          priority: 'medium'
        }
      ];
      return debtMilestones;
      
    default:
      // Generic milestones for custom goals
      const genericMilestones = [
        {
          title: '25% Progress Milestone',
          description: 'Reach the first quarter of your goal',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.25,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium'
        },
        {
          title: 'Halfway Achievement',
          description: 'Reach 50% of your target amount',
          milestone_type: 'amount',
          target_amount: targetAmount * 0.5,
          due_date: new Date(currentDate.getTime() + (totalDays * 0.6) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium'
        },
        {
          title: 'Final Goal Achievement',
          description: 'Complete your savings goal',
          milestone_type: 'amount',
          target_amount: targetAmount,
          due_date: targetDate,
          priority: 'low'
        }
      ];
      return genericMilestones;
  }
}

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

interface MilestoneManagerRequest {
  action: 'create' | 'update' | 'delete' | 'reorder' | 'bulk_create' | 'bulk_update' | 'bulk_delete' | 'change_status' | 'change_priority' | 'create_template';
  payload: any;
  userId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, payload, userId }: MilestoneManagerRequest = await req.json();

    // Input validation
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validActions = ['create', 'update', 'delete', 'reorder', 'bulk_create', 'bulk_update', 'bulk_delete', 'change_status', 'change_priority', 'create_template'];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Valid actions: ${validActions.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload) {
      return new Response(JSON.stringify({ error: 'Payload is required' }), {
        status: 400,
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

      case 'bulk_create':
        // Validate payload is an array
        if (!Array.isArray(payload.milestones)) {
          return new Response(JSON.stringify({ error: 'Milestones array is required for bulk create' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get max display order for the goal
        const { data: maxOrderData_bulk, error: maxOrderError_bulk } = await supabaseClient
          .from('goal_milestones')
          .select('display_order')
          .eq('goal_id', payload.goal_id)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        if (maxOrderError_bulk && maxOrderError_bulk.code !== 'PGRST116') {
          throw maxOrderError_bulk;
        }

        let nextDisplayOrder = maxOrderData_bulk ? maxOrderData_bulk.display_order + 1 : 0;

        // Prepare milestones with proper display order
        const milestonesToCreate = payload.milestones.map((milestone: any, index: number) => ({
          ...milestone,
          goal_id: payload.goal_id,
          display_order: nextDisplayOrder + index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .insert(milestonesToCreate)
          .select());
        break;

      case 'bulk_update':
        // Validate payload has updates array
        if (!Array.isArray(payload.updates)) {
          return new Response(JSON.stringify({ error: 'Updates array is required for bulk update' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const bulkUpdatePromises = payload.updates.map((update: any) => 
          supabaseClient
            .from('goal_milestones')
            .update({ ...update.data, updated_at: new Date().toISOString() })
            .eq('id', update.id)
            .select()
            .single()
        );

        const bulkUpdateResults = await Promise.all(bulkUpdatePromises);
        const bulkUpdateError = bulkUpdateResults.find(res => res.error);
        if (bulkUpdateError) {
          error = bulkUpdateError.error;
        } else {
          data = bulkUpdateResults.map(res => res.data);
        }
        break;

      case 'bulk_delete':
        // Validate payload has milestone IDs
        if (!Array.isArray(payload.milestone_ids)) {
          return new Response(JSON.stringify({ error: 'Milestone IDs array is required for bulk delete' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .delete()
          .in('id', payload.milestone_ids)
          .select());
        break;

      case 'change_status':
        // Validate required fields
        if (!payload.milestone_id || !payload.new_status) {
          return new Response(JSON.stringify({ error: 'Milestone ID and new status are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const statusUpdate: any = { 
          status: payload.new_status, 
          updated_at: new Date().toISOString() 
        };

        // Set completion date if marking as completed
        if (payload.new_status === 'completed') {
          statusUpdate.completed_date = new Date().toISOString().split('T')[0];
          statusUpdate.progress_percentage = 100;
        }

        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .update(statusUpdate)
          .eq('id', payload.milestone_id)
          .select('*, financial_goals(title)')
          .single());
        break;

      case 'change_priority':
        // Validate required fields
        if (!payload.milestone_id || !payload.new_priority) {
          return new Response(JSON.stringify({ error: 'Milestone ID and new priority are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .update({ 
            priority: payload.new_priority,
            updated_at: new Date().toISOString()
          })
          .eq('id', payload.milestone_id)
          .select('*, financial_goals(title)')
          .single());
        break;

      case 'create_template':
        // Create milestone templates based on goal type
        if (!payload.goal_id || !payload.goal_type) {
          return new Response(JSON.stringify({ error: 'Goal ID and goal type are required for template creation' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const templates = generateMilestoneTemplates(payload.goal_type, payload.target_amount, payload.target_date);
        
        if (templates.length === 0) {
          return new Response(JSON.stringify({ error: 'No templates available for this goal type' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get max display order for proper ordering
        const { data: maxTemplateOrderData, error: maxTemplateOrderError } = await supabaseClient
          .from('goal_milestones')
          .select('display_order')
          .eq('goal_id', payload.goal_id)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        if (maxTemplateOrderError && maxTemplateOrderError.code !== 'PGRST116') {
          throw maxTemplateOrderError;
        }

        let nextTemplateOrder = maxTemplateOrderData ? maxTemplateOrderData.display_order + 1 : 0;

        const templatedMilestones = templates.map((template, index) => ({
          ...template,
          goal_id: payload.goal_id,
          display_order: nextTemplateOrder + index,
          is_ai_generated: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .insert(templatedMilestones)
          .select());
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
        goalId = payload.goal_id;
        responseMessage = `🗑️ **Milestone deleted!** The milestone has been removed from your goal.`;
        break;
      case 'reorder':
        if (payload && payload.length > 0 && payload[0].goal_id) {
          goalId = payload[0].goal_id;
          responseMessage = `🔄 **Milestones reordered!** Your milestone order has been updated successfully.`;
        }
        break;
      case 'bulk_create':
        goalId = payload.goal_id;
        const createdCount = Array.isArray(data) ? data.length : 1;
        responseMessage = `📋✨ **Bulk milestones created!** Successfully added ${createdCount} milestones to your goal. Your roadmap is ready!`;
        break;
      case 'bulk_update':
        const updatedCount = Array.isArray(data) ? data.length : 1;
        if (data && data[0] && data[0].goal_id) {
          goalId = data[0].goal_id;
        }
        responseMessage = `📝⚡ **Bulk update complete!** Successfully updated ${updatedCount} milestones. Your progress tracking is optimized!`;
        break;
      case 'bulk_delete':
        goalId = payload.goal_id;
        const deletedCount = Array.isArray(data) ? data.length : payload.milestone_ids.length;
        responseMessage = `🗑️💨 **Bulk deletion complete!** Removed ${deletedCount} milestones from your goal. Clean and focused!`;
        break;
      case 'change_status':
        if (data && data.goal_id) {
          goalId = data.goal_id;
          const statusEmoji = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'overdue': '⚠️',
            'cancelled': '❌'
          }[payload.new_status] || '📝';
          
          responseMessage = `${statusEmoji} **Status updated!** Milestone "${data.title}" is now ${payload.new_status.replace('_', ' ')}.`;
        }
        break;
      case 'change_priority':
        if (data && data.goal_id) {
          goalId = data.goal_id;
          const priorityEmoji = {
            'low': '🔵',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
          }[payload.new_priority] || '📝';
          
          responseMessage = `${priorityEmoji} **Priority updated!** Milestone "${data.title}" priority set to ${payload.new_priority}.`;
        }
        break;
      case 'create_template':
        goalId = payload.goal_id;
        const templateCount = Array.isArray(data) ? data.length : 1;
        responseMessage = `🎯✨ **Milestone template applied!** Created ${templateCount} smart milestones based on your ${payload.goal_type.replace('_', ' ')} goal. Your path to success is mapped out!`;
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
