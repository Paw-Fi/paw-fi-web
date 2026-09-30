import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  isRecurringOccurrenceRequestBody,
  recurringOccurrenceDatabaseFailure,
} from "../shared/recurring-occurrence-errors.ts";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
    return json(
      { success: false, code: "METHOD_NOT_ALLOWED", error: "Use POST." },
      405,
    );
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return json(
      {
        success: false,
        code: "SERVER_ERROR",
        error: "Server configuration error",
      },
      500,
    );
  }
  try {
    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Invalid JSON request",
      }, 400);
    }
    if (!isRecurringOccurrenceRequestBody(parsed)) {
      return json({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Invalid request",
      }, 400);
    }
    const body = parsed;
    const recurringId =
      typeof body.recurringId === "string" && uuid.test(body.recurringId)
        ? body.recurringId
        : null;
    const scheduledDate = normalizeCalendarDateString(
      body.scheduledOccurrenceDate ?? "",
    );
    if (!recurringId || !scheduledDate) {
      return json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Invalid skip request",
        },
        400,
      );
    }
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const auth = await authenticateUserOrInternalSecret(req, supabase);
    const actorUserId = auth.isInternalService ? body.userId : auth.userId;
    if (
      !auth.success ||
      typeof actorUserId !== "string" ||
      !uuid.test(actorUserId)
    ) {
      return json(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: auth.error ?? "Authentication required",
        },
        auth.statusCode ?? 401,
      );
    }
    const { data, error } = await supabase.rpc("skip_recurring_occurrence_v1", {
      p_actor_user_id: actorUserId,
      p_recurring_id: recurringId,
      p_scheduled_occurrence_date: scheduledDate,
    });
    if (error) {
      const failure = recurringOccurrenceDatabaseFailure(error);
      return json(failure.body, failure.status);
    }
    return json({ success: true, data });
  } catch {
    const failure = recurringOccurrenceDatabaseFailure({});
    return json(failure.body, failure.status);
  }
});
