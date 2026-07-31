import { decryptSecret } from "./token-encryption.ts";
import { PLAID_PROVIDER, PlaidError, removePlaidItem } from "./plaid-client.ts";

export interface PlaidRemovableConnection {
  id: string;
  user_id?: string | null;
  access_token_encrypted?: string | null;
  plaid_access_token_encrypted?: string | null;
}

export function buildPlaidTokenSanitizationUpdate(): Record<string, null> {
  return {
    access_token_encrypted: null,
    plaid_access_token_encrypted: null,
  };
}

export async function markPlaidConnectionRemovalPending(params: {
  supabase: {
    from: (table: string) => any;
  };
  connectionId: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await params.supabase
    .from("bank_connections")
    .update({
      item_status: "pending_removal",
      item_health_state: "removal_pending",
      scheduled_removal_at: nowIso,
      error_code: params.errorCode || "PLAID_REMOVE_RETRY_PENDING",
      error_message: params.errorMessage ||
        "Plaid item removal is queued for retry.",
      updated_at: nowIso,
    })
    .eq("id", params.connectionId)
    .is("removed_at", null);

  if (error) {
    throw error;
  }
}

async function enqueuePlaidRemovalRetry(params: {
  supabase: {
    from: (table: string) => any;
  };
  connection: PlaidRemovableConnection;
  removalReason: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  if (!params.connection.user_id) {
    return;
  }

  const { error: jobError } = await params.supabase
    .from("plaid_offboarding_jobs")
    .insert({
      user_id: params.connection.user_id,
      connection_id: params.connection.id,
      access_token_encrypted: params.connection.access_token_encrypted ?? null,
      plaid_access_token_encrypted:
        params.connection.plaid_access_token_encrypted ?? null,
      reason: params.removalReason,
    });

  if (jobError && jobError.code !== "23505") {
    throw jobError;
  }

  await markPlaidConnectionRemovalPending({
    supabase: params.supabase,
    connectionId: params.connection.id,
    errorCode: params.errorCode || "PLAID_REMOVE_RETRY_PENDING",
    errorMessage: params.errorMessage ||
      "Plaid item removal is queued for retry.",
  });
}

export async function removePlaidConnection(params: {
  supabase: {
    from: (table: string) => any;
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => PromiseLike<{
      data: unknown;
      error: unknown;
    }>;
  };
  connection: PlaidRemovableConnection;
  removalReason: string;
  actorUserId?: string;
}): Promise<void> {
  const encryptedToken = params.connection.access_token_encrypted ||
    params.connection.plaid_access_token_encrypted;

  const { data: removalQueued, error: queueError } = await params.supabase.rpc(
    params.actorUserId
      ? "queue_plaid_connection_removal_v2"
      : "queue_plaid_connection_removal_v1",
    params.actorUserId
      ? {
        p_actor_user_id: params.actorUserId,
        p_connection_id: params.connection.id,
        p_reason: params.removalReason,
      }
      : {
        p_connection_id: params.connection.id,
        p_reason: params.removalReason,
      },
  );
  if (queueError) throw queueError;
  if (removalQueued !== true) {
    throw new Error("Plaid connection is not eligible for removal");
  }

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
        await enqueuePlaidRemovalRetry({
          supabase: params.supabase,
          connection: params.connection,
          removalReason: params.removalReason,
          errorCode: error instanceof PlaidError
            ? error.code
            : "PLAID_REMOVE_RETRY_PENDING",
          errorMessage: error instanceof Error ? error.message : null,
        });
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

  try {
    await cleanupRemovedPlaidConnection({
      supabase: params.supabase,
      connectionId: params.connection.id,
      removalReason: params.removalReason,
    });
  } catch (error) {
    await enqueuePlaidRemovalRetry({
      supabase: params.supabase,
      connection: params.connection,
      removalReason: params.removalReason,
      errorCode: "LOCAL_CLEANUP_RETRY_PENDING",
      errorMessage: error instanceof Error
        ? error.message
        : "Local bank cleanup is queued for retry.",
    });
    throw error;
  }
}

export async function cleanupRemovedPlaidConnection(params: {
  supabase: {
    from: (table: string) => any;
  };
  connectionId: string;
  removalReason: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error: connectionUpdateError } = await params.supabase
    .from("bank_connections")
    .update({
      status: "disabled",
      item_status: "removed",
      item_health_state: "removed",
      relink_state: null,
      removed_at: nowIso,
      ...buildPlaidTokenSanitizationUpdate(),
      next_manual_refresh_eligible_at: null,
      error_code: null,
      error_message: null,
      updated_at: nowIso,
    })
    .eq("id", params.connectionId);

  if (connectionUpdateError) {
    throw connectionUpdateError;
  }

  const { data: bankAccounts, error: bankAccountsError } = await params.supabase
    .from("bank_accounts")
    .select("id")
    .eq("bank_connection_id", params.connectionId);

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
    .eq("bank_connection_id", params.connectionId);

  if (rawCleanupError) {
    throw rawCleanupError;
  }

  const { error: webhookCleanupError } = await params.supabase
    .from("bank_webhook_events")
    .delete()
    .eq("bank_connection_id", params.connectionId);

  if (webhookCleanupError) {
    throw webhookCleanupError;
  }

  const { error: bankAccountCleanupError } = await params.supabase
    .from("bank_accounts")
    .delete()
    .eq("bank_connection_id", params.connectionId);

  if (bankAccountCleanupError) {
    throw bankAccountCleanupError;
  }

  const { error: tokenDeleteError } = await params.supabase
    .from("bank_connection_tokens")
    .delete()
    .eq("bank_connection_id", params.connectionId);

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
    .eq("bank_connection_id", params.connectionId)
    .in("status", ["pending", "processing"]);

  if (jobUpdateError) {
    throw jobUpdateError;
  }

  const { error: offboardingJobError } = await params.supabase
    .from("plaid_offboarding_jobs")
    .update({
      status: "completed",
      processed_at: nowIso,
      processing_started_at: null,
      access_token_encrypted: null,
      plaid_access_token_encrypted: null,
      updated_at: nowIso,
    })
    .eq("connection_id", params.connectionId)
    .in("status", ["pending", "processing", "failed"]);

  if (offboardingJobError) {
    throw offboardingJobError;
  }
}
