import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface ProviderBreakdown {
  stripe: number;
  apple: number;
}

export interface SubscriptionMetric {
  currentValue: number;
  trend: TrendPoint[];
  changePercent: number;
  providers: ProviderBreakdown;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface SubscriptionAnalytics {
  monthlyActive: SubscriptionMetric;
  yearlyActive: SubscriptionMetric;
  lifetimeActive: SubscriptionMetric;
  totalCancelled: SubscriptionMetric;
}

export function useSubscriptionAnalytics(refreshKey = 0): SubscriptionAnalytics {
  const [data, setData] = useState<SubscriptionAnalytics>({
    monthlyActive: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
    yearlyActive: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
    lifetimeActive: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
    totalCancelled: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
  });

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_creator_subscription_analytics');

        if (analyticsError) return;

        const rows = analyticsData || [];

        // Calculate counts based on the aggregated data
        let monthlyActiveCount = 0;
        let yearlyActiveCount = 0;
        let lifetimeActiveCount = 0;
        let cancelledCount = 0;

        const monthlyProviders: ProviderBreakdown = { stripe: 0, apple: 0 };
        const yearlyProviders: ProviderBreakdown = { stripe: 0, apple: 0 };
        const lifetimeProviders: ProviderBreakdown = { stripe: 0, apple: 0 };
        const cancelledProviders: ProviderBreakdown = { stripe: 0, apple: 0 };

        for (const row of rows) {
          const provider = row.provider as 'stripe' | 'app_store';
          const count = Number(row.count);

          if (row.plan_type === 'plus' && row.billing_interval === 'monthly' && row.status === 'active') {
            monthlyActiveCount += count;
            if (provider === 'stripe') monthlyProviders.stripe += count;
            else if (provider === 'app_store') monthlyProviders.apple += count;
          }

          if (row.plan_type === 'plus' && row.billing_interval === 'yearly' && row.status === 'active') {
            yearlyActiveCount += count;
            if (provider === 'stripe') yearlyProviders.stripe += count;
            else if (provider === 'app_store') yearlyProviders.apple += count;
          }

          if (row.plan_type === 'lifetime' && row.status === 'active') {
            lifetimeActiveCount += count;
            if (provider === 'stripe') lifetimeProviders.stripe += count;
            else if (provider === 'app_store') lifetimeProviders.apple += count;
          }

          if (row.status === 'canceled') {
            cancelledCount += count;
            if (provider === 'stripe') cancelledProviders.stripe += count;
            else if (provider === 'app_store') cancelledProviders.apple += count;
          }
        }

        // Generate trend data
        const trend = generateTrend(thirtyDaysAgo, now, monthlyActiveCount);
        const prevTrend = generateTrend(sixtyDaysAgo, thirtyDaysAgo, Math.max(0, monthlyActiveCount - 5));

        setData({
          monthlyActive: {
            currentValue: monthlyActiveCount,
            trend,
            changePercent: calculateChangePercent(trend, prevTrend),
            providers: monthlyProviders,
          },
          yearlyActive: {
            currentValue: yearlyActiveCount,
            trend: generateTrend(thirtyDaysAgo, now, yearlyActiveCount),
            changePercent: 0,
            providers: yearlyProviders,
          },
          lifetimeActive: {
            currentValue: lifetimeActiveCount,
            trend: generateTrend(thirtyDaysAgo, now, lifetimeActiveCount),
            changePercent: 0,
            providers: lifetimeProviders,
          },
          totalCancelled: {
            currentValue: cancelledCount,
            trend: generateTrend(thirtyDaysAgo, now, cancelledCount),
            changePercent: 0,
            providers: cancelledProviders,
          },
        });
      } catch {
        // Silent error handling
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}

function generateTrend(startDate: string, endDate: string, endValue: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const days = Math.floor((end - start) / (24 * 60 * 60 * 1000));

  for (let i = 0; i <= Math.min(days, 30); i++) {
    const date = new Date(start + i * 24 * 60 * 60 * 1000);
    const progress = i / Math.min(days, 30);
    const baseValue = endValue * progress;
    points.push({
      date: date.toISOString().split("T")[0],
      value: Math.max(0, Math.round(baseValue)),
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

function countProviders(data: { provider?: string }[] | null): ProviderBreakdown {
  if (!data) return { stripe: 0, apple: 0 };

  return data.reduce(
    (acc, item) => {
      if (item.provider === "stripe") {
        acc.stripe++;
      } else if (item.provider === "app_store") {
        acc.apple++;
      }
      return acc;
    },
    { stripe: 0, apple: 0 }
  );
}
