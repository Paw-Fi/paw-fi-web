import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanOption, getPlanOptions } from "@/data/pricing-plans";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, ArrowRight, Sparkles, Star, Crown, Zap } from "lucide-react";

interface PlanSelectorProps {
  currentPlan: string;
  onChangePlan: (plan: string, billingInterval: string) => void;
  isLoading: boolean;
}

// Using PlanOption interface from shared pricing-plans.ts

export function PlanSelector({
  currentPlan,
  onChangePlan,
  isLoading,
}: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  // Get plan options from shared data module
  const plans: PlanOption[] = getPlanOptions();

  const handleSelectPlan = (planId: string) => {
    if(planId !== "premium")
    {
      setSelectedPlan(planId);
    }
  };

  const handleChangePlan = () => {
    toast.error("Please contact support to change your plan");
    // if (selectedPlan) {
    //   onChangePlan(selectedPlan, billingInterval);
    // }
  };

  // Calculate savings percentage for yearly billing
  const calculateSavings = (monthly: number, yearly: number) => {
    if (monthly === 0) return 0;
    const monthlyCost = monthly * 12;
    const savings = ((monthlyCost - yearly) / monthlyCost) * 100;
    return Math.round(savings);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "free": return <Star className="h-5 w-5" />;
      case "basic": return <Zap className="h-5 w-5" />;
      case "premium": return <Crown className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  const getPlanGradient = (planId: string, isSelected: boolean, isPopular: boolean) => {
    if (isSelected) {
      switch (planId) {
        case "premium": return "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 dark:from-purple-950/20 dark:to-indigo-950/20 dark:border-purple-800";
        case "plus": return "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 dark:from-blue-950/20 dark:to-cyan-950/20 dark:border-blue-800";
        default: return "bg-gradient-to-br from-background to-card border-primary/30";
      }
    }
    if (isPopular) {
      return "bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border-purple-200 dark:from-purple-950/10 dark:to-indigo-950/10 dark:border-purple-800/50";
    }
    return "bg-card border-border";
  };

  return (
    <div className="space-y-8">
      {/* Billing Interval Toggle */}
      <motion.div 
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="inline-flex rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`relative rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
              billingInterval === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("yearly")}
            className={`relative rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
              billingInterval === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center space-x-2">
              <span>Yearly</span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                Save 25%
              </Badge>
            </span>
          </button>
        </div>
      </motion.div>

      {/* Plan Cards */}
      <motion.div 
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence>
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isSelected = selectedPlan === plan.id;
            const price =
              billingInterval === "monthly"
                ? plan.monthlyPrice
                : plan.yearlyPrice;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="relative"
              >
                <Card
                  className={`relative cursor-pointer overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${
                    getPlanGradient(plan.id, isSelected, plan.popular)
                  } ${
                    isCurrentPlan ? "cursor-default" : ""
                  } ${plan.id === "premium" ? "cursor-not-allowed opacity-60" : ""}`}
                  onClick={() => !isCurrentPlan && handleSelectPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-px left-1/2 -translate-x-1/2">
                      <Badge className="rounded-b-lg rounded-t-none bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1 text-white">
                        <Star className="mr-1 h-3 w-3" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4 pt-8">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm">
                        {getPlanIcon(plan.id)}
                      </div>
                      <div>
                        <CardTitle className="text-xl text-foreground">
                          {plan.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Pricing */}
                    <div>
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold tracking-tight text-foreground">
                          ${price.toFixed(0)}
                        </span>
                        <span className="ml-1 text-sm text-muted-foreground">
                          /month
                        </span>
                      </div>
                      {billingInterval === "yearly" && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Billed annually (${plan.yearlyPrice.toFixed(0)}/year)
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Features */}
                    <div className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <motion.div
                          key={featureIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 + featureIndex * 0.05 }}
                          className="flex items-start space-x-3"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500 dark:text-green-400" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                      {isCurrentPlan ? (
                        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/50 px-4 py-3">
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 dark:text-green-400" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Current Plan
                          </span>
                        </div>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPlan(plan.id);
                          }}
                          disabled={plan.id === "premium"}
                          className={`w-full ${
                            isSelected
                              ? "bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90"
                              : "bg-foreground hover:bg-foreground/90 text-background"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Selected
                            </>
                          ) : (
                            plan.id === "premium" ? "Coming Soon" : "Select Plan"
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Action Button */}
      {selectedPlan && selectedPlan !== currentPlan && (
        <motion.div 
          className="flex justify-center pt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={handleChangePlan}
            disabled={isLoading}
            size="lg"
            className="bg-gradient-to-r from-primary/90 to-primary px-8 py-3 text-base font-semibold hover:from-primary hover:to-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {currentPlan === "free" || !currentPlan
                  ? `Upgrade to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`
                  : "Change Plan"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
