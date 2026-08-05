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
]);

// Generic past-tense mutation verbs (used only when no assertive first-person
// claim is present — otherwise we rely on the stronger ASSERTIVE pattern).
const SAVE_CLAIM_PATTERN =
  /\b(?:added|saved|logged|recorded|noted|stored|booked|captured|tracked)\b/i;

const TRANSACTION_UPDATE_DELETE_CLAIM_PATTERN = /\b(?:updated|deleted)\b/i;

// Assertive first-person past-tense claims that the model uses when it
// hallucinates that a save happened. These must NOT be bypassed by the
// proposal/follow-up exemption because the model often chains a save claim
// with a "Would you like ..." offer per system prompt style guidelines.
// Examples it catches:
//   "I've added the €20 for KFC"
//   "I have logged your expense"
//   "I added ..." / "I saved ..." / "I've recorded ..."
//   Also handles smart-quote apostrophes (\u2019) used by some models.
const ASSERTIVE_SAVE_CLAIM_PATTERN =
  /\bi\s*(?:['\u2019]\s*(?:ve|ll|d)|have|had|'?m)?\s*(?:just\s+|successfully\s+|now\s+)?(?:added|saved|logged|recorded|noted|stored|booked|captured|tracked)\b/i;

const ASSERTIVE_TRANSACTION_UPDATE_DELETE_CLAIM_PATTERN =
  /\bi\s*(?:['\u2019]\s*(?:ve|ll|d)|have|had|'?m)?\s*(?:just\s+|successfully\s+|now\s+)?(?:updated|deleted)\b/i;

const TRANSACTION_CONTEXT_PATTERN =
  /(?:transaction|expense|income|payment|purchase|spend|spending|category|merchant|recurring|subscription|€|\$|£|₦|¥|₹|\b\d+(?:[.,]\d{1,2})?\b)/i;

const STRICT_TRANSACTION_CONTEXT_PATTERN =
  /\b(?:transaction|expense|income|payment|purchase|recurring|subscription)\b/i;

// A strictly proposal-shaped phrasing. Used only to short-circuit the weaker
// SAVE_CLAIM_PATTERN path; it does NOT exempt assertive claims.
const PROPOSAL_PATTERN =
  /\b(?:i can|i could|would you like me to|should i|shall i|do you want me to|please confirm|let me know if)\b/i;

const GENERIC_SUCCESS_CLAIM_PATTERN =
  /\b(?:successfully\s+)?(?:created|updated|renamed|deleted|drafted|confirmed|set|saved)\b/i;

function isReadOnlyRecurringAction(toolResult: unknown): boolean {
  const action = typeof (toolResult as Record<string, unknown> | null)?.action ===
      "string"
    ? (toolResult as Record<string, string>).action
    : "";
  return action === "list_series" || action === "list_history";
}

export function isWriteMutationToolName(
  toolName: string | null,
  toolResult?: unknown,
): boolean {
  if (toolName === "manage_recurring" && isReadOnlyRecurringAction(toolResult)) {
    return false;
  }
  return (
    typeof toolName === "string" && WRITE_MUTATION_TOOL_NAMES.has(toolName)
  );
}

export type MutationClaimDiagnosis =
  | "ok"
  | "write_mutation_succeeded"
  | "empty"
  | "assertive_claim"
  | "generic_claim";

export function diagnoseUnsafeTransactionMutationClaim(params: {
  responseText: string;
  writeMutationSucceeded: boolean;
}): { blocked: boolean; reason: MutationClaimDiagnosis } {
  if (params.writeMutationSucceeded) {
    return { blocked: false, reason: "write_mutation_succeeded" };
  }
  const text = String(params.responseText || "").trim();
  if (!text) return { blocked: false, reason: "empty" };

  // Assertive first-person past-tense claim — never bypass.
  if (
    ASSERTIVE_SAVE_CLAIM_PATTERN.test(text) &&
    TRANSACTION_CONTEXT_PATTERN.test(text)
  ) {
    return { blocked: true, reason: "assertive_claim" };
  }
  if (
    ASSERTIVE_TRANSACTION_UPDATE_DELETE_CLAIM_PATTERN.test(text) &&
    STRICT_TRANSACTION_CONTEXT_PATTERN.test(text)
  ) {
    return { blocked: true, reason: "assertive_claim" };
  }

  // Weaker generic claim — bypass only if the message reads as a pure proposal.
  if (PROPOSAL_PATTERN.test(text)) {
    return { blocked: false, reason: "ok" };
  }
  if (SAVE_CLAIM_PATTERN.test(text) && TRANSACTION_CONTEXT_PATTERN.test(text)) {
    return { blocked: true, reason: "generic_claim" };
  }
  if (
    TRANSACTION_UPDATE_DELETE_CLAIM_PATTERN.test(text) &&
    STRICT_TRANSACTION_CONTEXT_PATTERN.test(text)
  ) {
    return { blocked: true, reason: "generic_claim" };
  }
  return { blocked: false, reason: "ok" };
}

export function shouldBlockUnsafeTransactionMutationClaim(params: {
  responseText: string;
  writeMutationSucceeded: boolean;
}): boolean {
  return diagnoseUnsafeTransactionMutationClaim(params).blocked;
}

export function buildUnsafeMutationClaimFallback(): string {
  return "I couldn't save that transaction just yet. Please try again in a moment.";
}

export function shouldBlockUnsafeGenericMutationClaim(params: {
  responseText: string;
  writeMutationSucceeded: boolean;
}): boolean {
  if (params.writeMutationSucceeded) return false;
  const responseText = String(params.responseText || "").trim();
  if (!responseText) return false;
  return GENERIC_SUCCESS_CLAIM_PATTERN.test(responseText);
}

export function buildUnsafeGenericMutationClaimFallback(): string {
  return "I couldn't complete that just yet. Please try again in a moment.";
}

// Exported for callers that want to force a tool call on the next model turn.
export const WRITE_MUTATION_FORCED_FUNCTION_CALLING_CONFIG = {
  mode: "ANY" as const,
  allowedFunctionNames: Array.from(WRITE_MUTATION_TOOL_NAMES),
};
