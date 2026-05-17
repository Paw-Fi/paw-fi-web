import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { getAccountOrNull, sanitizeUuid } from "../shared/accounts.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";

interface RequestBody {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  currency: string;
  date: string;
  note?: string | null;
  userId?: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed", code: "VALIDATION_ERROR" },
      405,
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      {
        success: false,
        error: "Server configuration error",
        code: "SERVER_ERROR",
      },
      500,
    );
  }

  try {
    const body = (await req.json()) as RequestBody;
    const transferId = sanitizeUuid(body.transferId ?? null);
    const fromAccountId = sanitizeUuid(body.fromAccountId ?? null);
    const toAccountId = sanitizeUuid(body.toAccountId ?? null);
    if (
      !transferId ||
      !fromAccountId ||
      !toAccountId ||
      fromAccountId === toAccountId
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid transfer or account ids",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const amountCents = Math.round(Number(body.amountCents));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return jsonResponse(
        {
          success: false,
          error: "amountCents must be > 0",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const normalizedDate = normalizeCalendarDateString(body.date);
    if (!normalizedDate) {
      return jsonResponse(
        { success: false, error: "Invalid date", code: "VALIDATION_ERROR" },
        400,
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-update-account-transfer" },
      },
    });

    const auth = await authenticateUserOrInternalSecret(req, supabase);
    if (!auth.success) {
      return jsonResponse(
        {
          success: false,
          error: auth.error ?? "Unauthorized",
          code: "UNAUTHORIZED",
        },
        auth.statusCode ?? 401,
      );
    }

    const userId = auth.isInternalService
      ? sanitizeUuid(body.userId ?? null)
      : auth.userId;
    if (!userId) {
      return jsonResponse(
        {
          success: false,
          error: "Valid userId is required",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const { data: existingTransfer, error: transferError } = await supabase
      .from("account_transfers")
      .select("id, created_by_user_id, household_id")
      .eq("id", transferId)
      .maybeSingle();

    if (transferError) {
      console.error("[update-account-transfer] load transfer", transferError);
      return jsonResponse(
        {
          success: false,
          error: "Failed to load transfer",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    if (!existingTransfer) {
      return jsonResponse(
        { success: false, error: "Transfer not found", code: "NOT_FOUND" },
        404,
      );
    }

    if (existingTransfer.created_by_user_id !== userId) {
      return jsonResponse(
        { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
        403,
      );
    }

    const fromAccount = await getAccountOrNull(supabase, fromAccountId);
    const toAccount = await getAccountOrNull(supabase, toAccountId);
    if (
      !fromAccount ||
      !toAccount ||
      fromAccount.is_archived ||
      toAccount.is_archived
    ) {
      return jsonResponse(
        { success: false, error: "Account not found", code: "NOT_FOUND" },
        404,
      );
    }

    const sameScope =
      (fromAccount.household_id == null &&
        toAccount.household_id == null &&
        fromAccount.user_id === userId &&
        toAccount.user_id === userId &&
        existingTransfer.household_id == null) ||
      (fromAccount.household_id != null &&
        fromAccount.household_id === toAccount.household_id &&
        fromAccount.household_id === existingTransfer.household_id);

    if (!sameScope) {
      return jsonResponse(
        {
          success: false,
          error: "Cross-scope transfers are not allowed",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    if (fromAccount.household_id != null) {
      const { data: membership } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", fromAccount.household_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    }

    const { data, error } = await supabase
      .from("account_transfers")
      .update({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount_cents: amountCents,
        currency: String(body.currency ?? "USD").toUpperCase(),
        date: normalizedDate,
        note: body.note?.trim() || null,
      })
      .eq("id", transferId)
      .select()
      .single();

    if (error || !data) {
      console.error("[update-account-transfer]", error);
      return jsonResponse(
        {
          success: false,
          error: "Failed to update transfer",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error("[update-account-transfer]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to update transfer",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
