import { createNotificationTranslator } from "./notification-localization.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";
import { PRICING_URL } from "./plus-entitlement.ts";

export function getSettlementNote(
  payload: Record<string, unknown>,
): string | null {
  const candidates = [
    payload.settlement_note,
    payload.message,
    payload.note,
    payload.settlement_message,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

export function buildSpecialNotificationMessage(
  eventType: "capture_plus_required" | "settlement_completed" | "split_settled",
  payload: Record<string, unknown>,
  language = "en",
): { title: string; body: string; data: Record<string, string> } {
  const { t } = createNotificationTranslator(language);
  const householdName =
    (payload.household_name || t("your household")) as string;
  switch (eventType) {
    case "capture_plus_required": {
      const captureSource = String(payload.capture_source || "");
      const feature = captureSource === "ios_wallet_shortcut"
        ? t("Apple Pay capture")
        : t("Notification capture");
      return {
        title: t("Moneko Plus required"),
        body:
          t`${feature} is available with an active Moneko Plus plan. Start a trial or subscribe to continue.`,
        data: {
          capture_source: captureSource,
          pricing_url: PRICING_URL,
          deep_link: PRICING_URL,
        },
      };
    }

    case "settlement_completed":
    case "split_settled": {
      const actorName = (payload.actor_name || t("Someone")) as string;
      const code = payload.currency as string | undefined;
      const symbol = getCurrencySymbol(code);
      const amountsBefore = payload.amounts_before &&
          typeof payload.amounts_before === "object" &&
          !Array.isArray(payload.amounts_before)
        ? payload.amounts_before as Record<string, unknown>
        : {};
      const youOweCents = Number(
        amountsBefore.you_owe_cents ?? payload.amount_cents ?? 0,
      );
      const youAreOwedCents = Number(
        amountsBefore.you_are_owed_cents ?? 0,
      );
      const netPayCents = Number(
        amountsBefore.net_pay_cents ??
          Math.max(youOweCents - youAreOwedCents, 0),
      );

      // First-person toward the recipient: actor settled with you
      const note = getSettlementNote(payload);
      const title = actorName;
      const baseBody = netPayCents > 0
        ? t`settled ${symbol}${
          (netPayCents / 100).toFixed(
            2,
          )
        } with you in ${householdName}`
        : t`settled up with you in ${householdName}`;
      const body = note ? `${baseBody}: ${note}` : baseBody;

      return {
        title,
        body,
        data: {
          household_id: String(payload.household_id || ""),
        },
      };
    }
  }
}
