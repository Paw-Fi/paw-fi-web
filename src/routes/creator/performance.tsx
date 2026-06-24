import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  RefreshCw,
  Users,
  MapPin,
  Calendar,
  CalendarDays,
  Infinity,
  Ban,
  MessageCircle,
  AlertCircle,
  Activity,
  UserPlus,
  BadgeCheck,
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
import { UserGeoMap } from "@/components/performance/user-geo-map";
import { DAUGeoMap } from "@/components/performance/dau-geo-map";
import { SubscriptionMetricCard } from "@/components/performance/subscription-metric-card";
import { TrialingUsersTable } from "@/components/performance/trialing-users-table";
import { MessageAnalyticsCard } from "@/components/performance/message-analytics-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [rangePreset, setRangePreset] = useState("last_28_days");
  const [startDate, setStartDate] = useState(() =>
    dateToIso(subDays(new Date(), 27)),
  );
  const [endDate, setEndDate] = useState(() => dateToIso(new Date()));
  const [compareEnabled, setCompareEnabled] = useState(true);
  const totalUsers = useUserCount(refreshKey);
  const usersByTimezone = useUsersByTimezone(refreshKey);
  const subscriptionAnalytics = useSubscriptionAnalytics(refreshKey);
  const trialingUsers = useTrialingUsers(refreshKey);
  const messageAnalytics = useMessageAnalytics(refreshKey);
  const dailySignups = useDailySignups(refreshKey);
  const dailySignupsByTimezone = useDailySignupsByTimezone(refreshKey);
  const dauByTimezone = useDAUByTimezone(refreshKey);
  const totalDAU = useTotalDAU(refreshKey);
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

  const normalizedRange = useMemo(() => {
    const safeStart = isValidIsoDate(startDate)
      ? startDate
      : dateToIso(subDays(new Date(), 27));
    const safeEnd = isValidIsoDate(endDate) ? endDate : dateToIso(new Date());
    return safeStart <= safeEnd
      ? { start: safeStart, end: safeEnd }
      : { start: safeEnd, end: safeStart };
  }, [startDate, endDate]);

  const compareRange = useMemo(() => {
    const days = getInclusiveDayCount(
      normalizedRange.start,
      normalizedRange.end,
    );
    const currentStart = parseISO(normalizedRange.start);
    const compareEnd = subDays(currentStart, 1);
    const compareStart = subDays(compareEnd, days - 1);

    return {
      start: dateToIso(compareStart),
      end: dateToIso(compareEnd),
    };
  }, [normalizedRange.end, normalizedRange.start]);

  const isRangeCoveredByLocalData = useMemo(() => {
    const earliestAvailable = dateToIso(subDays(new Date(), 59));
    return normalizedRange.start >= earliestAvailable;
  }, [normalizedRange.start]);

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

  const subscriptionTotals = useMemo(() => {
    return {
      monthlyCurrent: sumTrendByDateRange(
        subscriptionAnalytics.monthlyActive.trend,
        normalizedRange.start,
        normalizedRange.end,
      ),
      monthlyCompare: sumTrendByDateRange(
        subscriptionAnalytics.monthlyActive.trend,
        compareRange.start,
        compareRange.end,
      ),
      yearlyCurrent: sumTrendByDateRange(
        subscriptionAnalytics.yearlyActive.trend,
        normalizedRange.start,
        normalizedRange.end,
      ),
      yearlyCompare: sumTrendByDateRange(
        subscriptionAnalytics.yearlyActive.trend,
        compareRange.start,
        compareRange.end,
      ),
      premiumMonthlyCurrent: sumTrendByDateRange(
        subscriptionAnalytics.premiumMonthlyActive.trend,
        normalizedRange.start,
        normalizedRange.end,
      ),
      premiumMonthlyCompare: sumTrendByDateRange(
        subscriptionAnalytics.premiumMonthlyActive.trend,
        compareRange.start,
        compareRange.end,
      ),
      premiumYearlyCurrent: sumTrendByDateRange(
        subscriptionAnalytics.premiumYearlyActive.trend,
        normalizedRange.start,
        normalizedRange.end,
      ),
      premiumYearlyCompare: sumTrendByDateRange(
        subscriptionAnalytics.premiumYearlyActive.trend,
        compareRange.start,
        compareRange.end,
      ),
      lifetimeCurrent: sumTrendByDateRange(
        subscriptionAnalytics.lifetimeActive.trend,
        normalizedRange.start,
        normalizedRange.end,
      ),
      lifetimeCompare: sumTrendByDateRange(
        subscriptionAnalytics.lifetimeActive.trend,
        compareRange.start,
        compareRange.end,
      ),
      cancelledCurrent: sumTrendByDateRange(
        subscriptionAnalytics.totalCancelled.trend,
        normalizedRange.start,
        normalizedRange.end,
      ),
      cancelledCompare: sumTrendByDateRange(
        subscriptionAnalytics.totalCancelled.trend,
        compareRange.start,
        compareRange.end,
      ),
      trialToActiveCurrent: sumTrendByDateRange(
        subscriptionAnalytics.trialToActive.trend,
        normalizedRange.start,
        normalizedRange.end,
      ),
      trialToActiveCompare: sumTrendByDateRange(
        subscriptionAnalytics.trialToActive.trend,
        compareRange.start,
        compareRange.end,
      ),
    };
  }, [
    compareRange.end,
    compareRange.start,
    normalizedRange.end,
    normalizedRange.start,
    subscriptionAnalytics,
  ]);

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

    return {
      currentWhatsapp,
      currentTelegram,
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
        metric: "Monthly",
        current: subscriptionTotals.monthlyCurrent,
        compare: subscriptionTotals.monthlyCompare,
      },
      {
        metric: "Yearly",
        current: subscriptionTotals.yearlyCurrent,
        compare: subscriptionTotals.yearlyCompare,
      },
      {
        metric: "Lifetime",
        current: subscriptionTotals.lifetimeCurrent,
        compare: subscriptionTotals.lifetimeCompare,
      },
      {
        metric: "Cancelled",
        current: subscriptionTotals.cancelledCurrent,
        compare: subscriptionTotals.cancelledCompare,
      },
      {
        metric: "Trial->Paid",
        current: subscriptionTotals.trialToActiveCurrent,
        compare: subscriptionTotals.trialToActiveCompare,
      },
    ],
    [subscriptionTotals],
  );

  const rangeLabel = `${format(parseISO(normalizedRange.start), "MMM d, yyyy")} - ${format(parseISO(normalizedRange.end), "MMM d, yyyy")}`;
  const compareLabel = `${format(parseISO(compareRange.start), "MMM d, yyyy")} - ${format(parseISO(compareRange.end), "MMM d, yyyy")}`;

  const applyPreset = (preset: string) => {
    setRangePreset(preset);

    const today = new Date();
    if (preset === "last_7_days") {
      setStartDate(dateToIso(subDays(today, 6)));
      setEndDate(dateToIso(today));
      return;
    }
    if (preset === "last_14_days") {
      setStartDate(dateToIso(subDays(today, 13)));
      setEndDate(dateToIso(today));
      return;
    }
    if (preset === "last_28_days") {
      setStartDate(dateToIso(subDays(today, 27)));
      setEndDate(dateToIso(today));
      return;
    }
    if (preset === "last_30_days") {
      setStartDate(dateToIso(subDays(today, 29)));
      setEndDate(dateToIso(today));
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-950 py-10 text-white">
        <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
          <CreatorHeader />
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Creator Dashboard
              </p>
              <h1 className="text-3xl font-bold text-white">Performance</h1>
            </div>
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 gap-2 bg-transparent"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </header>

          <Card className="border-white/10 bg-slate-900/50">
            <CardHeader>
              <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Date Filter
              </CardDescription>
              <CardTitle className="mt-1 text-xl text-white">
                Range & Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Select value={rangePreset} onValueChange={applyPreset}>
                  <SelectTrigger className="border-white/10 bg-black/20 text-white">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-slate-900 text-white">
                    <SelectItem value="last_7_days">Last 7 days</SelectItem>
                    <SelectItem value="last_14_days">Last 14 days</SelectItem>
                    <SelectItem value="last_28_days">Last 28 days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 days</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setRangePreset("custom");
                    setStartDate(event.target.value);
                  }}
                  className="border-white/10 bg-black/20 text-white"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setRangePreset("custom");
                    setEndDate(event.target.value);
                  }}
                  className="border-white/10 bg-black/20 text-white"
                />
                <Button
                  variant={compareEnabled ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setCompareEnabled((prev) => !prev)}
                >
                  Compare previous period
                </Button>
              </div>
              <div className="text-xs text-white/60">
                <span className="text-white/80">Current:</span> {rangeLabel}
                {compareEnabled ? (
                  <span>
                    {" "}
                    <span className="text-white/80">Compare:</span>{" "}
                    {compareLabel}
                  </span>
                ) : null}
              </div>
              {!isRangeCoveredByLocalData && (
                <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Some cards are powered by 60-day trend snapshots right now.
                  Pick a range inside the last 60 days for fully comparable
                  trend metrics.
                </p>
              )}
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Trend Visuals</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-white/10 bg-slate-900/50">
                <CardHeader>
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Acquisition
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Signups: Current vs Compare
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyComparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="current"
                        name="Current"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                      />
                      {compareEnabled && (
                        <Line
                          type="monotone"
                          dataKey="compare"
                          name="Compare"
                          stroke="#94A3B8"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="4 4"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-slate-900/50">
                <CardHeader>
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Engagement
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Messages by Channel
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={messageChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="whatsapp"
                        name="WhatsApp"
                        stackId="messages"
                        stroke="#22C55E"
                        fill="#22C55E"
                        fillOpacity={0.28}
                      />
                      <Area
                        type="monotone"
                        dataKey="telegram"
                        name="Telegram"
                        stackId="messages"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.28}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader>
                <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                  Monetization
                </CardDescription>
                <CardTitle className="mt-1 text-xl text-white">
                  Subscription Mix Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subscriptionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="metric" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="current"
                      name="Current"
                      fill="#8B5CF6"
                      radius={[4, 4, 0, 0]}
                    />
                    {compareEnabled && (
                      <Bar
                        dataKey="compare"
                        name="Compare"
                        fill="#64748B"
                        radius={[4, 4, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Total Users</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SubscriptionMetricCard
                title="All Registered Users"
                value={totalUsers.currentValue}
                trend={totalUsers.trend}
                changePercent={totalUsers.changePercent}
                color="#10B981"
                icon={<Users className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Today's DAU"
                value={totalDAU.currentValue}
                trend={[]}
                changePercent={totalDAU.changePercent}
                color="#F59E0B"
                icon={<Activity className="h-4 w-4" />}
              />
              <Card className="border-white/10 bg-slate-900/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                      Trial Status
                    </CardDescription>
                    <CardTitle className="mt-1 text-xl text-white">
                      Trialing Users by Expiry
                    </CardTitle>
                  </div>
                  <AlertCircle className="h-5 w-5 text-amber-400/80" />
                </CardHeader>
                <CardContent className="max-h-[200px] overflow-y-auto">
                  <div className="space-y-2">
                    {trialingUsersByClosestExpiry.slice(0, 8).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white/85">
                            {user.fullName || user.email || user.userId}
                          </p>
                          <p className="text-xs text-white/50">
                            Status: trialing
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-amber-300">
                            {trialExpiryFormatter.format(user.expiryAt)}
                          </p>
                          <p className="text-xs text-white/45">
                            {formatTrialExpiryDistance(user.expiryAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {trialingUsersByClosestExpiry.length === 0 && (
                      <p className="text-sm text-white/50">
                        No trialing users with an expiry time
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Active Subscriptions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SubscriptionMetricCard
                title="Plus Monthly Active"
                value={subscriptionTotals.monthlyCurrent}
                trend={filterTrendByDateRange(
                  subscriptionAnalytics.monthlyActive.trend,
                  normalizedRange.start,
                  normalizedRange.end,
                )}
                changePercent={calculateChangePercent(
                  subscriptionTotals.monthlyCurrent,
                  subscriptionTotals.monthlyCompare,
                )}
                providers={subscriptionAnalytics.monthlyActive.providers}
                color="#3B82F6"
                icon={<Calendar className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Plus Yearly Active"
                value={subscriptionTotals.yearlyCurrent}
                trend={filterTrendByDateRange(
                  subscriptionAnalytics.yearlyActive.trend,
                  normalizedRange.start,
                  normalizedRange.end,
                )}
                changePercent={calculateChangePercent(
                  subscriptionTotals.yearlyCurrent,
                  subscriptionTotals.yearlyCompare,
                )}
                providers={subscriptionAnalytics.yearlyActive.providers}
                color="#8B5CF6"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Premium Monthly Active"
                value={subscriptionTotals.premiumMonthlyCurrent}
                trend={filterTrendByDateRange(
                  subscriptionAnalytics.premiumMonthlyActive.trend,
                  normalizedRange.start,
                  normalizedRange.end,
                )}
                changePercent={calculateChangePercent(
                  subscriptionTotals.premiumMonthlyCurrent,
                  subscriptionTotals.premiumMonthlyCompare,
                )}
                providers={subscriptionAnalytics.premiumMonthlyActive.providers}
                color="#D97706"
                icon={<BadgeCheck className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Premium Yearly Active"
                value={subscriptionTotals.premiumYearlyCurrent}
                trend={filterTrendByDateRange(
                  subscriptionAnalytics.premiumYearlyActive.trend,
                  normalizedRange.start,
                  normalizedRange.end,
                )}
                changePercent={calculateChangePercent(
                  subscriptionTotals.premiumYearlyCurrent,
                  subscriptionTotals.premiumYearlyCompare,
                )}
                providers={subscriptionAnalytics.premiumYearlyActive.providers}
                color="#A855F7"
                icon={<BadgeCheck className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Lifetime Active"
                value={subscriptionTotals.lifetimeCurrent}
                trend={filterTrendByDateRange(
                  subscriptionAnalytics.lifetimeActive.trend,
                  normalizedRange.start,
                  normalizedRange.end,
                )}
                changePercent={calculateChangePercent(
                  subscriptionTotals.lifetimeCurrent,
                  subscriptionTotals.lifetimeCompare,
                )}
                providers={subscriptionAnalytics.lifetimeActive.providers}
                color="#F59E0B"
                icon={<Infinity className="h-4 w-4" />}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Other Metrics</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SubscriptionMetricCard
                title="Cancelled"
                value={subscriptionTotals.cancelledCurrent}
                trend={filterTrendByDateRange(
                  subscriptionAnalytics.totalCancelled.trend,
                  normalizedRange.start,
                  normalizedRange.end,
                )}
                changePercent={calculateChangePercent(
                  subscriptionTotals.cancelledCurrent,
                  subscriptionTotals.cancelledCompare,
                )}
                providers={subscriptionAnalytics.totalCancelled.providers}
                color="#EF4444"
                icon={<Ban className="h-4 w-4" />}
              />
              <SubscriptionMetricCard
                title="Paying After Trial"
                value={subscriptionTotals.trialToActiveCurrent}
                trend={filterTrendByDateRange(
                  subscriptionAnalytics.trialToActive.trend,
                  normalizedRange.start,
                  normalizedRange.end,
                )}
                changePercent={calculateChangePercent(
                  subscriptionTotals.trialToActiveCurrent,
                  subscriptionTotals.trialToActiveCompare,
                )}
                providers={subscriptionAnalytics.trialToActive.providers}
                color="#22C55E"
                icon={<BadgeCheck className="h-4 w-4" />}
              />
              <TrialingUsersTable users={trialingUsers} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Message Analytics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MessageAnalyticsCard
                title="WhatsApp Messages"
                totalValue={messagesSummary.currentWhatsapp}
                dailyData={messageCurrent}
                changePercent={messagesSummary.whatsappChangePercent}
                channel="whatsapp"
                icon={<MessageCircle className="h-4 w-4" />}
              />
              <MessageAnalyticsCard
                title="Telegram Messages"
                totalValue={messagesSummary.currentTelegram}
                dailyData={messageCurrent}
                changePercent={messagesSummary.telegramChangePercent}
                channel="telegram"
                icon={<MessageCircle className="h-4 w-4" />}
              />
            </div>
          </section>

          <section className="space-y-4">
            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Daily Signups
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    New Signups by Region
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {signupsSummary.current.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/50">
                      {signupsSummary.averagePerDay} avg/day (
                      {getInclusiveDayCount(
                        normalizedRange.start,
                        normalizedRange.end,
                      )}
                      d)
                    </div>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#10B98120" }}
                  >
                    <UserPlus className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <UserGeoMap data={dailySignupsByTimezone} dailyOnly />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    User Distribution
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Global User Map
                  </CardTitle>
                </div>
                <MapPin className="h-5 w-5 text-white/50" />
              </CardHeader>
              <CardContent>
                <UserGeoMap data={usersByTimezone} />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-white/10 bg-slate-900/50">
                <CardHeader className="pb-4">
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Top Regions
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Users by Timezone
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {usersByTimezone.slice(0, 10).map((item) => (
                      <div
                        key={item.timezone}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5"
                      >
                        <span className="text-sm text-white/80">
                          {item.timezone.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-medium text-emerald-400">
                          {item.userCount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {usersByTimezone.length === 0 && (
                      <p className="text-sm text-white/50">
                        No timezone data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-slate-900/50">
                <CardHeader className="pb-4">
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Top Active Regions
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    Today's DAU by Timezone
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {dauByTimezone.slice(0, 10).map((item) => (
                      <div
                        key={item.timezone}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5"
                      >
                        <span className="text-sm text-white/80">
                          {item.timezone.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-medium text-blue-400">
                          {item.activeUsers.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {dauByTimezone.length === 0 && (
                      <p className="text-sm text-white/50">
                        No DAU data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    Daily Active Users
                  </CardDescription>
                  <CardTitle className="mt-1 text-xl text-white">
                    DAU by Timezone
                  </CardTitle>
                </div>
                <MapPin className="h-5 w-5 text-white/50" />
              </CardHeader>
              <CardContent>
                <DAUGeoMap data={dauByTimezone} />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}

function dateToIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function isValidIsoDate(value: string): boolean {
  if (!value) return false;
  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime());
}

function getInclusiveDayCount(startIso: string, endIso: string): number {
  const days = eachDayOfInterval({
    start: parseISO(startIso),
    end: parseISO(endIso),
  });
  return days.length;
}

function filterTrendByDateRange(
  trend: { date: string; value: number }[],
  startIso: string,
  endIso: string,
): { date: string; value: number }[] {
  return trend.filter(
    (point) => point.date >= startIso && point.date <= endIso,
  );
}

function sumTrendByDateRange(
  trend: { date: string; value: number }[],
  startIso: string,
  endIso: string,
): number {
  return filterTrendByDateRange(trend, startIso, endIso).reduce(
    (sum, point) => sum + point.value,
    0,
  );
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
