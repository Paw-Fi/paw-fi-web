import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "../lib/formatters";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";

interface CashflowChartProps {
  trends: PremiumDashboardSummary["trends"];
  currency: string;
}

export function CashflowChart({ trends, currency }: CashflowChartProps) {
  if (!trends || trends.length === 0) {
    return (
      <Card className="col-span-1 rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:col-span-2 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
        <CardHeader className="px-5 pb-0 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Cashflow Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[320px] flex-col items-center justify-center px-5 pb-5 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-300">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No cashflow data available for this period.</p>
        </CardContent>
      </Card>
    );
  }

  const data = trends.map((t) => ({
    ...t,
    displayDate: new Date(t.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    incomeValue: t.incomeCents / 100,
    expenseValue: t.expenseCents / 100,
    netValue: t.netCashflowCents / 100,
  }));

  return (
    <Card className="col-span-1 rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:col-span-2 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pb-0 pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Cashflow Trends
          </p>
          <CardTitle className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
            Daily movement
          </CardTitle>
        </div>
        <div className="hidden items-center gap-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            Income
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" />
            Expense
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-indigo-500" />
            Net
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 pt-4 sm:px-5">
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d4d4d8" opacity={0.45} />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#71717a" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={68}
                tick={{ fontSize: 12, fill: "#71717a" }}
                tickFormatter={(val) => formatCompactCurrency(val * 100, currency)}
              />
              <Tooltip
                cursor={{ fill: "rgba(113,113,122,0.08)", radius: 8 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const income = payload.find((item) => item.dataKey === "incomeValue")?.value as number | undefined;
                    const expense = payload.find((item) => item.dataKey === "expenseValue")?.value as number | undefined;
                    const net = payload.find((item) => item.dataKey === "netValue")?.value as number | undefined;

                    return (
                      <div className="rounded-lg border border-neutral-200 bg-white/95 p-4 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/95">
                        <p className="mb-3 text-sm font-semibold text-neutral-950 dark:text-white">
                          {label}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-8 text-neutral-500 dark:text-neutral-400">
                            <span>Income:</span>
                            <span className="font-semibold text-neutral-950 dark:text-white">
                              {formatCompactCurrency((income ?? 0) * 100, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-8 text-neutral-500 dark:text-neutral-400">
                            <span>Expense:</span>
                            <span className="font-semibold text-neutral-950 dark:text-white">
                              {formatCompactCurrency((expense ?? 0) * 100, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-8 border-t border-neutral-200 pt-1 text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                            <span>Net:</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                              {formatCompactCurrency((net ?? 0) * 100, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="incomeValue"
                name="Income"
                fill="#10b981"
                radius={[8, 8, 2, 2]}
                maxBarSize={34}
              />
              <Bar
                dataKey="expenseValue"
                name="Expense"
                fill="#f43f5e"
                radius={[8, 8, 2, 2]}
                maxBarSize={34}
              />
              <Line
                type="monotone"
                dataKey="netValue"
                name="Net"
                stroke="#6366f1"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#6366f1" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
