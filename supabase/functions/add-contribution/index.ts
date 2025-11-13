import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface AddContributionRequest {
  userId: string;
  goalId: string;
  amount: number;
  currency: string;
  contributionType: 'contribution' | 'withdrawal' | 'interest' | 'adjustment';
  source?: 'manual' | 'automatic' | 'recurring' | 'interest';
  note?: string;
  attachmentUrls?: string[];
  contributionDate?: string;
  privacyScope?: 'private' | 'balances_only' | 'full';
  ownerType?: 'me' | 'partner' | 'household';
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
    const body: AddContributionRequest = await req.json();

    // Validate required fields
    if (!body.userId || !body.goalId || !body.amount || !body.currency || !body.contributionType) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: userId, goalId, amount, currency, contributionType",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate contribution type
    if (!['contribution', 'withdrawal', 'interest', 'adjustment'].includes(body.contributionType)) {
      return new Response(
        JSON.stringify({
          error: "Invalid contributionType. Must be: contribution, withdrawal, interest, or adjustment",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate amount
    if (body.amount === 0) {
      return new Response(
        JSON.stringify({ error: "Amount cannot be zero" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = body.userId;
    const goalId = body.goalId;
    const amountCents = Math.round(Math.abs(body.amount) * 100);
    const contributionDate = body.contributionDate || new Date().toISOString().split('T')[0];

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

    const householdId = goal.household_id;
    const privacyScope = body.privacyScope || goal.privacy_scope || 'full';
    const ownerType = body.ownerType || (householdId ? 'household' : 'me');

    // Check for duplicate via idempotency key
    if (body.idempotencyKey && householdId) {
      const { data: existing } = await supabaseClient
        .from("goal_contributions")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .eq("idempotency_key", body.idempotencyKey)
        .single();

      if (existing) {
        const { data: contribution } = await supabaseClient
          .from("goal_contributions")
          .select("*")
          .eq("id", existing.id)
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            contribution,
            message: "Contribution already exists (deduplicated)",
            isDuplicate: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Normalize amounts
    let normalizedAmountCents = amountCents;
    let fxRate = 1.0;
    let baseCurrency = body.currency;

    if (householdId) {
      const { data: household } = await supabaseClient
        .from("households")
        .select("currency")
        .eq("id", householdId)
        .single();

      if (household) {
        baseCurrency = household.currency;

        if (body.currency !== baseCurrency) {
          // TODO: Fetch live FX rate
          fxRate = 1.0;
          normalizedAmountCents = amountCents;
        }
      }
    }

    // Create contribution record
    const contributionRecord: any = {
      goal_id: goalId,
      user_id: userId,
      household_id: householdId,
      amount_cents: amountCents,
      currency: body.currency,
      contribution_type: body.contributionType,
      normalized_amount_cents: normalizedAmountCents,
      fx_rate: fxRate,
      base_currency: baseCurrency,
      privacy_scope: privacyScope,
      owner_type: ownerType,
      source: body.source || 'manual',
      note: body.note || null,
      attachment_urls: body.attachmentUrls || null,
      contribution_date: contributionDate,
      idempotency_key: body.idempotencyKey || null,
      acknowledged_by: [userId],
    };

    const { data: contribution, error: contributionError } = await supabaseClient
      .from("goal_contributions")
      .insert(contributionRecord)
      .select()
      .single();

    if (contributionError) {
      console.error("Contribution creation error:", contributionError);
      return new Response(
        JSON.stringify({
          error: "Failed to create contribution",
          details: contributionError.message,
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

    // Create notifications for household members (if household goal and not private)
    if (householdId && privacyScope !== 'private') {
      const { data: members } = await supabaseClient
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId)
        .eq("status", "active")
        .neq("user_id", userId);

      if (members && members.length > 0) {
        const actionText = body.contributionType === 'contribution'
          ? 'contributed'
          : body.contributionType === 'withdrawal'
          ? 'withdrew'
          : body.contributionType === 'interest'
          ? 'earned interest'
          : 'adjusted';

        const notifications = members.map((member) => ({
          user_id: member.user_id,
          type: "goal_contribution",
          title: "Goal Update",
          message: `${actionText} ${body.currency} ${body.amount.toLocaleString()} to "${goal.title}"`,
          data: {
            goalId: goalId,
            contributionId: contribution.id,
            amount: body.amount,
            currency: body.currency,
            type: body.contributionType,
          },
        }));

        await supabaseClient.from("notifications").insert(notifications);
      }
    }

    // Generate response message
    const actionVerb = body.contributionType === 'contribution'
      ? 'Added'
      : body.contributionType === 'withdrawal'
      ? 'Withdrew'
      : body.contributionType === 'interest'
      ? 'Interest earned'
      : 'Adjusted';

    const message = `${actionVerb} ${body.currency} ${body.amount.toLocaleString()} ${
      body.contributionType === 'contribution' || body.contributionType === 'interest' ? 'to' : 'from'
    } "${goal.title}"`;

    return new Response(
      JSON.stringify({
        success: true,
        contribution,
        goal: updatedGoal,
        message,
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
