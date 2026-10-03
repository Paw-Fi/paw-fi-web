import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  type InteractiveContext,
  parseInteractiveQuestion,
  parseInteractiveRequest,
  parseInteractiveSource,
  validateInteractiveItems,
} from "../shared/interactive-transaction-contract.ts";
import {
  buildHouseholdSplitRecords,
  type CustomSplits,
  resolveEffectiveSplit,
} from "../shared/household-auto-split.ts";
import {
  enrichVerifiedInteractiveItems,
  runInteractiveTransactionAnalysis,
} from "../shared/interactive-transaction-analysis.ts";

const context: InteractiveContext = {
  userId: "me",
  defaultSpaceId: "personal",
  defaultWalletId: "eur-wallet",
  currency: "EUR",
  date: "2026-10-02",
  language: "en",
  expenseCategories: ["groceries", "restaurants", "other"],
  incomeCategories: ["salary"],
  spaces: [
    { id: "personal", name: "Personal", isPortfolio: false, members: [] },
    {
      id: "family",
      name: "家族",
      isPortfolio: false,
      members: [{ userId: "me", name: "Charles" }, {
        userId: "alice",
        name: "Alice",
      }],
    },
    {
      id: "private",
      name: "Work",
      isPortfolio: true,
      members: [{ userId: "me", name: "Charles" }],
    },
  ],
  wallets: [
    { id: "eur-wallet", name: "Cash", currency: "EUR", spaceId: "personal" },
    { id: "usd-wallet", name: "旅行", currency: "USD", spaceId: "family" },
  ],
};
const transaction = (overrides = {}) => ({
  type: "expense",
  amount: 70,
  currency: "USD",
  date: "2026-09-30",
  category: "groceries",
  description: "晚餐",
  merchant: "小商店",
  transactionTime: "18:30:00",
  spaceId: "family",
  walletId: "usd-wallet",
  explicitFields: [
    "currency",
    "date",
    "merchant",
    "transactionTime",
    "spaceId",
    "walletId",
  ],
  ...overrides,
});

Deno.test("interactive: optional enrichment cannot rewrite verified financial fields", async () => {
  const items = validateInteractiveItems([transaction()], context).items;
  const original = structuredClone(items);
  const enriched = await enrichVerifiedInteractiveItems(
    items,
    async (input) => {
      input[0].amount = 999;
      input[0].merchant = "invented";
      input[0].destination.accountId = "other-wallet";
      return [{
        ...input[0],
        merchant_id: "canonical",
        merchant_domain: "example.invalid",
        merchant_structured_name: "Canonical",
      }];
    },
  );
  assertEquals(items, original);
  assertEquals(enriched, [{
    ...original[0],
    merchant_id: "canonical",
    merchant_domain: "example.invalid",
    merchant_structured_name: "Canonical",
  }]);
  assertEquals(
    await enrichVerifiedInteractiveItems(items, async () => {
      throw new Error("optional lookup failed");
    }),
    original,
  );
  assertEquals(
    await enrichVerifiedInteractiveItems(items, async () => []),
    original,
  );
});

Deno.test("interactive: merchant bounds match every save endpoint", () => {
  assertEquals(
    validateInteractiveItems(
      [transaction({ merchant: "商".repeat(255) })],
      context,
    ).issues,
    [],
  );
  assertEquals(
    validateInteractiveItems(
      [transaction({ merchant: "商".repeat(256) })],
      context,
    ).items,
    [],
  );
});

Deno.test("interactive: unresolved DST clock requests produce only a localized question", async () => {
  const request = parseInteractiveRequest({
    version: 1,
    answers: [],
    clientIssue: {
      itemIndex: 1,
      field: "transactionTime",
      reason: "ambiguous_wall_time",
    },
  })!;
  const phases: string[] = [];
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "家族と、時計が重なる時間" },
    request,
    context: { ...context, language: "ja" },
    complete: async (phase, _model, payload) => {
      phases.push(phase);
      assertEquals(payload.issues, [request.clientIssue]);
      return {
        question: "どの時刻を記録しますか？",
        choices: ["別の時刻を指定", "日付のみを記録"],
      };
    },
  });
  assertEquals(phases, ["clarify"]);
  assertEquals(result.requireCorrection, true);
  assertEquals(result.items, []);
  assertEquals(
    "correction" in result && result.correction.allowCustomResponse,
    true,
  );
  for (
    const clientIssue of [
      {
        itemIndex: 40,
        field: "transactionTime",
        reason: "ambiguous_wall_time",
      },
      { itemIndex: 0, field: "walletId", reason: "ambiguous_wall_time" },
      { itemIndex: 0, field: "transactionTime", reason: "invented" },
    ]
  ) {
    let rejected = false;
    try {
      parseInteractiveRequest({ version: 1, clientIssue });
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true);
  }
});

Deno.test("interactive: explicit native details and destinations survive conflicting defaults", () => {
  const result = validateInteractiveItems([transaction()], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].currency, "USD");
  assertEquals(result.items[0].amount, 70);
  assertEquals(result.items[0].merchant, "小商店");
  assertEquals(result.items[0].date, "2026-09-30");
  assertEquals(result.items[0].transactionTime, "18:30:00");
  assertEquals(result.items[0].destination, {
    householdId: "family",
    isPortfolio: false,
    accountId: "usd-wallet",
    accountCurrency: "USD",
    spaceLabel: "家族",
  });
});

Deno.test("interactive: each transaction owns its Space without cross-item leakage", () => {
  const result = validateInteractiveItems([
    transaction(),
    transaction({
      currency: "EUR",
      spaceId: "personal",
      walletId: "eur-wallet",
    }),
  ], context);
  assertEquals(result.issues, []);
  assertEquals(result.items.map((item) => item.destination.householdId), [
    "family",
    null,
  ]);
});

Deno.test("interactive: no explicit destination uses only compatible drawer defaults", () => {
  const result = validateInteractiveItems([
    transaction({
      spaceId: undefined,
      walletId: undefined,
      explicitFields: ["date", "currency", "transactionTime"],
    }),
  ], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].destination.accountId, null);
  assertEquals(result.items[0].destination.householdId, null);
});

Deno.test("interactive: a named wallet can establish its Space and omitted currency", () => {
  const result = validateInteractiveItems([
    transaction({
      spaceId: undefined,
      currency: undefined,
      explicitFields: ["date", "walletId", "transactionTime"],
    }),
  ], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].currency, "USD");
  assertEquals(result.items[0].destination.householdId, "family");
});

for (
  const [name, overrides] of Object.entries({
    "foreign wallet": { walletId: "not-authorized" },
    "foreign Space": { spaceId: "not-authorized" },
    "wallet currency conflict": { currency: "EUR" },
    "wallet Space conflict": { spaceId: "personal" },
    "invalid date": { date: "2026-02-30" },
    "invalid time": { transactionTime: "25:20:00" },
    "invalid amount": { amount: Infinity },
    "unsupported category": { category: "invented" },
    "unknown payer": {
      payerUserId: "outsider",
      explicitFields: ["date", "payerUserId", "spaceId", "walletId"],
    },
  })
) {
  Deno.test(`interactive: ${name} blocks the whole proposal rather than dropping data`, () => {
    const result = validateInteractiveItems([
      transaction(),
      transaction(overrides),
    ], context);
    assertEquals(result.items, []);
    assertEquals(result.issues.length > 0, true);
  });
}

Deno.test("interactive: explicit Alice 50 and me 20 is preserved exactly", () => {
  const customSplits = {
    splitType: "amount",
    memberSplits: [{ userId: "alice", amount: 50 }, {
      userId: "me",
      amount: 20,
    }],
  };
  const result = validateInteractiveItems([
    transaction({
      customSplits,
      explicitFields: [
        "date",
        "spaceId",
        "walletId",
        "currency",
        "customSplits",
        "transactionTime",
      ],
    }),
  ], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].customSplits, customSplits);
});

for (const amount of [60, 100]) {
  Deno.test(`interactive: split total ${amount} never rewrites the explicit 50/20`, () => {
    const result = validateInteractiveItems([transaction({
      amount,
      customSplits: {
        splitType: "amount",
        memberSplits: [{ userId: "alice", amount: 50 }, {
          userId: "me",
          amount: 20,
        }],
      },
      explicitFields: [
        "date",
        "spaceId",
        "walletId",
        "currency",
        "customSplits",
        "transactionTime",
      ],
    })], context);
    assertEquals(result.items, []);
    assertEquals(
      result.issues.some((issue) => issue.field === "customSplits"),
      true,
    );
  });
}

Deno.test("interactive: deliberate equal split is not erased in favor of stored defaults", () => {
  const customSplits = {
    splitType: "equal",
    memberSplits: [{ userId: "alice" }, { userId: "me" }],
  };
  const result = validateInteractiveItems([
    transaction({
      customSplits,
      explicitFields: [
        "date",
        "spaceId",
        "walletId",
        "currency",
        "customSplits",
        "transactionTime",
      ],
    }),
  ], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].customSplits, customSplits);
});

Deno.test("interactive: duplicate members and unsupported allocations require correction", () => {
  for (
    const memberSplits of [
      [{ userId: "alice", amount: 50 }, { userId: "alice", amount: 20 }],
      [{ userId: "alice", amount: 50 }, { userId: "outsider", amount: 20 }],
      [{ userId: "alice", amount: -10 }, { userId: "me", amount: 80 }],
    ]
  ) {
    const result = validateInteractiveItems([
      transaction({
        customSplits: { splitType: "amount", memberSplits },
        explicitFields: [
          "date",
          "customSplits",
          "spaceId",
          "walletId",
          "currency",
          "transactionTime",
        ],
      }),
    ], context);
    assertEquals(result.items, []);
    assertEquals(result.issues.length > 0, true);
  }
});

Deno.test("interactive: subset allocations are completed with zero, never redistributed", () => {
  const expanded = {
    ...context,
    spaces: context.spaces.map((space) =>
      space.id === "family"
        ? {
          ...space,
          members: [...space.members, { userId: "bob", name: "Bob" }],
        }
        : space
    ),
  };
  const result = validateInteractiveItems([transaction({
    customSplits: {
      splitType: "amount",
      memberSplits: [{ userId: "alice", amount: 50 }, {
        userId: "me",
        amount: 20,
      }],
    },
    explicitFields: [
      "date",
      "spaceId",
      "walletId",
      "currency",
      "customSplits",
      "transactionTime",
    ],
  })], expanded);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].customSplits, {
    splitType: "amount",
    memberSplits: [{ userId: "alice", amount: 50 }, {
      userId: "me",
      amount: 20,
    }, { userId: "bob", amount: 0 }],
  });
});

Deno.test("interactive: recurrence uses the existing save contract", () => {
  const recurrence_rule = {
    frequency: "monthly",
    interval: 1,
    anchor_date: "2026-09-30",
  };
  const result = validateInteractiveItems([
    transaction({
      transactionTime: undefined,
      isRecurring: true,
      recurrence_rule,
      explicitFields: [
        "date",
        "isRecurring",
        "recurrence_rule",
        "spaceId",
        "walletId",
        "currency",
      ],
    }),
  ], context);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].recurrence_rule, recurrence_rule);
});

Deno.test("interactive: independent verification disagreement returns no saveable items", async () => {
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "١٠٠ للعشاء، أليس ٥٠ وأنا ٢٠" },
    request: { version: 1, answers: [] },
    context,
    complete: (phase) =>
      Promise.resolve(
        phase === "extract" ? { decision: "ready", items: [transaction()] } : {
          approved: false,
          question: "كيف نوزع المبلغ المتبقي؟",
          choices: ["٣٠ لي", "٣٠ لأليس"],
        },
      ),
  });
  assertEquals(result.requireCorrection, true);
  assertEquals(result.items, []);
});

Deno.test("interactive: multilingual clarification is replayed with the original source", async () => {
  const source = {
    text: "家族で夕食70米ドル、アリス50、自分20、9月30日18時30分",
  };
  const answers = [{ question: "どの財布ですか？", answer: "旅行" }];
  const phases: string[] = [];
  const result = await runInteractiveTransactionAnalysis({
    source,
    request: { version: 1, answers },
    context,
    complete: (phase, _model, payload) => {
      phases.push(phase);
      assertEquals(payload.source, source.text);
      assertEquals(payload.answers, answers);
      return Promise.resolve(
        phase === "extract"
          ? { decision: "ready", items: [transaction()] }
          : { approved: true },
      );
    },
  });
  assertEquals(result.requireCorrection, false);
  assertEquals(phases, ["extract", "verify"]);
});

Deno.test("interactive: invalid arithmetic asks a question, never self-repairs", async () => {
  const phases: string[] = [];
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "100 dinner, Alice 50, me 20" },
    request: { version: 1, answers: [] },
    context,
    complete: (phase) => {
      phases.push(phase);
      return Promise.resolve(
        phase === "extract"
          ? {
            decision: "ready",
            items: [transaction({
              amount: 100,
              customSplits: {
                splitType: "amount",
                memberSplits: [{ userId: "alice", amount: 50 }, {
                  userId: "me",
                  amount: 20,
                }],
              },
              explicitFields: [
                "date",
                "customSplits",
                "spaceId",
                "walletId",
                "currency",
                "transactionTime",
              ],
            })],
          }
          : {
            question: "Who gets the remaining 30?",
            choices: [
              "Give the remaining 30 to me",
              "Give the remaining 30 to Alice",
            ],
          },
      );
    },
  });
  assertEquals(result.requireCorrection, true);
  assertEquals(result.items, []);
  assertEquals(phases, ["extract", "clarify"]);
});

Deno.test("interactive: legacy requests remain outside the opt-in contract", () => {
  assertEquals(parseInteractiveRequest(undefined), null);
  assertEquals(parseInteractiveRequest({ version: 1, answers: [] }), {
    version: 1,
    answers: [],
  });
});

Deno.test("interactive: malformed or unbounded clarification histories fail validation", async () => {
  for (
    const value of [{ version: 2 }, {
      version: 1,
      answers: [{ question: "q", answer: "" }],
    }, { version: 1, answers: Array(13).fill({ question: "q", answer: "a" }) }]
  ) {
    await assertRejects(async () => parseInteractiveRequest(value));
  }
});

Deno.test("interactive: compatible drawer wallet supplies an omitted native currency", () => {
  const drawer = {
    ...context,
    defaultSpaceId: "family",
    defaultWalletId: "usd-wallet",
  };
  const result = validateInteractiveItems([
    transaction({
      currency: undefined,
      spaceId: undefined,
      walletId: undefined,
      explicitFields: ["date", "transactionTime"],
    }),
  ], drawer);
  assertEquals(result.issues, []);
  assertEquals(result.items[0].currency, "USD");
  assertEquals(result.items[0].destination.accountId, "usd-wallet");
  const explicit = validateInteractiveItems([
    transaction({
      currency: "EUR",
      spaceId: undefined,
      walletId: undefined,
      explicitFields: ["date", "currency", "transactionTime"],
    }),
  ], drawer);
  assertEquals(explicit.issues, []);
  assertEquals(explicit.items[0].currency, "EUR");
  assertEquals(explicit.items[0].destination.accountId, null);
});

Deno.test("interactive: inferred currency and date cannot override authoritative defaults", () => {
  for (
    const overrides of [
      { currency: "USD", date: context.date },
      { currency: context.currency, date: "2026-09-30" },
    ]
  ) {
    const result = validateInteractiveItems([transaction({
      ...overrides,
      spaceId: undefined,
      walletId: undefined,
      explicitFields: ["transactionTime"],
    })], context);
    assertEquals(result.items, []);
  }
});

Deno.test("interactive: an unavailable drawer wallet cannot silently become Spending", () => {
  const stale = { ...context, defaultWalletId: "deleted-wallet" };
  const result = validateInteractiveItems([transaction({
    currency: context.currency,
    date: context.date,
    spaceId: undefined,
    walletId: undefined,
    explicitFields: ["transactionTime"],
  })], stale);
  assertEquals(result.items, []);
  assertEquals(result.issues.some((issue) => issue.field === "walletId"), true);
  // An explicit authorized replacement takes precedence over stale drawer data.
  assertEquals(validateInteractiveItems([transaction()], stale).issues, []);
});

Deno.test("interactive: invalid provenance and unsupported details cannot silently save", () => {
  for (
    const overrides of [
      { explicitFields: ["date", "currency", 3] },
      { explicitFields: ["date", "currency", "currency"] },
      { explicitFields: ["date", "unsupported"] },
      { explicitFields: ["date"] },
      { notes: "保留這個備註" },
      { isRecurring: "true" },
      {
        recurrence_rule: {
          frequency: "monthly",
          interval: 1,
          anchor_date: "2026-09-30",
        },
        isRecurring: false,
      },
      {
        isRecurring: true,
        recurrence_rule: {
          frequency: "monthly",
          interval: 1,
          anchor_date: "2026-09-30",
        },
        transactionTime: undefined,
        explicitFields: ["date", "spaceId", "walletId", "currency"],
      },
    ]
  ) {
    const result = validateInteractiveItems([transaction(overrides)], context);
    assertEquals(result.items, [], JSON.stringify(overrides));
    assertEquals(result.issues.length > 0, true);
  }
});

Deno.test("interactive: recurrence cannot drop extra schedule details or change its anchor", () => {
  for (
    const recurrence_rule of [
      { frequency: "monthly", interval: 1, anchor_date: "2026-10-01" },
      {
        frequency: "monthly",
        interval: 1,
        anchor_date: "2026-09-30",
        weekday: "monday",
      },
      {
        frequency: "monthly",
        interval: 1,
        anchor_date: "2026-09-30",
        end_date: "2026-09-29",
      },
    ]
  ) {
    assertEquals(
      validateInteractiveItems([
        transaction({
          isRecurring: true,
          recurrence_rule,
          transactionTime: undefined,
          explicitFields: [
            "date",
            "isRecurring",
            "recurrence_rule",
            "spaceId",
            "walletId",
            "currency",
          ],
        }),
      ], context).items,
      [],
    );
  }
});

Deno.test("interactive: explicit payer cannot be lost when the Space has no automatic split", () => {
  const disabled = {
    ...context,
    spaces: context.spaces.map((space) => ({
      ...space,
      autoSplitEnabled: false,
    })),
  };
  const candidate = transaction({
    payerUserId: "alice",
    explicitFields: [
      "date",
      "payerUserId",
      "spaceId",
      "walletId",
      "currency",
      "transactionTime",
    ],
  });
  assertEquals(validateInteractiveItems([candidate], disabled).items, []);
  const customSplits = {
    splitType: "amount",
    memberSplits: [{ userId: "alice", amount: 50 }, {
      userId: "me",
      amount: 20,
    }],
  };
  const accepted = validateInteractiveItems([{
    ...candidate,
    customSplits,
    explicitFields: [...candidate.explicitFields, "customSplits"],
  }], disabled);
  assertEquals(accepted.issues, []);
  assertEquals(accepted.items[0].payerUserId, "alice");
});

Deno.test("interactive: allocation fields cannot carry contradictory amounts", () => {
  for (
    const customSplits of [
      {
        splitType: "equal",
        memberSplits: [{ userId: "alice", amount: 50 }, {
          userId: "me",
          amount: 20,
        }],
      },
      {
        splitType: "amount",
        memberSplits: [{ userId: "alice", amount: 50, percentage: 50 }, {
          userId: "me",
          amount: 20,
        }],
      },
      {
        splitType: "shares",
        memberSplits: [{ userId: "alice", shares: 0 }, {
          userId: "me",
          shares: 2,
        }],
      },
    ]
  ) {
    assertEquals(
      validateInteractiveItems([
        transaction({
          customSplits,
          explicitFields: [
            "date",
            "spaceId",
            "walletId",
            "currency",
            "customSplits",
            "transactionTime",
          ],
        }),
      ], context).items,
      [],
    );
  }
});

Deno.test("interactive: approved allocations survive the actual save resolver with conflicting defaults", () => {
  const expanded = {
    ...context,
    spaces: context.spaces.map((space) =>
      space.id === "family"
        ? {
          ...space,
          members: [...space.members, { userId: "bob", name: "Bob" }],
        }
        : space
    ),
  };
  for (
    const [catalog, customSplits, expected] of [
      [context, {
        splitType: "amount",
        memberSplits: [{ userId: "alice", amount: 35 }, {
          userId: "me",
          amount: 35,
        }],
      }, { alice: 3500, me: 3500 }],
      [context, {
        splitType: "percentage",
        memberSplits: [{ userId: "alice", percentage: 50 }, {
          userId: "me",
          percentage: 50,
        }],
      }, { alice: 3500, me: 3500 }],
      [expanded, {
        splitType: "equal",
        memberSplits: [{ userId: "alice" }, { userId: "me" }],
      }, { alice: 3500, me: 3500, bob: 0 }],
      [expanded, {
        splitType: "amount",
        memberSplits: [{ userId: "alice", amount: 50 }, {
          userId: "me",
          amount: 20,
        }],
      }, { alice: 5000, me: 2000, bob: 0 }],
      [expanded, {
        splitType: "shares",
        memberSplits: [{ userId: "alice", shares: 5 }, {
          userId: "me",
          shares: 2,
        }],
      }, { alice: 5000, me: 2000, bob: 0 }],
    ] as Array<[InteractiveContext, CustomSplits, Record<string, number>]>
  ) {
    const accepted = validateInteractiveItems([
      transaction({
        customSplits,
        explicitFields: [
          "date",
          "spaceId",
          "walletId",
          "currency",
          "customSplits",
          "transactionTime",
        ],
      }),
    ], catalog);
    assertEquals(accepted.issues, []);
    const members = catalog.spaces.find((space) =>
      space.id === "family"
    )!.members;
    for (const autoSplitEnabled of [true, false]) {
      const effective = resolveEffectiveSplit(accepted.items[0].customSplits, {
        autoSplitEnabled,
        defaultConfig: {
          splitType: "amount",
          memberSplits: members.map((member, index) => ({
            userId: member.userId,
            amount: index === 0 ? 70 : 0,
          })),
        },
      });
      if (effective.kind !== "customSplits") {
        throw new Error(
          "Explicit allocation was discarded",
        );
      }
      assertEquals(effective.source, "explicit");
      const saved = buildHouseholdSplitRecords({
        householdId: "family",
        transactionId: "transaction",
        payerUserId: "me",
        amountCents: 7000,
        currency: "USD",
        description: null,
        members: members.map((member) => ({ user_id: member.userId })),
        customSplits: effective.customSplits,
      });
      if (!saved.ok) throw new Error(saved.error);
      assertEquals(
        Object.fromEntries(
          saved.lines.map((line) => [line.user_id, line.amount_cents]),
        ),
        expected,
      );
    }
  }
});

Deno.test("interactive: split verification requires both independent approvals", async () => {
  let verifications = 0;
  const models: string[] = [];
  const result = await runInteractiveTransactionAnalysis({
    source: { text: "夕食70米ドル、アリス50、自分20" },
    request: { version: 1, answers: [] },
    context,
    complete: (phase, model) => {
      if (phase === "extract") {
        return Promise.resolve({
          decision: "ready",
          items: [transaction({
            customSplits: {
              splitType: "amount",
              memberSplits: [{ userId: "alice", amount: 50 }, {
                userId: "me",
                amount: 20,
              }],
            },
            explicitFields: [
              "date",
              "spaceId",
              "walletId",
              "currency",
              "customSplits",
              "transactionTime",
            ],
          })],
        });
      }
      models.push(model);
      return Promise.resolve(
        ++verifications === 1 ? { approved: true } : {
          approved: false,
          question: "どの共有スペースですか？",
          choices: ["家族に保存", "別のスペースを指定"],
        },
      );
    },
  });
  assertEquals(verifications, 2);
  assertEquals(new Set(models).size, 2);
  assertEquals(result.items, []);
  assertEquals(result.requireCorrection, true);
});

Deno.test("interactive: provider failure cannot return unverified ready items", async () => {
  await assertRejects(
    () =>
      runInteractiveTransactionAnalysis({
        source: { audio: { data: "recording", contentType: "audio/mp4" } },
        request: { version: 1, answers: [] },
        context,
        complete: (phase) =>
          phase === "extract"
            ? Promise.resolve({ decision: "ready", items: [transaction()] })
            : Promise.reject(new Error("provider unavailable")),
      }),
    Error,
    "provider unavailable",
  );
});

Deno.test("interactive: typed and bounded sources reject malformed requests before AI", () => {
  assertEquals(
    parseInteractiveSource({
      text: "昨夜、食料品に１，２３４．５０円",
      currency: "JPY",
      date: "2026-10-03",
    }).text,
    "昨夜、食料品に１，２３４．５０円",
  );
  assertEquals(
    parseInteractiveSource({
      audio: { data: "recording", contentType: "audio/mp4" },
    }).audio?.contentType,
    "audio/mp4",
  );
  for (
    const value of [
      null,
      { text: {} },
      { text: " " },
      { text: "x".repeat(16001) },
      { text: "20 dinner", currency: 3 },
      { text: "20 dinner", date: "2026-02-30" },
      { text: "20 dinner", attachments: {} },
      { text: "20 dinner", image: "data" },
      { audio: { data: "audio", contentType: "text/plain" } },
    ]
  ) {
    let rejected = false;
    try {
      parseInteractiveSource(value);
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true, JSON.stringify(value));
  }
});

Deno.test("interactive: clarification choices are trimmed and remain distinct", () => {
  assertEquals(
    parseInteractiveQuestion({
      question: " 財布？ ",
      choices: [" 旅行 ", " 現金 "],
    }).choices,
    ["旅行", "現金"],
  );
  let rejected = false;
  try {
    parseInteractiveQuestion({
      question: "財布？",
      choices: ["旅行", " 旅行 "],
    });
  } catch {
    rejected = true;
  }
  assertEquals(rejected, true);
});
