export interface PlaidSyncStatusSnapshot {
  initialUpdateComplete: boolean | null;
  historicalUpdateComplete: boolean | null;
  webhookCode: string | null;
  updatedAt: string | null;
}

export function mergePlaidSyncStatusMetadata(
  metadata: Record<string, unknown> | null | undefined,
  payload: {
    webhookCode?: string | null;
    initialUpdateComplete?: boolean | null;
    historicalUpdateComplete?: boolean | null;
  },
): Record<string, unknown> {
  const previous = readPlaidSyncStatusMetadata(metadata);
  const initialUpdateComplete = mergeCompletionFlag(
    previous?.initialUpdateComplete,
    payload.initialUpdateComplete,
  );
  const historicalUpdateComplete = mergeCompletionFlag(
    previous?.historicalUpdateComplete,
    payload.historicalUpdateComplete,
  );
  const updatedAt = new Date().toISOString();
  return {
    ...(metadata || {}),
    // Legacy flat keys kept for compatibility with older readers.
    initial_update_complete: initialUpdateComplete,
    historical_update_complete: historicalUpdateComplete,
    last_webhook_code: payload.webhookCode ?? previous?.webhookCode ?? null,
    sync_status_updated_at: updatedAt,
    plaid_sync_status: {
      initial_update_complete: initialUpdateComplete,
      historical_update_complete: historicalUpdateComplete,
      webhook_code: payload.webhookCode ?? previous?.webhookCode ?? null,
      updated_at: updatedAt,
    },
  };
}

export function plaidSyncStatusFromTransactionsUpdateStatus(
  status?: string | null,
): Pick<
  PlaidSyncStatusSnapshot,
  "initialUpdateComplete" | "historicalUpdateComplete"
> | null {
  switch (status?.trim().toUpperCase()) {
    case "NOT_READY":
      return {
        initialUpdateComplete: false,
        historicalUpdateComplete: false,
      };
    case "INITIAL_UPDATE_COMPLETE":
      return {
        initialUpdateComplete: true,
        historicalUpdateComplete: false,
      };
    case "HISTORICAL_UPDATE_COMPLETE":
      return {
        initialUpdateComplete: true,
        historicalUpdateComplete: true,
      };
    default:
      return null;
  }
}

function mergeCompletionFlag(
  previous?: boolean | null,
  incoming?: boolean | null,
): boolean | null {
  if (previous === true || incoming === true) return true;
  return typeof incoming === "boolean" ? incoming : (previous ?? null);
}

export function readPlaidSyncStatusMetadata(
  metadata: unknown,
): PlaidSyncStatusSnapshot | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const root = metadata as Record<string, unknown>;
  const nested = root.plaid_sync_status;
  const map =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : root;
  const snapshot = {
    initialUpdateComplete:
      typeof map.initial_update_complete === "boolean"
        ? map.initial_update_complete
        : null,
    historicalUpdateComplete:
      typeof map.historical_update_complete === "boolean"
        ? map.historical_update_complete
        : null,
    webhookCode:
      typeof map.webhook_code === "string"
        ? map.webhook_code
        : typeof root.last_webhook_code === "string"
          ? root.last_webhook_code
          : null,
    updatedAt:
      typeof map.updated_at === "string"
        ? map.updated_at
        : typeof root.sync_status_updated_at === "string"
          ? root.sync_status_updated_at
          : null,
  };

  if (
    snapshot.initialUpdateComplete == null &&
    snapshot.historicalUpdateComplete == null &&
    snapshot.webhookCode == null &&
    snapshot.updatedAt == null
  ) {
    return null;
  }

  return snapshot;
}
