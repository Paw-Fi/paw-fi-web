import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const [verifyIapPurchase, appStoreNotifications] = await Promise.all([
  Deno.readTextFile(
    new URL("../verify-iap-purchase/index.ts", import.meta.url),
  ),
  Deno.readTextFile(
    new URL("../app-store-notifications/index.ts", import.meta.url),
  ),
]);

Deno.test("App Store writes preserve trial history only for the same App Store lineage", () => {
  for (const source of [verifyIapPurchase, appStoreNotifications]) {
    assertStringIncludes(source, "const isSameAppStoreLineage =");
    assertStringIncludes(source, 'provider === "app_store"');
    assertStringIncludes(source, "app_store_original_transaction_id");
  }
});
