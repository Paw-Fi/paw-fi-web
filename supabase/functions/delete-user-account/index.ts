import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUser } from "../shared/auth.ts";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { removePlaidConnection } from "../shared/plaid-remove.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for delete-user-account");
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
    const authHeader = req.headers.get("Authorization") || "";
    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
            "X-Client-Info": "moneko-delete-user-account",
          },
        },
      },
    );

    const authResult = await authenticateUser(req, serviceClient);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const { data: connections, error: connectionsError } = await serviceClient
      .from("bank_connections")
      .select(
        "id, access_token_encrypted, plaid_access_token_encrypted, removed_at",
      )
      .eq("user_id", authResult.userId)
      .eq("provider", PLAID_PROVIDER)
      .is("removed_at", null)
      .in("status", ["pending", "active", "needs_reauth", "error"]);

    if (connectionsError) {
      throw connectionsError;
    }

    for (const connection of connections || []) {
      await removePlaidConnection({
        supabase: serviceClient,
        connection,
        removalReason: "user_account_deletion",
      });
    }

    const userScopedClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
            "X-Client-Info": "moneko-delete-user-account-user-scope",
          },
        },
      },
    );

    const deleteResult = await userScopedClient.rpc("delete_user_account");

    return new Response(JSON.stringify(deleteResult), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[delete-user-account] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "delete-user-account",
      error,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to delete account",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
