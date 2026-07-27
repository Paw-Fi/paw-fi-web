/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { resolveDefaultAccountIdStrict } from "../shared/accounts.ts";

Deno.test("strict default account resolution returns the RPC account", async () => {
  const supabase = {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => {
      assertEquals(name, "resolve_default_account");
      assertEquals(args, {
        p_user_id: "user-1",
        p_household_id: null,
        p_currency: null,
      });
      return Promise.resolve({ data: "account-1", error: null });
    },
  };

  assertEquals(
    await resolveDefaultAccountIdStrict(supabase as never, {
      userId: "user-1",
      householdId: null,
    }),
    "account-1",
  );
});

Deno.test("strict default account resolution propagates RPC failures", async () => {
  const databaseError = new Error("database unavailable");
  const supabase = {
    rpc: () => Promise.resolve({ data: null, error: databaseError }),
  };

  await assertRejects(
    () =>
      resolveDefaultAccountIdStrict(supabase as never, {
        userId: "user-1",
        householdId: null,
      }),
    Error,
    "database unavailable",
  );
});
