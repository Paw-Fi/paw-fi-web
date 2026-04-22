import { corsHeaders } from "../shared/cors.ts";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { decryptSecret } from "../shared/token-encryption.ts";
import { PlaidError, removePlaidItem } from "../shared/plaid-client.ts";

interface OffboardingConnectionPayload {
  connectionId?: string;
  accessTokenEncrypted?: string | null;
  plaidAccessTokenEncrypted?: string | null;
}

interface OffboardingCleanupBody {
  userId?: string;
  connections?: OffboardingConnectionPayload[];
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
    let removed = 0;

    for (const connection of connections) {
      const encryptedToken = connection.accessTokenEncrypted ||
        connection.plaidAccessTokenEncrypted;
      if (!encryptedToken) {
        continue;
      }

      try {
        const accessToken = await decryptSecret(encryptedToken);
        const response = await removePlaidItem(accessToken);
        removed += 1;
        console.log(
          "[plaid-user-offboarding-cleanup] Removed Plaid item",
          JSON.stringify({
            connectionId: connection.connectionId || null,
            requestId: response.request_id || null,
            userId: body.userId || null,
          }),
        );
      } catch (error) {
        if (error instanceof PlaidError && error.code === "ITEM_NOT_FOUND") {
          continue;
        }

        console.error(
          "[plaid-user-offboarding-cleanup] Failed to remove Plaid item",
          JSON.stringify({
            connectionId: connection.connectionId || null,
            error: error instanceof Error ? error.message : String(error),
            userId: body.userId || null,
          }),
        );
      }
    }

    return new Response(JSON.stringify({ success: true, removed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
