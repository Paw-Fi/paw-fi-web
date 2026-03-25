import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import {
  AppStoreServerAPIClient,
  Environment,
  GetTransactionHistoryVersion,
  type JWSTransactionDecodedPayload,
  Order,
  ProductType,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  ensureAppStoreOwnership,
  getAppStoreOwnershipBinding,
  hasAppStoreOwnershipConflict,
} from "../shared/iap-ownership.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

type AppStoreEnvironment = "sandbox" | "production";

interface AppStoreNotificationDecodedPayload {
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
    .replace(/\\\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
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
  };
}

function getValidatedApplePrivateKey(): string {
  const normalized = normalizePrivateKey(appStorePrivateKeyRaw);
  if (!normalized) {
    throw new Error("APPLE_APP_STORE_PRIVATE_KEY is empty after normalization");
  }

  const hasBegin =
    normalized.includes("-----BEGIN") &&
    normalized.includes("PRIVATE KEY-----");
  const hasEnd =
    normalized.includes("-----END") && normalized.includes("PRIVATE KEY-----");

  if (!hasBegin || !hasEnd) {
    throw new Error("APPLE_APP_STORE_PRIVATE_KEY is missing PEM markers");
  }

  return normalized;
}

function isAppleServerApiConfigured(): boolean {
  return Boolean(
    appStoreIssuerId &&
      appStoreKeyId &&
      appStorePrivateKeyRaw &&
      appStoreBundleId &&
      appStoreAppId,
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

async function fetchAppStoreTransactionByTransactionId(params: {
  privateKey: string;
  transactionId: string;
  environment: Environment;
}): Promise<JWSTransactionDecodedPayload | null> {
  const client = new AppStoreServerAPIClient(
    params.privateKey,
    appStoreKeyId,
    appStoreIssuerId,
    appStoreBundleId,
    params.environment,
  );

  const response = await client.getTransactionInfo(params.transactionId);
  const signedTransaction = asString(response?.signedTransactionInfo);
  if (!signedTransaction) return null;

  return decodeJwsPayload<JWSTransactionDecodedPayload>(signedTransaction);
}

async function fetchLatestAppStoreTransactionByOriginalId(params: {
  privateKey: string;
  originalTransactionId: string;
  environment: Environment;
}): Promise<JWSTransactionDecodedPayload | null> {
  const client = new AppStoreServerAPIClient(
    params.privateKey,
    appStoreKeyId,
    appStoreIssuerId,
    appStoreBundleId,
    params.environment,
  );

  const historyRequest = {
    sort: Order.DESCENDING,
    revoked: true,
    productTypes: [ProductType.AUTO_RENEWABLE, ProductType.NON_CONSUMABLE],
  };

  const response = await client.getTransactionHistory(
    params.originalTransactionId,
    null,
    historyRequest,
    GetTransactionHistoryVersion.V2,
  );

  const signedTransaction = response?.signedTransactions?.[0];
  if (!signedTransaction) return null;
  return decodeJwsPayload<JWSTransactionDecodedPayload>(signedTransaction);
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

function looksLikeStripeSubscriptionId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("sub_");
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

  // Heuristic: treat missing provider but present stripe subscription id as Stripe.
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

async function decodeNotification(signedPayload: string): Promise<{
  transaction: JWSTransactionDecodedPayload;
  environment: AppStoreEnvironment;
}> {
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
        phase: "private_key_validation",
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
  let resolvedEnvironment = envHint;

  if (transactionId) {
    try {
      verifiedTransaction = await fetchAppStoreTransactionByTransactionId({
        privateKey,
        transactionId,
        environment: envHint,
      });
    } catch (error) {
      void reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error,
        context: {
          phase: "fetch_transaction_info",
          environment:
            envHint === Environment.SANDBOX ? "sandbox" : "production",
          transactionId,
        },
      });
    }
  }

  if (!verifiedTransaction && originalTransactionId) {
    try {
      verifiedTransaction = await fetchLatestAppStoreTransactionByOriginalId({
        privateKey,
        originalTransactionId,
        environment: envHint,
      });
    } catch (error) {
      void reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error,
        context: {
          phase: "fetch_transaction_history",
          environment:
            envHint === Environment.SANDBOX ? "sandbox" : "production",
          originalTransactionId,
        },
      });
    }
  }

  if (!verifiedTransaction) {
    throw new Error("Unable to validate App Store transaction via server API");
  }

  if (verifiedTransaction.bundleId !== appStoreBundleId) {
    throw new Error("App Store bundleId mismatch");
  }

  return {
    transaction: verifiedTransaction,
    environment: toAppStoreEnvironmentLabel(
      asString(verifiedTransaction.environment),
    ),
  };
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

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
        context: {
          phase: "configuration_validation",
          hasBundleId: Boolean(appStoreBundleId),
          hasAppStoreAppId: Boolean(appStoreAppId),
        },
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

    const { transaction, environment } =
      await decodeNotification(signedPayload);

    const storeProductId = asString(transaction.productId);
    const originalTransactionId = asString(transaction.originalTransactionId);
    const transactionId = asString(transaction.transactionId);

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
        context: {
          phase: "load_subscription_product",
          storeProductId,
          originalTransactionId,
          transactionId,
          environment,
        },
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
    let hasLegacyOwnershipConflict = false;

    if (iapOwnershipBindingEnabled) {
      const existingBinding = await getAppStoreOwnershipBinding({
        supabase,
        originalTransactionId,
      });
      userId = existingBinding?.user_id ?? null;

      if (userId == null) {
        hasLegacyOwnershipConflict = await hasAppStoreOwnershipConflict({
          supabase,
          originalTransactionId,
        });
      }
    }

    const appAccountToken = asString(transaction.appAccountToken);
    if (!userId && appAccountToken && isUuid(appAccountToken)) {
      userId = appAccountToken;
    }

    if (hasLegacyOwnershipConflict) {
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
          context: {
            phase: "load_legacy_subscription_mapping",
            originalTransactionId,
            transactionId,
            environment,
          },
        });
        return new Response(
          JSON.stringify({ error: "Failed to load subscription mapping" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      userId = asString(existingSub?.user_id);
    }

    if (!userId) {
      console.warn("App Store notification without user mapping", {
        originalTransactionId,
        transactionId,
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

    // Best-effort: If user switches to App Store billing, cancel any existing Stripe recurring sub
    // to avoid double-billing.
    await cancelStripeSubscriptionIfPresent(resolvedUserId);

    const status = deriveStatus(transaction);
    const expiresIso = asIsoMillis(asString(transaction.expiresDate));

    const subscriptionUpdate: Record<string, unknown> = {
      user_id: resolvedUserId,
      provider: "app_store",
      store_product_id: storeProductId,
      plan: catalogProduct.plan,
      status,
      billing_interval: catalogProduct.billing_interval,
      current_period_end:
        catalogProduct.plan === "lifetime" ? null : expiresIso,
      cancel_at_period_end: false,
      // Provider hygiene: clear non-App-Store identifiers.
      stripe_customer_id: null,
      stripe_subscription_id: null,
      play_purchase_token: null,
      play_order_id: null,
      play_package_name: null,
      app_store_transaction_id: transactionId,
      app_store_original_transaction_id: originalTransactionId,
      app_store_environment: environment,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(subscriptionUpdate, { onConflict: "user_id" });

    if (upsertError) {
      await reportEdgeFunctionError({
        functionName: "app-store-notifications",
        error: upsertError,
        context: {
          phase: "upsert_subscription",
          userId: resolvedUserId,
          storeProductId,
          originalTransactionId,
          transactionId,
          environment,
        },
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
