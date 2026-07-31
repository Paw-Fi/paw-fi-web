export interface PlaidDuplicateRecoveryAccess {
  canManageScope: boolean;
  connectionIds: string[];
}

export async function resolveManageablePlaidDuplicateConnectionIds(params: {
  supabase: { from: (table: string) => any };
  connectionIds: string[];
  userId: string;
  targetHouseholdId: string | null;
}): Promise<PlaidDuplicateRecoveryAccess> {
  const connectionIds = Array.from(new Set(params.connectionIds)).sort();
  if (connectionIds.length === 0) {
    return { canManageScope: true, connectionIds: [] };
  }

  const { data: connections, error: connectionsError } = await params.supabase
    .from("bank_connections")
    .select("id, user_id, household_id")
    .in("id", connectionIds)
    .eq("provider", "plaid")
    .is("removed_at", null)
    .in("status", ["pending", "active", "needs_reauth", "error"])
    .or("item_status.is.null,item_status.not.in.(removed,pending_removal)");
  if (connectionsError) throw connectionsError;

  const rows = (connections || []) as Array<{
    id: string;
    user_id: string;
    household_id?: string | null;
  }>;
  if (!params.targetHouseholdId) {
    return {
      canManageScope: true,
      connectionIds: rows
        .filter(
          (connection) =>
            connection.user_id === params.userId && !connection.household_id,
        )
        .map((connection) => connection.id)
        .sort(),
    };
  }

  const { data: membership, error: membershipError } = await params.supabase
    .from("household_members")
    .select("role")
    .eq("household_id", params.targetHouseholdId)
    .eq("user_id", params.userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { canManageScope: false, connectionIds: [] };
  }

  return {
    canManageScope: true,
    connectionIds: rows
      .filter(
        (connection) => connection.household_id === params.targetHouseholdId,
      )
      .map((connection) => connection.id)
      .sort(),
  };
}
