import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  mergePlaidSyncStatusMetadata,
  readPlaidSyncStatusMetadata,
} from "../shared/plaid-sync-status.ts";

Deno.test("plaid sync status helper merges webhook completeness fields", () => {
  const metadata = mergePlaidSyncStatusMetadata(
    { institution_name: "Chase" },
    {
      webhookCode: "SYNC_UPDATES_AVAILABLE",
      initialUpdateComplete: true,
      historicalUpdateComplete: false,
    },
  );

  const syncStatus = readPlaidSyncStatusMetadata(metadata);

  assertEquals(syncStatus?.initialUpdateComplete, true);
  assertEquals(syncStatus?.historicalUpdateComplete, false);
  assertEquals(syncStatus?.webhookCode, "SYNC_UPDATES_AVAILABLE");
  assertEquals(metadata["initial_update_complete"], true);
  assertEquals(metadata["historical_update_complete"], false);
  assertEquals(metadata["last_webhook_code"], "SYNC_UPDATES_AVAILABLE");
});

Deno.test(
  "plaid sync status helper returns null when metadata is missing",
  () => {
    assertEquals(readPlaidSyncStatusMetadata(null), null);
    assertEquals(readPlaidSyncStatusMetadata({}), null);
  },
);

Deno.test(
  "plaid sync status helper reads legacy flat metadata when nested status is absent",
  () => {
    const syncStatus = readPlaidSyncStatusMetadata({
      initial_update_complete: false,
      historical_update_complete: true,
      last_webhook_code: "HISTORICAL_UPDATE",
      sync_status_updated_at: "2026-04-10T12:00:00.000Z",
    });

    assertEquals(syncStatus?.initialUpdateComplete, false);
    assertEquals(syncStatus?.historicalUpdateComplete, true);
    assertEquals(syncStatus?.webhookCode, "HISTORICAL_UPDATE");
    assertEquals(syncStatus?.updatedAt, "2026-04-10T12:00:00.000Z");
  },
);
