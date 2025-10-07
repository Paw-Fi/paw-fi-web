// Supabase Edge Function: categories
// Manage expense categories per contact (add/list) bound to expenses table usage.
// Categories are stored in public.expense_categories and referenced by name in expenses.category.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Server not configured" }, 500);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "moneko-categories" } },
  });

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const action = String(payload?.action || "").toLowerCase();
  const phone = String(payload?.phone || "").trim();
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";

  if (!phone) return json({ error: "Missing phone" }, 400);
  if (!["add", "list"].includes(action)) return json({ error: "Invalid action" }, 400);

  // Ensure contact
  const { data: contact, error: cErr } = await supabase
    .from("user_contacts")
    .select("id")
    .eq("phone_e164", phone)
    .maybeSingle();
  if (cErr) return json({ error: "Contact lookup failed" }, 500);
  let contactId = contact?.id as string | undefined;
  if (!contactId) {
    const { data: inserted, error: iErr } = await supabase
      .from("user_contacts")
      .insert({ phone_e164: phone })
      .select("id")
      .maybeSingle();
    if (iErr || !inserted?.id) return json({ error: "Contact create failed" }, 500);
    contactId = inserted.id;
  }

  if (action === "add") {
    if (!name) return json({ error: "Missing name" }, 400);
    // Basic validation: 1-40 chars, letters/numbers/spaces/-/_
    if (!/^[\w\s\-]{1,40}$/.test(name)) return json({ error: "Invalid category name" }, 400);

    const { error: insErr } = await supabase
      .from("expense_categories")
      .insert({ contact_id: contactId, name, is_default: false });
    if (insErr) {
      if (String(insErr.message || "").toLowerCase().includes("duplicate")) {
        return json({ ok: true, message: "Category already exists" });
      }
      return json({ error: "Failed to add category" }, 500);
    }
    return json({ ok: true, message: "Category added", name });
  }

  // list
  const { data: defaults, error: dErr } = await supabase
    .from("expense_categories")
    .select("name, is_default")
    .is("contact_id", null)
    .order("name", { ascending: true });
  const { data: custom, error: uErr } = await supabase
    .from("expense_categories")
    .select("name, is_default")
    .eq("contact_id", contactId)
    .order("name", { ascending: true });
  if (dErr || uErr) return json({ error: "Failed to fetch categories" }, 500);

  return json({ ok: true, categories: [...(defaults || []), ...(custom || [])] });
});
