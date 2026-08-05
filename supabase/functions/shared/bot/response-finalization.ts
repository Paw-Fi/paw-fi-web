import { buildBudgetDoneText } from "./budget-utils.ts";
import {
  buildUnsafeGenericMutationClaimFallback,
  buildUnsafeMutationClaimFallback,
  diagnoseUnsafeTransactionMutationClaim,
  isWriteMutationToolName,
  shouldBlockUnsafeGenericMutationClaim,
} from "./mutation-claim-guard.ts";
import {
  buildUnsafeWalletMutationClaimFallback,
  shouldBlockUnsafeWalletMutationClaim,
} from "./wallet-intent.ts";

type MutationClaimGuardKind = "transaction" | "wallet" | "generic";

type MutationClaimGuardLogContext = {
  lastToolCallName: string | null;
  writeMutationSucceededAny: boolean;
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
  onBlocked?: (
    kind: MutationClaimGuardKind,
    context: MutationClaimGuardLogContext,
  ) => void;
}): string {
  let finalResponseText = params.finalResponseText;
  const shouldCheckTransactionClaim = isWriteMutationToolName(
    params.lastToolCallName,
    params.lastToolResult,
  );
  const finalDiag = shouldCheckTransactionClaim
    ? diagnoseUnsafeTransactionMutationClaim({
      responseText: finalResponseText,
      writeMutationSucceeded: params.writeMutationSucceededAny,
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
    onBlocked: params.onMutationClaimBlocked,
  });

  if (!finalResponseText || !finalResponseText.trim()) {
    finalResponseText = params.emptyFallbackText;
  }
  return finalResponseText;
}
