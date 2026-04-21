import { TrendingUp, TrendingDown, MessageCircle } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MessageAnalyticsCardProps {
  title: string;
  totalValue: number;
  dailyData: { date: string; whatsapp: number; telegram: number }[];
  changePercent: number;
  channel: "whatsapp" | "telegram";
  icon?: React.ReactNode;
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
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
            {title}
          </p>
          <CardTitle className="text-2xl font-bold text-white">
            {totalValue.toLocaleString()}
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
        {/* Mini area chart */}
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg">
                        <div className="text-white/60">{data.fullDate}</div>
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
