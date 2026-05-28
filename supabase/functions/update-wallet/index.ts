import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { getAccountOrNull, sanitizeUuid } from "../shared/accounts.ts";

interface RequestBody {
  userId?: string;
  accountId: string;
  name?: string;
  icon?: string;
  color?: string;
  currency?: string;
  openingBalanceCents?: number;
  goalAmountCents?: number | null;
  isDefault?: boolean;
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-update-account" } },
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

    const householdId = account.household_id as string | null;
    if (!householdId && account.user_id !== userId) {
      return jsonResponse(
        { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
        403,
      );
    }

    if (householdId) {
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

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === "string" && body.name.trim().length > 0) {
      updates.name = body.name.trim();
    }
    if (typeof body.icon === "string" && body.icon.trim().length > 0) {
      updates.icon = body.icon.trim();
    }
    if (typeof body.color === "string" && body.color.trim().length > 0) {
      updates.color = body.color.trim();
    }
    if (body.currency != null) {
      const currency = normalizeCurrency(body.currency);
      if (!currency) {
        return jsonResponse(
          {
            success: false,
            error: "Valid currency is required",
            code: "VALIDATION_ERROR",
          },
          400,
        );
      }
      const currentCurrency = normalizeCurrency(String(account.currency ?? ""));
      if (currency !== currentCurrency) {
        return jsonResponse(
          {
            success: false,
            error: "Wallet currency cannot be changed after creation",
            code: "VALIDATION_ERROR",
          },
          400,
        );
      }
      updates.currency = currency;
    }
    if (Number.isFinite(body.openingBalanceCents)) {
      updates.opening_balance_cents = Math.round(
        Number(body.openingBalanceCents),
      );
    }
    if (
      body.goalAmountCents === null ||
      Number.isFinite(body.goalAmountCents)
    ) {
      updates.goal_amount_cents =
        body.goalAmountCents == null
          ? null
          : Math.round(Number(body.goalAmountCents));
    }
    if (typeof body.isDefault === "boolean") {
      updates.is_default = body.isDefault;
    }

    if (body.isDefault === true) {
      const accountCurrency = normalizeCurrency(String(account.currency ?? ""));
      if (!accountCurrency) {
        return jsonResponse(
          {
            success: false,
            error: "Wallet currency is invalid",
            code: "VALIDATION_ERROR",
          },
          400,
        );
      }
      let resetQuery = supabase
        .from("accounts")
        .update({ is_default: false })
        .eq("is_archived", false)
        .eq("currency", accountCurrency);
      if (householdId) {
        resetQuery = resetQuery.eq("household_id", householdId);
      } else {
        resetQuery = resetQuery.eq("user_id", userId).is("household_id", null);
      }
      const { error: resetError } = await resetQuery;
      if (resetError) {
        return jsonResponse(
          {
            success: false,
            error: "Failed to update default",
            code: "SERVER_ERROR",
          },
          500,
        );
      }
    }

    const { data, error } = await supabase
      .from("accounts")
      .update(updates)
      .eq("id", accountId)
      .select()
      .single();

    if (error || !data) {
      console.error("[update-account]", error);
      return jsonResponse(
        {
          success: false,
          error:
            error == null
              ? "Failed to update account"
              : "Wallet update is not allowed for the current state",
          code: error == null ? "SERVER_ERROR" : "VALIDATION_ERROR",
        },
        error == null ? 500 : 400,
      );
    }

    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error("[update-account]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to update account",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
