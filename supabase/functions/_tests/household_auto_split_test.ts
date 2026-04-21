import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildHouseholdSplitRecords,
  type HouseholdAutoSplitSettings,
  resolveEffectiveSplit,
} from "../shared/household-auto-split.ts";

const members = [
  { user_id: "11111111-1111-4111-8111-111111111111" },
  { user_id: "22222222-2222-4222-8222-222222222222" },
  { user_id: "33333333-3333-4333-8333-333333333333" },
];

const twoMembers = members.slice(0, 2);

Deno.test("resolveEffectiveSplit skips automatic split when disabled", () => {
  const settings: HouseholdAutoSplitSettings = {
    autoSplitEnabled: false,
    defaultConfig: null,
  };

  assertEquals(resolveEffectiveSplit(undefined, settings), { kind: "skip" });
});

Deno.test("resolveEffectiveSplit skips explicit splits when household auto-split is disabled", () => {
  const settings: HouseholdAutoSplitSettings = {
    autoSplitEnabled: false,
    defaultConfig: null,
  };

  assertEquals(
    resolveEffectiveSplit({
      splitType: "amount",
      memberSplits: [
        { userId: members[0].user_id, amount: 15 },
        { userId: members[1].user_id, amount: 15 },
        { userId: members[2].user_id, amount: 0 },
      ],
    }, settings),
    { kind: "skip" },
  );
});

Deno.test("resolveEffectiveSplit uses stored percentage defaults when request omits splits", () => {
  const settings: HouseholdAutoSplitSettings = {
    autoSplitEnabled: true,
    defaultConfig: {
      splitType: "percentage",
      memberSplits: [
        { userId: twoMembers[0].user_id, percentage: 40 },
        { userId: twoMembers[1].user_id, percentage: 60 },
      ],
    },
  };

  assertEquals(resolveEffectiveSplit(undefined, settings), {
    kind: "customSplits",
    customSplits: settings.defaultConfig,
  });
});

Deno.test("buildHouseholdSplitRecords creates equal split rows for income transactions", () => {
  const result = buildHouseholdSplitRecords({
    householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    payerUserId: members[0].user_id,
    amountCents: 10001,
    currency: "USD",
    description: "Salary",
    members,
    customSplits: null,
  });

  assertEquals(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  assertEquals(result.group.split_type, "equal");
  assertEquals(result.group.expense_id, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  assertEquals(result.lines.map((line) => line.amount_cents), [
    3335,
    3333,
    3333,
  ]);
  assertEquals(result.lines.every((line) => line.split_group_id), true);
});

Deno.test("buildHouseholdSplitRecords creates percentage split rows", () => {
  const result = buildHouseholdSplitRecords({
    householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    payerUserId: members[1].user_id,
    amountCents: 9999,
    currency: "EUR",
    description: "Bonus",
    members,
    customSplits: {
      splitType: "percentage",
      memberSplits: [
        { userId: members[0].user_id, percentage: 50 },
        { userId: members[1].user_id, percentage: 30 },
        { userId: members[2].user_id, percentage: 20 },
      ],
    },
  });

  assertEquals(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  assertEquals(result.group.split_type, "percentage");
  assertEquals(result.group.payer_user_id, members[1].user_id);
  assertEquals(
    result.lines.reduce((sum, line) => sum + line.amount_cents, 0),
    9999,
  );
  assertEquals(result.lines.map((line) => line.percentage), [50, 30, 20]);
});

Deno.test("buildHouseholdSplitRecords allocates 40/60 percentage defaults exactly", () => {
  const result = buildHouseholdSplitRecords({
    householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    payerUserId: twoMembers[0].user_id,
    amountCents: 1500,
    currency: "EUR",
    description: "Dinner",
    members: twoMembers,
    customSplits: {
      splitType: "percentage",
      memberSplits: [
        { userId: twoMembers[0].user_id, percentage: 40 },
        { userId: twoMembers[1].user_id, percentage: 60 },
      ],
    },
  });

  assertEquals(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  assertEquals(result.group.split_type, "percentage");
  assertEquals(result.lines.map((line) => line.amount_cents), [600, 900]);
  assertEquals(result.lines.map((line) => line.percentage), [40, 60]);
});

Deno.test("buildHouseholdSplitRecords allocates share defaults by weight", () => {
  const result = buildHouseholdSplitRecords({
    householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    payerUserId: twoMembers[0].user_id,
    amountCents: 1500,
    currency: "EUR",
    description: "Dinner",
    members: twoMembers,
    customSplits: {
      splitType: "shares",
      memberSplits: [
        { userId: twoMembers[0].user_id, shares: 2 },
        { userId: twoMembers[1].user_id, shares: 3 },
      ],
    },
  });

  assertEquals(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  assertEquals(result.group.split_type, "shares");
  assertEquals(result.lines.map((line) => line.amount_cents), [600, 900]);
  assertEquals(result.lines.map((line) => line.shares), [2, 3]);
});

Deno.test("buildHouseholdSplitRecords rejects amount splits that do not total the transaction", () => {
  const result = buildHouseholdSplitRecords({
    householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    payerUserId: members[0].user_id,
    amountCents: 1000,
    currency: "USD",
    description: "Allowance",
    members,
    customSplits: {
      splitType: "amount",
      memberSplits: [
        { userId: members[0].user_id, amount: 8 },
        { userId: members[1].user_id, amount: 8 },
        { userId: members[2].user_id, amount: 8 },
      ],
    },
  });

  assertEquals(result.ok, false);
  if (result.ok) throw new Error("expected validation failure");
  assertEquals(result.code, "AMOUNT_TOTAL");
});

Deno.test("buildHouseholdSplitRecords rejects explicit custom splits missing members", () => {
  const result = buildHouseholdSplitRecords({
    householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    payerUserId: members[0].user_id,
    amountCents: 1000,
    currency: "USD",
    description: null,
    members,
    customSplits: {
      splitType: "shares",
      memberSplits: [
        { userId: members[0].user_id, shares: 1 },
        { userId: members[1].user_id, shares: 1 },
      ],
    },
  });

  assertEquals(result.ok, false);
  if (result.ok) throw new Error("expected validation failure");
  assertEquals(result.code, "MEMBER_MISMATCH");
  assertExists(result.error);
});
