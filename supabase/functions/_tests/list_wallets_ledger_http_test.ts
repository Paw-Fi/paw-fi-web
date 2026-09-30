import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("list-wallets HTTP returns complete native balances, keeps provider zero, and rejects page failures", async () => {
  const originalServe = Deno.serve;
  const originalFetch = globalThis.fetch;
  const env = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "INTERNAL_SERVICE_SECRET",
  ];
  const prior = env.map((name) => Deno.env.get(name));
  let handler: (req: Request) => Response | Promise<Response> = () =>
    new Response();
  Deno.serve = ((callback: typeof handler) => {
    handler = callback;
  }) as typeof Deno.serve;
  Deno.env.set("SUPABASE_URL", "https://test.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-only-service-key");
  Deno.env.set("INTERNAL_SERVICE_SECRET", "test-only-internal-secret");
  const rows = Array.from({ length: 1301 }, (_, i) => ({
    id: String(i + 1).padStart(8, "0"),
    account_id: "wallet",
    currency: "CAD",
    type: "expense",
    amount_cents: 1,
    is_recurring: false,
    analytics_is_final: true,
  }));
  rows.push({
    ...rows[0],
    id: "99999999",
    currency: "USD",
    amount_cents: 99999,
  });
  let linked = false;
  let failLaterPage = false;
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  globalThis.fetch = (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input
        : input.url,
    );
    const table = url.pathname.split("/").pop();
    if (table === "accounts") {
      return Promise.resolve(json([{
        id: "wallet",
        user_id: "00000000-0000-4000-8000-000000000001",
        currency: "CAD",
        opening_balance_cents: 1000,
        linked_bank_account_id: linked ? "bank" : null,
      }]));
    }
    if (table === "bank_accounts") {
      return Promise.resolve(json([{
        id: "bank",
        type: "credit",
        provider_balance_current_cents: 0,
      }]));
    }
    const afterId = url.searchParams.get("id")?.replace(/^gt\./, "");
    if (failLaterPage && table === "expenses" && afterId) {
      return Promise.resolve(
        json({ code: "08006", message: "ledger read unavailable" }, 500),
      );
    }
    let page: Array<{ id: string } & Record<string, unknown>> = [];
    if (table === "expenses") page = rows;
    if (
      table === "account_transfers" && url.searchParams.has("to_account_id")
    ) {
      page = [{
        id: "transfer",
        to_account_id: "wallet",
        currency: "CAD",
        amount_cents: 100,
      }];
    }
    return Promise.resolve(
      json(page.filter((row) => !afterId || row.id > afterId).slice(0, 100)),
    );
  };
  const request = () =>
    new Request("https://test.invalid", {
      method: "POST",
      headers: { "X-Moneko-Internal-Key": "test-only-internal-secret" },
      body: JSON.stringify({
        userId: "00000000-0000-4000-8000-000000000001",
        currency: "CAD",
      }),
    });
  try {
    await import(new URL("../list-wallets/index.ts", import.meta.url).href);
    const complete = await handler(request());
    assertEquals(complete.status, 200);
    const wallet = (await complete.json()).data[0];
    assertEquals(wallet.current_balance_cents, -201);
    assertEquals(wallet.has_provider_balance, false);
    assertEquals(wallet.transfer_summary, {
      total_in_cents: 100,
      total_out_cents: 0,
    });
    linked = true;
    const providerWallet = (await (await handler(request())).json()).data[0];
    assertEquals(providerWallet.current_balance_cents, 0);
    assertEquals(providerWallet.has_provider_balance, true);
    failLaterPage = true;
    const failed = await handler(request());
    assertEquals(failed.status, 500);
    const failure = await failed.json();
    assertEquals(failure.code, "SERVER_ERROR");
    assertEquals(failure.data, undefined);
  } finally {
    Deno.serve = originalServe;
    globalThis.fetch = originalFetch;
    env.forEach((name, i) =>
      prior[i] == null ? Deno.env.delete(name) : Deno.env.set(name, prior[i]!)
    );
  }
});
