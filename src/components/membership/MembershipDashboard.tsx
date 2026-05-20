import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/hooks/use-subscription";
import { InvoiceHistory } from "./InvoiceHistory";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { PlanSelector } from "./PlanSelector";
import { SubscriptionDetails } from "./SubscriptionDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Crown, Calendar, RefreshCw, ArrowRight, AlertCircle, CheckCircle2, User, CreditCard } from "lucide-react";


export function MembershipDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "billing" | "plans" | "history">("overview");
  const { 
    subscription, 
    features, 
    paymentMethod, 
    invoices, 
    isLoading, 
    error,
    cancelSubscription,
    resumeSubscription,
    changePlan,
    previewPlanChange,
    isPreviewLoading,
    previewData,
    previewError,
    mutationError,
    resetPreview,
    isMutating,
    isActive
  } = useSubscription(user?.id);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center px-3">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--question-text-secondary)]" />
          <p className="mt-4 text-mobile-sm sm:text-sm font-medium text-[var(--question-text-secondary)]">
            Loading membership details...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center px-4 py-6">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AlertCircle className="mx-auto h-8 w-8 text-[var(--quiz-error-icon)]" />
          <h3 className="mt-4 text-mobile-base sm:text-lg font-semibold text-[var(--question-text)]">
            Unable to load membership details
          </h3>
          <p className="mt-2 text-mobile-sm sm:text-sm text-[var(--question-text-secondary)]">
            Please try again later or contact support.
          </p>
        </motion.div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "trialing": return "bg-blue-500";
      case "canceled":
      case "none": return "bg-slate-400";
      default: return "bg-amber-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "trialing": return "secondary";
      case "canceled":
      case "none": return "outline";
      default: return "secondary";
    }
  };
  const isSharedHouseholdAccess = Boolean(subscription?.bound_to_user_id);

  return (
    <motion.div 
      className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header - Compact Mobile */}
      <div className="mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-mobile-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--lesson-title-text)]">
            Membership
          </h1>
          <p className="mt-1 sm:mt-2 text-mobile-sm sm:text-base md:text-lg leading-6 text-[var(--lesson-content-text)]">
            Manage subscription & premium features
          </p>
        </motion.div>
      </div>

      {/* Current Plan Overview - Compact Mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 sm:mb-8"
      >
        <Card className="border-1 border-[var(--question-border)] bg-[var(--section-bg)] shadow-sm rounded-xl sm:rounded-2xl">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary flex-shrink-0">
                  {subscription?.plan && subscription.plan !== "free" ? (
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  ) : (
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h2 className="text-mobile-base sm:text-lg md:text-xl font-semibold text-foreground">
                      {subscription?.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : "Free"} Plan
                    </h2>
                    <Badge variant={getStatusBadgeVariant(subscription?.status || "none")} className="flex-shrink-0">
                      <span className={`mr-1.5 h-2 w-2 rounded-full ${getStatusColor(subscription?.status || "none")}`} />
                      {subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : "None"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 sm:mt-1 text-mobile-xs sm:text-sm text-muted-foreground">
                    {/* Lifetime Plan: Permanent access, no renewal */}
                    {subscription?.plan === "lifetime" && subscription?.status === "active" && (
                      <>🎉 Lifetime access - Never expires</>
                    )}
                    {/* Recurring Plans: Show renewal info */}
                    {subscription?.plan !== "lifetime" && subscription?.status === "active" && !subscription?.cancel_at_period_end && subscription?.days_until_next_payment !== null && (
                      <>Renews in {subscription.days_until_next_payment} days</>
                    )}
                    {subscription?.plan !== "lifetime" && subscription?.status === "active" && subscription?.cancel_at_period_end && (
                      <>Expires on {new Date(subscription.current_period_end).toLocaleDateString()}</>
                    )}
                    {/* Free/Canceled Plans */}
                    {(!subscription?.status || subscription?.status === "none" || subscription?.status === "canceled") && (
                      "Upgrade to access premium features"
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {/* Resume button: Only for recurring plans that are canceled at period end */}
                {subscription?.plan !== "lifetime" && subscription?.status === "active" && subscription?.cancel_at_period_end && (
                  <Button
                    onClick={() => resumeSubscription()}
                    disabled={isMutating}
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] flex-1 sm:flex-initial text-mobile-sm sm:text-sm"
                  >
                    {isMutating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Resume
                  </Button>
                )}

                {/* Upgrade button: Only for free/canceled/none status */}
                {(!subscription?.status || subscription?.status === "none" || subscription?.status === "canceled") && (
                  <Button
                    onClick={() => setActiveTab("plans")}
                    className="bg-gradient-to-r from-primary/90 to-primary hover:from-primary !text-white hover:to-primary/90 min-h-[44px] flex-1 sm:flex-initial text-mobile-sm sm:text-sm"
                    size="sm"
                  >
                    Upgrade Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                {/* Lifetime badge: Show special badge for Lifetime users */}
                {subscription?.plan === "lifetime" && subscription?.status === "active" && (
                  <Badge variant="outline" className="min-h-[44px] px-4 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Lifetime Member
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs - Mobile Optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/50 p-1 h-auto">
            <TabsTrigger value="overview" className="rounded-lg transition-all text-mobile-xs sm:text-sm min-h-[44px]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg transition-all text-mobile-xs sm:text-sm min-h-[44px]">
              Billing
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-lg transition-all text-mobile-xs sm:text-sm min-h-[44px]">
              Plans
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg transition-all text-mobile-xs sm:text-sm min-h-[44px]">
              History
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6 sm:mt-8">
            <AnimatePresence mode="wait">
              <TabsContent value="overview" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SubscriptionDetails
                    subscription={subscription}
                    features={features}
                    onCancelSubscription={cancelSubscription}
                    isCanceling={isMutating}
                    isActive={isActive}
                  />
                </motion.div>
              </TabsContent>
              
              <TabsContent value="billing" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Lifetime Plan: No payment method management (one-time payment) */}
                  {subscription?.plan === "lifetime" && subscription?.status === "active" ? (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-green-500 dark:text-green-400 mb-4" />
                        <p className="text-sm font-medium text-foreground">Lifetime Plan - No Billing Required</p>
                        <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-md">
                          You've made a one-time payment for lifetime access. No recurring billing or payment method needed!
                        </p>
                      </CardContent>
                    </Card>
                  ) : subscription && !subscription.bound_to_user_id && subscription.stripe_customer_id && user?.id && subscription.plan !== "lifetime" ? (
                    /* Recurring Plans: Show payment method manager */
                    <PaymentMethodManager
                      paymentMethod={paymentMethod}
                      customerId={subscription.stripe_customer_id}
                      userId={user.id}
                    />
                  ) : (
                    /* Free/No Subscription: Upgrade prompt */
                    <Card className="border-0 shadow-sm">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">No active subscription</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Subscribe to a plan to manage payment methods</p>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </TabsContent>
              
              <TabsContent value="plans" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <PlanSelector 
                    currentPlan={subscription?.plan || "free"} 
                    currentBillingInterval={subscription?.billing_interval || "monthly"}
                    onChangePlan={changePlan}
                    onPreviewPlanChange={previewPlanChange}
                    isLoading={isMutating}
                    isPreviewLoading={isPreviewLoading}
                    previewData={previewData}
                    previewError={previewError}
                    mutationError={mutationError}
                    resetPreview={resetPreview}
                    isSharedHouseholdAccess={isSharedHouseholdAccess}
                  />
                </motion.div>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {subscription ? (
                    <InvoiceHistory invoices={invoices || []} />
                  ) : (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">No billing history</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Subscribe to a plan to view invoices</p>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </div>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
