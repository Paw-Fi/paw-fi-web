import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { corsHeaders } from "../shared/cors.ts";
import { sendUserEmail } from "../shared/email-service.ts";
import { referralAcceptedTemplate } from "../shared/email-templates.ts";
import {
  discountExpiringTemplate,
  invoiceFinalizedTemplate,
  invoicePaymentSucceededTemplate,
  invoiceUpcomingTemplate,
  paymentActionRequiredTemplate,
  paymentFailedTemplate,
  paymentMethodUpdatedTemplate,
  subscriptionCanceledTemplate,
  subscriptionCreatedTemplate,
  subscriptionUpdatedTemplate,
  trialEndingTemplate,
} from "../shared/email-templates.ts";
import { validateEnvironment } from "../shared/env-validation.ts";
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from "../shared/idempotency.ts";
import {
  BillingInterval,
  getChangeType,
  PlanType,
} from "../shared/subscription-constants.ts";
import { getPlanFromPriceId } from "../shared/stripe-subscription-prices.ts";
import { resolveStripeCurrentPeriodEnd } from "../shared/stripe-subscription-period.ts";
import { resolveStripeSubscriptionUserCandidate } from "../shared/stripe-subscription-user.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

interface QueuedEmail {
  email: string;
  name: string;
  template: EmailTemplate;
}

type EnqueueUserEmail = (
  email: string,
  name: string,
  template: EmailTemplate,
) => void;

async function flushQueuedEmails(emails: QueuedEmail[]): Promise<void> {
  for (const item of emails) {
    try {
      await sendUserEmail(item.email, item.name, item.template);
    } catch (error) {
      reportStripeWebhookError("flush_queued_emails", error, {
        email: item.email,
      });
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Failed to send queued email (non-fatal):", {
        email: item.email,
        error: msg,
      });
    }
  }
}

class PermanentWebhookError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PermanentWebhookError";
    this.code = code;
  }
}

function isPermanentWebhookError(
  error: unknown,
): error is PermanentWebhookError {
  return error instanceof PermanentWebhookError;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(
        value,
      )
  );
}

function redactUserId(userId: string): string {
  return userId.length >= 8 ? `${userId.slice(0, 8)}…` : userId;
}

const ACCESS_GRANTING_STATUSES = new Set<string>(["active", "trialing"]);
const TERMINAL_DOWNGRADE_STATUSES = new Set<string>([
  "canceled",
  "incomplete_expired",
  "unpaid",
]);

function isAccessGrantingStatus(status: string): boolean {
  return ACCESS_GRANTING_STATUSES.has(status);
}

function isTerminalDowngradeStatus(status: string): boolean {
  return TERMINAL_DOWNGRADE_STATUSES.has(status);
}

function mapStripeStatusToStoredStatus(status: string): string {
  if (status === "incomplete_expired") return "canceled";
  return status;
}

function formatUnixTimestampDate(
  timestamp: number | null | undefined,
): string | null {
  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp * 1000));
}

async function downgradeOwnerSubscriptionToFree(params: {
  userId: string;
  eventId: string;
  status: "canceled" | "unpaid";
  endedAt?: string;
  stripeSubscriptionId?: string | null;
}): Promise<void> {
  const endedAt = params.endedAt ?? new Date().toISOString();

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      provider: "stripe",
      plan: "free",
      status: params.status,
      billing_interval: null,
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      current_price_id: null,
      pending_plan: null,
      pending_interval: null,
      pending_effective_date: null,
      ended_at: endedAt,
      last_event_id: params.eventId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  if (updateError) {
    throw new Error(`failed to downgrade subscription: ${updateError.message}`);
  }

  try {
    const { data: cascadeResult, error: cascadeError } = await supabase.rpc(
      "cascade_subscription_cancellation",
      {
        p_owner_user_id: params.userId,
      },
    );

    if (cascadeError) {
      console.error("Error cascading downgrade to household members:", {
        userId: params.userId,
        error: cascadeError,
      });
      return;
    }

    if (cascadeResult && cascadeResult > 0) {
      console.log(
        `✅ Cascaded downgrade to ${cascadeResult} household members`,
      );
    }
  } catch (error) {
    reportStripeWebhookError("downgrade_owner_subscription_cascade", error, {
      userId: params.userId,
    });
    console.error("Unexpected error during downgrade cascade:", {
      userId: params.userId,
      error,
    });
  }
}

// Validate environment on startup - FAIL FAST if misconfigured
// Webhook function REQUIRES webhook secret
const env = validateEnvironment({ requireWebhookSecret: true });

// Initialize Stripe with validated configuration - using latest API version
const stripe = new Stripe(env.stripeSecretKey, {
  // Use account's default API version for maximum compatibility and to follow Stripe guidance
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

// Dashboard URL for links in emails
const DASHBOARD_URL = env.appUrl;

function reportStripeWebhookError(
  phase: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  void reportEdgeFunctionError({
    functionName: "stripe-webhook",
    error,
    context: {
      phase,
      ...context,
    },
  });
}

serve(async (req) => {
  const startTime = Date.now();
  const queuedEmails: QueuedEmail[] = [];
  const enqueueUserEmail: EnqueueUserEmail = (email, name, template) => {
    queuedEmails.push({ email, name, template });
  };

  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Webhook rejected: No signature provided");
      return new Response(JSON.stringify({ error: "No signature provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the raw request body
    const body = await req.text();
    let event: Stripe.Event;

    // CRITICAL: Always verify webhook signature - NO FALLBACK
    // MUST use constructEventAsync in Deno (async crypto)
    try {
      if (!env.stripeWebhookSecret) {
        throw new Error("Webhook secret not configured");
      }

      // Use ASYNC version for Deno Edge Functions (required for SubtleCrypto)
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        env.stripeWebhookSecret,
      );

      console.log(`Webhook verified: ${event.type} (${event.id})`);
    } catch (err) {
      reportStripeWebhookError("verify_webhook_signature", err);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Webhook signature verification failed:`, {
        error: msg,
        hasSignature: !!signature,
        hasSecret: !!env.stripeWebhookSecret,
      });

      return new Response(
        JSON.stringify({
          error: "Webhook verification failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // IDEMPOTENCY: Check if event was already processed
    const alreadyProcessed = await isWebhookEventProcessed(supabase, event.id);

    if (alreadyProcessed) {
      console.log(`Event ${event.id} already processed (duplicate delivery)`);
      return new Response(
        JSON.stringify({
          received: true,
          processed: false,
          reason: "duplicate",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle specific webhook events
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "checkout.session.async_payment_succeeded":
          await handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "checkout.session.async_payment_failed":
          await handleCheckoutSessionAsyncPaymentFailed(
            event.data.object as Stripe.Checkout.Session,
            enqueueUserEmail,
          );
          break;
        case "charge.refunded":
          await handleChargeRefunded(
            event.data.object as Stripe.Charge,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "refund.created":
        case "refund.updated":
          await handleRefundCreatedOrUpdated(
            event.data.object as Stripe.Refund,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "payment_intent.succeeded":
          // Handle successful one-time payments (lifetime) as additional verification
          await handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
            event.id,
          );
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "customer.subscription.trial_will_end":
          await handleSubscriptionTrialEnding(
            event.data.object as Stripe.Subscription,
            enqueueUserEmail,
          );
          break;
        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
            enqueueUserEmail,
          );
          break;
        case "invoice.payment_action_required":
          await handleInvoicePaymentActionRequired(
            event.data.object as Stripe.Invoice,
            enqueueUserEmail,
          );
          break;
        case "invoice.finalized":
          await handleInvoiceFinalized(
            event.data.object as Stripe.Invoice,
            enqueueUserEmail,
          );
          break;
        case "invoice.upcoming":
          await handleInvoiceUpcoming(
            event.data.object as Stripe.Invoice,
            enqueueUserEmail,
          );
          break;
        case "payment_method.attached":
          await handlePaymentMethodAttached(
            event.data.object as Stripe.PaymentMethod,
            enqueueUserEmail,
          );
          break;
        case "setup_intent.succeeded":
          await handleSetupIntentSucceeded(
            event.data.object as Stripe.SetupIntent,
            enqueueUserEmail,
          );
          break;
        case "setup_intent.setup_failed":
          await handleSetupIntentFailed(
            event.data.object as Stripe.SetupIntent,
            enqueueUserEmail,
          );
          break;
        case "customer.subscription.pending_update_applied":
          await handleSubscriptionPendingUpdateApplied(
            event.data.object as Stripe.Subscription,
            event.id,
            enqueueUserEmail,
          );
          break;
        case "customer.subscription.pending_update_expired":
          await handleSubscriptionPendingUpdateExpired(
            event.data.object as Stripe.Subscription,
            enqueueUserEmail,
          );
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed with processing time
      const processingTime = Date.now() - startTime;
      await markWebhookEventProcessed(supabase, event.id, event.type, {
        processing_time_ms: processingTime,
      });

      // Non-critical side effects should run AFTER idempotency is recorded.
      await flushQueuedEmails(queuedEmails);

      console.log(
        `Event ${event.id} processed successfully in ${processingTime}ms`,
      );

      return new Response(
        JSON.stringify({ received: true, processed: true, event_id: event.id }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      reportStripeWebhookError("process_webhook_event", error, {
        eventId: event.id,
        eventType: event.type,
      });
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(`Error handling webhook ${event.id}:`, {
        type: event.type,
        error: errorMessage,
        stack: errorStack,
      });

      // Permanent errors should be recorded and ACKed (no retries).
      if (isPermanentWebhookError(error)) {
        await markWebhookEventProcessed(supabase, event.id, event.type, {
          processing_time_ms: processingTime,
          permanent_error: true,
          code: error.code,
          message: error.message,
        });

        return new Response(
          JSON.stringify({
            received: true,
            processed: false,
            reason: "permanent_error",
            event_id: event.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Transient failures should return non-2xx so Stripe retries.
      return new Response(
        JSON.stringify({
          received: true,
          processed: false,
          error: "Processing failed",
          event_id: event.id,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: any) {
    reportStripeWebhookError("serve_handler", error);
    console.error(`Unexpected webhook error:`, {
      error: error.message,
      stack: error.stack,
    });

    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Handler for refunded charges (revoke lifetime access if applicable)
async function handleChargeRefunded(
  charge: Stripe.Charge,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing charge.refunded:", charge.id);

    // Get customer and payment intent info
    const customerId = typeof charge.customer === "string"
      ? charge.customer
      : charge.customer?.id;
    const paymentIntentId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (!customerId || !paymentIntentId) {
      console.log(
        "Missing customer or payment_intent on charge, skipping refund handling",
      );
      return;
    }

    // Retrieve PaymentIntent to access metadata
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const plan = pi.metadata?.plan;
    const userId = (pi.metadata?.user_id || pi.metadata?.userId || null) as
      | string
      | null;

    // Only revoke if it was a Lifetime purchase
    if (plan !== "lifetime" || !userId) {
      console.log(
        "Refund is not for a Lifetime purchase or missing user id, skipping",
      );
      return;
    }

    const isFullRefund = charge.refunded === true ||
      (typeof charge.amount_refunded === "number" &&
        typeof charge.amount === "number" &&
        charge.amount_refunded >= charge.amount);

    if (!isFullRefund) {
      console.log(
        "Refunded charge is not fully refunded; skipping lifetime revocation",
        {
          chargeId: charge.id,
          amount: charge.amount,
          amountRefunded: charge.amount_refunded,
        },
      );
      return;
    }

    await revokeLifetimeAccess({ userId, eventId, enqueueUserEmail });
  } catch (error: any) {
    reportStripeWebhookError("handle_charge_refunded", error, {
      chargeId: charge.id,
      eventId,
    });
    console.error("Error in handleChargeRefunded:", {
      error: (error as any).message,
      stack: (error as any).stack,
    });
    throw error;
  }
}

async function revokeLifetimeAccess(params: {
  userId: string;
  eventId: string;
  enqueueUserEmail: EnqueueUserEmail;
}): Promise<void> {
  const { userId, eventId, enqueueUserEmail } = params;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  // Idempotency across different Stripe refund event ids.
  if (existing?.plan === "free" && existing?.status === "canceled") {
    return;
  }

  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      provider: "stripe",
      plan: "free",
      status: "canceled",
      billing_interval: null,
      stripe_subscription_id: null,
      // Provider hygiene: clear IAP identifiers.
      store_product_id: null,
      app_store_transaction_id: null,
      app_store_original_transaction_id: null,
      app_store_environment: null,
      play_purchase_token: null,
      play_order_id: null,
      play_package_name: null,
      ended_at: nowIso,
      last_event_id: eventId,
      updated_at: nowIso,
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error downgrading user after refund:", updateError);
    return;
  }

  // CRITICAL: Cascade cancellation to all household members bound to this lifetime subscription
  try {
    await supabase.rpc("cascade_subscription_cancellation", {
      p_owner_user_id: userId,
    });
  } catch (error) {
    reportStripeWebhookError("revoke_lifetime_access_cascade", error, {
      userId,
      eventId,
    });
    console.error(
      "Unexpected error during lifetime refund cascade cancellation:",
      error,
    );
  }

  // Notify user of revocation (queued; flushed after event idempotency is recorded)
  const { data: userData } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (userData?.email) {
    const name = userData.full_name || "";
    const emailTemplate = subscriptionCanceledTemplate({
      name,
      planName: "Lifetime",
      endDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      immediateCancel: true,
    });
    enqueueUserEmail(userData.email, name, emailTemplate);
  }
}

async function handleRefundCreatedOrUpdated(
  refund: Stripe.Refund,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
): Promise<void> {
  // Only react to a successful refund; pending refunds shouldn't revoke access.
  if ((refund as any).status !== "succeeded") {
    return;
  }

  const paymentIntentId = typeof (refund as any).payment_intent === "string"
    ? (refund as any).payment_intent
    : (refund as any).payment_intent?.id;

  if (!paymentIntentId) {
    console.log("Refund missing payment_intent; skipping", {
      refundId: refund.id,
    });
    return;
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  const plan = pi.metadata?.plan;
  const userId = (pi.metadata?.user_id || pi.metadata?.userId || null) as
    | string
    | null;

  if (plan !== "lifetime" || !userId) {
    return;
  }

  const piAmount = typeof (pi as any).amount_received === "number" &&
      (pi as any).amount_received > 0
    ? (pi as any).amount_received
    : (pi as any).amount;
  const refundAmount = typeof (refund as any).amount === "number"
    ? (refund as any).amount
    : 0;

  // Only revoke on full refunds.
  if (typeof piAmount === "number" && piAmount > 0 && refundAmount < piAmount) {
    console.log("Partial refund; skipping lifetime revocation", {
      refundId: refund.id,
      refundAmount,
      paymentIntentAmount: piAmount,
    });
    return;
  }

  await revokeLifetimeAccess({ userId, eventId, enqueueUserEmail });
}

// Handler for successful payment intents (one-time payments like Lifetime)
// This provides additional verification layer for payment mode checkouts
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string,
) {
  try {
    console.log("Processing payment_intent.succeeded:", paymentIntent.id);

    // Only process one-time payments for lifetime (not invoices with subscriptions)
    const plan = paymentIntent.metadata?.plan;
    const userId = paymentIntent.metadata?.user_id;

    if (!plan || !userId) {
      console.log("No plan or user_id in payment_intent metadata, skipping");
      return;
    }

    if (plan === "lifetime") {
      console.log(`Payment intent for lifetime plan, user ${userId}`);

      // This is logged for monitoring - actual fulfillment should happen in checkout.session.completed
      // We don't create subscription here to avoid duplicates
      console.log(
        "ℹ️  Lifetime payment confirmed - fulfillment handled by checkout.session.completed or invoice.payment_succeeded",
      );
    }
  } catch (error: any) {
    reportStripeWebhookError("handle_payment_intent_succeeded", error, {
      paymentIntentId: paymentIntent.id,
      eventId,
    });
    console.error("Error in handlePaymentIntentSucceeded:", {
      paymentIntentId: paymentIntent.id,
      error: (error as any).message,
      stack: (error as any).stack,
    });
    // Don't throw - this is just for logging/monitoring
  }
}

// Helper function to safely extract product ID from price object
// Handles both string and expanded object formats
function getProductIdFromPrice(price: any): string | null {
  if (!price?.product) return null;
  return typeof price.product === "string"
    ? price.product
    : price.product?.id || null;
}

// Handler for subscription created or updated events
// Helper function to get user by Stripe customer ID
async function getUserByCustomerId(customerId: string) {
  // Query user_stripe_mapping table to get user_id
  const { data: mappingData, error: mappingError } = await supabase
    .from("user_stripe_mapping")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (mappingError || !mappingData) {
    console.error("Error finding user mapping:", mappingError);
    return null;
  }

  // Get user details
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("id", mappingData.user_id)
    .maybeSingle();

  if (userError) {
    console.error("Error finding user:", userError);
    return null;
  }

  return userData;
}

async function getUserForStripeSubscription(
  subscription: Stripe.Subscription,
  customerId: string,
) {
  const { data: mappingData, error: mappingError } = await supabase
    .from("user_stripe_mapping")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (mappingError) {
    throw new Error(
      `user_stripe_mapping lookup by customer_id failed: ${mappingError.message}`,
    );
  }

  const candidate = resolveStripeSubscriptionUserCandidate({
    mappedUserId: mappingData?.user_id ?? null,
    metadata: subscription.metadata ?? null,
  });

  if (candidate.hasConflict && candidate.metadataUserId) {
    reportStripeWebhookError(
      "stripe_subscription_metadata_user_conflict",
      new Error(
        "Stripe subscription metadata user_id conflicts with customer mapping",
      ),
      {
        subscriptionId: subscription.id,
        customerId,
        mappedUserId: candidate.userId,
        metadataUserId: candidate.metadataUserId,
      },
    );
    console.error(
      "Stripe subscription metadata user_id conflicts with mapping",
      {
        subscriptionId: subscription.id,
        customerId,
        mappedUserId: candidate.userId ? redactUserId(candidate.userId) : null,
        metadataUserId: redactUserId(candidate.metadataUserId),
      },
    );
  }

  if (!candidate.userId) {
    return null;
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("id", candidate.userId)
    .maybeSingle();

  if (userError) {
    throw new Error(`users lookup failed: ${userError.message}`);
  }

  if (!userData) {
    console.error("Stripe subscription resolved to missing user", {
      subscriptionId: subscription.id,
      customerId,
      userId: redactUserId(candidate.userId),
      source: candidate.source,
    });
    return null;
  }

  if (candidate.source === "subscription_metadata" && !mappingData?.user_id) {
    const { error: mappingUpsertError } = await supabase
      .from("user_stripe_mapping")
      .upsert(
        {
          user_id: candidate.userId,
          stripe_customer_id: customerId,
        },
        { onConflict: "user_id" },
      );

    if (mappingUpsertError) {
      if (mappingUpsertError.code === "23505") {
        throw new PermanentWebhookError(
          "CUSTOMER_ALREADY_MAPPED",
          `stripe_customer_id ${customerId} is already mapped to another user`,
        );
      }
      throw new Error(
        `user_stripe_mapping metadata backfill failed: ${mappingUpsertError.message}`,
      );
    }

    console.log(
      "Backfilled Stripe customer mapping from subscription metadata",
      {
        subscriptionId: subscription.id,
        customerId,
        userId: redactUserId(candidate.userId),
      },
    );
  }

  return userData;
}

// Helper function to get plan name from product ID
async function getPlanNameFromProductId(productId: string | null | undefined) {
  if (!productId) return "Plus";

  try {
    // Try to get product name from Stripe
    const product = await stripe.products.retrieve(productId);
    return product.name || "Plus";
  } catch (error: any) {
    reportStripeWebhookError("get_plan_name_from_product_id", error, {
      productId,
    });
    console.error("Error getting product name:", error);
    return "Plus";
  }
}

// Helper function to create lifetime subscription payload
// Reduces code duplication for referral system and lifetime upgrades
function createLifetimeSubscriptionPayload(
  userId: string,
  customerId: string | null | undefined,
  eventId: string,
) {
  return {
    user_id: userId,
    provider: "stripe" as const,
    plan: "lifetime" as const,
    status: "active" as const,
    bound_to_user_id: null,
    bound_to_household_id: null,
    stripe_customer_id: customerId || `manual_lifetime_${userId}`,
    stripe_subscription_id: null,
    // Provider hygiene: ensure IAP identifiers are cleared.
    store_product_id: null,
    app_store_transaction_id: null,
    app_store_original_transaction_id: null,
    app_store_environment: null,
    play_purchase_token: null,
    play_order_id: null,
    play_package_name: null,
    billing_interval: null,
    current_period_end: null,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    last_event_id: eventId,
    updated_at: new Date().toISOString(),
  };
}

async function completeReferralAcceptance(params: {
  referralCodeId: string;
  referrerUserId: string;
  refereeUserId: string;
  stripeCheckoutSessionId: string | null;
  eventId: string;
  enqueueUserEmail: EnqueueUserEmail;
}): Promise<boolean> {
  const {
    referralCodeId,
    referrerUserId,
    refereeUserId,
    stripeCheckoutSessionId,
    eventId,
    enqueueUserEmail,
  } = params;

  if (
    !isUuid(referralCodeId) ||
    !isUuid(referrerUserId) ||
    !isUuid(refereeUserId)
  ) {
    return false;
  }

  const { data: acceptance, error: acceptanceError } = await supabase
    .from("referral_acceptances")
    .select(
      "referral_code_id, referrer_user_id, referee_user_id, status, stripe_checkout_session_id",
    )
    .eq("referral_code_id", referralCodeId)
    .eq("referee_user_id", refereeUserId)
    .maybeSingle();

  if (acceptanceError) {
    throw new Error(
      `referral_acceptances lookup failed: ${acceptanceError.message}`,
    );
  }

  if (!acceptance) return false;

  if (acceptance.referrer_user_id !== referrerUserId) return false;
  if (acceptance.status === "completed") return true;

  if (
    stripeCheckoutSessionId &&
    acceptance.stripe_checkout_session_id &&
    acceptance.stripe_checkout_session_id !== stripeCheckoutSessionId
  ) {
    return false;
  }

  const { data: referralCodeRow, error: referralCodeError } = await supabase
    .from("referral_codes")
    .select("user_id, code, is_active")
    .eq("id", referralCodeId)
    .maybeSingle();

  if (referralCodeError) {
    throw new Error(
      `referral_codes lookup failed: ${referralCodeError.message}`,
    );
  }

  if (!referralCodeRow) return false;
  if (referralCodeRow.user_id !== referrerUserId) return false;
  if (!referralCodeRow.is_active) return false;

  // The referral flow now provides a discounted checkout only.
  // Do not upgrade the referrer automatically.

  const nowIso = new Date().toISOString();
  const { error: acceptanceUpdateError } = await supabase
    .from("referral_acceptances")
    .update({
      status: "completed",
      completed_at: nowIso,
      referral_code_text: referralCodeRow.code,
      stripe_checkout_session_id: acceptance.stripe_checkout_session_id ??
        stripeCheckoutSessionId,
    })
    .eq("referral_code_id", referralCodeId)
    .eq("referee_user_id", refereeUserId);

  if (acceptanceUpdateError) {
    throw new Error(
      `referral_acceptances update failed: ${acceptanceUpdateError.message}`,
    );
  }

  // Best-effort: email notification.
  try {
    const { data: referrerUser } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", referrerUserId)
      .single();
    const { data: refereeUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", refereeUserId)
      .single();

    if (referrerUser?.email) {
      const template = referralAcceptedTemplate({
        referrerName: referrerUser.full_name || "there",
        refereeName: refereeUser?.full_name || "A friend",
      });
      enqueueUserEmail(
        referrerUser.email,
        referrerUser.full_name || "",
        template,
      );
    }
  } catch (emailError) {
    reportStripeWebhookError("complete_referral_acceptance_email", emailError, {
      referralCodeId,
      referrerUserId,
      refereeUserId,
    });
    const msg = emailError instanceof Error
      ? emailError.message
      : String(emailError);
    console.error("Referral email send failed (non-fatal):", msg);
  }

  return true;
}

// Handler for subscription created or updated events
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
  relatedInvoice?: Stripe.Invoice,
) {
  try {
    console.log("Processing subscription update:", subscription.id);

    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      return;
    }

    const user = await getUserForStripeSubscription(subscription, customerId);
    if (!user) {
      console.error("No user found for subscription customer:", {
        customerId,
        subscriptionId: subscription.id,
      });
      return;
    }

    const userId = user.id;
    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;

    const { data: previousSub } = await supabase
      .from("subscriptions")
      .select(
        "plan, billing_interval, status, stripe_subscription_id, cancel_at_period_end, current_period_end, ended_at",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const previousStoredStatus = previousSub?.status || "";

    if (
      previousSub?.stripe_subscription_id &&
      previousSub.stripe_subscription_id !== subscription.id
    ) {
      let shouldAcceptIncomingSubscriptionId = false;

      if (isAccessGrantingStatus(status)) {
        try {
          const existingStripeSubscription = await stripe.subscriptions
            .retrieve(
              previousSub.stripe_subscription_id,
            );
          const existingStripeStatus = existingStripeSubscription.status;

          if (isTerminalDowngradeStatus(existingStripeStatus)) {
            shouldAcceptIncomingSubscriptionId = true;
          } else if (
            isAccessGrantingStatus(existingStripeStatus) &&
            typeof existingStripeSubscription.created === "number" &&
            typeof subscription.created === "number" &&
            subscription.created >= existingStripeSubscription.created
          ) {
            shouldAcceptIncomingSubscriptionId = true;
          }
        } catch (stripeError: any) {
          reportStripeWebhookError(
            "handle_subscription_updated_compare_subscription_ids",
            stripeError,
            {
              userId,
              incomingSubscriptionId: subscription.id,
              existingSubscriptionId: previousSub.stripe_subscription_id,
            },
          );
          console.error("Could not compare old vs incoming subscription IDs", {
            userId: redactUserId(userId),
            existingSubscriptionId: previousSub.stripe_subscription_id,
            incomingSubscriptionId: subscription.id,
            error: stripeError?.message || String(stripeError),
          });
        }
      }

      if (!shouldAcceptIncomingSubscriptionId) {
        console.log(
          "Skipping subscription update due to mismatched Stripe subscription id",
          {
            userId: redactUserId(userId),
            incomingSubscriptionId: subscription.id,
            existingSubscriptionId: previousSub.stripe_subscription_id,
            status,
            previousStoredStatus,
          },
        );
        return;
      }

      console.log("Accepting newer Stripe subscription id for user", {
        userId: redactUserId(userId),
        previousSubscriptionId: previousSub.stripe_subscription_id,
        incomingSubscriptionId: subscription.id,
        incomingStatus: status,
      });
    }

    if (
      previousSub?.stripe_subscription_id === subscription.id &&
      previousStoredStatus === "canceled" &&
      !isTerminalDowngradeStatus(status)
    ) {
      console.log(
        "Ignoring non-terminal update for subscription already marked canceled locally",
        {
          userId: redactUserId(userId),
          subscriptionId: subscription.id,
          previousStoredStatus,
          incomingStatus: status,
        },
      );
      return;
    }

    if (
      !previousSub?.stripe_subscription_id &&
      previousSub?.plan === "free" &&
      previousSub?.status === "canceled" &&
      cancelAtPeriodEnd &&
      !isTerminalDowngradeStatus(status)
    ) {
      console.log(
        "Ignoring stale subscription.updated for already canceled free subscription",
        {
          userId: redactUserId(userId),
          incomingSubscriptionId: subscription.id,
          status,
        },
      );
      return;
    }

    if (isTerminalDowngradeStatus(status)) {
      console.log(
        `Subscription ${subscription.id} entered terminal status ${status}, downgrading to free`,
      );

      await downgradeOwnerSubscriptionToFree({
        userId,
        eventId,
        status: mapStripeStatusToStoredStatus(status) === "unpaid"
          ? "unpaid"
          : "canceled",
        stripeSubscriptionId: subscription.id,
      });

      if (
        previousSub?.status !== "canceled" &&
        previousSub?.status !== "unpaid"
      ) {
        const productId = subscription.items?.data?.length > 0
          ? getProductIdFromPrice(subscription.items.data[0]?.price)
          : null;
        const planName = await getPlanNameFromProductId(productId);

        const emailTemplate = subscriptionCanceledTemplate({
          name: user.full_name || "",
          planName,
          endDate: formatUnixTimestampDate(subscription.ended_at) || null,
          immediateCancel: true,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        });

        enqueueUserEmail(user.email, user.full_name || "", emailTemplate);
        console.log(`Terminal status email queued for ${user.email}`);
      }

      return;
    }

    if (status === "paused") {
      console.log(
        `⚠️ Subscription ${subscription.id} is paused - preserving subscription data`,
      );

      const hasDiscount = subscription.discount ||
        (subscription.discounts && subscription.discounts.length > 0);

      if (hasDiscount) {
        console.log(
          "🎫 Paused subscription has discount - checking if 100% off",
        );

        let isFullDiscount = false;
        try {
          const expandedSubscription = await stripe.subscriptions.retrieve(
            subscription.id,
            { expand: ["discounts.coupon"] },
          );

          if (
            expandedSubscription.discount &&
            typeof expandedSubscription.discount === "object"
          ) {
            const coupon = expandedSubscription.discount.coupon;
            if (typeof coupon === "object" && coupon !== null) {
              isFullDiscount = coupon.percent_off === 100;
            }
          }

          if (
            !isFullDiscount &&
            expandedSubscription.discounts &&
            Array.isArray(expandedSubscription.discounts)
          ) {
            for (const discountItem of expandedSubscription.discounts) {
              if (typeof discountItem === "object" && discountItem !== null) {
                const coupon = discountItem.coupon;
                if (
                  typeof coupon === "object" &&
                  coupon !== null &&
                  coupon.percent_off === 100
                ) {
                  isFullDiscount = true;
                  break;
                }
              }
            }
          }
        } catch (error: any) {
          reportStripeWebhookError(
            "handle_subscription_updated_fetch_expanded_discounts",
            error,
            {
              userId,
              subscriptionId: subscription.id,
            },
          );
          console.error(
            "Error fetching expanded subscription discounts:",
            error,
          );
        }

        if (isFullDiscount) {
          console.log("✅ 100% discount confirmed on paused subscription");
        }
      }
    }

    const plan = (subscription.metadata?.plan ||
      subscription.metadata?.user_plan ||
      "plus") as PlanType;
    const billingInterval = (subscription.metadata?.billing_interval ||
      "monthly") as BillingInterval;

    let finalPlan = plan;
    let finalInterval = billingInterval;

    if (!subscription.metadata?.plan) {
      const priceId = subscription.items.data[0]?.price?.id;
      const planInfo = getPlanFromPriceId(priceId);
      if (planInfo) {
        finalPlan = planInfo.plan;
        if (planInfo.interval) {
          finalInterval = planInfo.interval;
        }
      }
    }

    const trialStart = typeof subscription.trial_start === "number" &&
        !Number.isNaN(subscription.trial_start)
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null;
    const trialEnd = typeof subscription.trial_end === "number" &&
        !Number.isNaN(subscription.trial_end)
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    const previousPlan = previousSub?.plan as PlanType | null;
    const previousInterval = previousSub?.billing_interval as
      | BillingInterval
      | null;
    const storedStatus = mapStripeStatusToStoredStatus(status);
    let periodResolution = resolveStripeCurrentPeriodEnd({
      subscription,
      invoice: relatedInvoice,
      status,
      plan: finalPlan,
    });

    if (
      periodResolution.source === "missing" &&
      isAccessGrantingStatus(storedStatus) &&
      finalPlan !== "lifetime"
    ) {
      try {
        const expandedSubscription = await stripe.subscriptions.retrieve(
          subscription.id,
          { expand: ["latest_invoice"] },
        );
        periodResolution = resolveStripeCurrentPeriodEnd({
          subscription: expandedSubscription,
          invoice: relatedInvoice,
          status,
          plan: finalPlan,
        });
      } catch (periodEndError) {
        reportStripeWebhookError(
          "handle_subscription_updated_fetch_period_end_fallback",
          periodEndError,
          {
            userId,
            subscriptionId: subscription.id,
            status,
            plan: finalPlan,
          },
        );
      }
    }

    if (
      periodResolution.source === "missing" &&
      isAccessGrantingStatus(storedStatus) &&
      finalPlan !== "lifetime"
    ) {
      reportStripeWebhookError(
        "handle_subscription_updated_missing_period_end",
        new Error("Access-granting Stripe subscription missing period end"),
        {
          userId,
          subscriptionId: subscription.id,
          status,
          plan: finalPlan,
          hasRelatedInvoice: Boolean(relatedInvoice),
        },
      );
      throw new Error(
        `Access-granting Stripe subscription ${subscription.id} is missing current_period_end`,
      );
    }

    const currentPeriodEnd = periodResolution.currentPeriodEnd;
    const subscriptionPeriodEnd = periodResolution.unixSeconds;

    console.log("Updating subscription for user:", userId, {
      plan: finalPlan,
      billingInterval: finalInterval,
      status: storedStatus,
      currentPeriodEnd,
      currentPeriodEndSource: periodResolution.source,
      cancelAtPeriodEnd,
      previousPlan,
      previousInterval,
    });

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          provider: "stripe",
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          plan: finalPlan,
          billing_interval: finalInterval,
          status: storedStatus,
          bound_to_user_id: null,
          bound_to_household_id: null,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          trial_start: trialStart,
          trial_end: trialEnd,
          current_price_id: subscription.items.data[0]?.price?.id,
          previous_plan: previousPlan,
          previous_interval: previousInterval,
          ended_at: null,
          last_event_id: eventId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (subscriptionError) {
      console.error(
        "Error updating subscription in database:",
        subscriptionError,
      );
      return;
    }

    try {
      const { data: cascadeResult, error: cascadeError } = await supabase.rpc(
        "cascade_subscription_upgrade",
        {
          p_owner_user_id: userId,
          p_new_plan: finalPlan,
          p_new_status: storedStatus,
        },
      );

      if (cascadeError) {
        console.error(
          "Error cascading subscription update to household members:",
          cascadeError,
        );
      } else if (cascadeResult && cascadeResult > 0) {
        console.log(
          `✅ Cascaded subscription update to ${cascadeResult} household members (status: ${storedStatus})`,
        );
      }
    } catch (error: any) {
      reportStripeWebhookError("handle_subscription_updated_cascade", error, {
        userId,
        subscriptionId: subscription.id,
      });
      console.error(
        "Unexpected error during subscription update cascade:",
        error,
      );
    }

    const productId = subscription.items?.data?.length > 0
      ? getProductIdFromPrice(subscription.items.data[0]?.price)
      : null;
    const planName = await getPlanNameFromProductId(productId);
    const endDate = formatUnixTimestampDate(subscriptionPeriodEnd) || "N/A";
    const name = user.full_name || "";
    const hasAccessNow = isAccessGrantingStatus(storedStatus);
    const hadAccessBefore = isAccessGrantingStatus(previousSub?.status || "");

    const isNew = hasAccessNow && !hadAccessBefore;

    if (isNew) {
      const isLifetime = finalPlan === "lifetime";
      const emailTemplate = subscriptionCreatedTemplate({
        name,
        planName,
        endDate: isLifetime ? undefined : endDate,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        isLifetime,
      });

      enqueueUserEmail(user.email, name, emailTemplate);
      console.log(`Welcome email queued for ${user.email}`);
      return;
    }

    if (
      hasAccessNow &&
      cancelAtPeriodEnd &&
      !previousSub?.cancel_at_period_end
    ) {
      const emailTemplate = subscriptionCanceledTemplate({
        name,
        planName,
        endDate,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        immediateCancel: false,
      });

      enqueueUserEmail(user.email, name, emailTemplate);
      console.log(`Scheduled cancellation email queued for ${user.email}`);
      return;
    }

    if (
      hasAccessNow &&
      previousPlan &&
      (previousPlan !== finalPlan || previousInterval !== finalInterval)
    ) {
      const changeType = getChangeType(
        previousPlan,
        finalPlan,
        previousInterval || undefined,
        finalInterval,
      );

      const templateChangeType = changeType === "upgraded"
        ? "upgrade"
        : changeType === "downgraded"
        ? "downgrade"
        : changeType === "interval_changed"
        ? "interval_changed"
        : "renewal";

      const emailTemplate = subscriptionUpdatedTemplate({
        name,
        planName,
        endDate,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        changeType: templateChangeType,
      });

      enqueueUserEmail(user.email, name, emailTemplate);
      console.log(
        `Subscription ${templateChangeType} email queued for ${user.email}`,
      );
    }
  } catch (error: any) {
    reportStripeWebhookError("handle_subscription_updated", error, {
      subscriptionId: subscription.id,
      eventId,
    });
    console.error("Error in handleSubscriptionUpdated:", {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for subscription deleted events
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing subscription deletion:", subscription.id);

    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      return;
    }

    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, plan, status")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (subError) {
      console.error("Error finding subscription:", subError);
      return;
    }

    if (!subData?.user_id) {
      console.log(
        "Ignoring subscription.deleted for non-current subscription",
        {
          subscriptionId: subscription.id,
          customerId,
        },
      );
      return;
    }

    const userId = subData.user_id;

    if (subData.plan === "lifetime" && subData.status === "active") {
      console.log(
        "Ignoring subscription.deleted because local entitlement is active lifetime",
        {
          userId: redactUserId(userId),
          subscriptionId: subscription.id,
        },
      );
      return;
    }

    await downgradeOwnerSubscriptionToFree({
      userId,
      eventId,
      status: "canceled",
      stripeSubscriptionId: subscription.id,
      endedAt: typeof subscription.ended_at === "number" &&
          !Number.isNaN(subscription.ended_at)
        ? new Date(subscription.ended_at * 1000).toISOString()
        : new Date().toISOString(),
    });

    console.log("User downgraded to free plan:", userId);

    const { data: affectedUser } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (!affectedUser?.email) {
      return;
    }

    const planId = subscription.items?.data?.length > 0
      ? getProductIdFromPrice(subscription.items.data[0]?.price)
      : null;

    const planName = await getPlanNameFromProductId(planId);
    const name = affectedUser.full_name || "";
    const endDate = formatUnixTimestampDate(subscription.ended_at);

    const emailTemplate = subscriptionCanceledTemplate({
      name,
      planName,
      endDate,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      immediateCancel: true,
    });

    enqueueUserEmail(affectedUser.email, name, emailTemplate);
    console.log(
      `Subscription cancellation email queued for ${affectedUser.email}`,
    );
  } catch (error: any) {
    reportStripeWebhookError("handle_subscription_deleted", error, {
      subscriptionId: subscription.id,
      eventId,
    });
    console.error("Error in handleSubscriptionDeleted:", {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for successful invoice payments
// CRITICAL: Send invoice receipt email with PDF to customer
// HANDLES BOTH: Recurring subscription invoices AND one-time payment invoices (lifetime)
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing successful payment for invoice:", invoice.id);

    // Process RECURRING subscription invoices
    if (invoice.subscription) {
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription.id;

      // Get the subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update subscription in our database
      await handleSubscriptionUpdated(
        subscription,
        eventId,
        enqueueUserEmail,
        invoice,
      );

      // SEND INVOICE RECEIPT EMAIL WITH PDF
      // Get customer ID safely
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

      if (!customerId) {
        console.error("No customer ID in invoice:", invoice.id);
        return;
      }

      // Get user details
      const user = await getUserByCustomerId(customerId);

      if (!user) {
        console.error("No user found for customer:", customerId);
        return;
      }

      // Get plan name from invoice line items - use safe extraction
      const productId = invoice.lines?.data?.length > 0
        ? getProductIdFromPrice(invoice.lines.data[0]?.price)
        : null;
      const planName = await getPlanNameFromProductId(productId);

      // Format payment date
      const paymentDate = invoice.status_transitions?.paid_at &&
          !isNaN(invoice.status_transitions.paid_at)
        ? new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(invoice.status_transitions.paid_at * 1000))
        : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      // Prepare invoice receipt email with PDF
      const emailTemplate = invoicePaymentSucceededTemplate({
        name: user.full_name || "",
        planName,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        invoiceNumber: invoice.number || invoice.id,
        paymentDate,
        invoiceUrl: invoice.hosted_invoice_url ||
          `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        invoicePdfUrl: invoice.invoice_pdf || undefined,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      });

      enqueueUserEmail(user.email, user.full_name || "", emailTemplate);
      console.log(
        `Invoice receipt email queued for ${user.email} with PDF link`,
      );
    } else {
      // CRITICAL: Handle ONE-TIME invoices (e.g., Lifetime), including manual $0 invoices with discounts
      // invoice.subscription === null. This is a backup/verification path for Checkout mode=payment
      console.log(
        "Processing one-time payment invoice (no subscription):",
        invoice.id,
      );

      // Get customer and mapped user
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

      if (!customerId) {
        console.error(
          "No customer ID in one-time payment invoice:",
          invoice.id,
        );
        return;
      }

      const user = await getUserByCustomerId(customerId);
      const mappedUserId = user?.id as string | undefined;

      // Try to determine plan and user by multiple fallbacks
      // 1) PaymentIntent metadata (preferred when present)
      const paymentIntentId = typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id;

      let determinedPlan: PlanType | null = null;
      let determinedUserId: string | null = null;

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId,
          );
          const piPlan = paymentIntent.metadata?.plan as PlanType | undefined;
          const piUserId = paymentIntent.metadata?.user_id as
            | string
            | undefined;
          if (piPlan) determinedPlan = piPlan;
          if (piUserId) determinedUserId = piUserId;
        } catch (piErr) {
          reportStripeWebhookError(
            "handle_invoice_payment_succeeded_retrieve_payment_intent",
            piErr,
            {
              invoiceId: invoice.id,
              paymentIntentId,
            },
          );
          console.error("Error retrieving payment_intent metadata:", piErr);
        }
      }

      // 2) Invoice metadata fallback (plan)
      if (!determinedPlan && (invoice as any).metadata?.plan) {
        determinedPlan = (invoice as any).metadata.plan as string as PlanType;
      }

      // 2b) Invoice metadata fallback (user id)
      if (!determinedUserId && (invoice as any).metadata) {
        const meta: any = (invoice as any).metadata;
        if (meta.user_id || meta.userId) {
          determinedUserId = (meta.user_id || meta.userId) as string;
        }
      }

      // 3) Price ID mapping from invoice lines
      if (!determinedPlan && invoice.lines?.data?.length) {
        const lineAny: any = invoice.lines.data[0];
        const priceId = lineAny?.price?.id ||
          lineAny?.pricing?.price_details?.price;
        if (priceId) {
          const planInfo = getPlanFromPriceId(priceId);
          if (planInfo?.plan) {
            determinedPlan = planInfo.plan;
          }
        }
      }

      // 4) Product name heuristic (last resort)
      if (!determinedPlan && invoice.lines?.data?.length) {
        const productId = getProductIdFromPrice(invoice.lines.data[0]?.price);
        if (productId) {
          try {
            const product = await stripe.products.retrieve(productId);
            if (product?.name && /lifetime/i.test(product.name)) {
              determinedPlan = "lifetime";
            }
          } catch (prodErr) {
            reportStripeWebhookError(
              "handle_invoice_payment_succeeded_retrieve_product",
              prodErr,
              {
                invoiceId: invoice.id,
                productId,
              },
            );
            console.error(
              "Error retrieving product for invoice line:",
              prodErr,
            );
          }
        }
      }

      // Resolve userId: prefer PI metadata, else mapped user from customer
      const userId = determinedUserId || mappedUserId;

      if (!determinedPlan) {
        console.log(
          "One-time invoice without determinable plan; skipping fulfillment",
          {
            invoiceId: invoice.id,
            hasPaymentIntent: !!paymentIntentId,
            linePriceId: invoice.lines?.data?.[0]?.price?.id || null,
          },
        );
        return;
      }

      if (!userId) {
        console.error(
          "Cannot fulfill one-time invoice: user not resolved from customer mapping or metadata",
          {
            invoiceId: invoice.id,
            customerId,
          },
        );
        return;
      }

      // Only fulfill one-time Lifetime. Recurring plans must come via subscriptions
      if (determinedPlan === "lifetime") {
        // Note: invoice.amount_paid can be 0 (100% discount). Stripe marks status=paid; honor that.
        console.log(
          `ONE-TIME LIFETIME FULFILLMENT: user=${userId}, invoice=${invoice.id}, amount_paid=${invoice.amount_paid}`,
        );

        // Referral sidecar: attempt to complete via DB-backed acceptance.
        try {
          let processed = false;
          const paymentIntentId = typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : invoice.payment_intent?.id;

          if (paymentIntentId) {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            const checkoutType = (pi.metadata?.checkout_type as string) || "";
            const referralCodeId = pi.metadata?.referral_code_id as
              | string
              | undefined;
            const referrerUserId = pi.metadata?.referrer_user_id as
              | string
              | undefined;
            const refereeUserId = pi.metadata?.referee_user_id as
              | string
              | undefined;

            if (
              checkoutType === "referral_acceptance" &&
              referralCodeId &&
              referrerUserId &&
              refereeUserId
            ) {
              processed = await completeReferralAcceptance({
                referralCodeId,
                referrerUserId,
                refereeUserId,
                stripeCheckoutSessionId: null,
                eventId,
                enqueueUserEmail,
              });
            }
          }

          if (!processed) {
            const { data: pendingAcceptance } = await supabase
              .from("referral_acceptances")
              .select(
                "referral_code_id, referrer_user_id, referee_user_id, status",
              )
              .eq("referee_user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (pendingAcceptance && pendingAcceptance.status !== "completed") {
              await completeReferralAcceptance({
                referralCodeId: pendingAcceptance.referral_code_id,
                referrerUserId: pendingAcceptance.referrer_user_id,
                refereeUserId: pendingAcceptance.referee_user_id,
                stripeCheckoutSessionId: null,
                eventId,
                enqueueUserEmail,
              });
            }
          }
        } catch (sidecarErr) {
          reportStripeWebhookError(
            "handle_invoice_payment_succeeded_referral_sidecar",
            sidecarErr,
            {
              invoiceId: invoice.id,
              eventId,
            },
          );
          const msg = sidecarErr instanceof Error
            ? sidecarErr.message
            : String(sidecarErr);
          console.error("Referral sidecar error:", msg);
        }

        // Check existing sub
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", userId)
          .maybeSingle();

        const payerAlreadyLifetime = existingSub?.plan === "lifetime" &&
          existingSub?.status === "active";
        if (payerAlreadyLifetime) {
          console.log(
            `✅ User ${userId} already has active lifetime subscription`,
          );
          // Do not return here — still need to process inviter (referrer) sidecar flow
        }

        if (!payerAlreadyLifetime) {
          const lifetimeData = {
            user_id: userId,
            provider: "stripe",
            plan: "lifetime",
            status: "active",
            bound_to_user_id: null,
            bound_to_household_id: null,
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            // Provider hygiene: ensure IAP identifiers are cleared.
            store_product_id: null,
            app_store_transaction_id: null,
            app_store_original_transaction_id: null,
            app_store_environment: null,
            play_purchase_token: null,
            play_order_id: null,
            play_package_name: null,
            billing_interval: null,
            current_period_end: null,
            cancel_at_period_end: false,
            trial_start: null,
            trial_end: null,
            last_event_id: `invoice_${eventId}`,
            updated_at: new Date().toISOString(),
          };

          const { error: upsertError } = await supabase
            .from("subscriptions")
            .upsert(lifetimeData, {
              onConflict: "user_id",
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error(
              "CRITICAL: Lifetime fulfillment upsert failed:",
              upsertError,
            );
            throw upsertError;
          }

          // Send confirmation email to payer
          const { data: userData } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("id", userId)
            .single();

          if (userData) {
            const emailTemplate = subscriptionCreatedTemplate({
              name: userData.full_name || "",
              planName: "Lifetime",
              dashboardUrl:
                `${DASHBOARD_URL}/dashboard/user-settings/membership`,
              isLifetime: true,
            });
            enqueueUserEmail(
              userData.email,
              userData.full_name || "",
              emailTemplate,
            );
          }
        }
      } else {
        // Safety: do not create recurring subscriptions from manual invoices without subscription ID
        console.log(
          "One-time invoice maps to non-lifetime plan; skipping DB subscription creation",
          {
            invoiceId: invoice.id,
            plan: determinedPlan,
          },
        );
      }
    }
  } catch (error: any) {
    reportStripeWebhookError("handle_invoice_payment_succeeded", error, {
      invoiceId: invoice.id,
      eventId,
    });
    console.error("Error in handleInvoicePaymentSucceeded:", {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    });
    throw error; // Re-throw to be caught by webhook handler
  }
}

// Handler for failed invoice payments
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing failed payment for invoice:", invoice.id);

    if (!invoice.subscription) {
      return;
    }

    const subscriptionId = typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;

    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, plan")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (subError) {
      console.error("Error finding subscription:", subError);
      return;
    }

    if (!subData?.user_id) {
      console.error("No subscription found with ID:", subscriptionId);
      return;
    }

    const userId = subData.user_id;
    const plan = (subData as any).plan as string | null;

    let latestStripeStatus = "past_due";
    try {
      const latestSubscription = await stripe.subscriptions.retrieve(
        subscriptionId,
      );
      latestStripeStatus = latestSubscription.status;
    } catch (retrieveError: any) {
      reportStripeWebhookError(
        "handle_invoice_payment_failed_retrieve_status",
        retrieveError,
        {
          invoiceId: invoice.id,
          subscriptionId,
        },
      );
      console.error(
        "Failed to retrieve latest subscription after payment failure",
        {
          subscriptionId,
          error: retrieveError?.message || String(retrieveError),
        },
      );
    }

    const mappedStatus = mapStripeStatusToStoredStatus(latestStripeStatus);

    if (isTerminalDowngradeStatus(latestStripeStatus)) {
      await downgradeOwnerSubscriptionToFree({
        userId,
        eventId: `invoice_payment_failed_${invoice.id}`,
        status: mappedStatus === "unpaid" ? "unpaid" : "canceled",
        stripeSubscriptionId: subscriptionId,
      });
      console.log(
        `Subscription moved to terminal state ${latestStripeStatus}; user downgraded`,
      );
    } else {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: mappedStatus,
          last_event_id: `invoice_payment_failed_${invoice.id}`,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating subscription status:", updateError);
        return;
      }

      if (plan) {
        try {
          await supabase.rpc("cascade_subscription_upgrade", {
            p_owner_user_id: userId,
            p_new_plan: plan,
            p_new_status: mappedStatus,
          });
        } catch (cascadeError) {
          reportStripeWebhookError(
            "handle_invoice_payment_failed_cascade",
            cascadeError,
            {
              invoiceId: invoice.id,
              userId,
            },
          );
          console.error(
            "Error cascading payment-failed status to household members (non-fatal):",
            cascadeError,
          );
        }
      }
    }

    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (!userData) {
      return;
    }

    let planName = "Premium";
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.items?.data?.length > 0) {
        const productId = getProductIdFromPrice(
          subscription.items.data[0]?.price,
        );
        planName = await getPlanNameFromProductId(productId);
      }
    } catch (subscriptionFetchError: any) {
      reportStripeWebhookError(
        "handle_invoice_payment_failed_fetch_subscription_for_email",
        subscriptionFetchError,
        {
          invoiceId: invoice.id,
          subscriptionId,
        },
      );
      console.error(
        "Could not fetch subscription details for payment-failed email",
        {
          subscriptionId,
          error: subscriptionFetchError?.message ||
            String(subscriptionFetchError),
        },
      );
    }

    const name = userData.full_name || "";
    const membershipUrl = `${DASHBOARD_URL}/dashboard/user-settings/membership`;
    const emailTemplate = paymentFailedTemplate({
      name,
      planName,
      dashboardUrl: membershipUrl,
      updatePaymentUrl: membershipUrl,
      isDowngraded: isTerminalDowngradeStatus(latestStripeStatus),
      resubscribeUrl: membershipUrl,
    });

    enqueueUserEmail(userData.email, name, emailTemplate);
    console.log(`Payment failure email queued for ${userData.email}`);
  } catch (error: any) {
    reportStripeWebhookError("handle_invoice_payment_failed", error, {
      invoiceId: invoice.id,
    });
    console.error("Error in handleInvoicePaymentFailed:", {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for invoice payment action required (3DS authentication)
async function handleInvoicePaymentActionRequired(
  invoice: Stripe.Invoice,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing payment action required for invoice:", invoice.id);

    const customerId = typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      console.error("No customer ID in invoice:", invoice.id);
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      return;
    }

    // Get user data for personalized email
    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (!userData) {
      console.error(
        "Could not fetch user data for payment action required email",
      );
      return;
    }

    const name = userData.full_name || "there";

    // Get plan name from invoice - use safe extraction
    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromPrice(invoice.lines.data[0]?.price)
      : null;
    const planName = await getPlanNameFromProductId(productId);

    // Send 3DS authentication required email
    console.log(`Payment requires authentication for ${userData.email}`);
    console.log(`Invoice hosted page: ${invoice.hosted_invoice_url}`);

    const emailTemplate = paymentActionRequiredTemplate({
      name,
      planName,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      authenticationUrl: invoice.hosted_invoice_url ||
        `${DASHBOARD_URL}/dashboard/user-settings/membership?tab=payment`,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
    });

    enqueueUserEmail(userData.email, name, emailTemplate);
    console.log(`Payment action required email queued for ${userData.email}`);
  } catch (error: any) {
    reportStripeWebhookError("handle_invoice_payment_action_required", error, {
      invoiceId: invoice.id,
    });
    console.error("Error in handleInvoicePaymentActionRequired:", {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for trial ending notification
async function handleSubscriptionTrialEnding(
  subscription: Stripe.Subscription,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing trial ending for subscription:", subscription.id);

    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      return;
    }

    // Get plan details - use safe extraction
    let planName = "Premium";
    if (subscription.items?.data?.length > 0) {
      const productId = getProductIdFromPrice(
        subscription.items.data[0]?.price,
      );
      planName = await getPlanNameFromProductId(productId);
    }

    const trialEndDate =
      subscription.trial_end && !isNaN(subscription.trial_end)
        ? new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(subscription.trial_end * 1000))
        : "N/A";

    // Send trial ending email
    const name = user.full_name || "";
    const emailTemplate = trialEndingTemplate({
      name,
      planName,
      trialEndDate,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
    });

    enqueueUserEmail(user.email, name, emailTemplate);
    console.log(`Trial ending email queued for ${user.email}`);
  } catch (error: any) {
    reportStripeWebhookError("handle_subscription_trial_ending", error, {
      subscriptionId: subscription.id,
    });
    console.error("Error in handleSubscriptionTrialEnding:", {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    });
    throw error; // Re-throw to be caught by webhook handler
  }
}

// Handler for checkout session completed (CRITICAL for immediate access)
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing checkout session completed:", session.id);

    const sessionId = session.id;
    const customerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

    if (!customerId) {
      throw new PermanentWebhookError(
        "NO_CUSTOMER_ID",
        `No customer ID on checkout session ${sessionId}`,
      );
    }

    // Resolve the user ID using server-side sources first.
    const { data: verificationRow, error: verificationError } = await supabase
      .from("stripe_checkout_session_verifications")
      .select("user_id, plan")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (verificationError) {
      // Transient DB issue: allow Stripe retry.
      throw new Error(
        `stripe_checkout_session_verifications lookup failed: ${verificationError.message}`,
      );
    }

    const userIdFromVerification = isUuid(verificationRow?.user_id)
      ? (verificationRow!.user_id as string)
      : null;
    const planFromVerification = typeof verificationRow?.plan === "string"
      ? verificationRow.plan
      : null;

    const { data: customerMapping, error: customerMappingError } =
      await supabase
        .from("user_stripe_mapping")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

    if (customerMappingError) {
      throw new Error(
        `user_stripe_mapping lookup by customer_id failed: ${customerMappingError.message}`,
      );
    }

    const userIdFromCustomerMapping = isUuid(customerMapping?.user_id)
      ? (customerMapping!.user_id as string)
      : null;

    const rawUserIdFromSession = session.metadata?.user_id ||
      (session.metadata as any)?.userId ||
      session.client_reference_id;
    const userIdFromSession = isUuid(rawUserIdFromSession)
      ? rawUserIdFromSession
      : null;

    // Last-resort: PaymentIntent metadata (still validate UUID).
    let userIdFromPaymentIntent: string | null = null;
    if (
      !userIdFromVerification &&
      !userIdFromCustomerMapping &&
      !userIdFromSession
    ) {
      if (session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const piUserId = (pi.metadata?.user_id ||
          (pi.metadata as any)?.userId) as string | undefined;
        userIdFromPaymentIntent = isUuid(piUserId) ? piUserId : null;
      }
    }

    if (
      userIdFromVerification &&
      userIdFromCustomerMapping &&
      userIdFromVerification !== userIdFromCustomerMapping
    ) {
      throw new PermanentWebhookError(
        "CUSTOMER_MAPPING_MISMATCH",
        `Checkout session user_id mismatch (verification ${
          redactUserId(
            userIdFromVerification,
          )
        } vs mapping ${redactUserId(userIdFromCustomerMapping)})`,
      );
    }

    const userId = userIdFromVerification ||
      userIdFromCustomerMapping ||
      userIdFromSession ||
      userIdFromPaymentIntent;

    if (!userId) {
      throw new PermanentWebhookError(
        "USER_NOT_RESOLVED",
        `Unable to resolve user for checkout session ${sessionId}`,
      );
    }

    // Backfill customer mapping only when we have a server-derived user ID.
    if (userIdFromVerification && !userIdFromCustomerMapping) {
      const { error: mappingUpsertError } = await supabase
        .from("user_stripe_mapping")
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
          },
          { onConflict: "user_id" },
        );

      if (mappingUpsertError) {
        if (mappingUpsertError.code === "23505") {
          throw new PermanentWebhookError(
            "CUSTOMER_ALREADY_MAPPED",
            `stripe_customer_id already mapped to a different user for checkout session ${sessionId}`,
          );
        }
        throw new Error(
          `user_stripe_mapping upsert failed: ${mappingUpsertError.message}`,
        );
      }
    }

    // For subscriptions, the customer.subscription.created event will handle the subscription
    // For one-time payments (Lifetime), handle fulfillment here
    if (session.mode === "subscription") {
      console.log(
        "Subscription checkout completed, subscription will be created via webhook",
      );
    } else if (session.mode === "payment") {
      console.log("One-time payment completed:", session.id);

      // Resolve plan (server-side record preferred).
      let plan: string | null = planFromVerification;
      if (!plan) {
        plan = typeof session.metadata?.plan === "string"
          ? session.metadata.plan
          : null;
      }
      if (!plan && session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        plan = typeof pi.metadata?.plan === "string" ? pi.metadata.plan : null;
      }

      if (!plan) {
        throw new PermanentWebhookError(
          "MISSING_PLAN",
          `Payment mode checkout missing plan metadata (session ${sessionId})`,
        );
      }

      if (plan === "lifetime") {
        // Fulfill only when payment is confirmed (Stripe official guidance).
        const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["payment_intent"],
        });

        const paymentStatus = (fullSession as any).payment_status ||
          (session as any).payment_status;
        const amountTotal =
          typeof (fullSession as any).amount_total === "number"
            ? (fullSession as any).amount_total
            : (session as any).amount_total;

        if (
          paymentStatus !== "paid" &&
          paymentStatus !== "no_payment_required"
        ) {
          console.log(
            "Skipping lifetime fulfillment (payment not completed):",
            {
              sessionId,
              paymentStatus,
              userId: redactUserId(userId),
            },
          );
          return;
        }

        if (paymentStatus === "no_payment_required" && amountTotal !== 0) {
          throw new PermanentWebhookError(
            "INVALID_PAYMENT_STATUS",
            `Checkout session ${sessionId} has no_payment_required but amount_total != 0`,
          );
        }

        // If a PaymentIntent exists, require it to be succeeded.
        const fullPaymentIntent = (fullSession as any).payment_intent;
        const piStatus =
          fullPaymentIntent && typeof fullPaymentIntent === "object"
            ? (fullPaymentIntent as any).status
            : null;

        if (piStatus && piStatus !== "succeeded") {
          console.log("Skipping lifetime fulfillment (PI not succeeded):", {
            sessionId,
            paymentStatus,
            paymentIntentStatus: piStatus,
            userId: redactUserId(userId),
          });
          return;
        }

        console.log(
          "Processing Lifetime plan purchase for user:",
          redactUserId(userId),
        );

        // CRITICAL: Fetch old subscription ID BEFORE upserting lifetime
        // We need to cancel any existing Stripe subscription when user upgrades to lifetime
        const { data: oldSubData } = await supabase
          .from("subscriptions")
          .select("stripe_subscription_id, plan, status")
          .eq("user_id", userId)
          .maybeSingle();

        const oldStripeSubscriptionId = oldSubData?.stripe_subscription_id;
        console.log("Existing subscription before lifetime upgrade:", {
          oldPlan: oldSubData?.plan,
          oldStatus: oldSubData?.status,
          oldSubscriptionId: oldStripeSubscriptionId,
        });

        // Create or update subscription record for Lifetime plan
        // Use helper function to create consistent lifetime payload
        const lifetimeSubscriptionData = createLifetimeSubscriptionPayload(
          userId,
          customerId,
          eventId,
        );

        console.log(
          "Upserting Lifetime subscription with data:",
          lifetimeSubscriptionData,
        );

        const { error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(lifetimeSubscriptionData, {
            onConflict: "user_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error("Error creating Lifetime subscription:", {
            error: upsertError,
            userId,
            customerId,
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
          });
          throw upsertError;
        }

        console.log(
          "✅ Lifetime subscription created successfully for user:",
          userId,
        );

        // REFERRAL HANDLING (optional): only process when DB-backed and valid.
        // Never create acceptance records from Stripe metadata.
        const { data: acceptanceBySession, error: acceptanceBySessionError } =
          await supabase
            .from("referral_acceptances")
            .select(
              "referral_code_id, referrer_user_id, referee_user_id, status, stripe_checkout_session_id",
            )
            .eq("stripe_checkout_session_id", sessionId)
            .maybeSingle();

        if (acceptanceBySessionError) {
          throw new Error(
            `referral_acceptances lookup by session_id failed: ${acceptanceBySessionError.message}`,
          );
        }

        let acceptance = acceptanceBySession ?? null;

        if (!acceptance) {
          // Fallback: verify that metadata points to an existing acceptance.
          const rawReferralCodeId = session.metadata?.referral_code_id;
          const rawReferrerUserId = session.metadata?.referrer_user_id;
          const rawRefereeUserId = session.metadata?.referee_user_id;

          if (
            isUuid(rawReferralCodeId) &&
            isUuid(rawReferrerUserId) &&
            isUuid(rawRefereeUserId)
          ) {
            const { data: acceptanceByKey, error: acceptanceByKeyError } =
              await supabase
                .from("referral_acceptances")
                .select(
                  "referral_code_id, referrer_user_id, referee_user_id, status, stripe_checkout_session_id",
                )
                .eq("referral_code_id", rawReferralCodeId)
                .eq("referee_user_id", rawRefereeUserId)
                .maybeSingle();

            if (acceptanceByKeyError) {
              throw new Error(
                `referral_acceptances lookup by key failed: ${acceptanceByKeyError.message}`,
              );
            }

            acceptance = acceptanceByKey ?? null;
          }
        }

        if (acceptance) {
          const referralCodeId = acceptance.referral_code_id as string;
          const referrerUserId = acceptance.referrer_user_id as string;
          const refereeUserId = acceptance.referee_user_id as string;

          // Strong validation: acceptance must match purchaser.
          if (
            !isUuid(referralCodeId) ||
            !isUuid(referrerUserId) ||
            !isUuid(refereeUserId)
          ) {
            console.error("Referral acceptance has invalid IDs; skipping", {
              sessionId,
            });
          } else if (refereeUserId !== userId) {
            console.error("Referral acceptance referee mismatch; skipping", {
              sessionId,
              purchaser: redactUserId(userId),
              referee: redactUserId(refereeUserId),
            });
          } else if (referrerUserId === refereeUserId) {
            console.error(
              "Referral acceptance has same referrer/referee; skipping",
              {
                sessionId,
                userId: redactUserId(userId),
              },
            );
          } else if (acceptance.status === "completed") {
            console.log("Referral already completed; skipping", {
              sessionId,
              referee: redactUserId(refereeUserId),
            });
          } else {
            // Verify referral_code ownership.
            const { data: referralCodeRow, error: referralCodeError } =
              await supabase
                .from("referral_codes")
                .select("user_id, code, is_active")
                .eq("id", referralCodeId)
                .maybeSingle();

            if (referralCodeError) {
              throw new Error(
                `referral_codes lookup failed: ${referralCodeError.message}`,
              );
            }

            if (
              !referralCodeRow ||
              referralCodeRow.user_id !== referrerUserId
            ) {
              console.error(
                "Referral code ownership mismatch; skipping referral completion",
                {
                  sessionId,
                  referee: redactUserId(refereeUserId),
                  referrer: redactUserId(referrerUserId),
                },
              );
            } else {
              await completeReferralAcceptance({
                referralCodeId,
                referrerUserId,
                refereeUserId,
                stripeCheckoutSessionId: sessionId,
                eventId,
                enqueueUserEmail,
              });
            }
          }
        }

        // CRITICAL FIX: Cancel the old Stripe subscription to prevent webhook conflicts
        // If user had an active trial/paid subscription, it must be canceled immediately
        if (
          oldStripeSubscriptionId &&
          oldStripeSubscriptionId !== "null" &&
          oldStripeSubscriptionId.startsWith("sub_")
        ) {
          console.log(
            `🔄 Canceling old subscription ${oldStripeSubscriptionId} for user ${userId} (upgraded to lifetime)`,
          );

          try {
            // Cancel immediately (user already paid for lifetime)
            await stripe.subscriptions.cancel(oldStripeSubscriptionId, {
              prorate: false, // Don't prorate, they already paid for lifetime
            });
            console.log(
              `✅ Old subscription ${oldStripeSubscriptionId} canceled successfully`,
            );
          } catch (cancelError) {
            reportStripeWebhookError(
              "handle_checkout_session_completed_cancel_old_subscription",
              cancelError,
              {
                oldStripeSubscriptionId,
                userId,
                sessionId: session.id,
              },
            );
            // Log but don't throw - lifetime is already granted
            const msg = cancelError instanceof Error
              ? cancelError.message
              : String(cancelError);
            const code = (cancelError as any)?.code;
            console.error(
              `⚠️  Warning: Could not cancel old subscription ${oldStripeSubscriptionId}:`,
              {
                error: msg,
                code,
              },
            );
            console.log(
              "   User still has lifetime access. Admin should manually cancel subscription in Stripe.",
            );
          }
        } else {
          console.log(
            "ℹ️  No existing Stripe subscription to cancel (user may have been on free plan or first purchase)",
          );
        }

        // Get user details for welcome email
        const { data: userData } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (userData) {
          // Send Lifetime purchase confirmation email
          const name = userData.full_name || "";
          const emailTemplate = subscriptionCreatedTemplate({
            name,
            planName: "Lifetime",
            dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
            isLifetime: true, // No end date, permanent access
          });

          enqueueUserEmail(userData.email, name, emailTemplate);
          console.log(
            `Lifetime confirmation email queued for ${userData.email}`,
          );
        }
      } else {
        // CRITICAL ERROR: Payment mode used for non-lifetime plan
        console.error(
          "CRITICAL: Payment mode checkout with non-lifetime plan!",
          {
            sessionId: session.id,
            userId,
            customerId,
            plan,
            metadata: session.metadata,
          },
        );

        // Log to help debug why this happened
        console.error(
          "This should never happen! Payment mode should only be used for lifetime plans.",
        );
        console.error(
          "User paid but subscription was not created. Manual intervention required!",
        );

        // Still process as best we can - treat as lifetime to avoid user losing money
        console.log(
          "FALLBACK: Treating as lifetime to prevent user from losing payment",
        );

        // Send alert email or log to monitoring system here
        // For now, we'll just throw an error after logging
        throw new Error(
          `Invalid payment mode checkout: plan="${plan}" should be "lifetime"`,
        );
      }
    }
  } catch (error: any) {
    reportStripeWebhookError("handle_checkout_session_completed", error, {
      sessionId: session.id,
      eventId,
    });
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Error in handleCheckoutSessionCompleted:", {
      sessionId: session.id,
      error: message,
      stack,
    });
    throw error;
  }
}

// Handler for async payment failures
async function handleCheckoutSessionAsyncPaymentFailed(
  session: Stripe.Checkout.Session,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing async payment failure for session:", session.id);

    const userId = session.metadata?.user_id || session.client_reference_id;

    if (!userId) {
      console.error("No user ID in checkout session:", session.id);
      return;
    }

    // Get user details
    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userData) {
      // Send async payment failure email
      const name = userData.full_name || "";
      const emailTemplate = paymentFailedTemplate({
        name,
        planName: session.metadata?.plan || "Premium",
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        updatePaymentUrl:
          `${DASHBOARD_URL}/checkout?plan=${session.metadata?.plan}`,
      });

      enqueueUserEmail(userData.email, name, emailTemplate);
      console.log(`Async payment failure email queued for ${userData.email}`);
    }
  } catch (error: any) {
    reportStripeWebhookError(
      "handle_checkout_session_async_payment_failed",
      error,
      {
        sessionId: session.id,
      },
    );
    console.error("Error in handleCheckoutSessionAsyncPaymentFailed:", {
      sessionId: session.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for invoice finalized (send invoice copy)
async function handleInvoiceFinalized(
  invoice: Stripe.Invoice,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing finalized invoice:", invoice.id);

    const customerId = typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      console.error("No customer ID in invoice:", invoice.id);
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      return;
    }

    // Get user data for personalized email
    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (!userData) {
      console.error("Could not fetch user data for invoice email");
      return;
    }

    const name = userData.full_name || "there";

    // Get plan name from subscription - use safe extraction
    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromPrice(invoice.lines.data[0]?.price)
      : null;
    const planName = await getPlanNameFromProductId(productId);

    const emailTemplate = invoiceFinalizedTemplate({
      name,
      planName,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      invoiceUrl: invoice.hosted_invoice_url || "#",
      invoicePdfUrl: invoice.invoice_pdf || undefined,
      dueDate: invoice.due_date
        ? new Date(invoice.due_date * 1000).toLocaleDateString()
        : undefined,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
    });

    enqueueUserEmail(userData.email, name, emailTemplate);
    console.log(`Invoice finalized email queued for ${userData.email}`);
  } catch (error: any) {
    reportStripeWebhookError("handle_invoice_finalized", error, {
      invoiceId: invoice.id,
    });
    console.error("Error in handleInvoiceFinalized:", {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for upcoming invoice (renewal reminder)
async function handleInvoiceUpcoming(
  invoice: Stripe.Invoice,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing upcoming invoice:", invoice.id);

    const customerId = typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      console.error("No customer ID in invoice:", invoice.id);
      return;
    }

    const user = await getUserByCustomerId(customerId);
    if (!user) {
      console.error("No user found for customer:", customerId);
      return;
    }

    if (
      typeof invoice.next_payment_attempt !== "number" ||
      Number.isNaN(invoice.next_payment_attempt)
    ) {
      console.log("Skipping invoice.upcoming without next_payment_attempt", {
        invoiceId: invoice.id,
      });
      return;
    }

    const chargeDate = new Date(invoice.next_payment_attempt * 1000);
    const now = new Date();
    const daysUntil = Math.ceil(
      (chargeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const hasActiveDiscount =
      (invoice.discounts && invoice.discounts.length > 0) ||
      (invoice.total_discount_amounts &&
        invoice.total_discount_amounts.length > 0);

    let hasPaymentMethod = !!invoice.default_payment_method;

    if (!hasPaymentMethod) {
      try {
        const customer = (await stripe.customers.retrieve(
          customerId,
        )) as Stripe.Customer;
        hasPaymentMethod = !!customer.invoice_settings?.default_payment_method;
      } catch (err) {
        reportStripeWebhookError(
          "handle_invoice_upcoming_retrieve_customer",
          err,
          {
            invoiceId: invoice.id,
            customerId,
          },
        );
        console.error(
          "Error retrieving customer for payment method check:",
          err,
        );
      }
    }

    if (hasActiveDiscount && !hasPaymentMethod) {
      console.log(
        `🎫 Discount expiring scenario for ${user.email}: discount active but no payment method`,
      );
      console.log(`   Days until charge: ${daysUntil}`);

      const reminderDays = [30, 14, 7, 3];
      if (!reminderDays.includes(daysUntil)) {
        console.log(
          `   Not a reminder day (${daysUntil} days), skipping discount expiration email`,
        );
        return;
      }

      const totalDiscountAmount = Array.isArray(invoice.total_discount_amounts)
        ? invoice.total_discount_amounts.reduce(
          (sum: number, item: { amount?: number } | null) =>
            sum + (typeof item?.amount === "number" ? item.amount : 0),
          0,
        )
        : 0;

      const discountPercent = typeof invoice.subtotal === "number" &&
          invoice.subtotal > 0 &&
          totalDiscountAmount > 0
        ? Math.round((totalDiscountAmount / invoice.subtotal) * 100)
        : 0;

      const emailTemplate = discountExpiringTemplate({
        name: user.full_name || "there",
        discountPercent,
        daysUntil,
        expiryDate: chargeDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      });

      enqueueUserEmail(user.email, user.full_name || "", emailTemplate);
      console.log(
        `✅ Discount expiration reminder queued for ${user.email} (${daysUntil} days before expiry)`,
      );
      return;
    }

    console.log(
      `Upcoming invoice for ${user.email}, charging in ${daysUntil} days`,
    );
    console.log(
      `Amount: ${
        (invoice.amount_due / 100).toFixed(
          2,
        )
      } ${invoice.currency.toUpperCase()}`,
    );

    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (!userData) {
      console.error("Could not fetch user data for renewal reminder email");
      return;
    }

    const name = userData.full_name || "there";

    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromPrice(invoice.lines.data[0]?.price)
      : null;
    const planName = await getPlanNameFromProductId(productId);

    const emailTemplate = invoiceUpcomingTemplate({
      name,
      planName,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      chargeDate: chargeDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      daysUntil: daysUntil,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      updatePaymentUrl:
        `${DASHBOARD_URL}/dashboard/user-settings/membership?tab=payment`,
    });

    enqueueUserEmail(userData.email, name, emailTemplate);
    console.log(`Renewal reminder email queued for ${userData.email}`);
  } catch (error: any) {
    reportStripeWebhookError("handle_invoice_upcoming", error, {
      invoiceId: invoice.id,
    });
    console.error("Error in handleInvoiceUpcoming:", {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for payment method attached (confirmation email)
async function handlePaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing payment method attached:", paymentMethod.id);

    const customerId = typeof paymentMethod.customer === "string"
      ? paymentMethod.customer
      : paymentMethod.customer?.id;

    if (!customerId) {
      console.error("No customer ID in payment method:", paymentMethod.id);
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      return;
    }

    // Send payment method updated confirmation
    console.log(
      `Payment method ${paymentMethod.id} attached for ${user.email}`,
    );
    if (paymentMethod.card) {
      console.log(
        `Card: ${paymentMethod.card.brand} ending in ${paymentMethod.card.last4}`,
      );
    }

    // Get user data for personalized email
    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (!userData) {
      console.error(
        "Could not fetch user data for payment method confirmation email",
      );
      return;
    }

    const name = userData.full_name || "there";

    // Build payment method details
    let paymentMethodType = "Payment method";
    let paymentMethodDetails = "";

    if (paymentMethod.card) {
      paymentMethodType = "Card";
      paymentMethodDetails = `${
        paymentMethod.card.brand.charAt(0).toUpperCase() +
        paymentMethod.card.brand.slice(1)
      } ending in ${paymentMethod.card.last4}`;
    } else if (paymentMethod.type) {
      paymentMethodType = paymentMethod.type.charAt(0).toUpperCase() +
        paymentMethod.type.slice(1);
    }

    const emailTemplate = paymentMethodUpdatedTemplate({
      name,
      paymentMethodType,
      paymentMethodDetails,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
    });

    enqueueUserEmail(userData.email, name, emailTemplate);
    console.log(
      `Payment method confirmation email queued for ${userData.email}`,
    );
  } catch (error: any) {
    reportStripeWebhookError("handle_payment_method_attached", error, {
      paymentMethodId: paymentMethod.id,
    });
    console.error("Error in handlePaymentMethodAttached:", {
      paymentMethodId: paymentMethod.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for subscription pending update applied (subscription schedules)
async function handleSubscriptionPendingUpdateApplied(
  subscription: Stripe.Subscription,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing pending update applied:", subscription.id);

    // Extract customer ID
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      return;
    }

    // Find user
    const user = await getUserByCustomerId(customerId);
    if (!user) {
      console.error("No user found with customer ID:", customerId);
      return;
    }

    // Extract new plan from metadata
    const plan = (subscription.metadata?.plan || "plus") as PlanType;
    const billingInterval = (subscription.metadata?.billing_interval ||
      "monthly") as BillingInterval;

    // Get previous plan for change type detection
    const { data: previousSub } = await supabase
      .from("subscriptions")
      .select("plan, billing_interval")
      .eq("user_id", user.id)
      .maybeSingle();

    const previousPlan = previousSub?.plan as PlanType | null;
    const previousInterval = previousSub?.billing_interval as
      | BillingInterval
      | null;

    // Clear pending fields - the scheduled change has been applied
    await supabase
      .from("subscriptions")
      .update({
        plan,
        billing_interval: billingInterval,
        pending_plan: null,
        pending_interval: null,
        pending_effective_date: null,
        last_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    console.log("Scheduled subscription change applied for user:", user.id);

    // Send email notification
    const itemPeriodEnd = subscription.items?.data?.[0]?.current_period_end;

    // Determine the actual change type
    const changeType = previousPlan
      ? getChangeType(
        previousPlan,
        plan,
        previousInterval || undefined,
        billingInterval,
      )
      : "renewal";

    const templateChangeType = changeType === "upgraded"
      ? "upgrade"
      : changeType === "downgraded"
      ? "downgrade"
      : changeType === "interval_changed"
      ? "interval_changed"
      : "renewal";

    const emailTemplate = subscriptionUpdatedTemplate({
      name: user.full_name || "",
      planName: plan.charAt(0).toUpperCase() + plan.slice(1),
      endDate: itemPeriodEnd && !isNaN(itemPeriodEnd)
        ? new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(itemPeriodEnd * 1000))
        : "N/A",
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      changeType: templateChangeType,
    });

    enqueueUserEmail(user.email, user.full_name || "", emailTemplate);
    console.log(`Scheduled change notification queued for ${user.email}`);
  } catch (error: any) {
    reportStripeWebhookError(
      "handle_subscription_pending_update_applied",
      error,
      {
        subscriptionId: subscription.id,
        eventId,
      },
    );
    console.error("Error in handleSubscriptionPendingUpdateApplied:", {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for subscription pending update expired (scheduled change cancelled)
async function handleSubscriptionPendingUpdateExpired(
  subscription: Stripe.Subscription,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing pending update expired:", subscription.id);

    // Extract customer ID
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      return;
    }

    // Find user
    const user = await getUserByCustomerId(customerId);
    if (!user) {
      console.error("No user found with customer ID:", customerId);
      return;
    }

    // Clear pending fields - the scheduled change was cancelled or expired
    await supabase
      .from("subscriptions")
      .update({
        pending_plan: null,
        pending_interval: null,
        pending_effective_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    console.log("Scheduled subscription change expired for user:", user.id);
  } catch (error: any) {
    reportStripeWebhookError(
      "handle_subscription_pending_update_expired",
      error,
      {
        subscriptionId: subscription.id,
      },
    );
    console.error("Error in handleSubscriptionPendingUpdateExpired:", {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for setup_intent.succeeded (payment method successfully added)
async function handleSetupIntentSucceeded(
  setupIntent: Stripe.SetupIntent,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing setup intent succeeded:", setupIntent.id);

    const customerId = typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id;

    if (!customerId) {
      console.error("No customer ID in setup intent:", setupIntent.id);
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      return;
    }

    // Get the payment method that was attached
    const paymentMethodId = typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      console.error("No payment method in setup intent:", setupIntent.id);
      return;
    }

    // Retrieve payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    console.log(
      `Payment method ${paymentMethodId} successfully set up for ${user.email}`,
    );

    // Check if this is the first payment method for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    // If this is the first payment method, set it as default automatically
    if (paymentMethods.data.length === 1) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Also update subscription if exists
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subscription?.stripe_subscription_id) {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          default_payment_method: paymentMethodId,
        });
      }

      console.log(
        `Set ${paymentMethodId} as default payment method for customer ${customerId}`,
      );
    }

    // Log successful setup in our database (optional)
    console.log(
      `Setup intent ${setupIntent.id} completed successfully for user ${user.id}`,
    );
  } catch (error: any) {
    reportStripeWebhookError("handle_setup_intent_succeeded", error, {
      setupIntentId: setupIntent.id,
    });
    console.error("Error in handleSetupIntentSucceeded:", {
      setupIntentId: setupIntent.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Handler for setup_intent.setup_failed (payment method failed to be added)
async function handleSetupIntentFailed(
  setupIntent: Stripe.SetupIntent,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing setup intent failed:", setupIntent.id);

    const customerId = typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id;

    if (!customerId) {
      console.error("No customer ID in setup intent:", setupIntent.id);
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      return;
    }

    // Log the failure reason
    const lastSetupError = setupIntent.last_setup_error;
    console.error(`Setup intent failed for ${user.email}:`, {
      code: lastSetupError?.code,
      message: lastSetupError?.message,
      type: lastSetupError?.type,
    });

    // Optionally send email notification to user about the failure
    // (Not implementing here to avoid spam, but could be useful)
  } catch (error: any) {
    reportStripeWebhookError("handle_setup_intent_failed", error, {
      setupIntentId: setupIntent.id,
    });
    console.error("Error in handleSetupIntentFailed:", {
      setupIntentId: setupIntent.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
