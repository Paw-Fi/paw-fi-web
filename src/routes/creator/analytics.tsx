import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  DoorOpen,
  MousePointerClick,
  RefreshCw,
  Timer,
  UserRoundPlus,
  Filter,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreatorHeader } from "@/components/creator/creator-header";

export const Route = createFileRoute("/creator/analytics")({
  component: CreatorAnalyticsPage,
});

function CreatorAnalyticsPage() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [granularity, setGranularity] = useState("day");
  const [platform, setPlatform] = useState("all");
  const [cohort, setCohort] = useState("in_app_new");

  const analyticsQuery = useQuery({
    queryKey: [
      "creator-onboarding-analytics",
      startDate,
      endDate,
      granularity,
      platform,
      cohort,
    ],
    queryFn: async () =>
      fetchCreatorOnboardingAnalytics({
        startDate,
        endDate,
        granularity,
        platform,
        cohort,
      }),
    staleTime: 30_000,
  });

  const analytics = analyticsQuery.data;
  const summaryCards = useMemo(
    () =>
      analytics
        ? buildSummaryCards(analytics.summary)
        : buildSummaryCards(emptySummary),
    [analytics],
  );

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
              <span>Funnel & Conversion Analytics</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Platform Analytics
            </h1>
            <p className="max-w-2xl text-xs text-slate-400 font-normal">
              Monitor onboarding funnel steps, user engagement, preview interactions, and cohort conversion metrics.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white gap-2 transition-all self-start sm:self-auto text-xs"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["creator-onboarding-analytics"],
              })
            }
            disabled={analyticsQuery.isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${analyticsQuery.isFetching ? "animate-spin" : ""}`}
            />
            <span>Refresh Data</span>
          </Button>
        </header>

        {/* Integrated Filter Control Toolbar */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Filter Cohort & Date Window
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-8 border-slate-800 bg-slate-950 text-xs text-slate-200 [color-scheme:dark]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-8 border-slate-800 bg-slate-950 text-xs text-slate-200 [color-scheme:dark]"
            />
            <Select value={granularity} onValueChange={setGranularity}>
              <SelectTrigger className="h-8 border-slate-800 bg-slate-950 text-xs text-slate-200">
                <SelectValue placeholder="Granularity" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="h-8 border-slate-800 bg-slate-950 text-xs text-slate-200">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cohort} onValueChange={setCohort}>
              <SelectTrigger className="h-8 border-slate-800 bg-slate-950 text-xs text-slate-200">
                <SelectValue placeholder="Cohort" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                <SelectItem value="in_app_new">In-app new users</SelectItem>
                <SelectItem value="external_prepaid">
                  External prepaid users
                </SelectItem>
                <SelectItem value="excluded_existing">
                  Excluded existing users
                </SelectItem>
                <SelectItem value="all">All cohorts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* High-Contrast Summary KPI Blocks */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-4 space-y-2 transition-colors hover:border-slate-700/80"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 truncate">
                    {card.label}
                  </span>
                  <card.icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-white pt-0.5">
                  {card.value}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-tight">
                {card.helpText}
              </p>
            </div>
          ))}
        </section>

        {analyticsQuery.isLoading ? (
          <AnalyticsState message="Loading creator analytics..." />
        ) : analyticsQuery.isError || !analytics ? (
          <AnalyticsState message="Unable to load analytics right now." />
        ) : (
          <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              {/* Journey Steps Progress View */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Funnel Analysis
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      Onboarding Journey Steps
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {analytics.summary.sessions} Initial Sessions
                  </span>
                </div>

                <div className="space-y-4 pt-1">
                  {buildCreatorJourneySteps(analytics).map((step, index) => (
                    <div key={step.step_key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <div>
                          <div className="font-semibold text-slate-200">
                            {index + 1}. {getFunnelStepMeta(step.step_key).label}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {getFunnelStepMeta(step.step_key).description}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            {formatInteger(step.session_count)}
                          </div>
                          <div className="text-[11px] font-medium text-emerald-400">
                            {formatPercent(step.conversion_rate_from_previous)} conversion
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                          style={{
                            width: `${funnelWidth(analytics.funnel, step.session_count)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exit Pages Table */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Dropoff Diagnostics
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Last Page Before Exit
                  </h3>
                </div>

                {analytics.exit_pages.length === 0 &&
                analytics.recent_exit_pages.length > 0 ? (
                  <div className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
                    Showing recent exits from the last 30 minutes. They will move into confirmed abandonment after timeout.
                  </div>
                ) : null}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8">Last Step</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Exits</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Dropoff Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics.exit_pages.length === 0
                        ? analytics.recent_exit_pages
                        : analytics.exit_pages
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-20 text-center text-xs text-slate-500"
                          >
                            No stalled sessions in this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (analytics.exit_pages.length === 0
                          ? analytics.recent_exit_pages
                          : analytics.exit_pages
                        ).map((row) => {
                          const pageMeta = getPageMeta(row.page_id);

                          return (
                            <TableRow
                              key={row.page_id}
                              className="border-slate-800/60 hover:bg-slate-900/40 transition-colors"
                            >
                              <TableCell className="font-medium text-xs text-white py-2">
                                <div className="space-y-0.5">
                                  <div className="text-slate-200">{pageMeta.label}</div>
                                  <div className="text-[10px] text-slate-500 font-normal">
                                    {pageMeta.description}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-xs font-semibold text-slate-200 py-2">
                                {formatInteger(row.exits)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-semibold text-rose-400 py-2">
                                {formatPercent(row.exit_rate)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>

            {/* Preview App Taps & Setup Actions Grid */}
            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Preview Conversion
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Preview App Entry Taps
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8">Page</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Taps</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buildPreviewTapRows(
                        analytics.preview_entry_points,
                      ).map((row) => (
                        <TableRow
                          key={row.preview_entry_point}
                          className="border-slate-800/60 hover:bg-slate-900/40 transition-colors"
                        >
                          <TableCell className="font-medium text-xs text-slate-200 py-2">
                            {formatPreviewEntryPoint(row.preview_entry_point)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-blue-400 py-2">
                            {formatInteger(row.taps)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Post-Auth Engagement
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Setup Task Actions
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8">Step</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Used</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Skipped</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Use Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.post_auth_usage.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-20 text-center text-xs text-slate-500"
                          >
                            No post-auth usage recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.post_auth_usage.map((row) => (
                          <TableRow
                            key={row.step_key}
                            className="border-slate-800/60 hover:bg-slate-900/40 transition-colors"
                          >
                            <TableCell className="font-medium text-xs text-slate-200 py-2 capitalize">
                              {row.step_key.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-emerald-400 py-2">
                              {formatInteger(row.used_count)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-400 py-2">
                              {formatInteger(row.skipped_count)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-indigo-300 py-2">
                              {formatPercent(row.use_rate)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>

            {/* Paywall Breakdown & Trendline Analysis */}
            <section className="space-y-6">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Revenue & Conversion
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Paywall Plan Choice Breakdown
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/60 border-b border-slate-800">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8">Plan Choice</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Views</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Checkout Starts</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Purchases</TableHead>
                        <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8 text-right">Abandon Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.paywall_breakdown.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-20 text-center text-xs text-slate-500"
                          >
                            No paywall activity in this cohort yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.paywall_breakdown.map((row) => (
                          <TableRow
                            key={`${row.selected_plan}-${row.billing_interval ?? "none"}`}
                            className="border-slate-800/60 hover:bg-slate-900/40 transition-colors"
                          >
                            <TableCell className="font-medium text-xs text-white py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-200">
                                  {formatPlanChoice(row.selected_plan)}
                                </span>
                                {row.billing_interval ? (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900 text-slate-400 uppercase">
                                    {formatBillingInterval(row.billing_interval)}
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-slate-300 py-2">
                              {formatInteger(row.paywall_views)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-indigo-400 py-2">
                              {formatInteger(row.checkout_starts)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-emerald-400 py-2">
                              {formatInteger(row.purchase_successes)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-rose-400 py-2">
                              {formatPercent(row.abandonment_rate)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Trendline Section */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Timeseries Performance
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                    Conversion & Activity Trendline
                  </h3>
                </div>

                <div className="space-y-4 pt-1">
                  {analytics.timeseries.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded border border-slate-800 bg-slate-900/40 text-xs text-slate-500">
                      No trend data in this date window.
                    </div>
                  ) : (
                    analytics.timeseries.map((row) => (
                      <div key={row.bucket} className="space-y-2 border-b border-slate-800/40 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <div className="font-bold text-white font-mono">
                            {row.bucket}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span>Starts: <strong className="text-slate-200">{formatInteger(row.session_starts)}</strong></span>
                            <span>Completions: <strong className="text-emerald-400">{formatInteger(row.flow_completions)}</strong></span>
                            <span>Purchases: <strong className="text-indigo-400">{formatInteger(row.purchase_successes)}</strong></span>
                            <span>Exits: <strong className="text-rose-400">{formatInteger(row.abandonments)}</strong></span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <TrendBar
                            label="Starts"
                            value={row.session_starts}
                            maxValue={maxTimeseriesValue(analytics.timeseries)}
                            className="bg-sky-500"
                          />
                          <TrendBar
                            label="Completions"
                            value={row.flow_completions}
                            maxValue={maxTimeseriesValue(analytics.timeseries)}
                            className="bg-emerald-500"
                          />
                          <TrendBar
                            label="Purchases"
                            value={row.purchase_successes}
                            maxValue={maxTimeseriesValue(analytics.timeseries)}
                            className="bg-indigo-500"
                          />
                          <TrendBar
                            label="Exits"
                            value={row.abandonments}
                            maxValue={maxTimeseriesValue(analytics.timeseries)}
                            className="bg-rose-500"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-12 text-center text-xs text-slate-500">
      {message}
    </div>
  );
}

function TrendBar({
  label,
  value,
  maxValue,
  className,
}: {
  label: string;
  value: number;
  maxValue: number;
  className: string;
}) {
  const width = maxValue === 0 ? 0 : Math.max((value / maxValue) * 100, 4);

  return (
    <div className="space-y-1">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

async function fetchCreatorOnboardingAnalytics({
  startDate,
  endDate,
  granularity,
  platform,
  cohort,
}: {
  startDate: string;
  endDate: string;
  granularity: string;
  platform: string;
  cohort: string;
}): Promise<CreatorAnalyticsResponse> {
  const { data, error } = await supabase.rpc(
    "get_creator_onboarding_paywall_metrics",
    {
      p_start_at: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
      p_end_at: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
      p_granularity: granularity,
      p_platform: platform,
      p_cohort: cohort,
    },
  );

  if (error) {
    throw error;
  }

  if (!data?.success) {
    throw new Error(data?.error || "Unable to load creator analytics");
  }

  return {
    summary: {
      ...emptySummary,
      ...data.summary,
    },
    funnel: (data.funnel ?? []) as CreatorFunnelRow[],
    post_auth_usage: (data.post_auth_usage ?? []) as CreatorPostAuthUsageRow[],
    paywall_breakdown: (data.paywall_breakdown ?? []) as CreatorPaywallRow[],
    preview_entry_points: (data.preview_entry_points ??
      []) as CreatorPreviewEntryPointRow[],
    exit_pages: (data.exit_pages ?? []) as CreatorExitPageRow[],
    recent_exit_pages: (data.recent_exit_pages ?? []) as CreatorExitPageRow[],
    timeseries: (data.timeseries ?? []) as CreatorTimeseriesRow[],
  };
}

function buildSummaryCards(summary: CreatorSummary) {
  const completionRate = safeRate(
    summary.completed_flow_sessions,
    summary.sessions,
  );
  const paywallReachRate = safeRate(summary.paywall_views, summary.sessions);
  const checkoutWinRate = safeRate(
    summary.purchase_successes,
    summary.checkout_starts,
  );
  const stallRate = safeRate(summary.abandoned_sessions, summary.sessions);

  return [
    {
      label: "Started Onboarding",
      value: formatInteger(summary.sessions),
      helpText: `${formatInteger(summary.in_app_new_users)} brand-new app users in this date range`,
      icon: UserRoundPlus,
      className:
        "border-white/10 bg-gradient-to-br from-sky-500/20 to-transparent",
    },
    {
      label: "Reached Pricing",
      value: formatInteger(summary.paywall_views),
      helpText: `${formatPercent(paywallReachRate)} of starts made it to the pricing step`,
      icon: Timer,
      className:
        "border-white/10 bg-gradient-to-br from-violet-500/20 to-transparent",
    },
    {
      label: "Started Payment",
      value: formatInteger(summary.checkout_starts),
      helpText: `${formatInteger(summary.purchase_successes)} completed a purchase. Payment win rate is ${formatPercent(checkoutWinRate)}.`,
      icon: MousePointerClick,
      className:
        "border-white/10 bg-gradient-to-br from-amber-500/20 to-transparent",
    },
    {
      label: "Finished Into App",
      value: formatInteger(summary.completed_flow_sessions),
      helpText: `${formatPercent(completionRate)} of starts reached the main app`,
      icon: BarChart3,
      className:
        "border-white/10 bg-gradient-to-br from-emerald-500/20 to-transparent",
    },
    {
      label: "Stopped Before Finish",
      value: formatInteger(summary.abandoned_sessions),
      helpText: `${formatPercent(stallRate)} of starts have been inactive for at least 30 minutes`,
      icon: DoorOpen,
      className:
        "border-white/10 bg-gradient-to-br from-rose-500/20 to-transparent",
    },
  ];
}

function defaultStartDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

function humanizeKey(value: string | null) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFunnelStepMeta(stepKey: string) {
  const mapping: Record<string, { label: string; description: string }> = {
    intro_seen: {
      label: "Get started page",
      description: "People reached the opening intro carousel.",
    },
    preauth_seen: {
      label: "Personal questions",
      description: "People started the budget and lifestyle questions.",
    },
    preauth_started: {
      label: "Personal questions",
      description: "People started the budget and lifestyle questions.",
    },
    account_preparing_seen: {
      label: "Account setup",
      description: "People reached account creation or account finishing.",
    },
    paywall_seen: {
      label: "Pricing page",
      description: "People reached the pricing screen.",
    },
    postauth_seen: {
      label: "Signed-in setup",
      description: "People reached the signed-in setup tasks.",
    },
    subscribe_tapped: {
      label: "Started payment",
      description: "People tapped to start payment from the pricing page.",
    },
    purchase_succeeded: {
      label: "Finished payment",
      description: "People finished payment and unlocked access.",
    },
  };

  return (
    mapping[stepKey] ?? {
      label: humanizeKey(stepKey),
      description: "Tracked journey step.",
    }
  );
}

function getPostAuthStepMeta(stepKey: string) {
  const mapping: Record<string, { label: string }> = {
    log_expense: { label: "Log an expense" },
    import: { label: "Import past transactions" },
    notifications: { label: "Enable reminders" },
  };

  return mapping[stepKey] ?? { label: humanizeKey(stepKey) };
}

function getPageMeta(pageId: string) {
  const mapping: Record<string, { label: string; description: string }> = {
    onboarding_intro: {
      label: "Get started page",
      description: "They left during the opening intro carousel.",
    },
    onboarding_save_budget: {
      label: "Save budget page",
      description: "They reached the save-your-plan step before signing up.",
    },
    preauth_housing_situation: {
      label: "Personal questions",
      description: "They left during the question flow.",
    },
    onboarding_account_preparing: {
      label: "Account setup",
      description: "They left while the account was being prepared.",
    },
    paywall: {
      label: "Pricing page",
      description: "They left on the pricing screen.",
    },
    post_auth_log_expense: {
      label: "Signed-in setup",
      description: "They left during the signed-in setup tasks.",
    },
    post_auth_import: {
      label: "Signed-in setup",
      description: "They left during the signed-in setup tasks.",
    },
    post_auth_notifications: {
      label: "Final setup step",
      description:
        "They reached the last setup screen but did not continue into the app.",
    },
    onboarding_setup_notifications: {
      label: "Final setup step",
      description:
        "They reached the last setup screen but did not continue into the app.",
    },
    onboarding_setup_import: {
      label: "Signed-in setup",
      description: "They left during the signed-in setup tasks.",
    },
    onboarding_setup_ai_log: {
      label: "Signed-in setup",
      description: "They left during the signed-in setup tasks.",
    },
  };

  return (
    mapping[pageId] ?? {
      label: humanizeKey(pageId),
      description: "Tracked last step before the session stopped moving.",
    }
  );
}

function formatPlanChoice(value: string | null) {
  if (!value || value === "unknown") return "No plan chosen yet";
  if (value === "plus") return "Moneko Plus";
  if (value === "premium") return "Moneko Premium";
  if (value === "lifetime") return "Lifetime";
  return humanizeKey(value);
}

function formatBillingInterval(value: string | null) {
  if (!value) return "";
  if (value === "yearly") return "Yearly";
  if (value === "monthly") return "Monthly";
  return humanizeKey(value);
}

function buildPreviewTapRows(rows: CreatorPreviewEntryPointRow[]) {
  const tapMap = new Map(
    rows.map((row) => [row.preview_entry_point, row.taps]),
  );

  return [
    {
      preview_entry_point: "get_started",
      taps: tapMap.get("get_started") ?? 0,
    },
    {
      preview_entry_point: "save_budget",
      taps: tapMap.get("save_budget") ?? 0,
    },
    { preview_entry_point: "paywall", taps: tapMap.get("paywall") ?? 0 },
  ];
}

function buildCreatorJourneySteps(analytics: CreatorAnalyticsResponse) {
  const funnelMap = new Map(analytics.funnel.map((row) => [row.step_key, row]));

  const rawSteps = [
    {
      step_key: "intro_seen",
      session_count: funnelMap.get("intro_seen")?.session_count ?? 0,
    },
    {
      step_key: "preauth_started",
      session_count:
        funnelMap.get("preauth_started")?.session_count ??
        funnelMap.get("preauth_seen")?.session_count ??
        0,
    },
    {
      step_key: "account_preparing_seen",
      session_count:
        funnelMap.get("account_preparing_seen")?.session_count ?? 0,
    },
    {
      step_key: "paywall_seen",
      session_count: funnelMap.get("paywall_seen")?.session_count ?? 0,
    },
    {
      step_key: "subscribe_tapped",
      session_count:
        funnelMap.get("subscribe_tapped")?.session_count ??
        analytics.summary.checkout_starts,
    },
    {
      step_key: "purchase_succeeded",
      session_count:
        funnelMap.get("purchase_succeeded")?.session_count ??
        analytics.summary.purchase_successes,
    },
    {
      step_key: "postauth_seen",
      session_count: funnelMap.get("postauth_seen")?.session_count ?? 0,
    },
  ];

  return rawSteps.reduce<CreatorFunnelRow[]>((steps, step, index) => {
    const previousCount =
      index === 0 ? null : (steps[index - 1]?.session_count ?? 0);
    const normalizedCount =
      previousCount === null
        ? step.session_count
        : Math.min(step.session_count, previousCount);

    steps.push({
      step_rank: index + 1,
      step_key: step.step_key,
      session_count: normalizedCount,
      conversion_rate_from_previous:
        previousCount === null ? 100 : safeRate(normalizedCount, previousCount),
      dropoff_rate_from_previous:
        previousCount === null
          ? 0
          : Math.max(0, 100 - safeRate(normalizedCount, previousCount)),
    });

    return steps;
  }, []);
}

function formatPreviewEntryPoint(value: string) {
  if (value === "get_started") return "Get started page";
  if (value === "save_budget") return "Save budget page";
  if (value === "paywall") return "Pricing page";
  return humanizeKey(value);
}

function safeRate(part: number, whole: number) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function formatInteger(value: number | null | undefined) {
  return new Intl.NumberFormat().format(value ?? 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${Number(value).toFixed(1)}%`;
}

function funnelWidth(rows: CreatorFunnelRow[], sessionCount: number) {
  const maxValue = rows.reduce(
    (currentMax, row) => Math.max(currentMax, row.session_count),
    0,
  );
  if (maxValue === 0) return 0;
  return Math.max((sessionCount / maxValue) * 100, 4);
}

function maxTimeseriesValue(rows: CreatorTimeseriesRow[]) {
  return rows.reduce((currentMax, row) => {
    return Math.max(
      currentMax,
      row.session_starts,
      row.flow_completions,
      row.purchase_successes,
      row.abandonments,
    );
  }, 0);
}

const emptySummary: CreatorSummary = {
  sessions: 0,
  in_app_new_users: 0,
  external_prepaid_users: 0,
  excluded_existing_users: 0,
  completed_flow_sessions: 0,
  paywall_views: 0,
  checkout_starts: 0,
  purchase_successes: 0,
  paywall_return_trial_grants: 0,
  purchase_cancellations: 0,
  purchase_failures: 0,
  abandoned_sessions: 0,
  avg_dwell_ms: 0,
};

interface CreatorAnalyticsResponse {
  summary: CreatorSummary;
  funnel: CreatorFunnelRow[];
  post_auth_usage: CreatorPostAuthUsageRow[];
  paywall_breakdown: CreatorPaywallRow[];
  preview_entry_points: CreatorPreviewEntryPointRow[];
  exit_pages: CreatorExitPageRow[];
  recent_exit_pages: CreatorExitPageRow[];
  timeseries: CreatorTimeseriesRow[];
}

interface CreatorSummary {
  sessions: number;
  in_app_new_users: number;
  external_prepaid_users: number;
  excluded_existing_users: number;
  completed_flow_sessions: number;
  paywall_views: number;
  checkout_starts: number;
  purchase_successes: number;
  paywall_return_trial_grants: number;
  purchase_cancellations: number;
  purchase_failures: number;
  abandoned_sessions: number;
  avg_dwell_ms: number;
}

interface CreatorFunnelRow {
  step_rank: number;
  step_key: string;
  session_count: number;
  conversion_rate_from_previous: number | null;
  dropoff_rate_from_previous: number | null;
}

interface CreatorPostAuthUsageRow {
  step_key: string;
  used_count: number;
  skipped_count: number;
  use_rate: number;
  skip_rate: number;
}

interface CreatorPaywallRow {
  selected_plan: string;
  billing_interval: string | null;
  paywall_views: number;
  checkout_starts: number;
  purchase_successes: number;
  purchase_cancellations: number;
  purchase_failures: number;
  abandonments: number;
  conversion_rate: number;
  abandonment_rate: number;
}

interface CreatorPreviewEntryPointRow {
  preview_entry_point: string;
  taps: number;
}

interface CreatorExitPageRow {
  page_id: string;
  exits: number;
  exit_rate: number;
}

interface CreatorTimeseriesRow {
  bucket: string;
  session_starts: number;
  flow_completions: number;
  purchase_successes: number;
  abandonments: number;
}
