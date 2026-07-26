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
  accountId?: string;
  merchant?: string | null;
  description?: string;
  updateFutureAmount?: boolean;
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid = (value?: string) =>
  value && uuid.test(value.trim()) ? value.trim() : null;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      error: "Use POST.",
    }, 405);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return json({
      success: false,
      code: "SERVER_ERROR",
      error: "Server configuration error",
    }, 500);
  }
  try {
    const body: RequestBody = await req.json();
    const recurringId = validUuid(body.recurringId);
    const scheduledDate = normalizeCalendarDateString(
      body.scheduledOccurrenceDate ?? "",
    );
    const accountId = body.accountId === undefined
      ? null
      : validUuid(body.accountId);
    const paidDate = body.paidDate === undefined
      ? null
      : normalizeCalendarDateString(body.paidDate);
    const amountCents = body.amount === undefined
      ? null
      : Math.round(body.amount * 100);
    if (
      !recurringId || !scheduledDate ||
      (body.accountId !== undefined && !accountId) ||
      (body.paidDate !== undefined && !paidDate) ||
      (amountCents !== null &&
        (!Number.isSafeInteger(amountCents) || amountCents <= 0))
    ) {
      return json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Invalid occurrence update request",
      }, 400);
    }
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const auth = await authenticateUserOrInternalSecret(req, supabase);
    const actorUserId = auth.isInternalService
      ? validUuid(body.userId)
      : auth.userId ?? null;
    if (!auth.success || !actorUserId) {
      return json({
        success: false,
        code: "UNAUTHORIZED",
        error: auth.error ?? "Authentication required",
      }, auth.statusCode ?? 401);
    }
    const { data, error } = await supabase.rpc(
      "update_recurring_occurrence_v1",
      {
        p_actor_user_id: actorUserId,
        p_recurring_id: recurringId,
        p_scheduled_occurrence_date: scheduledDate,
        p_paid_date: paidDate,
        p_amount_cents: amountCents,
        p_account_id: accountId,
        p_merchant: body.merchant,
        p_description: body.description,
        p_update_future_amount: body.updateFutureAmount === true,
      },
    );
    if (error) {
      const code = String(error.message).match(/OCCURRENCE_[A-Z_]+/)?.[0] ??
        "OCCURRENCE_FAILED";
      return json(
        { success: false, code, error: error.message },
        code === "OCCURRENCE_UNAUTHORIZED" ? 403 : 400,
      );
    }
    return json({ success: true, data });
  } catch (error) {
    return json({
      success: false,
      code: "VALIDATION_ERROR",
      error: error instanceof Error ? error.message : "Invalid request",
    }, 400);
  }
});
