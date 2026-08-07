/// <reference lib="deno.ns" />
import {
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const [getSubscription, verifyIapPurchase, appStoreNotifications] =
  await Promise.all([
    Deno.readTextFile(
      new URL("../get-subscription/index.ts", import.meta.url),
    ),
    Deno.readTextFile(
      new URL("../verify-iap-purchase/index.ts", import.meta.url),
    ),
    Deno.readTextFile(
      new URL("../app-store-notifications/index.ts", import.meta.url),
    ),
  ]);

Deno.test("get-subscription exposes the server-classified trial flag", () => {
  assertStringIncludes(getSubscription, "isSystemGrantedTrial");
  assertStringIncludes(
    getSubscription,
    'from "../shared/system-granted-trial.ts";',
  );
  assertStringIncludes(
    getSubscription,
    "is_system_granted_trial: systemGrantedTrial",
  );
  assertStringIncludes(
    getSubscription,
    "is_system_granted_trial: false",
  );
});

Deno.test("IAP verification exempts only the classified system trial", () => {
  assertStringIncludes(verifyIapPurchase, "isSystemGrantedTrial");
  assertStringIncludes(
    verifyIapPurchase,
    'from "../shared/system-granted-trial.ts";',
  );
  assertStringIncludes(verifyIapPurchase, "stripe_customer_id");
  assertStringIncludes(verifyIapPurchase, "!systemGrantedTrial");
  assertStringIncludes(
    verifyIapPurchase,
    '"SUBSCRIPTION_MANAGED_BY_STRIPE"',
  );
  assertStringIncludes(
    verifyIapPurchase,
    '"[AppStoreValidationTrace]"',
  );
});

Deno.test("App Store notifications replace only the classified system trial", () => {
  assertStringIncludes(appStoreNotifications, "isSystemGrantedTrial");
  assertStringIncludes(
    appStoreNotifications,
    'from "../shared/system-granted-trial.ts";',
  );
  assertStringIncludes(appStoreNotifications, "stripe_customer_id");
  assertStringIncludes(
    appStoreNotifications,
    "allowProviderSwitch: systemGrantedTrial",
  );
  assertStringIncludes(
    appStoreNotifications,
    "replacingSystemGrantedTrial: systemGrantedTrial",
  );
  assertStringIncludes(
    appStoreNotifications,
    '"[AppStoreCommitmentTrace]"',
  );
  assertStringIncludes(
    appStoreNotifications,
    '"[AppStoreValidationTrace]"',
  );
  assertStringIncludes(
    appStoreNotifications,
    'phase: "decision"',
  );
  assertStringIncludes(
    appStoreNotifications,
    'phase: "persisted"',
  );
});
