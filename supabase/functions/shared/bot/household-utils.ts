import type { CustomSplits, MemberSplit } from "../expenses-helpers.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

type HouseholdMemberLite = {
  user_id: string;
  users?: { full_name?: string | null; email?: string | null } | null;
};

export function normalizeNameForMatch(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/@.*/, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveMemberIdByName(
  members: HouseholdMemberLite[],
  query: string,
): string | null {
  const q = normalizeNameForMatch(query);
  if (!q) return null;

  const matches: string[] = [];
  for (const member of members) {
    const name = normalizeNameForMatch(member.users?.full_name || "");
    const email = normalizeNameForMatch(member.users?.email || "");
    if (!member.user_id) continue;
    if (name === q || email === q) matches.push(member.user_id);
    else if (name.includes(q) || email.includes(q)) {
      matches.push(member.user_id);
    }
  }
  const unique = Array.from(new Set(matches));
  if (unique.length !== 1) return null;
  return unique[0];
}

export async function ensureHouseholdMember(
  supabase: SupabaseLike,
  householdId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function resolveHouseholdSplitConfig(
  supabase: SupabaseLike,
  householdId: string,
  actorUserId: string,
  totalAmount: number,
  args: any,
): Promise<{ payerUserId?: string; customSplits?: CustomSplits }> {
  const payerName = (args.payer_name || args.paid_by || "").toString().trim();
  const splitTypeHint = (args.split_type || "").toString().trim().toLowerCase();
  const memberSplitsRaw = Array.isArray(args.member_splits)
    ? args.member_splits
    : [];

  const { data: members, error } = await supabase
    .from("household_members")
    .select("user_id, users(full_name, email)")
    .eq("household_id", householdId);
  if (error || !members || members.length === 0) return {};

  const memberIds = members
    .map((member: any) => member.user_id as string)
    .filter(Boolean);
  if (memberIds.length === 0) return {};

  const payerUserId = payerName
    ? resolveMemberIdByName(members as any, payerName) || actorUserId
    : actorUserId;

  if (!memberSplitsRaw.length) {
    return { payerUserId };
  }

  const inferredType = (() => {
    if (["equal", "amount", "percentage", "shares"].includes(splitTypeHint)) {
      return splitTypeHint;
    }
    const hasPct = memberSplitsRaw.some(
      (split: any) => typeof split?.percentage === "number",
    );
    const hasShares = memberSplitsRaw.some(
      (split: any) => typeof split?.shares === "number",
    );
    return hasPct ? "percentage" : hasShares ? "shares" : "amount";
  })();

  const byId = new Map<string, any>();
  for (const split of memberSplitsRaw) {
    const memberName = (
      split?.member_name ||
      split?.member ||
      split?.name ||
      ""
    )
      .toString()
      .trim();
    if (!memberName) continue;
    const memberId = resolveMemberIdByName(members as any, memberName);
    if (!memberId) continue;
    byId.set(memberId, split);
  }

  const total = Number.isFinite(totalAmount) ? Math.max(0, totalAmount) : 0;
  const fullSplits: MemberSplit[] = [];

  if (inferredType === "amount") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const split = byId.get(id);
      const amount =
        typeof split?.amount === "number" ? Math.max(0, split.amount) : null;
      if (amount == null) missing.push(id);
      else specifiedSum += amount;
    }
    const remaining = Math.max(0, total - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;
    for (const id of memberIds) {
      const split = byId.get(id);
      const amount =
        typeof split?.amount === "number"
          ? Math.max(0, split.amount)
          : perMissing;
      fullSplits.push({ userId: id, amount });
    }
    const sum = fullSplits.reduce((acc, split) => acc + (split.amount || 0), 0);
    const diff = total - sum;
    if (fullSplits.length && Math.abs(diff) > 1e-6) {
      fullSplits[fullSplits.length - 1].amount = Math.max(
        0,
        (fullSplits[fullSplits.length - 1].amount || 0) + diff,
      );
    }
  } else if (inferredType === "percentage") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const split = byId.get(id);
      const percentage =
        typeof split?.percentage === "number"
          ? Math.max(0, Math.min(100, split.percentage))
          : null;
      if (percentage == null) missing.push(id);
      else specifiedSum += percentage;
    }
    const remaining = Math.max(0, 100 - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;
    for (const id of memberIds) {
      const split = byId.get(id);
      const percentage =
        typeof split?.percentage === "number"
          ? Math.max(0, Math.min(100, split.percentage))
          : perMissing;
      fullSplits.push({ userId: id, percentage });
    }
    const sum = fullSplits.reduce(
      (acc, split) => acc + (split.percentage || 0),
      0,
    );
    const diff = 100 - sum;
    if (fullSplits.length && Math.abs(diff) > 1e-6) {
      fullSplits[fullSplits.length - 1].percentage = Math.max(
        0,
        (fullSplits[fullSplits.length - 1].percentage || 0) + diff,
      );
    }
  } else if (inferredType === "shares") {
    for (const id of memberIds) {
      const split = byId.get(id);
      const shares =
        typeof split?.shares === "number"
          ? Math.max(1, Math.trunc(split.shares))
          : 1;
      fullSplits.push({ userId: id, shares });
    }
  }

  return {
    payerUserId,
    customSplits: {
      splitType: inferredType as CustomSplits["splitType"],
      memberSplits: fullSplits,
    },
  };
}
