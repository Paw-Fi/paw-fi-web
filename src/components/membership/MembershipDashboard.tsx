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
import { Loader2, Crown, Calendar, RefreshCw, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";


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
    isMutating
  } = useSubscription(user?.id);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading your membership details...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center px-4 py-6">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            Unable to load membership details
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Please try again later or contact our support team.
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

  return (
    <motion.div 
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Membership
          </h1>
          <p className="mt-2 text-lg leading-6 text-slate-600">
            Manage your subscription and unlock premium features
          </p>
        </motion.div>
      </div>

      {/* Current Plan Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <Card className="border-0 bg-gradient-to-br from-background/50 to-card/80 shadow-sm backdrop-blur-sm dark:from-card/50 dark:to-background/80">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-semibold text-foreground">
                      {subscription?.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : "Free"} Plan
                    </h2>
                    <Badge variant={getStatusBadgeVariant(subscription?.status || "none")}>
                      <span className={`mr-1.5 h-2 w-2 rounded-full ${getStatusColor(subscription?.status || "none")}`} />
                      {subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : "None"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {subscription?.status === "active" && !subscription?.cancel_at_period_end && subscription?.days_until_next_payment !== null && (
                      <>Renews in {subscription.days_until_next_payment} days</>
                    )}
                    {subscription?.status === "active" && subscription?.cancel_at_period_end && (
                      <>Expires on {new Date(subscription.current_period_end).toLocaleDateString()}</>
                    )}
                    {(!subscription?.status || subscription?.status === "none" || subscription?.status === "canceled") && (
                      "Upgrade to access premium features"
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {subscription?.status === "active" && subscription?.cancel_at_period_end && (
                  <Button
                    onClick={() => resumeSubscription()}
                    disabled={isMutating}
                    variant="outline"
                    size="sm"
                  >
                    {isMutating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Resume
                  </Button>
                )}
                
                {(!subscription?.status || subscription?.status === "none" || subscription?.status === "canceled") && (
                  <Button
                    onClick={() => setActiveTab("plans")}
                    className="bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90"
                    size="sm"
                  >
                    Upgrade Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="overview" className="rounded-lg transition-all">
              Overview
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg transition-all">
              Billing
            </TabsTrigger>
            <TabsTrigger value="plans" className="rounded-lg transition-all">
              Plans
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg transition-all">
              History
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-8">
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
                  <PaymentMethodManager 
                    paymentMethod={paymentMethod} 
                    customerId={subscription?.stripe_customer_id} 
                    userId={user?.id}
                  />
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
                    onChangePlan={changePlan}
                    isLoading={isMutating}
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
                  <InvoiceHistory invoices={invoices || []} />
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </div>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
