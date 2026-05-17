import { fetchLatestUserContact } from "../shared/user-contacts.ts";

function assertEquals(actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, got ${actualJson}`);
  }
}

class FakeUserContactsQuery {
  calls: Array<{ method: string; args: unknown[] }> = [];

  select(columns: string) {
    this.calls.push({ method: "select", args: [columns] });
    return this;
  }

  eq(column: string, value: string) {
    this.calls.push({ method: "eq", args: [column, value] });
    return this;
  }

  order(column: string, options: { ascending: boolean; nullsFirst?: boolean }) {
    this.calls.push({ method: "order", args: [column, options] });
    return this;
  }

  limit(count: number) {
    this.calls.push({ method: "limit", args: [count] });
    return this;
  }

  maybeSingle() {
    this.calls.push({ method: "maybeSingle", args: [] });
    return Promise.resolve({
      data: {
        id: "d70257c0-4cf2-452d-a88e-843f79eb3078",
        preferred_currency: "USD",
      },
      error: null,
    });
  }
}

Deno.test("fetchLatestUserContact limits duplicate user contacts to the newest row", async () => {
  const query = new FakeUserContactsQuery();
  const supabase = {
    from(table: string) {
      assertEquals(table, "user_contacts");
      return query;
    },
  };

  const result = await fetchLatestUserContact(
    supabase,
    "0eacf25a-e5ac-475e-9665-4d22e49d1b3a",
  );

  assertEquals(result.data, {
    id: "d70257c0-4cf2-452d-a88e-843f79eb3078",
    preferred_currency: "USD",
  });
  assertEquals(query.calls, [
    { method: "select", args: ["id, preferred_currency"] },
    {
      method: "eq",
      args: ["user_id", "0eacf25a-e5ac-475e-9665-4d22e49d1b3a"],
    },
    {
      method: "order",
      args: ["updated_at", { ascending: false, nullsFirst: false }],
    },
    {
      method: "order",
      args: ["created_at", { ascending: false, nullsFirst: false }],
    },
    { method: "order", args: ["id", { ascending: false }] },
    { method: "limit", args: [1] },
    { method: "maybeSingle", args: [] },
  ]);
});
