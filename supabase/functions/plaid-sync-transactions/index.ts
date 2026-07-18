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
import {
  mergePlaidSyncStatusMetadata,
  plaidSyncStatusFromTransactionsUpdateStatus,
  readPlaidSyncStatusMetadata,
} from "../shared/plaid-sync-status.ts";
import { fetchCompletePlaidSyncBatch } from "../shared/plaid-sync-batch.ts";
import {
  type ExpensePreview,
  type LinkedWalletRecord,
  loadLinkedWalletsForBankAccounts,
  preparePlaidTransactionMutations,
  sanitizeOptionalUuid,
  stagePlaidTransactions,
  upsertPlaidAccounts,
} from "../shared/bank-sync.ts";
import { rebindBankAccountExpensesToWallet } from "../shared/bank-wallet-binding.ts";
import type { BankExpenseMutationRecord } from "../shared/bank-expense-projection.ts";
import { refreshPlaidRecurringTemplates } from "../shared/plaid-recurring.ts";
import { requiresPlaidRelinkForError } from "../shared/plaid-update-mode.ts";

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
  inactiveTransactionsHidden: number;
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
        "id, user_id, household_id, country_code, metadata, access_token_encrypted, plaid_access_token_encrypted, cursor, plaid_cursor, cursor_generation, status, item_status, item_health_state, relink_state, last_successful_sync_at, removed_at",
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
        "id, bank_connection_id, plaid_account_id, provider_account_id, currency, type, subtype, status",
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
      const providerAccountId =
        account.provider_account_id || account.plaid_account_id;
      const key = `${account.bank_connection_id}:${providerAccountId}`;
      accountMap.set(key, account);
    });
    const cursorOverride = authResult.isInternalService
      ? body.cursorOverride
      : undefined;

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
        cursorOverride,
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
    inactiveTransactionsHidden: 0,
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
  if (auditInsert.error || !auditId) {
    throw auditInsert.error || new Error("Failed to create Plaid sync audit");
  }
  const auditUpdate = async (patch: Record<string, unknown>) => {
    if (!auditId) return;
    await params.supabase
      .from("bank_sync_audit")
      .update(patch)
      .eq("id", auditId);
  };

  const lockToken = crypto.randomUUID();
  const lockResult = await params.supabase.rpc("acquire_bank_sync_lock_v2", {
    p_bank_connection_id: params.connection.id,
    p_lock_token: lockToken,
    p_lock_seconds: 900,
    p_locked_by: "plaid-sync",
  });

  if (lockResult.error) {
    summary.status = "error";
    summary.errorCode = "LOCK_ACQUIRE_FAILED";
    summary.error = "Bank sync lock could not be acquired";
    await auditUpdate({
      status: "failed",
      error_message: summary.error,
      error_code: summary.errorCode,
      finished_at: new Date().toISOString(),
    });
    return summary;
  }
  if (!lockResult.data) {
    summary.status = "error";
    summary.errorCode = "SYNC_IN_PROGRESS";
    summary.error = "Sync already in progress";
    await auditUpdate({
      status: "failed",
      error_message: summary.error,
      error_code: summary.errorCode,
      finished_at: new Date().toISOString(),
    });
    return summary;
  }

  try {
    const { error: syncStartedEventError } = await params.supabase
      .from("plaid_sync_events")
      .insert({
        bank_connection_id: params.connection.id,
        bank_sync_audit_id: auditId,
        event_type: "sync_started",
        payload: {
          cursor_generation: params.connection.cursor_generation ?? 0,
          account_filter_applied: params.accountFilter != null,
        },
      });
    if (syncStartedEventError) throw syncStartedEventError;

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

    const supportedPlaidAccounts = (await getPlaidAccounts(accessToken)).filter(
      (account) =>
        account.type === "depository" ||
        account.type === "credit" ||
        (account.type === "loan" &&
          (account.subtype === "mortgage" || account.subtype === "student")),
    );
    const refreshedAccounts = await upsertPlaidAccounts({
      supabase: params.supabase,
      userId: params.userId,
      bankConnectionId: params.connection.id,
      accounts: supportedPlaidAccounts,
    });
    const removalScopeAccountIds = Array.from(params.accountMap.values())
      .filter((account) => account.bank_connection_id === params.connection.id)
      .map((account) => account.id);
    const refreshedProviderAccountIds = new Set(
      refreshedAccounts.allRecords.map(
        (account) => account.provider_account_id,
      ),
    );
    const inactiveAccountIds = Array.from(params.accountMap.values())
      .filter(
        (account) =>
          account.bank_connection_id === params.connection.id &&
          (account.status == null || account.status === "active") &&
          !refreshedProviderAccountIds.has(
            account.provider_account_id || account.plaid_account_id,
          ),
      )
      .map((account) => account.id);
    if (inactiveAccountIds.length > 0) {
      const { error: inactiveAccountsError } = await params.supabase
        .from("bank_accounts")
        .update({ status: "inactive" })
        .in("id", inactiveAccountIds);
      if (inactiveAccountsError) throw inactiveAccountsError;
    }
    const inactiveAccountIdSet = new Set(inactiveAccountIds);
    const accountMap = new Map<string, BankAccountRow>(
      Array.from(params.accountMap.entries())
        .filter(([key]) => key.startsWith(`${params.connection.id}:`))
        .map(
          ([key, account]) =>
            [
              key,
              inactiveAccountIdSet.has(account.id)
                ? { ...account, status: "inactive" }
                : account,
            ] as const,
        ),
    );
    for (const account of refreshedAccounts.allRecords) {
      accountMap.set(`${params.connection.id}:${account.provider_account_id}`, {
        ...account,
        bank_connection_id: params.connection.id,
      });
    }

    let cursor: string | undefined =
      params.cursorOverride === "reset"
        ? undefined
        : params.cursorOverride ||
          params.connection.cursor ||
          params.connection.plaid_cursor ||
          undefined;
    // Plaid cursors belong to the Item, not an individual account. A request
    // started from one account must apply every account update for that Item.
    const connectionBankAccountIds = Array.from(accountMap.values())
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
    const originalCursor = cursor;
    let paginationRestartCount = 0;
    const batch = await fetchCompletePlaidSyncBatch({
      initialCursor: originalCursor,
      fetchPage: async (requestCursor) => {
        const leaseResult = await params.supabase.rpc(
          "extend_bank_sync_lock_v2",
          {
            p_bank_connection_id: params.connection.id,
            p_lock_token: lockToken,
            p_lock_seconds: 900,
          },
        );
        if (leaseResult.error || leaseResult.data !== true) {
          throw new Error("Plaid sync lock lease was lost");
        }
        return syncPlaidTransactions(accessToken, requestCursor);
      },
      isMutationDuringPagination: (error) =>
        error instanceof PlaidError &&
        error.code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION",
      onRestart: (restartCount, error) => {
        paginationRestartCount = restartCount;
        console.warn(
          "[plaid-sync] Restarting paginated Plaid sync from original cursor",
          JSON.stringify({
            restartCount,
            errorCode: error instanceof PlaidError ? error.code || null : null,
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
    if (paginationRestartCount > 0) {
      const { error: paginationEventError } = await params.supabase
        .from("plaid_sync_events")
        .insert({
          bank_connection_id: params.connection.id,
          bank_sync_audit_id: auditId,
          event_type: "pagination_restarted",
          severity: "warning",
          payload: { restart_count: paginationRestartCount },
        });
      if (paginationEventError) throw paginationEventError;
    }

    const upsertTransactions = Array.from(
      new Map(
        [...batch.added, ...batch.modified].map(
          (transaction) => [transaction.transaction_id, transaction] as const,
        ),
      ).values(),
    );
    const grouped = groupByAccount(upsertTransactions);
    logPlaidAccountMappingDebug({
      connectionId: params.connection.id,
      grouped,
      accountMap,
      accountFilterId: params.accountFilter?.id ?? null,
    });

    for (const plaidAccountId of grouped.keys()) {
      const account = accountMap.get(
        `${params.connection.id}:${plaidAccountId}`,
      );
      if (!account) {
        throw new Error(
          `Plaid sync returned unmapped account ${plaidAccountId}; cursor was not advanced`,
        );
      }
    }

    const expenseInserts: BankExpenseMutationRecord[] = [];
    const expenseUpdates: BankExpenseMutationRecord[] = [];

    for (const [plaidAccountId, transactions] of grouped.entries()) {
      const account = accountMap.get(
        `${params.connection.id}:${plaidAccountId}`,
      )!;

      const linkedWallet = linkedWalletsByBankAccountId.get(account.id);
      const resolvedHouseholdId =
        linkedWallet?.household_id ?? effectiveTargetHouseholdId;

      const isInactiveAccount = !isActivePlaidAccount(account);
      await stagePlaidTransactions({
        supabase: params.supabase,
        bankConnectionId: params.connection.id,
        bankAccountId: account.id,
        transactions,
      });

      const prepared = await preparePlaidTransactionMutations({
        supabase: params.supabase,
        userId: params.userId,
        bankAccountId: account.id,
        householdId: resolvedHouseholdId,
        accountId: linkedWallet?.id ?? null,
        accountCurrency: account.currency,
        accountType: account.type,
        transactions,
        cursorGeneration: params.connection.cursor_generation ?? 0,
        hideNewTransactions: isInactiveAccount,
      });

      expenseInserts.push(...prepared.inserts);
      expenseUpdates.push(...prepared.updates);
      summary.skipped += prepared.skipped;
      if (isInactiveAccount) {
        summary.inactiveTransactionsHidden += prepared.inserts.filter(
          (record) => record.deleted_reason === "bank_account_inactive",
        ).length;
      }
      summary.currencyMismatches += prepared.currencyMismatches;
    }

    const removedIds = batch.removed
      .map((row) => row.transaction_id)
      .filter(Boolean);
    const providerRemovalAccountIds = batch.removed
      .map((row) => {
        if (!row.account_id) return null;
        return params.accountMap.get(
          `${params.connection.id}:${row.account_id}`,
        )?.id;
      })
      .filter((id): id is string => Boolean(id));
    let removedBankAccountIds = Array.from(new Set(providerRemovalAccountIds));
    if (removedIds.length && removalScopeAccountIds.length) {
      const { data: removedRows, error: removedRowsError } =
        await params.supabase
          .from("expenses")
          .select("bank_account_id")
          .eq("user_id", params.userId)
          .eq("provider", PLAID_PROVIDER)
          .in("bank_account_id", removalScopeAccountIds)
          .in("provider_transaction_id", removedIds);
      if (removedRowsError) throw removedRowsError;
      removedBankAccountIds = Array.from(
        new Set([
          ...removedBankAccountIds,
          ...(removedRows || [])
            .map((row) => row.bank_account_id)
            .filter((id): id is string => Boolean(id)),
        ]),
      );
    }
    const atomicAccountIds = connectionBankAccountIds;
    const { data: leaseExtended, error: leaseExtendError } =
      await params.supabase.rpc("extend_bank_sync_lock_v2", {
        p_bank_connection_id: params.connection.id,
        p_lock_token: lockToken,
        p_lock_seconds: 900,
      });
    if (leaseExtendError || leaseExtended !== true) {
      throw new Error("Plaid sync lock lease was lost before commit");
    }
    const { data: atomicResult, error: atomicError } =
      await params.supabase.rpc("apply_plaid_sync_batch_v1", {
        p_user_id: params.userId,
        p_bank_connection_id: params.connection.id,
        p_expected_cursor_generation: params.connection.cursor_generation ?? 0,
        p_next_cursor: batch.nextCursor,
        p_expense_inserts: expenseInserts,
        p_expense_updates: expenseUpdates,
        p_removed_provider_transaction_ids: removedIds,
        p_removed_bank_account_ids: removedBankAccountIds,
        p_processed_bank_account_ids: atomicAccountIds,
        p_lock_token: lockToken,
        p_audit_id: auditId ?? null,
      });
    if (atomicError) throw atomicError;

    const result = (atomicResult || {}) as Record<string, unknown>;
    summary.inserted = Number(result.inserted || 0);
    summary.updated = Number(result.updated || 0);
    summary.removed = Number(result.removed || 0);
    summary.accountsProcessed = Number(result.accounts_processed || 0);
    summary.addedTransactions = Array.isArray(result.inserted_records)
      ? (result.inserted_records as ExpensePreview[])
      : [];
    cursor = batch.nextCursor;

    const responseSyncStatus = plaidSyncStatusFromTransactionsUpdateStatus(
      batch.transactionsUpdateStatus,
    );
    if (responseSyncStatus) {
      const { data: currentConnection, error: currentConnectionError } =
        await params.supabase
          .from("bank_connections")
          .select("metadata")
          .eq("id", params.connection.id)
          .single();
      if (currentConnectionError) throw currentConnectionError;
      const metadata = mergePlaidSyncStatusMetadata(
        currentConnection?.metadata,
        responseSyncStatus,
      );
      const { error: statusUpdateError } = await params.supabase
        .from("bank_connections")
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq("id", params.connection.id);
      if (statusUpdateError) throw statusUpdateError;
      summary.syncStatus = readPlaidSyncStatusMetadata(metadata);
    }

    await auditUpdate({
      skipped_transactions: summary.skipped,
    });

    try {
      await rebindLinkedPlaidExpensesForConnection({
        supabase: params.supabase,
        userId: params.userId,
        linkedWalletsByBankAccountId,
      });
    } catch (postProcessingError) {
      summary.status = "error";
      summary.errorCode = "POST_PROCESSING_FAILED";
      summary.error = "Transactions synced, but post-processing failed";
      await reportEdgeFunctionError({
        functionName: "plaid-sync-transactions",
        error: postProcessingError,
        context: {
          phase: "post_process_after_atomic_batch",
        },
      });
    }

    if (summary.syncStatus?.historicalUpdateComplete === true) {
      try {
        const recurringResult = await refreshPlaidRecurringTemplates({
          supabase: params.supabase,
          accessToken,
          userId: params.userId,
          householdId: effectiveTargetHouseholdId,
          accounts: Array.from(accountMap.values())
            .filter((account) => isActivePlaidAccount(account))
            .map((account) => ({
              id: account.id,
              providerAccountId:
                account.provider_account_id || account.plaid_account_id,
              currency: account.currency,
              type: account.type,
              subtype: account.subtype,
            })),
          linkedWalletsByBankAccountId,
        });
        console.log(
          "[plaid-sync] Refreshed recurring templates",
          JSON.stringify(recurringResult),
        );
        const { error: recurringEventError } = await params.supabase
          .from("plaid_sync_events")
          .insert({
            bank_connection_id: params.connection.id,
            bank_sync_audit_id: auditId,
            event_type: "recurring_refreshed",
            payload: recurringResult,
          });
        if (recurringEventError) {
          console.warn(
            "[plaid-sync] Failed to record recurring refresh event",
            recurringEventError,
          );
        }
      } catch (recurringError) {
        console.warn("[plaid-sync] Recurring refresh failed", recurringError);
        await reportEdgeFunctionError({
          functionName: "plaid-sync-transactions",
          error: recurringError,
          context: { phase: "refresh_recurring_templates" },
        });
      }
    } else {
      await params.supabase.from("plaid_sync_events").insert({
        bank_connection_id: params.connection.id,
        bank_sync_audit_id: auditId,
        event_type: "recurring_deferred",
        payload: {
          reason: "historical_update_incomplete",
          transactions_update_status: batch.transactionsUpdateStatus,
        },
      });
    }
  } catch (error) {
    await params.supabase.from("plaid_sync_events").insert({
      bank_connection_id: params.connection.id,
      bank_sync_audit_id: auditId,
      event_type: "sync_failed",
      severity: "error",
      payload: {
        error_code: error instanceof PlaidError ? error.code || null : null,
        phase: "sync_connection",
      },
    });
    console.error("[plaid-sync] Connection sync failed", {
      errorCode: error instanceof PlaidError ? error.code || null : null,
      message: formatUnknownErrorMessage(error),
    });
    summary.status = "error";
    summary.error = formatUnknownErrorMessage(error);
    const errorCode =
      error instanceof PlaidError
        ? error.code || null
        : error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code || "") || null
          : null;
    summary.errorCode = errorCode;

    if (errorCode === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION") {
      summary.error = "Plaid changed transactions during pagination; retrying";
      await auditUpdate({
        status: "failed",
        error_message: summary.error,
        error_code: errorCode,
        finished_at: new Date().toISOString(),
      });
      return summary;
    }

    if (errorCode === "40001") {
      summary.errorCode = "STALE_CURSOR_GENERATION";
      summary.error = "A newer Plaid sync already advanced this connection";
      await auditUpdate({
        status: "failed",
        error_message: summary.error,
        error_code: errorCode,
        finished_at: new Date().toISOString(),
      });
      return summary;
    }

    // Handle specific Plaid error codes
    if (error instanceof PlaidError) {
      if (requiresPlaidRelinkForError(errorCode)) {
        console.log("[plaid-sync] Bank connection requires re-authentication");
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
          finished_at: new Date().toISOString(),
        });
        return summary;
      }

      // INVALID_CURSOR: Cursor is stale/invalid, reset and retry
      if (errorCode === "INVALID_CURSOR") {
        const { data: cursorReset, error: cursorResetError } =
          await params.supabase.rpc("reset_invalid_plaid_cursor_v1", {
            p_user_id: params.userId,
            p_bank_connection_id: params.connection.id,
            p_expected_cursor_generation:
              params.connection.cursor_generation ?? 0,
          });
        if (cursorResetError) {
          summary.errorCode = "CURSOR_RESET_FAILED";
          summary.error = "Plaid cursor could not be reset safely";
          await auditUpdate({
            status: "failed",
            error_message: summary.error,
            error_code: summary.errorCode,
            finished_at: new Date().toISOString(),
          });
          return summary;
        }
        if (cursorReset !== true) {
          summary.errorCode = "STALE_CURSOR_GENERATION";
          summary.error = "A newer Plaid sync already repaired this cursor";
          await auditUpdate({
            status: "failed",
            error_message: summary.error,
            error_code: summary.errorCode,
            finished_at: new Date().toISOString(),
          });
          return summary;
        }
        await enqueuePlaidSyncJob({
          supabase: params.supabase,
          connectionId: params.connection.id,
          triggerSource: "invalid_cursor_recovery",
          jobType: "invalid_cursor_recovery",
          dedupeKey: `invalid_cursor_recovery:${params.connection.id}:${
            (params.connection.cursor_generation ?? 0) + 1
          }`,
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
      finished_at: new Date().toISOString(),
    });
    await reportEdgeFunctionError({
      functionName: "plaid-sync-transactions",
      error,
      context: {
        phase: "sync_connection",
        error_code: errorCode,
      },
    });
  } finally {
    await params.supabase.rpc("release_bank_sync_lock_v2", {
      p_bank_connection_id: params.connection.id,
      p_lock_token: lockToken,
    });
  }

  return summary;
}

function formatUnknownErrorMessage(error: unknown): string {
  if (error instanceof PlaidError) {
    if (requiresPlaidRelinkForError(error.code)) {
      return "Bank re-authentication is required";
    }
    if (error.code === "INVALID_CURSOR") {
      return "Transaction history needs a safe replay";
    }
    return "Plaid transaction sync failed";
  }
  return "Bank transaction sync failed";
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
    currency:
      transaction.iso_currency_code ??
      transaction.unofficial_currency_code ??
      null,
    pending: transaction.pending ?? false,
    hasPendingTransactionId: Boolean(transaction.pending_transaction_id),
  }));

  console.log(
    "[plaid-sync] Plaid transaction sample",
    JSON.stringify({
      hasCursor: Boolean(params.cursor),
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
    .filter(
      ([plaidAccountId]) =>
        !params.accountMap.has(`${params.connectionId}:${plaidAccountId}`),
    )
    .map(([, transactions]) => ({
      transactionCount: transactions.length,
    }))
    .slice(0, 5);

  console.log(
    "[plaid-sync] Plaid account mapping debug",
    JSON.stringify({
      groupedAccountCount: params.grouped.size,
      knownAccountCount: params.accountMap.size,
      isAccountTriggered: Boolean(params.accountFilterId),
      unmatchedAccountCount: unmatched.length,
      unmatchedAccounts: unmatched,
    }),
  );
}

async function rebindLinkedPlaidExpensesForConnection(params: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
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

function isActivePlaidAccount(account: BankAccountRow): boolean {
  return account.status == null || account.status === "active";
}

interface BankAccountRow {
  id: string;
  bank_connection_id: string;
  plaid_account_id: string;
  provider_account_id?: string | null;
  currency: string;
  type?: string | null;
  subtype?: string | null;
  status?: string | null;
  user_id?: string;
}

interface BankConnectionRow {
  id: string;
  user_id: string;
  household_id?: string | null;
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
