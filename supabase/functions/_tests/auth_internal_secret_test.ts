/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

function restoreEnv(key: string, value: string | undefined) {
  if (value == null) {
    Deno.env.delete(key);
    return;
  }
  Deno.env.set(key, value);
}

Deno.test("authenticateInternalSecret re-reads env on each call", async () => {
  const originalSecretApiKey = Deno.env.get("SECRET_API_KEY");
  const originalEdgeFunctionKey = Deno.env.get("EDGE_FUNCTION_KEY");
  const originalInternalServiceSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");

  try {
    Deno.env.delete("EDGE_FUNCTION_KEY");
    Deno.env.delete("INTERNAL_SERVICE_SECRET");
    Deno.env.set("SECRET_API_KEY", "first-secret");

    const { authenticateInternalSecret } = await import(
      `../shared/auth.ts?test=${crypto.randomUUID()}`
    );

    const first = await authenticateInternalSecret(
      new Request("http://localhost", {
        headers: { "X-Moneko-Internal-Key": "first-secret" },
      }),
    );
    assertEquals(first.success, true);

    Deno.env.set("SECRET_API_KEY", "rotated-secret");

    const second = await authenticateInternalSecret(
      new Request("http://localhost", {
        headers: { "X-Moneko-Internal-Key": "rotated-secret" },
      }),
    );
    assertEquals(second.success, true);
  } finally {
    restoreEnv("SECRET_API_KEY", originalSecretApiKey);
    restoreEnv("EDGE_FUNCTION_KEY", originalEdgeFunctionKey);
    restoreEnv("INTERNAL_SERVICE_SECRET", originalInternalServiceSecret);
  }
});

Deno.test(
  "resolveInternalFunctionKey prefers INTERNAL_SERVICE_SECRET",
  async () => {
    const originalSecretApiKey = Deno.env.get("SECRET_API_KEY");
    const originalEdgeFunctionKey = Deno.env.get("EDGE_FUNCTION_KEY");
    const originalInternalServiceSecret = Deno.env.get(
      "INTERNAL_SERVICE_SECRET",
    );

    try {
      Deno.env.set("INTERNAL_SERVICE_SECRET", "internal-secret");
      Deno.env.set("SECRET_API_KEY", "secret-api-key");
      Deno.env.set("EDGE_FUNCTION_KEY", "edge-function-key");

      const { resolveInternalFunctionKey } = await import(
        `../shared/auth.ts?test=${crypto.randomUUID()}`
      );

      assertEquals(resolveInternalFunctionKey(), "internal-secret");

      Deno.env.delete("INTERNAL_SERVICE_SECRET");
      assertEquals(resolveInternalFunctionKey(), "secret-api-key");

      Deno.env.delete("SECRET_API_KEY");
      assertEquals(resolveInternalFunctionKey(), "edge-function-key");
    } finally {
      restoreEnv("SECRET_API_KEY", originalSecretApiKey);
      restoreEnv("EDGE_FUNCTION_KEY", originalEdgeFunctionKey);
      restoreEnv("INTERNAL_SERVICE_SECRET", originalInternalServiceSecret);
    }
  },
);

Deno.test(
  "resolveInternalFunctionKeyWithSource reports selected source",
  async () => {
    const originalSecretApiKey = Deno.env.get("SECRET_API_KEY");
    const originalEdgeFunctionKey = Deno.env.get("EDGE_FUNCTION_KEY");
    const originalInternalServiceSecret = Deno.env.get(
      "INTERNAL_SERVICE_SECRET",
    );

    try {
      Deno.env.set("INTERNAL_SERVICE_SECRET", "internal-secret");
      Deno.env.set("SECRET_API_KEY", "secret-api-key");
      Deno.env.set("EDGE_FUNCTION_KEY", "edge-function-key");

      const { resolveInternalFunctionKeyWithSource } = await import(
        `../shared/auth.ts?test=${crypto.randomUUID()}`
      );

      const first = resolveInternalFunctionKeyWithSource();
      assertEquals(first.source, "INTERNAL_SERVICE_SECRET");
      assertEquals(first.key, "internal-secret");

      Deno.env.delete("INTERNAL_SERVICE_SECRET");
      const second = resolveInternalFunctionKeyWithSource();
      assertEquals(second.source, "SECRET_API_KEY");
      assertEquals(second.key, "secret-api-key");

      Deno.env.delete("SECRET_API_KEY");
      const third = resolveInternalFunctionKeyWithSource();
      assertEquals(third.source, "EDGE_FUNCTION_KEY");
      assertEquals(third.key, "edge-function-key");
    } finally {
      restoreEnv("SECRET_API_KEY", originalSecretApiKey);
      restoreEnv("EDGE_FUNCTION_KEY", originalEdgeFunctionKey);
      restoreEnv("INTERNAL_SERVICE_SECRET", originalInternalServiceSecret);
    }
  },
);
