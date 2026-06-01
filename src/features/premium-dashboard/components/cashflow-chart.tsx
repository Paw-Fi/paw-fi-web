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
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-lg">Cashflow Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg">
                        <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                          {label}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                            <span>Income:</span>
                            <span className="font-semibold">
                              {formatCompactCurrency(
                                (payload[0]?.value as number) * 100,
                                currency
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-rose-600 dark:text-rose-400">
                            <span>Expense:</span>
                            <span className="font-semibold">
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
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="expenseValue"
                name="Expense"
                fill="#f43f5e"
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
