import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { readWalletLedgerPages } from "../shared/wallet-ledger-pages.ts";

Deno.test("wallet ledger reads beyond 1000 rows even when pages are API capped", async () => {
  const input = Array.from({ length: 1301 }, (_, i) => ({
    id: String(i + 1).padStart(8, "0"),
    amount_cents: i + 1,
  }));
  let calls = 0;
  const result = await readWalletLedgerPages((afterId) => {
    calls++;
    return Promise.resolve({
      data: input.filter((row) => afterId == null || row.id > afterId).slice(
        0,
        100,
      ),
      error: null,
    });
  });
  assertEquals(result, input);
  assertEquals(result.reduce((sum, row) => sum + row.amount_cents, 0), 846951);
  assertEquals(calls, 15);
});

Deno.test("wallet ledger rejects a failed later page rather than returning partial money", async () => {
  await assertRejects(
    () =>
      readWalletLedgerPages((afterId) =>
        Promise.resolve(
          afterId == null
            ? { data: [{ id: "first" }], error: null }
            : { data: null, error: new Error("read unavailable") },
        )
      ),
    Error,
    "read unavailable",
  );
});

Deno.test("wallet ledger rejects missing data and nonadvancing cursors", async () => {
  await assertRejects(
    () =>
      readWalletLedgerPages(() =>
        Promise.resolve({
          data: null,
          error: null,
        })
      ),
    Error,
    "missing",
  );
  await assertRejects(
    () =>
      readWalletLedgerPages(() =>
        Promise.resolve({
          data: [{ id: "same" }],
          error: null,
        })
      ),
    Error,
    "did not advance",
  );
});
