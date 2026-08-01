import { normalizeCategory } from "./category-colors.ts";
import {
  type LinkedWalletRecord,
  persistPreparedPlaidRecurringTemplates,
  type PlaidRecurringTemplateCandidate,
  type SupabaseClient,
} from "./bank-sync.ts";
import {
  getPlaidRecurringTransactions,
  type PlaidRecurringStream,
} from "./plaid-client.ts";

interface RecurringAccount {
  id: string;
  providerAccountId: string;
  currency: string;
  type?: string | null;
  subtype?: string | null;
}

interface LedgerRecurringRow {
  bank_account_id: string;
  provider_transaction_id?: string | null;
  account_id?: string | null;
  amount_cents: number;
  currency: string;
  date: string;
  type?: string | null;
  category?: string | null;
  raw_text?: string | null;
  merchant?: string | null;
  analytics_class?: string | null;
  classification_review_state?: string | null;
}

interface DetectedPattern {
  frequency:
    | "daily"
    | "weekly"
    | "biweekly"
    | "semi_monthly"
    | "monthly"
    | "yearly";
  interval?: number;
  cadenceDays: number;
}

interface RecurringRefreshResult {
  source: "plaid" | "pattern" | "hybrid";
  count: number;
  providerCount: number;
  patternCount: number;
  providerAvailable: boolean;
  providerStreamCount: number;
}

export async function refreshPlaidRecurringTemplates(params: {
  supabase: SupabaseClient;
  accessToken: string;
  userId: string;
  householdId: string | null;
  accounts: RecurringAccount[];
  linkedWalletsByBankAccountId: Map<string, LinkedWalletRecord>;
  onStage?: (stage: string) => void | Promise<void>;
}): Promise<RecurringRefreshResult> {
  if (params.accounts.length === 0) {
    return {
      source: "pattern",
      count: 0,
      providerCount: 0,
      patternCount: 0,
      providerAvailable: false,
      providerStreamCount: 0,
    };
  }

  const accountByProviderId = new Map(
    params.accounts.map((account) => [account.providerAccountId, account]),
  );
  const bankAccountIds = params.accounts.map((account) => account.id);
  const providerAccounts = params.accounts.filter(
    isPlaidRecurringSupportedAccount,
  );
  let providerCandidates: PlaidRecurringTemplateCandidate[] = [];
  let providerResponseReceived = false;
  let providerStreamCount = 0;

  await params.onStage?.("load_provider_streams");
  try {
    if (providerAccounts.length === 0) {
      providerResponseReceived = true;
    } else {
      const recurring = await getPlaidRecurringTransactions(
        params.accessToken,
        providerAccounts.map((account) => account.providerAccountId),
      );
      providerResponseReceived = true;
      const providerStreams = [
        ...(recurring.inflow_streams || []).map((stream) => ({
          stream,
          type: "income" as const,
        })),
        ...(recurring.outflow_streams || []).map((stream) => ({
          stream,
          type: "expense" as const,
        })),
      ];
      providerStreamCount = providerStreams.length;
      providerCandidates = deduplicatePlaidRecurringCandidates(
        providerStreams
          .map(({ stream, type }) =>
            providerStreamCandidate({
              stream,
              type,
              userId: params.userId,
              householdId: params.householdId,
              accountByProviderId,
              linkedWalletsByBankAccountId: params.linkedWalletsByBankAccountId,
              updatedDatetime: recurring.updated_datetime ?? null,
            }),
          )
          .filter(
            (candidate): candidate is PlaidRecurringTemplateCandidate =>
              candidate != null,
          ),
      );
    }
  } catch (error) {
    console.warn("[plaid-recurring] Provider streams unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (!providerResponseReceived) {
    await params.onStage?.("count_existing_provider_templates");
    const existingProviderCount = await activeProviderTemplateCount({
      supabase: params.supabase,
      userId: params.userId,
      householdId: params.householdId,
      bankAccountIds,
    });
    if (existingProviderCount > 0) {
      return {
        source: "plaid",
        count: existingProviderCount,
        providerCount: existingProviderCount,
        patternCount: 0,
        providerAvailable: false,
        providerStreamCount: 0,
      };
    }
  }

  await params.onStage?.("detect_ledger_candidates");
  const detectedFallbackCandidates =
    await detectLedgerRecurringCandidates(params);
  providerCandidates = providerCandidates.map((providerCandidate) => {
    const ledgerCandidate = detectedFallbackCandidates.find((candidate) =>
      sameRecurringSeries(candidate, providerCandidate),
    );
    if (!ledgerCandidate) return providerCandidate;
    const projectionEnabled =
      ledgerCandidate.recurrenceRule.projection_enabled === true;
    return {
      ...providerCandidate,
      type: ledgerCandidate.type,
      recurrenceRule: {
        ...providerCandidate.recurrenceRule,
        projection_enabled: projectionEnabled,
      },
      providerFields: {
        ...providerCandidate.providerFields,
        analytics_class: ledgerCandidate.providerFields.analytics_class ?? null,
        projection_enabled: projectionEnabled,
      },
    };
  });
  const fallbackCandidates = detectedFallbackCandidates.filter(
    (candidate) =>
      !providerCandidates.some((providerCandidate) =>
        sameRecurringSeries(candidate, providerCandidate),
      ),
  );
  const candidates = [...providerCandidates, ...fallbackCandidates];
  await params.onStage?.("persist_templates");
  await persistPreparedPlaidRecurringTemplates({
    supabase: params.supabase,
    candidates,
  });

  if (providerResponseReceived) {
    await params.onStage?.("retire_provider_templates");
    await retireMissingGeneratedTemplates({
      supabase: params.supabase,
      userId: params.userId,
      householdId: params.householdId,
      bankAccountIds,
      activeKeys: new Set(
        providerCandidates.map((candidate) => candidate.idempotencyKey),
      ),
      source: "plaid",
    });
  }
  await params.onStage?.("retire_pattern_templates");
  await retireMissingGeneratedTemplates({
    supabase: params.supabase,
    userId: params.userId,
    householdId: params.householdId,
    bankAccountIds,
    activeKeys: new Set(
      fallbackCandidates.map((candidate) => candidate.idempotencyKey),
    ),
    source: "pattern",
  });
  let source: RecurringRefreshResult["source"] = "pattern";
  if (providerCandidates.length > 0) {
    source = fallbackCandidates.length > 0 ? "hybrid" : "plaid";
  }
  return {
    source,
    count: candidates.length,
    providerCount: providerCandidates.length,
    patternCount: fallbackCandidates.length,
    providerAvailable: providerResponseReceived,
    providerStreamCount,
  };
}

async function retireMissingGeneratedTemplates(params: {
  supabase: SupabaseClient;
  userId: string;
  householdId: string | null;
  bankAccountIds: string[];
  activeKeys: Set<string>;
  source: "plaid" | "pattern";
}): Promise<void> {
  let query = params.supabase
    .from("expenses")
    .select(
      "id, idempotency_key, provider_fields, user_overrides, deleted_at, deleted_reason, account_id, amount_cents, currency, category, date, raw_text, merchant, source, type, is_recurring, recurrence_rule, household_id",
    )
    .eq("user_id", params.userId)
    .eq("is_recurring", true)
    .is("deleted_at", null)
    .like("idempotency_key", "bank-recurring:v1:%");
  query = params.householdId
    ? query.eq("household_id", params.householdId)
    : query.is("household_id", null);
  const { data, error } = await query;
  if (error) throw error;

  const accountIds = new Set(params.bankAccountIds);
  const retiredIds = (data || [])
    .filter((row) =>
      shouldRetireMissingGeneratedTemplate({
        row: row as MissingGeneratedTemplateRow,
        source: params.source,
        bankAccountIds: accountIds,
        activeKeys: params.activeKeys,
      }),
    )
    .map((row) => row.id as string);
  if (retiredIds.length === 0) return;

  const { error: retireError } = await params.supabase
    .from("expenses")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason:
        params.source === "plaid"
          ? "provider_recurring_retired"
          : "provider_inference_retired",
      updated_at: new Date().toISOString(),
    })
    .in("id", retiredIds);
  if (retireError) throw retireError;
}

interface MissingGeneratedTemplateRow extends Record<string, unknown> {
  idempotency_key?: string | null;
  provider_fields?: Record<string, unknown> | null;
  user_overrides?: Record<string, unknown> | null;
  deleted_at?: string | null;
  deleted_reason?: string | null;
}

const GENERATED_TEMPLATE_VISIBLE_FIELDS = [
  "account_id",
  "amount_cents",
  "currency",
  "category",
  "date",
  "raw_text",
  "merchant",
  "source",
  "type",
  "is_recurring",
  "recurrence_rule",
  "household_id",
] as const;

export function shouldRetireMissingGeneratedTemplate(params: {
  row: MissingGeneratedTemplateRow;
  source: "plaid" | "pattern";
  bankAccountIds: Set<string>;
  activeKeys: Set<string>;
}): boolean {
  if (params.row.deleted_at || params.row.deleted_reason === "user_deleted") {
    return false;
  }
  const providerFields = params.row.provider_fields || null;
  const idempotencyKey = String(params.row.idempotency_key || "");
  if (
    generatedRecurringSource({ idempotencyKey, providerFields }) !==
      params.source ||
    !params.bankAccountIds.has(String(providerFields?.bank_account_id || "")) ||
    params.activeKeys.has(idempotencyKey)
  ) {
    return false;
  }
  const userOverrides = params.row.user_overrides || {};
  if (Object.keys(userOverrides).length > 0) return false;
  return !hasUserEditedGeneratedTemplate(params.row);
}

function hasUserEditedGeneratedTemplate(row: MissingGeneratedTemplateRow) {
  const templateFields = row.provider_fields?.template_fields;
  if (!templateFields || typeof templateFields !== "object") return true;
  const previous = templateFields as Record<string, unknown>;
  return GENERATED_TEMPLATE_VISIBLE_FIELDS.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(previous, field) &&
      !sameJsonValue(row[field], previous[field]),
  );
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

async function activeProviderTemplateCount(params: {
  supabase: SupabaseClient;
  userId: string;
  householdId: string | null;
  bankAccountIds: string[];
}): Promise<number> {
  let query = params.supabase
    .from("expenses")
    .select("idempotency_key, provider_fields")
    .eq("user_id", params.userId)
    .eq("is_recurring", true)
    .is("deleted_at", null)
    .like("idempotency_key", "bank-recurring:v1:plaid:%");
  query = params.householdId
    ? query.eq("household_id", params.householdId)
    : query.is("household_id", null);
  const { data, error } = await query;
  if (error) throw error;
  const accountIds = new Set(params.bankAccountIds);
  return (data || []).filter((row) => {
    const fields = row.provider_fields as Record<string, unknown> | null;
    const source = generatedRecurringSource({
      idempotencyKey: String(row.idempotency_key || ""),
      providerFields: fields,
    });
    return (
      source === "plaid" &&
      accountIds.has(String(fields?.bank_account_id || ""))
    );
  }).length;
}

function generatedRecurringSource(params: {
  idempotencyKey: string;
  providerFields: Record<string, unknown> | null;
}): "plaid" | "pattern" | null {
  if (params.providerFields?.source !== "plaid_recurring_template") {
    return null;
  }
  if (params.providerFields.recurring_source === "plaid") return "plaid";
  if (params.providerFields.recurring_source === "pattern") return "pattern";
  return params.idempotencyKey.startsWith("bank-recurring:v1:plaid:")
    ? "plaid"
    : null;
}

function providerStreamCandidate(params: {
  stream: PlaidRecurringStream;
  type: "expense" | "income";
  userId: string;
  householdId: string | null;
  accountByProviderId: Map<string, RecurringAccount>;
  linkedWalletsByBankAccountId: Map<string, LinkedWalletRecord>;
  updatedDatetime: string | null;
}): PlaidRecurringTemplateCandidate | null {
  const stream = params.stream;
  const account = params.accountByProviderId.get(stream.account_id);
  const frequency = mapPlaidRecurringFrequency(stream.frequency);
  const primary = stream.personal_finance_category?.primary
    ?.trim()
    .toUpperCase();
  if (
    !account ||
    !stream.stream_id?.trim() ||
    stream.status?.toUpperCase() !== "MATURE" ||
    stream.is_active === false ||
    !frequency
  ) {
    return null;
  }

  const amount = stream.last_amount?.amount ?? stream.average_amount?.amount;
  if (!Number.isFinite(amount) || Number(amount) === 0) return null;
  const amountCents = Math.round(Math.abs(Number(amount)) * 100);
  const currency = (
    stream.last_amount?.iso_currency_code ||
    stream.average_amount?.iso_currency_code ||
    account.currency
  )
    .trim()
    .toUpperCase();
  const anchorDate = nextProjectionAnchor({
    predictedDate: stream.predicted_next_date,
    lastDate: stream.last_date,
    frequency,
  });
  if (!anchorDate) return null;
  const linkedWallet = params.linkedWalletsByBankAccountId.get(account.id);
  const label = stream.merchant_name || stream.description || null;
  const categoryName =
    stream.personal_finance_category?.detailed || primary || null;
  const type =
    params.type === "income" && account.type === "credit"
      ? "expense"
      : params.type;
  const projectionEnabled =
    frequency.frequency !== "semi_monthly" &&
    isProjectionSafePfc(
      type,
      primary,
      stream.personal_finance_category?.confidence_level,
    );

  return {
    idempotencyKey: `bank-recurring:v1:plaid:${account.id}:${stream.stream_id}`,
    userId: params.userId,
    householdId: linkedWallet?.household_id ?? params.householdId,
    accountId: linkedWallet?.id ?? null,
    bankAccountId: account.id,
    amountCents,
    currency,
    date: anchorDate.slice(0, 10),
    type,
    category: categoryName ? normalizeCategory(categoryName) : null,
    rawText: label,
    merchant: stream.merchant_name ?? null,
    recurrenceRule: {
      frequency: frequency.frequency,
      anchor_date: anchorDate.slice(0, 10),
      projection_enabled: projectionEnabled,
      ...(frequency.interval != null ? { interval: frequency.interval } : {}),
      ...(stream.predicted_next_date != null
        ? { predicted_next_date: stream.predicted_next_date }
        : {}),
      provider_hint: {
        source: "plaid_recurring",
        plaid_stream_id: stream.stream_id,
        plaid_frequency: stream.frequency,
        plaid_status: stream.status,
        transaction_ids: stream.transaction_ids || [],
        first_date: stream.first_date ?? null,
        last_date: stream.last_date ?? null,
        updated_datetime: params.updatedDatetime,
      },
    },
    providerFields: {
      source: "plaid_recurring_template",
      provider: "plaid",
      bank_account_id: account.id,
      account_id: linkedWallet?.id ?? null,
      template_identity: stream.stream_id,
      recurring_source: "plaid",
      transaction_ids: stream.transaction_ids || [],
      projection_enabled: projectionEnabled,
    },
  };
}

async function detectLedgerRecurringCandidates(params: {
  supabase: SupabaseClient;
  userId: string;
  householdId: string | null;
  accounts: RecurringAccount[];
  linkedWalletsByBankAccountId: Map<string, LinkedWalletRecord>;
}): Promise<PlaidRecurringTemplateCandidate[]> {
  if (params.accounts.length === 0) return [];
  let query = params.supabase
    .from("expenses")
    .select(
      "bank_account_id, provider_transaction_id, account_id, amount_cents, currency, date, type, category, raw_text, merchant, analytics_class, classification_review_state",
    )
    .eq("user_id", params.userId)
    .eq("provider", "plaid")
    .is("deleted_at", null)
    .eq("provider_pending", false)
    .eq("analytics_is_final", true)
    .in(
      "bank_account_id",
      params.accounts.map((account) => account.id),
    )
    .order("date", { ascending: false })
    .limit(10000);
  query = params.householdId
    ? query.eq("household_id", params.householdId)
    : query.is("household_id", null);
  const { data, error } = await query;
  if (error) throw error;

  const groups = new Map<string, LedgerRecurringRow[]>();
  const accountById = new Map(
    params.accounts.map((account) => [account.id, account]),
  );
  for (const row of (data || []) as LedgerRecurringRow[]) {
    const merchantKey = normalizeMerchant(row.merchant || row.raw_text);
    if (!merchantKey || !row.bank_account_id || row.amount_cents <= 0) continue;
    const analyticsType = recurringTypeForLedgerRow(
      row,
      accountById.get(row.bank_account_id)?.type,
    );
    const key = [
      row.bank_account_id,
      analyticsType,
      row.currency.toUpperCase(),
      (row.category || "uncategorized").trim().toLowerCase(),
      merchantKey,
    ].join("|");
    const rows = groups.get(key) || [];
    rows.push(row);
    groups.set(key, rows);
  }

  const candidates: PlaidRecurringTemplateCandidate[] = [];
  for (const [identity, rows] of groups) {
    const amountCluster = largestAmountCluster(rows);
    const pattern = detectPattern(amountCluster);
    if (!pattern) continue;
    const latest = amountCluster[amountCluster.length - 1];
    const anchorDate = nextProjectionAnchor({
      lastDate: latest.date,
      frequency: pattern,
    });
    if (!anchorDate) continue;
    const linkedWallet = params.linkedWalletsByBankAccountId.get(
      latest.bank_account_id,
    );
    const type = recurringTypeForLedgerRow(
      latest,
      accountById.get(latest.bank_account_id)?.type,
    );
    const projectionEnabled =
      pattern.frequency !== "semi_monthly" &&
      isProjectionSafeAnalyticsClass(
        latest.analytics_class,
        latest.classification_review_state,
      );
    const intervalPart = pattern.interval ? `:${pattern.interval}` : "";
    candidates.push({
      idempotencyKey: `bank-recurring:v1:pattern:${identity}:${pattern.frequency}${intervalPart}`,
      userId: params.userId,
      householdId: params.householdId,
      accountId: linkedWallet?.id ?? latest.account_id ?? null,
      bankAccountId: latest.bank_account_id,
      amountCents: latest.amount_cents,
      currency: latest.currency.toUpperCase(),
      date: anchorDate,
      type,
      category: latest.category ?? null,
      rawText: latest.raw_text ?? latest.merchant ?? null,
      merchant: latest.merchant ?? null,
      recurrenceRule: {
        frequency: pattern.frequency,
        anchor_date: anchorDate,
        projection_enabled: projectionEnabled,
        ...(pattern.interval != null ? { interval: pattern.interval } : {}),
        provider_hint: {
          source: "pattern",
          confidence: "high",
          match_count: amountCluster.length,
          cadence_days: pattern.cadenceDays,
          template_identity: identity,
        },
      },
      providerFields: {
        source: "plaid_recurring_template",
        provider: "plaid",
        bank_account_id: latest.bank_account_id,
        account_id: linkedWallet?.id ?? latest.account_id ?? null,
        template_identity: identity,
        recurring_source: "pattern",
        analytics_class: latest.analytics_class ?? null,
        projection_enabled: projectionEnabled,
        transaction_ids: amountCluster
          .map((row) => row.provider_transaction_id)
          .filter((transactionId): transactionId is string =>
            Boolean(transactionId),
          ),
      },
    });
  }
  return candidates;
}

function recurringTypeForLedgerRow(
  row: LedgerRecurringRow,
  accountType?: string | null,
): "expense" | "income" {
  if (
    (row.analytics_class === "transfer_in" || row.type === "income") &&
    ["credit", "loan"].includes(accountType?.trim().toLowerCase() || "")
  ) {
    return "expense";
  }
  return ["income", "transfer_in", "loan_disbursement"].includes(
    row.analytics_class || "",
  ) || row.type === "income"
    ? "income"
    : "expense";
}

function isProjectionSafeAnalyticsClass(
  analyticsClass?: string | null,
  classificationReviewState?: string | null,
): boolean {
  return (
    classificationReviewState !== "needs_review" &&
    (analyticsClass === "consumer_spend" || analyticsClass === "income")
  );
}

function normalizeMerchant(value?: string | null): string | null {
  const normalized = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b\d{2,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length >= 3 ? normalized : null;
}

function largestAmountCluster(
  rows: LedgerRecurringRow[],
): LedgerRecurringRow[] {
  let best: LedgerRecurringRow[] = [];
  for (const seed of rows) {
    const tolerance = Math.max(1, Math.round(seed.amount_cents * 0.01));
    const cluster = rows.filter(
      (row) => Math.abs(row.amount_cents - seed.amount_cents) <= tolerance,
    );
    if (cluster.length > best.length) best = cluster;
  }
  return best.sort((left, right) => left.date.localeCompare(right.date));
}

function detectPattern(rows: LedgerRecurringRow[]): DetectedPattern | null {
  const dates = Array.from(
    new Set(rows.map((row) => row.date.slice(0, 10))),
  ).sort();
  if (dates.length < 2) return null;
  const gaps = dates.slice(1).map((date, index) => {
    const previous = Date.parse(`${dates[index]}T00:00:00Z`);
    const current = Date.parse(`${date}T00:00:00Z`);
    return Math.round((current - previous) / 86400000);
  });
  const patterns: Array<DetectedPattern & { min: number; max: number }> = [
    { frequency: "daily", cadenceDays: 1, min: 1, max: 2 },
    { frequency: "weekly", cadenceDays: 7, min: 6, max: 8 },
    { frequency: "biweekly", cadenceDays: 14, min: 13, max: 15 },
    { frequency: "semi_monthly", cadenceDays: 15, min: 12, max: 19 },
    { frequency: "monthly", cadenceDays: 30, min: 28, max: 35 },
    {
      frequency: "monthly",
      interval: 3,
      cadenceDays: 91,
      min: 85,
      max: 97,
    },
    { frequency: "yearly", cadenceDays: 365, min: 350, max: 380 },
  ];
  for (const pattern of patterns) {
    const matches = gaps.filter(
      (gap) => gap >= pattern.min && gap <= pattern.max,
    );
    const averageGap =
      matches.length === 0
        ? 0
        : matches.reduce((sum, gap) => sum + gap, 0) / matches.length;
    if (
      pattern.frequency === "semi_monthly" &&
      (averageGap < 14 || averageGap > 16)
    ) {
      continue;
    }
    const minimumOccurrences = pattern.frequency === "yearly" ? 2 : 3;
    if (dates.length >= minimumOccurrences && matches.length === gaps.length) {
      if (!isRecentPattern(dates[dates.length - 1], pattern)) {
        continue;
      }
      return {
        frequency: pattern.frequency,
        interval: pattern.interval,
        cadenceDays: Math.round(averageGap),
      };
    }
  }
  return null;
}

function sameRecurringSeries(
  left: PlaidRecurringTemplateCandidate,
  right: PlaidRecurringTemplateCandidate,
): boolean {
  if (
    left.bankAccountId !== right.bankAccountId ||
    left.currency !== right.currency
  ) {
    return false;
  }
  const leftTransactionIds = recurringTransactionIds(left);
  const rightTransactionIds = recurringTransactionIds(right);
  for (const transactionId of leftTransactionIds) {
    if (rightTransactionIds.has(transactionId)) return true;
  }
  if (left.type !== right.type) return false;
  const leftLabel = normalizeMerchant(left.merchant || left.rawText);
  const rightLabel = normalizeMerchant(right.merchant || right.rawText);
  if (!leftLabel || leftLabel !== rightLabel) return false;
  const tolerance = Math.max(1, Math.round(right.amountCents * 0.01));
  if (Math.abs(left.amountCents - right.amountCents) > tolerance) return false;
  return (
    recurrenceFrequencyKey(left.recurrenceRule) ===
    recurrenceFrequencyKey(right.recurrenceRule)
  );
}

export function deduplicatePlaidRecurringCandidates(
  candidates: PlaidRecurringTemplateCandidate[],
): PlaidRecurringTemplateCandidate[] {
  const groups: PlaidRecurringTemplateCandidate[][] = [];
  for (const candidate of candidates) {
    const group = groups.find((existingGroup) =>
      existingGroup.some(
        (existingCandidate) =>
          existingCandidate.idempotencyKey === candidate.idempotencyKey ||
          sameRecurringSeries(existingCandidate, candidate),
      ),
    );
    if (group) {
      group.push(candidate);
    } else {
      groups.push([candidate]);
    }
  }
  return groups
    .map((group) => mergePlaidRecurringCandidateGroup(group))
    .sort((left, right) =>
      left.idempotencyKey.localeCompare(right.idempotencyKey),
    );
}

function mergePlaidRecurringCandidateGroup(
  group: PlaidRecurringTemplateCandidate[],
): PlaidRecurringTemplateCandidate {
  const sorted = [...group].sort(
    (left, right) =>
      left.idempotencyKey.localeCompare(right.idempotencyKey) ||
      left.type.localeCompare(right.type),
  );
  const winner = sorted[0];
  const transactionIds = Array.from(
    new Set(
      sorted.flatMap((candidate) =>
        Array.from(recurringTransactionIds(candidate)),
      ),
    ),
  ).sort();
  const hasDirectionConflict = sorted.some(
    (candidate) => candidate.type !== winner.type,
  );
  return {
    ...winner,
    recurrenceRule: {
      ...winner.recurrenceRule,
      ...(hasDirectionConflict ? { projection_enabled: false } : {}),
    },
    providerFields: {
      ...winner.providerFields,
      transaction_ids: transactionIds,
      ...(hasDirectionConflict
        ? {
            projection_enabled: false,
            analytics_class: "unknown",
            provider_direction_conflict: true,
          }
        : {}),
    },
  };
}

function recurringTransactionIds(
  candidate: PlaidRecurringTemplateCandidate,
): Set<string> {
  const value = candidate.providerFields.transaction_ids;
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .map(String)
      .map((transactionId) => transactionId.trim())
      .filter(Boolean),
  );
}

function recurrenceFrequencyKey(rule: Record<string, unknown>): string {
  return `${String(rule.frequency || "").toLowerCase()}:${Number(
    rule.interval || 1,
  )}`;
}

function nextProjectionAnchor(params: {
  predictedDate?: string | null;
  lastDate?: string | null;
  frequency: { frequency: DetectedPattern["frequency"]; interval?: number };
}): string | null {
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const predicted = parseDateOnly(params.predictedDate);
  let current = predicted ?? parseDateOnly(params.lastDate);
  if (!current) return null;
  if (!predicted) current = addOccurrence(current, params.frequency);
  for (let attempt = 0; attempt < 100 && current < todayUtc; attempt += 1) {
    current = addOccurrence(current, params.frequency);
  }
  return current >= todayUtc ? formatDateOnly(current) : null;
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addOccurrence(
  date: Date,
  frequency: { frequency: DetectedPattern["frequency"]; interval?: number },
): Date {
  const result = new Date(date.getTime());
  const interval = Math.max(1, frequency.interval ?? 1);
  switch (frequency.frequency) {
    case "daily":
      result.setUTCDate(result.getUTCDate() + interval);
      break;
    case "weekly":
      result.setUTCDate(result.getUTCDate() + 7 * interval);
      break;
    case "biweekly":
      result.setUTCDate(result.getUTCDate() + 14 * interval);
      break;
    case "semi_monthly":
      result.setUTCDate(result.getUTCDate() + 15 * interval);
      break;
    case "monthly": {
      const day = result.getUTCDate();
      result.setUTCDate(1);
      result.setUTCMonth(result.getUTCMonth() + interval);
      const lastDay = new Date(
        Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
      ).getUTCDate();
      result.setUTCDate(Math.min(day, lastDay));
      break;
    }
    case "yearly": {
      const month = result.getUTCMonth();
      const day = result.getUTCDate();
      result.setUTCDate(1);
      result.setUTCFullYear(result.getUTCFullYear() + interval);
      result.setUTCMonth(month);
      const lastDay = new Date(
        Date.UTC(result.getUTCFullYear(), month + 1, 0),
      ).getUTCDate();
      result.setUTCDate(Math.min(day, lastDay));
      break;
    }
  }
  return result;
}

function isRecentPattern(lastDate: string, pattern: DetectedPattern): boolean {
  const parsed = parseDateOnly(lastDate);
  if (!parsed) return false;
  const maximumAgeDays: Record<DetectedPattern["frequency"], number> = {
    daily: 4,
    weekly: 12,
    biweekly: 22,
    semi_monthly: 22,
    monthly: 45,
    yearly: 400,
  };
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const ageDays = Math.floor((today - parsed.getTime()) / 86400000);
  const allowedAge =
    pattern.interval && pattern.interval > 1
      ? Math.ceil(pattern.cadenceDays * 1.3)
      : maximumAgeDays[pattern.frequency];
  return ageDays <= allowedAge;
}

function mapPlaidRecurringFrequency(value?: string | null): {
  frequency: DetectedPattern["frequency"];
  interval?: number;
} | null {
  switch (value?.trim().toUpperCase()) {
    case "WEEKLY":
      return { frequency: "weekly" };
    case "BIWEEKLY":
      return { frequency: "biweekly" };
    case "SEMI_MONTHLY":
      return { frequency: "semi_monthly" };
    case "MONTHLY":
      return { frequency: "monthly" };
    case "ANNUALLY":
      return { frequency: "yearly" };
    default:
      return null;
  }
}

function isPlaidRecurringSupportedAccount(account: RecurringAccount): boolean {
  const type = account.type?.trim().toLowerCase();
  const subtype = account.subtype?.trim().toLowerCase();
  if (type === "credit") return subtype === "credit card";
  return (
    type === "depository" && (subtype === "checking" || subtype === "savings")
  );
}

function isProjectionSafePfc(
  type: "expense" | "income",
  primary?: string,
  confidence?: string | null,
): boolean {
  if (["LOW", "UNKNOWN"].includes(confidence?.trim().toUpperCase() || "")) {
    return false;
  }
  if (type === "income") return primary === "INCOME";
  return (
    Boolean(primary) &&
    ![
      "INCOME",
      "TRANSFER_IN",
      "TRANSFER_OUT",
      "LOAN_PAYMENTS",
      "LOAN_DISBURSEMENTS",
      "BANK_FEES",
      "OTHER",
    ].includes(primary!)
  );
}
