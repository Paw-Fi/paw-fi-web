import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonthsClamped(anchor: Date, months: number): Date {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(year, month, Math.min(anchor.getUTCDate(), lastDay)),
  );
}

function addYearsClamped(anchor: Date, years: number): Date {
  const year = anchor.getUTCFullYear() + years;
  const month = anchor.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(year, month, Math.min(anchor.getUTCDate(), lastDay)),
  );
}

function latestScheduledDate(
  rule: Record<string, unknown>,
  today: Date,
): string | null {
  const anchor = parseDate(rule.anchor_date);
  if (!anchor || anchor > today) return null;
  const endDate = parseDate(rule.end_date);
  const latestAllowed = endDate && endDate < today ? endDate : today;
  if (anchor > latestAllowed) return null;

  const interval =
    Number.isInteger(rule.interval) && Number(rule.interval) > 0
      ? Number(rule.interval)
      : 1;
  const frequency =
    typeof rule.frequency === "string"
      ? rule.frequency.toLowerCase()
      : "monthly";
  const elapsedDays = Math.floor(
    (latestAllowed.getTime() - anchor.getTime()) / 86400000,
  );

  switch (frequency) {
    case "daily":
      return formatDate(
        new Date(
          anchor.getTime() +
            Math.floor(elapsedDays / interval) * interval * 86400000,
        ),
      );
    case "weekly":
      return formatDate(
        new Date(
          anchor.getTime() +
            Math.floor(elapsedDays / (7 * interval)) * 7 * interval * 86400000,
        ),
      );
    case "biweekly":
      return formatDate(
        new Date(
          anchor.getTime() + Math.floor(elapsedDays / 14) * 14 * 86400000,
        ),
      );
    case "monthly": {
      const months =
        (latestAllowed.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
        latestAllowed.getUTCMonth() -
        anchor.getUTCMonth();
      let candidate = addMonthsClamped(
        anchor,
        Math.floor(months / interval) * interval,
      );
      if (candidate > latestAllowed) {
        candidate = addMonthsClamped(candidate, -interval);
      }
      return formatDate(candidate);
    }
    case "yearly": {
      let candidate = addYearsClamped(
        anchor,
        Math.floor(
          (latestAllowed.getUTCFullYear() - anchor.getUTCFullYear()) / interval,
        ) * interval,
      );
      if (candidate > latestAllowed) {
        candidate = addYearsClamped(candidate, -interval);
      }
      return formatDate(candidate);
    }
    default:
      return null;
  }
}

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
    const body = await req.json();
    const recurringId =
      typeof body.recurringId === "string" && uuid.test(body.recurringId)
        ? body.recurringId
        : null;
    if (!recurringId) {
      return json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Invalid recurring template",
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

    const { data: template, error: templateError } = await supabase
      .from("expenses")
      .select(
        "id, user_id, household_id, privacy_scope, is_recurring, recurrence_rule, deleted_at",
      )
      .eq("id", recurringId)
      .maybeSingle();
    if (
      templateError ||
      !template ||
      template.deleted_at ||
      template.is_recurring !== true ||
      !template.recurrence_rule
    ) {
      return json(
        {
          success: false,
          code: "NOT_FOUND",
          error: "Recurring template not found",
        },
        404,
      );
    }

    if (template.household_id) {
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("household_id", template.household_id)
        .eq("user_id", actorUserId)
        .maybeSingle();
      if (
        !membership ||
        (template.user_id !== actorUserId && template.privacy_scope !== "full")
      ) {
        return json(
          {
            success: false,
            code: "UNAUTHORIZED",
            error: "Not a household member",
          },
          403,
        );
      }
    } else if (template.user_id !== actorUserId) {
      return json(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: "Not the template owner",
        },
        403,
      );
    }

    const { data: materialized, error: historyError } = await supabase
      .from("recurring_occurrences")
      .select("id")
      .eq("recurring_id", recurringId)
      .not("actual_transaction_id", "is", null)
      .limit(1);
    if (historyError) throw historyError;

    if (!materialized?.length) {
      const { error } = await supabase
        .from("expenses")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: "user_deleted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", recurringId);
      if (error) throw error;
      return json({ success: true, deleted: true, preservedHistory: false });
    }

    const rule = template.recurrence_rule as Record<string, unknown>;
    const endDate = latestScheduledDate(rule, new Date());
    if (!endDate) {
      return json(
        {
          success: false,
          code: "SCHEDULE_INVALID",
          error: "Recurring schedule has no past occurrence",
        },
        400,
      );
    }
    const { error } = await supabase
      .from("expenses")
      .update({
        recurrence_rule: { ...rule, end_date: endDate },
        updated_at: new Date().toISOString(),
      })
      .eq("id", recurringId);
    if (error) throw error;

    return json({
      success: true,
      deleted: false,
      preservedHistory: true,
      endDate,
    });
  } catch (error) {
    return json(
      {
        success: false,
        code: "DELETE_RECURRING_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete recurring template",
      },
      500,
    );
  }
});
