import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { normalizeEmailAddress } from "../supabase/functions/shared/email-import.ts";
import * as verification from "../supabase/functions/shared/email-sender-verification.ts";
import {
  hasPlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../supabase/functions/shared/plus-entitlement.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const add = {
  action: "add_whitelist",
  email: "sender@example.com",
  senderVerificationVersion: 1,
};
const update = { action: "update_settings", enabled: true };
const remove = { action: "remove_whitelist", email: "sender@example.com" };
const unexpected =
  "We couldn't complete this email import request. Please refresh your settings and try again.";
const databaseError = { message: "private database details" };

function harness(options = {}) {
  let handler;
  const calls = [];
  const emails = [];
  const client = {
    auth: {
      getUser: async () => {
        if (options.authThrows)
          throw new Error("private authentication failure");
        return {
          data: {
            user: { id: userId, email: options.email ?? "owner@example.com" },
          },
          error: options.authError ?? null,
        };
      },
    },
    rpc: async (name, body) => {
      calls.push({ name, body });
      if (options.rpcError) return { data: null, error: databaseError };
      return {
        data: options.rpcResult ?? {
          status: "pending",
          verificationId: "verification-1",
        },
        error: null,
      };
    },
    from(table) {
      let operation = "select";
      const defaults = {
        user_contacts: { id: "contact-1" },
        email_import_sender_whitelist: options.senders ?? [],
        users: [{ id: otherId }],
        household_members: { id: "member-1" },
        subscriptions: { plan: "lifetime", status: "active" },
      };
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        update: () => {
          operation = "update";
          return query;
        },
        upsert: () => {
          operation = "upsert";
          return query;
        },
        delete: () => {
          operation = "delete";
          return query;
        },
        maybeSingle: () => execute(),
        then: (resolve, reject) => execute().then(resolve, reject),
      };
      const execute = () => {
        const result = options.results?.[`${table}.${operation}`] ?? {
          data: defaults[table] ?? null,
          error: null,
        };
        return result instanceof Error
          ? Promise.reject(result)
          : Promise.resolve(result);
      };
      return query;
    },
  };
  const file = options.verify
    ? "email-import-sender-verify"
    : "email-import-settings";
  const source = readFileSync(
    new URL(`../supabase/functions/${file}/index.ts`, import.meta.url),
    "utf8",
  ).replaceAll("import.meta.main", "true");
  const compiled = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  runInNewContext(compiled.outputText, {
    exports: {},
    Request,
    Response,
    crypto,
    btoa,
    TextEncoder,
    require: (specifier) => {
      if (specifier.startsWith("https://esm.sh/@supabase/"))
        return { createClient: () => client };
      if (specifier === "../shared/cors.ts") return { corsHeaders: {} };
      if (specifier === "../shared/accounts.ts")
        return {
          assertAccountInScope: async () => options.accountInScope !== false,
        };
      if (specifier === "../shared/email-import.ts")
        return { normalizeEmailAddress };
      if (specifier === "../shared/email-sender-verification.ts")
        return verification;
      if (specifier === "../shared/plus-entitlement.ts")
        return {
          hasPlusEntitlement,
          jsonSubscriptionRequired,
          loadLatestSubscriptionForUser,
        };
      if (specifier === "../shared/email-service.ts")
        return {
          sendEmail: async (email) => {
            emails.push(email);
            return { success: options.emailSent !== false };
          },
        };
      if (specifier === "../shared/edge-error-alert.ts")
        return {
          reportEdgeFunctionError: async () => {
            if (options.reportThrows) throw new Error("reporting failure");
          },
        };
      throw new Error(`Unexpected test import ${specifier}`);
    },
    Deno: {
      serve: (callback) => {
        handler = callback;
      },
      env: {
        get: (key) =>
          options.configured === false
            ? undefined
            : key === "SUPABASE_URL"
              ? "https://example.test"
              : "test-key",
      },
    },
  });
  return {
    calls,
    emails,
    async request(
      payload,
      { method = "POST", authorization = true, rawBody } = {},
    ) {
      const response = await handler(
        new Request("https://example.test/verify", {
          method,
          headers: authorization
            ? { Authorization: "Bearer test-session" }
            : {},
          ...(method === "POST"
            ? { body: rawBody ?? JSON.stringify(payload) }
            : {}),
        }),
      );
      const body = response.headers
        .get("content-type")
        ?.includes("application/json")
        ? await response.json()
        : await response.text();
      return { status: response.status, body };
    },
  };
}

const errorCases = [
  [
    "outdated client",
    {},
    { ...add, senderVerificationVersion: undefined },
    {},
    426,
    "CLIENT_UPDATE_REQUIRED",
    "Please update Moneko to verify new email senders.",
  ],
  [
    "unsupported method",
    {},
    add,
    { method: "GET" },
    405,
    "METHOD_NOT_ALLOWED",
    "This request isn't supported. Please update Moneko and try again.",
  ],
  [
    "missing configuration",
    { configured: false },
    add,
    {},
    500,
    "SERVER_ERROR",
    "Email import is temporarily unavailable. Please try again later.",
  ],
  [
    "missing session",
    {},
    add,
    { authorization: false },
    401,
    "UNAUTHORIZED",
    "Your session has expired. Please sign in again to manage email import.",
  ],
  [
    "expired session",
    { authError: databaseError },
    add,
    {},
    401,
    "UNAUTHORIZED",
    "Your session has expired. Please sign in again to manage email import.",
  ],
  [
    "missing account email",
    { email: "" },
    add,
    {},
    400,
    "DEFAULT_EMAIL_MISSING",
    "Your account doesn't have a valid email address. Please update your account email or contact support.",
  ],
  [
    "invalid JSON",
    {},
    add,
    { rawBody: "{" },
    400,
    "INVALID_JSON",
    "We couldn't read this request. Please try again.",
  ],
  [
    "missing action",
    {},
    {},
    {},
    400,
    "VALIDATION_ERROR",
    "We couldn't recognize this request. Please update Moneko and try again.",
  ],
  [
    "unsupported action",
    {},
    { action: "unknown" },
    {},
    400,
    "VALIDATION_ERROR",
    "This email import action isn't supported. Please update Moneko and try again.",
  ],
  [
    "invalid enabled",
    {},
    { ...update, enabled: "yes" },
    {},
    400,
    "VALIDATION_ERROR",
    "Please choose whether email import is enabled and try again.",
  ],
  [
    "invalid space",
    {},
    { ...update, householdId: 42 },
    {},
    400,
    "VALIDATION_ERROR",
    "Please select a valid destination space.",
  ],
  [
    "invalid wallet",
    {},
    { ...update, accountId: "bad" },
    {},
    400,
    "VALIDATION_ERROR",
    "Please select a valid destination wallet.",
  ],
  [
    "wallet in another space",
    { accountInScope: false },
    { ...update, accountId: otherId },
    {},
    400,
    "ACCOUNT_SCOPE_MISMATCH",
    "This wallet doesn't belong to the selected space. Please choose a wallet in that space.",
  ],
  [
    "invalid added sender",
    {},
    { ...add, email: "bad" },
    {},
    400,
    "INVALID_EMAIL",
    "Please enter a valid email address.",
  ],
  [
    "invalid removed sender",
    {},
    { ...remove, email: "bad" },
    {},
    400,
    "INVALID_EMAIL",
    "Please enter a valid email address.",
  ],
  [
    "default sender addition",
    {},
    { ...add, email: " Owner@Example.com " },
    {},
    409,
    "DEFAULT_EMAIL_ALREADY_INCLUDED",
    "Your Moneko account email is already an allowed sender. No need to add it again.",
  ],
  [
    "default sender removal",
    {},
    { ...remove, email: "owner@example.com" },
    {},
    400,
    "DEFAULT_EMAIL_IMMUTABLE",
    "Your Moneko account email is always an allowed sender and can't be removed here.",
  ],
  [
    "contact lookup",
    { results: { "user_contacts.select": { error: databaseError } } },
    add,
    {},
    500,
    "SERVER_ERROR",
    "We couldn't load your email import settings. Please try again.",
  ],
  [
    "settings update",
    { results: { "user_contacts.update": { error: databaseError } } },
    update,
    {},
    500,
    "SERVER_ERROR",
    "We couldn't save your email import settings. Please try again.",
  ],
  [
    "space access",
    { results: { "household_members.select": { data: null } } },
    { ...update, householdId: otherId },
    {},
    403,
    "UNAUTHORIZED",
    "You no longer have access to this space. Please choose another destination.",
  ],
  [
    "sender removal",
    {
      results: {
        "email_import_sender_whitelist.delete": { error: databaseError },
      },
    },
    remove,
    {},
    500,
    "SERVER_ERROR",
    "We couldn't remove this sender. Please try again.",
  ],
  [
    "unexpected auth exception",
    { authThrows: true },
    add,
    {},
    500,
    "SERVER_ERROR",
    unexpected,
  ],
  [
    "reporter exception",
    { authThrows: true, reportThrows: true },
    add,
    {},
    500,
    "SERVER_ERROR",
    unexpected,
  ],
  [
    "verification RPC exception",
    { rpcError: true },
    add,
    {},
    500,
    "SERVER_ERROR",
    unexpected,
  ],
  [
    "verification cooldown",
    { rpcResult: { status: "rate_limited" } },
    add,
    {},
    429,
    "EMAIL_VERIFICATION_RATE_LIMIT",
    "Please wait before resending. You can request one link per minute, up to ten per hour.",
  ],
  [
    "email delivery failure",
    { emailSent: false },
    add,
    {},
    503,
    "VERIFICATION_EMAIL_FAILED",
    "Your sender is pending verification, but we couldn't send the email. Please wait one minute and resend it.",
  ],
];
for (const [
  name,
  options,
  payload,
  requestOptions,
  status,
  code,
  error,
] of errorCases) {
  test(`${name} returns actionable safe JSON`, async () => {
    const result = await harness(options).request(payload, requestOptions);
    assert.equal(result.status, status);
    assert.deepEqual(result.body, { success: false, code, error });
    assert.equal(
      JSON.stringify(result.body).includes(databaseError.message),
      false,
    );
  });
}

test("an address used by another account can request account-bound verification", async () => {
  const app = harness({
    email: "relay@privaterelay.appleid.com",
    senders: [
      {
        id: "sender-1",
        sender_email: add.email,
        normalized_sender_email: add.email,
        verified_at: null,
      },
    ],
  });
  const result = await app.request({ ...add, userId: otherId });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.whitelistEmails[0].verified, false);
  assert.equal(app.calls[0].body.p_user_id, userId);
  assert.equal(app.emails[0].to, add.email);
  const token = app.emails[0].text.match(/#([A-Za-z0-9_-]{43})/)[1];
  assert.equal(
    app.calls[0].body.p_token_hash,
    await verification.hashSenderVerificationToken(token),
  );
  assert.equal(JSON.stringify(app.calls).includes(token), false);
});

test("already verified sender requests remain idempotent without another email", async () => {
  const app = harness({ rpcResult: { status: "already_verified" } });
  assert.equal((await app.request(add)).status, 200);
  assert.equal(app.emails.length, 0);
});

test("free sender request returns the highlighted Plus contract without sending email", async () => {
  const app = harness({
    results: {
      "subscriptions.select": { data: { plan: "free", status: "active" } },
    },
  });
  const result = await app.request(add);
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "SUBSCRIPTION_REQUIRED");
  assert.equal(app.calls.length, 0);
  assert.equal(app.emails.length, 0);
});

test("GET handoff does not redeem a token or touch the database", async () => {
  const app = harness({ verify: true });
  const result = await app.request(null, { method: "GET" });
  assert.equal(result.status, 200);
  assert.equal(app.calls.length, 0);
  assert.match(result.body, /location.replace\(app\)/);
  assert.match(result.body, /button.onclick/);
});

for (const [rpcResult, status, code] of [
  [{ status: "expired" }, 410, "VERIFICATION_LINK_EXPIRED"],
  [{ status: "invalid" }, 400, "INVALID_VERIFICATION_LINK"],
]) {
  test(`${rpcResult.status} tokens cannot authorize a sender`, async () => {
    const result = await harness({ verify: true, rpcResult }).request({
      token: verification.createSenderVerificationToken(),
    });
    assert.equal(result.status, status);
    assert.equal(result.body.code, code);
  });
}

test("verification authority is bound to the stored token, not the caller's user ID", async () => {
  const token = verification.createSenderVerificationToken();
  const sender = {
    id: "sender-1",
    email: add.email,
    normalizedEmail: add.email,
    verified: true,
  };
  const app = harness({
    verify: true,
    rpcResult: { status: "verified", userId, sender },
  });
  const result = await app.request(
    { token, userId: otherId },
    { authorization: false },
  );
  assert.equal(result.body.data.userId, userId);
  assert.deepEqual(JSON.parse(JSON.stringify(app.calls[0].body)), {
    p_token_hash: await verification.hashSenderVerificationToken(token),
  });
});

test("malformed tokens are rejected before any database lookup", async () => {
  const app = harness({ verify: true });
  assert.equal((await app.request({ token: "bad" })).status, 400);
  assert.equal(app.calls.length, 0);
});
