import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardMetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
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
  icon: Icon,
  description,
  trend,
  className,
}: DashboardMetricCardProps) {
  return (
    <Card className={cn("overflow-hidden border-slate-200 dark:border-slate-800", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {title}
        </CardTitle>
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
          <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </div>
        {description && !trend && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "text-sm font-medium px-2 py-0.5 rounded-full",
                trend.value === 0
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  : (trend.value > 0 && trend.isPositiveGood !== false) || (trend.value < 0 && trend.isPositiveGood === false)
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
