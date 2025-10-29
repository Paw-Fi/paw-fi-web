// Supabase Edge Function: update-preferred-language
// Update user's preferred language code in user_contacts (or create contact if missing)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

interface RequestBody {
  phone?: string;
  userId?: string;
  language?: string | null; // e.g., "en", "zh"; null clears preference
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function error(message: string, status = 400, details?: unknown) {
  return json({ error: message, details }, status);
}

// Very permissive validator: allow a-z 2-8 chars (e.g., en, zh, pt, es, fr, de)
function normalizeLanguage(input?: string | null): string | null {
  if (input == null) return null; // explicit clear
  const v = String(input).trim().toLowerCase();
  if (!v) return null;
  // map legacy values
  if (v === "cn") return "zh";
  // accept simple tags like en, zh, fr; if longer, keep first segment
  const code = v.includes("-") ? v.split("-")[0] : v;
  return /^[a-z]{2,8}$/.test(code) ? code : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return error("Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return error("Server not configured", 500);

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const { phone, userId } = payload || {};
  const preferredLanguage = normalizeLanguage(payload?.language ?? undefined);

  if (!phone && !userId) return error("Either 'phone' or 'userId' must be provided", 400);
  if (phone && typeof phone !== "string") return error("'phone' must be a string", 400);
  if (userId && typeof userId !== "string") return error("'userId' must be a string", 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "moneko-update-preferred-language" } },
  });

  // find existing contact
  let contact: any = null;
  let contactErr: any = null;
  if (phone) {
    const r = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_language")
      .eq("phone_e164", phone)
      .order("id", { ascending: false })
      .limit(1);
    contact = r.data?.[0] ?? null;
    contactErr = r.error;
  } else if (userId) {
    const r = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_language")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1);
    contact = r.data?.[0] ?? null;
    contactErr = r.error;
  }

  if (contactErr) {
    console.error("contact select error", contactErr);
    return error("Failed to fetch contact", 500);
  }

  // create if missing
  let contactId: string | null = contact?.id ?? null;
  if (!contactId) {
    if (phone) {
      const { data: upserted, error: upsertErr } = await supabase
        .from("user_contacts")
        .upsert(
          { phone_e164: phone, user_id: userId || null, preferred_language: preferredLanguage, updated_at: new Date().toISOString() },
          { onConflict: "phone_e164" }
        )
        .select("id")
        .single();
      if (upsertErr) return error("Failed to create contact", 500, upsertErr);
      contactId = upserted.id;
    } else if (userId) {
      const { data: inserted, error: insertErr } = await supabase
        .from("user_contacts")
        .insert({ user_id: userId, preferred_language: preferredLanguage })
        .select("id")
        .single();
      if (insertErr) return error("Failed to create contact", 500, insertErr);
      contactId = inserted.id;
    }
  }

  // update preference (allow null to clear)
  const { error: updateErr } = await supabase
    .from("user_contacts")
    .update({ preferred_language: preferredLanguage })
    .eq("id", contactId!);
  if (updateErr) return error("Failed to update contact", 500, updateErr);

  return json({ ok: true, results: { contactId, preferredLanguage } });
});
