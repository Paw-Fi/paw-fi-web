import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUserOrInternal } from "../shared/auth.ts";
import { assertScopeAccess } from "../shared/accounts.ts";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { decryptSecret } from "../shared/token-encryption.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  canUsePlaidBankSync,
  loadPlaidUserAccessState,
} from "../shared/plaid-access.ts";
import { canRequestPlaidManualRefresh } from "../shared/plaid-lifecycle.ts";
import {
  getPlaidAccounts,
  PlaidError,
  PLAID_PROVIDER,
  requestPlaidTransactionsRefresh,
} from "../shared/plaid-client.ts";
import { fetchAndStorePlaidInstitutionLogo } from "../shared/plaid-institution-logo.ts";
import { removePlaidConnection } from "../shared/plaid-remove.ts";
import {
  findMissingPlaidSelectedAccountIds,
  normalizePlaidSelectedAccountIds,
  resolvePlaidAccountsToDisableAfterUpdate,
} from "../shared/plaid-update-mode.ts";
import {
  loadLinkedWalletsForBankAccounts,
  preparePlaidAccounts,
  sanitizeOptionalUuid,
} from "../shared/bank-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type PlaidItemAction =
  | "request_refresh"
  | "remove_item"
  | "update_mode_complete";

interface PlaidItemControlBody {
  action?: PlaidItemAction;
  connectionId?: string;
  reason?: string;
  linkRequestId?: string;
  linkSessionId?: string;
  institutionId?: string;
  institutionName?: string;
  selectedAccounts?: unknown;
  targetHouseholdId?: string;
  updateCompletionNonce?: string;
  mode?: string;
}

function isSupportedAction(value: unknown): value is PlaidItemAction {
  return (
    value === "request_refresh" ||
    value === "remove_item" ||
    value === "update_mode_complete"
  );
}

Deno.serve(async (req) => {
  const debugId = crypto.randomUUID();
  let body: PlaidItemControlBody = {};

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = getCorsHeaders(req.headers.get("Origin") || undefined);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  try {
    body = (await req.json().catch(() => ({}))) as PlaidItemControlBody;

    if (!isSupportedAction(body.action)) {
      return new Response(
        JSON.stringify({
          error:
            "action must be one of: request_refresh, remove_item, update_mode_complete",
        }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (!body.connectionId) {
      return new Response(
        JSON.stringify({ error: "connectionId is required" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-plaid-item-control" },
      },
    });

    const authResult = await authenticateUserOrInternal(
      req,
      supabase,
      body.connectionId,
    );
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const { data: connection, error: connectionError } = await supabase
      .from("bank_connections")
      .select(
        "id, user_id, provider, household_id, status, item_status, item_health_state, relink_state, metadata, country_code, access_token_encrypted, plaid_access_token_encrypted, last_successful_sync_at, next_manual_refresh_eligible_at, removed_at",
      )
      .eq("id", body.connectionId)
      .eq("provider", PLAID_PROVIDER)
      .maybeSingle();

    if (connectionError) {
      throw connectionError;
    }

    if (!connection || connection.user_id !== authResult.userId) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (body.action === "remove_item") {
      console.log(
        "[plaid-item-control] remove_item started",
        JSON.stringify({
          debugId,
          connectionId: connection.id,
          userId: authResult.userId,
          itemStatus: connection.item_status ?? null,
          itemHealthState: connection.item_health_state ?? null,
          removedAt: connection.removed_at ?? null,
          hasAccessToken: Boolean(
            connection.access_token_encrypted ||
              connection.plaid_access_token_encrypted,
          ),
        }),
      );

      if (connection.removed_at) {
        return new Response(
          JSON.stringify({
            success: true,
            action: body.action,
            alreadyRemoved: true,
          }),
          {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      try {
        await removePlaidConnection({
          supabase,
          connection,
          removalReason: body.reason || "manual_remove",
        });
      } catch (error) {
        console.error(
          "[plaid-item-control] Plaid item removal failed",
          JSON.stringify({
            debugId,
            connectionId: connection.id,
            action: body.action,
            ...serializeErrorForLog(error),
          }),
        );

        const { data: removalState, error: removalStateError } = await supabase
          .from("bank_connections")
          .select(
            "item_status, item_health_state, scheduled_removal_at, error_code",
          )
          .eq("id", connection.id)
          .maybeSingle();

        if (removalStateError) {
          console.error(
            "[plaid-item-control] Failed to load removal state",
            JSON.stringify({
              debugId,
              connectionId: connection.id,
              ...serializeErrorForLog(removalStateError),
            }),
          );
          throw removalStateError;
        }

        if (
          removalState?.item_status === "pending_removal" ||
          removalState?.item_health_state === "removal_pending"
        ) {
          return new Response(
            JSON.stringify({
              success: true,
              action: body.action,
              status: "pending_removal",
              retryable: true,
              debugId,
              scheduledRemovalAt: removalState.scheduled_removal_at ?? null,
              errorCode:
                removalState.error_code ?? "PLAID_REMOVE_RETRY_PENDING",
              message:
                "Bank disconnect is queued. Plaid removal is usually immediate once accepted; if cleanup is still pending, Moneko retries about every 15 minutes.",
            }),
            {
              status: 202,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }

        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: body.action,
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (body.action === "update_mode_complete") {
      const accessState = await loadPlaidUserAccessState(
        supabase,
        authResult.userId,
      );

      if (!canUsePlaidBankSync(accessState)) {
        return new Response(
          JSON.stringify({
            error:
              "Bank sync is available during an active trial or with an active paid plan.",
            errorCode: "plaid_subscription_required",
          }),
          {
            status: 403,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const updateCompletionNonce = body.updateCompletionNonce?.trim();
      if (!updateCompletionNonce) {
        return new Response(
          JSON.stringify({ error: "updateCompletionNonce is required" }),
          {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const targetHouseholdId = sanitizeOptionalUuid(body.targetHouseholdId);
      if (body.targetHouseholdId && !targetHouseholdId) {
        return new Response(
          JSON.stringify({ error: "Invalid targetHouseholdId" }),
          {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      if (
        targetHouseholdId &&
        !(await assertScopeAccess(
          supabase,
          authResult.userId,
          targetHouseholdId,
        ))
      ) {
        return new Response(JSON.stringify({ error: "Forbidden scope" }), {
          status: 403,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      const connectionHouseholdId = connection.household_id ?? null;
      if (
        body.targetHouseholdId &&
        targetHouseholdId !== connectionHouseholdId
      ) {
        return new Response(
          JSON.stringify({
            error: "Bank connection belongs to a different wallet space",
            errorCode: "connection_scope_mismatch",
          }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const selectedAccountIds = normalizePlaidSelectedAccountIds(
        body.selectedAccounts,
      );
      const requiresAccountSelection =
        connection.relink_state === "new_accounts_available";
      if (requiresAccountSelection && selectedAccountIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "selectedAccounts is required" }),
          {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const { data: claimedUpdateSessions, error: updateSessionError } =
        await supabase.rpc("claim_plaid_link_completion_session", {
          p_user_id: authResult.userId,
          p_connection_id: connection.id,
          p_nonce: updateCompletionNonce,
          p_mode: body.mode === "reconnect" ? "reconnect" : "update",
        });

      if (updateSessionError) {
        throw updateSessionError;
      }

      const updateSession = Array.isArray(claimedUpdateSessions)
        ? claimedUpdateSessions[0]
        : null;
      if (!updateSession?.id) {
        return new Response(
          JSON.stringify({
            error: "Invalid, busy, consumed, or expired update completion",
          }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const metadata =
        connection.metadata && typeof connection.metadata === "object"
          ? (connection.metadata as Record<string, unknown>)
          : {};
      let institutionLogoUrl =
        typeof metadata.institution_logo_url === "string"
          ? metadata.institution_logo_url.trim() || null
          : null;
      let institutionPrimaryColor =
        typeof metadata.institution_primary_color === "string"
          ? metadata.institution_primary_color.trim() || null
          : null;
      const metadataInstitutionId =
        typeof metadata.institution_id === "string"
          ? metadata.institution_id.trim() || null
          : null;
      const resolvedInstitutionId =
        body.institutionId?.trim() || metadataInstitutionId;
      if (
        (!institutionLogoUrl || !institutionPrimaryColor) &&
        resolvedInstitutionId
      ) {
        try {
          const storedLogo = await fetchAndStorePlaidInstitutionLogo({
            supabase,
            userId: authResult.userId,
            institutionId: resolvedInstitutionId,
            countryCode: connection.country_code,
          });
          institutionLogoUrl = storedLogo?.publicUrl ?? null;
          institutionPrimaryColor =
            storedLogo?.primaryColor ?? institutionPrimaryColor;
        } catch (logoError) {
          console.warn(
            "[plaid-item-control] Failed to fetch/store institution logo",
            JSON.stringify({
              connectionId: connection.id,
              institutionId: resolvedInstitutionId,
              error:
                logoError instanceof Error
                  ? logoError.message
                  : String(logoError),
            }),
          );
          await reportEdgeFunctionError({
            functionName: "plaid-item-control",
            error: logoError,
            context: {
              stage: "institution_logo_fetch_store",
              debug_id: debugId,
              action: body.action ?? null,
              connection_id: connection.id,
              institution_id: resolvedInstitutionId,
              country_code: connection.country_code ?? null,
              link_request_id: body.linkRequestId || null,
              link_session_id: body.linkSessionId || null,
            },
          });
        }
      }
      let effectiveSelectedAccountIds = selectedAccountIds;
      if (
        !requiresAccountSelection &&
        effectiveSelectedAccountIds.length === 0
      ) {
        const metadataAccountIds = Array.isArray(
          metadata.plaid_selected_account_ids,
        )
          ? metadata.plaid_selected_account_ids
              .map((value) => String(value || "").trim())
              .filter(Boolean)
          : [];
        if (metadataAccountIds.length > 0) {
          effectiveSelectedAccountIds = Array.from(
            new Set(metadataAccountIds),
          ).sort();
        } else {
          const { data: existingBankAccounts, error: existingAccountsError } =
            await supabase
              .from("bank_accounts")
              .select("provider_account_id, plaid_account_id")
              .eq("bank_connection_id", connection.id)
              .eq("provider", PLAID_PROVIDER);

          if (existingAccountsError) {
            throw existingAccountsError;
          }

          effectiveSelectedAccountIds = Array.from(
            new Set(
              ((existingBankAccounts || []) as Array<Record<string, unknown>>)
                .map((account) =>
                  String(
                    account.provider_account_id ||
                      account.plaid_account_id ||
                      "",
                  ).trim(),
                )
                .filter(Boolean),
            ),
          ).sort();
        }
      }

      const encryptedToken =
        connection.access_token_encrypted ||
        connection.plaid_access_token_encrypted;
      if (!encryptedToken) {
        return new Response(
          JSON.stringify({ error: "Missing Plaid access token" }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const accessToken = await decryptSecret(encryptedToken);
      const { data: existingBankAccounts, error: existingBankAccountsError } =
        await supabase
          .from("bank_accounts")
          .select("provider_account_id, plaid_account_id")
          .eq("bank_connection_id", connection.id)
          .eq("provider", PLAID_PROVIDER);

      if (existingBankAccountsError) {
        throw existingBankAccountsError;
      }

      const existingAccountIds = (
        (existingBankAccounts || []) as Array<Record<string, unknown>>
      )
        .map((account) =>
          String(
            account.provider_account_id || account.plaid_account_id || "",
          ).trim(),
        )
        .filter(Boolean);
      const accounts = await getPlaidAccounts(accessToken);
      const accountsToUpsert =
        effectiveSelectedAccountIds.length > 0
          ? accounts.filter((account) =>
              effectiveSelectedAccountIds.includes(account.account_id),
            )
          : accounts;
      const returnedAccountIds = accountsToUpsert
        .map((account) => account.account_id?.trim())
        .filter((accountId): accountId is string => Boolean(accountId));
      const missingSelectedAccountIds = requiresAccountSelection
        ? findMissingPlaidSelectedAccountIds({
            selectedAccountIds: effectiveSelectedAccountIds,
            returnedAccountIds,
          })
        : [];

      if (missingSelectedAccountIds.length > 0) {
        return new Response(
          JSON.stringify({
            error:
              "Plaid did not return every selected account. Please reopen Plaid and try again.",
            missingSelectedAccountIds,
          }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      if (
        effectiveSelectedAccountIds.length > 0 &&
        accountsToUpsert.length === 0
      ) {
        return new Response(
          JSON.stringify({ error: "No selected Plaid accounts were returned" }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
      const preparedAccounts = await preparePlaidAccounts({
        supabase,
        userId: authResult.userId,
        bankConnectionId: connection.id,
        accounts: accountsToUpsert,
        reactivateExistingAccounts: true,
      });
      const accountIdsToDisable = resolvePlaidAccountsToDisableAfterUpdate({
        requiresAccountSelection,
        existingAccountIds,
        returnedAccountIds,
      });

      const nextMetadata = {
        ...metadata,
        plaid_last_link_request_id: body.linkRequestId || null,
        plaid_last_link_session_id: body.linkSessionId || null,
        plaid_selected_account_ids: effectiveSelectedAccountIds,
        plaid_disabled_account_ids: accountIdsToDisable,
        institution_id: resolvedInstitutionId,
        institution_name:
          body.institutionName || metadata.institution_name || null,
        ...(institutionLogoUrl
          ? { institution_logo_url: institutionLogoUrl }
          : {}),
        ...(institutionPrimaryColor
          ? { institution_primary_color: institutionPrimaryColor }
          : {}),
      };
      const linkedWallets = await loadLinkedWalletsForBankAccounts({
        supabase,
        userId: authResult.userId,
        targetHouseholdId: connectionHouseholdId,
        bankAccountIds: preparedAccounts.records.map((record) => record.id),
      });
      const { data: completionResult, error: completionError } =
        await supabase.rpc("complete_plaid_update_mode_v1", {
          p_user_id: authResult.userId,
          p_connection_id: connection.id,
          p_link_session_id: updateSession.id,
          p_mode: body.mode === "reconnect" ? "reconnect" : "update",
          p_household_id: connectionHouseholdId,
          p_account_upserts: preparedAccounts.payload,
          p_disabled_provider_account_ids: accountIdsToDisable,
          p_metadata: nextMetadata,
          p_item_status: requiresAccountSelection
            ? "accounts_updated"
            : "reconnected",
          p_link_request_id: body.linkRequestId || null,
          p_plaid_link_session_id: body.linkSessionId || null,
        });
      if (completionError) throw completionError;
      if (completionResult !== true) {
        throw new Error("Plaid update-mode completion was not committed");
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: body.action,
          connectionId: connection.id,
          targetHouseholdId: connectionHouseholdId,
          accounts: preparedAccounts.records.map((record) => ({
            ...record,
            institutionLogoUrl,
            institutionPrimaryColor,
            linkedWallet: linkedWallets.get(record.id) || null,
          })),
          initialSyncQueued: true,
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const accessState = await loadPlaidUserAccessState(
      supabase,
      authResult.userId,
    );

    const { count: inFlightJobCount, error: jobsError } = await supabase
      .from("bank_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("bank_connection_id", connection.id)
      .in("status", ["pending", "processing"]);

    if (jobsError) {
      throw jobsError;
    }

    const eligibility = canRequestPlaidManualRefresh({
      isConvertedPaidUser: accessState.isConvertedPaidUser,
      isTrialingUser: accessState.isTrialingUser,
      itemStatus: connection.item_status ?? connection.status,
      itemHealthState: connection.item_health_state,
      syncInProgress: (inFlightJobCount ?? 0) > 0,
      lastSuccessfulSyncAt: connection.last_successful_sync_at,
      nextManualRefreshEligibleAt: connection.next_manual_refresh_eligible_at,
      now: new Date(),
    });

    if (!eligibility.allowed) {
      return new Response(
        JSON.stringify({
          error: "Manual refresh is not available for this item right now",
          reason: eligibility.reason,
        }),
        {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const requestedAt = new Date();
    const nextEligibleAt = new Date(
      requestedAt.getTime() + 24 * 60 * 60 * 1000,
    );
    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_plaid_manual_refresh",
      {
        p_connection_id: connection.id,
        p_requested_at: requestedAt.toISOString(),
        p_next_eligible_at: nextEligibleAt.toISOString(),
      },
    );

    if (claimError) {
      throw claimError;
    }

    if (!claimed) {
      return new Response(
        JSON.stringify({
          error: "Manual refresh is cooling down or already in progress",
          reason: "cooldown_active",
        }),
        {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const encryptedToken =
      connection.access_token_encrypted ||
      connection.plaid_access_token_encrypted;
    if (!encryptedToken) {
      const { error: releaseError } = await supabase.rpc(
        "release_plaid_manual_refresh_v1",
        {
          p_connection_id: connection.id,
          p_requested_at: requestedAt.toISOString(),
        },
      );
      if (releaseError) throw releaseError;
      return new Response(
        JSON.stringify({ error: "Missing Plaid access token" }),
        {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    let accessToken: string;
    try {
      accessToken = await decryptSecret(encryptedToken);
    } catch (decryptError) {
      const { error: releaseError } = await supabase.rpc(
        "release_plaid_manual_refresh_v1",
        {
          p_connection_id: connection.id,
          p_requested_at: requestedAt.toISOString(),
        },
      );
      if (releaseError) {
        throw releaseError;
      }
      throw decryptError;
    }

    let refreshResponse: Awaited<
      ReturnType<typeof requestPlaidTransactionsRefresh>
    >;
    try {
      refreshResponse = await requestPlaidTransactionsRefresh(accessToken);
    } catch (refreshError) {
      if (refreshError instanceof PlaidError) {
        const { error: releaseError } = await supabase.rpc(
          "release_plaid_manual_refresh_v1",
          {
            p_connection_id: connection.id,
            p_requested_at: requestedAt.toISOString(),
          },
        );
        if (releaseError) throw releaseError;
      }
      throw refreshError;
    }
    const metadata =
      connection.metadata && typeof connection.metadata === "object"
        ? (connection.metadata as Record<string, unknown>)
        : {};

    await supabase
      .from("bank_connections")
      .update({
        last_financial_feature_used_at: requestedAt.toISOString(),
        metadata: {
          ...metadata,
          plaid_last_refresh_request_id: refreshResponse.request_id || null,
        },
        updated_at: requestedAt.toISOString(),
      })
      .eq("id", connection.id);

    console.log(
      "[plaid-item-control] Requested Plaid refresh",
      JSON.stringify({
        connectionId: connection.id,
        nextRefreshEligibleAt: nextEligibleAt.toISOString(),
        requestId: refreshResponse.request_id || null,
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        action: body.action,
        status: "requested",
        nextRefreshEligibleAt: nextEligibleAt.toISOString(),
      }),
      {
        status: 202,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(
      "[plaid-item-control] Unexpected error",
      JSON.stringify({
        debugId,
        action: body.action ?? null,
        connectionId: body.connectionId ?? null,
        ...serializeErrorForLog(error),
      }),
    );
    await reportEdgeFunctionError({
      functionName: "plaid-item-control",
      error,
      context: {
        debug_id: debugId,
        action: body.action ?? null,
        connection_id: body.connectionId ?? null,
      },
    });
    return new Response(
      JSON.stringify({
        error: "Failed to execute Plaid item action",
        errorCode: "plaid_item_control_failed",
        debugId,
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});

function serializeErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const maybePlaidError = error as Error & {
      code?: unknown;
      requestId?: unknown;
      errorType?: unknown;
      status?: unknown;
    };
    return {
      name: error.name,
      message: error.message,
      code: maybePlaidError.code ?? null,
      requestId: maybePlaidError.requestId ?? null,
      errorType: maybePlaidError.errorType ?? null,
      status: maybePlaidError.status ?? null,
    };
  }

  if (error && typeof error === "object") {
    try {
      return JSON.parse(JSON.stringify(error)) as Record<string, unknown>;
    } catch {
      return {
        message: String(error),
      };
    }
  }

  return {
    message: String(error),
  };
}
