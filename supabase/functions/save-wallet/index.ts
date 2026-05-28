import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { assertScopeAccess, sanitizeUuid } from "../shared/accounts.ts";
import { rebindBankAccountExpensesToWallet } from "../shared/bank-wallet-binding.ts";

interface RequestBody {
  householdId?: string;
  userId?: string;
  name: string;
  icon?: string;
  color?: string;
  currency?: string;
  goalAmountCents?: number | null;
  openingBalanceCents?: number;
  isDefault?: boolean;
  linkedBankAccountId?: string | null;
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
    const householdId = sanitizeUuid(body.householdId ?? null);
    if (body.householdId && !householdId) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid householdId",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const name = String(body.name ?? "").trim();
    if (!name) {
      return jsonResponse(
        { success: false, error: "name is required", code: "VALIDATION_ERROR" },
        400,
      );
    }

    const requestedCurrency = normalizeCurrency(body.currency);
    if (body.currency != null && !requestedCurrency) {
      return jsonResponse(
        {
          success: false,
          error: "Valid currency is required",
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
      global: { headers: { "X-Client-Info": "moneko-save-account" } },
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

    const canAccess = await assertScopeAccess(supabase, userId, householdId);
    if (!canAccess) {
      return jsonResponse(
        { success: false, error: "Forbidden scope", code: "UNAUTHORIZED" },
        403,
      );
    }

    let currency = requestedCurrency;
    if (!currency) {
      const { data: resolvedCurrency, error: currencyError } =
        await supabase.rpc("resolve_account_currency", {
          p_user_id: userId,
          p_household_id: householdId,
        });
      if (currencyError) {
        return jsonResponse(
          {
            success: false,
            error: "Failed to resolve wallet currency",
            code: "SERVER_ERROR",
          },
          500,
        );
      }
      currency = normalizeCurrency(String(resolvedCurrency ?? "")) ?? "USD";
    }

    const linkedBankAccountId = sanitizeUuid(body.linkedBankAccountId ?? null);
    let linkedBankProvider: string | null = null;
    if (linkedBankAccountId != null) {
      const { data: bankAccount, error: bankAccountError } = await supabase
        .from("bank_accounts")
        .select("id, user_id, bank_connection_id, currency")
        .eq("id", linkedBankAccountId)
        .maybeSingle();

      if (bankAccountError) {
        return jsonResponse(
          {
            success: false,
            error: "Failed to load linked bank account",
            code: "SERVER_ERROR",
          },
          500,
        );
      }

      if (!bankAccount || bankAccount.user_id !== userId) {
        return jsonResponse(
          {
            success: false,
            error: "Linked bank account not found",
            code: "VALIDATION_ERROR",
          },
          404,
        );
      }

      const bankCurrency = normalizeCurrency(
        String(bankAccount.currency ?? ""),
      );
      if (!bankCurrency || bankCurrency !== currency) {
        return jsonResponse(
          {
            success: false,
            error: "Linked bank account currency must match wallet currency",
            code: "VALIDATION_ERROR",
          },
          400,
        );
      }

      const { data: bankConnection, error: bankConnectionError } =
        await supabase
          .from("bank_connections")
          .select("id, user_id, household_id, provider, removed_at, status")
          .eq("id", bankAccount.bank_connection_id)
          .maybeSingle();

      if (bankConnectionError) {
        return jsonResponse(
          {
            success: false,
            error: "Failed to load bank connection",
            code: "SERVER_ERROR",
          },
          500,
        );
      }

      const connectionHouseholdId = bankConnection?.household_id ?? null;
      if (
        !bankConnection ||
        bankConnection.user_id !== userId ||
        bankConnection.removed_at != null ||
        bankConnection.status === "disabled" ||
        connectionHouseholdId !== householdId
      ) {
        return jsonResponse(
          {
            success: false,
            error: "Linked bank account belongs to a different wallet space",
            code: "VALIDATION_ERROR",
          },
          409,
        );
      }
      linkedBankProvider = String(bankConnection.provider || "plaid");
    }
    const openingBalanceCents = Number.isFinite(body.openingBalanceCents)
      ? Math.round(Number(body.openingBalanceCents))
      : 0;
    const goalAmountCents =
      body.goalAmountCents == null
        ? null
        : Math.round(Number(body.goalAmountCents));

    const shouldSetDefault = body.isDefault === true;

    if (linkedBankAccountId != null) {
      let existingLinkedQuery = supabase
        .from("accounts")
        .select()
        .eq("linked_bank_account_id", linkedBankAccountId)
        .eq("is_archived", false)
        .limit(1);

      if (householdId) {
        existingLinkedQuery = existingLinkedQuery.eq(
          "household_id",
          householdId,
        );
      } else {
        existingLinkedQuery = existingLinkedQuery
          .eq("user_id", userId)
          .is("household_id", null);
      }

      const { data: existingLinkedWallet, error: existingLinkedError } =
        await existingLinkedQuery.maybeSingle();

      if (existingLinkedError) {
        return jsonResponse(
          {
            success: false,
            error: "Failed to load linked wallet",
            code: "SERVER_ERROR",
          },
          500,
        );
      }

      if (existingLinkedWallet != null) {
        const existingLinkedCurrency = normalizeCurrency(
          String(existingLinkedWallet.currency ?? ""),
        );
        if (!existingLinkedCurrency || existingLinkedCurrency !== currency) {
          return jsonResponse(
            {
              success: false,
              error:
                "Existing linked wallet currency does not match bank account currency",
              code: "VALIDATION_ERROR",
            },
            409,
          );
        }

        const rebindResult = await rebindBankAccountExpensesToWallet({
          supabase,
          userId,
          bankAccountId: linkedBankAccountId,
          walletId: existingLinkedWallet.id,
          householdId: existingLinkedWallet.household_id ?? null,
          provider: linkedBankProvider ?? "plaid",
          walletCurrency: String(existingLinkedWallet.currency ?? currency),
        });
        if (rebindResult.updated > 0) {
          console.log(
            "[save-account] rebound bank expenses to existing linked wallet",
            JSON.stringify({
              provider: linkedBankProvider ?? "plaid",
              bankAccountId: linkedBankAccountId,
              walletId: existingLinkedWallet.id,
              updated: rebindResult.updated,
            }),
          );
        }
        return jsonResponse({ success: true, data: existingLinkedWallet });
      }
    }

    if (shouldSetDefault) {
      let resetQuery = supabase
        .from("accounts")
        .update({ is_default: false })
        .eq("is_archived", false)
        .eq("currency", currency);

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
            error: "Failed to set default account",
            code: "SERVER_ERROR",
          },
          500,
        );
      }
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        household_id: householdId,
        name,
        icon: String(body.icon ?? "wallet"),
        color: String(body.color ?? "#6B7280"),
        currency,
        opening_balance_cents: openingBalanceCents,
        goal_amount_cents: goalAmountCents,
        is_default: shouldSetDefault,
        linked_bank_account_id: linkedBankAccountId,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("[save-account]", error);
      return jsonResponse(
        {
          success: false,
          error: "Failed to create account",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    let fallbackDefaultQuery = supabase
      .from("accounts")
      .select("id")
      .eq("is_archived", false)
      .eq("is_default", true)
      .eq("currency", currency)
      .limit(1);

    fallbackDefaultQuery = householdId
      ? fallbackDefaultQuery.eq("household_id", householdId)
      : fallbackDefaultQuery.eq("user_id", userId).is("household_id", null);

    const { data: fallbackDefault } = await fallbackDefaultQuery.maybeSingle();

    if (!fallbackDefault) {
      await supabase
        .from("accounts")
        .update({ is_default: true })
        .eq("id", data.id);
      data.is_default = true;
    }

    if (linkedBankAccountId != null) {
      const rebindResult = await rebindBankAccountExpensesToWallet({
        supabase,
        userId,
        bankAccountId: linkedBankAccountId,
        walletId: data.id,
        householdId: data.household_id ?? null,
        provider: linkedBankProvider ?? "plaid",
        walletCurrency: String(data.currency ?? currency),
      });
      if (rebindResult.updated > 0) {
        console.log(
          "[save-account] rebound bank expenses to linked wallet",
          JSON.stringify({
            provider: linkedBankProvider ?? "plaid",
            bankAccountId: linkedBankAccountId,
            walletId: data.id,
            updated: rebindResult.updated,
          }),
        );
      }
    }

    return jsonResponse({ success: true, data });
  } catch (error) {
    console.error("[save-account]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to create account",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
