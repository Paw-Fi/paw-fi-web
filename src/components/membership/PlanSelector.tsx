import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getPlanOptions, PlanOption } from "@/data/pricing-plans";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { PlanChangeConfirmationDialog } from "./PlanChangeConfirmationDialog";
import { useNavigate } from "@tanstack/react-router";
import { isSystemGrantedFreeTrialUser } from "@/utils/subscription";

interface PlanSelectorProps {
  currentPlan: string;
  currentStatus?: string;
  currentBillingInterval?: string; // Add current billing interval
  onChangePlan: (plan: string, billingInterval: string) => void;
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
  currentStatus = "none",
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
  const isSystemGrantedTrial = isSystemGrantedFreeTrialUser({
    plan: currentPlan,
    status: currentStatus,
  });

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

    if (
      planId === currentPlan &&
      billingInterval === currentBillingInterval &&
      !isSystemGrantedTrial
    ) {
      toast.info("You are already on this plan with this billing interval");
      return;
    }

    if (planId === "lifetime") {
      navigate({
        to: "/checkout",
        search: {
          plan: "lifetime",
        },
      });
      return;
    }

    // New paid subscriptions still need checkout for payment collection.
    if (currentPlan === "free" || !currentPlan || isSystemGrantedTrial) {
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

    // Existing recurring changes are handled by preview/update so Stripe can
    // apply the correct immediate or period-end behavior.
    setSelectedPlan(planId);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;

    // Preview the change
    onPreviewPlanChange(selectedPlan, billingInterval);
  };

  const handleConfirmChange = () => {
    if (!selectedPlan || !previewData) return;

    onChangePlan(selectedPlan, billingInterval);
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
                Save 40%
              </Badge>
            </span>
          </button>
        </div>
      </motion.div>

      {/* Action Button - Moved to top for better UX */}
      {selectedPlan &&
        (isSystemGrantedTrial ||
          selectedPlan !== currentPlan ||
          billingInterval !== currentBillingInterval) && (
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
                  {currentPlan === "free" ||
                  !currentPlan ||
                  isSystemGrantedTrial
                    ? `Subscribe to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`
                    : "Review Change"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>
        )}

      {/* Plan Cards */}
      <motion.div
        className="mx-auto grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence>
          {plans.map((plan, index) => {
            const isCurrentPlan =
              currentPlan === plan.id &&
              !(isSystemGrantedTrial && plan.id === "plus");
            const isCurrentPlanAndInterval =
              isCurrentPlan &&
              (plan.id === "lifetime" ||
                billingInterval === currentBillingInterval);
            const isSelected = selectedPlan === plan.id;
            const priceLabel =
              billingInterval === "yearly"
                ? plan.priceYearly
                : plan.priceMonthly;
            const compareAtPriceLabel =
              billingInterval === "yearly"
                ? plan.compareAtPriceYearly
                : plan.compareAtPriceMonthly;

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
                  )} ${isCurrentPlanAndInterval ? "cursor-default" : ""}`}
                  onClick={() => handleSelectPlan(plan.id)}
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
                          {priceLabel}
                        </span>
                        <span className="text-muted-foreground ml-1 text-sm">
                          {billingInterval === "yearly" ? "/year" : "/month"}
                        </span>
                      </div>
                      {compareAtPriceLabel && (
                        <p className="text-muted-foreground mt-1 text-sm">
                          Regularly {compareAtPriceLabel}
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
                      {isCurrentPlanAndInterval ? (
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
                          variant={isSelected ? "default" : "secondary"}
                          className="w-full"
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Selected
                            </>
                          ) : isSystemGrantedTrial && plan.id === "plus" ? (
                            "Subscribe to Plus"
                          ) : isCurrentPlan ? (
                            "Switch Billing"
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
