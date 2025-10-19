// Supabase Edge Function: update-preferred-currency
// Simple API to update preferred currency for a user (direct database operation)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

// Types
interface SetBudgetRequest {
  phone?: string;      // E.164 format (optional if userId provided)
  userId?: string;     // User ID (optional if phone provided) 
  currency: string;   // currency code, default USD
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function errorResponse(message: string, status = 400, details?: unknown) {
  return jsonResponse({ error: message, details }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server not configured", 500);
  }

  let payload: SetBudgetRequest;
  try {
    payload = await req.json();
  } catch (e) {
    return errorResponse("Invalid JSON body", 400);
  }

  const { phone, userId, currency: inputCurrency } = payload || {};
  console.log("payload", payload);
  
  // Validate: either phone or userId must be provided
  if (!phone && !userId) {
    return errorResponse("Either 'phone' or 'userId' must be provided", 400);
  }
  if (phone && typeof phone !== "string") {
    return errorResponse("'phone' must be a string", 400);
  }
  if (userId && typeof userId !== "string") {
    return errorResponse("'userId' must be a string", 400);
  }

  const providedCurrency = (inputCurrency || "USD").toUpperCase();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "moneko-set-budget" } },
  });

  // Find or create contact - search by phone if provided, otherwise by userId
  let contact: any = null;
  let contactErr: any = null;
  
  if (phone) {
    // Search by phone number (handle duplicates by getting most recent)
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_currency")
      .eq("phone_e164", phone)
      .order('id', { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  } else if (userId) {
    // Search by user_id (handle duplicates by getting most recent)
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_currency, phone_e164")
      .eq("user_id", userId)
      .order('id', { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  }

  let contactId: string | null = contact?.id ?? null;
  if (contactErr) {
    console.error("contact select error", contactErr);
    return errorResponse("Failed to fetch contact", 500);
  }

  if (!contactId) {
    // Create new contact using UPSERT to prevent duplicates
    if (phone) {
      // If phone provided, upsert contact with phone (prevents duplicates on phone_e164)
      const { data: upserted, error: upsertErr } = await supabase
        .from("user_contacts")
        .upsert(
          { phone_e164: phone, user_id: userId || null, preferred_currency: providedCurrency, updated_at: new Date().toISOString() },
          { onConflict: 'phone_e164' }
        )
        .select("id")
        .single();
      if (upsertErr) {
        console.error("contact upsert error", upsertErr);
        return errorResponse("Failed to create contact", 500);
      }
      contactId = upserted.id;
    } else if (userId) {
      // If only userId provided, insert contact (no unique constraint on user_id, but query fix prevents duplicates)
      const { data: inserted, error: insertErr } = await supabase
        .from("user_contacts")
        .insert({ user_id: userId, preferred_currency: providedCurrency })
        .select("id")
        .single();
      if (insertErr) {
        console.error("contact insert error", insertErr);
        return errorResponse("Failed to create contact", 500);
      }
      contactId = inserted.id;
    }
  }

  const { error: updateErr } = await supabase
    .from("user_contacts")
    .update({ preferred_currency: providedCurrency })
    .eq("id", contactId);

  if (updateErr) {
    console.error("contact update error", updateErr);
    return errorResponse("Failed to update contact", 500);
  }
  const results={
    contactId,
    preferredCurrency: providedCurrency,
  }

  return jsonResponse({ ok: true, results });
});
