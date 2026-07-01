import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Siren } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItemsPanelProps {
  items: PremiumDashboardSummary["actionItems"];
}

export function ActionItemsPanel({ items }: ActionItemsPanelProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <CardHeader className="px-5 pb-0 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Action items
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-5 pb-5 pt-5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const severity = {
            info: {
              icon: Info,
              iconClass: "bg-sky-500 text-white",
              shellClass: "border-sky-200/80 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-400/10",
            },
            warning: {
              icon: AlertTriangle,
              iconClass: "bg-amber-500 text-white",
              shellClass: "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-400/10",
            },
            urgent: {
              icon: Siren,
              iconClass: "bg-rose-500 text-white",
              shellClass: "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/20 dark:bg-rose-400/10",
            },
            success: {
              icon: CheckCircle2,
              iconClass: "bg-emerald-500 text-white",
              shellClass: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/10",
            },
          }[item.severity];
          const Icon = severity.icon;
          const actionClassName =
            "inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-semibold text-neutral-950 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/20 dark:text-white dark:hover:text-neutral-300 dark:focus-visible:ring-white/30";

          return (
            <div
              key={item.id}
              className={cn(
                "flex min-h-44 flex-col justify-between rounded-lg border p-4 transition-all duration-300 motion-safe:hover:-translate-y-0.5",
                severity.shellClass,
              )}
            >
              <div>
                <div className={cn("mb-4 flex size-9 items-center justify-center rounded-lg shadow-sm", severity.iconClass)}>
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <h4 className="text-base font-semibold leading-6 text-neutral-950 dark:text-white">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-300">
                  {item.description}
                </p>
              </div>
              
              {item.actionLabel && (
                <div className="mt-5 shrink-0">
                  {item.actionHref ? (
                    item.actionHref.startsWith("http") ? (
                      <a href={item.actionHref} target="_blank" rel="noreferrer" className={actionClassName}>
                        {item.actionLabel}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </a>
                    ) : item.actionHref.startsWith("#") ? (
                      <a href={item.actionHref} className={actionClassName}>
                        {item.actionLabel}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <Link to={item.actionHref as any} className={actionClassName}>
                        {item.actionLabel}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    )
                  ) : (
                    <button type="button" className={actionClassName}>
                      {item.actionLabel}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
