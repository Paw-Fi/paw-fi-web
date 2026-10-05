import { authenticateUserOrInternalSecret } from "../shared/auth.ts";

function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("wallet authentication rejects a missing bearer before user lookup", async () => {
  let lookups = 0;
  const client = {
    from: () => {
      throw new Error("No database access before authentication");
    },
    auth: {
      getUser: (_token: string) => {
        lookups++;
        return Promise.resolve({ data: { user: null }, error: null });
      },
    },
  };
  const result = await authenticateUserOrInternalSecret(
    new Request("http://localhost/list-wallets"),
    client,
  );
  assertEqual(result.success, false);
  assertEqual(result.statusCode, 401);
  assertEqual(lookups, 0);
});

Deno.test("wallet authentication rejects a token denied by Supabase Auth", async () => {
  let seenToken: string | undefined;
  const client = {
    from: () => {
      throw new Error("No database access before authentication");
    },
    auth: {
      getUser: (token: string) => {
        seenToken = token;
        return Promise.resolve({
          data: { user: null },
          error: { message: "Expired token" },
        });
      },
    },
  };
  const result = await authenticateUserOrInternalSecret(
    new Request("http://localhost/list-wallets", {
      headers: { Authorization: "Bearer rejected-token" },
    }),
    client,
  );
  assertEqual(seenToken, "rejected-token");
  assertEqual(result.success, false);
  assertEqual(result.statusCode, 401);
});

Deno.test("wallet authentication uses the verified actor instead of a body user ID", async () => {
  let seenToken: string | undefined;
  const client = {
    from: () => {
      throw new Error("No database access before authentication");
    },
    auth: {
      getUser: (token: string) => {
        seenToken = token;
        return Promise.resolve({
          data: { user: { id: "verified-user" } },
          error: null,
        });
      },
    },
  };
  const result = await authenticateUserOrInternalSecret(
    new Request("http://localhost/list-wallets", {
      method: "POST",
      headers: { Authorization: "Bearer signed-user-token" },
      body: JSON.stringify({ userId: "another-user" }),
    }),
    client,
  );
  assertEqual(seenToken, "signed-user-token");
  assertEqual(result.success, true);
  assertEqual(result.userId, "verified-user");
  assertEqual(result.isInternalService, undefined);
});
