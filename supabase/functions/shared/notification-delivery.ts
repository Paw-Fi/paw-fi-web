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

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;

  for (let index = 0; index < length; index++) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

function parseSecretKeys(secretKeysJson?: string | null) {
  if (!secretKeysJson) return [];

  try {
    const parsed = JSON.parse(secretKeysJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }

    return Object.values(parsed).filter(
      (value): value is string =>
        typeof value === "string" && value.startsWith("sb_secret_"),
    );
  } catch {
    return [];
  }
}

export function isServiceRoleRequest(
  req: Request,
  serviceRoleKey?: string | null,
  secretKeysJson?: string | null,
) {
  const authorization = req.headers.get("Authorization");
  if (
    serviceRoleKey &&
    authorization &&
    constantTimeEqual(authorization, `Bearer ${serviceRoleKey}`)
  ) {
    return true;
  }

  const apiKey = req.headers.get("apikey");
  if (!apiKey) return false;

  return parseSecretKeys(secretKeysJson).some((secretKey) =>
    constantTimeEqual(apiKey, secretKey)
  );
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
