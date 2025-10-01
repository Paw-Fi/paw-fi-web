import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Calendar, Clock, CreditCard, AlertCircle, Crown, Shield, User } from "lucide-react";

interface SubscriptionDetailsProps {
  subscription: {
    id: string;
    plan: string;
    status: string;
    current_period_end: string;
    next_payment_date: string | null;
    cancel_at_period_end: boolean;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    created_at: string;
    updated_at: string;
    days_until_next_payment: number | null;
  } | null;
  features: Array<{
    feature: string;
    included: boolean;
    limit_value: number | null;
  }>;
}

export function SubscriptionDetails({
  subscription,
  features,
}: SubscriptionDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600 dark:text-green-400";
      case "trialing": return "text-blue-600 dark:text-blue-400";
      case "canceled":
      case "none": return "text-muted-foreground";
      default: return "text-amber-600 dark:text-amber-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />;
      case "trialing": return <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      case "canceled":
      case "none": return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default: return <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
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
            <CardTitle className="flex items-center text-xl text-foreground">
              <CreditCard className="mr-3 h-5 w-5 text-muted-foreground" />
              Subscription Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Current Plan */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                <div className="flex items-center space-x-2">
                  {subscription?.plan && subscription.plan !== "free" ? (
                    <Crown className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-lg font-semibold capitalize text-foreground">
                    {subscription?.plan || "Free"}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(subscription?.status || "none")}
                  <span className={`font-medium capitalize ${getStatusColor(subscription?.status || "none")}`}>
                    {subscription?.status || "None"}
                  </span>
                </div>
              </div>

              {/* Auto Renewal */}
              {subscription?.status !== "none" && subscription?.status && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Auto-Renew</p>
                  <div className="flex items-center space-x-2">
                    {subscription?.cancel_at_period_end ? (
                      <>
                        <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-sm text-red-600 dark:text-red-400">Disabled</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                        <span className="text-sm text-green-600 dark:text-green-400">Enabled</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {subscription?.status !== "none" && subscription?.status && (
              <>
                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Current Period End */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Current Period Ends</p>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {subscription?.current_period_end
                          ? new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Next Payment */}
                  {subscription?.days_until_next_payment !== null && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Next Payment</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {subscription.days_until_next_payment === 0
                            ? "Today"
                            : subscription.days_until_next_payment === 1
                            ? "Tomorrow"
                            : `In ${subscription.days_until_next_payment} days`}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Next Payment Date */}
                  {subscription?.next_payment_date && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Next Payment Date</p>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {new Date(subscription.next_payment_date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Subscription Created */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Subscription Created</p>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {subscription?.created_at
                          ? new Date(subscription.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Features */}
      {features && features.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl text-foreground">
                <Shield className="mr-3 h-5 w-5 text-muted-foreground" />
                Plan Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-center space-x-3 rounded-lg bg-muted/30 p-3"
                  >
                    {feature.included ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${
                      feature.included ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {feature.feature}
                      {feature.limit_value !== null && feature.included && (
                        <span className="ml-1 text-xs text-muted-foreground">
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
