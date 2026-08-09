/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertMatch,
  assertNotEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  createEmailImportReviewToken,
  hashEmailImportReviewToken,
  isValidReviewToken,
  validateStoredReviewDecisions,
} from "../shared/email-import-review.ts";

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
