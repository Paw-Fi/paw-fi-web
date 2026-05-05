const WRITE_MUTATION_TOOL_NAMES = new Set([
  "add_transaction",
  "add_transactions_batch",
  "manage_recurring",
]);

// Generic past-tense mutation verbs (used only when no assertive first-person
// claim is present — otherwise we rely on the stronger ASSERTIVE pattern).
const SAVE_CLAIM_PATTERN =
  /\b(?:added|saved|logged|recorded|created|set up|updated|deleted)\b/i;

// Assertive first-person past-tense claims that the model uses when it
// hallucinates that a save happened. These must NOT be bypassed by the
// proposal/follow-up exemption because the model often chains a save claim
// with a "Would you like ..." offer per system prompt style guidelines.
// Examples it catches:
//   "I've added the €20 for KFC"
//   "I have logged your expense"
//   "I added ..." / "I saved ..." / "I've recorded ..." / "I created ..."
//   Also handles smart-quote apostrophes (\u2019) used by some models.
const ASSERTIVE_SAVE_CLAIM_PATTERN =
  /\bi\s*(?:['\u2019]\s*(?:ve|ll|d)|have|had|'?m)?\s*(?:just\s+|successfully\s+|now\s+)?(?:added|saved|logged|recorded|created|set\s*up|noted|stored|booked|captured|tracked)\b/i;

const TRANSACTION_CONTEXT_PATTERN =
  /(?:transaction|expense|income|payment|purchase|spend|spending|account|category|merchant|wallet|€|\$|£|₦|¥|₹|\b\d+(?:[.,]\d{1,2})?\b)/i;

// A strictly proposal-shaped phrasing. Used only to short-circuit the weaker
// SAVE_CLAIM_PATTERN path; it does NOT exempt assertive claims.
const PROPOSAL_PATTERN =
  /\b(?:i can|i could|would you like me to|should i|shall i|do you want me to|please confirm|let me know if)\b/i;

// Heuristic: does the incoming USER message look like a write intent?
// Requires an explicit amount plus either a mutation verb or a "for <token>"
// merchant hint. Language-agnostic for digits and common currency symbols.
const AMOUNT_PATTERN = /(?:[€$£₦¥₹]\s*)?\d+(?:[.,]\d{1,2})?/;
const WRITE_INTENT_KEYWORDS =
  /\b(?:for|spent|paid|bought|purchased|cost|log|logged|add|added|save|saved|record|recorded)\b/i;

export function isWriteMutationToolName(toolName: string | null): boolean {
  return (
    typeof toolName === "string" && WRITE_MUTATION_TOOL_NAMES.has(toolName)
  );
}

export function detectWriteIntentFromUserText(text: string): boolean {
  const value = String(text || "").trim();
  if (!value) return false;
  if (!AMOUNT_PATTERN.test(value)) return false;
  return WRITE_INTENT_KEYWORDS.test(value);
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

  // Weaker generic claim — bypass only if the message reads as a pure proposal.
  if (PROPOSAL_PATTERN.test(text)) {
    return { blocked: false, reason: "ok" };
  }
  if (
    SAVE_CLAIM_PATTERN.test(text) && TRANSACTION_CONTEXT_PATTERN.test(text)
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

// Exported for callers that want to force a tool call on the next model turn.
export const WRITE_MUTATION_FORCED_FUNCTION_CALLING_CONFIG = {
  mode: "ANY" as const,
  allowedFunctionNames: Array.from(WRITE_MUTATION_TOOL_NAMES),
};
