export const ANNUAL_COMMITMENT_MONTHS = 12;

export function addAnnualCommitment(startUnixSeconds: number): string {
  const date = new Date(startUnixSeconds * 1000);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
}

export function resolveCommitmentEnd({
  previousCommitmentEnd,
  subscriptionStartUnixSeconds,
  now = new Date(),
}: {
  previousCommitmentEnd?: string | null;
  subscriptionStartUnixSeconds: number;
  now?: Date;
}): string {
  let end = previousCommitmentEnd
    ? new Date(previousCommitmentEnd)
    : new Date(addAnnualCommitment(subscriptionStartUnixSeconds));
  if (Number.isNaN(end.getTime())) {
    end = new Date(addAnnualCommitment(subscriptionStartUnixSeconds));
  }
  while (end <= now) {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  }
  return end.toISOString();
}

export function isCommitmentActive(
  commitmentEnd: string | null | undefined,
  now = new Date(),
): boolean {
  if (!commitmentEnd) return false;
  const end = new Date(commitmentEnd);
  return !Number.isNaN(end.getTime()) && end > now;
}

export function commitmentCancellationParams(commitmentEnd: string): {
  cancel_at: number;
  cancel_at_period_end: false;
} {
  return {
    cancel_at: Math.floor(new Date(commitmentEnd).getTime() / 1000),
    cancel_at_period_end: false,
  };
}
