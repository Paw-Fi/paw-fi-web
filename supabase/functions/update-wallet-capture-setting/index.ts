// Supabase Edge Function: update-wallet-capture-setting
// Toggles wallet_capture_enabled for the authenticated user's user_contacts row.
// Creates the row if none exists (userId-only, no phone required).
// Mirrors the pattern used by update-preferred-currency.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  hasPlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";

interface UpdateWalletCaptureRequest {
  enabled: boolean;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400, details?: unknown) {
  return jsonResponse({ error: message, details }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server not configured", 500);
  }

  // Verify the caller's JWT and extract their user ID.
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!bearerToken) {
    return errorResponse("Unauthorized", 401);
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-update-wallet-capture-setting" },
    },
  });

  const { data: userData, error: authError } = await authClient.auth.getUser(
    bearerToken,
  );
  if (authError || !userData?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }
  const userId = userData.user.id;

  let payload: UpdateWalletCaptureRequest;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (typeof payload?.enabled !== "boolean") {
    return errorResponse("'enabled' must be a boolean", 400);
  }

  // Use the service role client to bypass RLS — same pattern as all other
  // user_contacts write operations in this project.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-update-wallet-capture-setting" },
    },
  });

  if (payload.enabled) {
    try {
      const subscription = await loadLatestSubscriptionForUser(
        supabase,
        userId,
      );
      if (!hasPlusEntitlement(subscription)) {
        return jsonResponse(jsonSubscriptionRequired("wallet capture"), 403);
      }
    } catch (error) {
      await reportEdgeFunctionError({
        functionName: "update-wallet-capture-setting",
        error,
        context: { operation: "subscriptions.select_entitlement", userId },
      });
      return errorResponse("Failed to verify subscription", 500);
    }
  }

  // Find the user's existing contact row (most recent, in case of duplicates).
  const { data: existing, error: selectErr } = await supabase
    .from("user_contacts")
    .select("id")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectErr) {
    console.error("[update-wallet-capture-setting] select error", selectErr);
    await reportEdgeFunctionError({
      functionName: "update-wallet-capture-setting",
      error: selectErr,
      context: { operation: "user_contacts.select", userId },
    });
    return errorResponse("Failed to fetch contact", 500);
  }

  let contactId: string;

  if (existing) {
    // Row exists — update in place.
    const { error: updateErr } = await supabase
      .from("user_contacts")
      .update({ wallet_capture_enabled: payload.enabled })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("[update-wallet-capture-setting] update error", updateErr);
      await reportEdgeFunctionError({
        functionName: "update-wallet-capture-setting",
        error: updateErr,
        context: {
          operation: "user_contacts.update_wallet_capture",
          userId,
          contactId: existing.id,
        },
      });
      return errorResponse("Failed to update setting", 500);
    }
    contactId = existing.id;
  } else {
    // No row yet — insert a minimal one (phone_e164 is nullable since
    // migration 20251008_user_contacts_preferred_currency.sql).
    const { data: inserted, error: insertErr } = await supabase
      .from("user_contacts")
      .upsert(
        {
          user_id: userId,
          wallet_capture_enabled: payload.enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (insertErr) {
      console.error("[update-wallet-capture-setting] insert error", insertErr);
      await reportEdgeFunctionError({
        functionName: "update-wallet-capture-setting",
        error: insertErr,
        context: { operation: "user_contacts.upsert_wallet_capture", userId },
      });
      return errorResponse("Failed to create contact", 500);
    }
    contactId = inserted.id;
  }

  return jsonResponse({ ok: true, contactId, enabled: payload.enabled });
});
