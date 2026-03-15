type OwnershipDecisionKind =
  | "claimed"
  | "owned_by_current_user"
  | "owned_by_another_user";

export const PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE =
  "PURCHASE_OWNED_BY_ANOTHER_ACCOUNT";

export interface IapAccountBinding {
  id: string;
  provider: string;
  original_transaction_id: string;
  user_id: string;
  first_seen_transaction_id: string | null;
  latest_transaction_id: string | null;
  store_product_id: string | null;
  app_store_environment: string | null;
  claim_source: string;
  claimed_at: string;
  last_verified_at: string;
  created_at: string;
  updated_at: string;
}

export interface OwnershipDecision {
  kind: OwnershipDecisionKind;
  binding: IapAccountBinding;
}

export interface EnsureOwnershipParams {
  supabase: any;
  provider: "app_store";
  originalTransactionId: string;
  currentUserId: string;
  transactionId?: string | null;
  storeProductId?: string | null;
  environment?: string | null;
  claimSource: string;
  nowIso?: string;
}

export function classifyOwnership(params: {
  existingOwnerUserId: string | null;
  currentUserId: string;
}): OwnershipDecisionKind | null {
  const { existingOwnerUserId, currentUserId } = params;
  if (!existingOwnerUserId) return null;
  if (existingOwnerUserId === currentUserId) {
    return "owned_by_current_user";
  }
  return "owned_by_another_user";
}

export function purchaseOwnershipConflictMessage(): string {
  return "This App Store purchase is already linked to another Moneko account. Sign in to the original account to restore access.";
}

export async function hasAppStoreOwnershipConflict(params: {
  supabase: any;
  originalTransactionId: string;
}): Promise<boolean> {
  const { data, error } = await params.supabase
    .from("iap_account_binding_conflicts")
    .select("id")
    .eq("provider", "app_store")
    .eq("original_transaction_id", params.originalTransactionId)
    .is("resolved_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to read purchase ownership conflicts: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }

  return !!data;
}

export async function getAppStoreOwnershipBinding(params: {
  supabase: any;
  originalTransactionId: string;
}): Promise<IapAccountBinding | null> {
  const { data, error } = await params.supabase
    .from("iap_account_bindings")
    .select("*")
    .eq("provider", "app_store")
    .eq("original_transaction_id", params.originalTransactionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to read purchase ownership: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }

  return (data as IapAccountBinding | null) ?? null;
}

function buildBindingUpdate(params: {
  transactionId?: string | null;
  storeProductId?: string | null;
  environment?: string | null;
  claimSource: string;
  nowIso: string;
}) {
  return {
    latest_transaction_id: params.transactionId ?? null,
    store_product_id: params.storeProductId ?? null,
    app_store_environment: params.environment ?? null,
    claim_source: params.claimSource,
    last_verified_at: params.nowIso,
    updated_at: params.nowIso,
  };
}

export async function ensureAppStoreOwnership(
  params: EnsureOwnershipParams,
): Promise<OwnershipDecision> {
  const now = params.nowIso ?? new Date().toISOString();

  const { data: existingBinding, error: existingBindingError } = await params
    .supabase.from("iap_account_bindings")
    .select("*")
    .eq("provider", params.provider)
    .eq("original_transaction_id", params.originalTransactionId)
    .maybeSingle();

  if (existingBindingError) {
    throw new Error(
      `Failed to look up purchase ownership: ${
        existingBindingError.message ?? existingBindingError.code ??
          String(existingBindingError)
      }`,
    );
  }

  const ownership = classifyOwnership({
    existingOwnerUserId: existingBinding?.user_id ?? null,
    currentUserId: params.currentUserId,
  });

  if (ownership === "owned_by_another_user") {
    return {
      kind: ownership,
      binding: existingBinding as IapAccountBinding,
    };
  }

  if (ownership === "owned_by_current_user") {
    const updatePayload = buildBindingUpdate({
      transactionId: params.transactionId,
      storeProductId: params.storeProductId,
      environment: params.environment,
      claimSource: params.claimSource,
      nowIso: now,
    });

    const { data: updatedBinding, error: updateError } = await params.supabase
      .from("iap_account_bindings")
      .update(updatePayload)
      .eq("id", existingBinding.id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        `Failed to update purchase ownership: ${
          updateError.message ?? updateError.code ?? String(updateError)
        }`,
      );
    }

    return {
      kind: ownership,
      binding: updatedBinding as IapAccountBinding,
    };
  }

  const insertPayload = {
    provider: params.provider,
    original_transaction_id: params.originalTransactionId,
    user_id: params.currentUserId,
    first_seen_transaction_id: params.transactionId ?? null,
    latest_transaction_id: params.transactionId ?? null,
    store_product_id: params.storeProductId ?? null,
    app_store_environment: params.environment ?? null,
    claim_source: params.claimSource,
    claimed_at: now,
    last_verified_at: now,
    created_at: now,
    updated_at: now,
  };

  const { data: createdBinding, error: insertError } = await params.supabase
    .from("iap_account_bindings")
    .insert(insertPayload)
    .select("*")
    .single();

  if (!insertError) {
    return {
      kind: "claimed",
      binding: createdBinding as IapAccountBinding,
    };
  }

  if (insertError.code !== "23505") {
    throw new Error(
      `Failed to claim purchase ownership: ${
        insertError.message ?? insertError.code ?? String(insertError)
      }`,
    );
  }

  const { data: racedBinding, error: racedBindingError } = await params.supabase
    .from("iap_account_bindings")
    .select("*")
    .eq("provider", params.provider)
    .eq("original_transaction_id", params.originalTransactionId)
    .single();

  if (racedBindingError) {
    throw new Error(
      `Failed to resolve purchase ownership after conflict: ${
        racedBindingError.message ?? racedBindingError.code ??
          String(racedBindingError)
      }`,
    );
  }

  if (racedBinding.user_id === params.currentUserId) {
    const updatePayload = buildBindingUpdate({
      transactionId: params.transactionId,
      storeProductId: params.storeProductId,
      environment: params.environment,
      claimSource: params.claimSource,
      nowIso: now,
    });

    const { data: updatedBinding, error: updateError } = await params.supabase
      .from("iap_account_bindings")
      .update(updatePayload)
      .eq("id", racedBinding.id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(
        `Failed to update purchase ownership after race: ${
          updateError.message ?? updateError.code ?? String(updateError)
        }`,
      );
    }

    return {
      kind: "owned_by_current_user",
      binding: updatedBinding as IapAccountBinding,
    };
  }

  return {
    kind: "owned_by_another_user",
    binding: racedBinding as IapAccountBinding,
  };
}
