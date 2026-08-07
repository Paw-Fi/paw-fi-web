/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { Environment } from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";

import {
  AppStoreApiError,
  createAppStoreBearerToken,
  fetchAppStoreTransactionByTransactionId,
  findAppStoreTransactionWithEnvironmentFallback,
  getValidatedAppStorePrivateKey,
  isAppStoreLookupNotFoundError,
  makeAppStoreApiRequest,
  matchesVerifiedAppStoreTransaction,
} from "../shared/app-store-api.ts";

interface AppStoreApiConfig {
  issuerId: string;
  keyId: string;
  bundleId: string;
  privateKey: string;
  publicKey?: CryptoKey;
}

interface DecodedJwtHeader {
  alg: string;
  kid: string;
}

interface DecodedJwtPayload {
  iss: string;
  bid: string;
  aud: string;
  iat: number;
  exp: number;
}

Deno.test(
  "app store api: validates env-style escaped private key",
  async () => {
    const config = await createTestConfig();
    const escapedPrivateKey = JSON.stringify(config.privateKey).slice(1, -1);

    const normalized = getValidatedAppStorePrivateKey(escapedPrivateKey);
    const token = await createAppStoreBearerToken({
      issuerId: config.issuerId,
      keyId: config.keyId,
      bundleId: config.bundleId,
      privateKey: normalized,
    });

    const [encodedHeader, encodedPayload] = token.split(".");
    const header = decodeBase64UrlJson<DecodedJwtHeader>(encodedHeader);
    const payload = decodeBase64UrlJson<DecodedJwtPayload>(encodedPayload);

    assertEquals(header.alg, "ES256");
    assertEquals(header.kid, config.keyId);
    assertEquals(payload.iss, config.issuerId);
    assertEquals(payload.bid, config.bundleId);
    assertEquals(payload.aud, "appstoreconnect-v1");
  },
);

Deno.test(
  "app store api: validates base64-encoded PEM private key",
  async () => {
    const config = await createTestConfig();
    const base64EncodedPrivateKey = btoa(config.privateKey);

    const normalized = getValidatedAppStorePrivateKey(base64EncodedPrivateKey);
    const token = await createAppStoreBearerToken({
      issuerId: config.issuerId,
      keyId: config.keyId,
      bundleId: config.bundleId,
      privateKey: normalized,
    });

    assertStringIncludes(token, ".");
  },
);

Deno.test(
  "app store api: rejects malformed private key with clear error",
  async () => {
    assertRejects(
      async () =>
        await createAppStoreBearerToken({
          issuerId: "issuer-id",
          keyId: "key-id",
          bundleId: "com.moneko.mobile",
          privateKey: getValidatedAppStorePrivateKey("not-a-real-private-key"),
        }),
      Error,
      "PEM markers",
    );
  },
);

Deno.test("app store api: rejects legacy EC private key PEMs", () => {
  assertRejects(
    async () =>
      await createAppStoreBearerToken({
        issuerId: "issuer-id",
        keyId: "key-id",
        bundleId: "com.moneko.mobile",
        privateKey: getValidatedAppStorePrivateKey(
          "-----BEGIN EC PRIVATE KEY-----\nabc\n-----END EC PRIVATE KEY-----",
        ),
      }),
    Error,
    "PKCS#8",
  );
});

Deno.test("app store api: creates short-lived ES256 bearer token", async () => {
  const config = await createTestConfig();

  const token = await createAppStoreBearerToken(config);
  const [, encodedPayload] = token.split(".");
  const payload = decodeBase64UrlJson<DecodedJwtPayload>(encodedPayload);

  assertEquals(typeof payload.iat, "number");
  assertEquals(typeof payload.exp, "number");
  assertEquals(payload.exp - payload.iat, 300);
});

Deno.test(
  "app store api: creates a bearer token with a valid signature",
  async () => {
    const config = await createTestConfig();
    const token = await createAppStoreBearerToken(config);
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    const signedContent = new TextEncoder().encode(
      `${encodedHeader}.${encodedPayload}`,
    );
    const signature = decodeBase64UrlBytes(encodedSignature);

    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      config.publicKey!,
      signature,
      signedContent,
    );

    assertEquals(isValid, true);
  },
);

Deno.test(
  "app store api: sends bearer token and repeated query params",
  async () => {
    const config = await createTestConfig();
    let capturedUrl = "";
    let capturedAuthHeader = "";

    const response = await makeAppStoreApiRequest<{ ok: boolean }>({
      config,
      path: "/inApps/v2/history/123",
      environment: Environment.SANDBOX,
      query: {
        sort: "DESCENDING",
        productType: ["AUTO_RENEWABLE", "NON_CONSUMABLE"],
      },
      fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedAuthHeader = String(
          init?.headers instanceof Headers
            ? init.headers.get("Authorization")
            : ((init?.headers as Record<string, string>)?.Authorization ?? ""),
        );

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    assertEquals(response.ok, true);
    assertStringIncludes(
      capturedUrl,
      "https://api.storekit-sandbox.itunes.apple.com/inApps/v2/history/123",
    );
    assertStringIncludes(capturedUrl, "sort=DESCENDING");
    assertStringIncludes(capturedUrl, "productType=AUTO_RENEWABLE");
    assertStringIncludes(capturedUrl, "productType=NON_CONSUMABLE");
    assertStringIncludes(capturedAuthHeader, "Bearer ");
  },
);

Deno.test(
  "app store api: retries Apple's retryable internal error",
  async () => {
    const config = await createTestConfig();
    let attempts = 0;

    const response = await makeAppStoreApiRequest<{ ok: boolean }>({
      config,
      path: "/inApps/v1/transactions/tx-retry",
      environment: Environment.SANDBOX,
      maxRetries: 2,
      retryBaseDelayMs: 0,
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response(
            JSON.stringify({
              errorCode: 5000001,
              errorMessage: "An unknown error occurred. Please try again.",
            }),
            { status: 500 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });

    assertEquals(response.ok, true);
    assertEquals(attempts, 2);
  },
);

Deno.test(
  "app store api: honors retry-after for rate limiting without bypassing retry bounds",
  async () => {
    const config = await createTestConfig();
    let attempts = 0;

    const response = await makeAppStoreApiRequest<{ ok: boolean }>({
      config,
      path: "/inApps/v1/transactions/tx-rate-limited",
      environment: Environment.SANDBOX,
      maxRetries: 1,
      retryBaseDelayMs: 0,
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response(
            JSON.stringify({
              errorCode: 4290000,
              errorMessage: "Rate limit exceeded.",
            }),
            {
              status: 429,
              headers: { "Retry-After": "0" },
            },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });

    assertEquals(response.ok, true);
    assertEquals(attempts, 2);
  },
);

Deno.test(
  "app store api: does not retry non-retryable Apple errors",
  async () => {
    const config = await createTestConfig();
    let attempts = 0;

    await assertRejects(
      async () =>
        await makeAppStoreApiRequest({
          config,
          path: "/inApps/v1/transactions/tx-invalid",
          environment: Environment.SANDBOX,
          maxRetries: 2,
          retryBaseDelayMs: 0,
          fetchImpl: async () => {
            attempts += 1;
            return new Response(
              JSON.stringify({
                errorCode: 4000000,
                errorMessage: "Bad request.",
              }),
              { status: 400 },
            );
          },
        }),
      AppStoreApiError,
      "App Store API request failed (400)",
    );

    assertEquals(attempts, 1);
  },
);

Deno.test(
  "app store api: stops after the configured retry budget",
  async () => {
    const config = await createTestConfig();
    let attempts = 0;

    await assertRejects(
      async () =>
        await makeAppStoreApiRequest({
          config,
          path: "/inApps/v1/transactions/tx-still-unavailable",
          environment: Environment.SANDBOX,
          maxRetries: 2,
          retryBaseDelayMs: 0,
          fetchImpl: async () => {
            attempts += 1;
            return new Response(
              JSON.stringify({
                errorCode: 5000001,
                errorMessage: "An unknown error occurred. Please try again.",
              }),
              { status: 500 },
            );
          },
        }),
      AppStoreApiError,
      "App Store API request failed (500)",
    );

    assertEquals(attempts, 3);
  },
);

Deno.test(
  "app store api: fetches and decodes a specific transaction by id",
  async () => {
    const config = await createTestConfig();

    const transaction = await fetchAppStoreTransactionByTransactionId({
      config,
      transactionId: "tx-123",
      environment: Environment.PRODUCTION,
      fetchImpl: async () => {
        return new Response(
          JSON.stringify({
            signedTransactionInfo: createSignedTransactionJws({
              transactionId: "tx-123",
              originalTransactionId: "orig-123",
              bundleId: "com.moneko.mobile",
              productId: "yearly",
            }),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    });

    assertEquals(transaction?.transactionId, "tx-123");
    assertEquals(transaction?.originalTransactionId, "orig-123");
    assertEquals(transaction?.bundleId, "com.moneko.mobile");
  },
);

Deno.test(
  "app store api: matches only the verified transaction submitted by client",
  () => {
    assertEquals(
      matchesVerifiedAppStoreTransaction({
        hint: {
          transactionId: "tx-123",
          originalTransactionId: "orig-123",
          bundleId: "com.moneko.mobile",
        },
        verified: {
          transactionId: "tx-123",
          originalTransactionId: "orig-123",
          bundleId: "com.moneko.mobile",
        },
      }),
      true,
    );

    assertEquals(
      matchesVerifiedAppStoreTransaction({
        hint: {
          transactionId: "tx-123",
          originalTransactionId: "orig-123",
          bundleId: "com.moneko.mobile",
        },
        verified: {
          transactionId: "tx-456",
          originalTransactionId: "orig-123",
          bundleId: "com.moneko.mobile",
        },
      }),
      false,
    );
  },
);

Deno.test(
  "app store api: detects not-found lookup errors for env fallback",
  () => {
    assertEquals(
      isAppStoreLookupNotFoundError(
        new AppStoreApiError({
          status: 404,
          responseBody: "not found",
          path: "/inApps/v1/transactions/tx-123",
        }),
      ),
      true,
    );
    assertEquals(
      isAppStoreLookupNotFoundError(
        new AppStoreApiError({
          status: 500,
          responseBody: "boom",
          path: "/inApps/v1/transactions/tx-123",
        }),
      ),
      false,
    );
  },
);

Deno.test(
  "app store api: retries the opposite environment after not-found",
  async () => {
    const config = await createTestConfig();
    const seenUrls: string[] = [];

    const result = await findAppStoreTransactionWithEnvironmentFallback({
      config,
      environmentHint: Environment.PRODUCTION,
      transactionId: "tx-123",
      fetchImpl: async (input: string | URL | Request) => {
        const url = input.toString();
        seenUrls.push(url);

        if (url.startsWith("https://api.storekit.itunes.apple.com")) {
          return new Response("not found", { status: 404 });
        }

        return new Response(
          JSON.stringify({
            signedTransactionInfo: createSignedTransactionJws({
              transactionId: "tx-123",
              originalTransactionId: "orig-123",
              bundleId: "com.moneko.mobile",
              productId: "yearly",
            }),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    });

    assertEquals(result.environment, Environment.SANDBOX);
    assertEquals(result.transaction?.transactionId, "tx-123");
    assertEquals(seenUrls.length, 2);
    assertStringIncludes(seenUrls[0], "https://api.storekit.itunes.apple.com");
    assertStringIncludes(
      seenUrls[1],
      "https://api.storekit-sandbox.itunes.apple.com",
    );
  },
);

Deno.test(
  "app store api: falls back to original transaction history after transaction lookup miss",
  async () => {
    const config = await createTestConfig();
    const seenUrls: string[] = [];

    const result = await findAppStoreTransactionWithEnvironmentFallback({
      config,
      environmentHint: Environment.PRODUCTION,
      transactionId: "tx-123",
      originalTransactionId: "orig-123",
      fetchImpl: async (input: string | URL | Request) => {
        const url = input.toString();
        seenUrls.push(url);

        if (url.includes("/inApps/v1/transactions/tx-123")) {
          return new Response("not found", { status: 404 });
        }

        return new Response(
          JSON.stringify({
            signedTransactions: [
              createSignedTransactionJws({
                transactionId: "tx-123",
                originalTransactionId: "orig-123",
                bundleId: "com.moneko.mobile",
                productId: "yearly",
              }),
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
    assertEquals(result.transaction?.transactionId, "tx-123");
    assertEquals(seenUrls.length, 2);
    assertStringIncludes(seenUrls[0], "/inApps/v1/transactions/tx-123");
    assertStringIncludes(seenUrls[1], "/inApps/v2/history/orig-123");
  },
);

Deno.test(
  "app store api: falls back to exact transaction history after retryable transaction endpoint failure",
  async () => {
    const config = await createTestConfig();
    const seenUrls: string[] = [];

    const result = await findAppStoreTransactionWithEnvironmentFallback({
      config,
      environmentHint: Environment.SANDBOX,
      transactionId: "tx-retryable",
      originalTransactionId: "orig-retryable",
      maxRetries: 0,
      retryBaseDelayMs: 0,
      fetchImpl: async (input: string | URL | Request) => {
        const url = input.toString();
        seenUrls.push(url);

        if (url.includes("/inApps/v1/transactions/tx-retryable")) {
          return new Response(
            JSON.stringify({
              errorCode: 5000001,
              errorMessage: "An unknown error occurred. Please try again.",
            }),
            { status: 500 },
          );
        }

        return new Response(
          JSON.stringify({
            signedTransactions: [
              createSignedTransactionJws({
                transactionId: "tx-retryable",
                originalTransactionId: "orig-retryable",
                bundleId: "com.moneko.mobile",
                productId: "yearly",
              }),
            ],
            hasMore: false,
            revision: null,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    });

    assertEquals(result.environment, Environment.SANDBOX);
    assertEquals(result.transaction?.transactionId, "tx-retryable");
    assertEquals(result.transaction?.originalTransactionId, "orig-retryable");
    assertEquals(seenUrls.length, 2);
    assertStringIncludes(
      seenUrls[0],
      "/inApps/v1/transactions/tx-retryable",
    );
    assertStringIncludes(
      seenUrls[1],
      "/inApps/v2/history/orig-retryable",
    );
  },
);

Deno.test(
  "app store api: searches paginated history for the submitted transaction id",
  async () => {
    const config = await createTestConfig();
    const seenUrls: string[] = [];

    const result = await findAppStoreTransactionWithEnvironmentFallback({
      config,
      environmentHint: Environment.PRODUCTION,
      transactionId: "tx-123",
      originalTransactionId: "orig-123",
      fetchImpl: async (input: string | URL | Request) => {
        const url = input.toString();
        seenUrls.push(url);

        if (url.includes("/inApps/v1/transactions/tx-123")) {
          return new Response("not found", { status: 404 });
        }

        if (url.includes("revision=page-2")) {
          return new Response(
            JSON.stringify({
              signedTransactions: [
                createSignedTransactionJws({
                  transactionId: "tx-123",
                  originalTransactionId: "orig-123",
                  bundleId: "com.moneko.mobile",
                  productId: "yearly",
                }),
              ],
              hasMore: false,
              revision: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            signedTransactions: [
              createSignedTransactionJws({
                transactionId: "tx-999",
                originalTransactionId: "orig-123",
                bundleId: "com.moneko.mobile",
                productId: "yearly",
              }),
            ],
            hasMore: true,
            revision: "page-2",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    });

    assertEquals(result.environment, Environment.PRODUCTION);
    assertEquals(result.transaction?.transactionId, "tx-123");
    assertEquals(seenUrls.length, 3);
    assertStringIncludes(seenUrls[1], "/inApps/v2/history/orig-123");
    assertStringIncludes(seenUrls[2], "revision=page-2");
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
    publicKey: keyPair.publicKey,
  };
}

function toPem(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  const lines = base64.match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

function decodeBase64UrlJson<T>(value: string): T {
  const bytes = decodeBase64UrlBytes(value);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function createSignedTransactionJws(params: {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
}): string {
  const header = toBase64Url(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      transactionId: params.transactionId,
      originalTransactionId: params.originalTransactionId,
      bundleId: params.bundleId,
      productId: params.productId,
    }),
  );
  return `${header}.${payload}.signature`;
}

function toBase64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
