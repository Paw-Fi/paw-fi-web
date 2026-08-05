import type { CustomSplits, MemberSplit } from "../expenses-helpers.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

type HouseholdMemberLite = {
  user_id: string;
  users?: { full_name?: string | null; email?: string | null } | null;
};

export type BotSpaceMeta = {
  id: string;
  name: string;
  isPortfolio: boolean;
};

export function listBotSpaceIds(
  spaceMap: Map<string, BotSpaceMeta>,
  scope: "all" | "private" | "shared" = "all",
): string[] {
  return Array.from(
    new Set(
      Array.from(spaceMap.values())
        .filter((space) =>
          scope === "all" ||
          (scope === "private" ? space.isPortfolio : !space.isPortfolio)
        )
        .map((space) => space.id)
        .filter((id) => typeof id === "string" && id.length > 0),
    ),
  );
}

export function upsertBotSpaceMetaFromToolResult(
  toolResult: unknown,
  spaceMap: Map<string, BotSpaceMeta>,
): void {
  const result = toolResult as any;
  const space = result?.data;
  if (!result?.success || !space?.id || !space?.name) return;

  const record = {
    id: String(space.id),
    name: String(space.name),
    isPortfolio: space.is_portfolio === true,
  };
  spaceMap.set(record.id, record);
  spaceMap.set(record.name.toLowerCase(), record);
}

export function resolveBotSpaceScope(
  args: Record<string, unknown> | null | undefined,
  spaceMap: Map<string, BotSpaceMeta>,
): { householdId: string | null; spaceMeta?: BotSpaceMeta } {
  let householdId = (args?.space_id ||
    args?.spaceId ||
    args?.household_id ||
    null) as string | null;
  const householdName = (
    args?.space_name ||
    args?.spaceName ||
    args?.household_name ||
    args?.householdName ||
    ""
  )
    .toString()
    .toLowerCase();
  let spaceMeta = householdId ? spaceMap.get(householdId) : undefined;
  if (!spaceMeta && householdName && spaceMap.has(householdName)) {
    spaceMeta = spaceMap.get(householdName);
    householdId = spaceMeta?.id ?? null;
  }
  return { householdId, spaceMeta };
}

function normalizeToolSpaceScope(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function isExplicitPersonalScope(
  args: Record<string, unknown> | null | undefined,
): boolean {
  const scope = normalizeToolSpaceScope(args?.space_scope || args?.scope);
  return scope === "personal" || scope === "personal_account";
}

export function hasExplicitBotSpaceScope(
  args: Record<string, unknown> | null | undefined,
): boolean {
  if (!args) return false;
  return !!(
    args.space_id ||
    args.spaceId ||
    args.household_id ||
    args.space_name ||
    args.spaceName ||
    args.household_name ||
    args.householdName ||
    args.space_scope ||
    args.scope
  );
}

export function sanitizeBotToolResultForModel(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeBotToolResultForModel);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "_backend_failure_reported")
        .map(([key, item]) => {
          const modelKey = key
            .replaceAll("household", "space")
            .replaceAll("Household", "Space");
          return [modelKey, sanitizeBotToolResultForModel(item)];
        }),
    );
  }
  if (typeof value !== "string") return value;
  return sanitizeBotUserFacingText(value);
}

export function sanitizeBotUserFacingText(value: string): string {
  return value
    .replace(/\bhouseholds\b/gi, "shared spaces")
    .replace(/\bhousehold\b/gi, "shared space");
}

export function shouldApplyPreferredSpaceDefault(
  toolName: string | null | undefined,
  args: Record<string, unknown> | null | undefined = null,
): boolean {
  // A default space is a write destination, not a hidden filter on a read.
  // In particular, applying it to recurring list/history calls makes the
  // saved selection list disagree with a previous cross-space list.
  const recurringAction = String(args?.action || "").trim().toLowerCase();
  if (toolName === "manage_recurring") {
    // Existing recurring records own their space. Injecting a preferred
    // destination into a confirmation/update can override the list context
    // that selected that existing record.
    return recurringAction === "add";
  }
  if (
    [
      "list_expenses",
      "generate_chart_url",
      "financial_insight",
      "get_budget",
      "list_wallets",
    ].includes(toolName || "")
  ) {
    return false;
  }
  return (
    !!toolName &&
    [
      "add_transaction",
      "add_transactions_batch",
      "draft_budget",
      "confirm_budget",
      "set_budget",
      "set_pocket",
      "delete_pocket",
      "list_wallets",
      "create_wallet",
      "update_wallet",
      "create_wallet_transfer",
    ].includes(toolName)
  );
}

export function applyPreferredSpaceDefaultToToolCall(
  call: { name?: string | null; args?: Record<string, unknown> | null },
  preferredSpaceId: string | null | undefined,
): void {
  const args = call.args && typeof call.args === "object" ? call.args : {};
  if (!preferredSpaceId || !shouldApplyPreferredSpaceDefault(call.name, args)) {
    call.args = args;
    return;
  }
  if (hasExplicitBotSpaceScope(args) || isExplicitPersonalScope(args)) {
    call.args = args;
    return;
  }
  call.args = {
    ...args,
    space_id: preferredSpaceId,
    preferred_space_applied: true,
  };
}

export function normalizeNameForMatch(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9]+/g, " ")
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
      const amount = typeof split?.amount === "number"
        ? Math.max(0, split.amount)
        : null;
      if (amount == null) missing.push(id);
      else specifiedSum += amount;
    }
    const remaining = Math.max(0, total - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;
    for (const id of memberIds) {
      const split = byId.get(id);
      const amount = typeof split?.amount === "number"
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
      const percentage = typeof split?.percentage === "number"
        ? Math.max(0, Math.min(100, split.percentage))
        : null;
      if (percentage == null) missing.push(id);
      else specifiedSum += percentage;
    }
    const remaining = Math.max(0, 100 - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;
    for (const id of memberIds) {
      const split = byId.get(id);
      const percentage = typeof split?.percentage === "number"
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
      const shares = typeof split?.shares === "number"
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
