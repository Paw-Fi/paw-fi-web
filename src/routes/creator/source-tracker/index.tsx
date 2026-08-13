import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Download,
  Eye,
  Gauge,
  Layers3,
  MousePointerClick,
  RefreshCw,
  Search,
  TableProperties,
  TrendingUp,
} from "lucide-react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
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

import { CreatorHeader } from "@/components/creator/creator-header";
import { RangeComparisonCard } from "@/components/performance/range-comparison-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAttributionSource,
  matchesAttributionSearch,
  summarizeDownloadAttributionRows,
  useDownloadAttributionSessions,
  type DownloadAttributionSession,
  type DownloadAttributionSourceSummary,
} from "@/hooks/use-download-attribution-sessions";
import { useCreatorDateRange } from "@/hooks/use-creator-date-range";
import { dateToIso } from "@/lib/creator-date-range";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/creator/source-tracker/")({
  component: SourceTrackerPage,
});

interface OnboardingSourceCount {
  source: string;
  count: number;
}

function SourceTrackerPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
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

  const { rows, isLoading, error } = useDownloadAttributionSessions(refreshKey);

  const onboardingSourcesQuery = useQuery({
    queryKey: [
      "creator-onboarding-heard-about-sources",
      normalizedRange.start,
      normalizedRange.end,
      refreshKey,
    ],
    queryFn: () =>
      fetchOnboardingSourceCounts(normalizedRange.start, normalizedRange.end),
  });

  const rowsInRange = useMemo(
    () =>
      filterRowsByDateRange(rows, normalizedRange.start, normalizedRange.end),
    [normalizedRange.end, normalizedRange.start, rows],
  );

  const rowsInCompareRange = useMemo(
    () => filterRowsByDateRange(rows, compareRange.start, compareRange.end),
    [compareRange.end, compareRange.start, rows],
  );

  const filteredRows = useMemo(
    () => rowsInRange.filter((row) => matchesAttributionSearch(row, search)),
    [rowsInRange, search],
  );

  const compareFilteredRows = useMemo(
    () =>
      rowsInCompareRange.filter((row) => matchesAttributionSearch(row, search)),
    [rowsInCompareRange, search],
  );

  const filteredSummaries = useMemo(
    () => summarizeDownloadAttributionRows(filteredRows),
    [filteredRows],
  );

  const compareSummaries = useMemo(
    () => summarizeDownloadAttributionRows(compareFilteredRows),
    [compareFilteredRows],
  );

  const totals = useMemo(
    () => buildTotals(filteredRows, filteredSummaries),
    [filteredRows, filteredSummaries],
  );

  const compareTotals = useMemo(
    () => buildTotals(compareFilteredRows, compareSummaries),
    [compareFilteredRows, compareSummaries],
  );

  const dailyCurrent = useMemo(
    () =>
      buildDailyAttributionSeries(
        filteredRows,
        normalizedRange.start,
        normalizedRange.end,
      ),
    [filteredRows, normalizedRange.end, normalizedRange.start],
  );

  const dailyCompare = useMemo(
    () =>
      buildDailyAttributionSeries(
        compareFilteredRows,
        compareRange.start,
        compareRange.end,
      ),
    [compareFilteredRows, compareRange.end, compareRange.start],
  );

  const dailyComparisonChartData = useMemo(
    () => buildDailyComparisonChartData(dailyCurrent, dailyCompare),
    [dailyCompare, dailyCurrent],
  );

  const engagementChartData = useMemo(
    () =>
      dailyCurrent.map((row) => ({
        ...row,
        label: shortDate(row.date),
      })),
    [dailyCurrent],
  );

  const topSourceChartData = useMemo(
    () =>
      filteredSummaries.slice(0, 8).map((summary) => ({
        source: truncateLabel(summary.source, 14),
        sessions: summary.sessionCount,
        downloads: summary.downloadedCount,
      })),
    [filteredSummaries],
  );

  const sourceDeltaInsights = useMemo(() => {
    const compareBySource = new Map(
      compareSummaries.map((summary) => [summary.source, summary]),
    );

    return filteredSummaries.map((summary) => {
      const previous = compareBySource.get(summary.source);
      const previousSessions = previous?.sessionCount ?? 0;
      const deltaSessions = summary.sessionCount - previousSessions;
      return {
        source: summary.source,
        currentSessions: summary.sessionCount,
        previousSessions,
        deltaSessions,
      };
    });
  }, [compareSummaries, filteredSummaries]);

  const topGrowingSource = useMemo(() => {
    return (
      [...sourceDeltaInsights].sort(
        (a, b) => b.deltaSessions - a.deltaSessions,
      )[0] ?? null
    );
  }, [sourceDeltaInsights]);

  const topSource = filteredSummaries[0] ?? null;
  const topSourceShare = topSource
    ? safeRate(topSource.sessionCount, totals.sessionCount)
    : 0;

  const platformClicks = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => {
          acc.ios += row.ios_clicked_at ? 1 : 0;
          acc.android += row.android_clicked_at ? 1 : 0;
          return acc;
        },
        { ios: 0, android: 0 },
      ),
    [filteredRows],
  );

  const totalPlatformClicks = platformClicks.ios + platformClicks.android;
  const iosShare = safeRate(platformClicks.ios, totalPlatformClicks);
  const androidShare = safeRate(platformClicks.android, totalPlatformClicks);

  const insightCards = [
    {
      title: "Download conversion",
      value: formatPercent(
        safeRate(totals.downloadedCount, totals.sessionCount),
      ),
      detail: compareEnabled
        ? `${formatChangeDelta(totals.downloadedCount, compareTotals.downloadedCount)} vs prev period`
        : `${totals.downloadedCount.toLocaleString()} downloaded sessions`,
    },
    {
      title: "Top source share",
      value: formatPercent(topSourceShare),
      detail: topSource
        ? `${topSource.source} · ${topSource.sessionCount.toLocaleString()} sessions`
        : "No source data in range",
    },
    {
      title: "Clicks per session",
      value: safeRate(totals.downloadClickCount, totals.sessionCount).toFixed(
        2,
      ),
      detail: `${totals.downloadClickCount.toLocaleString()} total download clicks`,
    },
    {
      title: "Platform preference",
      value:
        totalPlatformClicks > 0
          ? `${formatPercent(iosShare)} iOS / ${formatPercent(androidShare)} Android`
          : "No platform clicks",
      detail: `${totalPlatformClicks.toLocaleString()} tracked platform clicks`,
    },
    {
      title: "Fastest moving source",
      value: topGrowingSource ? topGrowingSource.source : "No growth signal",
      detail: topGrowingSource
        ? `${formatChangeDelta(topGrowingSource.currentSessions, topGrowingSource.previousSessions)} sessions`
        : "Not enough compare data",
    },
  ];

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
              <span>Attribution Analytics</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Source Tracker
            </h1>
            <p className="max-w-2xl text-xs text-slate-400 font-normal">
              Track download attribution sessions, referral source counts, platform clicks, and session metadata.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white gap-2 transition-all self-start sm:self-auto text-xs"
            onClick={() => setRefreshKey((key) => key + 1)}
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
        />

        {/* SECTION 1: PERIOD KPI SUMMARY METRICS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Attribution Overview
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricBlock
              title="Tracked Sessions"
              value={totals.sessionCount}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      totals.sessionCount,
                      compareTotals.sessionCount,
                    )
                  : "In selected date range"
              }
              badgeText="PERIOD"
            />
            <MetricBlock
              title="Unique Sources"
              value={totals.sourceCount}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      totals.sourceCount,
                      compareTotals.sourceCount,
                    )
                  : "Unique attribution channels"
              }
              badgeText="PERIOD"
            />
            <MetricBlock
              title="Downloaded Sessions"
              value={totals.downloadedCount}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      totals.downloadedCount,
                      compareTotals.downloadedCount,
                    )
                  : "Converted download sessions"
              }
              badgeText="PERIOD"
            />
            <MetricBlock
              title="Download Clicks"
              value={totals.downloadClickCount}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      totals.downloadClickCount,
                      compareTotals.downloadClickCount,
                    )
                  : "Total platform click intent"
              }
              badgeText="PERIOD"
            />
          </div>
        </section>

        {/* SEARCH BAR & INSIGHTS STRIP */}
        <section className="space-y-4 pt-2">
          {/* Integrated Search Input Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Filter Attribution Data
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Search across sources, sessions, paths, referrers, and timezones
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search source, session, URL..."
                className="h-8 border-slate-800 bg-slate-950 pl-8 text-xs text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Key Insights Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {insightCards.map((insight) => (
              <div
                key={insight.title}
                className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 space-y-1 transition-colors hover:border-slate-700/80"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                  {insight.title}
                </span>
                <p className="text-lg font-extrabold text-white tracking-tight truncate">
                  {insight.value}
                </p>
                <p className="text-[11px] text-slate-400 truncate leading-tight font-normal">
                  {insight.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* SECTION 2: INTERACTIVE TREND VISUALS */}
        <section className="space-y-4 pt-2">
          <div className="border-b border-slate-800/80 pb-2">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Attribution Trends & Channel Mix
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Acquisition Sessions Line Chart */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Traffic Volume
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Sessions: Current vs Compare
                  </h3>
                </div>
                <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/40 bg-emerald-950/30">
                  {totals.sessionCount} Sessions
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

            {/* Daily Engagement Area Chart */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Engagement Conversion
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Daily Downloads, Clicks & Views
                  </h3>
                </div>
                <span className="text-xs font-semibold text-blue-400 px-2 py-0.5 rounded border border-blue-900/40 bg-blue-950/30">
                  {totals.downloadedCount} Downloads
                </span>
              </div>
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engagementChartData}>
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
                      dataKey="downloads"
                      name="Downloads"
                      stackId="engagement"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      name="Download Clicks"
                      stackId="engagement"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.2}
                    />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      name="Page Views"
                      stroke="#F59E0B"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Sources Bar Chart */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Channel Breakdown
                </span>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Top Referral Sources by Sessions & Downloads
                </h3>
              </div>
              <span className="text-xs font-semibold text-purple-400 px-2 py-0.5 rounded border border-purple-900/40 bg-purple-950/30">
                {filteredSummaries.length} Sources
              </span>
            </div>
            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSourceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.7} />
                  <XAxis dataKey="source" stroke="#64748B" fontSize={11} tickLine={false} />
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
                    dataKey="sessions"
                    name="Sessions"
                    fill="#8B5CF6"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="downloads"
                    name="Downloads"
                    fill="#10B981"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* SECTION 3: ONBOARDING SOURCES TABLE */}
        <section className="space-y-3 pt-4 border-t border-slate-800/80">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/40">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Onboarding Survey Responses ("How Did You Hear About Us?")
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Direct user responses captured during account onboarding
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400 px-2 py-0.5 rounded border border-slate-800 bg-slate-900">
                {onboardingSourcesQuery.isLoading
                  ? "Loading..."
                  : `${(onboardingSourcesQuery.data?.length ?? 0).toLocaleString()} channels`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Survey Source</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Responses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingSourcesQuery.data?.map((source) => (
                    <TableRow key={source.source} className="border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                      <TableCell className="font-medium text-xs text-white py-2.5">
                        {source.source}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-slate-200 py-2.5">
                        {source.count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!onboardingSourcesQuery.isLoading &&
                    (onboardingSourcesQuery.data?.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-8 text-center text-xs text-slate-500">
                          No onboarding survey responses recorded in this date range.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
              {onboardingSourcesQuery.isLoading && (
                <p className="py-8 text-center text-xs text-slate-500">
                  Loading onboarding source responses...
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 4: SOURCE COUNTS DIRECTORY TABLE */}
        <section className="space-y-3 pt-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/40">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Source Counts Directory
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Aggregated sessions, conversion rates, and platform click metrics per source
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400 px-2 py-0.5 rounded border border-slate-800 bg-slate-900">
                {filteredSummaries.length.toLocaleString()} Sources
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Source</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Sessions</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Share</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Downloads</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Conversion</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Clicks</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">iOS</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Android</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => (
                    <TableRow
                      key={summary.source}
                      className="border-slate-800/60 hover:bg-slate-900/40 transition-colors"
                    >
                      <TableCell className="font-medium text-xs text-white py-2.5">
                        {summary.source}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-200 py-2.5">
                        {summary.sessionCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400 py-2.5">
                        {formatPercent(
                          safeRate(summary.sessionCount, totals.sessionCount),
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-400 py-2.5">
                        {summary.downloadedCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-300 py-2.5">
                        {formatPercent(
                          safeRate(
                            summary.downloadedCount,
                            summary.sessionCount,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-blue-400 py-2.5">
                        {summary.downloadClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400 py-2.5">
                        {summary.iosClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400 py-2.5">
                        {summary.androidClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <Link
                          to="/creator/source-tracker/$source"
                          params={{ source: summary.source }}
                          className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && filteredSummaries.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-xs text-slate-500"
                      >
                        No source data matched your search and date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {isLoading && (
                <p className="py-8 text-center text-xs text-slate-500">
                  Loading source tracker data...
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 5: RECENT SESSIONS DIRECTORY TABLE */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recent Attribution Sessions
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Showing top {Math.min(100, filteredRows.length)} of {filteredRows.length.toLocaleString()} rows
            </span>
          </div>

          <AttributionRowsTable rows={filteredRows.slice(0, 100)} />
        </section>
      </div>
    </div>
  );
}

function MetricBlock({
  title,
  value,
  detail,
  badgeText,
}: {
  title: string;
  value: number;
  detail: string;
  badgeText?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-4 transition-colors hover:border-slate-700/80 space-y-2">
      <div className="space-y-1">
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

        <div className="text-3xl font-extrabold tracking-tight text-white pt-0.5">
          {value.toLocaleString()}
        </div>
      </div>

      <p className="text-xs text-slate-500 font-normal leading-tight">
        {detail}
      </p>
    </div>
  );
}

async function fetchOnboardingSourceCounts(
  startDate: string,
  endDate: string,
): Promise<OnboardingSourceCount[]> {
  const { data, error } = await supabase.rpc(
    "get_creator_onboarding_heard_about_sources",
    {
      p_start_date: startDate,
      p_end_date: endDate,
    },
  );

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    source: String(row.source),
    count: Number(row.count),
  }));
}

function AttributionRowsTable({
  rows,
}: {
  rows: DownloadAttributionSession[];
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900/60 border-b border-slate-800">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Source</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Session ID</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Last Path</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Platforms</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Views</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Clicks</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-slate-800/60 hover:bg-slate-900/40 transition-colors"
              >
                <TableCell className="font-medium text-xs text-white py-2.5">
                  {getAttributionSource(row)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate font-mono text-[11px] text-slate-400 py-2.5">
                  {row.session_id}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-slate-300 py-2.5">
                  {row.last_path || row.first_path || "-"}
                </TableCell>
                <TableCell className="py-2.5">
                  <PlatformBadges row={row} />
                </TableCell>
                <TableCell className="text-right text-xs font-semibold text-slate-300 py-2.5">
                  {row.page_view_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold text-blue-400 py-2.5">
                  {row.download_click_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-slate-400 py-2.5">
                  {formatDate(row.updated_at)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-xs text-slate-500"
                >
                  No attribution sessions match the filter criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PlatformBadges({ row }: { row: DownloadAttributionSession }) {
  if (row.clicked_platforms.length === 0) {
    return <span className="text-slate-600 text-xs">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {row.clicked_platforms.map((platform) => (
        <span
          key={platform}
          className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900 text-slate-300"
        >
          {platform}
        </span>
      ))}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function safeDateKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return dateToIso(parsed);
}

function filterRowsByDateRange(
  rows: DownloadAttributionSession[],
  startIso: string,
  endIso: string,
): DownloadAttributionSession[] {
  return rows.filter((row) => {
    const key = safeDateKey(row.created_at);
    return key !== null && key >= startIso && key <= endIso;
  });
}

function buildDailyAttributionSeries(
  rows: DownloadAttributionSession[],
  startIso: string,
  endIso: string,
): {
  date: string;
  sessions: number;
  downloads: number;
  clicks: number;
  pageViews: number;
}[] {
  const bucketMap = new Map<
    string,
    { sessions: number; downloads: number; clicks: number; pageViews: number }
  >();

  for (const row of rows) {
    const key = safeDateKey(row.created_at);
    if (!key) {
      continue;
    }

    const current = bucketMap.get(key) ?? {
      sessions: 0,
      downloads: 0,
      clicks: 0,
      pageViews: 0,
    };

    bucketMap.set(key, {
      sessions: current.sessions + 1,
      downloads: current.downloads + (row.downloaded ? 1 : 0),
      clicks: current.clicks + row.download_click_count,
      pageViews: current.pageViews + row.page_view_count,
    });
  }

  return eachDayOfInterval({
    start: parseISO(startIso),
    end: parseISO(endIso),
  }).map((date) => {
    const iso = dateToIso(date);
    const point = bucketMap.get(iso);
    return {
      date: iso,
      sessions: point?.sessions ?? 0,
      downloads: point?.downloads ?? 0,
      clicks: point?.clicks ?? 0,
      pageViews: point?.pageViews ?? 0,
    };
  });
}

function buildDailyComparisonChartData(
  current: { date: string; sessions: number }[],
  compare: { date: string; sessions: number }[],
): { label: string; current: number; compare: number; date: string }[] {
  return current.map((row, index) => ({
    label: shortDate(row.date),
    date: row.date,
    current: row.sessions,
    compare: compare[index]?.sessions ?? 0,
  }));
}

function buildTotals(
  rows: DownloadAttributionSession[],
  summaries: DownloadAttributionSourceSummary[],
): {
  sessionCount: number;
  sourceCount: number;
  downloadedCount: number;
  downloadClickCount: number;
} {
  return {
    sessionCount: rows.length,
    sourceCount: summaries.length,
    downloadedCount: rows.filter((row) => row.downloaded).length,
    downloadClickCount: rows.reduce(
      (total, row) => total + row.download_click_count,
      0,
    ),
  };
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatChangeDelta(current: number, previous: number): string {
  const delta = current - previous;
  const sign = delta >= 0 ? "+" : "-";
  const absDelta = Math.abs(delta).toLocaleString();
  const percent = calculateChangePercent(current, previous);

  if (previous <= 0) {
    return `${sign}${absDelta}`;
  }

  return `${sign}${absDelta} (${percent >= 0 ? "+" : ""}${percent}%)`;
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function shortDate(value: string): string {
  return format(parseISO(value), "MMM d");
}

function truncateLabel(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

