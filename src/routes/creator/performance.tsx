import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  RefreshCw,
  Users,
  MapPin,
  Calendar,
  CalendarDays,
  Infinity as InfinityIcon,
  Ban,
  MessageCircle,
  AlertCircle,
  Activity,
  UserPlus,
  BadgeCheck,
  Globe,
  CreditCard,
  Sparkles,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useUserCount } from "@/hooks/use-user-count";
import { useUsersByTimezone } from "@/hooks/use-users-by-timezone";
import { useSubscriptionAnalytics } from "@/hooks/use-subscription-analytics";
import { useTrialingUsers } from "@/hooks/use-trialing-users";
import { useMessageAnalytics } from "@/hooks/use-message-analytics";
import { useDailySignups } from "@/hooks/use-daily-signups";
import { useDailySignupsByTimezone } from "@/hooks/use-daily-signups-by-timezone";
import { useDAUByTimezone } from "@/hooks/use-dau-by-timezone";
import { useTotalDAU } from "@/hooks/use-total-dau";
import { useCreatorDateRange } from "@/hooks/use-creator-date-range";
import { UserGeoMap } from "@/components/performance/user-geo-map";
import { DAUGeoMap } from "@/components/performance/dau-geo-map";
import { SubscriptionMetricCard } from "@/components/performance/subscription-metric-card";
import {
  TrialingUsersSummaryCard,
  TrialingUsersTable,
} from "@/components/performance/trialing-users-table";
import { MessageAnalyticsCard } from "@/components/performance/message-analytics-card";
import { RangeComparisonCard } from "@/components/performance/range-comparison-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { dateToIso, getInclusiveDayCount } from "@/lib/creator-date-range";
import { CreatorHeader } from "@/components/creator/creator-header";

export const Route = createFileRoute("/creator/performance")({
  component: PerformancePage,
});

const trialExpiryFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatTrialExpiryDistance(expiryAt: number): string {
  const diffMs = expiryAt - Date.now();
  const totalMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60000));

  if (totalMinutes < 60) {
    return diffMs >= 0 ? `in ${totalMinutes}m` : `${totalMinutes}m ago`;
  }

  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 24) {
    return diffMs >= 0 ? `in ${totalHours}h` : `${totalHours}h ago`;
  }

  const totalDays = Math.round(totalHours / 24);
  return diffMs >= 0 ? `in ${totalDays}d` : `${totalDays}d ago`;
}

function PerformancePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    rangePreset,
    startDate,
    endDate,
    compareEnabled,
    compareMode,
    compareStartDate,
    compareEndDate,
    normalizedRange,
    compareRange,
    rangeLabel,
    compareLabel,
    setStartDate,
    setEndDate,
    setCompareEnabled,
    setCompareMode,
    setCompareStartDate,
    setCompareEndDate,
    applyPreset,
  } = useCreatorDateRange();

  // Data Hooks
  const totalUsers = useUserCount(refreshKey);
  const usersByTimezone = useUsersByTimezone(refreshKey);
  const subscriptionAnalytics = useSubscriptionAnalytics(refreshKey);
  const trialingUsers = useTrialingUsers(refreshKey);
  const messageAnalytics = useMessageAnalytics(refreshKey);
  const dailySignups = useDailySignups(refreshKey);
  const dailySignupsByTimezone = useDailySignupsByTimezone(refreshKey);
  const dauByTimezone = useDAUByTimezone(refreshKey);
  const totalDAU = useTotalDAU(refreshKey);

  // Derived & Filtered Metrics
  const trialingUsersByClosestExpiry = useMemo(() => {
    const now = Date.now();
    return trialingUsers
      .map((user) => ({
        ...user,
        expiryAt: user.trialEnd
          ? new Date(user.trialEnd).getTime()
          : Number.NaN,
      }))
      .filter((user) => Number.isFinite(user.expiryAt) && user.expiryAt >= now)
      .sort((a, b) => a.expiryAt - b.expiryAt);
  }, [trialingUsers]);

  const isRangeCoveredByLocalData = useMemo(() => {
    const earliestAvailable = dateToIso(subDays(new Date(), 59));
    return normalizedRange.start >= earliestAvailable;
  }, [normalizedRange.start]);

  // Date-Filtered Series: Acquisition Signups
  const signupsCurrent = useMemo(
    () =>
      buildRangeSeries(
        dailySignups.dailyData,
        normalizedRange.start,
        normalizedRange.end,
      ),
    [dailySignups.dailyData, normalizedRange.end, normalizedRange.start],
  );
  const signupsCompare = useMemo(
    () =>
      buildRangeSeries(
        dailySignups.dailyData,
        compareRange.start,
        compareRange.end,
      ),
    [compareRange.end, compareRange.start, dailySignups.dailyData],
  );

  // Date-Filtered Series: Message Engagement
  const messageCurrent = useMemo(
    () =>
      buildMessageRangeSeries(
        messageAnalytics.dailyData,
        normalizedRange.start,
        normalizedRange.end,
      ),
    [messageAnalytics.dailyData, normalizedRange.end, normalizedRange.start],
  );
  const messageCompare = useMemo(
    () =>
      buildMessageRangeSeries(
        messageAnalytics.dailyData,
        compareRange.start,
        compareRange.end,
      ),
    [compareRange.end, compareRange.start, messageAnalytics.dailyData],
  );

  // Period Summaries
  const signupsSummary = useMemo(() => {
    const current = sumNumericField(signupsCurrent, "count");
    const previous = sumNumericField(signupsCompare, "count");
    const days = getInclusiveDayCount(
      normalizedRange.start,
      normalizedRange.end,
    );
    return {
      current,
      previous,
      averagePerDay: days > 0 ? Math.round(current / days) : 0,
      changePercent: calculateChangePercent(current, previous),
    };
  }, [
    normalizedRange.end,
    normalizedRange.start,
    signupsCompare,
    signupsCurrent,
  ]);

  const messagesSummary = useMemo(() => {
    const currentWhatsapp = sumNumericField(messageCurrent, "whatsapp");
    const currentTelegram = sumNumericField(messageCurrent, "telegram");
    const previousWhatsapp = sumNumericField(messageCompare, "whatsapp");
    const previousTelegram = sumNumericField(messageCompare, "telegram");

    const totalCurrent = currentWhatsapp + currentTelegram;
    const totalPrevious = previousWhatsapp + previousTelegram;

    return {
      currentWhatsapp,
      currentTelegram,
      totalCurrent,
      totalChangePercent: calculateChangePercent(totalCurrent, totalPrevious),
      whatsappChangePercent: calculateChangePercent(
        currentWhatsapp,
        previousWhatsapp,
      ),
      telegramChangePercent: calculateChangePercent(
        currentTelegram,
        previousTelegram,
      ),
    };
  }, [messageCompare, messageCurrent]);

  // Subscription Period Events (Date-Filtered activity during selected period)
  const subscriptionPeriodEvents = useMemo(() => {
    const conversionsCurrent = sumTrendByDateRange(
      subscriptionAnalytics.trialToActive.trend,
      normalizedRange.start,
      normalizedRange.end,
    );
    const conversionsCompare = sumTrendByDateRange(
      subscriptionAnalytics.trialToActive.trend,
      compareRange.start,
      compareRange.end,
    );

    const cancellationsCurrent = sumTrendByDateRange(
      subscriptionAnalytics.totalCancelled.trend,
      normalizedRange.start,
      normalizedRange.end,
    );
    const cancellationsCompare = sumTrendByDateRange(
      subscriptionAnalytics.totalCancelled.trend,
      compareRange.start,
      compareRange.end,
    );

    return {
      conversionsCurrent,
      conversionsCompare,
      conversionsChangePercent: calculateChangePercent(
        conversionsCurrent,
        conversionsCompare,
      ),
      cancellationsCurrent,
      cancellationsCompare,
      cancellationsChangePercent: calculateChangePercent(
        cancellationsCurrent,
        cancellationsCompare,
      ),
    };
  }, [
    compareRange.end,
    compareRange.start,
    normalizedRange.end,
    normalizedRange.start,
    subscriptionAnalytics,
  ]);

  // Chart Data
  const dailyComparisonChartData = useMemo(
    () => buildDailyComparisonChartData(signupsCurrent, signupsCompare),
    [signupsCompare, signupsCurrent],
  );

  const messageChartData = useMemo(
    () => messageCurrent.map((row) => ({ ...row, label: shortDate(row.date) })),
    [messageCurrent],
  );

  const subscriptionChartData = useMemo(
    () => [
      {
        metric: "Trial->Paid Conversions",
        current: subscriptionPeriodEvents.conversionsCurrent,
        compare: subscriptionPeriodEvents.conversionsCompare,
      },
      {
        metric: "Cancellations",
        current: subscriptionPeriodEvents.cancellationsCurrent,
        compare: subscriptionPeriodEvents.cancellationsCompare,
      },
    ],
    [subscriptionPeriodEvents],
  );

  // Group A Total Live Active Subscribers Count
  const totalLiveActiveSubscribers =
    subscriptionAnalytics.monthlyActive.currentValue +
    subscriptionAnalytics.yearlyActive.currentValue +
    subscriptionAnalytics.lifetimeActive.currentValue;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 selection:bg-slate-800">
      <CreatorHeader />

      <div className="mx-auto w-full max-w-7xl space-y-10 px-6 pt-8">
        {/* Header & Page Title */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <span>Creator Console</span>
              <span className="text-slate-600">•</span>
              <span>Business Analytics</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Performance Overview
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white gap-2 transition-all self-start sm:self-auto text-xs"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </header>

        {/* Global Date Control Toolbar */}
        <RangeComparisonCard
          rangePreset={rangePreset}
          startDate={startDate}
          endDate={endDate}
          compareEnabled={compareEnabled}
          compareMode={compareMode}
          compareStartDate={compareStartDate}
          compareEndDate={compareEndDate}
          rangeLabel={rangeLabel}
          compareLabel={compareLabel}
          onPresetChange={applyPreset}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCompareToggle={() => setCompareEnabled((prev) => !prev)}
          onCompareModeChange={setCompareMode}
          onCompareStartDateChange={setCompareStartDate}
          onCompareEndDateChange={setCompareEndDate}
          hiddenPresets={["this_month"]}
          footer={
            !isRangeCoveredByLocalData ? (
              <p className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-1.5 text-xs text-amber-300/90 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>
                  Trend metrics are powered by a 60-day historical window. Pick a range inside the last 60 days for exact comparison.
                </span>
              </p>
            ) : null
          }
        />

        {/* SECTION 1: PERIOD PERFORMANCE (Date-Filtered Metrics & Trends) */}
        <section className="space-y-5 pt-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Period Performance & Trends
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{rangeLabel}</span>
              {compareEnabled && (
                <>
                  <span className="text-slate-600">vs</span>
                  <span className="font-medium text-indigo-300">{compareLabel}</span>
                </>
              )}
            </div>
          </div>

          {/* Period Summary KPI Cards Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* New Signups in Period */}
            <SubscriptionMetricCard
              title="New User Signups"
              value={signupsSummary.current}
              changePercent={signupsSummary.changePercent}
              comparisonLabel="vs prev period"
              color="#10B981"
              badgeText="PERIOD"
              subtitle={`${signupsSummary.averagePerDay} avg/day in period`}
            />

            {/* Trial -> Paid Conversions */}
            <SubscriptionMetricCard
              title="Trial -> Paid Conversions"
              value={subscriptionPeriodEvents.conversionsCurrent}
              changePercent={subscriptionPeriodEvents.conversionsChangePercent}
              comparisonLabel="vs prev period"
              color="#22C55E"
              badgeText="PERIOD"
              subtitle="New converted paid subscriptions"
            />

            {/* Subscription Cancellations */}
            <SubscriptionMetricCard
              title="Subscription Cancellations"
              value={subscriptionPeriodEvents.cancellationsCurrent}
              changePercent={subscriptionPeriodEvents.cancellationsChangePercent}
              comparisonLabel="vs prev period"
              color="#EF4444"
              badgeText="PERIOD"
              subtitle="Cancellations during period"
            />

            {/* AI Messages Volume */}
            <SubscriptionMetricCard
              title="AI Messages Volume"
              value={messagesSummary.totalCurrent}
              changePercent={messagesSummary.totalChangePercent}
              comparisonLabel="vs prev period"
              color="#3B82F6"
              badgeText="PERIOD"
              subtitle={`WhatsApp: ${messagesSummary.currentWhatsapp} | Telegram: ${messagesSummary.currentTelegram}`}
            />
          </div>

          {/* Desktop Interactive Trend Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Acquisition Trend Chart */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    User Acquisition
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    New Signups Trend
                  </h3>
                </div>
                <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/30">
                  {signupsSummary.current} Total
                </span>
              </div>
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyComparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.7} />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#334155",
                        borderRadius: "0.375rem",
                        color: "#fff",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Line
                      type="monotone"
                      dataKey="current"
                      name={`Current (${rangeLabel})`}
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                    />
                    {compareEnabled && (
                      <Line
                        type="monotone"
                        dataKey="compare"
                        name={`Compare (${compareLabel})`}
                        stroke="#64748B"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Messages by Channel Chart */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    AI Engagement
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Messages by Channel
                  </h3>
                </div>
                <span className="text-xs font-semibold text-blue-400 px-2 py-0.5 rounded border border-blue-900/40 bg-blue-950/30">
                  {messagesSummary.totalCurrent} Messages
                </span>
              </div>
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={messageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.7} />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#334155",
                        borderRadius: "0.375rem",
                        color: "#fff",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area
                      type="monotone"
                      dataKey="whatsapp"
                      name="WhatsApp"
                      stackId="messages"
                      stroke="#22C55E"
                      fill="#22C55E"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="telegram"
                      name="Telegram"
                      stackId="messages"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monetization Activity Chart */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Monetization Movement
                </span>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Period Subscription Conversions vs Cancellations
                </h3>
              </div>
              {compareEnabled && (
                <span className="text-xs text-indigo-300 font-medium px-2 py-0.5 rounded border border-indigo-900/40 bg-indigo-950/30">
                  Period Comparison On
                </span>
              )}
            </div>
            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.7} />
                  <XAxis dataKey="metric" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#334155",
                      borderRadius: "0.375rem",
                      color: "#fff",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    dataKey="current"
                    name={`Current (${rangeLabel})`}
                    fill="#8B5CF6"
                    radius={[3, 3, 0, 0]}
                  />
                  {compareEnabled && (
                    <Bar
                      dataKey="compare"
                      name={`Compare (${compareLabel})`}
                      fill="#475569"
                      radius={[3, 3, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* SECTION 2: LIVE SYSTEM STATE & WORKBENCH (All-Time / Current-State — Not Date-Filtered) */}
        <section className="space-y-6 pt-6 border-t border-slate-800/80">
          {/* Live System Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Live System Overview
                </h2>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  [Not Filtered by Date]
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Live DB Snapshot</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Registered Users */}
              <SubscriptionMetricCard
                title="Total Registered Users"
                value={totalUsers.currentValue}
                color="#10B981"
                badgeText="ALL-TIME"
                subtitle="Cumulative platform user signups"
              />

              {/* Total Active Subscribers */}
              <SubscriptionMetricCard
                title="Active Paid Subscribers"
                value={totalLiveActiveSubscribers}
                color="#8B5CF6"
                badgeText="LIVE NOW"
                subtitle={`Monthly: ${subscriptionAnalytics.monthlyActive.currentValue} | Yearly: ${subscriptionAnalytics.yearlyActive.currentValue} | Lifetime: ${subscriptionAnalytics.lifetimeActive.currentValue}`}
                providers={{
                  stripe:
                    (subscriptionAnalytics.monthlyActive.providers?.stripe || 0) +
                    (subscriptionAnalytics.yearlyActive.providers?.stripe || 0) +
                    (subscriptionAnalytics.lifetimeActive.providers?.stripe || 0),
                  apple:
                    (subscriptionAnalytics.monthlyActive.providers?.apple || 0) +
                    (subscriptionAnalytics.yearlyActive.providers?.apple || 0) +
                    (subscriptionAnalytics.lifetimeActive.providers?.apple || 0),
                }}
              />

              {/* Today's DAU */}
              <SubscriptionMetricCard
                title="Today's Active Users"
                value={totalDAU.currentValue}
                color="#F59E0B"
                badgeText="TODAY'S DAU"
                subtitle="Active sessions across all timezones"
              />

              {/* Active Trials Summary */}
              <TrialingUsersSummaryCard users={trialingUsers} />
            </div>
          </div>

          {/* Workbench Details & Geography */}
          <div className="space-y-4">
          <Tabs defaultValue="trials-subscribers" className="w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Detailed Operations Workbench
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Directory details, trial expiration queue, and demographic analytics
                </p>
              </div>

              <TabsList className="bg-slate-900 border border-slate-800 h-9 p-0.5">
                <TabsTrigger value="trials-subscribers" className="text-xs gap-1.5 px-3 h-8 data-[state=active]:bg-slate-800 text-white">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  <span>Trials & Subscriptions</span>
                </TabsTrigger>
                <TabsTrigger value="geography-dau" className="text-xs gap-1.5 px-3 h-8 data-[state=active]:bg-slate-800 text-white">
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                  <span>User Geography & DAU</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: TRIALS & SUBSCRIPTIONS */}
            <TabsContent value="trials-subscribers" className="space-y-6 pt-2">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Trial Expiry Countdown Queue */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3 lg:col-span-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Urgent Queue
                      </span>
                      <h3 className="text-xs font-bold text-white mt-0.5">
                        Upcoming Trial Expirations
                      </h3>
                    </div>
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                  </div>

                  <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                    {trialingUsersByClosestExpiry.slice(0, 10).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-900/40 px-3 py-2 hover:bg-slate-900 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate text-xs font-medium text-slate-200">
                            {user.fullName || user.email || user.userId}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded border border-amber-900/50 bg-amber-950/40 text-amber-300">
                              {user.plan || "plus"}
                            </span>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {user.provider}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-amber-300">
                            {trialExpiryFormatter.format(user.expiryAt)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatTrialExpiryDistance(user.expiryAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {trialingUsersByClosestExpiry.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No trialing users with upcoming expiry dates.
                      </div>
                    )}
                  </div>
                </div>

                {/* Trialing Users Directory Table */}
                <div className="lg:col-span-2">
                  <TrialingUsersTable users={trialingUsers} />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: GEOGRAPHY & DAU */}
            <TabsContent value="geography-dau" className="space-y-6 pt-2">
              {/* Geo Maps Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Period New Signups Geo Map */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Acquisition Demographics
                      </span>
                      <h3 className="text-xs font-bold text-white mt-0.5">
                        New Signups by Region
                      </h3>
                    </div>
                    <span className="text-xs font-medium text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/30">
                      {signupsSummary.current} Signups in Period
                    </span>
                  </div>
                  <UserGeoMap data={dailySignupsByTimezone} dailyOnly />
                </div>

                {/* All-Time Global User Distribution Map */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        All-Time Distribution
                      </span>
                      <h3 className="text-xs font-bold text-white mt-0.5">
                        Global Registered Users Map
                      </h3>
                    </div>
                    <span className="text-xs font-medium text-slate-400 px-2 py-0.5 rounded border border-slate-800 bg-slate-900">
                      {totalUsers.currentValue} All-Time
                    </span>
                  </div>
                  <UserGeoMap data={usersByTimezone} />
                </div>
              </div>

              {/* Timezone Data Tables Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Top Registered Regions */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      All-Time Rankings
                    </span>
                    <h3 className="text-xs font-bold text-white mt-0.5">
                      Top Regions by Total Users
                    </h3>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                    {usersByTimezone.slice(0, 10).map((item) => (
                      <div
                        key={item.timezone}
                        className="flex items-center justify-between rounded border border-slate-800/60 bg-slate-900/30 px-3 py-1.5 hover:bg-slate-900 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-300">
                          {item.timezone.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {item.userCount.toLocaleString()} users
                        </span>
                      </div>
                    ))}
                    {usersByTimezone.length === 0 && (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        No timezone data available
                      </p>
                    )}
                  </div>
                </div>

                {/* Top Active Regions Today */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Live DAU Rankings
                    </span>
                    <h3 className="text-xs font-bold text-white mt-0.5">
                      Today's DAU by Timezone
                    </h3>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                    {dauByTimezone.slice(0, 10).map((item) => (
                      <div
                        key={item.timezone}
                        className="flex items-center justify-between rounded border border-slate-800/60 bg-slate-900/30 px-3 py-1.5 hover:bg-slate-900 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-300">
                          {item.timezone.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-bold text-blue-400">
                          {item.activeUsers.toLocaleString()} DAU
                        </span>
                      </div>
                    ))}
                    {dauByTimezone.length === 0 && (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        No DAU data available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Today's DAU Map */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Live Daily Activity
                    </span>
                    <h3 className="text-xs font-bold text-white mt-0.5">
                      DAU Geo Map
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-blue-400 px-2 py-0.5 rounded border border-blue-900/40 bg-blue-950/30">
                    {totalDAU.currentValue} Today's DAU
                  </span>
                </div>
                <DAUGeoMap data={dauByTimezone} />
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </section>
      </div>
    </div>
  );
}

// Utility Helper Functions
function sumTrendByDateRange(
  trend: { date: string; value: number }[],
  startIso: string,
  endIso: string,
): number {
  return trend
    .filter((point) => point.date >= startIso && point.date <= endIso)
    .reduce((sum, point) => sum + point.value, 0);
}

function buildRangeSeries(
  rows: { date: string; count: number }[],
  startIso: string,
  endIso: string,
): { date: string; count: number }[] {
  const rowsMap = new Map(rows.map((row) => [row.date, row]));
  return eachDayOfInterval({
    start: parseISO(startIso),
    end: parseISO(endIso),
  }).map((date) => {
    const iso = dateToIso(date);
    return {
      date: iso,
      count: rowsMap.get(iso)?.count ?? 0,
    };
  });
}

function buildMessageRangeSeries(
  rows: { date: string; whatsapp: number; telegram: number }[],
  startIso: string,
  endIso: string,
): { date: string; whatsapp: number; telegram: number }[] {
  const rowsMap = new Map(rows.map((row) => [row.date, row]));
  return eachDayOfInterval({
    start: parseISO(startIso),
    end: parseISO(endIso),
  }).map((date) => {
    const iso = dateToIso(date);
    const row = rowsMap.get(iso);
    return {
      date: iso,
      whatsapp: row?.whatsapp ?? 0,
      telegram: row?.telegram ?? 0,
    };
  });
}

function sumNumericField<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): number {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function buildDailyComparisonChartData(
  current: { date: string; count: number }[],
  compare: { date: string; count: number }[],
): { label: string; current: number; compare: number; date: string }[] {
  return current.map((row, index) => {
    return {
      label: shortDate(row.date),
      date: row.date,
      current: row.count,
      compare: compare[index]?.count ?? 0,
    };
  });
}

function shortDate(value: string): string {
  return format(parseISO(value), "MMM d");
}


