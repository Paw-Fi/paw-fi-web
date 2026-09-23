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
    constantTimeEqual(apiKey, secretKey),
  );
}

export function shouldSkipPushEvent(eventType: string) {
  return noPushEventTypes.has(eventType);
}

export function buildNotificationDeepLink(
  eventType: string,
  data: Record<string, string>,
): string {
  const appScheme = "moneko://";

  switch (eventType) {
    case "expense_added":
    case "expense_edited":
    case "income_added":
    case "income_edited":
    case "income_acknowledged":
      if (data.expense_id) return `${appScheme}expense/${data.expense_id}`;
      if (data.household_id) {
        return `${appScheme}household/${data.household_id}`;
      }
      break;
    case "expense_deleted":
    case "member_joined":
    case "invite_accepted":
    case "member_reminded":
    case "settlement_completed":
    case "split_settled":
      if (data.household_id) {
        return `${appScheme}household/${data.household_id}`;
      }
      break;
    case "budget_warn":
    case "budget_alert":
      if (data.budget_id) return `${appScheme}budget/${data.budget_id}`;
      break;
    case "split_created":
      if (data.split_group_id || data.split_id) {
        return `${appScheme}split/${data.split_group_id || data.split_id}`;
      }
      if (data.household_id) {
        return `${appScheme}household/${data.household_id}/splits`;
      }
      break;
    case "invite_reminder_inviter":
      if (data.household_id) {
        return `${appScheme}household/${data.household_id}/settings?tab=2`;
      }
      break;
    case "invite_reminder_invitee":
      if (data.invite_token) {
        return `${appScheme}households/join?token=${encodeURIComponent(
          data.invite_token,
        )}`;
      }
      break;
    case "pockets_month_review":
      return `${appScheme}pockets`;
  }

  return `${appScheme}home`;
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
