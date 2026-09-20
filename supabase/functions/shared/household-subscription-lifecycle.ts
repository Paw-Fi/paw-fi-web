type RpcError = {
  message?: string;
};

export type HouseholdSubscriptionLifecycleClient = {
  rpc: (
    functionName: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: RpcError | null }>;
};

const TERMINAL_STATUSES = new Set([
  "canceled",
  "unpaid",
  "incomplete_expired",
]);

export async function reconcileHouseholdSubscriptionLifecycle(params: {
  supabase: HouseholdSubscriptionLifecycleClient;
  ownerUserId: string;
  plan: string;
  status: string;
}): Promise<number> {
  const isTerminal = TERMINAL_STATUSES.has(params.status);
  const functionName = isTerminal
    ? "cascade_subscription_cancellation"
    : "cascade_subscription_upgrade";
  const rpcParams = isTerminal ? { p_owner_user_id: params.ownerUserId } : {
    p_owner_user_id: params.ownerUserId,
    p_new_plan: params.plan,
    p_new_status: params.status,
  };
  const { data, error } = await params.supabase.rpc(functionName, rpcParams);

  if (error) {
    throw new Error(
      `failed to reconcile household subscription lifecycle: ${
        error.message ?? "unknown RPC error"
      }`,
    );
  }

  return typeof data === "number" ? data : 0;
}
