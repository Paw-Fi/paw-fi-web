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
