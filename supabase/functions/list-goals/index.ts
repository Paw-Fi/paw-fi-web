import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const householdId = url.searchParams.get("householdId");
    const category = url.searchParams.get("category") as 'savings' | 'paydown' | null;
    const status = url.searchParams.get("status");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build query
    let query = supabaseClient
      .from("financial_goals")
      .select("*")
      .order("created_at", { ascending: false });

    if (householdId) {
      // Household goals
      query = query.eq("household_id", householdId);
    } else {
      // Personal goals only
      query = query.eq("user_id", userId).is("household_id", null);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: goals, error: goalsError } = await query;

    if (goalsError) {
      console.error("Goals fetch error:", goalsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch goals", details: goalsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Apply privacy filtering for household goals
    const filteredGoals = goals.map((goal) => {
      const isOwner = goal.user_id === userId;
      const privacyScope = goal.privacy_scope || 'full';

      // Always show full details to owner
      if (isOwner) {
        return {
          ...goal,
          isOwner: true,
          isAcknowledged: goal.acknowledged_by?.includes(userId) || false,
          privacyRedacted: false,
        };
      }

      // Apply privacy filtering for non-owners
      if (privacyScope === 'private') {
        // Private goals shouldn't be returned to non-owners (but RLS should handle this)
        return null;
      }

      if (privacyScope === 'balances_only') {
        // Redact sensitive fields for balances_only
        return {
          ...goal,
          description: null,
          note: null,
          icon: null,
          isOwner: false,
          isAcknowledged: goal.acknowledged_by?.includes(userId) || false,
          privacyRedacted: true,
        };
      }

      // Full privacy - show everything
      return {
        ...goal,
        isOwner: false,
        isAcknowledged: goal.acknowledged_by?.includes(userId) || false,
        privacyRedacted: false,
      };
    }).filter((goal) => goal !== null);

    // Calculate summary statistics
    const summary = {
      totalGoals: filteredGoals.length,
      activeGoals: filteredGoals.filter((g) => g!.status === 'active').length,
      completedGoals: filteredGoals.filter((g) => g!.status === 'completed').length,
      savingsGoals: filteredGoals.filter((g) => g!.category === 'savings').length,
      paydownGoals: filteredGoals.filter((g) => g!.category === 'paydown').length,
      onTrackGoals: filteredGoals.filter((g) => g!.is_on_track).length,
      totalTargetAmount: filteredGoals.reduce((sum, g) => {
        if (householdId && g!.normalized_target_amount) {
          return sum + (g!.normalized_target_amount / 100);
        }
        return sum + (g!.target_amount || 0);
      }, 0),
      totalCurrentAmount: filteredGoals.reduce((sum, g) => {
        if (householdId && g!.normalized_current_amount) {
          return sum + (g!.normalized_current_amount / 100);
        }
        return sum + (g!.current_amount || 0);
      }, 0),
    };

    return new Response(
      JSON.stringify({
        success: true,
        goals: filteredGoals,
        summary,
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
