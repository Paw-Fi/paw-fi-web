import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "./cors.ts";
import { authenticateUserOrInternalSecret } from "./auth.ts";
import { sanitizeUuid } from "./accounts.ts";
import { normalizeCalendarDateString } from "./date-normalization.ts";
import { normalizeWalletTransferTime } from "./wallet-transfer-time.ts";

type Operation = "create" | "update" | "delete";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function failure(code: string, status: number): Response {
  return jsonResponse({ success: false, error: code, code }, status);
}

function uuid(value: unknown): string | null {
  return typeof value === "string" ? sanitizeUuid(value) : null;
}

function currency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

// JSON numbers must already be exact integers. Decimal strings permit the full
// PostgreSQL BIGINT range without an intermediate JavaScript Number conversion.
function cents(value: unknown, allowZero = false): number | string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1)
      ? value
      : null;
  }
  if (typeof value !== "string" || !/^[0-9]{1,19}$/.test(value)) return null;
  const integer = BigInt(value);
  return integer <= 9223372036854775807n && integer >= (allowZero ? 0n : 1n)
    ? integer.toString()
    : null;
}

function rate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  if (
    normalized.length > 128 ||
    !/^[+]?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]{1,3})?$/.test(normalized)
  )
    return null;
  const coefficient = normalized.split(/[eE]/)[0];
  return /[1-9]/.test(coefficient) ? normalized : null;
}

function normalizePayload(
  body: Record<string, unknown>,
  operation: Operation,
): Record<string, unknown> | null {
  const transferId = uuid(body.transferId);
  if (operation !== "create" && !transferId) return null;
  if (operation === "delete") return { transferId };
  const fromAccountId = uuid(body.fromAccountId);
  const toAccountId = uuid(body.toAccountId);
  const amountCents = cents(body.amountCents);
  const sourceCurrency = currency(body.currency);
  const date =
    typeof body.date === "string"
      ? normalizeCalendarDateString(body.date)
      : null;
  const time = normalizeWalletTransferTime(body.time);
  const version = body.transferContractVersion ?? 1;
  if (
    !fromAccountId ||
    !toAccountId ||
    fromAccountId === toAccountId ||
    amountCents === null ||
    !sourceCurrency ||
    !date ||
    time === undefined ||
    (version !== 1 && version !== 2) ||
    (body.note != null && typeof body.note !== "string")
  )
    return null;
  const clientRecordId = body.clientRecordId;
  if (
    clientRecordId !== undefined &&
    (typeof clientRecordId !== "string" ||
      !clientRecordId.trim() ||
      clientRecordId.trim().length > 128)
  )
    return null;
  const base = {
    ...(operation === "update" ? { transferId } : {}),
    fromAccountId,
    toAccountId,
    amountCents,
    currency: sourceCurrency,
    date,
    ...(operation === "create" || body.time !== undefined ? { time } : {}),
    note: typeof body.note === "string" ? body.note.trim() || null : null,
    ...(operation === "create" && clientRecordId !== undefined
      ? { clientRecordId: (clientRecordId as string).trim() }
      : {}),
    transferContractVersion: version,
  };
  if (version === 1) {
    return [
      "toAmountCents",
      "toCurrency",
      "exchangeRate",
      "feeAmountCents",
    ].some((key) => key in body)
      ? null
      : base;
  }
  const toAmountCents = cents(body.toAmountCents);
  const toCurrency = currency(body.toCurrency);
  const exchangeRate = rate(body.exchangeRate);
  const feeAmountCents = cents(body.feeAmountCents ?? 0, true);
  if (
    toAmountCents === null ||
    !toCurrency ||
    !exchangeRate ||
    feeAmountCents === null
  )
    return null;
  return { ...base, toAmountCents, toCurrency, exchangeRate, feeAmountCents };
}

export async function handleWalletTransferMutation(
  req: Request,
  operation: Operation,
): Promise<Response> {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return failure("VALIDATION_ERROR", 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return failure("SERVER_ERROR", 500);
  try {
    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": `moneko-${operation}-account-transfer` },
      },
    });
    const auth = await authenticateUserOrInternalSecret(req, supabase);
    if (!auth.success) return failure("UNAUTHORIZED", auth.statusCode ?? 401);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return failure("VALIDATION_ERROR", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return failure("VALIDATION_ERROR", 400);
    const request = body as Record<string, unknown>;
    const userId = auth.isInternalService ? uuid(request.userId) : auth.userId;
    if (!userId) return failure("VALIDATION_ERROR", 400);
    const payload = normalizePayload(request, operation);
    if (!payload) return failure("VALIDATION_ERROR", 400);
    const { data, error } = await supabase.rpc("mutate_wallet_transfer_v2", {
      p_actor_user_id: userId,
      p_operation: operation,
      p_payload: payload,
    });
    if (error) {
      const statuses: Record<string, number> = {
        UNAUTHORIZED: 403,
        NOT_FOUND: 404,
        VALIDATION_ERROR: 400,
        IDEMPOTENCY_CONFLICT: 409,
        TRANSFER_CLIENT_UPDATE_REQUIRED: 409,
      };
      if (statuses[error.message])
        return failure(error.message, statuses[error.message]);
      if (
        ["22023", "22P02", "22003", "22007", "22008", "23514"].includes(
          error.code,
        )
      ) {
        return failure("VALIDATION_ERROR", 400);
      }
      console.error(
        `[${operation}-wallet-transfer] atomic mutation failed`,
        error.code,
      );
      return failure("SERVER_ERROR", 500);
    }
    if (!data) return failure("SERVER_ERROR", 500);
    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error(
      `[${operation}-wallet-transfer] request failed`,
      error instanceof Error ? error.name : "unknown",
    );
    return failure("SERVER_ERROR", 500);
  }
}
