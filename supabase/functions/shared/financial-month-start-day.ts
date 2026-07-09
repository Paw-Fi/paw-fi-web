import { corsHeaders } from "./cors.ts";

export interface FinancialMonthStartDayRequestBody {
  phone?: string;
  userId?: string;
  financialMonthStartDay?: number | string;
}

export interface FinancialMonthStartDayAuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  statusCode?: number;
  isInternalService?: boolean;
}

interface FinancialMonthStartDayHandlerDeps {
  supabase: any;
  authenticate: (
    req: Request,
    supabase: any,
  ) => Promise<FinancialMonthStartDayAuthResult>;
  reportError?: (input: {
    functionName: string;
    error: unknown;
    context?: Record<string, unknown>;
  }) => Promise<void>;
  now?: () => Date;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 400, details?: unknown) {
  return json({ error: message, details }, status);
}

export function normalizeFinancialMonthStartDay(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value >= 1 && value <= 31 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return parsed >= 1 && parsed <= 31 ? parsed : null;
  }
  return null;
}

async function reportHandlerError(
  deps: FinancialMonthStartDayHandlerDeps,
  errorValue: unknown,
  context: Record<string, unknown>,
) {
  await deps.reportError?.({
    functionName: "update-financial-month-start-day",
    error: errorValue,
    context,
  });
}

export async function handleUpdateFinancialMonthStartDayRequest(
  req: Request,
  deps: FinancialMonthStartDayHandlerDeps,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return error("Method not allowed", 405);

  let payload: FinancialMonthStartDayRequestBody;
  try {
    payload = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const { phone, userId: requestedUserId } = payload || {};
  const financialMonthStartDay = normalizeFinancialMonthStartDay(
    payload?.financialMonthStartDay,
  );

  if (phone && typeof phone !== "string") {
    return error("'phone' must be a string", 400);
  }
  if (requestedUserId && typeof requestedUserId !== "string") {
    return error("'userId' must be a string", 400);
  }
  if (financialMonthStartDay == null) {
    return error(
      "'financialMonthStartDay' must be an integer from 1 to 31",
      400,
    );
  }

  const authResult = await deps.authenticate(req, deps.supabase);
  if (!authResult.success) {
    return error(
      authResult.error ?? "Unauthorized",
      authResult.statusCode ?? 401,
    );
  }

  const userId = authResult.isInternalService
    ? requestedUserId
    : authResult.userId;
  const effectivePhone = authResult.isInternalService ? phone : undefined;

  if (!effectivePhone && !userId) {
    return error("Either 'phone' or 'userId' must be provided", 400);
  }

  let contact: any = null;
  let contactErr: any = null;
  if (effectivePhone) {
    const result = await deps.supabase
      .from("user_contacts")
      .select("id, user_id, financial_month_start_day")
      .eq("phone_e164", effectivePhone)
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  } else if (userId) {
    const result = await deps.supabase
      .from("user_contacts")
      .select("id, user_id, financial_month_start_day")
      .eq("user_id", userId)
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(1);
    contact = result.data?.[0] ?? null;
    contactErr = result.error;
  }

  if (contactErr) {
    await reportHandlerError(deps, contactErr, {
      operation: "user_contacts.select",
      hasPhone: Boolean(effectivePhone),
      hasUserId: Boolean(userId),
    });
    return error("Failed to fetch contact", 500);
  }

  let contactId: string | null = contact?.id ?? null;
  if (!contactId) {
    const updatedAt = (deps.now?.() ?? new Date()).toISOString();
    if (effectivePhone) {
      const { data: upserted, error: upsertErr } = await deps.supabase
        .from("user_contacts")
        .upsert(
          {
            phone_e164: effectivePhone,
            user_id: userId || null,
            financial_month_start_day: financialMonthStartDay,
            updated_at: updatedAt,
          },
          { onConflict: userId ? "user_id" : "phone_e164" },
        )
        .select("id")
        .single();
      if (upsertErr) {
        await reportHandlerError(deps, upsertErr, {
          operation: "user_contacts.upsert_by_phone",
          hasUserId: Boolean(userId),
        });
        return error("Failed to create contact", 500, upsertErr);
      }
      contactId = upserted.id;
    } else if (userId) {
      const { data: inserted, error: insertErr } = await deps.supabase
        .from("user_contacts")
        .upsert(
          {
            user_id: userId,
            financial_month_start_day: financialMonthStartDay,
            updated_at: updatedAt,
          },
          { onConflict: "user_id" },
        )
        .select("id")
        .single();
      if (insertErr) {
        await reportHandlerError(deps, insertErr, {
          operation: "user_contacts.upsert_by_user_id",
          userId,
        });
        return error("Failed to create contact", 500, insertErr);
      }
      contactId = inserted.id;
    }
  }

  const updateQuery = deps.supabase
    .from("user_contacts")
    .update({ financial_month_start_day: financialMonthStartDay });
  const { error: updateErr } = userId && !effectivePhone
    ? await updateQuery.eq("user_id", userId)
    : await updateQuery.eq("id", contactId!);

  if (updateErr) {
    await reportHandlerError(deps, updateErr, {
      operation: "user_contacts.update_financial_month_start_day",
      contactId,
      userId,
    });
    return error("Failed to update contact", 500, updateErr);
  }

  return json({
    ok: true,
    results: { contactId, financialMonthStartDay },
  });
}
