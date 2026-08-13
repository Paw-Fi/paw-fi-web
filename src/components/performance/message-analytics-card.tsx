import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MessageAnalyticsCardProps {
  title: string;
  totalValue: number;
  dailyData: { date: string; whatsapp: number; telegram: number }[];
  changePercent: number;
  channel: "whatsapp" | "telegram";
  icon?: ReactNode;
}

export function MessageAnalyticsCard({
  title,
  totalValue,
  dailyData,
  changePercent,
  channel,
  icon,
}: MessageAnalyticsCardProps) {
  const isPositive = changePercent >= 0;
  const color = channel === "whatsapp" ? "#22C55E" : "#3B82F6";

  // Format chart data for this channel
  const chartData = dailyData.map((point) => ({
    date: formatShortDate(point.date),
    fullDate: point.date,
    value: channel === "whatsapp" ? point.whatsapp : point.telegram,
  }));

  return (
    <Card className="border-white/10 bg-slate-900/60 backdrop-blur-sm hover:border-white/20 transition-all shadow-md flex flex-col justify-between">
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {title}
            </p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/15 bg-white/5 text-slate-300">
              Period Metric
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            {totalValue.toLocaleString()}
          </CardTitle>
          <p className="text-xs text-slate-400">Messages in selected period</p>
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10"
            style={{ backgroundColor: `${color}15` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {/* Mini area chart */}
        <div className="h-14 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs text-white shadow-md">
                        <div className="text-slate-400">{data.fullDate}</div>
                        <div className="font-medium">{data.value} messages</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Change indicator */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 font-medium",
              isPositive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
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
          <span className="text-slate-400 text-[11px]">vs previous period</span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

