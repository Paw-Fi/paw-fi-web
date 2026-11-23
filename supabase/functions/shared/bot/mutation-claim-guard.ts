// Structural classification of bot tools. Nothing in this module inspects
// natural language: whether a reply is truthful is decided in
// reply-grounding.ts from tool outcomes, in any language.

const WRITE_MUTATION_TOOL_NAMES = new Set([
  "add_transaction",
  "add_transactions_batch",
  "update_transaction",
  "delete_transaction",
  "manage_recurring",
  "create_wallet",
  "update_wallet",
  "create_wallet_transfer",
  "create_space",
  "create_space_invite",
  "set_default_space",
  "update_space_settings",
  "set_budget",
  "draft_budget",
  "confirm_budget",
  "set_pocket",
  "delete_pocket",
  "create_custom_category",
  "set_currency",
  "set_language",
]);

// Tools whose successful result means stored records were actually read on
// this turn. analyze_expense is deliberately excluded: it extracts a draft
// from text or media and never reads or writes the ledger. generate_chart_url
// is excluded because it only renders numbers the model supplies.
const RECORD_LOOKUP_TOOL_NAMES = new Set([
  "list_expenses",
  "financial_insight",
  "get_budget",
  "list_wallets",
  "get_space_info",
]);

const READ_ONLY_RECURRING_ACTIONS = new Set([
  "list_series",
  "list_history",
  "analyze_history",
]);

function isReadOnlyRecurringAction(toolResult: unknown): boolean {
  const action = (toolResult as Record<string, unknown> | null)?.action;
  return typeof action === "string" && READ_ONLY_RECURRING_ACTIONS.has(action);
}

export function isWriteMutationToolName(
  toolName: string | null,
  toolResult?: unknown,
): boolean {
  if (
    toolName === "manage_recurring" && isReadOnlyRecurringAction(toolResult)
  ) {
    return false;
  }
  return (
    typeof toolName === "string" && WRITE_MUTATION_TOOL_NAMES.has(toolName)
  );
}

export function isRecordLookupToolName(
  toolName: string | null,
  toolResult?: unknown,
): boolean {
  if (toolName === "manage_recurring") {
    return isReadOnlyRecurringAction(toolResult);
  }
  return typeof toolName === "string" && RECORD_LOOKUP_TOOL_NAMES.has(toolName);
}

// analyze_expense only extracts a draft; it never persists anything. Mark the
// tool result so the model cannot mistake a successful extraction for a save.
export function annotateUnsavedAnalysisResult<T>(result: T): T {
  if (
    !result || typeof result !== "object" || Array.isArray(result) ||
    (result as Record<string, unknown>).success !== true
  ) {
    return result;
  }
  return {
    ...(result as Record<string, unknown>),
    saved: false,
    next_step:
      "Nothing has been saved yet. To record these transactions, call add_transaction (or add_transactions_batch) with the extracted details. Do not tell the user anything was saved until that call succeeds.",
  } as T;
}
