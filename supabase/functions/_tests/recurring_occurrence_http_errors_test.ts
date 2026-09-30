import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("occurrence HTTP handlers retain infrastructure failures and reject invalid requests", async () => {
  const originalServe = Deno.serve;
  const originalFetch = globalThis.fetch;
  const names = ["confirm", "update", "unconfirm", "skip"];
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
  const body = {
    userId: "00000000-0000-4000-8000-000000000001",
    recurringId: "00000000-0000-4000-8000-000000000002",
    scheduledOccurrenceDate: "2024-09-24",
    paidDate: "2024-09-23",
    amount: 117.60,
    idempotencyKey: "test-occurrence",
  };
  const request = (payload: unknown) =>
    new Request("https://test.invalid", {
      method: "POST",
      headers: { "X-Moneko-Internal-Key": "test-only-internal-secret" },
      body: JSON.stringify(payload),
    });
  try {
    for (
      const path of [
        ...names.map((name) => `${name}-recurring-occurrence`),
        "save-recurring-occurrence-override",
      ]
    ) {
      await import(new URL(`../${path}/index.ts`, import.meta.url).href);
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: "40001",
              message: "serialization failure",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          ),
        );
      const temporary = await handler(request(body));
      assertEquals(temporary.status, 503, path);
      assertEquals((await temporary.json()).code, "SERVER_ERROR", path);
      globalThis.fetch = () =>
        Promise.reject(new Error("transport unavailable"));
      assertEquals((await handler(request(body))).status, 503, path);
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: "P0001",
              message: "OCCURRENCE_CONFLICT",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          ),
        );
      const conflict = await handler(request(body));
      assertEquals(conflict.status, 400, path);
      assertEquals((await conflict.json()).code, "OCCURRENCE_CONFLICT", path);
      for (
        const malformed of [null, [], { ...body, recurringId: 7 }, {
          ...body,
          scheduledOccurrenceDate: {},
        }]
      ) {
        assertEquals((await handler(request(malformed))).status, 400, path);
      }
    }
  } finally {
    Deno.serve = originalServe;
    globalThis.fetch = originalFetch;
    env.forEach((name, i) =>
      prior[i] == null ? Deno.env.delete(name) : Deno.env.set(name, prior[i]!)
    );
  }
});
