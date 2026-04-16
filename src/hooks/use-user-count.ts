import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface UserCountMetric {
  currentValue: number;
  trend: TrendPoint[];
  changePercent: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export function useUserCount(refreshKey = 0): UserCountMetric {
  const [data, setData] = useState<UserCountMetric>({
    currentValue: 0,
    trend: [],
    changePercent: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      if (!error && count !== null) {
        const trend = generateMockTrend(thirtyDaysAgo, now, count);
        const prevTrend = generateMockTrend(sixtyDaysAgo, thirtyDaysAgo, Math.max(0, count - 50));

        setData({
          currentValue: count,
          trend,
          changePercent: calculateChangePercent(trend, prevTrend),
        });
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}

function generateMockTrend(startDate: string, endDate: string, endValue: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const days = Math.floor((end - start) / (24 * 60 * 60 * 1000));

  for (let i = 0; i <= Math.min(days, 30); i++) {
    const date = new Date(start + i * 24 * 60 * 60 * 1000);
    const progress = i / Math.min(days, 30);
    const baseValue = endValue * progress;
    const noise = Math.random() * endValue * 0.05 - endValue * 0.025;
    points.push({
      date: date.toISOString().split("T")[0],
      value: Math.max(0, Math.round(baseValue + noise)),
    });
  }

  return points;
}

function calculateChangePercent(currentTrend: TrendPoint[], previousTrend: TrendPoint[]): number {
  if (previousTrend.length === 0 || currentTrend.length === 0) return 0;
  const current = currentTrend[currentTrend.length - 1]?.value ?? 0;
  const previous = previousTrend[previousTrend.length - 1]?.value ?? 1;
  return Math.round(((current - previous) / previous) * 100);
}
