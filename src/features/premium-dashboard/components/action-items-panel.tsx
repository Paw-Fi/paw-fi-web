import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, ArrowRight, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface ActionItemsPanelProps {
  items: PremiumDashboardSummary["actionItems"];
}

const severityConfig = {
  info: {
    icon: Info,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-100 dark:border-blue-900/50",
  },
  warning: {
    icon: AlertCircle,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-100 dark:border-amber-900/50",
  },
  urgent: {
    icon: Bell,
    colorClass: "text-rose-500",
    bgClass: "bg-rose-50 dark:bg-rose-950/30",
    borderClass: "border-rose-100 dark:border-rose-900/50",
  },
  success: {
    icon: CheckCircle2,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    borderClass: "border-emerald-100 dark:border-emerald-900/50",
  },
};

export function ActionItemsPanel({ items }: ActionItemsPanelProps) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Action Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3 opacity-50" />
          <p className="text-muted-foreground font-medium">All caught up!</p>
          <p className="text-sm text-slate-500">No pending actions right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Action Items
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-semibold">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.map((item) => {
          const config = severityConfig[item.severity] || severityConfig.info;
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col sm:flex-row gap-4 p-4 rounded-xl border items-start sm:items-center justify-between",
                config.bgClass,
                config.borderClass
              )}
            >
              <div className="flex gap-4 items-start">
                <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.colorClass)} />
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
              
              {item.actionLabel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 w-full sm:w-auto gap-2"
                  asChild
                >
                  {item.actionHref ? (
                    item.actionHref.startsWith("http") ? (
                      <a href={item.actionHref} target="_blank" rel="noreferrer">
                        {item.actionLabel}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link to={item.actionHref as any}>
                        {item.actionLabel}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )
                  ) : (
                    <button>
                      {item.actionLabel}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
