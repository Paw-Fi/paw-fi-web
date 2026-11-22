import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { saveTransactionsBatchInternal } from "../save-transactions-batch/index.ts";

// Run the production writer with a local PostgREST transport and a soft-deleted
// row. An acknowledgement can be lost before the user deletes the saved row.
Deno.test("worker batch preserves a user's deletion when replaying a write", async () => {
  const user = "00000000-0000-4000-a000-000000000001";
  const lease = "00000000-0000-4000-a000-000000000002";
  const key = "file-import-v1:00000000-0000-4000-a000-000000000003:0";
  const env = {
    SUPABASE_URL: "http://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture",
    INTERNAL_SERVICE_SECRET: "test-worker",
  };
  const previous = Object.entries(env).map(([key, value]) => {
    const old = Deno.env.get(key);
    Deno.env.set(key, value);
    return [key, old] as const;
  });
  const originalFetch = globalThis.fetch;
  let writes = 0;
  const saved: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, options) => {
    const req = new Request(input, options);
    const url = new URL(req.url);
    if (url.hostname !== "fixture.invalid") {
      throw new Error("Unexpected external request");
    }
    const json = (value: unknown) =>
      new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json" },
      });
    if (url.pathname.endsWith("/rpc/file_import_existing_keys")) {
      assertEquals(req.method, "POST");
      assertEquals(req.headers.get("x-moneko-file-import-lease"), lease);
      const args = await req.json();
      assertEquals(args.p_request_keys, [key]);
      return json(
        saved.map((r) => ({
          request_key: r.import_request_key,
          existing_id: r.id,
        })),
      );
    }
    if (url.pathname.endsWith("/expenses")) {
      assertEquals(req.headers.get("x-moneko-file-import-lease"), lease);
      if (req.method === "POST") {
        writes++;
        const record = await req.json();
        assertEquals(record.import_request_key, key);
        saved.push(record);
        return json(record);
      }
      if (url.searchParams.has("import_request_key")) {
        assertEquals(url.searchParams.get("user_id"), "eq." + user);
        throw new Error("Background lookup must use the bounded POST RPC");
      }
    }
    return json([]);
  };
  try {
    const request = new Request("http://fixture.invalid", {
      headers: { "X-Moneko-Internal-Key": "test-worker" },
    });
    const body = {
      userId: user,
      fileImportLease: lease,
      manualImportMode: true,
      skipSemanticDuplicates: true,
      transactions: [{
        type: "expense" as const,
        amount: 123.45,
        currency: "USD",
        category: "groceries",
        date: "2025-09-12",
        accountId: undefined,
        idempotencyKey: key,
      }],
    };
    const result = await saveTransactionsBatchInternal(request, body);
    assertEquals(result.results.map((x) => [x.index, x.success]), [[0, true]]);
    saved[0].deleted_at = new Date().toISOString();
    const replay = await saveTransactionsBatchInternal(request, body);
    assertEquals(replay.results.map((x) => [x.index, x.duplicateKind]), [[
      0,
      "request",
    ]]);
    assertEquals(writes, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, old] of previous) {
      if (old === undefined) Deno.env.delete(key);
      else Deno.env.set(key, old);
    }
  }
});
