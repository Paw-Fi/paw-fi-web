/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { shouldReportMissingCandidateUser } from "../shared/app-store-user-resolution.ts";

Deno.test(
  "app store user resolution: does not report missing appAccountToken users",
  () => {
    assertEquals(shouldReportMissingCandidateUser("app_account_token"), false);
  },
);

Deno.test(
  "app store user resolution: reports missing immutable ownership binding users",
  () => {
    assertEquals(shouldReportMissingCandidateUser("ownership_binding"), true);
  },
);

Deno.test(
  "app store user resolution: reports missing legacy subscription users",
  () => {
    assertEquals(shouldReportMissingCandidateUser("legacy_subscription"), true);
  },
);
