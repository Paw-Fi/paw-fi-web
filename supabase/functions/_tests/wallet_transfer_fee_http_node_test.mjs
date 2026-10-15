import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const actor = "00000000-0000-4000-8000-000000000001";
const expenseId = "00000000-0000-4000-8000-000000000002";
async function fixture(endpoint) {
  let handler;
  const writes = [];
  const expense = { id: expenseId, user_id: actor, household_id: null, contact_id: null,
    split_group_id: null, account_id: expenseId, currency: "USD", amount_cents: 25,
    category: "bank fees", date: "2026-10-15", type: "expense", is_recurring: false,
    transfer_fee_transfer_id: expenseId };
  const client = { from(table) {
    const result = { data: table === "expenses" ? [expense] : [], error: null };
    const query = { select() { return query; }, eq() { return query; }, is() { return query; },
      in() { return query; }, limit() { return query; }, order() { return query; },
      update(payload) { writes.push({ table, payload }); return query; },
      delete() { writes.push({ table, deleted: true }); return query; },
      single: async () => ({ data: expense, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    };
    return query;
  }, rpc() { writes.push({ rpc: true }); return { data: null, error: null }; } };
  const exports = {
    createClient: () => client, corsHeaders: {}, withCors: (fn) => fn,
    authenticateUserOrInternalSecret: async () => ({ success: true, userId: actor }),
    detectGptRequest: () => ({ isGpt: false }), verifyUserMatch: (a,b) => a === b,
    getAllCategories: () => ["bank fees","other"], validateCurrency: (value) => value,
    normalizeCategoryForStorage: (value) => value, sanitizeCategoryName: (value) => value,
    parseExplicitReSplitRequested: () => ({ ok: true, value: false }),
    resolveExistingSplitWriteIntent: () => ({}), reportEdgeFunctionError: async () => {},
  };
  const source = await readFile(new URL(`../${endpoint}/index.ts`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  runInNewContext(code, { exports: {}, console, Request, Response,
    Deno: { env: { get: () => "test" }, serve: (fn) => { handler = fn; } },
    require: () => exports,
  });
  return { writes, async invoke(body) {
    const response = await handler(new Request("https://test.invalid/expense", {
      method: "POST", body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  } };
}

test("ordinary expense delete rejects a linked fee before any financial write", async () => {
  const api = await fixture("delete-expense");
  const result = await api.invoke({ expenseIds: expenseId });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION");
  assert.deepEqual(api.writes, []);
});

test("ordinary expense update rejects fee financial/split changes before any side effects", async () => {
  for (const [updates, extra] of [[{ amount_cents: 30 }, {}], [{ is_recurring: false }, {}],
    [{ raw_text: "memo" }, { payerUserId: actor }],
    [{ raw_text: "memo" }, { customSplits: { splitType: "equal", memberSplits: [{ userId: actor }] } }]]) {
    const api = await fixture("update-expense");
    const result = await api.invoke({ expenseId, updates, ...extra });
    assert.equal(result.status, 409, JSON.stringify({ updates, extra, result }));
    assert.equal(result.body.code, "TRANSFER_FEE_REQUIRES_TRANSFER_MUTATION");
    assert.deepEqual(api.writes, []);
  }
});
