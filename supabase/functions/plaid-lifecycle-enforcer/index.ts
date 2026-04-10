import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { removePlaidConnection } from "../shared/plaid-remove.ts";
import { shouldKeepPlaidItemBeyondSecondMonth } from "../shared/plaid-lifecycle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function pickLatestSubscriptions(rows: Array<Record<string, unknown>>) {
  const byUser = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const userId = String(row.user_id ?? "");
    if (!userId) continue;
    const existing = byUser.get(userId);
    if (!existing) {
      byUser.set(userId, row);
      continue;
    }
    const currentCreatedAt = String(row.created_at ?? "");
    const existingCreatedAt = String(existing.created_at ?? "");
    if (currentCreatedAt > existingCreatedAt) {
      byUser.set(userId, row);
    }
  }
  return byUser;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const authResult = await authenticateInternalSecret(req);
  if (!authResult.success) {
    return new Response(JSON.stringify({ error: authResult.error || "Unauthorized" }), {
      status: authResult.statusCode || 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-plaid-lifecycle-enforcer" } },
    });

    const { data: connections, error: connectionError } = await supabase
      .from("bank_connections")
      .select(
        "id, user_id, status, item_status, item_health_state, relink_state, access_token_encrypted, plaid_access_token_encrypted, scheduled_removal_at, warning_sent_at, billing_keep_reason, last_financial_feature_used_at, updated_at, removed_at",
      )
      .eq("provider", PLAID_PROVIDER)
      .is("removed_at", null);

    if (connectionError) {
      throw connectionError;
    }

    const userIds = Array.from(new Set((connections || []).map((row) => row.user_id)));
    const { data: subscriptionRows, error: subscriptionError } = userIds.length
      ? await supabase
          .from("subscriptions")
          .select("user_id, plan, status, current_period_end, created_at")
          .in("user_id", userIds)
      : { data: [], error: null };

    if (subscriptionError) {
      throw subscriptionError;
    }

    const subscriptionsByUserId = pickLatestSubscriptions(subscriptionRows || []);
    const now = new Date();
    const warningBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const trialInactivityThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let removed = 0;
    let warned = 0;

    for (const connection of connections || []) {
      const subscription = subscriptionsByUserId.get(connection.user_id);
      const keepBeyondSecondMonth = shouldKeepPlaidItemBeyondSecondMonth({
        subscriptionStatus: (subscription?.status as string | null | undefined) ?? null,
        subscriptionPlan: (subscription?.plan as string | null | undefined) ?? null,
        itemHealthState: connection.item_health_state,
        billingKeepReason: connection.billing_keep_reason,
        lastFinancialFeatureUsedAt: connection.last_financial_feature_used_at,
        now,
      });

      const scheduledRemovalAt = connection.scheduled_removal_at
        ? new Date(connection.scheduled_removal_at)
        : null;
      const updatedAt = connection.updated_at ? new Date(connection.updated_at) : null;
      const shouldRemoveForTrialInactivity =
        (subscription?.status !== "active") &&
        (!connection.last_financial_feature_used_at ||
          new Date(connection.last_financial_feature_used_at) < trialInactivityThreshold);
      const shouldRemoveForRelinkTimeout =
        connection.status === "needs_reauth" &&
        updatedAt != null &&
        updatedAt.getTime() < trialInactivityThreshold.getTime();
      const shouldRemoveForBilling =
        scheduledRemovalAt != null &&
        scheduledRemovalAt.getTime() <= now.getTime() &&
        !keepBeyondSecondMonth;

      if (
        shouldRemoveForTrialInactivity ||
        shouldRemoveForRelinkTimeout ||
        shouldRemoveForBilling
      ) {
        await removePlaidConnection({
          supabase,
          connection,
          removalReason: shouldRemoveForBilling
            ? "billing_deadline"
            : shouldRemoveForRelinkTimeout
            ? "relink_timeout"
            : "trial_inactive",
        });
        removed += 1;
        continue;
      }

      if (
        scheduledRemovalAt != null &&
        scheduledRemovalAt.getTime() <= warningBefore.getTime() &&
        !connection.warning_sent_at &&
        !keepBeyondSecondMonth
      ) {
        await supabase
          .from("bank_connections")
          .update({
            warning_sent_at: now.toISOString(),
            item_status: "pending_removal",
            updated_at: now.toISOString(),
          })
          .eq("id", connection.id);
        warned += 1;
      }
    }

    return new Response(JSON.stringify({ success: true, removed, warned }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[plaid-lifecycle-enforcer] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-lifecycle-enforcer",
      error,
    });
    return new Response(
      JSON.stringify({ error: "Failed to enforce Plaid lifecycle policy" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
