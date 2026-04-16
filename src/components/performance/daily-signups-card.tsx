import { TrendingUp, TrendingDown, UserPlus } from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DailySignupsCardProps {
  dailyData: { date: string; count: number }[];
  totalNewUsers: number;
  averagePerDay: number;
  changePercent: number;
}

export function DailySignupsCard({
  dailyData,
  totalNewUsers,
  averagePerDay,
  changePercent,
}: DailySignupsCardProps) {
  const isPositive = changePercent >= 0;

  // Format chart data
  const chartData = dailyData.map((point) => ({
    date: formatShortDate(point.date),
    fullDate: point.date,
    value: point.count,
  }));

  // Get last 7 days for mini chart
  const last7Days = chartData.slice(-7);

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
            Daily Signups
          </p>
          <CardTitle className="text-2xl font-bold text-white">
            {totalNewUsers.toLocaleString()}
          </CardTitle>
          <p className="text-xs text-white/50">
            {averagePerDay} avg/day (30d)
          </p>
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: "#10B98120" }}
        >
          <UserPlus className="h-4 w-4 text-emerald-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini bar chart */}
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg">
                        <div className="text-white/60">{data.fullDate}</div>
                        <div className="font-medium">{data.value} signups</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="value"
                fill="#10B981"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Change indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
              isPositive
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? "+" : ""}
            {changePercent}%
          </div>
          <span className="text-xs text-white/50">vs last 30 days</span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
