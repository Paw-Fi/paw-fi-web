import type { ExpenseUpsertInput, PlaidTransaction } from "./plaid-client.ts";

export interface ExistingExpenseProjectionRow {
  id: string;
  provider_transaction_id: string | null;
  deleted_at?: string | null;
  deleted_reason?: string | null;
  provider_deleted_at?: string | null;
  sync_version?: number | null;
  user_overrides?: Record<string, unknown> | null;
}

export interface BuildBankExpenseMutationPlanParams {
  records: ExpenseUpsertInput[];
  transactions: PlaidTransaction[];
  existingRows: ExistingExpenseProjectionRow[];
  providerPendingTransactionIds: Map<string, string>;
  cursorGeneration: number;
}

export interface BankExpenseMutationRecord extends ExpenseUpsertInput {
  id?: string;
  deleted_at?: string | null;
  deleted_reason?: string | null;
  provider_deleted_at?: string | null;
  provider_fields?: Record<string, unknown>;
  user_overrides?: Record<string, unknown>;
  sync_version?: number;
  provider_pending_transaction_id?: string | null;
  provider_posted_from_pending_transaction_id?: string | null;
  provider_sync_cursor_generation?: number;
}

export interface BankExpenseMutationPlan {
  inserts: BankExpenseMutationRecord[];
  updates: BankExpenseMutationRecord[];
}

function toComparableValue(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function extractProviderFields(
  record: ExpenseUpsertInput,
): Record<string, unknown> {
  return {
    amount_cents: record.amount_cents,
    currency: record.currency,
    date: record.date,
    type: record.type,
    category: record.category,
    raw_text: record.raw_text,
    merchant: record.merchant,
    source: record.source,
    is_recurring: record.is_recurring,
    recurrence_rule: record.recurrence_rule,
    raw_provider_payload: record.raw_provider_payload,
    normalized_amount_cents: record.normalized_amount_cents,
    base_currency: record.base_currency,
    fx_rate: record.fx_rate,
    bank_account_id: record.bank_account_id,
    household_id: record.household_id,
    account_id: record.account_id ?? null,
    contact_id: record.contact_id,
  };
}

function applyUserOverridesToRecord(
  record: ExpenseUpsertInput,
  userOverrides: Record<string, unknown>,
): ExpenseUpsertInput {
  const nextRecord: ExpenseUpsertInput = { ...record };
  const mutableRecord = nextRecord as unknown as Record<string, unknown>;

  for (const [key, value] of Object.entries(userOverrides)) {
    if (key in nextRecord) {
      mutableRecord[key] = value;
    }
  }

  return nextRecord;
}

export function computeBankExpenseUserOverrides(params: {
  providerFields: Record<string, unknown>;
  visibleExpense: Record<string, unknown>;
}): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};
  const keys = new Set([
    ...Object.keys(params.providerFields),
    ...Object.keys(params.visibleExpense),
  ]);

  for (const key of keys) {
    const providerValue = params.providerFields[key];
    const visibleValue = params.visibleExpense[key];
    if (toComparableValue(providerValue) !== toComparableValue(visibleValue)) {
      overrides[key] = visibleValue;
    }
  }

  return overrides;
}

export function buildBankExpenseMutationPlan(
  params: BuildBankExpenseMutationPlanParams,
): BankExpenseMutationPlan {
  const existingByProviderId = new Map<string, ExistingExpenseProjectionRow>();
  for (const row of params.existingRows) {
    if (row.provider_transaction_id) {
      existingByProviderId.set(row.provider_transaction_id, row);
    }
  }

  const transactionById = new Map<string, PlaidTransaction>();
  for (const transaction of params.transactions) {
    transactionById.set(transaction.transaction_id, transaction);
  }

  const inserts: BankExpenseMutationRecord[] = [];
  const updates: BankExpenseMutationRecord[] = [];

  for (const record of params.records) {
    const transaction = transactionById.get(record.provider_transaction_id);
    const explicitPendingId = params.providerPendingTransactionIds.get(
      record.provider_transaction_id,
    );
    const pendingTransactionId = explicitPendingId ||
      transaction?.pending_transaction_id || null;

    const matchedRow =
      pendingTransactionId && existingByProviderId.has(pendingTransactionId)
        ? existingByProviderId.get(pendingTransactionId)!
        : (existingByProviderId.get(record.provider_transaction_id) ?? null);

    const providerFields = extractProviderFields(record);
    const userOverrides = matchedRow?.user_overrides || {};
    const visibleRecord = applyUserOverridesToRecord(record, userOverrides);

    const baseMutation: BankExpenseMutationRecord = {
      ...visibleRecord,
      provider_fields: providerFields,
      user_overrides: userOverrides,
      sync_version: (matchedRow?.sync_version ?? 0) + 1,
      provider_sync_cursor_generation: params.cursorGeneration,
      provider_pending_transaction_id: pendingTransactionId,
      provider_posted_from_pending_transaction_id: pendingTransactionId &&
          pendingTransactionId !== record.provider_transaction_id
        ? pendingTransactionId
        : null,
    };

    if (!matchedRow) {
      inserts.push(baseMutation);
      continue;
    }

    const updatedMutation: BankExpenseMutationRecord = {
      ...baseMutation,
      id: matchedRow.id,
      provider_transaction_id: record.provider_transaction_id,
      deleted_at: matchedRow.deleted_at ?? null,
      deleted_reason: matchedRow.deleted_reason ?? null,
      provider_deleted_at: matchedRow.provider_deleted_at ?? null,
    };

    if (matchedRow.deleted_reason === "provider_removed") {
      updatedMutation.deleted_at = null;
      updatedMutation.deleted_reason = null;
      updatedMutation.provider_deleted_at = null;
    }

    if (matchedRow.deleted_reason === "user_deleted") {
      updatedMutation.deleted_at = matchedRow.deleted_at ?? null;
      updatedMutation.deleted_reason = "user_deleted";
      updatedMutation.provider_deleted_at = matchedRow.provider_deleted_at ??
        null;
    }

    updates.push(updatedMutation);
  }

  return { inserts, updates };
}
