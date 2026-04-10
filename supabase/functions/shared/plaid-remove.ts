import { decryptSecret } from "./token-encryption.ts";
import { PlaidError, removePlaidItem } from "./plaid-client.ts";

export interface PlaidRemovableConnection {
  id: string;
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
  const encryptedToken = params.connection.access_token_encrypted ||
    params.connection.plaid_access_token_encrypted;

  if (encryptedToken) {
    try {
      const accessToken = await decryptSecret(encryptedToken);
      await removePlaidItem(accessToken);
    } catch (error) {
      if (!(error instanceof PlaidError && error.code === "ITEM_NOT_FOUND")) {
        throw error;
      }
    }
  }

  const nowIso = new Date().toISOString();

  await params.supabase
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

  await params.supabase
    .from("bank_connection_tokens")
    .delete()
    .eq("bank_connection_id", params.connection.id);

  await params.supabase
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
}
