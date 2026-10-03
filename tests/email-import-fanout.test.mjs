import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as emailImport from "../supabase/functions/shared/email-import.ts";
import * as eventState from "../supabase/functions/shared/email-import-event-state.ts";
import * as senderVerification from "../supabase/functions/shared/email-sender-verification.ts";
import {
  hasPlusEntitlement,
  loadLatestSubscriptionForUser,
} from "../supabase/functions/shared/plus-entitlement.ts";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const walletA = "33333333-3333-4333-8333-333333333333";
const walletB = "44444444-4444-4444-8444-444444444444";
const spaceB = "55555555-5555-4555-8555-555555555555";
const transaction = {
  type: "expense",
  amount: 12.5,
  currency: "USD",
  date: "2026-10-03",
  category: "groceries",
  merchant: "Store",
};
const source = readFileSync(
  new URL(
    "../supabase/functions/resend-inbound-webhook/index.ts",
    import.meta.url,
  ),
  "utf8",
).replaceAll("import.meta.main", "false");
const compiled = ts.transpileModule(source, {
  reportDiagnostics: true,
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

function harness(options = {}) {
  const events = [];
  const saves = [];
  const emails = [];
  const errors = [];
  const failUsers = new Set(options.failUsers ?? []);
  let authorizationReads = 0;
  const client = {
    rpc: async (name) => {
      assert.equal(name, "email_import_sender_accounts");
      authorizationReads++;
      return {
        data:
          options.revokeAtLookup && authorizationReads >= options.revokeAtLookup
            ? [userA]
            : (options.recipients ?? [userA, userB]),
        error: null,
      };
    },
    from(table) {
      let action = "select";
      let patch;
      const filters = [];
      const query = {
        select: () => query,
        eq: (key, value) => {
          filters.push([key, value]);
          return query;
        },
        is: (key, value) => {
          filters.push([key, value]);
          return query;
        },
        order: () => query,
        limit: () => query,
        insert: (value) => {
          action = "insert";
          patch = value;
          return query;
        },
        update: (value) => {
          action = "update";
          patch = value;
          return query;
        },
        single: () => execute(),
        maybeSingle: () => execute(),
        then: (resolve, reject) => execute().then(resolve, reject),
      };
      const execute = async () => {
        if (table === "email_import_events") {
          if (action === "insert") {
            if (
              events.some(
                (row) =>
                  row.provider_email_id === patch.provider_email_id &&
                  row.delivery_user_id === patch.delivery_user_id,
              )
            )
              return { data: null, error: { code: "23505" } };
            const row = {
              id: `event-${events.length + 1}`,
              created_at: new Date().toISOString(),
              ...patch,
            };
            events.push(row);
            return { data: { ...row }, error: null };
          }
          const row = events.find((value) =>
            filters.every(([key, expected]) => value[key] === expected),
          );
          if (action === "update" && row) Object.assign(row, patch);
          return { data: row ? { ...row } : null, error: null };
        }
        const id = filters.find(
          ([key]) => key === "id" || key === "user_id",
        )?.[1];
        if (table === "users")
          return {
            data: { email: `${id}@example.com`, full_name: "Owner" },
            error: null,
          };
        if (table === "user_contacts")
          return {
            data: {
              email_import_enabled: !(options.disabledUsers ?? []).includes(id),
              email_import_household_id: id === userB ? spaceB : null,
              email_import_is_portfolio: id === userB,
              email_import_account_id: id === userB ? walletB : walletA,
              preferred_currency: id === userB ? "EUR" : "USD",
              preferred_timezone: "UTC",
            },
            error: null,
          };
        if (table === "subscriptions")
          return {
            data: {
              plan: (options.freeUsers ?? []).includes(id)
                ? "free"
                : "lifetime",
              status: "active",
            },
            error: null,
          };
        return { data: [], error: null };
      };
      return query;
    },
  };
  const exports = {};
  const email = { subject: "Import result", html: "Result", text: "Result" };
  const modules = {
    "../shared/cors.ts": { corsHeaders: {} },
    "../shared/auth.ts": {
      resolveInternalFunctionKey: () => "test-internal-key",
      buildInternalInvokeHeaders: () => ({ apikey: "test-internal-key" }),
    },
    "../shared/email-service.ts": {
      sendEmail: async (value) => {
        emails.push(value);
        return { success: true };
      },
    },
    "../shared/email-utils.ts": {
      pluralize: (count, singular) => (count === 1 ? singular : `${singular}s`),
    },
    "../shared/import-dedupe.ts": {
      buildImportSemanticKey: (value) => JSON.stringify(value),
    },
    "../shared/email-import.ts": emailImport,
    "../shared/email-sender-verification.ts": senderVerification,
    "../shared/email-import-event-state.ts": eventState,
    "../shared/email-import-account.ts": {
      createEmailImportAccountResolver:
        ({ userId }) =>
        async () =>
          userId === userA ? walletA : walletB,
    },
    "../shared/analyzed-merchant-enrichment.ts": {
      runEnrichedTransactionAnalysis: async ({ body }) =>
        failUsers.has(body.userId)
          ? { success: false, status: 503, error: "AI_TEMPORARILY_UNAVAILABLE" }
          : { success: true, items: [{ ...transaction }] },
      preserveAnalyzedMerchantIdentity: ({ items }) => items,
    },
    "../shared/email-import-ai-decision.ts": {
      classifyEmailImportWithAi: async () => [
        { kind: "accept", transaction: { ...transaction } },
      ],
      emailImportSafeRejectionCodes: () => [],
      shouldEscalateEmailImportAiFailure: () => true,
    },
    "../shared/user-categories.ts": {
      fetchUserCustomCategories: async () => [],
      fetchUserHiddenCategories: async () => [],
      fetchUserCategoryPreferences: async () => [],
      mergeAllowedCategories: () => ({
        expenseCategories: ["groceries"],
        incomeCategories: ["salary"],
      }),
    },
    "../shared/plus-entitlement.ts": {
      hasPlusEntitlement,
      loadLatestSubscriptionForUser,
    },
    "../shared/edge-error-alert.ts": {
      reportEdgeFunctionError: async () => {},
    },
    "./email-templates/import-followup-email.ts": {
      createFollowupEmailBuilder: () => () => email,
    },
    "./email-templates/import-unavailable-email.ts": {
      createImportUnavailableEmailBuilder: () => () => email,
      importUnavailableReasons: {
        subscriptionRequired: "plus",
        importDisabled: "disabled",
        senderNotWhitelisted: "unverified",
        senderNotVerified: "spoofed",
        noSupportedContent: "empty",
      },
    },
    "../save-transactions-batch/index.ts": {
      saveTransactionsBatchInternal: async (_, body) => {
        saves.push(body);
        return {
          results: [
            {
              index: 0,
              success: true,
              expenseId: "66666666-6666-4666-8666-666666666666",
            },
          ],
          summary: { succeeded: 1, failed: 0 },
        };
      },
    },
  };
  runInNewContext(compiled.outputText, {
    exports,
    Request,
    Response,
    Headers,
    AbortController,
    TextEncoder,
    crypto,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console: {
      log() {},
      info() {},
      warn() {},
      error: (...values) => errors.push(values),
    },
    fetch: async (url) =>
      new Response(
        JSON.stringify(
          String(url).endsWith("/attachments")
            ? { data: [] }
            : {
                text: "超市購物：USD 12.50，2026年10月3日",
                headers: { "authentication-results": "dkim=pass" },
              },
        ),
        { headers: { "content-type": "application/json" } },
      ),
    require: (name) => {
      if (name.startsWith("https://esm.sh/@supabase/"))
        return { createClient: () => client };
      if (name.startsWith("https://esm.sh/svix"))
        return {
          Webhook: class {
            verify(body) {
              if (options.invalidSignature)
                throw new Error("Invalid signature");
              return JSON.parse(body);
            }
          },
        };
      if (name.includes("/encoding/base64.ts"))
        return { encodeBase64: () => "" };
      return modules[name] ?? {};
    },
    Deno: {
      env: {
        get: (key) =>
          ({
            SUPABASE_URL: "https://example.test",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
            GEMINI_API_KEY: "test-ai-key",
            RESEND_WEBHOOK_SECRET: "test-signature",
            RESEND_API_KEY: "test-mail-key",
          })[key],
      },
    },
  });
  return {
    events,
    saves,
    emails,
    failUsers,
    errors,
    async deliver() {
      const result = await exports.handleResendInboundWebhook(
        new Request("https://example.test/inbound", {
          method: "POST",
          headers: {
            "svix-id": "test-event",
            "svix-timestamp": "test-time",
            "svix-signature": "test-signature",
          },
          body: JSON.stringify({
            type: "email.received",
            data: {
              email_id: "receipt-1",
              from: "sender@example.com",
              to: ["files@inbound.moneko.io"],
              created_at: "2026-10-03T12:00:00Z",
            },
          }),
        }),
      );
      return { status: result.status, body: await result.json() };
    },
  };
}

test("one receipt is saved to every authorized account with native currency and scoped wallets", async () => {
  const app = harness();
  const result = await app.deliver();
  assert.equal(result.status, 200, JSON.stringify(app.errors));
  assert.equal(app.saves.length, 2);
  assert.equal(app.saves[0].userId, userA);
  assert.equal(app.saves[1].userId, userB);
  assert.equal(app.saves[0].transactions[0].accountId, walletA);
  assert.equal(app.saves[1].transactions[0].accountId, walletB);
  assert.equal(app.saves[1].householdId, spaceB);
  assert.equal(app.saves[1].transactions[0].currency, "USD");
  assert.notEqual(
    app.saves[0].transactions[0].idempotencyKey,
    app.saves[1].transactions[0].idempotencyKey,
  );
  assert.equal(
    app.events.every((event) => event.status === "processed"),
    true,
  );
  assert.equal((await app.deliver()).status, 200);
  assert.equal(app.saves.length, 2);
});

test("partial failure retries only the unfinished account", async () => {
  const app = harness({ failUsers: [userB] });
  assert.equal((await app.deliver()).status, 503);
  assert.equal(app.saves.length, 1);
  assert.equal(
    app.events.find((row) => row.delivery_user_id === userB).status,
    "processing",
  );
  app.failUsers.clear();
  assert.equal((await app.deliver()).status, 200, JSON.stringify(app.errors));
  assert.equal(app.saves.length, 2);
  assert.equal(app.saves.filter((save) => save.userId === userA).length, 1);
});

test("free and disabled accounts cannot receive another account's Plus access", async () => {
  for (const options of [{ freeUsers: [userB] }, { disabledUsers: [userB] }]) {
    const app = harness(options);
    assert.equal((await app.deliver()).status, 200);
    assert.equal(app.saves.length, 1);
    assert.equal(app.saves[0].userId, userA);
    assert.equal(
      app.events.find((row) => row.delivery_user_id === userB).status,
      "ignored",
    );
  }
});

test("authorization revoked during analysis cannot reach saving", async () => {
  const app = harness({ revokeAtLookup: 5 });
  assert.equal((await app.deliver()).status, 200);
  assert.equal(app.saves.length, 1);
  assert.equal(
    app.events.find((row) => row.delivery_user_id === userB).error_text,
    "SENDER_AUTHORIZATION_REVOKED",
  );
});

test("unverified senders and invalid webhook signatures never save", async () => {
  const unauthorized = harness({ recipients: [] });
  assert.equal((await unauthorized.deliver()).status, 200);
  assert.equal(unauthorized.saves.length, 0);
  const unsigned = harness({ invalidSignature: true });
  assert.equal((await unsigned.deliver()).status, 401);
  assert.equal(unsigned.events.length, 0);
});
