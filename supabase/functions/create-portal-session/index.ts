/**
 * Create Stripe Customer Portal Session - Production Ready
 *
 * Creates a Stripe Customer Portal session for self-service subscription management
 * Allows customers to:
 * - Update payment methods
 * - View invoices and payment history
 * - Cancel subscriptions
 * - Update billing information
 *
 * Security: Validates user authentication and ownership
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { validateEnvironment } from "../shared/env-validation.ts";
import { generateIdempotencyKey } from "../shared/idempotency.ts";
import { createCustomerWithRetry } from "../shared/stripe-retry.ts";

// Validate environment on startup
const env = validateEnvironment();

// Initialize Stripe
const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2025-07-30.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

function safeParseUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function sanitizeReturnUrl(
  value: string | null,
  allowedHosts: Set<string>,
): string | null {
  const parsed = safeParseUrl(value);
  if (!parsed) return null;

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!allowedHosts.has(parsed.hostname)) return null;

  return parsed.toString();
}

serve(async (req: Request): Promise<Response> => {
  try {
    // Handle CORS preflight
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

    // Authenticate user from JWT token - NEVER trust userId from request body
    const authResult = await authenticateUser(req, supabase);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId!;

    // Parse request body (returnUrl only)
    const body = await req.json().catch(() => ({}));
    const requestUserId = typeof body?.userId === "string" ? body.userId : null;

    if (requestUserId && requestUserId !== userId) {
      return new Response(JSON.stringify({ error: "User ID mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const returnUrl =
      typeof body?.returnUrl === "string" ? body.returnUrl : null;

    console.log("Creating portal session for user:", userId);

    // Get user's subscription and customer ID
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, user_id, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription details" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let customerId = subscription?.stripe_customer_id;

    // If no customer ID exists, create a new customer
    if (!customerId) {
      // Get user details
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        console.error("Error fetching user:", userError);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create a new Stripe customer
      const customer = await createCustomerWithRetry(stripe, {
        email: userData.email,
        name: userData.full_name || undefined,
        metadata: {
          userId,
          source: "portal_session",
        },
      });

      customerId = customer.id;

      // Store customer ID in database
      if (subscription) {
        await supabase
          .from("subscriptions")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", userId);
      } else {
        // Create mapping in user_stripe_mapping table if it exists
        await supabase
          .from("user_stripe_mapping")
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
          })
          .onConflict("user_id");
      }

      console.log("Created new Stripe customer:", customerId);
    }

    // Determine return URL
    const appHost = safeParseUrl(env.appUrl)?.hostname;
    const allowedHosts = new Set(
      [appHost, "moneko.io", "www.moneko.io", "localhost", "127.0.0.1"].filter(
        (host): host is string => Boolean(host),
      ),
    );

    const sanitizedReturnUrl = sanitizeReturnUrl(returnUrl, allowedHosts);
    const finalReturnUrl =
      sanitizedReturnUrl || `${env.appUrl}/dashboard/user-settings/membership`;

    // Create portal session with idempotency key
    const idempotencyKey = generateIdempotencyKey("portal_session", customerId);

    const session = await stripe.billingPortal.sessions.create(
      {
        customer: customerId,
        return_url: finalReturnUrl,
      },
      {
        idempotencyKey,
      },
    );

    console.log("Portal session created:", session.id);

    // Return session URL
    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error creating portal session:", error);

    // Return user-friendly error message
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return new Response(
      JSON.stringify({
        error: "Failed to create portal session",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
