import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternal } from "../shared/auth.ts";
import { decryptSecret, encryptSecret } from "../shared/token-encryption.ts";
import {
  type ExpensePreview,
  persistTinkTransactions,
  stageTinkTransactions,
  upsertTinkAccounts,
} from "../shared/bank-sync.ts";
import {
  getTinkAccounts,
  getTinkConfig,
  getTinkUserAccessToken,
  refreshTinkAccessToken,
  syncTinkTransactions,
  TINK_PROVIDER,
  type TinkTransaction,
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
  credentialsId?: string;
  state?: string;
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
    }) as any;

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

    // Handle credentialsId from Tink Link callback
    // When user completes bank connection in Tink Link, we receive credentialsId and state
    // Now we need to: 1) Validate state, 2) Get user access token, 3) Create connection, 4) Sync
    if (body.credentialsId && body.state) {
      // Validate state for CSRF protection and get external_user_id + market
      const { data: stateRecord, error: stateError } = await supabase
        .from("tink_auth_states")
        .delete()
        .eq("state", body.state)
        .eq("user_id", authResult.userId)
        .gt("expires_at", new Date().toISOString())
        .select("external_user_id, market")
        .maybeSingle();

      if (stateError) {
        console.error("[tink-sync] Failed to validate state", stateError);
        return new Response(
          JSON.stringify({ error: "Failed to validate security state" }),
          {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      if (!stateRecord) {
        console.warn(
          `[tink-sync] Invalid or expired state for user ${authResult.userId}`,
        );
        return new Response(
          JSON.stringify({
            error:
              "Invalid or expired security state. Please restart the connection flow.",
          }),
          {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        `[tink-sync] Validated callback for user ${stateRecord.external_user_id} in market ${stateRecord.market}`,
      );

      // Persist credentialsId immediately (even if token exchange fails later).
      // This prevents the user from being forced into ADD mode (duplicate credentials) on retry.
      try {
        await supabase.from("tink_credentials_cache").upsert(
          {
            credentials_id: body.credentialsId,
            user_id: authResult.userId,
            external_user_id: stateRecord.external_user_id,
            market: stateRecord.market,
            last_error: null,
          },
          { onConflict: "credentials_id" },
        );
      } catch (cacheError) {
        console.warn(
          "[tink-sync] Failed to persist tink_credentials_cache (migration missing?):",
          cacheError instanceof Error ? cacheError.message : String(cacheError),
        );
      }

      // Generate NEW authorization code and exchange for access token
      // The authorization code embedded in Tink Link was already consumed by Tink Link itself
      const config = getTinkConfig();
      let tokenResponse;
      try {
        tokenResponse = await getTinkUserAccessToken({
          externalUserId: stateRecord.external_user_id,
          market: stateRecord.market,
          scopes: config.scopes,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        try {
          await supabase
            .from("tink_credentials_cache")
            .update({
              last_error: message,
            })
            .eq("credentials_id", body.credentialsId);
        } catch (_) {
          // Best-effort.
        }

        return new Response(
          JSON.stringify({
            error: "Failed to exchange Tink auth code",
            details: message,
          }),
          {
            status: 502,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        `[tink-sync] Got access token for external user ${stateRecord.external_user_id}`,
      );

      // Encrypt tokens
      const encryptedAccess = await encryptSecret(tokenResponse.access_token);
      const encryptedRefresh = tokenResponse.refresh_token
        ? await encryptSecret(tokenResponse.refresh_token)
        : null;
      const expiresAt = tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null;

      // Use external_user_id as provider_item_id for stable identifier
      // This ensures reconnections UPDATE the same connection instead of creating duplicates
      // Format: tink_4f42e85a-4637-41fb-8fc5-f81933c83861-ie
      const providerItemId = `tink_${stateRecord.external_user_id}`;

      // Create/update bank connection with household using atomic RPC
      // The RPC will find existing connection by provider_item_id and update it
      const { data: upsertResult, error: upsertError } = await supabase.rpc(
        "upsert_bank_connection_with_household",
        {
          p_user_id: authResult.userId,
          p_provider: TINK_PROVIDER,
          p_provider_item_id: providerItemId,
          p_access_token_encrypted: encryptedAccess,
          p_refresh_token_encrypted: encryptedRefresh,
          p_expires_at: expiresAt,
          p_country_code: stateRecord.market,
          p_idempotency_key: null,
          p_institution_name: "Bank Account",
          p_institution_logo: null,
          p_metadata: {
            scope: tokenResponse.scope || null,
            credentials_id: body.credentialsId,
            external_user_id: stateRecord.external_user_id,
          },
        },
      );

      if (upsertError || !upsertResult || upsertResult.length === 0) {
        console.error("[tink-sync] Failed to create connection", {
          error: upsertError,
          errorMessage: upsertError?.message,
          errorCode: upsertError?.code,
          errorDetails: upsertError?.details,
          errorHint: upsertError?.hint,
          result: upsertResult,
          params: {
            userId: authResult.userId,
            provider: TINK_PROVIDER,
            providerItemId,
            market: stateRecord.market,
          },
        });
        return new Response(
          JSON.stringify({
            error: "Failed to create bank connection",
            details: upsertError?.message || "RPC returned empty result",
          }),
          {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const {
        connection_id: connectionId,
        household_id: householdId,
        is_new_connection: isNewConnection,
      } = upsertResult[0];

      console.log(
        `[tink-sync] ${
          isNewConnection ? "Created" : "Updated"
        } connection ${connectionId} with household ${householdId}`,
      );

      // Store tokens in bank_connection_tokens table
      const tokensToUpsert = [
        {
          bank_connection_id: connectionId,
          token_type: "access",
          token_encrypted: encryptedAccess,
          expires_at: expiresAt,
        },
      ];

      if (encryptedRefresh) {
        tokensToUpsert.push({
          bank_connection_id: connectionId,
          token_type: "refresh",
          token_encrypted: encryptedRefresh,
          expires_at: null,
        });
      }

      await supabase.from("bank_connection_tokens").upsert(tokensToUpsert, {
        onConflict: "bank_connection_id,token_type",
      });

      // Fetch and store accounts
      const accounts = await getTinkAccounts(tokenResponse.access_token);
      await upsertTinkAccounts({
        supabase,
        userId: authResult.userId,
        bankConnectionId: connectionId,
        accounts,
      });

      console.log(
        `[tink-sync] Upserted ${accounts.length} accounts for connection ${connectionId}`,
      );

      // Now continue with transaction sync using the newly created connection
      body.connectionId = connectionId;
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

    const connectionIds = connections.map((conn: BankConnectionRow) => conn.id);
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
    (bankAccounts || []).forEach((account: BankAccountRow) => {
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
    const errorObject =
      error instanceof Error
        ? { message: error.message, name: error.name, stack: error.stack }
        : error;
    console.error("[tink-sync] Unexpected error", errorObject);
    try {
      console.error(
        "[tink-sync] Unexpected error (json)",
        JSON.stringify(errorObject),
      );
    } catch (_) {
      // Best-effort logging for non-serializable errors.
    }
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
  // Avoid coupling to generated SupabaseClient schema types in Deno.
  supabase: any;
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

    const accessTokenEncryptedRaw =
      params.connection.access_token_encrypted ||
      params.connection.plaid_access_token_encrypted;
    if (!accessTokenEncryptedRaw) {
      throw new Error("Missing Tink access token");
    }
    if (typeof accessTokenEncryptedRaw !== "string") {
      throw new Error("Invalid Tink access token format");
    }
    let accessToken = await decryptSecret(accessTokenEncryptedRaw);

    // Check if token needs refresh
    if (
      params.connection.refresh_token_encrypted &&
      params.connection.expires_at
    ) {
      const expiresAt = new Date(params.connection.expires_at);
      // Refresh if expired or expiring within 5 minutes
      const shouldRefresh =
        Number.isFinite(expiresAt.getTime()) &&
        expiresAt.getTime() <= Date.now() + 5 * 60 * 1000;

      if (shouldRefresh) {
        // Acquire token refresh lock to prevent race conditions
        const { data: lockAcquired } = await params.supabase.rpc(
          "acquire_token_refresh_lock",
          {
            p_bank_connection_id: params.connection.id,
            p_lock_seconds: 30,
          },
        );

        if (lockAcquired) {
          try {
            console.log(
              `[tink-sync] Refreshing token for connection ${params.connection.id}`,
            );
            const refreshTokenEncrypted =
              params.connection.refresh_token_encrypted;
            if (!refreshTokenEncrypted) {
              throw new Error("Missing Tink refresh token");
            }
            const refreshToken = await decryptSecret(refreshTokenEncrypted);
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

            console.log(
              `[tink-sync] Token refreshed successfully for connection ${params.connection.id}`,
            );
          } finally {
            // Always release the lock
            await params.supabase.rpc("release_token_refresh_lock", {
              p_bank_connection_id: params.connection.id,
            });
          }
        } else {
          // Another process is refreshing, wait a moment and re-fetch the connection
          console.log(
            `[tink-sync] Token refresh in progress by another process, waiting...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Re-fetch the connection to get the updated token
          const { data: updatedConnection } = await params.supabase
            .from("bank_connections")
            .select("access_token_encrypted, expires_at")
            .eq("id", params.connection.id)
            .single();

          if (updatedConnection?.access_token_encrypted) {
            const tokenEncrypted = updatedConnection.access_token_encrypted;
            if (typeof tokenEncrypted === "string" && tokenEncrypted.length) {
              accessToken = await decryptSecret(tokenEncrypted);
            }
          }
        }
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
    let didLogSample = false;

    do {
      const response = await syncTinkTransactions(accessToken, nextPage);
      if (!didLogSample && response.transactions?.length) {
        const sample = response.transactions[0];
        console.log("[tink-sync] Sample transaction", {
          id: sample.id,
          accountId: sample.accountId,
          amount: sample.amount,
          dates: sample.dates,
          types: sample.types,
          descriptions: sample.descriptions,
          identifiers: sample.identifiers,
        });
        didLogSample = true;
      }
      const grouped = groupByAccount(response.transactions);

      for (const [tinkAccountId, transactions] of grouped.entries()) {
        const lookupKey = tinkAccountId.startsWith("tink_")
          ? tinkAccountId
          : `tink_${tinkAccountId}`;
        const account = params.accountMap.get(lookupKey);
        if (!account) continue;
        if (params.accountFilter && account.id !== params.accountFilter.id) {
          continue;
        }

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

    // Note: Tink doesn't support incremental sync via cursor like Plaid.
    // Each sync fetches all transactions and paginates through them.
    // We don't persist the cursor as it's only used for pagination within a single sync.
    await params.supabase
      .from("bank_connections")
      .update({
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
  transactions: TinkTransaction[],
): Map<string, TinkTransaction[]> {
  const grouped = new Map<string, TinkTransaction[]>();
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
