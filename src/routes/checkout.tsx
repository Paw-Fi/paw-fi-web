import { createFileRoute, FileRoutesByPath } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { seo } from "@/utils/seo";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { faCheckCircle, faXmarkCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Define the search params type for this route
type CheckoutSearchParams = {
  plan?: string;
  billing?: string;
  status?: string; // Payment status: success, failed, canceled
  session_id?: string; // Stripe session ID for status verification
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
  head: () => {
    const pageUrl = "https://moneko.io/checkout";
    const meta = seo({
      title: "Checkout | Moneko",
      description: "Complete your subscription purchase",
      keywords: "checkout, payment, subscription, moneko",
      image: "https://moneko.io/og-pricing.png",
      url: pageUrl,
    });

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function CheckoutPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();
  // Get search params from URL directly to avoid TypeScript issues
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get('plan') || "plus";
  const billing = urlParams.get('billing') || "yearly";
  const status = urlParams.get('status');
  const sessionId = urlParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'canceled'>(
    status === 'success' ? 'success' : 
    status === 'failed' ? 'failed' : 
    status === 'canceled' ? 'canceled' : 'idle'
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

  // Handle payment status verification when returning from Stripe checkout
  useEffect(() => {
    // Handle payment status from URL parameters
    if (status) {
      if (status === 'success' && sessionId) {
        // Redirect to payment status page with session ID
        navigate({ 
          to: '/payment-status', 
          search: { 
            status: 'success', 
            session_id: sessionId 
          } 
        });
        return;
      } else if (status === 'failed') {
        // Redirect to payment status page with error
        navigate({ 
          to: '/payment-status', 
          search: { 
            status: 'failed', 
            error: 'Payment failed. Please try again.' 
          } 
        });
        return;
      } else if (status === 'canceled') {
        // Redirect to payment status page
        navigate({ 
          to: '/payment-status', 
          search: { 
            status: 'canceled' 
          } 
        });
        return;
      }
    }
    // If we have status parameters but didn't match any of the above conditions,
    // don't proceed with Stripe initialization
    if (status) {
      return;
    }
  }, [sessionId, status, navigate]);

  // Initialize Stripe and Express Checkout Element
  useEffect(() => {
    // Don't initialize Stripe if we're handling a payment status callback
    if (!stripeLoaded || status) return;

    const initializeStripe = async () => {
      try {
        setIsLoading(true);
        setPaymentStatus('processing');
        
        // @ts-ignore - Stripe is loaded via script tag
        const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
        
        // Create a payment session on the server
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          method: 'POST',
          body: {
            plan,
            billingInterval: billing,
            // Add the success and cancel URLs with status parameters
            successUrl: `${window.location.origin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}`,
          },
        });
        
        if (error) {
          console.error('Supabase function error:', error);
          setPaymentStatus('failed');
          throw new Error(error.message || "Failed to create checkout session");
        }
        
        // Check if we have a client secret or checkout URL
        if (!data) {
          console.error('No response data from server');
          setPaymentStatus('failed');
          throw new Error("No response from server");
        }
        
        console.log('Response from server:', data);
        
        // If we have a checkout URL but no client secret, redirect to Stripe hosted checkout
        if (!data.clientSecret && data.checkoutUrl) {
          console.log('No client secret, redirecting to Stripe hosted checkout:', data.checkoutUrl);
          toast.info("Redirecting to Stripe checkout...");
          window.location.href = data.checkoutUrl;
          return;
        }
        
        // If we have no client secret and no checkout URL, show error
        if (!data.clientSecret && !data.checkoutUrl) {
          console.error('Invalid response data - no client secret or checkout URL:', data);
          setPaymentStatus('failed');
          throw new Error("Invalid response from server - missing payment information");
        }
        
        const { clientSecret } = data;
        
        // Initialize Express Checkout Element
        const options = {
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#6366f1',
              colorBackground: '#ffffff',
              colorText: '#1f2937',
              colorDanger: '#ef4444',
              fontFamily: 'system-ui, sans-serif',
              spacingUnit: '4px',
              borderRadius: '8px',
            },
          },
          // Customize the Express Checkout Element
          expressCheckout: {
            buttonType: {
              applePay: "buy",
              googlePay: "buy",
            },
          },
          // Handle successful payment
          onComplete: () => {
            setPaymentStatus('success');
            toast.success("Payment successful! Redirecting to your dashboard...");
            setTimeout(() => {
              window.location.href = "/dashboard?payment=success";
            }, 2000);
          },
        };
        
        // Mount the Express Checkout Element
        const elements = stripe.elements(options);
        const expressCheckoutElement = elements.create('expressCheckout');
        expressCheckoutElement.mount('#express-checkout-element');
        
        setIsLoading(false);
      } catch (err: unknown) {
        console.error('Error initializing Stripe:', err);
        setPaymentStatus('failed');
        setError(err instanceof Error ? err.message : "An error occurred while initializing payment. Please try again.");
        setIsLoading(false);
      }
    };

    initializeStripe();
  }, [stripeLoaded, plan, billing, status, navigate]);

  // Helper function to render payment status UI
  const renderPaymentStatus = () => {
    switch (paymentStatus) {
      case 'success':
        return (
          <Alert variant="success" className="mb-6">
            <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-green-500" />
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
            <FontAwesomeIcon icon={faXmarkCircle} className="h-5 w-5 text-red-500" />
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
            <FontAwesomeIcon icon={faXmarkCircle} className="h-5 w-5 text-red-500" />
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
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Complete Your Purchase
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You're subscribing to the {plan.charAt(0).toUpperCase() + plan.slice(1)} plan
            </p>
          </div>

          <div className="rounded-xl border border-white/30 bg-slate-50/60 p-8 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading payment form...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => navigate({ to: "/pricing" })}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Return to Pricing
                </button>
              </div>
            )}

            {renderPaymentStatus()}

            {!isLoading && !error && (
              <>
                <div id="express-checkout-element" className="mb-6">
                  {/* Stripe Express Checkout Element will be mounted here */}
                </div>
                
                <div className="mt-6 text-center">
                  <button
                    onClick={() => navigate({ to: "/pricing" })}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Cancel and return to pricing
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AmbientHaloLayout>
  );
}
