/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  getRegionalCheckoutAmount,
  resolveRegionalCheckoutMarket,
} from "../shared/regional-checkout.ts";

Deno.test(
  "Stripe yearly checkout resolves to the upfront annual total",
  () => {
    for (const country of ["US", "SG", "AU"]) {
      const selection = resolveRegionalCheckoutMarket({ country });
      assertEquals(
        getRegionalCheckoutAmount("plus", "yearly", selection.market),
        selection.market.yearly,
      );
    }
  },
);
