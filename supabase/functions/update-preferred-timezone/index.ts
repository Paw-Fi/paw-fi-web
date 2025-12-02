// Supabase Edge Function: update-preferred-timezone
// Update user's preferred timezone in user_contacts (or create contact if missing).
// Accepts IANA timezones (e.g., "Asia/Singapore") or UTC offsets (e.g., "UTC+08:00").

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

interface RequestBody {
  phone?: string;
  userId?: string;
  timezone?: string | null; // null clears preference
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function error(message: string, status = 400, details?: unknown) {
  return json({ error: message, details }, status);
}

// Very lightweight validator: allow common IANA / UTC offset formats
function normalizeTimezone(input?: string | null): string | null {
  if (input == null) return null; // explicit clear
  const tz = String(input).trim();
  if (!tz) return null;
  // Allow UTC offsets like UTC+08:00 or UTC-05
  if (/^UTC[+-]\d{1,2}(:?\d{2})?$/.test(tz.toUpperCase())) {
    const normalized = tz.toUpperCase();
    // Ensure minutes part has colon if provided
    if (!normalized.includes(":") && normalized.length > 4) {
      const sign = normalized.slice(3, 4);
      const rest = normalized.slice(4);
      return `UTC${sign}${rest.padStart(2, "0")}:00`;
    }
    return normalized.replace(/^(UTC[+-]\d{1,2})(\d{2})$/, (_m, h, m) => `${h}:${m}`);
  }
  // Permit common IANA-like strings (basic guard)
  if (/^[A-Za-z_]+\/[A-Za-z0-9_\-+]+$/.test(tz)) return tz;
  return null;
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
  const preferredTimezone = normalizeTimezone(payload?.timezone ?? undefined);

  if (!phone && !userId) return error("Either 'phone' or 'userId' must be provided", 400);
  if (phone && typeof phone !== "string") return error("'phone' must be a string", 400);
  if (userId && typeof userId !== "string") return error("'userId' must be a string", 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "moneko-update-preferred-timezone" } },
  });

  // find existing contact
  let contact: any = null;
  let contactErr: any = null;
  if (phone) {
    const r = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_timezone")
      .eq("phone_e164", phone)
      .order("id", { ascending: false })
      .limit(1);
    contact = r.data?.[0] ?? null;
    contactErr = r.error;
  } else if (userId) {
    const r = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_timezone")
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
          { phone_e164: phone, user_id: userId || null, preferred_timezone: preferredTimezone, updated_at: new Date().toISOString() },
          { onConflict: "phone_e164" }
        )
        .select("id")
        .single();
      if (upsertErr) return error("Failed to create contact", 500, upsertErr);
      contactId = upserted.id;
    } else if (userId) {
      const { data: inserted, error: insertErr } = await supabase
        .from("user_contacts")
        .insert({ user_id: userId, preferred_timezone: preferredTimezone })
        .select("id")
        .single();
      if (insertErr) return error("Failed to create contact", 500, insertErr);
      contactId = inserted.id;
    }
  }

  const { error: updateErr } = await supabase
    .from("user_contacts")
    .update({ preferred_timezone: preferredTimezone })
    .eq("id", contactId!);
  if (updateErr) return error("Failed to update contact", 500, updateErr);

  return json({ ok: true, results: { contactId, preferredTimezone } });
});
