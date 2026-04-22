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

import { CreatorHeader } from "@/components/creator/creator-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { CreatorAccessBoundary } from "@/components/creator/creator-access-boundary";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/analytics/")({
  component: DashboardOnboardingAnalyticsPage,
});

function DashboardOnboardingAnalyticsPage() {
  return (
    <CreatorAccessBoundary>
      <DashboardOnboardingAnalyticsContent />
    </CreatorAccessBoundary>
  );
}

function DashboardOnboardingAnalyticsContent() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [granularity, setGranularity] = useState("day");
  const [platform, setPlatform] = useState("all");
  const [cohort, setCohort] = useState("in_app_new");

  const analyticsQuery = useQuery({
    queryKey: [
      "dashboard-onboarding-analytics",
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
  const summary = analytics?.summary ?? emptySummary;
  const summaryCards = useMemo(() => buildSummaryCards(summary), [summary]);
  const totalFreshPauses = useMemo(
    () =>
      (analytics?.recent_exit_pages ?? []).reduce(
        (sum, row) => sum + row.exits,
        0,
      ),
    [analytics?.recent_exit_pages],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.10),_transparent_40%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <CreatorHeader />

          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-xs"
              >
                Creator-only funnel analytics
              </Badge>
              <div>
                <h1 className="text-foreground text-3xl font-semibold tracking-tight">
                  Onboarding and Paywall Funnel
                </h1>
                <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                  Read the mobile onboarding flow in plain language: who
                  entered, where momentum slowed, which post-auth tasks people
                  actually used, and how plan selection translated into checkout
                  and paid conversion.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="gap-2 rounded-full"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["dashboard-onboarding-analytics"],
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

          <Card className="border-border/60 bg-card/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>How to read the exit numbers</CardTitle>
              <CardDescription>
                A user may leave the app during signup to fetch their
                verification code. Product-wise, that should only count as a
                true drop-off if they do not come back after 10 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm leading-6 text-amber-950 dark:text-amber-100">
                The current server function still confirms stalled sessions
                using a 30-minute timeout. In this dashboard, funnel progression
                and paywall conversion are the primary KPIs. Exit tables are
                shown as diagnostic signals, not as the headline success metric
                for signup verification steps.
              </div>
              <div className="border-border/60 bg-background/70 rounded-2xl border p-4">
                <div className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                  Current pause signals
                </div>
                <div className="text-foreground mt-2 text-3xl font-semibold">
                  {formatInteger(totalFreshPauses)}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  Sessions with recent activity and no completion yet. Treat
                  these as people who might still return.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Keep the cohort definition tight so the funnel answers one clear
                question at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger>
                  <SelectValue placeholder="Granularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cohort} onValueChange={setCohort}>
                <SelectTrigger>
                  <SelectValue placeholder="Cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app_new">In-app new users</SelectItem>
                  <SelectItem value="external_prepaid">
                    External prepaid users
                  </SelectItem>
                  <SelectItem value="excluded_existing">
                    Existing users excluded from core funnel
                  </SelectItem>
                  <SelectItem value="all">All cohorts</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card
                key={card.label}
                className={`border-border/60 shadow-sm ${card.className}`}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardDescription className="text-muted-foreground text-xs tracking-[0.22em] uppercase">
                      {card.label}
                    </CardDescription>
                    <card.icon className="text-muted-foreground h-4 w-4" />
                  </div>
                  <CardTitle className="text-foreground text-3xl font-semibold">
                    {card.value}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm leading-6">
                    {card.helpText}
                  </p>
                </CardHeader>
              </Card>
            ))}
          </section>

          {analyticsQuery.isLoading ? (
            <AnalyticsState message="Loading onboarding analytics..." />
          ) : analyticsQuery.isError || !analytics ? (
            <AnalyticsState message="Unable to load onboarding analytics right now." />
          ) : (
            <div className="space-y-8">
              <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-border/60 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>Funnel steps, translated</CardTitle>
                    <CardDescription>
                      Each step maps to a real mobile checkpoint, not just an
                      event label.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {analytics.funnel.map((step, index) => {
                      const stepMeta = getFunnelStepMeta(step.step_key);
                      return (
                        <div key={step.step_key} className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="text-foreground text-sm font-semibold">
                                {index + 1}. {stepMeta.label}
                              </div>
                              <p className="text-muted-foreground text-sm leading-6">
                                {stepMeta.description}
                              </p>
                            </div>
                            <div className="min-w-[120px] text-right">
                              <div className="text-foreground text-lg font-semibold">
                                {formatInteger(step.session_count)}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {step.conversion_rate_from_previous === null
                                  ? "Starting point"
                                  : `${formatPercent(step.conversion_rate_from_previous)} kept moving`}
                              </div>
                            </div>
                          </div>
                          <div className="bg-muted h-2 overflow-hidden rounded-full">
                            <div
                              className="from-primary h-full rounded-full bg-gradient-to-r to-sky-500"
                              style={{
                                width: `${funnelWidth(analytics.funnel, step.session_count)}%`,
                              }}
                            />
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {step.dropoff_rate_from_previous === null
                              ? "Every session starts here."
                              : `${formatPercent(step.dropoff_rate_from_previous)} dropped before the next checkpoint.`}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>What needs attention</CardTitle>
                    <CardDescription>
                      A compact readout of the parts of the funnel that most
                      directly affect revenue.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {buildAttentionItems(analytics).map((item) => (
                      <div
                        key={item.label}
                        className="border-border/60 bg-background/70 rounded-2xl border p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-foreground text-sm font-medium">
                              {item.label}
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm leading-6">
                              {item.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-foreground text-2xl font-semibold">
                              {item.value}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {item.context}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <Card className="border-border/60 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>Post-auth interaction signals</CardTitle>
                    <CardDescription>
                      These rows are event counts from the post-auth onboarding
                      screens: logging an expense, importing history, and
                      enabling notifications. Read them as interaction volume,
                      not unique-user adoption.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead className="text-right">
                            Used events
                          </TableHead>
                          <TableHead className="text-right">
                            Skipped events
                          </TableHead>
                          <TableHead className="text-right">Use rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.post_auth_usage.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-muted-foreground h-24 text-center"
                            >
                              No post-auth usage recorded in this filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          analytics.post_auth_usage.map((row) => {
                            const stepMeta = getPostAuthStepMeta(row.step_key);
                            return (
                              <TableRow key={row.step_key}>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="text-foreground font-medium">
                                      {stepMeta.label}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {stepMeta.description}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                  {formatInteger(row.used_count)}
                                </TableCell>
                                <TableCell className="text-right text-rose-600 dark:text-rose-400">
                                  {formatInteger(row.skipped_count)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatPercent(row.use_rate)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>
                      Paywall grouped by latest selected plan
                    </CardTitle>
                    <CardDescription>
                      Each session is grouped under the most recent plan choice
                      we captured. Paywall view means someone reached pricing,
                      checkout means they tapped subscribe, and paid means a
                      purchase completed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan choice</TableHead>
                          <TableHead className="text-right">Views</TableHead>
                          <TableHead className="text-right">Checkout</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">
                            Checkout win
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.paywall_breakdown.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-muted-foreground h-24 text-center"
                            >
                              No paywall activity in this filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          analytics.paywall_breakdown.map((row) => (
                            <TableRow
                              key={`${row.selected_plan}-${row.billing_interval ?? "none"}`}
                            >
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-foreground font-medium">
                                    {formatPlanChoice(row.selected_plan)}
                                  </span>
                                  {row.billing_interval ? (
                                    <Badge
                                      variant="secondary"
                                      className="rounded-full"
                                    >
                                      {formatBillingInterval(
                                        row.billing_interval,
                                      )}
                                    </Badge>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatInteger(row.paywall_views)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatInteger(row.checkout_starts)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                {formatInteger(row.purchase_successes)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercent(row.conversion_rate)}
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
                <Card className="border-border/60 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>Where sessions paused last</CardTitle>
                    <CardDescription>
                      Confirmed stalled sessions from the current RPC use a
                      30-minute inactivity window. Treat signup verification
                      pages carefully.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Last page seen</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.exit_pages.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-muted-foreground h-24 text-center"
                            >
                              No confirmed stalled sessions in this filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          analytics.exit_pages.map((row) => {
                            const pageMeta = getPageMeta(row.page_id);
                            return (
                              <TableRow key={row.page_id}>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="text-foreground font-medium">
                                      {pageMeta.label}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {pageMeta.description}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatInteger(row.exits)}
                                </TableCell>
                                <TableCell className="text-right">
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

                <Card className="border-border/60 bg-card/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>Volume over time</CardTitle>
                    <CardDescription>
                      Use this for trend direction: starts, onboarding
                      completions, purchases, and confirmed stalled sessions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analytics.timeseries.length === 0 ? (
                      <div className="border-border/60 bg-background/70 text-muted-foreground flex h-28 items-center justify-center rounded-2xl border text-sm">
                        No trend data in this date range.
                      </div>
                    ) : (
                      analytics.timeseries.map((row) => {
                        const maxValue = maxTimeseriesValue(
                          analytics.timeseries,
                        );
                        return (
                          <div key={row.bucket} className="space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-foreground font-medium">
                                {row.bucket}
                              </div>
                              <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                                <span>
                                  Starts {formatInteger(row.session_starts)}
                                </span>
                                <span>
                                  Completed{" "}
                                  {formatInteger(row.flow_completions)}
                                </span>
                                <span>
                                  Paid {formatInteger(row.purchase_successes)}
                                </span>
                                <span>
                                  30m+ stalled {formatInteger(row.abandonments)}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <TrendBar
                                label="Starts"
                                value={row.session_starts}
                                maxValue={maxValue}
                                className="bg-sky-500"
                              />
                              <TrendBar
                                label="Completed"
                                value={row.flow_completions}
                                maxValue={maxValue}
                                className="bg-emerald-500"
                              />
                              <TrendBar
                                label="Paid"
                                value={row.purchase_successes}
                                maxValue={maxValue}
                                className="bg-amber-500"
                              />
                              <TrendBar
                                label="30m+ stalled"
                                value={row.abandonments}
                                maxValue={maxValue}
                                className="bg-rose-500"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsState({ message }: { message: string }) {
  return (
    <Card className="border-border/60 bg-card/90 shadow-sm">
      <CardContent className="text-muted-foreground flex h-40 items-center justify-center text-sm">
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
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
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
  const flowCompletionRate = safeRate(
    summary.completed_flow_sessions,
    summary.sessions,
  );
  const paywallReachRate = safeRate(summary.paywall_views, summary.sessions);
  const checkoutToPaidRate = safeRate(
    summary.purchase_successes,
    summary.checkout_starts,
  );
  const confirmedStallRate = safeRate(
    summary.abandoned_sessions,
    summary.sessions,
  );

  return [
    {
      label: "Completed to dashboard",
      value: formatInteger(summary.completed_flow_sessions),
      helpText: `${formatPercent(flowCompletionRate)} of tracked starts fully completed into the main app or landed already subscribed.`,
      icon: UserRoundPlus,
      className: "bg-gradient-to-br from-sky-500/10 via-card to-card",
    },
    {
      label: "Reached paywall",
      value: formatInteger(summary.paywall_views),
      helpText: `${formatPercent(paywallReachRate)} of tracked sessions made it all the way to pricing.`,
      icon: MousePointerClick,
      className: "bg-gradient-to-br from-violet-500/10 via-card to-card",
    },
    {
      label: "Started checkout",
      value: formatInteger(summary.checkout_starts),
      helpText: `${formatInteger(summary.purchase_successes)} converted to paid. Checkout-to-paid win rate is ${formatPercent(checkoutToPaidRate)}.`,
      icon: CreditCard,
      className: "bg-gradient-to-br from-amber-500/10 via-card to-card",
    },
    {
      label: "Confirmed 30m+ stalls",
      value: formatInteger(summary.abandoned_sessions),
      helpText: `${formatPercent(confirmedStallRate)} of sessions are marked stalled by the current server timeout. Use carefully around verification-code steps.`,
      icon: DoorOpen,
      className: "bg-gradient-to-br from-rose-500/10 via-card to-card",
    },
  ];
}

function buildAttentionItems(analytics: CreatorAnalyticsResponse) {
  const purchaseFailureCount =
    analytics.summary.purchase_cancellations +
    analytics.summary.purchase_failures;

  return [
    {
      label: "Average page dwell",
      value: formatDuration(analytics.summary.avg_dwell_ms),
      context: "Across tracked onboarding and paywall events",
      description:
        "Useful for spotting friction, but do not confuse long dwell with drop-off. Verification and app-switch moments can lengthen this.",
    },
    {
      label: "Purchase interruption events",
      value: formatInteger(purchaseFailureCount),
      context: `${formatInteger(analytics.summary.purchase_cancellations)} cancelled, ${formatInteger(analytics.summary.purchase_failures)} failed`,
      description:
        "This is raw interruption volume after checkout started. Read it as retry friction, not unique-session fallout.",
    },
    {
      label: "Excluded existing users",
      value: formatInteger(analytics.summary.excluded_existing_users),
      context: "Filtered out of the core new-user funnel",
      description:
        "Keep an eye on this so existing-user re-entries do not distort onboarding conversion rates.",
    },
  ];
}

function getFunnelStepMeta(stepKey: string) {
  const mapping: Record<string, { label: string; description: string }> = {
    preview_seen: {
      label: "Preview screen seen",
      description:
        "People landed on the opening preview that offers a tour or a direct path into signup questions.",
    },
    intro_seen: {
      label: "Intro carousel entered",
      description:
        "Users moved from the preview into the main guest onboarding slides.",
    },
    preauth_started: {
      label: "Pre-auth questions started",
      description: "The personalized budget and lifestyle questionnaire began.",
    },
    account_preparing_seen: {
      label: "Account creation / verification reached",
      description:
        "Users reached the stage where they prepare or create their account, including verification-sensitive moments.",
    },
    postauth_seen: {
      label: "Post-auth setup reached",
      description:
        "Signed-in users entered the task-based setup flow: log expense, import history, or enable notifications.",
    },
    paywall_seen: {
      label: "Paywall shown",
      description:
        "The subscription paywall loaded after onboarding completion.",
    },
    subscribe_tapped: {
      label: "Subscribe tapped",
      description:
        "Someone picked a plan and started checkout from the paywall.",
    },
    purchase_succeeded: {
      label: "Purchase completed",
      description:
        "A paid conversion succeeded and the session completed into the main app.",
    },
  };

  return (
    mapping[stepKey] ?? {
      label: humanizeKey(stepKey),
      description: "Tracked funnel checkpoint.",
    }
  );
}

function getPostAuthStepMeta(stepKey: string) {
  const mapping: Record<string, { label: string; description: string }> = {
    log_expense: {
      label: "Log an expense",
      description:
        "Whether users tried the first hands-on value moment after signup.",
    },
    import: {
      label: "Import past transactions",
      description:
        "Whether users brought historical data in from another finance app.",
    },
    notifications: {
      label: "Enable notifications",
      description:
        "Whether users allowed reminders and alerts at the end of post-auth setup.",
    },
  };

  return (
    mapping[stepKey] ?? {
      label: humanizeKey(stepKey),
      description: "Tracked post-auth action.",
    }
  );
}

function getPageMeta(pageId: string) {
  const mapping: Record<string, { label: string; description: string }> = {
    onboarding_preview: {
      label: "Preview screen",
      description:
        "The first screen introducing the product before the intro or question flow.",
    },
    onboarding_intro: {
      label: "Intro carousel",
      description:
        "The guest slide sequence before the pre-auth questionnaire starts.",
    },
    preauth_housing_situation: {
      label: "Pre-auth questionnaire start",
      description: "The first budget and lifestyle question.",
    },
    preauth_create_account: {
      label: "Create account / verify",
      description:
        "Sensitive step where users may temporarily leave to fetch a verification code.",
    },
    post_auth_log_expense: {
      label: "Post-auth log expense",
      description: "First value task after signup.",
    },
    post_auth_import: {
      label: "Post-auth import",
      description: "Import flow decision step after signup.",
    },
    post_auth_notifications: {
      label: "Post-auth notifications",
      description:
        "Notification permission step at the end of post-auth setup.",
    },
    paywall: {
      label: "Paywall",
      description: "Subscription screen shown after onboarding completes.",
    },
  };

  return (
    mapping[pageId] ?? {
      label: humanizeKey(pageId),
      description: "Tracked last page in the onboarding funnel.",
    }
  );
}

function formatPlanChoice(value: string | null) {
  if (!value || value === "unknown") return "No plan selected yet";
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
