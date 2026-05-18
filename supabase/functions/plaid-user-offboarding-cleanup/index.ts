import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { decryptSecret } from "../shared/token-encryption.ts";
import { PlaidError, removePlaidItem } from "../shared/plaid-client.ts";

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

  try {
    const body = (await req.json().catch(() => ({}))) as OffboardingCleanupBody;
    const connections = Array.isArray(body.connections) ? body.connections : [];
    const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: { "X-Client-Info": "moneko-plaid-offboarding-cleanup" },
        },
      })
      : null;
    let removed = 0;
    let failed = 0;

    if (supabase) {
      if (connections.length > 0) {
        const rows = connections
          .filter((connection) => connection.connectionId)
          .map((connection) => ({
            user_id: body.userId || "00000000-0000-0000-0000-000000000000",
            connection_id: connection.connectionId,
            access_token_encrypted: connection.accessTokenEncrypted || null,
            plaid_access_token_encrypted:
              connection.plaidAccessTokenEncrypted || null,
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
        const result = await removePlaidConnectionPayload({
          connection: {
            connectionId: job.connection_id || job.connectionId,
            accessTokenEncrypted: job.access_token_encrypted ||
              job.accessTokenEncrypted,
            plaidAccessTokenEncrypted: job.plaid_access_token_encrypted ||
              job.plaidAccessTokenEncrypted,
          },
          userId: job.user_id || body.userId,
        });

        if (result.success) {
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

          if (shouldAlert) {
            await reportEdgeFunctionError({
              functionName: "plaid-user-offboarding-cleanup",
              error: new Error(result.error || "Plaid offboarding exhausted"),
              context: {
                connection_id: job.connection_id || job.connectionId || null,
                user_id: job.user_id || body.userId || null,
              },
            });
          }
        }
      }
    }

    for (const connection of supabase ? [] : connections) {
      const result = await removePlaidConnectionPayload({
        connection,
        userId: body.userId,
      });
      if (result.success) {
        removed += result.removed ? 1 : 0;
      } else {
        failed += 1;
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
  const encryptedToken = params.connection.accessTokenEncrypted ||
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

function buildOffboardingFailureUpdate(params: {
  attemptCount: number;
  maxAttempts: number;
  error: string;
}): Record<string, unknown> {
  const now = new Date();
  const nextAttemptCount = params.attemptCount + 1;
  const backoffMinutes = [5, 15, 60, 360, 720, 1440, 1440][
    Math.min(nextAttemptCount - 1, 6)
  ];

  const update: Record<string, unknown> = {
    status: nextAttemptCount >= params.maxAttempts ? "failed" : "pending",
    attempt_count: nextAttemptCount,
    processing_started_at: null,
    next_attempt_at: nextAttemptCount >= params.maxAttempts
      ? null
      : new Date(now.getTime() + backoffMinutes * 60 * 1000).toISOString(),
    last_error: params.error.slice(0, 1000),
    last_error_at: now.toISOString(),
    updated_at: now.toISOString(),
    processed_at: nextAttemptCount >= params.maxAttempts
      ? now.toISOString()
      : null,
    should_alert: nextAttemptCount >= params.maxAttempts,
  };

  return update;
}
