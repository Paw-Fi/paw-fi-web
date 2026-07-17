export type PlaidAnalyticsClass =
  | "consumer_spend"
  | "income"
  | "transfer_in"
  | "transfer_out"
  | "debt_payment"
  | "loan_disbursement"
  | "refund_or_reversal"
  | "bank_fee"
  | "cash_movement"
  | "unknown";

export interface PlaidTransactionClassificationInput {
  amount: number;
  pending: boolean;
  pfcPrimary?: string | null;
  transactionCode?: string | null;
  accountType?: string | null;
}

export interface PlaidTransactionClassification {
  analyticsClass: PlaidAnalyticsClass;
  direction: "in" | "out" | "none";
  isFinal: boolean;
  spendingMultiplier: -1 | 0 | 1;
  countsTowardIncome: boolean;
  classificationSource: "plaid_pfc_v2";
}

const CASH_TRANSACTION_CODES = new Set([
  "atm",
  "cash",
  "cash advance",
  "cashback",
]);

const BANK_FEE_TRANSACTION_CODES = new Set([
  "bank charge",
  "late fee",
  "membership fee",
  "returned item fee",
]);

const CONSUMER_SPEND_ACCOUNT_TYPES = new Set(["credit", "depository"]);

export function classifyPlaidTransaction(
  input: PlaidTransactionClassificationInput,
): PlaidTransactionClassification {
  const primary = input.pfcPrimary?.trim().toUpperCase() ?? "";
  const transactionCode = input.transactionCode?.trim().toLowerCase() ?? "";
  const accountType = input.accountType?.trim().toLowerCase() ?? "";
  const direction = input.amount > 0 ? "out" : input.amount < 0 ? "in" : "none";
  const isFinal = !input.pending;

  const result = (
    analyticsClass: PlaidAnalyticsClass,
    spendingMultiplier: -1 | 0 | 1 = 0,
    countsTowardIncome = false,
  ): PlaidTransactionClassification => ({
    analyticsClass,
    direction,
    isFinal,
    spendingMultiplier: isFinal ? spendingMultiplier : 0,
    countsTowardIncome: isFinal && countsTowardIncome,
    classificationSource: "plaid_pfc_v2",
  });

  if (input.amount === 0) return result("unknown");
  if (CASH_TRANSACTION_CODES.has(transactionCode)) {
    return result("cash_movement");
  }
  if (transactionCode === "transfer") {
    return result(input.amount < 0 ? "transfer_in" : "transfer_out");
  }
  if (transactionCode === "refund") {
    return input.amount < 0
      ? result("refund_or_reversal", -1)
      : result("unknown");
  }
  if (BANK_FEE_TRANSACTION_CODES.has(transactionCode)) {
    return result("bank_fee");
  }
  if (transactionCode === "adjustment") {
    return input.amount < 0
      ? result("refund_or_reversal", -1)
      : result("unknown");
  }
  if (transactionCode === "purchase") {
    if (input.amount < 0) return result("refund_or_reversal", -1);
    return CONSUMER_SPEND_ACCOUNT_TYPES.has(accountType)
      ? result("consumer_spend", 1)
      : result("unknown");
  }
  if (!primary) return result("unknown");

  if (primary === "INCOME") {
    return input.amount < 0 ? result("income", 0, true) : result("unknown");
  }
  if (primary === "TRANSFER_IN") {
    return input.amount < 0 ? result("transfer_in") : result("unknown");
  }
  if (primary === "TRANSFER_OUT") {
    return input.amount > 0 ? result("transfer_out") : result("unknown");
  }
  if (primary === "LOAN_PAYMENTS") return result("debt_payment");
  if (primary === "LOAN_DISBURSEMENTS") {
    return input.amount < 0 ? result("loan_disbursement") : result("unknown");
  }
  if (primary === "BANK_FEES") {
    return result("bank_fee");
  }
  if (primary === "OTHER") return result("unknown");
  if (input.amount < 0) return result("refund_or_reversal", -1);
  if (!CONSUMER_SPEND_ACCOUNT_TYPES.has(accountType)) {
    return result("unknown");
  }

  return result("consumer_spend", 1);
}

export function classifyUserCategoryOverride(
  category: string | null | undefined,
  transactionType: string | null | undefined,
): PlaidAnalyticsClass {
  const normalizedCategory = category?.trim().toLowerCase() ?? "";
  const normalizedType = transactionType?.trim().toLowerCase() ?? "expense";

  if (normalizedCategory === "transfers") {
    return normalizedType === "income" ? "transfer_in" : "transfer_out";
  }
  if (normalizedCategory === "debt payments") return "debt_payment";
  if (normalizedCategory === "bank fees") return "bank_fee";
  return normalizedType === "income" ? "income" : "consumer_spend";
}
