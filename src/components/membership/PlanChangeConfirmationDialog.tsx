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
  Info
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
  prorationDate?: number;
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
  onConfirm: () => void;
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
    if (preview.action === 'cancel_subscription') return <TrendingDown className="h-5 w-5 text-amber-500" />;
    if (preview.isUpgrade) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (preview.isDowngrade) return <TrendingDown className="h-5 w-5 text-amber-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  const getChangeType = () => {
    if (preview.action === 'cancel_subscription') return "Cancel Subscription";
    if (preview.isUpgrade) return "Upgrade";
    if (preview.isDowngrade) return "Downgrade";
    return "Plan Change";
  };

  const getChangeBadgeColor = () => {
    if (preview.action === 'cancel_subscription') return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (preview.isUpgrade) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (preview.isDowngrade) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold capitalize">{preview.currentPlan}</p>
                </div>
                <div className="text-muted-foreground">→</div>
                <div>
                  <p className="text-sm text-muted-foreground">New Plan</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-semibold capitalize">{preview.newPlan}</p>
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
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                    <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {preview.billingBehavior === 'immediate' ? 'Due Today' : 'Estimated Charge'}
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(preview.immediateCharge, preview.currency)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Future Recurring Amount */}
                {preview.futureRecurringAmount !== undefined && preview.futureRecurringAmount > 0 && (
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Future {preview.newBillingInterval === 'monthly' ? 'Monthly' : 'Annual'} Rate
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(preview.futureRecurringAmount, preview.currency)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Billing Period Info for Downgrades */}
                {preview.billingBehavior === 'end_of_period' && preview.currentPeriodEnd && (
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                    <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Change applies on {new Date(preview.currentPeriodEnd * 1000).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        You'll continue to have access to your current plan until then
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Explanation */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                {preview.message}
              </div>
            </div>
          </div>

          {/* Line Items (if available) */}
          {preview.preview?.lineItems && preview.preview.lineItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Billing Details</p>
              <Card>
                <CardContent className="pt-4 space-y-2">
                  {preview.preview.lineItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className={item.proration ? "text-muted-foreground italic" : ""}>
                        {item.description}
                        {item.proration && " (Proration)"}
                      </span>
                      <span className={item.amount < 0 ? "text-green-600 dark:text-green-400" : ""}>
                        {formatCurrency(item.amount, preview.currency)}
                      </span>
                    </div>
                  ))}
                  {preview.preview.lineItems.length > 1 && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(preview.preview.amountDue, preview.currency)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Important Notice for Immediate Charges */}
          {preview.immediateCharge > 0 && preview.billingBehavior === 'immediate' && (
            <div className="flex items-start space-x-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Your payment method will be charged immediately
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  The charge will appear on your statement within 1-2 business days
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
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
            className="w-full sm:w-auto bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90"
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
