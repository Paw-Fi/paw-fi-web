/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { fetchCompletePlaidSyncBatch } from "../shared/plaid-sync-batch.ts";
import type { PlaidTransaction } from "../shared/plaid-client.ts";

function transaction(id: string): PlaidTransaction {
  return {
    account_id: "account-1",
    transaction_id: id,
    name: id,
    amount: 10,
    date: "2026-07-16",
  };
}

Deno.test("Plaid sync batch collects every page before returning", async () => {
  const cursors: Array<string | null | undefined> = [];
  const pages = [
    {
      added: [transaction("added-1")],
      modified: [],
      removed: [{ transaction_id: "removed-1" }],
      has_more: true,
      next_cursor: "cursor-1",
    },
    {
      added: [transaction("added-2")],
      modified: [transaction("modified-1")],
      removed: [],
      has_more: false,
      next_cursor: "cursor-2",
    },
  ];

  const result = await fetchCompletePlaidSyncBatch({
    initialCursor: "cursor-0",
    fetchPage: (cursor) => {
      cursors.push(cursor);
      return Promise.resolve(pages.shift()!);
    },
    isMutationDuringPagination: () => false,
  });

  assertEquals(cursors, ["cursor-0", "cursor-1"]);
  assertEquals(
    result.added.map((item) => item.transaction_id),
    ["added-1", "added-2"],
  );
  assertEquals(
    result.modified.map((item) => item.transaction_id),
    ["modified-1"],
  );
  assertEquals(result.removed, [{ transaction_id: "removed-1" }]);
  assertEquals(result.nextCursor, "cursor-2");
});

Deno.test(
  "Plaid sync batch discards partial pages on mutation restart",
  async () => {
    const cursors: Array<string | null | undefined> = [];
    let request = 0;

    const result = await fetchCompletePlaidSyncBatch({
      initialCursor: "cursor-0",
      fetchPage: (cursor) => {
        cursors.push(cursor);
        request += 1;
        if (request === 1) {
          return Promise.resolve({
            added: [transaction("discarded")],
            modified: [],
            removed: [],
            has_more: true,
            next_cursor: "mutated-cursor",
          });
        }
        if (request === 2) {
          return Promise.reject(new Error("mutation"));
        }
        return Promise.resolve({
          added: [transaction("stable")],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: "stable-cursor",
        });
      },
      isMutationDuringPagination: (error) =>
        error instanceof Error && error.message === "mutation",
    });

    assertEquals(cursors, ["cursor-0", "mutated-cursor", "cursor-0"]);
    assertEquals(
      result.added.map((item) => item.transaction_id),
      ["stable"],
    );
    assertEquals(result.nextCursor, "stable-cursor");
    assertEquals(result.restartCount, 1);
  },
);

Deno.test("Plaid sync batch limits repeated mutation restarts", async () => {
  await assertRejects(
    () =>
      fetchCompletePlaidSyncBatch({
        initialCursor: "cursor-0",
        maxRestarts: 2,
        fetchPage: () => Promise.reject(new Error("mutation")),
        isMutationDuringPagination: () => true,
      }),
    Error,
    "mutation",
  );
});
