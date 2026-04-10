import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { loadPlaidUserAccessState } from "../shared/plaid-access.ts";
import { derivePlaidLinkProducts } from "../shared/plaid-lifecycle.ts";
import { resolvePlaidCountryCode } from "../shared/plaid-country.ts";
import {
  createPlaidLinkToken,
  getPlaidConfig,
  PLAID_PROVIDER,
} from "../shared/plaid-client.ts";
import { decryptSecret } from "../shared/token-encryption.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-create-link-token");
}

interface CreateLinkTokenRequest {
  connectionId?: string;
  transactionsDaysRequested?: number;
  countryCode?: string;
  platform?: string;
  institutionId?: string;
  mode?: "new" | "update" | "reconnect" | "duplicate_blocked";
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
    const body = (await req.json().catch(() => ({}))) as CreateLinkTokenRequest;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-plaid-create-link-token" },
      },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const accessState = await loadPlaidUserAccessState(
      supabase,
      authResult.userId,
    );

    let accessToken: string | undefined;
    let connectionCountryCode: string | undefined;
    let resolvedConnectionId = body.connectionId?.trim() || undefined;
    let modeUsed = body.mode ?? (resolvedConnectionId != null ? "update" : "new");

    const requestedInstitutionId = body.institutionId?.trim();
    if (!resolvedConnectionId && (requestedInstitutionId?.length ?? 0) > 0) {
      const { data: duplicateConnection, error: duplicateError } = await supabase
        .from("bank_connections")
        .select(
          "id, user_id, provider, status, country_code, access_token_encrypted, plaid_access_token_encrypted",
        )
        .eq("user_id", authResult.userId)
        .eq("provider", PLAID_PROVIDER)
        .eq("metadata->>institution_id", requestedInstitutionId!)
        .is("removed_at", null)
        .in("status", ["active", "needs_reauth"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateConnection?.id) {
        resolvedConnectionId = duplicateConnection.id;
        modeUsed = duplicateConnection.status === "needs_reauth"
          ? "reconnect"
          : "update";
      }
    }

    if (!resolvedConnectionId && !accessState.isConvertedPaidUser) {
      const { count, error: connectionCountError } = await supabase
        .from("bank_connections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authResult.userId)
        .eq("provider", PLAID_PROVIDER)
        .is("removed_at", null)
        .in("status", ["pending", "active", "needs_reauth", "error"]);

      if (connectionCountError) {
        throw connectionCountError;
      }

      if ((count ?? 0) >= 1) {
        return new Response(
          JSON.stringify({
            error:
                "Trial and free users can only keep one active bank connection. Reconnect the existing bank instead.",
          }),
          {
            status: 403,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (resolvedConnectionId) {
      const { data: connection, error: connectionError } = await supabase
        .from("bank_connections")
        .select(
          "id, user_id, provider, country_code, access_token_encrypted, plaid_access_token_encrypted",
        )
        .eq("id", resolvedConnectionId)
        .eq("provider", PLAID_PROVIDER)
        .maybeSingle();

      if (connectionError) {
        console.error(
          "[plaid-create-link-token] Failed to load connection",
          connectionError,
        );
        return new Response(
          JSON.stringify({ error: "Failed to load connection" }),
          {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      if (!connection || connection.user_id !== authResult.userId) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      const encryptedToken = connection.access_token_encrypted ||
        connection.plaid_access_token_encrypted;
      if (encryptedToken) {
        accessToken = await decryptSecret(encryptedToken);
      }

      connectionCountryCode = connection.country_code?.trim().toUpperCase() ||
        undefined;
    }

    const products = derivePlaidLinkProducts(getPlaidConfig().products, {
      isConvertedPaidUser: accessState.isConvertedPaidUser,
      enableRecurringTransactionsProduct:
        Deno.env.get("PLAID_ENABLE_RECURRING_FOR_PAID")?.toLowerCase() ===
            "true",
    });

    const countryCode = resolvePlaidCountryCode({
      requestedCountryCode: body.countryCode,
      connectionCountryCode,
    });

    const response = await createPlaidLinkToken({
      userId: authResult.userId,
      accessToken,
      products,
      transactionsDaysRequested: body.transactionsDaysRequested,
      countryCodes: countryCode ? [countryCode] : undefined,
      platform: body.platform,
    });

    return new Response(
      JSON.stringify({
        success: true,
        linkToken: response.link_token,
        expiration: response.expiration,
        connectionId: resolvedConnectionId,
        modeUsed,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-create-link-token] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-create-link-token",
      error,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to create link token",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
