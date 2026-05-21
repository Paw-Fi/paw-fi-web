import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { validatePlaidWebhookClaims } from "../shared/webhook-verification.ts";

Deno.test("plaid webhook claims reject missing iat", async () => {
  const result = await validatePlaidWebhookClaims({
    body: "{}",
    payload: { request_body_sha256: await sha256Hex("{}") },
    nowSeconds: 1_700_000_000,
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, "Missing iat in JWT payload");
});

Deno.test("plaid webhook claims reject missing body hash", async () => {
  const result = await validatePlaidWebhookClaims({
    body: "{}",
    payload: { iat: 1_700_000_000 },
    nowSeconds: 1_700_000_000,
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, "Missing request_body_sha256 in JWT payload");
});

Deno.test(
  "plaid webhook claims reject tokens older than five minutes",
  async () => {
    const result = await validatePlaidWebhookClaims({
      body: "{}",
      payload: {
        iat: 1_700_000_000 - 301,
        request_body_sha256: await sha256Hex("{}"),
      },
      nowSeconds: 1_700_000_000,
    });

    assertEquals(result.valid, false);
    assertEquals(result.error, "Token expired (iat too old)");
  },
);

Deno.test("plaid webhook claims reject future iat", async () => {
  const result = await validatePlaidWebhookClaims({
    body: "{}",
    payload: {
      iat: 1_700_000_001,
      request_body_sha256: await sha256Hex("{}"),
    },
    nowSeconds: 1_700_000_000,
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, "Token issued in the future");
});

Deno.test("plaid webhook claims reject mismatched body hash", async () => {
  const result = await validatePlaidWebhookClaims({
    body: '{"ok":true}',
    payload: {
      iat: 1_700_000_000,
      request_body_sha256: await sha256Hex("{}"),
    },
    nowSeconds: 1_700_000_000,
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, "Body hash mismatch");
});

Deno.test("plaid webhook claims accept fresh matching hash", async () => {
  const body = '{"ok":true}';
  const result = await validatePlaidWebhookClaims({
    body,
    payload: {
      iat: 1_700_000_000,
      request_body_sha256: await sha256Hex(body),
    },
    nowSeconds: 1_700_000_000,
  });

  assertEquals(result.valid, true);
});

async function sha256Hex(value: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
