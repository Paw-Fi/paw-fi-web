import { buildBudgetDoneText } from "./budget-utils.ts";
import {
  buildUngroundedVerificationClaimFallback,
  buildUnsafeGenericMutationClaimFallback,
  buildUnsafeMutationClaimFallback,
  diagnoseUngroundedVerificationClaim,
  diagnoseUnsafeTransactionMutationClaim,
  isWriteMutationToolName,
  shouldBlockUnsafeGenericMutationClaim,
} from "./mutation-claim-guard.ts";
import {
  buildUnsafeWalletMutationClaimFallback,
  shouldBlockUnsafeWalletMutationClaim,
} from "./wallet-intent.ts";

type MutationClaimGuardKind =
  | "transaction"
  | "wallet"
  | "generic"
  | "verification";

type MutationClaimGuardLogContext = {
  lastToolCallName: string | null;
  writeMutationSucceededAny: boolean;
  lookupSucceededAny?: boolean;
  responseTextPreview: string;
  reason?: string;
};

const INTERNAL_TOOL_JARGON_PATTERN =
  /\b(?:tool|[a-z][a-z0-9]*_[a-z0-9_]+|edge\s+function|backend|server|database|api|non-2xx|rpc|http\s*\d{3}|status\s*(?:code|=)|uuid|internal\s+key)\b/i;

function hasInternalToolJargon(params: {
  responseText: string;
  toolErrorTexts: readonly string[];
}): boolean {
  const responseText = params.responseText.trim();
  if (INTERNAL_TOOL_JARGON_PATTERN.test(responseText)) return true;
  const normalizedResponseText = responseText.toLowerCase();
  return params.toolErrorTexts.some((error) => {
    const normalizedError = error.trim().toLowerCase();
    return normalizedError.length >= 12 &&
      normalizedResponseText.includes(normalizedError);
  });
}

export function applyBotMutationClaimGuards(params: {
  finalResponseText: string;
  lastToolCallName: string | null;
  lastToolResult: unknown;
  writeMutationSucceededAny: boolean;
  // True when a record lookup tool succeeded on this turn. When omitted the
  // verification-claim guard is skipped (caller has not wired lookup tracking).
  lookupSucceededAny?: boolean;
  onBlocked?: (
    kind: MutationClaimGuardKind,
    context: MutationClaimGuardLogContext,
  ) => void;
}): string {
  let finalResponseText = params.finalResponseText;
  const lastToolWasWrite = isWriteMutationToolName(
    params.lastToolCallName,
    params.lastToolResult,
  );
  // After a write tool the full diagnosis applies. After a read-only or
  // analysis tool (analyze_expense, list_expenses, ...) nothing was persisted,
  // so an assertive first-person save claim is still ungrounded; only the
  // weaker generic verbs are tolerated there because they can describe data.
  const finalDiag = params.lastToolCallName
    ? diagnoseUnsafeTransactionMutationClaim({
      responseText: finalResponseText,
      writeMutationSucceeded: params.writeMutationSucceededAny,
      assertiveOnly: !lastToolWasWrite,
    })
    : { blocked: false, reason: "ok" as const };
  if (finalDiag.blocked) {
    params.onBlocked?.("transaction", {
      lastToolCallName: params.lastToolCallName,
      writeMutationSucceededAny: params.writeMutationSucceededAny,
      reason: finalDiag.reason,
      responseTextPreview: finalResponseText.slice(0, 200),
    });
    finalResponseText = buildUnsafeMutationClaimFallback();
  }
  if (
    isWriteMutationToolName(params.lastToolCallName, params.lastToolResult) &&
    shouldBlockUnsafeWalletMutationClaim({
      responseText: finalResponseText,
      writeMutationSucceeded: params.writeMutationSucceededAny,
    })
  ) {
    params.onBlocked?.("wallet", {
      lastToolCallName: params.lastToolCallName,
      writeMutationSucceededAny: params.writeMutationSucceededAny,
      responseTextPreview: finalResponseText.slice(0, 200),
    });
    finalResponseText = buildUnsafeWalletMutationClaimFallback();
  }
  if (
    isWriteMutationToolName(params.lastToolCallName, params.lastToolResult) &&
    shouldBlockUnsafeGenericMutationClaim({
      responseText: finalResponseText,
      writeMutationSucceeded: params.writeMutationSucceededAny,
    })
  ) {
    params.onBlocked?.("generic", {
      lastToolCallName: params.lastToolCallName,
      writeMutationSucceededAny: params.writeMutationSucceededAny,
      responseTextPreview: finalResponseText.slice(0, 200),
    });
    finalResponseText = buildUnsafeGenericMutationClaimFallback();
  }
  if (params.lookupSucceededAny !== undefined) {
    const verificationDiag = diagnoseUngroundedVerificationClaim({
      responseText: finalResponseText,
      writeMutationSucceeded: params.writeMutationSucceededAny,
      lookupSucceeded: params.lookupSucceededAny,
    });
    if (verificationDiag.blocked) {
      params.onBlocked?.("verification", {
        lastToolCallName: params.lastToolCallName,
        writeMutationSucceededAny: params.writeMutationSucceededAny,
        lookupSucceededAny: params.lookupSucceededAny,
        reason: verificationDiag.reason,
        responseTextPreview: finalResponseText.slice(0, 200),
      });
      finalResponseText = buildUngroundedVerificationClaimFallback();
    }
  }
  return finalResponseText;
}

export function finalizeBotResponseText(params: {
  finalResponseText: string;
  toolSucceededAny: boolean;
  lastBudgetPockets: Array<{ name: string; percentage: number }> | null;
  lastToolCallName: string | null;
  lastToolResult: any;
  toolErrorTexts?: readonly string[];
  writeMutationSucceededAny: boolean;
  lookupSucceededAny?: boolean;
  emptyFallbackText: string;
  onMutationClaimBlocked?: (
    kind: MutationClaimGuardKind,
    context: MutationClaimGuardLogContext,
  ) => void;
}): string {
  let finalResponseText = params.finalResponseText;
  if (
    (!finalResponseText || !finalResponseText.trim()) &&
    params.toolSucceededAny &&
    params.lastBudgetPockets
  ) {
    finalResponseText = buildBudgetDoneText(params.lastBudgetPockets);
  }

  if (
    (!finalResponseText || !finalResponseText.trim()) &&
    params.lastToolCallName === "update_transaction" &&
    typeof params.lastToolResult?.error === "string" &&
    params.lastToolResult.error.trim()
  ) {
    finalResponseText =
      "I couldn't update that transaction right now. Please try again in a moment.";
  }

  if (
    hasInternalToolJargon({
      responseText: finalResponseText,
      toolErrorTexts: params.toolErrorTexts || [],
    })
  ) {
    finalResponseText =
      "I couldn't complete that just yet. Please check the details and try again.";
  }

  finalResponseText = applyBotMutationClaimGuards({
    finalResponseText,
    lastToolCallName: params.lastToolCallName,
    lastToolResult: params.lastToolResult,
    writeMutationSucceededAny: params.writeMutationSucceededAny,
    lookupSucceededAny: params.lookupSucceededAny,
    onBlocked: params.onMutationClaimBlocked,
  });

  if (!finalResponseText || !finalResponseText.trim()) {
    finalResponseText = params.emptyFallbackText;
  }
  return finalResponseText;
}
