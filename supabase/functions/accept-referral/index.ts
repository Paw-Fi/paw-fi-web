import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { getPriceId } from "../shared/stripe-subscription-prices.ts";
import { createCheckoutSessionWithRetry } from "../shared/stripe-retry.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_URL = Deno.env.get("APP_URL") || "https://moneko.io";

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user (this is the referee)
    const authResult = await authenticateUser(req, supabase);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refereeUserId = authResult.userId!;

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Invalid code parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing referral acceptance:", { code, refereeUserId });

    // Look up the referral code
    const { data: referralCode, error: codeError } = await supabase
      .from("referral_codes")
      .select("id, user_id, code, is_active")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (codeError || !referralCode) {
      console.error("Error looking up referral code:", codeError);
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!referralCode.is_active) {
      return new Response(
        JSON.stringify({ error: "This referral code is no longer active" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const referrerUserId = referralCode.user_id;

    // Prevent user from using their own referral code
    if (referrerUserId === refereeUserId) {
      return new Response(
        JSON.stringify({ error: "You cannot use your own referral code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Eligibility: Block users who already have premium/lifetime
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", refereeUserId)
      .maybeSingle();

    if (
      existingSub &&
      (existingSub.plan === "lifetime" ||
        ["active", "trialing"].includes((existingSub as any).status))
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Referral is only available for new users without premium access",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get referee details
    const { data: referee, error: refereeError } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", refereeUserId)
      .single();

    if (refereeError || !referee) {
      console.error("Error fetching referee:", refereeError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create Stripe customer for referee (verify mapping and existence)
    const { data: mappingData } = await supabase
      .from("user_stripe_mapping")
      .select("stripe_customer_id")
      .eq("user_id", refereeUserId)
      .maybeSingle();

    let customerId = mappingData?.stripe_customer_id;

    // If we have a mapped customer, ensure it still exists in Stripe
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        // If Stripe returns a deleted customer object, treat as missing
        // deno-lint-ignore no-explicit-any
        if ((existing as any)?.deleted) {
          console.warn(
            "Mapped Stripe customer is deleted. Will recreate:",
            customerId,
          );
          customerId = undefined;
        }
      } catch (e) {
        // Handle resource missing -> recreate below
        console.warn(
          "Mapped Stripe customer not found. Will recreate:",
          customerId,
        );
        customerId = undefined;
      }
    }

    if (!customerId) {
      console.log("Creating new Stripe customer for referee:", refereeUserId);

      const customer = await stripe.customers.create({
        email: referee.email,
        name: referee.full_name || undefined,
        metadata: {
          userId: refereeUserId,
        },
      });

      customerId = customer.id;

      await supabase.from("user_stripe_mapping").upsert(
        {
          user_id: refereeUserId,
          stripe_customer_id: customerId,
        },
        { onConflict: "user_id" },
      );
    }

    // Prevent same email between referrer and referee (even if different user IDs)
    const { data: referrerUser, error: referrerUserError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", referrerUserId)
      .maybeSingle();

    if (referrerUserError) {
      console.error("Error fetching referrer:", referrerUserError);
      return new Response(JSON.stringify({ error: "Referrer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      referrerUser?.email &&
      referee.email &&
      referrerUser.email.trim().toLowerCase() ===
        referee.email.trim().toLowerCase()
    ) {
      return new Response(
        JSON.stringify({
          error:
            "You cannot accept an invite using the same email as the inviter",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get lifetime price ID
    const priceId = getPriceId("lifetime");

    console.log("Creating referral checkout session:", {
      refereeUserId,
      referrerUserId,
      priceId,
    });

    // Create Stripe checkout session with 100% promo code
    const successUrl = `${APP_URL}/referral/${code}?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${APP_URL}/referral/${code}?status=canceled`;

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      client_reference_id: refereeUserId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Enable invoice creation
      invoice_creation: {
        enabled: true,
      },
      // CRITICAL: Add referral metadata
      payment_intent_data: {
        metadata: {
          user_id: refereeUserId,
          plan: "lifetime",
          checkout_type: "referral_acceptance",
          referral_code_id: referralCode.id,
          referrer_user_id: referrerUserId,
          referee_user_id: refereeUserId,
          referral_code: code,
        },
        receipt_email: referee.email,
      },
      metadata: {
        user_id: refereeUserId,
        plan: "lifetime",
        checkout_type: "referral_acceptance",
        referral_code_id: referralCode.id,
        referrer_user_id: referrerUserId,
        referee_user_id: refereeUserId,
        referral_code: code,
      },
      // Automatically apply the MONEKO-GRP-LIFETIME promo code
      discounts: [
        {
          promotion_code: Deno.env.get("STRIPE_REFERRAL_PROMO_CODE_ID") || "", // Will need to be set in env
        },
      ],
    };

    // Create checkout session with retry. If stored customer is stale (deleted), recreate and retry.
    let session;
    try {
      session = await createCheckoutSessionWithRetry(stripe, sessionConfig);
    } catch (sessionError) {
      // Handle missing customer (stale mapping) by recreating customer and retrying
      // Stripe error shape: { code: 'resource_missing', message: 'No such customer: ...' }
      // Using message includes check for robustness across SDK versions
      // deno-lint-ignore no-explicit-any
      const err: any = sessionError;
      if (
        err?.code === "resource_missing" &&
        typeof err?.message === "string" &&
        err.message.includes("customer")
      ) {
        console.log(
          "Customer not found during referral checkout, recreating customer for user:",
          refereeUserId,
        );
        const newCustomer = await stripe.customers.create({
          email: referee.email,
          name: referee.full_name || undefined,
          metadata: { userId: refereeUserId },
        });
        customerId = newCustomer.id;
        await supabase
          .from("user_stripe_mapping")
          .upsert(
            { user_id: refereeUserId, stripe_customer_id: customerId },
            { onConflict: "user_id" },
          );
        // Update config with new customer and retry
        sessionConfig.customer = customerId;
        session = await createCheckoutSessionWithRetry(stripe, sessionConfig);
      } else {
        throw sessionError;
      }
    }

    console.log("Checkout session created:", session.id);

    // Create referral acceptance record using UPSERT for idempotency
    const { error: acceptanceError } = await supabase
      .from("referral_acceptances")
      .upsert(
        {
          referral_code_id: referralCode.id,
          referrer_user_id: referrerUserId,
          referee_user_id: refereeUserId,
          referral_code_text: code.toUpperCase(),
          status: "pending",
          stripe_checkout_session_id: session.id,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "referee_user_id,referral_code_id",
          ignoreDuplicates: false,
        },
      );

    if (acceptanceError) {
      console.error("Error creating referral acceptance:", acceptanceError);
      // Don't fail - session is already created
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in accept-referral:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
