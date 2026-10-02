import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { test } from "node:test";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1);
const request = { canonicalRecurringId: id(2), replacementRecurringId: id(3),
  paymentAssociations: [{ importedTransactionId: id(4), canonicalTransactionId: id(5) }] };

async function load({ auth = { success: true, userId: actor }, error = null, throwTransport = false } = {}) {
  let handler, parameters, rpcCalls = 0;
  const client = { rpc: async (name, values) => {
    assert.equal(name, "associate_recurring_series");
    parameters = values; rpcCalls++;
    if (throwTransport) throw new Error("Network interrupted");
    return { data: { canonicalRecurringId: id(2), duplicate: false }, error };
  } };
  const context = createContext({ Request, Response, console,
    Deno: { serve: (value) => { handler = value; }, env: { get: () => "test" } },
  });
  const source = await readFile(new URL("../associate-recurring-series/index.ts", import.meta.url), "utf8");
  const module = new SourceTextModule(stripTypeScriptTypes(source), { context });
  await module.link((specifier) => {
    const exports = specifier.includes("@supabase") ? { createClient: () => client }
      : specifier.endsWith("cors.ts") ? { corsHeaders: {} }
      : { authenticateUser: async () => auth };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return { get parameters() { return parameters; }, get rpcCalls() { return rpcCalls; },
    invoke: async (body = request) => {
      const response = await handler(new Request("https://test.invalid/association", { method: "POST", body: JSON.stringify(body) }));
      return { status: response.status, body: await response.json() };
    } };
}

test("series association HTTP: authenticated actor cannot be replaced by a body user ID", async () => {
  const endpoint = await load();
  const result = await endpoint.invoke({ ...request, userId: id(99) });
  assert.equal(result.status, 200);
  assert.equal(endpoint.parameters.p_actor_user_id, actor);
  assert.deepEqual(JSON.parse(JSON.stringify(endpoint.parameters.p_payment_associations)), request.paymentAssociations);
});

for (const body of [null, [], { ...request, canonicalRecurringId: "invalid" },
  { ...request, replacementRecurringId: id(2) }, { ...request, paymentAssociations: "not-an-array" },
  { ...request, paymentAssociations: [{ importedTransactionId: id(4) }] },
  { ...request, paymentAssociations: [request.paymentAssociations[0], request.paymentAssociations[0]] }]) {
  test(`series association HTTP: rejects malformed or duplicate mapping ${JSON.stringify(body)}`, async () => {
    const endpoint = await load();
    assert.equal((await endpoint.invoke(body)).status, 400);
    assert.equal(endpoint.rpcCalls, 0);
  });
}

test("series association HTTP: rejects unauthenticated requests before mutation", async () => {
  const endpoint = await load({ auth: { success: false, statusCode: 401 } });
  assert.equal((await endpoint.invoke()).status, 401);
  assert.equal(endpoint.rpcCalls, 0);
});

for (const [code, status] of [["ASSOCIATION_UNAUTHORIZED",403], ["ASSOCIATION_NOT_FOUND",404],
  ["ASSOCIATION_PAYMENT_REVIEW_REQUIRED",409], ["ASSOCIATION_RETRY_CONFLICT",409]]) {
  test(`series association HTTP: exposes authoritative ${code}`, async () => {
    const endpoint = await load({ error: { code: "P0001", message: code } });
    const response = await endpoint.invoke();
    assert.equal(response.status, status);
    assert.equal(response.body.code, code);
  });
}

test("series association HTTP: transport and unknown database failures remain retryable", async () => {
  for (const options of [{ throwTransport: true }, { error: { code: "40001", message: "serialization failure" } }]) {
    const endpoint = await load(options);
    const response = await endpoint.invoke();
    assert.equal(response.status, 503);
    assert.equal(response.body.code, "SERVER_ERROR");
  }
});
