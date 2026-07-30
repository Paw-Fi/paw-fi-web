import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { verifyAppleReceipt } from "../shared/apple-verify-receipt.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { hasActiveHouseholdSubscriptionAccess } from "../shared/household-subscription-sharing.ts";
import {
  Environment,
  type JWSTransactionDecodedPayload,
  Status,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";
import { getGoogleAccessToken } from "../shared/google-auth.ts";
import {
  type AppStoreSubscriptionStatusLookup,
  decodeJwsPayload,
  fetchLatestAppStoreTransactionByOriginalId,
  findAppStoreSubscriptionStatusWithEnvironmentFallback,
  findAppStoreTransactionWithEnvironmentFallback,
  getValidatedAppStorePrivateKey,
  isAppStoreServerApiConfigured,
  matchesVerifiedAppStoreTransaction,
} from "../shared/app-store-api.ts";
import { resolveAppStoreSubscriptionLifecycle } from "../shared/app-store-subscription-state.ts";
import { resolveAnnualCommitmentSnapshot } from "../shared/subscription-commitment.ts";
import { decideSubscriptionEntitlementMutation } from "../shared/subscription-entitlement-policy.ts";
import {
  ensureAppStoreOwnership,
  getAppStoreOwnershipBinding,
  hasAppStoreOwnershipConflict,
  normalizeAppStoreInAppOwnershipType,
  PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE,
  purchaseOwnershipConflictMessage,
  shouldEnforceAppStoreOwnershipBinding,
} from "../shared/iap-ownership.ts";

type Platform = "ios" | "android";

type VerifyRequestBody = {
  platform: Platform;
  storeProductId: string;
  appAccountToken?: string | null;
  expectedBillingPlanType?: "MONTHLY" | "BILLED_UPFRONT";
  expectedCommitmentMonths?: 12;
  verificationData: {
    source?: string;
    localVerificationData?: string;
    serverVerificationData?: string;
  };
  purchaseId?: string | null;
  transactionDate?: string | null;
};

type SubscriptionPlan = "free" | "plus" | "premium" | "lifetime";
type BillingInterval = "monthly" | "yearly";
type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

function isPlatform(value: unknown): value is Platform {
  return value === "ios" || value === "android";
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

async function resolveActiveAuthUserId(
  supabase: any,
  candidateUserId: string | null,
): Promise<string | null> {
  if (!candidateUserId) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", candidateUserId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to verify auth user existence: ${error.message ?? String(error)}`,
    );
  }

  return data?.id ?? null;
}

async function attemptAutomaticAppStoreOwnershipTransfer(params: {
  supabase: any;
  originalTransactionId: string;
  currentUserId: string;
  transactionId: string | null;
  storeProductId: string;
  environment: string;
}): Promise<
  | { transferred: true; previousOwnerUserId: string }
  | { transferred: false; reason: string }
> {
  const binding = await getAppStoreOwnershipBinding({
    supabase: params.supabase,
    originalTransactionId: params.originalTransactionId,
  });

  if (!binding?.user_id) {
    return { transferred: false, reason: "binding_missing" };
  }

  if (binding.user_id === params.currentUserId) {
    return { transferred: false, reason: "already_owned_by_current_user" };
  }

  const { count: dependentCount, error: dependentCountError } = await params
    .supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("bound_to_user_id", binding.user_id)
    .or("status.eq.trialing,and(status.eq.active,plan.neq.free)");

  if (dependentCountError) {
    throw new Error(
      `Failed to inspect bound dependents before ownership transfer: ${
        dependentCountError.message ??
          dependentCountError.code ??
          String(dependentCountError)
      }`,
    );
  }

  if ((dependentCount ?? 0) > 0) {
    return { transferred: false, reason: "active_bound_dependents" };
  }

  const now = new Date().toISOString();
  const { error: transferError } = await params.supabase
    .from("iap_account_bindings")
    .update({
      user_id: params.currentUserId,
      latest_transaction_id: params.transactionId,
      store_product_id: params.storeProductId,
      app_store_environment: params.environment,
      claim_source: "verify_iap_purchase_auto_transfer",
      last_verified_at: now,
      updated_at: now,
    })
    .eq("id", binding.id);

  if (transferError) {
    throw new Error(
      `Failed to transfer App Store ownership binding: ${
        transferError.message ?? transferError.code ?? String(transferError)
      }`,
    );
  }

  return { transferred: true, previousOwnerUserId: binding.user_id };
}

function parseMsToIso(ms: string | null): string | null {
  if (!ms) return null;
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toIso(date: Date): string {
  return date.toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeJson<T>(value: unknown): T {
  return value as T;
}

function buildVerificationLogContext(params: {
  userId?: string | null;
  body?: VerifyRequestBody | null;
  storeProductId?: string | null;
  transactionId?: string | null;
  originalTransactionId?: string | null;
  environment?: Environment | null;
  phase?: string;
}) {
  const serverReceipt = asString(
    params.body?.verificationData?.serverVerificationData,
  );
  const localReceipt = asString(
    params.body?.verificationData?.localVerificationData,
  );

  return {
    phase: params.phase ?? "unknown",
    userId: params.userId ?? null,
    platform: params.body?.platform ?? null,
    storeProductId: params.storeProductId ?? null,
    purchaseId: params.body?.purchaseId ?? null,
    transactionDate: params.body?.transactionDate ?? null,
    verificationSource: params.body?.verificationData?.source ?? null,
    serverReceiptLength: serverReceipt?.length ?? 0,
    localReceiptLength: localReceipt?.length ?? 0,
    serverReceiptPrefix: serverReceipt ? serverReceipt.slice(0, 12) : null,
    localReceiptPrefix: localReceipt ? localReceipt.slice(0, 12) : null,
    transactionId: params.transactionId ?? null,
    originalTransactionId: params.originalTransactionId ?? null,
    environmentHint: params.environment === Environment.SANDBOX
      ? "sandbox"
      : params.environment === Environment.PRODUCTION
      ? "production"
      : null,
    appAccountToken: params.body?.appAccountToken ?? null,
  };
}

function buildAppStoreSubscriptionStatusContext(
  subscriptionStatusLookup: AppStoreSubscriptionStatusLookup | null,
) {
  return {
    appStoreSubscriptionStatus: subscriptionStatusLookup?.status ?? null,
    appStoreStatusOriginalTransactionId:
      subscriptionStatusLookup?.originalTransactionId ?? null,
    appStoreStatusTransactionId:
      subscriptionStatusLookup?.transaction?.transactionId ?? null,
    appStoreStatusTransactionProductId:
      subscriptionStatusLookup?.transaction?.productId ?? null,
    appStoreStatusTransactionExpiresDate: asIsoMillisUnknown(
      subscriptionStatusLookup?.transaction?.expiresDate,
    ),
    appStoreStatusRenewalProductId:
      typeof subscriptionStatusLookup?.renewalInfo?.productId === "string"
        ? subscriptionStatusLookup.renewalInfo.productId
        : null,
    appStoreStatusAutoRenewProductId:
      typeof subscriptionStatusLookup?.renewalInfo?.autoRenewProductId ===
          "string"
        ? subscriptionStatusLookup.renewalInfo.autoRenewProductId
        : null,
    appStoreStatusRenewalDate: asIsoMillisUnknown(
      subscriptionStatusLookup?.renewalInfo?.renewalDate,
    ),
    appStoreStatusGracePeriodExpiresDate: asIsoMillisUnknown(
      subscriptionStatusLookup?.renewalInfo?.gracePeriodExpiresDate,
    ),
    appStoreStatusBillingRetry:
      subscriptionStatusLookup?.renewalInfo?.isInBillingRetryPeriod ?? null,
    appStoreStatusAutoRenewStatus:
      subscriptionStatusLookup?.renewalInfo?.autoRenewStatus ?? null,
  };
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

function isFreeTrialTransaction(
  transaction: Pick<
    JWSTransactionDecodedPayload,
    "offerDiscountType" | "offerType" | "offerIdentifier"
  >,
): boolean {
  const offerDiscountType = typeof transaction.offerDiscountType === "string"
    ? transaction.offerDiscountType.toUpperCase()
    : "";
  const offerIdentifier =
    asString(transaction.offerIdentifier)?.toLowerCase() ?? "";
  const offerType = Number(transaction.offerType);

  return (
    offerDiscountType === "FREE_TRIAL" ||
    (offerType === 1 && offerIdentifier.includes("trial"))
  );
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// ============================================================
// ENV - Environment Configuration
// ============================================================
// This secret determines whether the app is running in production or development mode.
// It affects which Apple App Store environment is used for IAP verification.
//
// Values:
//   - "PROD" = Production environment (real purchases from App Store)
//   - "DEV"  = Development/Sandbox environment (test purchases from TestFlight/Sandbox)
//
// Where to set it:
//   - Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets
//   - Add key "ENV" with value "PROD" or "DEV"
//
// Default behavior:
//   - If ENV is not set or has an invalid value, defaults to Sandbox (safe for testing)
//   - This prevents accidental production charges during development
// ============================================================
const envSecret = Deno.env.get("ENV") || "";
const isProductionEnv = envSecret.toUpperCase() === "PROD";
const defaultAppStoreEnvironment = isProductionEnv
  ? Environment.PRODUCTION
  : Environment.SANDBOX;
const allowUnverifiedIapDevFallback = !isProductionEnv &&
  readBooleanEnv("ALLOW_UNVERIFIED_IAP_DEV_FALLBACK", false);

console.log(
  `🌍 Environment config: ENV="${envSecret}", isProduction=${isProductionEnv}, defaultAppStoreEnv=${
    isProductionEnv ? "Production" : "Sandbox"
  }`,
);

// APP_STORE_SHARED_SECRET
// Where to get it:
// - App Store Connect (https://appstoreconnect.apple.com) -> Your App -> App Information
// - Find "App-Specific Shared Secret" and generate/copy the value
// Where to set it:
// - Supabase Project -> Settings -> Secrets -> add key "APP_STORE_SHARED_SECRET"
//
// Used for server-side App Store receipt verification.
const appleSharedSecret = Deno.env.get("APP_STORE_SHARED_SECRET") || "";
const appStoreIssuerId = Deno.env.get("APPLE_APP_STORE_ISSUER_ID") || "";
const appStoreKeyId = Deno.env.get("APPLE_APP_STORE_KEY_ID") || "";
const appStorePrivateKeyRaw = Deno.env.get("APPLE_APP_STORE_PRIVATE_KEY") || "";
const appStoreBundleId = Deno.env.get("APPLE_BUNDLE_ID") || "";
const googleServiceAccountJson =
  Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") || "";
const androidPackageName = Deno.env.get("ANDROID_PACKAGE_NAME") || "";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() })
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

function asIsoMillis(value: string | null): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const date = new Date(n);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Detects if the given string is a JWS (JSON Web Signature).
 * StoreKit 2 sends JWS transactions that start with base64-encoded JSON header.
 */
function isJws(data: string): boolean {
  // JWS starts with base64url-encoded JSON header like {"alg":"ES256"...}
  // which encodes to "eyJ" (base64 of '{"')
  return data.startsWith("eyJ");
}

const appStoreApiConfig = {
  issuerId: appStoreIssuerId,
  keyId: appStoreKeyId,
  bundleId: appStoreBundleId,
  privateKey: appStorePrivateKeyRaw,
};

function isAppleServerApiConfigured(): boolean {
  return isAppStoreServerApiConfigured(appStoreApiConfig);
}

function getNormalizedAppStoreApiConfig() {
  const normalizedPrivateKey = getValidatedAppStorePrivateKey(
    appStorePrivateKeyRaw,
  );
  console.log("Private key format check:", {
    hasBeginMarker: normalizedPrivateKey.includes(
      "-----BEGIN PRIVATE KEY-----",
    ),
    hasEndMarker: normalizedPrivateKey.includes("-----END PRIVATE KEY-----"),
    hasNewlines: normalizedPrivateKey.includes("\n"),
    length: normalizedPrivateKey.length,
  });

  return {
    ...appStoreApiConfig,
    privateKey: normalizedPrivateKey,
  };
}

async function fetchLatestAppStoreTransaction(params: {
  originalTransactionId: string;
  environment: Environment;
}): Promise<JWSTransactionDecodedPayload | null> {
  if (!isAppleServerApiConfigured()) return null;

  return await fetchLatestAppStoreTransactionByOriginalId({
    config: getNormalizedAppStoreApiConfig(),
    originalTransactionId: params.originalTransactionId,
    environment: params.environment,
    revoked: false,
  });
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);
  let errorReportContext: Record<string, unknown> = {
    phase: "request_start",
    path: new URL(req.url).pathname,
  };

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

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId!;
    const body = safeJson<VerifyRequestBody>(
      await req.json().catch(() => null),
    );

    if (!body || !isPlatform(body.platform)) {
      return new Response(JSON.stringify({ error: "Invalid platform" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeProductId = asString(body.storeProductId);
    const requestAppAccountToken = asString(body.appAccountToken);
    let verificationLogContext = buildVerificationLogContext({
      userId,
      body,
      storeProductId,
      phase: "request_received",
    });
    errorReportContext = verificationLogContext;
    if (!storeProductId) {
      return new Response(
        JSON.stringify({ error: "storeProductId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate product exists in our catalog (prevents purchasing arbitrary SKUs)
    const { data: catalogProduct, error: catalogError } = await supabase
      .from("subscription_products")
      .select("platform, plan, billing_interval, store_product_id")
      .eq("platform", body.platform)
      .eq("store_product_id", storeProductId)
      .eq("is_active", true)
      .maybeSingle();

    if (catalogError || !catalogProduct) {
      console.error("Unknown store product:", { storeProductId, catalogError });
      return new Response(JSON.stringify({ error: "Unknown product" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Households: bound users cannot buy their own subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select(
        "id, provider, plan, status, bound_to_user_id, bound_to_household_id, stripe_subscription_id, trial_start, trial_end, current_period_end, billing_interval, payment_interval, commitment_months, commitment_end, cancel_at_period_end, store_product_id, app_store_original_transaction_id, lifetime_source, lifetime_source_id",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      (existingSub as any)?.provider === "stripe" &&
      ["active", "trialing", "past_due", "paused"].includes(
        String((existingSub as any)?.status || ""),
      )
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Your subscription is managed through Stripe. Cancel it before purchasing through the App Store.",
          code: "SUBSCRIPTION_MANAGED_BY_STRIPE",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if ((existingSub as any)?.bound_to_user_id) {
      const boundToUserId = (existingSub as any).bound_to_user_id as string;
      const { data: ownerSub, error: ownerSubError } = await supabase
        .from("subscriptions")
        .select("plan, status, bound_to_user_id, current_period_end, trial_end")
        .eq("user_id", boundToUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownerSubError) {
        console.error("Failed to verify household owner subscription:", {
          userId,
          boundToUserId,
          ownerSubError,
        });
        return new Response(
          JSON.stringify({ error: "Failed to verify household subscription" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const ownerHasActiveSubscription = hasActiveHouseholdSubscriptionAccess(
        ownerSub,
      );

      if (ownerHasActiveSubscription) {
        return new Response(
          JSON.stringify({
            error:
              "You are currently sharing a household subscription. Please leave the household first to manage your own subscription.",
            code: "BOUND_TO_HOUSEHOLD",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("Household binding ignored for purchase:", {
        userId,
        boundToUserId,
        boundToHouseholdId: (existingSub as any).bound_to_household_id,
        ownerPlan: ownerSub?.plan ?? null,
        ownerStatus: ownerSub?.status ?? null,
      });
    }

    const plan = catalogProduct.plan as SubscriptionPlan;
    const billingInterval =
      (catalogProduct.billing_interval as BillingInterval | null) ?? null;

    if (body.platform === "ios") {
      const serverReceipt = asString(
        body.verificationData?.serverVerificationData,
      );
      const localReceipt = asString(
        body.verificationData?.localVerificationData,
      );
      console.log("Receipt payload", {
        userId,
        source: body.verificationData?.source ?? null,
        serverLength: serverReceipt?.length ?? 0,
        localLength: localReceipt?.length ?? 0,
        requestAppAccountToken,
        purchaseId: body.purchaseId ?? null,
        transactionDate: body.transactionDate ?? null,
      });

      // StoreKit 2 sends JWS (starts with "eyJ"), StoreKit 1 sends base64 receipt
      const hasJws = serverReceipt && isJws(serverReceipt);
      console.log(
        "Verification mode:",
        hasJws ? "JWS (StoreKit 2)" : "Receipt (StoreKit 1)",
      );

      const now = Date.now();
      let status: SubscriptionStatus = "active";
      let currentPeriodEnd: string | null = null;
      let originalTransactionId: string | null = null;
      let transactionId: string | null = null;
      let verifiedTransactionAppAccountUserId: string | null = null;
      let transferredOwnershipFromUserId: string | null = null;
      let appStoreTrialStart: string | null = null;
      let appStoreTrialEnd: string | null = null;
      let appStoreOfferType: number | string | null = null;
      let appStoreOfferDiscountType: string | null = null;
      let appStoreOfferIdentifier: string | null = null;
      let appStoreInAppOwnershipType: "FAMILY_SHARED" | "PURCHASED" | null =
        null;
      let appStoreBillingPlanType: string | null = null;
      let appStoreCommitmentMonths: number | null = null;
      let appStoreCommitmentEnd: string | null = null;
      let appStoreCancelAtPeriodEnd: boolean | null = null;
      // Use the environment from ENV secret as default.
      // Will be updated based on JWS payload or App Store Server API response if available.
      // See ENV configuration comments at the top of this file for details.
      let environment: Environment = defaultAppStoreEnvironment;

      if (hasJws) {
        // ============================================================
        // StoreKit 2 JWS Verification Path
        // Validate transaction via App Store Server API.
        // Note: Local JWS signature verification is skipped because Deno
        // doesn't support crypto.X509Certificate required by SignedDataVerifier.
        // ============================================================
        if (!appStoreBundleId) {
          return new Response(
            JSON.stringify({ error: "APPLE_BUNDLE_ID not configured" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Step 1: Decode the client JWS only to extract lookup hints.
        // Trust is established only after Apple confirms the transaction via the
        // App Store Server API unless explicit non-production fallback is enabled.
        let decodedHint: JWSTransactionDecodedPayload;
        try {
          decodedHint = decodeJwsPayload(serverReceipt);
        } catch (decodeError) {
          console.error("Failed to decode JWS payload:", decodeError);
          return new Response(
            JSON.stringify({ error: "Invalid transaction" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (!decodedHint.transactionId) {
          console.error("❌ StoreKit 2 transaction is missing transactionId");
          return new Response(
            JSON.stringify({ error: "Invalid transaction" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const envString = decodedHint.environment?.toLowerCase();
        const envHint = envString === "sandbox"
          ? Environment.SANDBOX
          : Environment.PRODUCTION;
        verificationLogContext = buildVerificationLogContext({
          userId,
          body,
          storeProductId,
          transactionId: decodedHint.transactionId ?? null,
          originalTransactionId: decodedHint.originalTransactionId ?? null,
          environment: envHint,
          phase: "decoded_storekit2_jws",
        });
        errorReportContext = verificationLogContext;

        console.log("Decoded StoreKit 2 transaction hint:", {
          userId,
          storeProductId,
          requestAppAccountToken,
          transactionId: decodedHint.transactionId ?? null,
          originalTransactionId: decodedHint.originalTransactionId ?? null,
          bundleId: decodedHint.bundleId ?? null,
          productId: decodedHint.productId ?? null,
          purchaseDate: decodedHint.purchaseDate ?? null,
          expiresDate: decodedHint.expiresDate ?? null,
          transactionReason: decodedHint.transactionReason ?? null,
          inAppOwnershipType:
            (decodedHint as Record<string, unknown>).inAppOwnershipType ?? null,
          offerType: decodedHint.offerType ?? null,
          offerDiscountType: decodedHint.offerDiscountType ?? null,
          offerIdentifier: decodedHint.offerIdentifier ?? null,
          appAccountToken: decodedHint.appAccountToken ?? null,
          environment: decodedHint.environment ?? null,
        });

        // ============================================================
        // DENO COMPATIBILITY: Skip local JWS cryptographic verification
        // ============================================================
        // Deno doesn't support crypto.X509Certificate which the
        // @apple/app-store-server-library's SignedDataVerifier requires.
        //
        // Instead, we validate the transaction via the App Store Server API:
        // 1. Decode the JWS payload (without crypto verification) to get IDs
        // 2. Call App Store Server API to fetch and validate the transaction
        // 3. Trust the API response since it comes directly from Apple
        // ============================================================

        let decodedTransaction: JWSTransactionDecodedPayload;
        let usedServerValidatedTransaction = false;
        let serverRevocationDate: number | undefined = undefined;

        // Validate bundle ID matches our app
        if (decodedHint.bundleId !== appStoreBundleId) {
          console.error("❌ Bundle ID mismatch:", {
            expected: appStoreBundleId,
            received: decodedHint.bundleId,
          });
          return new Response(
            JSON.stringify({
              error: "Bundle ID mismatch",
              details:
                `Expected ${appStoreBundleId}, got ${decodedHint.bundleId}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Try to validate via App Store Server API (preferred method for Deno)
        if (
          isAppleServerApiConfigured() &&
          (decodedHint.transactionId || decodedHint.originalTransactionId)
        ) {
          console.log("🔐 Validating transaction via App Store Server API...");
          console.log("🔐 Transaction ID:", decodedHint.transactionId ?? null);
          console.log(
            "🔐 Original Transaction ID:",
            decodedHint.originalTransactionId,
          );
          console.log("🔐 Environment hint:", envHint);

          try {
            const transactionLookup =
              await findAppStoreTransactionWithEnvironmentFallback({
                config: getNormalizedAppStoreApiConfig(),
                environmentHint: envHint,
                transactionId: decodedHint.transactionId,
                originalTransactionId: decodedHint.originalTransactionId,
              });
            const serverTransaction = transactionLookup.transaction;
            environment = transactionLookup.environment;

            console.log("App Store transaction lookup result:", {
              userId,
              storeProductId,
              requestedTransactionId: decodedHint.transactionId ?? null,
              requestedOriginalTransactionId:
                decodedHint.originalTransactionId ?? null,
              resolvedEnvironment: environment === Environment.SANDBOX
                ? "Sandbox"
                : "Production",
              foundTransactionId: serverTransaction?.transactionId ?? null,
              foundOriginalTransactionId:
                serverTransaction?.originalTransactionId ?? null,
              foundExpiresDate: serverTransaction?.expiresDate ?? null,
              foundOfferType: serverTransaction?.offerType ?? null,
              foundOfferDiscountType: serverTransaction?.offerDiscountType ??
                null,
              foundOfferIdentifier: serverTransaction?.offerIdentifier ?? null,
              foundTransactionReason: serverTransaction?.transactionReason ??
                null,
            });

            if (serverTransaction && environment !== envHint) {
              console.log("🔐 Retrying with environment:", environment);
            }

            if (serverTransaction) {
              if (
                decodedHint.transactionId &&
                !matchesVerifiedAppStoreTransaction({
                  hint: {
                    transactionId: decodedHint.transactionId,
                    originalTransactionId: decodedHint.originalTransactionId,
                    bundleId: decodedHint.bundleId,
                  },
                  verified: {
                    transactionId: serverTransaction.transactionId,
                    originalTransactionId:
                      serverTransaction.originalTransactionId,
                    bundleId: serverTransaction.bundleId,
                  },
                })
              ) {
                console.error(
                  "❌ App Store transaction mismatch between client JWS and Apple response",
                  {
                    hintedTransactionId: decodedHint.transactionId,
                    hintedOriginalTransactionId:
                      decodedHint.originalTransactionId,
                    verifiedTransactionId: serverTransaction.transactionId,
                    verifiedOriginalTransactionId:
                      serverTransaction.originalTransactionId,
                  },
                );
                return new Response(
                  JSON.stringify({
                    error: "Transaction verification failed",
                    details: "Apple could not verify the submitted purchase.",
                  }),
                  {
                    status: 400,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  },
                );
              }

              console.log(
                "✅ Transaction validated via App Store Server API:",
                {
                  transactionId: serverTransaction.transactionId,
                  originalTransactionId:
                    serverTransaction.originalTransactionId,
                  productId: serverTransaction.productId,
                  environment: serverTransaction.environment,
                },
              );

              // Use the server-validated transaction data
              decodedTransaction = serverTransaction;
              usedServerValidatedTransaction = true;
              serverRevocationDate = serverTransaction.revocationDate;
            } else {
              // Server API didn't return a transaction
              if (!allowUnverifiedIapDevFallback) {
                await reportEdgeFunctionError({
                  functionName: "verify-iap-purchase",
                  error: new Error(
                    "App Store API returned no transaction for submitted purchase",
                  ),
                  context: {
                    ...verificationLogContext,
                    phase: "app_store_api_transaction_not_found",
                  },
                });
                console.error(
                  "🚨 App Store Server API returned no transaction. Rejecting request.",
                );
                console.error(
                  "🚨 This could indicate: (1) Very new transaction not yet propagated, (2) Invalid transaction ID, or (3) Fraudulent request.",
                );
                return new Response(
                  JSON.stringify({
                    error: "Transaction verification failed",
                    details:
                      "Could not verify transaction with Apple. Please try again in a few moments.",
                  }),
                  {
                    status: 400,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  },
                );
              }
              console.warn(
                "⚠️ Explicit unverified App Store fallback enabled; using decoded JWS data because Apple returned no transaction.",
              );
              decodedTransaction = decodedHint;
              environment = envHint;
            }
          } catch (apiError) {
            if (!allowUnverifiedIapDevFallback) {
              await reportEdgeFunctionError({
                functionName: "verify-iap-purchase",
                error: apiError,
                context: {
                  ...verificationLogContext,
                  phase: "app_store_api_call_failed",
                },
              });
              console.error(
                "🚨 App Store Server API call failed. Rejecting request.",
              );
              console.error(
                "🚨 Error:",
                apiError instanceof Error ? apiError.message : apiError,
              );
              console.error(
                "🚨 Verify APPLE_APP_STORE_* environment variables are correctly configured.",
              );
              return new Response(
                JSON.stringify({
                  error: "Transaction verification failed",
                  details:
                    "Could not verify transaction with Apple. Please try again later.",
                }),
                {
                  status: 500,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                },
              );
            }
            console.warn(
              "⚠️ Explicit unverified App Store fallback enabled after API failure:",
              apiError instanceof Error ? apiError.message : apiError,
            );
            decodedTransaction = decodedHint;
            environment = envHint;
          }
        } else {
          if (!allowUnverifiedIapDevFallback) {
            await reportEdgeFunctionError({
              functionName: "verify-iap-purchase",
              error: new Error("App Store API configuration missing"),
              context: {
                ...verificationLogContext,
                phase: "app_store_api_config_missing",
                hasIssuerId: Boolean(appStoreIssuerId),
                hasKeyId: Boolean(appStoreKeyId),
                hasPrivateKey: Boolean(appStorePrivateKeyRaw),
                hasBundleId: Boolean(appStoreBundleId),
              },
            });
            console.error(
              "🚨 App Store Server API not configured. Rejecting request.",
            );
            console.error(
              "🚨 Configure APPLE_APP_STORE_ISSUER_ID, APPLE_APP_STORE_KEY_ID, APPLE_APP_STORE_PRIVATE_KEY, and APPLE_BUNDLE_ID.",
            );
            return new Response(
              JSON.stringify({
                error: "Server configuration error",
                details:
                  "IAP verification is not properly configured. Please contact support.",
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
          console.warn(
            "⚠️ Explicit unverified App Store fallback enabled without full App Store API configuration.",
          );
          decodedTransaction = decodedHint;
          environment = envHint;
        }

        console.log("Transaction data to use:", {
          userId,
          transactionId: decodedTransaction.transactionId,
          originalTransactionId: decodedTransaction.originalTransactionId,
          productId: decodedTransaction.productId,
          appAccountToken: decodedTransaction.appAccountToken ?? null,
          type: decodedTransaction.type,
          environment: decodedTransaction.environment,
          purchaseDate: decodedTransaction.purchaseDate,
          expiresDate: decodedTransaction.expiresDate,
          revocationDate: decodedTransaction.revocationDate,
          offerType: decodedTransaction.offerType ?? null,
          offerDiscountType: decodedTransaction.offerDiscountType ?? null,
          offerIdentifier: decodedTransaction.offerIdentifier ?? null,
          transactionReason: decodedTransaction.transactionReason ?? null,
          inAppOwnershipType: (decodedTransaction as Record<string, unknown>)
            .inAppOwnershipType ?? null,
        });

        const verifiedTransactionRecord = decodedTransaction as Record<
          string,
          unknown
        >;
        appStoreBillingPlanType = String(
          verifiedTransactionRecord.billingPlanType ?? "",
        ).toUpperCase() || null;
        const commitmentInfo = verifiedTransactionRecord.commitmentInfo as
          | Record<string, unknown>
          | null
          | undefined;
        const totalBillingPeriods = Number(commitmentInfo?.totalBillingPeriods);
        const commitmentExpiresDate = Number(
          commitmentInfo?.commitmentExpiresDate,
        );
        if (
          appStoreBillingPlanType === "MONTHLY" &&
          totalBillingPeriods === 12 &&
          Number.isFinite(commitmentExpiresDate)
        ) {
          appStoreCommitmentMonths = 12;
          appStoreCommitmentEnd = new Date(commitmentExpiresDate).toISOString();
        }

        if (
          body.expectedBillingPlanType &&
          appStoreBillingPlanType !== body.expectedBillingPlanType
        ) {
          return new Response(
            JSON.stringify({ error: "App Store billing plan mismatch" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        if (
          body.expectedCommitmentMonths === 12 &&
          (appStoreCommitmentMonths !== 12 || !appStoreCommitmentEnd)
        ) {
          return new Response(
            JSON.stringify({ error: "App Store commitment terms mismatch" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Legacy code path for additional server validation (kept for compatibility)
        // This section is now mostly redundant since we validate above
        if (
          isAppleServerApiConfigured() &&
          decodedTransaction.originalTransactionId &&
          !serverRevocationDate &&
          !usedServerValidatedTransaction
        ) {
          try {
            console.log(
              "Additional revocation check via App Store Server API...",
            );
            const serverTransaction = await fetchLatestAppStoreTransaction({
              originalTransactionId: decodedTransaction.originalTransactionId,
              environment,
            });

            if (serverTransaction) {
              console.log("App Store Server API validation successful");
              // Only use server data for revocation check - DO NOT replace transaction data
              // Server history might contain OLD expired transactions which would corrupt our data
              if (
                serverTransaction.productId === storeProductId &&
                serverTransaction.originalTransactionId ===
                  decodedTransaction.originalTransactionId
              ) {
                serverRevocationDate = serverTransaction.revocationDate;
              }

              console.log("Server API check:", {
                serverRevocationDate,
                serverExpiresDate: serverTransaction.expiresDate,
                clientExpiresDate: decodedTransaction.expiresDate,
                note:
                  "Using client transaction data, server API for revocation only",
              });
            } else {
              console.log(
                "App Store Server API returned no transaction, using decoded JWS data",
              );
            }
          } catch (apiError) {
            // Log but don't fail - the decoded JWS data is still usable
            console.warn(
              "App Store Server API validation failed, using decoded JWS data:",
              apiError,
            );
          }
        } else {
          console.log(
            "Skipping legacy revocation re-check because the transaction already came from the App Store API",
          );
        }

        // Validate product ID matches
        if (decodedTransaction.productId !== storeProductId) {
          console.error("Product ID mismatch:", {
            expected: storeProductId,
            received: decodedTransaction.productId,
          });
          return new Response(
            JSON.stringify({ error: "Product ID mismatch" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Check for revocation (refund) - check both client JWS and server API
        if (decodedTransaction.revocationDate || serverRevocationDate) {
          console.log("Purchase was refunded:", {
            clientRevocationDate: decodedTransaction.revocationDate,
            serverRevocationDate,
          });
          return new Response(
            JSON.stringify({ error: "Purchase was refunded" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        transactionId = decodedTransaction.transactionId ?? null;
        originalTransactionId = decodedTransaction.originalTransactionId ??
          null;
        appStoreInAppOwnershipType = normalizeAppStoreInAppOwnershipType(
          (decodedTransaction as Record<string, unknown>).inAppOwnershipType,
        );
        const transactionAppAccountToken = asString(
          decodedTransaction.appAccountToken,
        );
        verifiedTransactionAppAccountUserId =
          transactionAppAccountToken && isUuid(transactionAppAccountToken)
            ? await resolveActiveAuthUserId(
              supabase,
              transactionAppAccountToken,
            )
            : null;

        if (
          verifiedTransactionAppAccountUserId &&
          verifiedTransactionAppAccountUserId !== userId &&
          shouldEnforceAppStoreOwnershipBinding(appStoreInAppOwnershipType)
        ) {
          const transferResult =
            await attemptAutomaticAppStoreOwnershipTransfer({
              supabase,
              originalTransactionId: decodedTransaction.originalTransactionId ??
                decodedTransaction.transactionId!,
              currentUserId: userId,
              transactionId: decodedTransaction.transactionId ?? null,
              storeProductId,
              environment: environment === Environment.SANDBOX
                ? "Sandbox"
                : "Production",
            });

          if (transferResult.transferred) {
            transferredOwnershipFromUserId = transferResult.previousOwnerUserId;
            verifiedTransactionAppAccountUserId = userId;
            console.warn(
              "Auto-transferred App Store ownership after verified token mismatch",
              {
                fromUserId: transferResult.previousOwnerUserId,
                toUserId: userId,
                originalTransactionId: decodedTransaction.originalTransactionId,
                transactionId: decodedTransaction.transactionId,
              },
            );
          } else {
            await reportEdgeFunctionError({
              functionName: "verify-iap-purchase",
              error: new Error(
                "Verified App Store appAccountToken does not match auth user",
              ),
              context: {
                ...verificationLogContext,
                phase: "verified_app_account_token_mismatch",
                verifiedTransactionAppAccountUserId,
                authUserId: userId,
                transferBlockedReason: transferResult.reason,
              },
            });
            console.error(
              "App Store appAccountToken does not match auth user",
              {
                authUserId: userId,
                requestAppAccountToken,
                transactionAppAccountToken,
                verifiedTransactionAppAccountUserId,
                originalTransactionId,
                transactionId,
                storeProductId,
                transferBlockedReason: transferResult.reason,
              },
            );
            return new Response(
              JSON.stringify({
                error: purchaseOwnershipConflictMessage(),
                code: PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE,
              }),
              {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }

        if (requestAppAccountToken && requestAppAccountToken !== userId) {
          await reportEdgeFunctionError({
            functionName: "verify-iap-purchase",
            error: new Error(
              "Request appAccountToken does not match auth user",
            ),
            context: {
              ...verificationLogContext,
              phase: "request_app_account_token_mismatch",
              requestAppAccountToken,
              authUserId: userId,
            },
          });
          console.error(
            "verify-iap-purchase request appAccountToken mismatch",
            {
              authUserId: userId,
              requestAppAccountToken,
              originalTransactionId,
              transactionId,
              storeProductId,
            },
          );
          return new Response(
            JSON.stringify({
              error: purchaseOwnershipConflictMessage(),
              code: PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE,
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (plan === "lifetime") {
          // Non-consumable: just needs to exist and not be revoked
          status = "active";
          currentPeriodEnd = null;
        } else {
          // Subscription: resolve the verified transaction into a lifecycle
          // state. A past expiresDate is valid for expired subscriptions.
          const expiresDate = decodedTransaction.expiresDate;
          const now = Date.now();

          let expiresMs: number | null = null;
          if (expiresDate !== undefined && expiresDate !== null) {
            expiresMs = typeof expiresDate === "number"
              ? expiresDate
              : parseInt(String(expiresDate), 10);

            if (!Number.isFinite(expiresMs)) {
              expiresMs = null;
            }
          }

          let subscriptionStatusLookup:
            | AppStoreSubscriptionStatusLookup
            | null = null;

          if (isAppleServerApiConfigured() && transactionId) {
            try {
              const subscriptionStatusResult =
                await findAppStoreSubscriptionStatusWithEnvironmentFallback({
                  config: getNormalizedAppStoreApiConfig(),
                  environmentHint: environment,
                  transactionId,
                  originalTransactionId,
                  productId: storeProductId,
                });
              subscriptionStatusLookup = subscriptionStatusResult.subscription;

              if (
                subscriptionStatusLookup &&
                subscriptionStatusResult.environment !== environment
              ) {
                environment = subscriptionStatusResult.environment;
              }
            } catch (error) {
              await reportEdgeFunctionError({
                functionName: "verify-iap-purchase",
                error,
                context: {
                  ...verificationLogContext,
                  phase: "app_store_subscription_status_lookup_failed",
                  billingInterval,
                  originalTransactionId,
                  transactionId,
                  environment: environment === Environment.SANDBOX
                    ? "Sandbox"
                    : "Production",
                  appleExpiresMs: expiresMs,
                  appleExpiresDate: expiresMs
                    ? new Date(expiresMs).toISOString()
                    : null,
                  submittedProductId: decodedTransaction.productId ?? null,
                  submittedPurchaseDate: asIsoMillisUnknown(
                    decodedTransaction.purchaseDate,
                  ),
                },
              });
            }
          }

          console.log("Parsing expiry date:", {
            userId,
            transactionId: decodedTransaction.transactionId ?? null,
            originalTransactionId: decodedTransaction.originalTransactionId ??
              null,
            rawExpiresDate: expiresDate,
            parsedExpiresMs: expiresMs,
            nowMs: now,
            isExpired: expiresMs ? expiresMs <= now : "unknown",
            purchaseDate: decodedTransaction.purchaseDate ?? null,
            offerType: decodedTransaction.offerType ?? null,
            offerDiscountType: decodedTransaction.offerDiscountType ?? null,
            offerIdentifier: decodedTransaction.offerIdentifier ?? null,
            subscriptionStatus: subscriptionStatusLookup?.status ?? null,
            renewalDate: subscriptionStatusLookup?.renewalInfo?.renewalDate ??
              null,
            gracePeriodExpiresDate:
              subscriptionStatusLookup?.renewalInfo?.gracePeriodExpiresDate ??
                null,
          });

          if (
            subscriptionStatusLookup?.status === Status.REVOKED &&
            !decodedTransaction.revocationDate &&
            !serverRevocationDate
          ) {
            console.log("Purchase was revoked by App Store status lookup:", {
              userId,
              transactionId: decodedTransaction.transactionId ?? null,
              originalTransactionId: decodedTransaction.originalTransactionId ??
                null,
              subscriptionStatus: subscriptionStatusLookup.status,
            });
            return new Response(
              JSON.stringify({ error: "Purchase was refunded" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          const lifecycle = resolveAppStoreSubscriptionLifecycle({
            transaction: decodedTransaction,
            statusTransaction: subscriptionStatusLookup?.transaction ?? null,
            renewalInfo: subscriptionStatusLookup?.renewalInfo ?? null,
            subscriptionStatus: subscriptionStatusLookup?.status ?? null,
            nowMs: now,
          });

          if (lifecycle.currentPeriodEnd) {
            currentPeriodEnd = lifecycle.currentPeriodEnd;
            status = lifecycle.status;
            appStoreCancelAtPeriodEnd = lifecycle.cancelAtPeriodEnd;
            console.log("Using Apple's verified expiry date:", {
              userId,
              transactionId: decodedTransaction.transactionId ?? null,
              originalTransactionId: decodedTransaction.originalTransactionId ??
                null,
              currentPeriodEnd,
              status,
              expiresMs,
              purchaseDate: decodedTransaction.purchaseDate ?? null,
              offerType: decodedTransaction.offerType ?? null,
              offerDiscountType: decodedTransaction.offerDiscountType ?? null,
              offerIdentifier: decodedTransaction.offerIdentifier ?? null,
              subscriptionStatus: subscriptionStatusLookup?.status ?? null,
              renewalDate: subscriptionStatusLookup?.renewalInfo?.renewalDate ??
                null,
              gracePeriodExpiresDate:
                subscriptionStatusLookup?.renewalInfo?.gracePeriodExpiresDate ??
                  null,
            });
          } else {
            await reportEdgeFunctionError({
              functionName: "verify-iap-purchase",
              error: new Error(
                "Production App Store transaction missing valid expiry",
              ),
              context: {
                ...verificationLogContext,
                phase: "production_missing_expiry",
                billingInterval,
                appleExpiresMs: expiresMs,
                appleExpiresDate: expiresMs
                  ? new Date(expiresMs).toISOString()
                  : null,
                reason: expiresMs === null
                  ? "Missing expiry date"
                  : "No resolvable entitlement end",
                resolvedLifecycleStatus: lifecycle.status,
                resolvedCurrentPeriodEnd: lifecycle.currentPeriodEnd,
                submittedProductId: decodedTransaction.productId ?? null,
                submittedPurchaseDate: asIsoMillisUnknown(
                  decodedTransaction.purchaseDate,
                ),
                submittedExpiresDate: asIsoMillisUnknown(
                  decodedTransaction.expiresDate,
                ),
                ...buildAppStoreSubscriptionStatusContext(
                  subscriptionStatusLookup,
                ),
              },
            });
            return new Response(
              JSON.stringify({
                error: "Transaction verification failed",
                details: "Apple returned an invalid subscription expiry.",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          console.log("Final subscription status:", {
            userId,
            transactionId: decodedTransaction.transactionId ?? null,
            originalTransactionId: decodedTransaction.originalTransactionId ??
              null,
            status,
            currentPeriodEnd,
            trialStart: status === "trialing"
              ? asIsoMillisUnknown(decodedTransaction.purchaseDate)
              : null,
            trialEnd: status === "trialing" ? currentPeriodEnd : null,
            offerType: decodedTransaction.offerType ?? null,
            offerDiscountType: decodedTransaction.offerDiscountType ?? null,
            offerIdentifier: decodedTransaction.offerIdentifier ?? null,
            environment: environment === Environment.SANDBOX
              ? "Sandbox"
              : "Production",
          });

          appStoreTrialStart = status === "trialing"
            ? asIsoMillisUnknown(decodedTransaction.purchaseDate)
            : asString((existingSub as any)?.trial_start);
          appStoreTrialEnd = status === "trialing"
            ? currentPeriodEnd
            : asString((existingSub as any)?.trial_end);
          appStoreOfferType = decodedTransaction.offerType ?? null;
          appStoreOfferDiscountType =
            typeof decodedTransaction.offerDiscountType === "string"
              ? decodedTransaction.offerDiscountType
              : null;
          appStoreOfferIdentifier =
            typeof decodedTransaction.offerIdentifier === "string"
              ? decodedTransaction.offerIdentifier
              : null;

          if (
            status !== "trialing" &&
            originalTransactionId &&
            !appStoreTrialStart &&
            !appStoreTrialEnd
          ) {
            try {
              const originalTransactionLookup =
                await findAppStoreTransactionWithEnvironmentFallback({
                  config: getNormalizedAppStoreApiConfig(),
                  environmentHint: environment,
                  transactionId: originalTransactionId,
                  originalTransactionId,
                });
              const originalTransaction = originalTransactionLookup.transaction;
              if (
                originalTransaction &&
                isFreeTrialTransaction(originalTransaction)
              ) {
                appStoreTrialStart = asIsoMillisUnknown(
                  originalTransaction.purchaseDate,
                );
                appStoreTrialEnd = asIsoMillisUnknown(
                  originalTransaction.expiresDate,
                );
                console.log("Recovered original App Store trial history:", {
                  userId,
                  originalTransactionId,
                  recoveredTrialStart: appStoreTrialStart,
                  recoveredTrialEnd: appStoreTrialEnd,
                });
              }
            } catch (error) {
              await reportEdgeFunctionError({
                functionName: "verify-iap-purchase",
                error,
                context: {
                  ...verificationLogContext,
                  phase: "recover_original_trial_history",
                  originalTransactionId,
                },
              });
            }
          }
        }
      } else {
        // ============================================================
        // StoreKit 1 Legacy Receipt Verification Path
        // Use verifyReceipt endpoint for traditional base64 receipts
        // ============================================================
        if (!appleSharedSecret) {
          return new Response(
            JSON.stringify({ error: "Apple shared secret not configured" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const receiptData = localReceipt || serverReceipt;
        if (!receiptData) {
          return new Response(
            JSON.stringify({ error: "Missing iOS receipt data" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const receiptResponse = await verifyAppleReceipt({
          receiptData,
          sharedSecret: appleSharedSecret,
        });

        if (receiptResponse.status !== 0) {
          console.error("Apple receipt verification failed:", receiptResponse);
          return new Response(
            JSON.stringify({
              error: "Invalid receipt",
              appleStatus: receiptResponse.status,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        environment = receiptResponse.environment?.toLowerCase() === "sandbox"
          ? Environment.SANDBOX
          : Environment.PRODUCTION;

        if (plan === "lifetime") {
          // Non-consumable: must exist in receipt.in_app without cancellation_date
          const inApp = (receiptResponse.receipt?.in_app ?? []) as Array<
            Record<string, unknown>
          >;
          const matching = inApp
            .filter((x) => x["product_id"] === storeProductId)
            .sort(
              (a, b) =>
                Number(b["purchase_date_ms"] ?? 0) -
                Number(a["purchase_date_ms"] ?? 0),
            );

          const latest = matching[0];
          if (!latest) {
            return new Response(
              JSON.stringify({
                error: "Lifetime purchase not found in receipt",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          if (latest["cancellation_date_ms"]) {
            return new Response(
              JSON.stringify({ error: "Purchase was refunded" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          originalTransactionId = asString(latest["original_transaction_id"]);
          transactionId = asString(latest["transaction_id"]);
          appStoreInAppOwnershipType = normalizeAppStoreInAppOwnershipType(
            latest["in_app_ownership_type"],
          );
          status = "active";
          currentPeriodEnd = null;
        } else {
          const latestInfo = (receiptResponse.latest_receipt_info ??
            []) as Array<Record<string, unknown>>;
          const matching = latestInfo
            .filter((x) => x["product_id"] === storeProductId)
            .sort(
              (a, b) =>
                Number(b["expires_date_ms"] ?? 0) -
                Number(a["expires_date_ms"] ?? 0),
            );

          const latest = matching[0];
          if (!latest) {
            return new Response(
              JSON.stringify({ error: "Subscription not found in receipt" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          if (latest["cancellation_date_ms"]) {
            return new Response(
              JSON.stringify({ error: "Subscription was refunded" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          originalTransactionId = asString(latest["original_transaction_id"]);
          transactionId = asString(latest["transaction_id"]);
          appStoreInAppOwnershipType = normalizeAppStoreInAppOwnershipType(
            latest["in_app_ownership_type"],
          );
          const expiresIso = parseMsToIso(asString(latest["expires_date_ms"]));
          if (!expiresIso) {
            return new Response(
              JSON.stringify({ error: "Invalid subscription expiry" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          currentPeriodEnd = expiresIso;
          const expiresMs = Date.parse(expiresIso);
          if (!Number.isFinite(expiresMs) || expiresMs <= now) {
            status = "canceled";
          } else {
            status = latest["is_trial_period"] === "true"
              ? "trialing"
              : "active";
          }
        }

        // For StoreKit 1, optionally enhance with App Store Server API
        if (originalTransactionId) {
          try {
            const serverTransaction = await fetchLatestAppStoreTransaction({
              originalTransactionId,
              environment,
            });

            if (
              serverTransaction &&
              serverTransaction.productId === storeProductId
            ) {
              const serverTransactionAppAccountToken = asString(
                serverTransaction.appAccountToken,
              );
              verifiedTransactionAppAccountUserId =
                serverTransactionAppAccountToken &&
                  isUuid(serverTransactionAppAccountToken)
                  ? await resolveActiveAuthUserId(
                    supabase,
                    serverTransactionAppAccountToken,
                  )
                  : null;

              const serverTransactionId = asString(
                serverTransaction.transactionId,
              );
              if (serverTransactionId) {
                transactionId = serverTransactionId;
              }
              appStoreInAppOwnershipType = normalizeAppStoreInAppOwnershipType(
                (serverTransaction as Record<string, unknown>)
                  .inAppOwnershipType,
              ) ?? appStoreInAppOwnershipType;

              if (serverTransaction.revocationDate) {
                return new Response(
                  JSON.stringify({ error: "Subscription was refunded" }),
                  {
                    status: 400,
                    headers: {
                      ...corsHeaders,
                      "Content-Type": "application/json",
                    },
                  },
                );
              }

              if (plan !== "lifetime") {
                const serverExpiresIso = asIsoMillis(
                  asString(serverTransaction.expiresDate),
                );
                if (serverExpiresIso) {
                  currentPeriodEnd = serverExpiresIso;
                  const serverExpiresMs = Date.parse(serverExpiresIso);
                  status =
                    Number.isFinite(serverExpiresMs) && serverExpiresMs > now
                      ? "active"
                      : "canceled";
                }
              }
            }
          } catch (error) {
            console.warn("App Store Server API validation failed:", error);
          }
        }
      } // End of StoreKit 1 else block

      // Common path for both JWS and legacy receipt verification
      const eventKey = transactionId || originalTransactionId;
      if (!eventKey) {
        return new Response(
          JSON.stringify({ error: "Missing Apple transaction identifiers" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: idemError } = await supabase
        .from("iap_events")
        .insert({
          provider: "app_store",
          event_key: eventKey,
          user_id: userId,
          store_product_id: storeProductId,
        })
        .select("id")
        .maybeSingle();

      // Check if this is a first-time verification (not a duplicate)
      // No error = first time, Error 23505 = duplicate (not first time), Other error = fail
      const isFirstTimeVerification = !idemError;
      const isDuplicateVerification = idemError?.code === "23505";

      console.log("Idempotency check:", {
        eventKey,
        inAppOwnershipType: appStoreInAppOwnershipType,
        hasError: !!idemError,
        errorCode: idemError?.code,
        isFirstTimeVerification,
        isDuplicateVerification,
      });

      if (idemError && idemError.code !== "23505") {
        console.error("Failed to write iap_events:", idemError);
        return new Response(
          JSON.stringify({ error: "Failed to process purchase (idempotency)" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // CRITICAL FIX FOR SANDBOX REDIRECT LOOP
      // Apple Sandbox uses accelerated time - subscriptions expire in 5-7 minutes
      // and dates can be in the past.
      //
      // For Sandbox + expired subscription, we treat it as "active" if:
      // 1. First-time verification (user just purchased), OR
      // 2. Duplicate verification but was created/updated recently (within 1 hour)
      //    This handles repeated testing with same sandbox transaction
      //
      // This prevents the redirect loop while still allowing proper renewal handling.
      const isSandbox = environment === Environment.SANDBOX;

      console.log("Sandbox override check:", {
        isSandbox,
        isFirstTimeVerification,
        isDuplicateVerification,
        currentStatus: status,
        plan,
      });

      if (isSandbox && status === "canceled" && plan !== "lifetime") {
        // Always override for first-time verifications
        if (isFirstTimeVerification) {
          console.log("🔧 Sandbox first-time purchase override:", {
            wasStatus: status,
            newStatus: "active",
            reason: "First-time sandbox verification - user just purchased",
            currentPeriodEnd,
          });
          status = "active";
        } // For duplicates (repeated testing), check if recently created
        else if (isDuplicateVerification) {
          // Check when the subscription was last updated in our DB
          try {
            const { data: existingSub } = await supabase
              .from("subscriptions")
              .select("updated_at")
              .eq("user_id", userId)
              .maybeSingle();

            if (existingSub?.updated_at) {
              const updatedAt = new Date(existingSub.updated_at).getTime();
              const now = Date.now();
              const ageMinutes = (now - updatedAt) / (1000 * 60);
              const recentThresholdMinutes = 60; // 1 hour

              console.log(
                "Duplicate verification - checking subscription age:",
                {
                  updatedAt: existingSub.updated_at,
                  ageMinutes,
                  isRecent: ageMinutes < recentThresholdMinutes,
                },
              );

              if (ageMinutes < recentThresholdMinutes) {
                console.log("🔧 Sandbox duplicate override (recent):", {
                  wasStatus: status,
                  newStatus: "active",
                  reason: `Duplicate verification but subscription updated ${
                    Math.round(
                      ageMinutes,
                    )
                  } min ago`,
                  currentPeriodEnd,
                });
                status = "active";
              }
            }
          } catch (checkError) {
            console.warn("Failed to check subscription age:", checkError);
            // Fail safe: treat as active anyway for sandbox testing
            console.log("🔧 Sandbox duplicate override (fallback):", {
              wasStatus: status,
              newStatus: "active",
              reason:
                "Failed to check age, treating as active for sandbox testing",
            });
            status = "active";
          }
        }
      }

      const environmentString = environment === Environment.SANDBOX
        ? "Sandbox"
        : "Production";

      const currentIsActiveLifetime =
        (existingSub as any)?.plan === "lifetime" &&
        (existingSub as any)?.status === "active";
      if (currentIsActiveLifetime) {
        if (
          plan === "lifetime" &&
          status === "canceled" &&
          originalTransactionId
        ) {
          const { data: revoked, error: revocationError } = await supabase.rpc(
            "revoke_lifetime_entitlement_v1",
            {
              p_user_id: userId,
              p_source: "app_store",
              p_source_id: originalTransactionId,
              p_event_id: `app_store_verify_revoke:${
                transactionId ?? originalTransactionId
              }`,
            },
          );
          if (revocationError) {
            throw new Error(
              `Failed to apply source-verified App Store Lifetime revocation: ${revocationError.message}`,
            );
          }
          if (revoked === true) {
            const { data: revokedSubscription } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("user_id", userId)
              .maybeSingle();
            return new Response(
              JSON.stringify({
                verified: true,
                subscription: revokedSubscription,
              }),
              {
                status: 200,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              },
            );
          }
        }

        const isSameLifetimeGrant = plan === "lifetime" &&
          status === "active" &&
          (existingSub as any)?.lifetime_source === "app_store" &&
          Boolean(originalTransactionId) &&
          (existingSub as any)?.lifetime_source_id === originalTransactionId;
        if (
          plan === "lifetime" &&
          status === "active" &&
          !isSameLifetimeGrant
        ) {
          await reportEdgeFunctionError({
            functionName: "verify-iap-purchase",
            error: new Error(
              "Verified App Store Lifetime purchase cannot be represented alongside the current active Lifetime grant",
            ),
            context: {
              ...verificationLogContext,
              phase: "multiple_active_lifetime_grants_detected",
              currentLifetimeSource: (existingSub as any)?.lifetime_source ??
                null,
              incomingLifetimeSource: "app_store",
            },
          });
        }

        // Do not transfer purchase ownership or replace provenance when this
        // account already owns Lifetime from another purchase/provider.
        return new Response(
          JSON.stringify({ verified: true, subscription: existingSub }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const shouldEnforceOwnershipBinding =
        shouldEnforceAppStoreOwnershipBinding(appStoreInAppOwnershipType);

      if (
        iapOwnershipBindingEnabled &&
        originalTransactionId &&
        shouldEnforceOwnershipBinding
      ) {
        const hasLegacyConflict = await hasAppStoreOwnershipConflict({
          supabase,
          originalTransactionId,
        });

        if (hasLegacyConflict && !verifiedTransactionAppAccountUserId) {
          console.warn(
            "Blocking verification for unresolved legacy ownership conflict",
            {
              originalTransactionId,
              currentUserId: userId,
            },
          );
          return new Response(
            JSON.stringify({
              error:
                `${purchaseOwnershipConflictMessage()} If you still cannot restore after signing into the original account, please contact support.`,
              code: PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE,
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const ownershipDecision = await ensureAppStoreOwnership({
          supabase,
          provider: "app_store",
          originalTransactionId,
          currentUserId: userId,
          transactionId,
          storeProductId,
          environment: environmentString,
          claimSource: "verify_iap_purchase",
        });

        console.log("App Store ownership decision:", {
          originalTransactionId,
          currentUserId: userId,
          ownerUserId: ownershipDecision.binding.user_id,
          decision: ownershipDecision.kind,
        });

        if (ownershipDecision.kind === "owned_by_another_user") {
          const transferResult =
            await attemptAutomaticAppStoreOwnershipTransfer({
              supabase,
              originalTransactionId,
              currentUserId: userId,
              transactionId,
              storeProductId,
              environment: environmentString,
            });

          if (transferResult.transferred) {
            transferredOwnershipFromUserId = transferResult.previousOwnerUserId;
            console.warn(
              "Auto-transferred App Store ownership after binding conflict",
              {
                fromUserId: transferResult.previousOwnerUserId,
                toUserId: userId,
                originalTransactionId,
                transactionId,
              },
            );
          } else {
            await reportEdgeFunctionError({
              functionName: "verify-iap-purchase",
              error: new Error("App Store ownership bound to another user"),
              context: {
                ...verificationLogContext,
                phase: "ownership_bound_to_another_user",
                ownerUserId: ownershipDecision.binding.user_id,
                authUserId: userId,
                transferBlockedReason: transferResult.reason,
              },
            });
            return new Response(
              JSON.stringify({
                error: purchaseOwnershipConflictMessage(),
                code: PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE,
              }),
              {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }
      } else if (iapOwnershipBindingEnabled && !shouldEnforceOwnershipBinding) {
        console.log(
          "Skipping App Store ownership binding for family-shared entitlement",
          {
            userId,
            originalTransactionId,
            transactionId,
            storeProductId,
            inAppOwnershipType: appStoreInAppOwnershipType,
          },
        );
      } else if (iapOwnershipBindingEnabled) {
        console.warn(
          "Skipping ownership binding because original transaction id is missing",
          {
            userId,
            transactionId,
            storeProductId,
          },
        );
      }

      const entitlementDecision = decideSubscriptionEntitlementMutation(
        existingSub
          ? {
            provider: (existingSub as any).provider,
            plan: (existingSub as any).plan,
            status: (existingSub as any).status,
            stripeSubscriptionId: (existingSub as any).stripe_subscription_id,
            appStoreOriginalTransactionId: (existingSub as any)
              .app_store_original_transaction_id,
          }
          : null,
        {
          provider: "app_store",
          plan,
          status,
          appStoreOriginalTransactionId: originalTransactionId,
          allowProviderSwitch: true,
        },
      );

      if (entitlementDecision.kind === "preserve") {
        console.log(
          "Preserving current entitlement during App Store verification",
          {
            userId,
            reason: entitlementDecision.reason,
            currentProvider: (existingSub as any)?.provider ?? null,
            currentPlan: (existingSub as any)?.plan ?? null,
            incomingPlan: plan,
            incomingStatus: status,
          },
        );
        return new Response(
          JSON.stringify({ verified: true, subscription: existingSub }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const isSameAppStoreSubscription =
        (existingSub as any)?.provider === "app_store" &&
        (existingSub as any)?.store_product_id === storeProductId &&
        (existingSub as any)?.app_store_original_transaction_id ===
          originalTransactionId;
      const commitmentSnapshot = resolveAnnualCommitmentSnapshot({
        incomingMonths: appStoreCommitmentMonths,
        incomingEnd: appStoreCommitmentEnd,
        existingMonths: (existingSub as any)?.commitment_months,
        existingEnd: (existingSub as any)?.commitment_end,
        sameSubscription: isSameAppStoreSubscription,
        renews: (status === "active" || status === "trialing") &&
          appStoreCancelAtPeriodEnd === false,
        subscriptionStartUnixSeconds: now / 1000,
      });
      appStoreCommitmentMonths = commitmentSnapshot?.months ?? null;
      appStoreCommitmentEnd = commitmentSnapshot?.end ?? null;
      const cancelAtPeriodEnd = status === "canceled"
        ? false
        : appStoreCancelAtPeriodEnd ??
          (isSameAppStoreSubscription
            ? Boolean((existingSub as any)?.cancel_at_period_end)
            : false);

      const subscriptionUpdate: Record<string, unknown> = {
        user_id: userId,
        provider: "app_store",
        store_product_id: storeProductId,
        plan,
        status,
        billing_interval: billingInterval,
        payment_interval: appStoreBillingPlanType === "MONTHLY"
          ? "monthly"
          : billingInterval,
        commitment_months: appStoreCommitmentMonths,
        commitment_end: appStoreCommitmentEnd,
        bound_to_user_id: null,
        bound_to_household_id: null,
        // Provider hygiene: prevent mixed-source subscription rows.
        stripe_subscription_id: null,
        stripe_customer_id: null,
        play_purchase_token: null,
        play_order_id: null,
        play_package_name: null,
        current_period_end: plan === "lifetime" ? null : currentPeriodEnd,
        trial_start: appStoreTrialStart,
        trial_end: appStoreTrialEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        app_store_transaction_id: transactionId,
        app_store_original_transaction_id: originalTransactionId,
        app_store_environment: environmentString,
        app_store_in_app_ownership_type: appStoreInAppOwnershipType,
        lifetime_source: plan === "lifetime" ? "app_store" : null,
        lifetime_source_id: plan === "lifetime" ? originalTransactionId : null,
        updated_at: nowIso(),
      };

      console.log("Writing subscription to database:", {
        userId,
        plan,
        status,
        currentPeriodEnd,
        trialStart: appStoreTrialStart,
        trialEnd: appStoreTrialEnd,
        offerType: appStoreOfferType,
        offerDiscountType: appStoreOfferDiscountType,
        offerIdentifier: appStoreOfferIdentifier,
        inAppOwnershipType: appStoreInAppOwnershipType,
        environment: environmentString,
      });

      // If user previously had a Stripe subscription, best-effort cancel it to avoid double billing.
      if (
        stripe &&
        existingSub &&
        (existingSub as any).provider === "stripe" &&
        typeof (existingSub as any).stripe_subscription_id === "string" &&
        (existingSub as any).stripe_subscription_id.startsWith("sub_")
      ) {
        try {
          await stripe.subscriptions.cancel(
            (existingSub as any).stripe_subscription_id,
            {
              prorate: false,
            },
          );
        } catch (cancelError) {
          console.error("Failed to cancel previous Stripe subscription:", {
            userId,
            stripe_subscription_id: (existingSub as any).stripe_subscription_id,
            error: cancelError instanceof Error
              ? cancelError.message
              : String(cancelError),
          });
        }
      }

      // Upsert by user_id (one row per user, latest state)
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(subscriptionUpdate, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Failed to upsert subscription:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to update subscription" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (transferredOwnershipFromUserId) {
        if (plan === "lifetime" && originalTransactionId) {
          const { data: revokedPreviousOwner, error: revocationError } =
            await supabase.rpc("revoke_lifetime_entitlement_v1", {
              p_user_id: transferredOwnershipFromUserId,
              p_source: "app_store",
              p_source_id: originalTransactionId,
              p_event_id: `app_store_ownership_transfer:${
                transactionId ?? originalTransactionId
              }`,
            });
          if (revocationError) {
            throw new Error(
              `Failed to source-verify previous App Store Lifetime owner: ${revocationError.message}`,
            );
          }
          if (revokedPreviousOwner !== true) {
            await reportEdgeFunctionError({
              functionName: "verify-iap-purchase",
              error: new Error(
                "Transferred App Store Lifetime ownership did not revoke the expected previous entitlement",
              ),
              context: {
                ...verificationLogContext,
                phase: "lifetime_ownership_transfer_source_mismatch",
                previousOwnerUserId: transferredOwnershipFromUserId,
                originalTransactionId,
                transactionId,
              },
            });
          }
        } else {
          const { error: resetPreviousOwnerError } = await supabase
            .from("subscriptions")
            .update({
              plan: "free",
              status: "active",
              billing_interval: null,
              current_period_end: null,
              trial_start: null,
              trial_end: null,
              cancel_at_period_end: false,
              store_product_id: null,
              app_store_transaction_id: null,
              app_store_original_transaction_id: null,
              app_store_in_app_ownership_type: null,
              stripe_subscription_id: null,
              stripe_customer_id: null,
              play_purchase_token: null,
              play_order_id: null,
              play_package_name: null,
              lifetime_source: null,
              lifetime_source_id: null,
              ended_at: nowIso(),
              updated_at: nowIso(),
            })
            .eq("user_id", transferredOwnershipFromUserId)
            .eq("provider", "app_store")
            .eq("app_store_original_transaction_id", originalTransactionId);

          if (resetPreviousOwnerError) {
            await reportEdgeFunctionError({
              functionName: "verify-iap-purchase",
              error: resetPreviousOwnerError,
              context: {
                ...verificationLogContext,
                phase: "reset_previous_owner_subscription_after_transfer",
                previousOwnerUserId: transferredOwnershipFromUserId,
                originalTransactionId,
              },
            });
          }
        }
      }

      console.log("✅ Successfully wrote subscription to database");

      if (originalTransactionId) {
        const { error: backlogResolveError } = await supabase
          .from("app_store_notification_backlog")
          .update({
            resolved_at: nowIso(),
            resolved_user_id: userId,
            resolution_source: "verify_iap_purchase",
            updated_at: nowIso(),
          })
          .eq("provider", "app_store")
          .eq("original_transaction_id", originalTransactionId)
          .is("resolved_at", null);

        if (backlogResolveError) {
          await reportEdgeFunctionError({
            functionName: "verify-iap-purchase",
            error: backlogResolveError,
            context: {
              ...verificationLogContext,
              phase: "resolve_pending_notification_backlog",
              originalTransactionId,
            },
          });
        }
      }

      const { data: finalSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify({ verified: true, subscription: finalSub }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } // End of iOS platform block

    // ANDROID
    if (!googleServiceAccountJson) {
      return new Response(
        JSON.stringify({ error: "Google service account not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!androidPackageName) {
      return new Response(
        JSON.stringify({ error: "ANDROID_PACKAGE_NAME not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const purchaseToken = asString(
      body.verificationData?.serverVerificationData,
    );
    if (!purchaseToken) {
      return new Response(
        JSON.stringify({ error: "Missing Android purchase token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const accessToken = await getGoogleAccessToken({
      serviceAccountJson: googleServiceAccountJson,
      scope: "https://www.googleapis.com/auth/androidpublisher",
    });

    const isLifetime = plan === "lifetime";
    let status: SubscriptionStatus = "active";
    let currentPeriodEnd: string | null = null;
    let orderId: string | null = null;

    if (isLifetime) {
      const url =
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${
          encodeURIComponent(
            androidPackageName,
          )
        }/purchases/products/${encodeURIComponent(storeProductId)}/tokens/${
          encodeURIComponent(
            purchaseToken,
          )
        }`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        console.error("Google products.get failed:", {
          status: resp.status,
          data,
        });
        return new Response(
          JSON.stringify({ error: "Invalid purchase token" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // purchaseState: 0 Purchased, 1 Canceled, 2 Pending
      const purchaseState = data.purchaseState;
      orderId = asString(data.orderId);
      if (purchaseState === 2) {
        status = "incomplete";
      } else if (purchaseState === 1) {
        status = "canceled";
      } else {
        status = "active";
      }
      currentPeriodEnd = null;
    } else {
      const url =
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${
          encodeURIComponent(
            androidPackageName,
          )
        }/purchases/subscriptionsv2/tokens/${
          encodeURIComponent(purchaseToken)
        }`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        console.error("Google subscriptionsv2.get failed:", {
          status: resp.status,
          data,
        });
        return new Response(
          JSON.stringify({ error: "Invalid purchase token" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const subscriptionState = asString(data.subscriptionState);
      const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
      const lineProductId = asString(lineItems[0]?.productId);
      if (lineProductId && lineProductId !== storeProductId) {
        return new Response(JSON.stringify({ error: "Product ID mismatch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const expiryTime = asString(lineItems[0]?.expiryTime);
      orderId = asString(lineItems[0]?.orderId) || asString(data.latestOrderId);

      currentPeriodEnd = expiryTime;
      const expiryMs = expiryTime ? Date.parse(expiryTime) : NaN;
      const expired = Number.isFinite(expiryMs)
        ? expiryMs <= Date.now()
        : false;

      if (expired) {
        status = "canceled";
      } else if (subscriptionState === "SUBSCRIPTION_STATE_ON_HOLD") {
        status = "past_due";
      } else if (subscriptionState === "SUBSCRIPTION_STATE_PAUSED") {
        status = "paused";
      } else if (subscriptionState === "SUBSCRIPTION_STATE_CANCELED") {
        // Canceled but still active until expiry
        status = "active";
      } else if (subscriptionState === "SUBSCRIPTION_STATE_EXPIRED") {
        status = "canceled";
      } else if (subscriptionState === "SUBSCRIPTION_STATE_PENDING") {
        status = "incomplete";
      } else {
        status = "active";
      }

      if (!currentPeriodEnd) {
        // Subscription purchases must have an expiry.
        return new Response(
          JSON.stringify({ error: "Invalid subscription expiry from Google" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const eventKey = purchaseToken;
    const { error: idemError } = await supabase
      .from("iap_events")
      .insert({
        provider: "play_store",
        event_key: eventKey,
        user_id: userId,
        store_product_id: storeProductId,
      })
      .select("id")
      .maybeSingle();

    if (idemError && idemError.code !== "23505") {
      console.error("Failed to write iap_events:", idemError);
      return new Response(
        JSON.stringify({ error: "Failed to process purchase (idempotency)" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      (existingSub as any)?.plan === "lifetime" &&
      (existingSub as any)?.status === "active" &&
      isLifetime &&
      status === "canceled"
    ) {
      const { data: revoked, error: revocationError } = await supabase.rpc(
        "revoke_lifetime_entitlement_v1",
        {
          p_user_id: userId,
          p_source: "play_store",
          p_source_id: purchaseToken,
          p_event_id: `play_store_verify_revoke:${orderId ?? purchaseToken}`,
        },
      );
      if (revocationError) {
        throw new Error(
          `Failed to apply source-verified Play Lifetime revocation: ${revocationError.message}`,
        );
      }
      if (revoked === true) {
        const { data: revokedSubscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        return new Response(
          JSON.stringify({ verified: true, subscription: revokedSubscription }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (
      (existingSub as any)?.plan === "lifetime" &&
      (existingSub as any)?.status === "active" &&
      isLifetime &&
      status === "active" &&
      !(
        (existingSub as any)?.lifetime_source === "play_store" &&
        (existingSub as any)?.lifetime_source_id === purchaseToken
      )
    ) {
      await reportEdgeFunctionError({
        functionName: "verify-iap-purchase",
        error: new Error(
          "Verified Play Lifetime purchase cannot be represented alongside the current active Lifetime grant",
        ),
        context: {
          ...errorReportContext,
          phase: "multiple_active_lifetime_grants_detected",
          currentLifetimeSource: (existingSub as any)?.lifetime_source ?? null,
          incomingLifetimeSource: "play_store",
          orderId,
        },
      });
    }

    const entitlementDecision = decideSubscriptionEntitlementMutation(
      existingSub
        ? {
          provider: (existingSub as any).provider,
          plan: (existingSub as any).plan,
          status: (existingSub as any).status,
          stripeSubscriptionId: (existingSub as any).stripe_subscription_id,
          appStoreOriginalTransactionId: (existingSub as any)
            .app_store_original_transaction_id,
        }
        : null,
      {
        provider: "play_store",
        plan,
        status,
        allowProviderSwitch: true,
      },
    );

    if (entitlementDecision.kind === "preserve") {
      console.log("Preserving current entitlement during Play verification", {
        userId,
        reason: entitlementDecision.reason,
        currentProvider: (existingSub as any)?.provider ?? null,
        currentPlan: (existingSub as any)?.plan ?? null,
        incomingPlan: plan,
        incomingStatus: status,
      });
      return new Response(
        JSON.stringify({ verified: true, subscription: existingSub }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const subscriptionUpdate: Record<string, unknown> = {
      user_id: userId,
      provider: "play_store",
      store_product_id: storeProductId,
      plan,
      status,
      billing_interval: billingInterval,
      bound_to_user_id: null,
      bound_to_household_id: null,
      // Provider hygiene: prevent mixed-source subscription rows.
      stripe_subscription_id: null,
      stripe_customer_id: null,
      app_store_transaction_id: null,
      app_store_original_transaction_id: null,
      app_store_environment: null,
      app_store_in_app_ownership_type: null,
      current_period_end: isLifetime ? null : currentPeriodEnd,
      cancel_at_period_end: false,
      play_purchase_token: purchaseToken,
      play_order_id: orderId,
      play_package_name: androidPackageName,
      lifetime_source: isLifetime ? "play_store" : null,
      lifetime_source_id: isLifetime ? purchaseToken : null,
      updated_at: nowIso(),
    };

    // If user previously had a Stripe subscription, best-effort cancel it to avoid double billing.
    if (
      stripe &&
      existingSub &&
      (existingSub as any).provider === "stripe" &&
      typeof (existingSub as any).stripe_subscription_id === "string" &&
      (existingSub as any).stripe_subscription_id.startsWith("sub_")
    ) {
      try {
        await stripe.subscriptions.cancel(
          (existingSub as any).stripe_subscription_id,
          {
            prorate: false,
          },
        );
      } catch (cancelError) {
        console.error("Failed to cancel previous Stripe subscription:", {
          userId,
          stripe_subscription_id: (existingSub as any).stripe_subscription_id,
          error: cancelError instanceof Error
            ? cancelError.message
            : String(cancelError),
        });
      }
    }

    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(subscriptionUpdate, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Failed to upsert subscription:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to update subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: finalSub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({ verified: true, subscription: finalSub }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    await reportEdgeFunctionError({
      functionName: "verify-iap-purchase",
      error: e,
      context: {
        ...errorReportContext,
        phase: "serve_handler",
      },
    });
    console.error("verify-iap-purchase error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
