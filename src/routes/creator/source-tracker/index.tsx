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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    normalizedRange,
    compareRange,
    rangeLabel,
    compareLabel,
    setStartDate,
    setEndDate,
    setCompareEnabled,
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
        ? `${formatChangeDelta(totals.downloadedCount, compareTotals.downloadedCount)} vs previous period`
        : `${totals.downloadedCount.toLocaleString()} downloaded sessions`,
      icon: <Download className="h-4 w-4" />,
    },
    {
      title: "Top source share",
      value: formatPercent(topSourceShare),
      detail: topSource
        ? `${topSource.source} · ${topSource.sessionCount.toLocaleString()} sessions`
        : "No source data in this range",
      icon: <Layers3 className="h-4 w-4" />,
    },
    {
      title: "Clicks per session",
      value: safeRate(totals.downloadClickCount, totals.sessionCount).toFixed(
        2,
      ),
      detail: `${totals.downloadClickCount.toLocaleString()} total download clicks`,
      icon: <MousePointerClick className="h-4 w-4" />,
    },
    {
      title: "Platform preference",
      value:
        totalPlatformClicks > 0
          ? `${formatPercent(iosShare)} iOS / ${formatPercent(androidShare)} Android`
          : "No platform clicks",
      detail: `${totalPlatformClicks.toLocaleString()} tracked platform clicks`,
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      title: "Fastest moving source",
      value: topGrowingSource ? topGrowingSource.source : "No growth signal",
      detail: topGrowingSource
        ? `${formatChangeDelta(topGrowingSource.currentSessions, topGrowingSource.previousSessions)} sessions`
        : "Not enough compare data",
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
        <CreatorHeader />
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
              Creator Dashboard
            </p>
            <h1 className="text-3xl font-bold text-white">Source Tracker</h1>
            <p className="max-w-2xl text-sm text-white/55">
              Track download attribution sessions, source counts, platform
              clicks, and per-session metadata.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-2 bg-transparent"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </header>

        <RangeComparisonCard
          rangePreset={rangePreset}
          startDate={startDate}
          endDate={endDate}
          compareEnabled={compareEnabled}
          rangeLabel={rangeLabel}
          compareLabel={compareLabel}
          onPresetChange={applyPreset}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCompareToggle={() => setCompareEnabled((prev) => !prev)}
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">
              Onboarding Sources
            </h2>
            <p className="text-sm text-white/45">
              {onboardingSourcesQuery.isLoading
                ? "Loading sources..."
                : `${(onboardingSourcesQuery.data?.length ?? 0).toLocaleString()} sources`}
            </p>
          </div>
          <Card className="border-white/10 bg-slate-900/50">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Source</TableHead>
                    <TableHead className="text-right text-white/60">
                      Responses
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingSourcesQuery.data?.map((source) => (
                    <TableRow
                      key={source.source}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white">
                        {source.source}
                      </TableCell>
                      <TableCell className="text-right text-white/80">
                        {source.count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!onboardingSourcesQuery.isLoading &&
                    (onboardingSourcesQuery.data?.length ?? 0) === 0 && (
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableCell
                          colSpan={2}
                          className="py-8 text-center text-white/45"
                        >
                          No onboarding source responses in this date range.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
              {onboardingSourcesQuery.isLoading && (
                <p className="py-8 text-center text-sm text-white/45">
                  Loading onboarding source responses...
                </p>
              )}
              {onboardingSourcesQuery.error && (
                <p className="pt-4 text-sm text-red-200">
                  Unable to load onboarding source responses.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
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
            icon={<TableProperties className="h-4 w-4" />}
          />
          <MetricCard
            title="Unique Sources"
            value={totals.sourceCount}
            detail={
              compareEnabled
                ? formatChangeDelta(
                    totals.sourceCount,
                    compareTotals.sourceCount,
                  )
                : "Unique attribution sources"
            }
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <MetricCard
            title="Downloaded Sessions"
            value={totals.downloadedCount}
            detail={
              compareEnabled
                ? formatChangeDelta(
                    totals.downloadedCount,
                    compareTotals.downloadedCount,
                  )
                : "Downloaded sessions"
            }
            icon={<Download className="h-4 w-4" />}
          />
          <MetricCard
            title="Download Clicks"
            value={totals.downloadClickCount}
            detail={
              compareEnabled
                ? formatChangeDelta(
                    totals.downloadClickCount,
                    compareTotals.downloadClickCount,
                  )
                : "Total click intent"
            }
            icon={<MousePointerClick className="h-4 w-4" />}
          />
        </div>

        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Search
              </CardDescription>
              <CardTitle className="mt-1 text-xl text-white">
                Filter source tracker data
              </CardTitle>
            </div>
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search source, session, URL, referrer, timezone..."
                className="border-white/10 bg-slate-950/80 pl-9 text-white placeholder:text-white/35"
              />
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Card className="border-red-400/30 bg-red-500/10">
            <CardContent className="pt-6 text-sm text-red-100">
              {error}
            </CardContent>
          </Card>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Trend Visuals</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-white/10 bg-slate-900/50">
              <CardHeader>
                <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                  Acquisition
                </CardDescription>
                <CardTitle className="mt-1 text-xl text-white">
                  Sessions: Current vs Compare
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
                      stroke="#22C55E"
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
                  Daily Downloads, Clicks & Views
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engagementChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="downloads"
                      name="Downloads"
                      stackId="engagement"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      name="Download Clicks"
                      stackId="engagement"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      name="Page Views"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-slate-900/50">
            <CardHeader>
              <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Source mix
              </CardDescription>
              <CardTitle className="mt-1 text-xl text-white">
                Top Sources by Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSourceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="source" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="downloads"
                    name="Downloads"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Insights</h2>
            <p className="text-sm text-white/45">
              {filteredRows.length.toLocaleString()} sessions in range
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {insightCards.map((insight) => (
              <InsightCard
                key={insight.title}
                title={insight.title}
                value={insight.value}
                detail={insight.detail}
                icon={insight.icon}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Source Counts</h2>
            <p className="text-sm text-white/45">
              {filteredSummaries.length.toLocaleString()} sources
            </p>
          </div>
          <Card className="border-white/10 bg-slate-900/50">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Source</TableHead>
                    <TableHead className="text-right text-white/60">
                      Sessions
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Share
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Downloads
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Conversion
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Clicks
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      iOS
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Android
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Details
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => (
                    <TableRow
                      key={summary.source}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white">
                        {summary.source}
                      </TableCell>
                      <TableCell className="text-right text-white/80">
                        {summary.sessionCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white/70">
                        {formatPercent(
                          safeRate(summary.sessionCount, totals.sessionCount),
                        )}
                      </TableCell>
                      <TableCell className="text-right text-emerald-300">
                        {summary.downloadedCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-emerald-200">
                        {formatPercent(
                          safeRate(
                            summary.downloadedCount,
                            summary.sessionCount,
                          ),
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sky-300">
                        {summary.downloadClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white/70">
                        {summary.iosClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white/70">
                        {summary.androidClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/creator/source-tracker/$source"
                          params={{ source: summary.source }}
                          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && filteredSummaries.length === 0 && (
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-white/45"
                      >
                        No source data matched your search and date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {isLoading && (
                <p className="py-8 text-center text-sm text-white/45">
                  Loading source tracker data...
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">
              Recent Sessions
            </h2>
            <p className="text-sm text-white/45">
              {filteredRows.length.toLocaleString()} rows
            </p>
          </div>
          <AttributionRowsTable rows={filteredRows.slice(0, 100)} />
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
          {title}
        </CardDescription>
        <div className="rounded-full bg-white/10 p-2 text-white/70">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white">
          {value.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-white/50">{detail}</p>
      </CardContent>
    </Card>
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

function InsightCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardDescription className="text-xs tracking-[0.2em] text-white/60 uppercase">
          {title}
        </CardDescription>
        <div className="rounded-full bg-white/10 p-2 text-white/70">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-lg font-semibold text-white">{value}</div>
        <p className="mt-1 text-xs text-white/50">{detail}</p>
      </CardContent>
    </Card>
  );
}

function AttributionRowsTable({
  rows,
}: {
  rows: DownloadAttributionSession[];
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Source</TableHead>
              <TableHead className="text-white/60">Session</TableHead>
              <TableHead className="text-white/60">Path</TableHead>
              <TableHead className="text-white/60">Platforms</TableHead>
              <TableHead className="text-right text-white/60">Views</TableHead>
              <TableHead className="text-right text-white/60">Clicks</TableHead>
              <TableHead className="text-white/60">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-white/10 hover:bg-white/5"
              >
                <TableCell className="font-medium text-white">
                  {getAttributionSource(row)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate font-mono text-xs text-white/60">
                  {row.session_id}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-white/75">
                  {row.last_path || row.first_path || "-"}
                </TableCell>
                <TableCell>
                  <PlatformBadges row={row} />
                </TableCell>
                <TableCell className="text-right text-white/75">
                  {row.page_view_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-white/75">
                  {row.download_click_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-white/60">
                  {formatDate(row.updated_at)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-white/45"
                >
                  No sessions to show.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlatformBadges({ row }: { row: DownloadAttributionSession }) {
  if (row.clicked_platforms.length === 0) {
    return <span className="text-white/35">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {row.clicked_platforms.map((platform) => (
        <Badge
          key={platform}
          variant="outline"
          className="border-white/10 text-white/70"
        >
          {platform}
        </Badge>
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
