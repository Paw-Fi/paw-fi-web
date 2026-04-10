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
  return {
    ...(metadata || {}),
    plaid_sync_status: {
      initial_update_complete: payload.initialUpdateComplete ?? null,
      historical_update_complete: payload.historicalUpdateComplete ?? null,
      webhook_code: payload.webhookCode ?? null,
      updated_at: new Date().toISOString(),
    },
  };
}

export function readPlaidSyncStatusMetadata(
  metadata: unknown,
): PlaidSyncStatusSnapshot | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const syncStatus = (metadata as Record<string, unknown>).plaid_sync_status;
  if (!syncStatus || typeof syncStatus !== "object") {
    return null;
  }

  const map = syncStatus as Record<string, unknown>;
  return {
    initialUpdateComplete: typeof map.initial_update_complete === "boolean"
      ? map.initial_update_complete
      : null,
    historicalUpdateComplete:
      typeof map.historical_update_complete === "boolean"
        ? map.historical_update_complete
        : null,
    webhookCode: typeof map.webhook_code === "string" ? map.webhook_code : null,
    updatedAt: typeof map.updated_at === "string" ? map.updated_at : null,
  };
}
