/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { createEmailImportAccountResolver } from "../shared/email-import-account.ts";

const personalAccountId = "11111111-1111-4111-8111-111111111111";
const householdAccountId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

class FakeAccountQuery {
  constructor(private readonly account: Record<string, unknown> | null) {}

  select(_columns: string) {
    return this;
  }

  eq(_column: string, _value: unknown) {
    return this;
  }

  async maybeSingle() {
    return { data: this.account, error: null };
  }
}

class FakeSupabase {
  constructor(private readonly account: Record<string, unknown> | null) {}

  from(table: string) {
    if (table !== "accounts") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return new FakeAccountQuery(this.account);
  }
}

Deno.test(
  "email import account resolver: retains the selected account only for its personal currency",
  async () => {
    const resolveAccountId = createEmailImportAccountResolver({
      supabase: new FakeSupabase({
        id: personalAccountId,
        user_id: userId,
        household_id: null,
        currency: "CNY",
        is_archived: false,
      }) as any,
      userId,
      householdId: null,
      accountId: personalAccountId,
    });

    assertEquals(await resolveAccountId("CNY"), personalAccountId);
    assertEquals(await resolveAccountId("USD"), null);
  },
);

Deno.test(
  "email import account resolver: omits an account from a different scope",
  async () => {
    const resolveAccountId = createEmailImportAccountResolver({
      supabase: new FakeSupabase({
        id: householdAccountId,
        user_id: userId,
        household_id: "44444444-4444-4444-8444-444444444444",
        currency: "CNY",
        is_archived: false,
      }) as any,
      userId,
      householdId: null,
      accountId: householdAccountId,
    });

    assertEquals(await resolveAccountId("CNY"), null);
  },
);
