import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";

interface PaymentAssociation {
  importedTransactionId: string;
  canonicalTransactionId: string;
}

interface AssociationRequest {
  canonicalRecurringId: string;
  replacementRecurringId: string;
  paymentAssociations: PaymentAssociation[];
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string =>
  typeof value === "string" && uuid.test(value);
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const unavailable = () =>
  response(
    {
      success: false,
      code: "SERVER_ERROR",
      error: "Temporary series association failure",
    },
    503,
  );

function isAssociationRequest(value: unknown): value is AssociationRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  if (
    !isUuid(body.canonicalRecurringId) ||
    !isUuid(body.replacementRecurringId) ||
    body.canonicalRecurringId.toLowerCase() ===
      body.replacementRecurringId.toLowerCase() ||
    !Array.isArray(body.paymentAssociations) ||
    body.paymentAssociations.length > 1000
  )
    return false;
  const imported = new Set<string>();
  const canonical = new Set<string>();
  for (const pair of body.paymentAssociations) {
    if (
      !pair ||
      typeof pair !== "object" ||
      Array.isArray(pair) ||
      !isUuid(pair.importedTransactionId) ||
      !isUuid(pair.canonicalTransactionId)
    )
      return false;
    const source = pair.importedTransactionId.toLowerCase();
    const target = pair.canonicalTransactionId.toLowerCase();
    if (imported.has(source) || canonical.has(target) || source === target)
      return false;
    imported.add(source);
    canonical.add(target);
  }
  return [...imported].every((id) => !canonical.has(id));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return response({ success: false, code: "METHOD_NOT_ALLOWED" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return unavailable();
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!isAssociationRequest(body))
      return response(
        {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Invalid series association request",
        },
        400,
      );
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const auth = await authenticateUser(req, supabase);
    if (!auth.success || !auth.userId)
      return response(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: "Authentication required",
        },
        auth.statusCode ?? 401,
      );
    const { data, error } = await supabase.rpc("associate_recurring_series", {
      p_actor_user_id: auth.userId,
      p_canonical_recurring_id: body.canonicalRecurringId,
      p_replacement_recurring_id: body.replacementRecurringId,
      p_payment_associations: body.paymentAssociations,
    });
    if (error) {
      const code =
        error.code === "P0001" &&
        /^(ASSOCIATION|OCCURRENCE)_[A-Z_]+$/.test(error.message ?? "")
          ? error.message
          : null;
      if (!code) return unavailable();
      const status = code.endsWith("UNAUTHORIZED")
        ? 403
        : code === "ASSOCIATION_NOT_FOUND"
          ? 404
          : code === "ASSOCIATION_INVALID_INPUT"
            ? 400
            : 409;
      return response({ success: false, code, error: code }, status);
    }
    if (
      !data ||
      typeof data !== "object" ||
      data.canonicalRecurringId?.toLowerCase() !==
        body.canonicalRecurringId.toLowerCase()
    )
      return unavailable();
    return response({ success: true, data });
  } catch {
    return unavailable();
  }
});
