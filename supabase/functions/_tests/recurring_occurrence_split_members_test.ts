/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { completeRecurringOccurrenceSplitMembers } from "../shared/recurring-occurrence-splits.ts";

Deno.test("recurring amount split keeps its saved allocation and adds new members at zero", () => {
  const result = completeRecurringOccurrenceSplitMembers(
    {
      splitType: "amount",
      memberSplits: [{ userId: "owner", amount: 12000 }],
    },
    ["owner", "new-member"],
    1200000,
  );

  assertEquals(result, {
    splitType: "amount",
    memberSplits: [
      { userId: "owner", amount: 12000 },
      { userId: "new-member", amount: 0 },
    ],
  });
});

Deno.test("recurring equal split is frozen as concrete amounts before adding new members", () => {
  const result = completeRecurringOccurrenceSplitMembers(
    {
      splitType: "equal",
      memberSplits: [{ userId: "a" }, { userId: "b" }],
    },
    ["a", "b", "new-member"],
    10001,
  );

  assertEquals(result, {
    splitType: "amount",
    memberSplits: [
      { userId: "a", amount: 50.01 },
      { userId: "b", amount: 50 },
      { userId: "new-member", amount: 0 },
    ],
  });
});

Deno.test("complete recurring split remains byte-shape compatible when membership matches", () => {
  const input = {
    splitType: "equal",
    memberSplits: [{ userId: "a" }, { userId: "b" }],
  };

  assertEquals(
    completeRecurringOccurrenceSplitMembers(input, ["a", "b"], 10000),
    input,
  );
});
