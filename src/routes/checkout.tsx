import { createFileRoute, FileRoutesByPath } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { seo } from "@/utils/seo";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

// Define the search params type for this route
type CheckoutSearchParams = {
  plan?: string;
  billing?: string;
  promo?: string; // Promo code
  status?: string; // Payment status: success, failed, canceled
  session_id?: string; // Stripe session ID for status verification
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

function CheckoutPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const { plan = "plus", billing = "monthly", promo, status, session_id } = searchParams;
  
  // Debug log to see what we're receiving
  console.log('Checkout page search params:', searchParams);
  console.log('Billing interval:', billing);
  
  const { user } = useAuth();
  const { isActive: hasActiveSub } = useSubscription(user?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed" | "canceled"
  >(
    status === "success" ? "success" :
      status === "failed" ? "failed" :
        status === "canceled" ? "canceled" : "idle"
  );

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

  // If user already has an active subscription and we're not handling a status callback, redirect them
  useEffect(() => {
    if (user && hasActiveSub && !status) {
      toast.info("You already have an active subscription.");
      navigate({ to: "/dashboard" });
    }
  }, [user, hasActiveSub, status, navigate]);

  // Handle payment status verification when returning from Stripe checkout
  useEffect(() => {
    // Handle payment status from URL parameters
    if (status) {
      if (status === "success" && session_id) {
        // Redirect to payment status page with session ID
        navigate({
          to: "/payment-status",
          search: {
            status: "success",
            session_id: session_id,
          },
        });
        return;
      } else if (status === "failed") {
        // Redirect to payment status page with error
        navigate({
          to: "/payment-status",
          search: {
            status: "failed",
            error: "Payment failed. Please try again.",
          },
        });
        return;
      } else if (status === "canceled") {
        // Redirect to payment status page with canceled status
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
  }, [session_id, status, navigate]);

  // Initialize Stripe when loaded
  useEffect(() => {
    // Don't initialize Stripe if we're handling a payment status callback
    if (!stripeLoaded || status) return;

    const initializeStripe = async () => {
      try {
        setIsLoading(true);
        setPaymentStatus("processing");

        // @ts-ignore - Stripe is loaded via script tag and window.Stripe is available
        const stripeKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string;
        // @ts-ignore
        const stripe = window.Stripe(stripeKey);
        console.log("Stripe loaded with key:", stripeKey ? "✓" : "✗")

        // Check if user is logged in
        if (!user || !user.id) {
          console.error("User not logged in or missing ID");
          setPaymentStatus("failed");
          throw new Error("You must be logged in to make a purchase");
        }

        // Get the current origin safely
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        
        // Create a payment session on the server
        console.log('Creating Stripe session with billing interval:', billing);
        
        const { data, error } = await supabase.functions.invoke("create-checkout-session", {
          method: "POST",
          body: {
            plan,
            billingInterval: billing,
            promoCode: promo,
            // Add the success and cancel URLs with status parameters
            successUrl: `${origin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${origin}/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}`,
            // Pass the user ID to the server
            userId: user.id,
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
  }, [stripeLoaded, plan, billing, navigate, user, status]);

  // Helper function to render payment status UI
  const renderPaymentStatus = () => {
    switch (paymentStatus) {
      case "success":
        return (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle>Payment Successful!</AlertTitle>
            <AlertDescription>
              <p>Thank you for your subscription. Your account has been upgraded to the {plan} plan.</p>
              <p className="mt-2">You will be redirected to your dashboard shortly...</p>
              <Button 
                onClick={() => navigate({ to: "/dashboard" })}
                className="mt-4"
              >
                Go to Dashboard
              </Button>
            </AlertDescription>
          </Alert>
        );
      case 'failed':
        return (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-5 w-5" />
            <AlertTitle>Payment Failed</AlertTitle>
            <AlertDescription>
              <p>We couldn't process your payment. {error && `Error: ${error}`}</p>
              <p className="mt-2">Please try again or contact support if the problem persists.</p>
              <div className="flex flex-wrap gap-4 mt-4">
                <Button 
                  onClick={() => {
                    setPaymentStatus('idle');
                    setError(null);
                    window.location.reload();
                  }}
                  variant="outline"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => navigate({ to: "/pricing" })}
                >
                  Return to Pricing
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      case 'canceled':
        return (
          <Alert className="mb-6">
            <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Payment Canceled</AlertTitle>
            <AlertDescription>
              <p>You've canceled the payment process.</p>
              <Button 
                onClick={() => navigate({ to: "/pricing" })}
                className="mt-4"
              >
                Return to Pricing
              </Button>
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <AmbientHaloLayout>
      <div className="container mx-auto min-h-screen px-4 py-12 md:py-20">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl"
        >
          <Card className="border-0 bg-card/60 shadow-2xl backdrop-blur-xl">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-3xl font-bold">
                Complete Your Purchase
              </CardTitle>
              <CardDescription className="text-lg">
                You're subscribing to the {plan.charAt(0).toUpperCase() + plan.slice(1)} plan
              </CardDescription>
              
              <div className="flex flex-wrap items-center justify-center gap-2">
                {promo && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    ✓ Promo code "{promo}" applied
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    Loading payment form...
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-5 w-5" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    <p>{error}</p>
                    <Button
                      onClick={() => navigate({ to: "/pricing" })}
                      variant="outline"
                      className="mt-4"
                    >
                      Return to Pricing
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {renderPaymentStatus()}

              {!isLoading && !error && (
                <>
                  <div id="express-checkout-element" className="min-h-[200px]">
                    {/* Stripe Express Checkout Element will be mounted here */}
                  </div>
                  
                  <div className="text-center">
                    <Button
                      onClick={() => navigate({ to: "/pricing" })}
                      variant="ghost"
                      size="sm"
                    >
                      Cancel and return to pricing
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AmbientHaloLayout>
  );
}
