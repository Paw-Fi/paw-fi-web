import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { decryptSecret } from "../shared/token-encryption.ts";
import { PlaidError, removePlaidItem } from "../shared/plaid-client.ts";
import {
  buildPlaidTokenSanitizationUpdate,
  cleanupRemovedPlaidConnection,
} from "../shared/plaid-remove.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface OffboardingConnectionPayload {
  connectionId?: string;
  accessTokenEncrypted?: string | null;
  plaidAccessTokenEncrypted?: string | null;
}

interface OffboardingCleanupBody {
  userId?: string;
  connections?: OffboardingConnectionPayload[];
}

interface PlaidOffboardingJob extends OffboardingConnectionPayload {
  id: string;
  user_id?: string;
  connection_id?: string;
  access_token_encrypted?: string | null;
  plaid_access_token_encrypted?: string | null;
  attempt_count?: number;
  max_attempts?: number;
  alerted_at?: string | null;
  reason?: string | null;
  provider_item_id?: string | null;
  link_completion_session_id?: string | null;
  link_completion_nonce?: string | null;
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

  const internalAuth = await authenticateInternalSecret(req);
  if (!internalAuth.success) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: internalAuth.statusCode || 401,
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

  try {
    const body = (await req.json().catch(() => ({}))) as OffboardingCleanupBody;
    const connections = Array.isArray(body.connections) ? body.connections : [];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-plaid-offboarding-cleanup" },
      },
    });
    let removed = 0;
    let failed = 0;

    if (connections.length > 0) {
      const connectionIds = connections
        .map((connection) => connection.connectionId?.trim())
        .filter((id): id is string => Boolean(id));
      const { data: storedConnections, error: storedConnectionsError } =
        await supabase
          .from("bank_connections")
          .select(
            "id, user_id, access_token_encrypted, plaid_access_token_encrypted",
          )
          .eq("provider", "plaid")
          .in("id", connectionIds);
      if (storedConnectionsError) throw storedConnectionsError;

      const rows = (storedConnections || [])
        .filter(
          (connection) => !body.userId || connection.user_id === body.userId,
        )
        .map((connection) => ({
          user_id: connection.user_id,
          connection_id: connection.id,
          access_token_encrypted: connection.access_token_encrypted || null,
          plaid_access_token_encrypted:
            connection.plaid_access_token_encrypted || null,
          reason: "offboarding_cleanup_request",
        }));

      if (rows.length > 0) {
        const { error: enqueueError } = await supabase
          .from("plaid_offboarding_jobs")
          .insert(rows);

        if (enqueueError && enqueueError.code !== "23505") {
          throw enqueueError;
        }
      }
    }

    const { data: jobs, error: claimError } = await supabase.rpc(
      "claim_pending_plaid_offboarding_jobs",
      { p_batch_size: 20 },
    );

    if (claimError) {
      throw claimError;
    }

    for (const job of (jobs || []) as PlaidOffboardingJob[]) {
      const escrowResolution = await resolvePlaidExchangeEscrow({
        supabase,
        job,
      });
      if (escrowResolution.preserved) {
        continue;
      }
      const connectionId =
        job.connection_id ||
        job.connectionId ||
        escrowResolution.rollbackConnectionId;
      const result = await removePlaidConnectionPayload({
        connection: {
          connectionId,
          accessTokenEncrypted:
            job.access_token_encrypted || job.accessTokenEncrypted,
          plaidAccessTokenEncrypted:
            job.plaid_access_token_encrypted || job.plaidAccessTokenEncrypted,
        },
        userId: job.user_id || body.userId,
      });

      if (result.success) {
        if (connectionId) {
          try {
            await cleanupRemovedPlaidConnection({
              supabase,
              connectionId,
              removalReason: job.reason || "offboarding_cleanup",
            });
          } catch (cleanupError) {
            failed += 1;
            const update = buildOffboardingFailureUpdate({
              attemptCount: job.attempt_count ?? 0,
              maxAttempts: job.max_attempts ?? 8,
              error:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            });
            const shouldAlert = update.should_alert === true && !job.alerted_at;
            delete update.should_alert;
            if (shouldAlert) {
              update.alerted_at = new Date().toISOString();
            }
            const { error: failureUpdateError } = await supabase
              .from("plaid_offboarding_jobs")
              .update(update)
              .eq("id", job.id);
            if (failureUpdateError) {
              throw failureUpdateError;
            }

            if (update.status === "failed" && connectionId) {
              await sanitizeExhaustedOffboardingConnectionSecrets({
                supabase,
                connectionId,
              });
            }

            if (shouldAlert) {
              await reportEdgeFunctionError({
                functionName: "plaid-user-offboarding-cleanup",
                error: cleanupError,
                context: {
                  connection_id: connectionId || null,
                  user_id: job.user_id || body.userId || null,
                },
              });
            }
            continue;
          }
        }

        removed += result.removed ? 1 : 0;
        const { error: completeError } = await supabase
          .from("plaid_offboarding_jobs")
          .update({
            status: "completed",
            access_token_encrypted: null,
            plaid_access_token_encrypted: null,
            processing_started_at: null,
            last_error: null,
            last_error_at: null,
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        if (completeError) {
          throw completeError;
        }
      } else {
        failed += 1;
        const update = buildOffboardingFailureUpdate({
          attemptCount: job.attempt_count ?? 0,
          maxAttempts: job.max_attempts ?? 8,
          error: result.error || "Plaid item removal failed",
        });
        const shouldAlert = update.should_alert === true && !job.alerted_at;
        delete update.should_alert;
        if (shouldAlert) {
          update.alerted_at = new Date().toISOString();
        }
        const { error: failureUpdateError } = await supabase
          .from("plaid_offboarding_jobs")
          .update(update)
          .eq("id", job.id);
        if (failureUpdateError) {
          throw failureUpdateError;
        }

        if (update.status === "failed" && connectionId) {
          await sanitizeExhaustedOffboardingConnectionSecrets({
            supabase,
            connectionId,
          });
        }

        if (shouldAlert) {
          await reportEdgeFunctionError({
            functionName: "plaid-user-offboarding-cleanup",
            error: new Error(result.error || "Plaid offboarding exhausted"),
            context: {
              connection_id: connectionId || null,
              user_id: job.user_id || body.userId || null,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: failed === 0, removed, failed }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    await reportEdgeFunctionError({
      functionName: "plaid-user-offboarding-cleanup",
      error,
    });
    return new Response(JSON.stringify({ error: "Cleanup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function removePlaidConnectionPayload(params: {
  connection: OffboardingConnectionPayload;
  userId?: string;
}): Promise<{ success: boolean; removed: boolean; error?: string }> {
  const encryptedToken =
    params.connection.accessTokenEncrypted ||
    params.connection.plaidAccessTokenEncrypted;
  if (!encryptedToken) {
    return { success: true, removed: false };
  }

  try {
    const accessToken = await decryptSecret(encryptedToken);
    const response = await removePlaidItem(accessToken);
    console.log(
      "[plaid-user-offboarding-cleanup] Removed Plaid item",
      JSON.stringify({
        connectionId: params.connection.connectionId || null,
        requestId: response.request_id || null,
        userId: params.userId || null,
      }),
    );
    return { success: true, removed: true };
  } catch (error) {
    if (error instanceof PlaidError && error.code === "ITEM_NOT_FOUND") {
      return { success: true, removed: false };
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "[plaid-user-offboarding-cleanup] Failed to remove Plaid item",
      JSON.stringify({
        connectionId: params.connection.connectionId || null,
        error: message,
        userId: params.userId || null,
      }),
    );
    return { success: false, removed: false, error: message };
  }
}

async function resolvePlaidExchangeEscrow(params: {
  supabase: ReturnType<typeof createClient>;
  job: PlaidOffboardingJob;
}): Promise<{ preserved: boolean; rollbackConnectionId?: string }> {
  if (
    params.job.reason !== "orphan_exchange_escrow" ||
    !params.job.provider_item_id ||
    !params.job.user_id
  ) {
    return { preserved: false };
  }

  const { data: connection, error: connectionError } = await params.supabase
    .from("bank_connections")
    .select("id, metadata")
    .eq("user_id", params.job.user_id)
    .eq("provider", "plaid")
    .eq("provider_item_id", params.job.provider_item_id)
    .is("removed_at", null)
    .in("status", ["pending", "active", "needs_reauth", "error"])
    .or("item_status.is.null,item_status.not.in.(removed,pending_removal)")
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection?.id) return { preserved: false };

  const metadata =
    connection.metadata && typeof connection.metadata === "object"
      ? (connection.metadata as Record<string, unknown>)
      : {};
  const sessionId = String(params.job.link_completion_session_id || "").trim();
  const nonce = String(params.job.link_completion_nonce || "").trim();
  const hasExactCompletionIdentity =
    sessionId.length > 0 &&
    nonce.length > 0 &&
    String(metadata.plaid_link_completion_session_id || "") === sessionId &&
    String(metadata.plaid_link_completion_nonce || "") === nonce;

  if (hasExactCompletionIdentity) {
    const { data: completed, error: completionError } =
      await params.supabase.rpc("complete_plaid_link_exchange_v1", {
        p_user_id: params.job.user_id,
        p_connection_id: connection.id,
        p_provider_item_id: params.job.provider_item_id,
        p_link_session_id: sessionId,
        p_link_completion_nonce: nonce,
        p_link_request_id: null,
        p_provider_link_session_id: null,
      });
    if (completionError) throw completionError;
    if (completed !== true) {
      throw new Error("Live Plaid exchange escrow could not be completed");
    }
    return { preserved: true };
  }

  // A live, user-scoped connection is sufficient to make provider removal
  // unsafe. Quarantine legacy or mismatched escrow instead of guessing.
  const { data: preserved, error: completionError } = await params.supabase.rpc(
    "preserve_live_plaid_exchange_escrow_v1",
    {
      p_user_id: params.job.user_id,
      p_connection_id: connection.id,
      p_provider_item_id: params.job.provider_item_id,
      p_reason: "preserved_live_connection_without_exact_session_identity",
    },
  );
  if (completionError) throw completionError;
  if (preserved !== true) {
    throw new Error("Live Plaid exchange escrow could not be quarantined");
  }
  if (!params.job.alerted_at) {
    await params.supabase
      .from("plaid_offboarding_jobs")
      .update({ alerted_at: new Date().toISOString() })
      .eq("id", params.job.id)
      .is("alerted_at", null);
    await reportEdgeFunctionError({
      functionName: "plaid-user-offboarding-cleanup",
      error: new Error(
        "Preserved live Plaid Item because exchange escrow identity was incomplete",
      ),
      context: {
        connection_id: connection.id,
        provider_item_id: params.job.provider_item_id,
        escrow_job_id: params.job.id,
      },
    });
  }
  return { preserved: true };
}

function buildOffboardingFailureUpdate(params: {
  attemptCount: number;
  maxAttempts: number;
  error: string;
}): Record<string, unknown> {
  const now = new Date();
  const nextAttemptCount = params.attemptCount;
  const isExhausted = nextAttemptCount >= params.maxAttempts;
  const backoffMinutes = [5, 15, 60, 360, 720, 1440, 1440][
    Math.min(nextAttemptCount - 1, 6)
  ];

  return {
    status: isExhausted ? "failed" : "pending",
    attempt_count: nextAttemptCount,
    processing_started_at: null,
    next_attempt_at: isExhausted
      ? null
      : new Date(now.getTime() + backoffMinutes * 60 * 1000).toISOString(),
    last_error: params.error.slice(0, 1000),
    last_error_at: now.toISOString(),
    updated_at: now.toISOString(),
    processed_at: isExhausted ? now.toISOString() : null,
    ...(isExhausted
      ? {
          access_token_encrypted: null,
          plaid_access_token_encrypted: null,
        }
      : {}),
    should_alert: isExhausted,
  };
}

interface PlaidSecretSanitizationQuery {
  update: (values: Record<string, null>) => {
    eq: (column: string, value: string) => PromiseLike<{ error: unknown }>;
  };
  delete: () => {
    eq: (column: string, value: string) => PromiseLike<{ error: unknown }>;
  };
}

async function sanitizeExhaustedOffboardingConnectionSecrets(params: {
  supabase: {
    from: (table: string) => PlaidSecretSanitizationQuery;
  };
  connectionId: string;
}): Promise<void> {
  const { error: connectionUpdateError } = await params.supabase
    .from("bank_connections")
    .update(buildPlaidTokenSanitizationUpdate())
    .eq("id", params.connectionId);

  if (connectionUpdateError) {
    throw connectionUpdateError;
  }

  const { error: tokenDeleteError } = await params.supabase
    .from("bank_connection_tokens")
    .delete()
    .eq("bank_connection_id", params.connectionId);

  if (tokenDeleteError) {
    throw tokenDeleteError;
  }
}
