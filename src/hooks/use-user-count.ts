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

      try {
        // Query 1: Total user count
        const { count, error: countError } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        if (countError) return;

        // Query 2: Daily signups for trend (last 30 days)
        const { data: recentRows, error: recentError } = await supabase
          .from("users")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true });

        if (recentError) return;

        // Query 3: Previous 30 days for comparison
        const { data: prevRows, error: prevError } = await supabase
          .from("users")
          .select("created_at")
          .gte("created_at", sixtyDaysAgo)
          .lt("created_at", thirtyDaysAgo);

        if (prevError) return;

        // Aggregate daily data for trend
        const dateCounts = new Map<string, number>();
        for (const row of recentRows || []) {
          const date = new Date(row.created_at).toISOString().split("T")[0];
          dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
        }

        // Fill in missing dates with 0
        const trend: TrendPoint[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const countValue = dateCounts.get(date) || 0;
          trend.push({ date, value: countValue });
        }

        // Calculate change percent
        const currentPeriodCount = recentRows?.length ?? 0;
        const previousPeriodCount = prevRows?.length ?? 0;
        const changePercent = previousPeriodCount > 0
          ? Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100)
          : 0;

        setData({
          currentValue: count ?? 0,
          trend,
          changePercent,
        });
      } catch {
        // Silent error handling
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}
