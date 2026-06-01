import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardMetricCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositiveGood?: boolean;
  };
  className?: string;
}

export function DashboardMetricCard({
  title,
  value,
  description,
  trend,
  className,
}: DashboardMetricCardProps) {
  return (
    <Card className={cn("overflow-hidden border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl", className)}>
      <CardHeader className="pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
          {value}
        </div>
        {description && !trend && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "text-sm font-medium",
                trend.value === 0
                  ? "text-slate-500 dark:text-slate-400"
                  : (trend.value > 0 && trend.isPositiveGood !== false) || (trend.value < 0 && trend.isPositiveGood === false)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
