import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface CreateGoalRequest {
  userId: string;
  householdId?: string;
  title: string;
  category: 'savings' | 'paydown';
  targetAmount: number;
  currentAmount?: number;
  currency: string;
  targetDate: string;
  goalType?: string;
  privacyScope?: 'private' | 'balances_only' | 'full';
  ownerType?: 'me' | 'partner' | 'household';
  description?: string;
  icon?: string;
  idempotencyKey?: string;
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
    const body: CreateGoalRequest = await req.json();

    // Validate required fields
    if (!body.userId || !body.title || !body.category || !body.targetAmount || !body.currency || !body.targetDate) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: userId, title, category, targetAmount, currency, targetDate",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate category
    if (!['savings', 'paydown'].includes(body.category)) {
      return new Response(
        JSON.stringify({ error: "Invalid category. Must be 'savings' or 'paydown'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate amount
    if (body.targetAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Target amount must be greater than 0" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = body.userId;
    const householdId = body.householdId || null;
    const privacyScope = body.privacyScope || 'full';
    const ownerType = body.ownerType || (householdId ? 'household' : 'me');
    const currentAmount = body.currentAmount || 0;

    // Check for duplicate via idempotency key
    if (body.idempotencyKey && householdId) {
      const { data: existing } = await supabaseClient
        .from("financial_goals")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .eq("title", body.title)
        .eq("target_amount", body.targetAmount)
        .gte("created_at", new Date(Date.now() - 60000).toISOString()) // Within last minute
        .single();

      if (existing) {
        const { data: goal } = await supabaseClient
          .from("financial_goals")
          .select("*")
          .eq("id", existing.id)
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            goal,
            message: "Goal already exists (deduplicated)",
            isDuplicate: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Normalize amounts if household goal
    let normalizedTargetAmount = null;
    let normalizedCurrentAmount = null;
    let fxRate = null;
    let baseCurrency = null;

    if (householdId) {
      const { data: household } = await supabaseClient
        .from("households")
        .select("currency")
        .eq("id", householdId)
        .single();

      if (household) {
        baseCurrency = household.currency;
        // Convert cents for storage
        const targetAmountCents = Math.round(body.targetAmount * 100);
        const currentAmountCents = Math.round(currentAmount * 100);

        if (body.currency === baseCurrency) {
          fxRate = 1.0;
          normalizedTargetAmount = targetAmountCents;
          normalizedCurrentAmount = currentAmountCents;
        } else {
          // TODO: Fetch live FX rate
          fxRate = 1.0;
          normalizedTargetAmount = targetAmountCents;
          normalizedCurrentAmount = currentAmountCents;
        }
      }
    }

    // Calculate initial progress
    const progressPercentage = body.targetAmount > 0
      ? Math.min((currentAmount / body.targetAmount) * 100, 100)
      : 0;

    // Create goal
    const goalRecord: any = {
      user_id: userId,
      household_id: householdId,
      title: body.title,
      description: body.description || null,
      goal_type: body.goalType || 'custom',
      category: body.category,
      target_amount: body.targetAmount,
      current_amount: currentAmount,
      currency: body.currency,
      target_date: body.targetDate,
      start_date: new Date().toISOString().split('T')[0],
      privacy_scope: privacyScope,
      owner_type: ownerType,
      base_currency: baseCurrency,
      fx_rate: fxRate,
      normalized_target_amount: normalizedTargetAmount,
      normalized_current_amount: normalizedCurrentAmount,
      progress_percentage: Math.round(progressPercentage * 100) / 100,
      status: 'active',
      is_on_track: true,
      icon: body.icon || null,
      acknowledged_by: [userId],
    };

    const { data: goal, error: goalError } = await supabaseClient
      .from("financial_goals")
      .insert(goalRecord)
      .select()
      .single();

    if (goalError) {
      console.error("Goal creation error:", goalError);
      return new Response(
        JSON.stringify({ error: "Failed to create goal", details: goalError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create notifications for household members (if household goal)
    if (householdId && privacyScope !== 'private') {
      const { data: members } = await supabaseClient
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId)
        .eq("status", "active")
        .neq("user_id", userId);

      if (members && members.length > 0) {
        const notifications = members.map((member) => ({
          user_id: member.user_id,
          type: "goal_created",
          title: "New Household Goal",
          message: `${body.title} - ${body.category === 'savings' ? 'Save' : 'Pay down'} ${body.currency} ${body.targetAmount.toLocaleString()}`,
          data: {
            goalId: goal.id,
            category: body.category,
            targetAmount: body.targetAmount,
            currency: body.currency,
          },
        }));

        await supabaseClient.from("notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        goal,
        message: `Successfully created ${body.category} goal "${body.title}"`,
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
