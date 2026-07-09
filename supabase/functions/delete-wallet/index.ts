import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { getAccountOrNull, sanitizeUuid } from "../shared/accounts.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import {
  removePlaidConnection,
  type PlaidRemovableConnection,
} from "../shared/plaid-remove.ts";

type FunctionSupabaseClient = ReturnType<
  typeof createClient<any, "public", any>
>;

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

const DEFAULT_WALLET_DELETE_MESSAGE =
  "Add another wallet before deleting the default wallet";
const SYSTEM_WALLET_DELETE_MESSAGE =
  "This wallet is protected and cannot be deleted";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(error: string, code: string, status: number) {
  return jsonResponse(
    {
      success: false,
      error,
      message: error,
      code,
      errorCode: code,
      status,
    },
    status,
  );
}

function countRows<T>(rows: T[] | null): number {
  return Array.isArray(rows) ? rows.length : 0;
}

function statusForCode(code: unknown): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "UNAUTHORIZED":
      return 403;
    case "VALIDATION_ERROR":
    case "DEFAULT_WALLET_REQUIRED":
    case "SYSTEM_WALLET_PROTECTED":
      return 400;
    default:
      return 500;
  }
}

function knownDeleteErrorResponse(error: unknown): Response | null {
  if (!isRecord(error)) {
    return null;
  }

  const message = typeof error.message === "string" ? error.message : "";
  if (message.includes("System account cannot be deleted")) {
    return errorResponse(
      SYSTEM_WALLET_DELETE_MESSAGE,
      "SYSTEM_WALLET_PROTECTED",
      400,
    );
  }

  if (message.includes(DEFAULT_WALLET_DELETE_MESSAGE)) {
    return errorResponse(
      DEFAULT_WALLET_DELETE_MESSAGE,
      "DEFAULT_WALLET_REQUIRED",
      400,
    );
  }

  return null;
}

async function hasReplacementDefaultWallet(params: {
  supabase: FunctionSupabaseClient;
  accountId: string;
  userId: string;
  householdId: string | null;
  currency: string;
}): Promise<boolean> {
  const query = params.supabase
    .from("accounts")
    .select("id")
    .eq("user_id", params.userId)
    .eq("currency", params.currency)
    .eq("is_archived", false)
    .neq("id", params.accountId)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);

  const result = params.householdId
    ? await query.eq("household_id", params.householdId)
    : await query.is("household_id", null);
  const { data, error } = result;
  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
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

    if (account.is_system) {
      return errorResponse(
        SYSTEM_WALLET_DELETE_MESSAGE,
        "SYSTEM_WALLET_PROTECTED",
        400,
      );
    }

    if (account.is_default) {
      const hasReplacement = await hasReplacementDefaultWallet({
        supabase,
        accountId,
        userId: account.user_id,
        householdId,
        currency: account.currency,
      });
      if (!hasReplacement) {
        return errorResponse(
          DEFAULT_WALLET_DELETE_MESSAGE,
          "DEFAULT_WALLET_REQUIRED",
          400,
        );
      }
    }

    const { data: deleteResult, error: deleteError } = await supabase.rpc(
      "delete_wallet_hard",
      {
        p_account_id: accountId,
        p_user_id: userId,
      },
    );
    if (deleteError) {
      throw deleteError;
    }

    if (!isRecord(deleteResult) || deleteResult.success !== true) {
      const code = isRecord(deleteResult) ? deleteResult.code : null;
      const status = statusForCode(code);
      const errorMessage = isRecord(deleteResult) &&
          typeof deleteResult.error === "string"
        ? deleteResult.error
        : "Failed to delete wallet";
      const errorCode = typeof code === "string" ? code : "SERVER_ERROR";
      return jsonResponse(
        isRecord(deleteResult)
          ? {
            ...deleteResult,
            success: false,
            error: errorMessage,
            message: typeof deleteResult.message === "string"
              ? deleteResult.message
              : errorMessage,
            code: errorCode,
            errorCode,
            status,
          }
          : {
            success: false,
            error: "Failed to delete wallet",
            message: "Failed to delete wallet",
            code: "SERVER_ERROR",
            errorCode: "SERVER_ERROR",
            status,
          },
        status,
      );
    }

    const deleteData = isRecord(deleteResult.data)
      ? deleteResult.data
      : {};
    const rpcBank = isRecord(deleteData.bank) ? deleteData.bank : null;
    let bankCleanup: BankCleanupResult = rpcBank
      ? {
        linkedBankAccountId: typeof rpcBank.linkedBankAccountId === "string"
          ? rpcBank.linkedBankAccountId
          : null,
        bankConnectionId: typeof rpcBank.bankConnectionId === "string"
          ? rpcBank.bankConnectionId
          : null,
        bankAccountStatus: typeof rpcBank.bankAccountStatus === "string"
          ? rpcBank.bankAccountStatus
          : null,
        bankConnectionStatus: typeof rpcBank.bankConnectionStatus === "string"
          ? rpcBank.bankConnectionStatus
          : null,
      }
      : {
        linkedBankAccountId: account.linked_bank_account_id ?? null,
        bankConnectionId: null,
        bankAccountStatus: null,
        bankConnectionStatus: null,
      };

    try {
      bankCleanup = await cleanupLinkedBankAccount({
        supabase,
        accountId,
        linkedBankAccountId: account.linked_bank_account_id ?? null,
      });
    } catch (bankCleanupError) {
      console.error(
        "[delete-wallet] bank provider cleanup failed",
        bankCleanupError,
      );
      bankCleanup = {
        ...bankCleanup,
        bankConnectionStatus: bankCleanup.bankConnectionStatus ??
          "cleanup_failed",
      };
    }

    let logoCleanup = {
      logoUrl: account.logo_url ?? null,
      storagePath: null as string | null,
      removed: false,
      skippedReason: null as string | null,
    };
    try {
      logoCleanup = await cleanupWalletLogo({
        supabase,
        supabaseUrl: SUPABASE_URL,
        accountId,
        userId: account.user_id,
        logoUrl: account.logo_url ?? null,
      });
    } catch (logoCleanupError) {
      console.error("[delete-wallet] logo cleanup failed", logoCleanupError);
      logoCleanup = {
        ...logoCleanup,
        skippedReason: "cleanup_failed",
      };
    }

    return jsonResponse({
      success: true,
      data: {
        ...deleteData,
        bank: bankCleanup,
        logo: logoCleanup,
      },
    });
  } catch (error) {
    console.error("[delete-wallet]", error);
    const knownResponse = knownDeleteErrorResponse(error);
    if (knownResponse) {
      return knownResponse;
    }

    return jsonResponse(
      {
        success: false,
        error: "Failed to delete wallet",
        message: "Failed to delete wallet",
        code: "SERVER_ERROR",
        errorCode: "SERVER_ERROR",
        status: 500,
      },
      500,
    );
  }
});

async function cleanupWalletLogo(params: {
  supabase: FunctionSupabaseClient;
  supabaseUrl: string;
  accountId: string;
  userId: string;
  logoUrl: string | null;
}): Promise<{
  logoUrl: string | null;
  storagePath: string | null;
  removed: boolean;
  skippedReason: string | null;
}> {
  const storagePath = walletLogoStoragePath({
    supabaseUrl: params.supabaseUrl,
    userId: params.userId,
    logoUrl: params.logoUrl,
  });

  if (!params.logoUrl || !storagePath) {
    return {
      logoUrl: params.logoUrl,
      storagePath: null,
      removed: false,
      skippedReason: params.logoUrl ? "unsupported_logo_url" : "no_logo_url",
    };
  }

  const { data: sharedRows, error: sharedRowsError } = await params.supabase
    .from("accounts")
    .select("id")
    .eq("logo_url", params.logoUrl)
    .neq("id", params.accountId)
    .limit(1);

  if (sharedRowsError) {
    throw sharedRowsError;
  }

  if (Array.isArray(sharedRows) && sharedRows.length > 0) {
    return {
      logoUrl: params.logoUrl,
      storagePath,
      removed: false,
      skippedReason: "logo_url_reused",
    };
  }

  const { error: removeError } = await params.supabase.storage
    .from("public")
    .remove([storagePath]);

  if (removeError) {
    console.error("[delete-wallet] logo cleanup failed", removeError);
    return {
      logoUrl: params.logoUrl,
      storagePath,
      removed: false,
      skippedReason: "storage_remove_failed",
    };
  }

  return {
    logoUrl: params.logoUrl,
    storagePath,
    removed: true,
    skippedReason: null,
  };
}

function walletLogoStoragePath(params: {
  supabaseUrl: string;
  userId: string;
  logoUrl: string | null;
}): string | null {
  const logoUrl = params.logoUrl?.trim();
  if (!logoUrl) return null;

  try {
    const url = new URL(logoUrl);
    const projectUrl = new URL(params.supabaseUrl);
    if (url.host !== projectUrl.host) {
      return null;
    }

    const expectedPrefix =
      `/storage/v1/object/public/public/${params.userId}/wallet-logos/`;
    const decodedPathname = decodeURIComponent(url.pathname);
    if (!decodedPathname.startsWith(expectedPrefix)) {
      return null;
    }

    return decodedPathname.replace("/storage/v1/object/public/public/", "");
  } catch (_) {
    return null;
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toPlaidRemovableConnection(
  connection: Record<string, unknown>,
): PlaidRemovableConnection {
  const id = optionalString(connection.id);
  if (!id) {
    throw new Error("Plaid connection id is required for removal");
  }

  return {
    id,
    user_id: optionalString(connection.user_id),
    access_token_encrypted: optionalString(connection.access_token_encrypted),
    plaid_access_token_encrypted: optionalString(
      connection.plaid_access_token_encrypted,
    ),
  };
}

async function cleanupLinkedBankAccount(params: {
  supabase: FunctionSupabaseClient;
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
  const bankAccountId = typeof bankAccount?.id === "string"
    ? bankAccount.id
    : null;
  if (!bankAccountId) {
    return {
      ...emptyResult,
      linkedBankAccountId: params.linkedBankAccountId,
    };
  }

  const bankConnectionId = typeof bankAccount?.bank_connection_id === "string"
    ? bankAccount.bank_connection_id
    : null;
  const { data: sharedWallets, error: sharedWalletsError } =
    await params.supabase
      .from("accounts")
      .select("id")
      .eq("linked_bank_account_id", bankAccountId)
      .eq("is_archived", false)
      .neq("id", params.accountId);
  if (sharedWalletsError) {
    throw sharedWalletsError;
  }

  if (countRows(sharedWallets as { id: string }[] | null) > 0) {
    return {
      linkedBankAccountId: bankAccountId,
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
    .eq("id", bankAccountId);
  if (disableBankAccountError) {
    throw disableBankAccountError;
  }

  if (!bankConnectionId) {
    return {
      linkedBankAccountId: bankAccountId,
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
    .neq("id", bankAccountId)
    .eq("status", "active");
  if (activeSiblingsError) {
    throw activeSiblingsError;
  }

  if (countRows(activeSiblings as { id: string }[] | null) > 0) {
    return {
      linkedBankAccountId: bankAccountId,
      bankConnectionId,
      bankAccountStatus: "disabled",
      bankConnectionStatus: "kept_shared_connection",
    };
  }

  const { data: siblingBankAccounts, error: siblingBankAccountsError } =
    await params.supabase
      .from("bank_accounts")
      .select("id")
      .eq("bank_connection_id", bankConnectionId)
      .neq("id", bankAccountId);
  if (siblingBankAccountsError) {
    throw siblingBankAccountsError;
  }

  const siblingBankAccountIds = ((siblingBankAccounts || []) as Array<
    { id?: string | null }
  >)
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));
  if (siblingBankAccountIds.length > 0) {
    const { data: siblingWallets, error: siblingWalletsError } = await params
      .supabase
      .from("accounts")
      .select("id")
      .in("linked_bank_account_id", siblingBankAccountIds)
      .eq("is_archived", false)
      .neq("id", params.accountId)
      .limit(1);
    if (siblingWalletsError) {
      throw siblingWalletsError;
    }
    if (countRows(siblingWallets as { id: string }[] | null) > 0) {
      return {
        linkedBankAccountId: bankAccountId,
        bankConnectionId,
        bankAccountStatus: "disabled",
        bankConnectionStatus: "kept_shared_connection",
      };
    }
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
      linkedBankAccountId: bankAccountId,
      bankConnectionId,
      bankAccountStatus: "disabled",
      bankConnectionStatus: "kept_non_plaid_connection",
    };
  }

  if (connection.removed_at) {
    return {
      linkedBankAccountId: bankAccountId,
      bankConnectionId,
      bankAccountStatus: "disabled",
      bankConnectionStatus: "already_removed",
    };
  }

  try {
    await removePlaidConnection({
      supabase: params.supabase,
      connection: toPlaidRemovableConnection(connection),
      removalReason: "wallet_delete",
    });
    return {
      linkedBankAccountId: bankAccountId,
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
        linkedBankAccountId: bankAccountId,
        bankConnectionId,
        bankAccountStatus: "disabled",
        bankConnectionStatus: "pending_removal",
      };
    }
    throw error;
  }
}
