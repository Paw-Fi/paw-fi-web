import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { decryptSecret, encryptSecret } from "../shared/token-encryption.ts";
import {
  persistTinkTransactions,
  stageTinkTransactions,
  type ExpensePreview,
  upsertTinkAccounts,
} from "../shared/bank-sync.ts";
import {
  getTinkAccounts,
  refreshTinkAccessToken,
  syncTinkTransactions,
  TINK_PROVIDER,
} from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for tink-sync-transactions");
}

interface SyncRequest {
  connectionId?: string;
  bankAccountId?: string;
  cursorOverride?: string;
  deletedTransactionIds?: string[];
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
  addedTransactions: ExpensePreview[];
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
      global: { headers: { "X-Client-Info": "moneko-tink-sync-transactions" } },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    let accountFilter: BankAccountRow | null = null;
    if (body.bankAccountId) {
      const { data: account, error: accountError } = await supabase
        .from("bank_accounts")
        .select("id, user_id, bank_connection_id, plaid_account_id, currency")
        .eq("id", body.bankAccountId)
        .maybeSingle();

      if (accountError) {
        console.error("[tink-sync] Failed to load bank account", accountError);
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
        "id, user_id, access_token_encrypted, refresh_token_encrypted, cursor, plaid_cursor, expires_at, status",
      )
      .eq("user_id", authResult.userId)
      .eq("provider", TINK_PROVIDER)
      .neq("status", "disabled");

    if (body.connectionId) {
      connectionsQuery = connectionsQuery.eq("id", body.connectionId);
    }

    const { data: connections, error: connectionsError } =
      await connectionsQuery;
    if (connectionsError) {
      console.error("[tink-sync] Failed to load connections", connectionsError);
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

    const connectionIds = connections.map((conn) => conn.id);
    const { data: bankAccounts, error: bankAccountError } = await supabase
      .from("bank_accounts")
      .select(
        "id, bank_connection_id, plaid_account_id, provider_account_id, currency",
      )
      .in("bank_connection_id", connectionIds);

    if (bankAccountError) {
      console.error(
        "[tink-sync] Failed to load bank accounts",
        bankAccountError,
      );
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
        supabase,
        userId: authResult.userId,
        accountFilter,
        cursorOverride: body.cursorOverride,
        deletedTransactionIds: body.deletedTransactionIds,
      });
      summaries.push(summary);
      totalInserted += summary.inserted;
      totalUpdated += summary.updated;
      totalRemoved += summary.removed;
      totalCurrencyMismatches += summary.currencyMismatches;
      allAdded.push(...summary.addedTransactions);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          connections: summaries.length,
          inserted: totalInserted,
          updated: totalUpdated,
          removed: totalRemoved,
          currencyMismatches: totalCurrencyMismatches,
        },
        connections: summaries,
        addedTransactions: allAdded,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[tink-sync] Unexpected error", error);
    return new Response(
      JSON.stringify({
        error: "Failed to sync Tink transactions",
        details: error instanceof Error ? error.message : String(error),
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
  supabase: ReturnType<typeof createClient>;
  userId: string;
  accountFilter: BankAccountRow | null;
  cursorOverride?: string;
  deletedTransactionIds?: string[];
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
  };

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
    p_locked_by: "tink-sync",
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
      .update({ last_sync_attempt_at: new Date().toISOString() })
      .eq("id", params.connection.id);

    let accessTokenEncrypted =
      params.connection.access_token_encrypted ||
      params.connection.plaid_access_token_encrypted;
    if (!accessTokenEncrypted) {
      throw new Error("Missing Tink access token");
    }
    let accessToken = await decryptSecret(accessTokenEncrypted);
    if (
      params.connection.refresh_token_encrypted &&
      params.connection.expires_at
    ) {
      const expiresAt = new Date(params.connection.expires_at);
      if (
        Number.isFinite(expiresAt.getTime()) &&
        expiresAt.getTime() <= Date.now()
      ) {
        const refreshToken = await decryptSecret(
          params.connection.refresh_token_encrypted,
        );
        const refreshed = await refreshTinkAccessToken(refreshToken);
        accessToken = refreshed.access_token;
        const encryptedAccess = await encryptSecret(refreshed.access_token);
        const encryptedRefresh = refreshed.refresh_token
          ? await encryptSecret(refreshed.refresh_token)
          : null;
        const expiresAtNext = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : null;
        await params.supabase
          .from("bank_connections")
          .update({
            access_token_encrypted: encryptedAccess,
            refresh_token_encrypted:
              encryptedRefresh || params.connection.refresh_token_encrypted,
            expires_at: expiresAtNext,
          })
          .eq("id", params.connection.id);

        await params.supabase.from("bank_connection_tokens").insert([
          {
            bank_connection_id: params.connection.id,
            token_type: "access",
            token_encrypted: encryptedAccess,
            expires_at: expiresAtNext,
          },
          ...(encryptedRefresh
            ? [
                {
                  bank_connection_id: params.connection.id,
                  token_type: "refresh",
                  token_encrypted: encryptedRefresh,
                },
              ]
            : []),
        ]);
      }
    }

    // Refresh accounts before syncing to keep account list in sync with Tink
    const freshAccounts = await getTinkAccounts(accessToken);
    if (freshAccounts?.length) {
      const upserted = await upsertTinkAccounts({
        supabase: params.supabase,
        userId: params.userId,
        bankConnectionId: params.connection.id,
        accounts: freshAccounts,
      });
      upserted.records.forEach((record) => {
        const key = record.provider_account_id || record.plaid_account_id;
        params.accountMap.set(key, {
          id: record.id,
          bank_connection_id: params.connection.id,
          plaid_account_id: record.plaid_account_id,
          provider_account_id: record.provider_account_id,
          currency: record.currency,
        });
      });
    }

    let cursor: string | undefined =
      params.cursorOverride === "reset"
        ? undefined
        : params.cursorOverride ||
          params.connection.cursor ||
          params.connection.plaid_cursor ||
          undefined ||
          undefined;
    const processedAccounts = new Set<string>();
    let nextPage = cursor;

    do {
      const response = await syncTinkTransactions(accessToken, nextPage);
      const grouped = groupByAccount(response.transactions);

      for (const [tinkAccountId, transactions] of grouped.entries()) {
        const lookupKey = tinkAccountId.startsWith("tink_")
          ? tinkAccountId
          : `tink_${tinkAccountId}`;
        const account = params.accountMap.get(lookupKey);
        if (!account) continue;
        if (params.accountFilter && account.id !== params.accountFilter.id)
          continue;

        await stageTinkTransactions({
          supabase: params.supabase,
          bankConnectionId: params.connection.id,
          bankAccountId: account.id,
          transactions,
        });

        const result = await persistTinkTransactions({
          supabase: params.supabase,
          userId: params.userId,
          bankAccountId: account.id,
          accountCurrency: account.currency,
          transactions,
        });

        summary.inserted += result.inserted;
        summary.updated += result.updated;
        summary.skipped += result.skipped;
        summary.currencyMismatches += result.currencyMismatches;
        summary.addedTransactions.push(...result.insertedRecords);
        processedAccounts.add(account.id);
      }

      nextPage = response.nextPageToken || undefined;
    } while (nextPage);

    // Handle deleted transactions if provided (from webhook)
    if (params.deletedTransactionIds?.length) {
      const { count: deletedCount } = await params.supabase
        .from("expenses")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: "provider_removed",
        })
        .eq("provider", TINK_PROVIDER)
        .eq("user_id", params.userId)
        .is("deleted_at", null)
        .in("provider_transaction_id", params.deletedTransactionIds);

      if (deletedCount) {
        summary.removed += deletedCount;
      }
    }

    await params.supabase
      .from("bank_connections")
      .update({
        cursor: nextPage || null,
        plaid_cursor: nextPage || null,
        last_synced_at: new Date().toISOString(),
        status: "active",
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
      "[tink-sync] Connection sync failed",
      params.connection.id,
      error,
    );
    summary.status = "error";
    summary.error = error instanceof Error ? error.message : String(error);
    await params.supabase
      .from("bank_connections")
      .update({
        status: "error",
        error_message: summary.error,
      })
      .eq("id", params.connection.id);
    await auditUpdate({
      status: "failed",
      error_message: summary.error,
      error_payload: error instanceof Error ? { message: summary.error } : null,
      finished_at: new Date().toISOString(),
    });
  } finally {
    await params.supabase.rpc("release_bank_sync_lock", {
      p_bank_connection_id: params.connection.id,
    });
  }

  return summary;
}

function groupByAccount(
  transactions: { accountId?: string }[],
): Map<string, typeof transactions> {
  const grouped = new Map<string, typeof transactions>();
  transactions.forEach((txn) => {
    if (!txn.accountId) return;
    const collection = grouped.get(txn.accountId) || [];
    collection.push(txn);
    grouped.set(txn.accountId, collection);
  });
  return grouped;
}

interface BankAccountRow {
  id: string;
  bank_connection_id: string;
  plaid_account_id: string;
  provider_account_id?: string | null;
  currency: string;
  user_id?: string;
}

interface BankConnectionRow {
  id: string;
  user_id: string;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  expires_at?: string | null;
  cursor?: string | null;
  plaid_access_token_encrypted?: string | null;
  plaid_cursor?: string | null;
  status?: string;
}
