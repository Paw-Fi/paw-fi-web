import { type SupabaseClient as SupabaseJsClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
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
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  expiresAt?: string | null;
  countryCode?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ connectionId: string; isNewConnection: boolean }> {
  const normalizedCountryCode = params.countryCode?.trim().toUpperCase() ||
    null;

  const selectExisting = async () => {
    const { data, error } = await params.supabase
      .from("bank_connections")
      .select("id, metadata")
      .eq("user_id", params.userId)
      .eq("provider", params.provider)
      .eq("provider_item_id", params.providerItemId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as {
      id: string;
      metadata?: Record<string, unknown> | null;
    } | null;
  };

  const existing = await selectExisting();
  if (existing?.id) {
    const mergedMetadata = {
      ...(existing.metadata || {}),
      ...(params.metadata || {}),
    };

    const { error } = await params.supabase
      .from("bank_connections")
      .update({
        access_token_encrypted: params.accessTokenEncrypted,
        plaid_access_token_encrypted: params.accessTokenEncrypted,
        refresh_token_encrypted: params.refreshTokenEncrypted === undefined
          ? undefined
          : params.refreshTokenEncrypted,
        expires_at: params.expiresAt === undefined
          ? undefined
          : params.expiresAt,
        country_code: normalizedCountryCode,
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
    idempotency_key: params.idempotencyKey || null,
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

  const mergedMetadata = {
    ...(retry.metadata || {}),
    ...(params.metadata || {}),
  };

  const { error: retryError } = await params.supabase
    .from("bank_connections")
    .update({
      access_token_encrypted: params.accessTokenEncrypted,
      plaid_access_token_encrypted: params.accessTokenEncrypted,
      refresh_token_encrypted: params.refreshTokenEncrypted === undefined
        ? undefined
        : params.refreshTokenEncrypted,
      expires_at: params.expiresAt === undefined ? undefined : params.expiresAt,
      country_code: normalizedCountryCode,
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
    name: account.name || account.official_name ||
      `Account ${account.account_id}`,
    official_name: account.official_name || null,
    mask: account.mask || null,
    currency: account.balances?.iso_currency_code ||
      account.balances?.unofficial_currency_code ||
      "USD",
    type: account.type || null,
    subtype: account.subtype || null,
    status: "active",
    raw_provider_payload: account,
  }));

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(payload, { onConflict: "provider,provider_account_id" })
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
    normalizeCurrency(record, params.accountCurrency)
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
    .select("id, provider_transaction_id")
    .eq("user_id", params.userId)
    .eq("provider", PLAID_PROVIDER)
    .in("provider_transaction_id", lookupIds);

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
    const transaction = params.transactions.find(
      (t) => t.transaction_id === record.provider_transaction_id,
    );
    const pendingId = transaction?.pending_transaction_id;

    // If this is the posted version of a pending transaction, merge into the pending row
    if (pendingId && existingByProviderId.has(pendingId)) {
      const targetId = existingByProviderId.get(pendingId)!;
      existingByProviderId.set(record.provider_transaction_id, targetId);
      updates.push({ ...record, id: targetId });
      continue;
    }

    // If we already have this posted ID, update it
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
        "id, provider_transaction_id, amount_cents, currency, date, type, category, raw_text, is_recurring, recurrence_rule, created_at, updated_at, bank_account_id, account_id, user_id, household_id, contact_id",
      );
    if (insertError) {
      throw insertError;
    }
    insertedRecords = (insertedRows || []) as ExpensePreview[];
  }

  if (updates.length) {
    // Use onConflict to avoid races when sync runs twice
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
    currency: account.balances?.booked?.currencyCode ||
      account.balances?.available?.currencyCode ||
      "USD",
    type: account.type?.name || null,
    subtype: null,
    status: "active",
    raw_provider_payload: account,
  }));

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(payload, { onConflict: "provider,provider_account_id" })
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
    normalizeCurrency(record, params.accountCurrency)
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
        "id, provider_transaction_id, amount_cents, currency, date, type, category, raw_text, is_recurring, recurrence_rule, created_at, updated_at, bank_account_id, account_id, user_id, household_id, contact_id",
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
