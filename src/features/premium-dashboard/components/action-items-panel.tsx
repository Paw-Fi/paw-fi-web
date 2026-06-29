import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";

interface ActionItemsPanelProps {
  items: PremiumDashboardSummary["actionItems"];
}

export function ActionItemsPanel({ items }: ActionItemsPanelProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Action Items
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => {
          return (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 items-start sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
            >
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  {item.title}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {item.description}
                </p>
              </div>
              
              {item.actionLabel && (
                <div className="shrink-0 w-full sm:w-auto">
                  {item.actionHref ? (
                    item.actionHref.startsWith("http") ? (
                      <a href={item.actionHref} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {item.actionLabel} &rarr;
                      </a>
                    ) : (
                      <Link to={item.actionHref as any} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {item.actionLabel} &rarr;
                      </Link>
                    )
                  ) : (
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      {item.actionLabel} &rarr;
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
