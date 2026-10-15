import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { test } from "node:test";

const actor = "00000000-0000-4000-8000-000000000001";
const from = "00000000-0000-4000-8000-000000000021";
const to = "00000000-0000-4000-8000-000000000023";
const body = { fromAccountId: from, toAccountId: to, amountCents: 1000,
  currency: "usd", date: "2026-10-15", toAmountCents: 923, toCurrency: "eur",
  exchangeRate: "0.92310000000000000001", feeAmountCents: 25, transferContractVersion: 2 };

async function load(operation, { authenticated = true, rpcError = null } = {}) {
  let handler;
  const calls = [];
  const client = {
    auth: { async getUser(jwt) {
      calls.push({ auth: jwt });
      return authenticated ? { data: { user: { id: actor } }, error: null }
        : { data: { user: null }, error: { message: "bad token" } };
    } },
    from() { throw new Error("Transfer HTTP handlers must only use the atomic RPC"); },
    async rpc(name, params) {
      calls.push({ name, params });
      return { data: { id: "canonical", fee_expense: { id: "fee" } }, error: rpcError };
    },
  };
  const env = { SUPABASE_URL: "https://test.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-service", INTERNAL_SERVICE_SECRET: "test-internal" };
  const context = createContext({ Request, Response, console, Deno: {
    env: { get: (key) => env[key] }, serve: (value) => { handler = value; },
  } });
  const modules = new Map();
  async function moduleFor(url) {
    if (modules.has(url)) return modules.get(url);
    const module = url.startsWith("https:") ? new SyntheticModule(["createClient"], function () {
      this.setExport("createClient", () => client);
    }, { context, identifier: url })
      : url.endsWith("/cors.ts") ? new SyntheticModule(["corsHeaders", "withCors"], function () {
        this.setExport("corsHeaders", {}); this.setExport("withCors", (fn) => fn);
      }, { context, identifier: url })
      : new SourceTextModule(stripTypeScriptTypes(await readFile(new URL(url), "utf8")), { context, identifier: url });
    modules.set(url, module);
    return module;
  }
  const entry = await moduleFor(new URL(`../${operation}-wallet-transfer/index.ts`, import.meta.url).href);
  await entry.link((specifier, referencing) => moduleFor(new URL(specifier, referencing.identifier).href));
  await entry.evaluate();
  return { calls, async invoke(payload, headers = { Authorization: "Bearer verified-jwt" }) {
    const response = await handler(new Request("https://test.invalid/transfer", {
      method: "POST", headers, body: JSON.stringify(payload),
    }));
    return { status: response.status, body: await response.json() };
  } };
}

for (const operation of ["create", "update", "delete"]) {
  test(`${operation}: verified actor and one SQL RPC own all financial writes`, async () => {
    const api = await load(operation);
    const request = { ...body, userId: to, transferId: from, clientRecordId: "stable-retry" };
    const result = await api.invoke(request);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.fee_expense.id, "fee");
    assert.equal(api.calls[0].auth, "verified-jwt");
    assert.equal(api.calls.length, 2);
    assert.equal(api.calls[1].name, "mutate_wallet_transfer_v2");
    assert.equal(api.calls[1].params.p_actor_user_id, actor);
    assert.equal(api.calls[1].params.p_operation, operation);
    if (operation !== "delete") {
      const payload = api.calls[1].params.p_payload;
      assert.equal(payload.exchangeRate, body.exchangeRate);
      assert.equal(payload.toCurrency, "EUR");
      assert.equal(payload.currency, "USD");
      assert.equal(payload.feeAmountCents, 25);
    }
  });
  test(`${operation}: invalid JWT cannot reach the mutation RPC`, async () => {
    const api = await load(operation, { authenticated: false });
    assert.equal((await api.invoke({ ...body, transferId: from, userId: actor })).status, 401);
    assert.equal(api.calls.length, 1);
  });
}

test("create/update reject fractional, unsafe, incomplete and invalid normalized fields", async () => {
  for (const operation of ["create", "update"]) {
    for (const patch of [ { amountCents: 1.5 }, { amountCents: Number.MAX_SAFE_INTEGER + 1 },
      { toAmountCents: 0 }, { feeAmountCents: -1 }, { exchangeRate: "NaN" },
      { exchangeRate: "1,23" }, { toCurrency: null }, { exchangeRate: 0 },
      { transferContractVersion: 1 }, { time: "24:00:00" }, { clientRecordId: "" },
      { amountCents: null }, { fromAccountId: 42 } ]) {
      const api = await load(operation);
      const response = await api.invoke({ ...body, transferId: from, ...patch });
      assert.equal(response.status, 400, JSON.stringify(patch));
      assert.equal(api.calls.filter((call) => call.name).length, 0);
    }
  }
});

test("safe normalization retains bigint cents and numeric rates without float arithmetic", async () => {
  const api = await load("create");
  const response = await api.invoke({ ...body, amountCents: "9223372036854775807", exchangeRate: 0.9231 });
  assert.equal(response.status, 200);
  const payload = api.calls[1].params.p_payload;
  assert.equal(payload.amountCents, "9223372036854775807");
  assert.equal(payload.exchangeRate, "0.9231");
});

test("legacy requests retain omitted update time and use source principal defaults", async () => {
  const api = await load("update");
  assert.equal((await api.invoke({ fromAccountId: from, toAccountId: to,
    amountCents: 1000, currency: "USD", date: "2026-10-15", transferId: from })).status, 200);
  const payload = api.calls[1].params.p_payload;
  assert.equal(Object.hasOwn(payload, "time"), false);
  assert.equal(payload.transferContractVersion, 1);
  assert.equal(Object.hasOwn(payload, "toAmountCents"), false);
});

test("internal secret requires an explicit valid actor, normal JWT ignores forged body actor", async () => {
  const api = await load("create");
  assert.equal((await api.invoke(body, { "X-Moneko-Internal-Key": "test-internal" })).status, 400);
  assert.equal((await api.invoke({ ...body, userId: actor }, { "X-Moneko-Internal-Key": "test-internal" })).status, 200);
  assert.equal(api.calls[0].params.p_actor_user_id, actor);
});

test("SQL authority errors map to stable API codes instead of generic failures", async () => {
  for (const [message, status] of [["TRANSFER_CLIENT_UPDATE_REQUIRED", 409], ["IDEMPOTENCY_CONFLICT", 409],
    ["UNAUTHORIZED",403], ["NOT_FOUND",404], ["VALIDATION_ERROR",400]]) {
    const api = await load("update", { rpcError: { code: "P0001", message } });
    const result = await api.invoke({ ...body, transferId: from });
    assert.equal(result.status, status);
    assert.equal(result.body.code, message);
  }
});
