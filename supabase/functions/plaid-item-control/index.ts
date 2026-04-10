import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUserOrInternal } from "../shared/auth.ts";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { decryptSecret } from "../shared/token-encryption.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { loadPlaidUserAccessState } from "../shared/plaid-access.ts";
import { canRequestPlaidManualRefresh } from "../shared/plaid-lifecycle.ts";
import {
  PLAID_PROVIDER,
  requestPlaidTransactionsRefresh,
} from "../shared/plaid-client.ts";
import { removePlaidConnection } from "../shared/plaid-remove.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type PlaidItemAction = "request_refresh" | "remove_item";

interface PlaidItemControlBody {
  action?: PlaidItemAction;
  connectionId?: string;
  reason?: string;
}

function isSupportedAction(value: unknown): value is PlaidItemAction {
  return value === "request_refresh" || value === "remove_item";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = getCorsHeaders(req.headers.get("Origin") || undefined);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PlaidItemControlBody;

    if (!isSupportedAction(body.action)) {
      return new Response(
        JSON.stringify({
          error: "action must be one of: request_refresh, remove_item",
        }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (!body.connectionId) {
      return new Response(JSON.stringify({ error: "connectionId is required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-plaid-item-control" },
      },
    });

    const authResult = await authenticateUserOrInternal(
      req,
      supabase,
      body.connectionId,
    );
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const { data: connection, error: connectionError } = await supabase
      .from("bank_connections")
      .select(
        "id, user_id, provider, status, item_status, item_health_state, access_token_encrypted, plaid_access_token_encrypted, last_successful_sync_at, next_manual_refresh_eligible_at, removed_at",
      )
      .eq("id", body.connectionId)
      .eq("provider", PLAID_PROVIDER)
      .maybeSingle();

    if (connectionError) {
      throw connectionError;
    }

    if (!connection || connection.user_id !== authResult.userId) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (body.action === "remove_item") {
      if (connection.removed_at) {
        return new Response(
          JSON.stringify({
            success: true,
            action: body.action,
            alreadyRemoved: true,
          }),
          {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      await removePlaidConnection({
        supabase,
        connection,
        removalReason: body.reason || "manual_remove",
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: body.action,
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const accessState = await loadPlaidUserAccessState(supabase, authResult.userId);

    const { count: inFlightJobCount, error: jobsError } = await supabase
      .from("bank_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("bank_connection_id", connection.id)
      .in("status", ["pending", "processing"]);

    if (jobsError) {
      throw jobsError;
    }

    const eligibility = canRequestPlaidManualRefresh({
      isConvertedPaidUser: accessState.isConvertedPaidUser,
      isTrialingUser: accessState.isTrialingUser,
      itemStatus: connection.item_status ?? connection.status,
      itemHealthState: connection.item_health_state,
      syncInProgress: (inFlightJobCount ?? 0) > 0,
      lastSuccessfulSyncAt: connection.last_successful_sync_at,
      nextManualRefreshEligibleAt: connection.next_manual_refresh_eligible_at,
      now: new Date(),
    });

    if (!eligibility.allowed) {
      return new Response(
        JSON.stringify({
          error: "Manual refresh is not available for this item right now",
          reason: eligibility.reason,
        }),
        {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const requestedAt = new Date();
    const nextEligibleAt = new Date(
      requestedAt.getTime() + 24 * 60 * 60 * 1000,
    );
    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_plaid_manual_refresh",
      {
        p_connection_id: connection.id,
        p_requested_at: requestedAt.toISOString(),
        p_next_eligible_at: nextEligibleAt.toISOString(),
      },
    );

    if (claimError) {
      throw claimError;
    }

    if (!claimed) {
      return new Response(
        JSON.stringify({
          error: "Manual refresh is cooling down or already in progress",
          reason: "cooldown_active",
        }),
        {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const encryptedToken = connection.access_token_encrypted ||
      connection.plaid_access_token_encrypted;
    if (!encryptedToken) {
      return new Response(JSON.stringify({ error: "Missing Plaid access token" }), {
        status: 409,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const accessToken = await decryptSecret(encryptedToken);
    await requestPlaidTransactionsRefresh(accessToken);

    await supabase
      .from("bank_connections")
      .update({
        last_financial_feature_used_at: requestedAt.toISOString(),
        updated_at: requestedAt.toISOString(),
      })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        action: body.action,
        status: "requested",
        nextRefreshEligibleAt: nextEligibleAt.toISOString(),
      }),
      {
        status: 202,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-item-control] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-item-control",
      error,
    });
    return new Response(
      JSON.stringify({ error: "Failed to execute Plaid item action" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
