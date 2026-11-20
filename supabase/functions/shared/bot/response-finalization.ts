import { botMessage } from "./bot-messages.ts";
import { buildBudgetDoneText } from "./budget-utils.ts";

// Machine tokens only (identifiers, transport codes). Natural-language leaks
// are judged by the multilingual reply verifier, not by word lists.
const INTERNAL_IDENTIFIER_PATTERN =
  /\b[a-z][a-z0-9]*_[a-z0-9_]+\b|\bnon-2xx\b|\bhttp\s*\d{3}\b|\buuid\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

function hasInternalIdentifiers(params: {
  responseText: string;
  toolErrorTexts: readonly string[];
}): boolean {
  const responseText = params.responseText.trim();
  if (INTERNAL_IDENTIFIER_PATTERN.test(responseText)) return true;
  const normalizedResponseText = responseText.toLowerCase();
  return params.toolErrorTexts.some((error) => {
    const normalizedError = error.trim().toLowerCase();
    return normalizedError.length >= 12 &&
      normalizedResponseText.includes(normalizedError);
  });
}

// Last step before delivery. Every sentence written here is backend-authored,
// localized, and chosen so that it is true given the tool outcomes alone.
export function finalizeBotResponseText(params: {
  finalResponseText: string;
  toolSucceededAny: boolean;
  lastBudgetPockets: Array<{ name: string; percentage: number }> | null;
  lastToolCallName: string | null;
  // deno-lint-ignore no-explicit-any
  lastToolResult: any;
  toolErrorTexts?: readonly string[];
  writeSucceeded: boolean;
  writeFailed: boolean;
  language: string;
}): string {
  let finalResponseText = params.finalResponseText;
  const isEmpty = () => !finalResponseText || !finalResponseText.trim();
  if (isEmpty() && params.toolSucceededAny && params.lastBudgetPockets) {
    finalResponseText = buildBudgetDoneText(
      params.lastBudgetPockets,
      params.language,
    );
  }

  if (
    isEmpty() &&
    params.lastToolCallName === "update_transaction" &&
    typeof params.lastToolResult?.error === "string" &&
    params.lastToolResult.error.trim()
  ) {
    finalResponseText = botMessage("updateFailed", params.language);
  }

  if (
    hasInternalIdentifiers({
      responseText: finalResponseText,
      toolErrorTexts: params.toolErrorTexts || [],
    })
  ) {
    finalResponseText = botMessage(
      params.writeSucceeded
        ? "actionCompleted"
        : params.writeFailed
        ? "outcomeUnconfirmed"
        : "checkDetails",
      params.language,
    );
  }

  if (isEmpty()) {
    // Never invite a retry after a confirmed write: that would duplicate it.
    finalResponseText = botMessage(
      params.writeSucceeded
        ? "actionCompleted"
        : params.writeFailed
        ? "outcomeUnconfirmed"
        : "emptyReply",
      params.language,
    );
  }
  return finalResponseText;
}
