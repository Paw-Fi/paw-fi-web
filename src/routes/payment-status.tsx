import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { seo } from "@/utils/seo";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  HelpCircle,
  Receipt,
  Calendar,
  CreditCard,
  RefreshCw,
  Mail,
} from "lucide-react";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";

// Define the search params type for this route
type PaymentStatusSearchParams = {
  status?: string;
  session_id?: string;
  subscription_id?: string;
  v?: string;
  error?: string;
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
              console.error("Error verifying payment:", { error, data });
              const errorResponse = data as any;
              const errorMessage =
                errorResponse?.error ||
                errorResponse?.details ||
                errorResponse?.message ||
                error.message ||
                "Failed to verify payment status";

              setPaymentStatus("failed");
              setError(errorMessage);
              setIsLoading(false);
              return;
            }

            if (data?.error) {
              console.error("Error in response data:", data);
              const errorMessage =
                data.details || data.error || "Failed to verify payment status";
              setPaymentStatus("failed");
              setError(errorMessage);
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
            err instanceof Error ? err.message : "Failed to verify payment status",
          );
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [search.session_id, search.status, search.v]);

  useEffect(() => {
    // Only update from search param if not loading/verifying
    if (!search.session_id) {
        setPaymentStatus(search.status || "pending");
    }
  }, [search.status, search.session_id]);

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

  const getStatusConfig = () => {
    if (isLoading) {
      return {
        icon: <Loader2 className="h-12 w-12 animate-spin text-blue-500" />,
        title: "Verifying Payment",
        description: "Please wait while we confirm your transaction...",
        color: "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200",
        borderColor: "border-blue-200 dark:border-blue-800",
      };
    }

    switch (paymentStatus) {
      case "success":
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
          title: "Payment Successful",
          description: "Thank you! Your subscription is now active.",
          color: "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200",
          borderColor: "border-emerald-200 dark:border-emerald-800",
        };
      case "failed":
        return {
          icon: <XCircle className="h-12 w-12 text-red-500" />,
          title: "Payment Failed",
          description: error || "We couldn't process your payment.",
          color: "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200",
          borderColor: "border-red-200 dark:border-red-800",
        };
      case "canceled":
        return {
          icon: <AlertCircle className="h-12 w-12 text-gray-500" />,
          title: "Payment Canceled",
          description: "You've canceled the payment process.",
          color: "bg-gray-50 text-gray-900 dark:bg-gray-800/50 dark:text-gray-200",
          borderColor: "border-gray-200 dark:border-gray-700",
        };
      case "pending":
      default:
        return {
          icon: <Loader2 className="h-12 w-12 animate-spin text-amber-500" />,
          title: "Payment Processing",
          description: "Your payment is being processed. This may take a moment.",
          color: "bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200",
          borderColor: "border-amber-200 dark:border-amber-800",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <AmbientHaloLayout>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-lg"
        >
          {/* Main Card */}
          <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
            {/* Header Section */}
            <div className="flex flex-col items-center p-8 pb-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1,
                }}
                className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${config.color.split(" ")[0]}`}
              >
                {config.icon}
              </motion.div>
              
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {config.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {config.description}
              </p>
            </div>

            {/* Content Section */}
            <div className="p-8 pt-0">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key="loading"
                  >
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <p className="font-medium">Please do not close this page</p>
                          <p className="mt-1 opacity-90">Closing this window might interrupt the verification process.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : paymentStatus === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key="success"
                    className="text-left"
                  >
                    <div className="relative space-y-8 pl-10 before:absolute before:left-[17px] before:top-2 before:h-[calc(100%-20px)] before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                      {/* Step 1: Upgrade Confirmed */}
                      <div className="relative">
                        <div className="absolute -left-10 top-0.5 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-sm dark:border-slate-900">
                          <span className="font-bold text-sm">1</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          Plan Upgraded
                        </h3>
                        {subscriptionDetails && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Your account has been successfully upgraded to the{" "}
                            <span className="font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                              {subscriptionDetails.plan}
                            </span>{" "}
                            plan.
                          </p>
                        )}
                      </div>

                      {/* Step 2: Download App */}
                      <div className="relative">
                        <div className="absolute -left-10 top-0.5 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-blue-500 text-white shadow-sm dark:border-slate-900">
                          <span className="font-bold text-sm">2</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          Download Our App
                        </h3>
                        <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-400">
                          Get the full Moneko experience on your mobile device.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <AppleDownloadButton />
                          <AndroidDownloadButton />
                        </div>
                      </div>

                      {/* Step 3: Login */}
                      <div className="relative">
                        <div className="absolute -left-10 top-0.5 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-slate-500 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-400">
                          <span className="font-bold text-sm">3</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          Login
                        </h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          Sign in with the same account you used for this subscription.
                        </p>
                      </div>

                      {/* Step 4: Log Expense */}
                      <div className="relative">
                        <div className="absolute -left-10 top-0.5 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-slate-500 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-400">
                          <span className="font-bold text-sm">4</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          Log an Expense
                        </h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          Start tracking your spending immediately to reach your financial goals.
                        </p>
                      </div>
                    </div>
                    
                   
                  </motion.div>
                ) : (paymentStatus === "failed" || paymentStatus === "canceled") ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key="error-state"
                    className="grid gap-3"
                  >
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="w-full"
                      onClick={() => navigate({ to: "/pricing" })}
                    >
                      Return to Pricing
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full"
                      onClick={() =>
                        (window.location.href = "mailto:hello@moneko.io?subject=Payment%20Issue")
                      }
                    >
                      <Mail className="mr-2 h-4 w-4" /> Contact Support
                    </Button>
                  </motion.div>
                ) : paymentStatus === "pending" ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    key="pending"
                    className="grid gap-3"
                  >
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Check Again
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => navigate({ to: "/dashboard" })}
                      className="opacity-80"
                    >
                      Go to Dashboard
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Footer Help */}
             <div className="border-t border-slate-100 bg-slate-50 px-8 py-4 text-center dark:border-white/5 dark:bg-white/5">
                <p className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <HelpCircle className="h-4 w-4" />
                    <span>Need help? <a href="mailto:hello@moneko.io" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">Email us</a></span>
                </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AmbientHaloLayout>
  );
}
