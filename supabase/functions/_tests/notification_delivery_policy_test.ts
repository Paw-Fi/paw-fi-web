/// <reference lib="deno.ns" />

import {
  buildBudgetNudgeData,
  isServiceRoleRequest,
  shouldSkipPushEvent,
} from "../shared/notification-delivery.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test(
  "internal notification requests require the exact service role bearer",
  () => {
    const key = "service-role-key";
    assert(
      isServiceRoleRequest(
        new Request("https://example.test", {
          headers: { Authorization: `Bearer ${key}` },
        }),
        key,
      ),
      "expected service role request to be accepted",
    );
    assert(
      !isServiceRoleRequest(
        new Request("https://example.test", {
          headers: { Authorization: "Bearer authenticated-user-jwt" },
        }),
        key,
      ),
      "expected user JWT to be rejected",
    );
    assert(
      !isServiceRoleRequest(new Request("https://example.test"), key),
      "expected missing authorization to be rejected",
    );
  },
);

Deno.test("internal notification requests accept a configured secret apikey", () => {
  const secretKey = "sb_secret_notification-worker";
  const secretKeysJson = JSON.stringify({ default: secretKey });

  assert(
    isServiceRoleRequest(
      new Request("https://example.test", {
        headers: { apikey: secretKey },
      }),
      "legacy-service-role-key",
      secretKeysJson,
    ),
    "expected matching secret apikey to be accepted",
  );
  assert(
    !isServiceRoleRequest(
      new Request("https://example.test", {
        headers: { apikey: "sb_secret_wrong" },
      }),
      "legacy-service-role-key",
      secretKeysJson,
    ),
    "expected an unknown secret apikey to be rejected",
  );
});

Deno.test("internal notification auth fails closed for malformed key input", () => {
  assert(
    !isServiceRoleRequest(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer sb_secret_notification-worker" },
      }),
      "legacy-service-role-key",
      JSON.stringify({ default: "sb_secret_notification-worker" }),
    ),
    "secret keys must not be accepted as bearer JWTs",
  );
  assert(
    !isServiceRoleRequest(
      new Request("https://example.test", {
        headers: { apikey: "sb_secret_notification-worker" },
      }),
      "legacy-service-role-key",
      "not-json",
    ),
    "malformed secret key configuration must be rejected",
  );
});

Deno.test("non-push invitation audit events are skipped", () => {
  assert(shouldSkipPushEvent("invite_sent"), "invite_sent must not push");
  assert(shouldSkipPushEvent("invite_revoked"), "invite_revoked must not push");
  assert(!shouldSkipPushEvent("expense_added"), "expense_added must push");
});

Deno.test("budget nudge data uses the mobile notification contract", () => {
  const data = buildBudgetNudgeData({
    nudgeType: "warn",
    householdId: "household-1",
    budgetId: "budget-1",
    currency: "USD",
    spentCents: 9000,
    budgetCents: 10000,
    percentageUsed: 90,
  });

  assert(data.event_type === "budget_warn", "missing budget_warn event type");
  assert(data.budget_id === "budget-1", "missing budget id");
  assert(
    data.deep_link === "moneko://budget/budget-1",
    "incorrect budget deep link",
  );
});

Deno.test("notification migration unifies webhook and cron authentication", async () => {
  const migration = await Deno.readTextFile(
    new URL(
      "../../migrations/20260718100000_unify_notification_internal_auth.sql",
      import.meta.url,
    ),
  );

  assert(
    migration.includes("notification_internal_secret_key"),
    "migration must read the dedicated notification Vault secret",
  );
  assert(
    migration.includes("'apikey', v_notification_secret_key"),
    "immediate webhook must use the secret apikey header",
  );
  assert(
    migration.includes("'process-notification-events'"),
    "migration must reschedule the fallback worker",
  );
  assert(
    migration.includes("'daily-expense-nudges'"),
    "migration must reschedule the daily reminder producer",
  );
  assert(
    !migration.includes("'Authorization', 'Bearer '"),
    "notification migration must not retain legacy bearer credentials",
  );
});

Deno.test("all internal notification endpoints disable gateway JWT auth", async () => {
  const config = await Deno.readTextFile(
    new URL("../../config.toml", import.meta.url),
  );
  const internalFunctions = [
    "households-send-push-notification",
    "households-process-notifications",
    "households-send-nudge",
    "expense-daily-nudges",
  ];

  for (const functionName of internalFunctions) {
    const section = `[functions.${functionName}]\nverify_jwt = false`;
    assert(
      config.includes(section),
      `${functionName} must authenticate opaque apikey requests in its handler`,
    );
  }
});
