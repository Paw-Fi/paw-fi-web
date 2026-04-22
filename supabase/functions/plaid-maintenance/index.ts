import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import { removePlaidConnection } from "../shared/plaid-remove.ts";
import { shouldKeepPlaidItemBeyondSecondMonth } from "../shared/plaid-lifecycle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const INTERNAL_SERVICE_SECRET = Deno.env.get("INTERNAL_SERVICE_SECRET");
const LEGACY_INTERNAL_SECRET = Deno.env.get(
  "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
);

type PlaidMaintenanceAction =
  | "reconcile_stale"
  | "enforce_lifecycle"
  | "cleanup_retention"
  | "run_all";

interface PlaidMaintenanceBody {
  action?: PlaidMaintenanceAction;
}

interface PlaidConnectionRow {
  id: string;
  user_id: string;
  status: string | null;
  item_status: string | null;
  item_health_state: string | null;
  relink_state?: string | null;
  access_token_encrypted?: string | null;
  plaid_access_token_encrypted?: string | null;
  scheduled_removal_at?: string | null;
  warning_sent_at?: string | null;
  billing_keep_reason?: string | null;
  last_financial_feature_used_at?: string | null;
  last_successful_sync_at?: string | null;
  last_webhook_received_at?: string | null;
  needs_resync?: boolean | null;
  updated_at?: string | null;
  removed_at?: string | null;
}

interface SubscriptionRow {
  user_id: string;
  plan: string | null;
  status: string | null;
  current_period_end?: string | null;
  created_at: string | null;
}

function isSupportedAction(value: unknown): value is PlaidMaintenanceAction {
  return (
    value === "reconcile_stale" ||
    value === "enforce_lifecycle" ||
    value === "cleanup_retention" ||
    value === "run_all"
  );
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}

function isAuthorizedInternalRequest(req: Request): boolean {
  const providedSchedulerSecret =
    req.headers.get("X-Internal-Service-Secret")?.trim() || "";
  if (
    INTERNAL_SERVICE_SECRET &&
    providedSchedulerSecret &&
    constantTimeCompare(providedSchedulerSecret, INTERNAL_SERVICE_SECRET)
  ) {
    return true;
  }

  const providedLegacySecret =
    req.headers.get("X-Moneko-Internal-Key")?.trim() || "";
  if (
    LEGACY_INTERNAL_SECRET &&
    providedLegacySecret &&
    constantTimeCompare(providedLegacySecret, LEGACY_INTERNAL_SECRET)
  ) {
    return true;
  }

  return false;
}

function createServiceClient(clientInfo: string) {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": clientInfo },
    },
  });
}

function pickLatestSubscriptions(rows: SubscriptionRow[]) {
  const byUser = new Map<string, SubscriptionRow>();

  for (const row of rows) {
    const existing = byUser.get(row.user_id);
    if (!existing) {
      byUser.set(row.user_id, row);
      continue;
    }

    const currentCreatedAt = row.created_at || "";
    const existingCreatedAt = existing.created_at || "";
    if (currentCreatedAt > existingCreatedAt) {
      byUser.set(row.user_id, row);
    }
  }

  return byUser;
}

async function reconcileStaleItems(
  supabase: ReturnType<typeof createServiceClient>,
) {
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: connections, error } = await supabase
    .from("bank_connections")
    .select(
      "id, last_successful_sync_at, last_webhook_received_at, needs_resync, item_status, item_health_state",
    )
    .eq("provider", PLAID_PROVIDER)
    .eq("status", "active")
    .is("removed_at", null);

  if (error) {
    throw error;
  }

  let enqueued = 0;
  for (const connection of connections || []) {
    const shouldEnqueue = connection.needs_resync === true ||
      !connection.last_successful_sync_at ||
      connection.last_successful_sync_at < staleBefore ||
      !connection.last_webhook_received_at ||
      connection.last_webhook_received_at < staleBefore;

    if (!shouldEnqueue) {
      continue;
    }

    const result = await enqueuePlaidSyncJob({
      supabase,
      connectionId: connection.id,
      triggerSource: "stale_reconciler",
    });

    if (result.enqueued || result.duplicate) {
      enqueued += 1;
    }

    await supabase
      .from("bank_connections")
      .update({
        item_status: "stale_but_healthy",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  }

  return { enqueued };
}

async function enforceLifecyclePolicies(
  supabase: ReturnType<typeof createServiceClient>,
) {
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

  const userIds = Array.from(
    new Set((connections || []).map((row: PlaidConnectionRow) => row.user_id)),
  );
  const { data: subscriptionRows, error: subscriptionError } = userIds.length
    ? await supabase
      .from("subscriptions")
      .select("user_id, plan, status, current_period_end, created_at")
      .in("user_id", userIds)
    : { data: [], error: null };

  if (subscriptionError) {
    throw subscriptionError;
  }

  const subscriptionsByUserId = pickLatestSubscriptions(
    (subscriptionRows || []) as SubscriptionRow[],
  );
  const now = new Date();
  const warningBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const trialInactivityThreshold = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  );

  let removed = 0;
  let warned = 0;

  for (const connection of (connections || []) as PlaidConnectionRow[]) {
    const subscription = subscriptionsByUserId.get(connection.user_id);
    const keepBeyondSecondMonth = shouldKeepPlaidItemBeyondSecondMonth({
      subscriptionStatus: subscription?.status ?? null,
      subscriptionPlan: subscription?.plan ?? null,
      itemHealthState: connection.item_health_state,
      billingKeepReason: connection.billing_keep_reason,
      lastFinancialFeatureUsedAt: connection.last_financial_feature_used_at,
      now,
    });

    const scheduledRemovalAt = connection.scheduled_removal_at
      ? new Date(connection.scheduled_removal_at)
      : null;
    const updatedAt = connection.updated_at
      ? new Date(connection.updated_at)
      : null;
    const shouldRemoveForTrialInactivity = subscription?.status !== "active" &&
      (!connection.last_financial_feature_used_at ||
        new Date(connection.last_financial_feature_used_at) <
          trialInactivityThreshold);
    const shouldRemoveForRelinkTimeout = connection.status === "needs_reauth" &&
      updatedAt != null &&
      updatedAt.getTime() < trialInactivityThreshold.getTime();
    const shouldRemoveForBilling = scheduledRemovalAt != null &&
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

  return { removed, warned };
}

async function cleanupRetentionData(
  supabase: ReturnType<typeof createServiceClient>,
) {
  const rawPayloadCutoff = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const webhookCutoff = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const auditCutoff = new Date(
    Date.now() - 180 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: webhookError } = await supabase
    .from("bank_webhook_events")
    .delete()
    .lt("received_at", webhookCutoff);

  if (webhookError) {
    throw webhookError;
  }

  const { error: auditError } = await supabase
    .from("bank_sync_audit")
    .delete()
    .lt("created_at", auditCutoff);

  if (auditError) {
    throw auditError;
  }

  const { error: rawTransactionsError } = await supabase
    .from("bank_transaction_raw")
    .delete()
    .eq("provider", PLAID_PROVIDER)
    .lt("created_at", rawPayloadCutoff);

  if (rawTransactionsError) {
    throw rawTransactionsError;
  }

  const { error: expensePayloadError } = await supabase
    .from("expenses")
    .update({
      raw_provider_payload: null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", PLAID_PROVIDER)
    .not("raw_provider_payload", "is", null)
    .lt("updated_at", rawPayloadCutoff);

  if (expensePayloadError) {
    throw expensePayloadError;
  }

  const { error: accountPayloadError } = await supabase
    .from("bank_accounts")
    .update({
      raw_provider_payload: null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", PLAID_PROVIDER)
    .not("raw_provider_payload", "is", null)
    .lt("updated_at", rawPayloadCutoff);

  if (accountPayloadError) {
    throw accountPayloadError;
  }

  return { success: true };
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

  if (!INTERNAL_SERVICE_SECRET && !LEGACY_INTERNAL_SECRET) {
    return new Response(
      JSON.stringify({ error: "Internal authentication not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!isAuthorizedInternalRequest(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PlaidMaintenanceBody;

    if (!isSupportedAction(body.action)) {
      return new Response(
        JSON.stringify({
          error:
            "action must be one of: reconcile_stale, enforce_lifecycle, cleanup_retention, run_all",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createServiceClient("moneko-plaid-maintenance");

    if (body.action === "reconcile_stale") {
      const result = await reconcileStaleItems(supabase);
      return new Response(
        JSON.stringify({ success: true, action: body.action, ...result }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.action === "enforce_lifecycle") {
      const result = await enforceLifecyclePolicies(supabase);
      return new Response(
        JSON.stringify({ success: true, action: body.action, ...result }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.action === "cleanup_retention") {
      const result = await cleanupRetentionData(supabase);
      return new Response(JSON.stringify({ action: body.action, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const staleResult = await reconcileStaleItems(supabase);
    const lifecycleResult = await enforceLifecyclePolicies(supabase);
    const cleanupResult = await cleanupRetentionData(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        action: body.action,
        stale: staleResult,
        lifecycle: lifecycleResult,
        retention: cleanupResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-maintenance] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-maintenance",
      error,
    });
    return new Response(
      JSON.stringify({ error: "Failed to run Plaid maintenance" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
