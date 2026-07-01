import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DashboardMetricCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  eyebrow?: string;
  tone?: "neutral" | "income" | "expense" | "cash" | "coverage";
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
  icon: Icon,
  eyebrow,
  tone = "neutral",
  trend,
  className,
}: DashboardMetricCardProps) {
  const toneStyles = {
    neutral: "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950",
    income: "bg-emerald-500 text-white",
    expense: "bg-rose-500 text-white",
    cash: "bg-indigo-500 text-white",
    coverage: "bg-amber-500 text-white",
  }[tone];

  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_22px_70px_-44px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pb-0 pt-5">
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
              {eyebrow}
            </p>
          )}
          <CardTitle className="text-sm font-medium leading-5 text-neutral-500 dark:text-neutral-400">
            {title}
          </CardTitle>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm",
              toneStyles,
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-5">
        <div className="truncate text-[clamp(1.55rem,2vw,2.35rem)] font-semibold tracking-tight text-neutral-950 dark:text-white">
          {value}
        </div>
        {description && !trend && (
          <p className="mt-2 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
        {trend && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-1 text-xs font-semibold",
                trend.value === 0
                  ? "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400"
                  : (trend.value > 0 && trend.isPositiveGood !== false) || (trend.value < 0 && trend.isPositiveGood === false)
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
