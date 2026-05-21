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

export function isWriteMutationToolName(toolName: string | null): boolean {
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
  return "I couldn't save that transaction yet because the save step didn't complete. Please send it again or confirm the amount, category, and date.";
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
  return "I couldn't complete that action because the tool did not confirm success. Please try again.";
}

export function buildGenericMutationFailureText(
  toolName: string | null,
  toolResult: unknown,
): string | null {
  const error =
    typeof (toolResult as Record<string, any> | null)?.error === "string"
      ? (toolResult as Record<string, string>).error.trim()
      : "";
  if (!error) return null;

  if (toolName === "create_space")
    return `I couldn't create that space. ${error}`;
  if (toolName === "create_space_invite")
    return `I couldn't create that invitation link. ${error}`;
  if (toolName === "set_default_space")
    return `I couldn't update your default space. ${error}`;
  if (toolName === "get_space_info")
    return `I couldn't get that space info. ${error}`;
  if (toolName === "update_space_settings")
    return `I couldn't update that space. ${error}`;
  if (toolName === "draft_budget")
    return `I couldn't draft that budget. ${error}`;
  if (toolName === "confirm_budget")
    return `I couldn't confirm that budget. ${error}`;
  if (toolName === "set_budget") return `I couldn't set that budget. ${error}`;
  if (toolName === "set_pocket")
    return `I couldn't update that pocket. ${error}`;
  if (toolName === "delete_pocket")
    return `I couldn't delete that pocket. ${error}`;
  if (toolName === "delete_transaction")
    return `I couldn't delete that transaction. ${error}`;
  return null;
}

// Exported for callers that want to force a tool call on the next model turn.
export const WRITE_MUTATION_FORCED_FUNCTION_CALLING_CONFIG = {
  mode: "ANY" as const,
  allowedFunctionNames: Array.from(WRITE_MUTATION_TOOL_NAMES),
};
