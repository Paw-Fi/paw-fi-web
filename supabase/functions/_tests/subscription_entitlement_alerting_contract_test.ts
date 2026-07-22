import {
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

async function readFunction(relativePath: string): Promise<string> {
  return await Deno.readTextFile(new URL(relativePath, import.meta.url));
}

const [appStoreNotifications, stripeWebhook, verifyIap, verifyPayment] =
  await Promise.all([
    readFunction("../app-store-notifications/index.ts"),
    readFunction("../stripe-webhook/index.ts"),
    readFunction("../verify-iap-purchase/index.ts"),
    readFunction("../verify-payment/index.ts"),
  ]);

Deno.test("subscription entitlement anomalies are reported with actionable phases", () => {
  assertStringIncludes(
    appStoreNotifications,
    'phase: "multiple_active_lifetime_grants_detected"',
  );
  assertStringIncludes(
    stripeWebhook,
    '"multiple_active_lifetime_grants_detected"',
  );
  assertStringIncludes(
    verifyIap,
    'phase: "multiple_active_lifetime_grants_detected"',
  );
  assertStringIncludes(
    verifyIap,
    'phase: "lifetime_ownership_transfer_source_mismatch"',
  );
});

Deno.test("payment persistence and handler failures call reportEdgeFunctionError", () => {
  assertStringIncludes(verifyPayment, "await reportEdgeFunctionError({");
  assertStringIncludes(
    verifyPayment,
    'phase: "persist_lifetime_entitlement"',
  );
  assertStringIncludes(
    verifyPayment,
    'phase: "persist_recurring_entitlement"',
  );
  assertStringIncludes(verifyPayment, 'phase: "serve_handler"');
});

Deno.test("all subscription entry points import centralized error reporting", () => {
  for (
    const source of [
      appStoreNotifications,
      stripeWebhook,
      verifyIap,
      verifyPayment,
    ]
  ) {
    assertStringIncludes(source, "reportEdgeFunctionError");
  }
});
