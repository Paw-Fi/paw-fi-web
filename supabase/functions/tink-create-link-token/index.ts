import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import {
  createTinkLinkUrl,
  createTinkUserAuthorizationCode,
  getTinkConfig,
  getTinkUserAccessToken,
  listTinkCredentials,
  TINK_PROVIDER,
} from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for tink-create-link-token");
}

interface CreateLinkRequest {
  countryCode?: string;
  locale?: string;
  // Optional: force using an existing connection (reconnect flow)
  connectionId?: string;
  // add: always create new credential
  // update: must update existing credential (requires credentialsId to exist)
  // auto: update only if connection indicates reauth/error
  intent?: "add" | "update" | "auto";
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
    const config = getTinkConfig();
    const body = (await req.json().catch(() => ({}))) as CreateLinkRequest;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-tink-create-link-token" } },
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

    const market = body.countryCode || config.defaultMarket;
    const marketSuffix = market.toLowerCase();
    const externalUserId = `${authResult.userId}-${marketSuffix}`;

    const intent = body.intent || "auto";

    // Check if user has existing credentials to determine if this is reconnection or new connection
    let existingCredentialsId: string | undefined;

    if (intent !== "add") {
      // Primary source of truth: our own DB (tink_sync_transcations stores credentials_id in bank_connections.metadata)
      // This avoids relying on Tink credential listing and prevents picking the wrong credential when multiple exist.
      try {
        if (body.connectionId) {
          const { data: connection } = await supabase
            .from("bank_connections")
            .select("id, status, country_code, metadata")
            .eq("id", body.connectionId)
            .eq("user_id", authResult.userId)
            .eq("provider", TINK_PROVIDER)
            .maybeSingle();

          const credentialsId = (
            connection as unknown as {
              metadata?: Record<string, unknown> | null;
            }
          )?.metadata?.["credentials_id"];

          if (typeof credentialsId === "string" && credentialsId.length) {
            existingCredentialsId = credentialsId;
            console.log(
              `[tink-create-link-token] Using credentials_id from connection ${body.connectionId} for UPDATE`,
            );
          }
        }

        if (!existingCredentialsId) {
          // Prefer exact provider_item_id match (stable: tink_{external_user_id}).
          // This works even if country_code wasn't persisted on older rows.
          const expectedProviderItemId = `tink_${externalUserId}`;
          const { data: byProviderItem } = await supabase
            .from("bank_connections")
            .select("id, status, country_code, metadata")
            .eq("user_id", authResult.userId)
            .eq("provider", TINK_PROVIDER)
            .eq("provider_item_id", expectedProviderItemId)
            .neq("status", "disabled")
            .order("updated_at", { ascending: false })
            .limit(1);

          const providerRow = Array.isArray(byProviderItem)
            ? byProviderItem[0]
            : null;
          const providerStatus = (
            providerRow as { status?: string | null } | null
          )?.status;
          const providerCredentialsId = (
            providerRow as { metadata?: Record<string, unknown> | null } | null
          )?.metadata?.["credentials_id"];

          const shouldUseProviderRowForAuto =
            intent === "update" ||
            providerStatus === "needs_reauth" ||
            providerStatus === "error";

          if (
            shouldUseProviderRowForAuto &&
            typeof providerCredentialsId === "string" &&
            providerCredentialsId.length
          ) {
            existingCredentialsId = providerCredentialsId;
            console.log(
              `[tink-create-link-token] Using stored credentials_id from provider_item_id match (${
                (providerRow as { id?: string | null } | null)?.id
              }) for ${intent === "update" ? "UPDATE" : "AUTO-UPDATE"}`,
            );
          }
        }

        if (!existingCredentialsId) {
          const { data: latest } = await supabase
            .from("bank_connections")
            .select("id, status, country_code, metadata")
            .eq("user_id", authResult.userId)
            .eq("provider", TINK_PROVIDER)
            .eq("country_code", market.toUpperCase())
            .neq("status", "disabled")
            .order("updated_at", { ascending: false })
            .limit(1);

          const row = Array.isArray(latest) ? latest[0] : null;
          const status = (row as { status?: string | null } | null)?.status;
          const credentialsId = (
            row as { metadata?: Record<string, unknown> | null } | null
          )?.metadata?.["credentials_id"];

          const shouldUseForAuto =
            intent === "update" ||
            status === "needs_reauth" ||
            status === "error";

          if (
            shouldUseForAuto &&
            typeof credentialsId === "string" &&
            credentialsId.length
          ) {
            existingCredentialsId = credentialsId;
            console.log(
              `[tink-create-link-token] Using stored credentials_id from latest connection (${
                (row as { id?: string | null } | null)?.id
              }) for ${intent === "update" ? "UPDATE" : "AUTO-UPDATE"}`,
            );
          }
        }

        // If we still don't have a credentialsId (e.g., first link succeeded in Tink
        // but our callback/token exchange failed), fall back to the credentials cache.
        if (!existingCredentialsId) {
          const { data: cached } = await supabase
            .from("tink_credentials_cache")
            .select("credentials_id")
            .eq("user_id", authResult.userId)
            .eq("external_user_id", externalUserId)
            .eq("market", market.toUpperCase())
            .order("updated_at", { ascending: false })
            .limit(1);

          const row = Array.isArray(cached) ? cached[0] : null;
          const cachedCredentialsId = (
            row as { credentials_id?: string } | null
          )?.credentials_id;
          if (
            typeof cachedCredentialsId === "string" &&
            cachedCredentialsId.length
          ) {
            existingCredentialsId = cachedCredentialsId;
            console.log(
              `[tink-create-link-token] Using credentials_id from tink_credentials_cache for UPDATE`,
            );
          }
        }
      } catch (dbLookupError) {
        console.log(
          `[tink-create-link-token] DB lookup for existing credentials failed, will fallback:`,
          dbLookupError instanceof Error
            ? dbLookupError.message
            : String(dbLookupError),
        );
      }

      // Fallback: ask Tink directly (best-effort)
      if (!existingCredentialsId && intent !== "update") {
        try {
          const existingTokenResponse = await getTinkUserAccessToken({
            externalUserId,
            market,
            scopes: config.scopes,
          });

          const credentials = await listTinkCredentials(
            existingTokenResponse.access_token,
          );

          if (credentials.length > 0) {
            // NOTE: This is ambiguous if user has multiple credentials.
            // We keep it as a fallback only; primary strategy is DB-stored credentials_id.
            existingCredentialsId = credentials[0].id;
            console.log(
              `[tink-create-link-token] Fallback: found existing credential ${existingCredentialsId} for ${externalUserId}, will use UPDATE mode`,
            );
          }
        } catch (credentialCheckError) {
          console.log(
            `[tink-create-link-token] Could not list credentials for ${externalUserId}, will use ADD mode:`,
            credentialCheckError instanceof Error
              ? credentialCheckError.message
              : String(credentialCheckError),
          );
        }
      }

      if (intent === "update" && !existingCredentialsId) {
        return new Response(
          JSON.stringify({
            error:
              "No existing Tink credentials found to update. Please start a new connection.",
          }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Create Tink user and get authorization code via delegated grant
    // This code will be embedded in the Tink Link URL and consumed by Tink Link itself
    const authorizationCode = await createTinkUserAuthorizationCode({
      externalUserId,
      scopes: config.scopes,
      market,
      locale: body.locale,
      // If your Tink setup requires an actor client for Link, set:
      // TINK_LINK_ACTOR_CLIENT_ID via Supabase secrets.
      actorClientId: Deno.env.get("TINK_LINK_ACTOR_CLIENT_ID")?.trim(),
    });

    console.log(
      "[tink-create-link-token] Created authorization code for",
      externalUserId,
    );

    // Generate Tink Link URL with the authorization code
    // If existingCredentialsId is set, use UPDATE mode; otherwise use ADD mode
    const { link_url, state } = createTinkLinkUrl({
      market,
      locale: body.locale,
      scopes: config.scopes,
      authorizationCode,
      credentialsId: existingCredentialsId, // undefined for new connections, credentialsId for updates
    });

    const debugUrl = new URL(link_url);
    debugUrl.searchParams.set("authorization_code", "REDACTED");
    const mode = existingCredentialsId ? "UPDATE" : "ADD";
    console.log(
      `[tink-create-link-token] Generated ${mode} link URL`,
      debugUrl.toString(),
    );

    // Store state and external_user_id in DB for CSRF protection and callback handling
    // The callback will use this to create the connection after user connects in Tink Link
    // Expires in 10 minutes
    const expiresAtState = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: stateError } = await supabase
      .from("tink_auth_states")
      .insert({
        state,
        user_id: authResult.userId,
        external_user_id: externalUserId,
        market: market.toUpperCase(),
        expires_at: expiresAtState,
      });

    if (stateError) {
      console.error(
        "[tink-create-link-token] Failed to store state",
        stateError,
      );
      return new Response(
        JSON.stringify({ error: "Failed to initialize Tink link" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: TINK_PROVIDER,
        linkUrl: link_url,
        state,
        mode: existingCredentialsId ? "UPDATE" : "ADD",
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[tink-create-link-token] Unexpected error", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create Tink link",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
