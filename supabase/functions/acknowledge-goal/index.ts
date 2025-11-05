import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface AcknowledgeGoalRequest {
  userId: string;
  goalId: string;
}

serve(async (req: Request): Promise<Response> => {
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
    const body: AcknowledgeGoalRequest = await req.json();

    if (!body.userId || !body.goalId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, goalId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = body.userId;
    const goalId = body.goalId;

    // Get goal details
    const { data: goal, error: goalError } = await supabaseClient
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .single();

    if (goalError || !goal) {
      return new Response(
        JSON.stringify({ error: "Goal not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already acknowledged
    if (goal.acknowledged_by?.includes(userId)) {
      return new Response(
        JSON.stringify({
          success: true,
          goal,
          message: "Goal already acknowledged",
          alreadyAcknowledged: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call acknowledge_goal function
    const { error: rpcError } = await supabaseClient.rpc("acknowledge_goal", {
      p_goal_id: goalId,
      p_user_id: userId,
    });

    if (rpcError) {
      console.error("Acknowledge goal error:", rpcError);
      return new Response(
        JSON.stringify({
          error: "Failed to acknowledge goal",
          details: rpcError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get updated goal
    const { data: updatedGoal } = await supabaseClient
      .from("financial_goals")
      .select("*")
      .eq("id", goalId)
      .single();

    // Create notification for goal owner
    if (goal.user_id !== userId) {
      await supabaseClient.from("notifications").insert({
        user_id: goal.user_id,
        type: "goal_acknowledged",
        title: "Goal Acknowledged",
        message: `Your goal "${goal.title}" has been acknowledged`,
        data: {
          goalId: goalId,
          acknowledgedBy: userId,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        goal: updatedGoal,
        message: "Goal acknowledged successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Internal Server Error:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
