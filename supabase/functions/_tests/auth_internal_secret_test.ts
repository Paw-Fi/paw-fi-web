/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

function restoreEnv(
  key: string,
  value: string | undefined,
) {
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
