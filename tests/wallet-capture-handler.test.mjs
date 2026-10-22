import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import * as walletCapture from "../supabase/functions/shared/wallet-capture.ts";
import * as identity from "../supabase/functions/shared/notification-capture-identity.ts";
import * as dates from "../supabase/functions/shared/date-normalization.ts";
import * as currencies from "../supabase/functions/shared/currency-validator.ts";

const user = "11111111-1111-4111-8111-111111111111";
const wallet = "22222222-2222-4222-8222-222222222222";
const source = await readFile(
  new URL(
    "../supabase/functions/save-wallet-transaction/index.ts",
    import.meta.url,
  ),
  "utf8",
);
const ast = ts.createSourceFile(
  "index.ts",
  source,
  ts.ScriptTarget.Latest,
  true,
);
const importNames = new Map(
  ast.statements
    .filter(ts.isImportDeclaration)
    .map((node) => [
      node.moduleSpecifier.text,
      node.importClause.namedBindings.elements
        .filter((e) => !e.isTypeOnly)
        .map((e) => e.name.text),
    ]),
);

async function fixture(options = {}) {
  let handler;
  const rpcCalls = [],
    inserts = [],
    releases = [],
    reports = [];
  let categoryReads = 0,
    enrichments = 0;
  const client = {
    from(table) {
      let operation, value;
      const result = () => {
        if (table === "user_contacts")
          return {
            data: {
              id: 1,
              preferred_currency: "MYR",
              preferred_timezone: "Asia/Kuala_Lumpur",
            },
            error: null,
          };
        if (table === "idempotency_keys") {
          if (operation === "insert")
            return options.cached
              ? { data: null, error: { code: "23505" } }
              : { data: { id: "request-claim" }, error: null };
          if (operation === "delete") releases.push(table);
          return {
            data: {
              id: "request-claim",
              result: value?.result ?? options.cached ?? null,
            },
            error: null,
          };
        }
        if (table === "expenses" && operation === "insert") {
          if (options.insertError)
            return { data: null, error: options.insertError };
          inserts.push(value);
          return { data: value, error: null };
        }
        throw new Error(`Unexpected table operation ${table}.${operation}`);
      };
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        is() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        insert(row) {
          operation = "insert";
          value = row;
          return query;
        },
        update(row) {
          operation = "update";
          value = row;
          return query;
        },
        delete() {
          operation = "delete";
          return query;
        },
        async maybeSingle() {
          return result();
        },
        async single() {
          return result();
        },
        then(resolve, reject) {
          return Promise.resolve().then(result).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      if (name === "claim_wallet_capture_event_v3")
        return {
          data: options.claim ?? {
            status: "duplicate",
            expenseId: "saved-expense",
            amountCents: 1299,
            currency: "MYR",
            category: "food",
            reason: "cross_source_wallet_capture",
          },
          error: options.claimError ?? null,
        };
      if (
        name === "finalize_android_wallet_capture_event" ||
        name === "release_android_wallet_capture_event"
      )
        return { data: null, error: null };
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  const implementations = {
    ...walletCapture,
    ...identity,
    ...dates,
    ...currencies,
    corsHeaders: {},
    createClient: () => client,
    createVertexGenerativeAI: () => null,
    getVertexAiConfigFromEnv: () => ({}),
    authenticateUserOrInternalSecret: async () => ({
      success: true,
      userId: user,
    }),
    loadLatestSubscriptionForUser: async () => ({}),
    hasCapturePlusEntitlement: () => true,
    normalizePreferredCurrency: (value) => value,
    assertAccountInScope: async () => options.accountValid !== false,
    getAccountOrNull: async () => ({ currency: "MYR" }),
    reportEdgeFunctionError: async (report) => reports.push(report),
    loadCategoryContext: async () => {
      categoryReads++;
      return {
        allowedExpenseSet: new Set(["food", "other"]),
        allowedIncomeSet: new Set(["salary", "other"]),
      };
    },
    matchConfirmedCategoryPreference: () => "food",
    resolveCategoryHint: () => null,
    resolveCategory: () => "food",
    normalizeStoredUserCategory: (value) => value,
    ensureUserCategory: async () => {},
    learnUserCategoryPreference: async () => {},
    enrichSourceVerifiedMerchantItems: async () => {
      enrichments++;
      return [{ merchant_auto_resolution_blocked: true }];
    },
    merchantAutoResolutionPatch: (blocked) => ({
      merchant_auto_resolution_blocked: blocked,
    }),
    GEMINI_MODEL_FALLBACKS: ["test-model"],
  };
  const context = createContext({
    Request,
    Response,
    URL,
    Date,
    Error,
    TextEncoder,
    AbortController,
    setTimeout,
    clearTimeout,
    crypto: webcrypto,
    console: { log() {}, info() {}, warn() {}, error() {} },
    Deno: {
      env: {
        get: (name) =>
          name === "SUPABASE_URL"
            ? "https://example.invalid"
            : name === "SUPABASE_SERVICE_ROLE_KEY"
              ? "test-key"
              : undefined,
      },
      serve(fn) {
        handler = fn;
      },
    },
    fetch: () => {
      throw new Error("Unexpected network request");
    },
  });
  const module = new SourceTextModule(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
    { context },
  );
  await module.link((specifier) => {
    const names = importNames.get(specifier);
    return new SyntheticModule(
      names,
      function () {
        for (const name of names)
          this.setExport(
            name,
            implementations[name] ??
              (() => {
                throw new Error(`Unexpected dependency ${name}`);
              }),
          );
      },
      { context },
    );
  });
  await module.evaluate();
  return {
    rpcCalls,
    inserts,
    releases,
    reports,
    get categoryReads() {
      return categoryReads;
    },
    get enrichments() {
      return enrichments;
    },
    async send(captureSource, overrides = {}) {
      const body = {
        captureSource,
        userId: "untrusted-body-user",
        accountId: wallet,
        idempotencyKey: "original-request",
        clientCreatedAt: "2026-10-21T12:00:00Z",
        suppressNotification: true,
        transaction: {
          merchantName: "  佐藤商店  ",
          amount: 12.99,
          currency: "MYR",
          date: "2026-10-21",
        },
        ...overrides,
      };
      const response = await handler(
        new Request("https://example.invalid/save-wallet-transaction", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { Authorization: "Bearer test" },
        }),
      );
      return { status: response.status, body: await response.json() };
    },
  };
}

for (const source of [
  "ios_wallet_shortcut",
  "ios_notification_shortcut",
  "android_notification_listener",
]) {
  test(`${source} reaches common claim and duplicate returns before enrichment or insertion`, async () => {
    const f = await fixture();
    const result = await f.send(source);
    assert.equal(result.status, 200);
    assert.equal(result.body.duplicate, true);
    assert.equal(result.body.data.id, "saved-expense");
    assert.equal(result.body.meta.captureSource, source);
    const claim = f.rpcCalls[0];
    assert.equal(claim.name, "claim_wallet_capture_event_v3");
    assert.equal(claim.args.p_capture_source, source);
    assert.equal(claim.args.p_user_id, user);
    assert.equal(claim.args.p_account_id, wallet);
    assert.equal(claim.args.p_merchant_key, "佐藤商店");
    assert.equal(claim.args.p_amount_cents, 1299);
    assert.equal(claim.args.p_cross_source_match_eligible, true);
    assert.equal(f.inserts.length, 0);
    assert.equal(f.categoryReads, 0);
    assert.equal(f.enrichments, 0);
  });
}

test("processing releases only the request claim and retains retryable 409", async () => {
  const f = await fixture({
    claim: { status: "processing", claimId: "another-owner" },
  });
  const result = await f.send("ios_wallet_shortcut");
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "REQUEST_IN_PROGRESS");
  assert.deepEqual(f.releases, ["idempotency_keys"]);
  assert.equal(f.rpcCalls.length, 1);
  assert.equal(f.inserts.length, 0);
});

for (const claim of [null, { status: "claimed" }, { status: "duplicate" }]) {
  test(`invalid claim ${JSON.stringify(claim)} cannot bypass deduplication`, async () => {
    const f = await fixture({ claim: claim ?? {} });
    const result = await f.send("ios_wallet_shortcut");
    assert.equal(result.status, 500);
    assert.equal(f.inserts.length, 0);
  });
}

test("missing v3 migration returns retryable failure without weaker RPC fallback", async () => {
  const f = await fixture({
    claimError: {
      code: "PGRST202",
      message: "claim_wallet_capture_event_v3 missing",
    },
  });
  const result = await f.send("ios_notification_shortcut");
  assert.equal(result.status, 500);
  assert.deepEqual(
    f.rpcCalls.map((r) => r.name),
    ["claim_wallet_capture_event_v3"],
  );
  assert.equal(f.inserts.length, 0);
});

test("claimed capture preserves transaction fields and finalizes the common claim", async () => {
  const f = await fixture({
    claim: { status: "claimed", claimId: "capture-owner" },
  });
  const result = await f.send("ios_wallet_shortcut");
  assert.equal(
    result.status,
    200,
    `${JSON.stringify(result.body)} ${f.reports.map((r) => r.error?.stack).join("\n")}`,
  );
  assert.equal(result.body.duplicate, false);
  assert.equal(f.inserts.length, 1);
  assert.equal(f.inserts[0].amount_cents, 1299);
  assert.equal(f.inserts[0].currency, "MYR");
  assert.equal(f.inserts[0].account_id, wallet);
  assert.equal(f.inserts[0].user_id, user);
  assert.equal(f.rpcCalls.at(-1).name, "finalize_android_wallet_capture_event");
  assert.equal(f.rpcCalls.at(-1).args.p_claim_id, "capture-owner");
});

test("insert failure releases the owned claim for retry", async () => {
  const f = await fixture({
    claim: { status: "claimed", claimId: "capture-owner" },
    insertError: { code: "40001", message: "claim expired" },
  });
  const result = await f.send("ios_wallet_shortcut");
  assert.equal(result.status, 500);
  assert.equal(f.rpcCalls.at(-1).name, "release_android_wallet_capture_event");
  assert.equal(f.rpcCalls.at(-1).args.p_claim_id, "capture-owner");
});

test("exact request cache returns before a new logical claim", async () => {
  const f = await fixture({ cached: { success: true, data: { id: "prior" } } });
  const result = await f.send("ios_wallet_shortcut");
  assert.equal(result.body.duplicate, true);
  assert.equal(result.body.data.id, "prior");
  assert.equal(f.rpcCalls.length, 0);
});

test("missing original time is passed as missing instead of using replay time", async () => {
  const f = await fixture();
  await f.send("ios_wallet_shortcut", { clientCreatedAt: undefined });
  assert.equal(f.rpcCalls[0].args.p_notification_posted_at, null);
});

test("provider-only identity is excluded from cross-source matching", async () => {
  const f = await fixture();
  await f.send("ios_notification_shortcut", {
    transaction: {
      merchantName: "Bank A",
      merchantEntityType: "unknown",
      amount: 12.99,
      currency: "MYR",
    },
  });
  assert.equal(f.rpcCalls[0].args.p_cross_source_match_eligible, false);
});

test("original notification time survives replay and multilingual merchant normalization", async () => {
  for (const [merchant, expected] of [
    ["  ＣＡＦＥ　東京  ", "cafe 東京"],
    ["  مطعم   النور ", "مطعم النور"],
  ]) {
    const f = await fixture();
    await f.send("ios_notification_shortcut", {
      clientCreatedAt: "2026-10-22T12:00:00Z",
      transaction: {
        merchantName: merchant,
        amount: 12.99,
        currency: "MYR",
        notificationPostTime: "2026-10-21T12:00:00Z",
      },
    });
    assert.equal(
      f.rpcCalls[0].args.p_notification_posted_at,
      "2026-10-21T12:00:00.000Z",
    );
    assert.equal(f.rpcCalls[0].args.p_merchant_key, expected);
  }
});

test("recurring templates are excluded from cross-source matching", async () => {
  const f = await fixture();
  await f.send("ios_wallet_shortcut", {
    transaction: {
      merchantName: "Store",
      amount: 12.99,
      currency: "MYR",
      isRecurring: true,
      recurrenceRule: { frequency: "monthly", anchor_date: "2026-10-21" },
    },
  });
  assert.equal(f.rpcCalls[0].args.p_cross_source_match_eligible, false);
});

test("wallet authorization fails before any common claim", async () => {
  const f = await fixture({ accountValid: false });
  assert.equal((await f.send("ios_wallet_shortcut")).status, 400);
  assert.equal(f.rpcCalls.length, 0);
});
