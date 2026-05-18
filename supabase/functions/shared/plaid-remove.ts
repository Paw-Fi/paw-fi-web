import { decryptSecret } from "./token-encryption.ts";
import { PLAID_PROVIDER, PlaidError, removePlaidItem } from "./plaid-client.ts";

export interface PlaidRemovableConnection {
  id: string;
  user_id?: string | null;
  access_token_encrypted?: string | null;
  plaid_access_token_encrypted?: string | null;
}

export async function removePlaidConnection(params: {
  supabase: {
    from: (table: string) => any;
  };
  connection: PlaidRemovableConnection;
  removalReason: string;
}): Promise<void> {
  const encryptedToken =
    params.connection.access_token_encrypted ||
    params.connection.plaid_access_token_encrypted;

  if (encryptedToken) {
    try {
      const accessToken = await decryptSecret(encryptedToken);
      const response = await removePlaidItem(accessToken);
      console.log(
        "[plaid-remove] Removed Plaid item",
        JSON.stringify({
          connectionId: params.connection.id,
          requestId: response.request_id || null,
        }),
      );
    } catch (error) {
      if (!(error instanceof PlaidError && error.code === "ITEM_NOT_FOUND")) {
        if (params.connection.user_id) {
          const { error: jobError } = await params.supabase
            .from("plaid_offboarding_jobs")
            .insert({
              user_id: params.connection.user_id,
              connection_id: params.connection.id,
              access_token_encrypted:
                params.connection.access_token_encrypted ?? null,
              plaid_access_token_encrypted:
                params.connection.plaid_access_token_encrypted ?? null,
              reason: params.removalReason,
            });

          if (jobError && jobError.code !== "23505") {
            throw jobError;
          }
        }
        throw error;
      }

      console.warn(
        "[plaid-remove] Plaid item already removed",
        JSON.stringify({
          connectionId: params.connection.id,
          requestId: error.requestId || null,
        }),
      );
    }
  }

  const nowIso = new Date().toISOString();
  const { data: bankAccounts, error: bankAccountsError } = await params.supabase
    .from("bank_accounts")
    .select("id")
    .eq("bank_connection_id", params.connection.id);

  if (bankAccountsError) {
    throw bankAccountsError;
  }

  const bankAccountIds = ((bankAccounts || []) as { id: string }[])
    .map((row) => row.id)
    .filter(Boolean);

  if (bankAccountIds.length) {
    const { error: expensesError } = await params.supabase
      .from("expenses")
      .update({
        bank_account_id: null,
        raw_provider_payload: null,
        updated_at: nowIso,
      })
      .eq("provider", PLAID_PROVIDER)
      .in("bank_account_id", bankAccountIds);

    if (expensesError) {
      throw expensesError;
    }
  }

  const { error: rawCleanupError } = await params.supabase
    .from("bank_transaction_raw")
    .delete()
    .eq("bank_connection_id", params.connection.id);

  if (rawCleanupError) {
    throw rawCleanupError;
  }

  const { error: bankAccountCleanupError } = await params.supabase
    .from("bank_accounts")
    .delete()
    .eq("bank_connection_id", params.connection.id);

  if (bankAccountCleanupError) {
    throw bankAccountCleanupError;
  }

  const { error: connectionUpdateError } = await params.supabase
    .from("bank_connections")
    .update({
      status: "disabled",
      item_status: "removed",
      item_health_state: "removed",
      relink_state: null,
      removed_at: nowIso,
      access_token_encrypted: null,
      plaid_access_token_encrypted: null,
      next_manual_refresh_eligible_at: null,
      error_code: null,
      error_message: null,
      updated_at: nowIso,
    })
    .eq("id", params.connection.id);

  if (connectionUpdateError) {
    throw connectionUpdateError;
  }

  const { error: tokenDeleteError } = await params.supabase
    .from("bank_connection_tokens")
    .delete()
    .eq("bank_connection_id", params.connection.id);

  if (tokenDeleteError) {
    throw tokenDeleteError;
  }

  const { error: jobUpdateError } = await params.supabase
    .from("bank_sync_jobs")
    .update({
      status: "failed",
      processed_at: nowIso,
      processing_started_at: null,
      updated_at: nowIso,
      payload: {
        removal_reason: params.removalReason,
        error: "item_removed",
      },
    })
    .eq("bank_connection_id", params.connection.id)
    .in("status", ["pending", "processing"]);

  if (jobUpdateError) {
    throw jobUpdateError;
  }
}
