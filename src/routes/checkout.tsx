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
import { CheckCircle, XCircle, Loader2, Sparkles, Shield, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";

// Define the search params type for this route
type CheckoutSearchParams = {
  plan?: string;
  billing?: string;
  promo?: string; // Promo code
  status?: string; // Payment status: success, failed, canceled
  session_id?: string; // Stripe session ID for status verification
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

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  loader: () => {
    return {
      meta: seo({
        title: "Checkout | Moneko",
        description: "Complete your subscription purchase.",
      })
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
  const searchParams = useSearch({ strict: false });
  const { 
    plan = "plus", 
    billing = "monthly", 
    promo, 
    status, 
    session_id, 
    userId: paramUserId,
    source,
    redirectUrl,
    accessToken,
    refreshToken
  } = searchParams;
  
  // Debug log to see what we're receiving
  console.log('Checkout page search params:', searchParams);
  console.log('Billing interval:', billing);
  
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null);
  const [isValidatingUser, setIsValidatingUser] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed" | "canceled"
  >(
    status === "success" ? "success" :
      status === "failed" ? "failed" :
        status === "canceled" ? "canceled" : "idle"
  );

  // Determine if this is a mobile checkout
  const isMobileCheckout = source === 'mobile' || !!redirectUrl;

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
      setIsLoading(false);
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
    const validateUserId = async () => {
      // If user is logged in, use their ID
      if (user?.id) {
        setValidatedUserId(user.id);
        return;
      }

      // For mobile checkout with access token: Set up authenticated session
      if (accessToken && refreshToken && !user && isMobileCheckout) {
        setIsValidatingUser(true);
        setIsLoading(true);

        try {
          console.log('Mobile checkout: Setting session from provided tokens');
          
          // Set the session using tokens from mobile app
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !sessionData.session) {
            console.error('Failed to set session:', sessionError);
            setError('Unable to authenticate for mobile checkout. Please try again from the app.');
            setIsLoading(false);
            setIsValidatingUser(false);
            return;
          }

          console.log('Mobile user authenticated in browser:', sessionData.session.user.id);
          
          // CRITICAL: Wait a moment for session to propagate through Supabase client
          // This ensures the JWT token is included in subsequent Edge Function calls
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify session is actually set in Supabase client
          const currentSession = await supabase.auth.getSession();
          if (!currentSession.data.session) {
            console.error('Session not set in Supabase client after setSession call');
            setError('Failed to establish authenticated session. Please try again.');
            setIsLoading(false);
            setIsValidatingUser(false);
            return;
          }
          
          console.log('Session verified in Supabase client:', currentSession.data.session.user.id);
          setValidatedUserId(sessionData.session.user.id);
          setIsValidatingUser(false);
          setIsLoading(false);
        } catch (err) {
          console.error('Error authenticating mobile user:', err);
          setError('Failed to authenticate for mobile checkout. Please try again.');
          setIsLoading(false);
          setIsValidatingUser(false);
        }
        return;
      }

      // If no user is logged in but userId param is provided (old flow - not secure)
      if (paramUserId && !user && !accessToken) {
        setIsValidatingUser(true);
        setIsLoading(true);

        try {
          // Check if the userId exists in the database
          const { data, error: dbError } = await supabase
            .from('users')
            .select('id')
            .eq('id', paramUserId)
            .single();

          if (dbError || !data) {
            console.error('Invalid userId provided:', paramUserId, dbError);
            setError('Invalid user ID. Please ensure you have a valid account.');
            setIsLoading(false);
            setIsValidatingUser(false);
            return;
          }

          // UserId is valid, now check if they already have an active subscription
          console.log('UserId validated successfully:', paramUserId);
          
          // Check for existing subscription
          const { data: subscriptionData, error: subError } = await supabase
            .from('subscriptions')
            .select('status, end_date')
            .eq('user_id', paramUserId)
            .in('status', ['active', 'trialing'])
            .single();

          if (subscriptionData && !subError) {
            console.log('User already has an active subscription');
            setError('This account already has an active subscription.');
            setIsLoading(false);
            setIsValidatingUser(false);
            return;
          }

          setValidatedUserId(paramUserId);
          setIsValidatingUser(false);
          setIsLoading(false);
        } catch (err) {
          console.error('Error validating userId:', err);
          setError('Failed to validate user. Please try again.');
          setIsLoading(false);
          setIsValidatingUser(false);
        }
      } else if (!user && !paramUserId) {
        // No user logged in and no userId provided
        setError('Authentication required. Please log in to continue.');
        setIsLoading(false);
      }
    };

    // Only validate if we're not handling a status callback
    if (!status) {
      validateUserId();
    }
  }, [user, paramUserId, status, accessToken, refreshToken, isMobileCheckout]);

  // Handle payment status verification when returning from Stripe checkout
  useEffect(() => {
    // Handle payment status from URL parameters
    if (status) {
      // If this is a mobile checkout with redirectUrl, handle differently
      if (isMobileCheckout && redirectUrl && typeof window !== 'undefined') {
        if (status === "success") {
          // Redirect directly to mobile app with success status
          window.location.href = `${redirectUrl}?status=success${session_id ? `&session_id=${session_id}` : ''}`;
          return;
        } else if (status === "failed") {
          window.location.href = `${redirectUrl}?status=failed&error=${encodeURIComponent('Payment failed')}`;
          return;
        } else if (status === "canceled") {
          window.location.href = `${redirectUrl}?status=canceled`;
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
  }, [session_id, status, navigate, isMobileCheckout, redirectUrl]);

  // Initialize Stripe when loaded
  useEffect(() => {
    // Don't initialize Stripe if we're handling a payment status callback
    // or if we're still validating the user
    if (!stripeLoaded || status || isValidatingUser) return;

    const initializeStripe = async () => {
      try {
        setIsLoading(true);
        setPaymentStatus("processing");

        // @ts-ignore - Stripe is loaded via script tag and window.Stripe is available
        const stripeKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string;
        // @ts-ignore
        const stripe = window.Stripe(stripeKey);
        console.log("Stripe loaded with key:", stripeKey ? "✓" : "✗")

        // Check if we have a validated user ID (either from auth or param)
        if (!validatedUserId) {
          console.error("No validated user ID available");
          setPaymentStatus("failed");
          navigate({ to: "/register", search: { redirect: `/checkout?plan=${plan}` } });
          throw new Error("User authentication required to make a purchase");
        }

        // Get the current origin safely
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        
        // Build success and cancel URLs with proper parameters
        const baseSuccessUrl = isMobileCheckout && redirectUrl 
          ? redirectUrl 
          : `${origin}/checkout`;
        
        const baseCancelUrl = isMobileCheckout && redirectUrl
          ? redirectUrl
          : `${origin}/checkout`;

        // Add status parameters to URLs
        const successUrl = isMobileCheckout && redirectUrl
          ? `${redirectUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`
          : `${origin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}${source ? `&source=${source}` : ''}${redirectUrl ? `&redirectUrl=${encodeURIComponent(redirectUrl)}` : ''}`;
        
        const cancelUrl = isMobileCheckout && redirectUrl
          ? `${redirectUrl}?status=canceled&session_id={CHECKOUT_SESSION_ID}`
          : `${origin}/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}${source ? `&source=${source}` : ''}`;
        
        // Create a payment session on the server
        console.log('Creating Stripe session with billing interval:', billing);
        console.log('Using validated userId:', validatedUserId);
        console.log('Is mobile checkout:', isMobileCheckout);
        
        // CRITICAL: Verify we have an active session before calling Edge Function
        const activeSession = await supabase.auth.getSession();
        console.log('Current session before Edge Function call:', {
          hasSession: !!activeSession.data.session,
          userId: activeSession.data.session?.user?.id,
          expiresAt: activeSession.data.session?.expires_at,
        });
        
        if (!activeSession.data.session) {
          console.error('No active session when calling create-checkout-session');
          setPaymentStatus("failed");
          throw new Error("Authentication session expired. Please try again from the app.");
        }
        
        const { data, error } = await supabase.functions.invoke("create-checkout-session", {
          method: "POST",
          body: {
            plan,
            billingInterval: billing,
            promoCode: promo,
            successUrl,
            cancelUrl,
            // Pass the validated user ID to the server (either from auth or validated param)
            userId: validatedUserId,
            // NOTE: Trial eligibility is determined by backend based on subscription history
          },
        });
        
        console.log('Stripe session created with response:', { data, error });

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
          if (typeof window !== 'undefined') {
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
          throw new Error("Promo code checkout not properly configured. Please try again.");
        }

        setIsLoading(false);
      } catch (err: unknown) {
        console.error("Error initializing Stripe:", err);
        setPaymentStatus("failed");
        setError(err instanceof Error ? err.message : "An error occurred while initializing payment. Please try again.");
        setIsLoading(false);
      }
    };

    initializeStripe();
  }, [stripeLoaded, plan, billing, navigate, validatedUserId, status, isValidatingUser, isMobileCheckout, redirectUrl, source, promo]);

  // Render success state
  const renderSuccess = () => (
    <motion.div
      variants={itemVariants}
      className="bg-green-50/50 dark:bg-green-950/30 rounded-3xl p-8 space-y-6"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-success/10 dark:bg-success/20 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-2xl font-light text-foreground">Payment Successful</h3>
          <p className="text-muted-foreground-color">
            Thank you for subscribing to Moneko {plan.charAt(0).toUpperCase() + plan.slice(1)}. Your premium features are now active.
          </p>
        </div>
      </div>
      
      <div className="flex gap-4">
        {isMobileCheckout && redirectUrl ? (
          <Button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = `${redirectUrl}?status=success&plan=${plan}`;
              }
            }}
            size="lg"
            className="rounded-full"
          >
            Return to App <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        ) : (
          <Button 
            onClick={() => navigate({ to: "/dashboard" })}
            size="lg"
            className="rounded-full"
          >
            Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );

  // Render error/failed state
  const renderError = () => (
    <motion.div
      variants={itemVariants}
      className="bg-danger-light/30 dark:bg-danger-light/20 rounded-3xl p-8 space-y-6"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-danger/10 dark:bg-danger/20 flex items-center justify-center">
          <XCircle className="w-6 h-6 text-danger" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-2xl font-light text-foreground">Payment Failed</h3>
          <p className="text-muted-foreground-color">
            {error || "We couldn't process your payment. Please try again or contact support if the problem persists."}
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => {
            setPaymentStatus('idle');
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
      className="bg-warning-light/30 dark:bg-warning-light/20 rounded-3xl p-8 space-y-6"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-warning/10 dark:bg-warning/20 flex items-center justify-center">
          <XCircle className="w-6 h-6 text-warning" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-2xl font-light text-foreground">Payment Canceled</h3>
          <p className="text-muted-foreground-color">
            You've canceled the payment process. No charges have been made.
          </p>
        </div>
      </div>
      
      <div className="flex gap-4">
        {isMobileCheckout && redirectUrl ? (
          <Button 
            onClick={() => {
              if (typeof window !== 'undefined') {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 md:py-24">
          <motion.div
            initial={prefersReducedMotion ? undefined : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={containerVariants}
            className="space-y-12"
          >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-5xl md:text-6xl font-light text-foreground tracking-tight">
                  Secure Checkout
                </h1>
                <p className="text-xl text-muted-foreground-color max-w-2xl mx-auto">
                  Subscribe to Moneko {plan.charAt(0).toUpperCase() + plan.slice(1)} and unlock premium features
                </p>
              </div>
            </motion.div>

            {/* Main Content */}
            <div className="bg-moneko-background rounded-3xl p-8 md:p-12 shadow-sm">
              {/* Validating State */}
              {isValidatingUser && (
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-16 space-y-6">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-medium text-foreground">Validating account</h3>
                    <p className="text-muted-foreground-color">Please wait while we verify your information...</p>
                  </div>
                </motion.div>
              )}

              {/* Loading State */}
              {isLoading && !isValidatingUser && (
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-16 space-y-6">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-medium text-foreground">Preparing checkout</h3>
                    <p className="text-muted-foreground-color">Setting up your secure payment form...</p>
                  </div>
                </motion.div>
              )}

              {/* Error State */}
              {error && !isValidatingUser && (
                <motion.div variants={itemVariants} className="bg-danger-light/30 dark:bg-danger-light/20 rounded-3xl p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-danger/10 dark:bg-danger/20 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-danger" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-2xl font-light text-foreground">Unable to proceed</h3>
                      <p className="text-muted-foreground-color">{error}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    {isMobileCheckout && redirectUrl ? (
                      <Button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
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
              {!isLoading && !error && !isValidatingUser && paymentStatus === "idle" && (
                <motion.div variants={itemVariants} className="space-y-8">
                  <div id="express-checkout-element" className="min-h-[240px]">
                    {/* Stripe Express Checkout Element will be mounted here */}
                  </div>
                  
                  <div className="text-center pt-6 border-t border-subtle-border">
                    {isMobileCheckout && redirectUrl ? (
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.location.href = `${redirectUrl}?status=canceled`;
                          }
                        }}
                        className="text-sm text-muted-foreground-color hover:text-foreground transition-colors duration-200"
                      >
                        Cancel and return to app
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate({ to: "/pricing" })}
                        className="text-sm text-muted-foreground-color hover:text-foreground transition-colors duration-200"
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
              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-muted-foreground-color">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>PCI DSS compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
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
