import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { formatMoney } from "../supabase/functions/shared/currency-symbols.ts";
import { householdSpendingEffectCents } from "../supabase/functions/shared/household-summary-economics.ts";
import { readWalletLedgerPages } from "../supabase/functions/shared/wallet-ledger-pages.ts";
import {
  createNotificationTranslator,
  localizeNotificationCategory,
  notificationCatalogs,
} from "../supabase/functions/shared/notification-localization.ts";
import messages from "../supabase/functions/shared/notification-translations.json" with {
  type: "json",
};

function extract(path, names) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const functions = ast.statements.filter((node) =>
    ts.isFunctionDeclaration(node) && names.includes(node.name?.text)
  );
  assert.equal(functions.length, names.length);
  return ts.transpileModule(
    functions.map((node) => node.getText(ast)).join("\n"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    },
  ).outputText;
}
const code = extract("../supabase/functions/save-wallet-transaction/index.ts", [
  "requireWalletNotificationCents",
  "normalizePocketCategory",
  "resolveWalletBudgetScope",
  "applyWalletScopeFilter",
  "buildWalletPocketInsight",
  "buildWalletPocketNotificationMessage",
  "formatCurrencyAmount",
  "formatWalletNotificationCategory",
]);
const cycleCode = extract("../supabase/functions/shared/budgets-helpers.ts", [
  "normalizeFinancialMonthStartDay",
  "lastDayOfMonthUtc",
  "cycleStartForYearMonthUtc",
  "financialCycleStartForDateUtc",
  "parseFinancialPeriodRangeUtc",
  "resolveFinancialMonthStartDay",
  "resolveFinancialPeriodRangeForUser",
]).replaceAll(
  'Object.defineProperty(exports, "__esModule", { value: true });',
  "",
);
const base = {
  userId: "actor",
  householdId: "space",
  isPortfolio: false,
  currency: "EUR",
  category: "groceries",
  dateYmd: "2026-10-17",
};
const budget = {
  id: "budget",
  user_id: "actor",
  household_id: "space",
  currency: "EUR",
  period_month: "2026-10-01",
  total_budget_cents: 100000,
};
const pocket = {
  id: "pocket",
  user_id: "actor",
  household_id: "space",
  budget_id: "budget",
  currency: "EUR",
  name: "家族 {0} $&",
  budget_amount_cents: 50000,
};
function expense(amount, extra = {}) {
  return {
    id: "0001",
    user_id: "actor",
    household_id: "space",
    currency: "EUR",
    amount_cents: amount,
    category: "groceries",
    date: "2026-10-17",
    deleted_at: null,
    is_recurring: false,
    privacy_scope: "full",
    analytics_is_final: true,
    analytics_spending_multiplier: 1,
    ...extra,
  };
}

function fixture(options = {}) {
  const calls = [];
  const tables = {
    user_contacts: [{
      id: 1,
      user_id: "actor",
      financial_month_start_day: options.startDay ?? 1,
    }],
    budgets: options.budgets ?? [budget],
    budget_envelopes: options.pockets ?? [],
    envelope_allocations: options.allocations ?? [],
    envelope_category_links: options.links ??
      [{ envelope_id: "pocket", category: "groceries" }],
    expenses: options.expenses ?? [expense(25000)],
  };
  const client = {
    from(table) {
      const filters = [], orders = [];
      let selected, size = Infinity, recurringOnly = false;
      const query = {
        select(value) {
          selected = value.split(",").map((x) => x.trim());
          return query;
        },
        eq(key, value) {
          filters.push((row) => row[key] === value);
          return query;
        },
        is(key, value) {
          filters.push((row) => (row[key] ?? null) === value);
          return query;
        },
        gte(key, value) {
          filters.push((row) => row[key] >= value);
          return query;
        },
        lt(key, value) {
          filters.push((row) => row[key] < value);
          return query;
        },
        gt(key, value) {
          filters.push((row) => row[key] > value);
          return query;
        },
        in(key, values) {
          filters.push((row) => values.includes(row[key]));
          return query;
        },
        or(value) {
          assert.equal(value, "is_recurring.eq.false,is_recurring.is.null");
          recurringOnly = true;
          return query;
        },
        order(key, { ascending }) {
          orders.push([key, ascending]);
          return query;
        },
        limit(value) {
          size = value;
          return query;
        },
        maybeSingle() {
          return execute(true);
        },
        then(resolve, reject) {
          return execute(false).then(resolve, reject);
        },
      };
      function execute(single) {
        const page = calls.filter((call) => call.table === table).length;
        calls.push({ table, selected, page });
        if (options.errorTable === table && page >= (options.errorPage ?? 0)) {
          return Promise.resolve({
            data: null,
            error: new Error(`failed ${table}`),
          });
        }
        let rows = tables[table].filter((row) =>
          filters.every((filter) => filter(row)) &&
          (!recurringOnly || row.is_recurring !== true)
        );
        for (const [key, asc] of orders.toReversed()) {
          rows = rows.toSorted((a, b) =>
            (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (asc ? 1 : -1)
          );
        }
        rows = rows.slice(0, Math.min(size, options.pageSize ?? Infinity)).map(
          (row) => Object.fromEntries(selected.map((key) => [key, row[key]])),
        );
        if (single && rows.length > 1) {
          return Promise.resolve({
            data: null,
            error: new Error("ambiguous budget"),
          });
        }
        return Promise.resolve({
          data: single ? rows[0] ?? null : rows,
          error: null,
        });
      }
      return query;
    },
    rpc(name, args) {
      calls.push({ table: name, args });
      assert.equal(name, "calculate_pocket_rollover_carry_v2");
      return Promise.resolve({
        data: options.rollover ?? 0,
        error: options.rolloverError ? new Error("rollover failed") : null,
      });
    },
  };
  const scope = {
    exports: {},
    householdSpendingEffectCents,
    readWalletLedgerPages,
    formatMoney,
    createNotificationTranslator,
    localizeNotificationCategory,
  };
  runInNewContext(cycleCode + "\n" + code, scope);
  return {
    calls,
    insight: (params = {}) =>
      scope.buildWalletPocketInsight({ ...base, ...params, supabase: client }),
    message: (insight) =>
      scope.buildWalletPocketNotificationMessage({
        insight,
        amountCents: 25000,
        currency: "EUR",
        category: "groceries",
        spaceLabel: "Family",
      }),
    render: scope.buildWalletPocketNotificationMessage,
  };
}
const thirdLine = (message) => message.body.split("\n")[2];

for (
  const [spent, expected] of [
    [25000, "🪙 €750.00 left in your budget this month"],
    [100000, "🪙 €0.00 left in your budget this month"],
    [125000, "⚠️ €250.00 over budget this month"],
  ]
) {
  test(`budget without pockets reports actual balance after ${spent} cents`, async () => {
    const app = fixture({ expenses: [expense(spent)] });
    const insight = await app.insight();
    assert.equal(insight.monthTotalSpentCents, spent);
    assert.equal(insight.monthTotalRemainingCents, 100000 - spent);
    assert.equal(thirdLine(app.message(insight)), expected);
  });
}

test("without a budget, all recorded cycle spending is reported", async () => {
  const app = fixture({
    budgets: [],
    expenses: [
      expense(20000),
      expense(5000, { id: "0002", user_id: "member" }),
    ],
  });
  assert.equal(
    thirdLine(app.message(await app.insight())),
    "💰 €250.00 spent this month",
  );
});

test("zero budget does not claim an allowance, and an empty cycle reports zero spent", async () => {
  for (const budgets of [[], [{ ...budget, total_budget_cents: 0 }]]) {
    const app = fixture({ budgets, expenses: [] });
    assert.equal(
      thirdLine(app.message(await app.insight())),
      "💰 €0.00 spent this month",
    );
  }
});

for (
  const [spent, expected] of [
    [25000, "🪙 €250.00 left for 家族 {0} $& this month"],
    [50000, "🪙 €0.00 left for 家族 {0} $& this month"],
    [65000, "⚠️ €150.00 over budget for 家族 {0} $& this month"],
  ]
) {
  test(`linked pocket takes priority after ${spent} cents, preserving its name`, async () => {
    const app = fixture({ pockets: [pocket], expenses: [expense(spent)] });
    assert.equal(thirdLine(app.message(await app.insight())), expected);
  });
}

test("an unlinked category or unlimited pocket uses the overall budget", async () => {
  for (
    const options of [{ links: [] }, {
      allocations: [{
        envelope_id: "pocket",
        period_month: "2026-10-01",
        amount_cents: 0,
      }],
    }]
  ) {
    const app = fixture({ pockets: [pocket], ...options });
    assert.equal(
      thirdLine(app.message(await app.insight())),
      "🪙 €750.00 left in your budget this month",
    );
  }
});

test("an unlinked category without an overall budget uses monthly spending", async () => {
  const app = fixture({
    budgets: [{ ...budget, total_budget_cents: 0 }],
    pockets: [pocket],
    links: [],
  });
  assert.equal(
    thirdLine(app.message(await app.insight())),
    "💰 €250.00 spent this month",
  );
});

test("pocket allocation overrides defaults, percentage fallback works, and duplicate category links do not double count", async () => {
  for (
    const [options, expected] of [
      [{
        allocations: [{
          envelope_id: "pocket",
          period_month: "2026-10-01",
          amount_cents: 30000,
        }],
      }, 5000],
      [{
        pockets: [{
          ...pocket,
          budget_amount_cents: null,
          budget_percentage: 40,
        }],
      }, 15000],
    ]
  ) {
    const app = fixture({
      pockets: [pocket],
      links: [{ envelope_id: "pocket", category: "groceries" }, {
        envelope_id: "pocket",
        category: "GROCERIES",
      }],
      ...options,
    });
    assert.equal((await app.insight()).pocket.remainingCents, expected);
  }
});

test("rollover and opening carry are included, including negative remaining", async () => {
  for (const [rollover, expected] of [[10000, 40000], [-50000, -20000]]) {
    const app = fixture({
      pockets: [{
        ...pocket,
        rollover_enabled: true,
        rollover_group_id: "lineage",
        opening_rollover_cents: 5000,
      }],
      rollover,
    });
    const insight = await app.insight();
    assert.equal(insight.pocket.remainingCents, expected);
    assert.ok(
      thirdLine(app.message(insight)).includes(
        expected < 0 ? "over budget for" : "left for",
      ),
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(
        app.calls.find((call) =>
          call.table === "calculate_pocket_rollover_carry_v2"
        ).args,
      )),
      {
        p_user_id: "actor",
        p_scope: "household",
        p_household_id: "space",
        p_currency: "EUR",
        p_envelope_name: pocket.name,
        p_rollover_group_id: "lineage",
        p_budget_month: "2026-10-01",
      },
    );
  }
});

test("net spending includes refunds and excludes income, transfer principals, pending rows, deleted rows and recurring templates", async () => {
  const rows = [
    expense(30000),
    expense(5000, { analytics_spending_multiplier: -1 }),
    expense(90000, { analytics_spending_multiplier: 0 }), // income/transfer principal
    expense(90000, { analytics_is_final: false }),
    expense(90000, { deleted_at: "2026-10-17" }),
    expense(90000, { is_recurring: true }),
  ].map((row, i) => ({ ...row, id: `${i}`.padStart(4, "0") }));
  const app = fixture({ pockets: [pocket], expenses: rows, pageSize: 2 });
  const insight = await app.insight();
  assert.equal(insight.monthTotalSpentCents, 25000);
  assert.equal(insight.pocket.spentCents, 25000);
});

test("refunds exceeding purchases retain their signed net effect", async () => {
  const app = fixture({
    pockets: [pocket],
    expenses: [expense(5000, { analytics_spending_multiplier: -1 })],
  });
  const insight = await app.insight();
  assert.equal(insight.monthTotalSpentCents, -5000);
  assert.equal(insight.monthTotalRemainingCents, 105000);
  assert.equal(insight.pocket.remainingCents, 55000);
});

test("shared totals include visible other members but isolate other Spaces and currencies", async () => {
  const app = fixture({
    expenses: [
      expense(10000),
      expense(15000, { id: "0002", user_id: "member" }),
      expense(90000, { id: "0003", household_id: "elsewhere" }),
      expense(90000, { id: "0004", currency: "USD" }),
    ],
  });
  assert.equal((await app.insight()).monthTotalSpentCents, 25000);
});

test("balances-only contributions affect the total without exposing categories; other private member rows stay excluded", async () => {
  const app = fixture({
    pockets: [pocket],
    expenses: [
      expense(10000),
      expense(15000, {
        id: "0002",
        user_id: "member",
        privacy_scope: "balances_only",
      }),
      expense(90000, {
        id: "0003",
        user_id: "member",
        privacy_scope: "private",
      }),
    ],
  });
  const insight = await app.insight();
  assert.equal(insight.monthTotalSpentCents, 25000);
  assert.equal(insight.pocket.spentCents, 10000);
});

for (
  const [label, householdId, isPortfolio] of [["personal", null, false], [
    "private Space",
    "space",
    true,
  ]]
) {
  test(`${label} totals and budgets belong only to the actor`, async () => {
    const app = fixture({
      budgets: [{ ...budget, household_id: householdId }],
      expenses: [
        expense(10000, { household_id: householdId }),
        expense(90000, {
          id: "0002",
          household_id: householdId,
          user_id: "member",
        }),
        expense(90000, { id: "0003", household_id: "elsewhere" }),
      ],
    });
    const insight = await app.insight({ householdId, isPortfolio });
    assert.equal(insight.monthTotalBudgetCents, 100000);
    assert.equal(insight.monthTotalSpentCents, 10000);
  });
}

test("all pages contribute even when the API returns fewer rows than requested", async () => {
  const app = fixture({
    expenses: Array.from(
      { length: 1005 },
      (_, i) => expense(100, { id: `${i}`.padStart(5, "0") }),
    ),
    pageSize: 300,
  });
  assert.equal((await app.insight()).monthTotalSpentCents, 100500);
  assert.equal(app.calls.filter((call) => call.table === "expenses").length, 5);
});

test("custom financial month includes its start and excludes its end and previous day", async () => {
  const app = fixture({
    startDay: 15,
    expenses: [
      expense(10000, { date: "2026-10-15" }),
      expense(15000, { id: "0002", date: "2026-11-14" }),
      expense(90000, { id: "0003", date: "2026-10-14" }),
      expense(90000, { id: "0004", date: "2026-11-15" }),
    ],
  });
  assert.equal((await app.insight()).monthTotalSpentCents, 25000);
});

test("capture before this month's cycle start uses the previous cycle's budget", async () => {
  const app = fixture({
    startDay: 15,
    budgets: [{
      ...budget,
      period_month: "2026-09-01",
      total_budget_cents: 80000,
    }],
    expenses: [
      expense(10000, { date: "2026-09-15" }),
      expense(90000, { id: "0002", date: "2026-10-15" }),
    ],
  });
  const insight = await app.insight({ dateYmd: "2026-10-14" });
  assert.equal(insight.monthTotalBudgetCents, 80000);
  assert.equal(insight.monthTotalSpentCents, 10000);
});

for (
  const table of [
    "user_contacts",
    "expenses",
    "budgets",
    "budget_envelopes",
    "envelope_allocations",
    "envelope_category_links",
  ]
) {
  test(`${table} failure cannot produce a false zero-spending or full-budget notification`, async () => {
    const app = fixture({ pockets: [pocket], errorTable: table });
    await assert.rejects(app.insight(), new RegExp(`failed ${table}`));
  });
}

test("an error on a later expense page cannot return a partial total", async () => {
  const app = fixture({
    expenses: [expense(10000), expense(15000, { id: "0002" })],
    pageSize: 1,
    errorTable: "expenses",
    errorPage: 1,
  });
  await assert.rejects(app.insight(), /failed expenses/);
});

test("missing rollover and unsafe monetary values never become valid balances", async () => {
  const failed = fixture({
    pockets: [{ ...pocket, rollover_enabled: true }],
    rolloverError: true,
  });
  await assert.rejects(failed.insight(), /rollover failed/);
  for (const value of [NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const app = fixture({
      budgets: [{ ...budget, total_budget_cents: value }],
    });
    await assert.rejects(app.insight(), /Invalid wallet notification amount/);
  }
});

test("new monthly summaries remain in the manual catalog with English fallbacks", async () => {
  const keys = [
    "walletCapturePocketMonthlyRemaining",
    "walletCapturePocketMonthlyOverBudget",
    "walletCaptureMonthlyBudgetRemaining",
    "walletCaptureMonthlyOverBudget",
    "walletCaptureMonthlySpent",
  ];
  for (const key of keys) {
    assert.equal(Object.keys(messages[key]).length, 15);
    assert.ok(messages[key].en);
    for (const value of Object.values(messages[key])) {
      assert.equal(typeof value, "string");
    }
  }
  const app = fixture();
  const insight = await app.insight();
  const saved = notificationCatalogs.fr;
  notificationCatalogs.fr = {
    ...saved,
    "🪙 {0} left in your budget this month": "RESTE {0}",
  };
  try {
    const params = {
      insight,
      amountCents: 25000,
      currency: "EUR",
      category: "groceries",
      spaceLabel: "Family",
    };
    assert.equal(
      thirdLine(app.render({ ...params, language: "fr" })),
      "RESTE €750.00",
    );
    notificationCatalogs.fr = { "🪙 {0} left in your budget this month": "" };
    assert.equal(
      thirdLine(app.render({ ...params, language: "fr" })),
      "🪙 €750.00 left in your budget this month",
    );
  } finally {
    notificationCatalogs.fr = saved;
  }
});

test("a named pocket with a limit is chosen ahead of another linked pocket without a limit", async () => {
  const app = fixture({
    pockets: [{ ...pocket, id: "unlimited", budget_amount_cents: 0 }, pocket],
    links: [{ envelope_id: "unlimited", category: "groceries" }, {
      envelope_id: "pocket",
      category: "groceries",
    }],
  });
  assert.equal(
    thirdLine(app.message(await app.insight())),
    "🪙 €250.00 left for 家族 {0} $& this month",
  );
});

test("a configured pocket allowance works even when there is no overall monthly allowance", async () => {
  const app = fixture({
    budgets: [{ ...budget, total_budget_cents: 0 }],
    pockets: [pocket],
  });
  assert.equal(
    thirdLine(app.message(await app.insight())),
    "🪙 €250.00 left for 家族 {0} $& this month",
  );
});
