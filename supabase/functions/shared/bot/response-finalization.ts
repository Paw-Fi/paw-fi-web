import { buildBudgetDoneText } from "./budget-utils.ts";
import {
  buildGenericMutationFailureText,
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
import { buildTransactionMutationFailureText } from "./transaction-tool.ts";
import { buildWalletMutationFailureText } from "./wallet-tools.ts";

type MutationClaimGuardKind = "transaction" | "wallet" | "generic";

type MutationClaimGuardLogContext = {
  lastToolCallName: string | null;
  writeMutationSucceededAny: boolean;
  responseTextPreview: string;
  reason?: string;
};

export function buildBotMutationFailureText(
  toolName: string | null,
  toolResult: unknown,
  options: { includeDeleteTransactionFallback?: boolean } = {},
): string | null {
  const sharedText = buildTransactionMutationFailureText(toolName, toolResult);
  if (sharedText) return sharedText;
  const walletText = buildWalletMutationFailureText(toolName, toolResult);
  if (walletText) return walletText;
  const genericText = buildGenericMutationFailureText(toolName, toolResult);
  if (genericText) return genericText;
  if (options.includeDeleteTransactionFallback && toolName === "delete_transaction") {
    return "I couldn't delete that transaction right now. Please try again in a moment.";
  }
  return null;
}

export function applyBotMutationClaimGuards(params: {
  finalResponseText: string;
  lastToolCallName: string | null;
  writeMutationSucceededAny: boolean;
  onBlocked?: (
    kind: MutationClaimGuardKind,
    context: MutationClaimGuardLogContext,
  ) => void;
}): string {
  let finalResponseText = params.finalResponseText;
  const shouldCheckTransactionClaim = isWriteMutationToolName(
    params.lastToolCallName,
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
    isWriteMutationToolName(params.lastToolCallName) &&
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
    isWriteMutationToolName(params.lastToolCallName) &&
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
  writeMutationSucceededAny: boolean;
  emptyFallbackText: string;
  mutationFailureOptions?: { includeDeleteTransactionFallback?: boolean };
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

  const mutationFailureText = buildBotMutationFailureText(
    params.lastToolCallName,
    params.lastToolResult,
    params.mutationFailureOptions,
  );
  if (typeof mutationFailureText === "string") {
    finalResponseText = mutationFailureText;
  }

  if (
    (!finalResponseText || !finalResponseText.trim()) &&
    params.lastToolCallName === "update_transaction" &&
    typeof params.lastToolResult?.error === "string" &&
    params.lastToolResult.error.trim()
  ) {
    const errorSnippet = params.lastToolResult.error.trim().slice(0, 180);
    finalResponseText = `I couldn't update that transaction. ${errorSnippet}`;
  }

  finalResponseText = applyBotMutationClaimGuards({
    finalResponseText,
    lastToolCallName: params.lastToolCallName,
    writeMutationSucceededAny: params.writeMutationSucceededAny,
    onBlocked: params.onMutationClaimBlocked,
  });

  if (!finalResponseText || !finalResponseText.trim()) {
    finalResponseText = params.emptyFallbackText;
  }
  return finalResponseText;
}
