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
});

Deno.test(
  "plaid sync status helper returns null when metadata is missing",
  () => {
    assertEquals(readPlaidSyncStatusMetadata(null), null);
    assertEquals(readPlaidSyncStatusMetadata({}), null);
  },
);
