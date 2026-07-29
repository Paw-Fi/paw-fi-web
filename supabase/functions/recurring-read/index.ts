import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";

type Operation = "badge" | "listSeries" | "getSeries" | "getOccurrence";

interface RequestBody {
  operation?: Operation;
  userId?: string;
  householdId?: string;
  currencies?: string[];
  recurringId?: string;
  occurrenceId?: string;
  afterNextOccurrenceDate?: string;
  afterId?: string;
  limit?: number;
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const currency = /^[A-Z]{3}$/;
const operations = new Set<Operation>([
  "badge",
  "listSeries",
  "getSeries",
  "getOccurrence",
]);
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
    return json(
      {
        success: false,
        code: "METHOD_NOT_ALLOWED",
        error: "Use POST.",
      },
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
    const body: RequestBody = await req.json();
    const operation = body.operation;
    const householdId =
      body.householdId === undefined ? null : validUuid(body.householdId);
    const recurringId = validUuid(body.recurringId);
    const occurrenceId = validUuid(body.occurrenceId);
    const afterDate =
      body.afterNextOccurrenceDate === undefined
        ? null
        : normalizeCalendarDateString(body.afterNextOccurrenceDate);
    const afterId = validUuid(body.afterId);
    const limit = body.limit === undefined ? 50 : Math.trunc(body.limit);
    const currencies =
      body.currencies === undefined
        ? null
        : Array.from(
            new Set(body.currencies.map((value) => value.toUpperCase())),
          );

    const invalidCursor =
      (body.afterNextOccurrenceDate === undefined) !==
        (body.afterId === undefined) ||
      (body.afterNextOccurrenceDate !== undefined && (!afterDate || !afterId));
    const invalidCurrencies =
      currencies !== null &&
      (currencies.length === 0 ||
        currencies.some((value) => !currency.test(value)));
    if (
      !operation ||
      !operations.has(operation) ||
      (body.householdId !== undefined && !householdId) ||
      invalidCurrencies ||
      invalidCursor ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      (operation === "getSeries" && !recurringId) ||
      (operation === "getOccurrence" && !occurrenceId)
    ) {
      return json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Invalid recurring read request",
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
      return json(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: auth.error ?? "Authentication required",
        },
        auth.statusCode ?? 401,
      );
    }

    let rpcName: string;
    let rpcArguments: Record<string, unknown>;
    switch (operation) {
      case "badge":
        rpcName = "has_actionable_recurring_occurrences_v1";
        rpcArguments = {
          p_actor_user_id: actorUserId,
          p_household_id: householdId,
          p_currencies: currencies,
        };
        break;
      case "listSeries":
        rpcName = "list_recurring_series_summary_v1";
        rpcArguments = {
          p_actor_user_id: actorUserId,
          p_household_id: householdId,
          p_currencies: currencies,
          p_after_next_occurrence_date: afterDate,
          p_after_id: afterId,
          p_limit: limit,
        };
        break;
      case "getSeries":
        rpcName = "get_recurring_series_detail_v1";
        rpcArguments = {
          p_actor_user_id: actorUserId,
          p_recurring_id: recurringId,
        };
        break;
      case "getOccurrence":
        rpcName = "get_recurring_occurrence_detail_v1";
        rpcArguments = {
          p_actor_user_id: actorUserId,
          p_occurrence_id: occurrenceId,
        };
        break;
    }

    const { data, error } = await supabase.rpc(rpcName, rpcArguments);
    if (error) {
      const code =
        String(error.message).match(/OCCURRENCE_[A-Z_]+/)?.[0] ??
        "OCCURRENCE_FAILED";
      return json(
        { success: false, code, error: error.message },
        code === "OCCURRENCE_UNAUTHORIZED"
          ? 403
          : code === "OCCURRENCE_NOT_FOUND"
            ? 404
            : 400,
      );
    }

    return json({ success: true, data });
  } catch (error) {
    return json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: error instanceof Error ? error.message : "Invalid request",
      },
      400,
    );
  }
});
