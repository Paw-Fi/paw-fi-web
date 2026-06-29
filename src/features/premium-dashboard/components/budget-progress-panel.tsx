import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "../lib/formatters";
import { cn } from "@/lib/utils";

interface BudgetProgressPanelProps {
  budgets: PremiumDashboardSummary["budgetProgress"];
}

export function BudgetProgressPanel({ budgets }: BudgetProgressPanelProps) {
  if (!budgets || budgets.length === 0) {
    return (
      <Card className="col-span-1 h-full border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Budgets & Pockets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
          <p>No active budgets found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 h-full flex flex-col border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Budgets & Pockets
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 overflow-y-auto pr-2">
        {budgets.map((budget) => {
          const percent =
            budget.allocatedCents > 0
              ? Math.min(100, Math.max(0, (budget.spentCents / budget.allocatedCents) * 100))
              : 0;

          const isOver = budget.spentCents > budget.allocatedCents;

          return (
            <div key={budget.id} className="space-y-3">
              <div className="flex justify-between items-end gap-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {budget.name}
                </span>
                <span className="shrink-0 text-slate-600 dark:text-slate-400">
                  <span className={cn(isOver ? "text-rose-600 dark:text-rose-400 font-medium" : "")}>
                    {formatCompactCurrency(budget.spentCents, budget.currency)}
                  </span>
                  <span className="opacity-60">
                    {" "}/ {formatCompactCurrency(budget.allocatedCents, budget.currency)}
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all", 
                    isOver ? "bg-rose-500" : "bg-slate-800 dark:bg-slate-200"
                  )} 
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
