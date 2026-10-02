import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import * as lifecycle from "../shared/plaid-lifecycle.ts";
import * as updateMode from "../shared/plaid-update-mode.ts";
import * as country from "../shared/plaid-country.ts";
import { isPlaidConnectionTerminalForWebhook } from "../shared/plaid-webhook-security.ts";

const user = "00000000-0000-4000-8000-000000000001";
const connectionId = "00000000-0000-4000-8000-000000000002";
const household = "00000000-0000-4000-8000-000000000003";

async function handler(endpoint, client, overrides = {}) {
  let serve;
  const exportsByFile = {
    "cors.ts": { corsHeaders: {}, getCorsHeaders: () => ({}) },
    "auth.ts": { authenticateUser: async () => ({ success: true, userId: user }) },
    "edge-error-alert.ts": { reportEdgeFunctionError: async () => {} },
    "plaid-access.ts": {
      loadPlaidUserAccessState: async () => ({ isConvertedPaidUser: true }),
      canUsePlaidBankSync: () => true,
    },
    "plaid-connection-access.ts": { resolvePlaidConnectionAccess: async () => ({ canManage: true, canView: true }) },
    "plaid-lifecycle.ts": lifecycle,
    "plaid-country.ts": country,
    "plaid-update-mode.ts": updateMode,
    "bank-sync.ts": {
      sanitizeOptionalUuid: (value) => value || null,
      loadLinkedWalletsForBankAccounts: async () => new Map(),
      upsertBankConnection: async () => { throw new Error("Unexpected connection write"); },
      upsertPlaidAccounts: async () => { throw new Error("Unexpected account write"); },
    },
    "token-encryption.ts": { decryptSecret: async () => "access-test", encryptSecret: async () => "encrypted-test" },
    "plaid-client.ts": {
      PLAID_PROVIDER: "plaid",
      getPlaidConfig: () => ({ products: ["transactions"] }),
      createPlaidLinkToken: async () => ({ link_token: "link-test", expiration: "2099-01-01T00:00:00Z" }),
      exchangePublicToken: async () => { throw new Error("Unexpected single-use token exchange"); },
      getPlaidAccountsWithItem: async () => ({ accounts: [], itemId: "item-test" }),
      removePlaidItem: async () => ({}),
    },
    "plaid-exchange-idempotency.ts": { canReusePlaidExchangeSnapshot: (count) => count > 0 },
    "plaid-sync-jobs.ts": { enqueuePlaidSyncJob: async () => ({ enqueued: true, duplicate: false }) },
    "plaid-institution-logo.ts": { fetchAndStorePlaidInstitutionLogo: async () => null },
    "plaid-duplicate-identity.ts": { classifyPlaidDuplicateIdentity: () => "distinct" },
    "plaid-duplicate-recovery.ts": { resolveManageablePlaidDuplicateConnectionIds: async () => [] },
    "plaid-remove.ts": { removePlaidConnection: async () => {} },
    "email-service.ts": { sendUserEmail: async () => ({ success: true }) },
    "email-templates.ts": { notificationTemplate: (value) => value },
    "user-display-name.ts": { resolveUserDisplayName: () => "Test" },
    ...overrides,
  };
  const context = createContext({
    Request, Response, URL, console, crypto, Date,
    Deno: {
      serve: (value) => { serve = value; },
      env: { get: (name) => name === "PLAID_SUBSCRIPTION_GRACE_DAYS" ? "7" : "test" },
    },
  });
  const source = await readFile(new URL(`../${endpoint}/index.ts`, import.meta.url), "utf8");
  const module = new SourceTextModule(stripTypeScriptTypes(source), { context });
  await module.link((specifier) => {
    const exports = specifier.includes("@supabase")
      ? { createClient: () => client }
      : exportsByFile[specifier.split("/").at(-1)];
    assert.ok(exports, `Missing test authority for ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return async (body) => {
    const response = await serve(new Request(`https://test.invalid/${endpoint}`, {
      method: "POST", body: JSON.stringify(body),
      headers: { "X-Internal-Service-Secret": "test" },
    }));
    return { status: response.status, body: await response.json() };
  };
}

function query(result, onInsert = () => {}, onUpdate = () => {}) {
  const value = { data: result, error: null };
  const builder = {
    select() { return builder; }, eq() { return builder; }, is() { return builder; },
    or() { return builder; }, in() { return builder; }, order() { return builder; },
    limit() { return builder; }, neq() { return builder; },
    not() { return builder; }, lt() { return builder; }, lte() { return builder; },
    delete() { return builder; },
    contains() { return builder; },
    insert(row) { onInsert(row); return builder; },
    update(row) { onUpdate(row); return builder; },
    maybeSingle: async () => value, single: async () => value,
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
  return builder;
}

for (const [body, stored, expected] of [
  [{ mode: "update" }, null, "new"],
  [{ mode: "new", connectionId }, { status: "active" }, "update"],
  [{ connectionId }, { status: "needs_reauth", relink_state: "required" }, "reconnect"],
  [{ mode: "reconnect", connectionId }, { status: "active" }, "reconnect"],
]) {
  test(`Plaid Link mode is server-consistent: ${JSON.stringify(body)} -> ${expected}`, async () => {
    let session;
    const invoke = await handler("plaid-create-link-token", {
      from: (table) => query(table === "bank_connections" ? { id: connectionId, user_id: user, access_token_encrypted: "encrypted", ...stored } : null,
        (row) => { session = row; }),
    });
    const response = await invoke(body);
    assert.equal(response.status, 200);
    assert.equal(response.body.modeUsed, expected);
    assert.equal(session.mode, expected);
    assert.equal(session.connection_id, stored ? connectionId : null);
  });
}

test("Plaid exchange rejects a nonce from another Space before consuming a public token", async () => {
  let exchanged = false;
  const invoke = await handler("plaid-exchange-public-token", {
    from: (table) => query(table === "plaid_link_update_sessions" ? { id: "session", target_household_id: household } : null),
    rpc: async () => ({ data: [{ id: "session" }], error: null }),
  }, {
    "plaid-client.ts": {
      PLAID_PROVIDER: "plaid",
      exchangePublicToken: async () => { exchanged = true; throw new Error("Token was consumed"); },
      getPlaidAccountsWithItem: async () => ({}), removePlaidItem: async () => ({}),
    },
  });
  const response = await invoke({ publicToken: "public-test", linkCompletionNonce: "nonce", selectedAccounts: [{ id: "bank-test" }] });
  assert.equal(response.status, 409);
  assert.equal(response.body.errorCode, "link_session_scope_mismatch");
  assert.equal(exchanged, false);
});

test("Plaid removal warning preserves active webhook and reconnect state", async () => {
  const now = new Date();
  const active = {
    id: connectionId, user_id: user, status: "active", item_status: "active",
    item_health_state: "healthy", billing_keep_reason: "active_paid_use",
    last_financial_feature_used_at: now.toISOString(),
    scheduled_removal_at: new Date(now.getTime() + 86400000).toISOString(),
  };
  let patch;
  const invoke = await handler("plaid-maintenance", {
    from: (table) => query(table === "bank_connections" ? [active]
      : table === "subscriptions" ? [{ user_id: user, plan: "plus", status: "canceled", current_period_end: now.toISOString() }]
      : [{ id: user, email: "test@example.invalid" }], () => {}, (row) => { patch = row; }),
  });
  const response = await invoke({ action: "enforce_lifecycle" });
  assert.equal(response.status, 200);
  assert.ok(patch.warning_sent_at);
  assert.equal(isPlaidConnectionTerminalForWebhook({ ...active, ...patch }), false);
  assert.equal(patch.item_status, undefined);
});

test("Plaid lost-response retry finds the original connection by Link nonce", async () => {
  const filters = [];
  const stored = {
    id: connectionId, household_id: null, status: "active", provider_item_id: "item-test",
    metadata: { plaid_link_completion_nonce: "nonce", plaid_link_completion_session_id: "session", plaid_selected_account_ids: ["bank-test"] },
  };
  const invoke = await handler("plaid-exchange-public-token", {
    from: (table) => {
      const builder = query(table === "bank_connections" ? stored : table === "bank_accounts" ? [{ id: "bank-test", provider_account_id: "bank-test" }] : null);
      if (table === "bank_connections") builder.eq = (column, value) => { filters.push([column, value]); return builder; };
      return builder;
    },
    rpc: async () => ({ data: true, error: null }),
  });
  const response = await invoke({ publicToken: "already-consumed", linkCompletionNonce: "nonce", idempotencyKey: "new-random-retry-key", selectedAccounts: [{ id: "bank-test" }] });
  assert.equal(response.status, 200);
  assert.equal(response.body.idempotent, true);
  assert.ok(filters.some(([column, value]) => column === "metadata->>plaid_link_completion_nonce" && value === "nonce"));
});

test("Plaid idempotency recovery rejects an incomplete selected-account snapshot", async () => {
  let wroteAccounts = false;
  const stored = {
    id: connectionId, household_id: null, status: "active", provider_item_id: "item-test", access_token_encrypted: "encrypted",
    metadata: { plaid_link_completion_nonce: "nonce", plaid_selected_account_ids: ["first", "second"] },
  };
  const invoke = await handler("plaid-exchange-public-token", {
    from: (table) => query(table === "bank_connections" ? stored : table === "bank_accounts" ? [{ id: "first", provider_account_id: "first" }] : null),
    rpc: async () => ({ data: true, error: null }),
  }, {
    "plaid-client.ts": {
      PLAID_PROVIDER: "plaid", exchangePublicToken: async () => { throw new Error("Retry must not exchange again"); },
      getPlaidAccountsWithItem: async () => ({ itemId: "item-test", accounts: [{ account_id: "first" }] }), removePlaidItem: async () => ({}),
    },
    "bank-sync.ts": {
      sanitizeOptionalUuid: (value) => value || null,
      loadLinkedWalletsForBankAccounts: async () => new Map(), upsertBankConnection: async () => ({}),
      upsertPlaidAccounts: async () => { wroteAccounts = true; return { records: [] }; },
    },
  });
  const response = await invoke({ publicToken: "already-consumed", linkCompletionNonce: "nonce", selectedAccounts: [{ id: "first" }, { id: "second" }] });
  assert.equal(response.status, 500);
  assert.equal(wroteAccounts, false);
  assert.equal(response.body.success, undefined);
});

test("Plaid processor treats disconnect's terminal job cancellation as a successful handoff", async () => {
  const job = { id: "job", bank_connection_id: connectionId, provider: "plaid", status: "processing", payload: {} };
  const invoke = await handler("bank-sync-processor", {
    rpc: async (name) => ({ data: name === "claim_pending_sync_jobs" ? [job] : 0, error: null }),
    from: (table) => query(table === "bank_connections" ? { id: connectionId, user_id: user, provider: "plaid", status: "active" } : []),
  }, {
    "auth.ts": { authenticateInternalSecret: async () => ({ success: true }), buildInternalInvokeHeaders: () => ({}), resolveAnyInternalFunctionKey: () => "test" },
    "bank-retry.ts": { isTransientBankNetworkError: () => false, withTransientBankReadRetry: async (read) => read() },
    "bank-sync-job-retry.ts": { buildBankSyncJobFailureUpdate: () => ({ status: "pending" }) },
    "plaid-access.ts": { loadPlaidUserAccessState: async () => ({}), canUsePlaidBankSync: () => false },
    "plaid-remove.ts": { removePlaidConnection: async () => { job.status = "failed"; } },
  });
  const response = await invoke({});
  assert.equal(response.status, 200);
  assert.equal(response.body.failed, 0);
  assert.equal(response.body.succeeded, 1);
  assert.equal(job.status, "failed");
});

test("Plaid retention uses the audit table's actual started_at column", async () => {
  const columns = [];
  const invoke = await handler("plaid-maintenance", {
    from: (table) => {
      const builder = query(null);
      if (table === "bank_sync_audit") builder.lt = (column) => { columns.push(column); return builder; };
      return builder;
    },
  });
  assert.equal((await invoke({ action: "cleanup_retention" })).status, 200);
  assert.deepEqual(columns, ["started_at"]);
});
