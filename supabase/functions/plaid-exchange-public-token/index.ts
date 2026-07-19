import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess } from "../shared/accounts.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  canUsePlaidBankSync,
  loadPlaidUserAccessState,
} from "../shared/plaid-access.ts";
import { canReusePlaidExchangeSnapshot } from "../shared/plaid-exchange-idempotency.ts";
import { computePlaidBillingWindow } from "../shared/plaid-lifecycle.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import {
  exchangePublicToken,
  getPlaidAccounts,
  type PlaidAccount,
  PLAID_PROVIDER,
  removePlaidItem,
} from "../shared/plaid-client.ts";
import { fetchAndStorePlaidInstitutionLogo } from "../shared/plaid-institution-logo.ts";
import {
  buildPlaidDuplicateGroupKey,
  normalizePlaidSelectedAccountIds,
  normalizePlaidSelectedAccounts,
  type PlaidSelectedAccountMetadata,
} from "../shared/plaid-update-mode.ts";
import { decryptSecret, encryptSecret } from "../shared/token-encryption.ts";
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

    // Check idempotency - return existing connection if found
    if (body.idempotencyKey) {
      const { data: existingConnection } = await supabase
        .from("bank_connections")
        .select(
          "id, household_id, metadata, access_token_encrypted, plaid_access_token_encrypted, status, item_status, removed_at",
        )
        .eq("user_id", authResult.userId)
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();

      if (existingConnection) {
        if (
          existingConnection.removed_at ||
          existingConnection.status === "disabled" ||
          ["removed", "pending_removal"].includes(
            existingConnection.item_status || "",
          )
        ) {
          return new Response(
            JSON.stringify({
              error:
                "The previous bank connection attempt is closed. Please restart Link.",
              errorCode: "idempotency_connection_closed",
            }),
            {
              status: 409,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
        const existingHouseholdId = existingConnection.household_id ?? null;
        if (existingHouseholdId !== targetHouseholdId) {
          return new Response(
            JSON.stringify({
              error:
                "This bank connection attempt belongs to a different wallet space. Please restart bank connection from the current space.",
              errorCode: "idempotency_scope_mismatch",
            }),
            {
              status: 409,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
        const existingSelectedAccountIds = Array.isArray(
          existingConnection.metadata?.plaid_selected_account_ids,
        )
          ? existingConnection.metadata.plaid_selected_account_ids
              .map((value: unknown) => String(value || "").trim())
              .filter(Boolean)
              .sort()
          : [];
        if (
          existingSelectedAccountIds.length > 0 &&
          existingSelectedAccountIds.join("|") !==
            [...selectedAccountIds].sort().join("|")
        ) {
          return new Response(
            JSON.stringify({
              error: "This bank connection attempt used different accounts.",
              errorCode: "idempotency_account_mismatch",
            }),
            {
              status: 409,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
        // Fetch accounts for the existing connection
        const { data: existingAccounts } = await supabase
          .from("bank_accounts")
          .select(
            "id, name, mask, type, subtype, currency, plaid_account_id, provider_account_id, provider_balance_current_cents, provider_balance_available_cents, provider_balance_limit_cents, provider_balance_updated_at",
          )
          .eq("bank_connection_id", existingConnection.id);

        if (canReusePlaidExchangeSnapshot((existingAccounts || []).length)) {
          console.log(
            `[plaid-exchange] Idempotent request detected, returning existing connection: ${existingConnection.id}`,
          );

          const linkedWallets = await loadLinkedWalletsForBankAccounts({
            supabase,
            userId: authResult.userId,
            targetHouseholdId,
            bankAccountIds: (existingAccounts || []).map((account: any) =>
              String(account.id || ""),
            ),
          });

          return new Response(
            JSON.stringify({
              success: true,
              connectionId: existingConnection.id,
              targetHouseholdId: targetHouseholdId,
              accounts: (existingAccounts || []).map((account: any) => ({
                ...account,
                linkedWallet:
                  linkedWallets.get(String(account.id || "")) || null,
              })),
              idempotent: true,
            }),
            {
              status: 200,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }

        const encryptedExistingToken =
          existingConnection.access_token_encrypted ||
          existingConnection.plaid_access_token_encrypted;
        if (!encryptedExistingToken) {
          return new Response(
            JSON.stringify({
              error:
                "The previous bank connection attempt cannot be resumed. Please restart Link.",
              errorCode: "idempotency_recovery_unavailable",
            }),
            {
              status: 409,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }

        const existingAccessToken = await decryptSecret(encryptedExistingToken);
        const recoveredAccounts = (
          await getPlaidAccounts(existingAccessToken)
        ).filter((account) => selectedAccountIds.includes(account.account_id));
        if (recoveredAccounts.length === 0) {
          throw new Error("Plaid idempotency recovery returned no accounts");
        }
        const recoveredDuplicates = await findDuplicatePlaidConnections({
          supabase,
          userId: authResult.userId,
          selectedAccountIds,
          selectedAccounts: recoveredAccounts,
          institutionId: body.institutionId,
          targetHouseholdId,
          excludeConnectionId: existingConnection.id,
        });
        if (recoveredDuplicates.length > 0) {
          return duplicatePlaidAccountsResponse(recoveredDuplicates, headers);
        }
        const recovered = await upsertPlaidAccounts({
          supabase,
          userId: authResult.userId,
          bankConnectionId: existingConnection.id,
          accounts: recoveredAccounts,
        });
        const recoveredWallets = await loadLinkedWalletsForBankAccounts({
          supabase,
          userId: authResult.userId,
          targetHouseholdId,
          bankAccountIds: recovered.records.map((account) => account.id),
        });
        const recoveredEnqueue = await enqueuePlaidSyncJob({
          supabase,
          connectionId: existingConnection.id,
          triggerSource: "exchange_idempotency_recovery",
          payload: { initialSync: true, targetHouseholdId },
        });
        return new Response(
          JSON.stringify({
            success: true,
            connectionId: existingConnection.id,
            targetHouseholdId,
            accounts: recovered.records.map((account) => ({
              ...account,
              linkedWallet: recoveredWallets.get(account.id) || null,
            })),
            initialSyncQueued:
              recoveredEnqueue.enqueued || recoveredEnqueue.duplicate,
            idempotent: true,
            recovered: true,
          }),
          {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (!requestedConnectionId && selectedAccountIds.length) {
      const duplicateConnections = await findDuplicatePlaidConnections({
        supabase,
        userId: authResult.userId,
        selectedAccountIds,
        selectedAccounts,
        institutionId: body.institutionId,
        targetHouseholdId,
      });

      if (duplicateConnections.length) {
        return duplicatePlaidAccountsResponse(duplicateConnections, headers);
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
    let accountsToUpsert: PlaidAccount[] = [];

    try {
      encryptedToken = await encryptSecret(plaidResponse.access_token);
      accountsToUpsert = (
        await getPlaidAccounts(plaidResponse.access_token)
      ).filter((account) => selectedAccountIds.includes(account.account_id));
      if (accountsToUpsert.length === 0) {
        throw new Error("No selected Plaid accounts were returned by Plaid");
      }
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

      if (shouldCompensateOrphanItem) {
        const authoritativeDuplicates = await findDuplicatePlaidConnections({
          supabase,
          userId: authResult.userId,
          selectedAccountIds,
          selectedAccounts: accountsToUpsert,
          institutionId: body.institutionId,
          targetHouseholdId,
        });
        if (authoritativeDuplicates.length > 0) {
          const cleanedUp = await cleanupOrphanPlaidItem({
            accessToken: plaidResponse.access_token,
            itemId: plaidResponse.item_id,
            stage: "persistent_account_duplicate",
          });
          if (!cleanedUp) {
            await persistOrphanPlaidRemovalJob({
              supabase,
              userId: authResult.userId,
              encryptedToken,
              itemId: plaidResponse.item_id,
              stage: "persistent_account_duplicate",
            });
          }
          shouldCompensateOrphanItem = false;
          return duplicatePlaidAccountsResponse(
            authoritativeDuplicates,
            headers,
          );
        }
      }

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
              itemId: plaidResponse.item_id,
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
            itemId: plaidResponse.item_id,
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
    let institutionLogoUrl: string | null = null;
    let institutionPrimaryColor: string | null = null;

    try {
      try {
        const storedLogo = await fetchAndStorePlaidInstitutionLogo({
          supabase,
          userId: authResult.userId,
          institutionId: body.institutionId,
          countryCode: body.countryCode,
        });
        institutionLogoUrl = storedLogo?.publicUrl ?? null;
        institutionPrimaryColor = storedLogo?.primaryColor ?? null;
      } catch (logoError) {
        console.warn(
          "[plaid-exchange] Failed to fetch/store institution logo",
          JSON.stringify({
            institutionId: body.institutionId || null,
            error:
              logoError instanceof Error
                ? logoError.message
                : String(logoError),
          }),
        );
        await reportEdgeFunctionError({
          functionName: "plaid-exchange-public-token",
          error: logoError,
          context: {
            stage: "institution_logo_fetch_store",
            institution_id: body.institutionId || null,
            country_code: body.countryCode || null,
            link_request_id: body.linkRequestId || null,
            link_session_id: body.linkSessionId || null,
          },
        });
      }

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
          ...(institutionLogoUrl
            ? { institution_logo_url: institutionLogoUrl }
            : {}),
          ...(institutionPrimaryColor
            ? { institution_primary_color: institutionPrimaryColor }
            : {}),
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
          isNewConnection,
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
          household_id:
            targetHouseholdId ?? connectionState.household_id ?? null,
          item_created_at:
            connectionState.item_created_at || new Date().toISOString(),
          first_billing_month_start: billingWindow.firstBillingMonthStart,
          second_billing_month_start: billingWindow.secondBillingMonthStart,
          third_billing_month_start: billingWindow.thirdBillingMonthStart,
          scheduled_removal_at: billingWindow.scheduledRemovalAt,
          removed_at: null,
          status: "pending",
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
        institutionLogoUrl,
        institutionPrimaryColor,
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
      const shouldKickProcessorNow =
        enqueueResult.enqueued || enqueueResult.duplicate;
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
            await reportEdgeFunctionError({
              functionName: "plaid-exchange-public-token",
              error: new Error(
                `Immediate bank-sync-processor trigger failed: ${processorResponse.status} ${processorError}`,
              ),
              context: {
                stage: "trigger_bank_sync_processor",
                connection_id: connectionId,
                processor_status: processorResponse.status,
                link_session_id: body.linkSessionId || null,
              },
            });
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
          await reportEdgeFunctionError({
            functionName: "plaid-exchange-public-token",
            error: processorError,
            context: {
              stage: "trigger_bank_sync_processor",
              connection_id: connectionId,
              link_session_id: body.linkSessionId || null,
            },
          });
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
            itemId: plaidResponse.item_id,
            stage: "post_exchange_failure",
          });
        }
      }

      if (
        postExchangeError &&
        typeof postExchangeError === "object" &&
        "code" in postExchangeError &&
        String((postExchangeError as { code?: unknown }).code) === "23505" &&
        String(
          (postExchangeError as { message?: unknown }).message || "",
        ).includes("already connected")
      ) {
        return duplicatePlaidAccountsResponse([], headers);
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
        plaid_request_id:
          error instanceof Error && "requestId" in error
            ? (error as { requestId?: string }).requestId || null
            : null,
      },
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isScopeMismatch = errorMessage.includes("different space");
    return new Response(
      JSON.stringify({
        error: isScopeMismatch
          ? "Bank connection belongs to a different wallet space"
          : "Failed to exchange public token",
        errorCode: isScopeMismatch ? "connection_scope_mismatch" : undefined,
      }),
      {
        status: isScopeMismatch ? 409 : 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});

async function findDuplicatePlaidConnections(params: {
  supabase: any;
  userId: string;
  selectedAccountIds: string[];
  selectedAccounts: Array<PlaidSelectedAccountMetadata | PlaidAccount>;
  institutionId?: string;
  targetHouseholdId: string | null;
  excludeConnectionId?: string;
}): Promise<string[]> {
  let connectionsQuery = params.supabase
    .from("bank_connections")
    .select("id, metadata")
    .eq("user_id", params.userId)
    .eq("provider", PLAID_PROVIDER)
    .is("removed_at", null)
    .in("status", ["pending", "active", "needs_reauth", "error"]);

  connectionsQuery = params.targetHouseholdId
    ? connectionsQuery.eq("household_id", params.targetHouseholdId)
    : connectionsQuery.is("household_id", null);

  const { data: connections, error: connectionsError } = await connectionsQuery;

  if (connectionsError) {
    throw connectionsError;
  }

  const normalizedInstitutionId = params.institutionId?.trim() || null;
  const candidateConnections = (
    (connections || []) as Array<{
      id: string;
      metadata?: Record<string, unknown> | null;
    }>
  ).filter((connection) => {
    if (connection.id === params.excludeConnectionId) return false;
    if (!normalizedInstitutionId) return true;
    const existingInstitutionId = String(
      connection.metadata?.institution_id || "",
    ).trim();
    return (
      !existingInstitutionId ||
      existingInstitutionId === normalizedInstitutionId
    );
  });
  if (candidateConnections.length === 0) return [];

  const candidateConnectionIds = candidateConnections.map(({ id }) => id);
  const { data: bankAccounts, error: bankAccountsError } = await params.supabase
    .from("bank_accounts")
    .select(
      "bank_connection_id, provider_account_id, provider_persistent_account_id, name, mask, type, subtype",
    )
    .eq("provider", PLAID_PROVIDER)
    .in("bank_connection_id", candidateConnectionIds);
  if (bankAccountsError) throw bankAccountsError;

  const selectedProviderIds = new Set(params.selectedAccountIds);
  const selectedPersistentIds = new Set(
    params.selectedAccounts
      .map((account) =>
        "persistent_account_id" in account
          ? account.persistent_account_id?.trim() || null
          : null,
      )
      .filter((value): value is string => value != null),
  );
  const selectedSignatures = new Set(
    normalizedInstitutionId
      ? params.selectedAccounts
          .map(plaidAccountDuplicateSignature)
          .filter((signature): signature is string => signature != null)
      : [],
  );
  const duplicateConnectionIds = new Set<string>();
  for (const account of (bankAccounts || []) as Array<{
    bank_connection_id?: string | null;
    provider_account_id?: string | null;
    provider_persistent_account_id?: string | null;
    name?: string | null;
    mask?: string | null;
    type?: string | null;
    subtype?: string | null;
  }>) {
    const signature = plaidAccountDuplicateSignature(account);
    if (
      selectedProviderIds.has(account.provider_account_id || "") ||
      selectedPersistentIds.has(account.provider_persistent_account_id || "") ||
      (signature != null && selectedSignatures.has(signature))
    ) {
      if (account.bank_connection_id) {
        duplicateConnectionIds.add(account.bank_connection_id);
      }
    }
  }
  return Array.from(duplicateConnectionIds);
}

function duplicatePlaidAccountsResponse(
  duplicateConnectionIds: string[],
  headers: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error:
        "These bank accounts are already connected. Use the existing bank connection instead of linking them again.",
      errorCode: "duplicate_item_accounts",
      duplicateConnectionIds,
    }),
    {
      status: 409,
      headers: { ...headers, "Content-Type": "application/json" },
    },
  );
}

function plaidAccountDuplicateSignature(account: {
  name?: string | null;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
}): string | null {
  const name = account.name?.trim().toLowerCase() || "";
  const mask = account.mask?.trim().toLowerCase() || "";
  if (!name && !mask) return null;
  return [
    name,
    mask,
    account.type?.trim().toLowerCase() || "",
    account.subtype?.trim().toLowerCase() || "",
  ].join("|");
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
        error:
          cleanupError instanceof Error
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
  itemId: string;
  stage: string;
}): Promise<void> {
  const orphanDedupeKey = `orphan:${params.itemId}:${params.stage}`;
  const { error } = await params.supabase.from("plaid_offboarding_jobs").upsert(
    {
      user_id: params.userId,
      provider_item_id: params.itemId,
      orphan_dedupe_key: orphanDedupeKey,
      access_token_encrypted: params.encryptedToken,
      reason: `orphan_${params.stage}`,
      status: "pending",
      attempt_count: 0,
      next_attempt_at: null,
      token_expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    { onConflict: "orphan_dedupe_key" },
  );

  if (error) {
    throw error;
  }
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
