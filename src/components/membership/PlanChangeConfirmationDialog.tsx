import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Info,
} from "lucide-react";

interface PlanChangePreview {
  action: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSamePlan?: boolean;
  currentPlan: string;
  newPlan: string;
  newBillingInterval: string;
  billingBehavior?: string;
  immediateCharge: number;
  futureRecurringAmount?: number;
  totalProration?: number;
  currency: string;
  currentPeriodEnd?: number;
  message: string;
  preview?: {
    amountDue: number;
    subtotal: number;
    total: number;
    lineItems: Array<{
      description: string;
      amount: number;
      proration: boolean;
      period: any;
    }>;
  };
}

interface PlanChangeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PlanChangePreview | null;
  isLoading: boolean;
  onConfirm: () => void | Promise<void>;
}

export function PlanChangeConfirmationDialog({
  open,
  onOpenChange,
  preview,
  isLoading,
  onConfirm,
}: PlanChangeConfirmationDialogProps) {
  if (!preview) return null;

  const formatCurrency = (amount: number, currency: string) => {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  };

  const getChangeIcon = () => {
    if (preview.action === "cancel_subscription")
      return <TrendingDown className="h-5 w-5 text-amber-500" />;
    if (preview.isUpgrade)
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (preview.isDowngrade)
      return <TrendingDown className="h-5 w-5 text-amber-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  const getChangeType = () => {
    if (preview.action === "cancel_subscription") return "Cancel Subscription";
    if (preview.isUpgrade) return "Upgrade";
    if (preview.isDowngrade) return "Downgrade";
    return "Plan Change";
  };

  const getChangeBadgeColor = () => {
    if (preview.action === "cancel_subscription")
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (preview.isUpgrade)
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (preview.isDowngrade)
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {getChangeIcon()}
            <DialogTitle className="text-2xl">
              Confirm {getChangeType()}
            </DialogTitle>
          </div>
          <DialogDescription>
            Review the details of your plan change before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Change Summary */}
          <Card className="border-2">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Current Plan</p>
                  <p className="text-lg font-semibold capitalize">
                    {preview.currentPlan}
                  </p>
                </div>
                <div className="text-muted-foreground">→</div>
                <div>
                  <p className="text-muted-foreground text-sm">New Plan</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-semibold capitalize">
                      {preview.newPlan}
                    </p>
                    <Badge className={getChangeBadgeColor()}>
                      {getChangeType()}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Billing Information */}
              <div className="space-y-3">
                {/* Immediate Charge */}
                {preview.immediateCharge > 0 && (
                  <div className="bg-muted/50 flex items-start space-x-3 rounded-lg p-3">
                    <DollarSign className="text-primary mt-0.5 h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {preview.billingBehavior === "immediate"
                          ? "Due Today"
                          : "Estimated Charge"}
                      </p>
                      <p className="text-primary text-2xl font-bold">
                        {formatCurrency(
                          preview.immediateCharge,
                          preview.currency,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Future Recurring Amount */}
                {preview.futureRecurringAmount !== undefined &&
                  preview.futureRecurringAmount > 0 && (
                    <div className="bg-muted/50 flex items-start space-x-3 rounded-lg p-3">
                      <Calendar className="text-muted-foreground mt-0.5 h-5 w-5" />
                      <div className="flex-1">
                        <p className="text-muted-foreground text-sm">
                          Future{" "}
                          {preview.newBillingInterval === "monthly"
                            ? "Monthly"
                            : "Annual"}{" "}
                          Rate
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(
                            preview.futureRecurringAmount,
                            preview.currency,
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Billing Period Info for Downgrades */}
                {preview.billingBehavior === "end_of_period" &&
                  preview.currentPeriodEnd && (
                    <div className="flex items-start space-x-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          Change applies on{" "}
                          {new Date(
                            preview.currentPeriodEnd * 1000,
                          ).toLocaleDateString()}
                        </p>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          You'll continue to have access to your current plan
                          until then
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Explanation */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
              <div className="text-muted-foreground text-sm">
                {preview.message}
              </div>
            </div>
          </div>

          {/* Line Items (if available) */}
          {preview.preview?.lineItems &&
            preview.preview.lineItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Billing Details</p>
                <Card>
                  <CardContent className="space-y-2 pt-4">
                    {preview.preview.lineItems.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span
                          className={
                            item.proration ? "text-muted-foreground italic" : ""
                          }
                        >
                          {item.description}
                          {item.proration && " (Proration)"}
                        </span>
                        <span
                          className={
                            item.amount < 0
                              ? "text-green-600 dark:text-green-400"
                              : ""
                          }
                        >
                          {formatCurrency(item.amount, preview.currency)}
                        </span>
                      </div>
                    ))}
                    {preview.preview.lineItems.length > 1 && (
                      <>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>
                            {formatCurrency(
                              preview.preview.amountDue,
                              preview.currency,
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Important Notice for Immediate Charges */}
          {preview.immediateCharge > 0 &&
            preview.billingBehavior === "immediate" && (
              <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Your payment method will be charged immediately
                  </p>
                  <p className="mt-1 text-blue-700 dark:text-blue-300">
                    The charge will appear on your statement within 1-2 business
                    days
                  </p>
                </div>
              </div>
            )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="from-primary/90 to-primary hover:from-primary hover:to-primary/90 w-full bg-gradient-to-r sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm {getChangeType()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
