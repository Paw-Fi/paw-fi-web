import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { executeBotFinancialInsight } from "../shared/bot/financial-insight-tool.ts";

function fixture(failSpace?: string) {
  const calls: Array<Record<string, any>> = [];
  const supabase = {
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      maybeSingle() {
        return Promise.resolve({ data: { user_id: "actor" }, error: null });
      },
    }),
    rpc: (_: string, args: Record<string, any>) => {
      calls.push(args);
      if (failSpace && args.p_space === failSpace) {
        return Promise.resolve({ error: "permission denied", data: null });
      }
      const data = args.p_read === "summary"
        ? {
          expense_total_cents: 100100,
          income_total_cents: 45,
          categories: [{ category: "food", amount_cents: 100100 }],
        }
        : {
          count: 1,
          items: [{
            id: "occurrence",
            recurring_id: "rent",
            date: "2026-07-10",
            template_date: "2026-01-10",
            amount_cents: 50000,
            currency: "SGD",
            category: "housing",
            type: "expense",
            raw_text: "Rent",
          }],
        };
      return Promise.resolve({ data, error: null });
    },
  };
  const run = (args: Record<string, unknown>) =>
    executeBotFinancialInsight({
      supabase,
      userId: "actor",
      currency: "SGD",
      timezone: "UTC",
      args: { start_date: "2026-07-01", end_date: "2026-07-31", ...args },
      spaceMap: new Map([["family", {
        id: "family",
        name: "Family",
        isPortfolio: false,
      }]]),
      includeRecurringSelectionItems: true,
      logPrefix: "test",
    });
  return { calls, run };
}
Deno.test("posted totals cover all scopes and never count a forecast as spending", async () => {
  const { run, calls } = fixture();
  const result = await run({});
  assertEquals(result.success, true);
  const s = result.snapshot as Record<string, unknown>;
  assertEquals(s.totalExpense, 200200);
  assertEquals(s.totalIncome, 90);
  assertEquals(s.projected_recurring_count, 2);
  assertEquals(s.includes_projected_recurring, false);
  assertEquals((result._recurring_selection_items as any[])[0].id, "rent");
  assertEquals(calls.map((c) => c.p_actor), Array(4).fill("actor"));
  assertEquals(
    calls.filter((c) => c.p_read === "summary").map((c) => c.p_space),
    [null, "family"],
  );
});
Deno.test("a failed shared read cannot become a partial successful total", async () => {
  assertEquals((await fixture("family").run({})).success, undefined);
});
Deno.test("explicit currency and scope reach the canonical summary, unknown spaces fail closed", async () => {
  const { run, calls } = fixture();
  assertEquals(
    (await run({ space_scope: "shared_space", currency: "USD" })).success,
    true,
  );
  assertEquals(calls[0].p_space, "family");
  assertEquals(calls[0].p_args.currency, "USD");
  assertEquals((await run({ space_name: "Unknown" })).success, undefined);
  assertEquals(calls.length, 2);
});
