import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  PLAID_PROVIDER,
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

export type SupabaseClient = ReturnType<typeof createClient>;

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
  accountCurrency: string;
  transactions: TinkTransaction[];
}

export interface PersistTransactionsResult {
  inserted: number;
  updated: number;
  skipped: number;
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
    name: account.name || account.official_name || `Account ${account.account_id}`,
    official_name: account.official_name || null,
    mask: account.mask || null,
    currency: account.balances?.iso_currency_code
      || account.balances?.unofficial_currency_code
      || "USD",
    type: account.type || null,
    subtype: account.subtype || null,
    status: "active",
    raw_provider_payload: account,
  }));

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(payload, { onConflict: "plaid_account_id" })
    .select("id, plaid_account_id, name, currency");

  if (error) {
    throw error;
  }

  return { records: data || [] };
}

export async function persistPlaidTransactions(
  params: PersistTransactionsParams,
): Promise<PersistTransactionsResult> {
  if (!params.transactions.length) {
    return { inserted: 0, updated: 0, skipped: 0, insertedRecords: [] };
  }

  const mapped = params.transactions
    .filter((transaction) => transaction.transaction_id)
    .map((transaction) =>
      mapPlaidTransactionToExpense({
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        defaultCurrency: params.accountCurrency,
        transaction,
      })
    );

  if (!mapped.length) {
    return { inserted: 0, updated: 0, skipped: params.transactions.length, insertedRecords: [] };
  }

  // Build lookup keys for both posted IDs and pending IDs to merge transitions
  const postedIds = mapped.map((record) => record.provider_transaction_id);
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
  (existingRows || []).forEach((row) => {
    if (row.provider_transaction_id) {
      existingByProviderId.set(row.provider_transaction_id, row.id);
    }
  });

  const updates: typeof mapped = [];
  const inserts: typeof mapped = [];

  for (const record of mapped) {
    const transaction = params.transactions.find((t) => t.transaction_id === record.provider_transaction_id);
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
      updates.push({ ...record, id: existingByProviderId.get(record.provider_transaction_id)! });
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
    skipped: params.transactions.length - mapped.length,
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
    plaid_account_id: account.id?.startsWith("tink_") ? account.id : `tink_${account.id}`,
    name: account.name || `Account ${account.id}`,
    official_name: null,
    mask: account.accountNumber?.iban || null,
    currency: account.balances?.booked?.currencyCode
      || account.balances?.available?.currencyCode
      || "USD",
    type: account.type?.name || null,
    subtype: null,
    status: "active",
    raw_provider_payload: account,
  }));

  const { data, error } = await params.supabase
    .from("bank_accounts")
    .upsert(payload, { onConflict: "plaid_account_id" })
    .select("id, plaid_account_id, name, currency");

  if (error) {
    throw error;
  }

  return { records: data || [] };
}

export async function persistTinkTransactions(
  params: PersistTinkTransactionsParams,
): Promise<PersistTransactionsResult> {
  if (!params.transactions.length) {
    return { inserted: 0, updated: 0, skipped: 0, insertedRecords: [] };
  }

  const mapped = params.transactions
    .filter((transaction) => transaction.id)
    .map((transaction) =>
      mapTinkTransactionToExpense({
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        defaultCurrency: params.accountCurrency,
        transaction,
      })
    );

  if (!mapped.length) {
    return { inserted: 0, updated: 0, skipped: params.transactions.length, insertedRecords: [] };
  }

  const providerIds = mapped.map((record) => record.provider_transaction_id);

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
  (existingRows || []).forEach((row) => {
    if (row.provider_transaction_id) {
      existingByProviderId.set(row.provider_transaction_id, row.id);
    }
  });

  const updates: typeof mapped = [];
  const inserts: typeof mapped = [];

  for (const record of mapped) {
    if (existingByProviderId.has(record.provider_transaction_id)) {
      updates.push({ ...record, id: existingByProviderId.get(record.provider_transaction_id)! });
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
    skipped: params.transactions.length - mapped.length,
    insertedRecords,
  };
}
