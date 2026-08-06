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

// Raised when the authoritative household split setting cannot be read or
// interpreted. Callers must abort the write rather than silently creating an
// unsplit household transaction.
export class HouseholdAutoSplitSettingsError extends Error {
  constructor(
    readonly householdId: string,
    reason: "read_failed" | "invalid_default_config",
  ) {
    super(
      reason === "read_failed"
        ? "Unable to load household split settings"
        : "Household split settings are invalid",
    );
    this.name = "HouseholdAutoSplitSettingsError";
  }
}

export interface HouseholdMemberRow {
  user_id: string;
}

export type EffectiveSplit =
  | { kind: "skip" }
  | {
    kind: "customSplits";
    customSplits: CustomSplits | null;
    source: "explicit" | "default";
  };

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

export interface StoredSplitLineRecord {
  user_id: string;
  amount_cents: number | null;
  percentage?: number | null;
  shares?: number | null;
  is_settled?: boolean;
  created_at?: string | null;
}

export interface ExistingSplitWriteIntent {
  reSplitRequested: boolean;
  source: "explicit_flag" | "legacy_split_update" | "preserve";
}

export type ParsedReSplitRequest =
  | { ok: true; value: boolean | undefined }
  | { ok: false; error: string };

export type ExistingSplitPayerIntent =
  | {
    ok: true;
    effectivePayerUserId: string;
    payerChanged: boolean;
    requiresCurrentMembership: boolean;
  }
  | {
    ok: false;
    code: "PAYER_NOT_CURRENT" | "RESPLIT_REQUIRED";
    error: string;
  };

export type ExistingSplitMutationReason =
  | "explicit_resplit"
  | "amount_changed"
  | "currency_changed"
  | "payer_changed";

export interface ExistingSplitMutationDecision {
  requiresSplitCommit: boolean;
  reasons: ExistingSplitMutationReason[];
}

export interface ExpectedSplitParent {
  household_id: string | null;
  currency: string;
  amount_cents: number;
  split_group_id: string | null;
  account_id: string | null;
}

const ATOMIC_SPLIT_PATCH_RPC =
  "households_commit_expense_split_write_with_patch_v3";
const ATOMIC_SPLIT_RPC = "households_commit_expense_split_write_v3";
const ATOMIC_REMOVE_SPLIT_PATCH_RPC =
  "households_remove_expense_split_with_patch_v3";
const ALLOWED_ATOMIC_EXPENSE_PATCH_KEYS = new Set([
  "category",
  "raw_text",
  "merchant",
  "date",
  "created_at",
  "receipt_image_url",
  "is_recurring",
  "recurrence_rule",
  "source",
  "user_overrides",
  "updated_at",
]);

interface SupabaseResult {
  data: unknown;
  error: unknown;
}

export function expectedSplitParentFromTransaction(
  transaction: Record<string, unknown>,
): ExpectedSplitParent {
  const amountCents = Number(transaction.amount_cents);
  const currency = typeof transaction.currency === "string"
    ? transaction.currency.trim().toUpperCase()
    : "";
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || !currency) {
    throw new Error("Invalid expense parent snapshot for split commit");
  }
  return {
    household_id: typeof transaction.household_id === "string"
      ? transaction.household_id
      : null,
    currency,
    amount_cents: amountCents,
    split_group_id: typeof transaction.split_group_id === "string"
      ? transaction.split_group_id
      : null,
    account_id: typeof transaction.account_id === "string"
      ? transaction.account_id
      : null,
  };
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

/// Creates a required household parent and its split in one database
/// transaction. Callers must validate/build the split before invoking this;
/// unlike the legacy insert-then-commit path, an RPC error cannot leave the
/// parent visible without a split group.
export async function createHouseholdTransactionWithSplit({
  supabase,
  actorUserId,
  transaction,
  group,
  lines,
  targetAccountId = null,
  isRecurringTemplate = false,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  actorUserId: string;
  transaction: Record<string, unknown>;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  targetAccountId?: string | null;
  isRecurringTemplate?: boolean;
}) {
  return await supabase.rpc("households_create_transaction_with_split_v1", {
    p_actor_user_id: actorUserId,
    p_expense: transaction,
    p_split_group_id: group.id,
    p_household_id: group.household_id,
    p_payer_user_id: group.payer_user_id,
    p_split_type: group.split_type,
    p_currency: group.currency,
    p_total_amount_cents: group.total_amount_cents,
    p_description: group.description,
    p_lines: lines,
    p_target_account_id: targetAccountId,
    p_is_recurring_template: isRecurringTemplate,
  });
}

const ALLOWED_SPLIT_TYPES = new Set([
  "equal",
  "amount",
  "percentage",
  "shares",
]);

export function parseExplicitReSplitRequested(
  body: Record<string, unknown>,
): ParsedReSplitRequest {
  const keys = [
    "reSplitRequested",
    "resplitRequested",
    "resplit_requested",
  ] as const;
  const values = keys
    .filter((key) => Object.prototype.hasOwnProperty.call(body, key))
    .map((key) => body[key]);
  if (values.length === 0) return { ok: true, value: undefined };
  if (values.some((value) => typeof value !== "boolean")) {
    return { ok: false, error: "reSplitRequested must be a boolean" };
  }
  if (values.some((value) => value !== values[0])) {
    return {
      ok: false,
      error: "Conflicting reSplitRequested values were provided",
    };
  }
  return { ok: true, value: values[0] as boolean };
}

/**
 * Resolve whether an existing split is being explicitly re-split.
 *
 * New clients send an explicit flag so an amount-only edit can carry the
 * legacy `splitUpdate` payload without changing the historical participant
 * set. Older released clients did not have that flag, so a valid
 * `splitUpdate` remains an explicit re-split for backwards compatibility.
 * Unrelated expense fields are intentionally not inputs to this decision.
 */
export function resolveExistingSplitWriteIntent({
  explicitReSplitRequested,
  splitUpdate,
}: {
  explicitReSplitRequested: boolean | undefined;
  splitUpdate: unknown;
}): ExistingSplitWriteIntent {
  if (explicitReSplitRequested === true) {
    return { reSplitRequested: true, source: "explicit_flag" };
  }
  if (explicitReSplitRequested === false) {
    return { reSplitRequested: false, source: "preserve" };
  }

  if (hasSplitUpdatePayload(splitUpdate)) {
    return { reSplitRequested: true, source: "legacy_split_update" };
  }
  return { reSplitRequested: false, source: "preserve" };
}

export function shouldApplyExistingReSplit({
  intent,
  hasAmountUpdate,
}: {
  intent: ExistingSplitWriteIntent;
  hasAmountUpdate: boolean;
}): boolean {
  // Released clients sent `splitUpdate` solely to keep line totals in sync
  // after changing an amount. Without the new explicit flag that payload is
  // ambiguous, so preserve the stored historical structure. A deliberate
  // split-only edit from those clients remains supported, while new clients
  // can explicitly opt in even when amount and split change together.
  if (intent.source === "legacy_split_update" && hasAmountUpdate) return false;
  return intent.reSplitRequested;
}

export function validateExistingSplitPayerIntent({
  storedPayerUserId,
  requestedPayerUserId,
  reSplitRequested,
  participantIds,
  currentMemberIds,
}: {
  storedPayerUserId: string;
  requestedPayerUserId: string | null;
  reSplitRequested: boolean;
  participantIds: string[];
  currentMemberIds: string[];
}): ExistingSplitPayerIntent {
  const effectivePayerUserId = requestedPayerUserId ?? storedPayerUserId;
  const payerChanged = effectivePayerUserId !== storedPayerUserId;
  const requiresCurrentMembership = reSplitRequested || payerChanged;
  if (!requiresCurrentMembership) {
    return {
      ok: true,
      effectivePayerUserId,
      payerChanged,
      requiresCurrentMembership,
    };
  }

  const normalizedCurrentMembers = [...new Set(currentMemberIds)].sort();
  if (!normalizedCurrentMembers.includes(effectivePayerUserId)) {
    return {
      ok: false,
      code: "PAYER_NOT_CURRENT",
      error: "Payer must be a current household member",
    };
  }
  if (payerChanged && !reSplitRequested) {
    const normalizedParticipants = [...new Set(participantIds)].sort();
    if (
      JSON.stringify(normalizedParticipants) !==
        JSON.stringify(normalizedCurrentMembers)
    ) {
      return {
        ok: false,
        code: "RESPLIT_REQUIRED",
        error:
          "Changing the payer requires re-splitting among all current household members",
      };
    }
  }

  return {
    ok: true,
    effectivePayerUserId,
    payerChanged,
    requiresCurrentMembership,
  };
}

/**
 * Decide whether an edit changes settlement structure. Presence alone is not
 * enough: released clients routinely resend the current account and payer.
 * Settlement-neutral fields such as description, category, date, and account
 * are deliberately outside this decision.
 */
export function resolveExistingSplitMutationDecision({
  updates,
  storedAmountCents,
  storedCurrency,
  storedPayerUserId,
  requestedPayerUserId,
  reSplitRequested,
  legacyImplicitPayerPayload,
  storedPayerIsCurrentMember,
}: {
  updates: Record<string, unknown>;
  storedAmountCents: number;
  storedCurrency: string;
  storedPayerUserId: string | null;
  requestedPayerUserId: string | null;
  reSplitRequested: boolean;
  legacyImplicitPayerPayload: boolean;
  storedPayerIsCurrentMember: boolean;
}): ExistingSplitMutationDecision {
  const reasons: ExistingSplitMutationReason[] = [];
  if (reSplitRequested) reasons.push("explicit_resplit");
  if (
    typeof updates.amount_cents === "number" &&
    updates.amount_cents !== storedAmountCents
  ) {
    reasons.push("amount_changed");
  }

  const normalizedStoredCurrency = storedCurrency.trim().toUpperCase();
  if (
    typeof updates.currency === "string" &&
    updates.currency.trim().toUpperCase() !== normalizedStoredCurrency
  ) {
    reasons.push("currency_changed");
  }
  const payerDiffers = requestedPayerUserId != null &&
    requestedPayerUserId !== storedPayerUserId;
  const isLegacyDepartedPayerSubstitution = payerDiffers &&
    legacyImplicitPayerPayload && !storedPayerIsCurrentMember &&
    !reSplitRequested;
  if (payerDiffers && !isLegacyDepartedPayerSubstitution) {
    reasons.push("payer_changed");
  }

  return {
    requiresSplitCommit: reasons.length > 0,
    reasons,
  };
}

function hasSplitUpdatePayload(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  const rawType = typeof obj.splitType === "string"
    ? obj.splitType.trim().toLowerCase()
    : "";
  return ALLOWED_SPLIT_TYPES.has(rawType) &&
    Array.isArray(obj.memberSplits) && obj.memberSplits.length > 0;
}

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
  const rawType = typeof obj.splitType === "string"
    ? obj.splitType.trim().toLowerCase()
    : "";
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

function isEqualSplitPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const rawType = typeof (raw as Record<string, unknown>).splitType === "string"
    ? (raw as Record<string, unknown>).splitType as string
    : "";
  return rawType.trim().toLowerCase() === "equal";
}

export function hasExplicitCustomSplits(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  const rawType = typeof obj.splitType === "string"
    ? obj.splitType.trim().toLowerCase()
    : "";
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
    console.error(
      "[household-auto-split] Failed to fetch household settings:",
      error,
    );
    throw new HouseholdAutoSplitSettingsError(householdId, "read_failed");
  }

  const autoSplitEnabled = typeof data?.ai_use_default_split === "boolean"
    ? data.ai_use_default_split
    : true;
  const rawDefaultConfig = data?.ai_default_split_config;
  const defaultConfig = coerceCustomSplits(rawDefaultConfig);
  if (
    rawDefaultConfig != null &&
    defaultConfig == null &&
    !isEqualSplitPayload(rawDefaultConfig)
  ) {
    console.error("[household-auto-split] Invalid stored split settings:", {
      householdId,
    });
    throw new HouseholdAutoSplitSettingsError(
      householdId,
      "invalid_default_config",
    );
  }
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
 * - If caller explicitly requested an equal split → honour it.
 * - If caller provided non-equal customSplits → honour them verbatim.
 * - If autoSplitEnabled is false → skip automatic/default splitting.
 * - If autoSplitEnabled is true and a stored default template exists → use it.
 * - Otherwise → fall back to equal split (null customSplits payload).
 */
export function resolveEffectiveSplit(
  explicit: unknown,
  settings: HouseholdAutoSplitSettings,
): EffectiveSplit {
  // Equal is represented as null downstream because buildHouseholdSplitRecords
  // derives equal lines from the current member list. It is still an explicit
  // user instruction and must therefore override a saved non-equal template.
  if (isEqualSplitPayload(explicit)) {
    return {
      kind: "customSplits",
      customSplits: null,
      source: "explicit",
    };
  }

  if (hasExplicitCustomSplits(explicit)) {
    const coerced = coerceCustomSplits(explicit);
    if (!coerced) {
      return settings.autoSplitEnabled
        ? {
          kind: "customSplits",
          customSplits: settings.defaultConfig,
          source: "default",
        }
        : { kind: "skip" };
    }
    if (isSemanticallyEqualSplit(coerced)) {
      console.log(
        "[household-auto-split] Ignoring equal-like explicit custom splits; using household default when available",
      );
      return settings.autoSplitEnabled
        ? {
          kind: "customSplits",
          customSplits: settings.defaultConfig,
          source: "default",
        }
        : { kind: "skip" };
    }
    return {
      kind: "customSplits",
      customSplits: coerced,
      source: "explicit",
    };
  }

  if (!settings.autoSplitEnabled) {
    return { kind: "skip" };
  }

  return {
    kind: "customSplits",
    customSplits: settings.defaultConfig,
    source: "default",
  };
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
  let remainder = totalCents -
    floorValues.reduce((sum, value) => sum + value, 0);
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
      typeof member.user_id === "string" ? member.user_id.trim() : ""
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
  reconcileMemberChanges = false,
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
  reconcileMemberChanges?: boolean;
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

  if (
    customSplits &&
    !reconcileMemberChanges &&
    !sameMembers(members, customSplits)
  ) {
    return {
      ok: false,
      code: "MEMBER_MISMATCH",
      error: "Custom splits must include all household members",
    };
  }
  const reconciledCustomSplits = reconcileMemberChanges
    ? reconcileCustomSplitsForMembers(customSplits, members, amountCents)
    : customSplits;
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
      Math.max(0, Math.round((normalizeAmount(split.amount) || 0) * 100))
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

/**
 * Rebuild an existing same-group split after an ordinary structural expense
 * edit while preserving the exact historical participant set and payer.
 * Current household membership is deliberately irrelevant here: membership
 * drift must not rewrite history. The database RPC remains the final CAS and
 * settlement-allocation authority.
 */
export function buildPreservedHistoricalSplitRecords({
  group,
  lines,
  targetAmountCents,
  targetCurrency,
  targetDescription,
  now = new Date().toISOString(),
}: {
  group: SplitGroupRecord;
  lines: StoredSplitLineRecord[];
  targetAmountCents: number;
  targetCurrency: string;
  targetDescription: string | null;
  now?: string;
}): BuildSplitRecordsResult {
  if (
    !Number.isSafeInteger(targetAmountCents) || targetAmountCents <= 0 ||
    !targetCurrency.trim()
  ) {
    return {
      ok: false,
      code: "INVALID_TRANSACTION",
      error: "A valid household transaction is required for splitting",
    };
  }
  if (lines.length === 0) {
    return {
      ok: false,
      code: "INVALID_STORED_SPLIT",
      error: "The stored split has no participant lines",
    };
  }
  if (lines.some((line) => line.is_settled === true)) {
    return {
      ok: false,
      code: "SETTLED_SPLIT",
      error: "Cannot change splits after any lines have been settled",
    };
  }

  const participantIds = lines.map((line) => line.user_id.trim());
  const uniqueParticipantIds = new Set(participantIds);
  const lineAmounts = lines.map((line) => Number(line.amount_cents));
  const storedTotal = lineAmounts.reduce((sum, amount) => sum + amount, 0);
  if (
    participantIds.some((userId) => userId.length === 0) ||
    uniqueParticipantIds.size !== participantIds.length ||
    lineAmounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0) ||
    storedTotal !== group.total_amount_cents ||
    !uniqueParticipantIds.has(group.payer_user_id)
  ) {
    return {
      ok: false,
      code: "INVALID_STORED_SPLIT",
      error: "The stored split is structurally invalid",
    };
  }

  let targetLineAmounts = lineAmounts;
  if (targetAmountCents !== group.total_amount_cents) {
    const weights = lines.map((line) => {
      if (group.split_type === "equal") return 1;
      if (group.split_type === "percentage") {
        const percentage = Number(line.percentage ?? 0);
        return percentage > 0 ? percentage : Number(line.amount_cents ?? 0);
      }
      if (group.split_type === "shares") {
        const shares = Number(line.shares ?? 0);
        return shares > 0 ? shares : Number(line.amount_cents ?? 0);
      }
      return Number(line.amount_cents ?? 0);
    });
    if (weights.reduce((sum, weight) => sum + weight, 0) <= 0) {
      return {
        ok: false,
        code: "INVALID_STORED_SPLIT",
        error: "The stored split has no positive allocation weights",
      };
    }
    targetLineAmounts = allocateCentsByWeights(targetAmountCents, weights);
  }

  return {
    ok: true,
    group: {
      ...group,
      payer_user_id: group.payer_user_id,
      currency: targetCurrency.trim().toUpperCase(),
      total_amount_cents: targetAmountCents,
      description: targetDescription,
    },
    lines: lines.map((line, index) => ({
      split_group_id: group.id,
      user_id: participantIds[index],
      amount_cents: targetLineAmounts[index] ?? 0,
      percentage: group.split_type === "percentage"
        ? Number(line.percentage ?? 0)
        : null,
      shares: group.split_type === "shares" && Number(line.shares ?? 0) > 0
        ? Math.trunc(Number(line.shares))
        : null,
      is_settled: false,
      settled_at: null,
      created_at: line.created_at ?? now,
    })),
  };
}

function splitCommitRpcParams({
  actorUserId,
  group,
  lines,
  expectedParent,
  previousSplitGroupId,
  targetAccountId,
}: {
  actorUserId: string;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  expectedParent: ExpectedSplitParent;
  previousSplitGroupId: string | null;
  targetAccountId: string | null;
}): Record<string, unknown> {
  return {
    p_actor_user_id: actorUserId,
    p_expense_id: group.expense_id,
    p_split_group_id: group.id,
    p_household_id: group.household_id,
    p_payer_user_id: group.payer_user_id,
    p_split_type: group.split_type,
    p_currency: group.currency,
    p_total_amount_cents: group.total_amount_cents,
    p_description: group.description,
    p_lines: lines,
    p_expected_parent: expectedParent,
    p_previous_split_group_id: previousSplitGroupId,
    p_target_account_id: targetAccountId,
  };
}

export function isMissingSettlementRpcError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === "42883" || code === "PGRST202";
}

function assertSafeAtomicExpensePatch(
  expensePatch: Record<string, unknown>,
): void {
  const unsafeKeys = Object.keys(expensePatch).filter(
    (key) => !ALLOWED_ATOMIC_EXPENSE_PATCH_KEYS.has(key),
  );
  if (unsafeKeys.length > 0) {
    throw new Error(
      `Unsafe expense patch keys for split commit: ${unsafeKeys.join(", ")}`,
    );
  }
}

async function applyExpensePatchAfterAtomicCommit({
  supabase,
  expenseId,
  expectedSplitGroupId,
  expensePatch,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  expenseId: string;
  expectedSplitGroupId: string | null;
  expensePatch: Record<string, unknown>;
}): Promise<SupabaseResult> {
  if (Object.keys(expensePatch).length === 0) {
    return { data: null, error: null };
  }
  let patchQuery = supabase
    .from("expenses")
    .update(expensePatch)
    .eq("id", expenseId)
    .is("deleted_at", null);
  patchQuery = expectedSplitGroupId == null
    ? patchQuery.is("split_group_id", null)
    : patchQuery.eq("split_group_id", expectedSplitGroupId);
  return await patchQuery
    .select("id")
    .single();
}

/**
 * Temporary rollout-only compatibility writer. It mirrors the released raw
 * group/line/parent sequence and is reachable only when both atomic RPCs are
 * absent. Once the migration is visible to PostgREST, callers cannot reach
 * this path. It must never be used as a fallback for a validation or CAS
 * failure from either atomic RPC.
 */
async function writeLegacyHouseholdSplitRecords({
  supabase,
  group,
  lines,
  expectedParent,
  previousSplitGroupId,
  targetAccountId,
  expensePatch,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  expectedParent: ExpectedSplitParent;
  previousSplitGroupId: string | null;
  targetAccountId: string | null;
  expensePatch: Record<string, unknown>;
}): Promise<SupabaseResult> {
  const { data: storedGroup, error: loadGroupError } = await supabase
    .from("expense_split_groups")
    .select("id")
    .eq("id", group.id)
    .maybeSingle();
  if (loadGroupError) return { data: null, error: loadGroupError };

  const groupPayload = {
    household_id: group.household_id,
    expense_id: group.expense_id,
    payer_user_id: group.payer_user_id,
    split_type: group.split_type,
    currency: group.currency,
    total_amount_cents: group.total_amount_cents,
    description: group.description,
    created_at: group.created_at,
  };
  const createdGroup = !storedGroup;
  if (createdGroup) {
    const { error: insertGroupError } = await supabase
      .from("expense_split_groups")
      .insert([{ id: group.id, ...groupPayload }]);
    if (insertGroupError) return { data: null, error: insertGroupError };
  } else {
    const { error: updateGroupError } = await supabase
      .from("expense_split_groups")
      .update(groupPayload)
      .eq("id", group.id);
    if (updateGroupError) return { data: null, error: updateGroupError };

    const { error: deleteLinesError } = await supabase
      .from("expense_split_lines")
      .delete()
      .eq("split_group_id", group.id);
    if (deleteLinesError) return { data: null, error: deleteLinesError };
  }

  const { error: insertLinesError } = await supabase
    .from("expense_split_lines")
    .insert(lines);
  if (insertLinesError) {
    if (createdGroup) {
      await supabase.from("expense_split_groups").delete().eq("id", group.id);
    }
    return { data: null, error: insertLinesError };
  }

  const parentPayload: Record<string, unknown> = {
    ...expensePatch,
    amount_cents: group.total_amount_cents,
    currency: group.currency,
    household_id: group.household_id,
    split_group_id: group.id,
  };
  const resolvedAccountId = targetAccountId ?? expectedParent.account_id;
  if (resolvedAccountId != null) parentPayload.account_id = resolvedAccountId;

  let parentUpdate = supabase
    .from("expenses")
    .update(parentPayload)
    .eq("id", group.expense_id)
    .eq("amount_cents", expectedParent.amount_cents)
    .eq("currency", expectedParent.currency)
    .is("deleted_at", null);
  parentUpdate = expectedParent.household_id == null
    ? parentUpdate.is("household_id", null)
    : parentUpdate.eq("household_id", expectedParent.household_id);
  parentUpdate = expectedParent.split_group_id == null
    ? parentUpdate.is("split_group_id", null)
    : parentUpdate.eq("split_group_id", expectedParent.split_group_id);
  parentUpdate = expectedParent.account_id == null
    ? parentUpdate.is("account_id", null)
    : parentUpdate.eq("account_id", expectedParent.account_id);
  const { data: updatedParent, error: updateParentError } = await parentUpdate
    .select("id")
    .single();
  if (updateParentError) {
    if (createdGroup) {
      await supabase.from("expense_split_groups").delete().eq("id", group.id);
    }
    return { data: null, error: updateParentError };
  }

  if (previousSplitGroupId && previousSplitGroupId !== group.id) {
    const { error: removeLinesError } = await supabase
      .from("expense_split_lines")
      .delete()
      .eq("split_group_id", previousSplitGroupId);
    if (removeLinesError) {
      return { data: updatedParent, error: removeLinesError };
    }
    const { error: removeGroupError } = await supabase
      .from("expense_split_groups")
      .delete()
      .eq("id", previousSplitGroupId);
    if (removeGroupError) {
      return { data: updatedParent, error: removeGroupError };
    }
  }

  return { data: updatedParent, error: null };
}

async function commitWithExistingRpcOrLegacyWriter({
  supabase,
  actorUserId,
  group,
  lines,
  expectedParent,
  previousSplitGroupId,
  targetAccountId,
  expensePatch,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  actorUserId: string;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  expectedParent: ExpectedSplitParent;
  previousSplitGroupId: string | null;
  targetAccountId: string | null;
  expensePatch: Record<string, unknown>;
}): Promise<SupabaseResult> {
  const atomicResult = await supabase.rpc(
    ATOMIC_SPLIT_RPC,
    splitCommitRpcParams({
      actorUserId,
      group,
      lines,
      expectedParent,
      previousSplitGroupId,
      targetAccountId,
    }),
  );
  if (atomicResult.error && !isMissingSettlementRpcError(atomicResult.error)) {
    return atomicResult;
  }
  if (!atomicResult.error) {
    const patchResult = await applyExpensePatchAfterAtomicCommit({
      supabase,
      expenseId: group.expense_id,
      expectedSplitGroupId: group.id,
      expensePatch,
    });
    return patchResult.error ? patchResult : atomicResult;
  }

  return await writeLegacyHouseholdSplitRecords({
    supabase,
    group,
    lines,
    expectedParent,
    previousSplitGroupId,
    targetAccountId,
    expensePatch,
  });
}

export async function commitHouseholdSplitRecords({
  supabase,
  actorUserId,
  group,
  lines,
  expectedParent,
  previousSplitGroupId = null,
  targetAccountId = null,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  actorUserId: string;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  expectedParent: ExpectedSplitParent;
  previousSplitGroupId?: string | null;
  targetAccountId?: string | null;
}) {
  return await commitWithExistingRpcOrLegacyWriter({
    supabase,
    actorUserId,
    group,
    lines,
    expectedParent,
    previousSplitGroupId,
    targetAccountId,
    expensePatch: {},
  });
}

export async function commitRecurringTemplateSplitRecords({
  supabase,
  actorUserId,
  group,
  lines,
  expectedParent,
  previousSplitGroupId: _previousSplitGroupId = null,
  targetAccountId = null,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  actorUserId: string;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  expectedParent: ExpectedSplitParent;
  previousSplitGroupId?: string | null;
  targetAccountId?: string | null;
}) {
  return await supabase.rpc("households_commit_recurring_template_split_v1", {
    ...splitCommitRpcParams({
      actorUserId,
      group,
      lines,
      expectedParent,
      previousSplitGroupId: null,
      targetAccountId,
    }),
  });
}

export async function commitRecurringTemplateSplitRecordsWithPatch({
  supabase,
  actorUserId,
  group,
  lines,
  expectedParent,
  previousSplitGroupId: _previousSplitGroupId = null,
  targetAccountId = null,
  expensePatch,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  actorUserId: string;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  expectedParent: ExpectedSplitParent;
  previousSplitGroupId?: string | null;
  targetAccountId?: string | null;
  expensePatch: Record<string, unknown>;
}) {
  assertSafeAtomicExpensePatch(expensePatch);
  return await supabase.rpc("households_commit_recurring_template_split_v1", {
    ...splitCommitRpcParams({
      actorUserId,
      group,
      lines,
      expectedParent,
      previousSplitGroupId: null,
      targetAccountId,
    }),
    p_expense_patch: expensePatch,
  });
}

export async function commitHouseholdSplitRecordsWithPatch({
  supabase,
  actorUserId,
  group,
  lines,
  expectedParent,
  previousSplitGroupId = null,
  targetAccountId = null,
  expensePatch,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  actorUserId: string;
  group: SplitGroupRecord;
  lines: SplitLineRecord[];
  expectedParent: ExpectedSplitParent;
  previousSplitGroupId?: string | null;
  targetAccountId?: string | null;
  expensePatch: Record<string, unknown>;
}) {
  assertSafeAtomicExpensePatch(expensePatch);
  const params = splitCommitRpcParams({
    actorUserId,
    group,
    lines,
    expectedParent,
    previousSplitGroupId,
    targetAccountId,
  });
  const result = await supabase.rpc(ATOMIC_SPLIT_PATCH_RPC, {
    ...params,
    p_expense_patch: expensePatch,
  });
  return result;
}

function removeSplitRpcParams({
  actorUserId,
  expenseId,
  splitGroupId,
  targetHouseholdId,
  targetCurrency,
  targetAmountCents,
  targetAccountId,
  expectedParent,
}: {
  actorUserId: string;
  expenseId: string;
  splitGroupId: string;
  targetHouseholdId: string | null;
  targetCurrency: string;
  targetAmountCents: number;
  targetAccountId: string | null;
  expectedParent: ExpectedSplitParent;
}): Record<string, unknown> {
  return {
    p_actor_user_id: actorUserId,
    p_expense_id: expenseId,
    p_split_group_id: splitGroupId,
    p_target_household_id: targetHouseholdId,
    p_target_currency: targetCurrency,
    p_target_amount_cents: targetAmountCents,
    p_target_account_id: targetAccountId,
    p_expected_parent: expectedParent,
  };
}

export async function removeHouseholdSplitWithPatch({
  supabase,
  actorUserId,
  expenseId,
  splitGroupId,
  targetHouseholdId,
  targetCurrency,
  targetAmountCents,
  targetAccountId,
  expectedParent,
  expensePatch,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  actorUserId: string;
  expenseId: string;
  splitGroupId: string;
  targetHouseholdId: string | null;
  targetCurrency: string;
  targetAmountCents: number;
  targetAccountId: string | null;
  expectedParent: ExpectedSplitParent;
  expensePatch: Record<string, unknown>;
}): Promise<SupabaseResult> {
  assertSafeAtomicExpensePatch(expensePatch);
  const params = removeSplitRpcParams({
    actorUserId,
    expenseId,
    splitGroupId,
    targetHouseholdId,
    targetCurrency,
    targetAmountCents,
    targetAccountId,
    expectedParent,
  });
  const wrapperResult = await supabase.rpc(ATOMIC_REMOVE_SPLIT_PATCH_RPC, {
    ...params,
    p_expense_patch: expensePatch,
  });
  return wrapperResult;
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
  isRecurringTemplate = false,
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
  isRecurringTemplate?: boolean;
}): Promise<CreateAutoSplitResult> {
  const transactionId = typeof transaction.id === "string"
    ? transaction.id
    : "";
  const amountCents = typeof transaction.amount_cents === "number"
    ? transaction.amount_cents
    : Number(transaction.amount_cents ?? 0);
  const currency = typeof transaction.currency === "string"
    ? transaction.currency
    : "";

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
    description: typeof transaction.raw_text === "string"
      ? transaction.raw_text
      : null,
    members,
    customSplits: effective.customSplits,
    reconcileMemberChanges: effective.source === "default",
  });

  if (!buildResult.ok) {
    return {
      kind: "invalid",
      code: buildResult.code,
      error: buildResult.error,
    };
  }

  const commitSplit = isRecurringTemplate
    ? commitRecurringTemplateSplitRecords
    : commitHouseholdSplitRecords;
  const { error: commitError } = await commitSplit({
    supabase,
    actorUserId,
    group: buildResult.group,
    lines: buildResult.lines,
    expectedParent: expectedSplitParentFromTransaction(transaction),
  });
  if (commitError) return { kind: "failed", error: commitError };

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
