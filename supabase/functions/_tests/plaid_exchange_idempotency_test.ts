import {
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  canReusePlaidExchangeSnapshot,
} from "../shared/plaid-exchange-idempotency.ts";

Deno.test("plaid exchange idempotency reuses only snapshots with accounts", () => {
  assertEquals(canReusePlaidExchangeSnapshot(0), false);
  assertEquals(canReusePlaidExchangeSnapshot(2), true);
});
