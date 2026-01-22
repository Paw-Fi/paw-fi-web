import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { seo } from "@/utils/seo";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
  faCircleExclamation,
  faClock,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the search params type for this route
type PaymentStatusSearchParams = {
  status?: string; // Payment status: success, failed, canceled, pending, etc.
  session_id?: string; // Stripe session ID for status verification
  subscription_id?: string; // Stripe subscription ID
  v?: string; // Public verification nonce for logged-out verify-payment
  error?: string; // Error message
};

export const Route = createFileRoute("/payment-status")({
  validateSearch: (
    search: Record<string, unknown>,
  ): PaymentStatusSearchParams => {
    return {
      status: search.status as string | undefined,
      session_id: search.session_id as string | undefined,
      subscription_id: search.subscription_id as string | undefined,
      v: search.v as string | undefined,
      error: search.error as string | undefined,
    };
  },
  component: PaymentStatusPage,
  beforeLoad: () => {
    return {
      ...seo({
        title: "Payment Status | Moneko",
        description: "Check the status of your subscription payment",
      }),
    };
  },
});

function PaymentStatusPage() {
  const search = useSearch({ from: "/payment-status" });
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<string>(
    search.status || "pending",
  );
  const [error, setError] = useState<string | null>(search.error || null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      // If we have a session ID, verify the payment
      if (search.session_id && search.status === "success") {
        try {
          setIsLoading(true);

          // Stripe/webhook write can lag the redirect; poll briefly.
          for (let attempt = 0; attempt < 8; attempt++) {
            const { data, error } = await supabase.functions.invoke(
              "verify-payment",
              {
                body: { sessionId: search.session_id, v: search.v },
              },
            );

            if (cancelled) return;

            if (error) {
              console.error("Error verifying payment:", error);
              setPaymentStatus("failed");
              setError(error.message || "Failed to verify payment status");
              setIsLoading(false);
              return;
            }

            if (data?.verified) {
              setPaymentStatus("success");
              setSubscriptionDetails(data.subscription);
              toast.success(
                "Payment successful! Your subscription is now active.",
              );
              setIsLoading(false);
              return;
            }

            setPaymentStatus("pending");
            setError(data?.message || "Payment is still processing");
            await new Promise((resolve) =>
              setTimeout(
                resolve,
                attempt < 2 ? 1000 : attempt < 5 ? 2000 : 3000,
              ),
            );
          }

          setIsLoading(false);
        } catch (err: unknown) {
          console.error("Error verifying payment:", err);
          if (cancelled) return;
          setPaymentStatus("failed");
          setError(
            err instanceof Error
              ? err.message
              : "Failed to verify payment status",
          );
          setIsLoading(false);
        }
      } else {
        // No session ID or not success status, just show the current status
        setIsLoading(false);
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [search.session_id, search.status]);

  useEffect(() => {
    setPaymentStatus(search.status || "pending");
  }, [search.status]);

  // Format subscription period end date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
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
              Payment Status
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Check the status of your subscription payment
            </p>
          </div>

          <div className="">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Verifying payment status...
                </p>

                <div className="mt-6 w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-700/50 dark:bg-yellow-900/30">
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="mr-2 h-5 w-5 text-yellow-500"
                    />
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Important: Please do not close this page
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Closing this page while verifying your payment may affect
                    your subscription activation.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && (
              <>
                {/* Payment Status Display */}
                {paymentStatus === "success" && (
                  <Alert variant="success" className="mb-6">
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      className="h-5 w-5 text-green-500"
                    />
                    <AlertTitle>Payment Successful!</AlertTitle>
                    <AlertDescription>
                      <p>
                        Thank you for your subscription. Your account has been
                        upgraded.
                      </p>

                      {subscriptionDetails && (
                        <div className="mt-4 rounded-lg bg-white/50 p-4 dark:bg-slate-800/50">
                          <h3 className="mb-2 font-semibold">
                            Subscription Details
                          </h3>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center justify-between">
                              <span>Plan:</span>
                              <span className="font-medium">
                                {subscriptionDetails.plan}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>Status:</span>
                              <span className="font-medium">
                                {subscriptionDetails.status}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>Current Period Ends:</span>
                              <span className="font-medium">
                                {subscriptionDetails.current_period_end
                                  ? formatDate(
                                      subscriptionDetails.current_period_end,
                                    )
                                  : "No expiry (lifetime)"}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>Auto-Renew:</span>
                              <span className="font-medium">
                                {subscriptionDetails.cancel_at_period_end
                                  ? "No"
                                  : "Yes"}
                              </span>
                            </li>
                          </ul>
                        </div>
                      )}

                      <Button
                        onClick={() => navigate({ to: "/dashboard" })}
                        className="mt-4"
                      >
                        Go to Dashboard
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {paymentStatus === "failed" && (
                  <Alert variant="destructive" className="mb-6">
                    <FontAwesomeIcon
                      icon={faCircleXmark}
                      className="h-5 w-5 text-red-500"
                    />
                    <AlertTitle>Payment Failed</AlertTitle>
                    <AlertDescription>
                      <p>
                        We couldn't process your payment.{" "}
                        {error && `Error: ${error}`}
                      </p>
                      <p className="mt-2">
                        Please try again or contact support if the problem
                        persists.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4">
                        <Button
                          onClick={() => navigate({ to: "/pricing" })}
                          variant="outline"
                        >
                          Return to Pricing
                        </Button>
                        <Button
                          onClick={() =>
                            (window.location.href =
                              "mailto:hello@moneko.io?subject=Payment%20Issue")
                          }
                        >
                          Contact Support
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {paymentStatus === "canceled" && (
                  <Alert className="mb-6">
                    <FontAwesomeIcon
                      icon={faCircleExclamation}
                      className="h-5 w-5 text-blue-500"
                    />
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
                )}

                {paymentStatus === "pending" && (
                  <Alert variant="default" className="mb-6">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="h-5 w-5 text-yellow-500"
                    />
                    <AlertTitle>Payment Processing</AlertTitle>
                    <AlertDescription>
                      <p>
                        Your payment is still being processed. This may take a
                        few moments.
                      </p>
                      <p className="mt-2">
                        You'll receive an email confirmation once the payment is
                        complete.
                      </p>
                      <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-700/50 dark:bg-yellow-900/30">
                        <div className="flex items-center">
                          <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="mr-2 h-5 w-5 text-yellow-500"
                          />
                          <p className="font-medium text-yellow-800 dark:text-yellow-200">
                            Important: Please do not close this page
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                          Closing this page while your payment is processing may
                          affect your subscription activation.
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4">
                        <Button
                          onClick={() => window.location.reload()}
                          variant="outline"
                        >
                          Check Again
                        </Button>
                        <Button onClick={() => navigate({ to: "/dashboard" })}>
                          Go to Dashboard
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Default case for unknown status */}
                {!["success", "failed", "canceled", "pending"].includes(
                  paymentStatus,
                ) && (
                  <Alert variant="default" className="mb-6">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="h-5 w-5 text-yellow-500"
                    />
                    <AlertTitle>Payment Status: {paymentStatus}</AlertTitle>
                    <AlertDescription>
                      <p>We're checking the status of your payment.</p>
                      <div className="mt-4 flex flex-wrap gap-4">
                        <Button onClick={() => navigate({ to: "/dashboard" })}>
                          Go to Dashboard
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Help section */}
                <div className="mt-8 rounded-lg bg-slate-100/50 p-4 dark:bg-slate-800/50">
                  <h3 className="mb-2 text-lg font-semibold">Need Help?</h3>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    If you're experiencing issues with your payment or
                    subscription, our support team is here to help.
                  </p>
                  <Button
                    onClick={() =>
                      (window.location.href = "mailto:hello@moneko.io")
                    }
                    variant="outline"
                    size="sm"
                  >
                    Contact Support
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AmbientHaloLayout>
  );
}
