/// <reference lib="deno.ns" />

import {
  handleUpdateFinancialMonthStartDayRequest,
  normalizeFinancialMonthStartDay,
} from "../shared/financial-month-start-day.ts";

function assertEquals(actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, got ${actualJson}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function readJson(response: Response) {
  return JSON.parse(await response.text());
}

function request(body: unknown, method = "POST") {
  return new Request("http://localhost/update-financial-month-start-day", {
    method,
    body: JSON.stringify(body),
  });
}

class FakeUserContactsTable {
  calls: Array<{ method: string; args: unknown[] }> = [];
  selectResult = { data: [] as unknown[], error: null as unknown };
  upsertResult = { data: { id: "contact-created" }, error: null as unknown };
  updateError: unknown = null;
  private isUpdate = false;

  select(columns: string) {
    this.calls.push({ method: "select", args: [columns] });
    return this;
  }

  eq(column: string, value: string) {
    this.calls.push({ method: "eq", args: [column, value] });
    if (this.isUpdate) {
      this.isUpdate = false;
      return Promise.resolve({ error: this.updateError });
    }
    return this;
  }

  order(column: string, options: { ascending: boolean; nullsFirst?: boolean }) {
    this.calls.push({ method: "order", args: [column, options] });
    return this;
  }

  limit(count: number) {
    this.calls.push({ method: "limit", args: [count] });
    return Promise.resolve(this.selectResult);
  }

  upsert(values: unknown, options: unknown) {
    this.calls.push({ method: "upsert", args: [values, options] });
    return this;
  }

  update(values: unknown) {
    this.calls.push({ method: "update", args: [values] });
    this.isUpdate = true;
    return this;
  }

  single() {
    this.calls.push({ method: "single", args: [] });
    return Promise.resolve(this.upsertResult);
  }
}

class FakeSupabase {
  table = new FakeUserContactsTable();
  fromCalls: string[] = [];

  from(table: string) {
    this.fromCalls.push(table);
    assertEquals(table, "user_contacts");
    return this.table;
  }
}

Deno.test("normalizeFinancialMonthStartDay accepts default-compatible values", () => {
  assertEquals(normalizeFinancialMonthStartDay(1), 1);
  assertEquals(normalizeFinancialMonthStartDay("25"), 25);
  assertEquals(normalizeFinancialMonthStartDay(31), 31);
  assertEquals(normalizeFinancialMonthStartDay(0), null);
  assertEquals(normalizeFinancialMonthStartDay(32), null);
  assertEquals(normalizeFinancialMonthStartDay("2.5"), null);
});

Deno.test("update financial month start rejects invalid days before auth", async () => {
  let authCalls = 0;
  const response = await handleUpdateFinancialMonthStartDayRequest(
    request({ userId: "user-1", financialMonthStartDay: 32 }),
    {
      supabase: new FakeSupabase(),
      authenticate: async () => {
        authCalls++;
        return { success: true, userId: "user-1" };
      },
    },
  );

  assertEquals(response.status, 400);
  assertEquals(
    (await readJson(response)).error,
    "'financialMonthStartDay' must be an integer from 1 to 31",
  );
  assertEquals(authCalls, 0);
});

Deno.test("update financial month start requires authentication", async () => {
  const supabase = new FakeSupabase();
  const response = await handleUpdateFinancialMonthStartDayRequest(
    request({ userId: "user-1", financialMonthStartDay: 25 }),
    {
      supabase,
      authenticate: async () => ({
        success: false,
        error: "Unauthorized",
        statusCode: 401,
      }),
    },
  );

  assertEquals(response.status, 401);
  assertEquals((await readJson(response)).error, "Unauthorized");
  assertEquals(supabase.table.calls, []);
});

Deno.test("update financial month start creates missing authenticated user contact", async () => {
  const supabase = new FakeSupabase();
  const response = await handleUpdateFinancialMonthStartDayRequest(
    request({ userId: "spoofed-user", financialMonthStartDay: "25" }),
    {
      supabase,
      authenticate: async () => ({ success: true, userId: "user-1" }),
      now: () => new Date("2026-07-09T12:00:00Z"),
    },
  );

  assertEquals(response.status, 200);
  assertEquals(await readJson(response), {
    ok: true,
    results: { contactId: "contact-created", financialMonthStartDay: 25 },
  });
  assertEquals(supabase.table.calls, [
    {
      method: "select",
      args: ["id, user_id, financial_month_start_day"],
    },
    { method: "eq", args: ["user_id", "user-1"] },
    {
      method: "order",
      args: ["created_at", { ascending: false, nullsFirst: false }],
    },
    {
      method: "order",
      args: ["updated_at", { ascending: false, nullsFirst: false }],
    },
    { method: "order", args: ["id", { ascending: false }] },
    { method: "limit", args: [1] },
    {
      method: "upsert",
      args: [
        {
          user_id: "user-1",
          financial_month_start_day: 25,
          updated_at: "2026-07-09T12:00:00.000Z",
        },
        { onConflict: "user_id" },
      ],
    },
    { method: "select", args: ["id"] },
    { method: "single", args: [] },
    {
      method: "update",
      args: [{ financial_month_start_day: 25 }],
    },
    { method: "eq", args: ["user_id", "user-1"] },
  ]);
});

Deno.test("update financial month start updates existing authenticated user contact", async () => {
  const supabase = new FakeSupabase();
  supabase.table.selectResult = {
    data: [{ id: "contact-existing", user_id: "user-1" }],
    error: null,
  };

  const response = await handleUpdateFinancialMonthStartDayRequest(
    request({ userId: "user-1", financialMonthStartDay: 31 }),
    {
      supabase,
      authenticate: async () => ({ success: true, userId: "user-1" }),
    },
  );

  assertEquals(response.status, 200);
  assertEquals(await readJson(response), {
    ok: true,
    results: { contactId: "contact-existing", financialMonthStartDay: 31 },
  });
  assert(
    !supabase.table.calls.some((call) => call.method === "upsert"),
    "existing contact should not be upserted",
  );
  assertEquals(
    supabase.table.calls.slice(-2),
    [
      {
        method: "update",
        args: [{ financial_month_start_day: 31 }],
      },
      { method: "eq", args: ["user_id", "user-1"] },
    ],
  );
});

Deno.test("update financial month start creates missing internal phone contact", async () => {
  const supabase = new FakeSupabase();
  const response = await handleUpdateFinancialMonthStartDayRequest(
    request({ phone: "+15551234567", financialMonthStartDay: 25 }),
    {
      supabase,
      authenticate: async () => ({ success: true, isInternalService: true }),
      now: () => new Date("2026-07-09T12:00:00Z"),
    },
  );

  assertEquals(response.status, 200);
  assertEquals(supabase.table.calls, [
    {
      method: "select",
      args: ["id, user_id, financial_month_start_day"],
    },
    { method: "eq", args: ["phone_e164", "+15551234567"] },
    {
      method: "order",
      args: ["created_at", { ascending: false, nullsFirst: false }],
    },
    {
      method: "order",
      args: ["updated_at", { ascending: false, nullsFirst: false }],
    },
    { method: "order", args: ["id", { ascending: false }] },
    { method: "limit", args: [1] },
    {
      method: "upsert",
      args: [
        {
          phone_e164: "+15551234567",
          user_id: null,
          financial_month_start_day: 25,
          updated_at: "2026-07-09T12:00:00.000Z",
        },
        { onConflict: "phone_e164" },
      ],
    },
    { method: "select", args: ["id"] },
    { method: "single", args: [] },
    {
      method: "update",
      args: [{ financial_month_start_day: 25 }],
    },
    { method: "eq", args: ["id", "contact-created"] },
  ]);
});
