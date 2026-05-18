import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess } from "../shared/accounts.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { loadPlaidUserAccessState } from "../shared/plaid-access.ts";
import { canReusePlaidExchangeSnapshot } from "../shared/plaid-exchange-idempotency.ts";
import { computePlaidBillingWindow } from "../shared/plaid-lifecycle.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import {
  exchangePublicToken,
  getPlaidAccounts,
  PLAID_PROVIDER,
  removePlaidItem,
} from "../shared/plaid-client.ts";
import {
  buildPlaidDuplicateGroupKey,
  normalizePlaidSelectedAccountIds,
  normalizePlaidSelectedAccounts,
} from "../shared/plaid-update-mode.ts";
import { encryptSecret } from "../shared/token-encryption.ts";
import {
  loadLinkedWalletsForBankAccounts,
  sanitizeOptionalUuid,
  upsertBankConnection,
  upsertPlaidAccounts,
} from "../shared/bank-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const INTERNAL_SERVICE_SECRET = Deno.env.get("INTERNAL_SERVICE_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-exchange-public-token");
}

interface ExchangeRequest {
  publicToken?: string;
  connectionId?: string;
  institutionId?: string;
  institutionName?: string;
  institutionLogo?: string;
  countryCode?: string;
  idempotencyKey?: string;
  linkRequestId?: string;
  linkSessionId?: string;
  selectedAccounts?: unknown;
  targetHouseholdId?: string;
  linkCompletionNonce?: string;
}

Deno.serve(async (req) => {
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

  let body: ExchangeRequest = {};

  try {
    body = (await req.json()) as ExchangeRequest;
    const requestedConnectionId = body.connectionId?.trim() || null;

    if (requestedConnectionId) {
      return new Response(
        JSON.stringify({
          error:
            "Update-mode Link completion must use plaid-item-control without public token exchange",
          errorCode: "update_mode_exchange_not_allowed",
        }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (!body?.publicToken) {
      return new Response(
        JSON.stringify({ error: "publicToken is required" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }
    const publicToken = body.publicToken;
    const linkCompletionNonce = body.linkCompletionNonce?.trim();
    if (!linkCompletionNonce) {
      return new Response(
        JSON.stringify({ error: "linkCompletionNonce is required" }),
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
        headers: { "X-Client-Info": "moneko-plaid-exchange-public-token" },
      },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const accessState = await loadPlaidUserAccessState(
      supabase,
      authResult.userId,
    );
    const selectedAccounts = normalizePlaidSelectedAccounts(
      body.selectedAccounts,
    );
    const selectedAccountIds = normalizePlaidSelectedAccountIds(
      body.selectedAccounts,
    );
    if (selectedAccountIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "selectedAccounts is required" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }
    const duplicateGroupKey = buildPlaidDuplicateGroupKey({
      institutionId: body.institutionId,
      selectedAccountIds,
    });
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
      !(await assertScopeAccess(supabase, authResult.userId, targetHouseholdId))
    ) {
      return new Response(JSON.stringify({ error: "Forbidden scope" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!requestedConnectionId && selectedAccountIds.length) {
      const duplicateConnections = await findDuplicatePlaidConnections({
        supabase,
        userId: authResult.userId,
        selectedAccountIds,
      });

      if (duplicateConnections.length) {
        return new Response(
          JSON.stringify({
            error:
              "These bank accounts are already connected. Use the existing bank connection instead of linking them again.",
            errorCode: "duplicate_item_accounts",
            duplicateConnectionIds: duplicateConnections,
          }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Check idempotency - return existing connection if found
    if (body.idempotencyKey) {
      const { data: existingConnection } = await supabase
        .from("bank_connections")
        .select("id")
        .eq("user_id", authResult.userId)
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();

      if (existingConnection) {
        // Fetch accounts for the existing connection
        const { data: existingAccounts } = await supabase
          .from("bank_accounts")
          .select(
            "id, name, mask, type, subtype, currency, plaid_account_id, provider_account_id",
          )
          .eq("bank_connection_id", existingConnection.id);

        if (!canReusePlaidExchangeSnapshot((existingAccounts || []).length)) {
          console.warn(
            `[plaid-exchange] Idempotent connection ${existingConnection.id} has no stored accounts; continuing with fresh exchange attempt`,
          );
        } else {
          console.log(
            `[plaid-exchange] Idempotent request detected, returning existing connection: ${existingConnection.id}`,
          );

          const linkedWallets = await loadLinkedWalletsForBankAccounts({
            supabase,
            userId: authResult.userId,
            targetHouseholdId,
            bankAccountIds: (existingAccounts || []).map((account: any) =>
              String(account.id || "")
            ),
          });

          return new Response(
            JSON.stringify({
              success: true,
              connectionId: existingConnection.id,
              targetHouseholdId: targetHouseholdId,
              accounts: (existingAccounts || []).map((account: any) => ({
                ...account,
                linkedWallet: linkedWallets.get(String(account.id || "")) ||
                  null,
              })),
              idempotent: true,
            }),
            {
              status: 200,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    if (!requestedConnectionId && body.institutionId?.trim()) {
      const duplicateConnections = await findInstitutionDuplicateConnections({
        supabase,
        institutionId: body.institutionId,
        userId: authResult.userId,
      });

      if (duplicateConnections.length) {
        return new Response(
          JSON.stringify({
            error:
              "This institution is already connected. Use the existing bank connection instead of linking it again.",
            errorCode: "duplicate_item_accounts",
            duplicateConnectionIds: duplicateConnections,
          }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
    }

    const { data: claimedLinkSessions, error: linkSessionError } =
      await supabase.rpc("claim_plaid_link_completion_session", {
        p_user_id: authResult.userId,
        p_connection_id: null,
        p_nonce: linkCompletionNonce,
        p_mode: "new",
      });

    if (linkSessionError) {
      throw linkSessionError;
    }

    const linkSession = Array.isArray(claimedLinkSessions)
      ? claimedLinkSessions[0]
      : null;
    if (!linkSession?.id) {
      return new Response(
        JSON.stringify({
          error: "Invalid, busy, consumed, or expired Link session",
        }),
        {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const plaidResponse = await exchangePublicToken(publicToken);
    let encryptedToken = "";
    let shouldCompensateOrphanItem = true;

    try {
      encryptedToken = await encryptSecret(plaidResponse.access_token);
      const { data: existingConnectionForItem, error: existingItemError } =
        await supabase
          .from("bank_connections")
          .select("id")
          .eq("user_id", authResult.userId)
          .eq("provider", PLAID_PROVIDER)
          .eq("provider_item_id", plaidResponse.item_id)
          .maybeSingle();

      if (existingItemError) {
        throw existingItemError;
      }

      shouldCompensateOrphanItem = !existingConnectionForItem?.id;

      if (!accessState.isConvertedPaidUser && shouldCompensateOrphanItem) {
        const { count, error: connectionCountError } = await supabase
          .from("bank_connections")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authResult.userId)
          .eq("provider", PLAID_PROVIDER)
          .is("removed_at", null)
          .in("status", ["pending", "active", "needs_reauth", "error"]);

        if (connectionCountError) {
          throw connectionCountError;
        }

        if ((count ?? 0) >= 1) {
          const cleanedUp = await cleanupOrphanPlaidItem({
            accessToken: plaidResponse.access_token,
            itemId: plaidResponse.item_id,
            stage: "connection_limit_guard",
          });
          if (!cleanedUp) {
            await persistOrphanPlaidRemovalJob({
              supabase,
              userId: authResult.userId,
              encryptedToken,
              stage: "connection_limit_guard",
            });
          }
          shouldCompensateOrphanItem = false;
          return new Response(
            JSON.stringify({
              error:
                "Trial and free users can only keep one active bank connection. Reconnect the existing bank instead.",
            }),
            {
              status: 403,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
      }
    } catch (postExchangeSetupError) {
      if (shouldCompensateOrphanItem) {
        const cleanedUp = await cleanupOrphanPlaidItem({
          accessToken: plaidResponse.access_token,
          itemId: plaidResponse.item_id,
          stage: "post_exchange_setup_failure",
        });
        if (!cleanedUp && encryptedToken) {
          await persistOrphanPlaidRemovalJob({
            supabase,
            userId: authResult.userId,
            encryptedToken,
            stage: "post_exchange_setup_failure",
          });
        }
      }
      throw postExchangeSetupError;
    }

    let connectionId = "";
    let isNewConnection = false;
    let responseAccounts: Array<Record<string, unknown>> = [];
    let initialSyncQueued = false;

    try {
      const upsertResult = await upsertBankConnection({
        supabase,
        userId: authResult.userId,
        provider: PLAID_PROVIDER,
        providerItemId: plaidResponse.item_id,
        duplicateGroupKey,
        accessTokenEncrypted: encryptedToken,
        refreshTokenEncrypted: null,
        expiresAt: null,
        countryCode: body.countryCode?.toUpperCase() || "US",
        idempotencyKey: body.idempotencyKey || null,
        householdId: targetHouseholdId,
        metadata: {
          institution_id: body.institutionId || null,
          institution_name: body.institutionName || null,
          institution_logo: body.institutionLogo || null,
          plaid_duplicate_group_key: duplicateGroupKey,
          plaid_last_link_request_id: body.linkRequestId || null,
          plaid_last_link_session_id: body.linkSessionId || null,
          plaid_last_public_token_exchange_request_id:
            plaidResponse.request_id || null,
          plaid_selected_account_ids: selectedAccountIds,
        },
      });

      connectionId = upsertResult.connectionId;
      isNewConnection = upsertResult.isNewConnection;

      console.log(
        "[plaid-exchange] Exchange completed",
        JSON.stringify({
          connectionId,
          duplicateGroupKey,
          isNewConnection,
          itemId: plaidResponse.item_id,
          linkSessionId: body.linkSessionId || null,
          requestId: plaidResponse.request_id || null,
          selectedAccountCount: selectedAccounts.length,
        }),
      );

      const { error: tokenError } = await supabase
        .from("bank_connection_tokens")
        .upsert(
          {
            bank_connection_id: connectionId,
            token_type: "access",
            token_encrypted: encryptedToken,
          },
          { onConflict: "bank_connection_id,token_type" },
        );

      if (tokenError) {
        throw tokenError;
      }

      const { data: connectionState, error: connectionStateError } =
        await supabase
          .from("bank_connections")
          .select(
            "id, item_created_at, cursor_generation, removed_at, status, household_id",
          )
          .eq("id", connectionId)
          .single();

      if (connectionStateError) {
        throw connectionStateError;
      }

      const billingWindow = computePlaidBillingWindow(
        connectionState.item_created_at || new Date().toISOString(),
      );

      const { error: connectionUpdateError } = await supabase
        .from("bank_connections")
        .update({
          household_id: targetHouseholdId ?? connectionState.household_id ??
            null,
          item_created_at: connectionState.item_created_at ||
            new Date().toISOString(),
          first_billing_month_start: billingWindow.firstBillingMonthStart,
          second_billing_month_start: billingWindow.secondBillingMonthStart,
          third_billing_month_start: billingWindow.thirdBillingMonthStart,
          scheduled_removal_at: billingWindow.scheduledRemovalAt,
          removed_at: null,
          status: "active",
          item_status: isNewConnection ? "newly_connected" : "reconnected",
          item_health_state: "healthy",
          relink_state: null,
          billing_keep_reason: accessState.isConvertedPaidUser
            ? "active_paid_use"
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      if (connectionUpdateError) {
        throw connectionUpdateError;
      }

      const accounts = await getPlaidAccounts(plaidResponse.access_token);
      const accountsToUpsert = selectedAccountIds.length > 0
        ? accounts.filter((account) =>
          selectedAccountIds.includes(account.account_id)
        )
        : accounts;
      if (accountsToUpsert.length === 0) {
        throw new Error("No selected Plaid accounts were returned by Plaid");
      }
      const upsertAccountsResult = await upsertPlaidAccounts({
        supabase,
        userId: authResult.userId,
        bankConnectionId: connectionId,
        accounts: accountsToUpsert,
      });

      const linkedWallets = await loadLinkedWalletsForBankAccounts({
        supabase,
        userId: authResult.userId,
        targetHouseholdId,
        bankAccountIds: upsertAccountsResult.records.map((record) => record.id),
      });

      responseAccounts = upsertAccountsResult.records.map((record) => ({
        ...record,
        linkedWallet: linkedWallets.get(record.id) || null,
      }));

      const enqueueResult = await enqueuePlaidSyncJob({
        supabase,
        connectionId,
        triggerSource: isNewConnection ? "initial_sync" : "reconnect",
        payload: {
          initialSync: isNewConnection,
          targetHouseholdId,
        },
      });

      initialSyncQueued = enqueueResult.enqueued || enqueueResult.duplicate;
      const shouldKickProcessorNow = enqueueResult.enqueued ||
        enqueueResult.duplicate;
      if (shouldKickProcessorNow && SUPABASE_URL && INTERNAL_SERVICE_SECRET) {
        try {
          console.log(
            `[plaid-exchange] Triggering immediate bank-sync-processor run for connection ${connectionId}`,
          );
          const processorResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/bank-sync-processor`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Service-Secret": INTERNAL_SERVICE_SECRET,
              },
              body: JSON.stringify({}),
            },
          );

          if (!processorResponse.ok) {
            const processorError = await processorResponse.text();
            console.error(
              `[plaid-exchange] Immediate bank-sync-processor trigger failed for connection ${connectionId}: ${processorResponse.status} ${processorError}`,
            );
          } else {
            const processorPayload = await processorResponse
              .json()
              .catch(() => null);
            console.log(
              "[plaid-exchange] Immediate bank-sync-processor response",
              JSON.stringify({
                connectionId,
                payload: processorPayload,
              }),
            );
          }
        } catch (processorError) {
          console.error(
            `[plaid-exchange] Immediate bank-sync-processor trigger threw for connection ${connectionId}`,
            processorError,
          );
        }
      } else if (!INTERNAL_SERVICE_SECRET) {
        console.warn(
          `[plaid-exchange] INTERNAL_SERVICE_SECRET missing, initial sync will wait for cron for connection ${connectionId}`,
        );
      }
    } catch (postExchangeError) {
      if (shouldCompensateOrphanItem) {
        if (connectionId) {
          await rollbackLocalPlaidExchangeState({
            connectionId,
            supabase,
          });
        }
        const cleanedUp = await cleanupOrphanPlaidItem({
          accessToken: plaidResponse.access_token,
          itemId: plaidResponse.item_id,
          stage: "post_exchange_failure",
        });
        if (!cleanedUp && encryptedToken) {
          await persistOrphanPlaidRemovalJob({
            supabase,
            userId: authResult.userId,
            encryptedToken,
            stage: "post_exchange_failure",
          });
        }
      }

      throw postExchangeError;
    }

    const completionIso = new Date().toISOString();
    const { error: linkCompletionError } = await supabase
      .from("plaid_link_update_sessions")
      .update({
        consumed_at: completionIso,
        completed_at: completionIso,
        processing_started_at: null,
        link_request_id: body.linkRequestId || null,
        link_session_id: body.linkSessionId || null,
        updated_at: completionIso,
      })
      .eq("id", linkSession.id);

    if (linkCompletionError) {
      throw linkCompletionError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        connectionId,
        targetHouseholdId,
        accounts: responseAccounts,
        initialSyncQueued,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-exchange-public-token] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-exchange-public-token",
      error,
      context: {
        link_session_id: body.linkSessionId || null,
        plaid_request_id: error instanceof Error && "requestId" in error
          ? (error as { requestId?: string }).requestId || null
          : null,
      },
    });
    return new Response(
      JSON.stringify({
        error: "Failed to exchange public token",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});

async function findDuplicatePlaidConnections(params: {
  supabase: any;
  userId: string;
  selectedAccountIds: string[];
}): Promise<string[]> {
  const { data: bankAccounts, error: bankAccountsError } = await params.supabase
    .from("bank_accounts")
    .select("bank_connection_id, provider_account_id")
    .eq("provider", PLAID_PROVIDER)
    .in("provider_account_id", params.selectedAccountIds);

  if (bankAccountsError) {
    throw bankAccountsError;
  }

  const candidateConnectionIds = Array.from(
    new Set(
      ((bankAccounts || []) as { bank_connection_id: string | null }[])
        .map((row) => row.bank_connection_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (!candidateConnectionIds.length) {
    return [];
  }

  const { data: connections, error: connectionsError } = await params.supabase
    .from("bank_connections")
    .select("id")
    .eq("user_id", params.userId)
    .eq("provider", PLAID_PROVIDER)
    .is("removed_at", null)
    .in("status", ["pending", "active", "needs_reauth", "error"])
    .in("id", candidateConnectionIds);

  if (connectionsError) {
    throw connectionsError;
  }

  return ((connections || []) as { id: string }[])
    .map((row) => row.id)
    .filter(Boolean);
}

async function cleanupOrphanPlaidItem(params: {
  accessToken: string;
  itemId: string;
  stage: string;
}): Promise<boolean> {
  try {
    const response = await removePlaidItem(params.accessToken);
    console.log(
      "[plaid-exchange] Removed orphan Plaid item",
      JSON.stringify({
        itemId: params.itemId,
        requestId: response.request_id || null,
        stage: params.stage,
      }),
    );
    return true;
  } catch (cleanupError) {
    console.error(
      "[plaid-exchange] Failed to remove orphan Plaid item",
      JSON.stringify({
        itemId: params.itemId,
        stage: params.stage,
        error: cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError),
      }),
    );
    return false;
  }
}

async function persistOrphanPlaidRemovalJob(params: {
  supabase: any;
  userId: string;
  encryptedToken: string;
  stage: string;
}): Promise<void> {
  const { error } = await params.supabase
    .from("plaid_offboarding_jobs")
    .insert({
      user_id: params.userId,
      access_token_encrypted: params.encryptedToken,
      reason: `orphan_${params.stage}`,
    });

  if (error) {
    throw error;
  }
}

async function findInstitutionDuplicateConnections(params: {
  supabase: any;
  institutionId: string;
  userId: string;
}): Promise<string[]> {
  const institutionId = params.institutionId.trim();
  if (!institutionId) {
    return [];
  }

  const { data: connections, error } = await params.supabase
    .from("bank_connections")
    .select("id")
    .eq("user_id", params.userId)
    .eq("provider", PLAID_PROVIDER)
    .is("removed_at", null)
    .in("status", ["pending", "active", "needs_reauth", "error"])
    .eq("metadata->>institution_id", institutionId);

  if (error) {
    throw error;
  }

  return ((connections || []) as { id: string }[])
    .map((row) => row.id)
    .filter(Boolean);
}

async function rollbackLocalPlaidExchangeState(params: {
  supabase: any;
  connectionId: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();

  const { error: jobDeleteError } = await params.supabase
    .from("bank_sync_jobs")
    .delete()
    .eq("bank_connection_id", params.connectionId);

  if (jobDeleteError) {
    throw jobDeleteError;
  }

  const { error: tokenDeleteError } = await params.supabase
    .from("bank_connection_tokens")
    .delete()
    .eq("bank_connection_id", params.connectionId);

  if (tokenDeleteError) {
    throw tokenDeleteError;
  }

  const { error: rawDeleteError } = await params.supabase
    .from("bank_transaction_raw")
    .delete()
    .eq("bank_connection_id", params.connectionId);

  if (rawDeleteError) {
    throw rawDeleteError;
  }

  const { error: accountDeleteError } = await params.supabase
    .from("bank_accounts")
    .delete()
    .eq("bank_connection_id", params.connectionId);

  if (accountDeleteError) {
    throw accountDeleteError;
  }

  const { error: connectionUpdateError } = await params.supabase
    .from("bank_connections")
    .update({
      access_token_encrypted: null,
      plaid_access_token_encrypted: null,
      status: "disabled",
      item_status: "removed",
      item_health_state: "removed",
      relink_state: null,
      removed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", params.connectionId);

  if (connectionUpdateError) {
    throw connectionUpdateError;
  }
}
