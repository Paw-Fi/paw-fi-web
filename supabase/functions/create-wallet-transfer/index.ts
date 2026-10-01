import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { getAccountOrNull, sanitizeUuid } from "../shared/accounts.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";
import { normalizeWalletTransferTime } from "../shared/wallet-transfer-time.ts";

interface RequestBody {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  currency: string;
  date: string;
  time?: string | null;
  note?: string;
  clientRecordId?: string;
  userId?: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeCurrency(value?: string | null): string | null {
  const normalized = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
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
    const fromAccountId = sanitizeUuid(body.fromAccountId ?? null);
    const toAccountId = sanitizeUuid(body.toAccountId ?? null);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid account ids",
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
    const time = normalizeWalletTransferTime(body.time);
    if (time === undefined) {
      return jsonResponse(
        { success: false, error: "Invalid time", code: "VALIDATION_ERROR" },
        400,
      );
    }
    const currency = normalizeCurrency(body.currency);
    if (!currency) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid currency",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }
    if (
      body.clientRecordId !== undefined &&
      (typeof body.clientRecordId !== "string" || !body.clientRecordId.trim())
    ) {
      return jsonResponse(
        {
          success: false,
          error: "clientRecordId must be a non-empty string",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }
    const clientRecordId = body.clientRecordId?.trim() ?? "";
    if (clientRecordId.length > 128) {
      return jsonResponse(
        {
          success: false,
          error: "clientRecordId must be 128 characters or fewer",
          code: "VALIDATION_ERROR",
        },
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
        headers: { "X-Client-Info": "moneko-create-account-transfer" },
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
        fromAccount.user_id === toAccount.user_id) ||
      (fromAccount.household_id != null &&
        fromAccount.household_id === toAccount.household_id);

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

    const fromCurrency = String(fromAccount.currency ?? "")
      .trim()
      .toUpperCase();
    const toCurrency = String(toAccount.currency ?? "")
      .trim()
      .toUpperCase();
    if (fromCurrency !== currency || toCurrency !== currency) {
      return jsonResponse(
        {
          success: false,
          error: "Transfer currency must match both wallet currencies",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    if (fromAccount.household_id == null) {
      if (fromAccount.user_id !== userId || toAccount.user_id !== userId) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    } else {
      const householdId = fromAccount.household_id as string;
      const { data: membership } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    }

    const transferPayload = {
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount_cents: amountCents,
      currency,
      date: normalizedDate,
      time,
      note: body.note?.trim() || null,
      created_by_user_id: userId,
      household_id: fromAccount.household_id ?? null,
    };
    const matchesRequestedTransfer = (transfer: Record<string, unknown>) =>
      transfer.from_account_id === transferPayload.from_account_id &&
      transfer.to_account_id === transferPayload.to_account_id &&
      Number(transfer.amount_cents) === transferPayload.amount_cents &&
      String(transfer.currency ?? "").toUpperCase() ===
        transferPayload.currency &&
      String(transfer.date ?? "") === transferPayload.date &&
      (transfer.time ?? null) === transferPayload.time &&
      (transfer.note ?? null) === transferPayload.note &&
      (transfer.household_id ?? null) === transferPayload.household_id;

    if (clientRecordId) {
      const { data: existingTransfer, error: existingError } = await supabase
        .from("account_transfers")
        .select("*")
        .eq("created_by_user_id", userId)
        .eq("client_record_id", clientRecordId)
        .maybeSingle();
      if (existingError) {
        console.error(
          "[create-account-transfer] load idempotent transfer",
          existingError,
        );
        return jsonResponse(
          {
            success: false,
            error: "Failed to create transfer",
            code: "SERVER_ERROR",
          },
          500,
        );
      }
      if (existingTransfer) {
        if (!matchesRequestedTransfer(existingTransfer)) {
          return jsonResponse(
            {
              success: false,
              error: "clientRecordId was already used for a different transfer",
              code: "IDEMPOTENCY_CONFLICT",
            },
            409,
          );
        }
        return jsonResponse({ success: true, data: existingTransfer });
      }
    }

    const { data, error } = await supabase
      .from("account_transfers")
      .insert({
        ...transferPayload,
        ...(clientRecordId ? { client_record_id: clientRecordId } : {}),
      })
      .select()
      .single();

    if (error || !data) {
      if (clientRecordId) {
        const { data: racedTransfer } = await supabase
          .from("account_transfers")
          .select("*")
          .eq("created_by_user_id", userId)
          .eq("client_record_id", clientRecordId)
          .maybeSingle();
        if (racedTransfer) {
          if (!matchesRequestedTransfer(racedTransfer)) {
            return jsonResponse(
              {
                success: false,
                error:
                  "clientRecordId was already used for a different transfer",
                code: "IDEMPOTENCY_CONFLICT",
              },
              409,
            );
          }
          return jsonResponse({ success: true, data: racedTransfer });
        }
      }
      console.error("[create-account-transfer]", error);
      return jsonResponse(
        {
          success: false,
          error: "Failed to create transfer",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error("[create-account-transfer]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to create transfer",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
