import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { normalizeWalletTransferTime } from "../shared/wallet-transfer-time.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";

test("transfer time preserves unknown, midnight and entered wall time", () => {
  for (const value of [null, "00:00:00", "09:30:00", "23:59:59"]) {
    assert.equal(normalizeWalletTransferTime(value), value);
  }
  assert.equal(normalizeWalletTransferTime(undefined), null);
});

test("transfer time rejects invalid or non-canonical API values", () => {
  for (const value of ["24:00:00", "09:60:00", "09:30:60", "9:30", "09:30:00Z", "", 930]) {
    assert.equal(normalizeWalletTransferTime(value), undefined);
  }
});

async function loadHandler(endpoint, existing = null) {
  let handler;
  let saved = existing;
  const client = {
    async rpc(_name, { p_payload: payload, p_operation: operation }) {
      const patch = { from_account_id: payload.fromAccountId, to_account_id: payload.toAccountId,
        amount_cents: payload.amountCents, currency: payload.currency, date: payload.date,
        ...(Object.hasOwn(payload, "time") ? { time: payload.time } : {}), note: payload.note };
      if (operation === "create" && payload.clientRecordId && saved &&
        Object.entries(patch).some(([key, value]) => saved[key] !== value)) {
        return { data: null, error: { message: "IDEMPOTENCY_CONFLICT", code: "23505" } };
      }
      saved = { id: "transfer", ...saved, ...patch };
      return { data: saved, error: null };
    },
  };
  // Evaluate the real HTTP handler in Node with isolated authority/storage stubs.
  // No Deno process, production database or network request is used.
  const context = createContext({ Request, Response, console,
    Deno: { serve(value) { handler = value; }, env: { get() { return "test"; } } },
  });
  const moduleUrl = new URL(`../${endpoint}/index.ts`, import.meta.url);
  const source = await readFile(moduleUrl, "utf8");
  const module = new SourceTextModule(stripTypeScriptTypes(source), { context, identifier: moduleUrl.href });
  const cache = new Map();
  await module.link(async (specifier, referencing) => {
    if (specifier.endsWith("wallet-transfer-mutation.ts")) {
      const url = new URL(specifier, referencing.identifier);
      return new SourceTextModule(stripTypeScriptTypes(await readFile(url, "utf8")), { context, identifier: url.href });
    }
    if (cache.has(specifier)) return cache.get(specifier);
    const exports = specifier.includes("@supabase") ? { createClient: () => client }
      : specifier.endsWith("cors.ts") ? { corsHeaders: {}, withCors: (handler) => handler }
      : specifier.endsWith("auth.ts") ? {
        authenticateUserOrInternalSecret: async () => ({ success: true, userId: "user" }),
      }
      : specifier.endsWith("accounts.ts") ? {
        sanitizeUuid: (value) => value,
        getAccountOrNull: async (_, id) => ({ id, user_id: "user", currency: "USD" }),
      }
      : specifier.endsWith("date-normalization.ts") ? { normalizeCalendarDateString }
      : { normalizeWalletTransferTime };
    const dependency = new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
    cache.set(specifier, dependency);
    return dependency;
  });
  await module.evaluate();
  return async (body) => {
    const response = await handler(new Request("https://test.invalid/transfer", {
      method: "POST", body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  };
}

const transferBody = {
  fromAccountId: "from", toAccountId: "to", amountCents: 1000,
  currency: "USD", date: "2026-10-01",
};

test("create handler persists optional time without altering financial date", async () => {
  for (const time of [undefined, null, "00:00:00", "23:45:00"]) {
    const invoke = await loadHandler("create-wallet-transfer");
    const response = await invoke({ ...transferBody, time });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.date, "2026-10-01");
    assert.equal(response.body.data.time, time ?? null);
  }
});

test("update handler preserves old-client time and accepts explicit change or null", async () => {
  const invoke = await loadHandler("update-wallet-transfer", {
    id: "transfer", created_by_user_id: "user", household_id: null, time: "09:30:00",
  });
  const request = { ...transferBody, transferId: "transfer" };
  assert.equal((await invoke(request)).body.data.time, "09:30:00");
  assert.equal((await invoke({ ...request, time: "14:45:00" })).body.data.time, "14:45:00");
  assert.equal((await invoke({ ...request, time: null })).body.data.time, null);
});

test("both handlers reject invalid time before persistence", async () => {
  for (const endpoint of ["create-wallet-transfer", "update-wallet-transfer"]) {
    const invoke = await loadHandler(endpoint);
    const response = await invoke({ ...transferBody, transferId: "transfer", time: "24:00:00" });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  }
});

test("idempotent create compares recorded time as well as date", async () => {
  const invoke = await loadHandler("create-wallet-transfer", {
    id: "transfer", from_account_id: "from", to_account_id: "to",
    amount_cents: 1000, currency: "USD", date: "2026-10-01", time: "09:30:00",
    note: null, household_id: null, created_by_user_id: "user",
  });
  const request = { ...transferBody, clientRecordId: "retry", time: "09:30:00" };
  assert.equal((await invoke(request)).status, 200);
  assert.equal((await invoke({ ...request, time: "14:45:00" })).status, 409);
});
