export interface NextMonthCarryInput {
  remainingCents: number;
  rolloverEnabled: boolean;
  rolloverNegative: boolean;
  rolloverCapCents?: number;
}

export function calculateNextMonthCarryCents({
  remainingCents,
  rolloverEnabled,
  rolloverNegative,
  rolloverCapCents,
}: NextMonthCarryInput): number {
  if (!rolloverEnabled) return 0;
  if (remainingCents < 0 && !rolloverNegative) return 0;
  if (
    rolloverCapCents != null &&
    Number.isFinite(rolloverCapCents) &&
    remainingCents > rolloverCapCents
  ) {
    return rolloverCapCents;
  }
  return remainingCents;
}
