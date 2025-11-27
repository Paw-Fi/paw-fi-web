import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  PLAID_PROVIDER,
  PlaidAccount,
  PlaidTransaction,
  mapPlaidTransactionToExpense,
} from "./plaid-client.ts";

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

export interface PersistTransactionsResult {
  inserted: number;
  updated: number;
  skipped: number;
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
    return { inserted: 0, updated: 0, skipped: 0 };
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
    return { inserted: 0, updated: 0, skipped: params.transactions.length };
  }

  const providerIds = mapped.map((record) => record.provider_transaction_id);
  const { data: existingRows, error: selectError } = await params.supabase
    .from("expenses")
    .select("id, provider_transaction_id")
    .eq("user_id", params.userId)
    .eq("provider", PLAID_PROVIDER)
    .in("provider_transaction_id", providerIds);

  if (selectError) {
    throw selectError;
  }

  const existingMap = new Map<string, string>();
  (existingRows || []).forEach((row) => {
    if (row.provider_transaction_id) {
      existingMap.set(row.provider_transaction_id, row.id);
    }
  });

  const newRecords = mapped.filter((record) => !existingMap.has(record.provider_transaction_id));
  const updateRecords = mapped
    .filter((record) => existingMap.has(record.provider_transaction_id))
    .map((record) => ({ ...record, id: existingMap.get(record.provider_transaction_id)! }));

  if (newRecords.length) {
    const { error: insertError } = await params.supabase
      .from("expenses")
      .insert(newRecords);
    if (insertError) {
      throw insertError;
    }
  }

  if (updateRecords.length) {
    const { error: updateError } = await params.supabase
      .from("expenses")
      .upsert(updateRecords, { onConflict: "id" });
    if (updateError) {
      throw updateError;
    }
  }

  return {
    inserted: newRecords.length,
    updated: updateRecords.length,
    skipped: params.transactions.length - mapped.length,
  };
}
