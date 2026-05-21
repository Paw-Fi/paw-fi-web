import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  normalizePlaidCountryCode,
  resolvePlaidCountryCode,
} from "../shared/plaid-country.ts";

Deno.test("plaid country helper normalizes requested country codes", () => {
  assertEquals(normalizePlaidCountryCode(" us "), "US");
  assertEquals(normalizePlaidCountryCode(""), undefined);
  assertEquals(normalizePlaidCountryCode("usa"), undefined);
});

Deno.test("plaid country helper prefers existing connection country", () => {
  assertEquals(
    resolvePlaidCountryCode({
      requestedCountryCode: "CA",
      connectionCountryCode: "US",
    }),
    "US",
  );
});

Deno.test(
  "plaid country helper falls back to requested country for new links",
  () => {
    assertEquals(
      resolvePlaidCountryCode({
        requestedCountryCode: "CA",
        connectionCountryCode: null,
      }),
      "CA",
    );
  },
);
