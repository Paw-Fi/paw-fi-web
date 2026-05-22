import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { getAccountOrNull, sanitizeUuid } from "../shared/accounts.ts";

interface RequestBody {
  accountId: string;
  targetBalanceCents: number;
  note?: string;
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
    const accountId = sanitizeUuid(body.accountId ?? null);
    if (!accountId) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid accountId",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const targetBalanceCents = Math.round(Number(body.targetBalanceCents));
    if (!Number.isFinite(targetBalanceCents)) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid targetBalanceCents",
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
      global: { headers: { "X-Client-Info": "moneko-update-account-balance" } },
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

    const account = await getAccountOrNull(supabase, accountId);
    if (!account || account.is_archived) {
      return jsonResponse(
        { success: false, error: "Account not found", code: "NOT_FOUND" },
        404,
      );
    }

    if (account.household_id == null) {
      if (account.user_id !== userId) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    } else {
      const { data: membership } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", account.household_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    }

    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("amount_cents, type, currency")
      .eq("account_id", accountId)
      .is("deleted_at", null);

    const { data: transferOutRows } = await supabase
      .from("account_transfers")
      .select("amount_cents, currency")
      .eq("from_account_id", accountId);
    const { data: transferInRows } = await supabase
      .from("account_transfers")
      .select("amount_cents, currency")
      .eq("to_account_id", accountId);

    let incomeIn = 0;
    let expenseOut = 0;
    const accountCurrency = String(account.currency ?? "USD")
      .trim()
      .toUpperCase();
    for (const row of (expenseRows ?? []) as any[]) {
      const rowCurrency = String(row.currency ?? "")
        .trim()
        .toUpperCase();
      if (rowCurrency !== accountCurrency) continue;
      const cents = Number(row.amount_cents || 0);
      if (String(row.type ?? "expense").toLowerCase() === "income") {
        incomeIn += cents;
      } else {
        expenseOut += cents;
      }
    }

    const transferOut = (transferOutRows ?? []).reduce(
      (sum: number, row: any) => {
        const rowCurrency = String(row.currency ?? "")
          .trim()
          .toUpperCase();
        if (rowCurrency !== accountCurrency) return sum;
        return sum + Number(row.amount_cents || 0);
      },
      0,
    );
    const transferIn = (transferInRows ?? []).reduce(
      (sum: number, row: any) => {
        const rowCurrency = String(row.currency ?? "")
          .trim()
          .toUpperCase();
        if (rowCurrency !== accountCurrency) return sum;
        return sum + Number(row.amount_cents || 0);
      },
      0,
    );

    const currentBalanceCents =
      Number(account.opening_balance_cents || 0) +
      incomeIn -
      expenseOut +
      transferIn -
      transferOut;
    const delta = targetBalanceCents - currentBalanceCents;
    const newOpeningBalanceCents =
      Number(account.opening_balance_cents || 0) + delta;

    const { data, error } = await supabase
      .from("accounts")
      .update({
        opening_balance_cents: newOpeningBalanceCents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .select()
      .single();

    if (error || !data) {
      return jsonResponse(
        {
          success: false,
          error: "Failed to update account balance",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    return jsonResponse({
      success: true,
      data,
      meta: {
        previous_balance_cents: currentBalanceCents,
        target_balance_cents: targetBalanceCents,
        opening_balance_delta_cents: delta,
        note: body.note?.trim() || null,
      },
    });
  } catch (error) {
    console.error("[update-account-balance]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to update account balance",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
