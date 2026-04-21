/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  Environment,
  Status,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";

import {
  findAppStoreSubscriptionStatusWithEnvironmentFallback,
  type AppStoreApiConfig,
} from "../shared/app-store-api.ts";

Deno.test(
  "app store subscription status lookup: decodes matching transaction and renewal info",
  async () => {
    const config = await createTestConfig();

    const result = await findAppStoreSubscriptionStatusWithEnvironmentFallback({
      config,
      environmentHint: Environment.PRODUCTION,
      transactionId: "tx-123",
      originalTransactionId: "orig-123",
      productId: "yearly",
      fetchImpl: async () => {
        return new Response(
          JSON.stringify({
            data: [
              {
                lastTransactions: [
                  {
                    status: Status.ACTIVE,
                    originalTransactionId: "orig-123",
                    signedTransactionInfo: createSignedJws({
                      transactionId: "tx-123",
                      originalTransactionId: "orig-123",
                      productId: "yearly",
                    }),
                    signedRenewalInfo: createSignedJws({
                      originalTransactionId: "orig-123",
                      productId: "yearly",
                      renewalDate: Date.UTC(2026, 3, 18, 0, 30, 21),
                    }),
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    });

    assertEquals(result.environment, Environment.PRODUCTION);
    assertExists(result.subscription);
    assertEquals(result.subscription?.status, Status.ACTIVE);
    assertEquals(result.subscription?.transaction?.transactionId, "tx-123");
    assertEquals(
      result.subscription?.renewalInfo?.renewalDate,
      Date.UTC(2026, 3, 18, 0, 30, 21),
    );
  },
);

Deno.test(
  "app store subscription status lookup: retries opposite environment after not-found",
  async () => {
    const config = await createTestConfig();
    const seenUrls: string[] = [];

    const result = await findAppStoreSubscriptionStatusWithEnvironmentFallback({
      config,
      environmentHint: Environment.PRODUCTION,
      transactionId: "tx-123",
      originalTransactionId: "orig-123",
      productId: "yearly",
      fetchImpl: async (input: string | URL | Request) => {
        const url = input.toString();
        seenUrls.push(url);

        if (url.startsWith("https://api.storekit.itunes.apple.com")) {
          return new Response("not found", { status: 404 });
        }

        return new Response(
          JSON.stringify({
            data: [
              {
                lastTransactions: [
                  {
                    status: Status.EXPIRED,
                    originalTransactionId: "orig-123",
                    signedTransactionInfo: createSignedJws({
                      transactionId: "tx-123",
                      originalTransactionId: "orig-123",
                      productId: "yearly",
                    }),
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    });

    assertEquals(result.environment, Environment.SANDBOX);
    assertEquals(result.subscription?.status, Status.EXPIRED);
    assertEquals(seenUrls.length, 2);
    assertStringIncludes(seenUrls[0], "https://api.storekit.itunes.apple.com");
    assertStringIncludes(
      seenUrls[1],
      "https://api.storekit-sandbox.itunes.apple.com",
    );
  },
);

async function createTestConfig(): Promise<AppStoreApiConfig> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    issuerId: "99b16628-15e4-4668-972b-eeff55eeff55",
    keyId: "ABCDEFGHIJ",
    bundleId: "com.moneko.mobile",
    privateKey: toPem(new Uint8Array(pkcs8)),
  };
}

function toPem(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  const lines = base64.match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

function createSignedJws(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  return `${header}.${toBase64Url(JSON.stringify(payload))}.signature`;
}

function toBase64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
