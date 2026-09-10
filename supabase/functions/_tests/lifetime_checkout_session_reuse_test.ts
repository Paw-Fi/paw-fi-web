/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { findReusableLifetimeCheckoutSession } from "../shared/lifetime-checkout-session-reuse.ts";

const match = {
  userId: "00000000-0000-4000-8000-000000000001",
  pricingCountry: "IE",
  currency: "EUR",
  promoCode: "LIFETIME100",
};

Deno.test("Lifetime checkout reuse: returns only the exact open purchase", () => {
  const reusable = {
    mode: "payment",
    url: "https://checkout.stripe.com/c/pay/cs_open",
    metadata: {
      user_id: match.userId,
      plan: "lifetime",
      pricing_country: match.pricingCountry,
      presentment_currency: match.currency,
      promo_code: match.promoCode,
    },
  };

  assertEquals(
    findReusableLifetimeCheckoutSession(
      [
        {
          ...reusable,
          metadata: { ...reusable.metadata, promo_code: "OTHER" },
        },
        { ...reusable, mode: "subscription" },
        reusable,
      ],
      match,
    ),
    reusable,
  );
});

Deno.test("Lifetime checkout reuse: never reuses a different request", () => {
  const session = {
    mode: "payment",
    url: "https://checkout.stripe.com/c/pay/cs_open",
    metadata: {
      user_id: match.userId,
      plan: "lifetime",
      pricing_country: match.pricingCountry,
      presentment_currency: match.currency,
      promo_code: "",
    },
  };

  assertEquals(
    findReusableLifetimeCheckoutSession([session], match),
    undefined,
  );
});
