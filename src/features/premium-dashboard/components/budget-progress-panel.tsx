import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "../lib/formatters";
import { cn } from "@/lib/utils";
import { PiggyBank } from "lucide-react";

interface BudgetProgressPanelProps {
  budgets: PremiumDashboardSummary["budgetProgress"];
}

export function BudgetProgressPanel({ budgets }: BudgetProgressPanelProps) {
  if (!budgets || budgets.length === 0) {
    return (
      <Card className="col-span-1 h-full rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
        <CardHeader className="px-5 pb-0 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Budgets & Pockets</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 flex-col items-center justify-center px-5 pb-5 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-300">
            <PiggyBank className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No active budgets found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 flex h-full flex-col rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pb-0 pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Budgets & Pockets
          </p>
          <CardTitle className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
            Allocation health
          </CardTitle>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
          <PiggyBank className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-5">
        {budgets.map((budget) => {
          const percent =
            budget.allocatedCents > 0
              ? Math.min(100, Math.max(0, (budget.spentCents / budget.allocatedCents) * 100))
              : 0;

          const isOver = budget.spentCents > budget.allocatedCents;

          return (
            <div key={budget.id} className="rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-neutral-950 dark:text-white">
                    {budget.name}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {formatCompactCurrency(budget.remainingCents, budget.currency)} remaining
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    isOver
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
                      : "bg-white text-neutral-600 shadow-sm dark:bg-white/10 dark:text-neutral-300",
                  )}
                >
                  {Math.round(percent)}%
                </span>
              </div>

              <div className="mt-4 flex justify-between gap-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span className={cn(isOver && "text-rose-600 dark:text-rose-300")}>
                  {formatCompactCurrency(budget.spentCents, budget.currency)} spent
                </span>
                <span>{formatCompactCurrency(budget.allocatedCents, budget.currency)} limit</span>
              </div>

              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                aria-label={`${budget.name} budget used`}
              >
                <div 
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out", 
                    isOver
                      ? "bg-rose-500"
                      : "bg-neutral-950 dark:bg-white"
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
