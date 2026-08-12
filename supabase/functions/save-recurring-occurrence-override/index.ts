import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";

interface RequestBody {
  userId?: string;
  recurringId?: string;
  scheduledOccurrenceDate?: string;
  paidDate?: string;
  amount?: number;
  category?: string;
  currency?: string;
  accountId?: string | null;
  merchant?: string;
  description?: string;
  source?: string;
  customSplits?: unknown;
  payerUserId?: string;
  updateFutureAmount?: boolean;
  clientMutationId?: string;
  idempotencyKey?: string;
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid = (value?: string) =>
  value != null && uuid.test(value.trim()) ? value.trim() : null;
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return response(
      { success: false, code: "METHOD_NOT_ALLOWED", error: "Use POST." },
      405,
    );
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return response(
      {
        success: false,
        code: "SERVER_ERROR",
        error: "Server configuration error",
      },
      500,
    );
  }
  try {
    const body: RequestBody = await req.json();
    const recurringId = validUuid(body.recurringId);
    const accountId = body.accountId == null ? null : validUuid(body.accountId);
    const payerUserId = body.payerUserId == null
      ? null
      : validUuid(body.payerUserId);
    const scheduledDate = normalizeCalendarDateString(
      body.scheduledOccurrenceDate ?? "",
    );
    const paidDate = normalizeCalendarDateString(body.paidDate ?? "");
    const amountCents = Math.round((body.amount ?? 0) * 100);
    const idempotencyKey = body.idempotencyKey?.trim() ||
      body.clientMutationId?.trim() || null;
    if (
      !recurringId ||
      !scheduledDate ||
      !paidDate ||
      (body.accountId != null && !accountId) ||
      (body.payerUserId != null && !payerUserId) ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0 ||
      !idempotencyKey
    ) {
      return response(
        {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Invalid occurrence override request",
        },
        400,
      );
    }
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const auth = await authenticateUserOrInternalSecret(req, supabase);
    const actorUserId = auth.isInternalService
      ? validUuid(body.userId)
      : (auth.userId ?? null);
    if (!auth.success || !actorUserId) {
      return response(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: auth.error ?? "Authentication required",
        },
        auth.statusCode ?? 401,
      );
    }
    const { data, error } = await supabase.rpc(
      "save_recurring_occurrence_override_v1",
      {
        p_actor_user_id: actorUserId,
        p_recurring_id: recurringId,
        p_scheduled_occurrence_date: scheduledDate,
        p_paid_date: paidDate,
        p_amount_cents: amountCents,
        p_account_id: accountId,
        p_merchant: body.merchant ?? null,
        p_description: body.description ?? null,
        p_source: body.source?.trim() || null,
        p_custom_splits: body.customSplits ?? null,
        p_payer_user_id: payerUserId,
        p_update_future_amount: body.updateFutureAmount === true,
        p_idempotency_key: idempotencyKey,
        p_category: body.category?.trim() || null,
        p_currency: body.currency?.trim().toUpperCase() || null,
      },
    );
    if (error) {
      const code = String(error.message).match(/OCCURRENCE_[A-Z_]+/)?.[0] ??
        "OCCURRENCE_FAILED";
      return response(
        { success: false, code, error: error.message },
        code === "OCCURRENCE_UNAUTHORIZED" ? 403 : 400,
      );
    }
    return response({ success: true, data });
  } catch (error) {
    return response(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: error instanceof Error ? error.message : "Invalid request",
      },
      400,
    );
  }
});
