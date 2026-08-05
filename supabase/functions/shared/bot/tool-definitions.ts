export type BotToolDeclaration = Record<string, unknown>;

export function cloneBotToolDeclarations(
  declarations: BotToolDeclaration[],
): BotToolDeclaration[] {
  return JSON.parse(JSON.stringify(declarations)) as BotToolDeclaration[];
}

type TransactionToolOptions = ToolDescriptionOptions & {
  includeMerchant?: boolean;
  includeScope?: boolean;
};

type DescriptionMode = "rich" | "minimal";

type ToolDescriptionOptions = {
  descriptionMode?: DescriptionMode;
};

type ListExpensesToolOptions = ToolDescriptionOptions & {
  includeSpaceScope?: boolean;
};

type UpdateTransactionToolOptions = ToolDescriptionOptions & {
  includeMerchant?: boolean;
};

type BudgetToolOptions = ToolDescriptionOptions & {
  includePocketDetails?: boolean;
  requireAmountOnConfirm?: boolean;
};

type SetPocketToolOptions = ToolDescriptionOptions & {
  includeNewName?: boolean;
  includeColorIcon?: boolean;
};

type RecurringToolOptions = ToolDescriptionOptions & {
  includeDateField?: boolean;
  includeRecurrenceRule?: boolean;
  includeScheduleFields?: boolean;
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
  enum: ["me", "partner", "space"],
};
const privacyScopeSchema = {
  type: "STRING",
  enum: ["private", "balances_only", "full"],
};

function buildMemberSplitsSchema(
  mode: DescriptionMode = "rich",
): BotToolDeclaration {
  return {
    type: "ARRAY",
    ...(mode === "rich"
      ? {
          description:
            "Shared space only: per-member split instructions (by name/email).",
        }
      : {}),
    items: {
      type: "OBJECT",
      properties: {
        member_name:
          mode === "rich"
            ? {
                type: "STRING",
                description: "Member name/email reference",
              }
            : stringSchema,
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
  const mode = options.descriptionMode ?? "rich";
  const includeScope = options.includeScope ?? true;
  return {
    type: transactionTypeSchema,
    amount:
      mode === "rich"
        ? {
            type: "NUMBER",
            description: "Amount in major units (e.g. 10.50)",
          }
        : numberSchema,
    category:
      mode === "rich"
        ? { type: "STRING", description: "Category name" }
        : stringSchema,
    description:
      mode === "rich"
        ? { type: "STRING", description: "Description/Note" }
        : stringSchema,
    ...(options.includeMerchant
      ? {
          merchant:
            mode === "rich"
              ? {
                  type: "STRING",
                  description: "Optional merchant/store/payee name",
                }
              : stringSchema,
        }
      : {}),
    date:
      mode === "rich"
        ? { type: "STRING", description: "YYYY-MM-DD" }
        : stringSchema,
    currency:
      mode === "rich"
        ? { type: "STRING", description: "ISO Currency Code" }
        : stringSchema,
    ...(includeScope
      ? {
          space_id:
            mode === "rich"
              ? {
                  type: "STRING",
                  description:
                    "Optional: Space ID if it is a shared transaction",
                }
              : stringSchema,
          space_name:
            mode === "rich"
              ? {
                  type: "STRING",
                  description: "Optional: Space name if user provided it",
                }
              : stringSchema,
          space_type:
            mode === "rich"
              ? {
                  type: "STRING",
                  enum: ["private_space", "shared_space"],
                  description: "Optional: private_space or shared_space.",
                }
              : stringSchema,
          space_scope:
            mode === "rich"
              ? {
                  type: "STRING",
                  enum: ["personal", "personal_account"],
                  description:
                    "Use only when the user explicitly says this transaction is for the personal account, overriding any default AI bot space.",
                }
              : stringSchema,
        }
      : {}),
    wallet_name:
      mode === "rich"
        ? {
            type: "STRING",
            description:
              "Optional: Wallet name within the selected scope. Example: 'Spending' or 'Savings'.",
          }
        : stringSchema,
    payer_name:
      mode === "rich"
        ? {
            type: "STRING",
            description:
              "Shared space only: who paid (member name/email). Example: 'paid by B'.",
          }
        : stringSchema,
    split_type:
      mode === "rich"
        ? {
            ...splitTypeSchema,
            description:
              "Shared space only: how to split. If omitted, infer from member_splits fields.",
          }
        : splitTypeSchema,
    member_splits: buildMemberSplitsSchema(mode),
    owner_type:
      mode === "rich"
        ? {
            ...ownerTypeSchema,
            description: "Income only: owner type",
          }
        : ownerTypeSchema,
    privacy_scope:
      mode === "rich"
        ? {
            ...privacyScopeSchema,
            description: "Income only: privacy scope",
          }
        : privacyScopeSchema,
    source:
      mode === "rich"
        ? {
            type: "STRING",
            description: "Income only: source label",
          }
        : stringSchema,
    is_recurring:
      mode === "rich"
        ? {
            type: "BOOLEAN",
            description: "True if this is a recurring transaction",
          }
        : booleanSchema,
    frequency:
      mode === "rich"
        ? {
            type: "STRING",
            description: "Frequency for recurring (monthly, weekly, etc.)",
          }
        : stringSchema,
    interval: numberSchema,
    anchor_date:
      mode === "rich"
        ? { type: "STRING", description: "Recurring anchor date, YYYY-MM-DD" }
        : stringSchema,
    end_date:
      mode === "rich"
        ? {
            type: "STRING",
            description: "Optional recurring end date, YYYY-MM-DD",
          }
        : stringSchema,
    reminder_value: numberSchema,
    reminder_unit:
      mode === "rich"
        ? { type: "STRING", enum: ["days", "hours"] }
        : stringSchema,
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
      (options.descriptionMode ?? "rich") === "rich"
        ? "Add multiple transactions at once. Use this when the user uploads a receipt/statement with multiple transactions or explicitly lists several transactions to save. More efficient than calling add_transaction multiple times."
        : "Add multiple transactions at once.",
    parameters: {
      type: "OBJECT",
      properties: {
        space_id:
          (options.descriptionMode ?? "rich") === "rich"
            ? {
                type: "STRING",
                description:
                  "Optional: Space ID if these are shared transactions",
              }
            : stringSchema,
        space_name:
          (options.descriptionMode ?? "rich") === "rich"
            ? {
                type: "STRING",
                description: "Optional: Space name if user provided it",
              }
            : stringSchema,
        space_type:
          (options.descriptionMode ?? "rich") === "rich"
            ? {
                type: "STRING",
                enum: ["private_space", "shared_space"],
                description: "Optional: private_space or shared_space.",
              }
            : stringSchema,
        space_scope:
          (options.descriptionMode ?? "rich") === "rich"
            ? {
                type: "STRING",
                enum: ["personal", "personal_account"],
                description:
                  "Use only when the user explicitly says these transactions are for the personal account, overriding any default AI bot space.",
              }
            : stringSchema,
        transactions: {
          type: "ARRAY",
          ...((options.descriptionMode ?? "rich") === "rich"
            ? { description: "Array of transactions to save" }
            : {}),
          items: {
            type: "OBJECT",
            properties: buildTransactionProperties({
              ...options,
              includeScope: false,
            }),
            required: ["type", "amount", "category"],
          },
        },
      },
      required: ["transactions"],
    },
  };
}

function buildSelectionIndexSchema(mode: DescriptionMode): BotToolDeclaration {
  return mode === "rich"
    ? {
        type: "NUMBER",
        description: "1-based index into the last listed transactions",
      }
    : numberSchema;
}

function buildTransactionMatchSchema(
  mode: DescriptionMode,
): BotToolDeclaration {
  return {
    type: "OBJECT",
    properties: {
      amount: numberSchema,
      date: { type: "STRING", description: "YYYY-MM-DD" },
      description_contains: stringSchema,
      category: stringSchema,
      currency: stringSchema,
      type: transactionTypeSchema,
    },
  };
}

export function buildListWalletsTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "list_wallets",
    description:
      mode === "rich"
        ? "List wallets in personal scope or in a selected space, including current balances and which one is the default."
        : "List wallets in personal scope or in a selected space, including balances and the default wallet.",
    parameters: {
      type: "OBJECT",
      properties: {
        space_id: stringSchema,
        space_name: stringSchema,
        include_archived: booleanSchema,
      },
    },
  };
}

export function buildCreateWalletTool(): BotToolDeclaration {
  return {
    name: "create_wallet",
    description:
      "Create a new wallet in personal scope or in a selected space.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: stringSchema,
        space_id: stringSchema,
        space_name: stringSchema,
        icon: stringSchema,
        color: stringSchema,
        opening_balance: numberSchema,
        goal_amount: numberSchema,
        is_default: booleanSchema,
      },
      required: ["name"],
    },
  };
}

export function buildUpdateWalletTool(): BotToolDeclaration {
  return {
    name: "update_wallet",
    description:
      "Rename or update a wallet in the selected scope. Use wallet_name to choose which wallet to edit.",
    parameters: {
      type: "OBJECT",
      properties: {
        wallet_name: stringSchema,
        space_id: stringSchema,
        space_name: stringSchema,
        new_name: stringSchema,
        icon: stringSchema,
        color: stringSchema,
        opening_balance: numberSchema,
        goal_amount: numberSchema,
        is_default: booleanSchema,
      },
      required: ["wallet_name"],
    },
  };
}

export function buildCreateWalletTransferTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "create_wallet_transfer",
    description: "Move money between two wallets in the same scope.",
    parameters: {
      type: "OBJECT",
      properties: {
        from_wallet_name: stringSchema,
        to_wallet_name: stringSchema,
        amount: numberSchema,
        currency: stringSchema,
        date:
          mode === "rich"
            ? { type: "STRING", description: "YYYY-MM-DD" }
            : stringSchema,
        note: stringSchema,
        space_id: stringSchema,
        space_name: stringSchema,
      },
      required: ["from_wallet_name", "to_wallet_name", "amount"],
    },
  };
}

export function buildWalletTools(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration[] {
  return [
    buildListWalletsTool(options),
    buildCreateWalletTool(),
    buildUpdateWalletTool(),
    buildCreateWalletTransferTool(options),
  ];
}

export function buildCreateSpaceTool(): BotToolDeclaration {
  return {
    name: "create_space",
    description: "Create a private space or shared space.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: stringSchema,
        space_type: {
          type: "STRING",
          enum: ["shared", "shared_space", "private", "private_space"],
        },
        currency: stringSchema,
        cover_image_url: stringSchema,
        ai_use_default_split: booleanSchema,
        ai_default_split_config: {
          type: "OBJECT",
          description:
            "Optional default split config with splitType and memberSplits.",
        },
      },
      required: ["name"],
    },
  };
}

export function buildCreateSpaceInviteTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "create_space_invite",
    description:
      mode === "rich"
        ? "Create an invitation link for a shared space invite email. Use this after creating a shared space or when the user asks to invite someone to a space. Return the invite_url to the user."
        : "Create a shared space invitation link.",
    parameters: {
      type: "OBJECT",
      properties: {
        space_id: stringSchema,
        space_name: stringSchema,
        invited_email:
          mode === "rich"
            ? {
                type: "STRING",
                description: "Email address to invite to the shared space.",
              }
            : stringSchema,
        personal_message: stringSchema,
        expires_in_days:
          mode === "rich"
            ? {
                type: "NUMBER",
                description:
                  "Invite expiry in days. Use 7 by default, 0 for no expiry.",
              }
            : numberSchema,
      },
      required: ["invited_email"],
    },
  };
}

export function buildGetSpaceInfoTool(): BotToolDeclaration {
  return {
    name: "get_space_info",
    description:
      "Get a space's settings and member list. Use this when the user asks who is in a space, list members, list admins/owners, or show space details. Use space_name unless the ID is already known internally.",
    parameters: {
      type: "OBJECT",
      properties: {
        space_id: stringSchema,
        space_name: stringSchema,
      },
    },
  };
}

export function buildUpdateSpaceSettingsTool(): BotToolDeclaration {
  return {
    name: "update_space_settings",
    description:
      "Update a space's name, visibility/private-vs-shared setting, cover, or AI auto-split settings.",
    parameters: {
      type: "OBJECT",
      properties: {
        space_id: stringSchema,
        space_name: stringSchema,
        name: stringSchema,
        space_type: {
          type: "STRING",
          enum: ["shared", "shared_space", "private", "private_space"],
        },
        cover_image_url: stringSchema,
        ai_use_default_split: booleanSchema,
        ai_default_split_config: {
          type: "OBJECT",
          description:
            "Optional default split config with splitType and memberSplits.",
        },
      },
    },
  };
}

export function buildUpdateTransactionTool(
  options: UpdateTransactionToolOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "update_transaction",
    description: "Update a previously listed transaction (no transaction IDs).",
    parameters: {
      type: "OBJECT",
      properties: {
        selection_index: buildSelectionIndexSchema(mode),
        match: buildTransactionMatchSchema(mode),
        updates: {
          type: "OBJECT",
          properties: {
            amount: numberSchema,
            category: stringSchema,
            description: stringSchema,
            ...(options.includeMerchant ? { merchant: stringSchema } : {}),
            date: { type: "STRING", description: "YYYY-MM-DD" },
            currency: stringSchema,
            space_id:
              mode === "rich"
                ? {
                    type: "STRING",
                    description:
                      "Optional target space ID when moving the transaction to a space.",
                  }
                : stringSchema,
            space_name:
              mode === "rich"
                ? {
                    type: "STRING",
                    description:
                      "Optional target space name when moving the transaction to a space.",
                  }
                : stringSchema,
            space_type:
              mode === "rich"
                ? {
                    type: "STRING",
                    enum: ["private_space", "shared_space"],
                    description: "Optional: private_space or shared_space.",
                  }
                : stringSchema,
            space_scope: {
              type: "STRING",
              enum: ["personal", "personal_account"],
              description:
                "Use when moving the transaction back to the personal account.",
            },
            wallet_id:
              mode === "rich"
                ? {
                    type: "STRING",
                    description:
                      "Optional exact wallet ID. Prefer wallet_name unless already known internally.",
                  }
                : stringSchema,
            wallet_name:
              mode === "rich"
                ? {
                    type: "STRING",
                    description:
                      "Optional wallet name inside the selected target scope.",
                  }
                : stringSchema,
            payer_name:
              mode === "rich"
                ? {
                    type: "STRING",
                    description:
                      "Shared space only: member name/email for who paid.",
                  }
                : stringSchema,
            split_type: splitTypeSchema,
            member_splits: buildMemberSplitsSchema(mode),
            source: stringSchema,
            is_recurring: booleanSchema,
            frequency: stringSchema,
            interval: numberSchema,
            anchor_date: { type: "STRING", description: "YYYY-MM-DD" },
            end_date: { type: "STRING", description: "YYYY-MM-DD" },
            reminder_value: numberSchema,
            reminder_unit: { type: "STRING", enum: ["days", "hours"] },
            recurrence_rule: {
              type: "OBJECT",
              description: "Optional explicit recurrence rule payload",
            },
          },
        },
      },
      required: ["updates"],
    },
  };
}

export function buildDeleteTransactionTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "delete_transaction",
    description: "Delete a previously listed transaction (no transaction IDs).",
    parameters: {
      type: "OBJECT",
      properties: {
        selection_index: buildSelectionIndexSchema(mode),
        match: buildTransactionMatchSchema(mode),
      },
    },
  };
}

export function buildListExpensesTool(
  options: ListExpensesToolOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "list_expenses",
    description: "List recent transactions (expenses or income).",
    parameters: {
      type: "OBJECT",
      properties: {
        type: transactionTypeSchema,
        currency:
          mode === "rich"
            ? { type: "STRING", description: "Optional: filter by currency" }
            : stringSchema,
        limit: numberSchema,
        start_date: stringSchema,
        end_date: stringSchema,
        space_id:
          mode === "rich"
            ? { type: "STRING", description: "Optional: Filter by space" }
            : stringSchema,
        space_name:
          mode === "rich"
            ? { type: "STRING", description: "Optional: Space name filter" }
            : stringSchema,
        space_type:
          mode === "rich"
            ? {
                type: "STRING",
                enum: ["private_space", "shared_space"],
                description: "Optional: private_space or shared_space.",
              }
            : stringSchema,
        ...(options.includeSpaceScope
          ? {
              space_scope: {
                type: "STRING",
                enum: [
                  "personal",
                  "personal_account",
                  "private_space",
                  "shared",
                  "shared_space",
                  "all",
                  "all_spaces",
                ],
                description:
                  "Optional high-level scope hint. Omit it to search all accessible spaces.",
              },
            }
          : {}),
      },
    },
  };
}

export function buildGenerateChartUrlTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "generate_chart_url",
    description:
      mode === "rich"
        ? "Generate a URL for a chart (bar/pie/donut/radar) to visualize expenses."
        : "Generate a URL for a chart.",
    parameters: {
      type: "OBJECT",
      properties: {
        chart_type: { type: "STRING", enum: ["bar", "pie", "donut", "radar"] },
        labels: { type: "ARRAY", items: stringSchema },
        data: { type: "ARRAY", items: numberSchema },
        title: stringSchema,
      },
      required: ["chart_type", "labels", "data"],
    },
  };
}

export function buildFinancialInsightTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "financial_insight",
    description:
      mode === "rich"
        ? "Authoritative aggregate for total spending, income, net cashflow, financial health, budget status, and category breakdowns. Includes recurring occurrences based on frequency. Always use this instead of list_expenses for totals or summaries."
        : "Authoritative recurring-aware totals and financial summary. Use for spending, income, net, budget, or financial-health aggregates; never calculate totals from list_expenses.",
    parameters: {
      type: "OBJECT",
      properties: {
        period: {
          type: "STRING",
          enum: [
            "current_financial_period",
            "last_financial_period",
            "this_month",
            "last_month",
            "this_week",
            "last_week",
            "last_30_days",
            "today",
            "yesterday",
            "this_year",
            "all_time",
            "custom",
          ],
          ...(mode === "rich"
            ? { description: "Time period requested by the user." }
            : {}),
        },
        date: stringSchema,
        period_month: stringSchema,
        start_date: stringSchema,
        end_date: stringSchema,
        currency:
          mode === "rich"
            ? { type: "STRING", description: "Optional ISO currency code." }
            : stringSchema,
        ...buildScopeProperties(mode),
        space_scope: {
          type: "STRING",
          enum: [
            "personal",
            "personal_account",
            "private_space",
            "shared",
            "shared_space",
            "all",
            "all_spaces",
          ],
          ...(mode === "rich"
            ? { description: "Account or space scope requested by the user." }
            : {}),
        },
        household_id: stringSchema,
        household_name: stringSchema,
        wallet_name:
          mode === "rich"
            ? {
                type: "STRING",
                description:
                  "Optional wallet name. Use 'primary wallet' for the default wallet.",
              }
            : stringSchema,
      },
    },
  };
}

function buildScopeProperties(mode: DescriptionMode): Record<string, unknown> {
  return {
    space_id:
      mode === "rich"
        ? { type: "STRING", description: "Optional: space scope" }
        : stringSchema,
    space_name:
      mode === "rich"
        ? { type: "STRING", description: "Optional: space name" }
        : stringSchema,
    space_type:
      mode === "rich"
        ? {
            type: "STRING",
            enum: ["private_space", "shared_space"],
            description: "Optional: private_space or shared_space.",
          }
        : stringSchema,
  };
}

function buildBudgetPocketsSchema(
  options: BudgetToolOptions,
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  if (!options.includePocketDetails) {
    return { type: "ARRAY", items: { type: "OBJECT" } };
  }
  return {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        name: stringSchema,
        percentage: numberSchema,
        categories: { type: "ARRAY", items: stringSchema },
        color: stringSchema,
        icon: stringSchema,
      },
      required: ["name", "percentage"],
    },
    ...(mode === "rich"
      ? {
          description:
            "Optional: pocket splits with percentages and categories",
        }
      : {}),
  };
}

export function buildGetBudgetTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "get_budget",
    description:
      mode === "rich"
        ? "Get budget status for the current month (includes pockets)."
        : "Get current budget status.",
    parameters: {
      type: "OBJECT",
      properties: {
        date:
          mode === "rich"
            ? { type: "STRING", description: "YYYY-MM-DD" }
            : stringSchema,
        space_id:
          mode === "rich"
            ? { type: "STRING", description: "Optional: Check space budget" }
            : stringSchema,
        space_name:
          mode === "rich"
            ? { type: "STRING", description: "Optional: Space name" }
            : stringSchema,
        space_type:
          mode === "rich"
            ? {
                type: "STRING",
                enum: ["private_space", "shared_space"],
                description: "Optional: private_space or shared_space.",
              }
            : stringSchema,
      },
    },
  };
}

export function buildDraftBudgetTool(
  options: BudgetToolOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "draft_budget",
    description:
      mode === "rich"
        ? "Draft a budget proposal (amount and pockets) and store it for confirmation."
        : "Draft a budget proposal for confirmation.",
    parameters: {
      type: "OBJECT",
      properties: {
        amount: numberSchema,
        date:
          mode === "rich"
            ? { type: "STRING", description: "YYYY-MM-DD" }
            : stringSchema,
        ...buildScopeProperties(mode),
        pockets: buildBudgetPocketsSchema(options),
      },
      required: ["amount"],
    },
  };
}

export function buildConfirmBudgetTool(
  options: BudgetToolOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "confirm_budget",
    description:
      mode === "rich"
        ? "Confirm and apply the last drafted budget (can include overrides)."
        : "Confirm and apply a budget draft.",
    parameters: {
      type: "OBJECT",
      properties: {
        confirm:
          mode === "rich"
            ? { type: "BOOLEAN", description: "Set true to confirm" }
            : booleanSchema,
        amount: numberSchema,
        date:
          mode === "rich"
            ? { type: "STRING", description: "YYYY-MM-DD" }
            : stringSchema,
        ...buildScopeProperties(mode),
        pockets: buildBudgetPocketsSchema(options),
      },
      ...(options.requireAmountOnConfirm ? { required: ["amount"] } : {}),
    },
  };
}

export function buildSetBudgetTool(
  options: BudgetToolOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "set_budget",
    description:
      mode === "rich"
        ? "Set the budget amount for the month (supports pocket splits)."
        : "Set budget amount for a month.",
    parameters: {
      type: "OBJECT",
      properties: {
        amount: numberSchema,
        date:
          mode === "rich"
            ? { type: "STRING", description: "YYYY-MM-DD" }
            : stringSchema,
        ...buildScopeProperties(mode),
        pockets: buildBudgetPocketsSchema(options),
      },
      required: ["amount"],
    },
  };
}

export function buildSetPocketTool(
  options: SetPocketToolOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "set_pocket",
    description:
      mode === "rich"
        ? "Create or update a pocket for the current budget. Categories are optional; use them only when the user provides category links."
        : "Create or update a budget pocket. Categories are optional.",
    parameters: {
      type: "OBJECT",
      properties: {
        name:
          mode === "rich"
            ? { type: "STRING", description: "Pocket name to create/update" }
            : stringSchema,
        ...(options.includeNewName
          ? { new_name: { type: "STRING", description: "Optional new name" } }
          : {}),
        percentage:
          mode === "rich"
            ? { type: "NUMBER", description: "Allocation percentage (0-100)" }
            : numberSchema,
        categories:
          mode === "rich"
            ? {
                type: "ARRAY",
                items: stringSchema,
                description:
                  "Optional transaction categories to link to this pocket",
              }
            : { type: "ARRAY", items: stringSchema },
        ...(options.includeColorIcon
          ? {
              color: {
                type: "STRING",
                description: "Hex color (e.g. #FF0000)",
              },
              icon: { type: "STRING", description: "Material icon name" },
            }
          : {}),
        date:
          mode === "rich"
            ? { type: "STRING", description: "YYYY-MM-DD" }
            : stringSchema,
        ...buildScopeProperties(mode),
      },
      required: ["name"],
    },
  };
}

export function buildDeletePocketTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "delete_pocket",
    description:
      mode === "rich"
        ? "Delete a pocket by name."
        : "Delete a budget pocket by name.",
    parameters: {
      type: "OBJECT",
      properties: {
        name:
          mode === "rich"
            ? { type: "STRING", description: "Pocket name to delete" }
            : stringSchema,
        date:
          mode === "rich"
            ? { type: "STRING", description: "YYYY-MM-DD" }
            : stringSchema,
        ...buildScopeProperties(mode),
      },
      required: ["name"],
    },
  };
}

export function buildSetCurrencyTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "set_currency",
    description:
      mode === "rich"
        ? "Update the user's preferred currency (user_contacts.preferred_currency)."
        : "Update preferred currency.",
    parameters: {
      type: "OBJECT",
      properties: {
        currency:
          mode === "rich"
            ? {
                type: "STRING",
                description: "ISO currency code, e.g. USD, EUR, GBP",
              }
            : stringSchema,
      },
      required: ["currency"],
    },
  };
}

export function buildSetLanguageTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "set_language",
    description:
      mode === "rich"
        ? "Update the user's preferred language (user_contacts.preferred_language). Use this when the user asks you to speak in a specific language in the future."
        : "Update preferred language.",
    parameters: {
      type: "OBJECT",
      properties: {
        language:
          mode === "rich"
            ? {
                type: "STRING",
                description:
                  "Language code or language name, e.g. en, es, English, Spanish, zh, Chinese",
              }
            : stringSchema,
      },
      required: ["language"],
    },
  };
}

export function buildSetDefaultSpaceTool(
  options: ToolDescriptionOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "set_default_space",
    description:
      mode === "rich"
        ? "Set or clear the user's default AI bot space for future saves. Use only when the user explicitly asks to always/default/future save or log records to a named space. Use space_scope=personal to clear it back to the personal account."
        : "Set or clear the default AI bot space.",
    parameters: {
      type: "OBJECT",
      properties: {
        space_id: stringSchema,
        space_name: stringSchema,
        space_scope: {
          type: "STRING",
          enum: ["personal", "personal_account"],
        },
      },
    },
  };
}

export function buildManageRecurringTool(
  options: RecurringToolOptions = {},
): BotToolDeclaration {
  const mode = options.descriptionMode ?? "rich";
  return {
    name: "manage_recurring",
    description:
      mode === "rich"
        ? "Create, list, update, or delete recurring transactions and manage their payment occurrences and history."
        : "Manage recurring transactions, occurrences, and payment history.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          enum: [
            "add",
            "update",
            "delete",
            "list_series",
            "list_history",
            "confirm_occurrence",
            "update_occurrence",
            "unconfirm_occurrence",
            "skip_occurrence",
          ],
          ...(mode === "rich"
            ? {
                description:
                  "Use update for the recurring series and update_occurrence for one confirmed payment.",
              }
            : {}),
        },
        recurring_id:
          mode === "rich"
            ? {
                type: "STRING",
                description:
                  "Internal recurring series id from a prior tool result; never ask the user for it.",
              }
            : stringSchema,
        expense_id:
          mode === "rich"
            ? {
                type: "STRING",
                description:
                  "Optional: internal transaction id (avoid asking user; prefer selection_index/match)",
              }
            : stringSchema,
        selection_index: buildSelectionIndexSchema(mode),
        match: buildTransactionMatchSchema(mode),
        amount: numberSchema,
        category: stringSchema,
        currency: stringSchema,
        currencies: {
          type: "ARRAY",
          items: stringSchema,
          ...(mode === "rich"
            ? { description: "Optional ISO currency filters for list_series." }
            : {}),
        },
        description: stringSchema,
        merchant: stringSchema,
        ...(options.includeDateField ? { date: stringSchema } : {}),
        source:
          mode === "rich"
            ? { type: "STRING", description: "Income only: source" }
            : stringSchema,
        frequency:
          mode === "rich"
            ? {
                type: "STRING",
                enum: ["daily", "weekly", "biweekly", "monthly", "yearly"],
              }
            : stringSchema,
        ...(options.includeRecurrenceRule
          ? {
              recurrence_rule: {
                type: "OBJECT",
                description: "Optional explicit recurrence rule payload",
              },
            }
          : {}),
        ...(options.includeScheduleFields
          ? {
              interval: numberSchema,
              anchor_date: { type: "STRING", description: "YYYY-MM-DD" },
              end_date: { type: "STRING", description: "YYYY-MM-DD" },
              reminder_value: numberSchema,
              reminder_unit: { type: "STRING", enum: ["days", "hours"] },
            }
          : {}),
        owner_type: ownerTypeSchema,
        privacy_scope: privacyScopeSchema,
        wallet_name: stringSchema,
        account_id: stringSchema,
        scheduled_occurrence_date: {
          type: "STRING",
          description: "Occurrence schedule date in YYYY-MM-DD format.",
        },
        paid_date: {
          type: "STRING",
          description: "Actual payment date in YYYY-MM-DD format.",
        },
        before_scheduled_date: {
          type: "STRING",
          description:
            "For older payment history, return occurrences before this YYYY-MM-DD date.",
        },
        limit: {
          type: "NUMBER",
          description:
            "Maximum list size: 1-25 for series, 1-100 for payment history.",
        },
        update_future_amount: booleanSchema,
        space_id: stringSchema,
        space_name: stringSchema,
        space_type: {
          type: "STRING",
          enum: ["private_space", "shared_space"],
        },
        space_scope: {
          type: "STRING",
          enum: [
            "personal",
            "personal_account",
            "private_space",
            "shared",
            "shared_space",
            "all",
            "all_spaces",
          ],
        },
        payer_name: stringSchema,
        split_type: splitTypeSchema,
        member_splits: buildMemberSplitsSchema(mode),
        type: {
          ...transactionTypeSchema,
          ...(mode === "rich"
            ? { description: "Recurring transaction type" }
            : {}),
        },
      },
      required: ["action"],
    },
  };
}
