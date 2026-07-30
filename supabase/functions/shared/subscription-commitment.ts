export const ANNUAL_COMMITMENT_MONTHS = 12;

export function addAnnualCommitment(startUnixSeconds: number): string {
  const date = new Date(startUnixSeconds * 1000);
  const targetYear = date.getUTCFullYear() + 1;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCFullYear(targetYear);
  date.setUTCMonth(month);
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, month + 1, 0))
    .getUTCDate();
  date.setUTCDate(Math.min(day, lastDayOfTargetMonth));
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
    end = new Date(addAnnualCommitment(end.getTime() / 1000));
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

export function resolveAnnualCommitmentSnapshot(params: {
  incomingMonths: number | null;
  incomingEnd: string | null;
  existingMonths: number | null | undefined;
  existingEnd: string | null | undefined;
  sameSubscription: boolean;
  renews: boolean;
  subscriptionStartUnixSeconds: number;
  now?: Date;
}): { months: 12; end: string } | null {
  if (
    params.incomingMonths === ANNUAL_COMMITMENT_MONTHS &&
    isValidIsoDate(params.incomingEnd)
  ) {
    const end = params.renews
      ? resolveCommitmentEnd({
        previousCommitmentEnd: params.incomingEnd,
        subscriptionStartUnixSeconds: params.subscriptionStartUnixSeconds,
        now: params.now,
      })
      : params.incomingEnd;
    return { months: ANNUAL_COMMITMENT_MONTHS, end };
  }

  if (
    !params.sameSubscription ||
    params.existingMonths !== ANNUAL_COMMITMENT_MONTHS ||
    !isValidIsoDate(params.existingEnd)
  ) {
    return null;
  }

  const end = params.renews
    ? resolveCommitmentEnd({
      previousCommitmentEnd: params.existingEnd,
      subscriptionStartUnixSeconds: params.subscriptionStartUnixSeconds,
      now: params.now,
    })
    : params.existingEnd!;

  return { months: ANNUAL_COMMITMENT_MONTHS, end };
}

export function isEarlyCommitmentTermination(params: {
  commitmentMonths: number | null | undefined;
  commitmentEnd: string | null | undefined;
  terminatedAt: Date;
}): boolean {
  return params.commitmentMonths === ANNUAL_COMMITMENT_MONTHS &&
    isCommitmentActive(params.commitmentEnd, params.terminatedAt);
}

function isValidIsoDate(value: string | null | undefined): value is string {
  return Boolean(value) && !Number.isNaN(new Date(value!).getTime());
}
