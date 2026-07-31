export interface PlaidConnectionAccessDecision {
  exists: boolean;
  canView: boolean;
  canManage: boolean;
  roleGuidance: string | null;
}

/** One policy for Link updates, disconnects, and duplicate recovery. */
export async function resolvePlaidConnectionAccess(params: {
  supabase: { from: (table: string) => any };
  connection: { user_id?: string | null; household_id?: string | null } | null;
  userId: string;
}): Promise<PlaidConnectionAccessDecision> {
  const connection = params.connection;
  if (!connection) {
    return {
      exists: false,
      canView: false,
      canManage: false,
      roleGuidance: null,
    };
  }
  if (!connection.household_id) {
    const isOwner = connection.user_id === params.userId;
    return {
      exists: true,
      canView: isOwner,
      canManage: isOwner,
      roleGuidance: null,
    };
  }
  const { data, error } = await params.supabase
    .from("household_members")
    .select("role")
    .eq("household_id", connection.household_id)
    .eq("user_id", params.userId)
    .maybeSingle();
  if (error) throw error;
  const role = data?.role as string | undefined;
  const canManage = role === "owner" || role === "admin";
  return {
    exists: true,
    canView: Boolean(role),
    canManage,
    roleGuidance: role && !canManage
      ? "A household owner or admin must manage this bank connection."
      : null,
  };
}
