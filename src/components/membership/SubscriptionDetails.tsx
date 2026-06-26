import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  CreditCard,
  AlertCircle,
  Crown,
  Shield,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getPlanOptions } from "@/data/pricing-plans";
import { isSystemGrantedFreeTrialUser } from "@/utils/subscription";

interface SubscriptionDetailsProps {
  subscription: {
    id: string;
    plan: string;
    status: string;
    current_period_end: string | null; // Null for lifetime plans
    next_payment_date: string | null;
    cancel_at_period_end: boolean;
    stripe_subscription_id: string | null; // Null for lifetime plans (one-time payment)
    stripe_customer_id: string | null;
    bound_to_user_id?: string | null;
    bound_to_household_id?: string | null;
    created_at: string;
    updated_at: string;
    days_until_next_payment: number | null;
    billing_interval?: string | null; // Null for lifetime plans
  } | null;
  features: Array<{
    feature: string;
    included: boolean;
    limit_value: number | null;
  }>;
  onCancelSubscription?: () => void;
  isCanceling?: boolean;
  isActive?: boolean;
}

export function SubscriptionDetails({
  subscription,
  features,
  onCancelSubscription,
  isCanceling = false,
  isActive = false,
}: SubscriptionDetailsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const isSharedHouseholdAccess = Boolean(subscription?.bound_to_user_id);
  const isSystemGrantedTrial = isSystemGrantedFreeTrialUser(subscription);
  const sharedPlanFeatures = getPlanOptions().find(
    (plan) => plan.id === subscription?.plan,
  )?.features;
  const displayedFeatures = sharedPlanFeatures
    ? sharedPlanFeatures.map((feature) => ({
        feature,
        included: true,
        limit_value: null,
      }))
    : features;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 dark:text-green-400";
      case "trialing":
        return "text-blue-600 dark:text-blue-400";
      case "canceled":
      case "none":
        return "text-muted-foreground";
      default:
        return "text-amber-600 dark:text-amber-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return (
          <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
        );
      case "trialing":
        return <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      case "canceled":
      case "none":
        return <XCircle className="text-muted-foreground h-4 w-4" />;
      default:
        return (
          <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground flex items-center text-xl">
              <CreditCard className="text-muted-foreground mr-3 h-5 w-5" />
              Subscription Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Current Plan */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Current Plan
                </p>
                <div className="flex items-center space-x-2">
                  {subscription?.plan &&
                  subscription.plan !== "free" &&
                  !isSystemGrantedTrial ? (
                    <Crown className="text-primary h-4 w-4" />
                  ) : (
                    <User className="text-muted-foreground h-4 w-4" />
                  )}
                  <span className="text-foreground text-lg font-semibold capitalize">
                    {subscription?.plan || "Free"}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Status
                </p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(subscription?.status || "none")}
                  <span
                    className={`font-medium capitalize ${getStatusColor(subscription?.status || "none")}`}
                  >
                    {subscription?.status || "None"}
                  </span>
                </div>
              </div>

              {/* Auto Renewal - Only for recurring plans (not lifetime) */}
              {subscription?.status !== "none" &&
                subscription?.status &&
                subscription?.plan !== "lifetime" && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium">
                      Auto-Renew
                    </p>
                    <div className="flex items-center space-x-2">
                      {subscription?.cancel_at_period_end ||
                      isSystemGrantedTrial ? (
                        <>
                          <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                          <span className="text-sm text-red-600 dark:text-red-400">
                            Disabled
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                          <span className="text-sm text-green-600 dark:text-green-400">
                            Enabled
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
            </div>

            {subscription?.status !== "none" && subscription?.status && (
              <>
                <Separator className="my-6" />

                {/* Lifetime Plan: Show special message */}
                {subscription?.plan === "lifetime" ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
                    <div className="flex items-start space-x-3">
                      <Crown className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-400">
                          Lifetime Access
                        </h4>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
                          You have permanent access to all features with no
                          recurring billing. Your one-time payment was made on{" "}
                          {subscription?.created_at
                            ? new Date(
                                subscription.created_at,
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"}
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Recurring Plans: Show billing period details */
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Current Period End */}
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-sm font-medium">
                        Current Period Ends
                      </p>
                      <div className="flex items-center space-x-2">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <span className="text-foreground text-sm">
                          {subscription?.current_period_end
                            ? new Date(
                                subscription.current_period_end,
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Next Payment */}
                    {(isSystemGrantedTrial ||
                      subscription?.days_until_next_payment !== null) && (
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">
                          Next Payment
                        </p>
                        <div className="flex items-center space-x-2">
                          <Clock className="text-muted-foreground h-4 w-4" />
                          <span className="text-foreground text-sm">
                            {isSystemGrantedTrial
                              ? "-"
                              : subscription.days_until_next_payment === 0
                                ? "Today"
                                : subscription.days_until_next_payment === 1
                                  ? "Tomorrow"
                                  : `In ${subscription.days_until_next_payment} days`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Next Payment Date */}
                    {(isSystemGrantedTrial ||
                      subscription?.next_payment_date) && (
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">
                          Next Payment Date
                        </p>
                        <div className="flex items-center space-x-2">
                          <Calendar className="text-muted-foreground h-4 w-4" />
                          <span className="text-foreground text-sm">
                            {isSystemGrantedTrial
                              ? "-"
                              : new Date(
                                  subscription.next_payment_date!,
                                ).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Subscription Created */}
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-sm font-medium">
                        Subscription Created
                      </p>
                      <div className="flex items-center space-x-2">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <span className="text-foreground text-sm">
                          {subscription?.created_at
                            ? new Date(
                                subscription.created_at,
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel Subscription Button - Only for direct recurring plans */}
                {isActive &&
                  !isSharedHouseholdAccess &&
                  !isSystemGrantedTrial &&
                  subscription?.plan !== "lifetime" && (
                    <>
                      <Separator className="my-6" />
                      <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/20 dark:bg-red-950/10">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-red-900 dark:text-red-400">
                            Cancel Subscription
                          </h4>
                          <p className="mt-1 text-xs text-red-700 dark:text-red-500">
                            Your subscription will remain active until the end
                            of the current billing period
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowCancelDialog(true)}
                          disabled={isCanceling}
                          className="ml-4"
                        >
                          {isCanceling ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Canceling...
                            </>
                          ) : (
                            "Cancel Plan"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You'll continue
              to have access to premium features until{" "}
              <strong>
                {subscription?.current_period_end
                  ? new Date(
                      subscription.current_period_end,
                    ).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "the end of your billing period"}
              </strong>
              . After that, you'll be downgraded to the free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelDialog(false);
                onCancelSubscription?.();
                toast.success(
                  "Your subscription has been scheduled for cancellation. You'll retain access until the end of your billing period.",
                );
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Features */}
      {displayedFeatures && displayedFeatures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground flex items-center text-xl">
                <Shield className="text-muted-foreground mr-3 h-5 w-5" />
                Plan Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {displayedFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="bg-muted/30 flex items-center space-x-3 rounded-lg p-3"
                  >
                    {feature.included ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                    ) : (
                      <XCircle className="text-muted-foreground h-4 w-4" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {feature.feature}
                      {feature.limit_value !== null && feature.included && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          (up to {feature.limit_value})
                        </span>
                      )}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
