import { TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrendPoint {
  date: string;
  value: number;
}

interface ProviderBreakdown {
  stripe: number;
  apple: number;
}

interface SubscriptionMetricCardProps {
  title: string;
  value: number;
  trend: TrendPoint[];
  changePercent: number;
  providers?: ProviderBreakdown;
  color?: string;
  icon?: React.ReactNode;
}

export function SubscriptionMetricCard({
  title,
  value,
  trend,
  changePercent,
  providers,
  color = "#10B981",
  icon,
}: SubscriptionMetricCardProps) {
  const isPositive = changePercent >= 0;
  const hasProviders = providers && (providers.stripe > 0 || providers.apple > 0);

  // Format trend data for chart as a cumulative series
  const chartData = (() => {
    let running = 0;
    return trend.map((point) => {
      running += point.value;
      return {
        date: formatShortDate(point.date),
        fullDate: point.date,
        value: running,
      };
    });
  })();

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
            {title}
          </p>
          <CardTitle className="text-2xl font-bold text-white">
            {value.toLocaleString()}
          </CardTitle>
        </div>
        {icon && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini trend chart */}
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg">
                        <div className="text-white/60">{data.fullDate}</div>
                        <div className="font-medium">{data.value}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
              />
            </LineChart>
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

        {/* Provider breakdown legend */}
        {hasProviders && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#635BFF]" />
              <span className="text-xs text-white/60">
                Stripe <span className="text-white/80 font-medium">{providers?.stripe}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
              <span className="text-xs text-white/60">
                Apple <span className="text-white/80 font-medium">{providers?.apple}</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
