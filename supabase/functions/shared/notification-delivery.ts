export type BudgetNudgeType = "warn" | "alert";

interface BudgetNudgeDataInput {
  nudgeType: BudgetNudgeType;
  householdId: string;
  budgetId: string;
  currency: string;
  spentCents: number;
  budgetCents: number;
  percentageUsed: number;
}

const noPushEventTypes = new Set(["invite_sent", "invite_revoked"]);

export function isServiceRoleRequest(req: Request, serviceRoleKey: string) {
  if (!serviceRoleKey) return false;
  return req.headers.get("Authorization") === `Bearer ${serviceRoleKey}`;
}

export function shouldSkipPushEvent(eventType: string) {
  return noPushEventTypes.has(eventType);
}

export function buildBudgetNudgeData(
  input: BudgetNudgeDataInput,
): Record<string, string> {
  const eventType = input.nudgeType === "warn" ? "budget_warn" : "budget_alert";
  return {
    event_type: eventType,
    type: "budget_nudge",
    nudge_type: input.nudgeType,
    household_id: input.householdId,
    budget_id: input.budgetId,
    currency: input.currency,
    spent_cents: String(input.spentCents),
    budget_cents: String(input.budgetCents),
    percentage_used: String(input.percentageUsed),
    deep_link: `moneko://budget/${input.budgetId}`,
    click_action: "FLUTTER_NOTIFICATION_CLICK",
  };
}
