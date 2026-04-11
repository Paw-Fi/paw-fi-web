/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildImportRequestKey,
  buildImportSemanticKey,
} from "../shared/import-dedupe.ts";

Deno.test("buildImportRequestKey is stable for a chunk replay", () => {
  assertEquals(
    buildImportRequestKey("import-123:0-250", 3),
    "import-123:0-250:3",
  );
});

Deno.test("buildImportSemanticKey includes account scope", () => {
  const base = {
    userId: "user-1",
    householdId: null,
    type: "expense",
    amountCents: 1250,
    currency: "usd",
    date: "2026-04-11",
    category: "Food",
    description: "Lunch @ Cafe",
  };

  const walletA = buildImportSemanticKey({
    ...base,
    accountId: "wallet-a",
  });
  const walletB = buildImportSemanticKey({
    ...base,
    accountId: "wallet-b",
  });

  assertEquals(walletA === walletB, false);
});
