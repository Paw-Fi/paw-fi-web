import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { decryptSecret } from "../shared/token-encryption.ts";
import { PLAID_PROVIDER, PlaidTransaction, syncPlaidTransactions } from "../shared/plaid-client.ts";
import { persistPlaidTransactions, type ExpensePreview } from "../shared/bank-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-sync-transactions");
}

interface SyncRequest {
  connectionId?: string;
  bankAccountId?: string;
  cursorOverride?: string;
}

interface SyncSummary {
  connectionId: string;
  inserted: number;
  updated: number;
  removed: number;
  skipped: number;
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
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as SyncRequest;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-plaid-sync-transactions" } },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        { status: authResult.statusCode || 401, headers: { ...headers, "Content-Type": "application/json" } },
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
        console.error("[plaid-sync] Failed to load bank account", accountError);
        return new Response(JSON.stringify({ error: "Failed to load bank account" }), {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      if (!account || account.user_id !== authResult.userId) {
        return new Response(JSON.stringify({ error: "Bank account not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      accountFilter = account;
    }

    let connectionsQuery = supabase
      .from("bank_connections")
      .select("id, user_id, plaid_access_token_encrypted, plaid_cursor, status")
      .eq("user_id", authResult.userId);

    if (body.connectionId) {
      connectionsQuery = connectionsQuery.eq("id", body.connectionId);
    }

    const { data: connections, error: connectionsError } = await connectionsQuery;
    if (connectionsError) {
      console.error("[plaid-sync] Failed to load connections", connectionsError);
      return new Response(JSON.stringify({ error: "Failed to load connections" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!connections?.length) {
      return new Response(JSON.stringify({ error: "No bank connections found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const connectionIds = connections.map((conn) => conn.id);
    const { data: bankAccounts, error: bankAccountError } = await supabase
      .from("bank_accounts")
      .select("id, bank_connection_id, plaid_account_id, currency")
      .in("bank_connection_id", connectionIds);

    if (bankAccountError) {
      console.error("[plaid-sync] Failed to load bank accounts", bankAccountError);
      return new Response(JSON.stringify({ error: "Failed to load accounts" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const accountMap = new Map<string, BankAccountRow>();
    (bankAccounts || []).forEach((account) => {
      accountMap.set(account.plaid_account_id, account);
    });

    const summaries: SyncSummary[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalRemoved = 0;
    const allAdded: ExpensePreview[] = [];

    for (const connection of connections) {
      const summary = await syncConnection({
        connection,
        accountMap,
        supabase,
        userId: authResult.userId,
        accountFilter,
        cursorOverride: body.cursorOverride,
      });
      summaries.push(summary);
      totalInserted += summary.inserted;
      totalUpdated += summary.updated;
      totalRemoved += summary.removed;
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
        },
        connections: summaries,
        addedTransactions: allAdded,
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[plaid-sync] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Failed to sync transactions", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
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
}): Promise<SyncSummary> {
  const summary: SyncSummary = {
    connectionId: params.connection.id,
    inserted: 0,
    updated: 0,
    removed: 0,
    skipped: 0,
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
    await params.supabase.from("bank_sync_audit").update(patch).eq("id", auditId);
  };

  try {
    const accessToken = await decryptSecret(params.connection.plaid_access_token_encrypted);
    let cursor: string | undefined = params.cursorOverride === "reset"
      ? undefined
      : (params.cursorOverride || params.connection.plaid_cursor || undefined);
    const processedAccounts = new Set<string>();
    let hasMore = true;

    while (hasMore) {
      const response = await syncPlaidTransactions(accessToken, cursor);
      const combined: PlaidTransaction[] = [...response.added, ...response.modified];
      const grouped = groupByAccount(combined);

      for (const [plaidAccountId, transactions] of grouped.entries()) {
        const account = params.accountMap.get(plaidAccountId);
        if (!account) continue;
        if (params.accountFilter && account.id !== params.accountFilter.id) continue;

        const result = await persistPlaidTransactions({
          supabase: params.supabase,
          userId: params.userId,
          bankAccountId: account.id,
          accountCurrency: account.currency,
          transactions,
        });

        summary.inserted += result.inserted;
        summary.updated += result.updated;
        summary.skipped += result.skipped;
        summary.addedTransactions.push(...result.insertedRecords);
        processedAccounts.add(account.id);
      }

      if (response.removed?.length) {
        const removedIds = response.removed.map((row) => row.transaction_id).filter(Boolean);
        if (removedIds.length) {
          await params.supabase
            .from("expenses")
            .delete()
            .eq("provider", PLAID_PROVIDER)
            .eq("user_id", params.userId)
            .in("provider_transaction_id", removedIds);
          summary.removed += removedIds.length;
        }
      }

      cursor = response.next_cursor;
      hasMore = response.has_more;
    }

    await params.supabase
      .from("bank_connections")
      .update({
        plaid_cursor: cursor || null,
        last_synced_at: new Date().toISOString(),
        status: "active",
        error_code: null,
        error_message: null,
      })
      .eq("id", params.connection.id);

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
    console.error("[plaid-sync] Connection sync failed", params.connection.id, error);
    summary.status = "error";
    summary.error = error instanceof Error ? error.message : String(error);
    await auditUpdate({
      status: "failed",
      error_message: summary.error,
      finished_at: new Date().toISOString(),
    });
  }

  return summary;
}

function groupByAccount(transactions: PlaidTransaction[]): Map<string, PlaidTransaction[]> {
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
  currency: string;
  user_id?: string;
}

interface BankConnectionRow {
  id: string;
  user_id: string;
  plaid_access_token_encrypted: string;
  plaid_cursor: string | null;
  status?: string;
}
