// Supabase Edge Function: update-preferred-platform
// Update user's platform in user_contacts (or create contact if missing).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";

interface RequestBody {
  phone?: string;
  userId?: string;
  platform?: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 400, details?: unknown) {
  return json({ error: message, details }, status);
}

function normalizePlatform(input?: string | null): string | null {
  if (input == null) return null;

  const normalized = String(input).trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "ios") return "IOS";
  if (normalized === "android") return "Android";

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return error("Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return error("Server not configured", 500);
  }

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const { phone, userId: requestedUserId } = payload || {};
  const rawPlatform = payload?.platform;
  const preferredPlatform = normalizePlatform(rawPlatform ?? undefined);

  if (phone && typeof phone !== "string") {
    return error("'phone' must be a string", 400);
  }
  if (requestedUserId && typeof requestedUserId !== "string") {
    return error("'userId' must be a string", 400);
  }
  if (rawPlatform != null && preferredPlatform == null) {
    return error("Invalid platform", 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-update-preferred-platform" },
    },
  });

  const authResult = await authenticateUserOrInternalSecret(req, supabase);
  if (!authResult.success) {
    return error(
      authResult.error ?? "Unauthorized",
      authResult.statusCode ?? 401,
    );
  }

  const userId = authResult.isInternalService
    ? requestedUserId
    : authResult.userId;
  const effectivePhone = authResult.isInternalService ? phone : undefined;

  if (!effectivePhone && !userId) {
    return error("Either 'phone' or 'userId' must be provided", 400);
  }

  let contact: Record<string, unknown> | null = null;
  let contactErr: unknown = null;
  if (effectivePhone) {
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, platform")
      .eq("phone_e164", effectivePhone)
      .order("id", { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  } else if (userId) {
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, platform")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  }

  if (contactErr) {
    console.error("contact select error", contactErr);
    return error("Failed to fetch contact", 500);
  }

  let contactId = (contact?.id as string | undefined) ?? null;
  if (!contactId) {
    if (effectivePhone) {
      const { data: upserted, error: upsertErr } = await supabase
        .from("user_contacts")
        .upsert(
          {
            phone_e164: effectivePhone,
            user_id: userId || null,
            platform: preferredPlatform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "phone_e164" },
        )
        .select("id")
        .single();
      if (upsertErr) return error("Failed to create contact", 500, upsertErr);
      contactId = upserted.id;
    } else if (userId) {
      const { data: inserted, error: insertErr } = await supabase
        .from("user_contacts")
        .insert({ user_id: userId, platform: preferredPlatform })
        .select("id")
        .single();
      if (insertErr) return error("Failed to create contact", 500, insertErr);
      contactId = inserted.id;
    }
  }

  const updateQuery = supabase.from("user_contacts").update({
    platform: preferredPlatform,
  });
  const { error: updateErr } = userId && !effectivePhone
    ? await updateQuery.eq("user_id", userId)
    : await updateQuery.eq("id", contactId!);
  if (updateErr) return error("Failed to update contact", 500, updateErr);

  return json({
    ok: true,
    results: { contactId, platform: preferredPlatform },
  });
});
