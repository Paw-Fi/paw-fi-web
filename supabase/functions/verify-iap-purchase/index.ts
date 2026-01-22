import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
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
} from "https://esm.sh/@apple/app-store-server-library@1.4.1?target=deno";
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
  return value.replace(/\\n/g, "\n").trim();
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

  const rootCAs = await getAppleRootCAs();
  const verifier = new SignedDataVerifier(
    rootCAs,
    true,
    params.environment,
    appStoreBundleId,
    Number(appStoreAppId),
  );

  return await verifier.verifyAndDecodeTransaction(signedTransaction);
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
      .select("id, bound_to_user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((existingSub as any)?.bound_to_user_id) {
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

    const plan = catalogProduct.plan as SubscriptionPlan;
    const billingInterval =
      (catalogProduct.billing_interval as BillingInterval | null) ?? null;

    if (body.platform === "ios") {
      if (!appleSharedSecret) {
        return new Response(
          JSON.stringify({ error: "Apple shared secret not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const receiptData = asString(
        body.verificationData?.serverVerificationData,
      );
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

      const now = Date.now();
      let status: SubscriptionStatus = "active";
      let currentPeriodEnd: string | null = null;
      let originalTransactionId: string | null = null;
      let transactionId: string | null = null;

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
            JSON.stringify({ error: "Lifetime purchase not found in receipt" }),
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
        const latestInfo = (receiptResponse.latest_receipt_info ?? []) as Array<
          Record<string, unknown>
        >;
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
          status = latest["is_trial_period"] === "true" ? "trialing" : "active";
        }
      }

      const environment =
        receiptResponse.environment?.toLowerCase() === "sandbox"
          ? Environment.SANDBOX
          : Environment.PRODUCTION;

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
        provider: "app_store",
        store_product_id: storeProductId,
        plan,
        status,
        billing_interval: billingInterval,
        current_period_end: plan === "lifetime" ? null : currentPeriodEnd,
        cancel_at_period_end: false,
        app_store_transaction_id: transactionId,
        app_store_original_transaction_id: originalTransactionId,
        app_store_environment: receiptResponse.environment ?? null,
        updated_at: nowIso(),
      };

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
    }

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
      current_period_end: isLifetime ? null : currentPeriodEnd,
      cancel_at_period_end: false,
      play_purchase_token: purchaseToken,
      play_order_id: orderId,
      play_package_name: androidPackageName,
      updated_at: nowIso(),
    };

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
