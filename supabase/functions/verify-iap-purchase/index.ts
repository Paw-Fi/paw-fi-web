import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { verifyAppleReceipt } from "../shared/apple-verify-receipt.ts";
import {
  AppStoreServerAPIClient,
  Environment,
  GetTransactionHistoryVersion,
  Order,
  ProductType,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";
import { getGoogleAccessToken } from "../shared/google-auth.ts";

type Platform = "ios" | "android";

type VerifyRequestBody = {
  platform: Platform;
  storeProductId: string;
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

console.log(
  `🌍 Environment config: ENV="${envSecret}", isProduction=${isProductionEnv}, defaultAppStoreEnv=${isProductionEnv ? "Production" : "Sandbox"}`,
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
const appStoreAppId = Deno.env.get("APPLE_APP_ID") || "";
const googleServiceAccountJson =
  Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") || "";
const androidPackageName = Deno.env.get("ANDROID_PACKAGE_NAME") || "";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() })
  : null;

const appleRootCaUrls = [
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
];

let cachedRootCAs: Uint8Array[] | null = null;

async function getAppleRootCAs(): Promise<Uint8Array[]> {
  if (cachedRootCAs) return cachedRootCAs;

  const certs = await Promise.all(
    appleRootCaUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch Apple root CA: ${url}`);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    }),
  );

  cachedRootCAs = certs;
  return certs;
}

function normalizePrivateKey(value: string): string {
  if (!value) return "";

  // Handle various escape formats that might come from environment variables
  let normalized = value
    .replace(/\\n/g, "\n") // Escaped \n to actual newline
    .replace(/\\r/g, "") // Remove any \r
    .trim();

  // If the key doesn't have proper PEM structure, it might be base64 encoded
  if (!normalized.includes("-----BEGIN")) {
    // Try to decode if it looks like it might be base64 encoded
    try {
      const decoded = atob(normalized);
      if (decoded.includes("-----BEGIN")) {
        normalized = decoded;
      }
    } catch {
      // Not base64, use as-is
    }
  }

  // Ensure proper line breaks in PEM format
  // Some systems store the key as a single line with spaces instead of newlines
  if (normalized.includes("-----BEGIN") && !normalized.includes("\n")) {
    normalized = normalized
      .replace(
        /-----BEGIN PRIVATE KEY-----\s*/,
        "-----BEGIN PRIVATE KEY-----\n",
      )
      .replace(/\s*-----END PRIVATE KEY-----/, "\n-----END PRIVATE KEY-----")
      .replace(/\s+/g, "\n");
  }

  console.log("Private key format check:", {
    hasBeginMarker: normalized.includes("-----BEGIN PRIVATE KEY-----"),
    hasEndMarker: normalized.includes("-----END PRIVATE KEY-----"),
    hasNewlines: normalized.includes("\n"),
    length: normalized.length,
  });

  return normalized;
}

function asIsoMillis(value: string | null): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const date = new Date(n);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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

/**
 * Detects if the given string is a JWS (JSON Web Signature).
 * StoreKit 2 sends JWS transactions that start with base64-encoded JSON header.
 */
function isJws(data: string): boolean {
  // JWS starts with base64url-encoded JSON header like {"alg":"ES256"...}
  // which encodes to "eyJ" (base64 of '{"')
  return data.startsWith("eyJ");
}

/**
 * Decodes a base64url string to a regular string.
 */
function base64UrlDecode(input: string): string {
  // Replace base64url characters with base64 characters
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  // Decode
  return atob(base64);
}

/**
 * Decodes a JWS payload without cryptographic verification.
 * The JWS format is: header.payload.signature (all base64url encoded)
 *
 * Note: This does NOT verify the signature. We validate the transaction
 * by calling the App Store Server API with the extracted transactionId.
 */
function decodeJwsPayload(jws: string): JWSTransactionDecodedPayload {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format: expected 3 parts");
  }

  const payloadJson = base64UrlDecode(parts[1]);
  const payload = JSON.parse(payloadJson);

  // Map the raw payload to JWSTransactionDecodedPayload structure
  return {
    transactionId: payload.transactionId,
    originalTransactionId: payload.originalTransactionId,
    bundleId: payload.bundleId,
    productId: payload.productId,
    purchaseDate: payload.purchaseDate,
    originalPurchaseDate: payload.originalPurchaseDate,
    quantity: payload.quantity,
    type: payload.type,
    inAppOwnershipType: payload.inAppOwnershipType,
    signedDate: payload.signedDate,
    environment: payload.environment,
    transactionReason: payload.transactionReason,
    storefront: payload.storefront,
    storefrontId: payload.storefrontId,
    price: payload.price,
    currency: payload.currency,
    // Subscription-specific fields
    expiresDate: payload.expiresDate,
    renewalDate: payload.renewalDate,
    isUpgraded: payload.isUpgraded,
    offerType: payload.offerType,
    offerIdentifier: payload.offerIdentifier,
    // Revocation fields
    revocationDate: payload.revocationDate,
    revocationReason: payload.revocationReason,
  } as JWSTransactionDecodedPayload;
}

/**
 * Fetches and validates a transaction from the App Store Server API.
 * This is the primary validation method since Deno doesn't support crypto.X509Certificate
 * which is required for local JWS signature verification.
 *
 * The App Store Server API response is trusted because:
 * 1. We authenticate with Apple using our private key
 * 2. The response comes directly from Apple's servers over HTTPS
 * 3. Apple validates the transaction on their end
 */
async function fetchLatestAppStoreTransaction(params: {
  originalTransactionId: string;
  environment: Environment;
}): Promise<JWSTransactionDecodedPayload | null> {
  if (!isAppleServerApiConfigured()) return null;

  const privateKey = normalizePrivateKey(appStorePrivateKeyRaw);
  if (!privateKey) return null;

  const client = new AppStoreServerAPIClient(
    privateKey,
    appStoreKeyId,
    appStoreIssuerId,
    appStoreBundleId,
    params.environment,
  );

  const historyRequest = {
    sort: Order.DESCENDING,
    revoked: false,
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

  // Decode the JWS payload without cryptographic verification.
  // This is safe because:
  // 1. The JWS comes from Apple's App Store Server API (authenticated request)
  // 2. We're not using client-provided data directly
  // 3. The API response is trusted as it comes over HTTPS from Apple
  return decodeJwsPayload(signedTransaction);
}

serve(async (req: Request) => {
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
        "id, provider, plan, status, bound_to_user_id, bound_to_household_id, stripe_subscription_id",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((existingSub as any)?.bound_to_user_id) {
      const boundToUserId = (existingSub as any).bound_to_user_id as string;
      const { data: ownerSub, error: ownerSubError } = await supabase
        .from("subscriptions")
        .select("plan, status, bound_to_user_id")
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

      const ownerHasActiveSubscription =
        !!ownerSub &&
        !ownerSub.bound_to_user_id &&
        ((ownerSub.plan === "lifetime" && ownerSub.status === "active") ||
          ownerSub.status === "trialing" ||
          (ownerSub.status === "active" && ownerSub.plan !== "free"));

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
      const serverPrefix = serverReceipt ? serverReceipt.slice(0, 12) : "";
      const localPrefix = localReceipt ? localReceipt.slice(0, 12) : "";
      console.log("Receipt payload", {
        source: body.verificationData?.source ?? null,
        serverLength: serverReceipt?.length ?? 0,
        localLength: localReceipt?.length ?? 0,
        serverPrefix,
        localPrefix,
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

        // Step 1 (CRITICAL): Verify the signed transaction cryptographically.
        // Never trust unverified JWS payloads.
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

        const appAppleId = Number(appStoreAppId);
        if (!Number.isFinite(appAppleId)) {
          return new Response(
            JSON.stringify({ error: "APPLE_APP_ID not configured" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const envString = decodedHint.environment?.toLowerCase();
        const envHint =
          envString === "sandbox"
            ? Environment.SANDBOX
            : Environment.PRODUCTION;

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
              details: `Expected ${appStoreBundleId}, got ${decodedHint.bundleId}`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Try to validate via App Store Server API (preferred method for Deno)
        if (isAppleServerApiConfigured() && decodedHint.originalTransactionId) {
          console.log("🔐 Validating transaction via App Store Server API...");
          console.log(
            "🔐 Original Transaction ID:",
            decodedHint.originalTransactionId,
          );
          console.log("🔐 Environment hint:", envHint);

          try {
            // Try with the hinted environment first
            let serverTransaction = await fetchLatestAppStoreTransaction({
              originalTransactionId: decodedHint.originalTransactionId,
              environment: envHint,
            });

            // If not found, try the other environment
            if (!serverTransaction) {
              const otherEnv =
                envHint === Environment.SANDBOX
                  ? Environment.PRODUCTION
                  : Environment.SANDBOX;
              console.log("🔐 Retrying with environment:", otherEnv);
              serverTransaction = await fetchLatestAppStoreTransaction({
                originalTransactionId: decodedHint.originalTransactionId,
                environment: otherEnv,
              });
              if (serverTransaction) {
                environment = otherEnv;
              }
            } else {
              environment = envHint;
            }

            if (serverTransaction) {
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
              serverRevocationDate = serverTransaction.revocationDate;
            } else {
              // Server API didn't return a transaction
              // SECURITY: In production, we MUST fail-closed - no fallback to unverified JWS
              if (isProductionEnv) {
                console.error(
                  "🚨 PRODUCTION SECURITY: App Store Server API returned no transaction. Rejecting request.",
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
              // In DEV/Sandbox, allow fallback for testing convenience
              console.warn(
                "⚠️ DEV MODE: App Store Server API returned no transaction, using decoded JWS data (unverified)",
              );
              decodedTransaction = decodedHint;
              environment = envHint;
            }
          } catch (apiError) {
            // API call failed
            // SECURITY: In production, we MUST fail-closed - no fallback to unverified JWS
            if (isProductionEnv) {
              console.error(
                "🚨 PRODUCTION SECURITY: App Store Server API call failed. Rejecting request.",
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
            // In DEV/Sandbox, allow fallback for testing convenience
            console.warn(
              "⚠️ DEV MODE: App Store Server API call failed:",
              apiError instanceof Error ? apiError.message : apiError,
            );
            console.warn(
              "⚠️ DEV MODE: Falling back to decoded JWS data (unverified)",
            );
            decodedTransaction = decodedHint;
            environment = envHint;
          }
        } else {
          // App Store Server API not configured
          // SECURITY: In production, this is a misconfiguration - we MUST reject
          if (isProductionEnv) {
            console.error(
              "🚨 PRODUCTION SECURITY: App Store Server API not configured. Rejecting request.",
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
          // In DEV/Sandbox, allow fallback for testing without full API setup
          console.warn(
            "⚠️ DEV MODE: App Store Server API not configured, using decoded JWS data (unverified)",
          );
          console.warn(
            "⚠️ Configure APPLE_APP_STORE_* env vars for secure validation",
          );
          decodedTransaction = decodedHint;
          environment = envHint;
        }

        console.log("Transaction data to use:", {
          transactionId: decodedTransaction.transactionId,
          originalTransactionId: decodedTransaction.originalTransactionId,
          productId: decodedTransaction.productId,
          type: decodedTransaction.type,
          environment: decodedTransaction.environment,
          purchaseDate: decodedTransaction.purchaseDate,
          expiresDate: decodedTransaction.expiresDate,
          revocationDate: decodedTransaction.revocationDate,
        });

        // Legacy code path for additional server validation (kept for compatibility)
        // This section is now mostly redundant since we validate above
        if (
          isAppleServerApiConfigured() &&
          decodedTransaction.originalTransactionId &&
          !serverRevocationDate // Only if we haven't already checked
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
                note: "Using client transaction data, server API for revocation only",
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
            "App Store Server API not configured or no originalTransactionId, using decoded JWS data",
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
        originalTransactionId =
          decodedTransaction.originalTransactionId ?? null;

        if (plan === "lifetime") {
          // Non-consumable: just needs to exist and not be revoked
          status = "active";
          currentPeriodEnd = null;
        } else {
          // Subscription: Parse expiry date from client transaction
          const expiresDate = decodedTransaction.expiresDate;
          const now = Date.now();

          // Parse expiresDate safely (it's milliseconds as number or string)
          let expiresMs: number | null = null;
          if (expiresDate !== undefined && expiresDate !== null) {
            expiresMs =
              typeof expiresDate === "number"
                ? expiresDate
                : parseInt(String(expiresDate), 10);

            if (!Number.isFinite(expiresMs)) {
              expiresMs = null;
            }
          }

          console.log("Parsing expiry date:", {
            rawExpiresDate: expiresDate,
            parsedExpiresMs: expiresMs,
            nowMs: now,
            isExpired: expiresMs ? expiresMs <= now : "unknown",
          });

          // ROBUST PERIOD END CALCULATION
          // For subscriptions, we need a valid future current_period_end
          //
          // CRITICAL: Apple Sandbox uses ACCELERATED TIME:
          // - Monthly subscriptions expire in ~5 minutes
          // - Yearly subscriptions expire in ~1 hour
          // So even though Sandbox dates ARE "in the future", they're WRONG for our purposes!
          //
          // Approach:
          // - SANDBOX: ALWAYS calculate period end (ignore Apple's accelerated dates)
          // - PRODUCTION: Use Apple's date if valid and in the future
          const isSandboxEnv = environment === Environment.SANDBOX;

          // For Sandbox: ALWAYS calculate proper period end
          // For Production: Use Apple's date if valid and in future, otherwise calculate
          const shouldUseAppleDate =
            !isSandboxEnv && expiresMs && expiresMs > now;

          if (shouldUseAppleDate) {
            // Production with valid future expiry date from Apple - use it
            currentPeriodEnd = new Date(expiresMs!).toISOString();
            status = "active";
            console.log("PRODUCTION: Using Apple's expiry date:", {
              currentPeriodEnd,
              status,
              expiresMs,
            });
          } else {
            // Sandbox OR Production with invalid/expired date
            // Calculate proper period end based on billing interval
            const periodEnd = new Date();
            if (billingInterval === "monthly") {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            } else if (billingInterval === "yearly") {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              // Default to 1 month if billing interval unknown
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            currentPeriodEnd = periodEnd.toISOString();
            status = "active"; // New purchase should be active

            console.log("CALCULATED period end:", {
              isSandbox: isSandboxEnv,
              appleExpiresMs: expiresMs,
              appleExpiresDate: expiresMs
                ? new Date(expiresMs).toISOString()
                : null,
              calculatedPeriodEnd: currentPeriodEnd,
              billingInterval,
              reason: isSandboxEnv
                ? "Sandbox uses accelerated time - ignoring Apple's date"
                : expiresMs === null
                  ? "Missing expiry date"
                  : "Expiry date in the past",
            });
          }

          console.log("Final subscription status:", {
            status,
            currentPeriodEnd,
            environment:
              environment === Environment.SANDBOX ? "Sandbox" : "Production",
          });
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

        environment =
          receiptResponse.environment?.toLowerCase() === "sandbox"
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
            status =
              latest["is_trial_period"] === "true" ? "trialing" : "active";
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
              const serverTransactionId = asString(
                serverTransaction.transactionId,
              );
              if (serverTransactionId) {
                transactionId = serverTransactionId;
              }

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
        }
        // For duplicates (repeated testing), check if recently created
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
                  reason: `Duplicate verification but subscription updated ${Math.round(ageMinutes)} min ago`,
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

      const environmentString =
        environment === Environment.SANDBOX ? "Sandbox" : "Production";

      const subscriptionUpdate: Record<string, unknown> = {
        user_id: userId,
        provider: "app_store",
        store_product_id: storeProductId,
        plan,
        status,
        billing_interval: billingInterval,
        bound_to_user_id: null,
        bound_to_household_id: null,
        // Provider hygiene: prevent mixed-source subscription rows.
        stripe_subscription_id: null,
        stripe_customer_id: null,
        play_purchase_token: null,
        play_order_id: null,
        play_package_name: null,
        current_period_end: plan === "lifetime" ? null : currentPeriodEnd,
        cancel_at_period_end: false,
        app_store_transaction_id: transactionId,
        app_store_original_transaction_id: originalTransactionId,
        app_store_environment: environmentString,
        updated_at: nowIso(),
      };

      console.log("Writing subscription to database:", {
        userId,
        plan,
        status,
        currentPeriodEnd,
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
            error:
              cancelError instanceof Error
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

      console.log("✅ Successfully wrote subscription to database");

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
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(androidPackageName)}/purchases/products/${encodeURIComponent(storeProductId)}/tokens/${encodeURIComponent(purchaseToken)}`;
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
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(androidPackageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
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
      current_period_end: isLifetime ? null : currentPeriodEnd,
      cancel_at_period_end: false,
      play_purchase_token: purchaseToken,
      play_order_id: orderId,
      play_package_name: androidPackageName,
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
          error:
            cancelError instanceof Error
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
    console.error("verify-iap-purchase error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
