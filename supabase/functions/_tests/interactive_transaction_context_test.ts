import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { loadInteractiveTransactionContext } from "../shared/interactive-transaction-context.ts";

interface CatalogFixture {
  memberships: Array<Record<string, unknown>>;
  households: Array<Record<string, unknown>>;
  members: Array<Record<string, unknown>>;
  wallets: Array<Record<string, unknown>>;
  failedTable?: string;
  responseLimit?: number;
  missingCountTable?: string;
  driftWalletCount?: boolean;
}

const fixture = (): CatalogFixture => ({
  memberships: [{ household_id: "family" }, { household_id: "work" }],
  households: [
    {
      id: "family",
      name: "家族",
      is_portfolio: false,
      ai_use_default_split: false,
    },
    {
      id: "work",
      name: "仕事",
      is_portfolio: true,
      ai_use_default_split: true,
    },
  ],
  members: [
    {
      user_id: "me",
      users: { full_name: "本人", email: "me@example.invalid" },
    },
    {
      user_id: "alice",
      users: { full_name: "أليس", email: "alice@example.invalid" },
    },
    {
      user_id: "bob",
      users: { full_name: null, email: "bob@example.invalid" },
    },
  ],
  wallets: [
    {
      id: "personal",
      user_id: "me",
      household_id: null,
      name: "現金",
      currency: "EUR",
    },
    {
      id: "family-wallet",
      user_id: "alice",
      household_id: "family",
      name: "旅行",
      currency: "USD",
    },
    {
      id: "private-wallet",
      user_id: "me",
      household_id: "work",
      name: "事業",
      currency: "JPY",
    },
    {
      id: "outsider-personal",
      user_id: "outsider",
      household_id: null,
      name: "Other",
      currency: "USD",
    },
    {
      id: "outsider-space",
      user_id: "me",
      household_id: "foreign",
      name: "Foreign",
      currency: "EUR",
    },
  ],
});

function load(catalog: CatalogFixture) {
  const query = (table: string, rows: Array<Record<string, unknown>>) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      order: () => builder,
      range: (from: number, to: number) =>
        Promise.resolve({
          data: rows.slice(
            from,
            Math.min(to + 1, from + (catalog.responseLimit ?? Infinity)),
          ),
          count: catalog.missingCountTable === table ? null : rows.length +
            (catalog.driftWalletCount && table === "accounts" && from > 0
              ? 1
              : 0),
          error: catalog.failedTable === table
            ? new Error("read failed")
            : null,
        }),
    };
    return builder;
  };
  const client = {
    from: (table: string) =>
      query(
        table,
        table === "household_members"
          ? catalog.memberships
          : table === "households"
          ? catalog.households
          : catalog.wallets,
      ),
    rpc: (name: string) => query(name, catalog.members),
  } as unknown as Parameters<
    typeof loadInteractiveTransactionContext
  >[0]["supabase"];
  return loadInteractiveTransactionContext({
    supabase: client,
    userId: "me",
    defaultSpaceId: "personal",
    defaultWalletId: "personal",
    currency: "EUR",
    date: "2026-10-03",
    language: "ja",
    preferredTimezone: "Asia/Tokyo",
    expenseCategories: ["groceries", "家族の食費"],
    incomeCategories: ["salary"],
  });
}

Deno.test("interactive context: authorized catalogs retain native names, currencies and scope", async () => {
  const result = await load(fixture());
  assertEquals(result.spaces.map((space) => space.id), [
    "personal",
    "family",
    "work",
  ]);
  assertEquals(result.spaces[1].members, [
    { userId: "me", name: "本人" },
    { userId: "alice", name: "أليس" },
    { userId: "bob", name: "bob@example.invalid" },
  ]);
  assertEquals(result.spaces[1].autoSplitEnabled, false);
  assertEquals(result.spaces[2].members, []);
  assertEquals(
    result.wallets.map((
      wallet,
    ) => [wallet.id, wallet.currency, wallet.spaceId]),
    [
      ["personal", "EUR", "personal"],
      ["family-wallet", "USD", "family"],
      ["private-wallet", "JPY", "work"],
    ],
  );
  assertEquals(result.expenseCategories, ["groceries", "家族の食費"]);
  assertEquals(result.preferredTimezone, "Asia/Tokyo");
});

Deno.test("interactive context: a complete empty personal catalog is usable", async () => {
  const result = await load({
    memberships: [],
    households: [],
    members: [],
    wallets: [],
  });
  assertEquals(result.spaces.map((space) => space.id), ["personal"]);
  assertEquals(result.wallets, []);
});

Deno.test("interactive context: failed or truncated reads cannot authorize a proposal", async () => {
  for (
    const failedTable of [
      "household_members",
      "households",
      "get_household_home_members_v1",
      "accounts",
    ]
  ) {
    await assertRejects(() => load({ ...fixture(), failedTable }));
  }
  for (
    const patch of [
      { memberships: Array(101).fill({ household_id: "family" }) },
      { households: [fixture().households[0]] },
      {
        members: Array(101).fill({
          user_id: "me",
          users: { full_name: "本人" },
        }),
      },
      { members: [{ user_id: "outsider", users: { full_name: "Other" } }] },
      {
        wallets: Array.from(
          { length: 1001 },
          (_, index) => ({
            id: `wallet-${index}`,
            household_id: null,
            user_id: "me",
            currency: "EUR",
            name: "Cash",
          }),
        ),
      },
    ]
  ) {
    await assertRejects(() => load({ ...fixture(), ...patch }));
  }
});

Deno.test("interactive context: wallet pagination is complete before analysis", async () => {
  const wallets = Array.from(
    { length: 201 },
    (_, index) => ({
      id: `wallet-${index}`,
      household_id: null,
      user_id: "me",
      currency: "EUR",
      name: "現金",
    }),
  );
  const result = await load({ ...fixture(), wallets });
  assertEquals(result.wallets.length, 201);
  assertEquals(result.wallets.at(-1)?.id, "wallet-200");
});

Deno.test("interactive context: a server row cap cannot truncate the wallet catalog", async () => {
  const wallets = Array.from({ length: 201 }, (_, index) => ({
    id: `wallet-${index}`,
    household_id: null,
    user_id: "me",
    currency: "EUR",
    name: "現金",
  }));
  assertEquals(
    (await load({ ...fixture(), wallets, responseLimit: 100 })).wallets.length,
    201,
  );
});

Deno.test("interactive context: missing exact counts fail closed", async () => {
  for (
    const missingCountTable of [
      "household_members",
      "households",
      "get_household_home_members_v1",
      "accounts",
    ]
  ) {
    await assertRejects(() => load({ ...fixture(), missingCountTable }));
  }
});

Deno.test("interactive context: duplicate or changing catalogs fail closed", async () => {
  await assertRejects(() =>
    load({
      ...fixture(),
      wallets: [fixture().wallets[0], fixture().wallets[0]],
    })
  );
  const wallets = Array.from(
    { length: 201 },
    (_, index) => ({
      id: `wallet-${index}`,
      household_id: null,
      user_id: "me",
      currency: "EUR",
      name: "現金",
    }),
  );
  await assertRejects(() =>
    load({ ...fixture(), wallets, driftWalletCount: true })
  );
});
