import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCompactCurrency } from "../lib/formatters";
import { cn } from "@/lib/utils";

interface BudgetProgressPanelProps {
  budgets: PremiumDashboardSummary["budgetProgress"];
}

export function BudgetProgressPanel({ budgets }: BudgetProgressPanelProps) {
  if (!budgets || budgets.length === 0) {
    return (
      <Card className="col-span-1 h-full">
        <CardHeader>
          <CardTitle className="text-lg">Budgets & Pockets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
          <p>No active budgets found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Budgets & Pockets</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 overflow-y-auto">
        {budgets.map((budget) => {
          const percent =
            budget.allocatedCents > 0
              ? Math.min(100, Math.max(0, (budget.spentCents / budget.allocatedCents) * 100))
              : 0;

          const isOver = budget.spentCents > budget.allocatedCents;
          const isWarning = percent > 85 && !isOver;

          return (
            <div key={budget.id} className="space-y-2">
              <div className="flex justify-between items-end text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                  {budget.name}
                </span>
                <span className="shrink-0">
                  <span className={cn("font-semibold", isOver ? "text-rose-500" : "")}>
                    {formatCompactCurrency(budget.spentCents, budget.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    / {formatCompactCurrency(budget.allocatedCents, budget.currency)}
                  </span>
                </span>
              </div>
              <Progress
                value={percent}
                className={cn("h-2", isOver ? "[&>div]:bg-rose-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary")}
              />
              <div className="text-xs text-right text-muted-foreground">
                {isOver ? (
                  <span className="text-rose-500 font-medium">
                    {formatCompactCurrency(Math.abs(budget.remainingCents), budget.currency)} over
                  </span>
                ) : (
                  <span>{formatCompactCurrency(budget.remainingCents, budget.currency)} left</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
