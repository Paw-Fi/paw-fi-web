import { type SupabaseClient as SupabaseJsClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { resolvePlaidCountryCode } from "./plaid-country.ts";
import {
  buildBankExpenseMutationPlan,
  type ExistingExpenseProjectionRow,
} from "./bank-expense-projection.ts";
import {
  type ExpenseUpsertInput,
  mapPlaidTransactionToExpense,
  PLAID_PROVIDER,
  PlaidAccount,
  PlaidTransaction,
} from "./plaid-client.ts";
import {
  mapTinkTransactionToExpense,
  TINK_PROVIDER,
  TinkAccount,
  TinkTransaction,
} from "./tink-client.ts";

export type SupabaseClient = SupabaseJsClient;

export interface UpsertAccountsParams {
  supabase: SupabaseClient;
  userId: string;
  bankConnectionId: string;
  accounts: PlaidAccount[];
}

export interface UpsertAccountsResult {
  records: BankAccountRecord[];
}

export interface BankAccountRecord {
  id: string;
  plaid_account_id: string;
  provider_account_id: string;
  name: string;
  currency: string;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
}

export interface LinkedWalletRecord {
  id: string;
  household_id: string | null;
  name: string;
  icon: string;
  color: string;
  opening_balance_cents: number;
  goal_amount_cents: number | null;
  is_default: boolean;
  linked_bank_account_id: string | null;
}

export interface PersistTransactionsParams {
  supabase: SupabaseClient;
  userId: string;
  bankAccountId: string;
  householdId?: string | null;
  accountId?: string | null;
  accountCurrency: string;
  transactions: PlaidTransaction[];
  cursorGeneration?: number;
}
export interface PersistTinkTransactionsParams {
  supabase: SupabaseClient;
  userId: string;
  bankAccountId: string;
  householdId?: string | null;
  accountId?: string | null;
  accountCurrency: string;
  transactions: TinkTransaction[];
}

export interface PersistTransactionsResult {
  inserted: number;
  updated: number;
  skipped: number;
  currencyMismatches: number;
  insertedRecords: ExpensePreview[];
}

export interface ExpensePreview {
  id: string;
  provider_transaction_id: string;
  amount_cents: number;
  currency: string;
  date: string;
  type: "expense" | "income";
  category: string | null;
  raw_text: string | null;
  merchant?: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  bank_account_id: string;
  account_id?: string | null;
  user_id?: string | null;
  household_id?: string | null;
  contact_id?: string | null;
}

interface RecurrenceCandidateRow {
  provider_transaction_id: string;
  bank_account_id: string;
  amount_cents: number;
  currency: string | null;
  date: string;
  type: "expense" | "income";
  merchant: string | null;
  raw_text: string | null;
  is_recurring?: boolean | null;
  recurrence_rule?: Record<string, unknown> | null;
}

interface RecurrencePattern {
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  interval?: number;
  confidence: "medium" | "high";
  matchCount: number;
  cadenceDays: number;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeOptionalUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export async function upsertBankConnection(params: {
  supabase: SupabaseClient;
  userId: string;
  provider: string;
  providerItemId: string;
  duplicateGroupKey?: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  expiresAt?: string | null;
  countryCode?: string | null;
  idempotencyKey?: string | null;
  householdId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ connectionId: string; isNewConnection: boolean }> {
  const normalizedCountryCode =
    resolvePlaidCountryCode({
      requestedCountryCode: params.countryCode,
    }) ?? null;

  const selectExisting = async () => {
    const { data, error } = await params.supabase
      .from("bank_connections")
      .select("id, metadata, country_code, household_id")
      .eq("user_id", params.userId)
      .eq("provider", params.provider)
      .eq("provider_item_id", params.providerItemId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as {
      id: string;
      country_code?: string | null;
      household_id?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;
  };

  const existing = await selectExisting();
  if (existing?.id) {
    const existingHouseholdId = existing.household_id ?? null;
    const requestedHouseholdId = params.householdId ?? null;
    if (existingHouseholdId !== requestedHouseholdId) {
      throw new Error("Bank connection already belongs to a different space");
    }

    const mergedMetadata = {
      ...(existing.metadata || {}),
      ...(params.metadata || {}),
    };

    const { error } = await params.supabase
      .from("bank_connections")
      .update({
        access_token_encrypted: params.accessTokenEncrypted,
        plaid_access_token_encrypted: params.accessTokenEncrypted,
        refresh_token_encrypted:
          params.refreshTokenEncrypted === undefined
            ? undefined
            : params.refreshTokenEncrypted,
        expires_at:
          params.expiresAt === undefined ? undefined : params.expiresAt,
        country_code:
          resolvePlaidCountryCode({
            requestedCountryCode: normalizedCountryCode,
            connectionCountryCode: existing.country_code,
          }) ?? null,
        duplicate_group_key: params.duplicateGroupKey || undefined,
        idempotency_key: params.idempotencyKey || undefined,
        status: "active",
        metadata: mergedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }

    return {
      connectionId: existing.id,
      isNewConnection: false,
    };
  }

  const payload = {
    user_id: params.userId,
    provider: params.provider,
    provider_item_id: params.providerItemId,
    plaid_item_id: params.providerItemId,
    access_token_encrypted: params.accessTokenEncrypted,
    plaid_access_token_encrypted: params.accessTokenEncrypted,
    refresh_token_encrypted: params.refreshTokenEncrypted || null,
    expires_at: params.expiresAt || null,
    status: "active",
    country_code: normalizedCountryCode,
    duplicate_group_key: params.duplicateGroupKey || null,
    idempotency_key: params.idempotencyKey || null,
    household_id: params.householdId || null,
    metadata: params.metadata || {},
  };

  const { data, error } = await params.supabase
    .from("bank_connections")
    .insert(payload)
    .select("id")
    .single();

  if (!error && data?.id) {
    return {
      connectionId: data.id as string,
      isNewConnection: true,
    };
  }

  const retry = await selectExisting();
  if (!retry?.id) {
    throw error;
  }

  const retryHouseholdId = retry.household_id ?? null;
  const requestedHouseholdId = params.householdId ?? null;
  if (retryHouseholdId !== requestedHouseholdId) {
    throw new Error("Bank connection already belongs to a different space");
  }

  const mergedMetadata = {
    ...(retry.metadata || {}),
    ...(params.metadata || {}),
  };

  const { error: retryError } = await params.supabase
    .from("bank_connections")
    .update({
      access_token_encrypted: params.accessTokenEncrypted,
      plaid_access_token_encrypted: params.accessTokenEncrypted,
      refresh_token_encrypted:
        params.refreshTokenEncrypted === undefined
          ? undefined
          : params.refreshTokenEncrypted,
      expires_at: params.expiresAt === undefined ? undefined : params.expiresAt,
      country_code:
        resolvePlaidCountryCode({
          requestedCountryCode: normalizedCountryCode,
          connectionCountryCode: retry.country_code,
        }) ?? null,
      duplicate_group_key: params.duplicateGroupKey || undefined,
      idempotency_key: params.idempotencyKey || undefined,
      status: "active",
      metadata: mergedMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", retry.id);

  if (retryError) {
    throw retryError;
  }

  return {
    connectionId: retry.id,
    isNewConnection: false,
  };
}

export async function loadLinkedWalletsForBankAccounts(params: {
  supabase: SupabaseClient;
  userId: string;
  targetHouseholdId?: string | null;
  bankAccountIds: string[];
}): Promise<Map<string, LinkedWalletRecord>> {
  const bankAccountIds = Array.from(
    new Set(params.bankAccountIds.filter((value) => value.trim().length > 0)),
  );
  if (!bankAccountIds.length) {
    return new Map<string, LinkedWalletRecord>();
  }

  let query = params.supabase
    .from("accounts")
    .select(
      "id, household_id, name, icon, color, opening_balance_cents, goal_amount_cents, is_default, linked_bank_account_id",
    )
    .eq("is_archived", false)
    .in("linked_bank_account_id", bankAccountIds);

  if (params.targetHouseholdId) {
    query = query.eq("household_id", params.targetHouseholdId);
  } else {
    query = query.eq("user_id", params.userId).is("household_id", null);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const linkedWallets = new Map<string, LinkedWalletRecord>();
  for (const row of (data || []) as LinkedWalletRecord[]) {
    if (!row.linked_bank_account_id) continue;
    linkedWallets.set(row.linked_bank_account_id, row);
  }

  return linkedWallets;
}

interface ExpenseUpsertRecord extends ExpenseUpsertInput {
  id?: string;
}

interface ProviderRow {
  id: string;
  provider_transaction_id: string | null;
}

function normalizeCurrency(
  record: ExpenseUpsertRecord,
  accountCurrency: string | null,
): { record: ExpenseUpsertRecord; mismatch: boolean } {
  if (!accountCurrency || record.currency === accountCurrency) {
    return { record, mismatch: false };
  }

  return {
    record: {
      ...record,
      base_currency: accountCurrency,
      fx_rate: record.fx_rate ?? 1,
      normalized_amount_cents: record.amount_cents,
    },
    mismatch: true,
  };
}

function inferPlaidRecurringRules(params: {
  records: ExpenseUpsertRecord[];
  transactions: PlaidTransaction[];
  existingRows: ExistingExpenseProjectionRow[];
}): Map<string, Record<string, unknown>> {
  const rows = new Map<string, RecurrenceCandidateRow>();
  const currentTransactionById = new Map<string, PlaidTransaction>();

  for (const transaction of params.transactions) {
    currentTransactionById.set(transaction.transaction_id, transaction);
  }

  for (const row of params.existingRows) {
    const candidate = normalizeExistingRecurrenceCandidate(row);
    if (candidate) {
      rows.set(candidate.provider_transaction_id, candidate);
    }
  }

  for (const record of params.records) {
    rows.set(record.provider_transaction_id, {
      provider_transaction_id: record.provider_transaction_id,
      bank_account_id: record.bank_account_id,
      amount_cents: record.amount_cents,
      currency: record.currency,
      date: record.date,
      type: record.type,
      merchant: record.merchant,
      raw_text: record.raw_text,
      is_recurring: record.is_recurring,
      recurrence_rule: record.recurrence_rule,
    });
  }

  const groups = new Map<string, RecurrenceCandidateRow[]>();
  for (const row of rows.values()) {
    const merchantKey = normalizeRecurringMerchant(
      row.merchant || row.raw_text,
    );
    if (!merchantKey) continue;
    const key = [
      row.bank_account_id,
      row.type,
      (row.currency || "").toUpperCase(),
      merchantKey,
    ].join("|");
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  const rules = new Map<string, Record<string, unknown>>();
  for (const group of groups.values()) {
    const currentRows = group.filter((row) =>
      currentTransactionById.has(row.provider_transaction_id),
    );
    if (!currentRows.length) continue;

    const amountCluster = largestAmountCluster(group);
    const pattern = detectRecurrencePattern(amountCluster);
    if (!pattern) continue;

    const sorted = amountCluster
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    const anchorDate = sorted[0]?.date;
    if (!anchorDate) continue;

    for (const row of currentRows) {
      if (!amountCluster.includes(row)) continue;
      const transaction = currentTransactionById.get(
        row.provider_transaction_id,
      );
      const providerHint = buildPlaidRecurringProviderHint(transaction);
      rules.set(row.provider_transaction_id, {
        frequency: pattern.frequency,
        anchor_date: anchorDate,
        ...(pattern.interval && pattern.interval > 1
          ? { interval: pattern.interval }
          : {}),
        provider_hint: {
          source: providerHint ? "plaid_or_pattern" : "pattern",
          confidence: pattern.confidence,
          match_count: pattern.matchCount,
          cadence_days: pattern.cadenceDays,
          ...(providerHint || {}),
        },
      });
    }
  }

  for (const transaction of params.transactions) {
    const providerRule = buildPlaidRecurringRuleFromProviderHint(transaction);
    if (providerRule) {
      rules.set(transaction.transaction_id, providerRule);
    }
  }

  return rules;
}

function normalizeExistingRecurrenceCandidate(
  row: ExistingExpenseProjectionRow,
): RecurrenceCandidateRow | null {
  const record = row as ExistingExpenseProjectionRow &
    Partial<RecurrenceCandidateRow>;
  if (!record.provider_transaction_id || !record.date || !record.amount_cents) {
    return null;
  }
  const type = record.type === "income" ? "income" : "expense";
  return {
    provider_transaction_id: record.provider_transaction_id,
    bank_account_id: record.bank_account_id || "",
    amount_cents: Number(record.amount_cents || 0),
    currency: record.currency || null,
    date: String(record.date).slice(0, 10),
    type,
    merchant: record.merchant || null,
    raw_text: record.raw_text || null,
    is_recurring: record.is_recurring,
    recurrence_rule: record.recurrence_rule,
  };
}

function largestAmountCluster(
  rows: RecurrenceCandidateRow[],
): RecurrenceCandidateRow[] {
  const sorted = rows
    .filter((row) => row.date && row.amount_cents > 0)
    .sort((a, b) => a.amount_cents - b.amount_cents);
  let best: RecurrenceCandidateRow[] = [];

  for (const seed of sorted) {
    const cluster = sorted.filter((row) =>
      amountsCloseEnough(row.amount_cents, seed.amount_cents),
    );
    if (cluster.length > best.length) {
      best = cluster;
    }
  }

  return best;
}

function amountsCloseEnough(a: number, b: number): boolean {
  const delta = Math.abs(a - b);
  const larger = Math.max(Math.abs(a), Math.abs(b), 1);
  return delta <= 500 || delta / larger <= 0.15;
}

function detectRecurrencePattern(
  rows: RecurrenceCandidateRow[],
): RecurrencePattern | null {
  const dates = Array.from(
    new Set(rows.map((row) => row.date.slice(0, 10))),
  ).sort();
  if (dates.length < 2) return null;

  const dayGaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    const previous = Date.parse(`${dates[i - 1]}T00:00:00Z`);
    const current = Date.parse(`${dates[i]}T00:00:00Z`);
    if (Number.isFinite(previous) && Number.isFinite(current)) {
      dayGaps.push(Math.round((current - previous) / 86400000));
    }
  }
  if (!dayGaps.length) return null;

  const candidates: Array<{
    frequency: RecurrencePattern["frequency"];
    interval?: number;
    min: number;
    max: number;
    needsIntervals: number;
  }> = [
    { frequency: "daily", min: 1, max: 1, needsIntervals: 2 },
    { frequency: "weekly", min: 6, max: 8, needsIntervals: 2 },
    { frequency: "biweekly", min: 13, max: 16, needsIntervals: 2 },
    { frequency: "monthly", min: 27, max: 34, needsIntervals: 2 },
    { frequency: "monthly", interval: 3, min: 84, max: 98, needsIntervals: 1 },
    {
      frequency: "monthly",
      interval: 6,
      min: 175,
      max: 190,
      needsIntervals: 1,
    },
    { frequency: "yearly", min: 350, max: 380, needsIntervals: 1 },
  ];

  for (const candidate of candidates) {
    const matches = dayGaps.filter(
      (gap) => gap >= candidate.min && gap <= candidate.max,
    );
    if (matches.length >= candidate.needsIntervals) {
      const averageGap = Math.round(
        matches.reduce((sum, gap) => sum + gap, 0) / matches.length,
      );
      return {
        frequency: candidate.frequency,
        interval: candidate.interval,
        confidence: matches.length >= 2 ? "high" : "medium",
        matchCount: matches.length,
        cadenceDays: averageGap,
      };
    }
  }

  return null;
}

function normalizeRecurringMerchant(value?: string | null): string | null {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b\d{2,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length < 3) {
    return null;
  }
  return normalized;
}

function buildPlaidRecurringProviderHint(
  transaction?: PlaidTransaction,
): Record<string, unknown> | null {
  if (!transaction) return null;
  const raw = transaction as PlaidTransaction & Record<string, unknown>;
  const streamId =
    raw.recurring_stream_id || raw.stream_id || raw.recurring_transaction_id;
  if (!streamId) return null;
  return {
    plaid_stream_id: streamId,
    category: transaction.personal_finance_category || null,
  };
}

function buildPlaidRecurringRuleFromProviderHint(
  transaction: PlaidTransaction,
): Record<string, unknown> | null {
  const raw = transaction as PlaidTransaction & Record<string, unknown>;
  const streamId =
    raw.recurring_stream_id || raw.stream_id || raw.recurring_transaction_id;
  if (!streamId) return null;
  const frequency = mapPlaidFrequencyToRecurrence(raw.frequency);
  if (!frequency) return null;
  return {
    frequency: frequency.frequency,
    anchor_date: transaction.date || transaction.authorized_date,
    ...(frequency.interval && frequency.interval > 1
      ? { interval: frequency.interval }
      : {}),
    provider_hint: {
      source: "plaid",
      plaid_stream_id: streamId,
      plaid_frequency: raw.frequency || null,
      category: transaction.personal_finance_category || null,
    },
  };
}

function mapPlaidFrequencyToRecurrence(value: unknown): {
  frequency: RecurrencePattern["frequency"];
  interval?: number;
} | null {
  switch (
    String(value || "")
      .trim()
      .toUpperCase()
  ) {
    case "DAILY":
      return { frequency: "daily" };
    case "WEEKLY":
      return { frequency: "weekly" };
    case "BIWEEKLY":
      return { frequency: "biweekly" };
    case "MONTHLY":
      return { frequency: "monthly" };
    case "QUARTERLY":
      return { frequency: "monthly", interval: 3 };
    case "SEMI_ANNUALLY":
    case "SEMIANNUALLY":
      return { frequency: "monthly", interval: 6 };
    case "ANNUALLY":
    case "YEARLY":
      return { frequency: "yearly" };
    default:
      return null;
  }
}

export interface UpsertTinkAccountsParams {
  supabase: SupabaseClient;
  userId: string;
  bankConnectionId: string;
  accounts: TinkAccount[];
}

export async function upsertPlaidAccounts(
  params: UpsertAccountsParams,
): Promise<UpsertAccountsResult> {
  if (!params.accounts.length) {
    return { records: [] };
  }

  const payload = params.accounts.map((account) => ({
    user_id: params.userId,
    bank_connection_id: params.bankConnectionId,
    provider: PLAID_PROVIDER,
    plaid_account_id: account.account_id,
    provider_account_id: account.account_id,
    name:
      account.name || account.official_name || `Account ${account.account_id}`,
    official_name: account.official_name || null,
    mask: account.mask || null,
    currency:
      account.balances?.iso_currency_code ||
      account.balances?.unofficial_currency_code ||
      "USD",
    type: account.type || null,
    subtype: account.subtype || null,
    status: "active",
    raw_provider_payload: account,
  }));

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(payload, {
      onConflict: "bank_connection_id,provider,provider_account_id",
    })
    .select(
      "id, plaid_account_id, provider_account_id, name, currency, mask, type, subtype",
    );

  if (error) {
    throw error;
  }

  return { records: data || [] };
}

export interface StageTransactionsParams {
  supabase: SupabaseClient;
  bankConnectionId: string;
  bankAccountId: string;
  transactions: PlaidTransaction[];
}

export async function stagePlaidTransactions(
  params: StageTransactionsParams,
): Promise<void> {
  const payload = params.transactions
    .filter((transaction) => transaction.transaction_id)
    .map((transaction) => ({
      bank_connection_id: params.bankConnectionId,
      bank_account_id: params.bankAccountId,
      provider: PLAID_PROVIDER,
      provider_transaction_id: transaction.transaction_id,
      payload: transaction,
    }));

  if (!payload.length) return;

  const { error } = await params.supabase
    .from("bank_transaction_raw")
    .upsert(payload, {
      onConflict: "bank_account_id,provider,provider_transaction_id",
    });

  if (error) {
    throw error;
  }
}

export interface StageTinkTransactionsParams {
  supabase: SupabaseClient;
  bankConnectionId: string;
  bankAccountId: string;
  transactions: TinkTransaction[];
}

export async function stageTinkTransactions(
  params: StageTinkTransactionsParams,
): Promise<void> {
  const payload = params.transactions
    .filter((transaction) => transaction.id)
    .map((transaction) => ({
      bank_connection_id: params.bankConnectionId,
      bank_account_id: params.bankAccountId,
      provider: TINK_PROVIDER,
      provider_transaction_id: transaction.id,
      payload: transaction,
    }));

  if (!payload.length) return;

  const { error } = await params.supabase
    .from("bank_transaction_raw")
    .upsert(payload, {
      onConflict: "bank_account_id,provider,provider_transaction_id",
    });

  if (error) {
    throw error;
  }
}

export async function persistPlaidTransactions(
  params: PersistTransactionsParams,
): Promise<PersistTransactionsResult> {
  if (!params.transactions.length) {
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      currencyMismatches: 0,
      insertedRecords: [],
    };
  }

  const mapped: ExpenseUpsertRecord[] = params.transactions
    .filter((transaction) => transaction.transaction_id)
    .map((transaction) => ({
      ...mapPlaidTransactionToExpense({
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        defaultCurrency: params.accountCurrency,
        transaction,
      }),
      household_id: params.householdId ?? null,
      account_id: params.accountId ?? null,
    }));

  const normalized = mapped.map((record) =>
    normalizeCurrency(record, params.accountCurrency),
  );
  const currencyMismatches = normalized.filter(
    (entry) => entry.mismatch,
  ).length;
  const normalizedRecords = normalized.map((entry) => entry.record);

  if (!mapped.length) {
    return {
      inserted: 0,
      updated: 0,
      skipped: params.transactions.length,
      currencyMismatches: 0,
      insertedRecords: [],
    };
  }

  // Build lookup keys for both posted IDs and pending IDs to merge transitions
  const postedIds = normalizedRecords.map(
    (record) => record.provider_transaction_id,
  );
  const pendingIds = params.transactions
    .map((t) => t.pending_transaction_id)
    .filter((id): id is string => Boolean(id));

  const lookupIds = Array.from(new Set([...postedIds, ...pendingIds]));

  const { data: existingRows, error: selectError } = await params.supabase
    .from("expenses")
    .select(
      "id, provider_transaction_id, deleted_at, deleted_reason, provider_deleted_at, sync_version, user_overrides, amount_cents, currency, date, type, merchant, raw_text, bank_account_id, is_recurring, recurrence_rule",
    )
    .eq("user_id", params.userId)
    .eq("provider", PLAID_PROVIDER)
    .eq("bank_account_id", params.bankAccountId)
    .in("provider_transaction_id", lookupIds);

  if (selectError) {
    throw selectError;
  }

  const providerPendingTransactionIds = new Map<string, string>();
  for (const transaction of params.transactions) {
    if (transaction.pending_transaction_id) {
      providerPendingTransactionIds.set(
        transaction.transaction_id,
        transaction.pending_transaction_id,
      );
    }
  }

  const recurringByProviderTransactionId = inferPlaidRecurringRules({
    records: normalizedRecords,
    transactions: params.transactions,
    existingRows: (existingRows || []) as ExistingExpenseProjectionRow[],
  });
  const recurrenceAwareRecords = normalizedRecords.map((record) => {
    const recurrence = recurringByProviderTransactionId.get(
      record.provider_transaction_id,
    );
    if (!recurrence) {
      return record;
    }
    return {
      ...record,
      is_recurring: true,
      recurrence_rule: recurrence,
    };
  });

  const mutationPlan = buildBankExpenseMutationPlan({
    records: recurrenceAwareRecords,
    transactions: params.transactions,
    existingRows: (existingRows || []) as ExistingExpenseProjectionRow[],
    providerPendingTransactionIds,
    cursorGeneration: params.cursorGeneration ?? 0,
  });

  let insertedRecords: ExpensePreview[] = [];

  if (mutationPlan.inserts.length) {
    const { data: insertedRows, error: insertError } = await params.supabase
      .from("expenses")
      .insert(mutationPlan.inserts)
      .select(
        "id, provider_transaction_id, amount_cents, currency, date, type, category, raw_text, merchant, is_recurring, recurrence_rule, created_at, updated_at, bank_account_id, account_id, user_id, household_id, contact_id",
      );
    if (insertError) {
      throw insertError;
    }
    insertedRecords = (insertedRows || []) as ExpensePreview[];
  }

  if (mutationPlan.updates.length) {
    // Use onConflict to avoid races when sync runs twice
    const { error: updateError } = await params.supabase
      .from("expenses")
      .upsert(mutationPlan.updates, { onConflict: "id" });
    if (updateError) {
      throw updateError;
    }
  }

  return {
    inserted: mutationPlan.inserts.length,
    updated: mutationPlan.updates.length,
    skipped: params.transactions.length - normalizedRecords.length,
    currencyMismatches,
    insertedRecords,
  };
}

export async function upsertTinkAccounts(
  params: UpsertTinkAccountsParams,
): Promise<UpsertAccountsResult> {
  if (!params.accounts.length) {
    return { records: [] };
  }

  const payload = params.accounts.map((account) => ({
    user_id: params.userId,
    bank_connection_id: params.bankConnectionId,
    provider: TINK_PROVIDER,
    plaid_account_id: account.id?.startsWith("tink_")
      ? account.id
      : `tink_${account.id}`,
    provider_account_id: account.id?.startsWith("tink_")
      ? account.id
      : `tink_${account.id}`,
    name: account.name || `Account ${account.id}`,
    official_name: null,
    mask: account.accountNumber?.iban || null,
    currency:
      account.balances?.booked?.currencyCode ||
      account.balances?.available?.currencyCode ||
      "USD",
    type: account.type?.name || null,
    subtype: null,
    status: "active",
    raw_provider_payload: account,
  }));

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(payload, {
      onConflict: "bank_connection_id,provider,provider_account_id",
    })
    .select(
      "id, plaid_account_id, provider_account_id, name, currency, mask, type, subtype",
    );

  if (error) {
    throw error;
  }

  return { records: data || [] };
}

export async function persistTinkTransactions(
  params: PersistTinkTransactionsParams,
): Promise<PersistTransactionsResult> {
  if (!params.transactions.length) {
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      currencyMismatches: 0,
      insertedRecords: [],
    };
  }

  const mapped: ExpenseUpsertRecord[] = params.transactions
    .filter((transaction) => transaction.id)
    .map(
      (transaction) =>
        mapTinkTransactionToExpense({
          userId: params.userId,
          bankAccountId: params.bankAccountId,
          householdId: params.householdId,
          defaultCurrency: params.accountCurrency,
          transaction,
        }) as ExpenseUpsertRecord,
    )
    .map((record) => ({
      ...record,
      account_id: params.accountId ?? null,
      household_id: params.householdId ?? null,
    }));

  const normalized = mapped.map((record) =>
    normalizeCurrency(record, params.accountCurrency),
  );
  const currencyMismatches = normalized.filter(
    (entry) => entry.mismatch,
  ).length;
  const normalizedRecords = normalized.map((entry) => entry.record);

  if (!mapped.length) {
    return {
      inserted: 0,
      updated: 0,
      skipped: params.transactions.length,
      currencyMismatches: 0,
      insertedRecords: [],
    };
  }

  const providerIds = normalizedRecords.map(
    (record) => record.provider_transaction_id,
  );

  const { data: existingRows, error: selectError } = await params.supabase
    .from("expenses")
    .select("id, provider_transaction_id")
    .eq("user_id", params.userId)
    .eq("provider", TINK_PROVIDER)
    .eq("bank_account_id", params.bankAccountId)
    .in("provider_transaction_id", providerIds);

  if (selectError) {
    throw selectError;
  }

  const existingByProviderId = new Map<string, string>();
  (existingRows || []).forEach((row: ProviderRow) => {
    if (row.provider_transaction_id) {
      existingByProviderId.set(row.provider_transaction_id, row.id);
    }
  });

  const updates: typeof normalizedRecords = [];
  const inserts: typeof normalizedRecords = [];

  for (const record of normalizedRecords) {
    if (existingByProviderId.has(record.provider_transaction_id)) {
      updates.push({
        ...record,
        id: existingByProviderId.get(record.provider_transaction_id)!,
      });
      continue;
    }
    inserts.push(record);
  }

  let insertedRecords: ExpensePreview[] = [];

  if (inserts.length) {
    const { data: insertedRows, error: insertError } = await params.supabase
      .from("expenses")
      .insert(inserts)
      .select(
        "id, provider_transaction_id, amount_cents, currency, date, type, category, raw_text, merchant, is_recurring, recurrence_rule, created_at, updated_at, bank_account_id, account_id, user_id, household_id, contact_id",
      );
    if (insertError) {
      throw insertError;
    }
    insertedRecords = (insertedRows || []) as ExpensePreview[];
  }

  if (updates.length) {
    const { error: updateError } = await params.supabase
      .from("expenses")
      .upsert(updates, { onConflict: "id" });
    if (updateError) {
      throw updateError;
    }
  }

  return {
    inserted: inserts.length,
    updated: updates.length,
    skipped: params.transactions.length - normalizedRecords.length,
    currencyMismatches,
    insertedRecords,
  };
}
