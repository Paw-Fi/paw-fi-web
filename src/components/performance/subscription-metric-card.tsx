import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

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
  trend?: TrendPoint[];
  changePercent?: number;
  providers?: ProviderBreakdown;
  color?: string;
  icon?: ReactNode;
  badgeText?: string;
  comparisonLabel?: string;
  subtitle?: string;
}

export function SubscriptionMetricCard({
  title,
  value,
  trend = [],
  changePercent,
  providers,
  color = "#10B981",
  icon,
  badgeText,
  comparisonLabel = "vs prev period",
  subtitle,
}: SubscriptionMetricCardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0;
  const hasProviders = providers && (providers.stripe > 0 || providers.apple > 0);
  const hasTrend = trend && trend.length > 0;

  const chartData = (() => {
    if (!hasTrend) return [];
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
    <div className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-4 transition-colors hover:border-slate-700/80">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {title}
          </span>
          {badgeText && (
            <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900 text-slate-400">
              {badgeText}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {value.toLocaleString()}
          </span>
          {changePercent !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded",
                isPositive
                  ? "text-emerald-400 bg-emerald-950/50 border border-emerald-800/40"
                  : "text-rose-400 bg-rose-950/50 border border-rose-800/40"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? "+" : ""}
              {changePercent}%
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 font-normal leading-tight">
            {subtitle}
          </p>
        )}
      </div>

      {/* Optional Sparkline / Providers */}
      {(hasTrend || hasProviders) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-2">
          {hasTrend && (
            <div className="h-9 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-white shadow">
                            <span className="text-slate-400">{data.fullDate}:</span>{" "}
                            <span className="font-semibold">{data.value}</span>
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
                    strokeWidth={1.75}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {hasProviders && (
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#635BFF]" />
                Stripe: <strong className="text-slate-200 font-medium">{providers?.stripe}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
                Apple: <strong className="text-slate-200 font-medium">{providers?.apple}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}


