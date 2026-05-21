export const WALLET_LIST_PROMPT_RULE =
  'For questions like "what wallets do I have?", "list my wallets", or "show wallets", call `list_wallets`. Do NOT call `list_expenses`.';

export const WALLET_LIST_MISROUTE_ERROR =
  "This is a wallet request. Use list_wallets, not list_expenses.";

export function isWalletListRequest(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const normalized = text.trim();
  if (!normalized) return false;

  if (
    /\b(transaction|transactions|expense|expenses|spending|spend|spent|income|incomes)\b/i
      .test(
        normalized,
      )
  ) {
    return false;
  }

  return (
    /\b(wallet|wallets)\b/i.test(normalized) &&
    (/\b(what|which|show|list|see|available)\b/i.test(normalized) ||
      /\bdo\s+i\s+have\b/i.test(normalized))
  );
}

export function buildWalletListToolCall(): { name: "list_wallets"; args: {} } {
  return { name: "list_wallets", args: {} };
}

export function shouldBlockWalletListMisroute(
  text: unknown,
  toolName: unknown,
): boolean {
  return toolName === "list_expenses" && isWalletListRequest(text);
}

export function buildWalletListMisrouteResult(): { error: string } {
  return { error: WALLET_LIST_MISROUTE_ERROR };
}
