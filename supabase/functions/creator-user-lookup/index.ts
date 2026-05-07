import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { Environment } from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";

import { authenticateUser } from "../shared/auth.ts";
import {
  fetchAppStoreTransactionHistoryByOriginalId,
  findAppStoreSubscriptionStatusWithEnvironmentFallback,
  getValidatedAppStorePrivateKey,
  isAppStoreServerApiConfigured,
  type AppStoreApiConfig,
} from "../shared/app-store-api.ts";
import { getCorsHeaders } from "../shared/cors.ts";
import { normalizeLookupEmail } from "../shared/creator-user-lookup.ts";

interface LookupRequest {
  email?: string | null;
}

interface ProviderErrors {
  stripe?: string | null;
  appStore?: string | null;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() })
  : null;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? "");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Server not configured" }, 500, corsHeaders);
  }

  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return jsonResponse(
      { error: auth.error ?? "Unauthorized" },
      auth.statusCode ?? 401,
      corsHeaders,
    );
  }

  const creatorCheck = await supabase
    .from("users")
    .select("is_creator")
    .eq("id", auth.userId)
    .maybeSingle();

  if (creatorCheck.error) {
    return jsonResponse(
      { error: "Unable to verify creator access" },
      500,
      corsHeaders,
    );
  }

  if (!creatorCheck.data?.is_creator) {
    return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
  }

  const body = (await req.json().catch(() => null)) as LookupRequest | null;
  const email = normalizeLookupEmail(body?.email);

  if (!email) {
    return jsonResponse({ error: "Valid email is required" }, 400, corsHeaders);
  }

  const userResult = await supabase
    .from("users")
    .select("*")
    .ilike("email", email)
    .limit(2);

  if (userResult.error) {
    return jsonResponse({ error: "Failed to lookup user" }, 500, corsHeaders);
  }

  const exactUsers = (userResult.data ?? []).filter(
    (user) =>
      typeof user.email === "string" && user.email.toLowerCase() === email,
  );

  if (exactUsers.length === 0) {
    return jsonResponse({ user: null }, 200, corsHeaders);
  }

  const user = exactUsers[0];
  const [contactResult, subscriptionResult] = await Promise.all([
    fetchContact(user.id),
    fetchLatestSubscription(user.id),
  ]);

  if (contactResult.error || subscriptionResult.error) {
    return jsonResponse(
      { error: "Failed to load user details" },
      500,
      corsHeaders,
    );
  }

  const subscription = subscriptionResult.data;
  const errors: ProviderErrors = {};
  const [stripeData, appStoreData] = await Promise.all([
    fetchStripeDetails(subscription, errors),
    fetchAppStoreDetails(supabase, subscription, errors),
  ]);

  return jsonResponse(
    {
      user,
      contact: contactResult.data ?? null,
      subscription: subscription ?? null,
      stripe: stripeData,
      appStore: appStoreData,
      errors,
    },
    200,
    corsHeaders,
  );
});

async function fetchContact(userId: string) {
  return await supabase
    .from("user_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function fetchLatestSubscription(userId: string) {
  return await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function fetchStripeDetails(
  subscription: Record<string, any> | null,
  errors: ProviderErrors,
) {
  const customerId = subscription?.stripe_customer_id;
  if (!customerId) return null;

  if (!stripe) {
    errors.stripe = "Stripe is not configured";
    return null;
  }

  try {
    const [customer, invoices, paymentMethods, charges] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.invoices.list({ customer: customerId, limit: 20 }),
      stripe.paymentMethods.list({ customer: customerId, type: "card" }),
      stripe.charges.list({ customer: customerId, limit: 20 }),
    ]);

    return {
      customer: sanitizeStripeCustomer(customer),
      invoices: invoices.data.map(sanitizeStripeInvoice),
      paymentMethods: paymentMethods.data.map(sanitizePaymentMethod),
      charges: charges.data.map(sanitizeStripeCharge),
    };
  } catch (error) {
    errors.stripe =
      error instanceof Error ? error.message : "Stripe lookup failed";
    return null;
  }
}

async function fetchAppStoreDetails(
  client: typeof supabase,
  subscription: Record<string, any> | null,
  errors: ProviderErrors,
) {
  const originalTransactionId = subscription?.app_store_original_transaction_id;
  if (!originalTransactionId) return null;

  const config = getAppStoreConfig(errors);
  if (!config) {
    errors.appStore ??= "App Store Server API is not configured";
    return await fetchAppStoreBacklog(client, originalTransactionId, null);
  }

  const environmentHint = resolveAppStoreEnvironment(
    subscription?.app_store_environment,
  );

  try {
    const historyLookup = await fetchAppStoreHistoryWithFallback(
      config,
      originalTransactionId,
      environmentHint,
    );
    const transactions = historyLookup.transactions;
    const latestTransaction = transactions[0] ?? null;
    const status = latestTransaction?.transactionId
      ? await findAppStoreSubscriptionStatusWithEnvironmentFallback({
          config,
          environmentHint: historyLookup.environment,
          transactionId: latestTransaction.transactionId,
          originalTransactionId,
          productId: latestTransaction.productId,
        })
      : null;
    const backlog = await fetchAppStoreBacklog(
      client,
      originalTransactionId,
      null,
    );

    return {
      originalTransactionId,
      environmentHint: historyLookup.environment,
      latestTransaction,
      transactions,
      status,
      backlog: backlog?.backlog ?? [],
    };
  } catch (error) {
    errors.appStore =
      error instanceof Error ? error.message : "App Store lookup failed";
    return await fetchAppStoreBacklog(
      client,
      originalTransactionId,
      environmentHint,
    );
  }
}

async function fetchAppStoreHistoryWithFallback(
  config: AppStoreApiConfig,
  originalTransactionId: string,
  environmentHint: Environment,
) {
  try {
    return {
      environment: environmentHint,
      transactions: await fetchAppStoreTransactionHistoryByOriginalId({
        config,
        originalTransactionId,
        environment: environmentHint,
        limit: 20,
      }),
    };
  } catch (firstError) {
    const fallbackEnvironment =
      environmentHint === Environment.SANDBOX
        ? Environment.PRODUCTION
        : Environment.SANDBOX;
    try {
      return {
        environment: fallbackEnvironment,
        transactions: await fetchAppStoreTransactionHistoryByOriginalId({
          config,
          originalTransactionId,
          environment: fallbackEnvironment,
          limit: 20,
        }),
      };
    } catch {
      throw firstError;
    }
  }
}

function getAppStoreConfig(errors: ProviderErrors): AppStoreApiConfig | null {
  const config = {
    issuerId: Deno.env.get("APPLE_APP_STORE_ISSUER_ID") ?? "",
    keyId: Deno.env.get("APPLE_APP_STORE_KEY_ID") ?? "",
    bundleId: Deno.env.get("APPLE_BUNDLE_ID") ?? "",
    privateKey: Deno.env.get("APPLE_APP_STORE_PRIVATE_KEY") ?? "",
  };

  if (!isAppStoreServerApiConfigured(config)) return null;

  try {
    return {
      ...config,
      privateKey: getValidatedAppStorePrivateKey(config.privateKey),
    };
  } catch (error) {
    errors.appStore =
      error instanceof Error
        ? error.message
        : "App Store private key is invalid";
    return null;
  }
}

async function fetchAppStoreBacklog(
  client: typeof supabase,
  originalTransactionId: string,
  environmentHint: Environment | null,
) {
  const { data, error } = await client
    .from("app_store_notification_backlog")
    .select("*")
    .eq("original_transaction_id", originalTransactionId)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  if (error) {
    return {
      originalTransactionId,
      environmentHint,
      backlog: [],
      backlogError: "Failed to load App Store notification backlog",
    };
  }

  return {
    originalTransactionId,
    environmentHint,
    backlog: data ?? [],
  };
}

function resolveAppStoreEnvironment(value: unknown): Environment {
  if (typeof value === "string" && value.toLowerCase() === "sandbox") {
    return Environment.SANDBOX;
  }
  return Environment.PRODUCTION;
}

function sanitizeStripeCustomer(
  customer: Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>,
) {
  if (customer.deleted) {
    return { id: customer.id, deleted: true };
  }

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    currency: customer.currency,
    created: toIsoFromStripeSeconds(customer.created),
    delinquent: customer.delinquent,
    metadata: customer.metadata,
  };
}

function sanitizeStripeInvoice(invoice: Stripe.Invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountPaid: centsToMajor(invoice.amount_paid),
    amountDue: centsToMajor(invoice.amount_due),
    currency: invoice.currency,
    created: toIsoFromStripeSeconds(invoice.created),
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    subscription:
      typeof invoice.subscription === "string" ? invoice.subscription : null,
  };
}

function sanitizePaymentMethod(paymentMethod: Stripe.PaymentMethod) {
  return {
    id: paymentMethod.id,
    type: paymentMethod.type,
    created: toIsoFromStripeSeconds(paymentMethod.created),
    card: paymentMethod.card
      ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
          funding: paymentMethod.card.funding,
          country: paymentMethod.card.country,
        }
      : null,
  };
}

function sanitizeStripeCharge(charge: Stripe.Charge) {
  return {
    id: charge.id,
    status: charge.status,
    paid: charge.paid,
    refunded: charge.refunded,
    disputed: charge.disputed,
    amount: centsToMajor(charge.amount),
    amountCaptured: centsToMajor(charge.amount_captured),
    amountRefunded: centsToMajor(charge.amount_refunded),
    currency: charge.currency,
    created: toIsoFromStripeSeconds(charge.created),
    receiptUrl: charge.receipt_url,
    paymentMethod:
      typeof charge.payment_method === "string" ? charge.payment_method : null,
  };
}

function centsToMajor(value: number) {
  return value / 100;
}

function toIsoFromStripeSeconds(value: number | null | undefined) {
  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
