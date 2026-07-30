/// <reference lib="deno.ns" />
import {
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

async function source(path: string): Promise<string> {
  return await Deno.readTextFile(new URL(path, import.meta.url));
}

const [
  appStoreNotifications,
  checkout,
  emailCheckout,
  stripeWebhook,
  updateSubscription,
  verifyIap,
  verifyPayment,
  getSubscription,
] = await Promise.all([
  source("../app-store-notifications/index.ts"),
  source("../create-checkout-session/index.ts"),
  source("../create-checkout-session-by-email/index.ts"),
  source("../stripe-webhook/index.ts"),
  source("../update-subscription/index.ts"),
  source("../verify-iap-purchase/index.ts"),
  source("../verify-payment/index.ts"),
  source("../get-subscription/index.ts"),
]);

Deno.test("commitment contract blocks duplicate checkout entry points", () => {
  for (const checkoutSource of [checkout, emailCheckout]) {
    assertStringIncludes(
      checkoutSource,
      'code: "ACTIVE_STRIPE_SUBSCRIPTION_EXISTS"',
    );
    assertStringIncludes(checkoutSource, "stripe.subscriptions.list({");
    assertStringIncludes(checkoutSource, "stripe.checkout.sessions.list({");
  }
});

Deno.test("subscription contract protects cross-provider replacement", () => {
  assertStringIncludes(verifyIap, 'code: "SUBSCRIPTION_MANAGED_BY_STRIPE"');
  assertStringIncludes(verifyPayment, 'code: "EXISTING_ENTITLEMENT_CONFLICT"');
  assertStringIncludes(
    stripeWebhook,
    '"duplicate_live_subscription_canceled"',
  );
});

Deno.test("App Store commitment cancellation remains visible while past due", () => {
  assertStringIncludes(updateSubscription, '"active", "trialing", "past_due"');
  assertStringIncludes(updateSubscription, "releaseStripeScheduleIfPresent");
  assertStringIncludes(getSubscription, "directSubscription.commitment_end");
  assertStringIncludes(appStoreNotifications, "cancelAtPeriodEnd");
});
