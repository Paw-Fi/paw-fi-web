import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { corsHeaders } from "../shared/cors.ts";
import { sendUserEmail } from "../shared/email-service.ts";
import { referralAcceptedTemplate } from "../shared/email-templates.ts";
import {
  discountExpiringTemplate,
  invoiceFinalizedTemplate,
  invoiceLocationRequiredTemplate,
  invoicePaymentSucceededTemplate,
  invoiceUpcomingTemplate,
  paymentActionRequiredTemplate,
  paymentFailedTemplate,
  paymentMethodUpdatedTemplate,
  refundFailedTemplate,
  refundProcessedTemplate,
  subscriptionCanceledTemplate,
  subscriptionCreatedTemplate,
  subscriptionPausedTemplate,
  subscriptionResumedTemplate,
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
import {
  getPlanFromPriceId,
  resolveInvoicePlanFromLinePrices,
  resolveSubscriptionPlanFromPrice,
} from "../shared/stripe-subscription-prices.ts";
import { resolveStripeCurrentPeriodEnd } from "../shared/stripe-subscription-period.ts";
import { resolveStripeSubscriptionUserCandidate } from "../shared/stripe-subscription-user.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  allowZeroAmountLifetimeGrants,
  isPositiveStripeAmount,
} from "../shared/lifetime-grant-policy.ts";
import { decideSubscriptionEntitlementMutation } from "../shared/subscription-entitlement-policy.ts";

interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

interface QueuedEmail {
  email: string;
  name: string;
  template: EmailTemplate;
  idempotencyKey: string;
}

type EnqueueUserEmail = (
  email: string,
  name: string,
  template: EmailTemplate,
  idempotencyKey?: string,
) => void;

async function flushQueuedEmails(emails: QueuedEmail[]): Promise<void> {
  for (const item of emails) {
    try {
      const result = await sendUserEmail(
        item.email,
        item.name,
        item.template,
        item.idempotencyKey,
      );
      if (!result?.success) {
        throw new Error(result?.error || "Email provider rejected the email");
      }
    } catch (error) {
      reportStripeWebhookError("flush_queued_emails", error, {
        email: item.email,
      });
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Failed to send queued email:", {
        email: item.email,
        error: msg,
      });
      throw error;
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

const ACCESS_GRANTING_STATUSES = new Set<string>([
  "active",
  "trialing",
  "past_due",
]);
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
      throw new Error(
        `failed to cascade subscription downgrade: ${cascadeError.message}`,
      );
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
    throw error;
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
): Promise<void> {
  const report = reportEdgeFunctionError({
    functionName: "stripe-webhook",
    error,
    context: {
      phase,
      ...context,
    },
  });
  const edgeRuntime = (
    globalThis as unknown as {
      EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
    }
  ).EdgeRuntime;
  if (typeof edgeRuntime?.waitUntil === "function") {
    edgeRuntime.waitUntil(report);
  }
  return report;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const invoiceSubscription = (invoice as any).subscription;
  const parentSubscription = (invoice as any).parent?.subscription_details
    ?.subscription;
  const subscription = invoiceSubscription ?? parentSubscription;

  if (typeof subscription === "string") return subscription;
  return subscription?.id ?? null;
}

async function getInvoicePaymentIntentId(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const directPaymentIntent = (invoice as any).payment_intent;
  if (directPaymentIntent) {
    return typeof directPaymentIntent === "string"
      ? directPaymentIntent
      : (directPaymentIntent.id ?? null);
  }

  const latestInvoice = await stripe.invoices.retrieve(invoice.id, {
    expand: ["payments.data.payment.payment_intent"],
  });
  const payments = (latestInvoice as any).payments?.data || [];
  const payment = payments.find((item: any) => item.is_default) ?? payments[0];
  const paymentIntent = payment?.payment?.payment_intent;

  if (!paymentIntent) return null;
  return typeof paymentIntent === "string"
    ? paymentIntent
    : (paymentIntent.id ?? null);
}

serve(async (req) => {
  const startTime = Date.now();
  const queuedEmails: QueuedEmail[] = [];
  let webhookEventId = "unknown";
  const enqueueUserEmail: EnqueueUserEmail = (
    email,
    name,
    template,
    idempotencyKey,
  ) => {
    queuedEmails.push({
      email,
      name,
      template,
      idempotencyKey: idempotencyKey ||
        `${webhookEventId}:${queuedEmails.length}`,
    });
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
    webhookEventId = event.id;
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
        case "checkout.session.expired":
          await handleCheckoutSessionExpired(
            event.data.object as Stripe.Checkout.Session,
          );
          break;
        case "charge.refunded":
          await handleChargeRefunded(
            event.data.object as Stripe.Charge,
            event.id,
          );
          break;
        case "refund.created": {
          const refund = event.data.object as Stripe.Refund;
          await handleRefundCreatedOrUpdated(
            refund,
            event.id,
            enqueueUserEmail,
            (refund as any).status === "succeeded",
          );
          break;
        }
        case "refund.updated":
        case "charge.refund.updated": {
          const refund = event.data.object as Stripe.Refund;
          const previousStatus = (event.data.previous_attributes as any)
            ?.status;
          await handleRefundCreatedOrUpdated(
            refund,
            event.id,
            enqueueUserEmail,
            (refund as any).status === "succeeded" &&
              previousStatus !== undefined &&
              previousStatus !== "succeeded",
          );
          break;
        }
        case "refund.failed":
          await handleRefundCreatedOrUpdated(
            event.data.object as Stripe.Refund,
            event.id,
            enqueueUserEmail,
            false,
          );
          break;
        case "charge.dispute.created":
        case "charge.dispute.closed":
        case "charge.dispute.funds_withdrawn":
        case "charge.dispute.funds_reinstated":
          await handleChargeDispute(
            event.data.object as Stripe.Dispute,
            event.type,
          );
          break;
        case "payment_intent.succeeded":
          // Handle successful one-time payments (lifetime) as additional verification
          await handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
            event.id,
          );
          break;
        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
            enqueueUserEmail,
          );
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.paused":
        case "customer.subscription.resumed":
          await handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
            event.id,
            enqueueUserEmail,
            undefined,
            event.type,
            (event.data.previous_attributes as Record<string, any>) || {},
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
        case "invoice.paid":
          // invoice.payment_succeeded is the canonical receipt event for this
          // automatic-card integration. Handling both sends two snapshots of
          // the same invoice through one Resend idempotency key.
          console.log(
            "Ignoring invoice.paid; receipt handled by invoice.payment_succeeded",
            { invoiceId: (event.data.object as Stripe.Invoice).id },
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
            event.id,
            enqueueUserEmail,
          );
          break;
        case "invoice.payment_action_required":
          await handleInvoicePaymentActionRequired(
            event.data.object as Stripe.Invoice,
            enqueueUserEmail,
          );
          break;
        case "invoice.finalization_failed":
          await handleInvoiceFinalizationFailed(
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
        case "subscription_schedule.aborted":
        case "subscription_schedule.canceled":
        case "subscription_schedule.completed":
        case "subscription_schedule.released":
          await handleTerminalSubscriptionSchedule(
            event.data.object as Stripe.SubscriptionSchedule,
            event.type,
          );
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Email delivery must complete before the event is marked processed.
      // Resend idempotency keys make Stripe retries safe if delivery fails.
      await flushQueuedEmails(queuedEmails);

      // Mark event as processed with processing time
      const processingTime = Date.now() - startTime;
      const markedProcessed = await markWebhookEventProcessed(
        supabase,
        event.id,
        event.type,
        {
          processing_time_ms: processingTime,
        },
      );
      if (!markedProcessed) {
        throw new Error(`Failed to record webhook event ${event.id}`);
      }

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
      await reportStripeWebhookError("process_webhook_event", error, {
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
    await reportStripeWebhookError("serve_handler", error);
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
async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
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
    if (plan !== "lifetime" || !isUuid(userId)) {
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

    await revokeLifetimeAccess({
      userId,
      eventId,
      paymentIntentId,
    });
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

async function handleChargeDispute(
  dispute: Stripe.Dispute,
  eventType: string,
): Promise<void> {
  await reportStripeWebhookError(
    "handle_charge_dispute",
    new Error(
      `Stripe dispute lifecycle event requires attention: ${eventType}`,
    ),
    {
      eventType,
      disputeId: dispute.id,
      chargeId: typeof dispute.charge === "string"
        ? dispute.charge
        : dispute.charge?.id,
      status: dispute.status,
      amount: dispute.amount,
      currency: dispute.currency,
    },
  );
}

async function revokeLifetimeAccess(params: {
  userId: string;
  eventId: string;
  paymentIntentId: string;
}): Promise<void> {
  const { userId, eventId, paymentIntentId } = params;

  const { data: revoked, error: revocationError } = await supabase.rpc(
    "revoke_lifetime_entitlement_v1",
    {
      p_user_id: userId,
      p_source: "stripe",
      p_source_id: paymentIntentId,
      p_event_id: eventId,
    },
  );

  if (revocationError) {
    throw new Error(
      `failed to source-verify Lifetime refund: ${revocationError.message}`,
    );
  }

  if (revoked !== true) {
    console.log(
      "Skipping Stripe Lifetime refund because it does not own the current Lifetime entitlement",
      {
        userId: redactUserId(userId),
        paymentIntentId,
      },
    );
    return;
  }

  // The source verification RPC atomically cascades cancellation to borrowed
  // household entitlements before it commits.
}

async function handleRefundCreatedOrUpdated(
  refund: Stripe.Refund,
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
  shouldSendConfirmation: boolean,
): Promise<void> {
  refund = await stripe.refunds.retrieve(refund.id);
  const refundStatus = (refund as any).status;
  if (refundStatus === "failed" || refundStatus === "canceled") {
    const failureReason = (refund as any).failure_reason || null;
    await reportStripeWebhookError(
      "handle_refund_failed",
      new Error(`Stripe refund ${refundStatus} and requires attention`),
      {
        refundId: refund.id,
        refundStatus,
        failureReason,
      },
    );

    const refundCustomer = (refund as any).customer;
    const customerId = typeof refundCustomer === "string"
      ? refundCustomer
      : refundCustomer?.id;
    if (!customerId) {
      await reportStripeWebhookError(
        "handle_refund_failed_missing_customer",
        new Error("Failed Stripe refund is missing its customer ID"),
        { refundId: refund.id, refundStatus },
      );
      return;
    }

    const user = await getUserByCustomerId(customerId);
    if (!user?.email) {
      await reportStripeWebhookError(
        "handle_refund_failed_missing_user",
        new Error("No user mapping or email found for failed Stripe refund"),
        { customerId, refundId: refund.id, refundStatus },
      );
      return;
    }

    const accessRestored = await restoreLifetimeAccessAfterFailedRefund({
      refund,
      eventId,
      customerId,
      userId: user.id,
    });

    const name = user.full_name || "";
    const emailTemplate = refundFailedTemplate({
      name,
      amount: refund.amount / 100,
      currency: refund.currency.toUpperCase(),
      failureReason,
      accessRestored,
    });
    enqueueUserEmail(
      user.email,
      name,
      emailTemplate,
      `refund_failed:${refund.id}`,
    );
    return;
  }

  if (shouldSendConfirmation) {
    const refundCustomer = (refund as any).customer;
    const customerId = typeof refundCustomer === "string"
      ? refundCustomer
      : refundCustomer?.id;

    if (!customerId) {
      const error = new Error(
        "Created Stripe refund is missing its customer ID",
      );
      reportStripeWebhookError(
        "handle_refund_created_missing_customer",
        error,
        {
          refundId: refund.id,
        },
      );
      throw error;
    }

    const user = await getUserByCustomerId(customerId);
    if (!user?.email) {
      const error = new Error(
        "No user mapping or email found for created Stripe refund",
      );
      reportStripeWebhookError("handle_refund_created_missing_user", error, {
        customerId,
        refundId: refund.id,
      });
      throw error;
    }

    const name = user.full_name || "";
    const emailTemplate = refundProcessedTemplate({
      name,
      amount: refund.amount / 100,
      currency: refund.currency.toUpperCase(),
    });
    enqueueUserEmail(
      user.email,
      name,
      emailTemplate,
      `refund_processed:${refund.id}`,
    );
  }

  // Pending refunds should notify the customer once, but must not revoke access.
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

  if (plan !== "lifetime" || !isUuid(userId)) {
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

  await revokeLifetimeAccess({
    userId,
    eventId,
    paymentIntentId,
  });
}

async function restoreLifetimeAccessAfterFailedRefund(params: {
  refund: Stripe.Refund;
  eventId: string;
  customerId: string;
  userId: string;
}): Promise<boolean> {
  const paymentIntentId =
    typeof (params.refund as any).payment_intent === "string"
      ? (params.refund as any).payment_intent
      : (params.refund as any).payment_intent?.id;
  const chargeId = typeof params.refund.charge === "string"
    ? params.refund.charge
    : params.refund.charge?.id;
  if (!paymentIntentId || !chargeId) return false;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paymentUserId = paymentIntent.metadata?.user_id ||
    paymentIntent.metadata?.userId;
  if (paymentIntent.metadata?.plan !== "lifetime") return false;

  if (isUuid(paymentUserId) && paymentUserId !== params.userId) {
    await reportStripeWebhookError(
      "restore_lifetime_after_failed_refund_user_conflict",
      new Error(
        "Failed Lifetime refund user metadata conflicts with customer mapping",
      ),
      {
        refundId: params.refund.id,
        customerId: params.customerId,
        mappedUserId: params.userId,
        metadataUserId: paymentUserId,
      },
    );
    return false;
  }

  const charge = await stripe.charges.retrieve(chargeId);
  const chargeStillFullyRefunded = charge.refunded === true ||
    (typeof charge.amount_refunded === "number" &&
      typeof charge.amount === "number" &&
      charge.amount_refunded >= charge.amount);
  if (chargeStillFullyRefunded) return false;

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("plan, status, provider, lifetime_source, lifetime_source_id")
    .eq("user_id", params.userId)
    .maybeSingle();
  if (existingError) {
    throw new Error(`subscriptions lookup failed: ${existingError.message}`);
  }

  if (
    existing?.plan !== "free" ||
    existing?.status !== "canceled" ||
    existing?.provider !== "stripe" ||
    existing?.lifetime_source !== "stripe" ||
    existing?.lifetime_source_id !== paymentIntentId
  ) {
    return false;
  }

  const { error: restoreError } = await supabase
    .from("subscriptions")
    .upsert(
      createLifetimeSubscriptionPayload(
        params.userId,
        params.customerId,
        params.eventId,
        paymentIntentId,
      ),
      { onConflict: "user_id", ignoreDuplicates: false },
    );
  if (restoreError) {
    throw new Error(
      `failed to restore Lifetime access after refund failure: ${restoreError.message}`,
    );
  }

  const { error: cascadeError } = await supabase.rpc(
    "cascade_subscription_upgrade",
    {
      p_owner_user_id: params.userId,
      p_new_plan: "lifetime",
      p_new_status: "active",
    },
  );
  if (cascadeError) {
    throw new Error(
      `failed to cascade restored Lifetime access: ${cascadeError.message}`,
    );
  }

  return true;
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

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  enqueueUserEmail: EnqueueUserEmail,
): Promise<void> {
  try {
    const plan = paymentIntent.metadata?.plan;
    const userId = paymentIntent.metadata?.user_id ||
      paymentIntent.metadata?.userId;

    // Recurring invoice failures have their own canonical notification path.
    // This handler is for one-time Lifetime checkout failures only.
    if (plan !== "lifetime" || !isUuid(userId)) return;

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      throw new Error(`users lookup failed: ${userError.message}`);
    }

    if (!userData?.email) return;

    const failureReason = paymentIntent.last_payment_error?.message ||
      paymentIntent.last_payment_error?.decline_code ||
      paymentIntent.last_payment_error?.code ||
      "Your payment method was declined or could not be charged.";
    const name = userData.full_name || "";
    const membershipUrl = `${DASHBOARD_URL}/dashboard/user-settings/membership`;
    const emailTemplate = paymentFailedTemplate({
      name,
      planName: "Lifetime",
      dashboardUrl: membershipUrl,
      updatePaymentUrl: membershipUrl,
      failureReason,
    });

    enqueueUserEmail(
      userData.email,
      name,
      emailTemplate,
      `payment_intent_failed:${paymentIntent.id}`,
    );
  } catch (error) {
    reportStripeWebhookError("handle_payment_intent_failed", error, {
      paymentIntentId: paymentIntent.id,
    });
    throw error;
  }
}

// Helper function to safely extract product ID from price object
// Handles both string and expanded object formats
function getProductIdFromPrice(price: any): string | null {
  const product = price?.product ?? price?.pricing?.price_details?.product ??
    null;
  if (!product) return null;
  return typeof product === "string" ? product : product.id || null;
}

function getProductIdFromInvoiceLine(line: any): string | null {
  return getProductIdFromPrice(line?.price) || getProductIdFromPrice(line);
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

  if (mappingError) {
    throw new Error(
      `user_stripe_mapping lookup failed: ${mappingError.message}`,
    );
  }

  if (!mappingData) {
    return null;
  }

  // Get user details
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("id", mappingData.user_id)
    .maybeSingle();

  if (userError) {
    throw new Error(`users lookup failed: ${userError.message}`);
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
  if (!productId) return "Subscription";

  try {
    // Try to get product name from Stripe
    const product = await stripe.products.retrieve(productId);
    return product.name || "Subscription";
  } catch (error: any) {
    reportStripeWebhookError("get_plan_name_from_product_id", error, {
      productId,
    });
    console.error("Error getting product name:", error);
    return "Subscription";
  }
}

// Helper function to create lifetime subscription payload
// Reduces code duplication for referral system and lifetime upgrades
function createLifetimeSubscriptionPayload(
  userId: string,
  customerId: string | null | undefined,
  eventId: string,
  lifetimeSourceId: string,
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
    lifetime_source: "stripe" as const,
    lifetime_source_id: lifetimeSourceId,
    last_event_id: eventId,
    updated_at: new Date().toISOString(),
  };
}

async function cancelSubscriptionBeforeLifetimeGrant(params: {
  subscriptionId: string;
  userId: string;
  sessionId: string;
}): Promise<void> {
  try {
    await stripe.subscriptions.cancel(params.subscriptionId, {
      prorate: false,
    });
    return;
  } catch (cancelError) {
    try {
      const existingSubscription = await stripe.subscriptions.retrieve(
        params.subscriptionId,
      );
      if (isTerminalDowngradeStatus(existingSubscription.status)) return;
    } catch (retrieveError) {
      reportStripeWebhookError(
        "handle_checkout_session_completed_retrieve_old_subscription",
        retrieveError,
        params,
      );
    }

    reportStripeWebhookError(
      "handle_checkout_session_completed_cancel_old_subscription",
      cancelError,
      params,
    );
    throw new Error(
      `failed to cancel old subscription ${params.subscriptionId} before lifetime grant`,
    );
  }
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
  sourceEventType?: string,
  previousAttributes: Record<string, any> = {},
) {
  try {
    console.log("Processing subscription update:", subscription.id);

    try {
      subscription = await stripe.subscriptions.retrieve(subscription.id);
    } catch (retrieveError: any) {
      if (retrieveError?.code === "resource_missing") {
        console.log(
          "Skipping subscription snapshot because the subscription no longer exists",
          { subscriptionId: subscription.id, eventId },
        );
        return;
      }
      throw retrieveError;
    }

    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      reportStripeWebhookError(
        "handle_subscription_updated_missing_customer",
        new Error("Stripe subscription is missing its customer ID"),
        { subscriptionId: subscription.id },
      );
      return;
    }

    const user = await getUserForStripeSubscription(subscription, customerId);
    if (!user) {
      console.error("No user found for subscription customer:", {
        customerId,
        subscriptionId: subscription.id,
      });
      reportStripeWebhookError(
        "handle_subscription_updated_missing_user",
        new Error("No user mapping found for Stripe subscription customer"),
        { customerId, subscriptionId: subscription.id },
      );
      return;
    }

    const userId = user.id;
    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;

    const { data: previousSub, error: previousSubError } = await supabase
      .from("subscriptions")
      .select(
        "provider, plan, billing_interval, status, stripe_subscription_id, app_store_original_transaction_id, current_price_id, cancel_at_period_end, current_period_end, ended_at, last_event_id, pending_plan, pending_interval, pending_effective_date",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (previousSubError) {
      throw new Error(
        `subscriptions lookup failed: ${previousSubError.message}`,
      );
    }

    if (
      previousSub?.plan === "lifetime" &&
      previousSub.status === "active" &&
      previousSub.stripe_subscription_id !== subscription.id
    ) {
      console.log(
        "Ignoring recurring subscription event for active Lifetime user",
        {
          userId: redactUserId(userId),
          incomingSubscriptionId: subscription.id,
        },
      );
      return;
    }

    const entitlementDecision = decideSubscriptionEntitlementMutation(
      previousSub
        ? {
          provider: previousSub.provider,
          plan: previousSub.plan,
          status: previousSub.status,
          stripeSubscriptionId: previousSub.stripe_subscription_id,
          appStoreOriginalTransactionId:
            previousSub.app_store_original_transaction_id,
        }
        : null,
      {
        provider: "stripe",
        plan: "plus",
        status,
        stripeSubscriptionId: subscription.id,
      },
    );
    if (entitlementDecision.kind === "preserve") {
      console.log(
        "Ignoring Stripe lifecycle event that does not own the current entitlement",
        {
          userId: redactUserId(userId),
          subscriptionId: subscription.id,
          reason: entitlementDecision.reason,
          existingProvider: previousSub?.provider ?? null,
          existingPlan: previousSub?.plan ?? null,
          incomingStatus: status,
        },
      );
      return;
    }

    const previousStoredStatus = previousSub?.status || "";
    const previousPlan = previousSub?.plan as PlanType | null;
    const previousInterval = previousSub?.billing_interval as
      | BillingInterval
      | null;
    const previousCurrentPriceId = previousSub?.current_price_id as
      | string
      | null;

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
        (previousSub?.status !== "canceled" &&
          previousSub?.status !== "unpaid") ||
        previousSub?.last_event_id === eventId
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

        enqueueUserEmail(
          user.email,
          user.full_name || "",
          emailTemplate,
          `subscription_terminal:${eventId}`,
        );
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

    const storedStatus = mapStripeStatusToStoredStatus(status);
    let pricePlanInfo = resolveSubscriptionPlanFromPrice(subscription);
    if (
      !pricePlanInfo ||
      pricePlanInfo.plan === "lifetime" ||
      !pricePlanInfo.interval
    ) {
      const historicalPlan = previousPlan;
      const historicalInterval = previousInterval;
      const subscriptionPriceId = subscription.items?.data?.[0]?.price?.id ??
        null;
      if (
        previousSub?.stripe_subscription_id === subscription.id &&
        previousCurrentPriceId &&
        subscriptionPriceId === previousCurrentPriceId &&
        historicalPlan &&
        historicalPlan !== "free" &&
        historicalPlan !== "lifetime" &&
        (historicalInterval === "monthly" || historicalInterval === "yearly")
      ) {
        console.warn(
          "Preserving existing recurring plan for subscription with historical Stripe price",
          {
            userId: redactUserId(userId),
            subscriptionId: subscription.id,
            priceId: subscriptionPriceId,
            plan: historicalPlan,
            billingInterval: historicalInterval,
          },
        );
        pricePlanInfo = {
          plan: historicalPlan,
          interval: historicalInterval,
        };
      } else {
        throw new Error(
          `Unknown Stripe price for recurring subscription ${subscription.id}`,
        );
      }
    }
    const finalPlan = pricePlanInfo.plan;
    const finalInterval = pricePlanInfo.interval as BillingInterval;
    const pendingChangeApplied = previousSub?.pending_plan === finalPlan &&
      previousSub?.pending_interval === finalInterval;

    const trialStart = typeof subscription.trial_start === "number" &&
        !Number.isNaN(subscription.trial_start)
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null;
    const trialEnd = typeof subscription.trial_end === "number" &&
        !Number.isNaN(subscription.trial_end)
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    let periodResolution = resolveStripeCurrentPeriodEnd({
      subscription,
      invoice: relatedInvoice,
      status,
      plan: finalPlan,
    });

    if (
      periodResolution.source === "missing" &&
      isAccessGrantingStatus(storedStatus)
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
      isAccessGrantingStatus(storedStatus)
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
          ...(pendingChangeApplied
            ? {
              pending_plan: null,
              pending_interval: null,
              pending_effective_date: null,
            }
            : {}),
          previous_plan: previousPlan,
          previous_interval: previousInterval,
          ended_at: null,
          last_event_id: eventId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (subscriptionError) {
      throw new Error(
        `failed to update subscription ${subscription.id}: ${subscriptionError.message}`,
      );
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
        throw new Error(
          `failed to cascade subscription update: ${cascadeError.message}`,
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
      throw error;
    }

    const productId = subscription.items?.data?.length > 0
      ? getProductIdFromPrice(subscription.items.data[0]?.price)
      : null;
    const planName = await getPlanNameFromProductId(productId);
    const endDate = formatUnixTimestampDate(subscriptionPeriodEnd) || "N/A";
    const name = user.full_name || "";
    const hasAccessNow = isAccessGrantingStatus(storedStatus);
    const hadAccessBefore = isAccessGrantingStatus(previousSub?.status || "");
    const isCustomerSubscriptionEvent =
      sourceEventType?.startsWith("customer.subscription.") === true;
    const previousStripeStatus = previousAttributes.status;
    const previousStripeHadAccess = typeof previousStripeStatus === "string" &&
      isAccessGrantingStatus(previousStripeStatus);

    if (
      isCustomerSubscriptionEvent &&
      storedStatus === "paused" &&
      (sourceEventType === "customer.subscription.paused" ||
        previousStripeHadAccess)
    ) {
      const emailTemplate = subscriptionPausedTemplate({ name });
      enqueueUserEmail(
        user.email,
        name,
        emailTemplate,
        `subscription_paused:${subscription.id}`,
      );
      return;
    }

    if (
      isCustomerSubscriptionEvent &&
      hasAccessNow &&
      (sourceEventType === "customer.subscription.resumed" ||
        previousStripeStatus === "paused")
    ) {
      const emailTemplate = subscriptionResumedTemplate({ name });
      enqueueUserEmail(
        user.email,
        name,
        emailTemplate,
        `subscription_resumed:${subscription.id}:${
          subscriptionPeriodEnd ?? "unknown"
        }`,
      );
      return;
    }

    const isNew = isCustomerSubscriptionEvent &&
      hasAccessNow &&
      (sourceEventType === "customer.subscription.created" ||
        (sourceEventType === "customer.subscription.updated" &&
          (!hadAccessBefore ||
            (typeof previousStripeStatus === "string" &&
              !previousStripeHadAccess))));

    if (isNew) {
      const emailTemplate = subscriptionCreatedTemplate({
        name,
        planName,
        endDate,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        isLifetime: false,
      });

      enqueueUserEmail(
        user.email,
        name,
        emailTemplate,
        `subscription_created:${subscription.id}`,
      );
      console.log(`Welcome email queued for ${user.email}`);
      return;
    }

    if (
      hasAccessNow &&
      isCustomerSubscriptionEvent &&
      cancelAtPeriodEnd &&
      (!previousSub?.cancel_at_period_end ||
        previousAttributes.cancel_at_period_end === false)
    ) {
      const emailTemplate = subscriptionCanceledTemplate({
        name,
        planName,
        endDate,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        immediateCancel: false,
      });

      enqueueUserEmail(
        user.email,
        name,
        emailTemplate,
        `subscription_cancellation_scheduled:${eventId}`,
      );
      console.log(`Scheduled cancellation email queued for ${user.email}`);
      return;
    }

    const previousEventPlanInfo = resolveSubscriptionPlanFromPrice({
      items: previousAttributes.items,
    });
    const emailPreviousPlan =
      previousPlan !== finalPlan || previousInterval !== finalInterval
        ? previousPlan
        : previousEventPlanInfo?.plan || previousPlan;
    const emailPreviousInterval =
      previousPlan !== finalPlan || previousInterval !== finalInterval
        ? previousInterval
        : previousEventPlanInfo?.interval || previousInterval;

    if (
      hasAccessNow &&
      isCustomerSubscriptionEvent &&
      emailPreviousPlan &&
      (emailPreviousPlan !== finalPlan ||
        emailPreviousInterval !== finalInterval)
    ) {
      const changeType = getChangeType(
        emailPreviousPlan,
        finalPlan,
        emailPreviousInterval || undefined,
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

      enqueueUserEmail(
        user.email,
        name,
        emailTemplate,
        `subscription_change_applied:${subscription.id}:${finalPlan}:${finalInterval}:${
          previousSub?.current_period_end ?? subscriptionPeriodEnd ?? "unknown"
        }`,
      );
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
      reportStripeWebhookError(
        "handle_subscription_deleted_missing_customer",
        new Error("Stripe subscription deletion is missing its customer ID"),
        { subscriptionId: subscription.id },
      );
      return;
    }

    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, plan, status, last_event_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (subError) {
      throw new Error(`subscriptions lookup failed: ${subError.message}`);
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
    const wasAlreadyTerminal = isTerminalDowngradeStatus(subData.status);
    const wasHandledByThisEvent = subData.last_event_id === eventId;

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

    if (wasAlreadyTerminal && !wasHandledByThisEvent) {
      console.log(
        "Subscription deletion already handled by a terminal billing event",
        { subscriptionId: subscription.id },
      );
      return;
    }

    console.log("User downgraded to free plan:", userId);

    const { data: affectedUser, error: affectedUserError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (affectedUserError) {
      throw new Error(`users lookup failed: ${affectedUserError.message}`);
    }

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

    enqueueUserEmail(
      affectedUser.email,
      name,
      emailTemplate,
      `subscription_canceled:${subscription.id}`,
    );
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
    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (subscriptionId) {
      // Get the subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update subscription in our database
      await handleSubscriptionUpdated(
        subscription,
        eventId,
        enqueueUserEmail,
        invoice,
        "invoice.payment_succeeded",
      );

      // SEND INVOICE RECEIPT EMAIL WITH PDF
      // Get customer ID safely
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

      if (!customerId) {
        console.error("No customer ID in invoice:", invoice.id);
        reportStripeWebhookError(
          "handle_invoice_payment_succeeded_missing_customer",
          new Error("Stripe invoice is missing its customer ID"),
          { invoiceId: invoice.id },
        );
        return;
      }

      // Get user details
      const user = await getUserByCustomerId(customerId);

      if (!user) {
        console.error("No user found for customer:", customerId);
        reportStripeWebhookError(
          "handle_invoice_payment_succeeded_missing_user",
          new Error("No user mapping found for Stripe invoice customer"),
          { customerId, invoiceId: invoice.id },
        );
        return;
      }

      // Get plan name from invoice line items - use safe extraction
      const productId = invoice.lines?.data?.length > 0
        ? getProductIdFromInvoiceLine(invoice.lines.data[0])
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
        isRenewal: invoice.billing_reason === "subscription_cycle",
      });

      enqueueUserEmail(
        user.email,
        user.full_name || "",
        emailTemplate,
        `invoice_payment_succeeded:${invoice.id}`,
      );
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

      // Try to determine plan and user. Lifetime grants must be proven by the
      // paid line item price, never by mutable metadata alone.
      const paymentIntentId = await getInvoicePaymentIntentId(invoice);

      const linePricePlanInfo = resolveInvoicePlanFromLinePrices(invoice);
      let determinedPlan: PlanType | null = linePricePlanInfo?.plan ?? null;
      let metadataUserId: string | null = null;

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId,
          );
          const piPlan = paymentIntent.metadata?.plan as PlanType | undefined;
          const piUserId = paymentIntent.metadata?.user_id as
            | string
            | undefined;
          if (piPlan && piPlan !== "lifetime" && !determinedPlan) {
            determinedPlan = piPlan;
          }
          if (isUuid(piUserId)) metadataUserId = piUserId;
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

      // Invoice metadata fallback is context only; it cannot grant Lifetime.
      if (
        !determinedPlan &&
        (invoice as any).metadata?.plan &&
        (invoice as any).metadata.plan !== "lifetime"
      ) {
        determinedPlan = (invoice as any).metadata.plan as string as PlanType;
      }

      // Invoice metadata can corroborate customer mapping, but cannot select the entitlement user.
      if (!metadataUserId && (invoice as any).metadata) {
        const meta: any = (invoice as any).metadata;
        const invoiceMetadataUserId = meta.user_id || meta.userId;
        if (isUuid(invoiceMetadataUserId)) {
          metadataUserId = invoiceMetadataUserId;
        }
      }

      if (metadataUserId && mappedUserId && metadataUserId !== mappedUserId) {
        reportStripeWebhookError(
          "one_time_invoice_metadata_user_conflict",
          new Error(
            "Stripe invoice metadata user_id conflicts with customer mapping",
          ),
          {
            invoiceId: invoice.id,
            customerId,
            mappedUserId,
            metadataUserId,
          },
        );
        console.error(
          "Skipping one-time invoice with metadata user_id conflict",
          {
            invoiceId: invoice.id,
            mappedUserId: redactUserId(mappedUserId),
            metadataUserId: redactUserId(metadataUserId),
          },
        );
        return;
      }

      const userId = mappedUserId ?? null;

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
          "Cannot fulfill one-time invoice: user not resolved from customer mapping",
          {
            invoiceId: invoice.id,
            customerId,
          },
        );
        return;
      }

      // Only fulfill one-time Lifetime. Recurring plans must come via subscriptions
      if (determinedPlan === "lifetime") {
        if (linePricePlanInfo?.plan !== "lifetime") {
          console.error(
            "Skipping Lifetime fulfillment without configured Lifetime price",
            {
              invoiceId: invoice.id,
              customerId,
            },
          );
          return;
        }

        if (
          !isPositiveStripeAmount(invoice.amount_paid) &&
          !allowZeroAmountLifetimeGrants()
        ) {
          console.error(
            "Skipping zero-amount Lifetime invoice; enable ALLOW_ZERO_AMOUNT_LIFETIME_GRANTS to allow",
            { invoiceId: invoice.id },
          );
          return;
        }

        console.log(
          `ONE-TIME LIFETIME FULFILLMENT: user=${userId}, invoice=${invoice.id}, amount_paid=${invoice.amount_paid}`,
        );

        // Referral sidecar: attempt to complete via DB-backed acceptance.
        try {
          let processed = false;
          const paymentIntentId = await getInvoicePaymentIntentId(invoice);

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
        const { data: existingSub, error: existingSubError } = await supabase
          .from("subscriptions")
          .select(
            "plan, status, stripe_subscription_id, last_event_id, lifetime_source, lifetime_source_id",
          )
          .eq("user_id", userId)
          .maybeSingle();

        if (existingSubError) {
          throw new Error(
            `existing subscription lookup failed: ${existingSubError.message}`,
          );
        }

        const payerAlreadyLifetime = existingSub?.plan === "lifetime" &&
          existingSub?.status === "active";
        const invoiceLifetimeEventId = `invoice_${eventId}`;
        const shouldSendLifetimeWelcome = !payerAlreadyLifetime ||
          existingSub?.last_event_id === invoiceLifetimeEventId;
        if (payerAlreadyLifetime) {
          const incomingLifetimeSourceId = paymentIntentId ??
            `invoice:${invoice.id}`;
          const isSameLifetimeGrant =
            existingSub?.lifetime_source === "stripe" &&
            existingSub?.lifetime_source_id === incomingLifetimeSourceId;
          if (!isSameLifetimeGrant) {
            await reportStripeWebhookError(
              "multiple_active_lifetime_grants_detected",
              new Error(
                "Stripe invoice Lifetime grant cannot be represented alongside the current active Lifetime grant",
              ),
              {
                userId,
                invoiceId: invoice.id,
                currentLifetimeSource: existingSub?.lifetime_source ?? null,
                incomingLifetimeSource: "stripe",
              },
            );
          }
          console.log(
            `✅ User ${userId} already has active lifetime subscription`,
          );
          // Do not return here — still need to process inviter (referrer) sidecar flow
        }

        if (!payerAlreadyLifetime) {
          const oldStripeSubscriptionId = existingSub?.stripe_subscription_id;
          if (
            oldStripeSubscriptionId &&
            oldStripeSubscriptionId.startsWith("sub_")
          ) {
            await cancelSubscriptionBeforeLifetimeGrant({
              subscriptionId: oldStripeSubscriptionId,
              userId,
              sessionId: invoice.id,
            });
          }

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
            lifetime_source: "stripe",
            lifetime_source_id: paymentIntentId ?? `invoice:${invoice.id}`,
            last_event_id: invoiceLifetimeEventId,
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
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (userError) {
          throw new Error(`users lookup failed: ${userError.message}`);
        }

        if (userData?.email && shouldSendLifetimeWelcome) {
          const emailTemplate = subscriptionCreatedTemplate({
            name: userData.full_name || "",
            planName: "Lifetime",
            dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
            isLifetime: true,
          });
          enqueueUserEmail(
            userData.email,
            userData.full_name || "",
            emailTemplate,
            `lifetime_purchase:${paymentIntentId ?? invoice.id}`,
          );
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
  eventId: string,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing failed payment for invoice:", invoice.id);

    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (!subscriptionId) {
      return;
    }

    let { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, plan, status, last_event_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (subError) {
      throw new Error(`subscriptions lookup failed: ${subError.message}`);
    }

    if (!subData?.user_id) {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscriptionId,
      );
      await handleSubscriptionUpdated(
        stripeSubscription,
        eventId,
        enqueueUserEmail,
        invoice,
        "invoice.payment_failed",
      );

      const retryLookup = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, last_event_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();
      subData = retryLookup.data;
      subError = retryLookup.error;
      if (subError) {
        throw new Error(`subscriptions lookup failed: ${subError.message}`);
      }
    }

    if (!subData?.user_id) {
      console.error("No subscription found with ID:", subscriptionId);
      reportStripeWebhookError(
        "handle_invoice_payment_failed_missing_subscription",
        new Error("No local subscription found for failed Stripe invoice"),
        { invoiceId: invoice.id, subscriptionId },
      );
      return;
    }

    const userId = subData.user_id;
    const plan = (subData as any).plan as string | null;
    const previousStatus = (subData as any).status as string | null;
    const handledByThisInvoice =
      subData.last_event_id === `invoice_payment_failed_${invoice.id}`;

    let latestStripeStatus = "past_due";
    let paymentIntentStatus: string | null = null;
    let failureReason = (invoice as any).last_finalization_error?.message ||
      "Your payment method was declined or could not be charged.";
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

    try {
      const latestInvoice = await stripe.invoices.retrieve(invoice.id, {
        expand: ["payments.data.payment.payment_intent"],
      });
      const payments = (latestInvoice as any).payments?.data || [];
      const latestPayment = payments.find((payment: any) =>
        payment.is_default
      ) ?? payments[0];
      const paymentIntent = latestPayment?.payment?.payment_intent ||
        (latestInvoice as any).payment_intent;
      const paymentIntentObject =
        typeof paymentIntent === "object" && paymentIntent !== null
          ? paymentIntent
          : paymentIntent
          ? await stripe.paymentIntents.retrieve(paymentIntent)
          : null;
      paymentIntentStatus = paymentIntentObject?.status ?? null;
      const paymentError = paymentIntentObject?.last_payment_error;

      failureReason = paymentError?.message ||
        paymentError?.decline_code ||
        paymentError?.code ||
        (latestInvoice as any).last_finalization_error?.message ||
        failureReason;
    } catch (reasonError) {
      reportStripeWebhookError(
        "handle_invoice_payment_failed_retrieve_reason",
        reasonError,
        { invoiceId: invoice.id, subscriptionId },
      );
      console.error("Could not retrieve payment failure reason", {
        invoiceId: invoice.id,
        error: reasonError instanceof Error ? reasonError.message : reasonError,
      });
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
        throw new Error(
          `failed to update payment-failed subscription status: ${updateError.message}`,
        );
      }

      if (plan) {
        try {
          const { error: cascadeError } = await supabase.rpc(
            "cascade_subscription_upgrade",
            {
              p_owner_user_id: userId,
              p_new_plan: plan,
              p_new_status: mappedStatus,
            },
          );
          if (cascadeError) {
            throw new Error(
              `failed to cascade payment-failed subscription status: ${cascadeError.message}`,
            );
          }
        } catch (cascadeError) {
          reportStripeWebhookError(
            "handle_invoice_payment_failed_cascade",
            cascadeError,
            { invoiceId: invoice.id, userId },
          );
          throw cascadeError;
        }
      }
    }

    const attemptCount = (invoice as any).attempt_count;
    const shouldNotify = isTerminalDowngradeStatus(latestStripeStatus)
      ? !isTerminalDowngradeStatus(previousStatus || "") || handledByThisInvoice
      : typeof attemptCount === "number"
      ? attemptCount === 1
      : previousStatus !== "past_due";

    if (!shouldNotify) {
      console.log("Skipping repeated payment failure notification", {
        subscriptionId,
        previousStatus,
        latestStripeStatus,
      });
      return;
    }

    // Stripe emits invoice.payment_action_required for SCA flows. Let that
    // dedicated email explain the required authentication instead of also
    // sending a generic payment-failed email.
    if (paymentIntentStatus === "requires_action") {
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userError) {
      throw new Error(`users lookup failed: ${userError.message}`);
    }

    if (!userData) {
      return;
    }

    let planName = "Subscription";
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
      failureReason,
      isDowngraded: isTerminalDowngradeStatus(latestStripeStatus),
      resubscribeUrl: membershipUrl,
    });

    enqueueUserEmail(
      userData.email,
      name,
      emailTemplate,
      `invoice_payment_failed:${invoice.id}:${
        isTerminalDowngradeStatus(latestStripeStatus) ? "terminal" : "past_due"
      }`,
    );
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
      reportStripeWebhookError(
        "handle_invoice_payment_action_required_missing_customer",
        new Error(
          "Stripe invoice requiring payment action is missing its customer ID",
        ),
        { invoiceId: invoice.id },
      );
      return;
    }

    let user = await getUserByCustomerId(customerId);

    if (!user) {
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId,
        );
        user = await getUserForStripeSubscription(subscription, customerId);
      }
    }

    if (!user) {
      console.error("No user found for customer:", customerId);
      reportStripeWebhookError(
        "handle_invoice_payment_action_required_missing_user",
        new Error("No user mapping found for payment-action invoice customer"),
        { customerId, invoiceId: invoice.id },
      );
      return;
    }

    // Get user data for personalized email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw new Error(`users lookup failed: ${userError.message}`);
    }

    if (!userData) {
      console.error(
        "Could not fetch user data for payment action required email",
      );
      return;
    }

    const name = userData.full_name || "there";

    // Get plan name from invoice - use safe extraction
    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromInvoiceLine(invoice.lines.data[0])
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

    enqueueUserEmail(
      userData.email,
      name,
      emailTemplate,
      `invoice_payment_action_required:${invoice.id}`,
    );
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

    try {
      subscription = await stripe.subscriptions.retrieve(subscription.id);
    } catch (retrieveError: any) {
      if (retrieveError?.code === "resource_missing") return;
      throw retrieveError;
    }

    if (
      subscription.status !== "trialing" ||
      typeof subscription.trial_end !== "number" ||
      subscription.trial_end <= Math.floor(Date.now() / 1000)
    ) {
      console.log("Skipping stale trial ending notification", {
        subscriptionId: subscription.id,
        status: subscription.status,
        trialEnd: subscription.trial_end,
      });
      return;
    }

    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      reportStripeWebhookError(
        "handle_subscription_trial_ending_missing_customer",
        new Error("Trial-ending subscription is missing its customer ID"),
        { subscriptionId: subscription.id },
      );
      return;
    }

    const user = await getUserForStripeSubscription(subscription, customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      reportStripeWebhookError(
        "handle_subscription_trial_ending_missing_user",
        new Error(
          "No user mapping found for trial-ending subscription customer",
        ),
        { customerId, subscriptionId: subscription.id },
      );
      return;
    }

    // Get plan details - use safe extraction
    let planName = "Subscription";
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

    const authoritativeUserId = userIdFromVerification ||
      userIdFromCustomerMapping;
    const userId = authoritativeUserId || userIdFromSession ||
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

      if (!authoritativeUserId) {
        throw new PermanentWebhookError(
          "USER_NOT_AUTHORIZED_FOR_LIFETIME",
          `Checkout session ${sessionId} has no verification row or customer mapping`,
        );
      }

      const lifetimeUserId = authoritativeUserId;

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
              userId: redactUserId(lifetimeUserId),
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

        if (
          !isPositiveStripeAmount(amountTotal) &&
          !allowZeroAmountLifetimeGrants()
        ) {
          throw new PermanentWebhookError(
            "ZERO_AMOUNT_LIFETIME_NOT_ALLOWED",
            `Checkout session ${sessionId} has zero-amount Lifetime payment without explicit allowance`,
          );
        }

        const lineItems = await stripe.checkout.sessions.listLineItems(
          sessionId,
          { limit: 100 },
        );
        const checkoutLinePlanInfo = resolveInvoicePlanFromLinePrices({
          lines: lineItems as any,
        });
        if (checkoutLinePlanInfo?.plan !== "lifetime") {
          throw new PermanentWebhookError(
            "LIFETIME_PRICE_NOT_VERIFIED",
            `Checkout session ${sessionId} did not include configured Lifetime price`,
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
            userId: redactUserId(lifetimeUserId),
          });
          return;
        }

        console.log(
          "Processing Lifetime plan purchase for user:",
          redactUserId(lifetimeUserId),
        );

        // CRITICAL: Fetch old subscription ID BEFORE upserting lifetime
        // We need to cancel any existing Stripe subscription when user upgrades to lifetime
        const { data: oldSubData, error: oldSubError } = await supabase
          .from("subscriptions")
          .select(
            "stripe_subscription_id, plan, status, last_event_id, lifetime_source, lifetime_source_id",
          )
          .eq("user_id", lifetimeUserId)
          .maybeSingle();

        if (oldSubError) {
          throw new Error(
            `old subscription lookup failed: ${oldSubError.message}`,
          );
        }

        const oldStripeSubscriptionId = oldSubData?.stripe_subscription_id;
        const payerAlreadyLifetime = oldSubData?.plan === "lifetime" &&
          oldSubData?.status === "active";
        const shouldSendLifetimeWelcome = !payerAlreadyLifetime ||
          oldSubData?.last_event_id === eventId;
        const lifetimeSourceId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? `checkout:${sessionId}`;
        if (
          payerAlreadyLifetime &&
          !(
            oldSubData?.lifetime_source === "stripe" &&
            oldSubData?.lifetime_source_id === lifetimeSourceId
          )
        ) {
          await reportStripeWebhookError(
            "multiple_active_lifetime_grants_detected",
            new Error(
              "Stripe checkout Lifetime grant cannot be represented alongside the current active Lifetime grant",
            ),
            {
              userId: lifetimeUserId,
              sessionId,
              currentLifetimeSource: oldSubData?.lifetime_source ?? null,
              incomingLifetimeSource: "stripe",
            },
          );
        }
        console.log("Existing subscription before lifetime upgrade:", {
          oldPlan: oldSubData?.plan,
          oldStatus: oldSubData?.status,
          oldSubscriptionId: oldStripeSubscriptionId,
        });

        if (
          !payerAlreadyLifetime &&
          oldStripeSubscriptionId &&
          oldStripeSubscriptionId !== "null" &&
          oldStripeSubscriptionId.startsWith("sub_")
        ) {
          await cancelSubscriptionBeforeLifetimeGrant({
            subscriptionId: oldStripeSubscriptionId,
            userId: lifetimeUserId,
            sessionId,
          });
        }

        // Create or update subscription record for Lifetime plan
        // Use helper function to create consistent lifetime payload
        const lifetimeSubscriptionData = createLifetimeSubscriptionPayload(
          lifetimeUserId,
          customerId,
          eventId,
          lifetimeSourceId,
        );

        console.log(
          "Upserting Lifetime subscription with data:",
          lifetimeSubscriptionData,
        );

        const { error: upsertError } = payerAlreadyLifetime
          ? { error: null }
          : await supabase
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
          } else if (refereeUserId !== lifetimeUserId) {
            console.error("Referral acceptance referee mismatch; skipping", {
              sessionId,
              purchaser: redactUserId(lifetimeUserId),
              referee: redactUserId(refereeUserId),
            });
          } else if (referrerUserId === refereeUserId) {
            console.error(
              "Referral acceptance has same referrer/referee; skipping",
              {
                sessionId,
                userId: redactUserId(lifetimeUserId),
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

        // Get user details for welcome email
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", lifetimeUserId)
          .single();

        if (userError) {
          throw new Error(`users lookup failed: ${userError.message}`);
        }

        if (userData && shouldSendLifetimeWelcome) {
          // Send Lifetime purchase confirmation email
          const name = userData.full_name || "";
          const emailTemplate = subscriptionCreatedTemplate({
            name,
            planName: "Lifetime",
            dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
            isLifetime: true, // No end date, permanent access
          });

          enqueueUserEmail(
            userData.email,
            name,
            emailTemplate,
            `lifetime_purchase:${
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || session.id
            }`,
          );
          console.log("Lifetime confirmation email queued");
        }
      } else {
        // CRITICAL ERROR: Payment mode used for non-lifetime plan
        console.error(
          "CRITICAL: Payment mode checkout with non-lifetime plan!",
          {
            sessionId: session.id,
            userId: redactUserId(lifetimeUserId),
            hasCustomer: Boolean(customerId),
            plan,
            hasMetadata: Boolean(session.metadata),
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
      reportStripeWebhookError(
        "handle_checkout_session_async_payment_failed_missing_user",
        new Error(
          "Async payment failure checkout session is missing its user ID",
        ),
        { sessionId: session.id },
      );
      return;
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userError) {
      throw new Error(`users lookup failed: ${userError.message}`);
    }

    if (userData) {
      // Send async payment failure email
      const name = userData.full_name || "";
      const emailTemplate = paymentFailedTemplate({
        name,
        planName: session.metadata?.plan || "Subscription",
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        updatePaymentUrl:
          `${DASHBOARD_URL}/checkout?plan=${session.metadata?.plan}`,
      });

      enqueueUserEmail(
        userData.email,
        name,
        emailTemplate,
        `checkout_async_payment_failed:${session.id}`,
      );
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

async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { error } = await supabase
    .from("stripe_checkout_session_verifications")
    .delete()
    .eq("session_id", session.id);
  if (error) {
    throw new Error(
      `failed to remove expired checkout verification: ${error.message}`,
    );
  }
}

async function handleInvoiceFinalizationFailed(
  invoice: Stripe.Invoice,
  enqueueUserEmail: EnqueueUserEmail,
): Promise<void> {
  const finalizationError = (invoice as any).last_finalization_error;
  const automaticTaxStatus = (invoice as any).automatic_tax?.status || null;
  await reportStripeWebhookError(
    "handle_invoice_finalization_failed",
    new Error(
      finalizationError?.message ||
        "Stripe invoice failed to finalize and cannot collect payment",
    ),
    {
      invoiceId: invoice.id,
      customerId: typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id,
      automaticTaxStatus,
      errorCode: finalizationError?.code || null,
    },
  );

  if (automaticTaxStatus !== "requires_location_inputs") return;

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;
  if (!customerId) return;

  const user = await getUserByCustomerId(customerId);
  if (!user?.email) return;

  const name = user.full_name || "";
  enqueueUserEmail(
    user.email,
    name,
    invoiceLocationRequiredTemplate({ name }),
    `invoice_finalization_location_required:${invoice.id}`,
  );
}

// Handler for invoice finalized (send invoice copy)
async function handleInvoiceFinalized(
  invoice: Stripe.Invoice,
  enqueueUserEmail: EnqueueUserEmail,
) {
  try {
    console.log("Processing finalized invoice:", invoice.id);

    // Automatic-charge invoices get a receipt after payment succeeds; sending
    // a finalized email as well would create a duplicate billing notification.
    if (invoice.collection_method === "charge_automatically") {
      return;
    }

    const customerId = typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      console.error("No customer ID in invoice:", invoice.id);
      reportStripeWebhookError(
        "handle_invoice_finalized_missing_customer",
        new Error("Finalized Stripe invoice is missing its customer ID"),
        { invoiceId: invoice.id },
      );
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      reportStripeWebhookError(
        "handle_invoice_finalized_missing_user",
        new Error("No user mapping found for finalized invoice customer"),
        { customerId, invoiceId: invoice.id },
      );
      return;
    }

    // Get user data for personalized email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw new Error(`users lookup failed: ${userError.message}`);
    }

    if (!userData) {
      console.error("Could not fetch user data for invoice email");
      reportStripeWebhookError(
        "handle_invoice_finalized_missing_user_data",
        new Error("User data was unavailable for finalized invoice email"),
        { customerId, invoiceId: invoice.id, userId: user.id },
      );
      return;
    }

    const name = userData.full_name || "there";

    // Get plan name from subscription - use safe extraction
    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromInvoiceLine(invoice.lines.data[0])
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

    enqueueUserEmail(
      userData.email,
      name,
      emailTemplate,
      `invoice_finalized:${invoice.id}`,
    );
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
      reportStripeWebhookError(
        "handle_invoice_upcoming_missing_customer",
        new Error("Upcoming Stripe invoice is missing its customer ID"),
        { invoiceId: invoice.id },
      );
      return;
    }

    const user = await getUserByCustomerId(customerId);
    if (!user) {
      console.error("No user found for customer:", customerId);
      reportStripeWebhookError(
        "handle_invoice_upcoming_missing_user",
        new Error("No user mapping found for upcoming invoice customer"),
        { customerId, invoiceId: invoice.id },
      );
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
    const upcomingSubscriptionKey = getInvoiceSubscriptionId(invoice) ||
      customerId;
    const upcomingPeriodKey = invoice.lines?.data?.[0]?.period?.end ||
      invoice.next_payment_attempt;
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

      enqueueUserEmail(
        user.email,
        user.full_name || "",
        emailTemplate,
        `invoice_upcoming_discount:${upcomingSubscriptionKey}:${upcomingPeriodKey}:${daysUntil}`,
      );
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

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw new Error(`users lookup failed: ${userError.message}`);
    }

    if (!userData) {
      console.error("Could not fetch user data for renewal reminder email");
      reportStripeWebhookError(
        "handle_invoice_upcoming_missing_user_data",
        new Error("User data was unavailable for renewal reminder email"),
        { customerId, invoiceId: invoice.id, userId: user.id },
      );
      return;
    }

    const name = userData.full_name || "there";

    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromInvoiceLine(invoice.lines.data[0])
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

    enqueueUserEmail(
      userData.email,
      name,
      emailTemplate,
      `invoice_upcoming:${upcomingSubscriptionKey}:${upcomingPeriodKey}`,
    );
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
      reportStripeWebhookError(
        "handle_payment_method_attached_missing_customer",
        new Error("Attached payment method is missing its customer ID"),
        { paymentMethodId: paymentMethod.id },
      );
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      reportStripeWebhookError(
        "handle_payment_method_attached_missing_user",
        new Error("No user mapping found for attached payment method customer"),
        { customerId, paymentMethodId: paymentMethod.id },
      );
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
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw new Error(`users lookup failed: ${userError.message}`);
    }

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

    enqueueUserEmail(
      userData.email,
      name,
      emailTemplate,
      `payment_method_attached:${paymentMethod.id}`,
    );
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

    // Reconcile through the canonical subscription path so price, period,
    // status, household access, and user notification logic stay consistent.
    await handleSubscriptionUpdated(
      subscription,
      eventId,
      enqueueUserEmail,
      undefined,
      "customer.subscription.pending_update_applied",
    );

    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
    if (!customerId) return;

    const user = await getUserForStripeSubscription(subscription, customerId);
    if (!user) return;

    const { error: clearPendingError } = await supabase
      .from("subscriptions")
      .update({
        pending_plan: null,
        pending_interval: null,
        pending_effective_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (clearPendingError) {
      throw new Error(
        `failed to clear applied pending subscription update: ${clearPendingError.message}`,
      );
    }

    return;

    /*
    // Extract customer ID
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (!customerId) {
      console.error("No customer ID in subscription:", subscription.id);
      reportStripeWebhookError(
        "handle_subscription_pending_update_applied_missing_customer",
        new Error("Applied pending subscription update is missing its customer ID"),
        { subscriptionId: subscription.id },
      );
      return;
    }

    // Find user
    const user = await getUserByCustomerId(customerId);
    if (!user) {
      console.error("No user found with customer ID:", customerId);
      reportStripeWebhookError(
        "handle_subscription_pending_update_applied_missing_user",
        new Error("No user mapping found for applied pending subscription update"),
        { customerId, subscriptionId: subscription.id },
      );
      return;
    }

    const pricePlanInfo = resolveSubscriptionPlanFromPrice(subscription);
    if (
      !pricePlanInfo ||
      pricePlanInfo.plan === "lifetime" ||
      !pricePlanInfo.interval
    ) {
      throw new Error(
        `Unknown Stripe price for applied subscription update ${subscription.id}`,
      );
    }
    const plan = pricePlanInfo.plan;
    const billingInterval = pricePlanInfo.interval;

    const { data: previousSub, error: previousSubError } = await supabase
      .from("subscriptions")
      .select(
        "plan, billing_interval, current_period_end, pending_plan, pending_interval, pending_effective_date, last_event_id",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (previousSubError) {
      throw new Error(
        `subscriptions lookup failed: ${previousSubError.message}`,
      );
    }

    const hadPendingChange = Boolean(
      previousSub?.pending_plan || previousSub?.pending_interval,
    );
    const planChanged =
      previousSub?.plan !== plan ||
      previousSub?.billing_interval !== billingInterval;
    const wasHandledByThisEvent = previousSub?.last_event_id === eventId;

    // Clear pending fields - the scheduled change has been applied
    const { error: pendingUpdateError } = await supabase
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

    if (pendingUpdateError) {
      throw new Error(
        `failed to apply pending subscription update: ${pendingUpdateError.message}`,
      );
    }

    console.log("Scheduled subscription change applied for user:", user.id);

    if (hadPendingChange || planChanged || wasHandledByThisEvent) {
      const itemPeriodEnd = subscription.items?.data?.[0]?.current_period_end;
      const planName = await getPlanNameFromProductId(
        getProductIdFromPrice(subscription.items?.data?.[0]?.price),
      );
      const changeType = previousSub?.plan
        ? getChangeType(
            previousSub.plan as PlanType,
            plan,
            (previousSub.billing_interval as BillingInterval | null) ||
              undefined,
            billingInterval,
          )
        : "renewal";
      const templateChangeType =
        changeType === "upgraded"
          ? "upgrade"
          : changeType === "downgraded"
            ? "downgrade"
            : changeType === "interval_changed"
              ? "interval_changed"
              : "renewal";
      const emailTemplate = subscriptionUpdatedTemplate({
        name: user.full_name || "",
        planName,
        endDate: formatUnixTimestampDate(itemPeriodEnd) || "N/A",
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        changeType: templateChangeType,
      });
      enqueueUserEmail(
        user.email,
        user.full_name || "",
        emailTemplate,
        `subscription_change_applied:${subscription.id}:${plan}:${billingInterval}:${previousSub?.pending_effective_date ?? previousSub?.current_period_end ?? itemPeriodEnd ?? "unknown"}`,
      );
    }
    */
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
      reportStripeWebhookError(
        "handle_subscription_pending_update_expired_missing_customer",
        new Error(
          "Expired pending subscription update is missing its customer ID",
        ),
        { subscriptionId: subscription.id },
      );
      return;
    }

    // Find user
    const user = await getUserByCustomerId(customerId);
    if (!user) {
      console.error("No user found with customer ID:", customerId);
      reportStripeWebhookError(
        "handle_subscription_pending_update_expired_missing_user",
        new Error(
          "No user mapping found for expired pending subscription update",
        ),
        { customerId, subscriptionId: subscription.id },
      );
      return;
    }

    // Clear pending fields - the scheduled change was cancelled or expired
    const { error: pendingExpiryError } = await supabase
      .from("subscriptions")
      .update({
        pending_plan: null,
        pending_interval: null,
        pending_effective_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (pendingExpiryError) {
      throw new Error(
        `failed to clear expired pending subscription update: ${pendingExpiryError.message}`,
      );
    }

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

async function handleTerminalSubscriptionSchedule(
  schedule: Stripe.SubscriptionSchedule,
  eventType: string,
): Promise<void> {
  const subscriptionId = typeof schedule.subscription === "string"
    ? schedule.subscription
    : schedule.subscription?.id;
  if (!subscriptionId) {
    await reportStripeWebhookError(
      "handle_terminal_subscription_schedule_missing_subscription",
      new Error("Terminal Stripe subscription schedule has no subscription ID"),
      { eventType, scheduleId: schedule.id },
    );
    return;
  }

  try {
    const currentSubscription = await stripe.subscriptions.retrieve(
      subscriptionId,
    );
    const currentScheduleId = typeof currentSubscription.schedule === "string"
      ? currentSubscription.schedule
      : currentSubscription.schedule?.id;
    if (currentScheduleId && currentScheduleId !== schedule.id) return;
  } catch (retrieveError: any) {
    if (retrieveError?.code !== "resource_missing") throw retrieveError;
  }

  const finalPhase = schedule.phases?.[schedule.phases.length - 1];
  const finalPrice = finalPhase?.items?.[0]?.price;
  const finalPriceId = typeof finalPrice === "string"
    ? finalPrice
    : finalPrice?.id;
  const targetPlan = getPlanFromPriceId(finalPriceId);
  if (!targetPlan?.interval) return;

  const { data: localSubscription, error: lookupError } = await supabase
    .from("subscriptions")
    .select("pending_plan, pending_interval")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`subscriptions lookup failed: ${lookupError.message}`);
  }

  if (
    localSubscription?.pending_plan !== targetPlan.plan ||
    localSubscription?.pending_interval !== targetPlan.interval
  ) {
    return;
  }

  const { error: clearError } = await supabase
    .from("subscriptions")
    .update({
      pending_plan: null,
      pending_interval: null,
      pending_effective_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
  if (clearError) {
    throw new Error(
      `failed to clear terminal subscription schedule: ${clearError.message}`,
    );
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
      reportStripeWebhookError(
        "handle_setup_intent_succeeded_missing_customer",
        new Error("Succeeded setup intent is missing its customer ID"),
        { setupIntentId: setupIntent.id },
      );
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      reportStripeWebhookError(
        "handle_setup_intent_succeeded_missing_user",
        new Error("No user mapping found for succeeded setup intent customer"),
        { customerId, setupIntentId: setupIntent.id },
      );
      return;
    }

    // Get the payment method that was attached
    const paymentMethodId = typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      console.error("No payment method in setup intent:", setupIntent.id);
      reportStripeWebhookError(
        "handle_setup_intent_succeeded_missing_payment_method",
        new Error("Succeeded setup intent is missing its payment method"),
        { setupIntentId: setupIntent.id },
      );
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
      reportStripeWebhookError(
        "handle_setup_intent_failed_missing_customer",
        new Error("Failed setup intent is missing its customer ID"),
        { setupIntentId: setupIntent.id },
      );
      return;
    }

    const user = await getUserByCustomerId(customerId);

    if (!user) {
      console.error("No user found for customer:", customerId);
      reportStripeWebhookError(
        "handle_setup_intent_failed_missing_user",
        new Error("No user mapping found for failed setup intent customer"),
        { customerId, setupIntentId: setupIntent.id },
      );
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
