import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

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
        ({ data, error } = await supabaseClient
          .from('goal_milestones')
          .update(updateData)
          .eq('id', payload.id)
          .select()
          .single());
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

    return new Response(JSON.stringify(data), {
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
