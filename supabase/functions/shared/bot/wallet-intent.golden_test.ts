/// <reference lib="deno.ns" />

import { WALLET_LIST_PROMPT_RULE } from "./wallet-intent.ts";

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `${
        message ?? "assertEquals failed"
      }\nactual: ${actualJson}\nexpected: ${expectedJson}`,
    );
  }
}

Deno.test("golden wallet prompt still directs model tool choice", () => {
  assertEquals(WALLET_LIST_PROMPT_RULE.includes("list_wallets"), true);
  assertEquals(WALLET_LIST_PROMPT_RULE.includes("list_expenses"), true);
});
