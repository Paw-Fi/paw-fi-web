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

// Define the search params type for this route
type CheckoutSearchParams = {
  plan?: string;
  billing?: string;
  promo?: string; // Promo code
  status?: string; // Payment status: success, failed, canceled
  session_id?: string; // Stripe session ID for status verification
  v?: string; // Public verification nonce for logged-out verify-payment
  userId?: string; // User ID for mobile app checkout (when user not logged in)
  source?: string; // Source platform: 'mobile' or 'web'
  redirectUrl?: string; // Deep link URL to redirect back to mobile app after success
  accessToken?: string; // JWT access token from mobile app for authentication
  refreshToken?: string; // JWT refresh token from mobile app
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
    userId: paramUserId,
    source,
    redirectUrl,
    accessToken,
    refreshToken,
  } = searchParams;

  // Default to lifetime if plan not provided to avoid user confusion
  const selectedPlan = plan || "lifetime";
  const selectedBilling = billing || "monthly";

  // Debug log to see what we're receiving (avoid logging raw tokens)
  console.log("Checkout page search params:", {
    ...searchParams,
    accessToken: accessToken ? "present" : undefined,
    refreshToken: refreshToken ? "present" : undefined,
  });
  console.log("Plan:", selectedPlan, "(explicit:", plan, ")");
  console.log("Billing interval:", selectedBilling);

  // SECURITY: Log potential issues
  if (!plan && !status) {
    console.warn(
      "⚠️  Checkout accessed without plan parameter - defaulting to lifetime.",
    );
  }

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

  // Determine if this is a mobile checkout
  const isMobileCheckout = source === "mobile" || !!redirectUrl;

  // Strip sensitive tokens from the URL after initial load
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!accessToken && !refreshToken) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("accessToken");
    url.searchParams.delete("refreshToken");
    window.history.replaceState({}, document.title, url.toString());
  }, [accessToken, refreshToken]);

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
    // CRITICAL: Wait for auth context to initialize before making any decisions
    // This prevents infinite redirect loops when returning from OAuth
    if (authLoading || status) {
      console.log("🔒 validateUserId blocked:", { authLoading, status });
      return;
    }

    const validateUserId = async () => {
      console.log("🔍 validateUserId running:", {
        hasUser: !!user?.id,
        userId: user?.id,
      });

      // If user is logged in, use their ID
      if (user?.id) {
        console.log("✅ User authenticated, setting validatedUserId:", user.id);
        setValidatedUserId(user.id);
        setCheckoutLoading(false);
        return;
      }

      // For mobile checkout with access token: Set up authenticated session
      if (accessToken && refreshToken && !user && isMobileCheckout) {
        setIsValidatingUser(true);
        setCheckoutLoading(true);

        try {
          console.log("Mobile checkout: Setting session from provided tokens");

          // Set the session using tokens from mobile app
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError || !sessionData.session) {
            console.error("Failed to set session:", sessionError);
            setError(
              "Unable to authenticate for mobile checkout. Please try again from the app.",
            );
            setCheckoutLoading(false);
            setIsValidatingUser(false);
            return;
          }

          console.log(
            "Mobile user authenticated in browser:",
            sessionData.session.user.id,
          );

          // CRITICAL: Wait a moment for session to propagate through Supabase client
          // This ensures the JWT token is included in subsequent Edge Function calls
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify session is actually set in Supabase client
          const currentSession = await supabase.auth.getSession();
          if (!currentSession.data.session) {
            console.error(
              "Session not set in Supabase client after setSession call",
            );
            setError(
              "Failed to establish authenticated session. Please try again.",
            );
            setCheckoutLoading(false);
            setIsValidatingUser(false);
            return;
          }

          console.log(
            "Session verified in Supabase client:",
            currentSession.data.session.user.id,
          );
          setValidatedUserId(sessionData.session.user.id);
          setIsValidatingUser(false);
          setCheckoutLoading(false);
        } catch (err) {
          console.error("Error authenticating mobile user:", err);
          setError(
            "Failed to authenticate for mobile checkout. Please try again.",
          );
          setCheckoutLoading(false);
          setIsValidatingUser(false);
        }
        return;
      }

      // If no user is logged in but userId param is provided (old flow - not secure)
      if (paramUserId && !user && !accessToken) {
        setIsValidatingUser(true);
        setCheckoutLoading(true);

        try {
          // Check if the userId exists in the database
          const { data, error: dbError } = await supabase
            .from("users")
            .select("id")
            .eq("id", paramUserId)
            .single();

          if (dbError || !data) {
            console.error("Invalid userId provided:", paramUserId, dbError);
            setError(
              "Invalid user ID. Please ensure you have a valid account.",
            );
            setCheckoutLoading(false);
            setIsValidatingUser(false);
            return;
          }

          // UserId is valid, now check if they already have an active subscription
          console.log("UserId validated successfully:", paramUserId);

          // Check for existing subscription
          const { data: subscriptionData, error: subError } = await supabase
            .from("subscriptions")
            .select("status, end_date")
            .eq("user_id", paramUserId)
            .in("status", ["active", "trialing"])
            .single();

          if (subscriptionData && !subError) {
            console.log("User already has an active subscription");
            setError("This account already has an active subscription.");
            setCheckoutLoading(false);
            setIsValidatingUser(false);
            return;
          }

          setValidatedUserId(paramUserId);
          setIsValidatingUser(false);
          setCheckoutLoading(false);
        } catch (err) {
          console.error("Error validating userId:", err);
          setError("Failed to validate user. Please try again.");
          setCheckoutLoading(false);
          setIsValidatingUser(false);
        }
      } else if (!user && !paramUserId) {
        // No user logged in and no userId provided
        setError("Authentication required. Please log in to continue.");
        setCheckoutLoading(false);
      }
    };

    validateUserId();
  }, [
    authLoading,
    user,
    paramUserId,
    status,
    accessToken,
    refreshToken,
    isMobileCheckout,
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
            plan: selectedPlan,
          },
        });
        return;
      } else if (status === "failed") {
        navigate({
          to: "/payment-status",
          search: {
            status: "failed",
            error: "Payment failed. Please try again.",
            plan: selectedPlan,
          },
        });
        return;
      } else if (status === "canceled") {
        navigate({
          to: "/payment-status",
          search: {
            status: "canceled",
            plan: selectedPlan,
          },
        });
      }
    }
    // If we have status parameters but didn't match any of the above conditions,
    // don't proceed with Stripe initialization
    if (status) {
      return;
    }
  }, [session_id, status, navigate, isMobileCheckout, redirectUrl]);

  // Initialize Stripe when loaded
  useEffect(() => {
    console.log("💳 Stripe init effect triggered:", {
      stripeLoaded,
      status,
      isValidatingUser,
      authLoading,
      hasUser: !!user,
      validatedUserId,
    });

    // Don't initialize Stripe if we're handling a payment status callback
    // or if we're still validating the user or if auth is still loading
    // CRITICAL: Wait for auth to fully initialize to prevent redirect loops
    if (!stripeLoaded || status || isValidatingUser || authLoading) {
      console.log("🔒 Stripe init blocked by initial guards");
      return;
    }

    // CRITICAL FIX: If auth has loaded and we have a user, wait for validateUserId to set validatedUserId
    // This prevents race condition where Stripe init runs before validateUserId completes
    if (!authLoading && user && !validatedUserId) {
      console.log(
        "⏳ Waiting for validatedUserId to be set by validateUserId effect...",
      );
      return;
    }

    const initializeStripe = async () => {
      console.log("🚀 Initializing Stripe checkout...");
      try {
        setCheckoutLoading(true);
        setPaymentStatus("processing");

        // @ts-ignore - Stripe is loaded via script tag and window.Stripe is available
        const stripeKey = (import.meta as any).env
          ?.VITE_STRIPE_PUBLISHABLE_KEY as string;
        // @ts-ignore
        const stripe = window.Stripe(stripeKey);
        console.log("Stripe loaded with key:", stripeKey ? "✓" : "✗");

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
          if (selectedBilling) redirectParams.set("billing", selectedBilling);
          if (promo) redirectParams.set("promo", promo);

          navigate({
            to: "/register",
            search: { redirect: `/checkout?${redirectParams.toString()}` },
          });
          throw new Error("User authentication required to make a purchase");
        }

        console.log(
          "✅ Proceeding with Stripe checkout for user:",
          validatedUserId,
        );

        // Get the current origin safely
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";

        // Build success and cancel URLs with proper parameters
        const baseSuccessUrl =
          isMobileCheckout && redirectUrl ? redirectUrl : `${origin}/checkout`;

        const baseCancelUrl =
          isMobileCheckout && redirectUrl ? redirectUrl : `${origin}/checkout`;

        // Add status parameters to URLs
        const successUrl =
          isMobileCheckout && redirectUrl
            ? `${redirectUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`
            : (() => {
                const params = new URLSearchParams();
                params.set("status", "success");
                // DO NOT encode the Stripe placeholder; append it raw at the end
                params.set("plan", selectedPlan);
                if (selectedBilling) params.set("billing", selectedBilling);
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
                if (selectedBilling) params.set("billing", selectedBilling);
                if (promo) params.set("promo", promo);
                if (source) params.set("source", source);
                return `${origin}/checkout?${params.toString()}&session_id={CHECKOUT_SESSION_ID}`;
              })();

        // Create a payment session on the server
        console.log("Creating Stripe session with billing interval:", billing);
        console.log("Using validated userId:", validatedUserId);
        console.log("Is mobile checkout:", isMobileCheckout);

        // CRITICAL: Verify we have an active session before calling Edge Function
        const activeSession = await supabase.auth.getSession();
        console.log("Current session before Edge Function call:", {
          hasSession: !!activeSession.data.session,
          userId: activeSession.data.session?.user?.id,
          expiresAt: activeSession.data.session?.expires_at,
        });

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
          // NOTE: Trial eligibility is determined by backend based on subscription history
        };
        if (selectedPlan !== "lifetime") {
          checkoutBody.billingInterval = selectedBilling;
        }

        const { data, error } = await supabase.functions.invoke(
          "create-checkout-session",
          {
            method: "POST",
            body: checkoutBody,
          },
        );

        console.log("Stripe session created with response:", { data, error });

        if (error) {
          console.error("Supabase function error:", error);
          setPaymentStatus("failed");
          throw new Error(error.message || "Failed to create checkout session");
        }

        // Check if we have a client secret or checkout URL
        if (!data) {
          console.error("No response data from server");
          setPaymentStatus("failed");
          throw new Error("No response from server");
        }

        console.log("Response from server:", data);

        // For discount functionality, redirect to Stripe hosted checkout
        if (data.checkoutUrl) {
          console.log("Redirecting to Stripe hosted checkout");
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
          console.log("Stripe options:", options);

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
    navigate,
    validatedUserId,
    status,
    isValidatingUser,
    isMobileCheckout,
    redirectUrl,
    source,
    promo,
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
            Thank you for subscribing to Moneko{" "}
            {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}. Your
            premium features are now active.
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
                  Subscribe to Moneko{" "}
                  {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}{" "}
                  and unlock premium features
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
                  <span>256-bit SSL encryption</span>
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
