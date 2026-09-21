export function validateRecurringReminder(
  recurrenceRule: unknown,
): string | null {
  if (!recurrenceRule || typeof recurrenceRule !== "object") return null;

  const reminder = (recurrenceRule as Record<string, unknown>).reminder;
  if (reminder == null) return null;
  if (typeof reminder !== "object" || Array.isArray(reminder)) {
    return "recurrence_rule.reminder must be an object";
  }

  const value = reminder as Record<string, unknown>;
  if (typeof value.enabled !== "boolean") {
    return "recurrence_rule.reminder.enabled must be a boolean";
  }
  if (!value.enabled) return null;

  const mode = value.mode ?? "once";
  if (mode !== "once" && mode !== "daily_until_due") {
    return "recurrence_rule.reminder.mode must be once or daily_until_due";
  }
  if (!Number.isInteger(value.value) || Number(value.value) < 0) {
    return "recurrence_rule.reminder.value must be a non-negative integer";
  }
  if (value.unit !== "days" && value.unit !== "hours") {
    return "recurrence_rule.reminder.unit must be days or hours";
  }
  if (
    mode === "daily_until_due" &&
    (value.unit !== "days" ||
      Number(value.value) < 1 ||
      Number(value.value) > 31)
  ) {
    return "Daily reminders require a value from 1 to 31 days";
  }

  return null;
}
