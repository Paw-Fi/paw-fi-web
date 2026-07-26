import { type SupabaseClient as SupabaseJsClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { withTransientBankReadRetry } from "./bank-retry.ts";
import { resolvePlaidCountryCode } from "./plaid-country.ts";
import {
  buildBankExpenseMutationPlan,
  type BankExpenseMutationRecord,
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
  reactivateExistingAccounts?: boolean;
}

export interface UpsertAccountsResult {
  records: BankAccountRecord[];
  allRecords: BankAccountRecord[];
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
  status?: string | null;
  provider_balance_current_cents?: number | null;
  provider_balance_available_cents?: number | null;
  provider_balance_limit_cents?: number | null;
  provider_balance_updated_at?: string | null;
}

export interface PreparedPlaidAccounts {
  payload: Array<Record<string, unknown>>;
  records: BankAccountRecord[];
  allRecords: BankAccountRecord[];
}

interface BankAccountRecordWithStatus extends BankAccountRecord {
  status?: string | null;
}

async function loadDisabledProviderAccountIds(params: {
  supabase: SupabaseClient;
  bankConnectionId: string;
  provider: string;
}): Promise<Set<string>> {
  const { data, error } = await params.supabase
    .from("bank_accounts")
    .select("provider_account_id")
    .eq("bank_connection_id", params.bankConnectionId)
    .eq("provider", params.provider)
    .eq("status", "disabled");

  if (error) {
    throw error;
  }

  return new Set(
    ((data || []) as Array<{ provider_account_id?: string | null }>)
      .map((row) => row.provider_account_id?.trim())
      .filter((value): value is string => Boolean(value)),
  );
}

function activeBankAccountRecords(
  rows: BankAccountRecordWithStatus[],
): BankAccountRecord[] {
  return rows
    .filter((row) => (row.status ?? "active") === "active")
    .map(({ status: _status, ...record }) => record);
}

export interface LinkedWalletRecord {
  id: string;
  household_id: string | null;
  name: string;
  icon: string;
  color: string;
  logo_url: string | null;
  currency: string;
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
  accountType?: string | null;
  transactions: PlaidTransaction[];
  cursorGeneration?: number;
  hideNewTransactions?: boolean;
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

interface RecurrenceGroup {
  bankAccountId: string;
  type: "expense" | "income";
  currency: string;
  merchantKey: string;
  rows: RecurrenceCandidateRow[];
}

export interface PlaidRecurringTemplateCandidate {
  idempotencyKey: string;
  userId: string;
  householdId: string | null;
  accountId: string | null;
  bankAccountId: string;
  amountCents: number;
  currency: string;
  date: string;
  type: "expense" | "income";
  category: string | null;
  rawText: string | null;
  merchant: string | null;
  recurrenceRule: Record<string, unknown>;
  providerFields: Record<string, unknown>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECURRING_AMOUNT_RELATIVE_TOLERANCE = 0.01;

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

  const { data: bankAccountRows, error: bankAccountError } =
    await params.supabase
      .from("bank_accounts")
      .select("id, currency")
      .in("id", bankAccountIds);

  if (bankAccountError) {
    throw bankAccountError;
  }

  const bankCurrencyById = new Map<string, string>();
  for (const row of (bankAccountRows || []) as Array<{
    id?: string | null;
    currency?: string | null;
  }>) {
    const id = row.id?.trim();
    const currency = row.currency?.trim().toUpperCase();
    if (id && currency) {
      bankCurrencyById.set(id, currency);
    }
  }

  let query = params.supabase
    .from("accounts")
    .select(
      "id, household_id, name, icon, color, logo_url, currency, opening_balance_cents, goal_amount_cents, is_default, linked_bank_account_id",
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
    const bankCurrency = bankCurrencyById.get(row.linked_bank_account_id);
    if (bankCurrency !== row.currency.trim().toUpperCase()) continue;
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
  amount_cents?: number | null;
  currency?: string | null;
  household_id?: string | null;
  account_id?: string | null;
  split_group_id?: string | null;
}

interface SupabaseErrorLike {
  code?: string | null;
}

const PROVIDER_TRANSACTION_LOOKUP_BATCH_SIZE = 75;

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
      account_id: null,
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

  const groups: RecurrenceGroup[] = [];
  for (const row of rows.values()) {
    const transaction = currentTransactionById.get(row.provider_transaction_id);
    const providerHint = buildPlaidRecurringProviderHint(transaction);
    const streamId = String(providerHint?.plaid_stream_id || "").trim();
    if (!streamId) continue;
    const bankAccountId = row.bank_account_id;
    const currency = (row.currency || "").toUpperCase();
    const existingGroup = groups.find(
      (group) =>
        group.bankAccountId === bankAccountId &&
        group.type === row.type &&
        group.currency === currency &&
        group.merchantKey === streamId,
    );
    if (existingGroup) {
      existingGroup.rows.push(row);
      continue;
    }
    groups.push({
      bankAccountId,
      type: row.type,
      currency,
      merchantKey: streamId,
      rows: [row],
    });
  }

  const rules = new Map<string, Record<string, unknown>>();
  for (const group of groups) {
    const currentRows = group.rows.filter((row) =>
      currentTransactionById.has(row.provider_transaction_id),
    );
    if (!currentRows.length) continue;

    const amountCluster = largestAmountCluster(group.rows);
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
          template_identity: group.merchantKey,
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

function buildPlaidRecurringTemplateCandidates(params: {
  userId: string;
  householdId?: string | null;
  bankAccountId: string;
  accountId?: string | null;
  records: ExpenseUpsertRecord[];
  recurringByProviderTransactionId: Map<string, Record<string, unknown>>;
}): PlaidRecurringTemplateCandidate[] {
  const byTemplateKey = new Map<string, PlaidRecurringTemplateCandidate>();

  for (const record of params.records) {
    const recurrence = params.recurringByProviderTransactionId.get(
      record.provider_transaction_id,
    );
    if (!recurrence) continue;

    const frequency = String(recurrence.frequency || "")
      .trim()
      .toLowerCase();
    if (!frequency) continue;

    const intervalValue = Number(recurrence.interval || 1);
    const interval =
      Number.isFinite(intervalValue) && intervalValue > 1
        ? Math.round(intervalValue)
        : 1;
    const providerHint =
      recurrence.provider_hint && typeof recurrence.provider_hint === "object"
        ? (recurrence.provider_hint as Record<string, unknown>)
        : null;
    const streamId = providerHint?.plaid_stream_id
      ? String(providerHint.plaid_stream_id).trim()
      : "";
    const patternIdentity = providerHint?.template_identity
      ? String(providerHint.template_identity).trim()
      : "";
    const identity = streamId || patternIdentity;
    if (!identity) continue;

    const normalizedCategory = (record.category || "uncategorized")
      .trim()
      .toLowerCase();
    const normalizedCurrency = (record.currency || "USD").trim().toUpperCase();
    const keyParts = [
      PLAID_PROVIDER,
      params.bankAccountId,
      record.type,
      normalizedCurrency,
      frequency,
      String(interval),
      normalizedCategory,
      identity,
    ];
    const idempotencyKey = `bank-recurring:v1:${keyParts.join(":")}`;
    const anchorDate = String(recurrence.anchor_date || record.date).slice(
      0,
      10,
    );
    const recurrenceRule = {
      ...recurrence,
      frequency,
      anchor_date: anchorDate,
      ...(interval > 1 ? { interval } : {}),
    };
    const existing = byTemplateKey.get(idempotencyKey);
    const shouldReplace = !existing || record.date > existing.date;
    const date =
      existing && existing.date < anchorDate ? existing.date : anchorDate;
    const candidate: PlaidRecurringTemplateCandidate = {
      idempotencyKey,
      userId: params.userId,
      householdId: params.householdId ?? null,
      accountId: params.accountId ?? null,
      bankAccountId: params.bankAccountId,
      amountCents: shouldReplace ? record.amount_cents : existing!.amountCents,
      currency: shouldReplace ? normalizedCurrency : existing!.currency,
      date,
      type: shouldReplace ? record.type : existing!.type,
      category: shouldReplace ? record.category : existing!.category,
      rawText: shouldReplace ? record.raw_text : existing!.rawText,
      merchant: shouldReplace ? record.merchant : existing!.merchant,
      recurrenceRule: {
        ...(shouldReplace ? recurrenceRule : existing!.recurrenceRule),
        anchor_date: date,
      },
      providerFields: {
        source: "plaid_recurring_template",
        provider: PLAID_PROVIDER,
        bank_account_id: params.bankAccountId,
        account_id: params.accountId ?? null,
        provider_transaction_id: record.provider_transaction_id,
        template_identity: identity,
        template_key: idempotencyKey,
      },
    };
    byTemplateKey.set(idempotencyKey, candidate);
  }

  return Array.from(byTemplateKey.values());
}

async function upsertPlaidRecurringTemplates(params: {
  supabase: SupabaseClient;
  candidates: PlaidRecurringTemplateCandidate[];
}): Promise<void> {
  const selectExistingTemplate = async (
    candidate: PlaidRecurringTemplateCandidate,
  ) => {
    return await withTransientBankReadRetry(async () => {
      // Build a fresh query for each retry; PostgREST builders are single-use.
      let existingQuery = params.supabase
        .from("expenses")
        .select(
          "id, date, account_id, amount_cents, currency, category, raw_text, merchant, source, type, is_recurring, recurrence_rule, household_id, deleted_at, deleted_reason, provider_fields, user_overrides",
        )
        .eq("user_id", candidate.userId)
        .eq("idempotency_key", candidate.idempotencyKey)
        .limit(1);

      existingQuery = candidate.householdId
        ? existingQuery.eq("household_id", candidate.householdId)
        : existingQuery.is("household_id", null);

      const { data, error } = await existingQuery;
      if (error) throw error;
      return data?.[0] as PlaidRecurringTemplateRow | undefined;
    }, {
      maxRetries: 2,
      initialDelayMs: 250,
      maxDelayMs: 1000,
    });
  };

  const updateExistingTemplate = async (
    existing: PlaidRecurringTemplateRow,
    payload: Record<string, unknown>,
  ) => {
    const { error } = await params.supabase
      .from("expenses")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  };

  for (const candidate of params.candidates) {
    const existing = await selectExistingTemplate(candidate);
    const date = candidate.date;
    const accountId = candidate.accountId || existing?.account_id || null;
    const recurrenceRule = {
      ...candidate.recurrenceRule,
      anchor_date: date,
    };
    const payload = {
      user_id: candidate.userId,
      household_id: candidate.householdId,
      account_id: accountId,
      contact_id: null,
      amount_cents: candidate.amountCents,
      currency: candidate.currency,
      category: candidate.category,
      date,
      raw_text: candidate.rawText,
      merchant: candidate.merchant,
      source: candidate.merchant || candidate.rawText,
      type: candidate.type,
      is_recurring: true,
      recurrence_rule: recurrenceRule,
      provider: null,
      bank_account_id: null,
      provider_transaction_id: null,
      idempotency_key: candidate.idempotencyKey,
      deleted_at: null,
      deleted_reason: null,
      provider_fields: {
        ...candidate.providerFields,
        account_id: accountId,
        template_fields: {
          account_id: accountId,
          amount_cents: candidate.amountCents,
          currency: candidate.currency,
          category: candidate.category,
          date,
          raw_text: candidate.rawText,
          merchant: candidate.merchant,
          source: candidate.merchant || candidate.rawText,
          type: candidate.type,
          is_recurring: true,
          recurrence_rule: recurrenceRule,
          household_id: candidate.householdId,
        },
      },
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const mergedPayload = mergePlaidRecurringTemplatePayload(
        existing,
        payload,
      );
      if (mergedPayload) {
        await updateExistingTemplate(existing, mergedPayload);
      }
      continue;
    }

    const { error } = await params.supabase.from("expenses").insert({
      ...payload,
      created_at: new Date().toISOString(),
    });
    if (error) {
      if ((error as SupabaseErrorLike).code !== "23505") throw error;
      const racedExisting = await selectExistingTemplate(candidate);
      if (!racedExisting?.id) throw error;
      const mergedPayload = mergePlaidRecurringTemplatePayload(
        racedExisting,
        payload,
      );
      if (mergedPayload) {
        await updateExistingTemplate(racedExisting, mergedPayload);
      }
    }
  }
}

interface PlaidRecurringTemplateRow extends Record<string, unknown> {
  id: string;
  date?: string | null;
  account_id?: string | null;
  deleted_at?: string | null;
  deleted_reason?: string | null;
  provider_fields?: Record<string, unknown> | null;
  user_overrides?: Record<string, unknown> | null;
}

const PLAID_RECURRING_TEMPLATE_VISIBLE_FIELDS = [
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

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function mergePlaidRecurringTemplatePayload(
  existing: PlaidRecurringTemplateRow,
  providerPayload: Record<string, unknown>,
): Record<string, unknown> | null {
  if (existing.deleted_reason === "user_deleted") {
    return null;
  }
  if (
    existing.deleted_at &&
    existing.deleted_reason !== "provider_recurring_retired" &&
    existing.deleted_reason !== "provider_inference_retired"
  ) {
    return null;
  }

  const previousProviderFields = existing.provider_fields || {};
  const previousTemplateFields =
    previousProviderFields.template_fields &&
    typeof previousProviderFields.template_fields === "object"
      ? (previousProviderFields.template_fields as Record<string, unknown>)
      : null;
  const userOverrides = existing.user_overrides || {};
  const merged = { ...providerPayload };

  for (const field of PLAID_RECURRING_TEMPLATE_VISIBLE_FIELDS) {
    const hasExplicitOverride = Object.prototype.hasOwnProperty.call(
      userOverrides,
      field,
    );
    const matchedPreviousProviderValue =
      previousTemplateFields != null &&
      sameJsonValue(existing[field], previousTemplateFields[field]);
    if (hasExplicitOverride || !matchedPreviousProviderValue) {
      merged[field] = existing[field] ?? null;
    }
  }

  return merged;
}

export interface PreparedPlaidTransactionMutations {
  inserts: BankExpenseMutationRecord[];
  updates: BankExpenseMutationRecord[];
  skipped: number;
  currencyMismatches: number;
}

export async function preparePlaidTransactionMutations(
  params: PersistTransactionsParams,
): Promise<PreparedPlaidTransactionMutations> {
  if (!params.transactions.length) {
    return {
      inserts: [],
      updates: [],
      skipped: 0,
      currencyMismatches: 0,
    };
  }

  const mapped: ExpenseUpsertRecord[] = params.transactions
    .filter((transaction) => transaction.transaction_id)
    .map((transaction) => ({
      ...mapPlaidTransactionToExpense({
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        defaultCurrency: params.accountCurrency,
        accountType: params.accountType,
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
      inserts: [],
      updates: [],
      skipped: params.transactions.length,
      currencyMismatches: 0,
    };
  }

  const postedIds = normalizedRecords.map(
    (record) => record.provider_transaction_id,
  );
  const pendingIds = params.transactions
    .map((transaction) => transaction.pending_transaction_id)
    .filter((id): id is string => Boolean(id));
  const lookupIds = Array.from(new Set([...postedIds, ...pendingIds]));
  const existingRows: ExistingExpenseProjectionRow[] = [];
  for (
    let index = 0;
    index < lookupIds.length;
    index += PROVIDER_TRANSACTION_LOOKUP_BATCH_SIZE
  ) {
    const batch = lookupIds.slice(
      index,
      index + PROVIDER_TRANSACTION_LOOKUP_BATCH_SIZE,
    );
    if (!batch.length) continue;
    const { data, error } = await params.supabase
      .from("expenses")
      .select(
        "id, provider_transaction_id, deleted_at, deleted_reason, provider_deleted_at, sync_version, user_overrides, amount_cents, currency, date, type, merchant, raw_text, bank_account_id, account_id, household_id, split_group_id, is_recurring, recurrence_rule, analytics_class, classification_source",
      )
      .eq("user_id", params.userId)
      .eq("provider", PLAID_PROVIDER)
      .eq("bank_account_id", params.bankAccountId)
      .in("provider_transaction_id", batch);
    if (error) throw error;
    existingRows.push(...((data || []) as ExistingExpenseProjectionRow[]));
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
  const mutationPlan = buildBankExpenseMutationPlan({
    records: normalizedRecords.map((record) => ({
      ...record,
      is_recurring: false,
      recurrence_rule: null,
    })),
    transactions: params.transactions,
    existingRows,
    providerPendingTransactionIds,
    cursorGeneration: params.cursorGeneration ?? 0,
  });
  const inserts = params.hideNewTransactions
    ? mutationPlan.inserts.map((record) => ({
        ...record,
        deleted_at: new Date().toISOString(),
        deleted_reason: "bank_account_inactive",
      }))
    : mutationPlan.inserts;
  return {
    inserts,
    updates: mutationPlan.updates,
    skipped: params.transactions.length - normalizedRecords.length,
    currencyMismatches,
  };
}

export async function persistPreparedPlaidRecurringTemplates(params: {
  supabase: SupabaseClient;
  candidates: PlaidRecurringTemplateCandidate[];
}): Promise<void> {
  await upsertPlaidRecurringTemplates(params);
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
  const tolerance = Math.max(
    1,
    Math.round(larger * RECURRING_AMOUNT_RELATIVE_TOLERANCE),
  );
  return delta <= tolerance;
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
    { frequency: "daily", min: 1, max: 2, needsIntervals: 2 },
    { frequency: "weekly", min: 4, max: 10, needsIntervals: 2 },
    { frequency: "biweekly", min: 11, max: 17, needsIntervals: 2 },
    { frequency: "monthly", min: 24, max: 37, needsIntervals: 2 },
    { frequency: "monthly", interval: 3, min: 81, max: 101, needsIntervals: 1 },
    {
      frequency: "monthly",
      interval: 6,
      min: 172,
      max: 193,
      needsIntervals: 1,
    },
    { frequency: "yearly", min: 347, max: 383, needsIntervals: 1 },
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
    return { records: [], allRecords: [] };
  }
  const prepared = await preparePlaidAccounts(params);

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(prepared.payload, {
      onConflict: "id",
    })
    .select(
      "id, plaid_account_id, provider_account_id, name, currency, mask, type, subtype, status, provider_balance_current_cents, provider_balance_available_cents, provider_balance_limit_cents, provider_balance_updated_at",
    );
  if (error) throw error;
  const allRecords = (data || []) as BankAccountRecord[];
  const activeAccountIds = allRecords
    .filter((account) => account.status === "active")
    .map((account) => account.id);
  if (activeAccountIds.length > 0) {
    const { error: restoreError } = await params.supabase
      .from("expenses")
      .update({
        deleted_at: null,
        deleted_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", params.userId)
      .eq("provider", PLAID_PROVIDER)
      .eq("deleted_reason", "bank_account_inactive")
      .in("bank_account_id", activeAccountIds);
    if (restoreError) throw restoreError;
  }
  return {
    records: activeBankAccountRecords(allRecords),
    allRecords,
  };
}

export async function preparePlaidAccounts(
  params: UpsertAccountsParams,
): Promise<PreparedPlaidAccounts> {
  if (!params.accounts.length) {
    return { payload: [], records: [], allRecords: [] };
  }

  const { data: existingRows, error: existingError } = await params.supabase
    .from("bank_accounts")
    .select("id, provider_account_id, provider_persistent_account_id, status")
    .eq("bank_connection_id", params.bankConnectionId)
    .eq("provider", PLAID_PROVIDER);
  if (existingError) throw existingError;

  const existingByProviderId = new Map<string, ExistingPlaidAccountIdentity>();
  const existingByPersistentId = new Map<
    string,
    ExistingPlaidAccountIdentity
  >();
  for (const row of (existingRows || []) as ExistingPlaidAccountIdentity[]) {
    if (row.provider_account_id) {
      existingByProviderId.set(row.provider_account_id, row);
    }
    if (row.provider_persistent_account_id) {
      existingByPersistentId.set(row.provider_persistent_account_id, row);
    }
  }

  const nowIso = new Date().toISOString();
  const payload = params.accounts.map((account) => {
    const existing =
      existingByProviderId.get(account.account_id) ||
      (account.persistent_account_id
        ? existingByPersistentId.get(account.persistent_account_id)
        : null);
    return {
      id: existing?.id || crypto.randomUUID(),
      user_id: params.userId,
      bank_connection_id: params.bankConnectionId,
      provider: PLAID_PROVIDER,
      plaid_account_id: account.account_id,
      provider_account_id: account.account_id,
      provider_persistent_account_id: account.persistent_account_id || null,
      name:
        account.name ||
        account.official_name ||
        `Account ${account.account_id}`,
      official_name: account.official_name || null,
      mask: account.mask || null,
      currency:
        account.balances?.iso_currency_code ||
        account.balances?.unofficial_currency_code ||
        "USD",
      type: account.type || null,
      subtype: account.subtype || null,
      status:
        existing?.status === "disabled" && !params.reactivateExistingAccounts
          ? "disabled"
          : "active",
      provider_balance_current_cents: plaidBalanceToCents(
        account.balances?.current,
      ),
      provider_balance_available_cents: plaidBalanceToCents(
        account.balances?.available,
      ),
      provider_balance_limit_cents: plaidBalanceToCents(
        account.balances?.limit,
      ),
      provider_balance_updated_at: nowIso,
      raw_provider_payload: {
        account_id: account.account_id,
        persistent_account_id: account.persistent_account_id || null,
      },
    };
  });
  const allRecords = payload.map((row) => ({
    id: row.id,
    plaid_account_id: row.plaid_account_id,
    provider_account_id: row.provider_account_id,
    name: row.name,
    currency: row.currency,
    mask: row.mask,
    type: row.type,
    subtype: row.subtype,
    status: row.status,
    provider_balance_current_cents: row.provider_balance_current_cents,
    provider_balance_available_cents: row.provider_balance_available_cents,
    provider_balance_limit_cents: row.provider_balance_limit_cents,
    provider_balance_updated_at: row.provider_balance_updated_at,
  }));

  return {
    payload,
    records: activeBankAccountRecords(allRecords),
    allRecords,
  };
}

interface ExistingPlaidAccountIdentity {
  id: string;
  provider_account_id?: string | null;
  provider_persistent_account_id?: string | null;
  status?: string | null;
}

function plaidBalanceToCents(value: number | null | undefined): number | null {
  return Number.isFinite(value) ? Math.round(Number(value) * 100) : null;
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
        accountType: params.accountType,
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

  const existingRows: ExistingExpenseProjectionRow[] = [];
  for (
    let index = 0;
    index < lookupIds.length;
    index += PROVIDER_TRANSACTION_LOOKUP_BATCH_SIZE
  ) {
    const batch = lookupIds.slice(
      index,
      index + PROVIDER_TRANSACTION_LOOKUP_BATCH_SIZE,
    );
    if (!batch.length) continue;

    const { data, error: selectError } = await params.supabase
      .from("expenses")
      .select(
        "id, provider_transaction_id, deleted_at, deleted_reason, provider_deleted_at, sync_version, user_overrides, amount_cents, currency, date, type, merchant, raw_text, bank_account_id, account_id, household_id, split_group_id, is_recurring, recurrence_rule, analytics_class, classification_source",
      )
      .eq("user_id", params.userId)
      .eq("provider", PLAID_PROVIDER)
      .eq("bank_account_id", params.bankAccountId)
      .in("provider_transaction_id", batch);

    if (selectError) {
      throw selectError;
    }

    existingRows.push(...((data || []) as ExistingExpenseProjectionRow[]));
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

  const postedOccurrenceRecords = normalizedRecords.map((record) => ({
    ...record,
    is_recurring: false,
    recurrence_rule: null,
  }));

  const mutationPlan = buildBankExpenseMutationPlan({
    records: postedOccurrenceRecords,
    transactions: params.transactions,
    existingRows,
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
    return { records: [], allRecords: [] };
  }

  const disabledProviderAccountIds = await loadDisabledProviderAccountIds({
    supabase: params.supabase,
    bankConnectionId: params.bankConnectionId,
    provider: TINK_PROVIDER,
  });

  const payload = params.accounts.map((account) => {
    const providerAccountId = account.id?.startsWith("tink_")
      ? account.id
      : `tink_${account.id}`;
    return {
      user_id: params.userId,
      bank_connection_id: params.bankConnectionId,
      provider: TINK_PROVIDER,
      plaid_account_id: providerAccountId,
      provider_account_id: providerAccountId,
      name: account.name || `Account ${account.id}`,
      official_name: null,
      mask: account.accountNumber?.iban || null,
      currency:
        account.balances?.booked?.currencyCode ||
        account.balances?.available?.currencyCode ||
        "USD",
      type: account.type?.name || null,
      subtype: null,
      status: disabledProviderAccountIds.has(providerAccountId)
        ? "disabled"
        : "active",
      raw_provider_payload: account,
    };
  });

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(payload, {
      onConflict: "bank_connection_id,provider,provider_account_id",
    })
    .select(
      "id, plaid_account_id, provider_account_id, name, currency, mask, type, subtype, status",
    );

  if (error) {
    throw error;
  }

  return {
    records: activeBankAccountRecords(data || []),
    allRecords: data || [],
  };
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
    .select(
      "id, provider_transaction_id, amount_cents, currency, household_id, account_id, split_group_id",
    )
    .eq("user_id", params.userId)
    .eq("provider", TINK_PROVIDER)
    .eq("bank_account_id", params.bankAccountId)
    .in("provider_transaction_id", providerIds);

  if (selectError) {
    throw selectError;
  }

  const existingByProviderId = new Map<string, ProviderRow>();
  (existingRows || []).forEach((row: ProviderRow) => {
    if (row.provider_transaction_id) {
      existingByProviderId.set(row.provider_transaction_id, row);
    }
  });

  const updates: typeof normalizedRecords = [];
  const inserts: typeof normalizedRecords = [];

  for (const record of normalizedRecords) {
    const existing = existingByProviderId.get(record.provider_transaction_id);
    if (existing) {
      updates.push({
        ...record,
        ...(existing.split_group_id
          ? {
              amount_cents: existing.amount_cents ?? record.amount_cents,
              currency: existing.currency ?? record.currency,
              household_id: existing.household_id ?? null,
              account_id: existing.account_id ?? null,
            }
          : {}),
        id: existing.id,
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
