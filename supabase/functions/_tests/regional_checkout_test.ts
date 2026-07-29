/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  getRegionalCheckoutAmount,
  resolveRegionalCheckoutMarket,
} from "../shared/regional-checkout.ts";

Deno.test(
  "Stripe commitment checkout resolves in US, Singapore, and Australia",
  () => {
    for (const country of ["US", "SG", "AU"]) {
      const selection = resolveRegionalCheckoutMarket({ country });
      assertEquals(
        getRegionalCheckoutAmount("plus", "yearly", selection.market),
        Math.round(selection.market.yearly / 12),
      );
    }
  },
);
