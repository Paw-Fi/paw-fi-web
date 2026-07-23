/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { isCommitmentAvailableForCountry } from "../shared/regional-checkout.ts";

Deno.test(
  "commitment checkout is unavailable in US, Singapore, and Australia",
  () => {
    for (const country of ["US", "SG", "AU"]) {
      assertEquals(isCommitmentAvailableForCountry(country), false);
    }
    assertEquals(isCommitmentAvailableForCountry("CA"), true);
  },
);
