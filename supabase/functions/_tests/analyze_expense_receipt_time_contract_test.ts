/// <reference lib="deno.ns" />

import { assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

const source = await Deno.readTextFile(
  new URL("../analyze-expense/index.ts", import.meta.url),
);

Deno.test(
  "analyze-expense: collapsed receipts preserve explicit transaction time",
  () => {
    assertMatch(
      source,
      /\.\.\.\(primary\.transactionTime\s*\?\s*\{\s*transactionTime:\s*primary\.transactionTime\s*\}\s*:\s*\{\}\)/s,
    );
  },
);
