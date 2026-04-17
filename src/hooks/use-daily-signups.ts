import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface DailySignupData {
  dailyData: { date: string; count: number }[];
  totalNewUsers: number;
  todayCount: number;
  averagePerDay: number;
  changePercent: number;
}

export function useDailySignups(refreshKey = 0): DailySignupData {
  const [data, setData] = useState<DailySignupData>({
    dailyData: [],
    totalNewUsers: 0,
    todayCount: 0,
    averagePerDay: 0,
    changePercent: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data: recentRows, error: recentError } = await supabase
          .from("users")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true });

        if (recentError) return;

        const { data: prevRows, error: prevError } = await supabase
          .from("users")
          .select("created_at")
          .gte("created_at", sixtyDaysAgo)
          .lt("created_at", thirtyDaysAgo);

        if (prevError) return;

        // Aggregate by date
        const dateCounts = new Map<string, number>();
        for (const row of recentRows || []) {
          const date = new Date(row.created_at).toISOString().split("T")[0];
          dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
        }

        // Fill in missing dates with 0
        const dailyData: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          dailyData.push({ date, count: dateCounts.get(date) || 0 });
        }

        const totalNewUsers = recentRows?.length ?? 0;
        const averagePerDay = Math.round(totalNewUsers / 30);

        // Calculate today's count
        const todayStr = new Date().toISOString().split("T")[0];
        const todayCount = dateCounts.get(todayStr) || 0;

        const currentPeriodCount = recentRows?.length ?? 0;
        const previousPeriodCount = prevRows?.length ?? 0;
        const changePercent = previousPeriodCount > 0
          ? Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100)
          : 0;

        setData({
          dailyData,
          totalNewUsers,
          todayCount,
          averagePerDay,
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
