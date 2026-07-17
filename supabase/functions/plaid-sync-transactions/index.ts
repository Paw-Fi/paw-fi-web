import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { assertScopeAccess } from "../shared/accounts.ts";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternal } from "../shared/auth.ts";
import { decryptSecret } from "../shared/token-encryption.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  canUsePlaidBankSync,
  loadPlaidUserAccessState,
} from "../shared/plaid-access.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import {
  getPlaidAccounts,
  PLAID_PROVIDER,
  PlaidError,
  PlaidTransaction,
  syncPlaidTransactions,
} from "../shared/plaid-client.ts";
import { readPlaidSyncStatusMetadata } from "../shared/plaid-sync-status.ts";
import { fetchCompletePlaidSyncBatch } from "../shared/plaid-sync-batch.ts";
import {
  PLAID_NEW_ACCOUNTS_RELINK_STATE,
  PLAID_REQUIRED_RELINK_STATE,
} from "../shared/plaid-update-mode.ts";
import {
  type ExpensePreview,
  type LinkedWalletRecord,
  loadLinkedWalletsForBankAccounts,
  persistPlaidTransactions,
  sanitizeOptionalUuid,
  stagePlaidTransactions,
} from "../shared/bank-sync.ts";
import { rebindBankAccountExpensesToWallet } from "../shared/bank-wallet-binding.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MANUAL_SYNC_COOLDOWN_HOURS = 24;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-sync-transactions");
}

interface SyncRequest {
  connectionId?: string;
  bankAccountId?: string;
  cursorOverride?: string;
  targetHouseholdId?: string;
}

interface SyncSummary {
  connectionId: string;
  inserted: number;
  updated: number;
  removed: number;
  skipped: number;
  currencyMismatches: number;
  accountsProcessed: number;
  status: "succeeded" | "error";
  error?: string;
  errorCode?: string;
  nextEligibleAt?: string;
  addedTransactions: ExpensePreview[];
  syncStatus?: {
    initialUpdateComplete: boolean | null;
    historicalUpdateComplete: boolean | null;
    webhookCode: string | null;
    updatedAt: string | null;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = getCorsHeaders(req.headers.get("Origin") || undefined);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as SyncRequest;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-plaid-sync-transactions" },
      },
    });

    const authResult = await authenticateUserOrInternal(
      req,
      supabase,
      body.connectionId,
    );
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const accessState = await loadPlaidUserAccessState(
      supabase,
      authResult.userId,
    );
    if (!canUsePlaidBankSync(accessState)) {
      return new Response(
        JSON.stringify({
          error:
            "Bank sync is available during an active trial or with an active paid plan.",
          errorCode: "plaid_subscription_required",
        }),
        {
          status: 403,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const enforceManualCooldown = !authResult.isInternalService;

    let accountFilter: BankAccountRow | null = null;
    if (body.bankAccountId) {
      const { data: account, error: accountError } = await supabase
        .from("bank_accounts")
        .select(
          "id, user_id, bank_connection_id, plaid_account_id, currency, type, subtype",
        )
        .eq("id", body.bankAccountId)
        .maybeSingle();

      if (accountError) {
        console.error("[plaid-sync] Failed to load bank account", accountError);
        await reportEdgeFunctionError({
          functionName: "plaid-sync-transactions",
          error: accountError,
          context: {
            phase: "load_bank_account",
            bank_account_id: body.bankAccountId,
            user_id: authResult.userId,
          },
        });
        return new Response(
          JSON.stringify({ error: "Failed to load bank account" }),
          {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      if (!account || account.user_id !== authResult.userId) {
        return new Response(
          JSON.stringify({ error: "Bank account not found" }),
          {
            status: 404,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      accountFilter = account;
    }

    let connectionsQuery = supabase
      .from("bank_connections")
      .select(
        "id, user_id, household_id, provider_item_id, country_code, metadata, access_token_encrypted, plaid_access_token_encrypted, cursor, plaid_cursor, cursor_generation, status, item_status, item_health_state, relink_state, last_successful_sync_at, removed_at",
      )
      .eq("user_id", authResult.userId)
      .eq("provider", PLAID_PROVIDER)
      .is("removed_at", null)
      .or("item_status.is.null,item_status.neq.pending_removal")
      .neq("status", "disabled");

    if (
      body.connectionId &&
      accountFilter &&
      accountFilter.bank_connection_id !== body.connectionId
    ) {
      return new Response(
        JSON.stringify({ error: "Bank account does not belong to connection" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const requestedConnectionId =
      body.connectionId ?? accountFilter?.bank_connection_id;
    if (requestedConnectionId) {
      connectionsQuery = connectionsQuery.eq("id", requestedConnectionId);
    }

    const { data: connections, error: connectionsError } =
      await connectionsQuery;
    if (connectionsError) {
      console.error(
        "[plaid-sync] Failed to load connections",
        connectionsError,
      );
      await reportEdgeFunctionError({
        functionName: "plaid-sync-transactions",
        error: connectionsError,
        context: {
          phase: "load_bank_connections",
          connection_id: body.connectionId || null,
          user_id: authResult.userId,
        },
      });
      return new Response(
        JSON.stringify({ error: "Failed to load connections" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (!connections?.length) {
      return new Response(
        JSON.stringify({ error: "No bank connections found" }),
        {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const requestedTargetHouseholdId = sanitizeOptionalUuid(
      body.targetHouseholdId,
    );
    if (body.targetHouseholdId && !requestedTargetHouseholdId) {
      return new Response(
        JSON.stringify({ error: "Invalid targetHouseholdId" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (
      requestedTargetHouseholdId &&
      !authResult.isInternalService &&
      !(await assertScopeAccess(
        supabase as any,
        authResult.userId,
        requestedTargetHouseholdId,
      ))
    ) {
      return new Response(JSON.stringify({ error: "Forbidden scope" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const connectionIds = connections.map((conn) => conn.id);
    const { data: bankAccounts, error: bankAccountError } = await supabase
      .from("bank_accounts")
      .select(
        "id, bank_connection_id, plaid_account_id, provider_account_id, currency, type, subtype",
      )
      .in("bank_connection_id", connectionIds);

    if (bankAccountError) {
      console.error(
        "[plaid-sync] Failed to load bank accounts",
        bankAccountError,
      );
      await reportEdgeFunctionError({
        functionName: "plaid-sync-transactions",
        error: bankAccountError,
        context: {
          phase: "load_bank_accounts",
          connection_ids: connectionIds,
          user_id: authResult.userId,
        },
      });
      return new Response(
        JSON.stringify({ error: "Failed to load accounts" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const accountMap = new Map<string, BankAccountRow>();
    (bankAccounts || []).forEach((account) => {
      const key = account.provider_account_id || account.plaid_account_id;
      accountMap.set(key, account);
    });

    const summaries: SyncSummary[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalRemoved = 0;
    let totalCurrencyMismatches = 0;
    const allAdded: ExpensePreview[] = [];

    for (const connection of connections) {
      const summary = await syncConnection({
        connection,
        accountMap,
        supabase: supabase as any,
        userId: authResult.userId,
        accountFilter,
        cursorOverride: body.cursorOverride,
        targetHouseholdId: requestedTargetHouseholdId,
        enforceManualCooldown,
      });
      summaries.push(summary);
      totalInserted += summary.inserted;
      totalUpdated += summary.updated;
      totalRemoved += summary.removed;
      totalCurrencyMismatches += summary.currencyMismatches;
      allAdded.push(...summary.addedTransactions);
    }

    const manualCooldownOnly =
      enforceManualCooldown &&
      summaries.length > 0 &&
      summaries.every(
        (summary) => summary.errorCode === "MANUAL_SYNC_COOLDOWN",
      );

    if (manualCooldownOnly) {
      const retryAt = summaries
        .map((summary) => summary.nextEligibleAt)
        .filter((value): value is string => typeof value === "string")
        .sort()[0];
      return new Response(
        JSON.stringify({
          error: "Manual sync is available once every 24 hours.",
          retryAt,
          connections: summaries,
        }),
        {
          status: 429,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: summaries.every((item) => item.status === "succeeded")
          ? "succeeded"
          : "partial_error",
        summary: {
          connections: summaries.length,
          inserted: totalInserted,
          updated: totalUpdated,
          removed: totalRemoved,
          currencyMismatches: totalCurrencyMismatches,
        },
        connections: summaries,
        addedTransactions: allAdded,
        syncStatus:
          body.connectionId && summaries.length == 1
            ? (summaries[0].syncStatus ?? null)
            : null,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-sync] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-sync-transactions",
      error,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to sync transactions",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});

async function syncConnection(params: {
  connection: BankConnectionRow;
  accountMap: Map<string, BankAccountRow>;
  supabase: any;
  userId: string;
  accountFilter: BankAccountRow | null;
  cursorOverride?: string;
  targetHouseholdId?: string | null;
  enforceManualCooldown: boolean;
}): Promise<SyncSummary> {
  const summary: SyncSummary = {
    connectionId: params.connection.id,
    inserted: 0,
    updated: 0,
    removed: 0,
    skipped: 0,
    currencyMismatches: 0,
    accountsProcessed: 0,
    status: "succeeded",
    addedTransactions: [],
    syncStatus: readPlaidSyncStatusMetadata(params.connection.metadata),
  };

  const cooldownExemptItemStatuses = new Set([
    "newly_connected",
    "initial_sync_in_progress",
    "reconnected",
    "accounts_updated",
  ]);
  const isInitialOrUserRepairSync = cooldownExemptItemStatuses.has(
    params.connection.item_status ?? "",
  );

  if (params.enforceManualCooldown && !isInitialOrUserRepairSync) {
    const lastSuccessfulSyncAt = params.connection.last_successful_sync_at
      ? new Date(params.connection.last_successful_sync_at)
      : null;
    if (lastSuccessfulSyncAt && !Number.isNaN(lastSuccessfulSyncAt.getTime())) {
      const nextEligibleAt = new Date(
        lastSuccessfulSyncAt.getTime() +
          MANUAL_SYNC_COOLDOWN_HOURS * 60 * 60 * 1000,
      );
      if (nextEligibleAt.getTime() > Date.now()) {
        summary.status = "error";
        summary.errorCode = "MANUAL_SYNC_COOLDOWN";
        summary.error = "Manual sync is available once every 24 hours.";
        summary.nextEligibleAt = nextEligibleAt.toISOString();
        return summary;
      }
    }
  }

  const auditInsert = await params.supabase
    .from("bank_sync_audit")
    .insert({
      bank_connection_id: params.connection.id,
      triggered_by: params.userId,
      sync_scope: "manual",
      status: "running",
    })
    .select("id")
    .single();

  const auditId = auditInsert.data?.id;
  const auditUpdate = async (patch: Record<string, unknown>) => {
    if (!auditId) return;
    await params.supabase
      .from("bank_sync_audit")
      .update(patch)
      .eq("id", auditId);
  };

  const lockResult = await params.supabase.rpc("acquire_bank_sync_lock", {
    p_bank_connection_id: params.connection.id,
    p_lock_seconds: 900,
    p_locked_by: "plaid-sync",
  });

  if (!lockResult.data) {
    summary.status = "error";
    summary.error = "Sync already in progress";
    await auditUpdate({
      status: "failed",
      error_message: summary.error,
      finished_at: new Date().toISOString(),
    });
    return summary;
  }

  try {
    await params.supabase
      .from("bank_connections")
      .update({
        last_sync_attempt_at: new Date().toISOString(),
        item_status: params.connection.last_successful_sync_at
          ? "active"
          : "initial_sync_in_progress",
        item_health_state: "healthy",
      })
      .eq("id", params.connection.id);

    const encryptedToken =
      params.connection.access_token_encrypted ||
      params.connection.plaid_access_token_encrypted;
    if (!encryptedToken) {
      throw new Error("Missing Plaid access token");
    }
    const accessToken = await decryptSecret(encryptedToken);

    let cursor: string | undefined =
      params.cursorOverride === "reset"
        ? undefined
        : params.cursorOverride ||
          params.connection.cursor ||
          params.connection.plaid_cursor ||
          undefined;
    const processedAccounts = new Set<string>();
    // Plaid cursors belong to the Item, not an individual account. A request
    // started from one account must apply every account update for that Item.
    const connectionBankAccountIds = Array.from(params.accountMap.values())
      .filter((account) => account.bank_connection_id === params.connection.id)
      .map((account) => account.id);
    const connectionHouseholdId = params.connection.household_id || null;
    if (
      params.targetHouseholdId &&
      params.targetHouseholdId !== connectionHouseholdId
    ) {
      throw new Error("Bank connection belongs to a different space");
    }
    const effectiveTargetHouseholdId = connectionHouseholdId;
    const linkedWalletsByBankAccountId = await loadLinkedWalletsForBankAccounts(
      {
        supabase: params.supabase,
        userId: params.userId,
        targetHouseholdId: effectiveTargetHouseholdId,
        bankAccountIds: connectionBankAccountIds,
      },
    );
    await rebindLinkedPlaidExpensesForConnection({
      supabase: params.supabase,
      userId: params.userId,
      connectionId: params.connection.id,
      linkedWalletsByBankAccountId,
    });
    const originalCursor = cursor;
    const batch = await fetchCompletePlaidSyncBatch({
      initialCursor: originalCursor,
      fetchPage: (requestCursor) =>
        syncPlaidTransactions(accessToken, requestCursor),
      isMutationDuringPagination: (error) =>
        error instanceof PlaidError &&
        error.code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION",
      onRestart: (restartCount, error) => {
        console.warn(
          "[plaid-sync] Restarting paginated Plaid sync from original cursor",
          JSON.stringify({
            connectionId: params.connection.id,
            originalCursor: originalCursor ?? null,
            requestId:
              error instanceof PlaidError ? error.requestId || null : null,
            restartCount,
          }),
        );
      },
      onPage: (response, requestCursor) => {
        const pageTransactions = [...response.added, ...response.modified];
        logPlaidTransactionSample({
          connectionId: params.connection.id,
          cursor: requestCursor ?? undefined,
          syncStatus: summary.syncStatus ?? null,
          addedCount: response.added.length,
          modifiedCount: response.modified.length,
          removedCount: response.removed?.length ?? 0,
          sample: pageTransactions.slice(0, 5),
        });
      },
    });

    const grouped = groupByAccount([...batch.added, ...batch.modified]);
    logPlaidAccountMappingDebug({
      connectionId: params.connection.id,
      grouped,
      accountMap: params.accountMap,
      accountFilterId: params.accountFilter?.id ?? null,
    });

    for (const [plaidAccountId, transactions] of grouped.entries()) {
      const account = params.accountMap.get(plaidAccountId);
      if (!account) continue;

      const linkedWallet = linkedWalletsByBankAccountId.get(account.id);
      const resolvedHouseholdId =
        linkedWallet?.household_id ?? effectiveTargetHouseholdId;

      await stagePlaidTransactions({
        supabase: params.supabase,
        bankConnectionId: params.connection.id,
        bankAccountId: account.id,
        transactions,
      });

      const result = await persistPlaidTransactions({
        supabase: params.supabase,
        userId: params.userId,
        bankAccountId: account.id,
        householdId: resolvedHouseholdId,
        accountId: linkedWallet?.id ?? null,
        accountCurrency: account.currency,
        accountType: account.type,
        transactions,
        cursorGeneration: params.connection.cursor_generation ?? 0,
      });

      summary.inserted += result.inserted;
      summary.updated += result.updated;
      summary.skipped += result.skipped;
      summary.currencyMismatches += result.currencyMismatches;
      summary.addedTransactions.push(...result.insertedRecords);
      processedAccounts.add(account.id);
    }

    const removedIds = batch.removed
      .map((row) => row.transaction_id)
      .filter(Boolean);
    if (removedIds.length) {
      await params.supabase
        .from("expenses")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: "provider_removed",
          provider_deleted_at: new Date().toISOString(),
        })
        .eq("provider", PLAID_PROVIDER)
        .eq("user_id", params.userId)
        .in("bank_account_id", connectionBankAccountIds)
        .is("deleted_at", null)
        .in("provider_transaction_id", removedIds);
      summary.removed += removedIds.length;
    }

    cursor = batch.nextCursor;

    await params.supabase
      .from("bank_connections")
      .update({
        cursor: cursor || null,
        plaid_cursor: cursor || null,
        last_successful_sync_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        status: "active",
        item_status:
          cooldownExemptItemStatuses.has(params.connection.item_status ?? "") ||
          params.connection.item_status === "pending_relink"
            ? "active"
            : (params.connection.item_status ?? "active"),
        item_health_state: "healthy",
        relink_state:
          params.connection.relink_state === PLAID_REQUIRED_RELINK_STATE
            ? null
            : params.connection.relink_state === PLAID_NEW_ACCOUNTS_RELINK_STATE
              ? PLAID_NEW_ACCOUNTS_RELINK_STATE
              : null,
        error_code: null,
        error_message: null,
      })
      .eq("id", params.connection.id);

    if (processedAccounts.size) {
      await params.supabase
        .from("bank_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .in("id", Array.from(processedAccounts));
    }

    summary.accountsProcessed = processedAccounts.size;
    await auditUpdate({
      status: "succeeded",
      inserted_transactions: summary.inserted,
      updated_transactions: summary.updated,
      skipped_transactions: summary.skipped,
      synced_accounts: summary.accountsProcessed,
      finished_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[plaid-sync] Connection sync failed",
      params.connection.id,
      error,
    );
    summary.status = "error";
    summary.error = formatUnknownErrorMessage(error);
    const errorCode = error instanceof PlaidError ? error.code || null : null;

    // Handle specific Plaid error codes
    if (error instanceof PlaidError) {
      // ITEM_LOGIN_REQUIRED: User needs to re-authenticate
      if (errorCode === "ITEM_LOGIN_REQUIRED") {
        console.log(
          `[plaid-sync] Connection ${params.connection.id} requires re-authentication`,
        );
        await params.supabase
          .from("bank_connections")
          .update({
            status: "needs_reauth",
            item_status: "pending_relink",
            item_health_state: "unhealthy",
            relink_state: "required",
            error_code: errorCode,
            error_message:
              "Bank requires re-authentication. Please reconnect your account.",
          })
          .eq("id", params.connection.id);
        await auditUpdate({
          status: "failed",
          error_message: "Bank requires re-authentication",
          error_code: errorCode,
          error_payload: error.details,
          finished_at: new Date().toISOString(),
        });
        return summary;
      }

      // INVALID_CURSOR: Cursor is stale/invalid, reset and retry
      if (errorCode === "INVALID_CURSOR") {
        console.log(
          `[plaid-sync] Invalid cursor for connection ${params.connection.id}, resetting cursor`,
        );
        // Reset the cursor and mark for retry
        await params.supabase
          .from("bank_connections")
          .update({
            cursor: null,
            plaid_cursor: null,
            cursor_generation: (params.connection.cursor_generation ?? 0) + 1,
            needs_resync: true,
            error_code: null,
            error_message: null,
          })
          .eq("id", params.connection.id);
        await enqueuePlaidSyncJob({
          supabase: params.supabase,
          connectionId: params.connection.id,
          triggerSource: "invalid_cursor_recovery",
          payload: {
            cursorOverride: "reset",
            cursorGeneration: (params.connection.cursor_generation ?? 0) + 1,
          },
        });
        // Update error for audit but mark as recoverable
        summary.error = "Cursor reset - sync will retry with fresh cursor";
        await auditUpdate({
          status: "failed",
          error_message: summary.error,
          error_code: errorCode,
          error_payload: error.details,
          finished_at: new Date().toISOString(),
        });
        return summary;
      }
    }

    // Default error handling for other errors
    await params.supabase
      .from("bank_connections")
      .update({
        status: "error",
        item_status: "degraded_unhealthy",
        item_health_state: "unhealthy",
        error_code: errorCode,
        error_message: summary.error,
      })
      .eq("id", params.connection.id);
    await auditUpdate({
      status: "failed",
      error_message: summary.error,
      error_code: errorCode,
      error_payload:
        error instanceof PlaidError
          ? error.details
          : serializeUnknownError(error),
      finished_at: new Date().toISOString(),
    });
    await reportEdgeFunctionError({
      functionName: "plaid-sync-transactions",
      error,
      context: {
        connection_id: params.connection.id,
        plaid_request_id: error instanceof PlaidError ? error.requestId : null,
        provider_item_id: params.connection.provider_item_id,
        cursor_generation: params.connection.cursor_generation ?? 0,
      },
    });
  } finally {
    await params.supabase.rpc("release_bank_sync_lock", {
      p_bank_connection_id: params.connection.id,
    });
  }

  return summary;
}

function formatUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const map = error as Record<string, unknown>;
    const message = map.message ?? map.error ?? map.details;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    try {
      return JSON.stringify(map);
    } catch {
      return "[unserializable error]";
    }
  }

  return String(error);
}

function serializeUnknownError(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  const map = error as Record<string, unknown>;
  return {
    code: map.code ?? null,
    message: map.message ?? null,
    details: map.details ?? null,
    hint: map.hint ?? null,
    error: map.error ?? null,
  };
}

function shouldLogPlaidTransactionSample(): boolean {
  const explicitFlag =
    Deno.env.get("PLAID_DEBUG_LOG_TRANSACTIONS")?.toLowerCase() === "true";
  const plaidEnv =
    Deno.env.get("PLAID_ENV")?.trim()?.toLowerCase() || "sandbox";
  return explicitFlag || plaidEnv === "sandbox";
}

function logPlaidTransactionSample(params: {
  connectionId: string;
  cursor?: string;
  syncStatus?: SyncSummary["syncStatus"] | null;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  sample: PlaidTransaction[];
}) {
  if (!shouldLogPlaidTransactionSample()) {
    return;
  }

  const summarizedSample = params.sample.map((transaction) => ({
    transactionId: transaction.transaction_id,
    accountId: transaction.account_id,
    currency:
      transaction.iso_currency_code ??
      transaction.unofficial_currency_code ??
      null,
    pending: transaction.pending ?? false,
    pendingTransactionId: transaction.pending_transaction_id ?? null,
  }));

  console.log(
    "[plaid-sync] Plaid transaction sample",
    JSON.stringify({
      connectionId: params.connectionId,
      fromCursor: params.cursor ?? null,
      syncStatus: params.syncStatus ?? null,
      addedCount: params.addedCount,
      modifiedCount: params.modifiedCount,
      removedCount: params.removedCount,
      sampleCount: summarizedSample.length,
      sample: summarizedSample,
    }),
  );
}

function logPlaidAccountMappingDebug(params: {
  connectionId: string;
  grouped: Map<string, PlaidTransaction[]>;
  accountMap: Map<string, BankAccountRow>;
  accountFilterId: string | null;
}) {
  if (!shouldLogPlaidTransactionSample()) {
    return;
  }

  const unmatched = Array.from(params.grouped.entries())
    .filter(([plaidAccountId]) => !params.accountMap.has(plaidAccountId))
    .map(([plaidAccountId, transactions]) => ({
      plaidAccountId,
      transactionCount: transactions.length,
      sampleTransactionId: transactions[0]?.transaction_id ?? null,
    }))
    .slice(0, 5);

  console.log(
    "[plaid-sync] Plaid account mapping debug",
    JSON.stringify({
      connectionId: params.connectionId,
      groupedAccountCount: params.grouped.size,
      knownAccountCount: params.accountMap.size,
      accountFilterId: params.accountFilterId,
      unmatchedAccountCount: unmatched.length,
      unmatchedAccounts: unmatched,
    }),
  );
}

async function rebindLinkedPlaidExpensesForConnection(params: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  connectionId: string;
  linkedWalletsByBankAccountId: Map<string, LinkedWalletRecord>;
}) {
  for (const [
    bankAccountId,
    linkedWallet,
  ] of params.linkedWalletsByBankAccountId) {
    const result = await rebindBankAccountExpensesToWallet({
      supabase: params.supabase,
      userId: params.userId,
      bankAccountId,
      walletId: linkedWallet.id,
      householdId: linkedWallet.household_id ?? null,
      provider: PLAID_PROVIDER,
      walletCurrency: linkedWallet.currency,
    });
    if (result.updated > 0) {
      console.log(
        "[plaid-sync] Rebound Plaid expenses to linked wallet",
        JSON.stringify({
          connectionId: params.connectionId,
          bankAccountId,
          walletId: linkedWallet.id,
          scanned: result.scanned,
          updated: result.updated,
        }),
      );
    }
  }
}

function groupByAccount(
  transactions: PlaidTransaction[],
): Map<string, PlaidTransaction[]> {
  const grouped = new Map<string, PlaidTransaction[]>();
  transactions.forEach((txn) => {
    if (!txn.account_id) return;
    const collection = grouped.get(txn.account_id) || [];
    collection.push(txn);
    grouped.set(txn.account_id, collection);
  });
  return grouped;
}

interface BankAccountRow {
  id: string;
  bank_connection_id: string;
  plaid_account_id: string;
  provider_account_id?: string | null;
  currency: string;
  type?: string | null;
  subtype?: string | null;
  user_id?: string;
}

interface BankConnectionRow {
  id: string;
  user_id: string;
  household_id?: string | null;
  provider_item_id?: string | null;
  country_code?: string | null;
  metadata?: unknown;
  access_token_encrypted?: string | null;
  plaid_access_token_encrypted?: string | null;
  cursor?: string | null;
  plaid_cursor?: string | null;
  cursor_generation?: number | null;
  last_successful_sync_at?: string | null;
  status: string;
  item_status?: string | null;
  item_health_state?: string | null;
  relink_state?: string | null;
  removed_at?: string | null;
}
