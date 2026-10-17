import {
  createNotificationTranslator,
  localizeNotificationCategory,
} from "./notification-localization.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

export interface RecurringReminderNotification {
  title: string;
  body: string;
  data: Record<string, string>;
}

export function buildRecurringReminderNotification(
  payload: Record<string, unknown>,
  now = new Date(),
  language = "en",
): RecurringReminderNotification {
  const { t } = createNotificationTranslator(language);
  const expenseId = String(payload.expense_id || "");
  const occurrenceDate = String(payload.occurrence_date || "");
  const deepLink = `moneko://recurring/${expenseId}?occurrence_date=${
    encodeURIComponent(occurrenceDate)
  }`;

  if (payload.phase === "overdue") {
    return {
      title: t("A quick recurring check-in"),
      body: t(
        "This recurring item still needs confirmation. Confirm whenever you're ready.",
      ),
      data: {
        expense_id: expenseId,
        occurrence_date: occurrenceDate,
        phase: "overdue",
        deep_link: deepLink,
      },
    };
  }

  const transactionType = payload.type === "income" ? "income" : "expense";
  const category = String(payload.category || "");
  const cents = Number(payload.amount_cents ?? 0);
  const amount = `${
    getCurrencySymbol(
      typeof payload.currency === "string" ? payload.currency : undefined,
    )
  }${(cents / 100).toFixed(2)}`;
  const occurrence = new Date(`${occurrenceDate}T00:00:00Z`);
  const daysUntil = Number.isNaN(occurrence.getTime())
    ? null
    : Math.ceil((occurrence.getTime() - now.getTime()) / 86_400_000);
  const timeframe = daysUntil === 0
    ? t("today")
    : daysUntil === 1
    ? t("tomorrow")
    : daysUntil != null && daysUntil > 1
    ? t`in ${daysUntil} days`
    : t("soon");
  const isIncome = transactionType === "income";
  const displayCategory = category
    ? localizeNotificationCategory(category, language) ??
      (category.charAt(0).toUpperCase() + category.slice(1))
    : isIncome
    ? t("Income")
    : t("Expense");

  return {
    title: isIncome ? t("💰 Incoming Payment") : t("🔔 Upcoming Expense"),
    body: isIncome
      ? t`${displayCategory} of ${amount} arrives ${timeframe}. Confirm in the app now`
      : t`${displayCategory} of ${amount} is due ${timeframe}. Confirm in the app now`,
    data: {
      expense_id: expenseId,
      occurrence_date: occurrenceDate,
      type: transactionType,
      category,
      amount: String(cents),
      currency: typeof payload.currency === "string" ? payload.currency : "",
      deep_link: deepLink,
    },
  };
}
