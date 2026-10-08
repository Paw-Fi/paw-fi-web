/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test(
  "single-save endpoints reject malformed abstention before any remote write",
  async () => {
    const originalServe = Deno.serve;
    const originalFetch = globalThis.fetch;
    let remoteCalls = 0;
    const registration: { handler?: (request: Request) => Promise<Response> } =
      {};
    try {
      Object.defineProperty(Deno, "serve", {
        configurable: true,
        value: (registered: typeof registration.handler) => {
          registration.handler = registered;
        },
      });
      for (const endpoint of ["save-expense", "save-income"]) {
        globalThis.fetch = originalFetch;
        registration.handler = undefined;
        await import(`../${endpoint}/index.ts`);
        const handler = registration.handler as
          | ((request: Request) => Promise<Response>)
          | undefined;
        if (!handler) throw new Error(`Missing ${endpoint} handler`);
        globalThis.fetch = (() => {
          remoteCalls += 1;
          throw new Error("Unexpected remote operation");
        }) as typeof fetch;
        for (
          const merchantAutoResolutionBlocked of [
            null,
            "true",
            "false",
            0,
            {},
            [],
          ]
        ) {
          const response = await handler(
            new Request("http://localhost/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: 10,
                category: "other",
                date: "2026-10-07",
                merchantAutoResolutionBlocked,
              }),
            }),
          );
          assertEquals(response.status, 400);
          const body = await response.json();
          assertEquals(
            body.error,
            "merchantAutoResolutionBlocked must be a boolean",
          );
        }
      }
      assertEquals(remoteCalls, 0);
    } finally {
      Object.defineProperty(Deno, "serve", {
        configurable: true,
        value: originalServe,
      });
      globalThis.fetch = originalFetch;
    }
  },
);
