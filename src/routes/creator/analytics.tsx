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
} from "lucide-react";

import { supabase } from "@/lib/supabase";
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
                Monitor platform growth, user engagement, and conversion
                metrics.
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

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                    <CardTitle className="text-white">Journey Steps</CardTitle>
                    <CardDescription className="text-slate-300">
                      Follow how many people reached each major step in the
                      current onboarding journey.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {buildCreatorJourneySteps(analytics).map((step, index) => (
                      <div key={step.step_key} className="space-y-2">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <div>
                            <div className="font-medium text-white">
                              {index + 1}.{" "}
                              {getFunnelStepMeta(step.step_key).label}
                            </div>
                            <div className="text-slate-400">
                              {getFunnelStepMeta(step.step_key).description}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-white">
                              {formatInteger(step.session_count)}
                            </div>
                            <div className="text-slate-400">
                              {formatPercent(
                                safeRate(
                                  step.session_count,
                                  analytics.summary.sessions,
                                ),
                              )}{" "}
                              of starts
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
                        move into confirmed abandonment after the timeout
                        window.
                      </div>
                    ) : null}
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-white/60">
                            Last step
                          </TableHead>
                          <TableHead className="text-right text-white/60">
                            Sessions
                          </TableHead>
                          <TableHead className="text-right text-white/60">
                            Share
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
                          ).map((row) => {
                            const pageMeta = getPageMeta(row.page_id);

                            return (
                              <TableRow
                                key={row.page_id}
                                className="border-white/10 hover:bg-white/5"
                              >
                                <TableCell className="font-medium text-white">
                                  <div className="space-y-1">
                                    <div>{pageMeta.label}</div>
                                    <div className="text-xs font-normal text-slate-400">
                                      {pageMeta.description}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-white/80">
                                  {formatInteger(row.exits)}
                                </TableCell>
                                <TableCell className="text-right text-white/80">
                                  {formatPercent(row.exit_rate)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Preview App Taps
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Shows which page most often convinces people to try the
                      app before they finish signup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-white/60">Page</TableHead>
                          <TableHead className="text-right text-white/60">
                            Taps
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildPreviewTapRows(
                          analytics.preview_entry_points,
                        ).map((row) => (
                          <TableRow
                            key={row.preview_entry_point}
                            className="border-white/10 hover:bg-white/5"
                          >
                            <TableCell className="font-medium text-white">
                              {formatPreviewEntryPoint(row.preview_entry_point)}
                            </TableCell>
                            <TableCell className="text-right text-white/80">
                              {formatInteger(row.taps)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Setup Actions</CardTitle>
                    <CardDescription className="text-slate-300">
                      Shows whether people use the signed-in setup tasks or skip
                      them for later.
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
                                {getPostAuthStepMeta(row.step_key).label}
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
              </section>

              <section>
                <Card className="border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Paywall Breakdown
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Compare plan interest, payment starts, and completed
                      purchases.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-white/60">
                            Plan choice
                          </TableHead>
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
                                  <span>
                                    {formatPlanChoice(row.selected_plan)}
                                  </span>
                                  {row.billing_interval ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-white/10 text-white/80"
                                    >
                                      {formatBillingInterval(
                                        row.billing_interval,
                                      )}
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
                    Session starts, completions, purchases, and abandonments
                    over time.
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
                            <span>
                              Abandon {formatInteger(row.abandonments)}
                            </span>
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

  return [
    createJourneyStep(
      "intro_seen",
      funnelMap.get("intro_seen")?.session_count ?? 0,
    ),
    createJourneyStep(
      "preauth_started",
      funnelMap.get("preauth_started")?.session_count ??
        funnelMap.get("preauth_seen")?.session_count ??
        0,
    ),
    createJourneyStep(
      "account_preparing_seen",
      funnelMap.get("account_preparing_seen")?.session_count ?? 0,
    ),
    createJourneyStep(
      "paywall_seen",
      funnelMap.get("paywall_seen")?.session_count ?? 0,
    ),
    createJourneyStep(
      "subscribe_tapped",
      funnelMap.get("subscribe_tapped")?.session_count ??
        analytics.summary.checkout_starts,
    ),
    createJourneyStep(
      "purchase_succeeded",
      funnelMap.get("purchase_succeeded")?.session_count ??
        analytics.summary.purchase_successes,
    ),
    createJourneyStep(
      "postauth_seen",
      funnelMap.get("postauth_seen")?.session_count ?? 0,
    ),
  ];
}

function createJourneyStep(step_key: string, session_count: number) {
  return {
    step_key,
    session_count,
    conversion_rate_from_previous: null,
    dropoff_rate_from_previous: null,
  };
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
