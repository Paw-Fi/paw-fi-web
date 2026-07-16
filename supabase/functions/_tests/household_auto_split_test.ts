/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildHouseholdSplitRecords,
  buildPreservedHistoricalSplitRecords,
  commitHouseholdSplitRecords,
  commitHouseholdSplitRecordsWithPatch,
  createHouseholdAutoSplitForTransaction,
  type CustomSplits,
  expectedSplitParentFromTransaction,
  type HouseholdAutoSplitSettings,
  isMissingSettlementRpcError,
  parseExplicitReSplitRequested,
  removeHouseholdSplitWithPatch,
  resolveEffectiveSplit,
  resolveExistingSplitMutationDecision,
  resolveExistingSplitWriteIntent,
  shouldApplyExistingReSplit,
  validateExistingSplitPayerIntent,
} from "../shared/household-auto-split.ts";

const members = [
  { user_id: "11111111-1111-4111-8111-111111111111" },
  { user_id: "22222222-2222-4222-8222-222222222222" },
  { user_id: "33333333-3333-4333-8333-333333333333" },
];

const twoMembers = members.slice(0, 2);

Deno.test("re-split request parser accepts aliases and rejects ambiguity", () => {
  assertEquals(parseExplicitReSplitRequested({}), {
    ok: true,
    value: undefined,
  });
  assertEquals(parseExplicitReSplitRequested({ reSplitRequested: false }), {
    ok: true,
    value: false,
  });
  assertEquals(
    parseExplicitReSplitRequested({
      reSplitRequested: true,
      resplit_requested: true,
    }),
    { ok: true, value: true },
  );
  assertEquals(
    parseExplicitReSplitRequested({ reSplitRequested: "true" }).ok,
    false,
  );
  assertEquals(
    parseExplicitReSplitRequested({
      reSplitRequested: true,
      resplitRequested: false,
    }).ok,
    false,
  );
});

Deno.test(
  "amount-only legacy splitUpdate preserves history unless re-split is explicit",
  () => {
    const splitUpdate = {
      splitType: "amount",
      memberSplits: [
        { userId: twoMembers[0].user_id, amount: 6 },
        { userId: twoMembers[1].user_id, amount: 4 },
      ],
    };
    const legacyIntent = resolveExistingSplitWriteIntent({
      explicitReSplitRequested: undefined,
      splitUpdate,
    });
    assertEquals(legacyIntent.source, "legacy_split_update");
    assertEquals(
      shouldApplyExistingReSplit({
        intent: legacyIntent,
        hasAmountUpdate: true,
      }),
      false,
    );
    assertEquals(
      shouldApplyExistingReSplit({
        intent: legacyIntent,
        hasAmountUpdate: false,
      }),
      true,
    );

    const explicitIntent = resolveExistingSplitWriteIntent({
      explicitReSplitRequested: true,
      splitUpdate,
    });
    assertEquals(
      shouldApplyExistingReSplit({
        intent: explicitIntent,
        hasAmountUpdate: true,
      }),
      true,
    );
    const preserveIntent = resolveExistingSplitWriteIntent({
      explicitReSplitRequested: false,
      splitUpdate,
    });
    assertEquals(
      shouldApplyExistingReSplit({
        intent: preserveIntent,
        hasAmountUpdate: false,
      }),
      false,
    );
  },
);

Deno.test(
  "unchanged historical payer survives membership drift but payer changes are strict",
  () => {
    const departedPayerId = "44444444-4444-4444-8444-444444444444";
    const historicalParticipantId = "55555555-5555-4555-8555-555555555555";
    const historicalParticipants = [departedPayerId, historicalParticipantId];
    const currentMemberIds = members.map((member) => member.user_id);

    assertEquals(
      validateExistingSplitPayerIntent({
        storedPayerUserId: departedPayerId,
        requestedPayerUserId: departedPayerId,
        reSplitRequested: false,
        participantIds: historicalParticipants,
        currentMemberIds,
      }),
      {
        ok: true,
        effectivePayerUserId: departedPayerId,
        payerChanged: false,
        requiresCurrentMembership: false,
      },
    );

    const changedWithoutResplit = validateExistingSplitPayerIntent({
      storedPayerUserId: departedPayerId,
      requestedPayerUserId: members[0].user_id,
      reSplitRequested: false,
      participantIds: historicalParticipants,
      currentMemberIds,
    });
    assertEquals(changedWithoutResplit.ok, false);
    if (changedWithoutResplit.ok) throw new Error("expected re-split failure");
    assertEquals(changedWithoutResplit.code, "RESPLIT_REQUIRED");

    const explicitWithDepartedPayer = validateExistingSplitPayerIntent({
      storedPayerUserId: departedPayerId,
      requestedPayerUserId: departedPayerId,
      reSplitRequested: true,
      participantIds: currentMemberIds,
      currentMemberIds,
    });
    assertEquals(explicitWithDepartedPayer.ok, false);
    if (explicitWithDepartedPayer.ok) {
      throw new Error("expected current-payer failure");
    }
    assertEquals(explicitWithDepartedPayer.code, "PAYER_NOT_CURRENT");
  },
);

Deno.test(
  "cosmetic and same-scope account edits never trigger a historical split commit",
  () => {
    for (const historicalState of ["settled", "allocation-backed"]) {
      const decision = resolveExistingSplitMutationDecision({
        updates: {
          raw_text: `Updated ${historicalState} description`,
          category: "groceries",
          date: "2026-07-16",
          account_id: "77777777-7777-4777-8777-777777777777",
        },
        storedAmountCents: 11223,
        storedCurrency: "CAD",
        storedPayerUserId: members[0].user_id,
        requestedPayerUserId: null,
        reSplitRequested: false,
        legacyImplicitPayerPayload: false,
        storedPayerIsCurrentMember: true,
      });
      assertEquals(decision, {
        requiresSplitCommit: false,
        reasons: [],
      });
    }
  },
);

Deno.test(
  "released clients resending an unchanged payer do not mutate the split",
  () => {
    const decision = resolveExistingSplitMutationDecision({
      updates: {
        account_id: "77777777-7777-4777-8777-777777777777",
        raw_text: "Ordinary edit",
      },
      storedAmountCents: 11223,
      storedCurrency: "CAD",
      storedPayerUserId: members[0].user_id,
      requestedPayerUserId: members[0].user_id,
      reSplitRequested: false,
      legacyImplicitPayerPayload: true,
      storedPayerIsCurrentMember: true,
    });
    assertEquals(decision, {
      requiresSplitCommit: false,
      reasons: [],
    });
  },
);

Deno.test(
  "legacy substituted payer preserves a departed historical payer",
  () => {
    const departedPayerId = "44444444-4444-4444-8444-444444444444";
    const legacyDecision = resolveExistingSplitMutationDecision({
      updates: { raw_text: "Ordinary edit" },
      storedAmountCents: 11223,
      storedCurrency: "CAD",
      storedPayerUserId: departedPayerId,
      requestedPayerUserId: members[0].user_id,
      reSplitRequested: false,
      legacyImplicitPayerPayload: true,
      storedPayerIsCurrentMember: false,
    });
    assertEquals(legacyDecision, {
      requiresSplitCommit: false,
      reasons: [],
    });

    const explicitIntent = resolveExistingSplitMutationDecision({
      updates: { raw_text: "Ordinary edit" },
      storedAmountCents: 11223,
      storedCurrency: "CAD",
      storedPayerUserId: departedPayerId,
      requestedPayerUserId: members[0].user_id,
      reSplitRequested: false,
      legacyImplicitPayerPayload: false,
      storedPayerIsCurrentMember: false,
    });
    assertEquals(explicitIntent.reasons, ["payer_changed"]);

    const currentPayerDecision = resolveExistingSplitMutationDecision({
      updates: { raw_text: "Ordinary edit" },
      storedAmountCents: 11223,
      storedCurrency: "CAD",
      storedPayerUserId: members[0].user_id,
      requestedPayerUserId: members[1].user_id,
      reSplitRequested: false,
      legacyImplicitPayerPayload: true,
      storedPayerIsCurrentMember: true,
    });
    assertEquals(currentPayerDecision.reasons, ["payer_changed"]);
  },
);

Deno.test(
  "actual amount currency payer and explicit re-split changes are structural",
  () => {
    const decision = resolveExistingSplitMutationDecision({
      updates: { amount_cents: 12000, currency: "usd" },
      storedAmountCents: 11223,
      storedCurrency: "CAD",
      storedPayerUserId: members[0].user_id,
      requestedPayerUserId: members[1].user_id,
      reSplitRequested: true,
      legacyImplicitPayerPayload: false,
      storedPayerIsCurrentMember: true,
    });
    assertEquals(decision, {
      requiresSplitCommit: true,
      reasons: [
        "explicit_resplit",
        "amount_changed",
        "currency_changed",
        "payer_changed",
      ],
    });

    assertEquals(
      resolveExistingSplitMutationDecision({
        updates: { amount_cents: 11223, currency: "cad" },
        storedAmountCents: 11223,
        storedCurrency: "CAD",
        storedPayerUserId: members[0].user_id,
        requestedPayerUserId: null,
        reSplitRequested: false,
        legacyImplicitPayerPayload: false,
        storedPayerIsCurrentMember: true,
      }).requiresSplitCommit,
      false,
    );
  },
);

Deno.test("resolveEffectiveSplit skips automatic split when disabled", () => {
  const settings: HouseholdAutoSplitSettings = {
    autoSplitEnabled: false,
    defaultConfig: null,
  };

  assertEquals(resolveEffectiveSplit(undefined, settings), { kind: "skip" });
});

Deno.test(
  "resolveEffectiveSplit honors explicit splits when household auto-split is disabled",
  () => {
    const settings: HouseholdAutoSplitSettings = {
      autoSplitEnabled: false,
      defaultConfig: null,
    };

    const explicit: CustomSplits = {
      splitType: "amount",
      memberSplits: [
        { userId: members[0].user_id, amount: 15 },
        { userId: members[1].user_id, amount: 15 },
        { userId: members[2].user_id, amount: 0 },
      ],
    };

    assertEquals(resolveEffectiveSplit(explicit, settings), {
      kind: "customSplits",
      customSplits: explicit,
      source: "explicit",
    });
  },
);

Deno.test(
  "resolveEffectiveSplit uses stored percentage defaults when request omits splits",
  () => {
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
      source: "default",
    });
  },
);

Deno.test(
  "buildHouseholdSplitRecords creates equal split rows for income transactions",
  () => {
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
    assertEquals(
      result.group.expense_id,
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    assertEquals(
      result.lines.map((line) => line.amount_cents),
      [3335, 3333, 3333],
    );
    assertEquals(
      result.lines.every((line) => line.split_group_id),
      true,
    );
  },
);

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
  assertEquals(
    result.lines.map((line) => line.percentage),
    [50, 30, 20],
  );
});

Deno.test(
  "buildHouseholdSplitRecords allocates 40/60 percentage defaults exactly",
  () => {
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
    assertEquals(
      result.lines.map((line) => line.amount_cents),
      [600, 900],
    );
    assertEquals(
      result.lines.map((line) => line.percentage),
      [40, 60],
    );
  },
);

Deno.test(
  "buildHouseholdSplitRecords allocates share defaults by weight",
  () => {
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
    assertEquals(
      result.lines.map((line) => line.amount_cents),
      [600, 900],
    );
    assertEquals(
      result.lines.map((line) => line.shares),
      [2, 3],
    );
  },
);

Deno.test(
  "buildHouseholdSplitRecords rejects amount splits that do not total the transaction",
  () => {
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
  },
);

Deno.test(
  "buildHouseholdSplitRecords rejects explicit custom splits missing members",
  () => {
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
          { userId: members[0].user_id, shares: 2 },
          { userId: members[1].user_id, shares: 1 },
        ],
      },
    });

    assertEquals(result.ok, false);
    if (result.ok) throw new Error("expected validation failure");
    assertEquals(result.code, "MEMBER_MISMATCH");
    assertExists(result.error);
  },
);

Deno.test(
  "buildHouseholdSplitRecords reconciles stored defaults after membership changes",
  () => {
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
          { userId: members[0].user_id, shares: 2 },
          { userId: members[1].user_id, shares: 1 },
        ],
      },
      reconcileMemberChanges: true,
    });

    assertEquals(result.ok, true);
    if (!result.ok) throw new Error(result.error);
    assertEquals(
      result.lines.map((line) => line.user_id),
      members.map((member) => member.user_id),
    );
    assertEquals(
      result.lines.map((line) => line.amount_cents),
      [667, 333, 0],
    );
  },
);

Deno.test(
  "ordinary structural edit preserves historical participants and payer",
  () => {
    const departedPayerId = "44444444-4444-4444-8444-444444444444";
    const historicalParticipantId = "55555555-5555-4555-8555-555555555555";
    const groupId = "66666666-6666-4666-8666-666666666666";
    const result = buildPreservedHistoricalSplitRecords({
      group: {
        id: groupId,
        household_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        expense_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        payer_user_id: departedPayerId,
        split_type: "amount",
        currency: "CAD",
        total_amount_cents: 1000,
        description: "Before membership changed",
        created_at: "2025-01-01T00:00:00.000Z",
      },
      lines: [
        {
          user_id: departedPayerId,
          amount_cents: 600,
          created_at: "2025-01-01T00:00:00.000Z",
        },
        {
          user_id: historicalParticipantId,
          amount_cents: 400,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
      targetAmountCents: 1500,
      targetCurrency: "cad",
      targetDescription: "Amount edited later",
      now: "2026-07-16T00:00:00.000Z",
    });

    assertEquals(result.ok, true);
    if (!result.ok) throw new Error(result.error);
    assertEquals(result.group.payer_user_id, departedPayerId);
    assertEquals(
      result.lines.map((line) => line.user_id),
      [departedPayerId, historicalParticipantId],
    );
    assertEquals(
      result.lines.map((line) => line.amount_cents),
      [900, 600],
    );
    assertEquals(result.group.currency, "CAD");
  },
);

Deno.test(
  "explicit re-split rejects historical members and uses every current member",
  () => {
    const historicalOnlyMember = "55555555-5555-4555-8555-555555555555";
    const historicalAttempt = buildHouseholdSplitRecords({
      householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      payerUserId: members[0].user_id,
      amountCents: 1200,
      currency: "CAD",
      description: null,
      members,
      customSplits: {
        splitType: "amount",
        memberSplits: [
          { userId: members[0].user_id, amount: 6 },
          { userId: members[1].user_id, amount: 4 },
          { userId: historicalOnlyMember, amount: 2 },
        ],
      },
    });
    assertEquals(historicalAttempt.ok, false);
    if (historicalAttempt.ok) throw new Error("expected member mismatch");
    assertEquals(historicalAttempt.code, "MEMBER_MISMATCH");

    const currentAttempt = buildHouseholdSplitRecords({
      householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      payerUserId: members[0].user_id,
      amountCents: 1200,
      currency: "CAD",
      description: null,
      members,
      customSplits: {
        splitType: "amount",
        memberSplits: [
          { userId: members[0].user_id, amount: 6 },
          { userId: members[1].user_id, amount: 4 },
          { userId: members[2].user_id, amount: 2 },
        ],
      },
    });
    assertEquals(currentAttempt.ok, true);
    if (!currentAttempt.ok) throw new Error(currentAttempt.error);
    assertEquals(
      currentAttempt.lines.map((line) => line.user_id),
      members.map((member) => member.user_id),
    );
  },
);

Deno.test(
  "new split in a household is independent of valid historical groups",
  async () => {
    const calls: Array<{
      functionName: string;
      params: Record<string, unknown>;
    }> = [];
    const supabase = {
      rpc(functionName: string, params: Record<string, unknown>) {
        calls.push({ functionName, params });
        return { data: { committed: true }, error: null };
      },
    };

    const result = await createHouseholdAutoSplitForTransaction({
      supabase,
      householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      transaction: {
        id: "77777777-7777-4777-8777-777777777777",
        amount_cents: 1200,
        currency: "CAD",
        split_group_id: null,
      },
      actorUserId: members[0].user_id,
      members,
      settings: { autoSplitEnabled: true, defaultConfig: null },
    });

    assertEquals(result.kind, "created");
    assertEquals(calls.length, 1);
    const lines = calls[0].params.p_lines as Array<Record<string, unknown>>;
    assertEquals(
      lines.map((line) => line.user_id),
      members.map((member) => member.user_id),
    );
  },
);

Deno.test(
  "createHouseholdAutoSplitForTransaction fails cleanly when atomic commit fails",
  async () => {
    const calls: Array<{ functionName: string; params: unknown }> = [];
    const supabase = {
      rpc(functionName: string, params: unknown) {
        calls.push({ functionName, params });
        return { data: null, error: new Error("atomic commit failed") };
      },
    };

    const result = await createHouseholdAutoSplitForTransaction({
      supabase,
      householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      transaction: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        amount_cents: 1000,
        currency: "USD",
      },
      actorUserId: members[0].user_id,
      members,
      settings: { autoSplitEnabled: true, defaultConfig: null },
    });

    assertEquals(result.kind, "failed");
    assertEquals(calls.length, 1);
    assertEquals(
      calls[0].functionName,
      "households_commit_expense_split_write_v3",
    );
  },
);

Deno.test(
  "createHouseholdAutoSplitForTransaction returns created only after atomic commit",
  async () => {
    const calls: Array<
      { functionName: string; params: Record<string, unknown> }
    > = [];
    const supabase = {
      rpc(
        functionName: string,
        params: Record<string, unknown>,
      ) {
        calls.push({ functionName, params });
        return { data: { committed: true }, error: null };
      },
    };

    const result = await createHouseholdAutoSplitForTransaction({
      supabase,
      householdId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      transaction: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        amount_cents: 1000,
        currency: "USD",
      },
      actorUserId: members[0].user_id,
      members,
      settings: { autoSplitEnabled: true, defaultConfig: null },
    });

    assertEquals(result.kind, "created");
    assertEquals(calls.length, 1);
    assertEquals(
      calls[0].functionName,
      "households_commit_expense_split_write_v3",
    );
    assertEquals(
      (calls[0].params.p_lines as Array<Record<string, unknown>>).length,
      members.length,
    );
    assertEquals(calls[0].params.p_target_account_id, null);
  },
);

function splitCommitFixture() {
  const group = {
    id: "66666666-6666-4666-8666-666666666666",
    household_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    expense_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    payer_user_id: members[0].user_id,
    split_type: "amount" as const,
    currency: "CAD",
    total_amount_cents: 11223,
    description: "Cat food",
    created_at: "2026-07-16T00:00:00.000Z",
  };
  return {
    group,
    lines: [
      {
        split_group_id: group.id,
        user_id: members[0].user_id,
        amount_cents: 5612,
        percentage: null,
        shares: null,
        is_settled: false,
        settled_at: null,
        created_at: group.created_at,
      },
      {
        split_group_id: group.id,
        user_id: members[1].user_id,
        amount_cents: 5611,
        percentage: null,
        shares: null,
        is_settled: false,
        settled_at: null,
        created_at: group.created_at,
      },
    ],
    expectedParent: {
      household_id: group.household_id,
      currency: "CAD",
      amount_cents: 10000,
      split_group_id: group.id,
      account_id: "77777777-7777-4777-8777-777777777777",
    },
    expensePatch: {
      raw_text: "Updated cat food",
      updated_at: "2026-07-16T01:00:00.000Z",
    },
  };
}

function createSplitCommitFallbackStub(
  rpcErrors: Array<Record<string, unknown> | null>,
) {
  const rpcCalls: Array<{
    functionName: string;
    params: Record<string, unknown>;
  }> = [];
  const writes: Array<{
    table: string;
    action: string;
    payload?: unknown;
  }> = [];
  const fixture = splitCommitFixture();

  const supabase = {
    rpc(functionName: string, params: Record<string, unknown>) {
      rpcCalls.push({ functionName, params });
      const error = rpcErrors[rpcCalls.length - 1] ?? null;
      return { data: error ? null : { committed: true }, error };
    },
    from(table: string) {
      return {
        select(columns: string) {
          writes.push({ table, action: `select:${columns}` });
          return {
            eq(column: string, value: unknown) {
              writes.push({ table, action: `eq:${column}`, payload: value });
              return {
                maybeSingle() {
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        insert(payload: unknown) {
          writes.push({ table, action: "insert", payload });
          return { data: null, error: null };
        },
        update(payload: unknown) {
          writes.push({ table, action: "update", payload });
          // deno-lint-ignore no-explicit-any
          const chain: any = {
            eq(column: string, value: unknown) {
              writes.push({ table, action: `eq:${column}`, payload: value });
              return chain;
            },
            is(column: string, value: unknown) {
              writes.push({ table, action: `is:${column}`, payload: value });
              return chain;
            },
            select(columns: string) {
              writes.push({ table, action: `select:${columns}` });
              return chain;
            },
            single() {
              return { data: { id: fixture.group.expense_id }, error: null };
            },
          };
          return chain;
        },
        delete() {
          writes.push({ table, action: "delete" });
          return {
            eq(column: string, value: unknown) {
              writes.push({ table, action: `eq:${column}`, payload: value });
              return { data: null, error: null };
            },
          };
        },
      };
    },
  };
  return { supabase, rpcCalls, writes };
}

Deno.test("atomic split patch RPC keeps its production contract", async () => {
  const fixture = splitCommitFixture();
  const calls: Array<{
    functionName: string;
    params: Record<string, unknown>;
  }> = [];
  const supabase = {
    rpc(functionName: string, params: Record<string, unknown>) {
      calls.push({ functionName, params });
      return { data: { committed: true }, error: null };
    },
  };

  const result = await commitHouseholdSplitRecordsWithPatch({
    supabase,
    actorUserId: members[0].user_id,
    ...fixture,
    previousSplitGroupId: fixture.group.id,
    targetAccountId: fixture.expectedParent.account_id,
  });

  assertEquals(result.error, null);
  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].functionName,
    "households_commit_expense_split_write_with_patch_v3",
  );
  assertEquals(calls[0].params.p_actor_user_id, members[0].user_id);
  assertEquals(calls[0].params.p_expense_id, fixture.group.expense_id);
  assertEquals(calls[0].params.p_expected_parent, fixture.expectedParent);
  assertEquals(calls[0].params.p_expense_patch, fixture.expensePatch);
});

Deno.test(
  "wallet response-loss recovery keeps account scope in the CAS snapshot",
  () => {
    const accountId = "77777777-7777-4777-8777-777777777777";
    const recoveredExpense = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      household_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      account_id: accountId,
      amount_cents: 11223,
      currency: "cad",
      split_group_id: null,
    };
    assertEquals(expectedSplitParentFromTransaction(recoveredExpense), {
      household_id: recoveredExpense.household_id,
      account_id: accountId,
      amount_cents: 11223,
      currency: "CAD",
      split_group_id: null,
    });
  },
);

Deno.test(
  "missing atomic patch wrapper fails closed without partial writes",
  async () => {
    const fixture = splitCommitFixture();
    for (const missingCode of ["42883", "PGRST202"]) {
      const stub = createSplitCommitFallbackStub([{ code: missingCode }]);
      const result = await commitHouseholdSplitRecordsWithPatch({
        supabase: stub.supabase,
        actorUserId: members[0].user_id,
        ...fixture,
        previousSplitGroupId: fixture.group.id,
        targetAccountId: fixture.expectedParent.account_id,
      });

      assertEquals((result.error as { code: string }).code, missingCode);
      assertEquals(
        stub.rpcCalls.map((call) => call.functionName),
        ["households_commit_expense_split_write_with_patch_v3"],
      );
      assertEquals(stub.writes.length, 0);
    }
  },
);

Deno.test(
  "brand-new split writer keeps the bounded rollout fallback",
  async () => {
    const fixture = splitCommitFixture();
    for (const missingCode of ["42883", "PGRST202"]) {
      const stub = createSplitCommitFallbackStub([{ code: missingCode }]);
      const result = await commitHouseholdSplitRecords({
        supabase: stub.supabase,
        actorUserId: members[0].user_id,
        group: fixture.group,
        lines: fixture.lines,
        expectedParent: fixture.expectedParent,
        targetAccountId: fixture.expectedParent.account_id,
      });

      assertEquals(result.error, null);
      assertEquals(stub.rpcCalls.length, 1);
      assertEquals(
        stub.rpcCalls[0].functionName,
        "households_commit_expense_split_write_v3",
      );
      assertEquals(
        stub.writes.some(
          (write) =>
            write.table === "expense_split_groups" &&
            write.action === "insert",
        ),
        true,
      );
      assertEquals(
        stub.writes.some(
          (write) =>
            write.table === "expense_split_lines" &&
            write.action === "insert",
        ),
        true,
      );
      const parentWrite = stub.writes.find(
        (write) => write.table === "expenses" && write.action === "update",
      );
      assertExists(parentWrite);
      assertEquals(parentWrite.payload, {
        amount_cents: fixture.group.total_amount_cents,
        currency: fixture.group.currency,
        household_id: fixture.group.household_id,
        split_group_id: fixture.group.id,
        account_id: fixture.expectedParent.account_id,
      });
    }
  },
);

Deno.test(
  "atomic split errors never fall through to a less strict writer",
  async () => {
    const fixture = splitCommitFixture();
    const wrapperFailure = createSplitCommitFallbackStub([
      { code: "P0001", message: "split parent changed" },
    ]);
    const first = await commitHouseholdSplitRecordsWithPatch({
      supabase: wrapperFailure.supabase,
      actorUserId: members[0].user_id,
      ...fixture,
    });
    assertEquals((first.error as { code: string }).code, "P0001");
    assertEquals(wrapperFailure.rpcCalls.length, 1);
    assertEquals(wrapperFailure.writes.length, 0);

    const missingWrapper = createSplitCommitFallbackStub([
      { code: "PGRST202" },
    ]);
    const second = await commitHouseholdSplitRecordsWithPatch({
      supabase: missingWrapper.supabase,
      actorUserId: members[0].user_id,
      ...fixture,
    });
    assertEquals((second.error as { code: string }).code, "PGRST202");
    assertEquals(missingWrapper.rpcCalls.length, 1);
    assertEquals(missingWrapper.writes.length, 0);

    assertEquals(isMissingSettlementRpcError({ code: "42883" }), true);
    assertEquals(isMissingSettlementRpcError({ code: "PGRST202" }), true);
    assertEquals(isMissingSettlementRpcError({ code: "PGRST203" }), false);
    assertEquals(isMissingSettlementRpcError({ code: "P0001" }), false);
  },
);

Deno.test("atomic split removal patch keeps its production contract", async () => {
  const fixture = splitCommitFixture();
  const calls: Array<{
    functionName: string;
    params: Record<string, unknown>;
  }> = [];
  const supabase = {
    rpc(functionName: string, params: Record<string, unknown>) {
      calls.push({ functionName, params });
      return { data: null, error: null };
    },
  };
  const result = await removeHouseholdSplitWithPatch({
    supabase,
    actorUserId: members[0].user_id,
    expenseId: fixture.group.expense_id,
    splitGroupId: fixture.group.id,
    targetHouseholdId: null,
    targetCurrency: "CAD",
    targetAmountCents: fixture.group.total_amount_cents,
    targetAccountId: fixture.expectedParent.account_id,
    expectedParent: fixture.expectedParent,
    expensePatch: fixture.expensePatch,
  });

  assertEquals(result.error, null);
  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].functionName,
    "households_remove_expense_split_with_patch_v3",
  );
  assertEquals(calls[0].params.p_expense_id, fixture.group.expense_id);
  assertEquals(calls[0].params.p_split_group_id, fixture.group.id);
  assertEquals(calls[0].params.p_target_household_id, null);
  assertEquals(calls[0].params.p_expected_parent, fixture.expectedParent);
  assertEquals(calls[0].params.p_expense_patch, fixture.expensePatch);
});

Deno.test(
  "missing atomic removal wrapper fails closed without partial writes",
  async () => {
    const fixture = splitCommitFixture();
    for (const missingCode of ["42883", "PGRST202"]) {
      const stub = createSplitCommitFallbackStub([{ code: missingCode }]);
      const result = await removeHouseholdSplitWithPatch({
        supabase: stub.supabase,
        actorUserId: members[0].user_id,
        expenseId: fixture.group.expense_id,
        splitGroupId: fixture.group.id,
        targetHouseholdId: null,
        targetCurrency: "cad",
        targetAmountCents: fixture.group.total_amount_cents,
        targetAccountId: fixture.expectedParent.account_id,
        expectedParent: fixture.expectedParent,
        expensePatch: fixture.expensePatch,
      });
      assertEquals((result.error as { code: string }).code, missingCode);
      assertEquals(
        stub.rpcCalls.map((call) => call.functionName),
        ["households_remove_expense_split_with_patch_v3"],
      );
      assertEquals(stub.writes.length, 0);
    }

    const strictFailure = createSplitCommitFallbackStub([
      { code: "P0001", message: "allocated split cannot be removed" },
    ]);
    const failedResult = await removeHouseholdSplitWithPatch({
      supabase: strictFailure.supabase,
      actorUserId: members[0].user_id,
      expenseId: fixture.group.expense_id,
      splitGroupId: fixture.group.id,
      targetHouseholdId: null,
      targetCurrency: "CAD",
      targetAmountCents: fixture.group.total_amount_cents,
      targetAccountId: fixture.expectedParent.account_id,
      expectedParent: fixture.expectedParent,
      expensePatch: fixture.expensePatch,
    });
    assertEquals((failedResult.error as { code: string }).code, "P0001");
    assertEquals(strictFailure.rpcCalls.length, 1);
    assertEquals(strictFailure.writes.length, 0);
  },
);
