export type BotToolDeclaration = Record<string, unknown>;

type TransactionToolOptions = {
  includeMerchant?: boolean;
};

const stringSchema = { type: "STRING" };
const numberSchema = { type: "NUMBER" };
const booleanSchema = { type: "BOOLEAN" };
const transactionTypeSchema = { type: "STRING", enum: ["expense", "income"] };
const splitTypeSchema = {
  type: "STRING",
  enum: ["equal", "amount", "percentage", "shares"],
};
const ownerTypeSchema = {
  type: "STRING",
  enum: ["me", "partner", "household"],
};
const privacyScopeSchema = {
  type: "STRING",
  enum: ["private", "balances_only", "full"],
};

function buildMemberSplitsSchema(): BotToolDeclaration {
  return {
    type: "ARRAY",
    description:
      "Shared space only: per-member split instructions (by name/email).",
    items: {
      type: "OBJECT",
      properties: {
        member_name: {
          type: "STRING",
          description: "Member name/email reference",
        },
        amount: numberSchema,
        percentage: numberSchema,
        shares: numberSchema,
      },
      required: ["member_name"],
    },
  };
}

function buildTransactionProperties(
  options: TransactionToolOptions = {},
): Record<string, unknown> {
  return {
    type: transactionTypeSchema,
    amount: {
      type: "NUMBER",
      description: "Amount in major units (e.g. 10.50)",
    },
    category: { type: "STRING", description: "Category name" },
    description: { type: "STRING", description: "Description/Note" },
    ...(options.includeMerchant
      ? {
          merchant: {
            type: "STRING",
            description: "Optional merchant/store/payee name",
          },
        }
      : {}),
    date: { type: "STRING", description: "YYYY-MM-DD" },
    currency: { type: "STRING", description: "ISO Currency Code" },
    household_id: {
      type: "STRING",
      description: "Optional: Space ID if it is a shared transaction",
    },
    household_name: {
      type: "STRING",
      description: "Optional: Space name if user provided it",
    },
    is_portfolio: {
      type: "BOOLEAN",
      description: "Optional: Whether the target space is a portfolio",
    },
    wallet_name: {
      type: "STRING",
      description:
        "Optional: Wallet name within the selected scope. Example: 'Spending' or 'Savings'.",
    },
    payer_name: {
      type: "STRING",
      description:
        "Shared space only: who paid (member name/email). Example: 'paid by B'.",
    },
    split_type: {
      ...splitTypeSchema,
      description:
        "Shared space only: how to split. If omitted, infer from member_splits fields.",
    },
    member_splits: buildMemberSplitsSchema(),
    owner_type: {
      ...ownerTypeSchema,
      description: "Income only: owner type",
    },
    privacy_scope: {
      ...privacyScopeSchema,
      description: "Income only: privacy scope",
    },
    source: {
      type: "STRING",
      description: "Income only: source label",
    },
    is_recurring: {
      type: "BOOLEAN",
      description: "True if this is a recurring transaction",
    },
    frequency: {
      type: "STRING",
      description: "Frequency for recurring (monthly, weekly, etc.)",
    },
    recurrence_rule: {
      type: "OBJECT",
      description: "Optional explicit recurrence rule payload",
    },
  };
}

export function buildCreateCustomCategoryTool(): BotToolDeclaration {
  return {
    name: "create_custom_category",
    description:
      "Create or update a custom transaction category for this user so it can be reused later.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: stringSchema,
        transaction_type: transactionTypeSchema,
        color_argb: numberSchema,
        icon_key: stringSchema,
      },
      required: ["name", "transaction_type"],
    },
  };
}

export function buildAddTransactionTool(
  options: TransactionToolOptions = {},
): BotToolDeclaration {
  return {
    name: "add_transaction",
    description:
      "Add an expense or income transaction. Use this for both personal and shared spaces.",
    parameters: {
      type: "OBJECT",
      properties: buildTransactionProperties(options),
      required: ["type", "amount", "category"],
    },
  };
}

export function buildAddTransactionsBatchTool(
  options: TransactionToolOptions = {},
): BotToolDeclaration {
  return {
    name: "add_transactions_batch",
    description:
      "Add multiple transactions at once. Use this when the user uploads a receipt/statement with multiple transactions or explicitly lists several transactions to save. More efficient than calling add_transaction multiple times.",
    parameters: {
      type: "OBJECT",
      properties: {
        household_id: {
          type: "STRING",
          description: "Optional: Space ID if these are shared transactions",
        },
        household_name: {
          type: "STRING",
          description: "Optional: Space name if user provided it",
        },
        is_portfolio: {
          type: "BOOLEAN",
          description: "Optional: Whether the target space is a portfolio",
        },
        transactions: {
          type: "ARRAY",
          description: "Array of transactions to save",
          items: {
            type: "OBJECT",
            properties: buildTransactionProperties(options),
            required: ["type", "amount", "category"],
          },
        },
      },
      required: ["transactions"],
    },
  };
}
