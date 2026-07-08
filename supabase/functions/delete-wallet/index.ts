import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { getAccountOrNull, sanitizeUuid } from "../shared/accounts.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { removePlaidConnection } from "../shared/plaid-remove.ts";

interface RequestBody {
  accountId: string;
  confirmDestructiveDelete?: boolean;
  userId?: string;
}

interface BankCleanupResult {
  linkedBankAccountId: string | null;
  bankConnectionId: string | null;
  bankAccountStatus: string | null;
  bankConnectionStatus: string | null;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function countRows<T>(rows: T[] | null): number {
  return Array.isArray(rows) ? rows.length : 0;
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
    if (!accountId || body.confirmDestructiveDelete !== true) {
      return jsonResponse(
        {
          success: false,
          error: "Valid accountId and destructive confirmation are required",
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
      global: { headers: { "X-Client-Info": "moneko-delete-wallet" } },
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
    if (!account) {
      return jsonResponse(
        { success: false, error: "Account not found", code: "NOT_FOUND" },
        404,
      );
    }
    if (account.is_system) {
      return jsonResponse(
        {
          success: false,
          error: "System wallet cannot be deleted",
          code: "VALIDATION_ERROR",
        },
        400,
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
      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError) {
        throw membershipError;
      }
      if (!membership) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    }

    let replacementDefaultAccountId: string | null = null;
    if (account.is_default) {
      let replacementQuery = supabase
        .from("accounts")
        .select("id, is_system, name")
        .eq("user_id", account.user_id)
        .eq("currency", account.currency)
        .eq("is_archived", false)
        .neq("id", accountId);

      replacementQuery = householdId
        ? replacementQuery.eq("household_id", householdId)
        : replacementQuery.is("household_id", null);

      const { data: replacement, error: replacementError } =
        await replacementQuery
          .order("is_system", { ascending: false })
          .order("name", { ascending: true })
          .limit(1)
          .maybeSingle();
      if (replacementError) {
        throw replacementError;
      }
      if (!replacement?.id) {
        return jsonResponse(
          {
            success: false,
            error: "Add another wallet before deleting the default wallet",
            code: "VALIDATION_ERROR",
          },
          400,
        );
      }
      replacementDefaultAccountId = replacement.id;
    }

    const nowIso = new Date().toISOString();

    const { data: expenseRows, error: expenseLoadError } = await supabase
      .from("expenses")
      .select("id")
      .eq("account_id", accountId);
    if (expenseLoadError) {
      throw expenseLoadError;
    }
    const transactionIds = ((expenseRows || []) as { id: string }[])
      .map((row) => row.id)
      .filter(Boolean);

    const { data: transferRows, error: transferLoadError } = await supabase
      .from("account_transfers")
      .select("id")
      .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);
    if (transferLoadError) {
      throw transferLoadError;
    }
    const transferIds = ((transferRows || []) as { id: string }[])
      .map((row) => row.id)
      .filter(Boolean);

    const bankCleanup = await cleanupLinkedBankAccount({
      supabase,
      accountId,
      linkedBankAccountId: account.linked_bank_account_id ?? null,
    });

    if (transactionIds.length > 0) {
      const { error: expenseUpdateError } = await supabase
        .from("expenses")
        .update({
          deleted_at: nowIso,
          deleted_reason: "user_deleted",
          account_id: null,
          bank_account_id: null,
          raw_provider_payload: null,
          updated_at: nowIso,
        })
        .in("id", transactionIds);
      if (expenseUpdateError) {
        throw expenseUpdateError;
      }
    }

    if (transferIds.length > 0) {
      const { error: transferDeleteError } = await supabase
        .from("account_transfers")
        .delete()
        .in("id", transferIds);
      if (transferDeleteError) {
        throw transferDeleteError;
      }
    }

    const { error: accountDeleteError } = await supabase
      .from("accounts")
      .delete()
      .eq("id", accountId);
    if (accountDeleteError) {
      throw accountDeleteError;
    }

    if (replacementDefaultAccountId) {
      const { error: defaultUpdateError } = await supabase
        .from("accounts")
        .update({ is_default: true, updated_at: nowIso })
        .eq("id", replacementDefaultAccountId);
      if (defaultUpdateError) {
        throw defaultUpdateError;
      }
    }

    return jsonResponse({
      success: true,
      data: {
        id: accountId,
        deleted: true,
        transactionIds,
        transactionCount: transactionIds.length,
        transferIds,
        transferCount: transferIds.length,
        replacementDefaultAccountId,
        bank: bankCleanup,
      },
    });
  } catch (error) {
    console.error("[delete-wallet]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to delete wallet",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});

async function cleanupLinkedBankAccount(params: {
  supabase: ReturnType<typeof createClient>;
  accountId: string;
  linkedBankAccountId: string | null;
}): Promise<BankCleanupResult> {
  const emptyResult = {
    linkedBankAccountId: null,
    bankConnectionId: null,
    bankAccountStatus: null,
    bankConnectionStatus: null,
  };
  if (!params.linkedBankAccountId) {
    return emptyResult;
  }

  const { data: bankAccount, error: bankAccountError } = await params.supabase
    .from("bank_accounts")
    .select("id, bank_connection_id, provider, status")
    .eq("id", params.linkedBankAccountId)
    .maybeSingle();
  if (bankAccountError) {
    throw bankAccountError;
  }
  if (!bankAccount?.id) {
    return {
      ...emptyResult,
      linkedBankAccountId: params.linkedBankAccountId,
    };
  }

  const bankConnectionId = bankAccount.bank_connection_id as string | null;
  const { data: sharedWallets, error: sharedWalletsError } =
    await params.supabase
      .from("accounts")
      .select("id")
      .eq("linked_bank_account_id", bankAccount.id)
      .eq("is_archived", false)
      .neq("id", params.accountId);
  if (sharedWalletsError) {
    throw sharedWalletsError;
  }

  if (countRows(sharedWallets as { id: string }[] | null) > 0) {
    return {
      linkedBankAccountId: bankAccount.id,
      bankConnectionId,
      bankAccountStatus: "kept_shared_wallet",
      bankConnectionStatus: "kept_shared_wallet",
    };
  }

  const { error: disableBankAccountError } = await params.supabase
    .from("bank_accounts")
    .update({
      status: "disabled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bankAccount.id);
  if (disableBankAccountError) {
    throw disableBankAccountError;
  }

  if (!bankConnectionId) {
    return {
      linkedBankAccountId: bankAccount.id,
      bankConnectionId,
      bankAccountStatus: "disabled",
      bankConnectionStatus: null,
    };
  }

  const { data: activeSiblings, error: activeSiblingsError } = await params
    .supabase
    .from("bank_accounts")
    .select("id")
    .eq("bank_connection_id", bankConnectionId)
    .neq("id", bankAccount.id)
    .eq("status", "active");
  if (activeSiblingsError) {
    throw activeSiblingsError;
  }

  if (countRows(activeSiblings as { id: string }[] | null) > 0) {
    return {
      linkedBankAccountId: bankAccount.id,
      bankConnectionId,
      bankAccountStatus: "disabled",
      bankConnectionStatus: "kept_shared_connection",
    };
  }

  const { data: connection, error: connectionError } = await params.supabase
    .from("bank_connections")
    .select(
      "id, user_id, provider, removed_at, access_token_encrypted, plaid_access_token_encrypted",
    )
    .eq("id", bankConnectionId)
    .maybeSingle();
  if (connectionError) {
    throw connectionError;
  }

  if (!connection || connection.provider !== PLAID_PROVIDER) {
    return {
      linkedBankAccountId: bankAccount.id,
      bankConnectionId,
      bankAccountStatus: "disabled",
      bankConnectionStatus: "kept_non_plaid_connection",
    };
  }

  if (connection.removed_at) {
    return {
      linkedBankAccountId: bankAccount.id,
      bankConnectionId,
      bankAccountStatus: "disabled",
      bankConnectionStatus: "already_removed",
    };
  }

  try {
    await removePlaidConnection({
      supabase: params.supabase,
      connection,
      removalReason: "wallet_delete",
    });
    return {
      linkedBankAccountId: bankAccount.id,
      bankConnectionId,
      bankAccountStatus: "removed",
      bankConnectionStatus: "removed",
    };
  } catch (error) {
    const { data: removalState, error: removalStateError } = await params
      .supabase
      .from("bank_connections")
      .select("item_status, item_health_state")
      .eq("id", bankConnectionId)
      .maybeSingle();
    if (removalStateError) {
      throw removalStateError;
    }
    if (
      removalState?.item_status === "pending_removal" ||
      removalState?.item_health_state === "removal_pending"
    ) {
      return {
        linkedBankAccountId: bankAccount.id,
        bankConnectionId,
        bankAccountStatus: "disabled",
        bankConnectionStatus: "pending_removal",
      };
    }
    throw error;
  }
}
