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
  trialToActive: SubscriptionMetric;
}

interface DailyTrendRow {
  date: string;
  metric: string;
  provider: string;
  count: number;
}

export function useSubscriptionAnalytics(refreshKey = 0): SubscriptionAnalytics {
  const [data, setData] = useState<SubscriptionAnalytics>({
    monthlyActive: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
    yearlyActive: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
    lifetimeActive: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
    totalCancelled: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
    trialToActive: { currentValue: 0, trend: [], changePercent: 0, providers: { stripe: 0, apple: 0 } },
  });

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date().toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_creator_subscription_analytics');

        if (analyticsError) return;

        const rows = analyticsData || [];

        let monthlyActiveCount = 0;
        let yearlyActiveCount = 0;
        let lifetimeActiveCount = 0;
        let cancelledCount = 0;
        let trialToActiveCount = 0;

        const monthlyProviders: ProviderBreakdown = { stripe: 0, apple: 0 };
        const yearlyProviders: ProviderBreakdown = { stripe: 0, apple: 0 };
        const lifetimeProviders: ProviderBreakdown = { stripe: 0, apple: 0 };
        const cancelledProviders: ProviderBreakdown = { stripe: 0, apple: 0 };
        const trialToActiveProviders: ProviderBreakdown = { stripe: 0, apple: 0 };

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

          if (
            row.status === 'active'
            && (
              (row.plan_type === 'plus' && (row.billing_interval === 'monthly' || row.billing_interval === 'yearly'))
              || row.plan_type === 'lifetime'
            )
          ) {
            const trialToActiveRowCount = Number(row.trial_to_active_count ?? 0);

            trialToActiveCount += trialToActiveRowCount;
            if (provider === 'stripe') trialToActiveProviders.stripe += trialToActiveRowCount;
            else if (provider === 'app_store') trialToActiveProviders.apple += trialToActiveRowCount;
          }
        }

        const { data: dailyData, error: dailyError } = await supabase
          .rpc('get_creator_subscription_daily_trends', {
            p_start_date: sixtyDaysAgo.split('T')[0],
            p_end_date: now.split('T')[0],
          });

        if (dailyError) {
          setData({
            monthlyActive: {
              currentValue: monthlyActiveCount,
              trend: [],
              changePercent: 0,
              providers: monthlyProviders,
            },
            yearlyActive: {
              currentValue: yearlyActiveCount,
              trend: [],
              changePercent: 0,
              providers: yearlyProviders,
            },
            lifetimeActive: {
              currentValue: lifetimeActiveCount,
              trend: [],
              changePercent: 0,
              providers: lifetimeProviders,
            },
            totalCancelled: {
              currentValue: cancelledCount,
              trend: [],
              changePercent: 0,
              providers: cancelledProviders,
            },
            trialToActive: {
              currentValue: trialToActiveCount,
              trend: [],
              changePercent: 0,
              providers: trialToActiveProviders,
            },
          });
          return;
        }

        const dailyMap = new Map<string, Map<string, number>>();
        for (const row of (dailyData || []) as unknown as DailyTrendRow[]) {
          if (!dailyMap.has(row.metric)) {
            dailyMap.set(row.metric, new Map());
          }
          const metricMap = dailyMap.get(row.metric)!;
          metricMap.set(row.date, (metricMap.get(row.date) || 0) + row.count);
        }

        const monthlyTrend = buildTrend(dailyMap, 'monthly_active', 29, 0);
        const monthlyPrevTrend = buildTrend(dailyMap, 'monthly_active', 59, 30);
        const yearlyTrend = buildTrend(dailyMap, 'yearly_active', 29, 0);
        const yearlyPrevTrend = buildTrend(dailyMap, 'yearly_active', 59, 30);
        const lifetimeTrend = buildTrend(dailyMap, 'lifetime_active', 29, 0);
        const lifetimePrevTrend = buildTrend(dailyMap, 'lifetime_active', 59, 30);
        const cancelledTrend = buildTrend(dailyMap, 'cancelled', 29, 0);
        const cancelledPrevTrend = buildTrend(dailyMap, 'cancelled', 59, 30);
        const trialToActiveTrend = buildTrend(dailyMap, 'trial_to_active', 29, 0);
        const trialToActivePrevTrend = buildTrend(dailyMap, 'trial_to_active', 59, 30);

        setData({
          monthlyActive: {
            currentValue: monthlyActiveCount,
            trend: monthlyTrend,
            changePercent: calculateChangePercent(monthlyTrend, monthlyPrevTrend),
            providers: monthlyProviders,
          },
          yearlyActive: {
            currentValue: yearlyActiveCount,
            trend: yearlyTrend,
            changePercent: calculateChangePercent(yearlyTrend, yearlyPrevTrend),
            providers: yearlyProviders,
          },
          lifetimeActive: {
            currentValue: lifetimeActiveCount,
            trend: lifetimeTrend,
            changePercent: calculateChangePercent(lifetimeTrend, lifetimePrevTrend),
            providers: lifetimeProviders,
          },
          totalCancelled: {
            currentValue: cancelledCount,
            trend: cancelledTrend,
            changePercent: calculateChangePercent(cancelledTrend, cancelledPrevTrend),
            providers: cancelledProviders,
          },
          trialToActive: {
            currentValue: trialToActiveCount,
            trend: trialToActiveTrend,
            changePercent: calculateChangePercent(trialToActiveTrend, trialToActivePrevTrend),
            providers: trialToActiveProviders,
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

function buildTrend(
  dailyMap: Map<string, Map<string, number>>,
  metric: string,
  startOffset: number,
  endOffset: number
): TrendPoint[] {
  const trend: TrendPoint[] = [];
  for (let i = startOffset; i >= endOffset; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const metricMap = dailyMap.get(metric);
    const value = metricMap?.get(date) || 0;
    trend.push({ date, value });
  }
  return trend;
}

function calculateChangePercent(currentTrend: TrendPoint[], previousTrend: TrendPoint[]): number {
  if (previousTrend.length === 0 || currentTrend.length === 0) return 0;
  const currentTotal = currentTrend.reduce((sum, p) => sum + p.value, 0);
  const previousTotal = previousTrend.reduce((sum, p) => sum + p.value, 0);
  if (previousTotal === 0) return 0;
  return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
}
