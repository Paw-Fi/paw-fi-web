// Supabase Edge Function: update-preferred-currency
// Simple API to update preferred currency for a user (direct database operation)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

// Types
interface SetBudgetRequest {
  phone?: string; // E.164 format (optional if userId provided)
  userId?: string; // User ID (optional if phone provided)
  currency: string; // currency code, default USD
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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server not configured", 500);
  }

  // If the caller provides an Authorization header, verify it and lock the
  // request to the authenticated user. This prevents arbitrary userId updates.
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  let authedUserId: string | null = null;
  if (bearerToken) {
    if (!SUPABASE_ANON_KEY) {
      return errorResponse("Server not configured", 500);
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-update-preferred-currency" },
      },
    });
    const { data, error } = await authClient.auth.getUser(bearerToken);
    if (error || !data?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }
    authedUserId = data.user.id;
  }

  let payload: SetBudgetRequest;
  try {
    payload = await req.json();
  } catch (e) {
    return errorResponse("Invalid JSON body", 400);
  }

  let { phone, userId, currency: inputCurrency } = payload || {};

  if (authedUserId) {
    if (userId && userId !== authedUserId) {
      return errorResponse("Forbidden", 403);
    }
    userId = authedUserId;
    phone = undefined;
  }

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

  const providedCurrency = validateCurrency(inputCurrency);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-update-preferred-currency" },
    },
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
      .order("id", { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  } else if (userId) {
    // Search by user_id (handle duplicates by getting most recent)
    const result = await supabase
      .from("user_contacts")
      .select("id, user_id, preferred_currency, phone_e164")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  }

  let contactId: string | null = contact?.id ?? null;
  if (contactErr) {
    console.error("contact select error", contactErr);
    await reportEdgeFunctionError({
      functionName: "update-preferred-currency",
      error: contactErr,
      context: {
        operation: "user_contacts.select",
        hasPhone: Boolean(phone),
        hasUserId: Boolean(userId),
      },
    });
    return errorResponse("Failed to fetch contact", 500);
  }

  if (!contactId) {
    // Create new contact using UPSERT to prevent duplicates
    if (phone) {
      // If phone provided, upsert contact with phone (prevents duplicates on phone_e164)
      const { data: upserted, error: upsertErr } = await supabase
        .from("user_contacts")
        .upsert(
          {
            phone_e164: phone,
            user_id: userId || null,
            preferred_currency: providedCurrency,
            updated_at: new Date().toISOString(),
          },
          { onConflict: userId ? "user_id" : "phone_e164" },
        )
        .select("id")
        .single();
      if (upsertErr) {
        console.error("contact upsert error", upsertErr);
        await reportEdgeFunctionError({
          functionName: "update-preferred-currency",
          error: upsertErr,
          context: {
            operation: "user_contacts.upsert_by_phone",
            hasUserId: Boolean(userId),
          },
        });
        return errorResponse("Failed to create contact", 500);
      }
      contactId = upserted.id;
    } else if (userId) {
      // If only userId provided, upsert on user_id to prevent duplicate contacts.
      const { data: inserted, error: insertErr } = await supabase
        .from("user_contacts")
        .upsert(
          {
            user_id: userId,
            preferred_currency: providedCurrency,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("id")
        .single();
      if (insertErr) {
        console.error("contact insert error", insertErr);
        await reportEdgeFunctionError({
          functionName: "update-preferred-currency",
          error: insertErr,
          context: { operation: "user_contacts.upsert_by_user_id", userId },
        });
        return errorResponse("Failed to create contact", 500);
      }
      contactId = inserted.id;
    }
  }

  const updatedAt = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("user_contacts")
    .update({ preferred_currency: providedCurrency, updated_at: updatedAt })
    .eq("id", contactId);

  if (updateErr) {
    console.error("contact update error", updateErr);
    await reportEdgeFunctionError({
      functionName: "update-preferred-currency",
      error: updateErr,
      context: {
        operation: "user_contacts.update_preferred_currency",
        contactId,
        userId,
      },
    });
    return errorResponse("Failed to update contact", 500);
  }

  const syncUserId = userId || contact?.user_id || null;
  if (syncUserId) {
    const { error: syncErr } = await supabase
      .from("user_contacts")
      .update({ preferred_currency: providedCurrency, updated_at: updatedAt })
      .eq("user_id", syncUserId);

    if (syncErr) {
      console.error("contact currency sync error", syncErr);
      await reportEdgeFunctionError({
        functionName: "update-preferred-currency",
        error: syncErr,
        context: {
          operation: "user_contacts.sync_preferred_currency_by_user",
          userId: syncUserId,
        },
      });
      return errorResponse("Failed to sync contact currency", 500);
    }
  }

  const results = {
    contactId,
    preferredCurrency: providedCurrency,
  };

  return jsonResponse({ ok: true, results });
});
