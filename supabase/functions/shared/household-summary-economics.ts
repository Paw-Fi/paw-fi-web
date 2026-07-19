export interface HouseholdEconomicTransaction {
  amount_cents?: unknown;
  analytics_is_final?: unknown;
  analytics_spending_multiplier?: unknown;
  analytics_counts_toward_income?: unknown;
}

export function parseHouseholdCents(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string" || value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function householdSpendingEffectCents(
  transaction: HouseholdEconomicTransaction,
): number {
  if (transaction.analytics_is_final !== true) return 0;
  const multiplier = parseHouseholdCents(
    transaction.analytics_spending_multiplier,
  );
  if (multiplier !== 1 && multiplier !== -1) return 0;
  return Math.abs(parseHouseholdCents(transaction.amount_cents)) * multiplier;
}

export function householdIncomeEffectCents(
  transaction: HouseholdEconomicTransaction,
): number {
  if (
    transaction.analytics_is_final !== true ||
    transaction.analytics_counts_toward_income !== true
  ) {
    return 0;
  }
  return Math.abs(parseHouseholdCents(transaction.amount_cents));
}
