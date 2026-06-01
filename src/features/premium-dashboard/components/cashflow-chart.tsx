import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "../lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CashflowChartProps {
  trends: PremiumDashboardSummary["trends"];
  currency: string;
}

export function CashflowChart({ trends, currency }: CashflowChartProps) {
  if (!trends || trends.length === 0) {
    return (
      <Card className="col-span-1 lg:col-span-2 border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Cashflow Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[300px] text-center text-slate-400">
          <p>No cashflow data available for this period.</p>
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
    <Card className="col-span-1 lg:col-span-2 border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Cashflow Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(val) => formatCompactCurrency(val * 100, currency)}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-md">
                        <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                          {label}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                            <span>Income:</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {formatCompactCurrency(
                                (payload[0]?.value as number) * 100,
                                currency
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                            <span>Expense:</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {formatCompactCurrency(
                                (payload[1]?.value as number) * 100,
                                currency
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Bar
                dataKey="incomeValue"
                name="Income"
                fill="#94a3b8" // subtle slate
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="expenseValue"
                name="Expense"
                fill="#334155" // darker slate
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
