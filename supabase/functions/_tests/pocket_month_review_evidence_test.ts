/// <reference lib="deno.ns" />

import {
  loadPocketReviewContactContext,
  loadPocketReviewEvidence,
  pocketReviewCycleKeys,
} from "../generate-pocket-month-review/review-evidence.ts";

type Row = Record<string, unknown>;
type Call = { table: string; operation: string; args: unknown[] };

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

async function rejects(action: () => unknown, message: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof Error && error.message.includes(message)) return;
    throw error;
  }
  throw new Error(`Expected rejection: ${message}`);
}

function fixture(
  options: {
    rows?: Row[];
    household?: Row | null;
    members?: Row[];
    contacts?: Row[];
    actor?: string | null;
    authError?: boolean;
    failTable?: string;
    pageFailure?: "error" | "missing" | "repeat";
    missingCount?: boolean;
  } = {},
) {
  const calls: Call[] = [];
  const tables: Record<string, Row[]> = {
    expenses: options.rows ?? [],
    households: options.household ? [options.household] : [],
    household_members: options.members ?? [],
    user_contacts: options.contacts ?? [],
  };
  const client = {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: {
            user:
              options.actor === null ? null : { id: options.actor ?? "actor" },
          },
          error: options.authError ? new Error("auth failed") : null,
        }),
    },
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      let single = false;
      let head = false;
      let limit = Infinity;
      let cursor = false;
      const orders: {
        column: string;
        ascending: boolean;
        nullsFirst?: boolean;
      }[] = [];
      const query = {
        select(...args: unknown[]) {
          calls.push({ table, operation: "select", args });
          head = (args[1] as { head?: boolean } | undefined)?.head === true;
          return query;
        },
        eq(column: string, value: unknown) {
          calls.push({ table, operation: "eq", args: [column, value] });
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        is(column: string, value: unknown) {
          calls.push({ table, operation: "is", args: [column, value] });
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        or(expression: string) {
          calls.push({ table, operation: "or", args: [expression] });
          equal(expression, "is_recurring.eq.false,is_recurring.is.null");
          rows = rows.filter(
            (row) => row.is_recurring === false || row.is_recurring === null,
          );
          return query;
        },
        gte(column: string, value: string) {
          calls.push({ table, operation: "gte", args: [column, value] });
          rows = rows.filter((row) => String(row[column]) >= value);
          return query;
        },
        lt(column: string, value: string) {
          calls.push({ table, operation: "lt", args: [column, value] });
          rows = rows.filter((row) => String(row[column]) < value);
          return query;
        },
        gt(column: string, value: string) {
          calls.push({ table, operation: "gt", args: [column, value] });
          cursor = true;
          if (options.pageFailure !== "repeat") {
            rows = rows.filter((row) => String(row[column]) > value);
          }
          return query;
        },
        order(
          column: string,
          settings: { ascending: boolean; nullsFirst?: boolean },
        ) {
          calls.push({ table, operation: "order", args: [column, settings] });
          orders.push({ column, ...settings });
          return query;
        },
        limit(value: number) {
          calls.push({ table, operation: "limit", args: [value] });
          limit = value;
          return query;
        },
        maybeSingle() {
          single = true;
          return query;
        },
        then(resolve: (value: unknown) => unknown) {
          if (
            options.failTable === table ||
            (table === "expenses" && cursor && options.pageFailure === "error")
          ) {
            return Promise.resolve({
              data: null,
              error: new Error("read failed"),
            }).then(resolve);
          }
          if (
            table === "expenses" &&
            cursor &&
            options.pageFailure === "missing"
          ) {
            return Promise.resolve({ data: null, error: null }).then(resolve);
          }
          rows.sort((a, b) => {
            for (const order of orders) {
              if (a[order.column] == null || b[order.column] == null) {
                if (a[order.column] == null && b[order.column] == null) {
                  continue;
                }
                return (
                  (a[order.column] == null ? -1 : 1) *
                  (order.nullsFirst ? 1 : -1)
                );
              }
              const comparison = String(a[order.column]).localeCompare(
                String(b[order.column]),
              );
              if (comparison) return comparison * (order.ascending ? 1 : -1);
            }
            return 0;
          });
          const page = rows.slice(
            0,
            Math.min(limit, table === "expenses" ? 2 : Infinity),
          );
          return Promise.resolve({
            data: head ? null : single ? (page[0] ?? null) : page,
            error: null,
            count: options.missingCount ? null : rows.length,
          }).then(resolve);
        },
      };
      return query;
    },
  };
  return {
    client: client as unknown as Parameters<typeof loadPocketReviewEvidence>[0],
    calls,
  };
}

function expense(id: string, overrides: Row = {}): Row {
  return {
    id,
    user_id: "actor",
    privacy_scope: "full",
    household_id: null,
    currency: "EUR",
    date: "2026-03-05",
    category: "食料品",
    type: "expense",
    amount_cents: 100,
    analytics_is_final: true,
    analytics_spending_multiplier: 1,
    analytics_counts_toward_income: false,
    is_recurring: false,
    deleted_at: null,
    description: "private",
    raw_text: "خاص",
    merchant: "private merchant",
    ...overrides,
  };
}

const personal = {
  scope: "personal" as const,
  householdId: null,
  currency: "EUR",
  cycleStart: "2026-03-01",
};

Deno.test(
  "cycle keys retain configured days 29-31 across clamped months and years",
  () => {
    for (const day of [29, 30, 31]) {
      equal(pocketReviewCycleKeys("2026-02-28", day), {
        previousCycleStart: `2026-01-${day}`,
        nextCycleStart: `2026-03-${day}`,
      });
    }
    equal(pocketReviewCycleKeys("2024-02-29", 31), {
      previousCycleStart: "2024-01-31",
      nextCycleStart: "2024-03-31",
    });
    equal(pocketReviewCycleKeys("2026-01-31", 31), {
      previousCycleStart: "2025-12-31",
      nextCycleStart: "2026-02-28",
    });
  },
);

Deno.test(
  "cycle keys reject invalid dates, anchors and configured days",
  async () => {
    for (const [date, day] of [
      ["2026-02-30", 30],
      ["2026-03-28", 31],
      ["2026-03-01x", 1],
      ["2026-03-01", 0],
      ["2026-03-01", 32],
      ["2026-03-01", 1.5],
    ] as const) {
      await rejects(() => pocketReviewCycleKeys(date, day), "cycle");
    }
  },
);

Deno.test(
  "evidence reads every eligible previous/current row without pockets or private text",
  async () => {
    const { client, calls } = fixture({
      rows: [
        expense("01", { date: "2026-01-31" }),
        expense("02", { date: "2026-02-01" }),
        expense("03", {
          date: "2026-02-28",
          amount_cents: "-50",
          analytics_spending_multiplier: -1,
        }),
        expense("04"),
        expense("05"),
        expense("06"),
        expense("07", {
          type: "income",
          amount_cents: "-900",
          analytics_spending_multiplier: 0,
          analytics_counts_toward_income: true,
        }),
        expense("08", {
          date: "2026-02-20",
          type: "income",
          amount_cents: 800,
          analytics_spending_multiplier: 0,
          analytics_counts_toward_income: true,
        }),
        expense("09", { currency: "USD" }),
        expense("10", { household_id: "shared" }),
        expense("11", { user_id: "other" }),
        expense("12", { is_recurring: true }),
        expense("13", { deleted_at: "2026-03-06" }),
        expense("14", { analytics_is_final: false }),
        expense("15", { analytics_spending_multiplier: 0 }),
        expense("16", { date: "2026-04-01" }),
        expense("17", {
          type: "income",
          analytics_spending_multiplier: 0,
          analytics_counts_toward_income: false,
        }),
        expense("18", {
          type: "income",
          analytics_spending_multiplier: -1,
          amount_cents: 20,
        }),
      ],
    });
    const result = await loadPocketReviewEvidence(client, "actor", personal, 1);
    equal(result.previousActuals, [
      {
        id: "02",
        type: "expense",
        date: "2026-02-01",
        category: "食料品",
        currency: "EUR",
        amount_cents: 100,
      },
      {
        id: "03",
        type: "expense",
        date: "2026-02-28",
        category: "食料品",
        currency: "EUR",
        amount_cents: -50,
      },
      {
        id: "08",
        type: "income",
        date: "2026-02-20",
        category: "食料品",
        currency: "EUR",
        amount_cents: 800,
      },
    ]);
    equal(
      result.currentActuals.map((row) => row.amount_cents),
      [100, 100, 100, 900, -20],
    );
    equal(result.currentActuals.at(-1)?.type, "expense");
    for (const row of [...result.currentActuals, ...result.previousActuals]) {
      equal(Object.keys(row).sort(), [
        "amount_cents",
        "category",
        "currency",
        "date",
        "id",
        "type",
      ]);
    }
    equal(result.currentRecordedIncomeCents, 900);
    equal(result.previousRecordedIncomeCents, 800);
    equal(result.space, { kind: "personal", name: null, member_count: 1 });
    equal(result.previousCycleStart, "2026-02-01");
    equal(result.nextCycleStart, "2026-04-01");
    equal([...new Set(calls.map((call) => call.table))], ["expenses"]);
    const selects = calls.filter((call) => call.operation === "select");
    for (const call of selects) {
      const columns = String(call.args[0])
        .split(",")
        .map((column) => column.trim());
      for (const denied of [
        "*",
        "description",
        "raw_text",
        "merchant",
        "contact_id",
      ]) {
        equal(columns.includes(denied), false);
      }
    }
    equal(
      calls.some((call) => call.operation === "gt"),
      true,
    );
  },
);

Deno.test(
  "contact order matches financial helpers before updated time and ID",
  async () => {
    const contact = (
      id: string,
      created_at: string | null,
      updated_at: string | null,
      day: number,
    ) => ({
      id,
      user_id: "actor",
      created_at,
      updated_at,
      financial_month_start_day: day,
    });
    const contacts = [
      contact("99", "2026-01-01", "2026-10-01", 1),
      contact("98", null, "2026-11-01", 2),
      contact("97", "2026-02-01", null, 3),
      contact("96", "2026-02-01", "2026-02-02", 4),
      contact("95", "2026-02-01", "2026-02-03", 5),
      contact("94", "2026-02-01", "2026-02-03", 6),
    ];
    const { client, calls } = fixture({ contacts });
    equal(
      (await loadPocketReviewContactContext(client, "actor"))
        .financial_month_start_day,
      5,
    );
    equal(
      calls
        .filter((call) => call.operation === "order")
        .map((call) => call.args),
      [
        ["created_at", { ascending: false, nullsFirst: false }],
        ["updated_at", { ascending: false, nullsFirst: false }],
        ["id", { ascending: false }],
      ],
    );
  },
);

Deno.test(
  "uppercase household UUID uses canonical lower-case queries in both Space kinds",
  async () => {
    const id = "abcdefab-1234-4567-89ab-abcdef123456";
    for (const scope of ["portfolio", "household"] as const) {
      const { client, calls } = fixture({
        household: {
          id,
          is_portfolio: scope === "portfolio",
          owner_id: "actor",
        },
        members: [{ household_id: id, user_id: "actor" }],
        rows: [expense("01", { household_id: id })],
      });
      const result = await loadPocketReviewEvidence(
        client,
        "actor",
        {
          ...personal,
          scope,
          householdId: id.toUpperCase(),
        },
        1,
      );
      equal(result.currentActuals.length, 1);
      for (const call of calls.filter(
        (call) =>
          call.operation === "eq" &&
          (call.args[0] === "household_id" || call.table === "households"),
      )) {
        equal(call.args[1], id);
      }
    }
  },
);

Deno.test(
  "shared evidence redacts foreign balances-only rows and excludes foreign private rows",
  async () => {
    const rows = [
      expense("01", { privacy_scope: "private" }),
      expense("02", { privacy_scope: "balances_only" }),
      expense("03", { user_id: "other", privacy_scope: "full" }),
      expense("04", {
        user_id: "other",
        privacy_scope: "balances_only",
        analytics_spending_multiplier: -1,
      }),
      expense("05", { user_id: "other", privacy_scope: "private" }),
      expense("06", { user_id: "other", privacy_scope: null }),
      expense("07", {
        user_id: "other",
        privacy_scope: "balances_only",
        date: "2026-02-15",
        analytics_spending_multiplier: 0,
        analytics_counts_toward_income: true,
      }),
      expense("08", {
        user_id: "other",
        privacy_scope: "private",
        analytics_spending_multiplier: 0,
        analytics_counts_toward_income: true,
      }),
    ].map((row) => ({ ...row, household_id: "space" }));
    const { client, calls } = fixture({
      rows,
      household: { id: "space", is_portfolio: false, owner_id: "actor" },
      members: [{ household_id: "space", user_id: "actor" }],
    });
    const result = await loadPocketReviewEvidence(
      client,
      "actor",
      { ...personal, scope: "household", householdId: "space" },
      1,
    );
    equal(
      result.currentActuals.map((row) => [
        row.id,
        row.category,
        row.amount_cents,
      ]),
      [
        ["01", "食料品", 100],
        ["02", "食料品", 100],
        ["03", "食料品", 100],
        ["04", "uncategorized", -100],
      ],
    );
    equal(result.previousActuals, [
      {
        id: "07",
        type: "income",
        date: "2026-02-15",
        category: "uncategorized",
        currency: "EUR",
        amount_cents: 100,
      },
    ]);
    equal(result.currentRecordedIncomeCents, 0);
    equal(result.previousRecordedIncomeCents, 100);
    for (const row of [...result.currentActuals, ...result.previousActuals]) {
      equal(Object.keys(row).sort(), [
        "amount_cents",
        "category",
        "currency",
        "date",
        "id",
        "type",
      ]);
      equal(
        Object.values(row).includes("actor") ||
          Object.values(row).includes("other"),
        false,
      );
    }
    for (const call of calls.filter(
      (call) => call.table === "expenses" && call.operation === "select",
    )) {
      const columns = String(call.args[0])
        .split(",")
        .map((column) => column.trim());
      equal(
        columns.includes("user_id") && columns.includes("privacy_scope"),
        true,
      );
    }
  },
);

Deno.test(
  "evidence uses configured clamped bounds rather than all history",
  async () => {
    const { client } = fixture({
      rows: [
        expense("01", { date: "2026-01-30" }),
        expense("02", { date: "2026-01-31" }),
        expense("03", { date: "2026-02-28" }),
        expense("04", { date: "2026-03-30" }),
        expense("05", { date: "2026-03-31" }),
      ],
    });
    const result = await loadPocketReviewEvidence(
      client,
      "actor",
      { ...personal, cycleStart: "2026-02-28" },
      31,
    );
    equal(
      result.previousActuals.map((row) => row.date),
      ["2026-01-31"],
    );
    equal(
      result.currentActuals.map((row) => row.date),
      ["2026-02-28", "2026-03-30"],
    );
  },
);

Deno.test(
  "portfolio is owner-only and shared evidence includes RLS-visible members' rows",
  async () => {
    for (const scope of ["portfolio", "household"] as const) {
      const { client, calls } = fixture({
        household: {
          id: "space",
          name: "منزل",
          is_portfolio: scope === "portfolio",
          owner_id: "actor",
        },
        members: [
          { household_id: "space", user_id: "actor" },
          { household_id: "space", user_id: "other" },
        ],
        rows: [
          expense("01", { household_id: "space" }),
          expense("02", { household_id: "space", user_id: "other" }),
          expense("03"),
        ],
      });
      const result = await loadPocketReviewEvidence(
        client,
        "actor",
        { ...personal, scope, householdId: "space" },
        1,
      );
      equal(result.currentActuals.length, scope === "portfolio" ? 1 : 2);
      equal(result.space, { kind: scope, name: "منزل", member_count: 2 });
      const financialOwnerFilter = calls.some(
        (call) =>
          call.table === "expenses" &&
          call.operation === "eq" &&
          call.args[0] === "user_id",
      );
      equal(financialOwnerFilter, scope === "portfolio");
      equal(
        calls.some(
          (call) =>
            call.table === "household_members" &&
            call.operation === "select" &&
            JSON.stringify(call.args[1]) ===
              JSON.stringify({ count: "exact", head: true }),
        ),
        true,
      );
    }
  },
);

Deno.test(
  "invalid scope, kind, ownership, membership and actor fail before financial reads",
  async () => {
    const cases = [
      { input: { ...personal, householdId: "space" } },
      { input: { ...personal, scope: "household" as const } },
      { actor: "other", input: personal },
      { actor: null, input: personal },
      { authError: true, input: personal },
      {
        input: {
          ...personal,
          scope: "portfolio" as const,
          householdId: "space",
        },
      },
      {
        household: { id: "space", is_portfolio: true, owner_id: "other" },
        input: {
          ...personal,
          scope: "portfolio" as const,
          householdId: "space",
        },
      },
      {
        household: { id: "space", is_portfolio: false, owner_id: "actor" },
        input: {
          ...personal,
          scope: "portfolio" as const,
          householdId: "space",
        },
      },
      {
        household: { id: "space", is_portfolio: true, owner_id: "actor" },
        input: {
          ...personal,
          scope: "household" as const,
          householdId: "space",
        },
      },
      {
        household: { id: "space", is_portfolio: false, owner_id: "actor" },
        input: {
          ...personal,
          scope: "household" as const,
          householdId: "space",
        },
      },
      { input: { ...personal, currency: "EUR,USD" } },
      { input: { ...personal, scope: "invalid" as "personal" } },
    ];
    for (const item of cases) {
      const { client, calls } = fixture(item);
      await rejects(
        () => loadPocketReviewEvidence(client, "actor", item.input, 1),
        "review",
      );
      equal(
        calls.some((call) => call.table === "expenses"),
        false,
      );
    }
  },
);

Deno.test(
  "evidence rejects incomplete, failed and repeated pages rather than returning subsets",
  async () => {
    for (const pageFailure of ["error", "missing", "repeat"] as const) {
      const { client } = fixture({
        rows: [expense("01"), expense("02"), expense("03")],
        pageFailure,
      });
      await rejects(
        () => loadPocketReviewEvidence(client, "actor", personal, 1),
        pageFailure === "error"
          ? "read failed"
          : pageFailure === "missing"
            ? "page missing"
            : "cursor",
      );
    }
  },
);

Deno.test(
  "scope context read failures and missing counts fail closed",
  async () => {
    for (const failTable of ["households", "household_members"]) {
      const { client } = fixture({
        failTable,
        household: { id: "space", is_portfolio: false, owner_id: "actor" },
        members: [{ household_id: "space", user_id: "actor" }],
      });
      await rejects(
        () =>
          loadPocketReviewEvidence(
            client,
            "actor",
            { ...personal, scope: "household", householdId: "space" },
            1,
          ),
        "read failed",
      );
    }
    const { client } = fixture({
      household: { id: "space", is_portfolio: true, owner_id: "actor" },
      missingCount: true,
    });
    await rejects(
      () =>
        loadPocketReviewEvidence(
          client,
          "actor",
          { ...personal, scope: "portfolio", householdId: "space" },
          1,
        ),
      "review",
    );
  },
);

Deno.test(
  "latest contact uses only verified preferences and no invented country",
  async () => {
    const { client, calls } = fixture({
      contacts: [
        {
          user_id: "actor",
          id: "99",
          updated_at: "2026-01-01",
          preferred_language: "en",
          preferred_timezone: "Europe/Paris",
          financial_month_start_day: 1,
        },
        {
          user_id: "actor",
          id: "02",
          updated_at: "2026-02-01",
          preferred_language: "ur",
          preferred_timezone: "Asia/Karachi",
          financial_month_start_day: 31,
          country: "invented",
        },
        {
          user_id: "other",
          id: "03",
          updated_at: "2026-03-01",
          preferred_language: "ja",
        },
      ],
    });
    equal(await loadPocketReviewContactContext(client, "actor"), {
      preferred_language: "ur",
      preferred_timezone: "Asia/Karachi",
      financial_month_start_day: 31,
    });
    equal(
      calls.find((call) => call.operation === "select")?.args[0],
      "preferred_language, preferred_timezone, financial_month_start_day",
    );
    equal(await loadPocketReviewContactContext(fixture().client, "actor"), {
      preferred_language: null,
      preferred_timezone: null,
      financial_month_start_day: 1,
    });
    await rejects(
      () =>
        loadPocketReviewContactContext(
          fixture({ failTable: "user_contacts" }).client,
          "actor",
        ),
      "read failed",
    );
    await rejects(
      () =>
        loadPocketReviewContactContext(
          fixture({ actor: "other" }).client,
          "actor",
        ),
      "review",
    );
  },
);

Deno.test(
  "empty evidence stays empty and unsafe cent amounts fail closed",
  async () => {
    const result = await loadPocketReviewEvidence(
      fixture().client,
      "actor",
      personal,
      1,
    );
    equal(result.currentActuals, []);
    equal(result.previousActuals, []);
    equal(result.currentRecordedIncomeCents, 0);
    equal(result.previousRecordedIncomeCents, 0);
    for (const rows of [
      [expense("01", { amount_cents: 1.5 })],
      [expense("01", { amount_cents: Number.MAX_SAFE_INTEGER + 1 })],
      [
        expense("01", {
          amount_cents: Number.MAX_SAFE_INTEGER,
          analytics_spending_multiplier: 0,
          analytics_counts_toward_income: true,
        }),
        expense("02", {
          analytics_spending_multiplier: 0,
          analytics_counts_toward_income: true,
        }),
      ],
    ]) {
      await rejects(
        () =>
          loadPocketReviewEvidence(
            fixture({ rows }).client,
            "actor",
            personal,
            1,
          ),
        "review",
      );
    }
  },
);

Deno.test(
  "shared non-owner membership is sufficient, count failures are not empty counts",
  async () => {
    const options = {
      household: {
        id: "space",
        name: null,
        is_portfolio: false,
        owner_id: "other",
      },
      members: [{ household_id: "space", user_id: "actor" }],
    };
    const input = {
      ...personal,
      scope: "household" as const,
      householdId: "space",
    };
    equal(
      (
        await loadPocketReviewEvidence(
          fixture(options).client,
          "actor",
          input,
          1,
        )
      ).space,
      { kind: "household", name: null, member_count: 1 },
    );
    await rejects(
      () =>
        loadPocketReviewEvidence(
          fixture({ ...options, missingCount: true }).client,
          "actor",
          input,
          1,
        ),
      "member count",
    );
  },
);

Deno.test(
  "contact preferences preserve stored timezone without mapping or locale guessing",
  async () => {
    equal(
      await loadPocketReviewContactContext(
        fixture({
          contacts: [
            {
              user_id: "actor",
              id: "01",
              updated_at: "2026-03-01",
              preferred_language: "ja-JP",
              preferred_timezone: "UTC+05:30",
              financial_month_start_day: 29,
            },
          ],
        }).client,
        "actor",
      ),
      {
        preferred_language: "ja-JP",
        preferred_timezone: "UTC+05:30",
        financial_month_start_day: 29,
      },
    );
    await rejects(
      () =>
        loadPocketReviewContactContext(
          fixture({
            contacts: [
              {
                user_id: "actor",
                financial_month_start_day: 32,
              },
            ],
          }).client,
          "actor",
        ),
      "cycle configuration",
    );
  },
);

Deno.test(
  "nullable legacy recurring flags are actuals, true flags are templates",
  async () => {
    const { client } = fixture({
      rows: [
        expense("01", { is_recurring: null }),
        expense("02", { is_recurring: true }),
        expense("03", {
          is_recurring: null,
          analytics_spending_multiplier: 0,
          analytics_counts_toward_income: true,
        }),
      ],
    });
    const result = await loadPocketReviewEvidence(client, "actor", personal, 1);
    equal(
      result.currentActuals.map((row) => row.type),
      ["expense", "income"],
    );
    equal(result.currentRecordedIncomeCents, 100);
  },
);
