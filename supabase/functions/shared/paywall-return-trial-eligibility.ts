export type ExistingSubscriptionRow = {
  id?: string | null;
  status?: string | null;
  plan?: string | null;
  current_period_end?: string | null;
} | null;

export function canGrantPaywallReturnTrial(
  subscription: ExistingSubscriptionRow,
): boolean {
  return subscription == null;
}

export function hasRecentPaywallReturnExit(
  exitAtIso: string | null | undefined,
  now: Date,
  windowMinutes: number,
): boolean {
  if (!exitAtIso || windowMinutes <= 0) return false;

  const exitAt = new Date(exitAtIso);
  const exitTime = exitAt.getTime();
  const nowTime = now.getTime();

  if (Number.isNaN(exitTime) || exitTime > nowTime) return false;

  return nowTime - exitTime <= windowMinutes * 60 * 1000;
}
