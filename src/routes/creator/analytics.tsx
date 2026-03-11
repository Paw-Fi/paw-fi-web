import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CreditCard,
  DoorOpen,
  MousePointerClick,
  RefreshCw,
  Timer,
  UserRoundPlus,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { requireCreatorUser } from "@/lib/guards/requireCreatorUser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/creator/analytics" as never)({
  beforeLoad: async ({ location }) => requireCreatorUser(location.href),
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
    <>
      <div className="min-h-screen bg-slate-950 py-10 text-white">
        <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
      <CreatorHeader />
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Platform Analytics
              </h1>
              <p className="text-sm text-slate-300">
                Monitor platform growth, user engagement, and conversion metrics.
              </p>
            </div>
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-2 bg-transparent"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["creator-onboarding-analytics"],
              })
            }
            disabled={analyticsQuery.isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${analyticsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </header>

        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
            <CardDescription className="text-slate-300">
              Narrow the funnel to the cohort you care about.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border-white/10 bg-black/20 text-white"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="border-white/10 bg-black/20 text-white"
            />
            <Select value={granularity} onValueChange={setGranularity}>
              <SelectTrigger className="border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Granularity" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900 text-white">
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900 text-white">
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cohort} onValueChange={setCohort}>
              <SelectTrigger className="border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Cohort" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900 text-white">
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
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className={card.className}>
              <CardHeader className="space-y-3 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                    {card.label}
                  </CardDescription>
                  <card.icon className="h-4 w-4 text-white/70" />
                </div>
                <CardTitle className="text-3xl text-white">
                  {card.value}
                </CardTitle>
                <p className="text-sm text-slate-300">{card.helpText}</p>
              </CardHeader>
            </Card>
          ))}
        </section>

        {analyticsQuery.isLoading ? (
          <AnalyticsState message="Loading creator analytics..." />
        ) : analyticsQuery.isError || !analytics ? (
          <AnalyticsState message="Unable to load analytics right now." />
        ) : (
          <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Funnel</CardTitle>
                  <CardDescription className="text-slate-300">
                    Follow each cohort through preview, onboarding, paywall, and
                    conversion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.funnel.map((step, index) => (
                    <div key={step.step_key} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <div>
                          <div className="font-medium text-white">
                            {index + 1}. {humanizeKey(step.step_key)}
                          </div>
                          <div className="text-slate-400">
                            {formatPercent(step.conversion_rate_from_previous)}{" "}
                            conversion from previous
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white">
                            {formatInteger(step.session_count)}
                          </div>
                          <div className="text-slate-400">
                            dropoff{" "}
                            {formatPercent(step.dropoff_rate_from_previous)}
                          </div>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="from-primary h-full rounded-full bg-gradient-to-r to-sky-400"
                          style={{
                            width: `${funnelWidth(analytics.funnel, step.session_count)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">
                    Last Page Before Exit
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Sessions that stalled for at least 30 minutes without a
                    final completion event.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.exit_pages.length === 0 &&
                  analytics.recent_exit_pages.length > 0 ? (
                    <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                      Showing recent exits from the last 30 minutes. They will
                      move into confirmed abandonment after the timeout window.
                    </div>
                  ) : null}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/60">Page</TableHead>
                        <TableHead className="text-right text-white/60">
                          Exits
                        </TableHead>
                        <TableHead className="text-right text-white/60">
                          Rate
                        </TableHead>
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
                            className="h-24 text-center text-slate-400"
                          >
                            No stalled sessions in this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (analytics.exit_pages.length === 0
                          ? analytics.recent_exit_pages
                          : analytics.exit_pages
                        ).map((row) => (
                          <TableRow
                            key={row.page_id}
                            className="border-white/10 hover:bg-white/5"
                          >
                            <TableCell className="font-medium text-white">
                              {humanizeKey(row.page_id)}
                            </TableCell>
                            <TableCell className="text-right text-white/80">
                              {formatInteger(row.exits)}
                            </TableCell>
                            <TableCell className="text-right text-white/80">
                              {formatPercent(row.exit_rate)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Post-auth Usage</CardTitle>
                  <CardDescription className="text-slate-300">
                    See whether people actually use the post-auth tasks or skip
                    them.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/60">Step</TableHead>
                        <TableHead className="text-right text-white/60">
                          Used
                        </TableHead>
                        <TableHead className="text-right text-white/60">
                          Skipped
                        </TableHead>
                        <TableHead className="text-right text-white/60">
                          Use rate
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.post_auth_usage.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-slate-400"
                          >
                            No post-auth usage recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.post_auth_usage.map((row) => (
                          <TableRow
                            key={row.step_key}
                            className="border-white/10 hover:bg-white/5"
                          >
                            <TableCell className="font-medium text-white">
                              {humanizeKey(row.step_key)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-300">
                              {formatInteger(row.used_count)}
                            </TableCell>
                            <TableCell className="text-right text-rose-300">
                              {formatInteger(row.skipped_count)}
                            </TableCell>
                            <TableCell className="text-right text-white/80">
                              {formatPercent(row.use_rate)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">
                    Paywall Breakdown
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Compare plans, checkout starts, conversion, and abandonment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/60">Plan</TableHead>
                        <TableHead className="text-right text-white/60">
                          Views
                        </TableHead>
                        <TableHead className="text-right text-white/60">
                          Starts
                        </TableHead>
                        <TableHead className="text-right text-white/60">
                          Success
                        </TableHead>
                        <TableHead className="text-right text-white/60">
                          Abandon
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.paywall_breakdown.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-24 text-center text-slate-400"
                          >
                            No paywall activity in this cohort yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        analytics.paywall_breakdown.map((row) => (
                          <TableRow
                            key={`${row.selected_plan}-${row.billing_interval ?? "none"}`}
                            className="border-white/10 hover:bg-white/5"
                          >
                            <TableCell className="font-medium text-white">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{humanizeKey(row.selected_plan)}</span>
                                {row.billing_interval ? (
                                  <Badge
                                    variant="secondary"
                                    className="bg-white/10 text-white/80"
                                  >
                                    {row.billing_interval}
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-white/80">
                              {formatInteger(row.paywall_views)}
                            </TableCell>
                            <TableCell className="text-right text-white/80">
                              {formatInteger(row.checkout_starts)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-300">
                              {formatInteger(row.purchase_successes)}
                            </TableCell>
                            <TableCell className="text-right text-rose-300">
                              {formatPercent(row.abandonment_rate)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Trendline</CardTitle>
                <CardDescription className="text-slate-300">
                  Session starts, completions, purchases, and abandonments over
                  time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.timeseries.length === 0 ? (
                  <div className="flex h-28 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-sm text-slate-400">
                    No trend data in this range.
                  </div>
                ) : (
                  analytics.timeseries.map((row) => (
                    <div key={row.bucket} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <div className="font-medium text-white">
                          {row.bucket}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-slate-300">
                          <span>
                            Starts {formatInteger(row.session_starts)}
                          </span>
                          <span>
                            Complete {formatInteger(row.flow_completions)}
                          </span>
                          <span>
                            Purchase {formatInteger(row.purchase_successes)}
                          </span>
                          <span>Abandon {formatInteger(row.abandonments)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <TrendBar
                          label="Starts"
                          value={row.session_starts}
                          maxValue={maxTimeseriesValue(analytics.timeseries)}
                          className="bg-sky-400"
                        />
                        <TrendBar
                          label="Complete"
                          value={row.flow_completions}
                          maxValue={maxTimeseriesValue(analytics.timeseries)}
                          className="bg-emerald-400"
                        />
                        <TrendBar
                          label="Purchase"
                          value={row.purchase_successes}
                          maxValue={maxTimeseriesValue(analytics.timeseries)}
                          className="bg-amber-400"
                        />
                        <TrendBar
                          label="Abandon"
                          value={row.abandonments}
                          maxValue={maxTimeseriesValue(analytics.timeseries)}
                          className="bg-rose-400"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function AnalyticsState({ message }: { message: string }) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardContent className="flex h-40 items-center justify-center text-sm text-slate-300">
        {message}
      </CardContent>
    </Card>
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
    exit_pages: (data.exit_pages ?? []) as CreatorExitPageRow[],
    recent_exit_pages: (data.recent_exit_pages ?? []) as CreatorExitPageRow[],
    timeseries: (data.timeseries ?? []) as CreatorTimeseriesRow[],
  };
}

function buildSummaryCards(summary: CreatorSummary) {
  return [
    {
      label: "Tracked Sessions",
      value: formatInteger(summary.sessions),
      helpText: `${formatInteger(summary.in_app_new_users)} in-app new users in the selected window`,
      icon: UserRoundPlus,
      className:
        "border-white/10 bg-gradient-to-br from-sky-500/20 to-transparent",
    },
    {
      label: "Average Dwell",
      value: formatDuration(summary.avg_dwell_ms),
      helpText: `${formatInteger(summary.abandoned_sessions)} stalled sessions older than 30 minutes`,
      icon: Timer,
      className:
        "border-white/10 bg-gradient-to-br from-violet-500/20 to-transparent",
    },
    {
      label: "Checkout Starts",
      value: formatInteger(summary.checkout_starts),
      helpText: `${formatInteger(summary.purchase_successes)} purchases completed`,
      icon: MousePointerClick,
      className:
        "border-white/10 bg-gradient-to-br from-amber-500/20 to-transparent",
    },
    {
      label: "Exit Focus",
      value: formatInteger(
        summary.purchase_cancellations + summary.purchase_failures,
      ),
      helpText: `${formatInteger(summary.external_prepaid_users)} external prepaid users detected`,
      icon: DoorOpen,
      className:
        "border-white/10 bg-gradient-to-br from-rose-500/20 to-transparent",
    },
  ];
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
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

function formatInteger(value: number | null | undefined) {
  return new Intl.NumberFormat().format(value ?? 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${Number(value).toFixed(1)}%`;
}

function formatDuration(value: number | null | undefined) {
  const durationMs = value ?? 0;
  if (durationMs < 1000) return `${durationMs} ms`;
  const totalSeconds = Math.round(durationMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
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
