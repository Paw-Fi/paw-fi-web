import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createHouseholdInvite } from "../supabase/functions/shared/household-invites.ts";
import * as emailLocalization from "../supabase/functions/shared/automated-email-localization.ts";

const householdId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const inviterId = "33333333-3333-4333-8333-333333333333";
const invite = {
  id: "invite-1",
  token: "token-1",
  household_id: householdId,
  inviter_id: inviterId,
  status: "pending",
  expires_at: null,
  is_reusable: true,
  invited_role: "member",
  invited_email: null,
  households: { id: householdId, name: "家族", is_portfolio: false },
};

function harness(endpoint, options = {}) {
  let handler;
  const calls = [];
  const notifications = [];
  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user: options.unauthorized
            ? null
            : { id: userId, email: "user@example.com" },
        },
        error: null,
      }),
    },
    rpc: async (name, body) => {
      calls.push({ name, body });
      if (options.rpcError)
        return { data: null, error: { message: "private details" } };
      return {
        data:
          name === "bind_user_to_household_subscription"
            ? false
            : (options.acceptance ?? {
                success: true,
                household_id: householdId,
                member_id: "member-1",
                invite_id: invite.id,
                inviter_id: inviterId,
                member_created: true,
              }),
        error: null,
      };
    },
    from(table) {
      const filters = [];
      let operation = "select";
      let payload;
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        eq: (column, value) => {
          filters.push([column, value]);
          return query;
        },
        in: (column, value) => {
          filters.push([column, value]);
          return query;
        },
        neq: () => query,
        is: () => query,
        lt: () => query,
        or: () => query,
        insert: (value) => {
          operation = "insert";
          payload = value;
          return query;
        },
        update: (value) => {
          operation = "update";
          payload = value;
          return query;
        },
        delete: () => {
          operation = "delete";
          return query;
        },
        single: () => execute(),
        maybeSingle: () => execute(),
        then: (resolve, reject) => execute().then(resolve, reject),
      };
      const execute = async () => {
        calls.push({ table, operation, payload, filters });
        if (table === "notification_events") {
          notifications.push(payload);
          return { data: payload, error: null };
        }
        if (table === "invites" && operation === "insert")
          return { data: payload, error: null };
        if (table === "invites" && operation === "update")
          return {
            data: options.revokeConflict ? null : { id: invite.id },
            error: null,
          };
        if (table === "invites" && endpoint.includes("reminders")) {
          return {
            data: filters.some(
              ([key, value]) => key === "is_reusable" && value === false,
            )
              ? []
              : [
                  {
                    ...invite,
                    created_at: new Date(
                      Date.now() - 4 * 86400000,
                    ).toISOString(),
                    reminder_count: 0,
                    last_reminder_sent_at: null,
                  },
                ],
            error: null,
          };
        }
        const defaults = {
          invites: options.invite ?? invite,
          households: {
            id: householdId,
            name: "家族",
            owner_id: inviterId,
            is_portfolio: options.private === true,
          },
          household_members:
            options.membership ??
            (endpoint.includes("create") || endpoint.includes("revoke")
              ? { role: options.actorRole ?? "admin" }
              : null),
          users: { id: userId, full_name: "山田", email: "user@example.com" },
          subscriptions: options.activeSubscription
            ? { plan: "plus", status: "active", user_id: inviterId }
            : null,
        };
        return { data: defaults[table] ?? null, count: 0, error: null };
      };
      return query;
    },
  };
  const dependencies = {
    "../shared/automated-email-localization.ts": emailLocalization,
    "../shared/cors.ts": { getCorsHeaders: () => ({}) },
    "../shared/household-invites.ts": { createHouseholdInvite },
    "../shared/edge-error-alert.ts": {
      reportEdgeFunctionError: async () => {},
    },
    "../shared/email-service.ts": {
      sendEmail: async () => ({ success: true }),
    },
    "../shared/email-html-to-text.ts": { htmlToText: (value) => value },
    "../shared/email-layout.ts": {
      baseTemplate: (value) => value,
      renderFooter: () => "",
      mobileDownloadCtasHtml: () => "",
    },
    "../shared/email-utils.ts": {
      escapeHtml: (value) => value,
      sanitizeSubject: (value) => value,
    },
    "../shared/household-subscription-sharing.ts": {
      hasActiveHouseholdSubscriptionAccess: () => !!options.activeSubscription,
      hasReachedHouseholdSubscriptionGrantLimit: () => false,
      HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT: 4,
    },
    "../shared/user-contacts.ts": {
      fetchLatestUserContact: async () => ({
        data: null,
        error: options.contactError ? new Error("contact unavailable") : null,
      }),
    },
    "../shared/user-display-name.ts": {
      resolveUserDisplayName: (name) => name,
    },
    "../shared/email-templates.ts": {},
  };
  const source = readFileSync(
    new URL(`../supabase/functions/${endpoint}/index.ts`, import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  runInNewContext(compiled.outputText, {
    exports: {},
    Request,
    Response,
    URL,
    console: { log() {}, warn() {}, error() {} },
    Deno: {
      env: {
        get: (key) =>
          key === "SUPABASE_SERVICE_ROLE_KEY"
            ? "test-service"
            : "https://example.com",
      },
    },
    require: (specifier) => {
      if (specifier.includes("http/server.ts"))
        return {
          serve: (callback) => {
            handler = callback;
          },
        };
      if (specifier.startsWith("https://esm.sh/@supabase/"))
        return { createClient: () => client };
      if (dependencies[specifier]) return dependencies[specifier];
      throw new Error(`Unexpected dependency ${specifier}`);
    },
  });
  return {
    client,
    calls,
    notifications,
    request: async (
      body = { token: invite.token },
      authorization = "Bearer test-user",
    ) => {
      const response = await handler(
        new Request("https://example.com", {
          method: "POST",
          headers: authorization ? { Authorization: authorization } : {},
          body: JSON.stringify(body),
        }),
      );
      return { status: response.status, body: await response.json() };
    },
  };
}

const create = (client, extra = {}) =>
  createHouseholdInvite({
    supabase: client,
    appUrl: "https://moneko.io",
    resendFrom: "test@example.com",
    householdId,
    actorUserId: userId,
    ...extra,
  });

test("legacy creation defaults to single-use admin and seven days", async () => {
  const h = harness("households-create-invite");
  const result = await create(h.client);
  assert.equal(result.success, true);
  const row = h.calls.find((call) => call.operation === "insert").payload;
  assert.equal(row.is_reusable, false);
  assert.equal(row.invited_role, "admin");
  assert.ok(
    Math.abs(Date.parse(row.expires_at) - Date.now() - 7 * 86400000) < 1000,
  );
});

for (const days of [0, 1, 3, 7, 14, 30]) {
  test(`create forwards reusable member invite with ${days}-day expiry`, async () => {
    const h = harness("households-create-invite");
    const result = await h.request({
      household_id: householdId,
      is_reusable: true,
      invited_role: "member",
      expires_in_days: days,
    });
    assert.equal(result.status, 200);
    const rows = h.calls.filter(
      (call) => call.table === "invites" && call.operation === "insert",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].payload.is_reusable, true);
    assert.equal(rows[0].payload.invited_role, "member");
    assert.equal(result.body.is_reusable, true);
    assert.equal(result.body.invited_role, "member");
    if (days === 0) assert.equal(result.body.expires_at, null);
  });
}

for (const extra of [
  { invitedRole: "owner" },
  { invitedRole: "ADMIN" },
  { invitedRole: null },
  { isReusable: "true" },
  { isReusable: null },
  { isReusable: true, invitedEmail: "recipient@example.com" },
  { expiresInDays: NaN },
  { expiresInDays: Infinity },
  { expiresInDays: -1 },
  { expiresInDays: 31 },
  { expiresInDays: 1.5 },
  { expiresInDays: "7" },
  { isReusable: true, expiresInDays: 2 },
]) {
  test(`rejects invalid creation contract ${JSON.stringify(extra)}`, async () => {
    const h = harness("households-create-invite");
    const result = await create(h.client, extra);
    assert.equal(result.success, false);
    assert.equal(result.status, 400);
    assert.equal(
      h.calls.some((call) => call.operation === "insert"),
      false,
    );
  });
}

test("legacy single-use arbitrary integer TTL remains supported", async () => {
  const h = harness("households-create-invite");
  assert.equal((await create(h.client, { expiresInDays: 2 })).success, true);
});

test("legacy personalized email invites retain message, admin role, and delivery", async () => {
  const h = harness("households-create-invite");
  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, request) => {
    sent.push(JSON.parse(request.body));
    return new Response("{}", { status: 200 });
  };
  try {
    const result = await create(h.client, {
      invitedEmail: " recipient@example.com ",
      personalMessage: "一緒に参加しよう",
      resendApiKey: "isolated-test-key",
    });
    assert.equal(result.success, true);
    assert.equal(result.email_sent, true);
    assert.equal(result.invited_role, "admin");
    assert.equal(result.is_reusable, false);
    const row = h.calls.find((call) => call.operation === "insert").payload;
    assert.equal(row.invited_email, "recipient@example.com");
    assert.equal(row.personal_message, "一緒に参加しよう");
    assert.deepEqual(sent[0].to, ["recipient@example.com"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("legacy nullable recipient still creates a single-use general link", async () => {
  const h = harness("households-create-invite");
  const result = await h.request({
    household_id: householdId,
    invited_email: null,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.is_reusable, false);
});

for (const options of [{ private: true }, { actorRole: "member" }]) {
  test(`creation rejects unauthorized space ${JSON.stringify(options)}`, async () => {
    const h = harness("households-create-invite", options);
    assert.equal((await create(h.client)).success, false);
    assert.equal(
      h.calls.some((call) => call.operation === "insert"),
      false,
    );
  });
}

test("validation returns reusable role metadata and household on ALREADY_MEMBER", async () => {
  for (const membership of [null, { id: "member-1", role: "owner" }]) {
    const h = harness("households-validate-invite", { membership });
    const result = await h.request();
    assert.equal(result.status, membership ? 409 : 200);
    assert.equal(result.body.household.id, householdId);
    assert.equal(result.body.invite.is_reusable, true);
    assert.equal(result.body.invite.invited_role, "member");
    if (membership) assert.equal(result.body.error_code, "ALREADY_MEMBER");
  }
});

for (const status of ["expired", "revoked", "accepted"]) {
  test(`validation denies terminal ${status} with null expiry`, async () => {
    const h = harness("households-validate-invite", {
      invite: { ...invite, status },
    });
    const result = await h.request();
    assert.equal(result.body.valid, false);
    assert.equal(result.body.error_code, status.toUpperCase());
    assert.equal(result.status, status === "accepted" ? 409 : 410);
  });
}

test("validation expiry is read-only and never overwrites a concurrent lifecycle change", async () => {
  const h = harness("households-validate-invite", {
    invite: { ...invite, expires_at: "2020-01-01T00:00:00Z" },
  });
  assert.equal((await h.request()).body.error_code, "EXPIRED");
  assert.equal(
    h.calls.some((call) => call.operation === "update"),
    false,
  );
});

test("acceptance calls atomic RPC with authenticated actor; only new members run side effects", async () => {
  for (const memberCreated of [true, false]) {
    const h = harness("households-accept-invite", {
      activeSubscription: true,
      acceptance: {
        success: true,
        household_id: householdId,
        member_id: "member-1",
        invite_id: invite.id,
        inviter_id: inviterId,
        member_created: memberCreated,
      },
    });
    const result = await h.request({ token: invite.token, user_id: inviterId });
    assert.equal(result.status, 200);
    assert.equal(result.body.member_id, "member-1");
    assert.deepEqual(
      structuredClone(
        h.calls.find((call) => call.name === "households_accept_invite_v1")
          ?.body,
      ),
      { p_token: invite.token, p_user_id: userId },
    );
    assert.equal(
      h.calls.some(
        (call) =>
          call.table === "household_members" && call.operation === "insert",
      ),
      false,
    );
    assert.equal(
      h.calls.some(
        (call) => call.table === "invites" && call.operation === "update",
      ),
      false,
    );
    assert.equal(h.notifications.length, memberCreated ? 1 : 0);
    assert.equal(
      h.calls.some(
        (call) => call.name === "bind_user_to_household_subscription",
      ),
      memberCreated,
    );
  }
});

for (const [code, status] of [
  ["NOT_FOUND", 404],
  ["ACCEPTED", 409],
  ["EXPIRED", 410],
  ["REVOKED", 410],
  ["INVALID_STATUS", 409],
  ["PRIVATE_SPACE", 400],
]) {
  test(`acceptance maps authoritative ${code} to ${status}`, async () => {
    const h = harness("households-accept-invite", {
      acceptance: { success: false, error_code: code },
    });
    const result = await h.request();
    assert.equal(result.status, status);
    assert.equal(result.body.error_code, code);
    assert.equal(h.notifications.length, 0);
  });
}

test("RPC failure is safe and does not fall back to non-atomic writes", async () => {
  const h = harness("households-accept-invite", { rpcError: true });
  const result = await h.request();
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(result.body).includes("private details"), false);
  assert.equal(h.notifications.length, 0);
});

test("post-commit contact failure does not suppress existing join notifications", async () => {
  const h = harness("households-accept-invite", { contactError: true });
  assert.equal((await h.request()).status, 200);
  assert.equal(h.notifications.length, 1);
});

test("accept requires authentication and valid token before RPC", async () => {
  for (const [body, auth, status] of [
    [{}, "Bearer user", 400],
    [{ token: 4 }, "Bearer user", 400],
    [{ token: " " }, "Bearer user", 400],
    [{ token: "token" }, null, 401],
  ]) {
    const h = harness("households-accept-invite");
    assert.equal((await h.request(body, auth)).status, status);
    assert.equal(
      h.calls.some((call) => call.name),
      false,
    );
  }
});

test("revoke update guards pending/expired lifecycle and suppresses losing-race notification", async () => {
  const h = harness("households-revoke-invite", { revokeConflict: true });
  const result = await h.request({ invite_id: invite.id });
  const update = h.calls.find((call) => call.operation === "update");
  assert.ok(
    update.filters.some(
      ([key, value]) =>
        key === "status" && JSON.stringify(value) === '["pending","expired"]',
    ),
  );
  assert.equal(result.status, 409);
  assert.equal(h.notifications.length, 0);
});

test("reusable general links never enter recipient reminder processing", async () => {
  const h = harness("households-process-invite-reminders");
  const result = await h.request({}, "Bearer test-service");
  assert.equal(result.status, 200);
  assert.equal(result.body.processed, 0);
  assert.equal(h.notifications.length, 0);
});
