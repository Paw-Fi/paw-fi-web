/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  checkoutVerificationPersistenceErrorResponse,
  isEmailCheckoutAuthorized,
  persistCheckoutSessionVerificationOrExpire,
} from "../shared/checkout-session-security.ts";

Deno.test(
  "checkout security: verification persistence failure expires session",
  async () => {
    const expiredSessions: string[] = [];
    const reports: string[] = [];
    const persisted = await persistCheckoutSessionVerificationOrExpire({
      sessionId: "cs_test_123",
      persist: () => Promise.resolve({ error: new Error("upsert failed") }),
      expire: (sessionId) => {
        expiredSessions.push(sessionId);
        return Promise.resolve();
      },
      reportError: (phase) => reports.push(phase),
    });

    assertEquals(persisted, false);
    assertEquals(expiredSessions, ["cs_test_123"]);
    assertEquals(reports, ["persist_verification_nonce"]);
  },
);

Deno.test(
  "checkout security: verification failure response is non-2xx and has no checkout url",
  async () => {
    const response = checkoutVerificationPersistenceErrorResponse({});
    const body = await response.text();

    assertEquals(response.status, 500);
    assertStringIncludes(body, "Failed to prepare checkout session");
    assertEquals(body.includes("checkoutUrl"), false);
  },
);

Deno.test("checkout security: email checkout requires configured token", () => {
  assertEquals(
    isEmailCheckoutAuthorized(
      new Headers({ "x-checkout-token": "token" }),
      null,
    ),
    false,
  );
  assertEquals(
    isEmailCheckoutAuthorized(
      new Headers({ "x-checkout-token": "wrong" }),
      "token",
    ),
    false,
  );
  assertEquals(
    isEmailCheckoutAuthorized(
      new Headers({ "x-checkout-token": "token" }),
      "token",
    ),
    true,
  );
});

Deno.test(
  "checkout security: checkout session urls are not logged by checkout session functions",
  async () => {
    const files = [
      "./supabase/functions/create-checkout-session/index.ts",
      "./supabase/functions/create-checkout-session-by-email/index.ts",
    ];

    for (const file of files) {
      const source = await Deno.readTextFile(file);
      assertEquals(source.includes("url: session.url"), false);
    }
  },
);
