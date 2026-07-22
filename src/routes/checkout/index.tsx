import { createFileRoute, FileRoutesByPath } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { seo } from "@/utils/seo";
import { motion, Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Shield,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { getRegionalPricingMarket } from "@/data/regional-pricing.generated";
import { detectRegionalPricingCountry } from "@/lib/regional-pricing";

// Define the search params type for this route
type CheckoutSearchParams = {
  plan?: string;
  billing?: string;
  promo?: string; // Promo code
  status?: string; // Payment status: success, failed, canceled
  session_id?: string; // Stripe session ID for status verification
  v?: string; // Public verification nonce for logged-out verify-payment
  source?: string; // Source platform: 'mobile' or 'web'
  redirectUrl?: string; // Deep link URL to redirect back to mobile app after success
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  // NOTE: Trial eligibility is determined by backend based on subscription history
};

// Add the route to FileRoutesByPath for TypeScript
declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/checkout": {
      search: CheckoutSearchParams;
    };
  }
}

export const Route = createFileRoute("/checkout/")({
  component: CheckoutPage,
  loader: () => {
    return {
      meta: seo({
        title: "Checkout | Moneko",
        description: "Complete your subscription purchase.",
      }),
    };
  },
});

// Animation variants with Apple-like easing
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

type CheckoutPlan = "plus" | "lifetime";

function parseCheckoutPlan(plan: string | undefined): CheckoutPlan {
  return plan === "lifetime" ? "lifetime" : "plus";
}

function formatPlanName(plan: CheckoutPlan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function CheckoutPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as CheckoutSearchParams;
  const {
    plan,
    billing,
    promo,
    status,
    session_id,
    v,
    source,
    redirectUrl,
    accessToken,
    refreshToken,
    userId,
  } = searchParams;

  const [checkoutCountry] = useState(detectRegionalPricingCountry);
  const checkoutCurrency =
    getRegionalPricingMarket(checkoutCountry).currencyCode;

  const selectedPlan = parseCheckoutPlan(plan);
  const selectedPlanLabel = formatPlanName(selectedPlan);
  const isLifetimePlan = selectedPlan === "lifetime";
  const selectedBilling = billing === "yearly" ? "yearly" : "monthly";

  // Intentionally no verbose client logging here: search params may include tokens.

  const { user, isLoading: authLoading } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null);
  const [isValidatingUser, setIsValidatingUser] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed" | "canceled"
  >(
    status === "success"
      ? "success"
      : status === "failed"
        ? "failed"
        : status === "canceled"
          ? "canceled"
          : "idle",
  );

  const hasLegacyMobileSessionParams =
    Boolean(accessToken) && Boolean(refreshToken) && Boolean(userId);

  // Determine if this is a mobile checkout
  const isMobileCheckout = source === "mobile" || !!redirectUrl;

  // Load Stripe.js
  useEffect(() => {
    // Load Stripe.js script
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => {
      setStripeLoaded(true);
    };
    script.onerror = () => {
      setError("Failed to load Stripe. Please try again later.");
      setCheckoutLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script when component unmounts
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Validate userId parameter if provided (for mobile app checkout)
  useEffect(() => {
    if (authLoading || status) {
      return;
    }

    const validateUserId = async () => {
      if (hasLegacyMobileSessionParams) {
        setIsValidatingUser(true);

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken!,
          refresh_token: refreshToken!,
        });

        if (sessionError) {
          console.error(
            "❌ Legacy mobile session bootstrap failed:",
            sessionError,
          );
          setValidatedUserId(null);
          setIsValidatingUser(false);
          setCheckoutLoading(false);
          setError("Authentication required. Please log in to continue.");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          setValidatedUserId(null);
          setIsValidatingUser(false);
          setCheckoutLoading(false);
          setError("Authentication required. Please log in to continue.");
          return;
        }

        if (userId && session.user.id !== userId) {
          console.error("❌ Legacy mobile session user mismatch:", {
            expected: userId,
            actual: session.user.id,
          });
          await supabase.auth.signOut();
          setValidatedUserId(null);
          setIsValidatingUser(false);
          setCheckoutLoading(false);
          setError("Authentication required. Please log in to continue.");
          return;
        }

        setValidatedUserId(session.user.id);
        setIsValidatingUser(false);
        setCheckoutLoading(false);
        return;
      }

      if (isMobileCheckout) {
        setValidatedUserId(null);
        setIsValidatingUser(false);
        setCheckoutLoading(false);
        setError(
          "Mobile checkout must be started from the app. Please return to Moneko and try again.",
        );
        return;
      }

      if (user?.id) {
        setValidatedUserId(user.id);
        setCheckoutLoading(false);
        return;
      }

      setValidatedUserId(null);
      setCheckoutLoading(false);
      setError("Authentication required. Please log in to continue.");
    };

    validateUserId();
  }, [
    authLoading,
    user,
    status,
    isMobileCheckout,
    hasLegacyMobileSessionParams,
    accessToken,
    refreshToken,
    userId,
  ]);

  // Handle payment status verification when returning from Stripe checkout
  useEffect(() => {
    // Handle payment status from URL parameters
    if (status) {
      // If this is a mobile checkout with redirectUrl, handle differently
      if (isMobileCheckout && redirectUrl && typeof window !== "undefined") {
        if (status === "success") {
          // Redirect directly to mobile app with success status and selected plan
          window.location.href = `${redirectUrl}?status=success${session_id ? `&session_id=${session_id}` : ""}${v ? `&v=${encodeURIComponent(v)}` : ""}&plan=${selectedPlan}`;
          return;
        } else if (status === "failed") {
          window.location.href = `${redirectUrl}?status=failed&plan=${selectedPlan}&error=${encodeURIComponent("Payment failed")}`;
          return;
        } else if (status === "canceled") {
          window.location.href = `${redirectUrl}?status=canceled&plan=${selectedPlan}`;
          return;
        }
      }

      // For web checkout, redirect to payment status page
      if (status === "success" && session_id) {
        navigate({
          to: "/payment-status",
          search: {
            status: "success",
            session_id: session_id,
            v,
          },
        });
        return;
      } else if (status === "failed") {
        navigate({
          to: "/payment-status",
          search: {
            status: "failed",
            error: "Payment failed. Please try again.",
          },
        });
        return;
      } else if (status === "canceled") {
        navigate({
          to: "/payment-status",
          search: {
            status: "canceled",
          },
        });
      }
    }
    // If we have status parameters but didn't match any of the above conditions,
    // don't proceed with Stripe initialization
    if (status) {
      return;
    }
  }, [
    session_id,
    status,
    navigate,
    isMobileCheckout,
    redirectUrl,
    selectedPlan,
    v,
  ]);

  // Initialize Stripe when loaded
  useEffect(() => {
    if (
      !stripeLoaded ||
      status ||
      isValidatingUser ||
      authLoading ||
      (isMobileCheckout && !hasLegacyMobileSessionParams)
    ) {
      return;
    }

    // CRITICAL FIX: If auth has loaded and we have a user, wait for validateUserId to set validatedUserId
    // This prevents race condition where Stripe init runs before validateUserId completes
    if (!authLoading && user && !validatedUserId) {
      return;
    }

    const initializeStripe = async () => {
      try {
        setCheckoutLoading(true);
        setPaymentStatus("processing");

        // @ts-ignore - Stripe is loaded via script tag and window.Stripe is available
        const stripeKey = (import.meta as any).env
          ?.VITE_STRIPE_PUBLISHABLE_KEY as string;
        // @ts-ignore
        const stripe = window.Stripe(stripeKey);

        // Check if we have a validated user ID (either from auth or param)
        if (!validatedUserId) {
          console.error(
            "❌ REDIRECT TO REGISTER: No validated user ID available",
          );
          console.error(
            "This should NOT happen if guards are working correctly!",
          );
          setPaymentStatus("failed");

          // Build redirect URL preserving all query parameters
          const redirectParams = new URLSearchParams();
          redirectParams.set("plan", selectedPlan);
          if (!isLifetimePlan) redirectParams.set("billing", selectedBilling);
          if (promo) redirectParams.set("promo", promo);

          navigate({
            to: "/register",
            search: {
              redirect: `/checkout?${redirectParams.toString()}`,
              code: undefined,
              trial: false,
            },
          });
          throw new Error("User authentication required to make a purchase");
        }

        // Get the current origin safely
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";

        // Add status parameters to URLs
        const successUrl =
          isMobileCheckout && redirectUrl
            ? `${redirectUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`
            : (() => {
                const params = new URLSearchParams();
                params.set("status", "success");
                // DO NOT encode the Stripe placeholder; append it raw at the end
                params.set("plan", selectedPlan);
                if (!isLifetimePlan) params.set("billing", selectedBilling);
                if (promo) params.set("promo", promo);
                if (source) params.set("source", source);
                if (redirectUrl) params.set("redirectUrl", redirectUrl);
                return `${origin}/checkout?${params.toString()}&session_id={CHECKOUT_SESSION_ID}`;
              })();

        const cancelUrl =
          isMobileCheckout && redirectUrl
            ? `${redirectUrl}?status=canceled&session_id={CHECKOUT_SESSION_ID}`
            : (() => {
                const params = new URLSearchParams();
                params.set("status", "canceled");
                // DO NOT encode the Stripe placeholder; append it raw at the end
                params.set("plan", selectedPlan);
                if (!isLifetimePlan) params.set("billing", selectedBilling);
                if (promo) params.set("promo", promo);
                if (source) params.set("source", source);
                return `${origin}/checkout?${params.toString()}&session_id={CHECKOUT_SESSION_ID}`;
              })();

        // Create a payment session on the server
        // CRITICAL: Verify we have an active session before calling Edge Function
        const activeSession = await supabase.auth.getSession();

        if (!activeSession.data.session) {
          console.error(
            "No active session when calling create-checkout-session",
          );
          setPaymentStatus("failed");
          throw new Error(
            "Authentication session expired. Please try again from the app.",
          );
        }

        const checkoutBody: any = {
          plan: selectedPlan,
          promoCode: promo,
          successUrl,
          cancelUrl,
          // Pass the validated user ID to the server (either from auth or validated param)
          userId: validatedUserId,
          country: checkoutCountry,
          currency: checkoutCurrency,
          // NOTE: Trial eligibility is determined by backend based on subscription history
        };
        if (!isLifetimePlan) {
          checkoutBody.billingInterval = selectedBilling;
        }

        // Get the current session for auth header
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        // Use raw fetch to have full control over error response handling
        // Get Supabase URL from the client's internal URL or use hardcoded fallback
        const supabaseUrl =
          (supabase as any).supabaseUrl ||
          (supabase as any).rest?.url?.replace("/rest/v1", "") ||
          "https://qbuynyxyemigtnvdujts.supabase.co";
        const functionUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

        const fetchResponse = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(checkoutBody),
        });

        // Parse the response body
        const data = await fetchResponse.json();

        // Handle error responses
        if (!fetchResponse.ok) {
          const errorMessage =
            data?.error || "Failed to create checkout session";
          const errorDetails = data?.details || null;
          const code = data?.code;

          console.error("Edge Function error:", {
            errorMessage,
            errorDetails,
            code,
            status: fetchResponse.status,
          });

          if (code === "SUBSCRIPTION_MANAGED_IN_APP") {
            setPaymentStatus("failed");
            setError(
              "Your subscription is managed through an in-app purchase. Please manage billing in the App Store / Play Store.",
            );
            setCheckoutLoading(false);
            return;
          }

          if (code === "BOUND_TO_HOUSEHOLD") {
            setPaymentStatus("failed");
            setError(
              "You are currently sharing a household subscription. Please leave the household first to manage your own subscription.",
            );
            setCheckoutLoading(false);
            return;
          }

          setPaymentStatus("failed");
          // Use the detailed error message from the response body
          const displayError = errorDetails
            ? `${errorMessage}: ${errorDetails}`
            : errorMessage;
          throw new Error(displayError);
        }

        // Check if we have a client secret or checkout URL
        if (!data) {
          console.error("No response data from server");
          setPaymentStatus("failed");
          throw new Error("No response from server");
        }

        // For discount functionality, redirect to Stripe hosted checkout
        if (data.checkoutUrl) {
          // Redirect to Stripe hosted checkout (only in browser)
          if (typeof window !== "undefined") {
            window.location.href = data.checkoutUrl;
          }
          return;
        }

        // If no checkout URL, try to use client secret for Express Checkout
        if (!data.clientSecret) {
          console.error("No client secret or checkout URL in response");
          setPaymentStatus("failed");
          throw new Error("Invalid payment session. Please try again.");
        }

        // Only use Express Checkout if no promo code (to avoid client secret issues)
        if (!promo) {
          // Configure Stripe Elements
          const options = {
            clientSecret: data.clientSecret,
            appearance: {
              theme: "stripe" as const,
              variables: {
                colorPrimary: "#10b981",
                colorBackground: "#ffffff",
                colorText: "#1f2937",
                colorDanger: "#ef4444",
                fontFamily: "Inter, system-ui, sans-serif",
                spacingUnit: "4px",
                borderRadius: "8px",
              },
            },
            expressCheckout: {
              buttonType: "pay",
            },
            onComplete: () => {
              setPaymentStatus("success");
              toast.success("Payment successful!");
            },
          };

          // Create and mount Express Checkout Element
          const elements = stripe.elements(options);
          const expressCheckoutElement = elements.create("expressCheckout");
          expressCheckoutElement.mount("#express-checkout-element");
        } else {
          // If promo code is present but no checkout URL, show error
          console.error("Promo code present but no checkout URL provided");
          setPaymentStatus("failed");
          throw new Error(
            "Promo code checkout not properly configured. Please try again.",
          );
        }

        setCheckoutLoading(false);
      } catch (err: unknown) {
        console.error("❌ Error initializing Stripe:", err);
        setPaymentStatus("failed");
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while initializing payment. Please try again.",
        );
        setCheckoutLoading(false);
        // NOTE: We no longer redirect to register on errors - user is already authenticated
        // The error will be displayed on the page for them to retry
      }
    };

    initializeStripe();
  }, [
    authLoading,
    user,
    stripeLoaded,
    selectedPlan,
    selectedBilling,
    isLifetimePlan,
    navigate,
    validatedUserId,
    status,
    isValidatingUser,
    isMobileCheckout,
    hasLegacyMobileSessionParams,
    redirectUrl,
    source,
    promo,
    checkoutCountry,
    checkoutCurrency,
  ]);

  // Render success state
  const renderSuccess = () => (
    <motion.div
      variants={itemVariants}
      className="space-y-6 rounded-3xl bg-green-50/50 p-8 dark:bg-green-950/30"
    >
      <div className="flex items-start gap-4">
        <div className="bg-success/10 dark:bg-success/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <CheckCircle className="text-success h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-foreground text-2xl font-light">
            Payment Successful
          </h3>
          <p className="text-muted-foreground-color">
            Thank you for choosing Moneko {selectedPlanLabel}. Your{" "}
            {isLifetimePlan ? "lifetime access is" : "Plus features are"} now
            active.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {isMobileCheckout && redirectUrl ? (
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = `${redirectUrl}?status=success${v ? `&v=${encodeURIComponent(v)}` : ""}&plan=${selectedPlan}`;
              }
            }}
            size="lg"
            className="rounded-full"
          >
            Return to App <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => navigate({ to: "/dashboard" })}
            size="lg"
            className="rounded-full"
          >
            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );

  // Render error/failed state
  const renderError = () => (
    <motion.div
      variants={itemVariants}
      className="bg-danger-light/30 dark:bg-danger-light/20 space-y-6 rounded-3xl p-8"
    >
      <div className="flex items-start gap-4">
        <div className="bg-danger/10 dark:bg-danger/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <XCircle className="text-danger h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-foreground text-2xl font-light">
            Payment Failed
          </h3>
          <p className="text-muted-foreground-color">
            {error ||
              "We couldn't process your payment. Please try again or contact support if the problem persists."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button
          onClick={() => {
            setPaymentStatus("idle");
            setError(null);
            window.location.reload();
          }}
          variant="outline"
          size="lg"
          className="rounded-full"
        >
          Try Again
        </Button>
        <Button
          onClick={() => navigate({ to: "/pricing" })}
          variant="ghost"
          size="lg"
          className="rounded-full"
        >
          Return to Pricing
        </Button>
      </div>
    </motion.div>
  );

  // Render canceled state
  const renderCanceled = () => (
    <motion.div
      variants={itemVariants}
      className="bg-warning-light/30 dark:bg-warning-light/20 space-y-6 rounded-3xl p-8"
    >
      <div className="flex items-start gap-4">
        <div className="bg-warning/10 dark:bg-warning/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <XCircle className="text-warning h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-foreground text-2xl font-light">
            Payment Canceled
          </h3>
          <p className="text-muted-foreground-color">
            You've canceled the payment process. No charges have been made.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {isMobileCheckout && redirectUrl ? (
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = `${redirectUrl}?status=canceled`;
              }
            }}
            size="lg"
            className="rounded-full"
          >
            Return to App
          </Button>
        ) : (
          <Button
            onClick={() => navigate({ to: "/pricing" })}
            size="lg"
            className="rounded-full"
          >
            Return to Pricing
          </Button>
        )}
      </div>
    </motion.div>
  );

  return (
    <AmbientHaloLayout>
      <div className="min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 md:py-24">
          <motion.div
            initial={prefersReducedMotion ? undefined : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={containerVariants}
            className="space-y-12"
          >
            {/* Header Section */}
            <motion.div
              variants={itemVariants}
              className="space-y-6 text-center"
            >
              <div className="bg-primary/10 dark:bg-primary/20 mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full">
                <Sparkles className="text-primary h-10 w-10" />
              </div>

              <div className="space-y-3">
                <h1 className="text-foreground text-5xl font-light tracking-tight md:text-6xl">
                  Secure Checkout
                </h1>
                <p className="text-muted-foreground-color mx-auto max-w-2xl text-xl">
                  {isLifetimePlan
                    ? "Complete your Moneko Lifetime purchase"
                    : `Subscribe to Moneko ${selectedPlanLabel} and unlock Plus features`}
                </p>
              </div>
            </motion.div>

            {/* Main Content */}
            <div className="bg-moneko-background rounded-3xl p-8 shadow-sm md:p-12">
              {/* Validating State */}
              {isValidatingUser && (
                <motion.div
                  variants={itemVariants}
                  className="flex flex-col items-center justify-center space-y-6 py-16"
                >
                  <Loader2 className="text-primary h-16 w-16 animate-spin" />
                  <div className="space-y-2 text-center">
                    <h3 className="text-foreground text-xl font-medium">
                      Validating account
                    </h3>
                    <p className="text-muted-foreground-color">
                      Please wait while we verify your information...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Loading State */}
              {(checkoutLoading || authLoading) && !isValidatingUser && (
                <motion.div
                  variants={itemVariants}
                  className="flex flex-col items-center justify-center space-y-6 py-16"
                >
                  <Loader2 className="text-primary h-16 w-16 animate-spin" />
                  <div className="space-y-2 text-center">
                    <h3 className="text-foreground text-xl font-medium">
                      Preparing checkout
                    </h3>
                    <p className="text-muted-foreground-color">
                      Setting up your secure payment form...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Error State (only when not in a payment status) */}
              {error && !isValidatingUser && paymentStatus === "idle" && (
                <motion.div
                  variants={itemVariants}
                  className="bg-danger-light/30 dark:bg-danger-light/20 space-y-6 rounded-3xl p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-danger/10 dark:bg-danger/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                      <XCircle className="text-danger h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-foreground text-2xl font-light">
                        Unable to proceed
                      </h3>
                      <p className="text-muted-foreground-color">{error}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {isMobileCheckout && redirectUrl ? (
                      <Button
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.location.href = `${redirectUrl}?status=error&message=${encodeURIComponent(error)}`;
                          }
                        }}
                        size="lg"
                        className="rounded-full"
                      >
                        Return to App
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate({ to: "/pricing" })}
                        size="lg"
                        className="rounded-full"
                      >
                        Return to Pricing
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Payment Status */}
              {paymentStatus === "success" && renderSuccess()}
              {paymentStatus === "failed" && renderError()}
              {paymentStatus === "canceled" && renderCanceled()}

              {/* Checkout Form */}
              {!checkoutLoading &&
                !authLoading &&
                !error &&
                !isValidatingUser &&
                paymentStatus === "idle" && (
                  <motion.div variants={itemVariants} className="space-y-8">
                    <div
                      id="express-checkout-element"
                      className="min-h-[240px]"
                    >
                      {/* Stripe Express Checkout Element will be mounted here */}
                    </div>

                    <div className="border-subtle-border border-t pt-6 text-center">
                      {isMobileCheckout && redirectUrl ? (
                        <button
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.location.href = `${redirectUrl}?status=canceled`;
                            }
                          }}
                          className="text-muted-foreground-color hover:text-foreground text-sm transition-colors duration-200"
                        >
                          Cancel and return to app
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate({ to: "/pricing" })}
                          className="text-muted-foreground-color hover:text-foreground text-sm transition-colors duration-200"
                        >
                          Cancel and return to pricing
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
            </div>

            {/* Security Footer */}
            {paymentStatus === "idle" && !error && (
              <motion.div
                variants={itemVariants}
                className="text-muted-foreground-color flex flex-wrap items-center justify-center gap-8 pt-8 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>PCI DSS compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Powered by Stripe</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}
