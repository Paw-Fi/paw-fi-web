// Shared helper: resolve effective household auto-split configuration.
//
// Backed by columns `households.ai_use_default_split` and
// `households.ai_default_split_config` (see migration
// 20260420140000_add_household_ai_default_split.sql).
//
// When `ai_use_default_split` is FALSE the household opts out of automatic
// default splitting: expenses still log against the household, and no
// `expense_split_groups` row is created unless the request carries an explicit
// custom-splits payload from the user's input.
//
// When `ai_use_default_split` is TRUE and the request does not carry an
// explicit custom-splits payload, we fall back to `ai_default_split_config`
// (serialised via `buildCustomSplitsPayload` on the client).

export interface MemberSplit {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface CustomSplits {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplit[];
}

export interface HouseholdAutoSplitSettings {
  autoSplitEnabled: boolean;
  defaultConfig: CustomSplits | null;
}

export interface HouseholdMemberRow {
  user_id: string;
}

export type EffectiveSplit =
  | { kind: "skip" }
  | { kind: "customSplits"; customSplits: CustomSplits | null };

export interface SplitGroupRecord {
  id: string;
  household_id: string;
  expense_id: string;
  payer_user_id: string;
  split_type: CustomSplits["splitType"];
  currency: string;
  total_amount_cents: number;
  description: string | null;
  created_at: string;
}

export interface SplitLineRecord {
  split_group_id: string;
  user_id: string;
  amount_cents: number;
  percentage: number | null;
  shares: number | null;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
}

export type BuildSplitRecordsResult =
  | { ok: true; group: SplitGroupRecord; lines: SplitLineRecord[] }
  | { ok: false; code: string; error: string };

export type CreateAutoSplitResult =
  | { kind: "not_applicable"; transaction: Record<string, unknown> }
  | { kind: "skipped"; transaction: Record<string, unknown> }
  | {
      kind: "created";
      splitGroupId: string;
      transaction: Record<string, unknown>;
    }
  | { kind: "invalid"; code: string; error: string }
  | { kind: "failed"; error: unknown };

const ALLOWED_SPLIT_TYPES = new Set([
  "equal",
  "amount",
  "percentage",
  "shares",
]);

function isUniform(values: number[], epsilon = 1e-6): boolean {
  if (values.length <= 1) return true;
  const baseline = values[0];
  return values.every((value) => Math.abs(value - baseline) <= epsilon);
}

function isSemanticallyEqualSplit(customSplits: CustomSplits): boolean {
  if (customSplits.memberSplits.length <= 1) return true;

  if (customSplits.splitType === "amount") {
    const amounts = customSplits.memberSplits.map((split) => split.amount);
    if (
      amounts.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      )
    ) {
      return false;
    }
    return isUniform(amounts as number[]);
  }

  if (customSplits.splitType === "percentage") {
    const percentages = customSplits.memberSplits.map(
      (split) => split.percentage,
    );
    if (
      percentages.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      )
    ) {
      return false;
    }
    return isUniform(percentages as number[]);
  }

  if (customSplits.splitType === "shares") {
    const shares = customSplits.memberSplits.map((split) => split.shares);
    if (
      shares.some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      )
    ) {
      return false;
    }
    return isUniform(shares as number[]);
  }

  return false;
}

function coerceCustomSplits(raw: unknown): CustomSplits | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const rawType =
    typeof obj.splitType === "string" ? obj.splitType.trim().toLowerCase() : "";
  if (!ALLOWED_SPLIT_TYPES.has(rawType)) return null;
  if (rawType === "equal") return null;

  const rawMembers = Array.isArray(obj.memberSplits) ? obj.memberSplits : null;
  if (!rawMembers || rawMembers.length === 0) return null;

  const memberSplits: MemberSplit[] = [];
  for (const entry of rawMembers) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const userId = typeof item.userId === "string" ? item.userId.trim() : "";
    if (!userId) continue;
    const split: MemberSplit = { userId };
    if (typeof item.amount === "number" && Number.isFinite(item.amount)) {
      split.amount = item.amount;
    }
    if (
      typeof item.percentage === "number" &&
      Number.isFinite(item.percentage)
    ) {
      split.percentage = item.percentage;
    }
    if (typeof item.shares === "number" && Number.isFinite(item.shares)) {
      split.shares = item.shares;
    }
    memberSplits.push(split);
  }

  if (memberSplits.length === 0) return null;
  return {
    splitType: rawType as CustomSplits["splitType"],
    memberSplits,
  };
}

export function hasExplicitCustomSplits(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  const rawType =
    typeof obj.splitType === "string" ? obj.splitType.trim().toLowerCase() : "";
  if (!ALLOWED_SPLIT_TYPES.has(rawType) || rawType === "equal") return false;
  const rawMembers = Array.isArray(obj.memberSplits) ? obj.memberSplits : null;
  return !!rawMembers && rawMembers.length > 0;
}

/**
 * Fetch the household's auto-split settings. Returns sane defaults when the
 * row is missing or the columns are null (auto-split enabled, no template).
 */
export async function fetchHouseholdAutoSplitSettings(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  householdId: string,
): Promise<HouseholdAutoSplitSettings> {
  const { data, error } = await supabase
    .from("households")
    .select("ai_use_default_split, ai_default_split_config")
    .eq("id", householdId)
    .maybeSingle();

  if (error) {
    console.warn(
      "[household-auto-split] Failed to fetch household settings:",
      error,
    );
    return { autoSplitEnabled: false, defaultConfig: null };
  }

  const autoSplitEnabled =
    typeof data?.ai_use_default_split === "boolean"
      ? data.ai_use_default_split
      : true;
  const defaultConfig = coerceCustomSplits(data?.ai_default_split_config);
  console.log("[household-auto-split] Resolved settings:", {
    householdId,
    autoSplitEnabled,
    hasDefaultConfig: defaultConfig != null,
  });
  return { autoSplitEnabled, defaultConfig };
}

/**
 * Given the request's explicit customSplits (if any) and the household auto-
 * split settings, resolve the effective split behaviour.
 *
 * - If caller provided non-equal customSplits → honour them verbatim.
 * - If autoSplitEnabled is false → skip automatic/default splitting.
 * - If autoSplitEnabled is true and a stored default template exists → use it.
 * - Otherwise → fall back to equal split (null customSplits payload).
 */
export function resolveEffectiveSplit(
  explicit: unknown,
  settings: HouseholdAutoSplitSettings,
): EffectiveSplit {
  if (hasExplicitCustomSplits(explicit)) {
    const coerced = coerceCustomSplits(explicit);
    if (!coerced) {
      return settings.autoSplitEnabled
        ? { kind: "customSplits", customSplits: settings.defaultConfig }
        : { kind: "skip" };
    }
    if (isSemanticallyEqualSplit(coerced)) {
      console.log(
        "[household-auto-split] Ignoring equal-like explicit custom splits; using household default when available",
      );
      return settings.autoSplitEnabled
        ? { kind: "customSplits", customSplits: settings.defaultConfig }
        : { kind: "skip" };
    }
    return { kind: "customSplits", customSplits: coerced };
  }

  if (!settings.autoSplitEnabled) {
    return { kind: "skip" };
  }

  return { kind: "customSplits", customSplits: settings.defaultConfig };
}

function normalizeAmount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, value);
}

function normalizePercentage(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, value));
}

function normalizeShares(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const shares = Math.trunc(value);
  return shares > 0 ? shares : undefined;
}

function allocateCentsByWeights(
  totalCents: number,
  weights: number[],
): number[] {
  if (weights.length === 0) return [];
  const normalized = weights.map((weight) => Math.max(0, weight));
  const totalWeight = normalized.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return new Array(weights.length).fill(0);

  const raw = normalized.map((weight) => (totalCents * weight) / totalWeight);
  const floorValues = raw.map((value) => Math.floor(value));
  let remainder =
    totalCents - floorValues.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; remainder > 0 && order.length > 0; i++, remainder--) {
    floorValues[order[i % order.length].index] += 1;
  }

  return floorValues;
}

function memberIdsFromRows(members: HouseholdMemberRow[]): string[] {
  return members
    .map((member) =>
      typeof member.user_id === "string" ? member.user_id.trim() : "",
    )
    .filter((userId) => userId.length > 0);
}

function sameMembers(
  members: HouseholdMemberRow[],
  customSplits: CustomSplits,
): boolean {
  const expected = memberIdsFromRows(members).sort();
  const actual = customSplits.memberSplits
    .map((split) => split.userId)
    .filter((userId) => typeof userId === "string" && userId.length > 0)
    .sort();
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function normalizePercentWeights(weights: number[]): number[] {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return weights;

  const percentages = weights.map(
    (value) => (Math.max(0, value) * 100) / total,
  );
  const rounded = percentages.map((value) => Math.round(value * 100) / 100);
  const diff = 100 - rounded.reduce((sum, value) => sum + value, 0);
  if (Math.abs(diff) >= 0.01 && rounded.length > 0) {
    rounded[rounded.length - 1] =
      Math.round((rounded[rounded.length - 1] + diff) * 100) / 100;
  }

  return rounded;
}

function reconcileCustomSplitsForMembers(
  customSplits: CustomSplits | null,
  members: HouseholdMemberRow[],
  amountCents: number,
): CustomSplits | null {
  if (!customSplits) return null;
  if (isSemanticallyEqualSplit(customSplits)) return null;

  const memberIds = memberIdsFromRows(members);
  if (memberIds.length === 0) return null;

  const byUserId = new Map(
    customSplits.memberSplits.map((split) => [split.userId, split]),
  );

  if (customSplits.splitType === "amount") {
    const weights = memberIds.map(
      (userId) => normalizeAmount(byUserId.get(userId)?.amount) ?? 0,
    );
    if (weights.reduce((sum, value) => sum + value, 0) <= 0) return null;
    const cents = allocateCentsByWeights(amountCents, weights);

    return {
      splitType: "amount",
      memberSplits: memberIds.map((userId, index) => ({
        userId,
        amount: (cents[index] ?? 0) / 100,
      })),
    };
  }

  if (customSplits.splitType === "percentage") {
    const weights = memberIds.map(
      (userId) => normalizePercentage(byUserId.get(userId)?.percentage) ?? 0,
    );
    if (weights.reduce((sum, value) => sum + value, 0) <= 0) return null;
    const percentages = normalizePercentWeights(weights);

    return {
      splitType: "percentage",
      memberSplits: memberIds.map((userId, index) => ({
        userId,
        percentage: percentages[index] ?? 0,
      })),
    };
  }

  const memberSplits = memberIds.map((userId) => ({
    userId,
    shares: normalizeShares(byUserId.get(userId)?.shares),
  }));
  const totalShares = memberSplits.reduce(
    (sum, split) => sum + (split.shares ?? 0),
    0,
  );
  if (totalShares <= 0) return null;

  return {
    splitType: "shares",
    memberSplits,
  };
}

export function buildHouseholdSplitRecords({
  householdId,
  transactionId,
  payerUserId,
  amountCents,
  currency,
  description,
  members,
  customSplits,
  now = new Date().toISOString(),
  splitGroupId = crypto.randomUUID(),
}: {
  householdId: string;
  transactionId: string;
  payerUserId: string;
  amountCents: number;
  currency: string;
  description: string | null;
  members: HouseholdMemberRow[];
  customSplits: CustomSplits | null;
  now?: string;
  splitGroupId?: string;
}): BuildSplitRecordsResult {
  const memberIds = memberIdsFromRows(members);
  if (!householdId || !transactionId || !currency || amountCents <= 0) {
    return {
      ok: false,
      code: "INVALID_TRANSACTION",
      error: "A valid household transaction is required for splitting",
    };
  }
  if (memberIds.length === 0) {
    return {
      ok: false,
      code: "NO_MEMBERS",
      error: "Household must have members before a split can be created",
    };
  }

  const reconciledCustomSplits = reconcileCustomSplitsForMembers(
    customSplits,
    members,
    amountCents,
  );
  const splitType = reconciledCustomSplits
    ? reconciledCustomSplits.splitType
    : "equal";
  if (reconciledCustomSplits && !sameMembers(members, reconciledCustomSplits)) {
    return {
      ok: false,
      code: "MEMBER_MISMATCH",
      error: "Custom splits must include all household members",
    };
  }

  let lines: Array<{
    user_id: string;
    amount_cents: number;
    percentage?: number;
    shares?: number;
  }>;

  if (splitType === "equal" || !reconciledCustomSplits) {
    const amountPerMember = Math.floor(amountCents / memberIds.length);
    const remainder = amountCents - amountPerMember * memberIds.length;
    lines = memberIds.map((userId, index) => ({
      user_id: userId,
      amount_cents: amountPerMember + (index === 0 ? remainder : 0),
    }));
  } else if (splitType === "amount") {
    const cents = reconciledCustomSplits.memberSplits.map((split) =>
      Math.max(0, Math.round((normalizeAmount(split.amount) || 0) * 100)),
    );
    const sumCents = cents.reduce((sum, value) => sum + value, 0);
    const diff = amountCents - sumCents;
    if (Math.abs(diff) > 1) {
      return {
        ok: false,
        code: "AMOUNT_TOTAL",
        error: "Custom amount splits must equal the transaction total",
      };
    }
    if (diff !== 0 && cents.length > 0) {
      let targetIndex = cents.length - 1;
      if (diff < 0) {
        for (let i = cents.length - 1; i >= 0; i--) {
          if (cents[i] >= Math.abs(diff)) {
            targetIndex = i;
            break;
          }
        }
      }
      cents[targetIndex] += diff;
    }
    lines = reconciledCustomSplits.memberSplits.map((split, index) => ({
      user_id: split.userId,
      amount_cents: cents[index] ?? 0,
    }));
  } else if (splitType === "percentage") {
    const weights = reconciledCustomSplits.memberSplits.map(
      (split) => normalizePercentage(split.percentage) || 0,
    );
    const totalPercent = weights.reduce((sum, value) => sum + value, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      return {
        ok: false,
        code: "PERCENTAGE_TOTAL",
        error: "Custom percentage splits must total 100%",
      };
    }
    const allocatedCents = allocateCentsByWeights(amountCents, weights);
    lines = reconciledCustomSplits.memberSplits.map((split, index) => ({
      user_id: split.userId,
      amount_cents: allocatedCents[index] ?? 0,
      percentage: normalizePercentage(split.percentage),
    }));
  } else {
    const weights = reconciledCustomSplits.memberSplits.map(
      (split) => normalizeShares(split.shares) || 0,
    );
    const totalShares = weights.reduce((sum, value) => sum + value, 0);
    if (totalShares <= 0) {
      return {
        ok: false,
        code: "SHARES_TOTAL",
        error: "At least one member must have a share greater than 0",
      };
    }
    const allocatedCents = allocateCentsByWeights(amountCents, weights);
    lines = reconciledCustomSplits.memberSplits.map((split, index) => ({
      user_id: split.userId,
      amount_cents: allocatedCents[index] ?? 0,
      shares: normalizeShares(split.shares),
    }));
  }

  return {
    ok: true,
    group: {
      id: splitGroupId,
      household_id: householdId,
      expense_id: transactionId,
      payer_user_id: memberIds.includes(payerUserId)
        ? payerUserId
        : memberIds[0],
      split_type: splitType,
      currency,
      total_amount_cents: amountCents,
      description,
      created_at: now,
    },
    lines: lines.map((line) => ({
      split_group_id: splitGroupId,
      user_id: line.user_id,
      amount_cents: line.amount_cents,
      percentage: line.percentage ?? null,
      shares: line.shares ?? null,
      is_settled: false,
      settled_at: null,
      created_at: now,
    })),
  };
}

export async function createHouseholdAutoSplitForTransaction({
  supabase,
  householdId,
  transaction,
  actorUserId,
  members,
  settings,
  explicitCustomSplits,
  payerUserId,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  householdId: string | null;
  transaction: Record<string, unknown>;
  actorUserId: string;
  members: HouseholdMemberRow[];
  settings: HouseholdAutoSplitSettings;
  explicitCustomSplits?: unknown;
  payerUserId?: string | null;
}): Promise<CreateAutoSplitResult> {
  const transactionId =
    typeof transaction.id === "string" ? transaction.id : "";
  const amountCents =
    typeof transaction.amount_cents === "number"
      ? transaction.amount_cents
      : Number(transaction.amount_cents ?? 0);
  const currency =
    typeof transaction.currency === "string" ? transaction.currency : "";

  if (!householdId || !transactionId || amountCents <= 0 || !currency) {
    return { kind: "not_applicable", transaction };
  }
  if (transaction.split_group_id != null) {
    return { kind: "not_applicable", transaction };
  }
  if (members.length === 0) {
    return { kind: "not_applicable", transaction };
  }

  const effective = resolveEffectiveSplit(explicitCustomSplits, settings);
  if (effective.kind === "skip") {
    console.log("[household-auto-split] Split skipped by household settings", {
      householdId,
      transactionId,
      hasExplicitCustomSplits: hasExplicitCustomSplits(explicitCustomSplits),
    });
    return { kind: "skipped", transaction };
  }

  const buildResult = buildHouseholdSplitRecords({
    householdId,
    transactionId,
    payerUserId: payerUserId || actorUserId,
    amountCents,
    currency,
    description:
      typeof transaction.raw_text === "string" ? transaction.raw_text : null,
    members,
    customSplits: effective.customSplits,
  });

  if (!buildResult.ok) {
    return {
      kind: "invalid",
      code: buildResult.code,
      error: buildResult.error,
    };
  }

  const { error: splitGroupError } = await supabase
    .from("expense_split_groups")
    .insert([buildResult.group]);
  if (splitGroupError) {
    return { kind: "failed", error: splitGroupError };
  }

  const { error: splitLinesError } = await supabase
    .from("expense_split_lines")
    .insert(buildResult.lines);
  if (splitLinesError) {
    const { error: cleanupError } = await supabase
      .from("expense_split_groups")
      .delete()
      .eq("id", buildResult.group.id);
    return {
      kind: "failed",
      error: cleanupError
        ? { cause: splitLinesError, cleanupError }
        : splitLinesError,
    };
  }

  const { error: updateError } = await supabase
    .from("expenses")
    .update({
      split_group_id: buildResult.group.id,
      household_id: householdId,
    })
    .eq("id", transactionId)
    .is("deleted_at", null);
  if (updateError) {
    const { error: cleanupError } = await supabase
      .from("expense_split_groups")
      .delete()
      .eq("id", buildResult.group.id);
    return {
      kind: "failed",
      error: cleanupError ? { cause: updateError, cleanupError } : updateError,
    };
  }

  return {
    kind: "created",
    splitGroupId: buildResult.group.id,
    transaction: {
      ...transaction,
      split_group_id: buildResult.group.id,
      household_id: householdId,
    },
  };
}
