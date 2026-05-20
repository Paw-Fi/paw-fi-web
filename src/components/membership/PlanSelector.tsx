import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanOption, getPlanOptions } from "@/data/pricing-plans";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  Star,
  Crown,
  Zap,
} from "lucide-react";
import { PlanChangeConfirmationDialog } from "./PlanChangeConfirmationDialog";
import { useNavigate } from "@tanstack/react-router";

interface PlanSelectorProps {
  currentPlan: string;
  currentBillingInterval?: string; // Add current billing interval
  onChangePlan: (
    plan: string,
    billingInterval: string,
    prorationDate?: number,
  ) => void;
  onPreviewPlanChange: (plan: string, billingInterval: string) => void;
  isLoading: boolean;
  isPreviewLoading: boolean;
  previewData: any;
  previewError: Error | null;
  mutationError: Error | null;
  resetPreview: () => void;
  isSharedHouseholdAccess?: boolean;
}

// Using PlanOption interface from shared pricing-plans.ts

export function PlanSelector({
  currentPlan,
  currentBillingInterval = "monthly",
  onChangePlan,
  onPreviewPlanChange,
  isLoading,
  isPreviewLoading,
  previewData,
  previewError,
  mutationError,
  resetPreview,
  isSharedHouseholdAccess = false,
}: PlanSelectorProps) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    (currentBillingInterval as "monthly" | "yearly") || "yearly",
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Get plan options from shared data module
  const plans: PlanOption[] = getPlanOptions();

  // Helper function to get plan level for comparison
  const getPlanLevel = (plan: string): number => {
    const levels: Record<string, number> = {
      free: 0,
      plus: 1,
      premium: 2, // Keep for backward compatibility
      lifetime: 3, // Highest tier - one-time payment
    };
    return levels[plan.toLowerCase()] || 0;
  };

  // Handle preview errors
  useEffect(() => {
    if (previewError) {
      toast.error(
        previewError.message ||
          "Failed to preview plan change. Please try again.",
      );
      resetPreview();
      setShowConfirmDialog(false);
    }
  }, [previewError, resetPreview]);

  // Handle mutation errors
  useEffect(() => {
    if (mutationError) {
      toast.error(
        mutationError.message ||
          "Failed to update subscription. Please try again.",
      );
      setShowConfirmDialog(false);
    }
  }, [mutationError]);

  // Show confirmation dialog when preview data is ready
  useEffect(() => {
    if (previewData && !previewError && !showConfirmDialog) {
      setShowConfirmDialog(true);
    }
  }, [previewData, previewError, showConfirmDialog]);

  const handleSelectPlan = (planId: string) => {
    if (isSharedHouseholdAccess) {
      toast.info(
        "You are currently using a household shared subscription. Leave the household before managing your own plan.",
      );
      return;
    }

    // Premium is coming soon
    if (planId === "premium") {
      toast.info(
        "Premium plan is coming soon. Email hello@moneko.io for updates.",
      );
      return;
    }

    // Can't select free plan - must cancel subscription instead
    if (planId === "free") {
      if (currentPlan === "free") {
        toast.info("You are already on the free plan");
        return;
      }
      // Downgrade to free requires cancellation
      toast.info(
        "To downgrade to free, please cancel your subscription from the Overview tab",
      );
      return;
    }

    // Lifetime plan users cannot change plans (permanent access)
    if (currentPlan === "lifetime") {
      toast.info("You have Lifetime access - no need to change plans!");
      return;
    }

    // Check if already on this plan
    if (planId === currentPlan) {
      // For Lifetime, no billing interval to check
      if (planId === "lifetime") {
        toast.info("You already have Lifetime access");
        return;
      }
      // For recurring plans, check billing interval
      if (billingInterval === currentBillingInterval) {
        toast.info("You are already on this plan with this billing interval");
        return;
      }
    }

    // Determine if this is an upgrade or downgrade
    const currentLevel = getPlanLevel(currentPlan);
    const newLevel = getPlanLevel(planId);

    // UPGRADE: Redirect to checkout page (same flow as pricing page)
    if (newLevel > currentLevel) {
      // Lifetime: one-time payment, no billing interval
      if (planId === "lifetime") {
        navigate({
          to: "/checkout",
          search: {
            plan: "lifetime", // No billing interval for Lifetime
          },
        });
        return;
      }

      // Recurring plans: include billing interval
      navigate({
        to: "/checkout",
        search: {
          plan: planId,
          billing: billingInterval,
          trial: "false", // No trial for upgrades
        },
      });
      return;
    }

    // DOWNGRADE or BILLING INTERVAL CHANGE: Show preview dialog
    setSelectedPlan(planId);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;

    // Preview the change
    onPreviewPlanChange(selectedPlan, billingInterval);
  };

  const handleConfirmChange = () => {
    if (!selectedPlan || !previewData) return;

    // Use the proration date from preview for consistent calculation
    onChangePlan(selectedPlan, billingInterval, previewData.prorationDate);
    setShowConfirmDialog(false);
    resetPreview();
    setSelectedPlan(null);

    // Show success message
    toast.success("Your subscription will be updated shortly!");
  };

  const handleCancelChange = () => {
    setShowConfirmDialog(false);
    resetPreview();
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
      case "free":
        return <Star className="h-5 w-5" />;
      case "basic":
        return <Zap className="h-5 w-5" />;
      case "premium":
        return <Crown className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getPlanGradient = (
    planId: string,
    isSelected: boolean,
    isPopular: boolean,
  ) => {
    if (isSelected) {
      switch (planId) {
        case "premium":
          return "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 dark:from-purple-950/20 dark:to-indigo-950/20 dark:border-purple-800";
        case "plus":
          return "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 dark:from-blue-950/20 dark:to-cyan-950/20 dark:border-blue-800";
        default:
          return "bg-gradient-to-br from-background to-card border-primary/30";
      }
    }
    if (isPopular) {
      return "bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border-purple-200 dark:from-purple-950/10 dark:to-indigo-950/10 dark:border-purple-800/50";
    }
    return "bg-card border-border";
  };

  return (
    <div className="space-y-8">
      {/* Confirmation Dialog */}
      <PlanChangeConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={handleCancelChange}
        preview={previewData}
        isLoading={isLoading}
        onConfirm={handleConfirmChange}
      />

      {/* Billing Interval Toggle */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-muted inline-flex rounded-xl p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`relative rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
              billingInterval === "monthly"
                ? "bg-moneko-background text-foreground shadow-sm"
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
                ? "bg-moneko-background text-foreground shadow-sm"
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

      {/* Action Button - Moved to top for better UX */}
      {selectedPlan && selectedPlan !== currentPlan && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={handleChangePlan}
            disabled={isLoading || isPreviewLoading}
            size="lg"
            className="from-primary/90 to-primary hover:from-primary hover:to-primary/90 bg-gradient-to-r px-8 py-3 text-base font-semibold shadow-lg"
          >
            {isLoading || isPreviewLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isPreviewLoading ? "Calculating..." : "Processing..."}
              </>
            ) : (
              <>
                {currentPlan === "free" || !currentPlan
                  ? `Upgrade to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`
                  : "Review Change"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      )}

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

            // Calculate price based on billing interval
            // Lifetime plan: always show one-time price (no interval)
            // Recurring plans: show monthly price or yearly price / 12
            const price =
              plan.id === "lifetime"
                ? plan.monthlyPrice // One-time payment
                : billingInterval === "monthly"
                  ? plan.monthlyPrice
                  : plan.yearlyPrice / 12; // Yearly divided by 12 for monthly rate

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="relative"
              >
                <Card
                  className={`relative cursor-pointer overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${getPlanGradient(
                    plan.id,
                    isSelected,
                    plan.popular || false,
                  )} ${
                    isCurrentPlan ? "cursor-default" : ""
                  } ${plan.id === "premium" ? "cursor-not-allowed opacity-60" : ""}`}
                  onClick={() => !isCurrentPlan && handleSelectPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-px left-1/2 -translate-x-1/2">
                      <Badge className="rounded-t-none rounded-b-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1 text-white">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pt-8 pb-4">
                    <div className="flex items-center space-x-3">
                      <div>
                        <CardTitle className="text-foreground text-xl">
                          {plan.name}
                        </CardTitle>
                        <p className="text-muted-foreground text-sm">
                          {plan.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Pricing */}
                    <div>
                      <div className="flex items-baseline">
                        <span className="text-foreground text-3xl font-bold tracking-tight">
                          ${price.toFixed(0)}
                        </span>
                        {plan.id !== "lifetime" && (
                          <span className="text-muted-foreground ml-1 text-sm">
                            /month
                          </span>
                        )}
                      </div>
                      {billingInterval === "yearly" &&
                        plan.id !== "lifetime" && (
                          <p className="text-muted-foreground mt-1 text-sm">
                            Billed annually (${plan.yearlyPrice.toFixed(0)}
                            /year)
                          </p>
                        )}
                      {plan.id === "lifetime" && (
                        <p className="text-muted-foreground mt-1 text-sm">
                          One-time payment
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
                          transition={{
                            delay: 0.4 + index * 0.1 + featureIndex * 0.05,
                          }}
                          className="flex items-start space-x-3"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500 dark:text-green-400" />
                          <span className="text-foreground text-sm">
                            {feature}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                      {isCurrentPlan ? (
                        <div className="border-muted bg-muted/50 flex items-center justify-center rounded-lg border-2 border-dashed px-4 py-3">
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 dark:text-green-400" />
                          <span className="text-muted-foreground text-sm font-medium">
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
                          variant={isSelected ? "default" : "secondary"}
                          className="w-full"
                        >
                          {plan.id === "premium" ? (
                            "Coming Soon"
                          ) : isSelected ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Selected
                            </>
                          ) : getPlanLevel(plan.id) >
                            getPlanLevel(currentPlan) ? (
                            <>
                              Upgrade to {plan.name}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          ) : plan.id === "free" ? (
                            "Cancel Subscription"
                          ) : (
                            "Change Plan"
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
    </div>
  );
}
