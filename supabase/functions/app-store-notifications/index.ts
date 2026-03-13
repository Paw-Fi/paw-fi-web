import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import {
  Environment,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  ensureAppStoreOwnership,
  getAppStoreOwnershipBinding,
  hasAppStoreOwnershipConflict,
} from "../shared/iap-ownership.ts";

type AppStoreEnvironment = "sandbox" | "production";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const appStoreBundleId = Deno.env.get("APPLE_BUNDLE_ID") || "";
const appStoreAppId = Deno.env.get("APPLE_APP_ID") || "";
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

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("provider, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  const provider = typeof existing?.provider === "string"
    ? existing.provider
    : null;
  const stripeSubscriptionId = existing?.stripe_subscription_id;

  // Heuristic: treat missing provider but present stripe subscription id as Stripe.
  const shouldCancelStripe = provider === "stripe" ||
    (provider == null && looksLikeStripeSubscriptionId(stripeSubscriptionId));

  if (!shouldCancelStripe) return;
  if (!looksLikeStripeSubscriptionId(stripeSubscriptionId)) return;

  try {
    await stripe.subscriptions.cancel(stripeSubscriptionId, { prorate: false });
  } catch (error) {
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
  decoded: ResponseBodyV2DecodedPayload;
  verifier: SignedDataVerifier;
  environment: AppStoreEnvironment;
}> {
  const rootCAs = await getAppleRootCAs();
  const environments: Array<{ env: Environment; label: AppStoreEnvironment }> =
    [
      { env: Environment.PRODUCTION, label: "production" },
      { env: Environment.SANDBOX, label: "sandbox" },
    ];

  let lastError: unknown = null;
  for (const candidate of environments) {
    try {
      const verifier = new SignedDataVerifier(
        rootCAs,
        true,
        candidate.env,
        appStoreBundleId,
        Number(appStoreAppId),
      );

      const decoded = await verifier.verifyAndDecodeNotification(signedPayload);
      return { decoded, verifier, environment: candidate.label };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unable to verify App Store notification");
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

    const { decoded, verifier, environment } = await decodeNotification(
      signedPayload,
    );
    const signedTransaction = asString(decoded.data?.signedTransactionInfo);

    if (!signedTransaction) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "No transaction info" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const transaction = await verifier.verifyAndDecodeTransaction(
      signedTransaction,
    );
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

    const { data: catalogProduct } = await supabase
      .from("subscription_products")
      .select("plan, billing_interval")
      .eq("platform", "ios")
      .eq("store_product_id", storeProductId)
      .eq("is_active", true)
      .maybeSingle();

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

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .or(orFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
      current_period_end: catalogProduct.plan === "lifetime"
        ? null
        : expiresIso,
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
    console.error("app-store-notifications error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
