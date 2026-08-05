export const WALLET_LIST_PROMPT_RULE =
  'For questions like "what wallets do I have?", "list my wallets", or "show wallets", call `list_wallets`. Do NOT call `list_expenses`.';

export async function routeWalletMutationToolCall(params: {
  chat: { sendMessage: (message: unknown, options?: unknown) => Promise<any> };
  response: any;
  functionCalls: any[] | null | undefined;
}): Promise<{
  response: any;
  functionCalls: any[] | null | undefined;
  routed: boolean;
  routeMethod?: "model";
  reason?: "wallet_mutation_misroute" | "wallet_mutation_without_function_call";
  allowedToolNames?: string[];
}> {
  return {
    response: params.response,
    functionCalls: params.functionCalls,
    routed: false,
  };
}

export function shouldBlockUnsafeWalletMutationClaim(params: {
  responseText: string;
  writeMutationSucceeded: boolean;
}): boolean {
  if (params.writeMutationSucceeded) return false;
  const responseText = String(params.responseText || "").trim();
  if (!responseText) return false;
  return (
    /\bwallets?\b/i.test(responseText) &&
    /\b(?:successfully\s+)?(?:created|updated|renamed|changed|moved|transferred)\b/i.test(
      responseText,
    )
  );
}

export function buildUnsafeWalletMutationClaimFallback(): string {
  return "I couldn't complete that wallet action just yet. Please try again in a moment.";
}
