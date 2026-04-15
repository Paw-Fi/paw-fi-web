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
  const originalSecretApiKey = Deno.env.get(
    "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
  );

  try {
    Deno.env.set("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", "first-secret");

    const { authenticateInternalSecret } = await import(
      `../shared/auth.ts?test=${crypto.randomUUID()}`
    );

    const first = await authenticateInternalSecret(
      new Request("http://localhost", {
        headers: { "X-Moneko-Internal-Key": "first-secret" },
      }),
    );
    assertEquals(first.success, true);

    Deno.env.set("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", "rotated-secret");

    const second = await authenticateInternalSecret(
      new Request("http://localhost", {
        headers: { "X-Moneko-Internal-Key": "rotated-secret" },
      }),
    );
    assertEquals(second.success, true);
  } finally {
    restoreEnv("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", originalSecretApiKey);
  }
});

Deno.test(
  "authenticateInternalSecret accepts legacy X-Internal-Service-Secret header",
  async () => {
    const originalSecretApiKey = Deno.env.get(
      "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
    );

    try {
      Deno.env.set("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", "legacy-secret");

      const { authenticateInternalSecret } = await import(
        `../shared/auth.ts?test=${crypto.randomUUID()}`
      );

      const result = await authenticateInternalSecret(
        new Request("http://localhost", {
          headers: { "X-Internal-Service-Secret": "legacy-secret" },
        }),
      );

      assertEquals(result.success, true);
      assertEquals(result.isInternalService, true);
    } finally {
      restoreEnv("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", originalSecretApiKey);
    }
  },
);

Deno.test(
  "resolveInternalFunctionKey prefers SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
  async () => {
    const originalSecretApiKey = Deno.env.get(
      "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
    );

    try {
      Deno.env.set("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", "secret-api-key");

      const { resolveInternalFunctionKey } = await import(
        `../shared/auth.ts?test=${crypto.randomUUID()}`
      );

      assertEquals(resolveInternalFunctionKey(), "secret-api-key");

      Deno.env.delete("SECRET_SUPABASE_SERVICE_ROLE_API_KEY");
      assertEquals(resolveInternalFunctionKey(), "");
    } finally {
      restoreEnv("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", originalSecretApiKey);
    }
  },
);

Deno.test(
  "resolveInternalFunctionKeyWithSource reports selected source",
  async () => {
    const originalSecretApiKey = Deno.env.get(
      "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
    );

    try {
      Deno.env.set("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", "secret-api-key");

      const { resolveInternalFunctionKeyWithSource } = await import(
        `../shared/auth.ts?test=${crypto.randomUUID()}`
      );

      const first = resolveInternalFunctionKeyWithSource();
      assertEquals(first.source, "SECRET_SUPABASE_SERVICE_ROLE_API_KEY");
      assertEquals(first.key, "secret-api-key");

      Deno.env.delete("SECRET_SUPABASE_SERVICE_ROLE_API_KEY");
      const second = resolveInternalFunctionKeyWithSource();
      assertEquals(second.source, "none");
      assertEquals(second.key, "");
    } finally {
      restoreEnv("SECRET_SUPABASE_SERVICE_ROLE_API_KEY", originalSecretApiKey);
    }
  },
);
