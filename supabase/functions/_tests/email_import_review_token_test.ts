/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertMatch,
  assertNotEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildEmailImportReviewItem,
  buildEmailImportReviewSource,
  createEmailImportReviewToken,
  hashEmailImportReviewToken,
  isValidReviewToken,
  reviewDecisionOptionIds,
  validateStoredReviewDecisions,
} from "../shared/email-import-review.ts";

Deno.test("review responses expose bounded structured source context", () => {
  assertEquals(
    buildEmailImportReviewSource({
      sender_email: "receipts@example.com",
      created_at: "2026-08-11T10:00:00.000Z",
      result: {
        emailSummary: {
          subjectLine: "August card receipts",
          receivedAt: "2026-08-11T09:58:00.000Z",
        },
        attachmentResults: [
          { filename: "hotel.pdf", success: true, itemCount: 2, items: [{}] },
          { filename: "taxi.jpg", success: false, itemCount: 0, error: "x" },
        ],
      },
    }),
    {
      senderEmail: "receipts@example.com",
      subjectLine: "August card receipts",
      receivedAt: "2026-08-11T09:58:00.000Z",
      files: [
        { name: "hotel.pdf", status: "processed", transactionCount: 2 },
        { name: "taxi.jpg", status: "failed", transactionCount: 0 },
      ],
    },
  );
});

Deno.test(
  "review items prefer resolved transaction details after submission",
  () => {
    assertEquals(
      buildEmailImportReviewItem({
        id: "item-1",
        candidate: {
          type: "expense",
          amount: 42.5,
          currency: "usd",
          date: "2026-08-10",
          merchant: "Original merchant",
          description: "Airport ride",
          category: "other",
          accountId: "internal-account-id",
        },
        resolved_transaction: {
          type: "expense",
          amount: 42.5,
          currency: "USD",
          date: "2026-08-10",
          merchant: "City Taxi",
          description: "Airport ride",
          category: "transportation",
        },
        issues: [],
        options: [],
        selected_option_ids: ["merchant:city-taxi"],
        save_status: "saved",
        save_result: { id: "transaction-id", data: { secret: true } },
      }),
      {
        id: "item-1",
        summary: "Airport ride",
        transaction: {
          type: "expense",
          amount: 42.5,
          currency: "USD",
          date: "2026-08-10",
          merchant: "City Taxi",
          description: "Airport ride",
          category: "transportation",
        },
        issues: [],
        options: [],
        selectedOptionIds: ["merchant:city-taxi"],
        saveStatus: "saved",
        transactionId: "transaction-id",
      },
    );
  },
);

Deno.test(
  "email import review tokens are 256-bit base64url secrets and only hashes are persistable",
  async () => {
    const token = createEmailImportReviewToken();
    const secondToken = createEmailImportReviewToken();
    const hash = await hashEmailImportReviewToken(token);

    assertEquals(isValidReviewToken(token), true);
    assertMatch(hash, /^[0-9a-f]{64}$/);
    assertNotEquals(token, secondToken);
    assertNotEquals(token, hash);
  },
);

Deno.test(
  "review decisions reject missing, duplicate, and unknown options",
  () => {
    const items = [
      {
        id: "item-1",
        issues: [
          {
            field: "currency",
            choices: [
              { id: "currency:USD", value: "USD" },
              { id: "currency:EUR", value: "EUR" },
            ],
          },
        ],
      },
    ];

    assertEquals(validateStoredReviewDecisions(items, []), null);
    assertEquals(
      validateStoredReviewDecisions(items, [
        { itemId: "item-1", optionIds: ["currency:GBP"] },
      ]),
      null,
    );
    assertEquals(
      validateStoredReviewDecisions(items, [
        { itemId: "item-1", optionIds: ["currency:USD"] },
        { itemId: "item-1", optionIds: ["currency:USD"] },
      ]),
      null,
    );
  },
);

Deno.test(
  "review decisions resolve server options independent of request order",
  () => {
    const result = validateStoredReviewDecisions(
      [
        {
          id: "item-1",
          issues: [
            {
              field: "currency",
              choices: [
                { id: "currency:USD", value: "USD" },
                { id: "currency:EUR", value: "EUR" },
              ],
            },
            {
              field: "type",
              choices: [
                { id: "type:expense", value: "expense" },
                { id: "type:income", value: "income" },
              ],
            },
          ],
        },
      ],
      [
        {
          itemId: "item-1",
          optionIds: ["type:expense", "currency:USD"],
        },
      ],
    );

    assertEquals(result, [
      {
        itemId: "item-1",
        decline: false,
        optionIds: ["currency:USD", "type:expense"],
      },
    ]);
  },
);

Deno.test("review retry accepts decisions for actionable items only", () => {
  const issue = {
    field: "currency",
    choices: [
      { id: "currency:USD", value: "USD" },
      { id: "currency:EUR", value: "EUR" },
    ],
  };
  const result = validateStoredReviewDecisions(
    [
      { id: "saved-item", issues: [issue], save_status: "saved" },
      { id: "pending-item", issues: [issue], save_status: "pending" },
    ],
    [{ itemId: "pending-item", optionIds: ["currency:EUR"] }],
  );

  assertEquals(result, [
    {
      itemId: "pending-item",
      decline: false,
      optionIds: ["currency:EUR"],
    },
  ]);
});

Deno.test(
  "review retry reuses a persisted processing choice and accepts legacy full payloads",
  () => {
    const issue = {
      field: "currency",
      choices: [
        { id: "currency:USD", value: "USD" },
        { id: "currency:EUR", value: "EUR" },
      ],
    };
    const items = [
      {
        id: "processing-item",
        issues: [issue],
        save_status: "processing",
        selected_option_ids: ["currency:USD"],
      },
      { id: "pending-item", issues: [issue], save_status: "pending" },
    ];

    assertEquals(
      validateStoredReviewDecisions(items, [
        { itemId: "pending-item", optionIds: ["currency:EUR"] },
      ]),
      [
        {
          itemId: "processing-item",
          decline: false,
          optionIds: ["currency:USD"],
        },
        {
          itemId: "pending-item",
          decline: false,
          optionIds: ["currency:EUR"],
        },
      ],
    );

    assertEquals(
      validateStoredReviewDecisions(items, [
        { itemId: "processing-item", optionIds: ["currency:EUR"] },
        { itemId: "pending-item", optionIds: ["currency:EUR"] },
      ]),
      [
        {
          itemId: "processing-item",
          decline: false,
          optionIds: ["currency:USD"],
        },
        {
          itemId: "pending-item",
          decline: false,
          optionIds: ["currency:EUR"],
        },
      ],
    );
  },
);

Deno.test("review retry rejects malformed persisted choices and skipped pending items", () => {
  const issue = {
    field: "currency",
    choices: [{ id: "currency:USD", value: "USD" }],
  };
  assertEquals(
    validateStoredReviewDecisions(
      [
        {
          id: "processing-item",
          issues: [issue],
          save_status: "processing",
          selected_option_ids: ["currency:GBP"],
        },
      ],
      [],
    ),
    null,
  );
  assertEquals(
    validateStoredReviewDecisions(
      [
        { id: "pending-item", issues: [issue], save_status: "pending" },
        { id: "saved-item", issues: [issue], save_status: "saved" },
      ],
      [{ itemId: "saved-item", optionIds: ["currency:USD"] }],
    ),
    null,
  );
});

Deno.test("review retry can replace an empty processing selection", () => {
  const issue = {
    field: "currency",
    choices: [{ id: "currency:USD", value: "USD" }],
  };
  assertEquals(
    validateStoredReviewDecisions(
      [
        {
          id: "processing-item",
          issues: [issue],
          save_status: "processing",
          selected_option_ids: [],
        },
      ],
      [{ itemId: "processing-item", optionIds: ["currency:USD"] }],
    ),
    [
      {
        itemId: "processing-item",
        decline: false,
        optionIds: ["currency:USD"],
      },
    ],
  );
});

Deno.test(
  "submit prefers validated persisted processing choices over request choices",
  () => {
    const issue = {
      field: "currency",
      choices: [
        { id: "currency:USD", value: "USD" },
        { id: "currency:EUR", value: "EUR" },
      ],
    };
    assertEquals(
      reviewDecisionOptionIds({
        item: {
          id: "processing-item",
          issues: [issue],
          save_status: "processing",
          selected_option_ids: ["currency:USD"],
        },
        decision: {
          itemId: "processing-item",
          decline: false,
          optionIds: ["currency:EUR"],
        },
      }),
      ["currency:USD"],
    );
    assertEquals(
      reviewDecisionOptionIds({
        item: {
          id: "processing-item",
          issues: [issue],
          save_status: "processing",
          selected_option_ids: [],
        },
        decision: {
          itemId: "processing-item",
          decline: false,
          optionIds: ["currency:EUR"],
        },
      }),
      ["currency:EUR"],
    );
  },
);
