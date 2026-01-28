import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  PLAID_PROVIDER,
  type ExpenseUpsertInput,
  PlaidAccount,
  PlaidTransaction,
  mapPlaidTransactionToExpense,
} from "./plaid-client.ts";
import {
  TINK_PROVIDER,
  TinkAccount,
  TinkTransaction,
  mapTinkTransactionToExpense,
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
}

export interface PersistTransactionsParams {
  supabase: SupabaseClient;
  userId: string;
  bankAccountId: string;
  accountCurrency: string;
  transactions: PlaidTransaction[];
}
export interface PersistTinkTransactionsParams {
  supabase: SupabaseClient;
  userId: string;
  bankAccountId: string;
  householdId?: string | null;
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
  user_id?: string | null;
  household_id?: string | null;
  contact_id?: string | null;
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
    .upsert(payload, { onConflict: "provider,provider_account_id" })
    .select("id, plaid_account_id, provider_account_id, name, currency");

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
    .map((transaction) =>
      mapPlaidTransactionToExpense({
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        defaultCurrency: params.accountCurrency,
        transaction,
      }),
    );

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
        "id, provider_transaction_id, amount_cents, currency, date, type, category, raw_text, is_recurring, recurrence_rule, created_at, updated_at, bank_account_id, user_id, household_id, contact_id",
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
    .upsert(payload, { onConflict: "provider,provider_account_id" })
    .select("id, plaid_account_id, provider_account_id, name, currency");

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
    );

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
        "id, provider_transaction_id, amount_cents, currency, date, type, category, raw_text, is_recurring, recurrence_rule, created_at, updated_at, bank_account_id, user_id, household_id, contact_id",
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
