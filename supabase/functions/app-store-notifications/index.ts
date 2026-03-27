import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import {
  Environment,
  type JWSTransactionDecodedPayload,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  ensureAppStoreOwnership,
  getAppStoreOwnershipBinding,
  hasAppStoreOwnershipConflict,
} from "../shared/iap-ownership.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  findAppStoreTransactionWithEnvironmentFallback,
  getValidatedAppStorePrivateKey as getValidatedSharedAppStorePrivateKey,
  isAppStoreServerApiConfigured as isSharedAppStoreServerApiConfigured,
  matchesVerifiedAppStoreTransaction,
} from "../shared/app-store-api.ts";

type AppStoreEnvironment = "sandbox" | "production";

interface AppStoreNotificationDecodedPayload {
  notificationType?: string;
  subtype?: string;
  data?: {
    signedTransactionInfo?: string;
    environment?: string;
    bundleId?: string;
  };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const appStoreBundleId = Deno.env.get("APPLE_BUNDLE_ID") || "";
const appStoreAppId = Deno.env.get("APPLE_APP_ID") || "";
const appStoreIssuerId = Deno.env.get("APPLE_APP_STORE_ISSUER_ID") || "";
const appStoreKeyId = Deno.env.get("APPLE_APP_STORE_KEY_ID") || "";
const appStorePrivateKeyRaw = Deno.env.get("APPLE_APP_STORE_PRIVATE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const appStoreNotificationsRuntimeRevision = "2026-03-26-webcrypto-manual-v2";
const appStoreAuthStrategy = "webcrypto_manual_es256";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const raw = Deno.env.get(name);
  if (!raw) return defaultValue;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

const iapOwnershipBindingEnabled = readBooleanEnv(
  "IAP_OWNERSHIP_BINDING_ENABLED",
  true,
);
const iapOwnershipLegacyFallbackEnabled = readBooleanEnv(
  "IAP_OWNERSHIP_LEGACY_FALLBACK_ENABLED",
  true,
);

const appStoreApiConfig = {
  issuerId: appStoreIssuerId,
  keyId: appStoreKeyId,
  bundleId: appStoreBundleId,
  privateKey: appStorePrivateKeyRaw,
};

function normalizePrivateKey(value: string): string {
  if (!value) return "";

  let normalized = value.trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  normalized = normalized
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\n")
    .replace(/\r/g, "")
    .trim();

  const compactValue = normalized.replace(/\s+/g, "");

  if (!normalized.includes("-----BEGIN") && compactValue.length > 0) {
    const decodeCandidates = [
      normalized,
      compactValue,
      compactValue.replace(/-/g, "+").replace(/_/g, "/"),
    ];

    for (const candidate of decodeCandidates) {
      try {
        const decoded = atob(candidate);
        if (decoded.includes("-----BEGIN") && decoded.includes("PRIVATE KEY")) {
          normalized = decoded.trim();
          break;
        }
      } catch {
        // Try next candidate.
      }
    }
  }

  if (normalized.includes("-----BEGIN") && normalized.includes("-----END")) {
    normalized = normalized.replace(/\r/g, "");

    const beginMarker = normalized.includes("-----BEGIN PRIVATE KEY-----")
      ? "-----BEGIN PRIVATE KEY-----"
      : normalized.includes("-----BEGIN EC PRIVATE KEY-----")
        ? "-----BEGIN EC PRIVATE KEY-----"
        : null;

    const endMarker = normalized.includes("-----END PRIVATE KEY-----")
      ? "-----END PRIVATE KEY-----"
      : normalized.includes("-----END EC PRIVATE KEY-----")
        ? "-----END EC PRIVATE KEY-----"
        : null;

    if (beginMarker && endMarker) {
      const beginIndex = normalized.indexOf(beginMarker);
      const endIndex = normalized.indexOf(endMarker);
      const bodyStart = beginIndex + beginMarker.length;
      const bodyRaw = normalized.slice(bodyStart, endIndex).replace(/\s+/g, "");
      const bodyLines = bodyRaw.match(/.{1,64}/g)?.join("\n") ?? "";
      normalized = `${beginMarker}\n${bodyLines}\n${endMarker}`.trim();
    }
  }

  return normalized;
}

function summarizePrivateKeyMaterial(
  raw: string,
  normalized: string,
): Record<string, unknown> {
  return {
    rawLength: raw.length,
    normalizedLength: normalized.length,
    rawHasBegin: raw.includes("-----BEGIN"),
    rawHasEnd: raw.includes("-----END"),
    normalizedHasBegin: normalized.includes("-----BEGIN"),
    normalizedHasEnd: normalized.includes("-----END"),
    normalizedHasPrivateKeyMarker: normalized.includes("PRIVATE KEY"),
    rawHasEscapedNewline: raw.includes("\\n"),
    normalizedLineCount:
      normalized.length > 0 ? normalized.split("\n").length : 0,
  };
}

function getAppStoreDiagnosticsContext(
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    runtimeRevision: appStoreNotificationsRuntimeRevision,
    authStrategy: appStoreAuthStrategy,
    ...extra,
  };
}

function getValidatedApplePrivateKey(): string {
  return getValidatedSharedAppStorePrivateKey(appStorePrivateKeyRaw);
}

function isAppleServerApiConfigured(): boolean {
  return (
    Boolean(appStoreAppId) &&
    isSharedAppStoreServerApiConfigured(appStoreApiConfig)
  );
}

function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  return atob(base64);
}

function decodeJwsPayload<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format: expected 3 parts");
  }

  const payloadJson = base64UrlDecode(parts[1]);
  return JSON.parse(payloadJson) as T;
}

function toAppStoreEnvironmentLabel(value: string | null): AppStoreEnvironment {
  return value?.toLowerCase() === "sandbox" ? "sandbox" : "production";
}

function toAppleEnvironment(value: string | null): Environment {
  return value?.toLowerCase() === "sandbox"
    ? Environment.SANDBOX
    : Environment.PRODUCTION;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asIsoMillis(value: string | null): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const date = new Date(n);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asIsoMillisUnknown(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string") {
    return asIsoMillis(value);
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

function deriveStatus(transaction: JWSTransactionDecodedPayload): string {
  if (transaction.revocationDate) {
    return "canceled";
  }

  if (transaction.expiresDate) {
    const expiresMs = Number(transaction.expiresDate);
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      return "canceled";
    }
  }

  return "active";
}

function deriveLifecycleStatus(
  transaction: JWSTransactionDecodedPayload,
): "active" | "trialing" | "canceled" {
  const baseStatus = deriveStatus(transaction);
  if (baseStatus === "canceled") return "canceled";

  const offerIdentifier =
    asString(transaction.offerIdentifier)?.toLowerCase() ?? "";
  const offerType = Number(transaction.offerType);
  const isTrialLike = offerType === 1 || offerIdentifier.includes("trial");

  return isTrialLike ? "trialing" : "active";
}

function toStoredAppStoreEnvironment(value: AppStoreEnvironment): string {
  return value === "sandbox" ? "Sandbox" : "Production";
}

function looksLikeStripeSubscriptionId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("sub_");
}

async function authUserExists(userId: string): Promise<boolean> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    if (error.status === 404) {
      return false;
    }

    throw new Error(
      `Failed to verify auth user existence: ${error.message ?? String(error)}`,
    );
  }

  return Boolean(data?.user?.id);
}

async function resolveVerifiedUserId(params: {
  candidateUserId: string | null;
  candidateSource:
    | "ownership_binding"
    | "app_account_token"
    | "legacy_subscription";
  originalTransactionId: string;
  transactionId: string | null;
  environment: AppStoreEnvironment;
}): Promise<string | null> {
  if (!params.candidateUserId) return null;

  try {
    const exists = await authUserExists(params.candidateUserId);
    if (exists) {
      return params.candidateUserId;
    }

    void reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error: new Error("Candidate App Store user does not exist in auth.users"),
      context: getAppStoreDiagnosticsContext({
        phase: "candidate_user_not_found",
        candidateUserId: params.candidateUserId,
        candidateUserSource: params.candidateSource,
        originalTransactionId: params.originalTransactionId,
        transactionId: params.transactionId,
        environment: params.environment,
      }),
    }).catch((reportError) => {
      console.error(
        "Failed to report missing candidate App Store user:",
        reportError,
      );
    });
    return null;
  } catch (error) {
    await reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error,
      context: getAppStoreDiagnosticsContext({
        phase: "verify_candidate_user",
        candidateUserId: params.candidateUserId,
        candidateUserSource: params.candidateSource,
        originalTransactionId: params.originalTransactionId,
        transactionId: params.transactionId,
        environment: params.environment,
      }),
    });
    throw error;
  }
}

async function cancelStripeSubscriptionIfPresent(
  userId: string,
): Promise<void> {
  if (!stripe) return;

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("provider, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    await reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error: existingError,
      context: {
        phase: "load_existing_subscription_for_stripe_cancel",
        userId,
      },
    });
    return;
  }

  const provider =
    typeof existing?.provider === "string" ? existing.provider : null;
  const stripeSubscriptionId = existing?.stripe_subscription_id;

  const shouldCancelStripe =
    provider === "stripe" ||
    (provider == null && looksLikeStripeSubscriptionId(stripeSubscriptionId));

  if (!shouldCancelStripe) return;
  if (!looksLikeStripeSubscriptionId(stripeSubscriptionId)) return;

  try {
    await stripe.subscriptions.cancel(stripeSubscriptionId, { prorate: false });
  } catch (error) {
    await reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error,
      context: {
        phase: "cancel_stripe_subscription_if_present",
        userId,
        stripeSubscriptionId,
      },
    });
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      "Warning: failed to cancel Stripe subscription during App Store update",
      {
        userId,
        stripeSubscriptionId,
        error: msg,
      },
    );
  }
}

async function decodeNotification(signedPayload: string): Promise<
  | {
      kind: "test";
      notificationType: string;
      subtype: string | null;
      environment: AppStoreEnvironment;
    }
  | {
      kind: "transaction";
      transaction: JWSTransactionDecodedPayload;
      environment: AppStoreEnvironment;
    }
> {
  if (!isAppleServerApiConfigured()) {
    throw new Error(
      "Missing APPLE_APP_STORE_ISSUER_ID / APPLE_APP_STORE_KEY_ID / APPLE_APP_STORE_PRIVATE_KEY",
    );
  }

  let privateKey: string;
  try {
    privateKey = getValidatedApplePrivateKey();
  } catch (error) {
    void reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error,
      context: {
        ...getAppStoreDiagnosticsContext({
          phase: "private_key_validation",
        }),
        keyDiagnostics: summarizePrivateKeyMaterial(
          appStorePrivateKeyRaw,
          normalizePrivateKey(appStorePrivateKeyRaw),
        ),
      },
    });
    throw error;
  }

  const decoded =
    decodeJwsPayload<AppStoreNotificationDecodedPayload>(signedPayload);

  const notificationType = asString(decoded.notificationType) ?? "UNKNOWN";
  const subtype = asString(decoded.subtype);

  if (notificationType === "TEST") {
    return {
      kind: "test",
      notificationType,
      subtype,
      environment: toAppStoreEnvironmentLabel(
        asString(decoded.data?.environment),
      ),
    };
  }

  const signedTransaction = asString(decoded.data?.signedTransactionInfo);
  if (!signedTransaction) {
    throw new Error("Notification missing signedTransactionInfo");
  }

  const transactionHint =
    decodeJwsPayload<JWSTransactionDecodedPayload>(signedTransaction);
  const envHint = toAppleEnvironment(
    asString(transactionHint.environment) ??
      asString(decoded.data?.environment),
  );

  const transactionId = asString(transactionHint.transactionId);
  const originalTransactionId = asString(transactionHint.originalTransactionId);
  let verifiedTransaction: JWSTransactionDecodedPayload | null = null;

  try {
    const transactionLookup =
      await findAppStoreTransactionWithEnvironmentFallback({
        config: {
          ...appStoreApiConfig,
          privateKey,
        },
        environmentHint: envHint,
        transactionId,
        originalTransactionId,
      });
    verifiedTransaction = transactionLookup.transaction;
  } catch (error) {
    void reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error,
      context: {
        ...getAppStoreDiagnosticsContext(),
        phase: "lookup_notification_transaction",
        environment: envHint === Environment.SANDBOX ? "sandbox" : "production",
        transactionId,
        originalTransactionId,
        keyDiagnostics: summarizePrivateKeyMaterial(
          appStorePrivateKeyRaw,
          privateKey,
        ),
      },
    });
  }

  if (!verifiedTransaction) {
    throw new Error("Unable to validate App Store transaction via server API");
  }

  if (
    transactionId &&
    !matchesVerifiedAppStoreTransaction({
      hint: {
        transactionId,
        originalTransactionId: originalTransactionId ?? undefined,
        bundleId: transactionHint.bundleId,
      },
      verified: {
        transactionId: verifiedTransaction.transactionId,
        originalTransactionId:
          verifiedTransaction.originalTransactionId ?? undefined,
        bundleId: verifiedTransaction.bundleId,
      },
    })
  ) {
    await reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error: new Error(
        "Notification transaction does not match verified App Store transaction",
      ),
      context: getAppStoreDiagnosticsContext({
        phase: "notification_transaction_mismatch",
        transactionId,
        originalTransactionId,
        verifiedTransactionId: verifiedTransaction.transactionId ?? null,
        verifiedOriginalTransactionId:
          verifiedTransaction.originalTransactionId ?? null,
      }),
    });
    throw new Error(
      "Notification transaction does not match verified App Store transaction",
    );
  }

  if (verifiedTransaction.bundleId !== appStoreBundleId) {
    await reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error: new Error("App Store bundleId mismatch"),
      context: getAppStoreDiagnosticsContext({
        phase: "notification_bundle_id_mismatch",
        transactionId,
        originalTransactionId,
        expectedBundleId: appStoreBundleId,
        receivedBundleId: verifiedTransaction.bundleId ?? null,
      }),
    });
    throw new Error("App Store bundleId mismatch");
  }

  return {
    kind: "transaction",
    transaction: verifiedTransaction,
    environment: toAppStoreEnvironmentLabel(
      asString(verifiedTransaction.environment),
    ),
  };
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);
  let notificationLogContext: Record<string, unknown> =
    getAppStoreDiagnosticsContext({
      phase: "request_start",
      method: req.method,
      path: new URL(req.url).pathname,
    });

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appStoreBundleId || !appStoreAppId) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: new Error("App Store identifiers not configured"),
        context: getAppStoreDiagnosticsContext({
          phase: "configuration_validation",
          hasBundleId: Boolean(appStoreBundleId),
          hasAppStoreAppId: Boolean(appStoreAppId),
        }),
      });
      return new Response(
        JSON.stringify({ error: "App Store identifiers not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      signedPayload?: string;
    } | null;

    const signedPayload = asString(body?.signedPayload);
    if (!signedPayload) {
      return new Response(JSON.stringify({ error: "Missing signedPayload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[app-store-notifications] request received", {
      signedPayloadLength: signedPayload.length,
      signedPayloadPrefix: signedPayload.slice(0, 12),
    });

    const decodedNotification = await decodeNotification(signedPayload);

    if (decodedNotification.kind === "test") {
      return new Response(
        JSON.stringify({
          status: "ok",
          notificationType: decodedNotification.notificationType,
          subtype: decodedNotification.subtype,
          environment: decodedNotification.environment,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { transaction, environment } = decodedNotification;
    const storeProductId = asString(transaction.productId);
    const originalTransactionId = asString(transaction.originalTransactionId);
    const transactionId = asString(transaction.transactionId);
    notificationLogContext = getAppStoreDiagnosticsContext({
      phase: "decoded_notification",
      environment,
      storeProductId,
      originalTransactionId,
      transactionId,
    });

    console.log("[app-store-notifications] decoded notification", {
      storeProductId,
      originalTransactionId,
      transactionId,
      environment,
      offerType: transaction.offerType ?? null,
      offerIdentifier: transaction.offerIdentifier ?? null,
      expiresDate: transaction.expiresDate ?? null,
      revocationDate: transaction.revocationDate ?? null,
    });

    if (!storeProductId || !originalTransactionId) {
      return new Response(
        JSON.stringify({
          status: "ignored",
          reason: "Missing transaction identifiers",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: catalogProduct, error: catalogProductError } = await supabase
      .from("subscription_products")
      .select("plan, billing_interval")
      .eq("platform", "ios")
      .eq("store_product_id", storeProductId)
      .eq("is_active", true)
      .maybeSingle();

    if (catalogProductError) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: catalogProductError,
        context: getAppStoreDiagnosticsContext({
          phase: "load_subscription_product",
          storeProductId,
          originalTransactionId,
          transactionId,
          environment,
        }),
      });
      return new Response(
        JSON.stringify({ error: "Failed to load subscription product" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!catalogProduct) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: new Error("Unknown App Store product in notification"),
        context: getAppStoreDiagnosticsContext({
          phase: "unknown_product",
          storeProductId,
          originalTransactionId,
          transactionId,
          environment,
        }),
      });
      console.error("Unknown App Store product:", storeProductId);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Unknown product" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let userId: string | null = null;
    let userIdSource:
      | "ownership_binding"
      | "app_account_token"
      | "legacy_subscription"
      | null = null;
    let hasLegacyOwnershipConflict = false;

    if (iapOwnershipBindingEnabled) {
      const existingBinding = await getAppStoreOwnershipBinding({
        supabase,
        originalTransactionId,
      });
      const verifiedBindingUserId = await resolveVerifiedUserId({
        candidateUserId: existingBinding?.user_id ?? null,
        candidateSource: "ownership_binding",
        originalTransactionId,
        transactionId,
        environment,
      });
      userId = verifiedBindingUserId;
      if (verifiedBindingUserId) {
        userIdSource = "ownership_binding";
      }

      if (userId == null) {
        hasLegacyOwnershipConflict = await hasAppStoreOwnershipConflict({
          supabase,
          originalTransactionId,
        });
      }
    }

    const appAccountToken = asString(transaction.appAccountToken);
    if (!userId && appAccountToken && isUuid(appAccountToken)) {
      userId = await resolveVerifiedUserId({
        candidateUserId: appAccountToken,
        candidateSource: "app_account_token",
        originalTransactionId,
        transactionId,
        environment,
      });
      if (userId) {
        userIdSource = "app_account_token";
      }
    }

    if (hasLegacyOwnershipConflict && !userId) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: new Error(
          "App Store notification blocked by ownership conflict",
        ),
        context: getAppStoreDiagnosticsContext({
          phase: "ownership_conflict",
          originalTransactionId,
          transactionId,
          environment,
        }),
      });
      console.warn(
        "Ignoring App Store notification for unresolved legacy ownership conflict",
        {
          originalTransactionId,
          transactionId,
        },
      );
      return new Response(
        JSON.stringify({
          status: "ignored",
          reason: "Ownership conflict requires review",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!userId && iapOwnershipLegacyFallbackEnabled) {
      const orFilters = [
        `app_store_original_transaction_id.eq.${originalTransactionId}`,
      ];
      if (transactionId) {
        orFilters.push(`app_store_transaction_id.eq.${transactionId}`);
      }

      const { data: existingSub, error: existingSubError } = await supabase
        .from("subscriptions")
        .select("user_id")
        .or(orFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSubError) {
        await reportEdgeFunctionError({
          functionName: "app-store-notifications",
          error: existingSubError,
          context: getAppStoreDiagnosticsContext({
            phase: "load_legacy_subscription_mapping",
            originalTransactionId,
            transactionId,
            environment,
          }),
        });
        return new Response(
          JSON.stringify({ error: "Failed to load subscription mapping" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      userId = await resolveVerifiedUserId({
        candidateUserId: asString(existingSub?.user_id),
        candidateSource: "legacy_subscription",
        originalTransactionId,
        transactionId,
        environment,
      });
      if (userId) {
        userIdSource = "legacy_subscription";
      }
    }

    if (!userId) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: new Error("App Store notification without user mapping"),
        context: getAppStoreDiagnosticsContext({
          phase: "unknown_user_mapping",
          originalTransactionId,
          transactionId,
          environment,
          userIdSource,
          appAccountToken:
            appAccountToken && isUuid(appAccountToken) ? appAccountToken : null,
        }),
      });
      console.warn("App Store notification without user mapping", {
        originalTransactionId,
        transactionId,
        userIdSource,
        appAccountToken:
          appAccountToken && isUuid(appAccountToken) ? appAccountToken : null,
      });
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Unknown user" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const bindingDecision = iapOwnershipBindingEnabled
      ? await ensureAppStoreOwnership({
          supabase,
          provider: "app_store",
          originalTransactionId,
          currentUserId: userId,
          transactionId,
          storeProductId,
          environment,
          claimSource: "app_store_notification",
        })
      : null;

    if (bindingDecision?.kind === "owned_by_another_user") {
      console.warn("App Store notification resolved to existing owner", {
        originalTransactionId,
        transactionId,
        candidateUserId: userId,
        ownerUserId: bindingDecision.binding.user_id,
      });
    }

    const resolvedUserId = bindingDecision?.binding.user_id ?? userId;

    await cancelStripeSubscriptionIfPresent(resolvedUserId);

    const { data: existingSubscription, error: existingSubscriptionError } =
      await supabase
        .from("subscriptions")
        .select(
          "provider, current_period_end, status, billing_interval, store_product_id, app_store_original_transaction_id, trial_start, trial_end",
        )
        .eq("user_id", resolvedUserId)
        .maybeSingle();

    if (existingSubscriptionError) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: existingSubscriptionError,
        context: getAppStoreDiagnosticsContext({
          phase: "load_existing_subscription",
          userId: resolvedUserId,
          storeProductId,
          originalTransactionId,
          transactionId,
          environment,
        }),
      });
      return new Response(
        JSON.stringify({ error: "Failed to load existing subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let effectiveTransaction = transaction;
    let periodEndSource = "notification_transaction";
    let resolvedEnvironment = environment;
    let resolvedExpiresIso = asIsoMillisUnknown(
      effectiveTransaction.expiresDate,
    );

    if (catalogProduct.plan !== "lifetime" && !resolvedExpiresIso) {
      try {
        const reconciledTransactionLookup =
          await findAppStoreTransactionWithEnvironmentFallback({
            config: {
              ...appStoreApiConfig,
              privateKey: getValidatedApplePrivateKey(),
            },
            environmentHint: toAppleEnvironment(environment),
            transactionId,
            originalTransactionId,
          });

        if (
          reconciledTransactionLookup.transaction &&
          (!transactionId ||
            matchesVerifiedAppStoreTransaction({
              hint: {
                transactionId,
                originalTransactionId,
                bundleId: transaction.bundleId,
              },
              verified: {
                transactionId:
                  reconciledTransactionLookup.transaction.transactionId,
                originalTransactionId:
                  reconciledTransactionLookup.transaction.originalTransactionId,
                bundleId: reconciledTransactionLookup.transaction.bundleId,
              },
            }))
        ) {
          effectiveTransaction = reconciledTransactionLookup.transaction;
          resolvedEnvironment =
            reconciledTransactionLookup.environment === Environment.SANDBOX
              ? "sandbox"
              : "production";
          resolvedExpiresIso = asIsoMillisUnknown(
            reconciledTransactionLookup.transaction.expiresDate,
          );
          if (resolvedExpiresIso) {
            periodEndSource = "matched_notification_transaction";
          }
        }
      } catch (error) {
        await reportEdgeFunctionError({
          functionName: "app-store-notifications",
          error,
          context: getAppStoreDiagnosticsContext({
            phase: "resolve_notification_period_end",
            userId: resolvedUserId,
            storeProductId,
            originalTransactionId,
            transactionId,
            environment,
          }),
        });
      }
    }

    if (catalogProduct.plan !== "lifetime" && !resolvedExpiresIso) {
      const existingPeriodEnd = asString(
        existingSubscription?.current_period_end,
      );
      const existingPeriodEndMs = existingPeriodEnd
        ? Date.parse(existingPeriodEnd)
        : Number.NaN;
      if (
        existingSubscription?.provider === "app_store" &&
        existingPeriodEnd &&
        existingSubscription?.store_product_id === storeProductId &&
        existingSubscription?.billing_interval ===
          catalogProduct.billing_interval &&
        existingSubscription?.app_store_original_transaction_id ===
          originalTransactionId &&
        Number.isFinite(existingPeriodEndMs) &&
        existingPeriodEndMs > Date.now()
      ) {
        resolvedExpiresIso = existingPeriodEnd;
        periodEndSource = "existing_subscription";
      } else {
        await reportEdgeFunctionError({
          functionName: "app-store-notifications",
          error: new Error(
            "Non-lifetime App Store notification missing resolvable expiry",
          ),
          context: getAppStoreDiagnosticsContext({
            phase: "missing_notification_expiry",
            userId: resolvedUserId,
            storeProductId,
            originalTransactionId,
            transactionId,
            environment: resolvedEnvironment,
            existingCurrentPeriodEnd:
              existingSubscription?.current_period_end ?? null,
            existingStatus: existingSubscription?.status ?? null,
          }),
        });
        return new Response(
          JSON.stringify({ error: "Failed to resolve subscription expiry" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const status = deriveLifecycleStatus(effectiveTransaction);
    const trialStartIso =
      status === "trialing"
        ? asIsoMillis(asString(effectiveTransaction.purchaseDate))
        : null;
    const trialEndIso = status === "trialing" ? resolvedExpiresIso : null;

    console.log("[app-store-notifications] resolved subscription payload", {
      userId: resolvedUserId,
      storeProductId,
      originalTransactionId,
      transactionId,
      status,
      resolvedEnvironment,
      resolvedExpiresIso,
      periodEndSource,
      transactionExpiresDate: effectiveTransaction.expiresDate ?? null,
      offerType: effectiveTransaction.offerType ?? null,
      offerIdentifier: effectiveTransaction.offerIdentifier ?? null,
    });

    const subscriptionUpdate: Record<string, unknown> = {
      user_id: resolvedUserId,
      provider: "app_store",
      store_product_id: storeProductId,
      plan: catalogProduct.plan,
      status,
      billing_interval: catalogProduct.billing_interval,
      current_period_end:
        catalogProduct.plan === "lifetime" ? null : resolvedExpiresIso,
      trial_start: trialStartIso,
      trial_end: trialEndIso,
      cancel_at_period_end: false,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      play_purchase_token: null,
      play_order_id: null,
      play_package_name: null,
      app_store_transaction_id: transactionId,
      app_store_original_transaction_id: originalTransactionId,
      app_store_environment: toStoredAppStoreEnvironment(resolvedEnvironment),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(subscriptionUpdate, { onConflict: "user_id" });

    if (upsertError) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: upsertError,
        context: getAppStoreDiagnosticsContext({
          phase: "upsert_subscription",
          userId: resolvedUserId,
          storeProductId,
          originalTransactionId,
          transactionId,
          environment,
        }),
      });
      console.error(
        "Failed to upsert subscription from App Store notification:",
        upsertError,
      );
      return new Response(
        JSON.stringify({ error: "Failed to update subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    await reportEdgeFunctionError({
      functionName: "app-store-notifications",
      error,
      context: {
        ...notificationLogContext,
        phase: "serve_handler",
      },
    });
    console.error("app-store-notifications error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
