/// <reference lib="deno.ns" />

import {
  buildWalletListMisrouteResult,
  buildWalletListToolCall,
  isWalletListRequest,
  shouldBlockWalletListMisroute,
  WALLET_LIST_MISROUTE_ERROR,
} from "./wallet-intent.ts";

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

Deno.test(
  "golden wallet list intent detects wallet inventory questions",
  () => {
    assertEquals(isWalletListRequest("what wallets i have?"), true);
    assertEquals(isWalletListRequest("list my wallets"), true);
    assertEquals(isWalletListRequest("show available wallet"), true);
  },
);

Deno.test("golden wallet list intent ignores wallet mutation context", () => {
  assertEquals(isWalletListRequest("add coffee to cash wallet"), false);
  assertEquals(isWalletListRequest("move 20 from cash wallet"), false);
  assertEquals(
    isWalletListRequest("show transactions from my cash wallet"),
    false,
  );
  assertEquals(isWalletListRequest("list expenses from wallet"), false);
  assertEquals(isWalletListRequest("what did I spend from my wallet"), false);
  assertEquals(isWalletListRequest("I have a cash wallet"), false);
});

Deno.test(
  "golden wallet list guard blocks list_expenses misroutes only",
  () => {
    assertEquals(
      shouldBlockWalletListMisroute("what wallets i have?", "list_expenses"),
      true,
    );
    assertEquals(
      shouldBlockWalletListMisroute("what wallets i have?", "list_wallets"),
      false,
    );
    assertEquals(buildWalletListMisrouteResult(), {
      error: WALLET_LIST_MISROUTE_ERROR,
    });
  },
);

Deno.test("golden wallet list call uses shared deterministic routing", () => {
  assertEquals(buildWalletListToolCall(), { name: "list_wallets", args: {} });
});
